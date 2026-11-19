import type { Request, Response } from "express";
import { respondWithJSON } from "./json.js";
import { BadRequestError } from "../errors.js";

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

export async function handlerValidateChirp(
  req: Request,
  res: Response,
): Promise<void> {
  const params: unknown = req.body;

  if (!isChirpParams(params)) {
    throw new BadRequestError("Invalid request body");
  }

  if (params.body.length > MAX_CHIRP_LENGTH) {
    throw new BadRequestError(
      `Chirp is too long. Max length is ${MAX_CHIRP_LENGTH}`,
    );
  }

  respondWithJSON(res, 200, { cleanedBody: cleanChirp(params.body) });
}