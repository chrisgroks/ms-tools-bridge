import * as vscode from 'vscode';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { RoslynProvider } from './providers/RoslynProvider';
import { OmniSharpProvider } from './providers/OmniSharpProvider';
import { MSBuildProvider } from './providers/MSBuildProvider';
import { MonoDebugProvider } from './providers/MonoDebugProvider';
import { PlatformServiceFactory } from './platform/PlatformServiceFactory';
import { IPlatformService } from './platform/IPlatformService';

let providerRegistry: ProviderRegistry;
let platformService: IPlatformService;
let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('VS Tools Bridge');
  outputChannel.appendLine('VS Tools Bridge is activating...');

  try {
    // Initialize platform service
    platformService = PlatformServiceFactory.create();
    outputChannel.appendLine(`Platform: ${platformService.getPlatform()}`);

    // Initialize provider registry
    providerRegistry = new ProviderRegistry(outputChannel);

    // Register all providers
    const roslynProvider = new RoslynProvider(platformService, outputChannel);
    const omniSharpProvider = new OmniSharpProvider(platformService, outputChannel);
    const msbuildProvider = new MSBuildProvider(platformService);
    const monoProvider = new MonoDebugProvider(platformService);

    providerRegistry.registerLanguageProvider(roslynProvider);
    providerRegistry.registerLanguageProvider(omniSharpProvider);
    providerRegistry.registerBuildProvider(msbuildProvider);
    providerRegistry.registerDebugProvider(monoProvider);

    // Auto-activate providers
    await providerRegistry.autoActivateProviders();

    // Register commands
    registerCommands(context);

    // Set up configuration change handler
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(onConfigurationChanged)
    );

    // Set up file system watchers for project files
    setupFileWatchers(context);

    outputChannel.appendLine('VS Tools Bridge activated successfully');
    
    // Show status in status bar
    updateStatusBar();

  } catch (error) {
    const errorMsg = `Failed to activate VS Tools Bridge: ${error}`;
    outputChannel.appendLine(errorMsg);
    vscode.window.showErrorMessage(errorMsg);
  }
}

export async function deactivate() {
  outputChannel?.appendLine('VS Tools Bridge is deactivating...');
  
  if (providerRegistry) {
    await providerRegistry.deactivateAll();
  }
  
  outputChannel?.appendLine('VS Tools Bridge deactivated');
  outputChannel?.dispose();
}

function registerCommands(context: vscode.ExtensionContext) {
  // Select VS Version command
  const selectVSVersionCommand = vscode.commands.registerCommand(
    'vsToolsBridge.selectVSVersion',
    async () => {
      try {
        const installations = await platformService.findVisualStudio();
        
        if (installations.length === 0) {
          vscode.window.showErrorMessage('No Visual Studio installations found');
          return;
        }

        const items = installations.map(inst => ({
          label: inst.displayName,
          description: inst.version,
          detail: inst.installationPath,
          installation: inst
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select Visual Studio version'
        });

        if (selected) {
          const config = vscode.workspace.getConfiguration('vsToolsBridge');
          await config.update('preferredVSVersion', selected.installation.version, vscode.ConfigurationTarget.Global);
          
          // Restart language server with new VS version
          await providerRegistry.restartActiveProviders();
          
          vscode.window.showInformationMessage(`Switched to ${selected.label}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to select VS version: ${error}`);
      }
    }
  );

  // Restart Language Server command
  const restartLanguageServerCommand = vscode.commands.registerCommand(
    'vsToolsBridge.restartLanguageServer',
    async () => {
      try {
        await providerRegistry.restartActiveProviders();
        vscode.window.showInformationMessage('Language server restarted');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to restart language server: ${error}`);
      }
    }
  );

  // Build Project command
  const buildProjectCommand = vscode.commands.registerCommand(
    'vsToolsBridge.buildProject',
    async () => {
      try {
        const buildProvider = providerRegistry.getActiveBuildProvider();
        if (!buildProvider) {
          vscode.window.showErrorMessage('No build provider available');
          return;
        }

        const projectFiles = await vscode.workspace.findFiles('**/*.csproj');
        if (projectFiles.length === 0) {
          vscode.window.showErrorMessage('No .csproj files found in workspace');
          return;
        }

        let projectPath: string;
        if (projectFiles.length === 1) {
          projectPath = projectFiles[0].fsPath;
        } else {
          const items = projectFiles.map(file => ({
            label: vscode.workspace.asRelativePath(file),
            description: file.fsPath
          }));
          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select project to build'
          });
          if (!selected) return;
          projectPath = selected.description;
        }

        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Building project...',
          cancellable: false
        }, async () => {
          const result = await buildProvider.build(projectPath);
          if (result.success) {
            vscode.window.showInformationMessage('Build succeeded');
          } else {
            vscode.window.showErrorMessage(`Build failed: ${result.errors.join(', ')}`);
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Build failed: ${error}`);
      }
    }
  );

  // Clean Project command
  const cleanProjectCommand = vscode.commands.registerCommand(
    'vsToolsBridge.cleanProject',
    async () => {
      try {
        const buildProvider = providerRegistry.getActiveBuildProvider();
        if (!buildProvider) {
          vscode.window.showErrorMessage('No build provider available');
          return;
        }

        const projectFiles = await vscode.workspace.findFiles('**/*.csproj');
        if (projectFiles.length === 0) {
          vscode.window.showErrorMessage('No .csproj files found in workspace');
          return;
        }

        let projectPath: string;
        if (projectFiles.length === 1) {
          projectPath = projectFiles[0].fsPath;
        } else {
          const items = projectFiles.map(file => ({
            label: vscode.workspace.asRelativePath(file),
            description: file.fsPath
          }));
          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select project to clean'
          });
          if (!selected) return;
          projectPath = selected.description;
        }

        const result = await buildProvider.clean(projectPath);
        if (result.success) {
          vscode.window.showInformationMessage('Clean succeeded');
        } else {
          vscode.window.showErrorMessage(`Clean failed: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Clean failed: ${error}`);
      }
    }
  );

  // Restore Project command
  const restoreProjectCommand = vscode.commands.registerCommand(
    'vsToolsBridge.restoreProject',
    async () => {
      try {
        const buildProvider = providerRegistry.getActiveBuildProvider();
        if (!buildProvider) {
          vscode.window.showErrorMessage('No build provider available');
          return;
        }

        const projectFiles = await vscode.workspace.findFiles('**/*.csproj');
        if (projectFiles.length === 0) {
          vscode.window.showErrorMessage('No .csproj files found in workspace');
          return;
        }

        let projectPath: string;
        if (projectFiles.length === 1) {
          projectPath = projectFiles[0].fsPath;
        } else {
          const items = projectFiles.map(file => ({
            label: vscode.workspace.asRelativePath(file),
            description: file.fsPath
          }));
          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select project to restore'
          });
          if (!selected) return;
          projectPath = selected.description;
        }

        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Restoring project...',
          cancellable: false
        }, async () => {
          const result = await buildProvider.restore(projectPath);
          if (result.success) {
            vscode.window.showInformationMessage('Restore succeeded');
          } else {
            vscode.window.showErrorMessage(`Restore failed: ${result.errors.join(', ')}`);
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Restore failed: ${error}`);
      }
    }
  );

  // Configure Custom Paths command
  const configureCustomPathsCommand = vscode.commands.registerCommand(
    'vsToolsBridge.configureCustomPaths',
    async () => {
      try {
        const config = vscode.workspace.getConfiguration('vsToolsBridge');
        
        const items = [
          {
            label: 'Roslyn Language Server Path',
            description: 'Microsoft.CodeAnalysis.LanguageServer.exe',
            configKey: 'customRoslynPath'
          },
          {
            label: 'MSBuild Path',
            description: 'MSBuild.exe',
            configKey: 'customMSBuildPath'
          },
          {
            label: 'OmniSharp Path',
            description: 'OmniSharp.exe',
            configKey: 'customOmniSharpPath'
          }
        ];

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select tool to configure'
        });

        if (!selected) return;

        const currentPath = config.get<string>(selected.configKey, '');
        const newPath = await vscode.window.showInputBox({
          prompt: `Enter path to ${selected.label}`,
          value: currentPath,
          placeHolder: `C:\\path\\to\\${selected.description}`
        });

        if (newPath !== undefined) {
          await config.update(selected.configKey, newPath, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(`${selected.label} path updated. Restart language server to apply changes.`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to configure paths: ${error}`);
      }
    }
  );

  context.subscriptions.push(
    selectVSVersionCommand, 
    restartLanguageServerCommand,
    buildProjectCommand,
    cleanProjectCommand,
    restoreProjectCommand,
    configureCustomPathsCommand
  );
}

async function onConfigurationChanged(e: vscode.ConfigurationChangeEvent) {
  if (e.affectsConfiguration('vsToolsBridge')) {
    outputChannel.appendLine('Configuration changed, restarting providers...');
    
    const config = vscode.workspace.getConfiguration('vsToolsBridge');
    const autoRestart = config.get<boolean>('autoRestart', true);
    
    if (autoRestart) {
      await providerRegistry.restartActiveProviders();
    }
  }
}

function setupFileWatchers(context: vscode.ExtensionContext) {
  // Watch for project file changes
  const projectWatcher = vscode.workspace.createFileSystemWatcher('**/*.{csproj,sln}');
  
  projectWatcher.onDidCreate(async (uri) => {
    outputChannel.appendLine(`Project file created: ${uri.fsPath}`);
    // Optionally reload providers
  });

  projectWatcher.onDidChange(async (uri) => {
    outputChannel.appendLine(`Project file changed: ${uri.fsPath}`);
    // Optionally reload providers
  });

  context.subscriptions.push(projectWatcher);
}

function updateStatusBar() {
  const status = providerRegistry.getStatus();
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  
  let statusText = 'VS Tools Bridge';
  const activeProviders = [];
  
  if (status.language) {activeProviders.push(`Lang: ${status.language}`);}
  if (status.build) {activeProviders.push(`Build: ${status.build}`);}
  if (status.debug) {activeProviders.push(`Debug: ${status.debug}`);}
  
  if (activeProviders.length > 0) {
    statusText += ` (${activeProviders.join(', ')})`;
  }
  
  statusBarItem.text = statusText;
  statusBarItem.tooltip = 'VS Tools Bridge Status\nClick to show output';
  statusBarItem.command = 'workbench.action.output.toggleOutput';
  statusBarItem.show();
}