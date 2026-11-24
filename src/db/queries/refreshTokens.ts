import { db } from "../index.js";
import { type NewRefreshToken, type RefreshToken, refreshTokens } from "../schema.js";

export async function createRefreshToken(
  token: NewRefreshToken,
): Promise<RefreshToken | undefined> {
  const [result] = await db.insert(refreshTokens).values(token).returning();
  return result;
}