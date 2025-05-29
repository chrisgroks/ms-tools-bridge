import { IPlatformService } from './IPlatformService';
import { VSInstallation, MSBuildInfo, RoslynInfo, DebuggerInfo, ProjectInfo } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export class MacOSPlatformService implements IPlatformService {
  
  async findVisualStudio(): Promise<VSInstallation[]> {
    // On macOS, we simulate VS installations based on available .NET SDKs
    // This allows the extension to work with .NET tooling without requiring actual VS
    const dotnetSdks = await this.findDotNetSDKs();
    const installations: VSInstallation[] = [];

    if (dotnetSdks.length > 0) {
      // Create a virtual VS installation for each major .NET version
      const uniqueVersions = [...new Set(dotnetSdks.map(sdk => sdk.split('.')[0]))];
      
      for (const majorVersion of uniqueVersions) {
        const latestSdk = dotnetSdks
          .filter(sdk => sdk.startsWith(majorVersion))
          .sort()
          .pop();

        if (latestSdk) {
          installations.push({
            version: `${majorVersion}.0.0`,
            displayName: `Visual Studio Code + .NET ${majorVersion}`,
            installationPath: `/usr/local/share/dotnet/sdk/${latestSdk}`,
            productPath: `/usr/local/share/dotnet/dotnet`,
            isPrerelease: false
          });
        }
      }
    }

    // If no .NET SDKs found, create a basic installation
    if (installations.length === 0) {
      installations.push({
        version: '1.0.0',
        displayName: 'VS Code + Mono (.NET Framework)',
        installationPath: '/usr/local',
        productPath: '/usr/local/bin/mono',
        isPrerelease: false
      });
    }

    return installations;
  }

  async findMSBuild(vsPath: string): Promise<MSBuildInfo | null> {
    // Check for dotnet build command (modern .NET)
    try {
      const dotnetPath = await this.findDotNetCLI();
      if (dotnetPath) {
        const { stdout } = await execAsync(`${dotnetPath} --version`);
        return {
          path: `${dotnetPath} build`,
          version: stdout.trim()
        };
      }
    } catch (error) {
      // Fall back to other options
    }

    // Check for MSBuild via Mono
    try {
      const monoPath = await this.findMono();
      if (monoPath) {
        const msbuildPath = path.join(path.dirname(monoPath), 'msbuild');
        if (await this.fileExists(msbuildPath)) {
          return {
            path: msbuildPath,
            version: 'Mono MSBuild'
          };
        }
      }
    } catch (error) {
      // Continue to next option
    }

    return null;
  }

  async findRoslyn(vsPath: string): Promise<RoslynInfo | null> {
    // Roslyn language server is not typically available on macOS
    // Return null to indicate OmniSharp should be preferred
    return null;
  }

  async findDebugger(): Promise<DebuggerInfo | null> {
    // Check for Mono debugger
    const monoPath = await this.findMono();
    if (monoPath) {
      try {
        const { stdout } = await execAsync(`${monoPath} --version`);
        const versionMatch = stdout.match(/Mono JIT compiler version (\S+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        
        return {
          path: monoPath,
          type: 'mono',
          version: version
        };
      } catch (error) {
        return {
          path: monoPath,
          type: 'mono',
          version: 'unknown'
        };
      }
    }

    // Check for .NET debugger
    const dotnetPath = await this.findDotNetCLI();
    if (dotnetPath) {
      return {
        path: dotnetPath,
        type: 'dotnet',
        version: 'Built-in'
      };
    }

    return null;
  }

  async getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
    try {
      const content = await this.readFile(projectPath);
      
      // Parse basic project information
      const targetFrameworkMatch = content.match(/<TargetFramework(?:Version)?>\s*([^<]+)\s*<\/TargetFramework(?:Version)?>/i);
      const outputTypeMatch = content.match(/<OutputType>\s*([^<]+)\s*<\/OutputType>/i);
      
      // Extract references
      const references: string[] = [];
      const referenceMatches = content.matchAll(/<Reference\s+Include="([^"]+)"/gi);
      for (const match of referenceMatches) {
        references.push(match[1]);
      }

      // Extract package references
      const packageMatches = content.matchAll(/<PackageReference\s+Include="([^"]+)"/gi);
      for (const match of packageMatches) {
        references.push(match[1]);
      }

      return {
        path: projectPath,
        targetFramework: targetFrameworkMatch ? targetFrameworkMatch[1] : 'net48',
        outputType: outputTypeMatch ? outputTypeMatch[1] : 'Library',
        references: references
      };
    } catch (error) {
      return null;
    }
  }

  async executeCommand(command: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const fullCommand = `${command} ${args.join(' ')}`;
      const options = cwd ? { cwd } : {};
      const { stdout, stderr } = await execAsync(fullCommand, options);
      
      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.message || 'Command execution failed',
        exitCode: error.code || 1
      };
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(path: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string> {
    return fs.promises.readFile(path, 'utf8');
  }

  getPlatform(): 'windows' | 'mac' | 'linux' {
    return 'mac';
  }

  // Helper methods for detecting specific tools

  private async findDotNetCLI(): Promise<string | null> {
    const commonPaths = [
      '/usr/local/share/dotnet/dotnet',
      '/usr/local/bin/dotnet',
      '/opt/homebrew/bin/dotnet',
      path.join(os.homedir(), '.dotnet', 'dotnet')
    ];

    for (const dotnetPath of commonPaths) {
      if (await this.fileExists(dotnetPath)) {
        return dotnetPath;
      }
    }

    // Try which command
    try {
      const { stdout } = await execAsync('which dotnet');
      const dotnetPath = stdout.trim();
      if (dotnetPath && await this.fileExists(dotnetPath)) {
        return dotnetPath;
      }
    } catch {
      // Continue searching
    }

    return null;
  }

  private async findMono(): Promise<string | null> {
    const commonPaths = [
      '/usr/local/bin/mono',
      '/opt/homebrew/bin/mono',
      '/Library/Frameworks/Mono.framework/Versions/Current/Commands/mono'
    ];

    for (const monoPath of commonPaths) {
      if (await this.fileExists(monoPath)) {
        return monoPath;
      }
    }

    // Try which command
    try {
      const { stdout } = await execAsync('which mono');
      const monoPath = stdout.trim();
      if (monoPath && await this.fileExists(monoPath)) {
        return monoPath;
      }
    } catch {
      // Mono not found
    }

    return null;
  }

  private async findDotNetSDKs(): Promise<string[]> {
    try {
      const dotnetPath = await this.findDotNetCLI();
      if (!dotnetPath) return [];

      const { stdout } = await execAsync(`${dotnetPath} --list-sdks`);
      const sdks = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.split(' ')[0])
        .filter(version => version);

      return sdks;
    } catch {
      return [];
    }
  }

  async findOmniSharp(): Promise<string | null> {
    // Check common OmniSharp installation locations on macOS
    const commonPaths = [
      // VS Code C# extension
      path.join(os.homedir(), '.vscode', 'extensions'),
      // Global dotnet tool
      path.join(os.homedir(), '.dotnet', 'tools', 'omnisharp'),
      // Homebrew
      '/opt/homebrew/bin/omnisharp',
      '/usr/local/bin/omnisharp'
    ];

    // Check VS Code extensions directory
    const vscodeExtensionsPath = path.join(os.homedir(), '.vscode', 'extensions');
    if (await this.directoryExists(vscodeExtensionsPath)) {
      try {
        const extensions = await fs.promises.readdir(vscodeExtensionsPath);
        const csharpExtension = extensions.find(ext => ext.includes('ms-dotnettools.csharp'));
        
        if (csharpExtension) {
          const omnisharpPath = path.join(vscodeExtensionsPath, csharpExtension, '.omnisharp');
          if (await this.directoryExists(omnisharpPath)) {
            // Look for the actual OmniSharp executable
            const versions = await fs.promises.readdir(omnisharpPath);
            for (const version of versions) {
              const execPath = path.join(omnisharpPath, version, 'OmniSharp');
              if (await this.fileExists(execPath)) {
                return execPath;
              }
            }
          }
        }
      } catch (error) {
        // Continue to other paths
      }
    }

    // Check other common paths
    for (const omnisharpPath of commonPaths) {
      if (await this.fileExists(omnisharpPath)) {
        return omnisharpPath;
      }
    }

    // Try to install via dotnet tool if dotnet is available
    const dotnetPath = await this.findDotNetCLI();
    if (dotnetPath) {
      try {
        // Check if already installed as global tool
        const { stdout } = await execAsync(`${dotnetPath} tool list -g`);
        if (stdout.includes('omnisharp')) {
          const toolPath = path.join(os.homedir(), '.dotnet', 'tools', 'omnisharp');
          if (await this.fileExists(toolPath)) {
            return toolPath;
          }
        }
      } catch {
        // Tool not installed or command failed
      }
    }

    return null;
  }
}