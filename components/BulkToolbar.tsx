"use client";

import { useState, useEffect } from "react";
import type { Tracking } from "@/types";

interface Props {
  selectedItems: Tracking[];
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExportCSV: () => void;
}

export default function BulkToolbar({
  selectedItems,
  onClearSelection,
  onDeleteSelected,
  onExportCSV,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const count = selectedItems.length;

  useEffect(() => {
    if (count > 0) {
      setExiting(false);
      setVisible(true);
    } else if (visible) {
      setExiting(true);
      const t = setTimeout(() => { setVisible(false); setExiting(false); }, 250);
      return () => clearTimeout(t);
    }
  }, [count, visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 ${exiting ? "bulk-toolbar-out" : "bulk-toolbar-in"}`}
      role="toolbar"
      aria-label="Thao tác hàng loạt"
    >
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: "var(--color-border)" }}>
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--color-accent-blue)", color: "#fff" }}
          >
            {count}
          </span>
          <span className="text-sm" style={{ color: "var(--color-secondary)" }}>
            đã chọn
          </span>
        </div>

        {/* Export CSV */}
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-80"
          style={{ background: "rgba(6,182,212,0.1)", color: "var(--color-accent-cyan)", border: "1px solid rgba(6,182,212,0.2)" }}
          aria-label="Xuất CSV"
        >
          📥 Xuất CSV
        </button>

        {/* Delete */}
        <button
          onClick={onDeleteSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-80"
          style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-accent-red)", border: "1px solid rgba(239,68,68,0.2)" }}
          aria-label="Xóa đã chọn"
        >
          🗑 Xóa đã chọn
        </button>

        {/* Clear */}
        <button
          onClick={onClearSelection}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-all hover:opacity-70"
          style={{ color: "var(--color-muted)" }}
          aria-label="Bỏ chọn tất cả"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** Generate and download a CSV file for the given trackings */
export function exportTrackingsCSV(trackings: Tracking[]) {
  const headers = ["Mã vận đơn", "Hãng vận chuyển", "Trạng thái", "Thời gian", "Ghi chú"];
  const rows = trackings.map((t) => [
    t.tracking_code,
    t.carrier.toUpperCase(),
    t.last_status || "",
    t.last_status_time || "",
    t.nickname || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trackings_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
