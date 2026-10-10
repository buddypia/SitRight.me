# DX (Developer Experience) Review Methodology

> **Purpose**: Deepens the **Developer perspective** of `final-review` (R-CM-012 6-role review) via a DX-dedicated 3-mode methodology.
> **Transplanted from**: gstack v1.3.0.0 `plan-devex-review/SKILL.md` (developer personas + magical moments + friction tracing + 3-mode scoring)
> **Adaptation**: Inspired — Restructures gstack's conversational (`AskUserQuestion`) review into brief2dev's artifact-based checklist.
> **Activation**: Activated in `final-review` **Deep mode** (16+ files modified OR Core/Shared modifications) when developer-facing artifacts (API / CLI / SDK / Library / Platform / Docs) are present.

---

## When to Use (Applicability Gate)

This methodology is not applied to every artifact. It activates when **at least one** of the following conditions is met:

| # | Trigger |
| --- | --- |
| 1 | Public API endpoint introduced or modified (REST, GraphQL, RPC) |
| 2 | CLI tool created (`bin/` or `package.json:bin`) |
| 3 | SDK/Library distributed (npm publish, PyPI, crates.io, etc.) |
| 4 | External developer-facing documentation (README/CONTRIBUTING/API-REFERENCE) introduced or substantially updated |
| 5 | Developer touchpoint workflows (webhook setup, OAuth app registration, error message formats) modified |

**Inactive**: Pure internal business logic changes, UI-only changes, typo fixes in documentation.

---

## DX First Principles (8 Core Principles)

The authoritative source of all recommendations. Violations must cite specific principle numbers.

1. **Zero friction at T0** — The first 5 minutes decide everything. One-click start, hello world without reading docs, no credit card, no demo calls.
2. **Incremental steps** — Allow value extraction from one slice without understanding the entire system. Gentle ramp, no cliff.
3. **Learn by doing** — Playgrounds, sandboxes, and copy-pasteable context-rich code. Reference docs are necessary but insufficient.
4. **Decide for me, let me override** — Opinionated defaults are a feature; escape hatches are a requirement.
5. **Fight uncertainty** — Every error = Problem + Cause + Remedy. "What to do / did it work / how to fix if it failed".
6. **Show code in context** — Hello world is a lie. Show real auth, error handling, and deployment. Solve 100% of the problem.
7. **Speed is a feature** — Response latency, build time, lines of code per task, cognitive concept count.
8. **Create magical moments** — Stripe's instant API response, Vercel's push-to-deploy. Find yours and make it the inaugural experience.

---

## The Seven DX Characteristics (7 Verification Dimensions)

Evaluate each dimension on a 0-10 scale. See Scoring Rubric below for calibration.

| # | Characteristic | Meaning | Gold Standard |
| --- | --- | --- | --- |
| 1 | **Usable** | Effortless install/setup/usage. Intuitive API. Fast feedback | Stripe: 1 key + 1 line of curl = money moved |
| 2 | **Credible** | Trustworthy/predictable/consistent. Clear deprecation. Secure | TypeScript: Incremental adoption, backward compatible with JS |
| 3 | **Findable** | Easy to discover + find help. Strong community. Great search | React: Answers to every question exist on StackOverflow |
| 4 | **Useful** | Solves real problems. Matches real use cases. Extensible | Tailwind: Covers 95% of CSS needs |
| 5 | **Valuable** | Measurable friction reduction. Saves time. Worth the dependency | Next.js: SSR + routing + bundling + deploy in one shot |
| 6 | **Accessible** | Works across roles/environments/preferences. CLI + GUI | VS Code: Used by juniors and principal engineers alike |
| 7 | **Desirable** | Best-in-class tech. Reasonable pricing. Community momentum | Vercel: Loved, not merely tolerated |

---

## Developer Personas

Before reviewing artifacts, **clarify the target developer persona**. Different personas have distinct expectations, tolerances, and mental models.

### 7 Archetypes (Select the 1-2 most applicable)

| Persona | Tolerance | Expectations | Red Flag |
| --- | :---: | --- | --- |
| **YC Founder Building MVP** | 30 mins | Copy-paste from README, skips docs | Requires reading > 2 pages to work |
| **Series C Platform Engineer** | Days | SLA, security, CI integration, audit logs | Missing production disaster recovery scenarios |
| **Frontend Dev Adding Feature** | 2 hours | TypeScript types, bundle size, React/Vue examples | Missing DTS, throws unhandled runtime errors |
| **Backend Dev Integrating API** | Half day | cURL examples, auth flows, rate limits | Auth steps > 5 |
| **OSS Contributor** | Half day | `git clone && make test`, CONTRIBUTING.md | Local build cannot be reproduced |
| **Student Learning** | Unlimited | Friendly errors, abundant examples | Raw stack trace dumped without context |
| **DevOps Engineer** | Days | Terraform/Docker, non-interactive, env vars | Mandatory flags require interactive TTY |

### Persona Card Output (Mandatory Section in Review Report)

```
TARGET DEVELOPER PERSONA
========================
Who:       <Description>
Context:   <When/Why they encounter this tool>
Tolerance: <Minutes/steps before abandoning>
Expects:   <Assumed to exist prior to trying>
```

---

## 3-Mode Review Selection

Select review depth after establishing the developer persona. The mode is **automatically determined when referenced from final-review**:

| Mode | Trigger Condition | Goal | Output |
| --- | --- | --- | --- |
| **DX TRIAGE** | Default (16-30 modified files) | Catch critical gaps only | Max 3 findings (Score ≤ 3 = Block) |
| **DX POLISH** | `--strict` OR 30+ files | Complete all touchpoints | 7 Dimensions × 0-10 Scores + Gap Report |
| **DX EXPANSION** | Explicit flag (User request) | Create competitive advantage | Gaps + Competitive benchmarks + Magical moment proposals |

Always state the mode explicitly at the top of the final-review report.

---

## DX Scoring Rubric (0-10 Calibration)

| Score | Meaning |
| --- | --- |
| 9-10 | Best-in-class. Stripe/Vercel tier. Developers rave about it |
| 7-8 | Good. Developers use it without frustration. Minor gaps |
| 5-6 | Acceptable. Functional but contains friction. Developers endure it |
| 3-4 | Poor. Developer friction. Drives churn |
| 1-2 | Broken. Abandoned after first attempt |
| 0 | Unaddressed. Dimension was completely ignored |

**Gap Method**: For each score, describe specifically "what a 10 looks like for this product", then orient remediations toward 10.

---

## TTHW Benchmarks (Time To Hello World)

| Tier | Time | Adoption Impact |
| --- | --- | --- |
| Champion | < 2 mins | 3-4x higher adoption |
| Competitive | 2-5 mins | Industry baseline |
| Needs Work | 5-10 mins | Significant drop-off |
| Red Flag | > 10 mins | 50-70% abandon |

Measure Getting Started sections in README/CLI **in seconds**. Base measurements on **copy-paste path tracing**, not rough estimations.

---

## Magical Moment Design (Mandatory in DX EXPANSION Mode)

> The transition moment from "Is this worth my time?" to "Wow, this is the real deal".

### Delivery Vehicle Options

| Option | Description | Effect | Effort (AI Time) |
| --- | --- | :---: | :---: |
| A | Interactive Playground (zero install) | Highest conversion | ~2 hours |
| B | Copy-paste demo command (1 line CLI) | Low effort, high impact | ~30 mins |
| C | Video/GIF Walkthrough (passive viewing) | Zero friction, passive | ~1 hour |
| D | Guided tutorial using user's own data | Deepest engagement | ~2 hours |

**Does a magical moment delivery vehicle exist in the artifact?** If absent, the ceiling for DX EXPANSION score is capped at 6.

---

## Friction Tracing (Empathy Narrative)

Reconstruct a **150-250 word first-person narrative** from the perspective of the chosen persona. Trace actual execution paths rather than theoretical assumptions.

### Template

```
I am a <persona>. I encountered this <product> through <entry point context>.

I open the README. The first heading is "<Actual Heading>".
<Scrolled / executed → What was seen>. Executed <attempted command> → <Actual output>.

At <# mins # secs elapsed>, I felt: <Specific emotional reaction>.
<Where I got stuck>: <Description of actual barrier>.

<Abandoned / Continued / Succeeded>: <Rationale>.
```

This narrative forms the "Developer Perspective" section of the review report, allowing the implementer to experience developer friction firsthand.

---

## Cognitive Patterns

Internalize the following 10 thought patterns during review:

1. **Chef-for-chefs** — Your users are chefs (developers). Their standards are high.
2. **First five minutes obsession** — New developer arrives. The clock starts. Can they achieve hello world without docs, sales, or credit cards?
3. **Error message empathy** — Every error is pain. Does it identify the problem + explain the cause + show the fix + link to docs?
4. **Escape hatch awareness** — Overrides for every default. No escape = no trust = no enterprise scale.
5. **Journey wholeness** — DX = Discovery → Evaluation → Install → Hello World → Integration → Debug → Upgrade → Extension → Migration. Every gap = a lost developer.
6. **Context switching cost** — Every time users leave your tool (docs, dashboards, googling errors), they lose 10-20 minutes.
7. **Upgrade fear** — Will this break my production app? Clear changelogs, migration guides, codemods, deprecation warnings. Upgrades must be boring.
8. **SDK completeness** — If developers have to write their own HTTP wrapper, the SDK failed. If SDKs support 4 out of 5 languages, the 5th community hates you.
9. **Pit of Success** — Make it easy to do right and hard to do wrong (Rico Mariani). Fall into the pit of success.
10. **Progressive disclosure** — Simple cases are production-ready, not toys. Complex cases use the exact same API. SwiftUI: `Button("Save") { save() }` → full custom, same API.

---

## Output Format (final-review Integration)

Format within the Developer Perspective section of `final-review`:

```markdown
## Developer Perspective (DX Deep Review)

### Target Persona
<Persona card>

### Activation Mode
<DX TRIAGE / POLISH / EXPANSION + Activation rationale>

### Empathy Narrative
<150-250 word first-person narrative>

### 7-Characteristic Scores
| # | Characteristic | Score | Gap to 10 |
|---|---|:---:|---|
| 1 | Usable | x/10 | <Specific gap> |
| ... | | | |

### TTHW Measurement
<Trace path + Result in seconds + Tier verdict>

### Critical Findings
<TRIAGE: Max 3 / POLISH: Full dimension gaps / EXPANSION: + Competitive benchmarks + Magical moment proposals>

### Block/Pass Verdict
<PASS: All dimensions >= 5, Critical 0>
<BLOCK: Any dimension < 3, OR Critical >= 1>
```

---

## Relation to Existing References

| References | Role | Boundary with this Document |
| --- | --- | --- |
| `multi-perspective-protocol.md` | R-CM-012 6-role review protocol | This document = Deepening of the "Developer" role |
| `eng-review-cognitive-patterns.md` | 15 engineer judgment patterns (Pass/Block perspective) | Internal engineering judgment. DX evaluates **external developer** perspective (User = Developer) |
| `santa-adversarial-review-protocol.md` | Adversarial 2-round review | Orthogonal — usable concurrently |
| `cross-model-review-format.md` | Multi-model comparison review | Orthogonal — DX axes can be injected into cross-model reviews |
| `pr-review-protocol.md` | 6-role GitHub execution engine | Developer role in PR review references this document |

---

## Source Attribution

- **Origin**: gstack v1.3.0.0 (`plan-devex-review/SKILL.md`)
- **8 DX First Principles**: Original "## DX First Principles" (L860-871)
- **Seven DX Characteristics**: Original "## The Seven DX Characteristics" (L873-883)
- **Cognitive Patterns**: Original "## Cognitive Patterns" (L885-898)
- **Scoring Rubric + TTHW**: Original "## DX Scoring Rubric" (L900-911) + "## TTHW Benchmarks" (L913-920)
- **Developer Persona Interrogation**: Original "### 0A. Developer Persona Interrogation" (L1065-1108)
- **Empathy Narrative**: Original "### 0B. Empathy Narrative" (L1110-1134)
- **Magical Moment Design**: Original "### 0D. Magical Moment Design" (L1177-1216)
- **Adaptation**: Restructured gstack's interactive AskUserQuestion into brief2dev's artifact-based checklist for final-review.
