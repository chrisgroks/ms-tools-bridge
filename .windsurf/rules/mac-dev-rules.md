---
trigger: always_on
description: Working on any code that needs to run cross-platform or when developing on a Mac.
---

# VS Tools Bridge - Mac Development Rules

## Platform-Aware Development Principles

1. **Always Use Platform Detection**
   - Check `process.platform` before accessing Windows-specific features
   - Provide mock implementations for non-Windows platforms
   - Use factory patterns for platform-specific components

2. **Path Handling Rules**
   - Never hardcode Windows path separators (`\`)
   - Use Node.js `path` module for all path operations
   - Create path conversion utilities for testing Windows paths on Mac

3. **Mock-First Development**
   - Create interfaces for all Windows-specific components
   - Implement mocks before real implementations
   - Mocks should simulate realistic behavior and timing

4. **Testing Requirements on Mac**
   - All code MUST have unit tests that run on Mac
   - Integration tests should work with mock data
   - Use fixture files instead of real Windows tools
   - Test both success and failure scenarios

## Code Patterns for Cross-Platform Development

### Platform Detection Pattern
```typescript
export function createComponent(): IComponent {
  return process.platform === 'win32' 
    ? new WindowsComponent() 
    : new MockComponent();
}
```

### Path Handling Pattern
```typescript
import * as path from 'path';

// Good
const projectFile = path.join(workspace, 'project.csproj');

// Bad
const projectFile = workspace + '\\project.csproj';
```

### Mock Implementation Pattern
```typescript
export interface IVSDetector {
  detect(): Promise<IVSInstallation[]>;
}

export class MockVSDetector implements IVSDetector {
  async detect(): Promise<IVSInstallation[]> {
    // Return realistic mock data
    await this.simulateDelay();
    return this.getMockInstallations();
  }
}
```

## Testing Rules

1. **Unit Tests Must Be Platform-Independent**
   - Use mocks for all external dependencies
   - Test logic, not platform-specific implementations
   - Verify error handling with mock failures

2. **Integration Tests Use Fixtures**
   - Create realistic test data in `test/fixtures/`
   - Include both valid and invalid scenarios
   - Document what each fixture represents

3. **Mono Testing on Mac**
   - Mono debugger tests can run natively
   - Test debug protocol implementation
   - Verify breakpoint and variable inspection

## Development Workflow Rules

1. **Commit Rules**
   - All commits must pass Mac tests
   - Windows-specific code must have mock alternatives
   - Tag commits that require Windows testing

2. **PR Requirements**
   - Mac tests must pass
   - Mocks must be updated for new features
   - Document any Windows-only functionality

3. **Debugging During Development**
   - Use VS Code's extension development host
   - Enable source maps for TypeScript debugging
   - Use mock data to simulate Windows scenarios

## Anti-Patterns to Avoid

1. **Don't Skip Mac Testing**
   ```typescript
   // Bad
   if (process.platform !== 'win32') {
     return; // Skip everything
   }
   
   // Good
   const detector = createVSDetector(); // Returns mock on Mac
   const installations = await detector.detect();
   ```

2. **Don't Mix Platform Code**
   ```typescript
   // Bad
   class MixedComponent {
     async doWork() {
       if (process.platform === 'win32') {
         // Windows code
       } else {
         // Mac code
       }
     }
   }
   
   // Good - Separate implementations
   interface IComponent {
     doWork(): Promise<void>;
   }
   
   class WindowsComponent implements IComponent { }
   class MacComponent implements IComponent { }
   ```

3. **Don't Assume File Paths**
   ```typescript
   // Bad
   const vsPath = 'C:\\Program Files\\Microsoft Visual Studio';
   
   // Good
   const vsPath = config.get('vsInstallPath') || await detectVSPath();
   ```

## CI/CD Rules

1. **Multi-Platform Testing**
   - GitHub Actions must test on both Mac and Windows
   - Mac tests run on every commit
   - Windows tests run on PR and main branch

2. **Build Artifacts**
   - Package extension on Mac (it's platform-independent)
   - Test installation on both platforms
   - Verify activation on both platforms

Remember: The goal is to maintain development velocity on Mac while ensuring Windows compatibility. When in doubt, create a mock!