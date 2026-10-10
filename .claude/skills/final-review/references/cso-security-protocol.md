# CSO Security Protocol — final-review Axis 4 (Security) Reference

> **Source**: gstack `cso/SKILL.md.tmpl` (MIT, 643 lines) → brief2dev native adaptation (2026-05-09)
> **Lens**: L4 Workflow-Bundle, core extraction of /cso Phases 9-13
> **Boundary (R-CM-028)**: Perspective 2 (scaffold target) — executed *within the generated project* when deployed to scaffold targets.
> **Used by**: `final-review/SKILL.md` Axis 4 (Security) — Cross-referenced in Deep / `--strict` / `--security` modes

## Activation Criteria

This protocol serves as a *deep reference* during Axis 4 (Security) evaluation. It activates automatically based on change scale and risk signals:

| Condition | Protocol Activation |
| --- | --- |
| Quick mode (Changes ≤ 3 files, 0 HIGH) | Axis 4 core text only, references unused |
| Standard mode (Changes 4-15 files OR 1+ HIGH) | Axis 4 core text + this reference §1-3 (OWASP / STRIDE core) |
| Deep / `--strict` / `--security` mode | Axis 4 core text + full reference (§1-5) + variant analysis |

## §1. OWASP Top 10 Assessment

Targeted analysis per category. Prioritized by detected stack (Phase 0 detection), with a catch-all pass across undetected stacks.

### A01: Broken Access Control
- Missing auth on routes/controllers (`skip_before_action`, `skip_authorization`, `public`, `no_auth` patterns)
- Direct object reference (`params[:id]`, `req.params.id`, `request.args.get`)
- Horizontal/vertical privilege escalation vulnerabilities
- Verification question: Can User A access User B's resources simply by mutating the resource ID?

### A02: Cryptographic Failures
- Weak crypto (MD5, SHA1, DES, ECB), hardcoded secrets
- Sensitive data encryption status at-rest + in-transit
- Key/secret management (env vars, KMS, vault — hardcoding prohibited)

### A03: Injection
- **SQL injection**: raw queries, string interpolation in SQL
- **Command injection**: `system()`, `exec()`, `spawn()`, `popen` patterns
- **Template injection**: render with params, `eval()`, `html_safe`, `raw()`
- **LLM prompt injection**: Reference §2 (LLM Security)

### A04: Insecure Design
- Rate limits present on authentication endpoints?
- Account lockout (post consecutive failed attempts)?
- Business logic server-side validation enforced?

### A05: Security Misconfiguration
- CORS wildcard origins in production?
- CSP headers present?
- Debug mode / verbose error traces exposed in production?

### A06: Vulnerable and Outdated Components
- Dependency audit — cross-referenced with `pre-quality-gate` Dependency Supply Chain gate. Must be blocked before the change reaches the trunk; the gate is wired at push (`Makefile#q.critical` documents why a live-network check does not sit on the commit path).

### A07: Identification and Authentication Failures
- Session management — creation / storage / invalidation
- Password policy — complexity / rotation / breach checking
- MFA — available? enforced for admin accounts?
- Token management — JWT expiration / refresh token rotation

### A08: Software and Data Integrity Failures
- Deserialization inputs validated?
- External data integrity verification enforced?

### A09: Security Logging and Monitoring Failures
- Auth events logged?
- Authorization failure events logged?
- Admin action audit-trail preserved?
- Log tampering protections in place?

### A10: Server-Side Request Forgery (SSRF)
- URL construction from user input?
- Internal services reachable via user-controlled URLs?
- Allowlist/blocklist validation applied?

## §2. STRIDE Threat Model

Evaluate 6 dimensions for each *major component* identified in Phase 0:

```
COMPONENT: [Name]
  Spoofing:               Can an attacker impersonate a user/service?
  Tampering:              Can data in-transit/at-rest be modified?
  Repudiation:            Can actions be denied? Does an audit trail exist?
  Information Disclosure: Can sensitive data be leaked?
  Denial of Service:      Can the component be overwhelmed?
  Elevation of Privilege: Can unauthorized access be gained?
```

Specify a finding or explicit "N/A — reason" for every dimension. Silent passes prohibited.

## §3. False Positive Filtering — Hard Exclusions (12 Core Exclusions)

Even after passing the 8/10 confidence gate, automatically discard the following patterns. **Absorbs only the 12 relevant to the brief2dev context**:

1. **DoS / Resource Exhaustion / Rate Limiting** — EXCEPT LLM cost amplification (unbounded LLM calls / missing cost caps), which is *retained* as financial risk (auto-discard prohibited).
2. **Encrypted-at-rest secrets** — Encrypted and permission-restricted disk secrets are not findings.
3. **Memory consumption / CPU exhaustion / fd leak** — Resource management issues are not security findings.
4. **Non-security field input validation** — Not a finding without proven security impact.
5. **Concretely unexploitable race conditions / timing attacks** — Concrete exploitation path required.
6. **Memory safety issues in memory-safe languages** (Rust, Go, Java, C#) — Language guarantees assumed.
7. **Test fixtures / unit tests only** — Not a finding if never imported by non-test code.
8. **Log spoofing** — Printing unsanitized input to logs is not a vulnerability finding.
9. **Path-only SSRF** — SSRF without host/protocol control is not a finding.
10. **User content in user-message position in AI conversations** — Not a prompt injection finding (not system prompt).
11. **Regex complexity in code not handling untrusted input** — ReDoS is real only when processing *user-supplied strings*.
12. **Security concerns in documentation files (`*.md`)** — **EXCEPTION**: `SKILL.md` is *executable prompt code*, not documentation. Prompt injections in `SKILL.md` are *retained* as findings.

**Precedents (12 Core Precedents)**:

1. Logging secrets in plaintext = vulnerability. Logging URLs = safe.
2. UUIDs are unguessable — Missing UUID format validation is not a finding.
3. Env vars + CLI flags = trusted input.
4. React / Angular = XSS-safe by default. Flag escape hatches only.
5. Client-side JS/TS authentication unnecessary — Server responsibility.
6. Shell script command injection = Concrete untrusted input path required.
7. iPython notebooks = Flag only when untrusted input can trigger the vulnerability.
8. Non-PII logging = Not a vulnerability.
9. App repo with untracked lockfile = finding. Library repo = Not a finding.
10. `pull_request_target` without PR ref checkout = safe.
11. Root container in local dev `docker-compose.yml` = NOT a finding. Production Dockerfile/K8s = finding.
12. Dependency CVE: CVSS < 4.0 + no known exploit = Not a finding.

## §4. 8/10 Confidence Gate (Daily Mode Only)

**brief2dev adopts daily mode only** (comprehensive mode rejected for single-gate consistency).

Score each candidate finding on a confidence scale of 1-10:

- **9-10 (Certain exploit path)**: PoC authorable — Report immediately
- **8 (Clear vulnerability pattern)**: Known exploitation method confirmed — Minimum bar for reporting
- **< 8**: **Do not report** (Zero-noise principle)

## §5. Active Verification + Concrete Exploit Scenario

### §5.1 Concrete Exploit Scenario Requirement

**Every finding must specify a step-by-step attack path**. "This pattern is insecure" is not an acceptable finding.

Format:

```
Finding #N: [Title] — [File:Line]
Severity: CRITICAL/HIGH/MEDIUM/LOW
Confidence: X/10
Status: VERIFIED/UNVERIFIED/TENTATIVE

Exploit Scenario:
1. Attacker [action — e.g., crafts request with payload X]
2. System [behavior — e.g., bypasses authentication to invoke admin endpoint]
3. Result [impact — e.g., exposes User B's private data]

Remediation:
[concrete fix path]
```

### §5.2 Active Verification (Safe)

Attempt to safely PROVE each finding within non-destructive boundaries:

1. **Secrets**: Confirm pattern matches valid key format (exact length, valid prefix). Live API tests *prohibited*.
2. **Webhooks**: Trace handler code, verify presence of signature verification. HTTP requests *prohibited*.
3. **SSRF**: Trace code paths, verify if URL construction from user input reaches internal services. Network requests *prohibited*.
4. **CI/CD**: Parse workflow YAML, verify if `pull_request_target` checks out actual PR code.
5. **Dependencies**: Verify whether the vulnerable function is *directly imported/invoked*. Direct invocation → VERIFIED. Indirect → UNVERIFIED (note: "framework internals / transitive execution / config-driven paths").
6. **LLM**: Trace data flow, verify whether user input reaches system prompt construction.

### §5.3 Variant Analysis

For every VERIFIED finding, search the entire codebase for *identical patterns*. 1 confirmed SSRF often implies 5 more. Report each variant separately as "Variant of Finding #N".

## §6. brief2dev Adaptation Differences — Intentional Rejections vs. gstack

Assets intentionally *excluded* from gstack:

- **Daily/Comprehensive 2 Modes**: brief2dev uses daily 8/10 gate only (Single-gate model)
- **`/cso --infra`, `--code`, `--skills`, `--supply-chain`, `--owasp`, `--scope auth` flag branches**: Unified into final-review depth branches
- **Phase 4 Full CI/CD Audit**: Scaffold targets are boilerplate-level → Only secrets in CI logs absorbed into pre-quality-gate
- **Phase 5 Infrastructure Shadow Surface / Phase 6 Webhooks**: Assumes prod ops → Inappropriate for MVP scaffolding
- **Phase 7 Full LLM/AI Security Stack**: Only §1 A03 LLM injection absorbed (jailbreak / cost amplification aside)
- **Phase 8 Skill Supply Chain**: Duplicates R-CM-015 (oss-transplant-protocol)
- **Phase 13/14 Trend Tracking + Save Report (`~/.gstack/`)**: Violates R-CM-028 repository boundaries
- **Parallel Finding Verification (Agent tool sub-tasks)**: brief2dev final-review relies on single-session self-verification
- **22 Hard Exclusions → 12**: Rejected multi-language monorepo and production ops assumptions

## §7. Cross-Reference

| Protocol Domain | brief2dev Rule / Skill | Relationship |
| --- | --- | --- |
| §1 OWASP Top 10 | `final-review/SKILL.md` Axis 4 | Deepening — Axis 4 is short checklist; §1 provides per-category depth |
| §2 STRIDE | `final-review/SKILL.md` Axis 4 | Deepening — Component-level 6-dimensional evaluation |
| §3 FP Filtering 12 + 12 Precedents | R-CM-016 Rule 9 (Evidence Honesty) | Aligned — "Prove it or don't say it" principle |
| §4 8/10 Confidence Gate | R-PL-001 Rule 7 (Evidence-grade × Confidence ceiling) | Aligned — Confidence integrity |
| §5.1 Concrete Exploit Scenario | R-CM-016 Rule 9 + R-CM-010 Rule 6 (No Clean assertions) | Reinforced — Ban abstract findings |
| §5.2 Active Verification | R-CM-010 Rule 7 (Adversarial Self-Check) | Aligned — Mutation attempts + counterexample verification |

## §8. Sources

- gstack `oss/gstack/cso/SKILL.md.tmpl` (MIT, 643 lines)
- OWASP Top 10: https://owasp.org/Top10/
- Microsoft STRIDE Threat Model
