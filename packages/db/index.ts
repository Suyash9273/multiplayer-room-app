import dotenv from "dotenv";
import path from "path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({
  path: path.resolve(process.cwd(), "../../packages/db/.env"),
});

// NEW: We explicitly target the client entry point
import { PrismaClient } from "./generated/prisma/client.js";

// 1. Initialize a standard Node Postgres Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Wrap the pool in the Prisma V7 Adapter
const adapter = new PrismaPg(pool);

// 3. Instantiate and export the single Prisma client
export const prisma = new PrismaClient({ adapter });

// 4. Export all generated types (like the Message interface)
export * from "./generated/prisma/client.js";