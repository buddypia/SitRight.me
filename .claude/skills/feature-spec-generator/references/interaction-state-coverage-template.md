# Interaction State Coverage Template

> **Purpose**: Predefine 5 interaction states per UI component during SPEC authoring to prevent missing implementation states
> **When**: feature-spec-generator references this template when generating SPEC.md containing UI components

---

## Overview

Every UI feature possesses 5 interaction states.
Explicitly defining each state during the SPEC phase prevents missing state implementations in code.

---

## The 5 Interaction States

| State | Definition | Example |
|---|---|---|
| **LOADING** | Data fetching in progress | Skeleton UI, spinner, progress bar |
| **EMPTY** | No data / First-time user | "No items yet" + CTA button |
| **ERROR** | Failure state | Error message + Retry button |
| **SUCCESS** | Normal data rendered | Data list, detail view |
| **PARTIAL** | Partial loading / Partial failure | Partial data rendered + remaining loading |

---

## Interaction State Coverage Matrix

Construct the following matrix for each UI component/screen in SPEC.md.

```markdown
### Interaction State Coverage: {feature-name}

| Component | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| SearchResults | Skeleton 3 rows | "No search results" + Suggested keywords | "Search failed" + Retry | Result cards grid | Render 1st page + Loading next page | — |
| FilterPanel | Disabled state | Show default filters only | Filter load failed notice | All filter options | Load subset of filter categories | Independent loading per category |
| SearchInput | — | Show placeholder | — | Show input value | Autocomplete loading | LOADING/ERROR applies only to autocomplete |
| Pagination | Disabled | — | — | Show page numbers | — | EMPTY is handled by SearchResults |
```

---

## Missing State = Design Gap

Empty cells in the matrix must be categorized as one of the following:

1. **N/A (Not Applicable)**: The state cannot logically occur → Mark as `—` and explain rationale in Notes
2. **GAP (Missing)**: The state can occur but the design is undefined → **Automatically flag**

### Automatic Flagging Rule

```
IF cell is empty AND no N/A justification in Notes
THEN → DESIGN GAP: {State} state of {Component} is undefined
```

### Severity

| Missing State | Severity | Rationale |
|---|:---:|---|
| ERROR | **HIGH** | User gets stuck with no feedback on error |
| LOADING | **HIGH** | Blank screen during loading looks broken |
| EMPTY | **MEDIUM** | Degrades first-time user experience |
| PARTIAL | **LOW** | Rare scenario but impacts UX quality |
| SUCCESS | **CRITICAL** | Missing core state = Unimplemented feature |

---

## Authoring Guide

### Elements to Include in Each State Definition

**LOADING**:
- Visual presentation: Skeleton / Spinner / Progress bar
- Transition criteria: Expected completion duration (within N seconds)
- Timeout: Transition to ERROR state after N seconds

**EMPTY**:
- Message: Context-specific guidance
- CTA: Action user can take next
- Illustration/Icon: Visually communicate empty state

**ERROR**:
- Message: Specific cause + resolution action
- Recovery action: Retry, Go back, Alternative path
- Logging: Whether error is automatically reported

**SUCCESS**:
- Layout: Data presentation structure
- Interactions: Click, hover, select, and other available actions
- Sort/Filter: Default sort order

**PARTIAL**:
- Which parts are loaded vs. which parts are pending
- Whether healthy data is retained during partial errors
- Progressive enhancement UX

---

## SPEC.md Integration

When feature-spec-generator generates SPEC.md containing UI components:

1. Include an Interaction State Coverage Matrix in each UI component section
2. Output a SPEC completeness warning if a GAP is detected
3. If 2 or more HIGH or higher GAPs exist, block SPEC completion and request state definitions

---

## Platform Agnostic

This template applies to all UI platforms (Web / Mobile / Desktop).

| Platform | LOADING Presentation | EMPTY Presentation | ERROR Presentation |
|---|---|---|---|
| Web (React/Vue/Svelte) | Skeleton, Suspense | EmptyState component | ErrorBoundary |
| Mobile (Flutter) | Shimmer, CircularProgressIndicator | EmptyWidget | ErrorWidget |
| Mobile (React Native) | ActivityIndicator, Skeleton | ListEmptyComponent | Error boundary |
| Desktop (Tauri) | Loading overlay | Empty view | Error dialog |

