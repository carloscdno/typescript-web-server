import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import { respondWithError } from "./api/json.js";
import { HttpError } from "./errors.js";

type BodyParserError = Error & { type?: string };

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
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Custom errors: their message is meant for the client
  if (err instanceof HttpError) {
    respondWithError(res, err.statusCode, err.message);
    return;
  }

  // Errors from express.json(): fixed messages, never err.message
  const { type } = err as BodyParserError;
  if (type === "entity.parse.failed") {
    respondWithError(res, 400, "Invalid JSON");
    return;
  }
  if (type === "entity.too.large") {
    respondWithError(res, 413, "Payload too large");
    return;
  }

  // Anything else: log the details, expose nothing
  console.log(err);
  respondWithError(res, 500, "Something went wrong on our end");
}