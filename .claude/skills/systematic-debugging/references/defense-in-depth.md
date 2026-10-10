# Defense-in-Depth Validation (Multi-Layer Verification)

## Overview

When fixing a bug, adding a validation check at a single point often feels sufficient. However, a single check can easily be bypassed through alternative code paths, refactoring, or test mocks.

**Core Principle**: Enforce validation across **every layer** that data traverses. Make the bug structurally impossible to reoccur.

## Why Multi-Layer Defense?

- Single Validation: "Fixed the bug."
- Multi-Layer Defense: "Made the bug structurally impossible."

Each layer catches distinct classes of failures:
- Entry point validation catches the vast majority of invalid inputs.
- Business logic guards catch subtle domain edge cases.
- Environment guards prevent dangerous operations in specific runtime contexts.
- Debug telemetry enables rapid forensic analysis when outer layers fail.

## The 4 Validation Layers

### Layer 1: Entry Point Validation
**Purpose**: Reject blatantly invalid inputs at external API boundaries.

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
}
```

### Layer 2: Business Logic Validation
**Purpose**: Ensure domain state and preconditions are valid for the specific operation.

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
}
```

### Layer 3: Environment Guards
**Purpose**: Prevent high-risk side effects in specific execution environments (e.g., test vs. production).

```typescript
async function gitInit(directory: string) {
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));
    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
}
```

### Layer 4: Debug Instrumentation
**Purpose**: Capture forensic telemetry when unexpected state reaches deep execution paths.

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', { directory, cwd: process.cwd(), stack });
}
```

## Application Workflow

When remediating a bug:

1. **Trace Data Flow** — Where did the corrupted value originate, and where is it consumed?
2. **Map Checkpoints** — Enumerate every layer through which the data passes.
3. **Add Multi-Layer Guards** — Implement checks across entry, business, environment, and debug layers.
4. **Test Each Layer Independently** — Verify that Layer 2 catches defects even if Layer 1 is artificially bypassed.

## Summary

All 4 layers are essential. Across testing and production, each layer catches bugs missed by the others:
- Alternative code paths bypass outer entry validations.
- Mocking in unit tests bypasses business logic checks.
- Cross-platform edge cases require explicit environment guards.
- Debug telemetry pinpoints structural misuse across distributed workflows.

**Never stop at a single checkpoint.** Build defense-in-depth across the entire execution chain.
