import * as assert from 'assert';
import * as vscode from 'vscode';
import { RoslynProvider } from '../../providers/RoslynProvider';
import { MSBuildProvider } from '../../providers/MSBuildProvider';
import { MonoDebugProvider } from '../../providers/MonoDebugProvider';
import { ProviderRegistry } from '../../providers/ProviderRegistry';
import { MockPlatformService } from '../../platform/MockPlatformService';
import { ILanguageProvider } from '../../providers/ILanguageProvider';

// Test-specific RoslynProvider that doesn't actually start the language server
class TestRoslynProvider extends RoslynProvider {
  async activate(): Promise<void> {
    // Mock activation - don't actually start the language server
    return Promise.resolve();
  }

  async deactivate(): Promise<void> {
    // Mock deactivation
    return Promise.resolve();
  }

  async restart(): Promise<void> {
    // Mock restart
    return Promise.resolve();
  }
}

suite('Provider Tests', () => {
  let mockPlatform: MockPlatformService;
  let outputChannel: vscode.OutputChannel;

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

  test('RoslynProvider should be available with mock platform', async () => {
    const provider = new RoslynProvider(mockPlatform, outputChannel);
    const isAvailable = await provider.isAvailable();
    
    assert.strictEqual(isAvailable, true);
    assert.strictEqual(provider.name, 'roslyn');
    assert.strictEqual(provider.displayName, 'Roslyn Language Server');
  });

  test('RoslynProvider should support .NET Framework versions', () => {
    const provider = new RoslynProvider(mockPlatform, outputChannel);
    
    assert.ok(provider.supportedFrameworks.includes('net48'));
    assert.ok(provider.supportedFrameworks.includes('net472'));
    assert.ok(provider.supportedFrameworks.includes('net461'));
  });

  test('MSBuildProvider should be available with mock platform', async () => {
    const provider = new MSBuildProvider(mockPlatform);
    const isAvailable = await provider.isAvailable();
    
    assert.strictEqual(isAvailable, true);
    assert.strictEqual(provider.name, 'msbuild');
    assert.strictEqual(provider.displayName, 'MSBuild');
  });

  test('MSBuildProvider should simulate successful build', async () => {
    const provider = new MSBuildProvider(mockPlatform);
    await provider.isAvailable(); // Initialize
    
    const result = await provider.build('/mock/project/test.csproj');
    
    assert.strictEqual(result.success, true);
    assert.ok(result.output.includes('Build succeeded'));
  });

  test('MonoDebugProvider should be available with mock platform', async () => {
    const provider = new MonoDebugProvider(mockPlatform);
    const isAvailable = await provider.isAvailable();
    
    assert.strictEqual(isAvailable, true);
    assert.strictEqual(provider.name, 'mono');
    assert.strictEqual(provider.displayName, 'Mono Debugger');
  });

  test('MonoDebugProvider should support .NET Framework', () => {
    const provider = new MonoDebugProvider(mockPlatform);
    
    assert.strictEqual(provider.supportsFramework('net48'), true);
    assert.strictEqual(provider.supportsFramework('net461'), true);
    assert.strictEqual(provider.supportsFramework('netcore3.1'), false);
  });

  test('ProviderRegistry should register and activate providers', async () => {
    const registry = new ProviderRegistry(outputChannel);
    const roslynProvider = new TestRoslynProvider(mockPlatform, outputChannel);
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    const monoProvider = new MonoDebugProvider(mockPlatform);

    registry.registerLanguageProvider(roslynProvider);
    registry.registerBuildProvider(msbuildProvider);
    registry.registerDebugProvider(monoProvider);

    const languageProviders = registry.getAvailableLanguageProviders();
    const buildProviders = registry.getAvailableBuildProviders();
    const debugProviders = registry.getAvailableDebugProviders();

    assert.ok(languageProviders.includes('roslyn'));
    assert.ok(buildProviders.includes('msbuild'));
    assert.ok(debugProviders.includes('mono'));

    const activateLanguage = await registry.activateLanguageProvider('roslyn');
    const activateBuild = await registry.activateBuildProvider('msbuild');
    const activateDebug = await registry.activateDebugProvider('mono');

    assert.strictEqual(activateLanguage, true);
    assert.strictEqual(activateBuild, true);
    assert.strictEqual(activateDebug, true);

    const status = registry.getStatus();
    assert.strictEqual(status.language, 'roslyn');
    assert.strictEqual(status.build, 'msbuild');
    assert.strictEqual(status.debug, 'mono');
  });

  test('ProviderRegistry should auto-activate providers', async () => {
    const registry = new ProviderRegistry(outputChannel);
    const roslynProvider = new TestRoslynProvider(mockPlatform, outputChannel);
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    const monoProvider = new MonoDebugProvider(mockPlatform);

    registry.registerLanguageProvider(roslynProvider);
    registry.registerBuildProvider(msbuildProvider);
    registry.registerDebugProvider(monoProvider);

    await registry.autoActivateProviders();

    const status = registry.getStatus();
    assert.strictEqual(status.language, 'roslyn');
    assert.strictEqual(status.build, 'msbuild');
    assert.strictEqual(status.debug, 'mono');
  });
});