import type { Request, Response } from "express";
import { respondWithError, respondWithJSON } from "./json.js";

const MAX_CHIRP_LENGTH = 140;

type ChirpParams = {
  body: string;
};

// Type guard: checks at runtime that the parsed JSON has the expected shape
function isChirpParams(value: unknown): value is ChirpParams {
  return (
    typeof value === "object" &&
    value !== null &&
    "body" in value &&
    typeof value.body === "string"
  );
}

export function handlerValidateChirp(req: Request, res: Response): void {
  let rawBody = "";

  // Decode chunks as UTF-8 safely, even if a character is split between chunks
  req.setEncoding("utf8");

  req.on("data", (chunk: string) => {
    rawBody += chunk;
  });

  req.on("end", () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      respondWithError(res, 400, "Invalid JSON");
      return;
    }

    if (!isChirpParams(parsed)) {
      respondWithError(res, 400, "Invalid request body");
      return;
    }

    if (parsed.body.length > MAX_CHIRP_LENGTH) {
      respondWithError(res, 400, "Chirp is too long");
      return;
    }

    respondWithJSON(res, 200, { valid: true });
  });
}