import type { MigrationConfig } from "drizzle-orm/migrator";

// Load variables from .env into process.env
process.loadEnvFile();

type APIConfig = {
  fileserverHits: number;
  port: number;
  platform: string;
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

type JWTConfig = {
  secret: string;
  defaultDuration: number; // seconds
};

type Config = {
  api: APIConfig;
  db: DBConfig;
  jwt: JWTConfig;
};


const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

export const config: Config = {
  api: {
    fileserverHits: 0,
    port: parsePort(envOrThrow("PORT")),
    platform: envOrThrow("PLATFORM"),
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig,
  },
  jwt: {
    secret: envOrThrow("JWT_SECRET"),
    defaultDuration: 60 * 60, // 1 hour
  },
};

// Fail fast at startup if a required variable is missing
function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${value}`);
  }
  return port;
}
