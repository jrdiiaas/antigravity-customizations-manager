// Script do cliente da Webview
(function () {
  const vscode = acquireVsCodeApi();

  let state = {
    mcpServers: [],
    skills: [],
    rules: [],
    stats: null,
    searchQuery: '',
    openSections: {
      mcp: true,
      skills: false,
      rules: false
    }
  };

  // Elementos DOM
  const totalTokensEl = document.getElementById('total-tokens');
  const budgetLimitEl = document.getElementById('budget-limit');
  const progressFillEl = document.getElementById('progress-fill');
  const budgetStatusTextEl = document.getElementById('budget-status-text');
  const searchInputEl = document.getElementById('search-input');

  const mcpListEl = document.getElementById('mcp-list');
  const mcpBadgeEl = document.getElementById('mcp-badge');
  const skillsListEl = document.getElementById('skills-list');
  const skillsBadgeEl = document.getElementById('skills-badge');
  const rulesListEl = document.getElementById('rules-list');
  const rulesBadgeEl = document.getElementById('rules-badge');

  // Inicialização de Accordions
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      const sectionId = section.dataset.section;
      section.classList.toggle('open');
      state.openSections[sectionId] = section.classList.contains('open');
    });
  });

  // Busca em tempo real
  searchInputEl.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderLists();
  });

  // Botões de Ação Rápida
  document.getElementById('btn-disable-all-mcp').addEventListener('click', () => {
    vscode.postMessage({ command: 'disableAllMcp' });
  });

  document.getElementById('btn-refresh').addEventListener('click', () => {
    vscode.postMessage({ command: 'refresh' });
  });

  // Escuta mensagens vindas do Controller da Extensão
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'updateData':
        state.mcpServers = message.mcpServers || [];
        state.skills = message.skills || [];
        state.rules = message.rules || [];
        state.stats = message.stats || null;
        updateUI();
        break;
      case 'error':
        console.error('Erro recebido:', message.error);
        break;
    }
  });

  function updateUI() {
    renderStats();
    renderLists();
  }

  function renderStats() {
    if (!state.stats) return;
    const { totalTokens, budgetLimit, percentage, status, statusText, breakdown } = state.stats;

    totalTokensEl.textContent = Number(totalTokens).toLocaleString('pt-BR');
    budgetLimitEl.textContent = Number(budgetLimit).toLocaleString('pt-BR');
    budgetStatusTextEl.textContent = statusText;

    progressFillEl.style.width = `${percentage}%`;
    progressFillEl.className = `progress-fill ${status}`;

    // Badges dos cabeçalhos
    mcpBadgeEl.textContent = `${breakdown.mcp.active}/${breakdown.mcp.total}`;
    mcpBadgeEl.className = `count-badge ${breakdown.mcp.active > 0 ? 'active' : ''}`;

    skillsBadgeEl.textContent = `${breakdown.skills.active}/${breakdown.skills.total}`;
    skillsBadgeEl.className = `count-badge ${breakdown.skills.active > 0 ? 'active' : ''}`;

    rulesBadgeEl.textContent = `${breakdown.rules.active}/${breakdown.rules.total}`;
    rulesBadgeEl.className = `count-badge ${breakdown.rules.active > 0 ? 'active' : ''}`;
  }

  function renderLists() {
    renderMcpList();
    renderSkillsList();
    renderRulesList();
  }

  function renderMcpList() {
    const query = state.searchQuery;
    const filtered = state.mcpServers.filter(s =>
      !query || s.name.toLowerCase().includes(query) || (s.command && s.command.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      mcpListEl.innerHTML = `<div class="empty-state">Nenhum servidor MCP encontrado</div>`;
      return;
    }

    mcpListEl.innerHTML = filtered.map(server => {
      const scopeLabel = server.scope === 'workspace' ? 'LOCAL' : 'GLOBAL';
      const scopeClass = server.scope === 'workspace' ? 'workspace' : 'global';
      return `
      <div class="item-row">
        <div class="item-info">
          <div class="item-top">
            <span class="item-name" title="${escapeHtml(server.name)}">${escapeHtml(server.name)}</span>
            <span class="tag-scope ${scopeClass}">${scopeLabel}</span>
          </div>
          <div class="item-desc" title="${escapeHtml(server.command + ' ' + server.args)}">
            ${escapeHtml(server.command)} ${escapeHtml(server.args)}
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" data-type="mcp" data-name="${escapeHtml(server.name)}" data-scope="${server.scope}" ${server.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `;
    }).join('');

    mcpListEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const name = e.target.dataset.name;
        const scope = e.target.dataset.scope;
        const enabled = e.target.checked;
        vscode.postMessage({
          command: 'toggleMcp',
          name,
          scope,
          enabled
        });
      });
    });
  }

  function renderSkillsList() {
    const query = state.searchQuery;
    const filtered = state.skills.filter(s =>
      !query || s.name.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      skillsListEl.innerHTML = `<div class="empty-state">Nenhuma skill encontrada</div>`;
      return;
    }

    skillsListEl.innerHTML = filtered.map(skill => {
      const scopeLabel = skill.scope === 'workspace' ? 'LOCAL' : 'GLOBAL';
      const scopeClass = skill.scope === 'workspace' ? 'workspace' : 'global';
      return `
      <div class="item-row">
        <div class="item-info">
          <div class="item-top">
            <span class="item-name" title="${escapeHtml(skill.name)}">${escapeHtml(skill.name)}</span>
            <span class="tag-scope ${scopeClass}">${scopeLabel}</span>
          </div>
          <div class="item-desc" title="${escapeHtml(skill.description)}">${escapeHtml(skill.description)}</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-type="skill" data-id="${escapeHtml(skill.id)}" ${skill.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `;
    }).join('');

    skillsListEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const enabled = e.target.checked;
        const skill = state.skills.find(s => s.id === id);
        if (skill) {
          vscode.postMessage({
            command: 'toggleSkill',
            skill,
            enabled
          });
        }
      });
    });
  }

  function renderRulesList() {
    const query = state.searchQuery;
    const filtered = state.rules.filter(r =>
      !query || r.title.toLowerCase().includes(query) || r.baseName.toLowerCase().includes(query) || (r.snippet && r.snippet.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      rulesListEl.innerHTML = `<div class="empty-state">Nenhuma regra encontrada</div>`;
      return;
    }

    rulesListEl.innerHTML = filtered.map(rule => {
      const scopeLabel = rule.scope === 'workspace' ? 'LOCAL' : 'GLOBAL';
      const scopeClass = rule.scope === 'workspace' ? 'workspace' : 'global';
      return `
      <div class="item-row">
        <div class="item-info">
          <div class="item-top">
            <span class="item-name" title="${escapeHtml(rule.title)}">${escapeHtml(rule.title)}</span>
            <span class="tag-scope ${scopeClass}">${scopeLabel}</span>
          </div>
          <div class="item-desc" title="${escapeHtml(rule.snippet)}">${escapeHtml(rule.snippet)}</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-type="rule" data-id="${escapeHtml(rule.id)}" ${rule.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `;
    }).join('');

    rulesListEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const enabled = e.target.checked;
        const rule = state.rules.find(r => r.id === id);
        if (rule) {
          vscode.postMessage({
            command: 'toggleRule',
            rule,
            enabled
          });
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Notifica o controller que o webview está pronto para carregar os dados
  vscode.postMessage({ command: 'ready' });
})();
