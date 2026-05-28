"use client";

import { formatRupiah, formatKwh, getMonthName } from "@/lib/utils";

interface MeterReading {
  id: string;
  recordedAt: string;
  kwhUsed: number | null;
  costRp: number | null;
}

interface MonthlyReportProps {
  readings: MeterReading[];
}

interface MonthlyData {
  month: number;
  year: number;
  totalKwh: number;
  totalCost: number;
  entries: number;
  avgDailyKwh: number;
}

export default function MonthlyReport({ readings }: MonthlyReportProps) {
  // Group readings by month
  const monthlyMap = new Map<string, MonthlyData>();

  readings.forEach((r) => {
    if (r.kwhUsed == null) return;
    const date = new Date(r.recordedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = monthlyMap.get(key) || {
      month: date.getMonth(),
      year: date.getFullYear(),
      totalKwh: 0,
      totalCost: 0,
      entries: 0,
      avgDailyKwh: 0,
    };
    existing.totalKwh += r.kwhUsed || 0;
    existing.totalCost += r.costRp || 0;
    existing.entries++;
    existing.avgDailyKwh = existing.totalKwh / existing.entries;
    monthlyMap.set(key, existing);
  });

  const monthlyData = Array.from(monthlyMap.values()).sort(
    (a, b) => b.year - a.year || b.month - a.month
  );

  if (monthlyData.length === 0) {
    return null;
  }

  return (
    <div className="glass-card overflow-hidden animate-fade-in-up">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div>
            <h2 className="text-lg font-bold font-[family-name:var(--font-outfit)]">
              Monthly Report
            </h2>
            <p className="text-xs text-text-secondary">
              Summary of each month&apos;s electricity consumption
            </p>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Total kWh</th>
              <th>Total Cost</th>
              <th>Entries</th>
              <th>Avg/Day</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m) => (
              <tr key={`${m.year}-${m.month}`}>
                <td className="font-medium">
                  {getMonthName(m.month)} {m.year}
                </td>
                <td>
                  <span className="font-medium">{formatKwh(m.totalKwh)}</span>
                  <span className="text-text-muted text-xs"> kWh</span>
                </td>
                <td className="font-medium text-warning">
                  {formatRupiah(m.totalCost)}
                </td>
                <td className="muted">{m.entries}</td>
                <td className="muted">
                  {formatKwh(m.avgDailyKwh)} kWh
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden p-4 space-y-3">
        {monthlyData.map((m) => (
          <div key={`${m.year}-${m.month}`} className="mobile-card">
            <p className="font-medium mb-2">
              {getMonthName(m.month)} {m.year}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-text-muted text-xs">Total kWh</span>
                <p className="font-medium">{formatKwh(m.totalKwh)}</p>
              </div>
              <div>
                <span className="text-text-muted text-xs">Total Cost</span>
                <p className="font-medium text-warning">
                  {formatRupiah(m.totalCost)}
                </p>
              </div>
              <div>
                <span className="text-text-muted text-xs">Entries</span>
                <p>{m.entries}</p>
              </div>
              <div>
                <span className="text-text-muted text-xs">Avg/Day</span>
                <p>{formatKwh(m.avgDailyKwh)} kWh</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
