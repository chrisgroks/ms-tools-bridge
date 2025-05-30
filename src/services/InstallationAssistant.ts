import * as vscode from 'vscode';
import { IPlatformService } from '../platform/IPlatformService';
import { ProviderRegistry } from '../providers/ProviderRegistry';

export interface MissingTool {
  id: string;
  name: string;
  description: string;
  required: boolean;
  category: 'language' | 'build' | 'debug' | 'runtime';
  installMethod: 'automatic' | 'guided' | 'manual';
  installCommand?: string;
  installArgs?: string[];
  downloadUrl?: string;
  instructions?: string[];
  extensionId?: string; // Added for direct extension handling
}

export class InstallationAssistant {
  private foundDotnetCLIPath: string | null | undefined = undefined;

  constructor(
    private readonly platformService: IPlatformService,
    private readonly outputChannel: vscode.OutputChannel,
    private readonly providerRegistry: ProviderRegistry
  ) {
  }

  async checkMissingTools(): Promise<MissingTool[]> {
    const missing: MissingTool[] = [];
    const platform = this.platformService.getPlatform();

    // Check for .NET SDK
    const dotnetPath = await this.findDotNetCLI();
    if (!dotnetPath) {
      missing.push({
        id: 'dotnet-sdk',
        name: '.NET SDK',
        description: 'Required for building and running .NET applications',
        required: true,
        category: 'runtime',
        installMethod: 'manual',
        downloadUrl: 'https://dotnet.microsoft.com/download',
        instructions: [
          'Visit https://dotnet.microsoft.com/download',
          'Download the latest .NET SDK for your platform',
          'Run the installer and follow the instructions',
          'Restart VS Code after installation'
        ]
      });
    }

    // Check for C# language support (prioritizing extensions)
    const roslynProvider = this.providerRegistry.getLanguageProvider('roslyn');
    const isRoslynActive = roslynProvider && (await roslynProvider.isAvailable());
    this.outputChannel.appendLine(`[InstallationAssistant] Roslyn active status: ${isRoslynActive}`);

    let csharpExtensionAvailable = false;
    if (!isRoslynActive) {
      csharpExtensionAvailable = this.checkCSharpExtensions();
    } else {
      this.outputChannel.appendLine('[InstallationAssistant] Roslyn is active, skipping C# extension/OmniSharp checks.');
    }
    if (!isRoslynActive && !csharpExtensionAvailable) {
      // Prioritize Open VSX marketplace extensions
      missing.push({
        id: 'csharp-extension-sammy',
        name: 'C# Extension (muhammad-sammy)',
        description: 'Comprehensive C# support with OmniSharp integration - recommended for Open VSX',
        required: false,
        category: 'language',
        installMethod: 'guided',
        extensionId: 'muhammad-sammy.csharp',
        instructions: [
          'Open VS Code Extensions view (Ctrl+Shift+X)',
          'Search for "muhammad-sammy.csharp"',
          'Click Install on the C# extension by muhammad-sammy',
          'Alternative: Install from Open VSX marketplace'
        ]
      });

      // Fallback to Microsoft official extension
      missing.push({
        id: 'csharp-extension-ms',
        name: 'C# Extension (Microsoft)',
        description: 'Official Microsoft C# extension with OmniSharp',
        required: false,
        category: 'language',
        installMethod: 'guided',
        extensionId: 'ms-dotnettools.csharp',
        instructions: [
          'Open VS Code Extensions view (Ctrl+Shift+X)',
          'Search for "ms-dotnettools.csharp"',
          'Click Install on the official Microsoft C# extension'
        ]
      });
    }

    // Check for standalone OmniSharp (last resort)
    if (!isRoslynActive && !csharpExtensionAvailable && dotnetPath) { // Ensure Roslyn and C# extensions are not active
      const omnisharpAvailable = await this.checkOmniSharpAvailable();
      if (!omnisharpAvailable) {
        missing.push({
          id: 'omnisharp-standalone',
          name: 'OmniSharp Language Server (Standalone)',
          description: 'Command-line OmniSharp for manual setup (fallback option)',
          required: false,
          category: 'language',
          installMethod: 'automatic',
          installCommand: dotnetPath,
          installArgs: ['tool', 'install', '-g', 'omnisharp']
        });
      } // Close if (!omnisharpAvailable)
    } // Close if (!isRoslynActive && !csharpExtensionAvailable && dotnetPath)  }

    // Check for Mono (for .NET Framework support and debugging)
    if (platform !== 'windows') {
      const monoPath = await this.findMono();
      if (!monoPath) {
        const monoTool: MissingTool = {
          id: 'mono',
          name: 'Mono Framework',
          description: 'Required for .NET Framework development and debugging on non-Windows',
          required: false,
          category: 'debug',
          installMethod: platform === 'mac' ? 'guided' : 'manual',
          instructions: []
        };

        if (platform === 'mac') {
          monoTool.installCommand = '/opt/homebrew/bin/brew';
          monoTool.installArgs = ['install', 'mono'];
          monoTool.instructions = [
            'Install Homebrew if not already installed: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
            'Run: brew install mono',
            'Or download from: https://www.mono-project.com/download/stable/'
          ];
        } else {
          monoTool.downloadUrl = 'https://www.mono-project.com/download/stable/';
          monoTool.instructions = [
            'Visit https://www.mono-project.com/download/stable/',
            'Follow instructions for your Linux distribution',
            'Common: sudo apt install mono-complete (Ubuntu/Debian)',
            'Or: sudo dnf install mono-complete (Fedora/RHEL)'
          ];
        }

        missing.push(monoTool);
      }
    }


    return missing;
  }

  async promptForInstallation(missingTools: MissingTool[]): Promise<void> {
    if (missingTools.length === 0) {
      vscode.window.showInformationMessage('✅ All .NET tools are properly configured!');
      return;
    }

    const requiredTools = missingTools.filter(tool => tool.required);
    const optionalTools = missingTools.filter(tool => !tool.required);

    // Handle required tools first
    if (requiredTools.length > 0) {
      const message = `⚠️ Missing required tools: ${requiredTools.map(t => t.name).join(', ')}`;
      const action = await vscode.window.showWarningMessage(
        message,
        'Install Required Tools',
        'View Instructions',
        'Skip'
      );

      if (action === 'Install Required Tools') {
        await this.installTools(requiredTools);
      } else if (action === 'View Instructions') {
        await this.showInstallationInstructions(requiredTools);
      }
    }

    // Handle optional tools
    if (optionalTools.length > 0) {
      if (optionalTools.length === 1) {
        const tool = optionalTools[0];
        const message = `💡 The optional tool '${tool.name}' (${tool.description}) can improve your experience.`;
        const installAction = `Install ${tool.name}`;
        const action = await vscode.window.showInformationMessage(
          message,
          { modal: false },
          installAction,
          'View Instructions',
          'Skip'
        );

        if (action === installAction) {
          await this.installTools([tool]);
        } else if (action === 'View Instructions') {
          await this.showInstallationInstructions([tool]);
        }
      } else {
        // Multiple optional tools: prompt for the first one for now.
        const tool = optionalTools[0];
        const otherToolsCount = optionalTools.length - 1;
        const message = `💡 The optional tool '${tool.name}' (${tool.description}) is available. There ${otherToolsCount === 1 ? 'is' : 'are'} ${otherToolsCount} other optional tool(s) available too.`;
        const installAction = `Install ${tool.name}`;
        const viewOtherAction = 'View Other Optional Tools';
        const skipAllAction = 'Skip All Optional';

        const action = await vscode.window.showInformationMessage(
          message,
          { modal: false },
          installAction,
          viewOtherAction,
          'View Instructions',
          skipAllAction
        );

        if (action === installAction) {
          await this.installTools([tool]);
        } else if (action === viewOtherAction) {
          await this.selectiveInstall(optionalTools);
        } else if (action === 'View Instructions') {
          await this.showInstallationInstructions([tool]);
        }
        // If 'Skip All Optional' or dismissed, do nothing further with optional tools in this pass.
      }
    }
  }

  async installTool(tool: MissingTool): Promise<boolean> {
    if (tool.installMethod === 'automatic' && tool.installCommand && tool.installArgs) {
      return this.executeInstallCommand(tool);
    } else if (tool.installMethod === 'guided') {
      return this.guidedInstall(tool);
    } else {
      await this.showManualInstructions(tool);
      return false;
    }
  }

  private async executeInstallCommand(tool: MissingTool): Promise<boolean> {
    try {
      this.outputChannel.appendLine(`Installing ${tool.name}...`);
      this.outputChannel.appendLine(`Command: ${tool.installCommand} ${tool.installArgs?.join(' ')}`);

      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Installing ${tool.name}`,
          cancellable: true
        },
        async (progress, token) => {
          progress.report({ message: 'Running installation command...' });
          
          // Check for cancellation
          if (token.isCancellationRequested) {
            throw new Error('Installation cancelled by user');
          }
          
          return this.platformService.executeCommand(
            tool.installCommand!,
            tool.installArgs!
          );
        }
      );

      if (result.exitCode === 0) {
        this.outputChannel.appendLine(`✅ ${tool.name} installed successfully`);
        this.outputChannel.appendLine(result.stdout);
        
        vscode.window.showInformationMessage(
          `✅ ${tool.name} installed successfully! Restart language server to use it.`,
          'Restart Language Server'
        ).then(action => {
          if (action === 'Restart Language Server') {
            vscode.commands.executeCommand('vsToolsBridge.restartLanguageServer');
          }
        });
        
        return true;
      } else {
        this.outputChannel.appendLine(`❌ Failed to install ${tool.name}`);
        this.outputChannel.appendLine(`Error: ${result.stderr}`);
        
        vscode.window.showErrorMessage(
          `Failed to install ${tool.name}. Check output for details.`,
          'View Output',
          'Manual Instructions'
        ).then(action => {
          if (action === 'View Output') {
            this.outputChannel.show();
          } else if (action === 'Manual Instructions') {
            this.showManualInstructions(tool);
          }
        });
        
        return false;
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('cancelled')) {
        this.outputChannel.appendLine(`⏹️ ${tool.name} installation cancelled by user`);
        vscode.window.showInformationMessage(`Installation of ${tool.name} was cancelled`);
        return false;
      }
      
      this.outputChannel.appendLine(`❌ Error installing ${tool.name}: ${error}`);
      vscode.window.showErrorMessage(`Installation failed: ${error}`);
      return false;
    }
  }

  private async guidedInstall(tool: MissingTool): Promise<boolean> {
    this.outputChannel.appendLine(`[InstallationAssistant] Starting guided installation for ${tool.name}`);

    if (tool.extensionId) {
      this.outputChannel.appendLine(`[InstallationAssistant] Attempting to open extension marketplace for ${tool.extensionId}`);
      try {
        // Option 1: Try to directly install (might require user confirmation in some VS Code versions or settings)
        // await vscode.commands.executeCommand('workbench.extensions.installExtension', tool.extensionId);
        // vscode.window.showInformationMessage(`Installation of '${tool.name}' initiated. Please check the Extensions view.`);
        // return true; // Assuming initiation is success, actual install is async by VS Code

        // Option 2: Open in marketplace view (safer, more user-driven)
        await vscode.commands.executeCommand('workbench.extensions.search', `@id:${tool.extensionId}`);
        vscode.window.showInformationMessage(`Showing '${tool.name}' in the Extensions view. Please click 'Install'.`);
        return false; // User needs to click install
      } catch (error) {
        this.outputChannel.appendLine(`[InstallationAssistant] Failed to open extension marketplace for ${tool.extensionId}: ${error}`);
        vscode.window.showErrorMessage(`Could not open '${tool.name}' in the marketplace. Please search for it manually: ${tool.extensionId}`);
        return false;
      }
    } else if (tool.instructions && tool.instructions.length > 0) {
      const learnMore = 'Open Instructions';
      const response = await vscode.window.showInformationMessage(
        `Guided installation required for ${tool.name}. Please follow the provided instructions.`,
        learnMore
      );
      if (response === learnMore) {
        await this.showManualInstructions(tool);
      }
      return false; // Guided install means user needs to take action
    } else {
      vscode.window.showWarningMessage(`No specific instructions available for ${tool.name}. Please check its documentation.`);
      return false;
    }
  }

  private async showManualInstructions(tool: MissingTool): Promise<void> {
    const instructions = tool.instructions || [`Please install ${tool.name} manually`];
    const message = `Manual installation required for ${tool.name}:\n\n${instructions.join('\n')}`;

    this.outputChannel.appendLine(`Manual installation instructions for ${tool.name}:`);
    instructions.forEach(instruction => this.outputChannel.appendLine(`  - ${instruction}`));

    const actions = ['Copy Instructions'];
    if (tool.downloadUrl) {
      actions.push('Open Download Page');
    }
    actions.push('View Output');

    vscode.window.showInformationMessage(
      `Manual installation required for ${tool.name}`,
      ...actions
    ).then(action => {
      if (action === 'Copy Instructions') {
        vscode.env.clipboard.writeText(instructions.join('\n'));
        vscode.window.showInformationMessage('Instructions copied to clipboard');
      } else if (action === 'Open Download Page' && tool.downloadUrl) {
        vscode.env.openExternal(vscode.Uri.parse(tool.downloadUrl));
      } else if (action === 'View Output') {
        this.outputChannel.show();
      }
    });
  }

  private async installTools(tools: MissingTool[]): Promise<void> {
    for (const tool of tools) {
      await this.installTool(tool);
    }
  }

  private async selectiveInstall(tools: MissingTool[]): Promise<void> {
    const selected = await vscode.window.showQuickPick(
      tools.map(tool => ({
        label: tool.name,
        description: tool.description,
        detail: `Installation: ${tool.installMethod}`,
        tool: tool
      })),
      {
        canPickMany: true,
        placeHolder: 'Select tools to install'
      }
    );

    if (selected && selected.length > 0) {
      const selectedTools = selected.map(item => item.tool);
      await this.installTools(selectedTools);
    }
  }

  private async showInstallationInstructions(tools: MissingTool[]): Promise<void> {
    this.outputChannel.appendLine('=== Installation Instructions ===');
    
    for (const tool of tools) {
      this.outputChannel.appendLine(`\n${tool.name} (${tool.required ? 'Required' : 'Optional'}):`);
      this.outputChannel.appendLine(`Description: ${tool.description}`);
      
      if (tool.instructions) {
        tool.instructions.forEach(instruction => {
          this.outputChannel.appendLine(`  - ${instruction}`);
        });
      }
      
      if (tool.downloadUrl) {
        this.outputChannel.appendLine(`  Download: ${tool.downloadUrl}`);
      }
    }
    
    this.outputChannel.show();
  }

  // Helper methods for tool detection
  private async findDotNetCLI(): Promise<string | null> {
    if (this.foundDotnetCLIPath !== undefined) {
      return this.foundDotnetCLIPath;
    }
    let pathsToCheck: string[] = [];
    const platform = this.platformService.getPlatform();

    if (platform === 'windows') {
      pathsToCheck = [
        process.env['ProgramFiles'] + '\\dotnet\\dotnet.exe',
        process.env['ProgramFiles(x86)'] + '\\dotnet\\dotnet.exe',
      ];
    } else {
      pathsToCheck = [
        '/usr/local/share/dotnet/dotnet',
        '/usr/bin/dotnet',
        '/usr/local/bin/dotnet',
        '/opt/homebrew/bin/dotnet'
      ];
    }

    for (const p of pathsToCheck) {
      if (p && await this.platformService.fileExists(p)) {
        this.outputChannel.appendLine(`Found dotnet CLI at: ${p}`);
        this.foundDotnetCLIPath = p;
        return p;
      }
    }

    // If not found in common paths, try executing 'dotnet --version'
    // This relies on dotnet being in the system PATH
    try {
      this.outputChannel.appendLine('Checking for dotnet CLI in PATH...');
      const versionResult = await this.platformService.executeCommand('dotnet', ['--version']);
      if (versionResult.exitCode === 0) {
        this.outputChannel.appendLine(`'dotnet --version' successful. SDK is in PATH.`);
        // Try to get the exact path using 'where' (Windows) or 'which' (Unix)
        const command = platform === 'windows' ? 'where' : 'which';
        const pathResult = await this.platformService.executeCommand(command, ['dotnet']);
        if (pathResult.exitCode === 0 && pathResult.stdout) {
          // 'where' can return multiple paths, take the first one.
          const dotnetPath = pathResult.stdout.split('\n')[0].trim();
          if (dotnetPath && await this.platformService.fileExists(dotnetPath)) {
            this.outputChannel.appendLine(`Found dotnet CLI via ${command}: ${dotnetPath}`);
            this.foundDotnetCLIPath = dotnetPath;
            return dotnetPath;
          }
        }
        this.outputChannel.appendLine(`Could not determine exact dotnet path via ${command}, but it's in PATH.`);
        this.foundDotnetCLIPath = 'dotnet'; // Indicates it's in PATH but we couldn't get the exact path
        return 'dotnet';
      }
      this.outputChannel.appendLine(`'dotnet --version' failed or SDK not in PATH. Exit code: ${versionResult.exitCode}, Stderr: ${versionResult.stderr}`);
    } catch (error: any) {
      this.outputChannel.appendLine(`Error checking for dotnet CLI in PATH: ${error.message}`);
    }

    this.outputChannel.appendLine('dotnet CLI not found in common paths or system PATH.');
    this.foundDotnetCLIPath = null;
    return null;
  }

  private async checkOmniSharpAvailable(): Promise<boolean> {
    // Check if OmniSharp is available via platform service
    if ('findOmniSharp' in this.platformService) {
      const omnisharpPath = await (this.platformService as any).findOmniSharp();
      return !!omnisharpPath;
    }

    // Fallback check for global dotnet tool
    try {
      const dotnetPath = await this.findDotNetCLI();
      if (dotnetPath) {
        const result = await this.platformService.executeCommand(dotnetPath, ['tool', 'list', '-g']);
        return result.stdout.includes('omnisharp');
      }
    } catch {
      // Ignore errors
    }

    return false;
  }

  private async findMono(): Promise<string | null> {
    const commonPaths = [
      '/usr/local/bin/mono',
      '/opt/homebrew/bin/mono',
      '/Library/Frameworks/Mono.framework/Versions/Current/Commands/mono'
    ];

    for (const path of commonPaths) {
      if (await this.platformService.fileExists(path)) {
        return path;
      }
    }

    return null;
  }

  private checkCSharpExtensions(): boolean {
    // Check for multiple C# extensions in order of preference
    const preferredExtensions = [
      'muhammad-sammy.csharp',           // Open VSX preferred
      'ms-dotnettools.csharp',           // Microsoft official
      'ms-dotnettools.vscode-dotnet-runtime' // Alternative
    ];

    for (const extensionId of preferredExtensions) {
      const extension = vscode.extensions.getExtension(extensionId);
      if (extension) {
        return true;
      }
    }

    return false;
  }
}