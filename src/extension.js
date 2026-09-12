const vscode = require('vscode');
const CustomizationWebviewController = require('./controllers/CustomizationWebviewController');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';

  const controller = new CustomizationWebviewController(context.extensionUri, workspaceRoot);

  // Registra o provedor da Webview no painel lateral
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'antigravityCustomizationsView',
      controller,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Registra comandos da Command Palette
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravity-customizations.refresh', () => {
      controller.refresh();
      vscode.window.showInformationMessage('Customizações atualizadas!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('antigravity-customizations.disableAllMcp', () => {
      controller.mcpModel.toggleAll(false);
      controller.refresh();
      vscode.window.showInformationMessage('⚡ Todos os MCPs foram desativados para economizar tokens!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('antigravity-customizations.enableAllMcp', () => {
      controller.mcpModel.toggleAll(true);
      controller.refresh();
      vscode.window.showInformationMessage('🔌 Todos os MCPs foram reativados.');
    })
  );

  console.log('Antigravity Customizations Manager ativado com sucesso!');
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
