# Security Vulnerability Report - ms-tools-bridge

Date: 2025-05-30

This report summarizes the findings from `npm audit` and relevant project memories regarding package vulnerabilities.

## 1. xml2js Vulnerability

*   **Package:** `xml2js`
*   **Severity:** Moderate
*   **Issue:** Prototype pollution (details: [GHSA-776f-qx25-q3cc](https://github.com/advisories/GHSA-776f-qx25-q3cc))
*   **Affected Versions:** `<0.5.0`
*   **Note:** This vulnerability is present in the version of `xml2js` currently used as a dependency.

## 2. vsce Dependency and Deprecation

*   **Package:** `vsce`
*   **Issue:**
    *   Depends on a vulnerable version of `xml2js`.
    *   The package `vsce` is deprecated and should be replaced by `@vscode/vsce`. This is noted in project memory `77e25169-ffbd-406f-a311-7527ad693f51`.
*   **Current Version in `package-lock.json` (if `npm install` was run before audit):** (The audit output implies `vsce` is present)

## Recommended Actions

1.  **Replace `vsce` with `@vscode/vsce`:**
    *   Uninstall the old `vsce`: `npm uninstall vsce`
    *   Install the new package: `npm install @vscode/vsce --save-dev`
2.  **Address `xml2js` vulnerability:**
    *   After updating `vsce`, run `npm audit` again to see if the `xml2js` issue is resolved by `@vscode/vsce` using a patched version.
    *   If the vulnerability persists, `npm audit fix` or `npm audit fix --force` might be necessary. The latter was suggested by the audit report and indicated it would install `vsce@1.97.0` (a breaking change if `vsce` wasn't already updated to `@vscode/vsce`). It's preferable to update `vsce` first as this might resolve the transitive dependency on the vulnerable `xml2js` version.

## Next Steps

Please review this report. We can proceed with the recommended actions to update the packages and mitigate the vulnerabilities when you're ready.



Noticed issues: When running refresh via clicking the refresh and settings icons in the provider ui panel: Error running command vsToolsBridge.refreshProviders: command 'vsToolsBridge.refreshProviders' not found. This is likely caused by the extension that contributes vsToolsBridge.refreshProviders.

And when I tried to open settings: Error running command vsToolsBridge.openSettings: command 'vsToolsBridge.openSettings' not found. This is likely caused by the extension that contributes vsToolsBridge.openSettings.



## Roslyn Language Server Detection Investigation (Test 1 Follow-up)

Date: 2025-05-30

**Objective:** Investigate why the Roslyn Language Server was not being detected by the VS Tools Bridge extension, despite Visual Studio 2022 Community being installed. 
**Initial State & Logs (from Extension Development Host):**
*   Platform correctly detected as `windows`.
*   MSBuild provider activated successfully.
*   Log message: `Custom Roslyn path set to 'C:\fake\roslyn.exe', but file was not found. Falling back to auto-detection.`
    *   **Recommendation:** Clear the `vsToolsBridge.roslynPath` setting in VS Code/Windsurf `settings.json` if it points to a non-existent path like `C:\fake\roslyn.exe`.
*   Log message: `Roslyn not found in Visual Studio Community 2022`
*   Log message: `Language provider 'roslyn' is not available`

**Investigation Steps & Findings:**

1.  **Expected Executable:** The extension (specifically `WindowsPlatformService.ts`) searches for `Microsoft.CodeAnalysis.LanguageServer.exe`.
2.  **Initial Search by User:** User confirmed that `Microsoft.CodeAnalysis.LanguageServer.exe` was not found in the standard paths checked by the extension, even with ".NET desktop development" and ".NET Framework 4.8.1 development tools" workloads installed. 
3.  **Additional VS Workloads Installed:** User installed additional Visual Studio workloads (e.g., "ASP.NET and web development", ".NET Core cross-platform development") to attempt to get the required Roslyn executable.
4.  **Post-Workload Installation - Logs:** After restarting the Extension Development Host, the logs remained the same, still indicating `Roslyn not found in Visual Studio Community 2022`.
5.  **Post-Workload Installation - Manual File Search by User:** User performed a manual search and found new Roslyn-related executables, notably:
    *   `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\ServiceHub\Hosts\ServiceHub.Host.AnyCPU\ServiceHub.RoslynCodeAnalysisService.exe`
    *   `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\ServiceHub\Hosts\ServiceHub.Host.dotnet.x64\ServiceHub.RoslynCodeAnalysisService.exe`
    *   And other related files under `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\ServiceHub\Hosts\` and `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\Extensions\5azeavgy.ezz\` (Roslyn SDK).

**Conclusion & Next Steps (for Roslyn Detection):**

*   The VS Tools Bridge extension currently only searches for `Microsoft.CodeAnalysis.LanguageServer.exe` in a predefined set of paths.
*   With the user's current Visual Studio 2022 Community configuration (even after adding more workloads), the primary Roslyn language service executable appears to be `ServiceHub.RoslynCodeAnalysisService.exe`, located in different paths than those currently checked for `Microsoft.CodeAnalysis.LanguageServer.exe`.
*   To enable Roslyn support for this setup, the extension's `WindowsPlatformService.ts` would need to be updated to:
    1.  Also search for `ServiceHub.RoslynCodeAnalysisService.exe`.
    2.  Include the new paths (e.g., `Common7\ServiceHub\Hosts\ServiceHub.Host.AnyCPU\` and `Common7\ServiceHub\Hosts\ServiceHub.Host.dotnet.x64\`) in its search logic for Roslyn.
*   This finding is critical for ensuring Roslyn support on Windows with common VS 2022 Community configurations.

## Test 2: Installation Assistant - First Run Experience (and Command Registration Issues)

Date: 2025-05-30

**Objective:** Verify that the Installation Assistant provides notifications for missing tools and that its commands are functional.

**Findings & Observations:**

1.  **No Automatic Notifications:** Upon fresh activation of the extension in the Extension Development Host, the Installation Assistant did not automatically display any notifications regarding missing tools (e.g., OmniSharp, .NET SDK), which was the expected behavior if tools were deemed missing.

2.  **"Command Not Found" Errors:**
    *   Attempting to manually trigger the tool check via the command palette using "VS Tools Bridge: Check Missing Tools" resulted in a VS Code error popup: `command 'vsToolsBridge.checkMissingTools' not found.`
    *   Similar "command not found" errors were previously observed for `vsToolsBridge.refreshProviders` and `vsToolsBridge.openSettings` when trying to interact with the UI elements in the custom view panel.

3.  **Command Definition in `package.json`:**
    *   A review of `package.json` confirmed that `vsToolsBridge.checkMissingTools`, `vsToolsBridge.refreshProviders`, and `vsToolsBridge.openSettings` are correctly defined within the `contributes.commands` section.

4.  **Command Registration in `extension.ts`:**
    *   The `src/extension.ts` file includes a `registerCommands` function that is called during the `activate` process.
    *   This function contains `vscode.commands.registerCommand(...)` calls for all the aforementioned commands.
    *   The "VS Tools Bridge" output channel logs indicated "VS Tools Bridge activated successfully," suggesting that the `activate` function completed without catastrophic errors before `registerCommands` was called.

5.  **Potential Issue in `context.subscriptions.push()`:**
    *   A detailed examination of the `registerCommands` function in `src/extension.ts` revealed that the disposables returned by `vscode.commands.registerCommand` for `checkMissingToolsCommand`, `setupWizardCommand`, and `installToolCommand` might not have been correctly or completely added to the `context.subscriptions.push()` array at the end of the function. There appeared to be some discrepancies or omissions in how these commands were being added to the subscriptions list.
    *   This was identified as the most probable cause for the "command not found" errors, as commands registered but not properly subscribed might become unavailable.
    *   A fix was attempted but then deferred by the user in favor of documenting the current findings.

**Conclusion for Test 2:** The Installation Assistant is not functioning as expected, primarily due to underlying issues with command registration that prevent its core commands (and other UI-related commands) from being accessible. The root cause appears to be related to how command disposables are managed in `context.subscriptions` within `src/extension.ts`.

## Test 3: OmniSharp Installation via Assistant

Date: 2025-05-30

**Objective:** Verify that the Installation Assistant can detect missing OmniSharp and offer to install it, and that the installation command (`dotnet tool install -g omnisharp`) functions correctly when triggered by the assistant.

**Setup:**

*   Ensured OmniSharp was not globally installed by running `dotnet tool list -g | findstr omnisharp`. The command exited with code 1 and no output, confirming OmniSharp was not present.

**Findings & Observations:**

1.  **"Command Not Found" Error (Repeated):**
    *   Upon attempting to run the command "VS Tools Bridge: Check Missing Tools" from the command palette in the Extension Development Host, the same error as observed in Test 2 occurred: a VS Code error popup stated `command 'vsToolsBridge.checkMissingTools' not found.`
    *   No new output appeared in the "VS Tools Bridge" output channel beyond the initial activation logs.

**Conclusion for Test 3:** This test could not proceed to verify OmniSharp detection and installation by the Installation Assistant. The prerequisite command `vsToolsBridge.checkMissingTools` is still inaccessible due to the command registration issues identified in Test 2 (related to `context.subscriptions` in `src/extension.ts`). Until the command registration is fixed, the Installation Assistant's functionality for OmniSharp (and likely other tools) cannot be tested.
