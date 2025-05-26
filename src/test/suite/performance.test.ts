import * as assert from 'assert';
import * as path from 'path';
import { MockPlatformService } from '../../platform/MockPlatformService';
import { MSBuildProvider } from '../../providers/MSBuildProvider';
import { RoslynProvider } from '../../providers/RoslynProvider';
import { MonoDebugProvider } from '../../providers/MonoDebugProvider';
import { ProviderRegistry } from '../../providers/ProviderRegistry';
import * as vscode from 'vscode';

// Test-specific RoslynProvider for performance tests
class TestRoslynProvider extends RoslynProvider {
  async activate(): Promise<void> {
    return Promise.resolve();
  }
  async deactivate(): Promise<void> {
    return Promise.resolve();
  }
  async restart(): Promise<void> {
    return Promise.resolve();
  }
}

// Helper function to measure execution time
function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    resolve({ result, duration: end - start });
  });
}

suite('Performance Tests', () => {
  let mockPlatform: MockPlatformService;
  let outputChannel: vscode.OutputChannel;
  const testProjectsPath = path.resolve(__dirname, '../../../test-projects');

  setup(() => {
    mockPlatform = new MockPlatformService();
    outputChannel = {
      name: 'Test',
      append: () => {},
      appendLine: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
      replace: () => {}
    } as vscode.OutputChannel;
  });

  test('VS discovery should complete within reasonable time', async () => {
    const { result: installations, duration } = await measureTime(() => 
      mockPlatform.findVisualStudio()
    );
    
    assert.ok(installations.length > 0);
    assert.ok(duration < 1000, `VS discovery took ${duration}ms, expected < 1000ms`);
  });

  test('MSBuild detection should be fast', async () => {
    const installations = await mockPlatform.findVisualStudio();
    const vsPath = installations[0].installationPath;
    
    const { result: msbuildInfo, duration } = await measureTime(() => 
      mockPlatform.findMSBuild(vsPath)
    );
    
    assert.notStrictEqual(msbuildInfo, null);
    assert.ok(duration < 500, `MSBuild detection took ${duration}ms, expected < 500ms`);
  });

  test('Roslyn detection should be fast', async () => {
    const installations = await mockPlatform.findVisualStudio();
    const vsPath = installations[0].installationPath;
    
    const { result: roslynInfo, duration } = await measureTime(() => 
      mockPlatform.findRoslyn(vsPath)
    );
    
    assert.notStrictEqual(roslynInfo, null);
    assert.ok(duration < 500, `Roslyn detection took ${duration}ms, expected < 500ms`);
  });

  test('Provider availability check should be fast', async () => {
    const roslynProvider = new TestRoslynProvider(mockPlatform, outputChannel);
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    const debugProvider = new MonoDebugProvider(mockPlatform);
    
    const { result: roslynAvailable, duration: roslynDuration } = await measureTime(() => 
      roslynProvider.isAvailable()
    );
    
    const { result: msbuildAvailable, duration: msbuildDuration } = await measureTime(() => 
      msbuildProvider.isAvailable()
    );
    
    const { result: debugAvailable, duration: debugDuration } = await measureTime(() => 
      debugProvider.isAvailable()
    );
    
    assert.strictEqual(roslynAvailable, true);
    assert.strictEqual(msbuildAvailable, true);
    assert.strictEqual(debugAvailable, true);
    
    assert.ok(roslynDuration < 1000, `Roslyn availability check took ${roslynDuration}ms, expected < 1000ms`);
    assert.ok(msbuildDuration < 1000, `MSBuild availability check took ${msbuildDuration}ms, expected < 1000ms`);
    assert.ok(debugDuration < 500, `Debug availability check took ${debugDuration}ms, expected < 500ms`);
  });

  test('Provider registry auto-activation should be efficient', async () => {
    const registry = new ProviderRegistry(outputChannel);
    const roslynProvider = new TestRoslynProvider(mockPlatform, outputChannel);
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    const debugProvider = new MonoDebugProvider(mockPlatform);
    
    registry.registerLanguageProvider(roslynProvider);
    registry.registerBuildProvider(msbuildProvider);
    registry.registerDebugProvider(debugProvider);
    
    const { duration } = await measureTime(() => 
      registry.autoActivateProviders()
    );
    
    assert.ok(duration < 2000, `Auto-activation took ${duration}ms, expected < 2000ms`);
    
    const status = registry.getStatus();
    assert.strictEqual(status.language, 'roslyn');
    assert.strictEqual(status.build, 'msbuild');
    assert.strictEqual(status.debug, 'mono');
  });

  test('Project parsing should be fast', async () => {
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    await msbuildProvider.isAvailable();
    
    const projectPath = path.join(testProjectsPath, 'ConsoleApp.csproj');
    
    const { result: projectInfo, duration } = await measureTime(() => 
      msbuildProvider.getProjectInfo(projectPath)
    );
    
    assert.notStrictEqual(projectInfo, null);
    assert.ok(duration < 200, `Project parsing took ${duration}ms, expected < 200ms`);
  });

  test('Multiple concurrent operations should not block', async () => {
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    await msbuildProvider.isAvailable();
    
    const projectPath = path.join(testProjectsPath, 'ConsoleApp.csproj');
    
    // Start multiple operations concurrently
    const operations = [
      msbuildProvider.getProjectInfo(projectPath),
      msbuildProvider.build(projectPath),
      msbuildProvider.clean(projectPath),
      msbuildProvider.restore(projectPath)
    ];
    
    const { duration } = await measureTime(() => 
      Promise.all(operations)
    );
    
    // Should complete in reasonable time even with multiple operations
    assert.ok(duration < 3000, `Concurrent operations took ${duration}ms, expected < 3000ms`);
  });

  test('Provider restart should be quick', async () => {
    const registry = new ProviderRegistry(outputChannel);
    const roslynProvider = new TestRoslynProvider(mockPlatform, outputChannel);
    
    registry.registerLanguageProvider(roslynProvider);
    await registry.activateLanguageProvider('roslyn');
    
    const { duration } = await measureTime(() => 
      registry.restartActiveProviders()
    );
    
    assert.ok(duration < 1000, `Provider restart took ${duration}ms, expected < 1000ms`);
    
    const status = registry.getStatus();
    assert.strictEqual(status.language, 'roslyn');
  });

  test('File system operations should be efficient', async () => {
    const testFiles = [
      '/mock/vs2022/professional/MSBuild/Current/Bin/MSBuild.exe',
      '/mock/vs2019/professional/MSBuild/16.0/Bin/MSBuild.exe',
      '/nonexistent/file.exe'
    ];
    
    for (const filePath of testFiles) {
      const { duration } = await measureTime(() => 
        mockPlatform.fileExists(filePath)
      );
      
      assert.ok(duration < 100, `File existence check for ${filePath} took ${duration}ms, expected < 100ms`);
    }
  });

  test('Command execution should have reasonable timeout', async () => {
    const { result, duration } = await measureTime(() => 
      mockPlatform.executeCommand('/mock/MSBuild.exe', ['-version'])
    );
    
    assert.strictEqual(result.exitCode, 0);
    assert.ok(duration < 1000, `Command execution took ${duration}ms, expected < 1000ms`);
  });

  test('Memory usage should be reasonable during operations', () => {
    const beforeMemory = process.memoryUsage();
    
    // Perform multiple operations that might consume memory
    const registry = new ProviderRegistry(outputChannel);
    const providers = [];
    
    for (let i = 0; i < 10; i++) {
      providers.push(new TestRoslynProvider(mockPlatform, outputChannel));
      providers.push(new MSBuildProvider(mockPlatform));
      providers.push(new MonoDebugProvider(mockPlatform));
    }
    
    const afterMemory = process.memoryUsage();
    const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
    
    // Memory increase should be reasonable (less than 50MB for test objects)
    assert.ok(memoryIncrease < 50 * 1024 * 1024, 
      `Memory increase was ${memoryIncrease / (1024 * 1024)}MB, expected < 50MB`);
  });
});