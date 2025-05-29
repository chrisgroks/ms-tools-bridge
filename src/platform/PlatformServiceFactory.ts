import { IPlatformService } from './IPlatformService';
import { WindowsPlatformService } from './WindowsPlatformService';
import { MacOSPlatformService } from './MacOSPlatformService';
import { MockPlatformService } from './MockPlatformService';

export class PlatformServiceFactory {
  static create(forceMock?: boolean): IPlatformService {
    if (forceMock) {
      return new MockPlatformService();
    }
    
    switch (process.platform) {
      case 'win32':
        return new WindowsPlatformService();
      case 'darwin':
        return new MacOSPlatformService();
      default:
        // Use macOS service for Linux as well (similar Unix-like behavior)
        return new MacOSPlatformService();
    }
  }
}