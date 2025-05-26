---
trigger: always_on
---

# VS Tools Bridge - Quick Security Rules

## 🔴 NEVER Do This:

```typescript
// ❌ NEVER use exec() with string concatenation
exec(`msbuild ${projectPath}`)

// ❌ NEVER trust user input without validation
const path = userInput; // Could be ../../../etc/passwd

// ❌ NEVER hardcode sensitive data
const apiKey = "sk-1234567890";

// ❌ NEVER use eval() or Function()
eval(userProvidedCode);
```

## ✅ ALWAYS Do This:

```typescript
// ✅ ALWAYS use execFile() with array arguments
execFile('msbuild', [projectPath])

// ✅ ALWAYS validate paths are within workspace
if (!isPathInWorkspace(projectPath)) throw new Error();

// ✅ ALWAYS use configuration for sensitive data
const apiKey = config.get('apiKey');

// ✅ ALWAYS sanitize external input
const safe = sanitizeInput(userInput);
```

## Security Checklist for Every PR:

### 1. External Process Execution
- [ ] Using `execFile()` not `exec()`?
- [ ] Arguments passed as array not string?
- [ ] Binary path validated before execution?

### 2. Path Handling
- [ ] No `..` in paths?
- [ ] Paths normalized with `path.normalize()`?
- [ ] Paths checked to be within workspace?

### 3. User Input
- [ ] All user input validated?
- [ ] File extensions checked (.csproj/.sln only)?
- [ ] Special characters escaped?

### 4. Dependencies
- [ ] `npm audit` shows 0 vulnerabilities?
- [ ] All dependencies necessary?
- [ ] Using exact versions not ranges?

## Quick Validation Functions:

```typescript
// Copy-paste these into your security utils

function isValidProjectPath(p: string): boolean {
  const normalized = path.normalize(p);
  return !normalized.includes('..') && 
         normalized.match(/\.(csproj|sln)$/i) &&
         isInWorkspace(normalized);
}

function sanitizeArg(arg: string): string {
  // Remove shell metacharacters
  return arg.replace(/[;&|`$<>]/g, '');
}

function validateBinaryPath(p: string): boolean {
  // Must be in VS install directory
  const normalized = path.normalize(p);
  return normalized.includes('Microsoft Visual Studio');
}
```

## Before Every Release:

```bash
# Run these commands
npm audit --production
npm test -- --grep "security"
grep -r "exec(" src/  # Should return nothing
grep -r "process.env" src/  # Check each one
```

## Red Flags in Code Review:

1. **String concatenation in commands**: `${cmd} ${args}`
2. **Direct file system access**: `fs.readFileSync(userPath)`
3. **No try-catch on external operations**
4. **Accepting paths from outside workspace**
5. **Using `any` type for user input**

Remember: If it touches the file system or runs a process, it needs validation!