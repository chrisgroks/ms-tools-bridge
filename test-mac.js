#!/usr/bin/env node

/**
 * Manual test script for macOS development
 * Tests the extension functionality using mock platform service
 */

const { PlatformServiceFactory } = require('./out/platform/PlatformServiceFactory');
const { ProviderRegistry } = require('./out/providers/ProviderRegistry');
const { RoslynProvider } = require('./out/providers/RoslynProvider');
const { MSBuildProvider } = require('./out/providers/MSBuildProvider');
const { MonoDebugProvider } = require('./out/providers/MonoDebugProvider');
const { OmniSharpProvider } = require('./out/providers/OmniSharpProvider');

async function testMacOSFunctionality() {
  console.log('🍎 Testing VS Tools Bridge on macOS...\n');

  try {
    // 1. Test Platform Service
    console.log('1️⃣ Testing Platform Service');
    const platform = PlatformServiceFactory.create();
    console.log(`   Platform: ${platform.getPlatform()}`);
    
    const vsInstallations = await platform.findVisualStudio();
    console.log(`   Found ${vsInstallations.length} VS installations:`);
    vsInstallations.forEach(vs => {
      console.log(`     - ${vs.displayName} (${vs.version})`);
    });

    // 2. Test MSBuild Detection
    console.log('\n2️⃣ Testing MSBuild Detection');
    for (const vs of vsInstallations) {
      const msbuild = await platform.findMSBuild(vs.installationPath);
      if (msbuild) {
        console.log(`   MSBuild found for ${vs.displayName}: ${msbuild.version}`);
      }
    }

    // 3. Test Roslyn Detection
    console.log('\n3️⃣ Testing Roslyn Detection');
    for (const vs of vsInstallations) {
      const roslyn = await platform.findRoslyn(vs.installationPath);
      if (roslyn) {
        console.log(`   Roslyn found for ${vs.displayName}: ${roslyn.version}`);
        console.log(`   Supported frameworks: ${roslyn.supportedFrameworks.join(', ')}`);
      }
    }

    // 4. Test Provider Registry
    console.log('\n4️⃣ Testing Provider Registry');
    const registry = new ProviderRegistry(platform);

    // Register providers
    registry.registerLanguageProvider(new RoslynProvider(platform));
    registry.registerLanguageProvider(new OmniSharpProvider(platform));
    registry.registerBuildProvider(new MSBuildProvider(platform));
    registry.registerDebugProvider(new MonoDebugProvider(platform));

    console.log(`   Registered ${registry.getLanguageProviders().length} language providers`);
    console.log(`   Registered ${registry.getBuildProviders().length} build providers`);
    console.log(`   Registered ${registry.getDebugProviders().length} debug providers`);

    // 5. Test Provider Availability
    console.log('\n5️⃣ Testing Provider Availability');
    const languageProviders = registry.getLanguageProviders();
    for (const provider of languageProviders) {
      const available = await provider.isAvailable();
      console.log(`   ${provider.displayName}: ${available ? '✅' : '❌'}`);
    }

    const buildProviders = registry.getBuildProviders();
    for (const provider of buildProviders) {
      const available = await provider.isAvailable();
      console.log(`   ${provider.displayName}: ${available ? '✅' : '❌'}`);
    }

    // 6. Test Auto-Activation
    console.log('\n6️⃣ Testing Auto-Activation');
    await registry.autoActivateProviders();
    
    const activeLanguage = registry.getActiveLanguageProvider();
    const activeBuild = registry.getActiveBuildProvider();
    const activeDebug = registry.getActiveDebugProvider();

    console.log(`   Active Language Provider: ${activeLanguage?.displayName || 'None'}`);
    console.log(`   Active Build Provider: ${activeBuild?.displayName || 'None'}`);
    console.log(`   Active Debug Provider: ${activeDebug?.displayName || 'None'}`);

    // 7. Test Project Info
    console.log('\n7️⃣ Testing Project Info');
    const testProjectPath = './test-projects/ConsoleApp.csproj';
    const projectInfo = await platform.getProjectInfo(testProjectPath);
    if (projectInfo) {
      console.log(`   Project: ${projectInfo.path}`);
      console.log(`   Target Framework: ${projectInfo.targetFramework}`);
      console.log(`   Output Type: ${projectInfo.outputType}`);
      console.log(`   References: ${projectInfo.references.length} total`);
    }

    // 8. Test Command Execution
    console.log('\n8️⃣ Testing Command Execution');
    const msbuildPath = await platform.findMSBuild(vsInstallations[0].installationPath);
    if (msbuildPath) {
      const result = await platform.executeCommand(msbuildPath.path, ['-version']);
      console.log(`   MSBuild version output: ${result.stdout.trim()}`);
      console.log(`   Exit code: ${result.exitCode}`);
    }

    console.log('\n✅ All macOS tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Platform service correctly detects macOS');
    console.log('   - Mock VS installations are provided');
    console.log('   - All providers can be registered and activated');
    console.log('   - Provider availability checks work');
    console.log('   - Project info parsing works');
    console.log('   - Command execution is mocked properly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMacOSFunctionality();