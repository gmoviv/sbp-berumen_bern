// src/components/stress-test/types.ts
import { z } from "zod";

export const SimulationResultSchema = z.object({
  personaReaction: z.string(),
  triggeredRedFlags: z.array(z.string()),
  verdict: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  actionPlan: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
  presentation: z.string(),
  confidenceScore: z.number().min(0).max(100),
  confidenceBreakdown: z.object({
    problemValidity: z.number().min(0).max(100),
    solutionLogic: z.number().min(0).max(100),
    pitchClarity: z.number().min(0).max(100),
  }).optional(),
  scoringRationale: z.object({
    problemValidity: z.string(),
    solutionLogic: z.string(),
    pitchClarity: z.string(),
  }).optional(),
  debugRationale: z.string().optional(),
});

export type StressResult = z.infer<typeof SimulationResultSchema> & {
    persona?: string;
    challengeLevel?: number;
    challengeLevelId?: string;
    challengeDetail?: string;
    challengeLabel?: string;
    focus?: string;
    debug?: {
        rawModelOutput?: string;
        retried?: boolean;
        model?: string;
        temperature?: number;
        retryTemperature?: number;
        systemPrompt?: string;
        userPrompt?: string;
        personaContext?: string;
        ragHighlights?: string | null;
    };
};

export type ChallengeLevelOption = {
    id: string;
    name: string;
    detail: string;
    intensity: number;
};

export type PersonaOption = {
    id: string;
    name: string;
};

export const FIELD_LIMITS = {
    idea: { min: 10, max: 1500 },
    goal: { min: 5, max: 300 },
    evaluationFocus: { min: 5, max: 300 },
};
