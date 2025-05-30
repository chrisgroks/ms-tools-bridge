# Windows Testing Findings - .NET Tools Bridge

## Test 1: Extension Activation & New Branding (Initial Findings)

**Date:** 2025-05-30

### Overall Status:
- Extension activates on Windows.
- New branding ".NET Tools Bridge" is mostly applied in logs.
- Several critical issues related to configuration, tool detection, and dependencies need to be addressed.

### Detailed Findings:

#### 1. Branding & Platform:
*   **Branding in Logs:** **PASS**
    *   Output channel correctly named ".NET Tools Bridge".
    *   Activation messages use the new branding: `".NET Tools Bridge is activating..."` and `".NET Tools Bridge activated successfully"`.
*   **Platform Detection:** **PASS**
    *   Correctly identified `Platform: windows`.

#### 2. Configuration & Setup Issues:

#### 3. Language/Tool Provider Issues:
*   **Roslyn Language Server:** **FAIL**
    *   Log: `"Custom Roslyn path set to 'C:\\fake\\roslyn.exe', but file was not found. Falling back to auto-detection."`
        *   **Analysis:** An invalid custom path for Roslyn is present in user/workspace settings. This should be cleared.
    *   Log: `"Roslyn not found in Visual Studio Community 2022"`
    *   Log: `"Language provider 'roslyn' is not available"`
        *   **Analysis:** Even after attempting auto-detection, Roslyn could not be located within the VS Community 2022 installation. This needs investigation; Roslyn should be available with a standard .NET development workload in VS.
        *   **UI Discrepancy:** The extension's UI (Providers window > Language Providers tab) reportedly shows Roslyn as "Available", which contradicts the activation logs stating it's "not available". This needs investigation to ensure the UI accurately reflects the provider's true status.
*   **OmniSharp Language Server:** **FAIL (Expected on clean Windows without manual setup)**
    *   Log: `"OmniSharp not found. You can install it as a global .NET tool: dotnet tool install -g omnisharp"`
    *   Log: `"Language provider 'omnisharp' is not available"`
    *   **Analysis:** This is expected if OmniSharp hasn't been manually installed. The extension correctly identifies its absence.
*   **Mono Debug Provider:** **FAIL (Expected on Windows)**
    *   Log: `"Debug provider 'mono' is not available"`
    *   **Analysis:** Mono is typically not the primary debugger on Windows for .NET Framework projects; VS Handoff is preferred for UI apps, and .NET SDK's debugger for console apps. Its absence here is likely not a critical issue for Windows-specific testing unless testing a Mono-specific scenario.

#### 4. Registered Providers (from logs):
*   The following providers were reported as "Registered":
    *   Roslyn Language Server (but subsequently failed to activate)
    *   OmniSharp Language Server (but subsequently failed to activate)
    *   MSBuild (Activated)
    *   Mono Debugger (but subsequently failed to activate)

### UI/UX Notes & Recommendations:
*   **Command Palette vs. UI Invocation:**
    *   Commands like ".NET Tools Bridge: Check Missing Tools", ".NET Tools Bridge: Setup Wizard", etc., are currently available via the Command Palette.
    *   **Recommendation:** Consider adding more direct UI entry points for these key commands (e.g., buttons within the extension's Activity Bar views or context menus) to improve discoverability and ease of use.
*   **Provider Status Accuracy:** Ensure the UI in the "Providers" view (especially for language providers like Roslyn) accurately reflects their actual status (e.g., "Available", "Not Found", "Error") as determined during activation and runtime. There's a reported discrepancy for Roslyn.

### Next Steps:
1.  **Complete `package.json` Rebranding:** Update all `vsToolsBridge` prefixes to `dotnetToolsBridge` to resolve configuration registration warnings.
2.  **Install .NET SDK:** Ensure the .NET SDK is installed on the Windows test machine.
3.  **Investigate Roslyn Detection:**
    *   Clear any custom Roslyn paths from VS Code/Windsurf settings.
    *   Verify the Visual Studio Community 2022 installation includes the necessary .NET desktop development or ASP.NET workloads that provide Roslyn.
    *   Debug why auto-detection is failing to find Roslyn.
4.  Retest extension activation after addressing the above.

## Test 2: Installation Assistant UI/UX Improvements

**Date:** 2025-05-30

### Overall Status:
- Improvements to the optional tool prompting and C# extension installation flow have been implemented and tested successfully.

### Detailed Findings:

*   **Optional Tool Prompting:** **PASS**
    *   When multiple optional tools are suggested (e.g., C# extensions if Roslyn is not active), the prompt for the first optional tool now correctly includes a "View Other Optional Tools" button.
    *   Clicking "View Other Optional Tools" successfully triggers the `selectiveInstall` method, presenting a quick pick list of all available optional tools. This addresses the previous limitation of only seeing one optional tool at a time.

*   **C# Extension Installation Flow:** **PASS**
    *   The `MissingTool` interface now includes an `extensionId` field, which has been populated for `muhammad-sammy.csharp` and `ms-dotnettools.csharp`.
    *   When selecting "Install [Tool Name]" for a C# extension from the `InstallationAssistant` prompts, the `guidedInstall` method now uses `vscode.commands.executeCommand('workbench.extensions.search', '@id:[extensionId]')`.
    *   This successfully opens the specific C# extension directly in the VS Code Extensions view, allowing the user to click the final "Install" button there. This is a smoother experience than manually searching.

### UI/UX Notes & Recommendations:
*   The current flow for optional tools (prompt first, then option to see all) is a good improvement.
*   The direct opening of extensions in the marketplace view is effective.

### Next Steps:
*   Continue monitoring `InstallationAssistant` behavior with various tool availability scenarios.
