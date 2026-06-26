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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setNickname("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
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
      <div className="relative w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">➕ Thêm mã vận đơn</h2>
            <p className="text-xs text-slate-400 mt-0.5">Hỗ trợ GHN và SPX (Shopee Express)</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Carrier selector */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
              Chọn hãng vận chuyển
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["ghn", "spx"] as Carrier[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCarrier(c)}
                  className={`py-3 px-4 rounded-xl border-2 transition-all text-sm font-semibold ${
                    carrier === c
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {c === "ghn" ? "🟠 GHN" : "🟧 SPX"}
                </button>
              ))}
            </div>
          </div>

          {/* Code input */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
              Mã vận đơn *
            </label>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={carrier === "ghn" ? "VD: LXK4U2KH" : "VD: SPXVN036012345"}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 font-mono text-sm transition-colors"
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
            {error && <p className="text-red-400 text-xs mt-1.5">⚠️ {error}</p>}
          </div>

          {/* Nickname input */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
              Ghi chú <span className="text-slate-600 normal-case">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="VD: iPhone 15 cho chị Lan"
              maxLength={60}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm transition-colors"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium"
              disabled={loading}
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang thêm...
                </>
              ) : (
                "➕ Thêm đơn"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
