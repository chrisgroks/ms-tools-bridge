import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { ILanguageProvider } from './ILanguageProvider';
import { IPlatformService } from '../platform/IPlatformService';

export class OmniSharpProvider implements ILanguageProvider {
  public readonly name = 'omnisharp';
  public readonly displayName = 'OmniSharp Language Server';
  public readonly supportedFrameworks = [
    'net20', 'net35', 'net40', 'net45', 'net451', 'net452', 
    'net46', 'net461', 'net462', 'net47', 'net471', 'net472', 'net48'
  ];

  private client: LanguageClient | null = null;
  private omniSharpPath: string | null = null;

  constructor(
    private readonly platformService: IPlatformService,
    private readonly outputChannel: vscode.OutputChannel
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      // Check for custom OmniSharp path first
      const config = vscode.workspace.getConfiguration('vsToolsBridge');
      const customPath = config.get<string>('customOmniSharpPath', '');
      
      if (customPath && await this.platformService.fileExists(customPath)) {
        this.omniSharpPath = customPath;
        this.outputChannel.appendLine(`Using custom OmniSharp path: ${customPath}`);
        return true;
      }

      // Try to find OmniSharp in common locations
      const possiblePaths = await this.getCommonOmniSharpPaths();
      
      for (const omniSharpPath of possiblePaths) {
        if (await this.platformService.fileExists(omniSharpPath)) {
          this.omniSharpPath = omniSharpPath;
          this.outputChannel.appendLine(`Found OmniSharp at: ${omniSharpPath}`);
          return true;
        }
      }

      this.outputChannel.appendLine('OmniSharp not found in common locations');
      return false;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to check OmniSharp availability: ${error}`);
      return false;
    }
  }

  async getServerPath(): Promise<string> {
    if (!this.omniSharpPath) {
      throw new Error('OmniSharp not available. Call isAvailable() first.');
    }
    return this.omniSharpPath;
  }

  async getServerOptions(): Promise<ServerOptions> {
    const serverPath = await this.getServerPath();
    
    // Configure OmniSharp for .NET Framework
    const args = [
      '--languageserver',
      '--hostPID', process.pid.toString()
    ];

    return {
      run: {
        command: serverPath,
        args,
        transport: TransportKind.stdio
      },
      debug: {
        command: serverPath,
        args: [...args, '--debug'],
        transport: TransportKind.stdio
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
          vscode.workspace.createFileSystemWatcher('**/*.json')
        ]
      },
      initializationOptions: {
        // OmniSharp specific options
        enableMsBuildLoadProjectsOnDemand: false,
        enableRoslynAnalyzers: true,
        enableEditorConfigSupport: true,
        enableDecompilationSupport: false,
        enableImportCompletion: true
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
        'vsToolsBridge.omnisharp',
        'VS Tools Bridge - OmniSharp',
        serverOptions,
        clientOptions
      );

      this.outputChannel.appendLine('Starting OmniSharp language server...');
      await this.client.start();
      this.outputChannel.appendLine('OmniSharp language server started successfully');

      // Set up error handling
      this.client.onDidChangeState((event) => {
        this.outputChannel.appendLine(`OmniSharp state changed: ${event.oldState} -> ${event.newState}`);
      });

    } catch (error) {
      this.outputChannel.appendLine(`Failed to start OmniSharp: ${error}`);
      throw error;
    }
  }

  async deactivate(): Promise<void> {
    if (this.client) {
      this.outputChannel.appendLine('Stopping OmniSharp language server...');
      await this.client.stop();
      this.client = null;
      this.outputChannel.appendLine('OmniSharp language server stopped');
    }
  }

  async restart(): Promise<void> {
    this.outputChannel.appendLine('Restarting OmniSharp language server...');
    await this.deactivate();
    await this.activate();
  }

  private async getCommonOmniSharpPaths(): Promise<string[]> {
    const platform = this.platformService.getPlatform();
    
    if (platform === 'windows') {
      // Common Windows locations for OmniSharp
      return [
        'C:\\Program Files\\dotnet\\omnisharp\\OmniSharp.exe',
        'C:\\Program Files (x86)\\Microsoft Visual Studio\\Shared\\OmniSharp\\OmniSharp.exe',
        path.join(require('os').homedir(), '.omnisharp', 'omnisharp.exe'),
        path.join(require('os').homedir(), '.vscode', 'extensions', '*omnisharp*', 'bin', 'omnisharp.exe')
      ];
    } else if (platform === 'mac') {
      // Common macOS locations
      return [
        '/usr/local/bin/omnisharp',
        path.join(require('os').homedir(), '.omnisharp', 'omnisharp'),
        path.join(require('os').homedir(), '.vscode', 'extensions', '*omnisharp*', 'bin', 'omnisharp')
      ];
    } else {
      // Linux locations
      return [
        '/usr/bin/omnisharp',
        '/usr/local/bin/omnisharp',
        path.join(require('os').homedir(), '.omnisharp', 'omnisharp'),
        path.join(require('os').homedir(), '.vscode', 'extensions', '*omnisharp*', 'bin', 'omnisharp')
      ];
    }
  }
}