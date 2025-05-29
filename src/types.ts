export interface VSInstallation {
  version: string;
  displayName: string;
  installationPath: string;
  productPath: string;
  isPrerelease: boolean;
}

export interface MSBuildInfo {
  path: string;
  version: string;
}

export interface RoslynInfo {
  path: string;
  version: string;
  supportedFrameworks: string[];
}

export interface DebuggerInfo {
  path: string;
  type: 'mono' | 'vsdbg' | 'dotnet' | 'other';
  version: string;
}

export interface BuildResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
}

export interface ProjectInfo {
  path: string;
  targetFramework: string;
  outputType: string;
  references: string[];
}