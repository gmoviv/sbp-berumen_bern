// src/app/api/stress-test/route.ts
import { z } from "zod";
import { getPersona } from "@/lib/personaProvider";
import { getChallengeLevel } from "@/lib/challengeLevels";
import { describeFocus } from "@/prompts/scoring-engine";
import { logger } from "@/lib/logger";
import { runScoringEngine, streamSynthesis } from "@/lib/scoring-engine";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

// Free-tier Vercel caps Node functions at 10s by default; opt up to 60s for
// streaming routes. Stage 1 grader + first synthesis token must clear within
// this window or the connection 504s.
export const maxDuration = 60;

const Body = z.object({
  personaType: z.string(),
  challengeLevelId: z.string(),
  idea: z.string().min(10).max(1500),
  goal: z.string().min(5).max(300),
  evaluationFocus: z.string().min(5).max(300),
});

export async function POST(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) return gate.response;

  try {
    const body = Body.parse(await req.json());
    const persona = await getPersona(body.personaType, body.idea);
    if (!persona) {
      return new Response(JSON.stringify({ error: "Persona not found" }), { status: 404 });
    }

    const challengeLevel = await getChallengeLevel(body.challengeLevelId);
    if (!challengeLevel) {
      return new Response(JSON.stringify({ error: "Challenge level not found" }), { status: 400 });
    }

    const focusMeta = describeFocus(body.evaluationFocus);

    // Stage 1 — single grader call (axis scores + red flags + driver).
    // Stage 2 — Node math, applied inside runScoringEngine.
    const { scores, weightedScore, redFlags, primaryDriver } = await runScoringEngine({
      personaId: persona.id,
      personaName: persona.name,
      personaContext: persona.context,
      idea: body.idea,
      goal: body.goal,
      evaluationLens: focusMeta.label,
      challengeLevel,
      userId: gate.userId,
    });

    // Stage 3 — synthesis stream. Frozen integers passed through verbatim.
    const result = streamSynthesis({
      personaName: persona.name,
      personaContext: persona.context,
      idea: body.idea,
      goal: body.goal,
      scores,
      weightedScore,
      redFlags,
      primaryDriver,
      challengeLevel: {
        name: challengeLevel.name,
        guidance: challengeLevel.purpose ?? challengeLevel.guidance ?? "",
      },
      userId: gate.userId,
    });

    return result.toTextStreamResponse();

  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to evaluate";
    logger.error({ err }, "[stress-test] evaluation failed");
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
}
