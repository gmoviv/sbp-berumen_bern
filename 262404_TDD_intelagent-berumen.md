# Technical Design Document — sbp-berumen / bern
**Status:** Baseline snapshot  
**Date:** 2026-04-24  
**Version:** 1.0 (pre-refactor)

---

## 1. Overview

A Next.js web app built for **Berumen** (Mexican market research agency) that lets users stress-test business ideas using AI-powered synthetic personas. Target users are Mexican healthcare/wellness SMBs (nutritionists, dentists, psychologists, physiotherapists, aesthetics).

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Auth | Auth.js / NextAuth — credentials + JWT, mandatory 2FA |
| AI | OpenAI API (chat + embeddings), Vercel AI SDK (`streamObject`) |
| Database | PostgreSQL + pgvector (via `pg` pool) |
| RAG | Hybrid search: FTS (`tsvector`) + HNSW vector search, RRF re-ranking |
| Rate Limiting | Upstash Redis (sliding window) |
| Styling | Tailwind CSS v4 |
| i18n | Custom provider — `es-MX` / `en-US` |
| CI | GitHub Actions — lint + type-check + dry-run build |
| Deploy | Vercel |

---

## 3. Product Surfaces

| Route | Description |
|---|---|
| `/` | Idea Stress Test — main feature |
| `/copywriter` | Persona-aware social copy generation |
| `/profile` | Account overview + 2FA setup wizard |
| `/profile/security` | Password change |
| `/admin/users` | Admin-only user management (CRUD + roles) |
| `/login`, `/login/2fa` | Public auth routes |

---

## 4. Architecture

```
Client (Next.js App Router)
  └── API Routes (/app/api/*)
        ├── stress-test          → streamObject → OpenAI (streaming)
        ├── berumen              → OpenAI chat (JSON mode)
        ├── copywriter           → OpenAI chat (JSON mode) + fs data
        ├── idea-refinement      → OpenAI chat (2-step: analyze → rewrite)
        ├── scorecard            → deterministic scoring + aiNarrative
        ├── action-card          → OpenAI chat (JSON mode)
        ├── persona / personas   → DB CRUD
        └── auth, admin, account → NextAuth + DB

Shared Lib (/lib/*)
  ├── clients.ts           → singleton: pg pool, OpenAI, aiProvider
  ├── auth.ts              → NextAuth config, JWT callbacks, RBAC
  ├── rag.ts               → hybridSearch (FTS + vector + RRF)
  ├── personaProvider.ts   → loads persona MDX/JSON + RAG context
  ├── ratelimit.ts         → Upstash limiters (AI: 10/min, global: 60/min)
  ├── benchmarks.ts        → CPL/retention benchmarks per persona type
  ├── aiNarrative.ts       → scorecard narrative builder
  └── i18n/*               → translation config + messages

Data (/data/*)
  ├── personas/            → MDX/JSON persona definitions
  ├── copywriter/          → Platform + format specs (FB, IG, TT, YT, LI)
  ├── challengelevels/     → Stress intensity configs (supportive/direct/critical)
  └── global-knowledge/    → Company guidelines for copywriter
```

---

## 5. Key Data Flows

**Stress Test**
1. Client POSTs `{ personaType, challengeLevelId, idea, goal, evaluationFocus }`
2. `personaProvider` loads persona + runs `hybridSearch` for RAG context
3. `buildStressSystemPrompt` assembles system prompt with persona + challenge level
4. `streamObject` streams structured result back to client (Vercel AI SDK)
5. `onFinish` logs to `usage_logs` table async

**Copywriter**
1. Client POSTs `{ personaType, platforms, formats, message, goal }`
2. Route reads platform/format JSON from disk (`/data/copywriter/`) per request
3. Builds mega-prompt with persona context + platform/format specs
4. OpenAI returns structured JSON; validated with Zod before response

**Auth Flow**
1. Credentials login → password verify → if 2FA enabled, throw `TwoFactorRequiredError`
2. Client redirects to `/login/2fa` → TOTP verify → session established
3. JWT callback enriches token with roles, apps, personas, `two_factor_enabled`, locale
4. Pages without 2FA: redirect to `/profile`; blocking modal on protected pages

---

## 6. Database Schema (inferred)

| Table | Purpose |
|---|---|
| `users` | Auth — email, password hash, 2FA secret/flag, locale |
| `roles` / `user_roles` | RBAC |
| `applications` / `role_applications` | App-level permissions |
| `user_personas` | User ↔ persona assignment |
| `documents` | RAG corpus — content, `content_tsvector`, `embedding` (pgvector) |
| `usage_logs` | AI call logging — event, persona, confidence, idea, verdict, payload |

---

## 7. AI Models

| Usage | Model | Mode |
|---|---|---|
| Stress test | `gpt-4o-mini` (default, overridable) | Streaming structured object |
| Berumen Q&A | `gpt-4o-mini` | JSON mode |
| Copywriter | `gpt-4o-mini` | JSON mode |
| Idea refinement | `gpt-4o-mini` | JSON mode (2 calls) |
| Embeddings (RAG) | `text-embedding-3-small` | — |

---

## 8. Known Issues & Gaps

| Severity | Issue |
|---|---|
| 🔴 Critical | **No auth on AI API routes** — `/api/stress-test`, `/api/berumen`, `/api/copywriter`, `/api/idea-refinement`, `/api/scorecard`, `/api/action-card` have no session check. No `middleware.ts` exists. |
| 🔴 Critical | **`ssl: { rejectUnauthorized: false }`** in production Postgres connection — disables cert validation. |
| 🟡 Notable | **RRF bug in `rag.ts`** — uses `Math.max` logic instead of score accumulation (`+=`), defeating the purpose of fusion. |
| 🟡 Notable | **OpenAI client not using shared singleton** — `copywriter` and `idea-refinement` instantiate `new OpenAI()` inside the handler on every request. |
| 🟡 Notable | **Copywriter reads data files from disk per request** — platform/format JSON should be cached at module level. |
| 🟡 Notable | **Rate limiter silently no-ops** if Upstash env vars are missing — `console.warn` only, no throw in production. |
| 🟢 Minor | `action-card/route.ts` uses `!` non-null assertion on `OPENAI_API_KEY` — will throw at import, not at call time. |
| 🟢 Minor | `.gemini/` skills directory committed to repo — likely should be gitignored. |
| 🟢 Minor | `POSTGRES_MAX_CONNECTIONS=10` on Vercel serverless — each lambda instance gets its own pool; connection proxy (PgBouncer / Supabase Pooler) needed before scaling. |

---

## 9. Open Questions

- Is `/api/berumen` intentionally public (demo mode) or an oversight?
- Is there a plan to support models other than OpenAI, or is the `aiProvider` abstraction speculative?
- Are `usage_logs` being actively monitored / surfaced anywhere in the UI?
- What's the intended persona expansion path — admin UI, or direct file editing?

---

## 10. Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | All AI features |
| `AUTH_SECRET` | ✅ | Session encryption |
| `POSTGRES_URL` | ✅ prod | Vercel DB connection |
| `POSTGRES_URL_LOCAL` | ✅ dev | Local Docker DB |
| `UPSTASH_REDIS_REST_URL` | ⚠️ | Rate limiting (silently skipped if absent) |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ | Rate limiting |
| `OPENAI_MODEL` | optional | Model override (default: `gpt-4o-mini`) |
| `POSTGRES_MAX_CONNECTIONS` | optional | Pool size (default: 10 prod / 1 dev) |
| `NEXT_PUBLIC_STRESS_DEBUG` | optional | Enables debug rationale in stress test output |
