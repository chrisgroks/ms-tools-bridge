import { DebuggerInfo } from '../types';

export interface IDebugProvider {
  readonly name: string;
  readonly displayName: string;
  
  isAvailable(): Promise<boolean>;
  
  getDebuggerInfo(): Promise<DebuggerInfo | null>;
  
  createDebugConfiguration(projectPath: string): Promise<any>;
  
  supportsFramework(framework: string): boolean;
}