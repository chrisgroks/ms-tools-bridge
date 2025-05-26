# Claude Prompt - VS Tools Bridge for Roslyn Integration

## Project Context
I'm building "VS Tools Bridge" - a VS Code extension for Windsurf that enables .NET Framework development by bridging to Visual Studio's Roslyn language server. This is version 1, focusing only on making Roslyn work in Windsurf.

## Legal Constraints
I can ONLY use:
- MSBuild.exe from Visual Studio installations (for building)
- vswhere.exe (for detecting VS installations)  
- Roslyn language server binaries from VS installation (for IntelliSense)
- .NET Framework reference assemblies

I CANNOT use:
- vsdbg (Visual Studio debugger) - will use Mono debugger
- Any Microsoft VS Code extensions or marketplace content
- Any proprietary VS components beyond what's listed above

## Version 1 Scope
1. **Find Visual Studio** using vswhere.exe
2. **Configure Roslyn** language server for .NET Framework
3. **Enable MSBuild** for compilation
4. **Integrate Mono debugger** for basic debugging
5. **Clear documentation** about limitations

## Architecture Requirements
The extension must be modular to support future additions:
- Provider pattern for language servers (Roslyn now, OmniSharp later)
- Provider pattern for build systems (MSBuild now, others later)
- Provider pattern for debuggers (Mono now, others later)
- Platform abstraction layer (Windows now, Mac later)

## Development Setup
- Primary development on Windows with VS 2019/2022
- Must support Mac development using mocks
- Test suite must run on both platforms
- CI/CD pipeline for both Windows and Mac

## Specific Implementation Needs

### 1. Roslyn Integration
- Find Roslyn language server in VS installation
- Configure for .NET Framework (not .NET Core)
- Handle multiple VS installations
- Graceful fallback if Roslyn fails

### 2. Modular Provider System
```typescript
interface ILanguageProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  getServerPath(): Promise<string>;
  getServerOptions(): ServerOptions;
  activate(): Promise<void>;
}

// V1: Only Roslyn
class RoslynProvider implements ILanguageProvider { }

// Future: Easy to add
class OmniSharpProvider implements ILanguageProvider { }
```

### 3. Platform Abstraction
```typescript
interface IPlatformService {
  findVisualStudio(): Promise<VSInstallation[]>;
  findMSBuild(vsPath: string): Promise<string>;
  findRoslyn(vsPath: string): Promise<string>;
}

// Real implementation
class WindowsPlatformService implements IPlatformService { }

// For Mac development
class MockPlatformService implements IPlatformService { }
```

### 4. Testing Strategy
- Integration tests with real VS on Windows
- Unit tests with mocks on both platforms
- Mock VS installations for Mac development
- Fixture-based testing for build outputs

## Questions I Need Help With:

1. **Roslyn Configuration**: What are the exact command-line arguments needed to configure Roslyn for .NET Framework projects?

2. **Error Handling**: How should the extension behave if Roslyn crashes? Auto-restart? Fallback to basic features?

3. **Version Selection**: If multiple VS versions are found, what's the best UX for selection? Auto-select newest? Remember user choice?

4. **Mock Structure**: What's the minimal mock data needed to develop/test on Mac while keeping tests realistic?

5. **Documentation**: How explicit should we be about the limitations? Where should this documentation live?

## Code Examples Needed:

1. Complete Roslyn language client configuration for .NET Framework
2. Mock VS installation structure for testing
3. Provider registry system for future extensibility
4. Platform service with proper abstraction
5. Test fixtures for various VS installation scenarios

## Success Criteria:
- Roslyn IntelliSense works in Windsurf for .NET Framework projects
- Extension is easily extensible for OmniSharp support
- Clear documentation about what works and what doesn't
- Tests pass on both Windows and Mac
- No legal compliance issues

Please help me implement this with a focus on modularity and future extensibility.