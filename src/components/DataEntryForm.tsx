"use client";

import { useState } from "react";

interface DataEntryFormProps {
  onSuccess: () => void;
}

export default function DataEntryForm({ onSuccess }: DataEntryFormProps) {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
              onChange={(e) =>
                setFormData({ ...formData, recordedAt: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, meterKwh: e.target.value })
              }
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
              step="0.01"
              className="input-field"
              placeholder="kWh purchased"
              value={formData.buyKwh}
              onChange={(e) =>
                setFormData({ ...formData, buyKwh: e.target.value })
              }
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
                <span className="spinner" />
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
