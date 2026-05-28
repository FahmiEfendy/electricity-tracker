"use client";

import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";

interface MasterDataPanelProps {
  isAdmin: boolean;
}

export default function MasterDataPanel({ isAdmin }: MasterDataPanelProps) {
  const [tariff, setTariff] = useState("");
  const [editTariff, setEditTariff] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchTariff();
  }, []);

  const fetchTariff = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setTariff(data.tariff_per_kwh || "0");
    } catch {
      console.error("Failed to fetch tariff");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tariff_per_kwh: editTariff }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setTariff(editTariff);
      setIsEditing(false);
      setSuccess("Tariff updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      alert("Failed to update tariff");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="glass-card animate-fade-in-up">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <span className="text-lg">⚙️</span>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold font-[family-name:var(--font-outfit)]">
              Master Data
            </h2>
            <p className="text-xs text-text-secondary">
              Tariff: {formatRupiah(parseFloat(tariff || "0"))}/kWh
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-5 pb-5 animate-fade-in">
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Electricity Tariff</p>
                <p className="text-xs text-text-muted">Price per kWh in Rupiah</p>
              </div>
              {!isEditing ? (
                <button
                  className="btn-secondary text-sm"
                  onClick={() => {
                    setEditTariff(tariff);
                    setIsEditing(true);
                  }}
                >
                  Edit
                </button>
              ) : null}
            </div>

            {isEditing ? (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="input-label">Tariff per kWh (Rp)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field"
                    value={editTariff}
                    onChange={(e) => setEditTariff(e.target.value)}
                    placeholder="e.g. 1791.3"
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="bg-bg-primary/50 rounded-lg p-4">
                <p className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-warning">
                  {formatRupiah(parseFloat(tariff || "0"))}
                  <span className="text-sm font-normal text-text-secondary">
                    {" "}
                    / kWh
                  </span>
                </p>
              </div>
            )}

            {success && (
              <div className="mt-3 text-sm text-success bg-success/10 rounded-lg p-3 animate-fade-in">
                {success}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
