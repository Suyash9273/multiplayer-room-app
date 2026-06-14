import dotenv from "dotenv";
import path from "path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({
  path: path.resolve(process.cwd(), "../../packages/db/.env"),
});

// FIX 1: Import from the standard Prisma client package
import { PrismaClient } from "@prisma/client";

// 1. Initialize a standard Node Postgres Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Wrap the pool in the Prisma V7 Adapter
const adapter = new PrismaPg(pool);

// 3. Instantiate and export the single Prisma client
export const prisma = new PrismaClient({ adapter });

// FIX 2: Re-export all types from the standard package
export * from "@prisma/client";