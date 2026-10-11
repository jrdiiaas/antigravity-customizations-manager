const fs = require('fs');
const path = require('path');
const os = require('os');

class McpToolIndexModel {
  constructor(workspaceRoot = '') {
    this.workspaceRoot = workspaceRoot || '';
    this.globalMcpDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'mcp');
    this.workspaceMcpDir = this.workspaceRoot ? path.join(this.workspaceRoot, '.agents', 'mcp') : '';

    this.catalog = {};
    try {
      const catalogPath = path.join(__dirname, 'data', 'mcp-catalog.json');
      if (fs.existsSync(catalogPath)) {
        this.catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      }
    } catch (err) {
      console.error('[McpToolIndexModel] Erro ao carregar mcp-catalog.json:', err.message);
    }
  }

  /**
   * Trunca texto na primeira frase e em no máximo maxWords palavras
   */
  static truncateToPhrase(text, maxWords = 15) {
    if (!text || typeof text !== 'string') return '';
    const clean = text.replace(/^#+\s*/g, '').replace(/\r?\n+/g, ' ').trim();
    if (!clean) return '';

    // Primeira frase
    const firstSentenceMatch = clean.match(/^([^.!?]+[.!?]?)/);
    let sentence = firstSentenceMatch ? firstSentenceMatch[1].trim() : clean;

    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length > maxWords) {
      return words.slice(0, maxWords).join(' ') + '...';
    }

    if (!/[.!?…]$/.test(sentence)) {
      sentence += '.';
    }
    return sentence;
  }

  /**
   * Obtém contagem de ferramentas e tamanho total dos schemas em bytes para um servidor MCP
   */
  getToolInfo(serverName) {
    const candidates = [];
    if (this.workspaceMcpDir) {
      candidates.push(path.join(this.workspaceMcpDir, serverName));
    }
    candidates.push(path.join(this.globalMcpDir, serverName));

    let targetDir = null;
    for (const dir of candidates) {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        targetDir = dir;
        break;
      }
    }

    if (!targetDir) {
      return {
        serverName,
        toolsCount: 0,
        toolNames: [],
        totalSchemaBytes: 0,
        schemaBytesPerTool: 0,
        hasSchemasDir: false,
        instructionsSnippet: ''
      };
    }

    try {
      const files = fs.readdirSync(targetDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'package.json');
      let totalSchemaBytes = 0;
      const toolNames = [];

      for (const jsonFile of jsonFiles) {
        try {
          const filePath = path.join(targetDir, jsonFile);
          const stats = fs.statSync(filePath);
          totalSchemaBytes += stats.size;
          toolNames.push(path.basename(jsonFile, '.json'));
        } catch (_) {}
      }

      let instructionsSnippet = '';
      const instructionsPath = path.join(targetDir, 'instructions.md');
      if (fs.existsSync(instructionsPath)) {
        try {
          const raw = fs.readFileSync(instructionsPath, 'utf8');
          instructionsSnippet = McpToolIndexModel.truncateToPhrase(raw, 15);
        } catch (_) {}
      }

      const toolsCount = jsonFiles.length;
      return {
        serverName,
        toolsCount,
        toolNames,
        totalSchemaBytes,
        schemaBytesPerTool: toolsCount > 0 ? Math.round(totalSchemaBytes / toolsCount) : 0,
        hasSchemasDir: true,
        instructionsSnippet
      };
    } catch (err) {
      console.error(`[McpToolIndexModel] Erro ao ler schemas de ${serverName}:`, err.message);
      return {
        serverName,
        toolsCount: 0,
        toolNames: [],
        totalSchemaBytes: 0,
        schemaBytesPerTool: 0,
        hasSchemasDir: false,
        instructionsSnippet: ''
      };
    }
  }

  /**
   * Obtém a descrição curta em pt-BR (<= 15 palavras) para o servidor MCP
   */
  getDescription(serverName, toolInfo = null) {
    // 1. Catálogo embutido
    if (this.catalog && this.catalog[serverName]) {
      return McpToolIndexModel.truncateToPhrase(this.catalog[serverName], 15);
    }

    // 2. instructions.md se disponível
    if (toolInfo && toolInfo.instructionsSnippet) {
      return toolInfo.instructionsSnippet;
    }

    // 3. Fallback neutro portátil
    return 'Servidor MCP personalizado. Sem descrição disponível.';
  }
}

module.exports = McpToolIndexModel;
