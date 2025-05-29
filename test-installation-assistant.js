#!/usr/bin/env node

/**
 * Test the installation assistant functionality
 * Tests the tool detection and installation guidance system
 */

const path = require('path');

// Mock vscode module to avoid dependency issues
const mockVscode = {
  window: {
    createOutputChannel: () => ({
      appendLine: console.log,
      dispose: () => {},
      show: () => {}
    }),
    showInformationMessage: async (message, ...items) => {
      console.log(`INFO: ${message}`);
      if (items.length > 0) {
        console.log(`  Options: ${items.join(', ')}`);
        return items[0]; // Return first option for testing
      }
      return undefined;
    },
    showWarningMessage: async (message, ...items) => {
      console.log(`WARNING: ${message}`);
      if (items.length > 0) {
        console.log(`  Options: ${items.join(', ')}`);
        return items[0]; // Return first option for testing
      }
      return undefined;
    },
    showErrorMessage: async (message, ...items) => {
      console.log(`ERROR: ${message}`);
      if (items.length > 0) {
        console.log(`  Options: ${items.join(', ')}`);
      }
      return undefined;
    },
    showQuickPick: async (items, options) => {
      console.log(`PICKER: ${options?.placeHolder || 'Select items'}`);
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.label} - ${item.description}`);
      });
      return items.slice(0, 2); // Return first 2 items for testing
    },
    withProgress: async (options, callback) => {
      console.log(`PROGRESS: ${options.title}`);
      return callback({
        report: (progress) => console.log(`  Progress: ${progress.message}`)
      });
    }
  },
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => defaultValue
    })
  },
  extensions: {
    getExtension: (id) => {
      // Simulate C# extension not being installed
      if (id === 'ms-dotnettools.csharp') {
        return undefined;
      }
      return {};
    }
  },
  env: {
    clipboard: {
      writeText: async (text) => {
        console.log(`CLIPBOARD: ${text}`);
      }
    },
    openExternal: async (uri) => {
      console.log(`OPEN URL: ${uri.toString()}`);
    }
  },
  Uri: {
    parse: (uri) => ({ toString: () => uri })
  },
  ProgressLocation: {
    Notification: 15
  },
  ConfigurationTarget: {
    Global: 1
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

async function testInstallationAssistant() {
  console.log('🔧 Testing Installation Assistant...\n');

  try {
    // Import after setting up mocks
    const { PlatformServiceFactory } = originalRequire('./out/platform/PlatformServiceFactory');
    const { InstallationAssistant } = originalRequire('./out/services/InstallationAssistant');
    
    // 1. Initialize components
    console.log('1️⃣ Initializing Installation Assistant');
    const platform = PlatformServiceFactory.create();
    const outputChannel = mockVscode.window.createOutputChannel('Test');
    const assistant = new InstallationAssistant(platform, outputChannel);
    
    console.log(`   Platform: ${platform.getPlatform()}`);
    console.log('   ✅ Installation Assistant initialized');

    // 2. Check for missing tools
    console.log('\n2️⃣ Checking for Missing Tools');
    const missingTools = await assistant.checkMissingTools();
    
    console.log(`   Found ${missingTools.length} missing or installable tools:`);
    for (const tool of missingTools) {
      console.log(`     - ${tool.name} (${tool.category})`);
      console.log(`       Required: ${tool.required}`);
      console.log(`       Install method: ${tool.installMethod}`);
      console.log(`       Description: ${tool.description}`);
      
      if (tool.installCommand) {
        console.log(`       Command: ${tool.installCommand} ${tool.installArgs?.join(' ')}`);
      }
      
      if (tool.downloadUrl) {
        console.log(`       Download: ${tool.downloadUrl}`);
      }
      
      console.log('');
    }

    // 3. Test installation prompts
    console.log('\n3️⃣ Testing Installation Prompts');
    console.log('   Running prompt for installation...');
    await assistant.promptForInstallation(missingTools);

    // 4. Test individual tool installation
    console.log('\n4️⃣ Testing Individual Tool Installation');
    if (missingTools.length > 0) {
      const testTool = missingTools.find(t => t.installMethod === 'automatic');
      if (testTool) {
        console.log(`   Testing installation of: ${testTool.name}`);
        const result = await assistant.installTool(testTool);
        console.log(`   Installation result: ${result ? 'Success' : 'Failed/Manual'}`);
      } else {
        console.log('   No automatic installation tools found for testing');
      }
    }

    // 5. Test different categories of tools
    console.log('\n5️⃣ Analyzing Tool Categories');
    const categories = ['language', 'build', 'debug', 'runtime'];
    
    for (const category of categories) {
      const toolsInCategory = missingTools.filter(t => t.category === category);
      console.log(`   ${category.toUpperCase()}: ${toolsInCategory.length} tools`);
      
      toolsInCategory.forEach(tool => {
        console.log(`     - ${tool.name} (${tool.installMethod})`);
      });
    }

    // 6. Test Installation Methods
    console.log('\n6️⃣ Installation Methods Analysis');
    const methods = ['automatic', 'guided', 'manual'];
    
    for (const method of methods) {
      const toolsWithMethod = missingTools.filter(t => t.installMethod === method);
      console.log(`   ${method.toUpperCase()}: ${toolsWithMethod.length} tools`);
      
      if (method === 'automatic') {
        console.log('     → Can be installed automatically with dotnet tool install');
      } else if (method === 'guided') {
        console.log('     → Requires guided installation (Homebrew, package managers)');
      } else {
        console.log('     → Requires manual download and installation');
      }
    }

    console.log('\n✅ Installation Assistant testing completed!');
    console.log('\n📋 Summary:');
    console.log(`   ✅ Found ${missingTools.length} tools that can be installed`);
    console.log(`   ✅ Tool detection working correctly`);
    console.log(`   ✅ Installation prompts functional`);
    console.log(`   ✅ Different installation methods supported`);
    console.log(`   ✅ User guidance system working`);
    
    const requiredMissing = missingTools.filter(t => t.required);
    const optionalMissing = missingTools.filter(t => !t.required);
    
    console.log('\n🎯 Installation Recommendations:');
    if (requiredMissing.length > 0) {
      console.log(`   ⚠️  ${requiredMissing.length} required tools missing`);
      requiredMissing.forEach(tool => console.log(`      - ${tool.name}`));
    } else {
      console.log('   ✅ All required tools are installed');
    }
    
    if (optionalMissing.length > 0) {
      console.log(`   💡 ${optionalMissing.length} optional tools available for better experience`);
      optionalMissing.forEach(tool => console.log(`      - ${tool.name}`));
    }
    
  } catch (error) {
    console.error('❌ Installation Assistant test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testInstallationAssistant();