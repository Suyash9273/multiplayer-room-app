import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Imported as the FIRST line in index.ts, before anything that reads
// process.env (like @multiplayer/db's Postgres connection setup, which
// runs as a side effect of merely importing it). Using import.meta.url
// instead of process.cwd() means this resolves correctly no matter how
// or from where the process is actually started — a different working
// directory, a process manager, a Dockerfile — none of that changes
// where THIS file physically lives on disk, which is what the path is
// based on instead.
//
// Single source of truth: one .env at the REPO ROOT. (Previously
// @multiplayer/db loaded its own .env from packages/db/.env via a
// process.cwd()-relative path, which only worked by coincidence of
// pnpm's per-package working directory — see prisma.config.ts for the
// matching fix on the Prisma CLI side.)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
