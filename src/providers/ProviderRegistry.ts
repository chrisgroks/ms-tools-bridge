import * as vscode from 'vscode';
import { ILanguageProvider } from './ILanguageProvider';
import { IBuildProvider } from './IBuildProvider';
import { IDebugProvider } from './IDebugProvider';

export class ProviderRegistry {
  private languageProviders: Map<string, ILanguageProvider> = new Map();
  private buildProviders: Map<string, IBuildProvider> = new Map();
  private debugProviders: Map<string, IDebugProvider> = new Map();
  
  private activeLanguageProvider: ILanguageProvider | null = null;
  private activeBuildProvider: IBuildProvider | null = null;
  private activeDebugProvider: IDebugProvider | null = null;

  constructor(private readonly outputChannel: vscode.OutputChannel) {}

  // Language Provider Management
  registerLanguageProvider(provider: ILanguageProvider): void {
    this.languageProviders.set(provider.name, provider);
    this.outputChannel.appendLine(`Registered language provider: ${provider.displayName}`);
  }

  async activateLanguageProvider(name: string): Promise<boolean> {
    const provider = this.languageProviders.get(name);
    if (!provider) {
      this.outputChannel.appendLine(`Language provider '${name}' not found`);
      return false;
    }

    if (this.activeLanguageProvider === provider) {
      this.outputChannel.appendLine(`Language provider '${name}' is already active`);
      return true;
    }

    try {
      // Deactivate current provider if any
      if (this.activeLanguageProvider) {
        await this.activeLanguageProvider.deactivate();
      }

      // Check if the new provider is available
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        this.outputChannel.appendLine(`Language provider '${name}' is not available`);
        return false;
      }

      // Activate the new provider
      await provider.activate();
      this.activeLanguageProvider = provider;
      this.outputChannel.appendLine(`Activated language provider: ${provider.displayName}`);
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to activate language provider '${name}': ${error}`);
      return false;
    }
  }

  async deactivateLanguageProvider(): Promise<void> {
    if (this.activeLanguageProvider) {
      await this.activeLanguageProvider.deactivate();
      this.outputChannel.appendLine(`Deactivated language provider: ${this.activeLanguageProvider.displayName}`);
      this.activeLanguageProvider = null;
    }
  }

  getActiveLanguageProvider(): ILanguageProvider | null {
    return this.activeLanguageProvider;
  }

  getAvailableLanguageProviders(): string[] {
    return Array.from(this.languageProviders.keys());
  }

  // Build Provider Management
  registerBuildProvider(provider: IBuildProvider): void {
    this.buildProviders.set(provider.name, provider);
    this.outputChannel.appendLine(`Registered build provider: ${provider.displayName}`);
  }

  async activateBuildProvider(name: string): Promise<boolean> {
    const provider = this.buildProviders.get(name);
    if (!provider) {
      this.outputChannel.appendLine(`Build provider '${name}' not found`);
      return false;
    }

    try {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        this.outputChannel.appendLine(`Build provider '${name}' is not available`);
        return false;
      }

      this.activeBuildProvider = provider;
      this.outputChannel.appendLine(`Activated build provider: ${provider.displayName}`);
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to activate build provider '${name}': ${error}`);
      return false;
    }
  }

  getActiveBuildProvider(): IBuildProvider | null {
    return this.activeBuildProvider;
  }

  getAvailableBuildProviders(): string[] {
    return Array.from(this.buildProviders.keys());
  }

  // Debug Provider Management
  registerDebugProvider(provider: IDebugProvider): void {
    this.debugProviders.set(provider.name, provider);
    this.outputChannel.appendLine(`Registered debug provider: ${provider.displayName}`);
  }

  async activateDebugProvider(name: string): Promise<boolean> {
    const provider = this.debugProviders.get(name);
    if (!provider) {
      this.outputChannel.appendLine(`Debug provider '${name}' not found`);
      return false;
    }

    try {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        this.outputChannel.appendLine(`Debug provider '${name}' is not available`);
        return false;
      }

      this.activeDebugProvider = provider;
      this.outputChannel.appendLine(`Activated debug provider: ${provider.displayName}`);
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to activate debug provider '${name}': ${error}`);
      return false;
    }
  }

  getActiveDebugProvider(): IDebugProvider | null {
    return this.activeDebugProvider;
  }

  getAvailableDebugProviders(): string[] {
    return Array.from(this.debugProviders.keys());
  }

  // Auto-discovery and activation
  async autoActivateProviders(): Promise<void> {
    this.outputChannel.appendLine('Auto-activating providers...');

    // Try to activate the best available language provider
    const languageProviderPriority = ['roslyn', 'omnisharp']; // Future: add omnisharp
    for (const providerName of languageProviderPriority) {
      if (await this.activateLanguageProvider(providerName)) {
        break;
      }
    }

    // Try to activate the best available build provider
    const buildProviderPriority = ['msbuild']; // Future: add other build systems
    for (const providerName of buildProviderPriority) {
      if (await this.activateBuildProvider(providerName)) {
        break;
      }
    }

    // Try to activate the best available debug provider
    const debugProviderPriority = ['mono']; // Future: add other debuggers
    for (const providerName of debugProviderPriority) {
      if (await this.activateDebugProvider(providerName)) {
        break;
      }
    }
  }

  async restartActiveProviders(): Promise<void> {
    this.outputChannel.appendLine('Restarting active providers...');

    if (this.activeLanguageProvider) {
      try {
        await this.activeLanguageProvider.restart();
        this.outputChannel.appendLine(`Restarted language provider: ${this.activeLanguageProvider.displayName}`);
      } catch (error) {
        this.outputChannel.appendLine(`Failed to restart language provider: ${error}`);
      }
    }
  }

  async deactivateAll(): Promise<void> {
    this.outputChannel.appendLine('Deactivating all providers...');
    
    await this.deactivateLanguageProvider();
    this.activeBuildProvider = null;
    this.activeDebugProvider = null;
  }

  getStatus(): { language: string | null; build: string | null; debug: string | null } {
    return {
      language: this.activeLanguageProvider?.name || null,
      build: this.activeBuildProvider?.name || null,
      debug: this.activeDebugProvider?.name || null
    };
  }
}