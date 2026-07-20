"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import SummaryCards from "@/components/SummaryCards";
import DataEntryForm from "@/components/DataEntryForm";
import ReadingsTable from "@/components/ReadingsTable";
import UsageChart from "@/components/UsageChart";
import MasterDataPanel from "@/components/MasterDataPanel";
import ImportDataModal from "@/components/ImportDataModal";
import MonthlyReport from "@/components/MonthlyReport";

interface MeterReading {
  id: string;
  recordedAt: string;
  meterKwh: number;
  buyKwh: number | null;
  hourDiff: number | null;
  kwhUsed: number | null;
  costRp: number | null;
  tariffAtEntry: number | null;
  notes: string | null;
  isEstimated?: boolean;
}

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

function calculateSummary(readings: MeterReading[]): SummaryData {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const summary: SummaryData = {
    todayKwh: 0,
    todayCost: 0,
    weekKwh: 0,
    weekCost: 0,
    monthKwh: 0,
    monthCost: 0,
    lastMonthKwh: 0,
    lastMonthCost: 0,
  };

  readings.forEach((r) => {
    if (r.kwhUsed == null || r.costRp == null) return;
    // Parse the ISO string and get local date for comparison
    const date = new Date(r.recordedAt);

    // Today: reading's local date is today
    if (date >= todayStart) {
      summary.todayKwh += r.kwhUsed;
      summary.todayCost += r.costRp;
    }

    // This week
    if (date >= weekAgo) {
      summary.weekKwh += r.kwhUsed;
      summary.weekCost += r.costRp;
    }

    // This month
    if (date >= monthStart) {
      summary.monthKwh += r.kwhUsed;
      summary.monthCost += r.costRp;
    }

    // Last month: from start of last month up to (but not including) start of this month
    if (date >= lastMonthStart && date < monthStart) {
      summary.lastMonthKwh += r.kwhUsed;
      summary.lastMonthCost += r.costRp;
    }
  });

  return summary;
}

export default function HomePage() {
  const { data: session } = useSession();
  const isAdmin = !!(session?.user);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [allLightweight, setAllLightweight] = useState<MeterReading[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/readings?limit=15&offset=0&sort=desc");
      const data = await res.json();
      setReadings(data.data || []);
      setTotal(data.total || 0);
      setAllLightweight(data.allReadings || []);
    } catch (err) {
      console.error("Failed to fetch readings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchReadings();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchReadings]);

  const summary = calculateSummary(allLightweight);

  return (
    <>
      <Header onShowImport={() => setShowImport(true)} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Cards */}
        <SummaryCards data={summary} />

        {/* Charts */}
        <UsageChart readings={allLightweight} />

        {/* Admin section: Data Entry */}
        {isAdmin && (
          <DataEntryForm onSuccess={fetchReadings} readings={readings} />
        )}

        {/* Readings Table */}
        <ReadingsTable
          readings={readings}
          total={total}
          allReadings={allLightweight}
          isAdmin={isAdmin}
          onRefresh={fetchReadings}
          isLoading={loading}
        />

        {/* Monthly Report */}
        <MonthlyReport readings={allLightweight} />

        {/* Master Data Settings */}
        <MasterDataPanel isAdmin={isAdmin} />

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-text-muted">
          <p>⚡ Electricity Tracker — Built with Next.js</p>
        </footer>
      </main>

      {/* Import Modal */}
      <ImportDataModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => {
          fetchReadings();
          setShowImport(false);
        }}
      />
    </>
  );
}
