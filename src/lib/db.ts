import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./auth-schema";

export type Db = NeonHttpDatabase<typeof schema>;

let instance: Db | undefined;

/** Creates the Drizzle client on first use so `next build` needs no database. */
export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}

/**
 * Lazy handle: every property access resolves against the real client, so
 * importing this module (which `next build` does while collecting page data)
 * never reads DATABASE_URL. The first query does.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
