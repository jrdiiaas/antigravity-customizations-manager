const vscode = require('vscode');

class WebviewHtml {
  /**
   * Gera a página HTML da Webview com nonce, CSP rigoroso e termos 100% em pt-BR
   */
  static getHtml(webview, extensionUri) {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'views', 'media', 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'views', 'media', 'main.js'));
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestor de Tokens IA</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <!-- Cabeçalho com Consumo de Tokens -->
  <div class="header-container">
    <div class="budget-card">
      <div class="budget-header">
        <span class="budget-title">ORÇAMENTO DE TOKENS</span>
        <span class="budget-value"><span id="total-tokens">0</span> / <span id="budget-limit">20.000</span></span>
      </div>
      <div class="progress-track">
        <div id="progress-fill" class="progress-fill healthy" style="width: 0%;"></div>
      </div>
      <div class="budget-footer">
        <span id="budget-status-text">Calculando consumo...</span>
      </div>
    </div>

    <!-- Campo de Busca -->
    <div class="search-wrapper">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input type="text" id="search-input" class="search-input" placeholder="Buscar MCP, Skill ou Regra...">
    </div>

    <!-- Ações Rápidas -->
    <div class="actions-row">
      <button id="btn-disable-all-mcp" class="btn-pill danger" title="Desativa todos os servidores MCP para economizar tokens imediatamente">
        ⚡ Desligar MCPs
      </button>
      <button id="btn-refresh" class="btn-pill" title="Recarregar do disco">
        🔄 Atualizar
      </button>
    </div>
  </div>

  <!-- Seção 1: Servidores MCP -->
  <div class="accordion-section open" data-section="mcp">
    <div class="accordion-header">
      <div class="accordion-title-area">
        <span class="accordion-icon">🔌</span>
        <span class="accordion-title">Servidores MCP</span>
      </div>
      <div class="accordion-meta">
        <span id="mcp-badge" class="count-badge">0/0</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="accordion-body">
      <div id="mcp-list">Carregando MCPs...</div>
    </div>
  </div>

  <!-- Seção 2: Skills -->
  <div class="accordion-section" data-section="skills">
    <div class="accordion-header">
      <div class="accordion-title-area">
        <span class="accordion-icon">🧠</span>
        <span class="accordion-title">Skills & Agentes</span>
      </div>
      <div class="accordion-meta">
        <span id="skills-badge" class="count-badge">0/0</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="accordion-body">
      <div id="skills-list">Carregando skills...</div>
    </div>
  </div>

  <!-- Seção 3: Regras (Rules) -->
  <div class="accordion-section" data-section="rules">
    <div class="accordion-header">
      <div class="accordion-title-area">
        <span class="accordion-icon">📜</span>
        <span class="accordion-title">Regras & Instruções</span>
      </div>
      <div class="accordion-meta">
        <span id="rules-badge" class="count-badge">0/0</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="accordion-body">
      <div id="rules-list">Carregando regras...</div>
    </div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  static getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}

module.exports = WebviewHtml;
