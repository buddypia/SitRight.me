# Autonomy Control Rules

> Detailed reference document separated from feature-pilot SKILL.md.

> **Core Principle**: Prevent excessive AI autonomy and mandate user confirmation on critical decisions.

### 7-Question Limit Rule

Limit user questions to a maximum of 7 within a session, progressing without redundant dialogues.

| Question Count | Status | Action |
| :---: | --- | --- |
| 1-6 | Normal Progress | Wait for response after asking |
| 7 | Limit Reached | **Autonomous Stop** after final question |
| > 7 | AwaitingUser | No additional questions allowed; auto-select recommended defaults |

**Processing Protocol**:

1. Increment `question_count` in `CONTEXT.json` on each question.
2. Upon reaching 7, record `current_state` → `AwaitingUser` and log `previous_state`.
3. For unanswered items, **auto-select recommended options** or **record as Assumptions**.
4. Explicitly state assumptions in SPEC/CONTEXT.

**Notification Message Format**:

```markdown
7-Question Limit Reached

Unanswered items have been automatically resolved using recommended options:

- Q4: Offline behavior → "Local storage followed by sync" (Recommended)
- Q5: Error display → "Toast notification" (Recommended)

These have been recorded as assumptions. Please reply if adjustments are required.
```

### Auto-Stop Conditions

Upon detecting any of the following conditions, **halt work immediately** and request user confirmation:

#### High Risk - Immediate Stop

| Detection Condition | State Transition | Required Action |
| --- | --- | --- |
| Auth/Permissions code modification | `AwaitingUser` | Mandatory user approval |
| Payments/Billing logic | `AwaitingUser` | Mandatory user approval |
| Personally Identifiable Information (PII) | `AwaitingUser` | Mandatory security review |
| DB Schema Migration | `Blocked` | Mandatory Migration Plan |
| Impact on user progress data | `AwaitingUser` | Impact analysis + approval |

#### Medium Risk - Proceed with Caution

| Detection Condition | Action |
| --- | --- |
| External API Integration | Verify contract and proceed; fallback definition mandatory |
| Multi-screen state management | Verify adherence to existing patterns |
| New/Modified API Routes | Pre-deployment testing mandatory |

#### Low Risk - Autonomous Execution

| Work Type | Description |
| --- | --- |
| Single-screen UI changes | Layout, styling adjustments |
| Text/Translation updates | Editing messages.ts |
| Styling/Theme adjustments | Colors, fonts, spacing, etc. |

### CONTEXT.json autonomy_control Updates

Each skill updates the `autonomy_control` section at start/completion:

```json
{
  "autonomy_control": {
    "max_questions_per_session": 7,
    "auto_stop_conditions": [
      "7-question limit reached",
      "BLOCKING pattern detected",
      "High-risk operation (security_sensitive, payment_billing, pii_handling)",
      "DB migration required"
    ],
    "current_autonomy_level": "supervised",
    "risk_level": "medium",
    "risk_factors": ["involves_external_api"],
    "claude_md_checked": true,
    "claude_md_version": "2026-02-11"
  }
}
```

### Autonomy Levels

| Level | Description | Applicable Context |
| --- | --- | --- |
| `full` | Fully autonomous | Low-risk work, explicit SPEC exists |
| `supervised` | Confirm on key decisions | Default, majority of tasks |
| `paused` | Awaiting user input | AwaitingUser, Blocked states |

### Enforced CLAUDE.md Verification

Phase 0 mandates CLAUDE.md verification:

```markdown
## CLAUDE.md Check (Phase 0 Mandatory)

1. Read CLAUDE.md file
2. `autonomy_control.claude_md_checked` → true
3. `autonomy_control.claude_md_version` → output of `git log -1 --format='%ai' -- CLAUDE.md` (YYYY-MM-DD format)
   - In non-git environments: `# currentDate` at top of file, or current date at read time
4. Review Rules to Follow section
5. On MUST NOT violations → Immediate No-Go
```
