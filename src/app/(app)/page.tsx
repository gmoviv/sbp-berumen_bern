// src/app/(app)/page.tsx
import { listPersonas } from "@/lib/personaProvider";
import { listChallengeLevels } from "@/lib/challengeLevels";
import { StressTestClient } from "@/components/stress-test/StressTestClient";
import { PersonaOption, ChallengeLevelOption } from "@/components/stress-test/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    // 1. Fetch data on the server
    const [personaList, levelList] = await Promise.all([
        listPersonas(),
        listChallengeLevels()
    ]);

    // 2. Format options for the select components
    const initialPersonas: PersonaOption[] = personaList.map((item) => ({
        id: item.id,
        name: item.role?.trim() ? `${item.name} — ${item.role}` : item.name,
        cluster: item.cluster,
    }));

    const personaLookup: Record<string, string> = personaList.reduce((acc, p) => {
        acc[p.id] = p.name;
        return acc;
    }, {} as Record<string, string>);

    const initialLevels: ChallengeLevelOption[] = levelList.map((item) => ({
        id: item.id,
        name: item.name,
        detail: item.detail,
        intensity: item.intensity,
    }));

    // 3. Pass to Client Component
    return (
        <StressTestClient 
            initialPersonas={initialPersonas} 
            initialLevels={initialLevels}
            personaLookup={personaLookup}
        />
    );
}
