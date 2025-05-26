# VS Tools Bridge

VS Tools Bridge is a VS Code extension that enables .NET Framework development in Windsurf by bridging to Visual Studio's Roslyn language server and MSBuild.

## Features

- **Roslyn Language Server Integration**: Full IntelliSense support for .NET Framework projects using Visual Studio's Roslyn language server
- **MSBuild Integration**: Build, clean, and restore .NET Framework projects using MSBuild from Visual Studio
- **Mono Debugger Support**: Basic debugging capabilities using the Mono debugger
- **Modular Architecture**: Easily extensible to support additional language servers, build systems, and debuggers in the future

## Requirements

### Windows (Primary Development)
- Visual Studio 2019 or 2022 (Community, Professional, or Enterprise)
- .NET Framework 4.8 or later
- Mono debugger (optional, for debugging support)

### macOS (Development with Mocks)
- No Visual Studio required - uses mock implementations for development and testing

## Installation

1. Install the extension from the VS Code marketplace (when published)
2. Open a .NET Framework project (`.csproj` or `.sln` file)
3. The extension will automatically detect Visual Studio installations and activate

## Usage

### Commands

- **VS Tools Bridge: Select Visual Studio Version** - Choose which Visual Studio installation to use
- **VS Tools Bridge: Restart Language Server** - Restart the Roslyn language server

### Configuration

- `vsToolsBridge.preferredVSVersion`: Preferred Visual Studio version (default: "latest")
- `vsToolsBridge.enableLogging`: Enable detailed logging for debugging (default: false)
- `vsToolsBridge.autoRestart`: Automatically restart language server on crash (default: true)

## Architecture

VS Tools Bridge uses a modular provider system:

### Language Providers
- **Roslyn Provider**: Uses Visual Studio's Roslyn language server for C# IntelliSense
- Future: OmniSharp support

### Build Providers
- **MSBuild Provider**: Uses MSBuild from Visual Studio installations
- Future: Other build systems

### Debug Providers
- **Mono Provider**: Uses Mono debugger for .NET Framework debugging
- Future: Other debuggers

### Platform Abstraction
- **Windows Platform Service**: Real implementation using vswhere.exe and Visual Studio
- **Mock Platform Service**: Mock implementation for Mac development and testing

## Limitations

### What Works
✅ Roslyn IntelliSense for .NET Framework projects  
✅ MSBuild compilation  
✅ Basic Mono debugging  
✅ Project file parsing  
✅ Visual Studio detection  

### What Doesn't Work
❌ Visual Studio debugger (vsdbg) - not legally allowed  
❌ VS Code extension marketplace content - not legally allowed  
❌ Advanced debugging features  
❌ Hot reload/Edit and Continue  

## Legal Compliance

This extension only uses the following Microsoft components:
- MSBuild.exe from Visual Studio installations
- vswhere.exe for detecting Visual Studio
- Roslyn language server binaries from Visual Studio
- .NET Framework reference assemblies

The extension does NOT use:
- Visual Studio debugger (vsdbg)
- Any Microsoft VS Code extensions
- Any other proprietary Visual Studio components

## Development

### Setup
```bash
git clone <repository>
cd vs-tools-bridge
npm install
```

### Building
```bash
npm run compile
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Packaging
```bash
npm run package
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

[Insert appropriate license here]

## Support

For issues and feature requests, please use the GitHub issue tracker.