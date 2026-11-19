import type { Request, Response } from "express";
import { respondWithError, respondWithJSON } from "./json.js";

const MAX_CHIRP_LENGTH = 140;
const PROFANE_WORDS = new Set(["kerfuffle", "sharbert", "fornax"]);
const REPLACEMENT = "****";

type ChirpParams = {
  body: string;
};

function isChirpParams(value: unknown): value is ChirpParams {
  return (
    typeof value === "object" &&
    value !== null &&
    "body" in value &&
    typeof value.body === "string"
  );
}

// Replace profane words (case-insensitive, exact match between spaces)
function cleanChirp(text: string): string {
  return text
    .split(" ")
    .map((word) => (PROFANE_WORDS.has(word.toLowerCase()) ? REPLACEMENT : word))
    .join(" ");
}

export function handlerValidateChirp(req: Request, res: Response): void {
  const params: unknown = req.body;

  if (!isChirpParams(params)) {
    respondWithError(res, 400, "Invalid request body");
    return;
  }

  if (params.body.length > MAX_CHIRP_LENGTH) {
    respondWithError(res, 400, "Chirp is too long");
    return;
  }

  respondWithJSON(res, 200, { cleanedBody: cleanChirp(params.body) });
}