import type { Request, Response, NextFunction } from "express";

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