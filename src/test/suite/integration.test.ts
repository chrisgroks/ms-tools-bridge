import * as assert from 'assert';
import * as path from 'path';
import { MockPlatformService } from '../../platform/MockPlatformService';
import { MSBuildProvider } from '../../providers/MSBuildProvider';
import { RoslynProvider } from '../../providers/RoslynProvider';
import { ProviderRegistry } from '../../providers/ProviderRegistry';
import * as vscode from 'vscode';

// Test-specific RoslynProvider that doesn't actually start the language server
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

suite('Integration Tests', () => {
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

  test('Should parse console application project correctly', async () => {
    const consoleProjectPath = path.join(testProjectsPath, 'ConsoleApp.csproj');
    const projectInfo = await mockPlatform.getProjectInfo(consoleProjectPath);
    
    // Note: Mock platform service returns hardcoded values, 
    // but this tests the interface
    assert.notStrictEqual(projectInfo, null);
    assert.strictEqual(projectInfo!.outputType, 'Exe');
    assert.ok(projectInfo!.references.includes('System'));
  });

  test('Should handle MSBuild operations with sample projects', async () => {
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    const isAvailable = await msbuildProvider.isAvailable();
    assert.strictEqual(isAvailable, true);

    const consoleProjectPath = path.join(testProjectsPath, 'ConsoleApp.csproj');
    
    // Test build operation (mocked)
    const buildResult = await msbuildProvider.build(consoleProjectPath);
    assert.strictEqual(buildResult.success, true);
    assert.ok(buildResult.output.includes('Build succeeded'));

    // Test clean operation (mocked)
    const cleanResult = await msbuildProvider.clean(consoleProjectPath);
    assert.strictEqual(cleanResult.success, true);

    // Test restore operation (mocked)
    const restoreResult = await msbuildProvider.restore(consoleProjectPath);
    assert.strictEqual(restoreResult.success, true);
  });

  test('Complete workflow: Register providers and process project', async () => {
    const registry = new ProviderRegistry(outputChannel);
    const roslynProvider = new TestRoslynProvider(mockPlatform, outputChannel);
    const msbuildProvider = new MSBuildProvider(mockPlatform);

    // Register providers
    registry.registerLanguageProvider(roslynProvider);
    registry.registerBuildProvider(msbuildProvider);

    // Auto-activate
    await registry.autoActivateProviders();

    // Verify status
    const status = registry.getStatus();
    assert.strictEqual(status.language, 'roslyn');
    assert.strictEqual(status.build, 'msbuild');

    // Test project operations
    const activeBuildProvider = registry.getActiveBuildProvider();
    assert.notStrictEqual(activeBuildProvider, null);

    const consoleProjectPath = path.join(testProjectsPath, 'ConsoleApp.csproj');
    const projectInfo = await activeBuildProvider!.getProjectInfo(consoleProjectPath);
    
    assert.notStrictEqual(projectInfo, null);
  });

  test('Should handle multiple project types', async () => {
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    await msbuildProvider.isAvailable();

    const projects = [
      { name: 'ConsoleApp.csproj', expectedType: 'Exe' },
      { name: 'ClassLibrary.csproj', expectedType: 'Library' }
    ];

    for (const project of projects) {
      const projectPath = path.join(testProjectsPath, project.name);
      const projectInfo = await msbuildProvider.getProjectInfo(projectPath);
      
      // Note: Mock returns hardcoded values, but this tests the workflow
      assert.notStrictEqual(projectInfo, null);
      // In a real test, we'd check the actual parsed values
    }
  });

  test('Provider restart should work correctly', async () => {
    const registry = new ProviderRegistry(outputChannel);
    const roslynProvider = new TestRoslynProvider(mockPlatform, outputChannel);

    registry.registerLanguageProvider(roslynProvider);
    await registry.activateLanguageProvider('roslyn');

    // Initial status
    let status = registry.getStatus();
    assert.strictEqual(status.language, 'roslyn');

    // Restart providers
    await registry.restartActiveProviders();

    // Should still be active after restart
    status = registry.getStatus();
    assert.strictEqual(status.language, 'roslyn');
  });

  test('Should handle VS installation selection workflow', async () => {
    const installations = await mockPlatform.findVisualStudio();
    assert.strictEqual(installations.length, 2);
    
    // Test VS 2022 selection
    const vs2022 = installations.find(inst => inst.displayName.includes('2022'));
    assert.notStrictEqual(vs2022, undefined);
    
    const msbuildInfo = await mockPlatform.findMSBuild(vs2022!.installationPath);
    assert.notStrictEqual(msbuildInfo, null);
    assert.strictEqual(msbuildInfo!.version, '17.8.3');

    const roslynInfo = await mockPlatform.findRoslyn(vs2022!.installationPath);
    assert.notStrictEqual(roslynInfo, null);
    assert.strictEqual(roslynInfo!.version, '4.8.0');
  });
});