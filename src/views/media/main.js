// Script do cliente da Webview - Gestor de Tokens IA v2.1.0
(function () {
  const vscode = acquireVsCodeApi();

  let state = {
    mcpServers: [],
    skills: [],
    skillCategories: [],
    agents: [],
    agentCategories: [],
    rules: [],
    stats: null,
    quota: null,
    availableCategories: [],
    searchQuery: '',
    openSections: {
      mcp: true,
      skills: false,
      agents: false,
      rules: false
    },
    openCategories: {},
    simulatorTurns: 20,
    simulatorOpen: false,
    activeDropdown: null,
    pendingNewCategoryTarget: null
  };

  // Elementos DOM - Orçamento e Busca
  const totalTokensEl = document.getElementById('total-tokens');
  const budgetLimitEl = document.getElementById('budget-limit');
  const progressFillEl = document.getElementById('progress-fill');
  const budgetStatusTextEl = document.getElementById('budget-status-text');
  const searchInputEl = document.getElementById('search-input');

  // Elementos DOM - Listas e Badges
  const mcpListEl = document.getElementById('mcp-list');
  const mcpBadgeEl = document.getElementById('mcp-badge');
  const skillsCategoriesContainerEl = document.getElementById('skills-categories-container');
  const skillsBadgeEl = document.getElementById('skills-badge');
  const agentsCategoriesContainerEl = document.getElementById('agents-categories-container');
  const agentsBadgeEl = document.getElementById('agents-badge');
  const rulesListEl = document.getElementById('rules-list');
  const rulesBadgeEl = document.getElementById('rules-badge');

  // Elementos DOM - Simulador
  const simulatorCardEl = document.getElementById('simulator-card');
  const simulatorToggleEl = document.getElementById('simulator-toggle');
  const simTurnsEl = document.getElementById('sim-turns');
  const simRestEl = document.getElementById('sim-rest');
  const simTotalEl = document.getElementById('sim-total');
  const simulatorBadgeEl = document.getElementById('simulator-badge');

  // Elementos DOM - Modal Nova Categoria
  const newCategoryModalEl = document.getElementById('new-category-modal');
  const newCategoryInputEl = document.getElementById('new-category-input');
  const modalCancelBtn = document.getElementById('modal-cancel');
  const modalConfirmBtn = document.getElementById('modal-confirm');

  // Inicialização de Accordions Principais
  document.querySelectorAll('.accordion-section > .accordion-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Ignora clique se clicou em botão de ação do header (ex.: ↺ Padrão)
      if (e.target.closest('.btn-text-action')) return;

      const section = header.parentElement;
      const sectionId = section.dataset.section;
      section.classList.toggle('open');
      state.openSections[sectionId] = section.classList.contains('open');
    });
  });

  // Toggle do Simulador Acumulado
  if (simulatorToggleEl) {
    simulatorToggleEl.addEventListener('click', () => {
      state.simulatorOpen = !state.simulatorOpen;
      simulatorCardEl.classList.toggle('open', state.simulatorOpen);
    });
  }

  // Controles de Turns do Simulador
  document.querySelectorAll('.btn-step').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-step').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.simulatorTurns = parseInt(btn.dataset.turns, 10) || 20;
      renderSimulator();
    });
  });

  // Botões de Restaurar Todas as Categorias
  const resetSkillsBtn = document.getElementById('btn-reset-skills-categories');
  if (resetSkillsBtn) {
    resetSkillsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      vscode.postMessage({ command: 'resetAllCategories', type: 'skills' });
    });
  }

  const resetAgentsBtn = document.getElementById('btn-reset-agents-categories');
  if (resetAgentsBtn) {
    resetAgentsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      vscode.postMessage({ command: 'resetAllCategories', type: 'agents' });
    });
  }

  // Modal Nova Categoria
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
      closeNewCategoryModal();
    });
  }

  if (modalConfirmBtn) {
    modalConfirmBtn.addEventListener('click', () => {
      confirmNewCategory();
    });
  }

  if (newCategoryInputEl) {
    newCategoryInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmNewCategory();
      if (e.key === 'Escape') closeNewCategoryModal();
    });
  }

  function openNewCategoryModal(targetType, targetItemName) {
    state.pendingNewCategoryTarget = { type: targetType, itemName: targetItemName };
    newCategoryInputEl.value = '';
    newCategoryModalEl.classList.remove('hidden');
    newCategoryInputEl.focus();
  }

  function closeNewCategoryModal() {
    newCategoryModalEl.classList.add('hidden');
    state.pendingNewCategoryTarget = null;
  }

  function confirmNewCategory() {
    const val = newCategoryInputEl.value.trim();
    if (!val) return;

    vscode.postMessage({ command: 'createCategory', categoryName: val });

    if (state.pendingNewCategoryTarget) {
      vscode.postMessage({
        command: 'moveItemCategory',
        type: state.pendingNewCategoryTarget.type,
        itemName: state.pendingNewCategoryTarget.itemName,
        category: val
      });
    }

    closeNewCategoryModal();
  }

  // Fecha dropdowns se clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.chip-category-wrapper')) {
      closeAllDropdowns();
    }
  });

  function closeAllDropdowns() {
    document.querySelectorAll('.category-dropdown').forEach(d => d.remove());
    state.activeDropdown = null;
  }

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
        state.skillCategories = message.skillCategories || [];
        state.agents = message.agents || [];
        state.agentCategories = message.agentCategories || [];
        state.rules = message.rules || [];
        state.stats = message.stats || null;
        state.availableCategories = message.availableCategories || [];
        if (message.quota) {
          state.quota = message.quota;
        }
        updateUI();
        break;

      case 'updateQuota':
        if (message.quota) {
          state.quota = message.quota;
          renderQuota();
        }
        break;

      case 'error':
        console.error('Erro recebido:', message.error);
        break;
    }
  });

  function updateUI() {
    renderStats();
    renderQuota();
    renderSimulator();
    renderLists();
  }

  /**
   * Renderiza os 4 indicadores oficiais de cota em tempo real (Gemini + Claude/GPT x Weekly + 5h)
   */
  function renderQuota() {
    if (!state.quota || !state.quota.groups) return;

    const updateBucket = (prefix, bucket) => {
      const percentEl = document.getElementById(`quota-${prefix}-percentage`);
      const ringEl = document.getElementById(`quota-${prefix}-ring`);
      const descEl = document.getElementById(`quota-${prefix}-desc`);

      if (!percentEl || !ringEl || !descEl) return;

      if (!bucket) {
        percentEl.textContent = '--%';
        descEl.textContent = 'Métrica indisponível no momento.';
        ringEl.setAttribute('stroke-dasharray', '0, 100');
        ringEl.style.stroke = 'rgba(255, 255, 255, 0.15)';
        return;
      }

      const percentage = bucket.percentage != null ? bucket.percentage : 0;
      percentEl.textContent = `${percentage}%`;
      descEl.textContent = bucket.description || (percentage >= 100 ? 'Seu limite está 100% disponível.' : '');

      ringEl.setAttribute('stroke-dasharray', `${percentage}, 100`);

      if (percentage > 50) {
        ringEl.style.stroke = '#4ade80';
      } else if (percentage > 15) {
        ringEl.style.stroke = '#fbbf24';
      } else {
        ringEl.style.stroke = '#ef4444';
      }
    };

    // Grupo 1: Gemini Models
    const geminiGroup = state.quota.groups.find(g => g.id === 'gemini');
    if (geminiGroup && geminiGroup.buckets) {
      const weekly = geminiGroup.buckets.find(b => b.window === 'weekly' || (b.id && b.id.includes('weekly')));
      const fiveHour = geminiGroup.buckets.find(b => b.window === '5h' || (b.id && b.id.includes('5h')));
      updateBucket('gemini-weekly', weekly);
      updateBucket('gemini-5h', fiveHour);
    }

    // Grupo 2: Claude and GPT models
    const claudeGroup = state.quota.groups.find(g => g.id === 'claudegpt');
    if (claudeGroup && claudeGroup.buckets) {
      const weekly = claudeGroup.buckets.find(b => b.window === 'weekly' || (b.id && b.id.includes('weekly')));
      const fiveHour = claudeGroup.buckets.find(b => b.window === '5h' || (b.id && b.id.includes('5h')));
      updateBucket('claudegpt-weekly', weekly);
      updateBucket('claudegpt-5h', fiveHour);
    }
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

  function renderSimulator() {
    if (!state.stats) return;
    const totalTokens = state.stats.totalTokens || 0;
    const turns = state.simulatorTurns || 20;
    const accumulated = totalTokens * turns;

    if (simTurnsEl) simTurnsEl.textContent = turns;
    if (simRestEl) simRestEl.textContent = totalTokens.toLocaleString('pt-BR');
    if (simTotalEl) simTotalEl.textContent = accumulated.toLocaleString('pt-BR');
    if (simulatorBadgeEl) simulatorBadgeEl.textContent = `${turns} msgs (~${accumulated.toLocaleString('pt-BR')})`;
  }

  function renderLists() {
    renderMcpList();
    renderSkillsCategories();
    renderAgentsCategories();
    renderRulesList();
  }

  /**
   * Renderiza lista de servidores MCP com layout do Section 7
   */
  function renderMcpList() {
    const query = state.searchQuery;
    const filtered = state.mcpServers.filter(s =>
      !query || s.name.toLowerCase().includes(query) || (s.command && s.command.toLowerCase().includes(query)) || (s.shortDesc && s.shortDesc.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      mcpListEl.innerHTML = `<div class="empty-state">Nenhum servidor MCP encontrado</div>`;
      return;
    }

    mcpListEl.innerHTML = filtered.map(server => {
      const scopeLabel = server.scope === 'workspace' ? 'LOCAL' : 'GLOBAL';
      const scopeClass = server.scope === 'workspace' ? 'workspace' : 'global';
      const toolsCountTag = server.toolsCount > 0 ? `<span class="tag-meta" title="${server.toolsCount} ferramentas detectadas">${server.toolsCount} ferramentas</span>` : '';
      const cost = server.cost || { restLabel: 'Repouso ~280 tok/msg', activeLabel: '~300 + resposta' };

      return `
      <div class="item-row">
        <div class="item-info">
          <div class="item-name" title="${escapeHtml(server.name)}">${escapeHtml(server.name)}</div>
          <div class="item-tags">
            <span class="tag-scope ${scopeClass}">${scopeLabel}</span>
            ${toolsCountTag}
          </div>
          <div class="item-desc" title="${escapeHtml(server.command + ' ' + (server.args || ''))}">
            ${escapeHtml(server.shortDesc || server.command)}
          </div>
          <div class="item-cost-row">
            <span class="cost-pill rest" title="Custo de repouso: cobrado em cada mensagem">${escapeHtml(cost.restLabel)}</span>
            <span class="cost-pill active" title="Custo em uso: cobrado pontualmente quando a ferramenta é chamada">Em uso ${escapeHtml(cost.activeLabel)}</span>
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

  /**
   * Renderiza categorias aninhadas de Skills em acordeão (Section 9.4 e 9.5)
   */
  function renderSkillsCategories() {
    const query = state.searchQuery;
    const categories = state.skillCategories || [];

    // Filtra itens dentro de cada categoria
    const filteredCategories = categories.map(cat => {
      const filteredItems = cat.items.filter(s =>
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.cleanName.toLowerCase().includes(query) ||
        (s.pluginName && s.pluginName.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (s.shortDesc && s.shortDesc.toLowerCase().includes(query)) ||
        cat.name.toLowerCase().includes(query)
      );
      return {
        ...cat,
        filteredItems
      };
    }).filter(cat => cat.filteredItems.length > 0);

    if (filteredCategories.length === 0) {
      skillsCategoriesContainerEl.innerHTML = `<div class="empty-state">Nenhuma skill encontrada</div>`;
      return;
    }

    skillsCategoriesContainerEl.innerHTML = filteredCategories.map(cat => {
      const catKey = `skills:${cat.name}`;
      // Abre automaticamente se estiver em busca ativa
      const isOpen = Boolean(query) || Boolean(state.openCategories[catKey]);
      const allActive = cat.activeCount > 0 && cat.activeCount === cat.totalCount;

      return `
      <div class="category-group ${isOpen ? 'open' : ''}" data-cat-key="${escapeHtml(catKey)}">
        <div class="category-header">
          <div class="category-title-area">
            <span class="category-title" title="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</span>
          </div>
          <div class="category-meta">
            <span class="badge-tokens" title="Consumo total em repouso dos itens ativos desta categoria">~${cat.totalTokens.toLocaleString('pt-BR')} tok</span>
            <span class="badge-count">${cat.activeCount}/${cat.totalCount}</span>
            <label class="switch mini" title="Ligar ou desligar todos os itens desta categoria">
              <input type="checkbox" class="category-toggle" data-cat-name="${escapeHtml(cat.name)}" data-type="skills" ${cat.activeCount > 0 ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <svg class="chevron mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        <div class="category-content">
          <div class="items-list">
            ${cat.filteredItems.map(skill => renderSkillItemHtml(skill)).join('')}
          </div>
        </div>
      </div>
      `;
    }).join('');

    bindCategoryEvents(skillsCategoriesContainerEl, 'skills');
  }

  function renderSkillItemHtml(skill) {
    const scopeLabel = skill.isPlugin ? `PLUGIN: ${skill.pluginName}` : (skill.scope === 'workspace' ? 'LOCAL' : 'GLOBAL');
    const scopeClass = skill.isPlugin ? 'plugin' : (skill.scope === 'workspace' ? 'workspace' : 'global');
    const cost = skill.cost || { restLabel: 'Repouso ~60 tok/msg', activeLabel: '+ SKILL.md' };
    const customMarker = skill.isCustomCategory ? `<span class="tag-custom-marker" title="Classificação personalizada pelo usuário">✎</span>` : '';

    return `
    <div class="item-row">
      <div class="item-info">
        <div class="item-name" title="${escapeHtml(skill.name)}">${escapeHtml(skill.name)}</div>
        <div class="item-tags">
          <span class="tag-scope ${scopeClass}">${escapeHtml(scopeLabel)}</span>
          <div class="chip-category-wrapper">
            <button class="chip-category" data-type="skills" data-name="${escapeHtml(skill.cleanName)}" title="Clique para mudar a categoria desta skill">
              ${escapeHtml(skill.category)} ▾${customMarker}
            </button>
          </div>
        </div>
        <div class="item-desc" title="${escapeHtml(skill.description)}">${escapeHtml(skill.shortDesc || skill.description)}</div>
        <div class="item-cost-row">
          <span class="cost-pill rest" title="Custo de repouso: cobrado em cada mensagem">${escapeHtml(cost.restLabel)}</span>
          <span class="cost-pill active" title="Custo em uso: executado ao ativar a skill">Em uso ${escapeHtml(cost.activeLabel)}</span>
        </div>
      </div>
      <label class="switch">
        <input type="checkbox" data-type="skill" data-id="${escapeHtml(skill.id)}" ${skill.enabled ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
    `;
  }

  /**
   * Renderiza categorias aninhadas de Subagentes em acordeão
   */
  function renderAgentsCategories() {
    const query = state.searchQuery;
    const categories = state.agentCategories || [];

    const filteredCategories = categories.map(cat => {
      const filteredItems = cat.items.filter(a =>
        !query ||
        a.name.toLowerCase().includes(query) ||
        a.cleanName.toLowerCase().includes(query) ||
        (a.description && a.description.toLowerCase().includes(query)) ||
        (a.shortDesc && a.shortDesc.toLowerCase().includes(query)) ||
        (a.skills && a.skills.some(s => s.toLowerCase().includes(query))) ||
        cat.name.toLowerCase().includes(query)
      );
      return {
        ...cat,
        filteredItems
      };
    }).filter(cat => cat.filteredItems.length > 0);

    if (filteredCategories.length === 0) {
      agentsCategoriesContainerEl.innerHTML = `<div class="empty-state">Nenhum agente encontrado</div>`;
      return;
    }

    agentsCategoriesContainerEl.innerHTML = filteredCategories.map(cat => {
      const catKey = `agents:${cat.name}`;
      const isOpen = Boolean(query) || Boolean(state.openCategories[catKey]);

      return `
      <div class="category-group ${isOpen ? 'open' : ''}" data-cat-key="${escapeHtml(catKey)}">
        <div class="category-header">
          <div class="category-title-area">
            <span class="category-title" title="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</span>
          </div>
          <div class="category-meta">
            <span class="badge-tokens" title="Consumo total em repouso dos agentes ativos desta categoria">~${cat.totalTokens.toLocaleString('pt-BR')} tok</span>
            <span class="badge-count">${cat.activeCount}/${cat.totalCount}</span>
            <label class="switch mini" title="Ligar ou desligar todos os agentes desta categoria">
              <input type="checkbox" class="category-toggle" data-cat-name="${escapeHtml(cat.name)}" data-type="agents" ${cat.activeCount > 0 ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <svg class="chevron mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        <div class="category-content">
          <div class="items-list">
            ${cat.filteredItems.map(agent => renderAgentItemHtml(agent)).join('')}
          </div>
        </div>
      </div>
      `;
    }).join('');

    bindCategoryEvents(agentsCategoriesContainerEl, 'agents');
  }

  function renderAgentItemHtml(agent) {
    const scopeLabel = agent.scope === 'workspace' ? 'LOCAL' : 'GLOBAL';
    const scopeClass = agent.scope === 'workspace' ? 'workspace' : 'global';
    const skillsCountTag = agent.skills && agent.skills.length > 0 ? `<span class="tag-meta" title="Skills: ${escapeHtml(agent.skills.join(', '))}">${agent.skills.length} skills</span>` : '';
    const cost = agent.cost || { restLabel: 'Repouso ~100 tok/msg', activeLabel: '+ .md' };
    const customMarker = agent.isCustomCategory ? `<span class="tag-custom-marker" title="Classificação personalizada pelo usuário">✎</span>` : '';

    return `
    <div class="item-row">
      <div class="item-info">
        <div class="item-name" title="${escapeHtml(agent.name)}">${escapeHtml(agent.name)}</div>
        <div class="item-tags">
          <span class="tag-scope ${scopeClass}">${scopeLabel}</span>
          ${skillsCountTag}
          <div class="chip-category-wrapper">
            <button class="chip-category" data-type="agents" data-name="${escapeHtml(agent.cleanName)}" title="Clique para mudar a categoria deste agente">
              ${escapeHtml(agent.category)} ▾${customMarker}
            </button>
          </div>
        </div>
        <div class="item-desc" title="${escapeHtml(agent.description)}">
          ${escapeHtml(agent.shortDesc || agent.description)}
        </div>
        <div class="item-cost-row">
          <span class="cost-pill rest" title="Custo de repouso: cobrado em cada mensagem">${escapeHtml(cost.restLabel)}</span>
          <span class="cost-pill active" title="Custo em uso: executado ao despachar o agente">Em uso ${escapeHtml(cost.activeLabel)}</span>
        </div>
      </div>
      <label class="switch">
        <input type="checkbox" data-type="agent" data-id="${escapeHtml(agent.id)}" ${agent.enabled ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
    `;
  }

  /**
   * Vincula eventos de clique de acordeão, switches e dropdowns de categoria
   */
  function bindCategoryEvents(containerEl, type) {
    // Header clique do acordeão de categoria
    containerEl.querySelectorAll('.category-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.switch') || e.target.closest('input')) return;
        const group = header.closest('.category-group');
        const catKey = group.dataset.catKey;
        group.classList.toggle('open');
        state.openCategories[catKey] = group.classList.contains('open');
      });
    });

    // Toggle em lote da categoria inteira
    containerEl.querySelectorAll('.category-toggle').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const categoryName = e.target.dataset.catName;
        const targetType = e.target.dataset.type;
        const enabled = e.target.checked;
        vscode.postMessage({
          command: 'toggleCategory',
          categoryName,
          type: targetType,
          enabled
        });
      });
    });

    // Checkbox individual do item
    containerEl.querySelectorAll('input[type="checkbox"]:not(.category-toggle)').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const itemType = e.target.dataset.type;
        const id = e.target.dataset.id;
        const enabled = e.target.checked;

        if (itemType === 'skill') {
          const skill = state.skills.find(s => s.id === id);
          if (skill) {
            vscode.postMessage({ command: 'toggleSkill', skill, enabled });
          }
        } else if (itemType === 'agent') {
          const agent = state.agents.find(a => a.id === id);
          if (agent) {
            vscode.postMessage({ command: 'toggleAgent', agent, enabled });
          }
        }
      });
    });

    // Clique no chip de categoria (abre menu dropdown)
    containerEl.querySelectorAll('.chip-category').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemName = chip.dataset.name;
        const itemType = chip.dataset.type;
        openCategoryDropdown(chip, itemType, itemName);
      });
    });
  }

  /**
   * Abre menu flutuante para troca rápida de categoria (Section 9.5)
   */
  function openCategoryDropdown(chipEl, type, itemName) {
    closeAllDropdowns();

    const wrapper = chipEl.closest('.chip-category-wrapper');
    if (!wrapper) return;

    // Encontra item atual
    const list = type === 'skills' ? state.skills : state.agents;
    const currentItem = list.find(x => x.cleanName === itemName);
    const currentCategory = currentItem ? currentItem.category : '';
    const isCustom = currentItem ? currentItem.isCustomCategory : false;

    const dropdown = document.createElement('div');
    dropdown.className = 'category-dropdown';

    const categories = state.availableCategories || [];
    let html = '';

    for (const cat of categories) {
      const isActive = cat === currentCategory;
      html += `
        <div class="category-dropdown-item ${isActive ? 'active' : ''}" data-cat="${escapeHtml(cat)}">
          <span>${escapeHtml(cat)}</span>
          ${isActive ? '✓' : ''}
        </div>
      `;
    }

    html += `<div class="category-dropdown-divider"></div>`;
    html += `<div class="category-dropdown-item action" data-action="new">＋ Nova categoria…</div>`;

    if (isCustom) {
      html += `<div class="category-dropdown-item reset" data-action="reset">↺ Restaurar padrão</div>`;
    }

    dropdown.innerHTML = html;
    wrapper.appendChild(dropdown);
    state.activeDropdown = { type, itemName, element: dropdown };

    // Eventos dos itens do dropdown
    dropdown.querySelectorAll('.category-dropdown-item').forEach(itemEl => {
      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = itemEl.dataset.action;
        const chosenCat = itemEl.dataset.cat;

        if (action === 'new') {
          closeAllDropdowns();
          openNewCategoryModal(type, itemName);
        } else if (action === 'reset') {
          closeAllDropdowns();
          vscode.postMessage({ command: 'resetItemCategory', type, itemName });
        } else if (chosenCat) {
          closeAllDropdowns();
          vscode.postMessage({ command: 'moveItemCategory', type, itemName, category: chosenCat });
        }
      });
    });
  }

  /**
   * Renderiza lista de Regras
   */
  function renderRulesList() {
    const query = state.searchQuery;
    const filtered = state.rules.filter(r =>
      !query ||
      r.title.toLowerCase().includes(query) ||
      r.baseName.toLowerCase().includes(query) ||
      (r.snippet && r.snippet.toLowerCase().includes(query)) ||
      (r.shortDesc && r.shortDesc.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      rulesListEl.innerHTML = `<div class="empty-state">Nenhuma regra encontrada</div>`;
      return;
    }

    rulesListEl.innerHTML = filtered.map(rule => {
      const scopeLabel = rule.scope === 'workspace' ? 'LOCAL' : 'GLOBAL';
      const scopeClass = rule.scope === 'workspace' ? 'workspace' : 'global';
      const modeTag = rule.isConditional
        ? `<span class="tag-conditional" title="Regra condicional: carregada apenas quando acionada">Condicional</span>`
        : `<span class="tag-always" title="Regra sempre ativa: injetada no início do contexto">Always-on</span>`;
      const cost = rule.cost || { restLabel: 'Repouso ~300 tok/msg', activeLabel: 'Já carregada no repouso' };

      return `
      <div class="item-row">
        <div class="item-info">
          <div class="item-name" title="${escapeHtml(rule.title)}">${escapeHtml(rule.title)}</div>
          <div class="item-tags">
            <span class="tag-filename" title="Arquivo: ${escapeHtml(rule.baseName)}">${escapeHtml(rule.baseName)}</span>
            <span class="tag-scope ${scopeClass}">${scopeLabel}</span>
            ${modeTag}
          </div>
          <div class="item-desc" title="${escapeHtml(rule.snippet)}">${escapeHtml(rule.shortDesc || rule.snippet)}</div>
          <div class="item-cost-row">
            <span class="cost-pill rest" title="Custo de repouso: cobrado em cada mensagem">${escapeHtml(cost.restLabel)}</span>
            <span class="cost-pill active" title="Custo em uso: acionamento sob demanda">Em uso ${escapeHtml(cost.activeLabel)}</span>
          </div>
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
