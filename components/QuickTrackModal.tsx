"use client";

import { useState } from "react";
import type { TrackResult, Carrier } from "@/types";
import { carrierDisplay } from "@/lib/tracker";
import TrackingDetail from "./TrackingDetail";
import type { Tracking } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave?: (carrier: Carrier, code: string) => void;
}

export default function QuickTrackModal({ open, onClose, onSave }: Props) {
  const [carrier, setCarrier] = useState<Carrier>("ghn");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [trackedCode, setTrackedCode] = useState("");
  const [trackedCarrier, setTrackedCarrier] = useState<Carrier>("ghn");
  const [error, setError] = useState("");

  // Auto detect carrier
  const handleCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setCode(upper);
    if (upper.startsWith("SPX")) setCarrier("spx");
    else if (upper.length > 0) setCarrier("ghn");
  };

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 5) { setError("Mã quá ngắn"); return; }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier, tracking_code: trimmed }),
      });
      const data = await res.json();
      setResult(data.result);
      setTrackedCode(trimmed);
      setTrackedCarrier(carrier);
    } catch (e) {
      setResult({ ok: false, error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCode("");
    setResult(null);
    setError("");
    onClose();
  }

  // Fake tracking object để dùng TrackingDetail
  const fakeTracking: Tracking = {
    id: "quick",
    user_id: "",
    carrier: trackedCarrier,
    tracking_code: trackedCode,
    nickname: null,
    last_status: result?.status || null,
    last_status_time: result?.status_time || null,
    last_checked_at: null,
    is_delivered: result?.is_delivered || false,
    is_archived: false,
    created_at: new Date().toISOString(),
    display_id: 0,
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col slide-in-up sm:fade-in-scale"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-modal)" }}>
        {/* Handle indicator for mobile */}
        <div className="flex justify-center pt-2.5 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>🔍 Tra cứu nhanh</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Không lưu vào danh sách</p>
          </div>
          <button
            onClick={handleClose}
            className="text-2xl w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--color-muted)" }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleTrack} className="p-4 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex gap-2 mb-3">
            {(["ghn", "spx"] as Carrier[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCarrier(c)}
                className="flex-1 py-2 rounded-xl border text-sm font-semibold transition-all"
                style={{
                  borderColor: carrier === c ? "var(--color-accent-blue)" : "var(--color-border)",
                  background: carrier === c ? "rgba(59,130,246,0.12)" : "var(--color-card)",
                  color: carrier === c ? "var(--color-accent-blue)" : "var(--color-secondary)",
                }}
              >
                {c === "ghn" ? "🟠 GHN" : "🟧 SPX"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Nhập mã vận đơn..."
              className="flex-1 rounded-xl px-4 py-2.5 font-mono text-sm focus:outline-none transition-colors"
              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-primary)" }}
              autoFocus
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 disabled:opacity-40"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Tra"}
            </button>
          </div>
          {error && <p className="text-xs mt-1.5" style={{ color: "var(--color-accent-red)" }}>⚠️ {error}</p>}
        </form>

        {/* Result */}
        {(result || loading) && (
          <div className="flex-1 overflow-y-auto">
            <TrackingDetail
              tracking={fakeTracking}
              result={result}
              loading={loading}
              onRefresh={() => handleTrack({ preventDefault: () => {} } as React.FormEvent)}
              onDelete={() => {}}
              onEditNote={() => {}}
              onClose={() => { setResult(null); }}
              hideActions
            />
            {/* Save to list button */}
            {result?.ok && onSave && (
              <div className="p-4 pt-0">
                <button
                  onClick={() => { onSave(trackedCarrier, trackedCode); handleClose(); }}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ background: "var(--color-accent-green)", color: "#fff" }}
                >
                  ➕ Lưu vào danh sách theo dõi
                </button>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="p-4">
            <div className="text-xs text-center" style={{ color: "var(--color-muted)" }}>
              {carrierDisplay(carrier)} · Kết quả tra cứu sẽ hiện ngay bên dưới
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
