// scripts/eval/scoring.ts
//
// 5-idea smoke eval for the stress-test scoring engine. Run before merging
// any prompt change to confirm the score distribution still differentiates
// strong / weak / borderline ideas. Designed for manual eyeball, not CI.
//
// Usage: npm run eval:scoring [-- --persona=alejandro --level=critical]

import { runScoringEngine } from "../../src/lib/scoring-engine";
import { getPersona } from "../../src/lib/personaProvider";
import { getChallengeLevel } from "../../src/lib/challengeLevels";

type EvalCase = {
  id: string;
  expected: "strong" | "borderline" | "weak";
  idea: string;
  goal: string;
  evaluationLens?: string;
};

const CASES: EvalCase[] = [
  {
    id: "strong-direct-fit",
    expected: "strong",
    idea:
      "Una herramienta SaaS mensual de $499 MXN que automatiza recordatorios por WhatsApp para pacientes que faltaron a su cita, integrada con Google Calendar. Reduce el 'no-show' rate de 18% a 6% comprobado con 40 clínicas en CDMX.",
    goal: "Recuperar al menos 4 horas semanales de productividad y reducir el 'no-show' en mi clínica.",
    evaluationLens: "ROI mensual y carga operativa de implementación.",
  },
  {
    id: "weak-misaligned",
    expected: "weak",
    idea:
      "Un NFT marketplace para que mis pacientes coleccionen 'achievement tokens' cada vez que cumplen su tratamiento. Lo lanzamos en Polygon con un fee de gas de $200 MXN por mint.",
    goal: "Incrementar la retención de pacientes y crear engagement digital.",
    evaluationLens: "Encaje cultural con la base actual de pacientes.",
  },
  {
    id: "borderline-good-idea-bad-pitch",
    expected: "borderline",
    idea:
      "Hacemos una cosa que te ayuda con tus pacientes y te ahorra dinero. Es muy fácil de usar y todos los doctores lo aman. Cuesta poquito.",
    goal: "Reducir tiempo administrativo.",
    evaluationLens: "Claridad y especificidad del pitch.",
  },
  {
    id: "borderline-feasible-but-uncertain-value",
    expected: "borderline",
    idea:
      "Un curso online de 12 horas sobre marketing digital para profesionales de salud, con certificado y comunidad privada en Discord. $2,499 MXN, lifetime access.",
    goal: "Atraer más pacientes nuevos cada mes vía canales digitales.",
    evaluationLens: "Tiempo personal disponible para tomar el curso.",
  },
  {
    id: "borderline-trigger-violator",
    expected: "borderline",
    idea:
      "Plataforma de financiamiento que adelanta el pago de los seguros de gastos médicos a la clínica en 24h, a cambio de un 4% de descuento por adelanto. Contrato de 12 meses con cláusula de salida con 90 días.",
    goal: "Mejorar el flujo de caja mensual de la clínica.",
    evaluationLens: "Riesgo financiero y compromiso contractual.",
  },
];

function arg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

async function main() {
  const personaId = arg("persona", "alejandro");
  const levelId = arg("level", "critical");

  const challengeLevel = await getChallengeLevel(levelId);
  if (!challengeLevel) {
    throw new Error(`Challenge level not found: ${levelId}`);
  }

  console.log(
    `\nEval — persona=${personaId} level=${levelId} cases=${CASES.length}\n`
  );

  const rows: Array<{
    case: string;
    expected: string;
    final: number;
    problemValidity: number;
    solutionLogic: number;
    pitchClarity: number;
    redFlags: number;
  }> = [];

  for (const c of CASES) {
    const persona = await getPersona(personaId, c.idea);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }

    const t0 = Date.now();
    const r = await runScoringEngine({
      personaId: persona.id,
      personaName: persona.name,
      personaContext: persona.context,
      idea: c.idea,
      goal: c.goal,
      evaluationLens: c.evaluationLens,
      challengeLevel,
    });
    const ms = Date.now() - t0;

    rows.push({
      case: c.id,
      expected: c.expected,
      final: r.weightedScore,
      problemValidity: r.scores.problemValidity.score,
      solutionLogic: r.scores.solutionLogic.score,
      pitchClarity: r.scores.pitchClarity.score,
      redFlags: r.redFlags.length,
    });

    console.log(
      `  ${c.id.padEnd(40)} expected=${c.expected.padEnd(10)} final=${r.weightedScore} (pv=${r.scores.problemValidity.score} sl=${r.scores.solutionLogic.score} pc=${r.scores.pitchClarity.score}) flags=${r.redFlags.length} ${ms}ms`
    );
    console.log(`     primary: ${r.primaryDriver}`);
    if (r.redFlags.length) {
      r.redFlags.forEach((f) => console.log(`     flag: ${f}`));
    }
    console.log("");
  }

  console.log("\nSummary:");
  console.table(rows);

  console.log(
    "\nManual checks (eyeball):\n" +
      "  - Strong case should land >= 65; weak case <= 40.\n" +
      "  - Borderline cases land 40-70.\n" +
      "  - 'borderline-good-idea-bad-pitch' should have lowest pitchClarity.\n" +
      "  - 'borderline-trigger-violator' should surface at least one red flag.\n"
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
