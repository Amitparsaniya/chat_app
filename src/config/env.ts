import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("*"),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_SSL: z.enum(["true", "false"]).default("false"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_ISSUER: z.string().default("chat-backend"),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIRESTORE_CHATS_COLLECTION: z.string().default("chats")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast rather than running with a partially configured service.
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;