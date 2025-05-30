# .NET Tools Bridge

> Transform Windsurf into a powerful .NET Framework development environment

.NET Tools Bridge is a comprehensive Windsurf extension that bridges the gap between modern code editors and .NET Framework development by integrating the best available language servers, build tools, and debuggers.

## 🎯 Why .NET Tools Bridge?

**.NET Framework development in modern editors has been fragmented and unreliable.** This extension solves that by:

- **🔍 Automatically detecting and configuring** .NET development tools
- **⚡ Providing intelligent fallbacks** when tools are missing
- **🛠️ Offering guided installation** for missing components
- **🔧 Supporting multiple language servers** (Roslyn, OmniSharp) based on availability
- **📦 Working across platforms** with appropriate tool detection

Instead of cryptic "tool not found" errors, you get **one-click setup** and **clear guidance**.

## 🏗️ Architecture & Components

### Language Servers (IntelliSense)
Our **priority order** for C# language support:

1. **🥇 C# Extension (muhammad-sammy)** - *Recommended*
   - Comprehensive C# support with OmniSharp integration
   - Available on Open VSX marketplace
   - Better compatibility with non-Microsoft editors

2. **🥈 Microsoft C# Extension** - *Fallback*
   - Official Microsoft extension with OmniSharp
   - Full-featured but Microsoft marketplace dependent

3. **🥉 Standalone OmniSharp** - *Last Resort*
   - Command-line OmniSharp installation via `dotnet tool`
   - Manual setup required but universally compatible

4. **🎯 Roslyn Language Server** - *Windows Only*
   - Uses Visual Studio's actual Roslyn language server
   - Premium experience with full .NET Framework support
   - Automatically detected from VS installations

### Build Systems
- **MSBuild** - Primary build system, detected from:
  - Visual Studio installations (Windows)
  - `dotnet build` command (cross-platform)
  - Mono MSBuild (macOS/Linux)

### Debugging
- **Mono Debugger** - Cross-platform .NET Framework debugging
- **Built-in .NET Debugger** - For modern .NET projects

### Platform Detection
- **Windows**: Real Visual Studio integration via `vswhere.exe`
- **macOS/Linux**: Intelligent tool detection and virtual VS environments

## 🚀 Getting Started

### Quick Installation
1. Install .NET Tools Bridge extension
2. Open any .NET project (`.csproj`, `.sln`)
3. **Follow the setup wizard** - it will detect and install missing tools automatically

### Manual Setup
If you prefer manual control:
```bash
# Install .NET SDK (if not present)
# Download from: https://dotnet.microsoft.com/download

# Install OmniSharp globally (fallback option)
dotnet tool install -g omnisharp

# Install recommended C# extension (in Windsurf)
# Search: "muhammad-sammy.csharp"
```

## 🔧 Our Recommendations

### For Open Source / Cross-Platform Development
**Use**: C# Extension by muhammad-sammy + OmniSharp
- ✅ Open VSX compatible
- ✅ No Microsoft marketplace dependency  
- ✅ Excellent C# support
- ✅ Works everywhere

### For Windows + Visual Studio Users
**Use**: Roslyn Language Server (automatically detected)
- ✅ Premium IntelliSense experience
- ✅ Full .NET Framework support
- ✅ Same engine as Visual Studio
- ✅ Zero configuration required

### For Corporate/Restricted Environments
**Use**: Standalone OmniSharp installation
- ✅ No extension marketplace required
- ✅ Command-line installation
- ✅ Predictable and controlled

## 📋 Commands

All commands start with `.NET Tools Bridge:`:

| Command | Description |
|---------|-------------|
| **Setup Wizard** | Interactive setup for missing tools |
| **Check Missing Tools** | Scan and report missing development tools |
| **Install .NET Tools** | Install missing tools automatically where possible |
| **Build Project** | Build project using MSBuild |
| **Clean Project** | Clean build outputs |
| **Restore Project** | Restore NuGet packages |
| **Select Visual Studio Version** | Choose VS installation (Windows) |
| **Restart Language Server** | Restart active language server |
| **Configure Custom Tool Paths** | Set custom paths for tools |

## ⚙️ Configuration

```jsonc
{
  // Language server preference
  "vsToolsBridge.languageProviderPreference": "auto", // "auto" | "roslyn" | "omnisharp"
  
  // Visual Studio selection (Windows)
  "vsToolsBridge.preferredVSVersion": "latest", // "latest" | "2022" | "2019" | specific version
  
  // Custom tool paths (optional)
  "vsToolsBridge.customRoslynPath": "", // Path to Microsoft.CodeAnalysis.LanguageServer.exe
  "vsToolsBridge.customMSBuildPath": "", // Path to MSBuild.exe
  "vsToolsBridge.customOmniSharpPath": "", // Path to OmniSharp executable
  
  // Behavior
  "vsToolsBridge.autoRestart": true, // Auto-restart language server on crash
  "vsToolsBridge.skipSetupCheck": false, // Skip automatic setup check
  "vsToolsBridge.enableLogging": false // Enable verbose logging
}
```

## 🔍 Tool Detection Logic

### Windows
1. **Visual Studio Detection**: Uses `vswhere.exe` to find all VS installations
2. **Roslyn Discovery**: Searches VS installations for `Microsoft.CodeAnalysis.LanguageServer.exe`
3. **MSBuild Discovery**: Locates MSBuild in VS installations (Current → 17.0 → 16.0 → 15.0)
4. **Extension Fallback**: Suggests C# extensions if Roslyn unavailable

### macOS/Linux  
1. **Tool Discovery**: Searches common paths for `dotnet`, `mono`, `omnisharp`
2. **Extension Priority**: Prioritizes Open VSX compatible extensions
3. **Package Manager Integration**: Suggests Homebrew/apt installations where appropriate

## 🎭 Cross-Platform Strategy

| Platform | Primary Language Server | Build System | Debugger |
|----------|------------------------|--------------|----------|
| **Windows** | Roslyn → OmniSharp | MSBuild (VS) | Mono |
| **macOS** | OmniSharp → Extensions | dotnet build | Mono |
| **Linux** | OmniSharp → Extensions | dotnet build | Mono |

## ⚡ Installation Assistant

The **Installation Assistant** is our killer feature:

### Automatic Detection
- Scans system for .NET SDK, language servers, build tools
- Identifies missing components with **clear explanations**
- Provides **multiple installation options** ranked by preference

### Guided Installation  
- **One-click installs** where possible (`dotnet tool install`)
- **Step-by-step instructions** for manual installations
- **Marketplace links** for extension installations
- **Cancellable operations** with proper progress feedback

### Smart Recommendations
- **Prioritizes Open VSX** extensions over Microsoft marketplace
- **Suggests appropriate tools** based on platform and existing setup
- **Explains tradeoffs** between different options

## 🛠️ Development & Testing

### Local Development
```bash
git clone <repository>
cd dotnet-tools-bridge
npm install
npm run compile
```

### Testing
```bash
npm test                 # Run all tests
npm run lint            # Code quality checks
F5 in Windsurf         # Launch Extension Development Host
```

### Manual Testing Scenarios
1. **Fresh system** - No .NET tools installed
2. **Partial setup** - Some tools missing
3. **Corporate environment** - Restricted marketplace access
4. **Multiple VS versions** - Version selection logic
5. **Cross-platform** - macOS/Linux compatibility

## 🏆 Success Criteria

### ✅ Working Extension Should:
- Detect platform correctly (Windows/macOS/Linux)
- Find Visual Studio installations (Windows)
- Suggest appropriate C# extensions in preference order
- Install OmniSharp automatically when possible
- Provide cancellable installation progress
- Handle missing tools gracefully with clear guidance
- Support custom tool paths for corporate environments

### ❌ Common Issues Fixed:
- "Command not found" errors → **Clear installation guidance**
- Missing Roslyn → **Automatic OmniSharp fallback**
- Hanging installations → **Cancellable progress dialogs**
- Platform confusion → **Smart platform-specific recommendations**
- Complex setup → **One-click installation assistant**

## 🔮 Future Enhancements

- **Additional Language Servers**: Support for other .NET language servers
- **Build System Expansion**: Support for other build tools (Cake, FAKE)
- **Enhanced Debugging**: Integration with additional debuggers
- **Project Templates**: Scaffolding for common .NET Framework projects
- **Performance Monitoring**: Language server performance tracking

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and community support
- **Documentation**: Check this README and inline code documentation

---

*Making .NET Framework development in Windsurf **just work** ™*