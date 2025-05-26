import { IPlatformService } from './IPlatformService';
import { VSInstallation, MSBuildInfo, RoslynInfo, DebuggerInfo, ProjectInfo } from '../types';

export class MockPlatformService implements IPlatformService {
  private readonly mockVSInstallations: VSInstallation[] = [
    {
      version: '17.8.3',
      displayName: 'Visual Studio Professional 2022',
      installationPath: '/mock/vs2022/professional',
      productPath: '/mock/vs2022/professional/Common7/IDE/devenv.exe',
      isPrerelease: false
    },
    {
      version: '16.11.34',
      displayName: 'Visual Studio Professional 2019',
      installationPath: '/mock/vs2019/professional',
      productPath: '/mock/vs2019/professional/Common7/IDE/devenv.exe',
      isPrerelease: false
    }
  ];

  async findVisualStudio(): Promise<VSInstallation[]> {
    // Simulate some delay
    await this.delay(100);
    return [...this.mockVSInstallations];
  }

  async findMSBuild(vsPath: string): Promise<MSBuildInfo | null> {
    await this.delay(50);
    
    if (vsPath.includes('vs2022')) {
      return {
        path: '/mock/vs2022/professional/MSBuild/Current/Bin/MSBuild.exe',
        version: '17.8.3'
      };
    } else if (vsPath.includes('vs2019')) {
      return {
        path: '/mock/vs2019/professional/MSBuild/16.0/Bin/MSBuild.exe',
        version: '16.11.34'
      };
    }
    
    return null;
  }

  async findRoslyn(vsPath: string): Promise<RoslynInfo | null> {
    await this.delay(50);
    
    if (vsPath.includes('vs2022') || vsPath.includes('vs2019')) {
      return {
        path: `${vsPath}/Common7/IDE/CommonExtensions/Microsoft/ManagedLanguages/VBCSharp/LanguageServer/Microsoft.CodeAnalysis.LanguageServer.exe`,
        version: vsPath.includes('vs2022') ? '4.8.0' : '4.0.0',
        supportedFrameworks: [
          'net20', 'net35', 'net40', 'net45', 'net451', 'net452', 
          'net46', 'net461', 'net462', 'net47', 'net471', 'net472', 'net48'
        ]
      };
    }
    
    return null;
  }

  async findDebugger(): Promise<DebuggerInfo | null> {
    await this.delay(50);
    
    return {
      path: '/mock/mono/bin/mono',
      type: 'mono',
      version: '6.12.0'
    };
  }

  async getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
    await this.delay(30);
    
    // Mock project info based on common scenarios
    if (projectPath.endsWith('.csproj')) {
      return {
        path: projectPath,
        targetFramework: 'net48',
        outputType: 'Exe',
        references: [
          'System',
          'System.Core',
          'System.Data',
          'System.Windows.Forms',
          'Microsoft.CSharp'
        ]
      };
    }
    
    return null;
  }

  async executeCommand(command: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    await this.delay(100);
    
    // Mock common command outputs
    if (command.includes('MSBuild.exe')) {
      if (args.includes('-version')) {
        return {
          stdout: 'Microsoft (R) Build Engine version 17.8.3+195e7f5a3',
          stderr: '',
          exitCode: 0
        };
      } else {
        return {
          stdout: 'Build succeeded.\n    0 Warning(s)\n    0 Error(s)',
          stderr: '',
          exitCode: 0
        };
      }
    }
    
    if (command.includes('vswhere.exe')) {
      return {
        stdout: JSON.stringify(this.mockVSInstallations),
        stderr: '',
        exitCode: 0
      };
    }
    
    return {
      stdout: '',
      stderr: 'Mock command not implemented',
      exitCode: 1
    };
  }

  async fileExists(path: string): Promise<boolean> {
    await this.delay(10);
    
    // Mock existence for common VS and MSBuild paths
    const mockExistingPaths = [
      '/mock/vs2022/professional/MSBuild/Current/Bin/MSBuild.exe',
      '/mock/vs2019/professional/MSBuild/16.0/Bin/MSBuild.exe',
      '/mock/vs2022/professional/Common7/IDE/CommonExtensions/Microsoft/ManagedLanguages/VBCSharp/LanguageServer/Microsoft.CodeAnalysis.LanguageServer.exe',
      '/mock/vs2019/professional/Common7/IDE/CommonExtensions/Microsoft/ManagedLanguages/VBCSharp/LanguageServer/Microsoft.CodeAnalysis.LanguageServer.exe',
      '/mock/mono/bin/mono'
    ];
    
    return mockExistingPaths.some(mockPath => path.includes(mockPath.split('/').pop() || ''));
  }

  async directoryExists(path: string): Promise<boolean> {
    await this.delay(10);
    
    const mockExistingDirs = [
      '/mock/vs2022/professional',
      '/mock/vs2019/professional',
      '/mock/mono/bin'
    ];
    
    return mockExistingDirs.includes(path);
  }

  async readFile(path: string): Promise<string> {
    await this.delay(50);
    
    if (path.endsWith('.csproj')) {
      return `<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <TargetFrameworkVersion>v4.8</TargetFrameworkVersion>
    <OutputType>Exe</OutputType>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="System" />
    <Reference Include="System.Core" />
    <Reference Include="System.Data" />
    <Reference Include="System.Windows.Forms" />
    <Reference Include="Microsoft.CSharp" />
  </ItemGroup>
</Project>`;
    }
    
    throw new Error(`Mock file not found: ${path}`);
  }

  getPlatform(): 'windows' | 'mac' | 'linux' {
    return 'mac';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}