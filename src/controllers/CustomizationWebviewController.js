const vscode = require('vscode');
const McpModel = require('../models/McpModel');
const SkillsModel = require('../models/SkillsModel');
const RulesModel = require('../models/RulesModel');
const ContextBudgetModel = require('../models/ContextBudgetModel');
const WebviewHtml = require('../views/WebviewHtml');

class CustomizationWebviewController {
  constructor(extensionUri, workspaceRoot) {
    this.extensionUri = extensionUri;
    this.workspaceRoot = workspaceRoot;
    this.view = null;

    this.mcpModel = new McpModel(this.workspaceRoot);
    this.skillsModel = new SkillsModel(this.workspaceRoot);
    this.rulesModel = new RulesModel(this.workspaceRoot);

    this.setupWatchers();
  }

  resolveWebviewView(webviewView, _context, _token) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = WebviewHtml.getHtml(webviewView.webview, this.extensionUri);

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

          case 'toggleRule':
            this.rulesModel.toggleRule(data.rule, data.enabled);
            await this.refresh();
            break;
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Erro no Customizations Manager: ${err.message}`);
      }
    });
  }

  async refresh() {
    if (!this.view) return;

    try {
      const mcpServers = this.mcpModel.getAllServers();
      const skills = this.skillsModel.getAllSkills();
      const rules = this.rulesModel.getAllRules();
      const stats = ContextBudgetModel.calculateStats(mcpServers, skills, rules);

      await this.view.webview.postMessage({
        type: 'updateData',
        mcpServers,
        skills,
        rules,
        stats
      });
    } catch (err) {
      console.error('[CustomizationWebviewController] Erro ao carregar dados:', err);
    }
  }

  setupWatchers() {
    // Monitora alterações em mcp_config.json
    const mcpWatcher = vscode.workspace.createFileSystemWatcher('**/mcp_config.json');
    mcpWatcher.onDidChange(() => this.refresh());
    mcpWatcher.onDidCreate(() => this.refresh());
    mcpWatcher.onDidDelete(() => this.refresh());
  }
}

module.exports = CustomizationWebviewController;
