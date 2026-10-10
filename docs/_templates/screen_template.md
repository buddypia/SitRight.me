# Screen: {Screen Name}

> **Screen ID**: SCR-{NNN} | **Related SPEC**: [SPEC-{NNN}](../SPEC-{NNN}-{name}.md)

---

## 1. Screen Information

| Item | Content |
| ---- | ------- |
| **File** | `src/features/{feature}/components/{Name}Panel.tsx` |
| **Custom Hook** | `src/features/{feature}/hooks/use-{name}.ts` |
| **Route** | `/{route-path}` |

---

## 2. Entry Conditions

| Condition | Required | Fallback Behavior |
| --------- | :------: | ----------------- |
| Authentication | ⭕/❌ | {Behavior} |
| Onboarding Complete | ⭕/❌ | {Behavior} |

---

## 3. Layout

```
┌─────────────────────────────────────┐
│            [AppBar]                 │
├─────────────────────────────────────┤
│                                     │
│         [Main Content]              │
│                                     │
│  ┌─────────────────────────────────┐│
│  │     [Section 1]                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │     [Section 2]                 ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## 4. UI State Matrix

| State | UI Elements | User Action |
| ----- | ----------- | ----------- |
| Loading | Skeleton / Progress | - |
| Empty | Empty State | Retry / Explore |
| Error | Error Message + Retry | Retry |
| Success | Data Display | Detail / Next Action |

---

## 5. Component Specifications

### 5.1 {Component Name}

| Item | Content |
| ---- | ------- |
| **Type** | Card / Button / List / ... |
| **Placement** | Top / Center / Bottom |

**Props**:

- `{prop1}`: {type} - {description}
- `{prop2}`: {type} - {description}

**State Display**:

| State | Display Content |
| ----- | --------------- |
| Loading | Skeleton UI |
| Success | Data display |
| Empty | Empty state |
| Error | Error message + retry |

### 5.2 Button State Specifications

> **Common Rules**: Follow [base-ui-theme-guide.md §12.3](../../development/base-ui-theme-guide.md#123-button-states-common-rules)
> Below describes only **screen-specific rules**

| Button ID | Button Name | Enable Condition | Disable Condition | Loading State Behavior | Exception / Special Rules |
| --------- | ----------- | ---------------- | ----------------- | ---------------------- | ------------------------- |
| `btn_primary` | {CTA Button Name} | {Specify condition} | {Specify condition} | Spinner + Disabled | - |
| `btn_secondary` | {Secondary Button Name} | {Specify condition} | {Specify condition} | - | - |
| `btn_delete` | Delete | {Specify condition} | {Specify condition} | - | Execute after confirmation dialog |

**State Condition Example**:

```typescript
// btn_primary enable condition
const isEnabled = word.length > 0 && meaning.length > 0 && !state.isLoading;
```

### 5.3 Form Validation Specifications (if form is present)

> **Common Rules**: Follow [base-ui-theme-guide.md §12.6](../../development/base-ui-theme-guide.md#126-form-validation-common-rules)
> **Not Applicable**: For screens without forms, note "N/A - No form"

| Field ID | Field Name | Validation Rule | Location | Timing | Error Message (messages.ts) |
| -------- | ---------- | --------------- | :------: | ------ | --------------------------- |
| `field_xxx` | {Label} | Required, {Additional rule} | C/S | onBlur/onChange | `error_xxx_required` |

**Location**: C = Client, S = Server, C+S = Both

**Validation Logic Example**:

```typescript
function validateXxx(value: string | undefined): string | null {
  if (!value || value.length === 0) {
    return messages.error_xxx_required;
  }
  // Additional validation...
  return null;
}
```

### 5.4 Empty State Specifications

> **Common Rules**: Follow [base-ui-theme-guide.md §12.4](../../development/base-ui-theme-guide.md#124-empty-state-rules)

| Empty State Type | Condition | Illustration | Title (messages.ts) | Description (messages.ts) | CTA |
| ---------------- | --------- | :----------: | ------------------- | ------------------------- | --- |
| No Data | `items.isEmpty && !hasSearched` | ✅ | `xxx_empty_title` | `xxx_empty_desc` | "Add Item" |
| No Search Results | `items.isEmpty && hasSearched` | ⭕ | `xxx_no_results` | - | ❌ |

### 5.5 Authorization State Specifications (if permission check exists)

> **Common Rules**: Follow [base-ui-theme-guide.md §12.5](../../development/base-ui-theme-guide.md#125-permission-state-rules)
> **Not Applicable**: For screens without permission checks, note "N/A - Public screen"

| Auth State | Condition | UI Display | CTA | Recovery Route |
| ---------- | --------- | ---------- | --- | -------------- |
| Login Required | `!authState.isLoggedIn` | Dialog | "Log In" | `/login` |
| Premium Required | `!user.isPremium && featureX` | Overlay | "Upgrade" | `/subscription` |

---

## 6. User Interactions

| Element | Action | Result |
| ------- | ------ | ------ |
| {Button} | Tap | {Navigation / Action} |
| Screen | Pull to refresh | Data reload |

---

## 7. Event → Custom Hook Mapping

| UI Event | Hook Method | State Transition | Side Effects |
| -------- | ----------- | ---------------- | ------------ |
| {Button Click} | {hook.method()} | Loading → Data | Logging / Navigation |

---

## 8. Navigation

| Item | Value |
| ---- | ----- |
| **Entry Route** | `/{route-path}` |
| **Parameters** | {param: type} |
| **Return Value** | {result: type} |
| **Deep Link** | {if applicable} |

---

## 9. Logic Reference (SSOT)

> Policy / rule **definitions** belong in SPEC only; reference via link here.

- SPEC: [SPEC-{NNN}-{name}.md](../SPEC-{NNN}-{name}.md)
- Referenced Sections: {e.g., §2 Functional Requirements, §3 Dependencies}

---

## 10. API Touchpoints (Links Only)

- API Contract: [API-{NNN}-{name}.md](../API-{NNN}-{name}.md)
- Endpoints Used: {GET /..., POST /...}

---

## 11. FR Mapping (Refer to SPEC)

> **SSOT Principle**: FR <-> Screen mapping data is managed in SPEC §0.1.1 Traceability Matrix.
> Here, specify only the FR scope this screen touches.

- **Related FRs**: FR-{NNN}01 ~ FR-{NNN}0N
- **Traceability Matrix**: [SPEC-{NNN} §0.1.1](../SPEC-{NNN}-{name}.md#011-traceability-matrix)

---

## 12. AI Implementation Hints

**Implementation Order**:

1. Custom Hook first (`src/features/{feature}/hooks/use-{name}.ts`)
2. Component implementation (`src/features/{feature}/components/{Name}Panel.tsx`)
3. Subcomponent extraction

**Reference Code**:

```typescript
// Similar screen: src/features/{feature}/components/SimilarPanel.tsx
// Pattern: useXxx() Custom Hook + UI component
```

---

## 13. Design References (Optional)

> **Condition**: Populate only when design assets exist in `design/` directory. Delete this entire section if none exist.
> **Role**: Visual reference. Definitive source of truth (SSOT) is §3~§8 of this screen doc.

| Item | File | Notes |
| ---- | ---- | ----- |
| Figma Export (HTML) | `design/code.html` | Tailwind CSS class reference |
| Screenshot | `design/screen.png` | Visual verification |

**Design <-> Screen Doc Discrepancies** (if any):

| Item | Screen Doc (SSOT) | Design (Reference) | Verdict |
| ---- | ----------------- | ------------------ | ------- |
| {e.g., Auth method} | {Screen Doc definition} | {Design representation} | {Screen Doc standard — rationale} |

---

<!--
This document focuses strictly on UI/Layout.
- Implementation files, states, tests are documented in SPEC.md
- API contracts are documented in API contract documents
- Only screen structure and interactions are defined here
- Design assets (design/) are for visual reference; SSOT is this document body
-->

