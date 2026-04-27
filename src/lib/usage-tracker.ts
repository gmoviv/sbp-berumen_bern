import { randomUUID } from "node:crypto";
import { db } from "./clients";
import { logger } from "./logger";

// N13 — capture per-call telemetry from every LLM invocation. Best-effort:
// failures here must never break the user-facing request. C8 must be applied
// (scripts/db/usage-logs-schema.sql) before this can persist anything.

export type UsageRecord = {
  event: string;
  route: string;
  model?: string;
  personaName?: string;
  confidenceScore?: number;
  inputIdea?: string;
  goal?: string;
  verdict?: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  userId?: string;
  payload?: Record<string, unknown>;
};

export async function recordUsage(rec: UsageRecord): Promise<void> {
  try {
    await db.query(
      `INSERT INTO usage_logs (
         id, event, route, model, persona_name, confidence_score,
         input_idea, goal, verdict,
         prompt_tokens, completion_tokens, cached_tokens, total_tokens,
         latency_ms, user_id, payload
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)`,
      [
        randomUUID(),
        rec.event,
        rec.route,
        rec.model ?? null,
        rec.personaName ?? null,
        rec.confidenceScore ?? null,
        rec.inputIdea ?? null,
        rec.goal ?? null,
        rec.verdict ?? null,
        rec.promptTokens ?? null,
        rec.completionTokens ?? null,
        rec.cachedTokens ?? null,
        rec.totalTokens ?? null,
        rec.latencyMs ?? null,
        rec.userId ?? null,
        rec.payload ? JSON.stringify(rec.payload) : null,
      ]
    );
  } catch (err) {
    logger.warn({ err, event: rec.event, route: rec.route }, "recordUsage failed");
  }
}

// Helper: pull token counts from a Vercel AI SDK `generateObject` / `streamObject`
// usage object. The shape is provider-agnostic but optional fields vary.
export function tokensFromAiSdkUsage(usage: unknown): {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
} {
  if (!usage || typeof usage !== "object") return {};
  const u = usage as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  return {
    promptTokens: num(u.promptTokens) ?? num(u.inputTokens),
    completionTokens: num(u.completionTokens) ?? num(u.outputTokens),
    totalTokens: num(u.totalTokens),
    cachedTokens: num(u.cachedPromptTokens) ?? num(u.cachedTokens),
  };
}
