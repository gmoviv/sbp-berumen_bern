// scripts/db/migrate-personas.ts
import { syncPersonasFromFilesystem } from "../../src/lib/db-sync";
import { db } from "../../src/lib/clients";

async function main() {
    try {
        console.log("🚀 Starting Persona Migration from CLI...");
        const results = await syncPersonasFromFilesystem();
        console.log(`✅ Migrated ${results.migrated.length} personas.`);
        if (results.failed.length > 0) {
            console.warn(`⚠️ Failed to migrate ${results.failed.length} personas.`);
        }
        console.log("🎉 Persona migration complete!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    } finally {
        await db.end();
    }
}

main();
