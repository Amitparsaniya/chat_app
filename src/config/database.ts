import { Pool } from "pg";
import { env } from "./env";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  ssl: env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000
});

db.on("error", (error: Error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});