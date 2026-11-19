import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import { respondWithError } from "./api/json.js";

type HttpError = Error & { status?: number; type?: string };

export function middlewareLogResponses(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Runs after the response has been fully sent
  res.on("finish", () => {
    const statusCode = res.statusCode;

    // Treat anything outside the 2xx range as non-OK
    if (statusCode < 200 || statusCode >= 300) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
    }
  });

  next();
}

export function middlewareMetricsInc(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  config.fileserverHits++;
  next();
}

// Error-handling middleware: Express recognizes it by its 4 parameters
export function middlewareErrorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err.type === "entity.parse.failed") {
    respondWithError(res, 400, "Invalid JSON");
    return;
  }

  // Client errors raised by Express middleware (e.g. 413 payload too large)
  if (typeof err.status === "number" && err.status >= 400 && err.status < 500) {
    respondWithError(res, err.status, err.message);
    return;
  }

  console.error(err);
  respondWithError(res, 500, "Something went wrong");
}