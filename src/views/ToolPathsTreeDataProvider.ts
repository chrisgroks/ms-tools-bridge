import * as vscode from 'vscode';
import { IPlatformService } from '../platform/IPlatformService';

export class ToolPathsTreeDataProvider implements vscode.TreeDataProvider<ToolPathItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ToolPathItem | undefined | null | void> = new vscode.EventEmitter<ToolPathItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ToolPathItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private platformService: IPlatformService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ToolPathItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ToolPathItem): Promise<ToolPathItem[]> {
    if (!element) {
      // Root level - show tool categories
      return [
        new ToolPathItem('Visual Studio', vscode.TreeItemCollapsibleState.Expanded, 'category'),
        new ToolPathItem('Custom Paths', vscode.TreeItemCollapsibleState.Expanded, 'category')
      ];
    }

    if (element.label === 'Visual Studio') {
      return this.getVisualStudioInfo();
    } else if (element.label === 'Custom Paths') {
      return Promise.resolve(this.getCustomPaths());
    }

    return [];
  }

  private async getVisualStudioInfo(): Promise<ToolPathItem[]> {
    try {
      const installations = await this.platformService.findVisualStudio();
      
      if (installations.length === 0) {
        return [new ToolPathItem('No Visual Studio installations found', vscode.TreeItemCollapsibleState.None, 'info')];
      }

      const items: ToolPathItem[] = [];
      
      for (const installation of installations) {
        const item = new ToolPathItem(
          installation.displayName,
          vscode.TreeItemCollapsibleState.Collapsed,
          'vs-installation'
        );
        item.description = installation.version;
        item.tooltip = installation.installationPath;
        item.contextValue = 'vsInstallation';
        items.push(item);

        // Check for MSBuild
        const msbuild = await this.platformService.findMSBuild(installation.installationPath);
        if (msbuild) {
          const msbuildItem = new ToolPathItem(
            `MSBuild (${msbuild.version})`,
            vscode.TreeItemCollapsibleState.None,
            'tool'
          );
          msbuildItem.description = 'Found';
          msbuildItem.tooltip = msbuild.path;
          msbuildItem.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
          items.push(msbuildItem);
        } else {
          const msbuildItem = new ToolPathItem(
            'MSBuild',
            vscode.TreeItemCollapsibleState.None,
            'tool'
          );
          msbuildItem.description = 'Not Found';
          msbuildItem.iconPath = new vscode.ThemeIcon('x', new vscode.ThemeColor('testing.iconFailed'));
          items.push(msbuildItem);
        }

        // Check for Roslyn
        const roslyn = await this.platformService.findRoslyn(installation.installationPath);
        if (roslyn) {
          const roslynItem = new ToolPathItem(
            'Roslyn Language Server',
            vscode.TreeItemCollapsibleState.None,
            'tool'
          );
          roslynItem.description = 'Found';
          roslynItem.tooltip = roslyn.path;
          roslynItem.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
          items.push(roslynItem);
        } else {
          const roslynItem = new ToolPathItem(
            'Roslyn Language Server',
            vscode.TreeItemCollapsibleState.None,
            'tool'
          );
          roslynItem.description = 'Not Found';
          roslynItem.iconPath = new vscode.ThemeIcon('x', new vscode.ThemeColor('testing.iconFailed'));
          items.push(roslynItem);
        }
      }

      return items;
    } catch (error) {
      return [new ToolPathItem(`Error: ${error}`, vscode.TreeItemCollapsibleState.None, 'error')];
    }
  }

  private getCustomPaths(): ToolPathItem[] {
    const config = vscode.workspace.getConfiguration('vsToolsBridge');
    
    const items: ToolPathItem[] = [];

    // Roslyn custom path
    const roslynPath = config.get<string>('customRoslynPath', '');
    const roslynItem = new ToolPathItem(
      'Roslyn Language Server',
      vscode.TreeItemCollapsibleState.None,
      'custom-path'
    );
    roslynItem.description = roslynPath || 'Not set';
    roslynItem.tooltip = roslynPath || 'Click to set custom path';
    roslynItem.iconPath = new vscode.ThemeIcon(roslynPath ? 'file' : 'file-add');
    roslynItem.contextValue = 'customPath';
    roslynItem.command = {
      command: 'vsToolsBridge.setCustomPath',
      title: 'Set Path',
      arguments: ['customRoslynPath', 'Roslyn Language Server', 'Microsoft.CodeAnalysis.LanguageServer.exe']
    };
    items.push(roslynItem);

    // MSBuild custom path
    const msbuildPath = config.get<string>('customMSBuildPath', '');
    const msbuildItem = new ToolPathItem(
      'MSBuild',
      vscode.TreeItemCollapsibleState.None,
      'custom-path'
    );
    msbuildItem.description = msbuildPath || 'Not set';
    msbuildItem.tooltip = msbuildPath || 'Click to set custom path';
    msbuildItem.iconPath = new vscode.ThemeIcon(msbuildPath ? 'file' : 'file-add');
    msbuildItem.contextValue = 'customPath';
    msbuildItem.command = {
      command: 'vsToolsBridge.setCustomPath',
      title: 'Set Path',
      arguments: ['customMSBuildPath', 'MSBuild', 'MSBuild.exe']
    };
    items.push(msbuildItem);

    // OmniSharp custom path
    const omnisharpPath = config.get<string>('customOmniSharpPath', '');
    const omnisharpItem = new ToolPathItem(
      'OmniSharp',
      vscode.TreeItemCollapsibleState.None,
      'custom-path'
    );
    omnisharpItem.description = omnisharpPath || 'Not set';
    omnisharpItem.tooltip = omnisharpPath || 'Click to set custom path';
    omnisharpItem.iconPath = new vscode.ThemeIcon(omnisharpPath ? 'file' : 'file-add');
    omnisharpItem.contextValue = 'customPath';
    omnisharpItem.command = {
      command: 'vsToolsBridge.setCustomPath',
      title: 'Set Path',
      arguments: ['customOmniSharpPath', 'OmniSharp', 'OmniSharp.exe']
    };
    items.push(omnisharpItem);

    return items;
  }
}

export class ToolPathItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'category' | 'vs-installation' | 'tool' | 'custom-path' | 'info' | 'error'
  ) {
    super(label, collapsibleState);
    this.tooltip = this.label;
  }
}