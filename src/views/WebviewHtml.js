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

    <!-- Legenda Didática Inline (Section 9.2) -->
    <div class="legend-card">
      <div class="legend-header">
        <span class="legend-icon">💡</span>
        <span class="legend-title">Como ler este painel</span>
      </div>
      <div class="legend-content">
        <div class="legend-item">
          <span class="cost-chip rest">Repouso</span>
          <span class="legend-desc"><strong>Aluguel fixo:</strong> entra em <em>toda mensagem</em> para manter o item pronto no contexto.</span>
        </div>
        <div class="legend-item">
          <span class="cost-chip active">Em uso</span>
          <span class="legend-desc"><strong>Conta de consumo:</strong> custo extra cobrado <em>somente quando acionado</em>.</span>
        </div>
      </div>
    </div>

    <!-- Simulador de Custo Acumulado (Section 9 & 9.2 - Começa recolhido) -->
    <div class="simulator-card" id="simulator-card">
      <div class="simulator-header" id="simulator-toggle">
        <div class="simulator-title-area">
          <span class="simulator-icon">📈</span>
          <span class="simulator-title">Simulador de Custo Acumulado</span>
        </div>
        <div class="simulator-meta">
          <span class="simulator-badge" id="simulator-badge">20 msgs</span>
          <svg class="chevron mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="simulator-content" id="simulator-content">
        <p class="simulator-text">
          O repouso é recobrado a cada turno: <em>1 token ≈ 3,8 caracteres (~4 letras)</em>.
        </p>
        <div class="simulator-controls">
          <label class="simulator-label">Mensagens na conversa:</label>
          <div class="simulator-buttons">
            <button class="btn-step" data-turns="5">5</button>
            <button class="btn-step" data-turns="10">10</button>
            <button class="btn-step active" data-turns="20">20</button>
            <button class="btn-step" data-turns="50">50</button>
          </div>
        </div>
        <div class="simulator-result" id="simulator-result">
          <div class="simulator-result-math">
            <span id="sim-turns">20</span> msgs × <span id="sim-rest">0</span> tok/msg = <strong id="sim-total">0</strong> tokens acumulados
          </div>
          <div class="simulator-analogy">
            🏠 <em>Analogia:</em> Itens em repouso são cobrados a cada mensagem que você envia. Desative o que não for usar agora para liberar espaço no contexto.
          </div>
        </div>
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

  <!-- Seção 2: Skills (com categorias aninhadas em acordeão) -->
  <div class="accordion-section" data-section="skills">
    <div class="accordion-header">
      <div class="accordion-title-area">
        <span class="accordion-icon">⚡</span>
        <span class="accordion-title">Skills</span>
      </div>
      <div class="accordion-meta">
        <button id="btn-reset-skills-categories" class="btn-text-action" title="Restaurar categorias padrão de todas as skills">↺ Padrão</button>
        <span id="skills-badge" class="count-badge">0/0</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="accordion-content">
      <div id="skills-categories-container" class="categories-container">
        <!-- Renderizado dinamicamente via JS em grupos de categoria -->
      </div>
    </div>
  </div>

  <!-- Seção 3: Agentes (com categorias aninhadas em acordeão) -->
  <div class="accordion-section" data-section="agents">
    <div class="accordion-header">
      <div class="accordion-title-area">
        <span class="accordion-icon">🤖</span>
        <span class="accordion-title">Subagentes</span>
      </div>
      <div class="accordion-meta">
        <button id="btn-reset-agents-categories" class="btn-text-action" title="Restaurar categorias padrão de todos os agentes">↺ Padrão</button>
        <span id="agents-badge" class="count-badge">0/0</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="accordion-content">
      <div id="agents-categories-container" class="categories-container">
        <!-- Renderizado dinamicamente via JS em grupos de categoria -->
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

  <!-- Modal / Diálogo para Nova Categoria -->
  <div id="new-category-modal" class="modal-overlay hidden">
    <div class="modal-card">
      <div class="modal-title">＋ Nova Categoria</div>
      <div class="modal-desc">Digite o nome e um emoji (ex.: 📊 Relatórios):</div>
      <input type="text" id="new-category-input" class="modal-input" placeholder="Ex: 📊 Relatórios" maxlength="40">
      <div class="modal-actions">
        <button id="modal-cancel" class="btn-pill">Cancelar</button>
        <button id="modal-confirm" class="btn-pill primary">Salvar Categoria</button>
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
