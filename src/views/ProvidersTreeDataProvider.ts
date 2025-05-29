import * as vscode from 'vscode';
import { ProviderRegistry } from '../providers/ProviderRegistry';

export class ProvidersTreeDataProvider implements vscode.TreeDataProvider<ProviderItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProviderItem | undefined | null | void> = new vscode.EventEmitter<ProviderItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ProviderItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private providerRegistry: ProviderRegistry) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProviderItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProviderItem): Thenable<ProviderItem[]> {
    if (!element) {
      // Root level - show provider categories
      return Promise.resolve([
        new ProviderItem('Language Providers', vscode.TreeItemCollapsibleState.Expanded, 'category'),
        new ProviderItem('Build Providers', vscode.TreeItemCollapsibleState.Expanded, 'category'),
        new ProviderItem('Debug Providers', vscode.TreeItemCollapsibleState.Expanded, 'category')
      ]);
    }

    // Show providers in each category
    if (element.label === 'Language Providers') {
      return this.getLanguageProviders();
    } else if (element.label === 'Build Providers') {
      return this.getBuildProviders();
    } else if (element.label === 'Debug Providers') {
      return this.getDebugProviders();
    }

    return Promise.resolve([]);
  }

  private getLanguageProviders(): Promise<ProviderItem[]> {
    const status = this.providerRegistry.getStatus();
    const available = this.providerRegistry.getAvailableLanguageProviders();
    
    return Promise.resolve(available.map(name => {
      const isActive = status.language === name;
      const item = new ProviderItem(
        this.getProviderDisplayName(name),
        vscode.TreeItemCollapsibleState.None,
        'provider',
        name
      );
      
      item.description = isActive ? 'Active' : 'Available';
      item.iconPath = new vscode.ThemeIcon(isActive ? 'check' : 'circle-outline');
      item.contextValue = isActive ? 'activeProvider' : 'availableProvider';
      
      return item;
    }));
  }

  private getBuildProviders(): Promise<ProviderItem[]> {
    const status = this.providerRegistry.getStatus();
    const available = this.providerRegistry.getAvailableBuildProviders();
    
    return Promise.resolve(available.map(name => {
      const isActive = status.build === name;
      const item = new ProviderItem(
        this.getProviderDisplayName(name),
        vscode.TreeItemCollapsibleState.None,
        'provider',
        name
      );
      
      item.description = isActive ? 'Active' : 'Available';
      item.iconPath = new vscode.ThemeIcon(isActive ? 'check' : 'circle-outline');
      item.contextValue = isActive ? 'activeProvider' : 'availableProvider';
      
      return item;
    }));
  }

  private getDebugProviders(): Promise<ProviderItem[]> {
    const status = this.providerRegistry.getStatus();
    const available = this.providerRegistry.getAvailableDebugProviders();
    
    return Promise.resolve(available.map(name => {
      const isActive = status.debug === name;
      const item = new ProviderItem(
        this.getProviderDisplayName(name),
        vscode.TreeItemCollapsibleState.None,
        'provider',
        name
      );
      
      item.description = isActive ? 'Active' : 'Available';
      item.iconPath = new vscode.ThemeIcon(isActive ? 'check' : 'circle-outline');
      item.contextValue = isActive ? 'activeProvider' : 'availableProvider';
      
      return item;
    }));
  }

  private getProviderDisplayName(name: string): string {
    switch (name) {
      case 'roslyn': return 'Roslyn Language Server';
      case 'omnisharp': return 'OmniSharp Language Server';
      case 'msbuild': return 'MSBuild';
      case 'mono': return 'Mono Debugger';
      default: return name;
    }
  }
}

export class ProviderItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'category' | 'provider',
    public readonly providerName?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = this.label;
  }
}