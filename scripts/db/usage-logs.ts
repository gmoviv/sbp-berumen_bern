// Run the usage_logs migration. Use: npm run db:usage-logs:setup
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../../src/lib/clients";

async function main() {
  const sql = readFileSync(
    join(process.cwd(), "scripts", "db", "usage-logs-schema.sql"),
    "utf8"
  );
  const client = await db.connect();
  try {
    await client.query(sql);
    console.log("usage_logs schema applied");
  } finally {
    client.release();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
