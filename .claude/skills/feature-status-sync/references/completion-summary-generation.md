# Completion Summary Automated Generation Protocol (Phase 4.7)

> Reference material migrated directly from the main `SKILL.md` body (R-CM-019 4.2 Tier separation).
> Consult this file as needed upon reaching 100% progress.

### Phase 4.7: Automated Completion Summary Generation (GSD Pattern)

> **Purpose**: When feature implementation concludes (`progress.percentage === 100`), automatically extract **what was produced** from the codebase and record it in `completion_summary`.
> When downstream features depend on this feature, the AI can reference `completion_summary.produces` directly without re-reading the entire codebase.
> Adapts GSD's Slice Summary pattern to brief2dev's modular feature architecture.

**Activation Criteria**: `progress.percentage >= 100` (all FRs completed)

**Extraction Procedure**:

1. **Extract Exports** — Parse `export` statements from the barrel file (`{FEATURES_DIR}/<feature>/index.ts` or equivalent):

   ```bash
   # Extract named exports from barrel file
   Grep "^export" {FEATURES_DIR}/<feature>/index.ts
   # Or in Flutter: Grep "^export" lib/features/<feature>/<feature>.dart
   ```

2. **Extract Types** — Extract exported interface and type identifiers from the `types/` directory:

   ```bash
   Grep "export (type|interface|class|enum)" {FEATURES_DIR}/<feature>/types/
   ```

3. **Extract API Endpoints** — Extract HTTP methods and route paths from the `api/` directory:

   ```bash
   # Next.js: Exported HTTP methods in route.ts under app/api/
   Grep "export (async function|const) (GET|POST|PUT|DELETE|PATCH)" {SOURCE_ROOT}/app/api/
   # Flutter: URL patterns under repositories/
   Grep "Uri.parse|http\.(get|post|put|delete)" {FEATURES_DIR}/<feature>/repositories/
   ```

4. **Extract Patterns** — Aggregate pattern keywords from `SPEC.md` §0.4 (Technical Decisions) and code comments:

   ```bash
   Grep "Pattern:" docs/features/<feature>/SPEC.md
   ```

5. **Extract Dependencies (Consumes)** — Detect external feature imports across codebase:

   ```bash
   # Detect imports from other feature subtrees
   Grep "from.*features/(?!<current-feature>)" {FEATURES_DIR}/<feature>/ --type ts
   ```

6. **Record in CONTEXT.json**:

   ```json
   {
     "completion_summary": {
       "produces": {
         "types": ["User", "AuthToken", "LoginRequest"],
         "exports": ["generateToken()", "verifyToken()", "LoginForm", "useAuth()"],
         "api_endpoints": ["POST /api/auth/login", "POST /api/auth/register", "GET /api/auth/me"],
         "patterns_established": ["JWT refresh rotation", "Zod request validation"]
       },
       "consumes": {
         "from_features": []
       },
       "files_created": [
         "{FEATURES_DIR}/auth/types/auth.types.ts",
         "{FEATURES_DIR}/auth/api/auth.ts",
         "{FEATURES_DIR}/auth/components/LoginForm.tsx",
         "{FEATURES_DIR}/auth/hooks/useAuth.ts"
       ],
       "generated_at": "2026-03-25T21:00:00+09:00",
       "generated_by": "feature-status-sync"
     }
   }
   ```

**Incomplete Features**: If `progress.percentage < 100`, maintain `completion_summary` as `null`. Partial summaries are prohibited.

**Downstream Ingestion**: When `feature-architect` bootstraps a new feature's `CONTEXT.json`, it ingests `completion_summary.produces` from features listed in `references.dependencies.features` directly into the AI context window (~500 tokens per feature).
