import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
  db: Db | undefined;
};

function getClient() {
  if (!globalForDb.client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForDb.client = postgres(url, { prepare: false });
  }
  return globalForDb.client;
}

function getDb(): Db {
  if (!globalForDb.db) {
    globalForDb.db = drizzle(getClient(), { schema });
  }
  return globalForDb.db;
}

function createLazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      const instance = getInstance();
      const value = Reflect.get(instance, prop, receiver);
      if (typeof value === "function") {
        return value.bind(instance);
      }
      return value;
    },
  });
}

// Lazy init so `next build` works without DATABASE_URL; postgres-js works with Railway/Neon TCP.
export const db = createLazyProxy(getDb);
