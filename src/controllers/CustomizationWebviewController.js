const vscode = require('vscode');
const McpModel = require('../models/McpModel');
const SkillsModel = require('../models/SkillsModel');
const AgentsModel = require('../models/AgentsModel');
const RulesModel = require('../models/RulesModel');
const ContextBudgetModel = require('../models/ContextBudgetModel');
const McpToolIndexModel = require('../models/McpToolIndexModel');
const CategoryModel = require('../models/CategoryModel');
const WebviewHtml = require('../views/WebviewHtml');

class CustomizationWebviewController {
  constructor(extensionUri, workspaceRoot, globalState = null) {
    this.extensionUri = extensionUri;
    this.workspaceRoot = workspaceRoot;
    this.globalState = globalState;
    this.view = null;
    this.fullRefreshInterval = null;

    this.mcpModel = new McpModel(this.workspaceRoot);
    this.skillsModel = new SkillsModel(this.workspaceRoot);
    this.agentsModel = new AgentsModel(this.workspaceRoot);
    this.rulesModel = new RulesModel(this.workspaceRoot);
    this.mcpToolIndexModel = new McpToolIndexModel(this.workspaceRoot);
    this.categoryModel = new CategoryModel(this.globalState);

    this.setupWatchers();
  }

  resolveWebviewView(webviewView, _context, _token) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = WebviewHtml.getHtml(webviewView.webview, this.extensionUri);

    // Inicia auto-refresh periódico quando a view estiver visível
    this.startAutoRefresh();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    });

    webviewView.onDidDispose(() => {
      this.stopAutoRefresh();
      this.view = null;
    });

    webviewView.webview.onDidReceiveMessage(async (data) => {
      try {
        switch (data.command) {
          case 'ready':
          case 'refresh':
            await this.refresh();
            break;

          case 'toggleMcp':
            this.mcpModel.toggleServer(data.name, data.scope, data.enabled);
            await this.refresh();
            break;

          case 'disableAllMcp':
            this.mcpModel.toggleAll(false);
            vscode.window.showInformationMessage('⚡ Todos os MCPs foram desativados. Economia máxima de tokens ativa!');
            await this.refresh();
            break;

          case 'enableAllMcp':
            this.mcpModel.toggleAll(true);
            vscode.window.showInformationMessage('🔌 Todos os servidores MCP foram ativados.');
            await this.refresh();
            break;

          case 'toggleSkill':
            this.skillsModel.toggleSkill(data.skill, data.enabled);
            await this.refresh();
            break;

          case 'toggleAgent':
            this.agentsModel.toggleAgent(data.agent, data.enabled);
            await this.refresh();
            break;

          case 'toggleRule':
            this.rulesModel.toggleRule(data.rule, data.enabled);
            await this.refresh();
            break;

          case 'toggleCategory': {
            const { categoryName, type, enabled } = data;
            if (type === 'skills') {
              const skills = this.skillsModel.getAllSkills();
              for (const skill of skills) {
                const cat = this.categoryModel.classifyItem(skill, 'skills').category;
                if (cat === categoryName && skill.enabled !== enabled) {
                  this.skillsModel.toggleSkill(skill, enabled);
                }
              }
            } else if (type === 'agents') {
              const agents = this.agentsModel.getAllAgents();
              for (const agent of agents) {
                const cat = this.categoryModel.classifyItem(agent, 'agents').category;
                if (cat === categoryName && agent.enabled !== enabled) {
                  this.agentsModel.toggleAgent(agent, enabled);
                }
              }
            }
            await this.refresh();
            break;
          }

          case 'moveItemCategory':
            await this.categoryModel.setOverride(data.type, data.itemName, data.category);
            await this.refresh();
            break;

          case 'resetItemCategory':
            await this.categoryModel.resetOverride(data.type, data.itemName);
            await this.refresh();
            break;

          case 'resetAllCategories':
            await this.categoryModel.resetAllOverrides(data.type);
            vscode.window.showInformationMessage('Categorias restauradas para o padrão com sucesso!');
            await this.refresh();
            break;

          case 'createCategory':
            if (data.categoryName && data.categoryName.trim()) {
              await this.categoryModel.addCustomCategory(data.categoryName.trim());
              vscode.window.showInformationMessage(`Categoria "${data.categoryName.trim()}" criada!`);
              await this.refresh();
            }
            break;

          case 'deleteCategory':
            if (data.categoryName) {
              await this.categoryModel.deleteCustomCategory(data.categoryName);
              vscode.window.showInformationMessage(`Categoria "${data.categoryName}" removida.`);
              await this.refresh();
            }
            break;
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Erro no Customizations Manager: ${err.message}`);
      }
    });
  }

  startAutoRefresh() {
    this.stopAutoRefresh();

    // Refresh completo de MCP, Skills, Regras e Agentes a cada 30 segundos
    this.fullRefreshInterval = setInterval(() => {
      if (this.view && this.view.visible) {
        this.refresh();
      }
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.fullRefreshInterval) {
      clearInterval(this.fullRefreshInterval);
      this.fullRefreshInterval = null;
    }
  }

  /**
   * Atualização completa de todas as entidades do painel.
   */
  async refresh() {
    if (!this.view) return;

    try {
      const mcpServers = this.mcpModel.getAllServers();
      const skills = this.skillsModel.getAllSkills();
      const agents = this.agentsModel.getAllAgents();
      const rules = this.rulesModel.getAllRules();

      // Calcula os custos por item e os totais globais
      const stats = ContextBudgetModel.calculateStats(mcpServers, skills, rules, agents, this.mcpToolIndexModel);

      // Agrupa skills e agentes em categorias
      const skillCategories = this.categoryModel.groupItems(skills, 'skills');
      const agentCategories = this.categoryModel.groupItems(agents, 'agents');
      const availableCategories = this.categoryModel.getAllCategories();

      await this.view.webview.postMessage({
        type: 'updateData',
        mcpServers,
        skills,
        skillCategories,
        agents,
        agentCategories,
        rules,
        stats,
        availableCategories
      });
    } catch (err) {
      console.error('[CustomizationWebviewController] Erro ao carregar dados:', err);
    }
  }

  setupWatchers() {
    const mcpWatcher = vscode.workspace.createFileSystemWatcher('**/mcp_config.json');
    mcpWatcher.onDidChange(() => this.refresh());
    mcpWatcher.onDidCreate(() => this.refresh());
    mcpWatcher.onDidDelete(() => this.refresh());
  }
}

module.exports = CustomizationWebviewController;
