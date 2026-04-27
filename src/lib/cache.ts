// src/lib/cache.ts
import { redis } from "./clients";
import { logger } from "./logger";
import crypto from "node:crypto";

// Bumped whenever scoring prompts or schema change. Cache hits cross-versions
// would serve stale scores under the new prompt — invalidate by bumping this.
export const PROMPT_VERSION = "v2-2026-04-26";

/**
 * Deterministic Key Generator for Consistency Anchors.
 */
export function generateScoringKey(args: {
  personaId: string;
  idea: string;
  goal: string;
  evaluationLens?: string;
}) {
  const hash = crypto
    .createHash("sha256")
    .update(
      `${PROMPT_VERSION}:${args.personaId}:${args.idea}:${args.goal}:${args.evaluationLens || ""}`
    )
    .digest("hex");

  return `dse:cache:${hash}`;
}

/**
 * Get cached scores for a specific input.
 */
export async function getCachedScores(key: string) {
  if (!redis) return null;

  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.info({ key }, "Cache hit for DSE scoring");
      return cached as unknown;
    }
  } catch (err) {
    logger.error({ err, key }, "Failed to get cached scores");
  }

  return null;
}

/**
 * Save scores to cache.
 */
export async function setCachedScores(key: string, data: unknown) {
  if (!redis) return;

  try {
    // 7-day TTL. PROMPT_VERSION in the key handles invalidation on prompt
    // changes; this TTL only protects against stale data when the prompt is
    // unchanged but persona/RAG layers shift underneath.
    await redis.set(key, data, { ex: 604800 });
    logger.info({ key }, "Cached DSE scoring result");
  } catch (err) {
    logger.error({ err, key }, "Failed to cache scores");
  }
}
