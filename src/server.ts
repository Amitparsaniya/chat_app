import { app } from "./app";
import { env } from "./config/env";
import { db } from "./config/database";

const server = app.listen(env.PORT, () => {
  console.info(`Chat API listening on port ${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received; shutting down`);
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));