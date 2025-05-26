import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { IPlatformService } from './IPlatformService';
import { VSInstallation, MSBuildInfo, RoslynInfo, DebuggerInfo, ProjectInfo } from '../types';

export class WindowsPlatformService implements IPlatformService {
  private static readonly VSWHERE_PATH = path.join(
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    'Microsoft Visual Studio',
    'Installer',
    'vswhere.exe'
  );

  async findVisualStudio(): Promise<VSInstallation[]> {
    try {
      const result = await this.executeCommand(WindowsPlatformService.VSWHERE_PATH, [
        '-latest',
        '-products', '*',
        '-requires', 'Microsoft.Component.MSBuild',
        '-format', 'json',
        '-utf8'
      ]);

      if (result.exitCode !== 0) {
        throw new Error(`vswhere failed: ${result.stderr}`);
      }

      const installations = JSON.parse(result.stdout) as any[];
      
      return installations.map(inst => ({
        version: inst.installationVersion || inst.catalog?.productSemanticVersion || 'unknown',
        displayName: inst.displayName || `Visual Studio ${inst.installationVersion}`,
        installationPath: inst.installationPath,
        productPath: inst.productPath,
        isPrerelease: inst.isPrerelease || false
      }));
    } catch (error) {
      console.error('Failed to find Visual Studio installations:', error);
      return [];
    }
  }

  async findMSBuild(vsPath: string): Promise<MSBuildInfo | null> {
    const possiblePaths = [
      path.join(vsPath, 'MSBuild', 'Current', 'Bin', 'MSBuild.exe'),
      path.join(vsPath, 'MSBuild', '17.0', 'Bin', 'MSBuild.exe'),
      path.join(vsPath, 'MSBuild', '16.0', 'Bin', 'MSBuild.exe'),
      path.join(vsPath, 'MSBuild', '15.0', 'Bin', 'MSBuild.exe')
    ];

    for (const msbuildPath of possiblePaths) {
      if (await this.fileExists(msbuildPath)) {
        try {
          const result = await this.executeCommand(msbuildPath, ['-version']);
          const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : 'unknown';
          
          return {
            path: msbuildPath,
            version
          };
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  async findRoslyn(vsPath: string): Promise<RoslynInfo | null> {
    const possiblePaths = [
      path.join(vsPath, 'Common7', 'IDE', 'CommonExtensions', 'Microsoft', 'ManagedLanguages', 'VBCSharp', 'LanguageServer', 'Microsoft.CodeAnalysis.LanguageServer.exe'),
      path.join(vsPath, 'MSBuild', 'Current', 'Bin', 'Roslyn', 'Microsoft.CodeAnalysis.LanguageServer.exe'),
      path.join(vsPath, 'MSBuild', '17.0', 'Bin', 'Roslyn', 'Microsoft.CodeAnalysis.LanguageServer.exe'),
      path.join(vsPath, 'MSBuild', '16.0', 'Bin', 'Roslyn', 'Microsoft.CodeAnalysis.LanguageServer.exe')
    ];

    for (const roslynPath of possiblePaths) {
      if (await this.fileExists(roslynPath)) {
        return {
          path: roslynPath,
          version: 'unknown', // We'll determine this later if needed
          supportedFrameworks: [
            'net20', 'net35', 'net40', 'net45', 'net451', 'net452', 
            'net46', 'net461', 'net462', 'net47', 'net471', 'net472', 'net48'
          ]
        };
      }
    }

    return null;
  }

  async findDebugger(): Promise<DebuggerInfo | null> {
    // For V1, we'll look for Mono debugger
    // This is a placeholder - actual implementation depends on Mono installation
    const monoPath = await this.findMonoDebugger();
    if (monoPath) {
      return {
        path: monoPath,
        type: 'mono',
        version: 'unknown'
      };
    }

    return null;
  }

  private async findMonoDebugger(): Promise<string | null> {
    // Check common Mono installation paths
    const possiblePaths = [
      'C:\\Program Files\\Mono\\bin\\mono.exe',
      'C:\\Program Files (x86)\\Mono\\bin\\mono.exe'
    ];

    for (const monoPath of possiblePaths) {
      if (await this.fileExists(monoPath)) {
        return monoPath;
      }
    }

    return null;
  }

  async getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
    try {
      const content = await this.readFile(projectPath);
      
      // Basic XML parsing to extract key information
      const targetFrameworkMatch = content.match(/<TargetFramework(?:Version)?>\s*([^<]+)\s*<\/TargetFramework(?:Version)?>/i);
      const outputTypeMatch = content.match(/<OutputType>\s*([^<]+)\s*<\/OutputType>/i);
      
      // Extract references
      const referenceMatches = content.match(/<Reference\s+Include="([^"]+)"/g) || [];
      const references = referenceMatches.map(match => {
        const includeMatch = match.match(/Include="([^"]+)"/);
        return includeMatch ? includeMatch[1] : '';
      }).filter(ref => ref);

      return {
        path: projectPath,
        targetFramework: targetFrameworkMatch ? targetFrameworkMatch[1].trim() : 'net48',
        outputType: outputTypeMatch ? outputTypeMatch[1].trim() : 'Library',
        references
      };
    } catch (error) {
      console.error('Failed to parse project file:', error);
      return null;
    }
  }

  async executeCommand(command: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, { 
        cwd, 
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: 1
        });
      });
    });
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf8');
  }

  getPlatform(): 'windows' | 'mac' | 'linux' {
    return 'windows';
  }
}