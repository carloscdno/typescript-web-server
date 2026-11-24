import * as argon2 from "argon2";

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