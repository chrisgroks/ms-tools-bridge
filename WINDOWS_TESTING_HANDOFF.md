# Windows Testing Handoff - VS Tools Bridge

## 📋 Mission: Validate Windows Platform Integration

The VS Tools Bridge extension has been **fully developed and tested on macOS** with a comprehensive installation assistant system. **Your mission is to validate it works correctly on Windows** with real Visual Studio installations.

## 🎯 What We've Built

### **Core Achievement: Installation Assistant System**
- **Detects missing .NET tools** automatically on extension activation
- **Installs tools automatically** when legally possible (OmniSharp via `dotnet tool install`)
- **Provides guided installation** for complex tools (VS components, Mono)
- **One-click setup experience** instead of cryptic "tool not found" errors

### **Key Features to Test:**
1. **Real Platform Detection**: Should detect Windows platform and find Visual Studio installations
2. **Installation Assistant**: Should offer to install missing tools with user-friendly prompts
3. **Provider Integration**: Should properly activate Roslyn/OmniSharp language servers
4. **UI Components**: Activity bar, tree views, and commands should work correctly
5. **Cross-platform Commands**: All commands should execute without errors

## 🖥️ Windows Testing Environment Setup

### **Prerequisites:**
1. **Windows machine** (Windows 10/11)
2. **Visual Studio** installed (any edition: Community, Professional, Enterprise)
3. **VS Code** or **Windsurf** installed
4. **.NET SDK** (6.0+ recommended)
5. **Git** for cloning the repository

### **Quick Setup:**
```bash
# Clone the repository
git clone <repository-url>
cd ms-tool-bridge

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Verify build succeeded
npm test
```

## 🧪 Critical Test Scenarios

### **Test 1: Extension Activation & Platform Detection**
**Goal:** Verify Windows platform service works correctly

1. **Open project in VS Code**
2. **Press F5** to launch Extension Development Host
3. **Check Output Panel** ("VS Tools Bridge" channel)
4. **Verify logs show:**
   ```
   VS Tools Bridge is activating...
   Platform: windows
   Found X VS installations:
     - Visual Studio [Edition] [Year]
   ```

**✅ Expected Result:** Platform detected as 'windows', real VS installations found  
**❌ Failure Signs:** Platform shows 'mac', no VS installations, or errors

### **Test 2: Installation Assistant - First Run Experience**
**Goal:** Test the automatic setup wizard

1. **Fresh extension activation** (or manually run setup)
2. **Wait 2-3 seconds** after activation
3. **Look for notification:** "Found X tools that can be installed for better .NET development experience"
4. **Click "Install Tools"** and follow prompts

**✅ Expected Result:** User-friendly notifications offering to install missing tools  
**❌ Failure Signs:** No notifications, errors in installation prompts, or crashes

### **Test 3: OmniSharp Installation (If Missing)**
**Goal:** Test automatic OmniSharp installation

**Setup:** Ensure OmniSharp is not installed globally
```bash
# Check if OmniSharp is installed
dotnet tool list -g | findstr omnisharp

# If installed, uninstall for testing
dotnet tool uninstall -g omnisharp
```

**Test Steps:**
1. **Run command:** "VS Tools Bridge: Check Missing Tools"
2. **Should detect:** OmniSharp is missing
3. **Should offer:** "Install OmniSharp Language Server" with automatic installation
4. **Click install** and verify it runs: `dotnet tool install -g omnisharp`

**✅ Expected Result:** OmniSharp installs successfully via dotnet tool  
**❌ Failure Signs:** Installation fails, command not found, or permissions errors

### **Test 4: Visual Studio Integration**
**Goal:** Test real VS detection and Roslyn integration

1. **Check tree view:** VS Tools Bridge activity bar → Tool Paths
2. **Should show:**
   - Visual Studio installations found
   - MSBuild paths for each VS version  
   - Roslyn language server paths
3. **Try building a project:** Right-click project → Build Project
4. **Check providers:** VS Tools Bridge → Providers → Should show Roslyn as available

**✅ Expected Result:** Real VS installations detected, Roslyn available, builds work  
**❌ Failure Signs:** No VS detected, Roslyn unavailable, build failures

### **Test 5: Command Palette Integration**
**Goal:** Test all commands work on Windows

**Commands to test:** (Ctrl+Shift+P)
- `VS Tools Bridge: Setup Wizard`
- `VS Tools Bridge: Check Missing Tools` 
- `VS Tools Bridge: Install .NET Tools`
- `VS Tools Bridge: Build Project`
- `VS Tools Bridge: Select Visual Studio Version`
- `VS Tools Bridge: Restart Language Server`

**✅ Expected Result:** All commands execute without errors, show appropriate dialogs  
**❌ Failure Signs:** Commands missing, errors on execution, or incorrect behavior

### **Test 6: Project Operations**
**Goal:** Test .NET project building and management

1. **Open test project:** Use files in `test-projects/` directory
2. **VS Tools Bridge panel:** Should show projects in Projects tree view
3. **Right-click project:** Should show context menu (Build, Clean, Restore)
4. **Test build:** Should execute MSBuild successfully
5. **Check output:** Should show build results in Output panel

**✅ Expected Result:** Projects detected, build commands work, output shows results  
**❌ Failure Signs:** No projects shown, build failures, or missing context menus

## 🔍 Specific Windows Validation Points

### **Windows Platform Service (`WindowsPlatformService.ts`)**
**Critical areas to validate:**

1. **VS Detection via vswhere.exe:**
   - Should find vswhere.exe in Program Files
   - Should enumerate all VS installations
   - Should handle multiple VS versions (2019, 2022, etc.)

2. **MSBuild Detection:**
   - Should find MSBuild.exe for each VS installation
   - Should prefer newer versions
   - Should handle both Dev Command Prompt and direct paths

3. **Roslyn Detection:**
   - Should find Roslyn language server in VS installations
   - Should detect Microsoft.CodeAnalysis.LanguageServer.exe
   - Should support different VS editions (Community, Professional, Enterprise)

### **Error Scenarios to Test:**
1. **No Visual Studio installed** - Should gracefully handle and offer alternatives
2. **Corrupted VS installation** - Should skip and continue with other installations
3. **Missing MSBuild** - Should fallback to dotnet build
4. **Permission issues** - Should provide helpful error messages

## 📝 Testing Checklist

**Platform Detection:**
- [ ] Platform detected as 'windows'
- [ ] Visual Studio installations found automatically
- [ ] MSBuild paths detected correctly
- [ ] Roslyn language server found

**Installation Assistant:**
- [ ] Automatic tool check runs on activation
- [ ] Missing tools detected correctly
- [ ] Installation prompts are user-friendly
- [ ] OmniSharp installs via dotnet tool
- [ ] Manual installation guidance provided when needed

**UI Integration:**
- [ ] VS Tools Bridge appears in activity bar
- [ ] Tree views populate with real data
- [ ] Commands work from command palette
- [ ] Context menus appear on right-click
- [ ] Settings page opens correctly

**Functionality:**
- [ ] Projects detected in workspace
- [ ] Build commands execute successfully
- [ ] Language server activation works
- [ ] Provider switching works (Roslyn ↔ OmniSharp)
- [ ] Error handling is graceful

## 🐛 Common Issues & Solutions

### **Issue: "Platform detected as 'mac' on Windows"**
**Cause:** Platform factory logic error  
**Check:** `src/platform/PlatformServiceFactory.ts` - ensure `process.platform === 'win32'` works

### **Issue: "No Visual Studio installations found"**
**Cause:** vswhere.exe not found or execution failure  
**Check:** Windows platform service vswhere detection logic

### **Issue: "OmniSharp installation fails"**
**Cause:** dotnet tool installation permissions or path issues  
**Check:** Run VS Code as administrator, verify dotnet is in PATH

### **Issue: "Build commands don't work"**
**Cause:** MSBuild not found or wrong version  
**Check:** Developer Command Prompt vs direct MSBuild execution

## 📊 Success Criteria

### **Minimum Success (MVP):**
- Extension activates on Windows without errors
- Detects at least one Visual Studio installation
- Shows VS Tools Bridge in activity bar
- Can run setup wizard without crashes

### **Full Success (Production Ready):**
- All test scenarios pass
- Installation assistant works for missing tools
- Real Visual Studio integration working
- Build and project operations successful
- UI is fully functional and responsive

### **Exceptional Success (Exceeds Expectations):**
- Handles edge cases gracefully (no VS, corrupted installations)
- Performance is acceptable on older Windows systems
- All provider types work (Roslyn, OmniSharp, MSBuild)
- User experience is smooth and intuitive

## 📞 Escalation & Support

### **If You Hit Blockers:**
1. **Check Output Panel:** VS Tools Bridge channel for error details
2. **Enable Debug Logging:** Add `"vsToolsBridge.verboseLogging": true` to settings
3. **Test Components Separately:** Use individual commands to isolate issues
4. **Check Platform Detection:** Verify `src/platform/WindowsPlatformService.ts` logic

### **Documentation References:**
- `MANUAL_TESTING_GUIDE.md` - Detailed testing procedures
- `VALUE.md` - Expected functionality and value
- `src/platform/WindowsPlatformService.ts` - Windows-specific logic
- `src/services/InstallationAssistant.ts` - Installation system

### **Test Files Available:**
- `test-projects/` - Sample .NET projects for testing
- `test-real-macos.js` - Example of platform testing (adapt for Windows)

## 🎯 Handoff Success

**When testing is complete, this extension should:**
1. **Work seamlessly on Windows** with real Visual Studio
2. **Install missing tools automatically** when possible
3. **Provide guided setup** for complex scenarios
4. **Deliver professional .NET development experience** in VS Code

**This validates our core value proposition:** *"Transforms VS Code into a first-class .NET development environment that rivals Visual Studio."*

Good luck! The extension is architecturally sound and tested on macOS - Windows validation should confirm it works as designed across platforms. 🚀