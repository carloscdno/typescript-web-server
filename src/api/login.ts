import type { Request, Response } from "express";
import { checkPasswordHash, makeJWT } from "../auth.js";
import { config } from "../config.js";
import { getUserByEmail } from "../db/queries/users.js";
import { BadRequestError, UnauthorizedError } from "../errors.js";
import { respondWithJSON } from "./json.js";
import { type CredentialsParams, isCredentialsParams, toUserResponse } from "./users.js";

const LOGIN_ERROR = "incorrect email or password";

type LoginParams = CredentialsParams & {
  expiresInSeconds?: number;
};

function isLoginParams(value: unknown): value is LoginParams {
  if (!isCredentialsParams(value)) return false;
  if (!("expiresInSeconds" in value) || value.expiresInSeconds === undefined) {
    return true; // optional
  }
  const exp = value.expiresInSeconds;
  return typeof exp === "number" && Number.isInteger(exp) && exp > 0;
}

export async function handlerLogin(req: Request, res: Response): Promise<void> {
  const params: unknown = req.body;

  if (!isLoginParams(params)) {
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
    passwordMatches = false;
  }

  if (!passwordMatches) {
    throw new UnauthorizedError(LOGIN_ERROR);
  }

  // Default to the max duration; clients can only shorten it
  const maxDuration = config.jwt.accessTokenDuration;
  const expiresIn = Math.min(params.expiresInSeconds ?? maxDuration, maxDuration);

  const token = makeJWT(user.id, expiresIn, config.jwt.secret);

  respondWithJSON(res, 200, { ...toUserResponse(user), token });
}