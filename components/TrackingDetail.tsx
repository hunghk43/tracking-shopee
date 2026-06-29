"use client";

import { useState } from "react";
import type { Tracking, TrackResult } from "@/types";
import { carrierDisplay } from "@/lib/tracker";
import StatusBadge from "./StatusBadge";
import SpxProgressBar from "./SpxProgressBar";

interface Props {
  tracking: Tracking;
  result: TrackResult | null;
  loading?: boolean;
  onRefresh: () => void;
  onDelete: () => void;
  onEditNote: (newNote: string) => void;
  onClose: () => void;
  hideActions?: boolean;
}

export default function TrackingDetail({
  tracking,
  result,
  loading,
  onRefresh,
  onDelete,
  onEditNote,
  onClose,
  hideActions = false,
}: Props) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState(tracking.nickname || "");

  const t = tracking;
  const displayId = t.display_id || 0;

  const handleSaveNote = () => {
    onEditNote(noteInput.trim() === "-" ? "" : noteInput.trim());
    setEditingNote(false);
  };

  const orderInfo = result?.order_info as Record<string, string> | undefined;

  function isStatusCancelledOrReturnedLocal(status?: string): boolean {
    const s = (status || "").toLowerCase();
    return s.includes("huỷ") || s.includes("hủy") || s.includes("cancel") || s.includes("hoàn");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          {!hideActions && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700"
            >
              ←
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              {!hideActions && <h2 className="text-base font-bold text-white">Đơn #{displayId}</h2>}
              <StatusBadge tracking={t} size="sm" />
            </div>
            <div className="text-xs text-slate-400">{carrierDisplay(t.carrier)}</div>
          </div>
        </div>
        {!hideActions && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              ) : (
                "🔄"
              )}
              Tra cứu
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info card */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Mã vận đơn</span>
            <span className="font-mono text-sm text-blue-300 select-all">{t.tracking_code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Hãng</span>
            <span className="text-sm text-white font-medium">{carrierDisplay(t.carrier)}</span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-slate-400 mt-0.5">Ghi chú</span>
            {editingNote ? (
              <div className="flex items-center gap-2 flex-1 justify-end">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveNote()}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 w-40"
                  placeholder="Nhập ghi chú..."
                  maxLength={60}
                  autoFocus
                />
                <button onClick={handleSaveNote} className="text-green-400 text-xs hover:text-green-300">✓</button>
                <button onClick={() => setEditingNote(false)} className="text-slate-400 text-xs hover:text-slate-300">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300 italic">
                  {t.nickname || "(chưa có)"}
                </span>
                <button
                  onClick={() => { setNoteInput(t.nickname || ""); setEditingNote(true); }}
                  className="text-slate-500 hover:text-blue-400 text-xs transition-colors"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-6 w-1/2" />
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <>
            {result.ok ? (
              <>
                {/* SPX: Mã đơn Shopee */}
                {t.carrier === "spx" && result.shopee_order_id && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">🛍 Mã đơn Shopee</div>
                      <div className="text-sm font-mono text-orange-300 select-all">
                        {result.shopee_order_id}
                      </div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.shopee_order_id!).then(() => alert("Đã copy!"))}
                      className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded-lg hover:bg-orange-500/10 transition-colors shrink-0"
                    >
                      📋 Copy
                    </button>
                  </div>
                )}

                {/* SPX Progress bar */}
                {t.carrier === "spx" && result.milestone_code !== undefined && (
                  <SpxProgressBar
                    milestoneCode={result.milestone_code}
                    isCancelled={isStatusCancelledOrReturnedLocal(result.status)}
                  />
                )}

                {/* Current status */}
                <div className={`rounded-xl p-4 border ${
                  result.is_delivered
                    ? "bg-green-950/50 border-green-700/50"
                    : "bg-blue-950/50 border-blue-700/50"
                }`}>
                  <div className="text-xs text-slate-400 mb-1">Trạng thái hiện tại</div>
                  <div className="text-base font-semibold text-white">{result.status}</div>
                  {result.status_time && (
                    <div className="text-xs text-slate-400 mt-1">⏰ {result.status_time}</div>
                  )}
                </div>

                {/* Order info (GHN only) */}
                {orderInfo && (orderInfo.from_name || orderInfo.to_name) && (
                  <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      👥 Thông tin đơn hàng
                    </div>
                    {orderInfo.from_name && (
                      <div>
                        <div className="text-xs text-slate-500">📤 Người gửi</div>
                        <div className="text-sm text-white">{orderInfo.from_name}</div>
                        {orderInfo.from_address && (
                          <div className="text-xs text-slate-400 mt-0.5">{orderInfo.from_address}</div>
                        )}
                      </div>
                    )}
                    {orderInfo.to_name && (
                      <div>
                        <div className="text-xs text-slate-500">📥 Người nhận</div>
                        <div className="text-sm text-white">{orderInfo.to_name}</div>
                        {orderInfo.to_address && (
                          <div className="text-xs text-slate-400 mt-0.5">{orderInfo.to_address}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* History */}
                {result.history && result.history.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      📜 Hành trình
                    </div>
                    <div className="relative">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />
                      <div className="space-y-4 pl-7">
                        {[...result.history].reverse().map((h, i) => (
                          <div key={i} className="relative fade-in">
                            <div className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 ${
                              i === 0
                                ? "bg-blue-500 border-blue-400"
                                : "bg-slate-700 border-slate-600"
                            }`} />
                            <div>
                              {h.time && (
                                <div className="text-xs text-slate-500 mb-0.5">{h.time}</div>
                              )}
                              <div className={`text-sm font-medium ${
                                i === 0 ? "text-blue-300" : "text-slate-300"
                              }`}>{h.status}</div>
                              {/* Lý do thất bại (nếu có) */}
                              {h.reason && (
                                <div className="text-xs text-orange-400 mt-0.5">
                                  ⚠️ {h.reason}
                                </div>
                              )}
                              {/* Địa điểm hiện tại */}
                              {h.location && (
                                <div className="text-xs text-slate-500 mt-0.5">📍 {h.location}</div>
                              )}
                              {/* Địa điểm tiếp theo (SPX) */}
                              {h.next_location && (
                                <div className="flex items-start gap-1 mt-0.5">
                                  <span className="text-xs text-slate-600 shrink-0">➡️</span>
                                  <span className="text-xs text-slate-600">{h.next_location}</span>
                                  {h.next_lat && h.next_lng && (
                                    <a
                                      href={`https://www.google.com/maps?q=${h.next_lat},${h.next_lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-1 text-xs text-blue-500 hover:text-blue-400 shrink-0 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      🗺 Maps
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Call logs */}
                {result.call_logs && result.call_logs.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      📞 Lịch sử cuộc gọi ({result.call_logs.length})
                    </div>
                    <div className="space-y-2">
                      {[...result.call_logs].reverse().map((cl, i) => (
                        <div key={i} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                          {cl.time && (
                            <div className="text-xs text-slate-500 mb-1">🕐 {cl.time}</div>
                          )}
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans">
                            {cl.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SMS logs */}
                {result.sms_logs && result.sms_logs.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      💬 Lịch sử SMS ({result.sms_logs.length})
                    </div>
                    <div className="space-y-2">
                      {[...result.sms_logs].reverse().map((sl, i) => (
                        <div key={i} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                          {sl.time && (
                            <div className="text-xs text-slate-500 mb-1">🕐 {sl.time}</div>
                          )}
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans">
                            {sl.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-red-950/50 border border-red-700/50 rounded-xl p-4">
                <div className="text-sm font-medium text-red-300">⚠️ Tra cứu thất bại</div>
                <div className="text-xs text-red-400 mt-1">{result.error}</div>
              </div>
            )}
          </>
        )}

        {/* No result yet */}
        {!loading && !result && (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-sm">Bấm <span className="text-blue-400">🔄 Tra cứu</span> để xem hành trình</div>
          </div>
        )}
      </div>
    </div>
  );
}
