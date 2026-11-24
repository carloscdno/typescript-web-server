import type { Request, Response } from "express";
import { createChirp, getChirpById, getChirps, deleteChirp } from "../db/queries/chirps.js";
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from "../errors.js";
import { respondWithJSON } from "./json.js";
import type { Chirp } from "../db/schema.js";
import { getBearerToken, validateJWT } from "../auth.js";
import { config } from "../config.js";
import { isPgError, PG_FOREIGN_KEY_VIOLATION } from "../db/errors.js";
import { UUID_REGEX } from "./validation.js";

const MAX_CHIRP_LENGTH = 140;
const PROFANE_WORDS = new Set(["kerfuffle", "sharbert", "fornax"]);
const REPLACEMENT = "****";

type CreateChirpParams = {
  body: string;
};

function isCreateChirpParams(value: unknown): value is CreateChirpParams {
  return (
    typeof value === "object" &&
    value !== null &&
    "body" in value &&
    typeof value.body === "string"
  );
}

function cleanChirp(text: string): string {
  return text
    .split(" ")
    .map((word) => (PROFANE_WORDS.has(word.toLowerCase()) ? REPLACEMENT : word))
    .join(" ");
}

export async function handlerCreateChirp(
  req: Request,
  res: Response,
): Promise<void> {
  // Authenticate first: unauthenticated clients learn nothing else
  const token = getBearerToken(req);
  const userId = validateJWT(token, config.jwt.secret);

  const params: unknown = req.body;
  if (!isCreateChirpParams(params)) {
    throw new BadRequestError("Invalid request body");
  }

  if (params.body.length > MAX_CHIRP_LENGTH) {
    throw new BadRequestError(
      `Chirp is too long. Max length is ${MAX_CHIRP_LENGTH}`,
    );
  }

  let chirp;
  try {
    chirp = await createChirp({ body: cleanChirp(params.body), userId });
  } catch (err) {
  if (isPgError(err, PG_FOREIGN_KEY_VIOLATION)) {
    throw new UnauthorizedError("Invalid token");
  }
  throw err;
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

export async function handlerGetChirp(
  req: Request<{ chirpId: string }>,
  res: Response,
): Promise<void> {
  const { chirpId } = req.params;

  // A malformed id can't match any chirp; also avoids a Postgres uuid error (500)
  if (!UUID_REGEX.test(chirpId)) {
    throw new NotFoundError("Chirp not found");
  }

  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    throw new NotFoundError("Chirp not found");
  }

  respondWithJSON(res, 200, toChirpResponse(chirp));
}

export async function handlerDeleteChirp(
  req: Request<{ chirpId: string }>,
  res: Response,
): Promise<void> {
  // 1. Who are you? → 401
  const token = getBearerToken(req);
  const userId = validateJWT(token, config.jwt.secret);

  // 2. Does it exist? → 404
  const { chirpId } = req.params;
  if (!UUID_REGEX.test(chirpId)) {
    throw new NotFoundError("Chirp not found");
  }

  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    throw new NotFoundError("Chirp not found");
  }

  // 3. Is it yours? → 403
  if (chirp.userId !== userId) {
    throw new ForbiddenError("You can only delete your own chirps");
  }

  await deleteChirp(chirpId);
  res.status(204).end();
}