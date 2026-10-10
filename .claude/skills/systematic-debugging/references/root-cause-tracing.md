# Root Cause Tracing

## Overview

Bugs frequently manifest deep within call stacks (e.g., `git init` executed in an unintended directory, files created at corrupted paths). Patching the symptom where the error occurs is merely treating the symptom.

**Core Principle**: Backtrace the call chain to identify the original trigger and remediate the issue at the source.

## When to Apply

- Error occurs deep within an execution hierarchy (far from entry boundaries).
- Stack trace reveals an extensive call graph.
- Origin of corrupted or missing data is ambiguous.
- Need to identify which specific test or upstream caller triggered the failure.

## Backtracing Process

### 1. Observe the Symptom
```
Error: git init failed in ~/project/packages/core
```

### 2. Identify the Direct Cause
**What code directly executed the failing operation?**
```typescript
await execFileAsync('git', ['init'], { cwd: projectDir });
```

### 3. Trace the Callers
```typescript
WorktreeManager.createSessionWorktree(projectDir, sessionId)
  → Called by Session.initializeWorkspace()
  → Called by Session.create()
  → Called by Project.create() in test suite
```

### 4. Backtrace Parameter Values
**What value was passed down the stack?**
- `projectDir = ''` (Empty string!)
- An empty string for `cwd` resolves to `process.cwd()`
- Which happens to be the project source directory!

### 5. Locate the Initial Trigger
**Where did the empty string originate?**
```typescript
const context = setupCoreTest(); // Returns { tempDir: '' }
Project.create('name', context.tempDir); // Accessed prior to beforeEach hook!
```

## Adding Stack Instrumentation

When manual tracing is ambiguous, insert targeted diagnostic telemetry:

```typescript
// Place immediately before the problematic operation
async function gitInit(directory: string) {
  const stack = new Error().stack;
  console.error('DEBUG git init:', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  await execFileAsync('git', ['init'], { cwd: directory });
}
```

- **In Tests**: Use `console.error()` directly (structured loggers may be suppressed).
- **Before Operation**: Log immediately *prior* to risky operations, not only upon failure.
- **Capture Full Context**: Log target directory, working directory (`cwd`), environment variables, and timestamps.

## Core Principle

**Never patch only the line where the error surfaces.** Backtrace through the call chain until the root initiating trigger is isolated.

Following remediation, implement multi-layer validation per `references/defense-in-depth.md`.
