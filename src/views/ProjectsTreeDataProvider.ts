import * as vscode from 'vscode';
import * as path from 'path';

export class ProjectsTreeDataProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null | void> = new vscode.EventEmitter<ProjectItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProjectItem): Promise<ProjectItem[]> {
    if (!element) {
      // Root level - find all .csproj and .sln files
      try {
        const [csprojFiles, slnFiles] = await Promise.all([
          vscode.workspace.findFiles('**/*.csproj', '**/node_modules/**'),
          vscode.workspace.findFiles('**/*.sln', '**/node_modules/**')
        ]);

        const items: ProjectItem[] = [];

        // Add solution files
        if (slnFiles.length > 0) {
          const solutionCategory = new ProjectItem(
            'Solutions',
            vscode.TreeItemCollapsibleState.Expanded,
            'category'
          );
          items.push(solutionCategory);

          for (const slnFile of slnFiles) {
            const item = new ProjectItem(
              path.basename(slnFile.fsPath),
              vscode.TreeItemCollapsibleState.None,
              'solution'
            );
            item.resourceUri = slnFile;
            item.tooltip = slnFile.fsPath;
            item.iconPath = new vscode.ThemeIcon('file-code');
            item.contextValue = 'solution';
            item.command = {
              command: 'vscode.open',
              title: 'Open',
              arguments: [slnFile]
            };
            items.push(item);
          }
        }

        // Add project files
        if (csprojFiles.length > 0) {
          const projectCategory = new ProjectItem(
            'Projects',
            vscode.TreeItemCollapsibleState.Expanded,
            'category'
          );
          items.push(projectCategory);

          for (const csprojFile of csprojFiles) {
            const item = new ProjectItem(
              path.basename(csprojFile.fsPath, '.csproj'),
              vscode.TreeItemCollapsibleState.None,
              'project'
            );
            item.resourceUri = csprojFile;
            item.tooltip = csprojFile.fsPath;
            item.description = vscode.workspace.asRelativePath(path.dirname(csprojFile.fsPath));
            item.iconPath = new vscode.ThemeIcon('file-binary');
            item.contextValue = 'project';
            
            // Add build actions as context menu
            items.push(item);
          }
        }

        if (items.length === 0) {
          return [new ProjectItem(
            'No .NET projects found',
            vscode.TreeItemCollapsibleState.None,
            'info'
          )];
        }

        return items;
      } catch (error) {
        return [new ProjectItem(
          `Error loading projects: ${error}`,
          vscode.TreeItemCollapsibleState.None,
          'error'
        )];
      }
    }

    return [];
  }
}

export class ProjectItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'category' | 'solution' | 'project' | 'info' | 'error'
  ) {
    super(label, collapsibleState);
    this.tooltip = this.label;
  }
}