# VS Tools Bridge - Modular Project Plan (Roslyn Focus)

## Project Overview
Version 1 focuses on making Roslyn work in Windsurf with a modular architecture for future expansion.

## Phase 1: Modular Foundation (Week 1)

### Milestone 1.1: Provider Architecture (2 days)
- [ ] Design provider interfaces
- [ ] Create provider registry system
- [ ] Implement dependency injection
- [ ] Set up platform abstraction

**Core Interfaces:**
```typescript
// Language Provider System
interface ILanguageProvider {
  readonly id: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  activate(context: ExtensionContext): Promise<void>;
  deactivate(): Promise<void>;
}

// Platform Abstraction
interface IPlatformService {
  platform: 'windows' | 'mac' | 'linux';
  findVisualStudio(): Promise<VSInstallation[]>;
  findTool(tool: 'msbuild' | 'roslyn' | 'mono'): Promise<string>;
}

// Provider Registry
interface IProviderRegistry<T> {
  register(provider: T): void;
  getActive(): T | undefined;
  getAll(): T[];
  setActive(id: string): Promise<void>;
}
```

### Milestone 1.2: Testing Infrastructure (2 days)
- [ ] Dual platform test setup
- [ ] Mock system for Mac development
- [ ] Integration test framework
- [ ] CI/CD pipeline

**Test Structure:**
```
test/
├── unit/
│   ├── providers/
│   │   └── roslynProvider.test.ts
│   └── platform/
│       ├── windows.test.ts
│       └── mock.test.ts
├── integration/
│   └── roslyn/
│       └── languageFeatures.test.ts
└── mocks/
    ├── vsInstallations.ts
    ├── roslynResponses.ts
    └── filesystem.ts
```

### Milestone 1.3: Configuration System (1 day)
- [ ] Settings schema
- [ ] Provider preferences
- [ ] Path overrides
- [ ] Diagnostic settings

**Configuration Schema:**
```json
{
  "vsToolsBridge.languageProvider": {
    "type": "string",
    "enum": ["roslyn", "auto"],
    "default": "auto",
    "description": "Language server provider (OmniSharp support coming soon)"
  },
  "vsToolsBridge.visualStudioPath": {
    "type": "string",
    "description": "Override VS installation path"
  },
  "vsToolsBridge.roslyn.arguments": {
    "type": "array",
    "description": "Additional Roslyn server arguments"
  }
}
```

## Phase 2: Platform Services (Week 2)

### Milestone 2.1: Windows Platform Service (2 days)
- [ ] VS detection via vswhere
- [ ] Tool path resolution
- [ ] Version compatibility checks
- [ ] Multi-VS handling

**Implementation:**
```typescript
class WindowsPlatformService implements IPlatformService {
  async findVisualStudio(): Promise<VSInstallation[]> {
    const vswhere = await this.findVSWhere();
    const output = await execFile(vswhere, [
      '-format', 'json',
      '-products', '*',
      '-requires', 'Microsoft.VisualStudio.Component.Roslyn.LanguageServices'
    ]);
    return JSON.parse(output);
  }

  async findRoslyn(vsPath: string): Promise<string> {
    // Check multiple possible locations
    const candidates = [
      'Common7/IDE/CommonExtensions/Microsoft/ManagedLanguages/VBCSharp/LanguageServices',
      'MSBuild/Current/Bin/Roslyn',
      'Common7/IDE/Roslyn'
    ];
    
    for (const candidate of candidates) {
      const roslynPath = path.join(vsPath, candidate);
      if (await this.exists(roslynPath)) {
        return roslynPath;
      }
    }
    throw new Error('Roslyn not found in VS installation');
  }
}
```

### Milestone 2.2: Mock Platform Service (2 days)
- [ ] Mac development support
- [ ] Simulated VS installations
- [ ] Mock file system
- [ ] Test data management

**Mock Implementation:**
```typescript
class MockPlatformService implements IPlatformService {
  private mockData = {
    vsInstallations: [
      {
        installationPath: '/mock/vs/2022',
        displayName: 'Visual Studio 2022',
        version: '17.8.0',
        roslyn: {
          serverPath: '/mock/vs/2022/Roslyn/Microsoft.CodeAnalysis.LanguageServer.dll',
          version: '4.8.0'
        }
      }
    ]
  };

  async findVisualStudio(): Promise<VSInstallation[]> {
    return this.mockData.vsInstallations;
  }
}
```

### Milestone 2.3: Platform Factory (1 day)
- [ ] Auto-detection logic
- [ ] Force mock option
- [ ] Platform-specific features
- [ ] Error handling

## Phase 3: Roslyn Provider Implementation (Week 3)

### Milestone 3.1: Roslyn Provider Core (3 days)
- [ ] Implement ILanguageProvider
- [ ] Server discovery logic
- [ ] Language client setup
- [ ] .NET Framework configuration

**Roslyn Provider:**
```typescript
export class RoslynLanguageProvider implements ILanguageProvider {
  readonly id = 'roslyn';
  readonly displayName = 'Roslyn (Visual Studio)';
  
  private client?: LanguageClient;
  
  async isAvailable(): Promise<boolean> {
    try {
      const vsInstalls = await this.platform.findVisualStudio();
      return vsInstalls.length > 0;
    } catch {
      return false;
    }
  }

  async activate(context: ExtensionContext): Promise<void> {
    const serverPath = await this.findRoslynServer();
    
    const serverOptions: ServerOptions = {
      run: {
        command: 'dotnet',
        args: [
          serverPath,
          '--logLevel', 'Information',
          '--frameworkVersion', 'net472'  // .NET Framework specific
        ]
      }
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'csharp' },
        { scheme: 'file', language: 'vb' }
      ],
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher('**/*.{cs,vb,csproj,vbproj}')
      }
    };

    this.client = new LanguageClient('roslyn', 'Roslyn Language Server', serverOptions, clientOptions);
    await this.client.start();
  }
}
```

### Milestone 3.2: Roslyn Configuration (2 days)
- [ ] .NET Framework specific settings
- [ ] Project system integration
- [ ] Solution loading
- [ ] Performance tuning

### Milestone 3.3: Error Handling (2 days)
- [ ] Server crash recovery
- [ ] Missing VS handling
- [ ] Version incompatibility
- [ ] Diagnostic logging

**Error Recovery:**
```typescript
class RoslynErrorHandler {
  private restartCount = 0;
  private maxRestarts = 3;
  
  async handleServerCrash(): Promise<void> {
    if (this.restartCount < this.maxRestarts) {
      this.restartCount++;
      await this.showRestartNotification();
      await this.provider.restart();
    } else {
      await this.showFailureMessage();
      await this.suggestAlternatives();
    }
  }
}
```

## Phase 4: Build System Integration (Week 4)

### Milestone 4.1: MSBuild Provider (3 days)
- [ ] Task provider implementation
- [ ] Project detection
- [ ] Build configurations
- [ ] Output parsing

### Milestone 4.2: Build Features (2 days)
- [ ] Problem matchers
- [ ] Multi-project builds
- [ ] Clean/rebuild commands
- [ ] Build status UI

## Phase 5: Mono Debugger (Week 5)

### Milestone 5.1: Mono Detection (2 days)
- [ ] Check for Mono installation
- [ ] Installation guidance
- [ ] Version compatibility
- [ ] Platform-specific setup

### Milestone 5.2: Debug Adapter (3 days)
- [ ] Basic DAP implementation
- [ ] Launch configurations
- [ ] Breakpoint support
- [ ] Clear limitation docs

**Documentation Example:**
```markdown
## Debugging Limitations

VS Tools Bridge uses the open-source Mono debugger due to licensing restrictions. 

**What works:**
- Basic breakpoints
- Variable inspection
- Step through code

**What doesn't work:**
- Edit and Continue
- Advanced data visualizers
- Some Windows-specific features

For full debugging capabilities, use Visual Studio directly.
```

## Phase 6: Polish and Release (Week 6)

### Milestone 6.1: User Experience (2 days)
- [ ] First-run experience
- [ ] VS selection UI
- [ ] Status indicators
- [ ] Progress notifications

### Milestone 6.2: Documentation (2 days)
- [ ] Setup guide
- [ ] Limitation documentation
- [ ] Troubleshooting guide
- [ ] Architecture docs for contributors

### Milestone 6.3: Release Prep (2 days)
- [ ] Security audit
- [ ] Performance optimization
- [ ] OpenVSX packaging
- [ ] Demo videos

## Testing Strategy

### Unit Tests (Every Component)
```typescript
describe('RoslynProvider', () => {
  it('should detect when VS is available', async () => {
    const platform = new MockPlatformService();
    const provider = new RoslynLanguageProvider(platform);
    
    expect(await provider.isAvailable()).to.be.true;
  });

  it('should handle missing VS gracefully', async () => {
    const platform = new MockPlatformService({ noVS: true });
    const provider = new RoslynLanguageProvider(platform);
    
    expect(await provider.isAvailable()).to.be.false;
  });
});
```

### Integration Tests (Windows Only)
```typescript
describe('Roslyn Integration (Windows)', () => {
  before(function() {
    if (process.platform !== 'win32') this.skip();
  });

  it('should provide IntelliSense for .NET Framework', async () => {
    const provider = new RoslynLanguageProvider();
    await provider.activate();
    
    const completions = await commands.executeCommand<CompletionList>(
      'vscode.executeCompletionItemProvider',
      testDocument.uri,
      new Position(10, 15)
    );
    
    expect(completions.items).to.have.length.greaterThan(0);
  });
});
```

## Future Extensibility

### Adding OmniSharp (Future)
```typescript
// Just add a new provider
class OmniSharpLanguageProvider implements ILanguageProvider {
  readonly id = 'omnisharp';
  readonly displayName = 'OmniSharp';
  
  // Implementation...
}

// Register it
registry.register(new OmniSharpLanguageProvider());
```

### Adding New Features
- New build systems: Just implement IBuildProvider
- New debuggers: Just implement IDebugProvider
- New platforms: Just implement IPlatformService

## Success Metrics

1. **Roslyn Working**: IntelliSense in Windsurf for .NET Framework
2. **Modular Design**: Easy to add OmniSharp later
3. **Cross-Platform Dev**: Can develop on Mac with mocks
4. **Clear Documentation**: Users understand limitations
5. **Legal Compliance**: No Microsoft licensing violations