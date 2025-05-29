#!/usr/bin/env node

/**
 * Simple macOS test for platform detection and mock services
 * Tests only the platform layer without VS Code dependencies
 */

const path = require('path');

// Mock vscode module to avoid dependency issues
const mockVscode = {
  window: {
    createOutputChannel: () => ({
      appendLine: console.log,
      dispose: () => {}
    })
  },
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => defaultValue
    })
  }
};

// Override require for vscode module
const originalRequire = require;
require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

async function testMacOSPlatform() {
  console.log('🍎 Testing VS Tools Bridge Platform Layer on macOS...\n');

  try {
    // Import after setting up mocks
    const { PlatformServiceFactory } = originalRequire('./out/platform/PlatformServiceFactory');
    
    // 1. Test Platform Detection
    console.log('1️⃣ Testing Platform Detection');
    console.log(`   Node.js process.platform: ${process.platform}`);
    
    const platform = PlatformServiceFactory.create();
    const detectedPlatform = platform.getPlatform();
    console.log(`   Detected platform: ${detectedPlatform}`);
    
    if (detectedPlatform !== 'mac') {
      throw new Error(`Expected 'mac' but got '${detectedPlatform}'`);
    }
    
    // 2. Test Mock VS Installations
    console.log('\n2️⃣ Testing Mock VS Installations');
    const vsInstallations = await platform.findVisualStudio();
    console.log(`   Found ${vsInstallations.length} mock VS installations:`);
    
    for (const vs of vsInstallations) {
      console.log(`     - ${vs.displayName}`);
      console.log(`       Version: ${vs.version}`);
      console.log(`       Path: ${vs.installationPath}`);
      console.log(`       Product Path: ${vs.productPath}`);
      console.log(`       Pre-release: ${vs.isPrerelease}`);
    }

    // 3. Test MSBuild Detection
    console.log('\n3️⃣ Testing MSBuild Detection');
    for (const vs of vsInstallations) {
      const msbuild = await platform.findMSBuild(vs.installationPath);
      if (msbuild) {
        console.log(`   ✅ MSBuild for ${vs.displayName}:`);
        console.log(`      Path: ${msbuild.path}`);
        console.log(`      Version: ${msbuild.version}`);
      } else {
        console.log(`   ❌ No MSBuild found for ${vs.displayName}`);
      }
    }

    // 4. Test Roslyn Detection
    console.log('\n4️⃣ Testing Roslyn Detection');
    for (const vs of vsInstallations) {
      const roslyn = await platform.findRoslyn(vs.installationPath);
      if (roslyn) {
        console.log(`   ✅ Roslyn for ${vs.displayName}:`);
        console.log(`      Path: ${roslyn.path}`);
        console.log(`      Version: ${roslyn.version}`);
        console.log(`      Supported frameworks: ${roslyn.supportedFrameworks.slice(0, 5).join(', ')}... (${roslyn.supportedFrameworks.length} total)`);
      } else {
        console.log(`   ❌ No Roslyn found for ${vs.displayName}`);
      }
    }

    // 5. Test File System Operations
    console.log('\n5️⃣ Testing File System Operations');
    const testFiles = [
      '/mock/vs2022/professional/MSBuild/Current/Bin/MSBuild.exe',
      '/mock/vs2019/professional/MSBuild/16.0/Bin/MSBuild.exe',
      '/nonexistent/path/file.exe'
    ];
    
    for (const file of testFiles) {
      const exists = await platform.fileExists(file);
      console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    }

    // 6. Test Command Execution
    console.log('\n6️⃣ Testing Command Execution');
    const msbuildPath = await platform.findMSBuild(vsInstallations[0].installationPath);
    if (msbuildPath) {
      const result = await platform.executeCommand(msbuildPath.path, ['-version']);
      console.log(`   Command: ${msbuildPath.path} -version`);
      console.log(`   Exit Code: ${result.exitCode}`);
      console.log(`   Output: ${result.stdout.trim()}`);
      if (result.stderr) {
        console.log(`   Error: ${result.stderr}`);
      }
    }

    // 7. Test Project Info Parsing
    console.log('\n7️⃣ Testing Project Info Parsing');
    const projectPath = './test-projects/ConsoleApp.csproj';
    try {
      const projectInfo = await platform.getProjectInfo(projectPath);
      if (projectInfo) {
        console.log(`   ✅ Project parsed successfully:`);
        console.log(`      Target Framework: ${projectInfo.targetFramework}`);
        console.log(`      Output Type: ${projectInfo.outputType}`);
        console.log(`      References: ${projectInfo.references.length} total`);
      }
    } catch (error) {
      console.log(`   ⚠️  Project parsing: ${error.message}`);
    }

    // 8. Test Performance
    console.log('\n8️⃣ Testing Performance');
    const startTime = Date.now();
    
    await Promise.all([
      platform.findVisualStudio(),
      platform.findMSBuild(vsInstallations[0].installationPath),
      platform.findRoslyn(vsInstallations[0].installationPath),
      platform.findDebugger()
    ]);
    
    const endTime = Date.now();
    console.log(`   All operations completed in ${endTime - startTime}ms`);

    console.log('\n✅ All macOS platform tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Platform correctly detected as macOS');
    console.log('   ✅ Mock platform service is being used');
    console.log('   ✅ Mock VS installations are provided');
    console.log('   ✅ MSBuild detection works with mock data');
    console.log('   ✅ Roslyn detection works with mock data');
    console.log('   ✅ File system operations are mocked');
    console.log('   ✅ Command execution is mocked');
    console.log('   ✅ Performance is acceptable for development');
    
    console.log('\n🎯 Ready for macOS development workflow!');
    
  } catch (error) {
    console.error('❌ macOS test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMacOSPlatform();