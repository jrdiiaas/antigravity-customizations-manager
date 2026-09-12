const fs = require('fs');
const path = require('path');
const os = require('os');

class McpModel {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || '';
    this.globalConfigPath = path.join(os.homedir(), '.gemini', 'config', 'mcp_config.json');
    this.workspaceConfigPath = this.workspaceRoot ? path.join(this.workspaceRoot, '.agents', 'mcp_config.json') : '';
  }

  /**
   * Obtém a lista consolidada de todos os servidores MCP (Globais e de Workspace)
   */
  getAllServers() {
    const servers = [];

    // 1. Servidores Globais (~/.gemini/config/mcp_config.json)
    if (fs.existsSync(this.globalConfigPath)) {
      try {
        const content = fs.readFileSync(this.globalConfigPath, 'utf8');
        const json = JSON.parse(content);
        const mcpServers = json.mcpServers || {};

        for (const [name, config] of Object.entries(mcpServers)) {
          servers.push({
            name,
            scope: 'global',
            enabled: config.disabled !== true,
            command: config.command || 'npx',
            args: Array.isArray(config.args) ? config.args.join(' ') : '',
            hasEnv: Boolean(config.env && Object.keys(config.env).length > 0),
            filePath: this.globalConfigPath
          });
        }
      } catch (err) {
        console.error('[McpModel] Erro ao ler mcp_config.json global:', err.message);
      }
    }

    // 2. Servidores do Workspace (.agents/mcp_config.json)
    if (this.workspaceConfigPath && fs.existsSync(this.workspaceConfigPath)) {
      try {
        const content = fs.readFileSync(this.workspaceConfigPath, 'utf8');
        const json = JSON.parse(content);
        const mcpServers = json.mcpServers || {};

        for (const [name, config] of Object.entries(mcpServers)) {
          // Se já existe no global, sinaliza sobreposição
          const existsIndex = servers.findIndex(s => s.name === name);
          if (existsIndex >= 0) {
            servers[existsIndex].hasWorkspaceOverride = true;
          } else {
            servers.push({
              name,
              scope: 'workspace',
              enabled: config.disabled !== true,
              command: config.command || 'npx',
              args: Array.isArray(config.args) ? config.args.join(' ') : '',
              hasEnv: Boolean(config.env && Object.keys(config.env).length > 0),
              filePath: this.workspaceConfigPath
            });
          }
        }
      } catch (err) {
        console.error('[McpModel] Erro ao ler mcp_config.json de workspace:', err.message);
      }
    }

    return servers.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Alterna o estado de um servidor MCP específico
   */
  toggleServer(name, scope, targetState) {
    const targetFile = scope === 'workspace' && this.workspaceConfigPath ? this.workspaceConfigPath : this.globalConfigPath;

    if (!fs.existsSync(targetFile)) {
      throw new Error(`Arquivo de configuração não encontrado: ${targetFile}`);
    }

    const content = fs.readFileSync(targetFile, 'utf8');
    const json = JSON.parse(content);

    if (!json.mcpServers || !json.mcpServers[name]) {
      throw new Error(`Servidor MCP '${name}' não encontrado em ${targetFile}`);
    }

    // Backup preventivo
    try {
      fs.writeFileSync(`${targetFile}.bak`, content, 'utf8');
    } catch (_) {}

    // targetState: true = ativado (disabled: false), false = desativado (disabled: true)
    if (targetState === true) {
      json.mcpServers[name].disabled = false;
    } else {
      json.mcpServers[name].disabled = true;
    }

    fs.writeFileSync(targetFile, JSON.stringify(json, null, 2), 'utf8');
    return { name, enabled: targetState, scope };
  }

  /**
   * Ativa ou desativa todos os servidores MCP
   */
  toggleAll(targetState) {
    const files = [this.globalConfigPath];
    if (this.workspaceConfigPath && fs.existsSync(this.workspaceConfigPath)) {
      files.push(this.workspaceConfigPath);
    }

    for (const targetFile of files) {
      if (fs.existsSync(targetFile)) {
        try {
          const content = fs.readFileSync(targetFile, 'utf8');
          const json = JSON.parse(content);
          if (json.mcpServers) {
            for (const key of Object.keys(json.mcpServers)) {
              json.mcpServers[key].disabled = !targetState;
            }
            fs.writeFileSync(`${targetFile}.bak`, content, 'utf8');
            fs.writeFileSync(targetFile, JSON.stringify(json, null, 2), 'utf8');
          }
        } catch (err) {
          console.error(`[McpModel] Erro ao processar toggleAll em ${targetFile}:`, err.message);
        }
      }
    }

    return this.getAllServers();
  }
}

module.exports = McpModel;
