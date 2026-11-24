import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../index.js";
import {
  type NewRefreshToken,
  type RefreshToken,
  type User,
  refreshTokens,
  users,
} from "../schema.js";

export async function createRefreshToken(
  token: NewRefreshToken,
): Promise<RefreshToken | undefined> {
  const [result] = await db.insert(refreshTokens).values(token).returning();
  return result;
}

// Returns the owner of a refresh token only if it exists, isn't revoked and isn't expired
export async function userForRefreshToken(
  token: string,
): Promise<User | undefined> {
  const [result] = await db
    .select({ user: users })
    .from(refreshTokens)
    .innerJoin(users, eq(refreshTokens.userId, users.id))
    .where(
      and(
        eq(refreshTokens.token, token),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    );
  return result?.user;
}

export async function revokeRefreshToken(
  token: string,
): Promise<RefreshToken | undefined> {
  const now = new Date();
  const [result] = await db
    .update(refreshTokens)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(eq(refreshTokens.token, token), isNull(refreshTokens.revokedAt)))
    .returning();
  return result;
}