import type { Request, Response } from "express";
import { checkPasswordHash } from "../auth.js";
import { getUserByEmail } from "../db/queries/users.js";
import { BadRequestError, UnauthorizedError } from "../errors.js";
import { respondWithJSON } from "./json.js";
import { isCredentialsParams, toUserResponse } from "./users.js";

const LOGIN_ERROR = "incorrect email or password";

export async function handlerLogin(req: Request, res: Response): Promise<void> {
  const params: unknown = req.body;

  if (!isCredentialsParams(params)) {
    throw new BadRequestError("Invalid request body");
  }

  const user = await getUserByEmail(params.email);
  if (!user) {
    throw new UnauthorizedError(LOGIN_ERROR);
  }

  let passwordMatches = false;
  try {
    passwordMatches = await checkPasswordHash(params.password, user.hashedPassword);
  } catch {
    // Malformed stored hash (e.g. "unset" for legacy users): treat as a failed login
    passwordMatches = false;
  }

  if (!passwordMatches) {
    throw new UnauthorizedError(LOGIN_ERROR);
  }

  respondWithJSON(res, 200, toUserResponse(user));
}