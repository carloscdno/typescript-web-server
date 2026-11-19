import type { Request, Response } from "express";
import { respondWithError, respondWithJSON } from "./json.js";

const MAX_CHIRP_LENGTH = 140;

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

export function handlerValidateChirp(req: Request, res: Response): void {
  // express.json() already parsed the body; its shape is still unverified
  const params: unknown = req.body;

  if (!isChirpParams(params)) {
    respondWithError(res, 400, "Invalid request body");
    return;
  }

  if (params.body.length > MAX_CHIRP_LENGTH) {
    respondWithError(res, 400, "Chirp is too long");
    return;
  }

  respondWithJSON(res, 200, { valid: true });
}