import type { Request, Response } from "express";
import { getBearerToken, makeJWT } from "../auth.js";
import { config } from "../config.js";
import { revokeRefreshToken, userForRefreshToken } from "../db/queries/refreshTokens.js";
import { UnauthorizedError } from "../errors.js";
import { respondWithJSON } from "./json.js";

export async function handlerRefresh(req: Request, res: Response): Promise<void> {
  const refreshToken = getBearerToken(req);

  const user = await userForRefreshToken(refreshToken);
  if (!user) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const accessToken = makeJWT(
    user.id,
    config.jwt.accessTokenDuration,
    config.jwt.secret,
  );

  respondWithJSON(res, 200, { token: accessToken });
}

export async function handlerRevoke(req: Request, res: Response): Promise<void> {
  const refreshToken = getBearerToken(req);
  await revokeRefreshToken(refreshToken);
  res.status(204).end();
}