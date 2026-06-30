import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  db: Db | undefined;
};

function getDb(): Db {
  if (!globalForDb.db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForDb.db = drizzle(neon(url), { schema });
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

// HTTP driver + lazy init: fast on Vercel serverless, safe for `next build`.
export const db = createLazyProxy(getDb);
