import { VSInstallation, MSBuildInfo, RoslynInfo, DebuggerInfo, ProjectInfo } from '../types';

export interface IPlatformService {
  findVisualStudio(): Promise<VSInstallation[]>;
  
  findMSBuild(vsPath: string): Promise<MSBuildInfo | null>;
  
  findRoslyn(vsPath: string): Promise<RoslynInfo | null>;
  
  findDebugger(): Promise<DebuggerInfo | null>;
  
  getProjectInfo(projectPath: string): Promise<ProjectInfo | null>;
  
  executeCommand(command: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  
  fileExists(path: string): Promise<boolean>;
  
  directoryExists(path: string): Promise<boolean>;
  
  readFile(path: string): Promise<string>;
  
  getPlatform(): 'windows' | 'mac' | 'linux';
}