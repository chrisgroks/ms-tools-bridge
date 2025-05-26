import { IPlatformService } from './IPlatformService';
import { WindowsPlatformService } from './WindowsPlatformService';
import { MockPlatformService } from './MockPlatformService';

export class PlatformServiceFactory {
  static create(forceMock?: boolean): IPlatformService {
    if (forceMock || process.platform !== 'win32') {
      return new MockPlatformService();
    }
    
    return new WindowsPlatformService();
  }
}