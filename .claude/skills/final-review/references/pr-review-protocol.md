# PR Review Protocol (6-Role Multi-Perspective)

> **Related Rule**: R-CM-012 (Multi-Perspective Review)

## Purpose

Performs structured reviews across 6 expert perspectives on GitHub PRs and posts the consolidated findings directly to GitHub.
Referenced during `final-review` `--pr <number>` mode or standalone PR reviews.

## Core Principle: The Future is Now

> All improvements and "future" recommendations are resolved **immediately**.
> Deferrals to "next sprint" are prohibited — HIGH+ findings must be remediated immediately.

---

## 6-Role Review Protocol

### Task 1: Product Manager Review

**Objective**: Product Perspective Evaluation
- **Business Value**: Does the PR clearly advance core product objectives?
- **User Experience**: Is the change intuitive and useful to users?
- **Strategic Alignment**: Does it align with current and long-term strategy?
- **brief2dev Addition**: Verify alignment against `SPEC.md` requirements

**Action**: Provide clear directives ensuring maximum user and business impact.

### Task 2: Developer Review

**Objective**: Senior Lead Engineer Code Evaluation
1. **Code Quality & Maintainability**: Readability and ease of long-term maintenance
2. **Performance & Scalability**: Efficiency under scale
3. **Best Practices & Standards**: Coding standards compliance (R-TS-001, R-CM-001, etc.)

**Action**: Deliver concise, actionable review comments. Execute all improvements immediately.

### Task 3: Quality Engineer Review

**Objective**: Quality, Test Strategy, and Reliability Verification
1. **Test Coverage**: Adequate unit, integration, and E2E tests present?
2. **Potential Bugs & Edge Cases**: Are all boundary conditions addressed?
3. **Regression Risk**: Risk of breaking preexisting features?

**Action**: Detailed QA evaluation. Verify compliance with R-CM-002 (TDD) + R-CM-011 (Testing Anti-Patterns).

### Task 4: Security Engineer Review

**Objective**: Security Best Practices and Compliance
1. **Vulnerabilities**: Potential introduction of security holes?
2. **Data Handling**: Sensitive data protection (encryption, sanitization)?
3. **Compliance**: Alignment with OWASP, GDPR standards?

**Action**: Security evaluation based on R-CM-003 (Security Rules). Weight: 1.5x (R-CM-012).

### Task 5: DevOps Review

**Objective**: Build, Deployment, and Observability Evaluation
1. **CI/CD Pipeline**: Integration with existing build/test/deploy processes
2. **Infrastructure & Configuration**: Required infra and config updates
3. **Monitoring & Alerts**: New telemetry and monitoring requirements

**Action**: DevOps-centric review. Ensure `.brief2dev/` runtime artifacts are not accidentally committed. <!-- @scaffold-path-keep -->

### Task 6: UI/UX Designer Review

**Objective**: User-Centric Design Assurance
1. **Visual Consistency**: Brand and design guideline compliance
2. **Usability & Accessibility**: WCAG accessibility criteria compliance
3. **Interaction Flow**: Seamless and responsive user flows

**Action**: Detailed UI/UX evaluation. Cross-reference root `DESIGN.md`.

---

## Execution via GitHub CLI

```bash
# Inspect PR
gh pr view <PR_NUMBER> --json title,body,files
gh pr diff <PR_NUMBER>

# Post review summary comment
gh pr review <PR_NUMBER> --comment --body "<review_content>"

# Post inline line-level comments
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --field body="<comment>" \
  --field path="<file_path>" \
  --field line=<line_number> \
  --field side="RIGHT"
```

## Scoring (R-CM-012 Weighted Average)

| Role | Weight | Score Range |
| --- | :---: | --- |
| Security | 1.5x | 0-100 |
| Developer | 1.2x | 0-100 |
| QE | 1.2x | 0-100 |
| PM | 1.0x | 0-100 |
| DevOps | 1.0x | 0-100 |
| UI/UX | 0.8x | 0-100 |

**Consolidated Verdict**: All 6 roles Go → **Go**. 1+ CRITICAL → **No-Go**. 3+ roles No-Go → **No-Go**.
