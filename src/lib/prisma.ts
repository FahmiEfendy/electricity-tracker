import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_SCHEMA = "public" } = process.env;
const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}`;

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  pool?: pg.Pool;
};

function createPrismaClient() {
  const pool = globalForPrisma.pool || new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return { client, pool };
}

const instance = globalForPrisma.prisma && globalForPrisma.pool
  ? { client: globalForPrisma.prisma, pool: globalForPrisma.pool }
  : createPrismaClient();

export const prisma = instance.client;
export const pool = instance.pool;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handling for SIGTERM and SIGINT
let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Received ${signal}. Gracefully disconnecting Prisma and draining database pool...`);

  try {
    await prisma.$disconnect();
    if (pool) {
      await pool.end();
    }
    console.log("Database connection pool closed cleanly.");
  } catch (error) {
    console.error("Error during database graceful shutdown:", error);
  } finally {
    process.exit(0);
  }
}

if (typeof process !== "undefined" && typeof process.once === "function") {
  process.once("SIGTERM", () => handleShutdown("SIGTERM"));
  process.once("SIGINT", () => handleShutdown("SIGINT"));
}

export default prisma;
