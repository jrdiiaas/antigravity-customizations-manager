const fs = require('fs');
const path = require('path');
const os = require('os');

class SkillsModel {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || '';
    this.globalSkillsDir = path.join(os.homedir(), '.gemini', 'config', 'skills');
    this.workspaceSkillsDir = this.workspaceRoot ? path.join(this.workspaceRoot, '.agents', 'skills') : '';
    this.workspacePluginsDir = this.workspaceRoot ? path.join(this.workspaceRoot, '.agents', 'plugins') : '';
    this.globalPluginsDir = path.join(os.homedir(), '.gemini', 'config', 'plugins');
  }

  /**
   * Extrai metadados do YAML frontmatter de um SKILL.md
   */
  parseSkillMetadata(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
      if (!match) {
        return { name: path.basename(path.dirname(filePath)), description: 'Skill sem descrição' };
      }

      const frontmatter = match[1];
      let name = '';
      let description = '';

      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
      if (nameMatch) {
        name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
      }

      const descMatch = frontmatter.match(/^description:\s*([>|]?)([\s\S]*?)(?=^\w+:|$)/m);
      if (descMatch) {
        description = descMatch[2].trim().replace(/^["']|["']$/g, '').replace(/\n\s+/g, ' ');
      }

      return {
        name: name || path.basename(path.dirname(filePath)),
        description: description || 'Skill especializada'
      };
    } catch (_) {
      return { name: path.basename(path.dirname(filePath)), description: 'Não foi possível ler metadados' };
    }
  }

  /**
   * Varre um diretório de skills e retorna os objetos formatados
   */
  scanDirectory(baseDir, scope, pluginName = null) {
    const skills = [];
    if (!baseDir || !fs.existsSync(baseDir)) {
      return skills;
    }

    try {
      const items = fs.readdirSync(baseDir, { withFileTypes: true });

      for (const item of items) {
        if (!item.isDirectory()) continue;

        const folderName = item.name;
        const isDisabledFolder = folderName.endsWith('.disabled');
        const cleanName = isDisabledFolder ? folderName.replace(/\.disabled$/, '') : folderName;
        const fullDirPath = path.join(baseDir, folderName);

        // Verifica existência de SKILL.md ou SKILL.md.disabled
        const skillMd = path.join(fullDirPath, 'SKILL.md');
        const skillMdDisabled = path.join(fullDirPath, 'SKILL.md.disabled');

        let isEnabled = false;
        let targetMdPath = '';

        if (fs.existsSync(skillMd)) {
          isEnabled = !isDisabledFolder;
          targetMdPath = skillMd;
        } else if (fs.existsSync(skillMdDisabled)) {
          isEnabled = false;
          targetMdPath = skillMdDisabled;
        } else {
          continue; // Não é uma pasta de skill válida
        }

        const meta = this.parseSkillMetadata(targetMdPath);
        const isPlugin = Boolean(pluginName);

        skills.push({
          id: isPlugin ? `${scope}:${pluginName}:${cleanName}` : `${scope}:${cleanName}`,
          name: meta.name || cleanName,
          cleanName,
          folderName,
          dirPath: fullDirPath,
          scope,
          isPlugin,
          pluginName: pluginName || '',
          enabled: isEnabled,
          description: meta.description
        });
      }
    } catch (err) {
      console.error(`[SkillsModel] Erro ao escanear diretório ${baseDir}:`, err.message);
    }

    return skills;
  }

  /**
   * Varre skills contidas em pastas de plugins (.agents/plugins/[nome]/skills)
   */
  scanPluginSkills(pluginsDir, scope) {
    const skills = [];
    if (!pluginsDir || !fs.existsSync(pluginsDir)) return skills;

    try {
      const plugins = fs.readdirSync(pluginsDir, { withFileTypes: true });
      for (const plugin of plugins) {
        if (!plugin.isDirectory()) continue;
        const pluginName = plugin.name;
        const pluginSkillsDir = path.join(pluginsDir, pluginName, 'skills');
        if (fs.existsSync(pluginSkillsDir)) {
          const pluginSkills = this.scanDirectory(pluginSkillsDir, scope, pluginName);
          skills.push(...pluginSkills);
        }
      }
    } catch (err) {
      console.error(`[SkillsModel] Erro ao escanear plugins em ${pluginsDir}:`, err.message);
    }
    return skills;
  }

  /**
   * Retorna todas as skills disponíveis (Workspace, Global e Plugins)
   */
  getAllSkills() {
    let isSymlinkToGlobal = false;
    try {
      if (this.workspaceSkillsDir && fs.existsSync(this.workspaceSkillsDir) && fs.existsSync(this.globalSkillsDir)) {
        isSymlinkToGlobal = fs.realpathSync(this.workspaceSkillsDir) === fs.realpathSync(this.globalSkillsDir);
      }
    } catch (_) {}

    const workspaceScope = isSymlinkToGlobal ? 'global' : 'workspace';
    const workspaceSkills = this.scanDirectory(this.workspaceSkillsDir, workspaceScope);
    const globalSkills = this.scanDirectory(this.globalSkillsDir, 'global');

    // Skills de Plugins
    const workspacePluginSkills = this.scanPluginSkills(this.workspacePluginsDir, workspaceScope);
    const globalPluginSkills = isSymlinkToGlobal ? [] : this.scanPluginSkills(this.globalPluginsDir, 'global');

    // Combina e desduplica
    const list = [...workspaceSkills, ...workspacePluginSkills];
    const seenNames = new Set(list.map(s => s.cleanName));

    for (const gs of globalSkills) {
      if (!seenNames.has(gs.cleanName)) {
        list.push(gs);
        seenNames.add(gs.cleanName);
      }
    }

    for (const gps of globalPluginSkills) {
      if (!seenNames.has(gps.cleanName)) {
        list.push(gps);
        seenNames.add(gps.cleanName);
      }
    }

    return list.sort((a, b) => a.cleanName.localeCompare(b.cleanName));
  }

  /**
   * Alterna estado de uma skill (renomeando SKILL.md ou pasta de forma segura)
   */
  toggleSkill(skillItem, targetState) {
    const { dirPath, cleanName, enabled } = skillItem;
    if (enabled === targetState) return skillItem;

    const baseDir = path.dirname(dirPath);
    const normalDir = path.join(baseDir, cleanName);
    const disabledDir = path.join(baseDir, `${cleanName}.disabled`);

    if (targetState === true) {
      // Ativar: se a pasta estiver como .disabled, renomeia para normal
      if (fs.existsSync(disabledDir)) {
        fs.renameSync(disabledDir, normalDir);
      }
      // Se SKILL.md.disabled existir dentro, restaura para SKILL.md
      const targetMdDisabled = path.join(normalDir, 'SKILL.md.disabled');
      const targetMd = path.join(normalDir, 'SKILL.md');
      if (fs.existsSync(targetMdDisabled)) {
        fs.renameSync(targetMdDisabled, targetMd);
      }
      skillItem.enabled = true;
      skillItem.dirPath = normalDir;
      skillItem.folderName = cleanName;
    } else {
      // Desativar: renomeia a pasta para .disabled
      if (fs.existsSync(normalDir)) {
        fs.renameSync(normalDir, disabledDir);
        skillItem.dirPath = disabledDir;
        skillItem.folderName = `${cleanName}.disabled`;
      }
      skillItem.enabled = false;
    }

    return skillItem;
  }
}

module.exports = SkillsModel;
