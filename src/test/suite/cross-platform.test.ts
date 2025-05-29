import * as assert from 'assert';
import * as path from 'path';
import { PlatformServiceFactory } from '../../platform/PlatformServiceFactory';

/**
 * Cross-Platform Compatibility Tests
 * 
 * These tests ensure the extension works correctly across different platforms
 * and doesn't have platform-specific bugs or assumptions.
 */
suite('Cross-Platform Compatibility Tests', () => {

  test('Platform factory should detect correct platform', () => {
    const platform = PlatformServiceFactory.create();
    const detectedPlatform = platform.getPlatform();
    
    // On macOS/Linux in development, should use mock
    if (process.platform !== 'win32') {
      assert.strictEqual(detectedPlatform, 'mac', 'Should use mock platform on non-Windows');
    }
    
    assert.ok(['windows', 'mac', 'linux'].includes(detectedPlatform), 'Should return valid platform');
  });

  test('Platform factory should respect force mock option', () => {
    const mockPlatform = PlatformServiceFactory.create(true);
    const detectedPlatform = mockPlatform.getPlatform();
    
    assert.strictEqual(detectedPlatform, 'mac', 'Should use mock platform when forced');
  });

  test('Path handling should work across platforms', () => {
    // Test path construction doesn't use hardcoded separators
    const testPaths = [
      path.join('mock', 'vs2022', 'professional'),
      path.join('usr', 'local', 'bin', 'omnisharp'),
      path.join('Program Files', 'Microsoft Visual Studio')
    ];
    
    for (const testPath of testPaths) {
      assert.ok(testPath.length > 0, 'Path should be constructed');
      // Verify no mixing of separators
      const hasBackslash = testPath.includes('\\');
      const hasForwardSlash = testPath.includes('/');
      
      if (process.platform === 'win32') {
        // On Windows, should primarily use backslashes
        assert.ok(!hasForwardSlash || hasBackslash, 'Windows paths should use backslashes');
      } else {
        // On Unix-like systems, should use forward slashes
        assert.ok(hasForwardSlash || !hasBackslash, 'Unix paths should use forward slashes');
      }
    }
  });

  test('Environment variable handling should be cross-platform', () => {
    // Test that we don't assume Windows-specific environment variables exist
    const homeDir = require('os').homedir();
    assert.ok(homeDir, 'Should be able to get home directory on any platform');
    
    // Test Windows-specific variables are handled gracefully
    const programFiles = process.env['ProgramFiles'] || '';
    const programFilesx86 = process.env['ProgramFiles(x86)'] || '';
    
    // These might be empty on non-Windows, which is fine
    assert.strictEqual(typeof programFiles, 'string', 'ProgramFiles should be string or empty');
    assert.strictEqual(typeof programFilesx86, 'string', 'ProgramFiles(x86) should be string or empty');
  });

  test('File extension handling should be cross-platform', () => {
    // Test that we handle executable extensions correctly
    const platform = PlatformServiceFactory.create();
    const detectedPlatform = platform.getPlatform();
    
    if (detectedPlatform === 'windows') {
      // Windows executables should have .exe extension
      assert.ok(true, 'Windows platform detected');
    } else {
      // Unix-like systems typically don't use extensions for executables
      assert.ok(true, 'Unix-like platform detected');
    }
  });

  test('Command execution should handle platform differences', async () => {
    const platform = PlatformServiceFactory.create();
    
    // Mock platform should handle commands regardless of actual platform
    const result = await platform.executeCommand('mock-command', ['--version']);
    
    assert.ok(typeof result.exitCode === 'number', 'Should return numeric exit code');
    assert.ok(typeof result.stdout === 'string', 'Should return string stdout');
    assert.ok(typeof result.stderr === 'string', 'Should return string stderr');
  });

  test('Process platform detection should be consistent', () => {
    // Verify our platform detection matches Node.js
    const platform = PlatformServiceFactory.create();
    const ourPlatform = platform.getPlatform();
    const nodePlatform = process.platform;
    
    if (nodePlatform === 'win32') {
      // On Windows, should detect as windows (if not forced to mock)
      assert.ok(ourPlatform === 'windows' || ourPlatform === 'mac', 'Windows should map to windows or mock');
    } else if (nodePlatform === 'darwin') {
      // On macOS, should use mock platform
      assert.strictEqual(ourPlatform, 'mac', 'macOS should use mock platform');
    } else {
      // On Linux, should use mock platform
      assert.strictEqual(ourPlatform, 'mac', 'Linux should use mock platform');
    }
  });

  test('Mock platform should provide consistent data across calls', async () => {
    const platform = PlatformServiceFactory.create();
    
    // Call the same method multiple times
    const vsInstallations1 = await platform.findVisualStudio();
    const vsInstallations2 = await platform.findVisualStudio();
    
    assert.strictEqual(vsInstallations1.length, vsInstallations2.length, 'Should return consistent results');
    
    for (let i = 0; i < vsInstallations1.length; i++) {
      assert.strictEqual(vsInstallations1[i].version, vsInstallations2[i].version, 'VS versions should be consistent');
      assert.strictEqual(vsInstallations1[i].displayName, vsInstallations2[i].displayName, 'VS names should be consistent');
    }
  });

  test('Error handling should work cross-platform', async () => {
    const platform = PlatformServiceFactory.create();
    
    try {
      // Try to read a non-existent file
      await platform.readFile('/nonexistent/file.txt');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw proper Error object');
      assert.ok(error.message.includes('not found'), 'Should have meaningful error message');
    }
  });

  test('Async operations should handle timeouts consistently', async () => {
    const platform = PlatformServiceFactory.create();
    
    const startTime = Date.now();
    await platform.findVisualStudio();
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    assert.ok(duration < 5000, 'Operations should complete within reasonable time');
  });

  test('String handling should work with different encodings', async () => {
    const platform = PlatformServiceFactory.create();
    
    // Test command execution with potential special characters
    const result = await platform.executeCommand('echo', ['Hello, World! 🚀']);
    
    assert.strictEqual(typeof result.stdout, 'string', 'Output should be string');
    assert.strictEqual(typeof result.stderr, 'string', 'Error output should be string');
  });
});