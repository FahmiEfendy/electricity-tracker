"use client";

import { useState, useEffect, useCallback } from "react";
import {
  formatRupiah,
  formatKwh,
  formatDate,
  formatTime,
  formatNumber,
  BUY_KWH_UNIT,
} from "@/lib/utils";

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

interface ReadingsTableProps {
  readings: MeterReading[];
  total?: number;
  allReadings?: { recordedAt: string }[];
  isAdmin: boolean;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function ReadingsTable({
  readings: initialReadings = [],
  total: initialTotal = 0,
  allReadings: initialAllReadings = [],
  isAdmin,
  onRefresh,
  isLoading = false,
}: ReadingsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    recordedAt: "",
    meterKwh: "",
    buyKwh: "",
    notes: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [paginatedReadings, setPaginatedReadings] = useState<MeterReading[]>(initialReadings);
  const [totalItems, setTotalItems] = useState(initialTotal);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc");

  // Keep state in sync with initial props if provided
  useEffect(() => {
    if (initialReadings.length > 0) {
      setPaginatedReadings(initialReadings);
      setTotalItems(initialTotal);
    }
  }, [initialReadings, initialTotal]);

  const [availableMonths, setAvailableMonths] = useState<string[]>(() =>
    Array.from(
      new Set(
        initialAllReadings.map((r) => {
          const date = new Date(r.recordedAt);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        })
      )
    )
      .sort()
      .reverse()
  );

  const fetchTableData = useCallback(async () => {
    setLoadingTable(true);
    try {
      let url = `/api/readings?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}&sort=${dateSort}`;
      if (selectedMonth !== "all") {
        const [year, month] = selectedMonth.split("-");
        url += `&month=${month}&year=${year}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setPaginatedReadings(data.data || []);
      setTotalItems(data.total || 0);
      // Update month filter options from lightweight all-readings list
      if (data.allReadings?.length > 0) {
        const monthSet = new Set<string>(
          (data.allReadings as { recordedAt: string }[]).map((r) => {
            const date = new Date(r.recordedAt);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          })
        );
        setAvailableMonths(Array.from(monthSet).sort().reverse());
      }
    } catch (err) {
      console.error("Failed to fetch paginated readings:", err);
    } finally {
      setLoadingTable(false);
    }
  }, [pageSize, currentPage, selectedMonth, dateSort]);

  // Track whether this is the very first mount — skip redundant fetch when
  // initialReadings are already seeded from the parent's page-load request.
  const isFirstMount = initialReadings.length > 0;

  useEffect(() => {
    if (isFirstMount && currentPage === 1 && pageSize === 15 && dateSort === "desc" && selectedMonth === "all") {
      // initial data already loaded via props — no fetch needed
      return;
    }
    fetchTableData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTableData]);

  const toggleDateSort = () => {
    setDateSort((prev) => (prev === "desc" ? "asc" : "desc"));
    setCurrentPage(1);
  };

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = totalItems > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(safePage * pageSize, totalItems);

  // Month filter options — seeded from allReadings on first paint, kept fresh by fetchTableData
  const months = availableMonths;

  // Generate smart page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("…");
      for (
        let i = Math.max(2, safePage - 1);
        i <= Math.min(totalPages - 1, safePage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  };

  const startEdit = (reading: MeterReading) => {
    const d = new Date(reading.recordedAt);
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditingId(reading.id);
    setEditForm({
      recordedAt: localISO,
      meterKwh: String(reading.meterKwh),
      buyKwh: reading.buyKwh ? String(reading.buyKwh) : "",
      notes: reading.notes || "",
    });
  };

  const handleSetToNow = () => {
    const d = new Date();
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditForm((prev) => ({ ...prev, recordedAt: localISO }));
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      const body = {
        recordedAt: new Date(editForm.recordedAt).toISOString(),
        meterKwh: parseFloat(editForm.meterKwh),
        buyKwh: editForm.buyKwh ? parseFloat(editForm.buyKwh) : null,
        notes: editForm.notes || null,
      };
      const res = await fetch(`/api/readings/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      await fetchTableData();
      onRefresh();
    } catch {
      alert("Failed to update reading");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/readings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteConfirm(null);
      await fetchTableData();
      onRefresh();
    } catch {
      alert("Failed to delete reading");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <span className="text-lg">📋</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-[family-name:var(--font-outfit)]">
                Readings Log
              </h2>
              {(isLoading || loadingTable) && (
                <span className="spinner text-accent" style={{ width: "1rem", height: "1rem" }} title="Loading readings..." />
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {(isLoading || loadingTable) && paginatedReadings.length === 0 ? "Loading readings..." : `${totalItems} entries`}
            </p>
          </div>
        </div>

        {/* Month filter */}
        <select
          className="input-field"
          style={{ width: "auto", minWidth: "160px" }}
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Months</option>
          {months.map((m) => {
            const [year, month] = m.split("-");
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return (
              <option key={m} value={m}>
                {date.toLocaleDateString("id-ID", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            );
          })}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th
                className="cursor-pointer select-none hover:text-accent transition-colors"
                onClick={toggleDateSort}
                title="Sort by date"
              >
                Date {dateSort === "asc" ? "▲" : "▼"}
              </th>
              <th>Time</th>
              <th>Meter (kWh)</th>
              <th>Hour Diff</th>
              <th>Buy kWh</th>
              <th>kWh Used</th>
              <th>Cost (Rp)</th>
              <th>Notes</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedReadings.map((r) => {
              const date = new Date(r.recordedAt);
              const isEditing = editingId === r.id;

              if (isEditing) {
                return (
                  <tr key={r.id} className="bg-accent/5">
                    <td colSpan={isAdmin ? 9 : 8}>
                      <div className="flex flex-wrap gap-3 items-end p-2">
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="input-label mb-0">Date &amp; Time</label>
                            <button
                              type="button"
                              className="text-[10px] text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                              onClick={handleSetToNow}
                            >
                              🕒 Now
                            </button>
                          </div>
                          <input
                            type="datetime-local"
                            className="input-field"
                            value={editForm.recordedAt}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                recordedAt: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="input-label">Meter kWh</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            value={editForm.meterKwh}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                meterKwh: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="input-label">Buy kWh</label>
                          <input
                            type="number"
                            step={BUY_KWH_UNIT}
                            className="input-field"
                            value={editForm.buyKwh}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                buyKwh: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="input-label">Notes</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                notes: e.target.value,
                              })
                            }
                          />
                        </div>
                        <button
                          className="btn-primary"
                          onClick={handleSaveEdit}
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={r.id} className={r.isEstimated ? "opacity-75 bg-accent/5 italic" : ""}>
                  <td>
                    {formatDate(date)}
                    {r.isEstimated && (
                      <span className="ml-2 text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-normal not-italic">
                        Estimated
                      </span>
                    )}
                  </td>
                  <td className="muted">{formatTime(date)}</td>
                  <td className="font-medium">{formatKwh(r.meterKwh)}</td>
                  <td className="muted">
                    {r.hourDiff != null ? formatNumber(r.hourDiff) : "—"}
                  </td>
                  <td>
                    {r.buyKwh ? (
                      <span className="badge badge-success">
                        +{formatKwh(r.buyKwh)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="font-medium">
                    {r.kwhUsed != null ? formatKwh(r.kwhUsed) : "—"}
                  </td>
                  <td className="font-medium text-warning">
                    {r.costRp != null ? formatRupiah(r.costRp) : "—"}
                  </td>
                  <td className="muted text-xs max-w-[150px] truncate">
                    {r.notes || "—"}
                  </td>
                  {isAdmin && (
                    <td>
                      {r.isEstimated ? (
                        <span className="text-[10px] text-text-muted italic">Auto-filled</span>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            className="btn-icon"
                            onClick={() => startEdit(r)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          {deleteConfirm === r.id ? (
                            <div className="flex gap-1">
                              <button
                                className="btn-danger text-xs"
                                onClick={() => handleDelete(r.id)}
                                disabled={loading}
                              >
                                Confirm
                              </button>
                              <button
                                className="btn-secondary text-xs"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn-icon"
                              onClick={() => setDeleteConfirm(r.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {(isLoading || loadingTable) && paginatedReadings.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 9 : 8}
                  className="text-center text-text-muted py-12"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="spinner text-accent" style={{ width: "2rem", height: "2rem" }} />
                    <span className="text-sm font-medium text-text-secondary">Loading readings data...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedReadings.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 9 : 8}
                  className="text-center text-text-muted py-12"
                >
                  No readings found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden p-3 space-y-2">
        {paginatedReadings.map((r) => {
          const date = new Date(r.recordedAt);
          return (
            <div key={r.id} className={`mobile-card ${r.isEstimated ? "opacity-75 bg-accent/5 italic" : ""}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatDate(date)}</p>
                    {r.isEstimated && (
                      <span className="text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-normal not-italic">
                        Estimated
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{formatTime(date)}</p>
                </div>
                {isAdmin && !r.isEstimated && (
                  <div className="flex gap-1">
                    <button
                      className="btn-icon text-xs"
                      onClick={() => startEdit(r)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon text-xs"
                      onClick={() =>
                        deleteConfirm === r.id
                          ? handleDelete(r.id)
                          : setDeleteConfirm(r.id)
                      }
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-text-muted text-xs">Meter</span>
                  <p className="font-medium">{formatKwh(r.meterKwh)} kWh</p>
                </div>
                <div>
                  <span className="text-text-muted text-xs">Used</span>
                  <p className="font-medium">
                    {r.kwhUsed != null ? `${formatKwh(r.kwhUsed)} kWh` : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted text-xs">Cost</span>
                  <p className="font-medium text-warning">
                    {r.costRp != null ? formatRupiah(r.costRp) : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted text-xs">Hours</span>
                  <p className="text-text-secondary">
                    {r.hourDiff != null ? formatNumber(r.hourDiff) : "—"}
                  </p>
                </div>
              </div>

              {r.buyKwh && (
                <div className="mt-2">
                  <span className="badge badge-success">
                    Bought +{formatKwh(r.buyKwh)} kWh
                  </span>
                </div>
              )}
              {r.notes && (
                <p className="text-xs text-text-muted mt-2">{r.notes}</p>
              )}
            </div>
          );
        })}
        {(isLoading || loadingTable) && paginatedReadings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="spinner text-accent" style={{ width: "2rem", height: "2rem" }} />
            <span className="text-sm font-medium text-text-secondary">Loading readings data...</span>
          </div>
        ) : paginatedReadings.length === 0 ? (
          <p className="text-center text-text-muted py-8">No readings found</p>
        ) : null}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Show</span>
            <select
              className="input-field w-auto py-1 px-2 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <p className="text-sm text-text-secondary">
            Showing {startIdx}–{endIdx} of {totalItems}
          </p>

          <div className="flex items-center gap-1">
            <button
              className="btn-secondary text-sm px-3 py-1.5"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              ‹ Prev
            </button>
            {getPageNumbers().map((page, idx) =>
              typeof page === "string" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-text-muted"
                >
                  {page}
                </span>
              ) : (
                <button
                  key={page}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    page === safePage
                      ? "bg-accent text-white"
                      : "btn-secondary"
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            )}
            <button
              className="btn-secondary text-sm px-3 py-1.5"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={safePage === totalPages}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
