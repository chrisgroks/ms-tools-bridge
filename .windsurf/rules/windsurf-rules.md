---
trigger: always_on
---

Do Not modify the Project-plan.md file. 

# VS Tools Bridge Extension - Core AI Rules

## Project Overview
You are helping build a VS Code extension for Windsurf (a VS Code fork) that bridges to Visual Studio Build Tools for .NET Framework development. Since Microsoft blocks marketplace access for forks, we need to create our own tooling that legally uses existing VS installations.

## Core Principles

1. **Legal Compliance First**
   - NEVER redistribute Microsoft binaries
   - NEVER use vsdbg directly in our extension
   - ALWAYS respect VS EULA boundaries
   - Use only tools already installed on the user's machine

2. **Code Quality Standards**
   - TypeScript strict mode enabled
   - Comprehensive error handling for all external tool calls
   - Async/await patterns for all I/O operations
   - Proper disposal of processes and resources

3. **Extension Architecture**
   - Follow VS Code Extension API best practices
   - Use dependency injection for testability
   - Separate concerns: detection, building, debugging, language services
   - Configuration-driven behavior

## Technical Constraints

### What We CAN Use
- `vswhere.exe` to detect VS installations
- MSBuild.exe from detected VS installations
- Roslyn Language Server from VS installations
- Mono Soft Debugger (open source)
- VS Code Extension APIs
- NuGet packages with MIT licenses

### What We CANNOT Use
- vsdbg (Microsoft's debugger)
- Any Microsoft marketplace extensions
- Proprietary Microsoft SDKs for redistribution
- OmniSharp (we use Roslyn LSP instead)

## Module Responsibilities

### 1. VS Detection Module
- Find VS installations using vswhere.exe
- Parse and validate installation data
- Cache results for performance
- Provide manual override via settings

### 2. Build System Integration
- Use VS Code Task Provider API
- Generate tasks based on discovered projects
- Pass proper reference assemblies to MSBuild
- Parse MSBuild output for problems

### 3. Debugging Strategy
- Primary: Mono Soft Debugger for console/service apps
- Fallback: VS Hand-off for WinForms/WPF
- Never attempt to use vsdbg directly

### 4. Language Services
- Create Language Server client
- Point to Roslyn binaries in VS installation
- Handle process lifecycle properly
- Implement restart on failure

## Common Pitfalls to Avoid

1. **Don't assume VS is installed** - Always check first
2. **Don't hardcode paths** - VS can be anywhere
3. **Don't ignore MSBuild warnings** - They often indicate real issues
4. **Don't block the UI thread** - Everything async
5. **Don't leak processes** - Always cleanup
6. **Don't trust file extensions** - Verify project types properly

## Questions to Ask Before Implementation

1. Is this feature legally compliant with VS EULA?
2. Will this work without internet access?
3. Have we handled the "VS not installed" case?
4. Is the error message helpful to users?
5. Can this be tested automatically?
6. Will this work with all VS editions (Community/Pro/Enterprise)?

## Testing Requirements

### Unit Tests
- Mock all external tool calls
- Test error scenarios
- Verify configuration handling
- Test path resolution logic

### Integration Tests
- Use test fixtures for .NET Framework projects
- Mock VS installation detection
- Test build task generation
- Verify debug configuration creation

### Manual Test Scenarios
1. No VS installed → Graceful failure with helpful message
2. Multiple VS versions → User can select
3. Build errors → Proper problem matching
4. Debug console app → Mono debugger works
5. Debug WinForms → VS hand-off works

Remember: The goal is to provide a seamless .NET Framework development experience in Windsurf while respecting all legal boundaries. When in doubt, fail gracefully with helpful guidance.