import type { Request, Response } from "express";
import { getBearerToken, hashPassword, validateJWT } from "../auth.js";
import { config } from "../config.js";
import { isPgError, PG_UNIQUE_VIOLATION } from "../db/errors.js";
import type { User } from "../db/schema.js";
import { createUser, updateUser } from "../db/queries/users.js";
import { BadRequestError, ConflictError, UnauthorizedError } from "../errors.js";
import { respondWithJSON } from "./json.js";


export type UserResponse = Omit<User, "hashedPassword">;

// Builds the public shape explicitly: Omit alone does not remove fields at runtime
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isChirpyRed: user.isChirpyRed, // new
  };
}
export type CredentialsParams = {
  email: string;
  password: string;
};

export function isCredentialsParams(value: unknown): value is CredentialsParams {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    typeof value.email === "string" &&
    value.email.trim() !== "" &&
    "password" in value &&
    typeof value.password === "string" &&
    value.password !== ""
  );
}

export async function handlerCreateUser(
  req: Request,
  res: Response,
): Promise<void> {
  const params: unknown = req.body;

  if (!isCredentialsParams(params)) {
    throw new BadRequestError("Invalid request body");
  }

  const hashedPassword = await hashPassword(params.password);
  const user = await createUser({ email: params.email, hashedPassword });

  if (!user) {
    throw new ConflictError("User already exists");
  }

  respondWithJSON(res, 201, toUserResponse(user));
}

export async function handlerUpdateUser(
  req: Request,
  res: Response,
): Promise<void> {
  // Authenticate first
  const token = getBearerToken(req);
  const userId = validateJWT(token, config.jwt.secret);

  const params: unknown = req.body;
  if (!isCredentialsParams(params)) {
    throw new BadRequestError("Invalid request body");
  }

  const hashedPassword = await hashPassword(params.password);

  let user;
  try {
    user = await updateUser(userId, { email: params.email, hashedPassword });
  } catch (err) {
    // Another user already has this email
    if (isPgError(err, PG_UNIQUE_VIOLATION)) {
      throw new ConflictError("Email already in use");
    }
    throw err;
  }

  // Valid token, but the user no longer exists
  if (!user) {
    throw new UnauthorizedError("Invalid token");
  }

  respondWithJSON(res, 200, toUserResponse(user));
}