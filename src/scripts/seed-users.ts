import { db } from "../config/database";

async function main(): Promise<void> {
  await db.query(
    `INSERT INTO users (id, display_name) VALUES
      ('user-1', 'Demo User One'), ('user-2', 'Demo User Two')
     ON CONFLICT (id) DO NOTHING`
  );
  console.info("Seed users ready: user-1, user-2");
}
main().catch(error => { console.error("Seeding failed", error); process.exitCode = 1; })
  .finally(() => db.end());