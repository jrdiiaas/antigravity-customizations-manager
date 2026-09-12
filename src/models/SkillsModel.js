const fs = require('fs');
const path = require('path');
const os = require('os');

class SkillsModel {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || '';
    this.globalSkillsDir = path.join(os.homedir(), '.gemini', 'config', 'skills');
    this.workspaceSkillsDir = this.workspaceRoot ? path.join(this.workspaceRoot, '.agents', 'skills') : '';
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
  scanDirectory(baseDir, scope) {
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

        skills.push({
          id: `${scope}:${cleanName}`,
          name: meta.name || cleanName,
          cleanName,
          folderName,
          dirPath: fullDirPath,
          scope,
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
   * Retorna todas as skills disponíveis (Workspace e Global)
   */
  getAllSkills() {
    // Se o diretório de workspace for um link simbólico para o global, usa escopo global diretamente
    let isSymlinkToGlobal = false;
    try {
      if (this.workspaceSkillsDir && fs.existsSync(this.workspaceSkillsDir) && fs.existsSync(this.globalSkillsDir)) {
        isSymlinkToGlobal = fs.realpathSync(this.workspaceSkillsDir) === fs.realpathSync(this.globalSkillsDir);
      }
    } catch (_) {}

    const workspaceScope = isSymlinkToGlobal ? 'global' : 'workspace';
    const workspaceSkills = this.scanDirectory(this.workspaceSkillsDir, workspaceScope);
    const globalSkills = this.scanDirectory(this.globalSkillsDir, 'global');

    // Combina e desduplica (workspace tem precedência se for diretório físico real)
    const list = [...workspaceSkills];
    const seenNames = new Set(workspaceSkills.map(s => s.cleanName));

    for (const gs of globalSkills) {
      if (!seenNames.has(gs.cleanName)) {
        list.push(gs);
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
