import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return postgres(url, { prepare: false });
}

export const client = globalForDb.client ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
