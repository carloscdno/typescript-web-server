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