import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { ILanguageProvider } from './ILanguageProvider';
import { IPlatformService } from '../platform/IPlatformService';
import { VSInstallation, RoslynInfo } from '../types';

export class RoslynProvider implements ILanguageProvider {
  public readonly name = 'roslyn';
  public readonly displayName = 'Roslyn Language Server';
  public readonly supportedFrameworks = [
    'net20', 'net35', 'net40', 'net45', 'net451', 'net452', 
    'net46', 'net461', 'net462', 'net47', 'net471', 'net472', 'net48'
  ];

  private client: LanguageClient | null = null;
  private roslynInfo: RoslynInfo | null = null;
  private vsInstallation: VSInstallation | null = null;

  constructor(
    private readonly platformService: IPlatformService,
    private readonly outputChannel: vscode.OutputChannel
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const installations = await this.platformService.findVisualStudio();
      if (installations.length === 0) {
        this.outputChannel.appendLine('No Visual Studio installations found');
        return false;
      }

      // Try to find Roslyn in the preferred VS installation
      const preferredInstallation = this.selectPreferredInstallation(installations);
      const roslynInfo = await this.platformService.findRoslyn(preferredInstallation.installationPath);
      
      if (!roslynInfo) {
        this.outputChannel.appendLine(`Roslyn not found in ${preferredInstallation.displayName}`);
        return false;
      }

      this.vsInstallation = preferredInstallation;
      this.roslynInfo = roslynInfo;
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to check Roslyn availability: ${error}`);
      return false;
    }
  }

  async getServerPath(): Promise<string> {
    if (!this.roslynInfo) {
      throw new Error('Roslyn not available. Call isAvailable() first.');
    }
    return this.roslynInfo.path;
  }

  async getServerOptions(): Promise<ServerOptions> {
    const serverPath = await this.getServerPath();
    
    // Configure Roslyn for .NET Framework
    const args = [
      '--logLevel', 'Information',
      '--extensionLogDirectory', this.getLogDirectory(),
      // Force .NET Framework mode
      '--roslynExtensionsOptions', JSON.stringify({
        enableImportCompletion: true,
        enableAnalyzersSupport: true,
        enableCodeActionsWhenDocumentClosed: false
      })
    ];

    return {
      run: {
        command: serverPath,
        args,
        transport: TransportKind.stdio,
        options: {
          env: {
            ...process.env,
            // Ensure .NET Framework is preferred
            DOTNET_ROLL_FORWARD: 'Disable',
            DOTNET_FRAMEWORK_VERSION: '4.8'
          }
        }
      },
      debug: {
        command: serverPath,
        args: [...args, '--debug'],
        transport: TransportKind.stdio,
        options: {
          env: {
            ...process.env,
            DOTNET_ROLL_FORWARD: 'Disable',
            DOTNET_FRAMEWORK_VERSION: '4.8'
          }
        }
      }
    };
  }

  getClientOptions(): LanguageClientOptions {
    return {
      documentSelector: [
        { scheme: 'file', language: 'csharp' }
      ],
      outputChannel: this.outputChannel,
      synchronize: {
        configurationSection: 'vsToolsBridge',
        fileEvents: [
          vscode.workspace.createFileSystemWatcher('**/*.cs'),
          vscode.workspace.createFileSystemWatcher('**/*.csproj'),
          vscode.workspace.createFileSystemWatcher('**/*.sln'),
          vscode.workspace.createFileSystemWatcher('**/*.config')
        ]
      },
      initializationOptions: {
        // Configure for .NET Framework development
        preferences: {
          includeInlaysParameterNameHints: 'literal',
          includeInlaysParameterNameHintsWhenArgumentMatchesName: false,
          includeInlaysVariableTypeHints: false,
          includeInlaysPropertyDeclarationTypeHints: false,
          includeInlaysReturnTypeHints: false,
          includeInlaysEnumMemberValueHints: false
        },
        completion: {
          filterOutOfScopeCompletion: true,
          showCompletionItemKind: true
        }
      },
      middleware: {
        provideHover: (document, position, token, next) => {
          // Add custom middleware for .NET Framework specific behavior
          return next(document, position, token);
        }
      }
    };
  }

  async activate(): Promise<void> {
    if (this.client) {
      await this.deactivate();
    }

    try {
      const serverOptions = await this.getServerOptions();
      const clientOptions = this.getClientOptions();

      this.client = new LanguageClient(
        'vsToolsBridge.roslyn',
        'VS Tools Bridge - Roslyn',
        serverOptions,
        clientOptions
      );

      this.outputChannel.appendLine('Starting Roslyn language server...');
      await this.client.start();
      this.outputChannel.appendLine('Roslyn language server started successfully');

      // Set up error handling
      this.client.onDidChangeState((event) => {
        this.outputChannel.appendLine(`Roslyn state changed: ${event.oldState} -> ${event.newState}`);
      });

    } catch (error) {
      this.outputChannel.appendLine(`Failed to start Roslyn: ${error}`);
      throw error;
    }
  }

  async deactivate(): Promise<void> {
    if (this.client) {
      this.outputChannel.appendLine('Stopping Roslyn language server...');
      await this.client.stop();
      this.client = null;
      this.outputChannel.appendLine('Roslyn language server stopped');
    }
  }

  async restart(): Promise<void> {
    this.outputChannel.appendLine('Restarting Roslyn language server...');
    await this.deactivate();
    await this.activate();
  }

  private selectPreferredInstallation(installations: VSInstallation[]): VSInstallation {
    const config = vscode.workspace.getConfiguration('vsToolsBridge');
    const preferredVersion = config.get<string>('preferredVSVersion', 'latest');

    if (preferredVersion === 'latest') {
      // Sort by version and return the latest
      return installations.sort((a, b) => b.version.localeCompare(a.version))[0];
    }

    // Try to find the preferred version
    const preferred = installations.find(inst => 
      inst.displayName.toLowerCase().includes(preferredVersion.toLowerCase()) ||
      inst.version.startsWith(preferredVersion)
    );

    return preferred || installations[0];
  }

  private getLogDirectory(): string {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceRoot) {
      return `${workspaceRoot}/.vscode/vsToolsBridge/logs`;
    }
    return `${require('os').tmpdir()}/vsToolsBridge/logs`;
  }
}