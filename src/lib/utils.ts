// Token/credit purchases are always sold in multiples of this base unit.
export const BUY_KWH_UNIT = 11.5;

/**
 * Format a number as Indonesian Rupiah currency
 * @example formatRupiah(22425.01) => "Rp22.425,01"
 */
export function formatRupiah(amount: number): string {
  return (
    "Rp" +
    amount.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Format kWh value with Indonesian locale
 * @example formatKwh(12.52) => "12,52"
 */
export function formatKwh(kwh: number): string {
  return kwh.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a Date to Indonesian short date string
 * @example formatDate(new Date("2025-07-29")) => "Sel, 29 Jul"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Format a Date to time string (HH:mm)
 * @example formatTime(new Date()) => "16:02"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Calculate the difference between two dates in decimal hours
 * @example calculateHourDiff(date1, date2) => 21.43
 */
export function calculateHourDiff(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
}

/**
 * Calculate the electricity cost
 */
export function calculateCost(kwhUsed: number, tariffPerKwh: number): number {
  return parseFloat((kwhUsed * tariffPerKwh).toFixed(2));
}

/**
 * Format a number with Indonesian locale (comma as decimal separator)
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Get month name in Indonesian
 */
export function getMonthName(month: number): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return months[month];
}

/**
 * Parse a date string in various formats to a Date object
 */
export function parseFlexibleDate(dateStr: string, timeStr?: string): Date {
  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    if (timeStr) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      isoDate.setHours(hours, minutes, 0, 0);
    }
    return isoDate;
  }

  // Try DD/MM/YYYY format
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    const date = new Date(year, month, day);
    if (timeStr) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  }

  throw new Error(`Cannot parse date: ${dateStr}`);
}
