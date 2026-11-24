import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { type NewUser, User, users } from "../schema.js";

export async function createUser(user: NewUser): Promise<User | undefined> {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function deleteAllUsers(): Promise<void> {
  await db.delete(users);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [result] = await db.select().from(users).where(eq(users.email, email));
  return result;
}

export async function updateUser(
  id: string,
  changes: Pick<NewUser, "email" | "hashedPassword">,
): Promise<User | undefined> {
  const [result] = await db
    .update(users)
    .set(changes)
    .where(eq(users.id, id))
    .returning();
  return result;
}

export async function upgradeUserToChirpyRed(id: string): Promise<User | undefined> {
  const [result] = await db
    .update(users)
    .set({ isChirpyRed: true })
    .where(eq(users.id, id))
    .returning();
  return result;
}