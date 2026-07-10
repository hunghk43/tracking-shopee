"use client";

import { useState, useRef, useEffect } from "react";
import type { Carrier } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (carrier: Carrier, code: string, nickname: string) => Promise<void>;
  loading?: boolean;
}

export default function AddTrackingModal({ open, onClose, onAdd, loading }: Props) {
  const [carrier, setCarrier] = useState<Carrier>("ghn");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [clipboardSuggestion, setClipboardSuggestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setNickname("");
      setError("");
      setClipboardSuggestion(null);
      setTimeout(() => inputRef.current?.focus(), 100);

      // Detect mã vận đơn trong clipboard
      if (navigator.clipboard?.readText) {
        navigator.clipboard.readText().then(text => {
          const trimmed = text.trim().toUpperCase();
          if (trimmed.length >= 5 && trimmed.length <= 40 && /^[A-Z0-9]+$/.test(trimmed)) {
            setClipboardSuggestion(trimmed);
            // Auto-detect carrier
            if (trimmed.startsWith("SPX")) setCarrier("spx");
          }
        }).catch(() => {}); // Permission denied hoặc empty, bỏ qua
      }
    }
  }, [open]);

  // Auto-detect carrier from code
  useEffect(() => {
    const upper = code.trim().toUpperCase();
    if (upper.startsWith("SPX")) setCarrier("spx");
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 5 || trimmed.length > 40) {
      setError("Mã vận đơn phải từ 5–40 ký tự");
      return;
    }
    setError("");
    await onAdd(carrier, trimmed, nickname.trim());
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden slide-in-up sm:fade-in-scale"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-modal)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>➕ Thêm mã vận đơn</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Hỗ trợ GHN và SPX (Shopee Express)</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--color-muted)" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Carrier selector */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--color-muted)" }}>
              Chọn hãng vận chuyển
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["ghn", "spx"] as Carrier[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCarrier(c)}
                  className="py-3 px-4 rounded-xl border-2 transition-all text-sm font-semibold"
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
          </div>

          {/* Code input */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--color-muted)" }}>
              Mã vận đơn *
            </label>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={carrier === "ghn" ? "VD: LXK4U2KH" : "VD: SPXVN036012345"}
              className="w-full rounded-xl px-4 py-3 font-mono text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--color-bg)",
                border: `1px solid ${error ? "var(--color-accent-red)" : "var(--color-border)"}`,
                color: "var(--color-primary)",
              }}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
            {/* Clipboard suggestion */}
            {clipboardSuggestion && !code && (
              <button
                type="button"
                onClick={() => { setCode(clipboardSuggestion); setClipboardSuggestion(null); inputRef.current?.focus(); }}
                className="mt-2 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                <span className="text-base shrink-0">📋</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium leading-none mb-0.5" style={{ color: "var(--color-accent-blue)" }}>Dán từ clipboard?</div>
                  <div className="text-xs font-mono truncate" style={{ color: "var(--color-secondary)" }}>{clipboardSuggestion}</div>
                </div>
                <span className="text-xs shrink-0 font-medium" style={{ color: "var(--color-accent-blue)" }}>Dán →</span>
              </button>
            )}
            {error && <p className="text-xs mt-1.5" style={{ color: "var(--color-accent-red)" }}>⚠️ {error}</p>}
          </div>

          {/* Nickname input */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--color-muted)" }}>
              Ghi chú <span className="normal-case" style={{ color: "var(--color-muted)", opacity: 0.5 }}>(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="VD: iPhone 15 cho chị Lan"
              maxLength={60}
              className="w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none"
              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-primary)" }}
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
              disabled={loading}
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang thêm...
                </>
              ) : "➕ Thêm đơn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
