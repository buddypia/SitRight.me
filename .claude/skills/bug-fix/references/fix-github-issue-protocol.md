# Fix GitHub Issue Protocol

> **Related Skill**: bug-fix, systematic-debugging

## Purpose

A 7-step structured workflow for analyzing and fixing GitHub issues.
The `bug-fix` skill references this protocol when invoked with the `--issue <number>` argument.

## 7-Step Protocol

### Step 1: Issue Analysis

```bash
gh issue view <ISSUE_NUMBER> --json title,body,labels,comments
```

Read title, body, labels, and comments of the issue to understand the problem.

### Step 2: Root Cause Discovery (Linked with systematic-debugging Phase 1)

> **Iron Law**: Always identify the root cause before modifying code.

Explore the codebase based on symptoms reported in the issue:

1. Extract keywords from error messages / stack traces
2. Locate relevant code locations via `Grep`
3. Understand code execution flow via `Read`
4. Formulate hypothesis → Gather evidence → Validate hypothesis (systematic-debugging 4-Phase)

### Step 3: Implement Fix

Proceed with fix only after root cause is verified:

- **Dynamic Scope Lock** (R-CM-017 #4): Limit edit targets strictly to the affected module once blast radius is identified
- If changes span 5+ files, warn user about blast radius
- Avoid opportunistic refactoring ("while we're here") — keep bug fixes and refactoring in separate commits

### Step 4: Author Regression Tests (TDD — R-CM-002)

```
1. Write a failing test that reproduces the bug first (RED)
2. Apply code fix and verify tests pass (GREEN)
3. Refactor if necessary (REFACTOR)
```

### Step 5: Quality Verification

Reference `commands` section in `project-config.json` (R-CM-009):

```
commands.lint      → Skip if null
commands.typecheck → Skip if null
commands.test      → Mandatory execution
```

### Step 6: Commit

Conventional Commits format (R-CM-008):
```
🐛 fix(<scope>): <description>

Closes #<ISSUE_NUMBER>
```

### Step 7: (Optional) Create PR

```bash
gh pr create \
  --title "fix: <description>" \
  --body "Closes #<ISSUE_NUMBER>\n\n## Root Cause\n<analysis>\n\n## Fix\n<description>\n\n## Test Plan\n<test_description>"
```

## 3-Strike Escalation (R-CM-017 #3)

If the same approach fails 3 times consecutively, stop immediately:

1. Transition to BLOCKED state
2. Record attempted approaches and outputs
3. Suggest recommended next actions to the user

## GitHub CLI Reference

```bash
# View issue
gh issue view <number>
gh issue view <number> --json title,body,labels,comments

# Add comment to issue
gh issue comment <number> --body "<message>"

# Add label to issue
gh issue edit <number> --add-label "bug-fix-in-progress"

# Create PR linking issue
gh pr create --title "fix: ..." --body "Closes #<number>"
```
