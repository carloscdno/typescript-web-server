import type { Request, Response } from "express";
import { hashPassword } from "../auth.js";
import type { User } from "../db/schema.js";
import { createUser } from "../db/queries/users.js";
import { BadRequestError, ConflictError } from "../errors.js";
import { respondWithJSON } from "./json.js";

export type UserResponse = Omit<User, "hashedPassword">;

// Builds the public shape explicitly: Omit alone does not remove fields at runtime
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
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