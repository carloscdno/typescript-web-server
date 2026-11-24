import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import {
  checkPasswordHash,
  extractBearerToken,
  hashPassword,
  makeJWT,
  validateJWT,
  makeRefreshToken
} from "./auth.js";
import { BadRequestError, UnauthorizedError } from "./errors.js";

describe("Password Hashing", () => {
  const password1 = "correctPassword123!";
  const password2 = "anotherPassword456!";
  let hash1: string;
  let hash2: string;

  beforeAll(async () => {
    hash1 = await hashPassword(password1);
    hash2 = await hashPassword(password2);
  });

  it("returns true for the correct password", async () => {
    expect(await checkPasswordHash(password1, hash1)).toBe(true);
  });

  it("returns false for an incorrect password", async () => {
    expect(await checkPasswordHash("wrongPassword", hash1)).toBe(false);
  });

  it("returns false when the password belongs to a different hash", async () => {
    expect(await checkPasswordHash(password1, hash2)).toBe(false);
  });

  it("produces different hashes for the same password (salted)", async () => {
    const again = await hashPassword(password1);
    expect(again).not.toBe(hash1);
    expect(await checkPasswordHash(password1, again)).toBe(true);
  });

  it("throws for a malformed stored hash", async () => {
    // The login handler relies on this to reject legacy "unset" users
    await expect(checkPasswordHash(password1, "unset")).rejects.toThrow();
  });
});

describe("JWT", () => {
  const secret = "test-secret";
  const userID = "f0f87ec2-a8b5-48cc-b66a-a85ce7c7b862";

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the user ID for a valid token", () => {
    const token = makeJWT(userID, 60, secret);
    expect(validateJWT(token, secret)).toBe(userID);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = makeJWT(userID, 60, secret);

    vi.setSystemTime(new Date("2026-01-01T00:01:01Z")); // 61 seconds later
    expect(() => validateJWT(token, secret)).toThrow(UnauthorizedError);
  });

  it("accepts a token just before it expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = makeJWT(userID, 60, secret);

    vi.setSystemTime(new Date("2026-01-01T00:00:59Z")); // 59 seconds later
    expect(validateJWT(token, secret)).toBe(userID);
  });

  it("rejects a token signed with the wrong secret", () => {
    const token = makeJWT(userID, 60, "other-secret");
    expect(() => validateJWT(token, secret)).toThrow(UnauthorizedError);
  });

  it("rejects a tampered token", () => {
    const [header, , signature] = makeJWT(userID, 60, secret).split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ iss: "chirpy", sub: "attacker-id", exp: 9999999999 }),
    ).toString("base64url");

    expect(() =>
      validateJWT(`${header}.${forgedPayload}.${signature}`, secret),
    ).toThrow(UnauthorizedError);
  });

  it("rejects a token from a different issuer", () => {
    const token = jwt.sign({ iss: "not-chirpy", sub: userID }, secret, {
      expiresIn: 60,
    });
    expect(() => validateJWT(token, secret)).toThrow(UnauthorizedError);
  });

  it("rejects a malformed token", () => {
    expect(() => validateJWT("not-a-jwt", secret)).toThrow(UnauthorizedError);
  });
});

describe("extractBearerToken", () => {
  it.each([
    ["Bearer abc123", "abc123"],
    ["  Bearer abc123  ", "abc123"],
    ["Bearer    abc123", "abc123"],
    ["Bearer\tabc123", "abc123"],
    ["bearer abc123", "abc123"],
    ["BEARER abc123", "abc123"],
    ["Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig"],
  ])("extracts the token from %j", (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });

  it.each([
    [undefined],
    [""],
    ["   "],
    ["Bearer"],
    ["Bearer   "],
    ["Basic dXNlcjpwYXNz"],
    ["Token abc123"],
    ["Bearerabc123"],
    ["abc123"],
    ["Bearer abc 123"],
  ])("throws BadRequestError for %j", (header) => {
    expect(() => extractBearerToken(header)).toThrow(BadRequestError);
  });
});

describe("makeRefreshToken", () => {
  it("returns a 64-character hex string (32 bytes)", () => {
    expect(makeRefreshToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different token on each call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => makeRefreshToken()));
    expect(tokens.size).toBe(100);
  });
});