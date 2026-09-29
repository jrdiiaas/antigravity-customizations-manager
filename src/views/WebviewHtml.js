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
  <!-- Cabeçalho com Consumo de Tokens e Model Quotas -->
  <div class="header-container">
    
    <!-- Seção de Cotas de Modelos em Tempo Real (Antigravity Models Quota) -->
    <div id="model-quota-container" class="model-quota-container">
      
      <!-- Card Gemini Models -->
      <div class="quota-section" id="model-quota-gemini">
        <div class="quota-section-header">
          <div class="quota-header-left">
            <span class="quota-section-title">Gemini Models</span>
            <span class="quota-info-tooltip-btn" title="Modelos deste grupo: Gemini Flash, Gemini Pro. Limite semanal e taxa de 5 horas compartilhados.">
              <svg class="info-icon" viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
              </svg>
            </span>
          </div>
          <span class="quota-model-subtitle">Gemini Flash, Gemini Pro</span>
        </div>
        <div class="quota-card">
          <!-- Bucket 1: Weekly Limit -->
          <div class="quota-item" id="item-gemini-weekly">
            <div class="quota-item-info">
              <div class="quota-item-title">Weekly Limit Remaining</div>
              <div class="quota-item-desc" id="quota-gemini-weekly-desc">Consultando cota semanal...</div>
            </div>
            <div class="quota-item-value">
              <span class="quota-percentage" id="quota-gemini-weekly-percentage">--%</span>
              <div class="circular-progress">
                <svg viewBox="0 0 36 36">
                  <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="circle" id="quota-gemini-weekly-ring" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
            </div>
          </div>
          <!-- Bucket 2: 5-Hour Limit -->
          <div class="quota-item" id="item-gemini-5h">
            <div class="quota-item-info">
              <div class="quota-item-title">Five Hour Limit Remaining</div>
              <div class="quota-item-desc" id="quota-gemini-5h-desc">Consultando limite de 5 horas...</div>
            </div>
            <div class="quota-item-value">
              <span class="quota-percentage" id="quota-gemini-5h-percentage">--%</span>
              <div class="circular-progress">
                <svg viewBox="0 0 36 36">
                  <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="circle" id="quota-gemini-5h-ring" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Card Claude and GPT models -->
      <div class="quota-section" id="model-quota-claudegpt">
        <div class="quota-section-header">
          <div class="quota-header-left">
            <span class="quota-section-title">Claude and GPT models</span>
            <span class="quota-info-tooltip-btn" title="Modelos deste grupo: Claude Opus, Claude Sonnet, GPT-OSS. Limite semanal e taxa de 5 horas compartilhados.">
              <svg class="info-icon" viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
              </svg>
            </span>
          </div>
          <span class="quota-model-subtitle">Claude Opus, Claude Sonnet, GPT-OSS</span>
        </div>
        <div class="quota-card">
          <!-- Bucket 1: Weekly Limit -->
          <div class="quota-item" id="item-claudegpt-weekly">
            <div class="quota-item-info">
              <div class="quota-item-title">Weekly Limit Remaining</div>
              <div class="quota-item-desc" id="quota-claudegpt-weekly-desc">Consultando cota semanal...</div>
            </div>
            <div class="quota-item-value">
              <span class="quota-percentage" id="quota-claudegpt-weekly-percentage">--%</span>
              <div class="circular-progress">
                <svg viewBox="0 0 36 36">
                  <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="circle" id="quota-claudegpt-weekly-ring" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
            </div>
          </div>
          <!-- Bucket 2: 5-Hour Limit -->
          <div class="quota-item" id="item-claudegpt-5h">
            <div class="quota-item-info">
              <div class="quota-item-title">Five Hour Limit Remaining</div>
              <div class="quota-item-desc" id="quota-claudegpt-5h-desc">Consultando limite de 5 horas...</div>
            </div>
            <div class="quota-item-value">
              <span class="quota-percentage" id="quota-claudegpt-5h-percentage">--%</span>
              <div class="circular-progress">
                <svg viewBox="0 0 36 36">
                  <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="circle" id="quota-claudegpt-5h-ring" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card de Orçamento de Contexto Geral -->
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
      <input type="text" id="search-input" class="search-input" placeholder="Buscar MCP, Skill, Agente ou Regra...">
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
    <div class="accordion-content">
      <div id="mcp-list" class="items-list">
        <!-- Renderizado dinamicamente via JS -->
      </div>
    </div>
  </div>

  <!-- Seção 2: Skills -->
  <div class="accordion-section" data-section="skills">
    <div class="accordion-header">
      <div class="accordion-title-area">
        <span class="accordion-icon">⚡</span>
        <span class="accordion-title">Skills</span>
      </div>
      <div class="accordion-meta">
        <span id="skills-badge" class="count-badge">0/0</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="accordion-content">
      <div id="skills-list" class="items-list">
        <!-- Renderizado dinamicamente via JS -->
      </div>
    </div>
  </div>

  <!-- Seção 3: Agentes -->
  <div class="accordion-section" data-section="agents">
    <div class="accordion-header">
      <div class="accordion-title-area">
        <span class="accordion-icon">🤖</span>
        <span class="accordion-title">Subagentes</span>
      </div>
      <div class="accordion-meta">
        <span id="agents-badge" class="count-badge">0/0</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="accordion-content">
      <div id="agents-list" class="items-list">
        <!-- Renderizado dinamicamente via JS -->
      </div>
    </div>
  </div>

  <!-- Seção 4: Regras & Instruções -->
  <div class="accordion-section" data-section="rules">
    <div class="accordion-header">
      <div class="accordion-title-area">
        <span class="accordion-icon">📜</span>
        <span class="accordion-title">Regras e Instruções</span>
      </div>
      <div class="accordion-meta">
        <span id="rules-badge" class="count-badge">0/0</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="accordion-content">
      <div id="rules-list" class="items-list">
        <!-- Renderizado dinamicamente via JS -->
      </div>
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
