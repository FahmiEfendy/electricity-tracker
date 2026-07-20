"use client";

import { useState } from "react";
import { BUY_KWH_UNIT } from "@/lib/utils";

interface MeterReading {
  id: string;
  recordedAt: string;
  meterKwh: number;
  buyKwh: number | null;
  hourDiff: number | null;
  kwhUsed: number | null;
  costRp: number | null;
  isEstimated?: boolean;
}

interface DataEntryFormProps {
  onSuccess: () => void;
  readings: MeterReading[];
}

// How many recent real readings to average for the expected consumption rate.
const RATE_SAMPLE_SIZE = 8;

export default function DataEntryForm({ onSuccess, readings }: DataEntryFormProps) {
  // Most recent real (non-estimated) reading — the baseline for the next entry.
  const previousReading = readings
    .filter((r) => !r.isEstimated)
    .reduce<MeterReading | null>(
      (latest, r) =>
        !latest || new Date(r.recordedAt) > new Date(latest.recordedAt) ? r : latest,
      null
    );
  const previousMeterKwh = previousReading?.meterKwh ?? null;

  // Typical kWh/hour consumption from the most recent real readings, used to
  // estimate how much was consumed during the gap before a token purchase —
  // the raw meter jump alone understates buyKwh by whatever was consumed.
  // Uses the median rather than the mean: a handful of suspiciously identical
  // or otherwise anomalous historical rows (e.g. old interpolation artifacts
  // mislabeled as real) can drag a mean far off without dominating a median.
  const recentRateKwhPerHour = (() => {
    const rates = readings
      .filter((r) => !r.isEstimated && r.hourDiff && r.kwhUsed != null && r.hourDiff > 0)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, RATE_SAMPLE_SIZE)
      .map((r) => r.kwhUsed! / r.hourDiff!)
      .sort((a, b) => a - b);

    if (rates.length === 0) return null;

    const mid = Math.floor(rates.length / 2);
    return rates.length % 2 === 0 ? (rates[mid - 1] + rates[mid]) / 2 : rates[mid];
  })();

  const getLocalISO = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const [formData, setFormData] = useState({
    recordedAt: getLocalISO(),
    meterKwh: "",
    buyKwh: "",
    notes: "",
  });
  const [buyKwhTouched, setBuyKwhTouched] = useState(false);
  const [recordedAtTouched, setRecordedAtTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Suggests Buy kWh from a candidate meterKwh/recordedAt pair, without
  // depending on which field the user edited most recently — the date and
  // meter reading can be filled in either order.
  const suggestBuyKwh = (meterKwhStr: string, recordedAtStr: string, dateIsTouched: boolean) => {
    const parsed = parseFloat(meterKwhStr);

    if (
      previousMeterKwh == null ||
      previousReading == null ||
      isNaN(parsed) ||
      parsed <= previousMeterKwh
    ) {
      return null;
    }

    const jump = parsed - previousMeterKwh;

    // Only trust the elapsed-time adjustment once the user has deliberately
    // set the date/time — otherwise recordedAt is still today's default and
    // "elapsed" would span months instead of the real ~1-day gap.
    const elapsedHours =
      dateIsTouched && recordedAtStr
        ? (new Date(recordedAtStr).getTime() -
            new Date(previousReading.recordedAt).getTime()) /
          (1000 * 60 * 60)
        : 0;

    // A single blended estimate can land just past a rounding boundary and
    // snap to the wrong multiple. Instead, check every plausible multiple of
    // 11.5 near the raw jump and pick whichever implies a consumption rate
    // closest to recent actual usage — directly comparable rather than
    // rounding a fuzzy blended number.
    let suggestedBuyKwh = Math.round(jump / BUY_KWH_UNIT) * BUY_KWH_UNIT;
    if (elapsedHours > 0 && recentRateKwhPerHour != null) {
      const roughMultiple = jump / BUY_KWH_UNIT;
      const candidates = [-2, -1, 0, 1, 2].map(
        (offset) => (Math.round(roughMultiple) + offset) * BUY_KWH_UNIT
      );

      let bestCandidate = suggestedBuyKwh;
      let bestDiff = Infinity;
      for (const candidate of candidates) {
        const impliedKwhUsed = candidate - jump;
        if (impliedKwhUsed < 0) continue; // meter can't gain kWh from usage
        const impliedRate = impliedKwhUsed / elapsedHours;
        const diff = Math.abs(impliedRate - recentRateKwhPerHour);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestCandidate = candidate;
        }
      }
      suggestedBuyKwh = bestCandidate;
    }

    return suggestedBuyKwh > 0 ? suggestedBuyKwh : null;
  };

  const handleMeterKwhChange = (value: string) => {
    if (buyKwhTouched) {
      setFormData((prev) => ({ ...prev, meterKwh: value }));
      return;
    }

    const suggested = suggestBuyKwh(value, formData.recordedAt, recordedAtTouched);
    setFormData((prev) => ({
      ...prev,
      meterKwh: value,
      buyKwh: suggested != null ? suggested.toString() : prev.buyKwh,
    }));
  };

  const handleRecordedAtChange = (value: string) => {
    setRecordedAtTouched(true);

    if (buyKwhTouched) {
      setFormData((prev) => ({ ...prev, recordedAt: value }));
      return;
    }

    const suggested = suggestBuyKwh(formData.meterKwh, value, true);
    setFormData((prev) => ({
      ...prev,
      recordedAt: value,
      buyKwh: suggested != null ? suggested.toString() : prev.buyKwh,
    }));
  };

  const setToNow = () => {
    setFormData((prev) => ({ ...prev, recordedAt: getLocalISO() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        recordedAt: new Date(formData.recordedAt).toISOString(),
        meterKwh: parseFloat(formData.meterKwh),
        buyKwh: formData.buyKwh ? parseFloat(formData.buyKwh) : null,
        notes: formData.notes || null,
      };

      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save reading");
      }

      setSuccess("Reading saved successfully!");
      setFormData({
        recordedAt: getLocalISO(),
        meterKwh: "",
        buyKwh: "",
        notes: "",
      });
      setBuyKwhTouched(false);
      setRecordedAtTouched(false);
      onSuccess();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
          <span className="text-lg">📝</span>
        </div>
        <div>
          <h2 className="text-lg font-bold font-[family-name:var(--font-outfit)]">
            New Reading
          </h2>
          <p className="text-xs text-text-secondary">
            Input your current meter reading
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date & Time */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="input-label mb-0" htmlFor="recordedAt">
                Date &amp; Time
              </label>
              <button
                type="button"
                className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                onClick={setToNow}
              >
                🕒 Now
              </button>
            </div>
            <input
              id="recordedAt"
              type="datetime-local"
              className="input-field"
              value={formData.recordedAt}
              onChange={(e) => handleRecordedAtChange(e.target.value)}
              required
            />
          </div>

          {/* Meter kWh */}
          <div>
            <label className="input-label" htmlFor="meterKwh">
              Meter Reading (kWh) <span className="text-danger">*</span>
            </label>
            <input
              id="meterKwh"
              type="number"
              step="0.01"
              className="input-field"
              placeholder="e.g. 232.32"
              value={formData.meterKwh}
              onChange={(e) => handleMeterKwhChange(e.target.value)}
              required
            />
          </div>

          {/* Buy kWh */}
          <div>
            <label className="input-label" htmlFor="buyKwh">
              Buy kWh{" "}
              <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              id="buyKwh"
              type="number"
              step={BUY_KWH_UNIT}
              className="input-field"
              placeholder="kWh purchased"
              value={formData.buyKwh}
              onChange={(e) => {
                setBuyKwhTouched(true);
                setFormData({ ...formData, buyKwh: e.target.value });
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="input-label" htmlFor="notes">
              Notes{" "}
              <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              id="notes"
              type="text"
              maxLength={100}
              className="input-field"
              placeholder="e.g. AC on all day"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="text-sm text-danger bg-danger/10 rounded-lg p-3 animate-fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-success bg-success/10 rounded-lg p-3 animate-fade-in">
            {success}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span
                  className="spinner"
                  style={{
                    borderTopColor: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                />
                Saving...
              </span>
            ) : (
              "💾 Save Reading"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
