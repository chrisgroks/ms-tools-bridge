import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Use Windsurf instead of downloading VS Code
    await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath,
      vscodeExecutablePath: '/Applications/Windsurf.app/Contents/MacOS/Electron',
      launchArgs: [] // Pass an empty array to avoid default problematic args
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();