const fs = require('fs');
const McpToolIndexModel = require('./McpToolIndexModel');

class ContextBudgetModel {
  static BUDGET_LIMIT = 20000;

  /**
   * Enriquece cada item com os dados exatos de custo em repouso, uso ativo e descrição curta (<= 15 palavras)
   */
  static enrichItemsWithCost(mcpServers = [], skills = [], rules = [], agents = [], mcpToolIndexModel = null) {
    const indexer = mcpToolIndexModel || new McpToolIndexModel();

    // 1. MCP Servers
    for (const server of mcpServers) {
      const toolInfo = indexer.getToolInfo(server.name);
      const isEager = Boolean(server.eager === true);
      const toolsCount = toolInfo.toolsCount;

      let rest = 280;
      let activeMin = 300;
      let activeMax = 5000;
      let activeLabel = '~300 + resposta (estimado)';

      if (toolInfo.hasSchemasDir && toolsCount > 0) {
        if (!isEager) {
          // MCP Lazy (padrão no Antigravity): ~8 tokens por ferramenta (só o nome na lista)
          rest = toolsCount * 8;
          activeMin = 300 + 500;
          activeMax = 300 + 50000;
          activeLabel = '~300 + resposta (500 a 50.000+)';
        } else {
          // MCP Eager: schema completo por ferramenta injetado a cada turno
          rest = toolInfo.totalSchemaBytes > 0 ? Math.round(toolInfo.totalSchemaBytes / 3.8) : (toolsCount * 450);
          activeMin = 500;
          activeMax = 5000;
          activeLabel = '+ resposta (500 a 5.000)';
        }
      }

      const shortDesc = indexer.getDescription(server.name, toolInfo);

      server.toolsCount = toolsCount;
      server.shortDesc = shortDesc;
      server.cost = {
        rest,
        restLabel: `Repouso ~${rest.toLocaleString('pt-BR')} tok/msg`,
        active: { min: activeMin, max: activeMax },
        activeLabel,
        isLazy: !isEager
      };
    }

    // 2. Skills
    for (const skill of skills) {
      const descLength = (skill.description || '').length;
      // Nome + descrição no pre-prompt: ~40 tokens base + desc / 3.8
      const rest = Math.round(descLength / 3.8) + 40;

      let skillMdSize = skill.fileSize || 0;
      if (!skillMdSize && skill.dirPath) {
        try {
          const p = fs.existsSync(`${skill.dirPath}/SKILL.md`) ? `${skill.dirPath}/SKILL.md` : `${skill.dirPath}/SKILL.md.disabled`;
          if (fs.existsSync(p)) {
            skillMdSize = fs.statSync(p).size;
          }
        } catch (_) {}
      }

      const activeTokens = skillMdSize > 0 ? Math.round(skillMdSize / 3.8) : 400;
      const activeMin = activeTokens;
      const activeMax = activeTokens + 2500;

      skill.shortDesc = McpToolIndexModel.truncateToPhrase(skill.description, 15);
      skill.cost = {
        rest,
        restLabel: `Repouso ~${rest.toLocaleString('pt-BR')} tok/msg`,
        active: { min: activeMin, max: activeMax },
        activeLabel: `+ SKILL.md (~${activeMin.toLocaleString('pt-BR')}) + seções`
      };
    }

    // 3. Subagentes
    for (const agent of agents) {
      const descLength = (agent.description || '').length;
      // Declaração de persona + lista de skills (~80 tokens base + desc / 3.8)
      const rest = Math.round(descLength / 3.8) + 80;

      let agentMdSize = agent.fileSize || 0;
      if (!agentMdSize && agent.filePath) {
        try {
          if (fs.existsSync(agent.filePath)) {
            agentMdSize = fs.statSync(agent.filePath).size;
          }
        } catch (_) {}
      }

      const activeAgentTokens = agentMdSize > 0 ? Math.round(agentMdSize / 3.8) : 500;
      const skillsCount = Array.isArray(agent.skills) ? agent.skills.length : 0;
      const activeMin = activeAgentTokens;
      const activeMax = activeAgentTokens + (skillsCount * 350);

      agent.shortDesc = McpToolIndexModel.truncateToPhrase(agent.description, 15);
      agent.cost = {
        rest,
        restLabel: `Repouso ~${rest.toLocaleString('pt-BR')} tok/msg`,
        active: { min: activeMin, max: activeMax },
        activeLabel: `+ .md (~${activeAgentTokens.toLocaleString('pt-BR')}) + skills (${skillsCount})`
      };
    }

    // 4. Regras
    for (const rule of rules) {
      let fileSize = rule.fileSize || 0;
      if (!fileSize && rule.filePath) {
        try {
          if (fs.existsSync(rule.filePath)) {
            fileSize = fs.statSync(rule.filePath).size;
          }
        } catch (_) {}
      }

      const isConditional = Boolean(rule.isConditional);
      let rest = 0;
      let activeMin = 0;
      let activeMax = 0;
      let activeLabel = '';

      if (!isConditional) {
        // Regra always-on: o arquivo inteiro já é injetado a cada turno
        rest = fileSize > 0 ? Math.round(fileSize / 3.8) : 200;
        activeMin = rest;
        activeMax = rest;
        activeLabel = 'Já carregada no repouso';
      } else {
        // Regra condicional: só nome + trigger/descrição em repouso
        const snippetLength = (rule.snippet || rule.title || '').length;
        rest = Math.round(snippetLength / 3.8) + 20;
        const fileTokens = fileSize > 0 ? Math.round(fileSize / 3.8) : 800;
        activeMin = fileTokens;
        activeMax = fileTokens;
        activeLabel = `+ arquivo inteiro (~${fileTokens.toLocaleString('pt-BR')} tok)`;
      }

      rule.shortDesc = McpToolIndexModel.truncateToPhrase(rule.snippet || rule.title, 15);
      rule.cost = {
        rest,
        restLabel: `Repouso ~${rest.toLocaleString('pt-BR')} tok/msg`,
        active: { min: activeMin, max: activeMax },
        activeLabel,
        isConditional
      };
    }
  }

  /**
   * Calcula o consumo consolidado de tokens para cada categoria e o orçamento global
   */
  static calculateStats(mcpServers = [], skills = [], rules = [], agents = [], mcpToolIndexModel = null) {
    // Garante enriquecimento com custos individuais se ainda não tiverem
    this.enrichItemsWithCost(mcpServers, skills, rules, agents, mcpToolIndexModel);

    let mcpTokens = 0;
    let activeMcpCount = 0;
    for (const server of mcpServers) {
      if (server.enabled) {
        activeMcpCount++;
        mcpTokens += server.cost ? server.cost.rest : 0;
      }
    }

    let skillsTokens = 0;
    let activeSkillsCount = 0;
    for (const skill of skills) {
      if (skill.enabled) {
        activeSkillsCount++;
        skillsTokens += skill.cost ? skill.cost.rest : 0;
      }
    }

    let agentsTokens = 0;
    let activeAgentsCount = 0;
    for (const agent of agents) {
      if (agent.enabled) {
        activeAgentsCount++;
        agentsTokens += agent.cost ? agent.cost.rest : 0;
      }
    }

    let rulesTokens = 0;
    let activeRulesCount = 0;
    for (const rule of rules) {
      if (rule.enabled) {
        activeRulesCount++;
        rulesTokens += rule.cost ? rule.cost.rest : 0;
      }
    }

    const totalTokens = mcpTokens + skillsTokens + agentsTokens + rulesTokens;
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
        mcp: {
          tokens: mcpTokens,
          active: activeMcpCount,
          total: mcpServers.length,
          pct: Math.round((mcpTokens / (totalTokens || 1)) * 100)
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
        rules: {
          tokens: rulesTokens,
          active: activeRulesCount,
          total: rules.length,
          pct: Math.round((rulesTokens / (totalTokens || 1)) * 100)
        }
      }
    };
  }
}

module.exports = ContextBudgetModel;
