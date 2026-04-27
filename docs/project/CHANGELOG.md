Changelog

All notable changes to Synthetic Persona Web will be documented in this file.
This project adheres to Semantic Versioning and follows a simplified Keep a Changelog format.

⸻

[Unreleased]

Scoring engine — bleed/504/telemetry (2026-04-27 — branch `gmo-updates`)

Reasoning (cognitive-bleed fix)
  • **C10 + C11 — Single adversarial grader.** Collapsed three parallel micro-agents into one `generateObject` call returning all axes. The grader prompt is a port of the previously-dead `src/app/api/stress-test/prompt.ts` — Truth Anchor, Selfish Filter, Diamond-in-the-Rough rule, Independence Rule, Attack Mode, explicit 0–40/41–60/61–80/81–100 bands. Forces the model to evaluate failure conditions before scoring; blocks "good Goal → high Idea score" cross-contamination. Modified: `src/prompts/scoring-engine.ts`, `src/lib/scoring-engine.ts`. Deleted: `src/app/api/stress-test/prompt.ts` (dead since the active route bypassed it).
  • **C12 — Axis alignment.** Grader and synthesis schemas now both use `{problemValidity, solutionLogic, pitchClarity}` (matches the UI consumers). Synthesis no longer fabricates a mapping between mismatched axes. Modified: `src/lib/scoring-engine.ts`, `src/components/stress-test/types.ts`, `src/components/stress-test/ScoringBreakdown.tsx`, `src/components/stress-test/AnalysisResults.tsx`.
  • **Frozen synthesis.** Stage 1 integers are passed to synthesis as JSON literals with explicit "echo verbatim, do NOT modify" instruction. Score variance between runs is now zero (was non-deterministic).
  • **N17 — `temperature: 0`** on grader and synthesis. Same input → same output.

Performance (free-tier 504 fix)
  • **`maxDuration = 60` on `/api/stress-test`.** Free Vercel Node functions cap at 10s by default; the streaming route now gets the 60s ceiling for grader latency + first synthesis chunk. Modified: `src/app/api/stress-test/route.ts`.
  • **C9 — RRF max → sum** in `src/lib/rag.ts`. Reciprocal Rank Fusion now correctly sums per-ranker contributions, restoring fusion's discrimination across vector + keyword search.
  • **N14 — Embedding cache.** `hybridSearch` now Redis-caches `text-embedding-3-small` outputs by `sha256(query)` with a 1hr TTL. Same query no longer re-embeds. Modified: `src/lib/rag.ts`.

Telemetry
  • **C8 — `usage_logs` migration.** New `scripts/db/usage-logs-schema.sql` (idempotent, with backfill ALTERs) creates the table the copywriter route was already INSERTing into silently. Run with `npm run db:usage-logs:setup`.
  • **N13 — `recordUsage()` helper.** New `src/lib/usage-tracker.ts` writes per-call telemetry: token counts (prompt/completion/cached/total), latency, model, route, persona, score. Best-effort — failures never block the user-facing request. Wired into both grader (`generateObject`) and synthesis (`streamObject` `onFinish`).

Cache safety
  • **`PROMPT_VERSION = "v2-2026-04-26"`** baked into the scoring cache key. Prompt changes invalidate stale scores instead of silently serving them under new logic. Modified: `src/lib/cache.ts`.

Verification
  • **`scripts/eval/scoring.ts`** — five fixed test ideas (1 strong / 1 weak / 3 borderline) covering score spread, per-axis differentiation, red-flag surfacing. Run with `npm run eval:scoring [-- --persona=<id> --level=<id>]` before merging any prompt change. Manual eyeball gate; replaces statistical telemetry while traffic is low.

Notes
  • Apply the migration before deploy: `npm run db:usage-logs:setup` (uses `.env.local`'s `POSTGRES_URL_LOCAL` or `POSTGRES_URL`).
  • Lint warnings dropped from 74 → 66 (removed the `as any` casts on `confidenceBreakdown` / `scoringRationale` once axes aligned).
  • Out of scope, still: C5 (Postgres SSL `rejectUnauthorized`), N15/N16 (berumen/copywriter prompt redundancy), Claude Sonnet for synthesis (deferred until traffic justifies the cost-per-token shift).

⸻

Security (2026-04-25 — audit exploit-chain patch on branch `gmo-updates`)
  • **C1 — Server-bound 2FA step.** The credentials provider no longer trusts a client-supplied `is2fa` flag. Step 1 (password) issues a signed, HttpOnly, single-use challenge cookie tied to a Redis JTI; step 2 (TOTP) verifies the cookie before checking the code. Closes the account-takeover-with-email-only path. New: `src/lib/twofa-challenge.ts`. Modified: `src/lib/auth.ts`.
  • **C2 — Rate limit on `/api/auth/*`.** Removed the auth-route exemption from middleware. Added `authLimiter` (10 req / 15 min) for auth endpoints; max 5 TOTP attempts per challenge token before invalidation. Modified: `middleware.ts`, `src/lib/ratelimit.ts`.
  • **C3 — `requireAuth` on AI routes.** New `src/lib/api-auth.ts` helper. Wrapped all 7 AI route handlers (`stress-test`, `persona`, `berumen`, `copywriter`, `idea-refinement`, `scorecard`, `action-card`). Anonymous calls now return 401 instead of running up the OpenAI bill.
  • **C4 — Real client IP for rate limiting.** Replaced `(req as any).ip` (silently `undefined` in Next 15+) with `x-forwarded-for` / `x-real-ip` parsing. Each client now gets an independent rate-limit bucket. Modified: `middleware.ts`.
  • **C6 — 2FA degraded-state hard-fail.** When `two_factor_enabled=true` but `two_factor_secret=NULL`, login is now refused with `2fa_state_invalid` instead of silently downgrading. Forces admin-mediated re-enrollment. Modified: `src/lib/auth.ts`.
  • **N5 — Fail-closed rate limiter.** When `UPSTASH_REDIS_REST_*` env vars are missing in production, AI and auth routes now reject requests instead of silently no-op'ing. Read-only metadata routes still fail-open for dev ergonomics. Modified: `src/lib/ratelimit.ts`.

Changed
  • **C13 — CI quality gates restored.** Replaced the `ignores: ["**/*"]` ESLint stub with a real flat config extending `eslint-config-next/core-web-vitals` + `/typescript`. Removed `typescript.ignoreBuildErrors` from `next.config.ts`. Build now blocks on TS errors and lint failures. 74 pre-existing `any` / unused-var warnings remain (non-blocking) for follow-up. Modified: `eslint.config.mjs`, `next.config.ts`.
  • Lint-clean fixes for the 3 errors that surfaced once gates were restored: `src/components/ui/button.tsx` (empty interface → type alias), `src/lib/totp.ts` (`@ts-ignore` → `@ts-expect-error`), `src/app/(public)/login/page.tsx` (effect-derived state moved out of `useEffect`).
  • Rate-limiter route detection widened to include `/api/berumen`, `/api/scorecard`, `/api/action-card` (previously uncovered by the AI bucket).

Notes
  • Build still requires populated env vars (`POSTGRES_URL` / `OPENAI_API_KEY`) — `clients.ts` throws at module import. Pre-existing; not introduced by this batch.
  • Out of scope for this patch but called out in the audit: C5 (Postgres SSL `rejectUnauthorized: true`), C7–C12 (RAG / scoring axes), C8 (`usage_logs` migration), test coverage for `totp.ts` and the auth flow.

⸻

  • Credentials auth + guided 2FA onboarding flow on `/profile`.
  • Users without 2FA are redirected to `/profile` after login and blocked by a modal on other protected pages.
  • Session now propagates `two_factor_enabled` for accurate profile status.
  • Public self-registration disabled; user provisioning is now admin-only via `/admin/users`.
  • Added admin user-management APIs: `/api/admin/users` and `/api/admin/users/[id]`.
  • Added authenticated password-change flow on `/profile/security` via `/api/account/password/change` (current password + 2FA code).
  • `/register` is now a compatibility redirect route to `/admin/users` (still middleware-protected).
  • Documentation updated for auth endpoints, required `AUTH_SECRET`, and Vercel preview/prod setup.
  • Deployment runbook now documents `db:auth:setup` behavior and production-targeting requirements.
  • Add multi-language support (EN/ES switch).
  • Persona image/avatar generation.
  • Export results to PDF and CSV.
  • Admin dashboard for benchmark management.
  • Removed legacy UI routes (`/consultas`, `/market-research`, `/construction-personas`) and the `docs/CONSULTAS.md` page; underlying APIs remain available for integrations.


⸻

[0.3.0] - 2025-10-06

Added
  • **/consultas page:** new standalone interface for persona Q&A.
    - Persona selector connected to `/api/personas`.
    - Industry dropdown (“Tu industria”) for context-aware replies.
    - Input field with guided prompt (“Soy [Persona]. Pregúntame algo…”).
    - Server-side POST `/api/persona` integration returning structured responses (reaction, answer, doubts, trust signals, conversion likelihood).
    - Clean, responsive UI (rounded cards, indigo primary button, minimal layout).

  • **Documentation Expansion:** 
    - Added `docs/CONSULTAS.md` with endpoint, UI, and dev notes.
    - Added `docs/UX Wireframes.md` and `docs/Design System.md` for design clarity.
    - Updated `README.md`, `ARCHITECTURE.md`, and `API.md` to reflect new page and endpoints.

Changed
  • Unified naming conventions for industry fields (`businessType` → “Tu industria”).
  • Minor UI polish (padding, text hierarchy, card consistency).
  • Persona answer rendering now respects Markdown line breaks for clarity.

Notes
  • The `/consultas` page uses the same OpenAI backend as Scorecard and Insights.
  • Planned next: multi-turn persona memory and conversation history export.

⸻

[0.2.0] - 2025-10-01

Added
  • Persona Q&A direct answers: Personas now reply specifically to user questions in first person (answerToQuestion).
  • Insights contextualization: Actionable insights now include steps and KPIs tied to the actual asked question.
  • How to Talk section: Communication guidance for each persona based on channels, tone, and ticket size.
  • Docs suite: Added README.md, ARCHITECTURE.md, CONTRIBUTING.md, DEPLOYMENT.md, ENVIRONMENT.md, API.md, and TESTING.md.

Changed
  • Improved scorecard narrative: clarified client vs. lead ambiguity and refined ROAS explanation.
  • Enhanced buildActionableInsights to summarize client wants in one sentence.
  • Deployment build: added next.config.js override to bypass strict ESLint/TS checks.

Fixed
  • Drift guard for persona Q&A to prevent cross-industry bleed (e.g., nutrition terms in real estate personas).
  • IntakeForm UI now echoes the asked question and displays persona’s direct answer.

⸻

[0.1.0] - 2025-09-20

Added
  • Initial MVP release.
  • Scorecard: efficiency score, CPL/ROAS diagnostics with LLM + fallback.
  • Persona Q&A: natural-language replies in first person with doubts, suggestions, and likelihood of conversion.
  • Insights: actionable steps, expected impact, KPIs, and trust-building tactics.
  • Vercel Deployment with GitHub integration.

Known Issues
  • Some ESLint strict typing errors suppressed for deployment.
  • Q&A answers not yet tied to asked question (fixed in 0.2.0).

⸻

Format Notes
  • Each entry includes: Added, Changed, Fixed, Removed (if applicable).
  • Dates follow YYYY-MM-DD.
  • Keep Unreleased at the top for pending changes.
