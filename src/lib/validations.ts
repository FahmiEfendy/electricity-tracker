import { z } from "zod";

/**
 * Helper to transform optional string query parameters to numbers safely.
 */
const numericQueryParam = (min?: number, max?: number) =>
  z
    .string()
    .optional()
    .transform((val) => (val !== undefined && val !== "" ? Number(val) : undefined))
    .refine((val) => val === undefined || !isNaN(val), {
      message: "Must be a valid number",
    })
    .refine((val) => val === undefined || min === undefined || val >= min, {
      message: `Must be greater than or equal to ${min}`,
    })
    .refine((val) => val === undefined || max === undefined || val <= max, {
      message: `Must be less than or equal to ${max}`,
    });

/**
 * GET /api/readings query parameter validation schema.
 */
export const getReadingsQuerySchema = z.object({
  month: numericQueryParam(1, 12),
  year: numericQueryParam(2024, 2030),
  limit: numericQueryParam(1, 500),
  offset: numericQueryParam(0),
  sort: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Sanitizes text by trimming whitespace and limiting length.
 */
const sanitizedString = z
  .string()
  .transform((val) => val.trim())
  .pipe(z.string().max(500, "Notes must be under 500 characters"))
  .nullable()
  .optional();

/**
 * POST /api/readings payload validation schema.
 */
export const createReadingSchema = z.object({
  recordedAt: z.preprocess(
    (arg) => (typeof arg === "string" || typeof arg === "number" ? new Date(arg) : arg),
    z.date({ message: "recordedAt is required" }).refine((d) => !isNaN(d.getTime()), {
      message: "Invalid date format for recordedAt",
    })
  ),
  meterKwh: z
    .number({ message: "meterKwh is required" })
    .finite("meterKwh must be a valid finite number")
    .positive("meterKwh must be a positive number"),
  buyKwh: z
    .number()
    .finite("buyKwh must be a valid finite number")
    .min(0, "buyKwh cannot be negative")
    .nullable()
    .optional(),
  notes: sanitizedString,
});

/**
 * PUT /api/readings/[id] payload validation schema.
 */
export const updateReadingSchema = createReadingSchema;

/**
 * PUT /api/settings payload validation schema.
 */
export const updateTariffSchema = z.object({
  tariff_per_kwh: z.preprocess((arg) => {
    if (typeof arg === "number") return arg;
    if (typeof arg === "string" && arg.trim() !== "") {
      const parsed = parseFloat(arg);
      return isNaN(parsed) ? arg : parsed;
    }
    return arg;
  }, z.number({ message: "tariff_per_kwh is required" }).finite("tariff_per_kwh must be a finite number").positive("tariff_per_kwh must be greater than 0")),
});

/**
 * Formats Zod error into clean string.
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ");
}
