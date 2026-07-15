import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Was `import "dotenv/config"`, which defaults to loading `.env` from
// process.cwd() — that happened to work when running Prisma CLI commands
// via `pnpm --filter @multiplayer/db exec prisma ...` (pnpm sets CWD to
// packages/db for that), but only by coincidence of how it's invoked, and
// it pointed at a DIFFERENT .env than the runtime app now uses (see
// apps/server/src/env.ts). Single source of truth: one .env at the repo
// root, resolved relative to this file's own location instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
