import { BuildResult, ProjectInfo } from '../types';

export interface IBuildProvider {
  readonly name: string;
  readonly displayName: string;
  
  isAvailable(): Promise<boolean>;
  
  build(projectPath: string, configuration?: string, platform?: string): Promise<BuildResult>;
  
  clean(projectPath: string): Promise<BuildResult>;
  
  restore(projectPath: string): Promise<BuildResult>;
  
  getProjectInfo(projectPath: string): Promise<ProjectInfo | null>;
}