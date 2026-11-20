import type { Request, Response } from "express";
import { respondWithJSON } from "./json.js";
import { BadRequestError, ConflictError } from "../errors.js";
import { createUser } from "../db/queries/users.js";

type CreateUserParams = {
  email: string;
};

function isCreateUserParams(value: unknown): value is CreateUserParams {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    typeof value.email === "string"
  );
}

export async function handlerCreateUser(
  req: Request,
  res: Response,
): Promise<void> {
  const params: unknown = req.body;

  if (!isCreateUserParams(params) || params.email.trim() === "") {
    throw new BadRequestError("Invalid request body");
  }

  const user = await createUser({ email: params.email });

  // createUser uses onConflictDoNothing, so a duplicate email returns undefined
  if (!user) {
    throw new ConflictError("User with that email already exists");
  }

  respondWithJSON(res, 201, user);
}
