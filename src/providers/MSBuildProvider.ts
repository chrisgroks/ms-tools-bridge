import * as path from 'path';
import { IBuildProvider } from './IBuildProvider';
import { IPlatformService } from '../platform/IPlatformService';
import { BuildResult, ProjectInfo, MSBuildInfo, VSInstallation } from '../types';

export class MSBuildProvider implements IBuildProvider {
  public readonly name = 'msbuild';
  public readonly displayName = 'MSBuild';

  private msbuildInfo: MSBuildInfo | null = null;
  private vsInstallation: VSInstallation | null = null;

  constructor(private readonly platformService: IPlatformService) {}

  async isAvailable(): Promise<boolean> {
    try {
      // Check for custom MSBuild path first
      const config = await import('vscode').then(vscode => vscode.workspace.getConfiguration('vsToolsBridge'));
      const customPath = config.get<string>('customMSBuildPath', '');
      
      if (customPath && await this.platformService.fileExists(customPath)) {
        try {
          const result = await this.platformService.executeCommand(customPath, ['-version']);
          const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : 'unknown';
          
          this.msbuildInfo = {
            path: customPath,
            version
          };
          return true;
        } catch {
          // Fall through to VS detection
        }
      }

      const installations = await this.platformService.findVisualStudio();
      if (installations.length === 0) {
        return false;
      }

      // Try to find MSBuild in the latest VS installation
      const latestInstallation = installations.sort((a, b) => b.version.localeCompare(a.version))[0];
      const msbuildInfo = await this.platformService.findMSBuild(latestInstallation.installationPath);
      
      if (!msbuildInfo) {
        return false;
      }

      this.vsInstallation = latestInstallation;
      this.msbuildInfo = msbuildInfo;
      return true;
    } catch {
      return false;
    }
  }

  async build(projectPath: string, configuration = 'Debug', platform = 'Any CPU'): Promise<BuildResult> {
    if (!this.msbuildInfo) {
      throw new Error('MSBuild not available. Call isAvailable() first.');
    }

    const args = [
      projectPath,
      `/p:Configuration=${configuration}`,
      `/p:Platform=${platform}`,
      '/v:minimal',
      '/nologo'
    ];

    try {
      const result = await this.platformService.executeCommand(
        this.msbuildInfo.path,
        args,
        path.dirname(projectPath)
      );

      const errors = this.parseErrors(result.stderr + result.stdout);
      const warnings = this.parseWarnings(result.stderr + result.stdout);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [`Build failed: ${error}`],
        warnings: []
      };
    }
  }

  async clean(projectPath: string): Promise<BuildResult> {
    if (!this.msbuildInfo) {
      throw new Error('MSBuild not available. Call isAvailable() first.');
    }

    const args = [
      projectPath,
      '/t:Clean',
      '/v:minimal',
      '/nologo'
    ];

    try {
      const result = await this.platformService.executeCommand(
        this.msbuildInfo.path,
        args,
        path.dirname(projectPath)
      );

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        errors: result.exitCode === 0 ? [] : [result.stderr],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [`Clean failed: ${error}`],
        warnings: []
      };
    }
  }

  async restore(projectPath: string): Promise<BuildResult> {
    if (!this.msbuildInfo) {
      throw new Error('MSBuild not available. Call isAvailable() first.');
    }

    const args = [
      projectPath,
      '/t:Restore',
      '/v:minimal',
      '/nologo'
    ];

    try {
      const result = await this.platformService.executeCommand(
        this.msbuildInfo.path,
        args,
        path.dirname(projectPath)
      );

      const errors = this.parseErrors(result.stderr + result.stdout);
      const warnings = this.parseWarnings(result.stderr + result.stdout);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [`Restore failed: ${error}`],
        warnings: []
      };
    }
  }

  async getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
    return this.platformService.getProjectInfo(projectPath);
  }

  private parseErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // MSBuild error pattern: file(line,col): error CS1234: message
      if (line.includes(': error ') || line.toLowerCase().includes('build failed')) {
        errors.push(line.trim());
      }
    }
    
    return errors;
  }

  private parseWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // MSBuild warning pattern: file(line,col): warning CS1234: message
      if (line.includes(': warning ')) {
        warnings.push(line.trim());
      }
    }
    
    return warnings;
  }
}