import type { Request, Response } from "express";
import { checkPasswordHash, makeJWT, makeRefreshToken } from "../auth.js";
import { config } from "../config.js";
import { createRefreshToken } from "../db/queries/refreshTokens.js";
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
    passwordMatches = false;
  }

  if (!passwordMatches) {
    throw new UnauthorizedError(LOGIN_ERROR);
  }

  const accessToken = makeJWT(
    user.id,
    config.jwt.accessTokenDuration,
    config.jwt.secret,
  );

  const refreshToken = makeRefreshToken();
  await createRefreshToken({
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + config.jwt.refreshTokenDuration * 1000),
    // revokedAt omitted → null
  });

  respondWithJSON(res, 200, {
    ...toUserResponse(user),
    token: accessToken,
    refreshToken,
  });
}