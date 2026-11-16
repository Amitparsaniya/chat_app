import { RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHENTICATED", "Bearer token is required"));
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET, { issuer: env.JWT_ISSUER }) as JwtPayload;
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("JWT subject is missing");
    }
    req.auth = { userId: payload.sub };
    return next();
  } catch {
    return next(new AppError(401, "INVALID_TOKEN", "Bearer token is invalid or expired"));
  }
};