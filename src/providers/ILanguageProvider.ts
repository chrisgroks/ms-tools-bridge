import { ServerOptions, LanguageClientOptions } from 'vscode-languageclient/node';

export interface ILanguageProvider {
  readonly name: string;
  readonly displayName: string;
  readonly supportedFrameworks: string[];
  
  isAvailable(): Promise<boolean>;
  
  getServerPath(): Promise<string>;
  
  getServerOptions(): Promise<ServerOptions>;
  
  getClientOptions(): LanguageClientOptions;
  
  activate(): Promise<void>;
  
  deactivate(): Promise<void>;
  
  restart(): Promise<void>;
}