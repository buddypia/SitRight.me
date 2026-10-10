# Review Report Contract (Unresolved Decisions Sentinel + Staleness)

> **Purpose**: Structurally blocks the failure mode where "verdicts are rendered but unresolved decisions remain silently buried in prose" via 2 contracts: ① Report final line sentinel, ② Staleness notation between review timestamp and current HEAD.
> **Transplanted from**: gstack v1.60.2, 2026-07-17 (`plan-devex-review/sections/review-sections.md` — identical logic repeated across `plan-ceo-review`, `plan-eng-review`, `plan-design-review`).
> **Adaptation**: Native — gstack writes `GSTACK REVIEW REPORT` to plan files with a trailing sentinel, whereas `final-review` is a Read-Only skill (SKILL.md `## Not For / Boundaries`). This contract adapts the rule to the **final line of the conversational output (Review Summary)**.
> **Activation**: All verdict outputs in `final-review` (Go / Conditional Go / No-Go), and downstream verdict outputs in `pre-quality-gate` / `pre-ship-quality-advisor`.

---

## 1. Unresolved Decisions Sentinel

### Upstream Contract (gstack)

All 4 `plan-*-review` skills in gstack mandate that the **final non-whitespace line** of a review report must be strictly one of two options:

- Exactly `NO UNRESOLVED DECISIONS` (plain text without bolding — **bolding is invalid**), or
- `**UNRESOLVED DECISIONS:**` header + 1 bullet per unresolved item (the last bullet being the final line of the report).

Reports failing both criteria (e.g. terminating at the VERDICT line, or concluding without mentioning unresolved status) are considered **critically incomplete** — preventing unresolved questions from silently disappearing.

### Why This is Essential

When reviews span multiple sections and passes, interactive queries or assumptions may be bypassed without explicit answers. Without aggregating unresolved items onto the final line, engineers frequently act on the VERDICT alone while missing critical open decisions. The sentinel makes open decisions mechanically grep-friendly without reading full prose.

### brief2dev Adaptation — Relation to Verification Bundle

The **Verification Bundle** in R-CM-010 Rule 6 (`Verified` / `NOT verified` / `Known limitations` / `Adversarial check`) is brief2dev's mandatory execution evidence format. The sentinel **does not replace** it — they prevent distinct failure modes:

| Mechanism | Prevented Failure Mode |
| --- | --- |
| Verification Bundle (R-CM-010 Rule 6) | Claims of verification lacking fresh execution evidence (e.g., speculation) |
| Unresolved Decisions Sentinel (This contract) | **Unresolved questions/decisions** emerging during review becoming lost in prose |

Outputs in `final-review` must satisfy both contracts in sequence:

```
... (8-Axis Review Body) ...

Verified (Executed verifications):
- <checker>: <exit code / stdout evidence>

NOT verified:
- ...

Known limitations:
- ...

Adversarial check:
- ...

## Review Summary
| Verdict | ... |
| Quality Score | ... |
| Evidence | ... |
| Blockers | ... |
| Next Actions | ... |

NO UNRESOLVED DECISIONS
```

Or when unresolved items remain due to Blockers/Next Actions:

```
## Review Summary
...

**UNRESOLVED DECISIONS:**
- Blocker #1 (Axis 4, Security): Input sanitization strategy unconfirmed — unanswered query
- Blocker #2 (Axis 6): Regression test coverage target unagreed
```

**Discipline**: The sentinel may **overlap in content** with the `Next Actions` row in the `## Review Summary` table. Overlap is expected (exposing unresolved items at two layers: table for routing, sentinel for grep-friendly presence). The sentinel must never invent new items absent from the table, and must reflect unresolved items without truncation.

### Reuse in `pre-quality-gate` / `pre-ship-quality-advisor`

This sentinel contract is a shared convention reusable across **all skills emitting final verdicts in prose**.

- **Not Applicable To**: JSON-based skills like `mvp-scoper`/`market-researcher` — structured JSON outputs are mechanically validated via R-PL-002 Rule 6 (`open_question` → downstream `key_decisions`).

---

## 2. Review Readiness Staleness Detection

### Upstream Contract (gstack)

gstack's `## Review Readiness Dashboard` reads execution history from JSONL logs and performs **staleness detection**:

1. Reads the `commit` field (HEAD sha at review time) from the log entry.
2. Compares against current HEAD.
3. If divergent, counts elapsed commits via `git rev-list --count STORED_COMMIT..HEAD`.
4. Emits `"Note: {skill} review from {date} may be stale — {N} commits since review"`.
5. For legacy entries lacking `commit`, emits `"Note: {skill} review from {date} has no commit tracking — consider re-running for accurate staleness detection"`.
6. If all reviews match current HEAD, displays no staleness note.

### brief2dev Adaptation

brief2dev stamps `head_sha` into `.tmp/worktree-<safeBranch>/quality-gate.json` (R-CM-034 Rule 2 Mailbox file contract), enforced via R-CM-030 Rule 9 ("PROOF staleness detection", `checkQualityGateStaleness()`). This adaptation borrows gstack's **human-readable phrasing convention** for conversational prose:

```
Note: final-review from <previous review commit summary> may be stale — <N> commits since review
```

If `head_sha` is missing or git queries fail, it passes as unverified (fail-open, aligned with R-CM-006 Rule 2).

---

## Summary of Relationships

| Item | gstack Original | brief2dev Application |
| --- | --- | --- |
| Sentinel Target | Final line of `## GSTACK REVIEW REPORT` section in plan files | Final line of `final-review` conversational output (immediately after Review Summary) |
| Sentinel Verification Agent | `EXIT PLAN MODE GATE` blocking checklist | Prompt-level self-discipline (final-review is Read-Only) |
| Staleness Logic | `gstack-review-read` JSONL parsing + `git rev-list --count` | Preexisting (`checkQualityGateStaleness()`, R-CM-030 Rule 9) — phrasing reused |
| Staleness Display Location | Review Readiness Dashboard | final-review output + Pre-Ship Human Review Panel when needed |

## Maintenance

- **Sources**: gstack v1.60.2 `plan-devex-review/sections/review-sections.md` (`NO UNRESOLVED DECISIONS` L707-715, Review Readiness Dashboard staleness L645-649).
- **Last updated**: 2026-07-17
- **Known limits**: Sentinel is prompt-level self-discipline; staleness display is valid only in worktrees where `quality-gate.json` is actively recorded.
