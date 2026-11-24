import { asc, desc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { type Chirp, type NewChirp, chirps } from "../schema.js";

export type SortOrder = "asc" | "desc";


export async function createChirp(chirp: NewChirp): Promise<Chirp | undefined> {
  const [result] = await db.insert(chirps).values(chirp).returning();
  return result;
}

export async function getChirps(
  authorId?: string,
  sort: SortOrder = "asc", // new
): Promise<Chirp[]> {
  const order = sort === "desc" ? desc(chirps.createdAt) : asc(chirps.createdAt); // new

  return db
    .select()
    .from(chirps)
    .where(authorId ? eq(chirps.userId, authorId) : undefined)
    .orderBy(order); // updated
}

export async function getChirpById(id: string): Promise<Chirp | undefined> {
  const [result] = await db.select().from(chirps).where(eq(chirps.id, id));
  return result;
}

export async function deleteChirp(id: string): Promise<Chirp | undefined> {
  const [result] = await db.delete(chirps).where(eq(chirps.id, id)).returning();
  return result;
}