const path = require('path');
const McpModel = require('../src/models/McpModel');
const SkillsModel = require('../src/models/SkillsModel');
const RulesModel = require('../src/models/RulesModel');
const ContextBudgetModel = require('../src/models/ContextBudgetModel');

const workspaceRoot = path.resolve(__dirname, '../..'); // /home/sinc/docker

console.log('=== TESTE DE INTEGRAÇÃO DOS MODELOS ===');
console.log('Workspace Root:', workspaceRoot);

// 1. MCP Model
const mcpModel = new McpModel(workspaceRoot);
const servers = mcpModel.getAllServers();
console.log(`\n[MCP] Encontrados ${servers.length} servidores.`);
if (servers.length > 0) {
  console.log(`Primeiro servidor: ${servers[0].name} (Habilitado: ${servers[0].enabled})`);
}

// 2. Skills Model
const skillsModel = new SkillsModel(workspaceRoot);
const skills = skillsModel.getAllSkills();
console.log(`\n[Skills] Encontradas ${skills.length} skills.`);
if (skills.length > 0) {
  console.log(`Exemplo de skill: ${skills[0].cleanName} (Habilitado: ${skills[0].enabled})`);
}

// 3. Rules Model
const rulesModel = new RulesModel(workspaceRoot);
const rules = rulesModel.getAllRules();
console.log(`\n[Rules] Encontradas ${rules.length} regras.`);
if (rules.length > 0) {
  console.log(`Exemplo de regra: ${rules[0].title} (Arquivo: ${rules[0].baseName}, Habilitado: ${rules[0].enabled})`);
}

// 4. Context Budget Model
const stats = ContextBudgetModel.calculateStats(servers, skills, rules);
console.log('\n[Budget Stats]:', {
  totalTokens: stats.totalTokens,
  limit: stats.budgetLimit,
  percentage: `${stats.percentage}%`,
  status: stats.status,
  statusText: stats.statusText,
  breakdown: {
    mcp: `${stats.breakdown.mcp.active}/${stats.breakdown.mcp.total} ativos (${stats.breakdown.mcp.tokens} tokens)`,
    skills: `${stats.breakdown.skills.active}/${stats.breakdown.skills.total} ativos (${stats.breakdown.skills.tokens} tokens)`,
    rules: `${stats.breakdown.rules.active}/${stats.breakdown.rules.total} ativos (${stats.breakdown.rules.tokens} tokens)`
  }
});

console.log('\n=== TESTES CONCLUÍDOS COM SUCESSO! ===');
