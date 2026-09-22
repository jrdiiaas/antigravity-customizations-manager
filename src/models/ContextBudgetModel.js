const fs = require('fs');

class ContextBudgetModel {
  static BUDGET_LIMIT = 20000;

  /**
   * Calcula o consumo estimado de tokens para cada categoria
   */
  static calculateStats(mcpServers, skills, rules, agents = []) {
    let rulesTokens = 0;
    let activeRulesCount = 0;

    for (const rule of rules) {
      if (rule.enabled && fs.existsSync(rule.filePath)) {
        activeRulesCount++;
        try {
          const stats = fs.statSync(rule.filePath);
          // Estimativa padrão em NLP: 1 token a cada ~3.8 a 4 caracteres em Markdown
          rulesTokens += Math.round(stats.size / 3.8);
        } catch (_) {}
      }
    }

    let skillsTokens = 0;
    let activeSkillsCount = 0;
    for (const skill of skills) {
      if (skill.enabled) {
        activeSkillsCount++;
        // Cada skill injeta nome + descrição no pre-prompt: média de ~180-220 tokens
        const descLength = (skill.description || '').length;
        skillsTokens += Math.round(descLength / 3.8) + 40;
      }
    }

    let agentsTokens = 0;
    let activeAgentsCount = 0;
    for (const agent of agents) {
      if (agent.enabled) {
        activeAgentsCount++;
        // Cada agente tem declaração de persona e lista de skills associadas (~200 a 280 tokens)
        const descLength = (agent.description || '').length;
        agentsTokens += Math.round(descLength / 3.8) + 80;
      }
    }

    let mcpTokens = 0;
    let activeMcpCount = 0;
    for (const server of mcpServers) {
      if (server.enabled) {
        activeMcpCount++;
        // Servidores MCP com múltiplas ferramentas consomem ~350 a 800 tokens por ferramenta
        mcpTokens += 280;
      }
    }

    const totalTokens = rulesTokens + skillsTokens + agentsTokens + mcpTokens;
    const percentage = Math.min(100, Math.round((totalTokens / this.BUDGET_LIMIT) * 100));

    let status = 'healthy';
    let statusText = 'Saudável (Dentro do Limite)';
    if (percentage > 95 || totalTokens >= this.BUDGET_LIMIT) {
      status = 'danger';
      statusText = 'Orçamento Excedido (Risco de Truncamento)';
    } else if (percentage > 70) {
      status = 'warning';
      statusText = 'Atenção (Consumo Elevado)';
    }

    return {
      budgetLimit: this.BUDGET_LIMIT,
      totalTokens,
      percentage,
      status,
      statusText,
      breakdown: {
        rules: {
          tokens: rulesTokens,
          active: activeRulesCount,
          total: rules.length,
          pct: Math.round((rulesTokens / (totalTokens || 1)) * 100)
        },
        skills: {
          tokens: skillsTokens,
          active: activeSkillsCount,
          total: skills.length,
          pct: Math.round((skillsTokens / (totalTokens || 1)) * 100)
        },
        agents: {
          tokens: agentsTokens,
          active: activeAgentsCount,
          total: agents.length,
          pct: Math.round((agentsTokens / (totalTokens || 1)) * 100)
        },
        mcp: {
          tokens: mcpTokens,
          active: activeMcpCount,
          total: mcpServers.length,
          pct: Math.round((mcpTokens / (totalTokens || 1)) * 100)
        }
      }
    };
  }
}

module.exports = ContextBudgetModel;
