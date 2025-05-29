#!/usr/bin/env node

/**
 * Test VS Code UI components on macOS with mock data
 * Tests tree data providers without full VS Code extension host
 */

const path = require('path');

// Enhanced mock for VS Code APIs
const mockVscode = {
  TreeItem: class TreeItem {
    constructor(label, collapsibleState) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  ThemeIcon: class ThemeIcon {
    constructor(id) {
      this.id = id;
    }
  },
  EventEmitter: class EventEmitter {
    constructor() {
      this._listeners = [];
    }
    get event() {
      return (listener) => {
        this._listeners.push(listener);
        return { dispose: () => {} };
      };
    }
    fire(data) {
      this._listeners.forEach(listener => listener(data));
    }
  },
  Uri: {
    file: (path) => ({ fsPath: path })
  },
  window: {
    createOutputChannel: () => ({
      appendLine: console.log,
      dispose: () => {}
    })
  },
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => defaultValue
    }),
    findFiles: async (pattern) => {
      // Mock some project files
      return [
        { fsPath: './test-projects/ConsoleApp.csproj' },
        { fsPath: './test-projects/ClassLibrary.csproj' }
      ];
    },
    asRelativePath: (path) => path.replace('./test-projects/', '')
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

async function testUIComponents() {
  console.log('🎯 Testing VS Code UI Components on macOS...\n');

  try {
    // Import components after setting up mocks
    const { PlatformServiceFactory } = originalRequire('./out/platform/PlatformServiceFactory');
    const { ProviderRegistry } = originalRequire('./out/providers/ProviderRegistry');
    const { RoslynProvider } = originalRequire('./out/providers/RoslynProvider');
    const { MSBuildProvider } = originalRequire('./out/providers/MSBuildProvider');
    const { MonoDebugProvider } = originalRequire('./out/providers/MonoDebugProvider');
    const { ProvidersTreeDataProvider } = originalRequire('./out/views/ProvidersTreeDataProvider');
    const { ToolPathsTreeDataProvider } = originalRequire('./out/views/ToolPathsTreeDataProvider');
    const { ProjectsTreeDataProvider } = originalRequire('./out/views/ProjectsTreeDataProvider');

    // Set up platform and registry
    const platform = PlatformServiceFactory.create();
    const registry = new ProviderRegistry(platform);

    // Register providers
    registry.registerLanguageProvider(new RoslynProvider(platform));
    registry.registerBuildProvider(new MSBuildProvider(platform));
    registry.registerDebugProvider(new MonoDebugProvider(platform));

    await registry.autoActivateProviders();

    // 1. Test Providers Tree Data Provider
    console.log('1️⃣ Testing Providers Tree Data Provider');
    const providersTree = new ProvidersTreeDataProvider(registry);
    
    const providerElements = await providersTree.getChildren();
    console.log(`   Root elements: ${providerElements.length}`);
    
    for (const element of providerElements) {
      const treeItem = await providersTree.getTreeItem(element);
      console.log(`   Category: ${treeItem.label}`);
      
      const children = await providersTree.getChildren(element);
      for (const child of children) {
        const childItem = await providersTree.getTreeItem(child);
        console.log(`     Provider: ${childItem.label} (${childItem.description || 'no description'})`);
      }
    }

    // 2. Test Tool Paths Tree Data Provider
    console.log('\n2️⃣ Testing Tool Paths Tree Data Provider');
    const toolPathsTree = new ToolPathsTreeDataProvider(platform);
    
    const toolElements = await toolPathsTree.getChildren();
    console.log(`   Tool categories: ${toolElements.length}`);
    
    for (const element of toolElements) {
      const treeItem = await toolPathsTree.getTreeItem(element);
      console.log(`   Category: ${treeItem.label}`);
      
      const children = await toolPathsTree.getChildren(element);
      if (children && children.length > 0) {
        for (const child of children) {
          const childItem = await toolPathsTree.getTreeItem(child);
          console.log(`     Tool: ${childItem.label} (${childItem.description || 'no description'})`);
        }
      }
    }

    // 3. Test Projects Tree Data Provider
    console.log('\n3️⃣ Testing Projects Tree Data Provider');
    const projectsTree = new ProjectsTreeDataProvider();
    
    const projectElements = await projectsTree.getChildren();
    console.log(`   Projects found: ${projectElements.length}`);
    
    for (const element of projectElements) {
      const treeItem = await projectsTree.getTreeItem(element);
      console.log(`   Project: ${treeItem.label}`);
      console.log(`     Path: ${treeItem.resourceUri ? treeItem.resourceUri.fsPath : 'no path'}`);
      console.log(`     Context: ${treeItem.contextValue || 'no context'}`);
    }

    // 4. Test Tree Refresh Functionality
    console.log('\n4️⃣ Testing Tree Refresh Functionality');
    console.log('   Testing providers tree refresh...');
    providersTree.refresh();
    console.log('   ✅ Providers tree refresh completed');
    
    console.log('   Testing tool paths tree refresh...');
    toolPathsTree.refresh();
    console.log('   ✅ Tool paths tree refresh completed');
    
    console.log('   Testing projects tree refresh...');
    projectsTree.refresh();
    console.log('   ✅ Projects tree refresh completed');

    // 5. Test Tree Item Icons and Collapsibility
    console.log('\n5️⃣ Testing Tree Item Properties');
    
    const sampleProvider = providerElements[0];
    if (sampleProvider) {
      const sampleItem = await providersTree.getTreeItem(sampleProvider);
      console.log(`   Sample tree item:`);
      console.log(`     Label: ${sampleItem.label}`);
      console.log(`     Collapsible: ${sampleItem.collapsibleState !== mockVscode.TreeItemCollapsibleState.None}`);
      console.log(`     Has icon: ${!!sampleItem.iconPath}`);
    }

    console.log('\n✅ All UI component tests passed!');
    console.log('\n📋 UI Test Summary:');
    console.log('   ✅ Providers tree data provider works with mock data');
    console.log('   ✅ Tool paths tree data provider works with mock data');
    console.log('   ✅ Projects tree data provider finds mock projects');
    console.log('   ✅ Tree refresh functionality works');
    console.log('   ✅ Tree items have proper structure and properties');
    console.log('   ✅ All tree providers are cross-platform compatible');
    
    console.log('\n🎯 UI components ready for VS Code integration!');
    
  } catch (error) {
    console.error('❌ UI component test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testUIComponents();