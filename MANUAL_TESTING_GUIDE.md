# Manual Testing Guide for VS Tools Bridge

This guide covers manual testing of the VS Tools Bridge extension in the VS Code extension host, particularly useful for macOS development.

## Prerequisites

1. **VS Code/Windsurf** installed
2. **Node.js** and **npm** installed
3. Extension dependencies installed: `npm install`
4. Extension compiled: `npm run compile`

## Testing in Extension Host

### 1. Launch Extension Host

1. Open the VS Tools Bridge project in VS Code/Windsurf
2. Press `F5` or go to **Run > Start Debugging**
3. This opens a new "Extension Development Host" window
4. The extension will be loaded and activated automatically

### 2. Verify Extension Activation

In the Extension Development Host window:

1. Open Command Palette (`Cmd+Shift+P` on macOS)
2. Type "VS Tools Bridge" to see available commands:
   - `VS Tools Bridge: Select Visual Studio Version`
   - `VS Tools Bridge: Restart Language Server`
   - `VS Tools Bridge: Build Project`
   - `VS Tools Bridge: Clean Project`
   - `VS Tools Bridge: Restore Project Dependencies`
   - `VS Tools Bridge: Configure Custom Tool Paths`

### 3. Test Activity Bar Integration

1. Look for the **VS Tools Bridge** icon in the Activity Bar (left sidebar)
2. Click on it to open the VS Tools Bridge panel
3. You should see three tree views:
   - **Providers** - Shows available language/build/debug providers
   - **Tool Paths** - Shows detected tool locations
   - **Projects** - Shows .NET projects in workspace

### 4. Test Provider Tree View

In the **Providers** section:
1. Expand "Language Providers" - should show Roslyn and OmniSharp
2. Expand "Build Providers" - should show MSBuild
3. Expand "Debug Providers" - should show Mono Debugger
4. Each provider should show its availability status
5. Click the refresh button (🔄) to reload providers
6. Click the settings button (⚙️) to open extension settings

### 5. Test Tool Paths Tree View

In the **Tool Paths** section:
1. Should show detected Visual Studio installations
2. Should show MSBuild paths for each VS version
3. Should show Roslyn language server paths
4. On macOS, these will be mock paths starting with `/mock/`

### 6. Test Projects Tree View

In the **Projects** section:
1. Open a folder with .NET projects (use the `test-projects` folder)
2. Should automatically detect .csproj files
3. Right-click on a project to see context menu:
   - Build Project
   - Clean Project
   - Restore Project

### 7. Test Commands

#### Build Project Command
1. Open Command Palette (`Cmd+Shift+P`)
2. Run "VS Tools Bridge: Build Project"
3. Should show project picker if multiple projects
4. Should show build progress and results in Output panel

#### Configuration Commands
1. Run "VS Tools Bridge: Configure Custom Tool Paths"
2. Should show options for MSBuild, Roslyn, etc.
3. Test setting a custom path (will show platform-appropriate placeholder)

#### Restart Language Server
1. Run "VS Tools Bridge: Restart Language Server"
2. Should restart active providers and refresh UI

### 8. Test Cross-Platform Features on macOS

#### Platform Detection
1. Check the Output panel ("VS Tools Bridge" channel)
2. Should show messages indicating macOS platform detection
3. Should show mock Visual Studio installations being used

#### Mock Data Verification
1. In Tool Paths view, verify mock VS installations:
   - Visual Studio Professional 2022 (17.8.3)
   - Visual Studio Professional 2019 (16.11.34)
2. Each should show corresponding MSBuild and Roslyn paths
3. Paths should start with `/mock/` prefix

#### Path Placeholders
1. When setting custom paths, placeholders should show Unix-style paths
2. Example: `/usr/local/bin/filename` instead of `C:\path\to\filename`

## Expected Behavior on macOS

### ✅ What Should Work
- Extension loads without errors
- Activity bar integration appears
- All tree views populate with mock data
- Commands execute without throwing exceptions
- Build operations simulate successfully
- Provider registration and activation works
- Settings UI opens and accepts input
- Cross-platform path handling works correctly

### ⚠️ Expected Limitations
- Language server won't actually start (no real Roslyn/OmniSharp)
- Build operations are simulated (no real MSBuild)
- Debugging won't work (mock debugger only)
- Some Windows-specific features may be disabled

### ❌ What Should NOT Happen
- Extension crashes or fails to load
- Commands throw unhandled exceptions
- UI components fail to render
- Settings cause errors
- Hard-coded Windows paths appear in UI

## Debugging Issues

### Check Output Panel
1. Go to **View > Output**
2. Select "VS Tools Bridge" from dropdown
3. Look for error messages or platform detection info

### Check Developer Console
1. In Extension Development Host: **Help > Toggle Developer Tools**
2. Check Console tab for JavaScript errors
3. Look for extension-related error messages

### Common Issues and Solutions

#### Extension Not Loading
- Check that `npm run compile` completed successfully
- Verify no TypeScript compilation errors
- Check that activation events are properly configured

#### UI Not Appearing
- Verify the activity bar icon is visible
- Check if views are registered correctly in package.json
- Look for console errors related to tree data providers

#### Commands Not Working
- Check command registration in extension.ts
- Verify command names match package.json contributions
- Look for unhandled promise rejections

#### Mock Data Not Showing
- Verify PlatformServiceFactory is using MockPlatformService
- Check that platform detection returns 'mac'
- Ensure mock data is properly configured

## Test Scenarios

### Basic Functionality Test
1. ✅ Extension loads and activates
2. ✅ Activity bar shows VS Tools Bridge
3. ✅ Tree views populate with data
4. ✅ Commands are available in palette
5. ✅ Settings can be opened and modified

### Provider Management Test
1. ✅ All providers show as available
2. ✅ Provider auto-activation works
3. ✅ Refresh updates provider status
4. ✅ Provider restart completes successfully

### Project Operations Test
1. ✅ Projects are detected in workspace
2. ✅ Build command executes (simulated)
3. ✅ Clean command executes (simulated)
4. ✅ Restore command executes (simulated)

### Configuration Test
1. ✅ Custom path configuration opens
2. ✅ Path validation shows appropriate format
3. ✅ Settings persist between sessions
4. ✅ Changes trigger provider refresh

## Performance Testing

### Startup Performance
- Extension should activate within 2-3 seconds
- Tree views should populate quickly with mock data
- No noticeable delays in UI responsiveness

### Operation Performance
- Command execution should be responsive
- Tree view refresh should be near-instantaneous
- Provider operations should complete quickly

## Reporting Issues

When reporting issues, include:
1. Platform (macOS version)
2. VS Code/Windsurf version
3. Extension version/commit hash
4. Console output and error messages
5. Steps to reproduce
6. Expected vs actual behavior

## Development Workflow

This manual testing should be performed:
1. **Before commits** - Ensure changes don't break existing functionality
2. **After adding new features** - Verify new features work on macOS
3. **During debugging** - To isolate platform-specific issues
4. **Before releases** - Comprehensive functionality verification

The combination of automated tests and manual testing ensures the extension works reliably across platforms during development and deployment.