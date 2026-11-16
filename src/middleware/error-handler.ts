import { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";

export const notFound: RequestHandler = (_req, _res, next) =>
  next(new AppError(404, "ROUTE_NOT_FOUND", "Route not found"));

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) }
    });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() }
    });
    return;
  }
  if (error instanceof SyntaxError && "body" in (error as object)) {
    res.status(400).json({ success: false, error: { code: "INVALID_JSON", message: "Malformed JSON body" } });
    return;
  }
  const pgCode = (error as { code?: string } | null)?.code;
  if (pgCode === "23503" || pgCode === "23505") {
    res.status(409).json({ success: false, error: { code: "DATABASE_CONSTRAINT", message: "A database constraint was violated" } });
    return;
  }
  console.error("Unhandled request error", error);
  res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
};