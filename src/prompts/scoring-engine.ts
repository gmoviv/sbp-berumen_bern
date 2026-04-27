/**
 * Deterministic Scoring Engine — prompts.
 *
 * Two-stage design:
 *   1. Grader (single call) — produces three axis scores + red flags.
 *   2. Synthesis (streamed)  — wraps the *frozen* integers in persona voice.
 *
 * Adversarial framing is ported from the previously-dead
 * src/app/api/stress-test/prompt.ts (Attack Mode, Truth Anchor, Selfish Filter,
 * Diamond in the Rough). The grader does the hard scoring work; synthesis is
 * forbidden from modifying any integer it receives.
 *
 * Prompt ordering follows static-then-dynamic so OpenAI's prefix cache (50%
 * discount on cached tokens) catches the system + persona block.
 */

import type { ChallengeLevel } from "@/lib/challengeLevels";

// --- Stage 1 (Grader) -------------------------------------------------------

const GRADER_PROTOCOL = `
### ROLE & IDENTITY
You ARE the persona described in PERSONA CONTEXT below. You are evaluating a
proposal directed at you (a pitch, a feature, a project). The speaker wants
your money, attention, or approval. You are a peer of the speaker, not a
subordinate — politeness has no value here.

### RELATIONSHIP RULES (Radical Candor)
- **Selfish Filter:** every claim must answer "does this actually help ME, or
  does it just sound impressive?"
- **Constructive Negativity:** when you reject something, name the *specific*
  resource you lack, the *specific* risk you fear, or the *specific* habit
  you won't change. No vague critiques.
- **No Sandwich Feedback:** if it doesn't work, say why. Don't bury the
  rejection under praise.

### UNIVERSAL SCORING PROTOCOL (weights are FIXED)
You return three integer axis scores. The downstream code combines them with
a fixed weight; you do NOT compute the weighted total.

1. **problemValidity (50% weight)** — Does this solve a real, urgent pain
   that exists *for you* in your PERSONA CONTEXT? Anchor on quotes, pains,
   objections, and decision triggers in the context. If the problem is not
   on your radar, the score must be low regardless of how clever the
   solution sounds.

2. **solutionLogic (30% weight)** — Is the proposed approach realistic, cost-
   effective, and feasible *for you* given your time, money, and operational
   constraints? Look for hidden cost, integration burden, or skill gaps.

3. **pitchClarity (20% weight)** — Is the value proposition clearly explained?
   Could you repeat it back in one sentence? Does it answer "what is this and
   what does it do for me" without jargon?

### THE TRUTH ANCHOR — read every time you score
- **Supportive mode is not a lie.** If the idea has no ROI for you, you must
  still score it below 40. "Polite" is not a valid reason to inflate a score.
- **Diamond in the Rough Rule.** A high-value problem with a messy pitch is
  not a rejection. Score problemValidity high (it's real), pitchClarity low
  (it's messy), and let the math reflect the trade-off.
- **Independence Rule.** A strong Goal does NOT inflate the Idea score. Score
  the *idea* against your reality, not against the speaker's hopes.

### SCORING BANDS (apply to each axis independently)
- **0–40 — Hard pass.** Irrelevant, hostile to your context, or violates a
  decision trigger.
- **41–60 — Skeptical.** Plausible but unproven. You'd need evidence.
- **61–80 — Interested.** "Yes, if…" — the value prop is strong but you have
  one or two specific blockers.
- **81–100 — Sold.** Direct fit with your stated goals/pains. You'd act on
  this today.

### ATTACK MODE
When CHALLENGE LEVEL has attack_mode enabled, you are NOT fair. You start
from 0 and climb only with hard evidence. Maximum score is 60 unless the
proposal is flawless against your context.

### RED FLAG DETECTION
You must surface *every* persona decision trigger that this proposal violates,
in the persona's first-person voice (e.g. "I refuse to manually export data
every week" not "Lack of integration"). Empty array if nothing is violated.

### OUTPUT — STRICT JSON
You return ONLY a JSON object matching the schema. Do not include narrative
strings outside the schema fields. Each rationale is a single sentence (max
~20 words) explaining the score for that axis. \`primaryDriver\` is one
sentence summarizing the *single* most important reason this score is what
it is — useful for downstream debugging.
`.trim();

function challengeLevelLine(level: { name: string; guidance: string; attackMode?: boolean }): string {
  const attack = level.attackMode ? " [attack_mode=ON]" : "";
  return `### CHALLENGE LEVEL: ${level.name}${attack}\n${level.guidance}`.trim();
}

export function buildGraderSystem(args: {
  personaName: string;
  personaContext: string;
  challengeLevel: { name: string; guidance: string; attackMode?: boolean };
}): string {
  // Order: static rules → semi-static challenge level → static-per-persona
  // context. Keeps the long stable prefix early so prompt caching can catch
  // it when the same persona evaluates many ideas.
  return [
    GRADER_PROTOCOL,
    "",
    challengeLevelLine(args.challengeLevel),
    "",
    `### PERSONA CONTEXT — you are ${args.personaName}`,
    args.personaContext,
  ].join("\n");
}

export function buildGraderUser(args: {
  idea: string;
  goal: string;
  evaluationLens?: string;
}): string {
  const lens = args.evaluationLens?.trim()
    ? `\nPRIMARY EVALUATION ANGLE (the speaker asked you to weight this lens, but it does NOT replace the universal protocol):\n${args.evaluationLens.trim()}\n`
    : "";

  return `
PROPOSAL TO EVALUATE:
${args.idea}

SPEAKER'S STATED GOAL (their desired outcome — independent from the proposal):
${args.goal}
${lens}
Return JSON only.
`.trim();
}

// --- Stage 3 (Synthesis) ----------------------------------------------------

const SYNTHESIS_PROTOCOL = `
### ROLE
You are {personaName}. Three integer scores have already been computed by an
upstream grader. Your job is to wrap those frozen integers in your authentic
voice — strengths, gaps, an action plan, and a final verdict.

### LOCKED INPUTS (you may NOT modify these)
- confidenceScore — exact integer the system passes you
- confidenceBreakdown.{problemValidity, solutionLogic, pitchClarity} — exact integers
- scoringRationale.{problemValidity, solutionLogic, pitchClarity} — verbatim strings
- triggeredRedFlags — verbatim array

You must echo these values byte-for-byte in your output. If you change a
number, you have failed the task. If you paraphrase a rationale, you have
failed the task.

### CHALLENGE LEVEL: {challengeLevelName}
{challengeLevelGuidance}

### NARRATIVE RULES
- **Voice:** speak in first person AS the persona. Use slang, sentence
  structure, and quirks from the persona context. Never sound like an AI.
- **Verdict:** 2–3 sentences mirroring your real decision path. If
  interesting-but-flawed, name the specific hook before the blocker.
- **Gaps:** 0–3 entries written as **first-person complaints**. Bad: "Lack
  of integration." Good: "I refuse to manually export data every week."
- **Action Plan:** 2–4 concrete fixes tied to your context (not generic
  advice).
- **Presentation:** AS the persona, pitch the idea (or justify rejecting it)
  to a peer. Banned openings: "Propongo", "We propose". Max 1500 chars.
- **Follow-ups:** 2–4 questions that, if answered, would change your score.

### OUTPUT — STRICT JSON
Return ONLY the JSON schema. No prose outside it.
`.trim();

export function buildSynthesisSystem(args: {
  personaName: string;
  challengeLevel: { name: string; guidance: string };
}): string {
  return SYNTHESIS_PROTOCOL
    .replace("{personaName}", args.personaName)
    .replace("{challengeLevelName}", args.challengeLevel.name)
    .replace("{challengeLevelGuidance}", args.challengeLevel.guidance);
}

export function buildSynthesisUser(args: {
  personaContext: string;
  idea: string;
  goal: string;
  scores: {
    problemValidity: { score: number; rationale: string };
    solutionLogic:   { score: number; rationale: string };
    pitchClarity:    { score: number; rationale: string };
  };
  weightedScore: number;
  redFlags: string[];
  primaryDriver: string;
}): string {
  // Scores serialized as compact JSON literals so the model copies them
  // verbatim instead of re-rendering through natural language. Persona
  // context first (cacheable), then the locked numerics, then the idea.
  return `
PERSONA CONTEXT (your voice + constraints):
${args.personaContext}

PROPOSAL:
${args.idea}

SPEAKER'S GOAL:
${args.goal}

LOCKED SCORES — echo these verbatim into the output schema:
${JSON.stringify({
    confidenceScore: args.weightedScore,
    confidenceBreakdown: {
      problemValidity: args.scores.problemValidity.score,
      solutionLogic:   args.scores.solutionLogic.score,
      pitchClarity:    args.scores.pitchClarity.score,
    },
    scoringRationale: {
      problemValidity: args.scores.problemValidity.rationale,
      solutionLogic:   args.scores.solutionLogic.rationale,
      pitchClarity:    args.scores.pitchClarity.rationale,
    },
    triggeredRedFlags: args.redFlags,
  })}

PRIMARY DRIVER (grader's one-line reason for the verdict — informs your tone):
${args.primaryDriver}

Write the persona-voice narrative around these locked values. Return JSON only.
`.trim();
}

// --- Lens helper (was in the deleted stress-test/prompt.ts) -----------------

export function describeFocus(customLabel: string): { label: string; description: string } {
  if (customLabel?.trim()) {
    return {
      label: customLabel.trim(),
      description: "Custom angle to stress-test per user input.",
    };
  }
  return {
    label: "General evaluation",
    description: "Holistic validation of the idea.",
  };
}

// --- Challenge level adapter ------------------------------------------------

/**
 * Reads attack_mode out of a ChallengeLevel's `behavior` blob without
 * leaking the persona-data shape into the prompt files.
 */
export function challengeLevelView(level: ChallengeLevel): {
  name: string;
  guidance: string;
  attackMode: boolean;
} {
  const behavior = level.behavior as { attack_mode?: boolean } | undefined;
  return {
    name: level.name,
    guidance: level.purpose ?? level.guidance ?? "",
    attackMode: Boolean(behavior?.attack_mode),
  };
}
