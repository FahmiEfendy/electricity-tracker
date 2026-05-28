"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatRupiah, formatKwh, getMonthName } from "@/lib/utils";

interface MeterReading {
  id: string;
  recordedAt: string;
  meterKwh: number;
  kwhUsed: number | null;
  costRp: number | null;
}

interface UsageChartProps {
  readings: MeterReading[];
}

type ChartView = "daily" | "monthly";

// Custom tooltip for dark theme
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-3 shadow-xl">
      <p className="text-xs text-text-secondary mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}:{" "}
          {entry.name.includes("Cost")
            ? formatRupiah(entry.value)
            : `${formatKwh(entry.value)} kWh`}
        </p>
      ))}
    </div>
  );
}

export default function UsageChart({ readings }: UsageChartProps) {
  const [view, setView] = useState<ChartView>("daily");

  // Prepare daily data (last 30 entries)
  const dailyData = readings
    .filter((r) => r.kwhUsed != null)
    .slice(0, 30)
    .reverse()
    .map((r) => {
      const date = new Date(r.recordedAt);
      return {
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        kwhUsed: r.kwhUsed || 0,
        cost: r.costRp || 0,
      };
    });

  // Prepare monthly data
  const monthlyMap = new Map<
    string,
    { kwh: number; cost: number; month: number; year: number }
  >();
  readings.forEach((r) => {
    if (r.kwhUsed == null) return;
    const date = new Date(r.recordedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = monthlyMap.get(key) || {
      kwh: 0,
      cost: 0,
      month: date.getMonth(),
      year: date.getFullYear(),
    };
    existing.kwh += r.kwhUsed || 0;
    existing.cost += r.costRp || 0;
    monthlyMap.set(key, existing);
  });

  const monthlyData = Array.from(monthlyMap.values())
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((m) => ({
      name: `${getMonthName(m.month).slice(0, 3)} ${m.year}`,
      kwhUsed: parseFloat(m.kwh.toFixed(2)),
      cost: parseFloat(m.cost.toFixed(2)),
    }));

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <span className="text-lg">📈</span>
          </div>
          <div>
            <h2 className="text-lg font-bold font-[family-name:var(--font-outfit)]">
              Usage Charts
            </h2>
            <p className="text-xs text-text-secondary">
              Visualize your consumption patterns
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-bg-primary/50 rounded-lg p-1">
          <button
            className={`tab-btn ${view === "daily" ? "active" : ""}`}
            onClick={() => setView("daily")}
          >
            Daily
          </button>
          <button
            className={`tab-btn ${view === "monthly" ? "active" : ""}`}
            onClick={() => setView("monthly")}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="h-[300px] sm:h-[350px]">
        {view === "daily" ? (
          dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                />
                <Bar
                  dataKey="kwhUsed"
                  name="kWh Used"
                  fill="url(#blueGradient)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-text-muted">
              No data to display
            </div>
          )
        ) : monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                yAxisId="kwh"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="cost"
                orientation="right"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
              <Line
                yAxisId="kwh"
                type="monotone"
                dataKey="kwhUsed"
                name="Total kWh"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6, fill: "#60a5fa" }}
              />
              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="cost"
                name="Total Cost"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 4 }}
                activeDot={{ r: 6, fill: "#fbbf24" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted">
            No data to display
          </div>
        )}
      </div>
    </div>
  );
}
