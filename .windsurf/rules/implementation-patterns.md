---
trigger: always_on
---

# VS Tools Bridge Extension - Implementation Patterns

## Code Patterns to Follow

### Error Handling Pattern
```typescript
try {
  const result = await executeExternalTool(command);
  return parseResult(result);
} catch (error) {
  logger.error(`Failed to execute ${command}:`, error);
  vscode.window.showErrorMessage(
    `Operation failed: ${error.message}`,
    'View Logs'
  ).then(selection => {
    if (selection === 'View Logs') {
      logger.show();
    }
  });
  return undefined;
}
```

### Configuration Pattern
```typescript
// Always provide sensible defaults
// Allow user overrides via settings
// Validate paths before use
const config = vscode.workspace.getConfiguration('vsToolsBridge');
const vsPath = config.get<string>('visualStudioPath') || 
              await detectVisualStudio();
```

### Process Management Pattern
```typescript
// Always track child processes
// Implement proper cleanup
// Handle stdout/stderr properly
const processes = new Map<string, ChildProcess>();

function spawnProcess(command: string, args: string[]): ChildProcess {
  const proc = spawn(command, args);
  processes.set(proc.pid.toString(), proc);
  
  proc.on('exit', () => {
    processes.delete(proc.pid.toString());
  });
  
  return proc;
}

// In deactivate()
function cleanup() {
  processes.forEach(proc => proc.kill());
}
```

## TypeScript Interfaces

### VS Detection
```typescript
interface IVSInstallation {
  installationPath: string;
  displayName: string;
  version: string;
  msbuildPath: string;
  roslynPath: string;
}

interface IVSDetector {
  detect(): Promise<IVSInstallation[]>;
  selectInstallation(installations: IVSInstallation[]): Promise<IVSInstallation>;
}
```

### Build System
```typescript
interface IBuildTask {
  projectPath: string;
  configuration: 'Debug' | 'Release';
  platform: 'AnyCPU' | 'x86' | 'x64';
}

interface IBuildResult {
  success: boolean;
  outputPath?: string;
  errors: IBuildError[];
  warnings: IBuildWarning[];
}
```

### Debugging
```typescript
// Mono Debugger Configuration
interface IMonoDebugConfiguration {
  type: 'mono';
  request: 'launch';
  program: string;
  cwd: string;
  env?: Record<string, string>;
}

// VS Hand-off Configuration
interface IVSHandoffConfiguration {
  type: 'vs-handoff';
  solutionPath: string;
  filePath?: string;
  line?: number;
}
```

## Performance Patterns

### Lazy Loading
```typescript
private _vsInstallations: IVSInstallation[] | undefined;

async getVSInstallations(): Promise<IVSInstallation[]> {
  if (!this._vsInstallations) {
    this._vsInstallations = await this.detectVS();
  }
  return this._vsInstallations;
}
```

### Resource Management
```typescript
class LanguageServerManager {
  private server: ChildProcess | undefined;
  private restartCount = 0;
  private readonly MAX_RESTARTS = 3;

  async start(): Promise<void> {
    if (this.server) return;
    
    this.server = await this.spawnServer();
    this.server.on('exit', () => this.handleExit());
  }

  private async handleExit(): Promise<void> {
    if (this.restartCount < this.MAX_RESTARTS) {
      this.restartCount++;
      await this.start();
    } else {
      vscode.window.showErrorMessage(
        'Language server crashed too many times'
      );
    }
  }
}
```

## Security Patterns

### Path Validation
```typescript
function validatePath(path: string): boolean {
  // Sanitize path
  const normalized = path.normalize(path);
  
  // Check for path traversal
  if (normalized.includes('..')) {
    return false;
  }
  
  // Verify file exists
  try {
    fs.accessSync(normalized, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
```

### Safe Process Execution
```typescript
// Never use shell execution
// Always use array arguments
function safeBuild(projectPath: string): Promise<string> {
  const args = [
    projectPath,
    '/p:Configuration=Release',
    '/p:Platform=AnyCPU',
    '/v:minimal'
  ];
  
  // NOT: `${msbuild} ${projectPath} /p:Configuration=Release`
  return execFile(msbuildPath, args);
}
```

## Extension Manifest Configuration

```json
{
  "name": "vs-tools-bridge",
  "displayName": "VS Tools Bridge for .NET Framework",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Programming Languages", "Debuggers"],
  "keywords": ["dotnet", "framework", "csharp", "msbuild"],
  "activationEvents": [
    "workspaceContains:**/*.csproj",
    "workspaceContains:**/*.sln",
    "onCommand:vsToolsBridge.detectVS"
  ],
  "contributes": {
    "configuration": {
      "title": "VS Tools Bridge",
      "properties": {
        "vsToolsBridge.visualStudioPath": {
          "type": "string",
          "description": "Path to Visual Studio installation"
        },
        "vsToolsBridge.enableDiagnostics": {
          "type": "boolean",
          "default": false,
          "description": "Enable diagnostic logging"
        }
      }
    },
    "taskDefinitions": [
      {
        "type": "msbuild",
        "required": ["project"],
        "properties": {
          "project": {
            "type": "string",
            "description": "The project file to build"
          }
        }
      }
    ]
  }
}
```

## Git Workflow

1. Feature branches: `feature/mono-debugger`
2. Commit format: `feat: add breakpoint support`
3. PR checklist:
   - [ ] Tests pass
   - [ ] No hardcoded paths
   - [ ] Error handling complete
   - [ ] Documentation updated

## Documentation Standards

### Code Comments
```typescript
/**
 * Detects Visual Studio installations using vswhere.exe
 * @returns Array of installations, empty if none found
 * @throws Never - returns empty array on error
 */
async function detectVisualStudio(): Promise<IVSInstallation[]> {
  // Implementation
}
```

### User-Facing Messages
```typescript
// Good
"Visual Studio not found. Please install Visual Studio 2019 or later with .NET Framework support."

// Bad
"Error: vswhere returned exit code 1"
```