const fs = require('fs');
const path = require('path');
const os = require('os');

class RulesModel {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || '';
    this.globalRulesDir = path.join(os.homedir(), '.gemini', 'config', 'rules');
    this.globalGeminiMd = path.join(os.homedir(), '.gemini', 'GEMINI.md');
    this.workspaceRulesDir = this.workspaceRoot ? path.join(this.workspaceRoot, '.agents', 'rules') : '';
    this.workspaceAgentsMd = this.workspaceRoot ? path.join(this.workspaceRoot, 'AGENTS.md') : '';
    this.workspaceGeminiMd = this.workspaceRoot ? path.join(this.workspaceRoot, 'GEMINI.md') : '';
  }

  /**
   * Extrai título amigável e resumo das primeiras linhas do arquivo de regra
   */
  parseRulePreview(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      let title = path.basename(filePath).replace(/\.disabled$/, '');
      let snippet = '';

      for (const line of lines) {
        if (line.startsWith('---')) continue;
        if (line.startsWith('#')) {
          title = line.replace(/^#+\s*/, '');
          break;
        } else if (!snippet && !line.startsWith('trigger:')) {
          snippet = line;
        }
      }

      if (!snippet && lines.length > 1) {
        snippet = lines.slice(1, 3).join(' ').substring(0, 80);
      }

      return {
        title,
        snippet: snippet || 'Regra de comportamento do agente'
      };
    } catch (_) {
      return {
        title: path.basename(filePath),
        snippet: 'Regra ativa'
      };
    }
  }

  /**
   * Escaneia uma pasta de regras
   */
  scanDir(dirPath, scope) {
    const rules = [];
    if (!dirPath || !fs.existsSync(dirPath)) return rules;

    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const isMd = file.endsWith('.md');
        const isDisabled = file.endsWith('.md.disabled');

        if (!isMd && !isDisabled) continue;

        const fullPath = path.join(dirPath, file);
        const baseName = isDisabled ? file.replace(/\.disabled$/, '') : file;
        const meta = this.parseRulePreview(fullPath);

        rules.push({
          id: `${scope}:${baseName}`,
          fileName: file,
          baseName,
          filePath: fullPath,
          scope,
          enabled: isMd && !isDisabled,
          title: meta.title,
          snippet: meta.snippet
        });
      }
    } catch (err) {
      console.error(`[RulesModel] Erro ao ler pasta de regras ${dirPath}:`, err.message);
    }

    return rules;
  }

  /**
   * Retorna todas as regras (Globais e de Workspace)
   */
  getAllRules() {
    const rules = [];

    // 1. Regras globais em pasta
    rules.push(...this.scanDir(this.globalRulesDir, 'global'));

    // 2. Arquivo GEMINI.md global
    if (fs.existsSync(this.globalGeminiMd) || fs.existsSync(`${this.globalGeminiMd}.disabled`)) {
      const isEnabled = fs.existsSync(this.globalGeminiMd);
      const targetPath = isEnabled ? this.globalGeminiMd : `${this.globalGeminiMd}.disabled`;
      const meta = this.parseRulePreview(targetPath);
      rules.unshift({
        id: 'global:GEMINI.md',
        fileName: path.basename(targetPath),
        baseName: 'GEMINI.md',
        filePath: targetPath,
        scope: 'global',
        enabled: isEnabled,
        title: 'GEMINI.md Global',
        snippet: meta.snippet || meta.title
      });
    }

    // 3. Regras de workspace em pasta
    if (this.workspaceRulesDir) {
      rules.push(...this.scanDir(this.workspaceRulesDir, 'workspace'));
    }

    // 4. Arquivos AGENTS.md / GEMINI.md no root do workspace
    if (this.workspaceAgentsMd && (fs.existsSync(this.workspaceAgentsMd) || fs.existsSync(`${this.workspaceAgentsMd}.disabled`))) {
      const isEnabled = fs.existsSync(this.workspaceAgentsMd);
      const targetPath = isEnabled ? this.workspaceAgentsMd : `${this.workspaceAgentsMd}.disabled`;
      const meta = this.parseRulePreview(targetPath);
      rules.push({
        id: 'workspace:AGENTS.md',
        fileName: path.basename(targetPath),
        baseName: 'AGENTS.md',
        filePath: targetPath,
        scope: 'workspace',
        enabled: isEnabled,
        title: 'AGENTS.md (Workspace)',
        snippet: meta.snippet || meta.title
      });
    }

    return rules;
  }

  /**
   * Alterna estado de uma regra renomeando .md <-> .md.disabled
   */
  toggleRule(ruleItem, targetState) {
    const { filePath, baseName, enabled } = ruleItem;
    if (enabled === targetState) return ruleItem;

    const dir = path.dirname(filePath);
    const activePath = path.join(dir, baseName);
    const disabledPath = path.join(dir, `${baseName}.disabled`);

    if (targetState === true) {
      // Ativar
      if (fs.existsSync(disabledPath)) {
        fs.renameSync(disabledPath, activePath);
        ruleItem.filePath = activePath;
        ruleItem.fileName = baseName;
      }
      ruleItem.enabled = true;
    } else {
      // Desativar
      if (fs.existsSync(activePath)) {
        fs.renameSync(activePath, disabledPath);
        ruleItem.filePath = disabledPath;
        ruleItem.fileName = `${baseName}.disabled`;
      }
      ruleItem.enabled = false;
    }

    return ruleItem;
  }
}

module.exports = RulesModel;
