import * as assert from 'assert';
import { WindowsPlatformService } from '../../platform/WindowsPlatformService';
import { MockPlatformService } from '../../platform/MockPlatformService';
import { PlatformServiceFactory } from '../../platform/PlatformServiceFactory';

suite('Platform Service Tests', () => {
  test('MockPlatformService should return mock VS installations', async () => {
    const mockService = new MockPlatformService();
    const installations = await mockService.findVisualStudio();
    
    assert.strictEqual(installations.length, 2);
    assert.strictEqual(installations[0].displayName, 'Visual Studio Professional 2022');
    assert.strictEqual(installations[1].displayName, 'Visual Studio Professional 2019');
  });

  test('MockPlatformService should find MSBuild for VS2022', async () => {
    const mockService = new MockPlatformService();
    const msbuildInfo = await mockService.findMSBuild('/mock/vs2022/professional');
    
    assert.notStrictEqual(msbuildInfo, null);
    assert.strictEqual(msbuildInfo!.version, '17.8.3');
    assert.ok(msbuildInfo!.path.includes('MSBuild.exe'));
  });

  test('MockPlatformService should find Roslyn for VS installations', async () => {
    const mockService = new MockPlatformService();
    const roslynInfo = await mockService.findRoslyn('/mock/vs2022/professional');
    
    assert.notStrictEqual(roslynInfo, null);
    assert.strictEqual(roslynInfo!.version, '4.8.0');
    assert.ok(roslynInfo!.supportedFrameworks.includes('net48'));
  });

  test('MockPlatformService should return project info for .csproj files', async () => {
    const mockService = new MockPlatformService();
    const projectInfo = await mockService.getProjectInfo('/mock/project/test.csproj');
    
    assert.notStrictEqual(projectInfo, null);
    assert.strictEqual(projectInfo!.targetFramework, 'net48');
    assert.strictEqual(projectInfo!.outputType, 'Exe');
    assert.ok(projectInfo!.references.includes('System'));
  });

  test('PlatformServiceFactory should return MockPlatformService on non-Windows', () => {
    const service = PlatformServiceFactory.create(true); // Force mock
    assert.ok(service instanceof MockPlatformService);
  });

  test('MockPlatformService should simulate file operations', async () => {
    const mockService = new MockPlatformService();
    
    const existsTrue = await mockService.fileExists('/mock/vs2022/professional/MSBuild/Current/Bin/MSBuild.exe');
    const existsFalse = await mockService.fileExists('/nonexistent/path');
    
    assert.strictEqual(existsTrue, true);
    assert.strictEqual(existsFalse, false);
  });

  test('MockPlatformService should execute mock commands', async () => {
    const mockService = new MockPlatformService();
    
    const result = await mockService.executeCommand('/mock/MSBuild.exe', ['-version']);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.includes('Build Engine'));
  });
});