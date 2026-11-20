import { db } from "../index.js";
import { type Chirp, type NewChirp, chirps } from "../schema.js";

export async function createChirp(chirp: NewChirp): Promise<Chirp | undefined> {
  const [result] = await db.insert(chirps).values(chirp).returning();
  return result;
}