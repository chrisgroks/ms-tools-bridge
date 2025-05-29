import * as vscode from 'vscode';
import { IPlatformService } from '../platform/IPlatformService';

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
}

export class InstallationAssistant {
  private readonly outputChannel: vscode.OutputChannel;

  constructor(
    private readonly platformService: IPlatformService,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
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

    // Check for OmniSharp
    const omnisharpAvailable = await this.checkOmniSharpAvailable();
    if (!omnisharpAvailable && dotnetPath) {
      missing.push({
        id: 'omnisharp',
        name: 'OmniSharp Language Server',
        description: 'Provides IntelliSense, go-to-definition, and other language features',
        required: false,
        category: 'language',
        installMethod: 'automatic',
        installCommand: dotnetPath,
        installArgs: ['tool', 'install', '-g', 'omnisharp']
      });
    }

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

    // Check for VS Code C# extension
    const csharpExtension = vscode.extensions.getExtension('ms-dotnettools.csharp');
    if (!csharpExtension) {
      missing.push({
        id: 'csharp-extension',
        name: 'C# Extension',
        description: 'Microsoft\'s official C# extension (contains OmniSharp)',
        required: false,
        category: 'language',
        installMethod: 'guided',
        instructions: [
          'Open VS Code Extensions view (Ctrl+Shift+X)',
          'Search for "C# ms-dotnettools.csharp"',
          'Click Install on the official Microsoft C# extension'
        ]
      });
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
      const message = `💡 Install optional tools for better experience: ${optionalTools.map(t => t.name).join(', ')}`;
      const action = await vscode.window.showInformationMessage(
        message,
        'Install All',
        'Choose Tools',
        'View Instructions',
        'Skip'
      );

      if (action === 'Install All') {
        await this.installTools(optionalTools);
      } else if (action === 'Choose Tools') {
        await this.selectiveInstall(optionalTools);
      } else if (action === 'View Instructions') {
        await this.showInstallationInstructions(optionalTools);
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
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: 'Running installation command...' });
          
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
      this.outputChannel.appendLine(`❌ Error installing ${tool.name}: ${error}`);
      vscode.window.showErrorMessage(`Installation failed: ${error}`);
      return false;
    }
  }

  private async guidedInstall(tool: MissingTool): Promise<boolean> {
    if (tool.id === 'mono' && tool.installCommand) {
      // Special handling for Homebrew on macOS
      const hasHomebrew = await this.platformService.fileExists('/opt/homebrew/bin/brew') || 
                          await this.platformService.fileExists('/usr/local/bin/brew');
      
      if (!hasHomebrew) {
        const installHomebrew = await vscode.window.showInformationMessage(
          'Mono installation requires Homebrew. Install Homebrew first?',
          'Yes, Install Homebrew',
          'Manual Instructions',
          'Skip'
        );

        if (installHomebrew === 'Yes, Install Homebrew') {
          await this.showHomebrewInstallation();
          return false; // User needs to install Homebrew first
        } else if (installHomebrew === 'Manual Instructions') {
          await this.showManualInstructions(tool);
          return false;
        }
        return false;
      }

      // If Homebrew is available, try automatic installation
      return this.executeInstallCommand(tool);
    }

    // Default guided install - show instructions
    await this.showManualInstructions(tool);
    return false;
  }

  private async showHomebrewInstallation(): Promise<void> {
    const message = `To install Homebrew, run this command in Terminal:

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

After Homebrew is installed, try installing Mono again.`;

    vscode.window.showInformationMessage(
      'Homebrew Installation Required',
      'Copy Command',
      'Open Website'
    ).then(action => {
      if (action === 'Copy Command') {
        vscode.env.clipboard.writeText('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
        vscode.window.showInformationMessage('Command copied to clipboard');
      } else if (action === 'Open Website') {
        vscode.env.openExternal(vscode.Uri.parse('https://brew.sh'));
      }
    });
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
    const commonPaths = [
      '/usr/local/share/dotnet/dotnet',
      '/usr/local/bin/dotnet',
      '/opt/homebrew/bin/dotnet'
    ];

    for (const path of commonPaths) {
      if (await this.platformService.fileExists(path)) {
        return path;
      }
    }

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
}