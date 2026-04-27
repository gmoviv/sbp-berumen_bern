// src/lib/scoring-engine.ts
import { generateObject, streamObject } from "ai";
import { z } from "zod";
import { aiProvider } from "./clients";
import {
  buildGraderSystem,
  buildGraderUser,
  buildSynthesisSystem,
  buildSynthesisUser,
  challengeLevelView,
} from "@/prompts/scoring-engine";
import type { ChallengeLevel } from "./challengeLevels";
import { logger } from "./logger";
import { generateScoringKey, getCachedScores, setCachedScores } from "./cache";
import { recordUsage, tokensFromAiSdkUsage } from "./usage-tracker";

// Two-stage Deterministic Scoring Engine.
//   Stage 1: one grader call → axis scores + red flags.
//   Stage 2: Node.js applies fixed 50/30/20 weights.
//   Stage 3: synthesis stream wraps the *frozen* integers in persona voice.
//
// Weight choice (50/30/20) intentionally matches the universal scoring
// protocol baked into the grader prompt. Bumping weights → also bump
// PROMPT_VERSION in cache.ts so old cached scores invalidate.
const WEIGHTS = {
  problemValidity: 0.5,
  solutionLogic: 0.3,
  pitchClarity: 0.2,
} as const;

const AxisSchema = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string().max(280),
});

const GraderSchema = z.object({
  problemValidity: AxisSchema,
  solutionLogic: AxisSchema,
  pitchClarity: AxisSchema,
  redFlags: z.array(z.string()).default([]),
  primaryDriver: z.string().max(280),
});

export type GraderResult = z.infer<typeof GraderSchema>;

export type ScoringEngineResult = {
  scores: {
    problemValidity: { score: number; rationale: string };
    solutionLogic: { score: number; rationale: string };
    pitchClarity: { score: number; rationale: string };
  };
  weightedScore: number;
  redFlags: string[];
  primaryDriver: string;
};

function applyWeights(g: GraderResult): number {
  return Math.round(
    g.problemValidity.score * WEIGHTS.problemValidity +
      g.solutionLogic.score * WEIGHTS.solutionLogic +
      g.pitchClarity.score * WEIGHTS.pitchClarity
  );
}

export async function runScoringEngine(args: {
  personaId: string;
  personaName: string;
  personaContext: string;
  idea: string;
  goal: string;
  evaluationLens?: string;
  challengeLevel: ChallengeLevel;
  model?: string;
  userId?: string;
}): Promise<ScoringEngineResult> {
  const cacheKey = generateScoringKey({
    personaId: args.personaId,
    idea: args.idea,
    goal: args.goal,
    evaluationLens: args.evaluationLens,
  });

  const cached = (await getCachedScores(cacheKey)) as ScoringEngineResult | null;
  if (cached) return cached;

  const modelName = args.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const model = aiProvider(modelName);
  const levelView = challengeLevelView(args.challengeLevel);

  const system = buildGraderSystem({
    personaName: args.personaName,
    personaContext: args.personaContext,
    challengeLevel: levelView,
  });
  const user = buildGraderUser({
    idea: args.idea,
    goal: args.goal,
    evaluationLens: args.evaluationLens,
  });

  logger.info(
    { persona: args.personaName, model: modelName, challengeLevel: levelView.name },
    "[scoring] grader call"
  );

  const startedAt = Date.now();
  const grader = await generateObject({
    model,
    schema: GraderSchema,
    system,
    prompt: user,
    temperature: 0, // N17 — determinism is the whole point of the engine.
  });
  const latencyMs = Date.now() - startedAt;

  const weightedScore = applyWeights(grader.object);

  const result: ScoringEngineResult = {
    scores: {
      problemValidity: grader.object.problemValidity,
      solutionLogic: grader.object.solutionLogic,
      pitchClarity: grader.object.pitchClarity,
    },
    weightedScore,
    redFlags: grader.object.redFlags,
    primaryDriver: grader.object.primaryDriver,
  };

  logger.info({ weightedScore, latencyMs }, "[scoring] grader completed");

  // Telemetry — best effort, never blocking.
  void recordUsage({
    event: "stress_test_grader",
    route: "/api/stress-test",
    model: modelName,
    personaName: args.personaName,
    confidenceScore: weightedScore,
    inputIdea: args.idea,
    goal: args.goal,
    latencyMs,
    userId: args.userId,
    payload: {
      challengeLevel: levelView.name,
      attackMode: levelView.attackMode,
      evaluationLens: args.evaluationLens ?? null,
      scores: result.scores,
      redFlagCount: result.redFlags.length,
    },
    ...tokensFromAiSdkUsage(grader.usage),
  });

  await setCachedScores(cacheKey, result);

  return result;
}

const FinalSynthesisSchema = z.object({
  personaReaction: z.string(),
  triggeredRedFlags: z.array(z.string()),
  verdict: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  actionPlan: z.array(z.string()),
  presentation: z.string(),
  followUpQuestions: z.array(z.string()),
  confidenceScore: z.number().int().min(0).max(100),
  confidenceBreakdown: z.object({
    problemValidity: z.number().int().min(0).max(100),
    solutionLogic: z.number().int().min(0).max(100),
    pitchClarity: z.number().int().min(0).max(100),
  }),
  scoringRationale: z.object({
    problemValidity: z.string(),
    solutionLogic: z.string(),
    pitchClarity: z.string(),
  }),
});

export function streamSynthesis(args: {
  personaName: string;
  personaContext: string;
  idea: string;
  goal: string;
  scores: ScoringEngineResult["scores"];
  weightedScore: number;
  redFlags: string[];
  primaryDriver: string;
  challengeLevel: { name: string; guidance: string };
  model?: string;
  userId?: string;
}) {
  const modelName = args.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const model = aiProvider(modelName);

  const system = buildSynthesisSystem({
    personaName: args.personaName,
    challengeLevel: args.challengeLevel,
  });
  const prompt = buildSynthesisUser({
    personaContext: args.personaContext,
    idea: args.idea,
    goal: args.goal,
    scores: args.scores,
    weightedScore: args.weightedScore,
    redFlags: args.redFlags,
    primaryDriver: args.primaryDriver,
  });

  const startedAt = Date.now();
  const stream = streamObject({
    model,
    schema: FinalSynthesisSchema,
    system,
    prompt,
    temperature: 0,
    onFinish: ({ usage, object }) => {
      void recordUsage({
        event: "stress_test_synthesis",
        route: "/api/stress-test",
        model: modelName,
        personaName: args.personaName,
        confidenceScore: args.weightedScore,
        inputIdea: args.idea,
        goal: args.goal,
        verdict: typeof object?.verdict === "string" ? object.verdict.slice(0, 1000) : undefined,
        latencyMs: Date.now() - startedAt,
        userId: args.userId,
        payload: { challengeLevel: args.challengeLevel.name },
        ...tokensFromAiSdkUsage(usage),
      });
    },
  });

  return stream;
}
