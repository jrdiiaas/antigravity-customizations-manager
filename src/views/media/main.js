// Script do cliente da Webview
(function () {
  const vscode = acquireVsCodeApi();

  let state = {
    mcpServers: [],
    skills: [],
    agents: [],
    rules: [],
    stats: null,
    searchQuery: '',
    openSections: {
      mcp: true,
      skills: false,
      agents: false,
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
  const agentsListEl = document.getElementById('agents-list');
  const agentsBadgeEl = document.getElementById('agents-badge');
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
        state.agents = message.agents || [];
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
    if (mcpBadgeEl && breakdown.mcp) {
      mcpBadgeEl.textContent = `${breakdown.mcp.active}/${breakdown.mcp.total}`;
      mcpBadgeEl.className = `count-badge ${breakdown.mcp.active > 0 ? 'active' : ''}`;
    }

    if (skillsBadgeEl && breakdown.skills) {
      skillsBadgeEl.textContent = `${breakdown.skills.active}/${breakdown.skills.total}`;
      skillsBadgeEl.className = `count-badge ${breakdown.skills.active > 0 ? 'active' : ''}`;
    }

    if (agentsBadgeEl && breakdown.agents) {
      agentsBadgeEl.textContent = `${breakdown.agents.active}/${breakdown.agents.total}`;
      agentsBadgeEl.className = `count-badge ${breakdown.agents.active > 0 ? 'active' : ''}`;
    }

    if (rulesBadgeEl && breakdown.rules) {
      rulesBadgeEl.textContent = `${breakdown.rules.active}/${breakdown.rules.total}`;
      rulesBadgeEl.className = `count-badge ${breakdown.rules.active > 0 ? 'active' : ''}`;
    }
  }

  function renderLists() {
    renderMcpList();
    renderSkillsList();
    renderAgentsList();
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
          <div class="item-name" title="${escapeHtml(server.name)}">${escapeHtml(server.name)}</div>
          <div class="item-tags">
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
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.cleanName.toLowerCase().includes(query) ||
      (s.pluginName && s.pluginName.toLowerCase().includes(query)) ||
      (s.description && s.description.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      skillsListEl.innerHTML = `<div class="empty-state">Nenhuma skill encontrada</div>`;
      return;
    }

    skillsListEl.innerHTML = filtered.map(skill => {
      const scopeLabel = skill.isPlugin ? `PLUGIN: ${skill.pluginName}` : (skill.scope === 'workspace' ? 'LOCAL' : 'GLOBAL');
      const scopeClass = skill.isPlugin ? 'plugin' : (skill.scope === 'workspace' ? 'workspace' : 'global');
      return `
      <div class="item-row">
        <div class="item-info">
          <div class="item-name" title="${escapeHtml(skill.name)}">${escapeHtml(skill.name)}</div>
          <div class="item-tags">
            <span class="tag-scope ${scopeClass}">${escapeHtml(scopeLabel)}</span>
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

  function renderAgentsList() {
    const query = state.searchQuery;
    const filtered = state.agents.filter(a =>
      !query ||
      a.name.toLowerCase().includes(query) ||
      a.cleanName.toLowerCase().includes(query) ||
      (a.description && a.description.toLowerCase().includes(query)) ||
      (a.skills && a.skills.some(s => s.toLowerCase().includes(query)))
    );

    if (filtered.length === 0) {
      agentsListEl.innerHTML = `<div class="empty-state">Nenhum agente encontrado</div>`;
      return;
    }

    agentsListEl.innerHTML = filtered.map(agent => {
      const scopeLabel = agent.scope === 'workspace' ? 'LOCAL' : 'GLOBAL';
      const scopeClass = agent.scope === 'workspace' ? 'workspace' : 'global';
      const skillsCount = agent.skills && agent.skills.length > 0 ? `<span class="tag-meta" title="Skills: ${escapeHtml(agent.skills.join(', '))}">${agent.skills.length} skills</span>` : '';
      return `
      <div class="item-row">
        <div class="item-info">
          <div class="item-name" title="${escapeHtml(agent.name)}">${escapeHtml(agent.name)}</div>
          <div class="item-tags">
            <span class="tag-scope ${scopeClass}">${scopeLabel}</span>
            ${skillsCount}
          </div>
          <div class="item-desc" title="${escapeHtml(agent.description)}">
            ${escapeHtml(agent.description)}
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" data-type="agent" data-id="${escapeHtml(agent.id)}" ${agent.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `;
    }).join('');

    agentsListEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const enabled = e.target.checked;
        const agent = state.agents.find(a => a.id === id);
        if (agent) {
          vscode.postMessage({
            command: 'toggleAgent',
            agent,
            enabled
          });
        }
      });
    });
  }

  function renderRulesList() {
    const query = state.searchQuery;
    const filtered = state.rules.filter(r =>
      !query ||
      r.title.toLowerCase().includes(query) ||
      r.baseName.toLowerCase().includes(query) ||
      (r.snippet && r.snippet.toLowerCase().includes(query))
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
          <div class="item-name" title="${escapeHtml(rule.title)}">${escapeHtml(rule.title)}</div>
          <div class="item-tags">
            <span class="tag-filename" title="Arquivo: ${escapeHtml(rule.baseName)}">${escapeHtml(rule.baseName)}</span>
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
