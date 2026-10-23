// Applies the committed SQL in drizzle/ through Neon's HTTP driver, the one
// transport that works from Vercel builds, CI and the Mac. Uses the direct
// connection when it is set.
//   pnpm db:migrate
// No top-level await: tsx compiles this package's .ts scripts as CommonJS.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error("db:migrate needs DATABASE_URL_UNPOOLED or DATABASE_URL.");
    process.exit(1);
  }
  const started = Date.now();
  await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
  console.log(`Migrations applied in ${Date.now() - started} ms.`);
}

main().catch((error: unknown) => {
  console.error("db:migrate failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
