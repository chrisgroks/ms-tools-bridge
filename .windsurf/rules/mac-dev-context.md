---
trigger: model_decision
description: Setting up development environment on Mac, creating mocks, or testing without access to Windows.
---

# VS Tools Bridge - Mac Development Context

## Development Environment Setup

### Prerequisites on Mac
```bash
# Required tools
brew install node
brew install mono
npm install -g typescript
npm install -g @vscode/vsce

# VS Code extensions for development
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

### Project Structure for Cross-Platform Development
```
vs-tools-bridge/
├── src/
│   ├── common/              # Shared cross-platform code
│   │   ├── pathUtils.ts
│   │   ├── logger.ts
│   │   └── configuration.ts
│   ├── windows/             # Windows-specific implementations
│   │   ├── vsDetector.ts
│   │   ├── msbuildRunner.ts
│   │   └── vsHandoff.ts
│   ├── mocks/               # Mac development mocks
│   │   ├── mockVSDetector.ts
│   │   ├── mockMSBuild.ts
│   │   └── mockData.ts
│   ├── factories/           # Platform-specific factories
│   │   ├── detectorFactory.ts
│   │   └── builderFactory.ts
│   └── extension.ts         # Main entry point
├── test/
│   ├── fixtures/            # Test data files
│   │   ├── projects/        # Sample .csproj files
│   │   ├── outputs/         # Mock build outputs
│   │   └── configs/         # Test configurations
│   └── suite/              # Test suites
└── scripts/
    ├── test-mac.sh         # Mac test runner
    └── package-ext.sh      # Extension packager
```

## Mock Data Examples

### Mock VS Installation Data
```typescript
// src/mocks/mockData.ts
export const mockVSInstallations: IVSInstallation[] = [
  {
    installationPath: '/mock/vs/2022/enterprise',
    displayName: 'Visual Studio Enterprise 2022',
    version: '17.8.0',
    msbuildPath: '/mock/vs/2022/MSBuild/Current/Bin/MSBuild.exe',
    roslynPath: '/mock/vs/2022/MSBuild/Current/Bin/Roslyn'
  },
  {
    installationPath: '/mock/vs/2022/community',
    displayName: 'Visual Studio Community 2022',
    version: '17.8.0',
    msbuildPath: '/mock/vs/2022/MSBuild/Current/Bin/MSBuild.exe',
    roslynPath: '/mock/vs/2022/MSBuild/Current/Bin/Roslyn'
  }
];
```

### Mock MSBuild Output
```typescript
// src/mocks/mockMSBuild.ts
export class MockMSBuildRunner implements IMSBuildRunner {
  private mockOutputs = new Map<string, string>([
    ['success', `
Microsoft (R) Build Engine version 17.8.0
[Mock MSBuild on Mac]

Build started 1/1/2024 10:00:00 AM.
Project "/mock/TestApp/TestApp.csproj" on node 1 (default targets).
PrepareForBuild:
  Creating directory "bin/Debug/".
  Creating directory "obj/Debug/".
CoreCompile:
  MockCompile: Program.cs -> TestApp.exe
Build succeeded.
    0 Warning(s)
    0 Error(s)
`],
    ['error', `
Microsoft (R) Build Engine version 17.8.0
[Mock MSBuild on Mac]

Build started 1/1/2024 10:00:00 AM.
CSC : error CS0103: The name 'Console' does not exist [/mock/Test.csproj]
Build FAILED.
    0 Warning(s)
    1 Error(s)
`]
  ]);

  async build(config: IBuildConfig): Promise<IBuildResult> {
    // Simulate build time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const output = this.mockOutputs.get(
      config.projectPath.includes('Broken') ? 'error' : 'success'
    );
    
    return this.parseOutput(output || '');
  }
}
```

## Testing Strategies

### Unit Test Example (Platform-Independent)
```typescript
// test/suite/pathUtils.test.ts
import { expect } from 'chai';
import { normalizeProjectPath, toWindowsPath } from '../../src/common/pathUtils';

describe('Path Utilities (Mac)', () => {
  it('should handle Windows paths on Mac', () => {
    const winPath = 'C:\\Projects\\App\\App.csproj';
    const normalized = normalizeProjectPath(winPath);
    
    expect(normalized).to.not.include('\\');
    expect(normalized).to.include('App.csproj');
  });

  it('should convert Mac paths to Windows format', () => {
    const macPath = '/Users/dev/projects/app.csproj';
    const winPath = toWindowsPath(macPath);
    
    expect(winPath).to.match(/^[A-Z]:\\/);
    expect(winPath).to.include('\\');
  });
});
```

### Integration Test with Fixtures
```typescript
// test/suite/buildSystem.test.ts
describe('Build System (Mac Integration)', () => {
  let builder: IMSBuildRunner;
  
  before(() => {
    // Factory returns mock on Mac
    builder = createMSBuildRunner();
  });

  it('should build test project', async () => {
    const projectPath = path.join(__dirname, '../fixtures/projects/ConsoleApp.csproj');
    const result = await builder.build({
      projectPath,
      configuration: 'Debug',
      platform: 'AnyCPU'
    });
    
    expect(result.success).to.be.true;
    expect(result.outputPath).to.include('ConsoleApp.exe');
  });
});
```

### Mono Debugger Testing (Native on Mac)
```typescript
// test/suite/monoDebugger.test.ts
import { MonoDebugSession } from '../../src/debug/monoDebugAdapter';

describe('Mono Debugger (Native Mac)', () => {
  let session: MonoDebugSession;
  
  beforeEach(() => {
    session = new MonoDebugSession();
  });

  it('should connect to Mono runtime', async () => {
    const config = {
      type: 'mono',
      request: 'launch',
      program: '/path/to/test.exe',
      runtime: 'mono', // Uses Mac's Mono
      runtimeArgs: ['--debug', '--debugger-agent=transport=dt_socket,server=y,address=127.0.0.1:55555']
    };
    
    await session.launchRequest(config);
    expect(session.isConnected()).to.be.true;
  });
});
```

## Fixture Files

### Sample Project File
```xml
<!-- test/fixtures/projects/ConsoleApp.csproj -->
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <Import Project="$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props" />
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFrameworkVersion>v4.7.2</TargetFrameworkVersion>
    <AssemblyName>ConsoleApp</AssemblyName>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="System" />
    <Compile Include="Program.cs" />
  </ItemGroup>
  <Import Project="$(MSBuildToolsPath)\Microsoft.CSharp.targets" />
</Project>
```

### Mock vswhere Output
```json
// test/fixtures/outputs/vswhere.json
[
  {
    "instanceId": "12345",
    "installDate": "2024-01-01T00:00:00Z",
    "installationName": "VisualStudio/17.8.0",
    "installationPath": "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise",
    "installationVersion": "17.8.0",
    "displayName": "Visual Studio Enterprise 2022",
    "description": "Microsoft DevOps solution",
    "enginePath": "C:\\Program Files\\Microsoft Visual Studio\\Installer\\resources\\app\\ServiceHub\\Services\\Microsoft.VisualStudio.Setup.Service"
  }
]
```

## Performance Considerations on Mac

### Mock Timing
```typescript
// Simulate realistic Windows tool timing
export class TimingSimulator {
  static async vsDetection(): Promise<void> {
    // vswhere.exe typically takes 200-500ms
    await this.delay(300);
  }
  
  static async msbuildCompile(projectSize: 'small' | 'medium' | 'large'): Promise<void> {
    const delays = { small: 2000, medium: 5000, large: 10000 };
    await this.delay(delays[projectSize]);
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Debugging Extension on Mac

### Launch Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension (Mac)",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "${workspaceFolder}/test/fixtures/projects"
      ],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "npm: watch",
      "env": {
        "VSTOOLS_MOCK_MODE": "true",
        "VSTOOLS_DEBUG": "true"
      }
    }
  ]
}
```

### Environment Variables for Mac Development
```typescript
// src/common/environment.ts
export const isDevelopment = process.env.VSTOOLS_DEBUG === 'true';
export const isMockMode = process.env.VSTOOLS_MOCK_MODE === 'true' || process.platform !== 'win32';
export const logLevel = process.env.VSTOOLS_LOG_LEVEL || 'info';
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run compile
      - run: npm test
      - run: npm run lint

  test-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: microsoft/setup-msbuild@v1
      - run: npm install
      - run: npm run compile
      - run: npm run test:windows

  package:
    needs: [test-mac, test-windows]
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run package
```

This context provides all the practical details needed to develop on Mac while the rules file keeps the principles clear and enforceable.