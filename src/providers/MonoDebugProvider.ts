import { IDebugProvider } from './IDebugProvider';
import { IPlatformService } from '../platform/IPlatformService';
import { DebuggerInfo } from '../types';

export class MonoDebugProvider implements IDebugProvider {
  public readonly name = 'mono';
  public readonly displayName = 'Mono Debugger';

  private debuggerInfo: DebuggerInfo | null = null;

  constructor(private readonly platformService: IPlatformService) {}

  async isAvailable(): Promise<boolean> {
    try {
      const debuggerInfo = await this.platformService.findDebugger();
      if (debuggerInfo && debuggerInfo.type === 'mono') {
        this.debuggerInfo = debuggerInfo;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getDebuggerInfo(): Promise<DebuggerInfo | null> {
    if (!this.debuggerInfo && !(await this.isAvailable())) {
      return null;
    }
    return this.debuggerInfo;
  }

  async createDebugConfiguration(projectPath: string): Promise<any> {
    const projectInfo = await this.platformService.getProjectInfo(projectPath);
    if (!projectInfo) {
      throw new Error('Could not load project information');
    }

    const isExecutable = projectInfo.outputType?.toLowerCase() === 'exe';
    const projectName = projectPath.split(/[/\\]/).pop()?.replace('.csproj', '') || 'Program';
    
    if (isExecutable) {
      return {
        name: `Debug ${projectName}`,
        type: 'mono',
        request: 'launch',
        program: '${workspaceFolder}/bin/Debug/' + projectName + '.exe',
        args: [],
        cwd: '${workspaceFolder}',
        stopAtEntry: false,
        console: 'internalConsole'
      };
    } else {
      // For libraries, create an attach configuration
      return {
        name: `Attach to ${projectName}`,
        type: 'mono',
        request: 'attach',
        address: 'localhost',
        port: 55555
      };
    }
  }

  supportsFramework(framework: string): boolean {
    // Mono supports all .NET Framework versions we care about
    const supportedFrameworks = [
      'net20', 'net35', 'net40', 'net45', 'net451', 'net452', 
      'net46', 'net461', 'net462', 'net47', 'net471', 'net472', 'net48'
    ];
    
    return supportedFrameworks.includes(framework.toLowerCase());
  }
}