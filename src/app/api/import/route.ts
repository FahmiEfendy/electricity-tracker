import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { backfillEstimatedReadings } from "@/lib/backfillEstimates";

/**
 * POST /api/import — Admin only
 *
 * Accepts CSV text in the request body.
 * Expected CSV columns (matching Excel format):
 *   Date, kWh, Time, Hour Difference, Buy kWh, kWh Used, Cost (Rp), Notes
 *
 * Example row:
 *   15/01/2025,1234.5,08:30,24.5,100,15.2,22040,Morning reading
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const csvText = await request.text();
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "Empty CSV data" },
        { status: 400 }
      );
    }

    // Skip header row if it looks like a header
    const firstLine = lines[0].toLowerCase();
    const dataLines =
      firstLine.includes("date") || firstLine.includes("kwh")
        ? lines.slice(1)
        : lines;

    // Fetch current tariff for tariffAtEntry snapshot
    const tariffSetting = await prisma.setting.findUnique({
      where: { key: "tariff_per_kwh" },
    });
    const tariff = tariffSetting ? parseFloat(tariffSetting.value) : null;

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 1;
      const line = dataLines[i];

      try {
        // Parse CSV fields — handle potential commas inside quotes
        const fields = mergeUnquotedDatePrefix(parseCSVLine(line));

        if (fields.length < 3) {
          errors.push(`Row ${rowNum}: insufficient columns (${fields.length})`);
          continue;
        }

        const [
          dateStr,     // Date (e.g. "29/07/2025" or "2025-01-15")
          kwhStr,      // kWh (meter reading)
          timeStr,     // Time (e.g. "08:30" or "08:30:00")
          hourDiffStr, // Hour Difference
          buyKwhStr,   // Buy kWh
          kwhUsedStr,  // kWh Used
          ,            // Cost (Rp) — ignored; always recalculated below
          notesStr,    // Notes
          // any further columns (e.g. sheet helper columns) are ignored
        ] = fields;

        // Parse date and time into a single DateTime
        const recordedAt = parseDateAndTime(dateStr, timeStr);
        if (!recordedAt || isNaN(recordedAt.getTime())) {
          errors.push(`Row ${rowNum}: invalid date/time "${dateStr} ${timeStr}"`);
          continue;
        }

        const meterKwh = parseLocaleFloat(kwhStr);
        if (isNaN(meterKwh)) {
          errors.push(`Row ${rowNum}: invalid kWh value "${kwhStr}"`);
          continue;
        }

        const hourDiff = parseFloatOrNull(hourDiffStr);
        const buyKwh = parseFloatOrNull(buyKwhStr);
        const kwhUsed = parseFloatOrNull(kwhUsedStr);
        // Cost is always derived from kWh used and tariff, not trusted from the
        // CSV — spreadsheet formula cells can export stale/blank cached values.
        const costRp =
          kwhUsed !== null && tariff !== null ? kwhUsed * tariff : null;
        const notes = notesStr?.trim() || null;

        await prisma.meterReading.create({
          data: {
            recordedAt,
            meterKwh,
            buyKwh,
            hourDiff,
            kwhUsed,
            costRp,
            tariffAtEntry: tariff,
            notes,
          },
        });

        imported++;
      } catch (rowError) {
        const message =
          rowError instanceof Error ? rowError.message : String(rowError);
        errors.push(`Row ${rowNum}: ${message}`);
      }
    }

    if (imported > 0) {
      await backfillEstimatedReadings();
    }

    return NextResponse.json({ imported, errors });
  } catch (error) {
    console.error("POST /api/import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Parse a single CSV line, respecting quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * If the date's day-of-week prefix (e.g. "Sel", "Rab") was written unquoted
 * with a comma before the actual date (e.g. "Sel", "29 Jul 2025" as two
 * separate fields), merge them back into a single date field. Detected by
 * the first field containing no digits at all.
 */
function mergeUnquotedDatePrefix(fields: string[]): string[] {
  if (fields.length > 1 && /^[A-Za-z]{2,3},?$/.test(fields[0])) {
    return [`${fields[0]} ${fields[1]}`, ...fields.slice(2)];
  }
  return fields;
}

/**
 * Parse date string and time string into a Date object.
 * Supports formats: MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
 * Time: HH:mm or HH:mm:ss
 */
function parseDateAndTime(dateStr: string, timeStr: string): Date | null {
  let trimmedDate = dateStr.trim();
  const trimmedTime = timeStr?.trim() || "00:00:00";

  // Strip leading day-of-week name (e.g., "Sel, " or "Tue, ")
  trimmedDate = trimmedDate.replace(/^[A-Za-z]{2,3},?\s*/i, "");

  let year: number, month: number, day: number;

  // Try "DD MonthName" or "DD MonthName YYYY" format (Indonesian/English locale)
  const monthNameMatch = trimmedDate.match(
    /^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/
  );
  if (monthNameMatch) {
    day = parseInt(monthNameMatch[1], 10);
    const monthName = monthNameMatch[2].toLowerCase();
    year = monthNameMatch[3]
      ? parseInt(monthNameMatch[3], 10)
      : new Date().getFullYear();

    const monthMap: Record<string, number> = {
      // Indonesian abbreviated + full
      jan: 1, januari: 1,
      feb: 2, februari: 2,
      mar: 3, maret: 3,
      apr: 4, april: 4,
      mei: 5,
      jun: 6, juni: 6,
      jul: 7, juli: 7,
      agu: 8, ags: 8, agustus: 8,
      sep: 9, september: 9,
      okt: 10, oktober: 10,
      nov: 11, november: 11,
      des: 12, desember: 12,
      // English abbreviated + full
      january: 1, february: 2, march: 3,
      may: 5, june: 6, july: 7,
      aug: 8, august: 8,
      oct: 10, october: 10,
      dec: 12, december: 12,
    };

    const m = monthMap[monthName];
    if (!m) return null;
    month = m;
  } else if (trimmedDate.includes("/")) {
    // DD/MM/YYYY format
    const parts = trimmedDate.split("/");
    if (parts.length !== 3) return null;
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else if (trimmedDate.includes("-")) {
    const parts = trimmedDate.split("-");
    if (parts.length !== 3) return null;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
  } else {
    return null;
  }

  // Parse time
  const timeParts = trimmedTime.split(":");
  const hours = parseInt(timeParts[0], 10) || 0;
  const minutes = parseInt(timeParts[1], 10) || 0;
  const seconds = parseInt(timeParts[2], 10) || 0;

  // Spreadsheet times are always Indonesia Western Time (WIB, UTC+7),
  // regardless of the server process's own timezone — build the UTC instant
  // directly instead of `new Date(y, m, d, h, min)`, which uses whatever
  // timezone the server happens to run in and silently mis-imports times
  // when that differs from WIB (e.g. a UTC production container).
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Parse a numeric string that may use Indonesian/European locale formatting,
 * e.g. "106,62" (comma decimal) or "Rp23.947,83" (dot thousands, comma decimal,
 * currency prefix). Falls back to plain "." decimal parsing (e.g. "106.62").
 */
function parseLocaleFloat(value: string): number {
  const cleaned = value.replace(/[^0-9.,-]/g, "");
  if (cleaned.includes(",")) {
    // Comma is the decimal separator; dots (if any) are thousands separators.
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(cleaned);
}

/**
 * Parse a string to float, returning null for empty or invalid values.
 */
function parseFloatOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === "" || value.trim() === "-") return null;
  const num = parseLocaleFloat(value.trim());
  return isNaN(num) ? null : num;
}
