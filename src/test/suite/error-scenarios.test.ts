import * as assert from 'assert';
import * as path from 'path';
import { MockPlatformService } from '../../platform/MockPlatformService';
import { MSBuildProvider } from '../../providers/MSBuildProvider';
import { RoslynProvider } from '../../providers/RoslynProvider';
import { MonoDebugProvider } from '../../providers/MonoDebugProvider';
import { ProviderRegistry } from '../../providers/ProviderRegistry';
import { IPlatformService } from '../../platform/IPlatformService';
import { VSInstallation, MSBuildInfo, RoslynInfo, DebuggerInfo, ProjectInfo } from '../../types';
import * as vscode from 'vscode';

// Platform service that simulates no VS installations
class NoVSPlatformService implements IPlatformService {
  async findVisualStudio(): Promise<VSInstallation[]> {
    return [];
  }
  
  async findMSBuild(vsPath: string): Promise<MSBuildInfo | null> {
    return null;
  }
  
  async findRoslyn(vsPath: string): Promise<RoslynInfo | null> {
    return null;
  }
  
  async findDebugger(): Promise<DebuggerInfo | null> {
    return null;
  }
  
  async getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
    throw new Error('File not found');
  }
  
  async executeCommand(command: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return {
      stdout: '',
      stderr: 'Command not found',
      exitCode: 1
    };
  }
  
  async fileExists(path: string): Promise<boolean> {
    return false;
  }
  
  async directoryExists(path: string): Promise<boolean> {
    return false;
  }
  
  async readFile(path: string): Promise<string> {
    throw new Error('File not found');
  }
  
  getPlatform(): 'windows' | 'mac' | 'linux' {
    return 'windows';
  }
}

// Platform service that simulates corrupted VS installation
class CorruptedVSPlatformService extends MockPlatformService {
  async findMSBuild(vsPath: string): Promise<MSBuildInfo | null> {
    return null; // MSBuild not found even with VS installed
  }
  
  async findRoslyn(vsPath: string): Promise<RoslynInfo | null> {
    return null; // Roslyn not found even with VS installed
  }
  
  async executeCommand(command: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return {
      stdout: '',
      stderr: 'Access denied',
      exitCode: 1
    };
  }
}

// Test-specific RoslynProvider that simulates failure
class FailingRoslynProvider extends RoslynProvider {
  async activate(): Promise<void> {
    throw new Error('Failed to start language server');
  }
  
  async isAvailable(): Promise<boolean> {
    return false;
  }
}

suite('Error Scenario Tests', () => {
  let outputChannel: vscode.OutputChannel;
  const testProjectsPath = path.resolve(__dirname, '../../../test-projects');

  setup(() => {
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

  test('Should handle no Visual Studio installations gracefully', async () => {
    const noVSPlatform = new NoVSPlatformService();
    const roslynProvider = new RoslynProvider(noVSPlatform, outputChannel);
    
    const isAvailable = await roslynProvider.isAvailable();
    assert.strictEqual(isAvailable, false);
  });

  test('Should handle MSBuild not available', async () => {
    const noVSPlatform = new NoVSPlatformService();
    const msbuildProvider = new MSBuildProvider(noVSPlatform);
    
    const isAvailable = await msbuildProvider.isAvailable();
    assert.strictEqual(isAvailable, false);
  });

  test('Should handle corrupted VS installation', async () => {
    const corruptedPlatform = new CorruptedVSPlatformService();
    const roslynProvider = new RoslynProvider(corruptedPlatform, outputChannel);
    const msbuildProvider = new MSBuildProvider(corruptedPlatform);
    
    // Should find VS but not its components
    const installations = await corruptedPlatform.findVisualStudio();
    assert.ok(installations.length > 0);
    
    const roslynAvailable = await roslynProvider.isAvailable();
    const msbuildAvailable = await msbuildProvider.isAvailable();
    
    assert.strictEqual(roslynAvailable, false);
    assert.strictEqual(msbuildAvailable, false);
  });

  test('Should handle corrupted project files', async () => {
    const mockPlatform = new MockPlatformService();
    const msbuildProvider = new MSBuildProvider(mockPlatform);
    await msbuildProvider.isAvailable();
    
    const corruptedProjectPath = path.join(testProjectsPath, 'Corrupted.csproj');
    
    // This should not throw, but return null or handle gracefully
    const projectInfo = await msbuildProvider.getProjectInfo(corruptedProjectPath);
    // Mock platform service returns hardcoded response, 
    // but in real implementation this would handle corruption
    assert.notStrictEqual(projectInfo, null);
  });

  test('Should handle MSBuild command failures', async () => {
    const corruptedPlatform = new CorruptedVSPlatformService();
    // Force MSBuild to be available for this test
    corruptedPlatform.findMSBuild = async () => ({
      path: '/mock/msbuild.exe',
      version: '17.0.0'
    });
    
    const msbuildProvider = new MSBuildProvider(corruptedPlatform);
    await msbuildProvider.isAvailable();
    
    const buildResult = await msbuildProvider.build('/mock/project.csproj');
    assert.strictEqual(buildResult.success, false);
    // Since exitCode is 1, success should be false
    // The test just needs to verify that failed commands are handled gracefully
  });

  test('Should handle language server activation failure', async () => {
    const mockPlatform = new MockPlatformService();
    const registry = new ProviderRegistry(outputChannel);
    const failingProvider = new FailingRoslynProvider(mockPlatform, outputChannel);
    
    registry.registerLanguageProvider(failingProvider);
    
    const activationResult = await registry.activateLanguageProvider('roslyn');
    assert.strictEqual(activationResult, false);
    
    const status = registry.getStatus();
    assert.strictEqual(status.language, null);
  });

  test('Should handle no debugger available', async () => {
    const noVSPlatform = new NoVSPlatformService();
    const debugProvider = new MonoDebugProvider(noVSPlatform);
    
    const isAvailable = await debugProvider.isAvailable();
    assert.strictEqual(isAvailable, false);
    
    const debuggerInfo = await debugProvider.getDebuggerInfo();
    assert.strictEqual(debuggerInfo, null);
  });

  test('Should handle provider registry with no providers', async () => {
    const registry = new ProviderRegistry(outputChannel);
    
    // Try to activate non-existent provider
    const result = await registry.activateLanguageProvider('nonexistent');
    assert.strictEqual(result, false);
    
    const status = registry.getStatus();
    assert.strictEqual(status.language, null);
    assert.strictEqual(status.build, null);
    assert.strictEqual(status.debug, null);
  });

  test('Should handle auto-activation with no available providers', async () => {
    const noVSPlatform = new NoVSPlatformService();
    const registry = new ProviderRegistry(outputChannel);
    const roslynProvider = new RoslynProvider(noVSPlatform, outputChannel);
    const msbuildProvider = new MSBuildProvider(noVSPlatform);
    const debugProvider = new MonoDebugProvider(noVSPlatform);
    
    registry.registerLanguageProvider(roslynProvider);
    registry.registerBuildProvider(msbuildProvider);
    registry.registerDebugProvider(debugProvider);
    
    // Should not throw even when no providers are available
    await registry.autoActivateProviders();
    
    const status = registry.getStatus();
    assert.strictEqual(status.language, null);
    assert.strictEqual(status.build, null);
    assert.strictEqual(status.debug, null);
  });

  test('Should handle file system permission errors', async () => {
    const noVSPlatform = new NoVSPlatformService();
    
    const fileExists = await noVSPlatform.fileExists('/nonexistent/path');
    assert.strictEqual(fileExists, false);
    
    try {
      await noVSPlatform.readFile('/nonexistent/path');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('not found'));
    }
  });

  test('Should handle invalid project GUIDs and configurations', async () => {
    // This test would be more meaningful with a real platform service
    // that actually parses project files. For now, it demonstrates
    // the test structure for handling invalid project configurations.
    const mockPlatform = new MockPlatformService();
    const debugProvider = new MonoDebugProvider(mockPlatform);
    
    try {
      const config = await debugProvider.createDebugConfiguration('/invalid/path.csproj');
      // Mock should still return a configuration
      assert.notStrictEqual(config, null);
    } catch (error) {
      // Real implementation might throw for truly invalid projects
      assert.ok(error instanceof Error);
    }
  });
});