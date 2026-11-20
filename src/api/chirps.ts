import type { Request, Response } from "express";
import { createChirp, getChirps } from "../db/queries/chirps.js";
import { BadRequestError } from "../errors.js";
import { respondWithJSON } from "./json.js";
import type { Chirp } from "../db/schema.js";

const MAX_CHIRP_LENGTH = 140;
const PROFANE_WORDS = new Set(["kerfuffle", "sharbert", "fornax"]);
const REPLACEMENT = "****";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PG_FOREIGN_KEY_VIOLATION = "23503";

type CreateChirpParams = {
  body: string;
  userId: string;
};

function isCreateChirpParams(value: unknown): value is CreateChirpParams {
  return (
    typeof value === "object" &&
    value !== null &&
    "body" in value &&
    typeof value.body === "string" &&
    "userId" in value &&
    typeof value.userId === "string"
  );
}

function cleanChirp(text: string): string {
  return text
    .split(" ")
    .map((word) => (PROFANE_WORDS.has(word.toLowerCase()) ? REPLACEMENT : word))
    .join(" ");
}

// Drizzle may wrap the driver error, so check both the error and its cause
function isForeignKeyViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return (e?.code ?? e?.cause?.code) === PG_FOREIGN_KEY_VIOLATION;
}

export async function handlerCreateChirp(
  req: Request,
  res: Response,
): Promise<void> {
  const params: unknown = req.body;

  if (!isCreateChirpParams(params)) {
    throw new BadRequestError("Invalid request body");
  }

  if (params.body.length > MAX_CHIRP_LENGTH) {
    throw new BadRequestError(
      `Chirp is too long. Max length is ${MAX_CHIRP_LENGTH}`,
    );
  }

  if (!UUID_REGEX.test(params.userId)) {
    throw new BadRequestError("Invalid userId");
  }

  let chirp;
  try {
    chirp = await createChirp({
      body: cleanChirp(params.body),
      userId: params.userId,
    });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      throw new BadRequestError("User does not exist");
    }
    throw err; // anything else stays a 500
  }

  if (!chirp) {
    throw new Error("Chirp insert returned no row");
  }

  respondWithJSON(res, 201, toChirpResponse(chirp));
}

// Single source of truth for the public shape of a chirp
function toChirpResponse(chirp: Chirp) {
  return {
    id: chirp.id,
    createdAt: chirp.createdAt,
    updatedAt: chirp.updatedAt,
    body: chirp.body,
    userId: chirp.userId,
  };
}

export async function handlerGetChirps(
  _req: Request,
  res: Response,
): Promise<void> {
  const chirps = await getChirps();
  respondWithJSON(res, 200, chirps.map(toChirpResponse));
}