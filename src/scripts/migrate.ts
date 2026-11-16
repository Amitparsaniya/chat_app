import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../config/database";

async function main(): Promise<void> {
  const sql = await readFile(resolve(process.cwd(), "src/db/migrations/001_initial.sql"), "utf8");
  await db.query(sql);
  console.info("Database migration completed");
}
main().catch(error => { console.error("Migration failed", error); process.exitCode = 1; })
  .finally(() => db.end());