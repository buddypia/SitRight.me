---
name: observability-and-instrumentation
description: |
  Production observability instrumentation skill for target projects. Designs logging, metrics, tracing, and alerts
  concurrently with feature implementation to ensure production systems are diagnosable from external telemetry.
  Invoked alongside feature-implementer during delivery or executed directly.

  **Core Capabilities**:
  - Define on-call questions → select appropriate log / metric / trace signals
  - Structured logging (stable event names + correlation IDs)
  - RED / USE metric design (cardinality-safe)
  - OpenTelemetry distributed tracing
  - Symptom-based alert rules (prohibiting noisy cause-based alerts)

  Triggered by requests such as "add logging", "instrument telemetry", "observability", "metrics instrumentation", "add tracing", "configure alerts", etc.
---

# Observability and Instrumentation

> **Core Concept**: "Unobservable code is unmaintainable code." Observability is the capability to infer the internal state of a production system solely from its external telemetry.
> Instrumentation is not an afterthought added after release; like automated tests, it is authored **concurrently** with feature code.

Origin: `oss/agent-skills/skills/observability-and-instrumentation/SKILL.md` (agent-skills project, MIT). Native adaptation — added integration guidance across brief2dev's 3 platform lineups (Next.js / Flutter / Tauri) with idiomatic code examples.

## Not For / Boundaries

> Explicit exclusions for this skill (R-CM-018 Rule 4 — Preventing Missing Boundaries).

- **Business KPI / North Star Metric Architecture** → `metrics-designer` (Discovery stage; measures customer value delivered). This skill operates at an engineering tier — measuring **whether production systems are functioning correctly**. Although both use the word "metrics," their scopes differ: `metrics-designer` defines weekly business KPIs displayed on executive dashboards; this skill defines real-time RED/USE engineering signals observed by on-call engineers.
- **Live Outage Debugging** → `systematic-debugging`. Telemetry created by this skill directly dictates the diagnostic speed of `systematic-debugging` (without instrumentation, debugging becomes archeology).
- **Web Performance Audits (Core Web Vitals, Lighthouse)** → `web-performance-auditor` agent. This skill provides underlying trace/metric data, but the performance audit itself (scoring and grading) belongs to that specialized agent.
- **Live UI/UX Visual Verification** → `design-reviewer-live`. This skill deals with telemetry integrity, not visual rendering defects.
- **Runtime SRE On-Call Platform Provisioning** → brief2dev generates scaffold code, not a managed SaaS monitoring infrastructure (AGENTS.md exclusions). This skill provides self-contained telemetry *patterns*.

---

## Pre-flight Checklist

| ID | Item | Status | Blocking |
|---|------|:------:|:--------:|
| PF-001 | Identify target feature / execution code paths for instrumentation | [ ] | True |
| PF-002 | Define 2–4 on-call operational questions (instrumentation without questions forbidden) | [ ] | True |
| PF-003 | Confirm platform lineup (Next.js / Flutter / Tauri) | [ ] | False |

---

## Post-flight Checklist

| ID | Item | Status | Blocking |
|---|------|:------:|:--------:|
| POF-001 | Verify all signals map directly to defined on-call questions | [ ] | True |
| POF-002 | Verify structured logs contain stable event names + correlation IDs | [ ] | True |
| POF-003 | Verify metric cardinality safety (absence of unbounded label values) | [ ] | True |
| POF-004 | Verify alerts are symptom-based (cause-based paging alerts forbidden) | [ ] | False |

## When to Use

- Implementing production features (new services, API endpoints, background workers, third-party integrations).
- Following post-mortems where "root-cause diagnosis took too long because system state was opaque."
- Authoring or reviewing alerting rules.
- Reviewing PRs that introduce network I/O, retries, queues, or distributed service calls.

## 6-Step Process

### 1. Define "Normal Operation" Prior to Instrumenting

Telemetry emitted without a concrete question is pure noise. Before writing instrumentation, document the 2–4 operational questions an on-call engineer would ask during an incident:

```
FEATURE: Payment Retries
ON-CALL QUESTIONS:
1. What is the first-attempt success rate vs. post-retry success rate?
2. When permanent failures occur, what is the primary cause (provider error / timeout / validation)?
3. Is the payment gateway responding slower than baseline SLAs?
→ Every signal added below MUST answer one of these questions.
```

If you cannot articulate these questions, you are not ready to instrument — you will log everything and learn nothing.

### 2. Match Signals to Questions

| Signal | Question Answered | Cost Characteristics |
|---|---|---|
| **Structured Logs** | "What specific sequence of events occurred in this individual transaction?" | Emitted per event; volume scales linearly with traffic |
| **Metrics** | "How often and how fast is this happening in aggregate?" | Fixed cost per time series; extremely cheap to query |
| **Distributed Traces** | "Where was time spent across distributed service boundaries?" | Emitted per request; typically sampled |

Rule of thumb: Metrics tell you **WHAT** is broken, traces tell you **WHERE**, and logs tell you **WHY**.

### 3. Structured Logging

Log structured events, not arbitrary prose strings. Every log entry should be a valid JSON object containing a stable `event` identifier and machine-readable context fields.

```typescript
// BAD: String interpolation — unqueryable, inconsistent formatting
logger.info(`Payment ${id} failed for user ${userId} after ${n} retries`);

// GOOD: Stable event identifier + structured JSON fields
logger.warn({ event: 'payment_failed', paymentId: id, provider: 'stripe', errorCode: err.code, attempt: n }, 'payment failed');
```

**Correlation IDs are Mandatory.** Generate (or extract) a unique Request ID at system boundaries and propagate it across all downstream log entries, trace spans, and asynchronous jobs. Without correlation IDs, reconstructing distributed requests across concurrent logs is impossible.

**Never Log Secrets, Tokens, or Unredacted PII.** Enforce explicit allowlists for logged fields; never log raw request/response payloads blindly.

### 4. Metrics (RED & USE)

Instrument **RED** (Rate, Errors, Duration) across all request-driven endpoints and external dependencies; instrument **USE** (Utilization, Saturation, Errors) across stateful resources (thread pools, queues, database connections).

**Cardinality Kills Metric Backends.** Every unique combination of label values instantiates a distinct time series. Labels must only use bounded, low-cardinality sets (route templates, HTTP status classes, payment provider names). Never use unbounded values (user IDs, raw UUIDs, error messages) as metric labels — those belong in logs and trace attributes.

Always record latency as histograms to calculate p50, p95, and p99 percentiles; never rely on averages.

### 5. Distributed Tracing

Adopt vendor-neutral OpenTelemetry standards. Auto-instrumentation provides baseline coverage for HTTP, gRPC, and database drivers out of the box. Add manual spans only around significant internal domain operations, and propagate trace context (W3C `traceparent` headers) across asynchronous boundaries.

### 6. Symptom-Based Alerting (Avoid Cause-Based Pagers)

```
SYMPTOMS (Page On-Call Engineers):      CAUSES (Dashboards & Tickets Only):
Error Rate > 1% (over 5m window)        CPU Utilization > 85%
p99 Latency > 2.0s                      Single Pod Restarted
Queue Processing Age > 10m              Disk Usage > 70%
```

Every alerting rule must:
1. **Be Actionable** — If an alert can be safely ignored because it self-recovers, delete the alert.
2. **Link Directly to a Runbook** — Minimum 3 lines: operational impact, initial diagnostic query, escalation path.
3. **Have Justified Thresholds** — Grounded in SLOs or historical baselines.
4. **Use 2 Severity Tiers** — **Page** (immediate user-facing degradation requiring immediate response) and **Ticket** (non-urgent degradation addressed during business hours).

---

## Lineup Implementation Notes

### Web (Next.js)

| Dimension | Implementation Guideline |
|---|---|
| **Structured Logging** | Use `pino` in Node.js runtimes. Generate correlation IDs in Middleware via `crypto.randomUUID()` and propagate via request headers. |
| **Metrics** | Use `prom-client` on self-hosted instances (`/api/metrics`); leverage hosted APM (Sentry, Axiom, Better Stack) or Vercel Speed Insights for managed environments. |
| **Distributed Tracing** | Use `@vercel/otel` (Vercel deployments) or `@opentelemetry/sdk-node` (self-hosted). **Note: Next.js Edge Runtime does not support the full Node OTel SDK** — ensure lightweight HTTP exporters are used for Edge routes. |
| **Alerting** | Configure symptom-based alerts in hosted APM platforms or Vercel Monitoring. |

### Mobile (Flutter)

| Dimension | Implementation Guideline |
|---|---|
| **Structured Logging** | Use the `logging` package with JSON formatting, or capture Sentry breadcrumbs. |
| **Metrics / Tracing** | Server-side RED/USE does not apply directly to mobile clients; use Firebase Performance Monitoring or Sentry Performance to aggregate screen render times, app cold starts, and API latency. |
| **Alerting** | Core client health metrics (Crash-Free Session Rate, ANR Rate) serve as primary symptom signals. |
| **Correlation IDs** | Generate a session UUID on app launch and attach it to outgoing API requests and log breadcrumbs. |

### Desktop (Tauri)

| Dimension | Implementation Guideline |
|---|---|
| **Structured Logging** | In Rust backends, use the `tracing` crate (structured spans + JSON subscriber) — the idiomatic Rust standard. Webview frontends follow Next.js client-side logging patterns. |
| **Metrics / Tracing** | Connect OpenTelemetry exporters via `tracing-opentelemetry` or integrate Sentry Rust SDK. |
| **Alerting** | Local desktop execution limits server-side alerting; crash reporting hooks and user error-reporting channels serve as primary symptom signals. |

---

## Common Rationalizations (Rebuttals)

| Rationalization | Reality |
|---|---|
| "Make it work first, add logging later" | "Later" usually means "during the first production outage," when debugging is most expensive. |
| "More logs mean better observability" | Unstructured log noise slows incident response. 3 queryable events outperform 300 lines of unstructured prose. |
| "Adding User ID to metric labels helps debugging" | High cardinality crashes metric time-series databases. Granular dimensions belong in logs and traces. |
| "Alert on everything now and tune later" | Noisy pagers train engineers to ignore alarms, causing critical alerts to be missed. |

---

## Red Flags

- PRs introducing network calls, queues, or retries with zero new telemetry.
- String interpolation used in place of structured JSON logging.
- Missing correlation IDs, leaving log entries orphaned across concurrent requests.
- Unbounded user IDs, raw URLs, or stack traces used as metric labels.
- Latency tracked solely as an arithmetic mean without percentiles.
- Cause-based infrastructure alerts (CPU/Memory) paging engineers while user error rates remain unmonitored.

---

## Verification

Confirm post-instrumentation:

- [ ] Operational on-call questions are documented, with every signal mapping to a question.
- [ ] All logs are structured JSON containing stable event names and correlation IDs.
- [ ] Zero unredacted secrets, auth tokens, or PII appear in log outputs.
- [ ] RED metrics are configured for all new endpoints with bounded label cardinality.
- [ ] Latency is recorded as a histogram with queryable p95/p99 percentiles.
- [ ] End-to-end distributed traces render seamlessly across all service hops.
- [ ] Alerts are symptom-based, linked to runbooks, and tested with sample triggers.

For the comprehensive pre-release checklist, consult `references/observability-checklist.md`.

## Related Skills

| Direction | Skill / Agent | Relationship |
|---|---|---|
| Boundary | `metrics-designer` | Business KPI / North Star Metric design (Customer value vs. Engineering system health) |
| Subsequent | `systematic-debugging` | Telemetry directly dictates incident resolution speed |
| Subsequent (Web) | `web-performance-auditor` | Traces and metrics provide foundation data for Core Web Vitals audits |

## Maintenance

- **Sources**: `oss/agent-skills/skills/observability-and-instrumentation/SKILL.md` (MIT), OpenTelemetry official documentation, Google SRE Book (*The Four Golden Signals*).
- **Last updated**: 2026-07-17
- **Known limits**: This skill provides instrumentation patterns. Provisioning production APM infrastructure, configuring on-call rotations, and routing alert notifications belong to project infrastructure domains (`infra-designer`).
