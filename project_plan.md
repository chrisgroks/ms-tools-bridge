# Project Plan: .NET Framework Tools Bridge Extension for Open VSX

## 1. Project Goal

To create an Open VSX extension that enables .NET Framework 4.x development (compiling, language services, debugging) within VS Code-compatible IDEs (like Windsurf) by bridging to existing, user-installed Visual Studio tools. This approach aims to respect Microsoft's licensing by not redistributing proprietary tools but rather invoking them from the user's licensed installation.

## 2. Core Philosophy

*   **Leverage Existing Installations:** The extension will rely on the user having a licensed copy of Visual Studio or Visual Studio Build Tools installed.
*   **No Redistribution:** No proprietary Microsoft binaries will be packaged or redistributed by the extension.
*   **VS Code Compatibility:** The extension will be developed as a standard VS Code extension, aiming for compatibility with forks like Windsurf.
*   **Debugging Priority:**
    1.  Utilize an official Microsoft .NET Framework debugger (e.g., `vsdbg` or similar) if it can be legally and technically invoked from the user's VS installation to work within VS Code/Windsurf.
    2.  Fallback to Mono's Soft-Debugger for applicable project types (console/services).
    3.  As a final option, provide a "deep-link" to open the project in Visual Studio for debugging.

## 3. Key Features to Implement

*   **Tool Discovery:**
    *   Locate Visual Studio / VS Build Tools installations (e.g., using `vswhere.exe`).
    *   Identify paths to `MSBuild.exe`, .NET Framework reference assemblies, and the Roslyn Language Server binaries.
    *   Identify the path to the .NET Framework debugger (`vsdbg` or equivalent).
*   **Build Integration:**
    *   Invoke the located `MSBuild.exe` for building .NET Framework projects (`.csproj`, `.sln`).
    *   Display build output and errors within the IDE.
*   **Language Services (IntelliSense):**
    *   Configure and launch the Roslyn Language Server from the user's Visual Studio installation to provide C# language features (IntelliSense, diagnostics, navigation).
*   **Debugging Integration:**
    *   Implement a Debug Adapter that attempts to use the official .NET Framework debugger.
    *   If the official debugger isn't feasible, implement support for Mono's Soft-Debugger.
    *   Optionally, implement a command to open the current solution in Visual Studio for debugging.

## 4. Development Phases

### Phase 1: Research & Feasibility (Critical)

*   **1.1. Debugger Investigation:**
    *   **Primary Goal:** Determine if `vsdbg.exe` (the .NET Framework debugger used by VS Code's C# extension) or a similar official debugger component can be legally and technically invoked by our extension if it's found in an existing Visual Studio installation.
    *   Analyze how `ms-dotnettools.csharp` historically integrated `vsdbg` for .NET Framework.
    *   Research VS Code Debug Adapter Protocol (DAP) requirements for .NET Framework.
*   **1.2. Licensing Deep Dive:**
    *   Thoroughly review Visual Studio, VS Build Tools, and `vsdbg` EULAs. Confirm the interpretation that licensed users can "build and test your applications" extends to invoking the debugger from an external process (our extension) without redistribution.
*   **1.3. Tooling & API Familiarization:**
    *   VS Code Extension API for:
        *   Running external processes (`vswhere`, `MSBuild`, debugger).
        *   Language Server Protocol (LSP) client implementation.
        *   Debug Adapter Protocol (DAP) implementation.
        *   Workspace configuration and settings.

### Phase 2: Extension Architecture & Core Setup

*   **2.1. Project Initialization:**
    *   Set up the Open VSX extension project structure.
    *   Add basic manifest (`package.json`) details.
*   **2.2. Tool Locator Module:**
    *   Implement robust discovery of Visual Studio installations using `vswhere.exe`.
    *   Develop logic to reliably find paths to:
        *   `MSBuild.exe`
        *   Roslyn Language Server binaries (e.g., `Microsoft.CodeAnalysis.LanguageServer.dll`)
        *   .NET Framework Reference Assemblies
        *   The target debugger executable (identified in Phase 1.1).
    *   Provide user settings for manual path overrides if auto-detection fails.

### Phase 3: Build System Integration

*   **3.1. MSBuild Invocation:**
    *   Create commands/tasks to trigger .NET Framework builds using the located `MSBuild.exe`.
    *   Handle different build configurations (Debug, Release).
    *   Parse and display build output and errors in the IDE's output panels or terminal.
*   **3.2. Project System Awareness (Basic):**
    *   Ability to identify `.csproj` and `.sln` files to provide context for build commands.

### Phase 4: Language Server (Roslyn) Integration

*   **4.1. LSP Client:**
    *   Implement the client-side logic to start and communicate with the Roslyn Language Server found in the user's VS installation.
    *   Configure the LSP for C# files in .NET Framework projects.
*   **4.2. Testing:**
    *   Verify IntelliSense, code completion, error highlighting, go-to-definition for .NET Framework projects.

### Phase 5: Debugger Integration

*   **5.1. Official Debugger (Primary Attempt):**
    *   Based on Phase 1.1 findings: If feasible, implement a Debug Adapter that launches and communicates with the official .NET Framework debugger (`vsdbg` or equivalent).
    *   Test core debugging features: breakpoints, stepping, variable inspection, call stack.
*   **5.2. Mono Soft-Debugger (Fallback 1):**
    *   If 5.1 is not viable: Implement a Debug Adapter for Mono's Soft-Debugger.
    *   Focus on console applications and services.
    *   Document limitations (e.g., GUI, Edit-and-Continue).
*   **5.3. Visual Studio Handoff (Fallback 2):**
    *   Implement a command to open the current solution/project in the user's Visual Studio installation at the current file/line for debugging.

### Phase 6: User Experience, Packaging & Testing

*   **6.1. Commands & Configuration:**
    *   Define clear VS Code commands for build, clean, debug.
    *   Implement comprehensive user settings for paths, debugger preferences, etc.
*   **6.2. Documentation:**
    *   Create a detailed `README.md` with installation, configuration, usage instructions, and troubleshooting tips.
    *   Clearly state licensing prerequisites (user must have VS installed).
*   **6.3. Testing:**
    *   Test with various .NET Framework project types (Console, Class Library, Web (basic), etc.).
    *   Test on different Windows environments with different Visual Studio versions.
*   **6.4. Packaging:**
    *   Prepare the extension for publishing to the Open VSX registry.

## 5. Potential Challenges & Risks

*   **Debugger Legality/Technical Feasibility:** The success of the preferred debugging approach (using official VS debugger) is highly dependent on Phase 1 research.
*   **Roslyn LSP Compatibility:** Ensuring the version of Roslyn LSP found in user's VS installation works smoothly.
*   **Complexity of .NET Framework Builds:** MSBuild for .NET Framework can be complex with custom targets and properties.
*   **Maintenance:** Changes in Visual Studio structure or tool paths might break the extension.
*   **GUI Applications:** Debugging and running GUI applications (WinForms, WPF) might have significant limitations, especially with Mono. This should be clearly communicated.

## 6. Technology Stack

*   TypeScript for the extension code.
*   VS Code Extension API.
*   Node.js for utility scripts if needed.
