import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { defineConfig } from "prisma/config";

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT = "5432", DB_NAME, DB_SCHEMA = "public" } = process.env;
const databaseUrl =
  process.env.DATABASE_URL ||
  (DB_USER && DB_PASSWORD && DB_HOST && DB_NAME
    ? `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}`
    : undefined);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});