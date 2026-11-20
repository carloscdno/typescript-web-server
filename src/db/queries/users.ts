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