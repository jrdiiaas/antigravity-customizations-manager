const fs = require('fs');
const path = require('path');
const os = require('os');

class AgentsModel {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || '';
    this.globalAgentsDir = path.join(os.homedir(), '.gemini', 'config', 'agent');
    this.globalAgentsDirAlt = path.join(os.homedir(), '.gemini', 'config', 'agents');
    this.workspaceAgentsDir = this.workspaceRoot ? path.join(this.workspaceRoot, '.agents', 'agent') : '';
    this.workspaceAgentsDirAlt = this.workspaceRoot ? path.join(this.workspaceRoot, '.agents', 'agents') : '';
  }

  /**
   * Resolve o caminho real canônico (seguindo links simbólicos)
   */
  getRealPath(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.realpathSync(filePath);
      }
    } catch (_) {}
    return path.resolve(filePath);
  }

  /**
   * Extrai metadados do YAML frontmatter ou cabeçalho do arquivo do Agente
   */
  parseAgentMetadata(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const baseName = path.basename(filePath).replace(/\.disabled$/, '').replace(/\.md$/, '');

      let name = baseName;
      let description = '';
      let skills = [];
      let tools = '';

      // Tenta extrair YAML frontmatter
      const match = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
      if (match) {
        const frontmatter = match[1];

        const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
        if (nameMatch) {
          name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        const descMatch = frontmatter.match(/^description:\s*([>|]?)([\s\S]*?)(?=^\w+:|$)/m);
        if (descMatch) {
          description = descMatch[2].trim().replace(/^["']|["']$/g, '').replace(/\n\s+/g, ' ');
        }

        const skillsMatch = frontmatter.match(/^skills:\s*(.+)$/m);
        if (skillsMatch) {
          skills = skillsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        }

        const toolsMatch = frontmatter.match(/^tools:\s*(.+)$/m);
        if (toolsMatch) {
          tools = toolsMatch[1].trim();
        }
      }

      // Se não encontrou descrição no frontmatter, busca o primeiro parágrafo
      if (!description) {
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('---') || line.startsWith('#')) continue;
          description = line;
          break;
        }
      }

      return {
        name,
        description: description || 'Agente especialista autônomo',
        skills,
        tools
      };
    } catch (_) {
      const fallbackName = path.basename(filePath).replace(/\.disabled$/, '').replace(/\.md$/, '');
      return {
        name: fallbackName,
        description: 'Agente especialista',
        skills: [],
        tools: ''
      };
    }
  }

  /**
   * Escaneia diretório de agentes aplicando desduplicação por caminho real
   */
  scanDir(dirPath, scope, seenRealPaths) {
    const agents = [];
    if (!dirPath || !fs.existsSync(dirPath)) return agents;

    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const isMd = file.endsWith('.md');
        const isDisabled = file.endsWith('.md.disabled');

        if (!isMd && !isDisabled) continue;

        const fullPath = path.join(dirPath, file);
        const realPath = this.getRealPath(fullPath);

        if (seenRealPaths.has(realPath)) {
          continue;
        }
        seenRealPaths.add(realPath);

        const baseName = isDisabled ? file.replace(/\.disabled$/, '') : file;
        const cleanName = baseName.replace(/\.md$/, '');
        const meta = this.parseAgentMetadata(fullPath);

        agents.push({
          id: `${scope}:${cleanName}`,
          fileName: file,
          baseName,
          cleanName,
          filePath: fullPath,
          realPath,
          scope,
          enabled: isMd && !isDisabled,
          name: meta.name || cleanName,
          description: meta.description,
          skills: meta.skills,
          tools: meta.tools
        });
      }
    } catch (err) {
      console.error(`[AgentsModel] Erro ao ler pasta de agentes ${dirPath}:`, err.message);
    }

    return agents;
  }

  /**
   * Retorna todos os agentes únicos disponíveis com desduplicação por nome
   */
  getAllAgents() {
    const agents = [];
    const seenRealPaths = new Set();
    const seenNames = new Set();

    const addUniqueAgents = (list) => {
      for (const a of list) {
        if (!seenNames.has(a.cleanName)) {
          seenNames.add(a.cleanName);
          agents.push(a);
        }
      }
    };

    // 1. Agentes de workspace (.agents/agent e .agents/agents)
    if (this.workspaceAgentsDir) {
      addUniqueAgents(this.scanDir(this.workspaceAgentsDir, 'workspace', seenRealPaths));
    }
    if (this.workspaceAgentsDirAlt) {
      addUniqueAgents(this.scanDir(this.workspaceAgentsDirAlt, 'workspace', seenRealPaths));
    }

    // 2. Agentes globais (~/.gemini/config/agent e ~/.gemini/config/agents)
    addUniqueAgents(this.scanDir(this.globalAgentsDir, 'global', seenRealPaths));
    addUniqueAgents(this.scanDir(this.globalAgentsDirAlt, 'global', seenRealPaths));

    return agents.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Alterna estado de um agente renomeando .md <-> .md.disabled
   */
  toggleAgent(agentItem, targetState) {
    const { filePath, baseName, enabled } = agentItem;
    if (enabled === targetState) return agentItem;

    const dir = path.dirname(filePath);
    const activePath = path.join(dir, baseName);
    const disabledPath = path.join(dir, `${baseName}.disabled`);

    if (targetState === true) {
      // Ativar
      if (fs.existsSync(disabledPath)) {
        fs.renameSync(disabledPath, activePath);
        agentItem.filePath = activePath;
        agentItem.fileName = baseName;
      }
      agentItem.enabled = true;
    } else {
      // Desativar
      if (fs.existsSync(activePath)) {
        fs.renameSync(activePath, disabledPath);
        agentItem.filePath = disabledPath;
        agentItem.fileName = `${baseName}.disabled`;
      }
      agentItem.enabled = false;
    }

    return agentItem;
  }
}

module.exports = AgentsModel;
