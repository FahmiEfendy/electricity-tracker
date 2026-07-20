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
  avgDailyCost: number;
}

export default function MonthlyReport({ readings }: MonthlyReportProps) {
  // Group readings by month
  const monthlyMap = new Map<
    string,
    {
      month: number;
      year: number;
      totalKwh: number;
      totalCost: number;
      daysSet: Set<string>;
    }
  >();

  readings.forEach((r) => {
    if (r.kwhUsed == null) return;
    const date = new Date(r.recordedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    const existing = monthlyMap.get(key) || {
      month: date.getMonth(),
      year: date.getFullYear(),
      totalKwh: 0,
      totalCost: 0,
      daysSet: new Set<string>(),
    };
    existing.totalKwh += r.kwhUsed || 0;
    existing.totalCost += r.costRp || 0;
    existing.daysSet.add(dayKey);
    monthlyMap.set(key, existing);
  });

  const monthlyData: MonthlyData[] = Array.from(monthlyMap.values())
    .map((item) => {
      const daysInMonth = new Date(item.year, item.month + 1, 0).getDate();
      const entries = Math.min(item.daysSet.size, daysInMonth);
      return {
        month: item.month,
        year: item.year,
        totalKwh: item.totalKwh,
        totalCost: item.totalCost,
        entries,
        avgDailyKwh: entries > 0 ? item.totalKwh / entries : 0,
        avgDailyCost: entries > 0 ? item.totalCost / entries : 0,
      };
    })
    .sort((a, b) => b.year - a.year || b.month - a.month);

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
              <th>Entries</th>
              <th>Avg kWh/Day</th>
              <th>Total kWh</th>
              <th>Avg Cost/Day</th>
              <th>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m) => (
              <tr key={`${m.year}-${m.month}`}>
                <td className="font-medium">
                  {getMonthName(m.month)} {m.year}
                </td>
                <td className="muted">
                  {m.entries}/{new Date(m.year, m.month + 1, 0).getDate()}
                </td>
                <td>
                  <span className="font-medium">{formatKwh(m.avgDailyKwh)}</span>
                  <span className="text-text-muted text-xs"> kWh</span>
                </td>
                <td>
                  <span className="font-medium">{formatKwh(m.totalKwh)}</span>
                  <span className="text-text-muted text-xs"> kWh</span>
                </td>
                <td className="font-medium text-warning">
                  {formatRupiah(m.avgDailyCost)}
                </td>
                <td className="font-medium text-warning">
                  {formatRupiah(m.totalCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden p-3 space-y-2">
        {monthlyData.map((m) => (
          <div key={`${m.year}-${m.month}`} className="mobile-card">
            <p className="font-medium mb-2">
              {getMonthName(m.month)} {m.year}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-2 border-b border-border/50 pb-2 mb-1">
                <span className="text-text-muted text-xs">Entries</span>
                <p className="font-semibold text-accent">
                  {m.entries}/{new Date(m.year, m.month + 1, 0).getDate()}
                </p>
              </div>
              <div>
                <span className="text-text-muted text-xs">Avg kWh/Day</span>
                <p className="font-medium">{formatKwh(m.avgDailyKwh)} kWh</p>
              </div>
              <div>
                <span className="text-text-muted text-xs">Avg Cost/Day</span>
                <p className="font-medium text-warning">
                  {formatRupiah(m.avgDailyCost)}
                </p>
              </div>
              <div>
                <span className="text-text-muted text-xs">Total kWh</span>
                <p className="font-medium">{formatKwh(m.totalKwh)} kWh</p>
              </div>
              <div>
                <span className="text-text-muted text-xs">Total Cost</span>
                <p className="font-medium text-warning">
                  {formatRupiah(m.totalCost)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
