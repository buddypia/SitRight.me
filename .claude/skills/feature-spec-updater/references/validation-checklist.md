# SPEC Modification Validation Checklist (Phase 4)

> Reference material migrated directly from the main `SKILL.md` body (R-CM-019 4.2 Tier separation).
> Consult this file as needed during verification.

### Phase 4: Validation & Handover

1. **Self-Validation Checklist**:

   **Basic Verification**:
   - [ ] Are ACs in modified FRs complete?
   - [ ] **Are ACs formatted as 5-column BDD tables?** (`| AC | Given | When | Then | Verification Observation |`)
   - [ ] **Do Exception Flows (EF) tables exist?**
   - [ ] Are dependent documents (Screens, etc.) synchronized?
   - [ ] Is Revision History (§7) appended?

   **On §0.0 Project Context Updates**:
   - [ ] Are naming conventions consistent with existing project patterns?
   - [ ] Are glossary references (`docs/glossary.md`) preserved?

   **On §0.2.2 React Hook Specifications Updates**:
   - [ ] Are lifecycle and dependency array policies explicitly defined?
   - [ ] Is Hook initialization and cleanup timing unambiguous?

   **On §0.2.3 State Transitions Updates**:
   - [ ] Is the state transition diagram updated?
   - [ ] Are permissible state transitions and invariants declared?

   **On §0.3 Error Handling Updates**:
   - [ ] Are all 4 levels (Hook / API / Component / Global) defined?
   - [ ] Are handling policies specified for each distinct error type?

   **On §0.4 Data Schema Updates**:
   - [ ] Does §0.4.1 Zod schema match TypeScript type definitions?
   - [ ] Are §0.4.2 validation rules comprehensive?

   **On §0.5 API Contract Updates**:
   - [ ] Do Request/Response schemas match API Route code?
   - [ ] Are Error Codes exhaustively defined?
   - [ ] Are client-side fallback policies declared?

   **On §0.6 NFR Updates**:
   - [ ] Are performance goals (latency, throughput) expressed in measurable terms?
   - [ ] Are cost ceilings specified for AI-driven capabilities?

   **On §0.7 AI Logic & Prompts Updates**:
   - [ ] Is the full System Prompt text specified verbatim? (Summaries prohibited)
   - [ ] Does the Response Schema align with the API Route's `responseSchema`?
   - [ ] Is the prompt variable injection table complete?
   - [ ] Is the role definition table updated?

   **On §0.8 Safety & Guardrails Updates**:
   - [ ] Are input/output validation guardrails explicitly defined?
   - [ ] Is the Rate Limiting policy specified?
   - [ ] Are fallback strategies and user copy declared?

   **On §0.9 Design Tokens Updates**:
   - [ ] Are theme references (`globals.css`) preserved?
   - [ ] Are custom design tokens defined where necessary?

   **On §1.4 Goals / Non-Goals Updates**:
   - [ ] Are Goals formulated as actionable checklists?
   - [ ] Do Non-Goals explain "why excluded" explicitly?

   **On §1.5 Screen Flow Updates**:
   - [ ] Is the screen navigation diagram updated?
   - [ ] Are entry and exit points clearly marked?

   **On §2.X Business Rules Updates**:
   - [ ] Is business logic pseudocode updated?
   - [ ] Are boundary and edge cases documented?

   **On §3.4 Sequence Diagrams Updates**:
   - [ ] Do at least 2 paths (Happy Path + Error Path) exist?
   - [ ] Is the responsibility allocation table synchronized?
   - [ ] Are timeout policies explicitly documented?

   **On §5 Verification & Testing Updates**:
   - [ ] Are Test Fixtures updated?
   - [ ] Does the Acceptance Checklist reflect all updates?

   **On §6 Message Definitions Updates**:
   - [ ] Are `messages.ts` key naming conventions honored?
   - [ ] Is the catalog of keys to add comprehensive?

2. **Handover Message**:

   ```markdown
   SPEC Modification Complete

   **Modified Files**:
   - `SPEC-006-payment-system.md` (Updated FR-00602)

   **Change Summary**:
   - Switched from email to push notification dispatch
   - Data Schema: Added `pushToken` field

   **Next Steps**:
   -> Verify via feature-pilot's built-in Readiness Gate.
   Alternatively, proceed directly with implementation.
   ```
