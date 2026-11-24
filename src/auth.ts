import type { Request } from "express";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { BadRequestError, UnauthorizedError } from "./errors.js";
import { randomBytes } from "node:crypto";

const TOKEN_ISSUER = "chirpy";
const TOKEN_ALGORITHM = "HS256";

type Payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function checkPasswordHash(
  password: string,
  hash: string,
): Promise<boolean> {
  // Note: argon2.verify takes (hash, password), the reverse of our signature
  return argon2.verify(hash, password);
}

export function makeJWT(
  userID: string,
  expiresIn: number,
  secret: string,
): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: Payload = {
    iss: TOKEN_ISSUER,
    sub: userID,
    iat,
    exp: iat + expiresIn,
  };
  return jwt.sign(payload, secret, { algorithm: TOKEN_ALGORITHM });
}

export function validateJWT(tokenString: string, secret: string): string {
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(tokenString, secret, {
      algorithms: [TOKEN_ALGORITHM],
      issuer: TOKEN_ISSUER,
    });
  } catch {
    // Expired, bad signature, malformed, wrong issuer...
    throw new UnauthorizedError("Invalid token");
  }

  if (typeof decoded === "string" || !decoded.sub) {
    throw new UnauthorizedError("Invalid token");
  }

  return decoded.sub;
}

export function extractBearerToken(authorization: string | undefined): string {
  return extractAuthCredential(authorization, "Bearer");
}

export function getBearerToken(req: Request): string {
  const header = req.get("Authorization");
  if (!header) {
    throw new UnauthorizedError("Missing authorization header");
  }
  return extractBearerToken(header);
}

export function makeRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

// Parses "<Scheme> <credential>"; the scheme is case-insensitive per the HTTP spec
function extractAuthCredential(
  authorization: string | undefined,
  expectedScheme: string,
): string {
  if (!authorization) {
    throw new BadRequestError("Missing authorization header");
  }

  const [scheme, credential, ...rest] = authorization.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== expectedScheme.toLowerCase() ||
    !credential ||
    rest.length > 0
  ) {
    throw new BadRequestError("Malformed authorization header");
  }

  return credential;
}