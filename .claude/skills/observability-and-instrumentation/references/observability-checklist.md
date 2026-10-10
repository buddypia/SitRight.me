# Pre-Release Observability Checklist

> **Source**: `oss/agent-skills/references/observability-checklist.md` (MIT)
> **Adaptation**: Translated to English prose with added context notes for brief2dev's 3 platform lineups (Next.js / Flutter / Tauri). Section structure and checkbox hierarchy preserved from original.
> **Loaded by**: Referenced in `observability-and-instrumentation/SKILL.md` during verification.

A quick reference for instrumenting production code. Use in conjunction with the `observability-and-instrumentation` skill.

## On-Call Questions (Start Here)

Telemetry without questions is noise. Verify before writing instrumentation:

- [ ] 2–4 operational questions an on-call engineer would ask during an incident are documented.
- [ ] Every signal listed below maps directly to one of those questions.
- [ ] Each question pairs with the appropriate signal archetype: Metrics = "WHAT", Traces = "WHERE", Logs = "WHY".

## Structured Logging

- [ ] Logs are structured (JSON) with stable `event` names — no arbitrary string interpolation.
- [ ] Every log line contains a correlation/request ID generated or received at the system boundary.
- [ ] Correlation IDs propagate across all external network calls and asynchronous boundaries (HTTP headers, queue metadata).
- [ ] Log levels are applied consistently: `error` = invariant violated (action required), `warn` = degraded but recovered, `info` = significant lifecycle events, `debug` = disabled by default in production.
- [ ] Zero secrets, auth tokens, passwords, or unredacted PII appear in any log line.
- [ ] Logged fields use strict allowlists — no dumping full request/response bodies or authorization headers.
- [ ] Outbound external API calls log metadata only: target endpoint, HTTP status, latency, attempt count, sanitized identifiers.
- [ ] Sample real log outputs to verify proper JSON field serialization without broken `[object Object]` values.

## Metrics

- [ ] **RED** (Rate / Errors / Duration) instrumented across all endpoints and external dependencies.
- [ ] **USE** (Utilization / Saturation / Errors) instrumented across all resources (thread pools, queues, DB connections).
- [ ] Latency is recorded as a histogram with queryable p50/p95/p99 percentiles — never as arithmetic means.
- [ ] All label values are drawn from small, bounded sets (route templates, status classes, provider names).
- [ ] No unbounded label values (user IDs, tenant IDs, email addresses, raw URLs, request IDs, error traces).
- [ ] HTTP status codes are grouped into classes (`5xx` rather than discrete `503`).
- [ ] Queue depth and processing duration are tracked across all background workers and queues.

## Distributed Tracing

- [ ] OpenTelemetry (or equivalent SDK) initializes at application bootstrap before other imports.
- [ ] Auto-instrumentation is active across HTTP, gRPC, and database client drivers.
- [ ] Trace context propagates across all outbound calls (W3C `traceparent`/`tracestate`) and is extracted on inbound requests.
- [ ] Context is preserved across async boundaries — message queues carry trace metadata.
- [ ] Manual spans are reserved for significant internal domain operations with attributes useful for on-call filtering.
- [ ] Span attributes are scrubbed of secrets and PII.
- [ ] Defaults to low-rate head-based sampling; error traces are 100% preserved when tail sampling is available.

> **Platform Lineup Note**: Next.js Edge Runtime does not support the full Node OTel SDK — verify lightweight HTTP trace exporters for Edge routes. Mobile (Flutter) and Desktop (Tauri) apply client-side APM patterns (see `SKILL.md`).

## Alerting

- [ ] All alerts are symptom-based (error rate, p99 latency, queue processing age) — cause metrics (CPU, disk, pod restarts) belong on dashboards, not pagers.
- [ ] All alerts are actionable; delete alerts that can be safely ignored because they self-resolve.
- [ ] Every alert links directly to a runbook — minimum 3 lines: operational impact, initial diagnostic query, escalation path.
- [ ] Alert thresholds and duration windows are justified by SLOs or historical baseline data.
- [ ] Severities use strictly 2 tiers: **Page** (immediate user impact requiring urgent response) and **Ticket** (minor degradation addressed during business hours).
- [ ] Test-fire every new alert once to confirm delivery to the correct notification channel and verify runbook links.
- [ ] No recurring alerts that trigger daily without engineering action.

## Dashboards

- [ ] Core service health dashboard exists: error rate, p99 latency, traffic throughput, resource saturation.
- [ ] Dependency health panel displays per-dependency error rates and latencies.
- [ ] Dashboards directly answer the On-Call Questions defined above.
- [ ] Default dashboard time windows are sensible (1h–6h, not 30 days).

## Telemetry Self-Verification

Instrumentation is code and must be tested:

- [ ] Trigger an error in staging → locate the trace and log entries using the correlation ID.
- [ ] Send test traffic → verify metric time series appear with expected labels and reasonable values.
- [ ] Trace a single request end-to-end through the tracing UI → verify zero broken span linkages.
- [ ] Successfully diagnose a simulated failure using telemetry alone without reading the source code.

## Pre-Release Gate

Before deploying features to production, verify all criteria are met:

- [ ] Structured logs are streaming reliably into the central log aggregator.
- [ ] RED metrics for all new endpoints and dependencies render on health dashboards.
- [ ] At least one symptom-based alert is configured, linked to a runbook, and test-fired.
- [ ] Distributed tracing spans all services touched by the request lifecycle.
- [ ] On-call engineers know the location and content of the runbook.
