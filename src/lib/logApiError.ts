import { Prisma } from "@prisma/client";

// Prisma error codes that indicate the database itself is unreachable,
// as opposed to a query/data problem. See:
// https://www.prisma.io/docs/orm/reference/error-reference
const DB_CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function isDbConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    DB_CONNECTION_ERROR_CODES.has(error.code)
  ) {
    return true;
  }
  return false;
}

// Logs API route errors, replacing noisy Prisma connection failures with a
// short, actionable message instead of the raw stack trace.
export function logApiError(context: string, error: unknown) {
  if (isDbConnectionError(error)) {
    console.error(
      `[DB] ${context}: could not reach the database. Is Postgres running, and are DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME set correctly?`
    );
    return;
  }

  console.error(`${context} error:`, error);
}
