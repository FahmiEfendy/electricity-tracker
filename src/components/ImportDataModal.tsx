"use client";

import { useState, useRef } from "react";

import * as XLSX from "xlsx";

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportDataModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportDataModalProps) {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet, { dateNF: "yyyy-mm-dd" });
          setCsvText(csv);
        } catch (err) {
          console.error("Error parsing Excel file", err);
          alert("Failed to parse Excel file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setResult(data);
      if (data.imported > 0) {
        setCsvText("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onSuccess();
      }
    } catch (err) {
      setResult({
        imported: 0,
        errors: [err instanceof Error ? err.message : "Import failed"],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCsvText("");
    setResult(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <span className="text-lg">📥</span>
            </div>
            <div>
              <h2 className="text-lg font-bold font-[family-name:var(--font-outfit)]">
                Import Data
              </h2>
              <p className="text-xs text-text-secondary">
                Import from CSV file or paste data
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* CSV Format guide */}
        <div className="bg-bg-primary/50 rounded-lg p-3 mb-4 text-xs text-text-secondary">
          <p className="font-medium text-text-primary mb-1">
            Expected CSV format:
          </p>
          <code className="text-accent-light">
            Date,kWh,Time,Hour Difference,Buy kWh,kWh Used,Cost (Rp),Notes
          </code>
          <br />
          <code className="text-text-muted">
            29/07/2025,117.8,16:02,21.43,,12.52,22425.01,AC running
          </code>
        </div>

        {/* File input */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            className="btn-secondary w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            📁 Choose CSV or Excel File
          </button>
        </div>

        {/* Text area */}
        <div className="mb-4">
          <label className="input-label">Or paste CSV data directly:</label>
          <textarea
            className="input-field h-40 font-mono text-xs"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Date,kWh,Time,Hour Difference,Buy kWh,kWh Used,Cost (Rp),Notes&#10;29/07/2025,117.8,16:02,21.43,,12.52,22425.01,AC running"
          />
        </div>

        {/* Result */}
        {result && (
          <div className="mb-4 animate-fade-in">
            {result.imported > 0 && (
              <div className="text-sm text-success bg-success/10 rounded-lg p-3 mb-2">
                ✅ Successfully imported {result.imported} records
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="text-sm text-danger bg-danger/10 rounded-lg p-3">
                <p className="font-medium mb-1">Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i} className="text-xs">
                      {err}
                    </li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="text-xs text-text-muted">
                      ...and {result.errors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={handleClose}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={loading || !csvText.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span
                  className="spinner"
                  style={{
                    borderTopColor: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                />
                Importing...
              </span>
            ) : (
              "📥 Import Data"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
