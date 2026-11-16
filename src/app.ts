import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { chatRouter } from "./routes/chat.routes";
import { errorHandler, notFound } from "./middleware/error-handler";
import { env } from "./config/env";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map(s => s.trim()) }));
app.use(express.json({ limit: "32kb" }));
app.use(pinoHttp({ level: env.LOG_LEVEL }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/health", (_req, res) => res.status(200).json({ success: true, data: { status: "ok" } }));
app.use(chatRouter);
app.use(notFound);
app.use(errorHandler);