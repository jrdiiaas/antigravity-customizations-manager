const path = require('path');
const assert = require('assert');
const McpModel = require('../src/models/McpModel');
const SkillsModel = require('../src/models/SkillsModel');
const AgentsModel = require('../src/models/AgentsModel');
const RulesModel = require('../src/models/RulesModel');
const ContextBudgetModel = require('../src/models/ContextBudgetModel');
const QuotaModel = require('../src/models/QuotaModel');
const McpToolIndexModel = require('../src/models/McpToolIndexModel');
const CategoryModel = require('../src/models/CategoryModel');

const workspaceRoot = path.resolve(__dirname, '../..'); // /home/asjunior/docker

async function runTests() {
  console.log('=== TESTE DE INTEGRAÇÃO DOS MODELOS (GESTOR DE TOKENS IA v2.1.0) ===');
  console.log('Workspace Root:', workspaceRoot);

  // 1. MCP Tool Indexer & Descrições
  console.log('\n[TESTE 1] McpToolIndexModel & Catálogo de Descrições MCP');
  const indexer = new McpToolIndexModel(workspaceRoot);
  const ga4Info = indexer.getToolInfo('ga4-mcp');
  console.log(`ga4-mcp: ${ga4Info.toolsCount} ferramentas, ${ga4Info.totalSchemaBytes} bytes de schema.`);
  assert.ok(ga4Info.toolsCount > 0, 'ga4-mcp deve ter ferramentas detectadas');
  const ga4Desc = indexer.getDescription('ga4-mcp', ga4Info);
  console.log(`Descrição ga4-mcp: "${ga4Desc}"`);
  assert.ok(ga4Desc.length > 0, 'ga4-mcp deve ter descrição no catálogo');
  assert.ok(ga4Desc.split(/\s+/).length <= 15, 'Descrição do ga4-mcp deve ter <= 15 palavras');

  // Teste de fallback MCP desconhecido
  const unknownInfo = indexer.getToolInfo('servidor-inexistente-xyz');
  const unknownDesc = indexer.getDescription('servidor-inexistente-xyz', unknownInfo);
  console.log(`Descrição servidor inexistente: "${unknownDesc}"`);
  assert.strictEqual(unknownDesc, 'Servidor MCP personalizado. Sem descrição disponível.');

  // 2. Truncamento rigoroso de frases (<= 15 palavras)
  console.log('\n[TESTE 2] Truncamento de Descrição (<= 15 palavras e 1 frase)');
  const longText = 'Esta é uma descrição extremamente longa com muitas palavras que com certeza ultrapassa o limite de quinze palavras para o resumo curto.';
  const truncated = McpToolIndexModel.truncateToPhrase(longText, 15);
  console.log(`Original (${longText.split(/\s+/).length} palavras) -> Truncado: "${truncated}" (${truncated.split(/\s+/).length} palavras)`);
  assert.ok(truncated.split(/\s+/).length <= 15, 'Truncamento deve respeitar <= 15 palavras');

  // 3. MCP Lazy vs MCP Eager
  console.log('\n[TESTE 3] Comparativo MCP Lazy (baixo repouso) vs MCP Eager (alto repouso)');
  const mockLazyServer = [{ name: 'ga4-mcp', enabled: true, eager: false }];
  ContextBudgetModel.enrichItemsWithCost(mockLazyServer, [], [], [], indexer);
  const lazyCost = mockLazyServer[0].cost;
  console.log(`MCP Lazy (ga4-mcp): Repouso = ${lazyCost.rest} tok/msg (${lazyCost.restLabel}), Em uso = ${lazyCost.activeLabel}`);

  const mockEagerServer = [{ name: 'ga4-mcp', enabled: true, eager: true }];
  ContextBudgetModel.enrichItemsWithCost(mockEagerServer, [], [], [], indexer);
  const eagerCost = mockEagerServer[0].cost;
  console.log(`MCP Eager (ga4-mcp): Repouso = ${eagerCost.rest} tok/msg (${eagerCost.restLabel}), Em uso = ${eagerCost.activeLabel}`);

  assert.ok(lazyCost.rest < eagerCost.rest, 'MCP Lazy DEVE ter custo de repouso menor que MCP Eager');
  assert.strictEqual(lazyCost.rest, ga4Info.toolsCount * 8, 'MCP Lazy deve custar exatamente ferramentas * 8 tokens');

  // 4. Regras: Always-on vs Condicional
  console.log('\n[TESTE 4] Regra Always-on vs Regra Condicional');
  const mockRules = [
    { title: 'Regra Fixa', baseName: 'GEMINI.md', isConditional: false, fileSize: 3800, enabled: true },
    { title: 'Regra Condicional', baseName: 'code-rules.md', isConditional: true, snippet: 'Instruções de código', fileSize: 3800, enabled: true }
  ];
  ContextBudgetModel.enrichItemsWithCost([], [], mockRules, [], indexer);
  console.log(`Regra Always-on (3800 bytes): Repouso = ${mockRules[0].cost.rest} tok/msg, Em uso = ${mockRules[0].cost.activeLabel}`);
  console.log(`Regra Condicional (3800 bytes): Repouso = ${mockRules[1].cost.rest} tok/msg, Em uso = ${mockRules[1].cost.activeLabel}`);
  assert.strictEqual(mockRules[0].cost.rest, Math.round(3800 / 3.8), 'Regra always-on deve carregar todo o arquivo no repouso');
  assert.ok(mockRules[1].cost.rest < mockRules[0].cost.rest, 'Regra condicional deve ter repouso bem menor');

  // 5. Modelos Reais do Sistema e Orçamento Global Consistente
  console.log('\n[TESTE 5] Consistência Matemática do Orçamento Total de Tokens');
  const mcpModel = new McpModel(workspaceRoot);
  const servers = mcpModel.getAllServers();

  const skillsModel = new SkillsModel(workspaceRoot);
  const skills = skillsModel.getAllSkills();

  const agentsModel = new AgentsModel(workspaceRoot);
  const agents = agentsModel.getAllAgents();

  const rulesModel = new RulesModel(workspaceRoot);
  const rules = rulesModel.getAllRules();

  const stats = ContextBudgetModel.calculateStats(servers, skills, rules, agents, indexer);

  // Calcula soma manual de todos os itens ativos
  let manualSum = 0;
  for (const s of servers) if (s.enabled) manualSum += s.cost.rest;
  for (const s of skills) if (s.enabled) manualSum += s.cost.rest;
  for (const a of agents) if (a.enabled) manualSum += a.cost.rest;
  for (const r of rules) if (r.enabled) manualSum += r.cost.rest;

  console.log(`Soma manual dos itens ativos em repouso: ${manualSum} tokens`);
  console.log(`Total reportado em stats.totalTokens:    ${stats.totalTokens} tokens`);
  assert.strictEqual(manualSum, stats.totalTokens, 'A soma dos itens em repouso DEVE ser exatamente igual a stats.totalTokens');

  // Verifica se todas as descrições têm <= 15 palavras
  console.log('\n[TESTE 6] Validação de Tamanho de Descrições (≤ 15 palavras) em todos os itens');
  const allItems = [...servers, ...skills, ...agents, ...rules];
  for (const item of allItems) {
    if (item.shortDesc) {
      const wordCount = item.shortDesc.trim().split(/\s+/).filter(Boolean).length;
      assert.ok(wordCount <= 15, `Item ${item.name || item.title || item.cleanName} tem ${wordCount} palavras: "${item.shortDesc}"`);
    }
  }
  console.log(`Validado: ${allItems.length} itens possuem descrições curtas ≤ 15 palavras.`);

  // 6. Motor de Categorização (CategoryModel) e Hierarquia de Prioridades
  console.log('\n[TESTE 7] CategoryModel: Hierarquia de Prioridades (Override > Catálogo > Frontmatter > Heurística > Outros)');
  const mockStorage = new Map();
  const mockGlobalState = {
    get: (key, def) => mockStorage.has(key) ? mockStorage.get(key) : def,
    update: async (key, val) => mockStorage.set(key, val)
  };
  const categoryModel = new CategoryModel(mockGlobalState);

  // Caso 1: Catálogo (frontend-design -> 🎨 Visual e Design)
  const cat1 = categoryModel.classifyItem({ cleanName: 'frontend-design' }, 'skills');
  console.log(`Catálogo: frontend-design -> ${cat1.category}`);
  assert.strictEqual(cat1.category, '🎨 Visual e Design');
  assert.strictEqual(cat1.isCustom, false);

  // Caso 2: Frontmatter
  const cat2 = categoryModel.classifyItem({ cleanName: 'custom-skill-1', category: '🔒 Segurança' }, 'skills');
  console.log(`Frontmatter: custom-skill-1 -> ${cat2.category}`);
  assert.strictEqual(cat2.category, '🔒 Segurança');

  // Caso 3: Heurística por palavras-chave
  const cat3 = categoryModel.classifyItem({ cleanName: 'minha-ferramenta', description: 'Realiza testes unitários e lint no código' }, 'skills');
  console.log(`Heurística: minha-ferramenta -> ${cat3.category}`);
  assert.strictEqual(cat3.category, '🧪 Testes e Qualidade');

  // Caso 4: Fallback
  const cat4 = categoryModel.classifyItem({ cleanName: 'desconhecido-aleatorio', description: 'Sem pistas' }, 'skills');
  console.log(`Fallback: desconhecido-aleatorio -> ${cat4.category}`);
  assert.strictEqual(cat4.category, '📦 Outros');

  // Caso 0: Override do usuário vence tudo (inclusive catálogo)
  console.log('\n[TESTE 8] Override manual do usuário vence o catálogo e restauração');
  await categoryModel.setOverride('skills', 'frontend-design', '🚀 Publicação e Servidores');
  const catOverride = categoryModel.classifyItem({ cleanName: 'frontend-design' }, 'skills');
  console.log(`Após override do usuário: frontend-design -> ${catOverride.category} (Personalizado: ${catOverride.isCustom})`);
  assert.strictEqual(catOverride.category, '🚀 Publicação e Servidores');
  assert.strictEqual(catOverride.isCustom, true);

  // Restaurar override
  await categoryModel.resetOverride('skills', 'frontend-design');
  const catRestored = categoryModel.classifyItem({ cleanName: 'frontend-design' }, 'skills');
  console.log(`Após restauração: frontend-design -> ${catRestored.category} (Personalizado: ${catRestored.isCustom})`);
  assert.strictEqual(catRestored.category, '🎨 Visual e Design');
  assert.strictEqual(catRestored.isCustom, false);

  // Criação e remoção de categoria personalizada
  console.log('\n[TESTE 9] Adicionar e excluir categoria personalizada');
  await categoryModel.addCustomCategory('📊 Relatórios Financeiros');
  assert.ok(categoryModel.getAllCategories().includes('📊 Relatórios Financeiros'), 'Nova categoria deve constar na lista');
  await categoryModel.setOverride('skills', 'custom-report', '📊 Relatórios Financeiros');
  assert.strictEqual(categoryModel.classifyItem({ cleanName: 'custom-report' }, 'skills').category, '📊 Relatórios Financeiros');

  // Excluir categoria personalizada
  await categoryModel.deleteCustomCategory('📊 Relatórios Financeiros');
  assert.ok(!categoryModel.getAllCategories().includes('📊 Relatórios Financeiros'), 'Categoria deve ter sido removida');
  assert.strictEqual(categoryModel.classifyItem({ cleanName: 'custom-report' }, 'skills').category, '📦 Outros');

  // 7. Agrupamento em Acordeão
  console.log('\n[TESTE 10] Agrupamento de Skills e Subagentes em Acordeão');
  const groupedSkills = categoryModel.groupItems(skills, 'skills');
  console.log(`Total de categorias ativas de skills com itens: ${groupedSkills.length}`);
  assert.ok(groupedSkills.length > 0, 'Deve agrupar skills em categorias');
  for (const group of groupedSkills) {
    assert.ok(group.items.length > 0, `Categoria ${group.name} não deve estar vazia`);
  }

  // 8. Quota Real-Time
  console.log('\n[TESTE 11] QuotaModel (Tempo Real)');
  const quota = await QuotaModel.getQuota();
  console.log('Gemini 5h:', `${quota.gemini.fiveHour.remaining}%`, '| Weekly:', `${quota.gemini.weekly.remaining}%`);
  assert.strictEqual(typeof quota.gemini.fiveHour.remaining, 'number');

  console.log('\n============================================================');
  console.log('✅ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO E VALIDAÇÃO!');
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ ERRO NOS TESTES:', err);
  process.exit(1);
});
