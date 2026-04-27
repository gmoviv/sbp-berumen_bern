// src/app/api/idea-refinement/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getPersona } from "@/lib/personaProvider";
import { getChallengeLevel } from "@/lib/challengeLevels";
import {
  buildRefinementAnalysisSystemPrompt,
  buildRefinementAnalysisUserPrompt,
  buildRefinementRewriteSystemPrompt,
  buildRefinementRewriteUserPrompt,
} from "./prompt";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

const StressResultSchema = z.object({
  summary: z.string().optional(),
  gaps: z.array(z.string()),
  improvements: z.array(z.string()),
  questions: z.array(z.string()),
  triggeredRedFlags: z.array(z.string()).optional(),
  confidence: z.number().optional(),
});

const Body = z.object({
  personaType: z.string(),
  challengeLevelId: z.string().optional(),
  idea: z.string().min(10).max(1500),
  goal: z.string().min(5).max(300),
  stressResult: StressResultSchema,
  missingInfoQuestions: z.array(z.string()).optional(),
  userAnswers: z.array(z.string()).optional(),
});

const AnalysisSchema = z.object({
  missingInfoQuestions: z.array(z.string()),
  fixableActions: z.array(z.string()),
  priorityGaps: z.array(z.string()),
});

const AnalysisRepairSchema = z.object({
  missingInfoQuestions: z.array(z.string()).default([]),
  fixableActions: z.array(z.string()).default([]),
  priorityGaps: z.array(z.string()).default([]),
});

const RewriteSchema = z.object({
  refinedPitch: z.string(),
  changesSummary: z.array(z.string()),
});

const RewriteRepairSchema = z.object({
  refinedPitch: z.string().default(""),
  changesSummary: z.array(z.string()).default([]),
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) return gate.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = Body.parse(await req.json());
    const persona = await getPersona(body.personaType, body.idea);
    if (!persona) {
      return NextResponse.json(
        { error: "Persona not found" },
        { status: 404 }
      );
    }

    const challengeLevel = body.challengeLevelId
      ? await getChallengeLevel(body.challengeLevelId)
      : null;

    const openai = new OpenAI({ apiKey });

    let missingInfoQuestions = body.missingInfoQuestions ?? [];

    if (!missingInfoQuestions.length) {
      const analysisSystem = buildRefinementAnalysisSystemPrompt({
        personaName: persona.name,
        personaContext: persona.context,
        level: challengeLevel,
      });
      const analysisUser = buildRefinementAnalysisUserPrompt({
        idea: body.idea,
        goal: body.goal,
        stress: body.stressResult,
      });

      const analysis = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: analysisSystem },
          { role: "user", content: analysisUser },
        ],
      });

      const raw = analysis.choices[0]?.message?.content ?? "{}";
      let analysisJson: unknown;
      try {
        analysisJson = JSON.parse(raw);
      } catch (err) {
        console.error("[idea-refinement] analysis JSON parse error", err);
        console.error("[idea-refinement] analysis raw output", raw);
        return NextResponse.json(
          { error: "Invalid analysis JSON output" },
          { status: 500 }
        );
      }
      let parsed = AnalysisSchema.safeParse(analysisJson);
      if (!parsed.success) {
        console.error("[idea-refinement] analysis schema error", parsed.error.format());
        console.error("[idea-refinement] analysis raw output", raw);

        const repair = await openai.chat.completions.create({
          model: MODEL,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Fix the JSON to match this schema exactly: {\"missingInfoQuestions\": string[], \"fixableActions\": string[], \"priorityGaps\": string[]}. Return JSON only.",
            },
            { role: "user", content: raw },
          ],
        });

        const repairRaw = repair.choices[0]?.message?.content ?? "{}";
        let repairJson: unknown;
        try {
          repairJson = JSON.parse(repairRaw);
        } catch (err) {
          console.error("[idea-refinement] analysis repair JSON parse error", err);
          console.error("[idea-refinement] analysis repair raw output", repairRaw);
          return NextResponse.json(
            { error: "Malformed analysis output" },
            { status: 500 }
          );
        }

        const repaired = AnalysisRepairSchema.safeParse(repairJson);
        if (!repaired.success) {
          console.error("[idea-refinement] analysis repair schema error", repaired.error.format());
          console.error("[idea-refinement] analysis repair raw output", repairRaw);
          return NextResponse.json(
            { error: "Malformed analysis output" },
            { status: 500 }
          );
        }

        missingInfoQuestions = repaired.data.missingInfoQuestions;
      } else {
        missingInfoQuestions = parsed.data.missingInfoQuestions;
      }
    }

    const userAnswers = body.userAnswers ?? [];
    if (missingInfoQuestions.length && userAnswers.length < missingInfoQuestions.length) {
      return NextResponse.json({
        status: "needs_input",
        questions: missingInfoQuestions,
      });
    }

    const rewriteSystem = buildRefinementRewriteSystemPrompt({
      personaName: persona.name,
      personaContext: persona.context,
      level: challengeLevel,
    });
    const rewriteUser = buildRefinementRewriteUserPrompt({
      idea: body.idea,
      goal: body.goal,
      stress: body.stressResult,
      missingInfoQuestions,
      userAnswers,
    });

    const rewrite = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: rewriteSystem },
        { role: "user", content: rewriteUser },
      ],
    });

    const rewriteRaw = rewrite.choices[0]?.message?.content ?? "{}";
    let rewriteJson: unknown;
    try {
      rewriteJson = JSON.parse(rewriteRaw);
    } catch (err) {
      console.error("[idea-refinement] rewrite JSON parse error", err);
      console.error("[idea-refinement] rewrite raw output", rewriteRaw);
      return NextResponse.json(
        { error: "Invalid refinement JSON output" },
        { status: 500 }
      );
    }
    let rewriteParsed = RewriteSchema.safeParse(rewriteJson);
    if (!rewriteParsed.success) {
      console.error("[idea-refinement] rewrite schema error", rewriteParsed.error.format());
      console.error("[idea-refinement] rewrite raw output", rewriteRaw);

      const repair = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Fix the JSON to match this schema exactly: {\"refinedPitch\": string, \"changesSummary\": string[]}. Return JSON only.",
          },
          { role: "user", content: rewriteRaw },
        ],
      });

      const repairRaw = repair.choices[0]?.message?.content ?? "{}";
      let repairJson: unknown;
      try {
        repairJson = JSON.parse(repairRaw);
      } catch (err) {
        console.error("[idea-refinement] rewrite repair JSON parse error", err);
        console.error("[idea-refinement] rewrite repair raw output", repairRaw);
        return NextResponse.json(
          { error: "Malformed refinement output" },
          { status: 500 }
        );
      }

      const repaired = RewriteRepairSchema.safeParse(repairJson);
      if (!repaired.success) {
        console.error("[idea-refinement] rewrite repair schema error", repaired.error.format());
        console.error("[idea-refinement] rewrite repair raw output", repairRaw);
        return NextResponse.json(
          { error: "Malformed refinement output" },
          { status: 500 }
        );
      }

      (rewriteParsed as any) = {
        success: true,
        data: repaired.data,
      };
    }

    return NextResponse.json({
      status: "ok",
      refinedPitch: (rewriteParsed as any).data.refinedPitch,
      changesSummary: (rewriteParsed as any).data.changesSummary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to refine pitch";
    console.error("[idea-refinement] error", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
