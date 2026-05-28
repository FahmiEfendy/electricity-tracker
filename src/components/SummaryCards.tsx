"use client";

import { formatRupiah, formatKwh } from "@/lib/utils";

interface SummaryData {
  todayKwh: number;
  todayCost: number;
  weekKwh: number;
  weekCost: number;
  monthKwh: number;
  monthCost: number;
  lastMonthKwh: number;
  lastMonthCost: number;
}

interface SummaryCardsProps {
  data: SummaryData;
}

const cards = [
  {
    key: "today" as const,
    label: "Today's Usage",
    icon: "⚡",
    kwhField: "todayKwh" as const,
    costField: "todayCost" as const,
    gradient: "from-blue-500/20 to-cyan-500/10",
    borderColor: "border-blue-500/30",
    iconBg: "bg-blue-500/15",
  },
  {
    key: "week" as const,
    label: "This Week",
    icon: "📊",
    kwhField: "weekKwh" as const,
    costField: "weekCost" as const,
    gradient: "from-purple-500/20 to-pink-500/10",
    borderColor: "border-purple-500/30",
    iconBg: "bg-purple-500/15",
  },
  {
    key: "month" as const,
    label: "This Month",
    icon: "📅",
    kwhField: "monthKwh" as const,
    costField: "monthCost" as const,
    gradient: "from-emerald-500/20 to-teal-500/10",
    borderColor: "border-emerald-500/30",
    iconBg: "bg-emerald-500/15",
  },
  {
    key: "lastMonth" as const,
    label: "Last Month",
    icon: "📋",
    kwhField: "lastMonthKwh" as const,
    costField: "lastMonthCost" as const,
    gradient: "from-amber-500/20 to-orange-500/10",
    borderColor: "border-amber-500/30",
    iconBg: "bg-amber-500/15",
  },
];

export default function SummaryCards({ data }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`glass-card p-5 bg-gradient-to-br ${card.gradient} ${card.borderColor} animate-pulse-glow`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center text-lg`}
            >
              {card.icon}
            </div>
            <span className="text-sm font-medium text-text-secondary">
              {card.label}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
              {formatKwh(data[card.kwhField])}{" "}
              <span className="text-sm font-normal text-text-secondary">
                kWh
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              {formatRupiah(data[card.costField])}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
