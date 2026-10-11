const fs = require('fs');
const path = require('path');

class CategoryModel {
  static DEFAULT_CATEGORIES = [
    '🎨 Visual e Design',
    '🖥️ Sites e Apps (Frontend)',
    '⚙️ Servidor e Dados (Backend)',
    '🧪 Testes e Qualidade',
    '🔒 Segurança',
    '🚀 Publicação e Servidores',
    '📈 Marketing e Busca (SEO)',
    '🧭 Planejamento e Organização',
    '🤖 Trabalho em Equipe de IA',
    '📦 Outros'
  ];

  static KEYWORD_RULES = [
    { pattern: /design|visual|estil|css|ui\/ux|interface|tema|layout|canvas|tailwind|responsiv/i, category: '🎨 Visual e Design' },
    { pattern: /frontend|react|nextjs|vue|svelte|html|web app|dom|component/i, category: '🖥️ Sites e Apps (Frontend)' },
    { pattern: /backend|api|server|banco|sql|database|postgres|sqlite|node|python|endpoint|rest|graphql|trpc|crud/i, category: '⚙️ Servidor e Dados (Backend)' },
    { pattern: /test|qualidade|lint|debug|audit|e2e|tdd|unit|mock|profiling|clean-code/i, category: '🧪 Testes e Qualidade' },
    { pattern: /seguran[cç]a|security|vulnerab|red team|threat|cwe|owasp|scanner|poc|exploit/i, category: '🔒 Segurança' },
    { pattern: /deploy|servidor|linux|bash|devops|docker|publica|host|cloud|powershell/i, category: '🚀 Publicação e Servidores' },
    { pattern: /seo|busca|google|marketing|tr[aá]fego|analytics|convers|lead|campanha/i, category: '📈 Marketing e Busca (SEO)' },
    { pattern: /plano|planeja|organiz|document|arquitetura|workflow|brainstorm|memory|template|socratic/i, category: '🧭 Planejamento e Organização' },
    { pattern: /agente|coordena|equipe|multi-agent|orquestr|parallel|intelligent-routing/i, category: '🤖 Trabalho em Equipe de IA' }
  ];

  constructor(globalState = null) {
    this.globalState = globalState;
    this.catalog = { skills: {}, agents: {} };

    try {
      const catalogPath = path.join(__dirname, 'data', 'category-catalog.json');
      if (fs.existsSync(catalogPath)) {
        this.catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      }
    } catch (err) {
      console.error('[CategoryModel] Erro ao carregar category-catalog.json:', err.message);
    }
  }

  /**
   * Obtém overrides salvos no globalState (ou memória local)
   */
  getOverrides() {
    if (!this.globalState) return this._memoryOverrides || {};
    return this.globalState.get('categoryOverrides', {});
  }

  /**
   * Salva overrides
   */
  async saveOverrides(overrides) {
    if (this.globalState) {
      await this.globalState.update('categoryOverrides', overrides);
    } else {
      this._memoryOverrides = overrides;
    }
  }

  /**
   * Obtém lista de categorias customizadas criadas pelo usuário
   */
  getCustomCategories() {
    if (!this.globalState) return this._memoryCustomCategories || [];
    return this.globalState.get('customCategories', []);
  }

  /**
   * Salva lista de categorias customizadas
   */
  async saveCustomCategories(categories) {
    if (this.globalState) {
      await this.globalState.update('customCategories', categories);
    } else {
      this._memoryCustomCategories = categories;
    }
  }

  /**
   * Obtém todas as categorias disponíveis (padrão + customizadas)
   */
  getAllCategories() {
    const custom = this.getCustomCategories();
    const list = [...CategoryModel.DEFAULT_CATEGORIES];
    for (const c of custom) {
      if (!list.includes(c)) {
        // Insere antes de "📦 Outros"
        list.splice(list.length - 1, 0, c);
      }
    }
    return list;
  }

  /**
   * Classifica um item de acordo com a hierarquia rigorosa
   * 0. Escolha manual do usuário (override)
   * 1. Catálogo embutido
   * 2. Campo category do frontmatter
   * 3. Heurística por palavras-chave
   * 4. Fallback "📦 Outros"
   */
  classifyItem(item, type = 'skills') {
    const itemName = item.cleanName || item.name || '';
    const key = `${type}:${itemName}`;
    const overrides = this.getOverrides();

    // Prioridade 0: Escolha manual do usuário
    if (overrides && overrides[key]) {
      return {
        category: overrides[key],
        isCustom: true
      };
    }

    // Prioridade 1: Catálogo embutido
    const typeCatalog = this.catalog && this.catalog[type];
    if (typeCatalog && typeCatalog[itemName]) {
      return {
        category: typeCatalog[itemName],
        isCustom: false
      };
    }

    // Prioridade 2: Campo category no frontmatter
    if (item.category && typeof item.category === 'string') {
      const match = this.getAllCategories().find(c => c.toLowerCase().includes(item.category.toLowerCase()));
      if (match) {
        return { category: match, isCustom: false };
      }
      return { category: item.category, isCustom: false };
    }

    // Prioridade 3: Heurística por palavras-chave na descrição ou nome
    const textToScan = `${itemName} ${item.name || ''} ${item.description || ''}`;
    for (const rule of CategoryModel.KEYWORD_RULES) {
      if (rule.pattern.test(textToScan)) {
        return {
          category: rule.category,
          isCustom: false
        };
      }
    }

    // Prioridade 4: Fallback
    return {
      category: '📦 Outros',
      isCustom: false
    };
  }

  /**
   * Agrupa uma lista de itens em categorias ordenadas com totais
   */
  groupItems(items, type = 'skills') {
    const groupsMap = new Map();
    const allCategories = this.getAllCategories();

    for (const cat of allCategories) {
      groupsMap.set(cat, {
        name: cat,
        items: [],
        totalTokens: 0,
        activeCount: 0,
        totalCount: 0
      });
    }

    for (const item of items) {
      const classification = this.classifyItem(item, type);
      const categoryName = classification.category;

      if (!groupsMap.has(categoryName)) {
        groupsMap.set(categoryName, {
          name: categoryName,
          items: [],
          totalTokens: 0,
          activeCount: 0,
          totalCount: 0
        });
      }

      // Adiciona metadados de categoria ao item
      const enrichedItem = {
        ...item,
        category: categoryName,
        isCustomCategory: classification.isCustom
      };

      const group = groupsMap.get(categoryName);
      group.items.push(enrichedItem);
      group.totalCount++;

      if (item.enabled) {
        group.activeCount++;
        const restTokens = (item.cost && item.cost.rest) ? item.cost.rest : 0;
        group.totalTokens += restTokens;
      }
    }

    // Retorna apenas categorias que possuem itens
    const result = [];
    for (const group of groupsMap.values()) {
      if (group.items.length > 0) {
        result.push(group);
      }
    }

    return result;
  }

  /**
   * Define override manual do usuário para um item
   */
  async setOverride(type, itemName, category) {
    const overrides = { ...this.getOverrides() };
    const key = `${type}:${itemName}`;
    overrides[key] = category;
    await this.saveOverrides(overrides);
    return overrides;
  }

  /**
   * Restaura classificação padrão de um item
   */
  async resetOverride(type, itemName) {
    const overrides = { ...this.getOverrides() };
    const key = `${type}:${itemName}`;
    delete overrides[key];
    await this.saveOverrides(overrides);
    return overrides;
  }

  /**
   * Restaura todas as classificações para o padrão
   */
  async resetAllOverrides(type = null) {
    if (!type) {
      await this.saveOverrides({});
      return {};
    }
    const overrides = { ...this.getOverrides() };
    for (const key of Object.keys(overrides)) {
      if (key.startsWith(`${type}:`)) {
        delete overrides[key];
      }
    }
    await this.saveOverrides(overrides);
    return overrides;
  }

  /**
   * Cria nova categoria personalizada
   */
  async addCustomCategory(categoryName) {
    const trimmed = categoryName.trim();
    if (!trimmed) return this.getAllCategories();

    const custom = [...this.getCustomCategories()];
    if (!custom.includes(trimmed) && !CategoryModel.DEFAULT_CATEGORIES.includes(trimmed)) {
      custom.push(trimmed);
      await this.saveCustomCategories(custom);
    }
    return this.getAllCategories();
  }

  /**
   * Remove categoria personalizada e reverte itens afetados
   */
  async deleteCustomCategory(categoryName) {
    const custom = this.getCustomCategories().filter(c => c !== categoryName);
    await this.saveCustomCategories(custom);

    // Limpa overrides que apontavam para essa categoria
    const overrides = { ...this.getOverrides() };
    let changed = false;
    for (const [key, val] of Object.entries(overrides)) {
      if (val === categoryName) {
        delete overrides[key];
        changed = true;
      }
    }
    if (changed) {
      await this.saveOverrides(overrides);
    }

    return this.getAllCategories();
  }
}

module.exports = CategoryModel;
