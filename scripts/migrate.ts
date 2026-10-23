// Applies the committed SQL in drizzle/ through Neon's HTTP driver, the one
// transport that works from Vercel builds, CI and the Mac. Uses the direct
// connection when it is set.
//   pnpm db:migrate
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("db:migrate needs DATABASE_URL_UNPOOLED or DATABASE_URL.");
  process.exit(1);
}

const started = Date.now();
await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
console.log(`Migrations applied in ${Date.now() - started} ms.`);
