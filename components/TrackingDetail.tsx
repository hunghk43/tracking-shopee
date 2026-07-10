"use client";

import { useState, useEffect, useRef } from "react";
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

/* ── Helpers ───────────────────────────────────────────────── */

function daysSince(isoStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000));
}

function isLateParcelf(t: Tracking): boolean {
  const s = (t.last_status || "").toLowerCase();
  const done =
    t.is_delivered ||
    s.includes("giao hàng thành công") || s.includes("delivered") ||
    s.includes("huỷ") || s.includes("hủy") || s.includes("cancel") ||
    s.includes("hoàn") || s.includes("trả về") || s.includes("return");
  return !done && daysSince(t.created_at) > 5;
}

function isStatusCancelledOrReturnedLocal(status?: string): boolean {
  const s = (status || "").toLowerCase();
  return s.includes("huỷ") || s.includes("hủy") || s.includes("cancel") || s.includes("hoàn");
}

/* ── Skeleton ──────────────────────────────────────────────── */

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-label="Đang tải chi tiết..." role="status">
      <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-5 w-48 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton h-3 w-40 rounded" />
      </div>
      <div className="skeleton h-14 w-full rounded-xl" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton w-3 h-3 rounded-full mt-1 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Timeline ──────────────────────────────────────────────── */

interface HistoryEvent {
  time?: string;
  status: string;
  location?: string;
  next_location?: string;
  next_lat?: string;
  next_lng?: string;
  reason?: string;
}

function Timeline({ events }: { events: HistoryEvent[] }) {
  const reversed = [...events].reverse();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="relative">
      {/* Vertical gradient line */}
      <div
        className="absolute left-[5px] top-2 w-px"
        style={{
          height: "calc(100% - 16px)",
          background: `linear-gradient(to bottom, var(--color-accent-blue), var(--color-surface))`,
          opacity: 0.4,
        }}
      />

      <div className="space-y-5 pl-6">
        {reversed.map((h, i) => {
          const isLatest = i === 0;
          const isDone = !isLatest;

          return (
            <div
              key={i}
              className="relative fade-in"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Node */}
              <div className="absolute -left-6 top-1 flex items-center justify-center">
                {isLatest ? (
                  <div className="relative w-3 h-3">
                    {/* Pulse ring */}
                    <div
                      className="absolute inset-0 rounded-full pulse-ring"
                      style={{ background: "var(--color-accent-blue)", opacity: 0.4 }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: "var(--color-accent-blue)" }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ background: "var(--color-accent-green)", color: "#fff" }}
                  >
                    ✓
                  </div>
                )}
              </div>

              {/* Content */}
              <div>
                {h.time && (
                  <div className="text-xs mb-0.5" style={{ color: "var(--color-muted)" }}>
                    {h.time}
                  </div>
                )}
                <div
                  className="text-sm font-medium"
                  style={{
                    color: isLatest ? "var(--color-accent-blue)" : "var(--color-secondary)",
                    fontWeight: isLatest ? 600 : 400,
                  }}
                >
                  {h.status}
                </div>

                {/* Reason */}
                {h.reason && (
                  <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--color-accent-yellow)" }}>
                    ⚠️ {h.reason}
                  </div>
                )}

                {/* Location */}
                {h.location && (
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                    📍 {h.location}
                  </div>
                )}

                {/* Next location (SPX) */}
                {h.next_location && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
                      ➡️ {h.next_location}
                    </span>
                    {h.next_lat && h.next_lng && (
                      <a
                        href={`https://www.google.com/maps?q=${h.next_lat},${h.next_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs transition-colors hover:opacity-80"
                        style={{ color: "var(--color-accent-blue)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        🗺 Maps
                      </a>
                    )}
                  </div>
                )}

                {/* Hover tooltip */}
                {hoveredIdx === i && (h.time || h.location) && (
                  <div
                    className="mt-1.5 px-2.5 py-1.5 rounded-lg text-xs fade-in-scale"
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-muted)",
                    }}
                  >
                    {h.time && <span>🕐 {h.time}</span>}
                    {h.location && <span className="ml-2">📍 {h.location}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

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
  const [copied, setCopied] = useState(false);
  const autoRefreshed = useRef(false);

  const t = tracking;
  const displayId = t.display_id || 0;
  const late = isLateParcelf(t);
  const days = daysSince(t.created_at);

  // Auto-trigger refresh when panel opens for a parcel with no result yet
  useEffect(() => {
    if (!result && !loading && !autoRefreshed.current) {
      autoRefreshed.current = true;
      onRefresh();
    }
  // only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveNote = () => {
    onEditNote(noteInput.trim() === "-" ? "" : noteInput.trim());
    setEditingNote(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(t.tracking_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const orderInfo = result?.order_info as Record<string, string> | undefined;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          {!hideActions && (
            <button
              onClick={onClose}
              className="text-xl w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
              style={{ color: "var(--color-muted)", background: "var(--color-border)" }}
              aria-label="Quay lại danh sách"
            >
              ←
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              {!hideActions && (
                <h2 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
                  Đơn #{displayId}
                </h2>
              )}
              <StatusBadge tracking={t} size="sm" />
            </div>
            <div className="text-xs" style={{ color: "var(--color-muted)" }}>
              {carrierDisplay(t.carrier)}
            </div>
          </div>
        </div>
        {!hideActions && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                background: "rgba(59,130,246,0.12)",
                color: "var(--color-accent-blue)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
              aria-label="Tra cứu lại đơn hàng"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-t-blue-400 rounded-full animate-spin" style={{ borderColor: "rgba(59,130,246,0.3)", borderTopColor: "var(--color-accent-blue)" }} />
              ) : (
                "🔄"
              )}
              Tra cứu
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "rgba(239,68,68,0.08)", color: "var(--color-accent-red)", border: "1px solid rgba(239,68,68,0.15)" }}
              aria-label="Xóa đơn hàng"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Late parcel warning banner */}
        {late && (
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3 fade-in"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
            role="alert"
          >
            <span className="text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-accent-red)" }}>
                Đơn hàng có thể bị trễ
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(239,68,68,0.7)" }}>
                Đã {days} ngày chưa giao — vui lòng kiểm tra lại với bưu cục.
              </p>
            </div>
          </div>
        )}

        {/* Info card */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
        >
          {/* Barcode-style tracking code */}
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--color-muted)" }}>Mã vận đơn</div>
            <div
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
            >
              <span
                className="font-mono text-sm select-all break-all"
                style={{ color: "var(--color-accent-blue)" }}
              >
                {t.tracking_code}
              </span>
              <button
                onClick={handleCopyCode}
                className="shrink-0 text-xs px-2 py-1 rounded-md transition-all"
                style={{
                  background: copied ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.1)",
                  color: copied ? "var(--color-accent-green)" : "var(--color-accent-blue)",
                  border: `1px solid ${copied ? "rgba(34,197,94,0.2)" : "rgba(59,130,246,0.2)"}`,
                }}
                aria-label="Copy mã vận đơn"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Hãng vận chuyển</span>
            <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
              {carrierDisplay(t.carrier)}
            </span>
          </div>

          {/* Note with inline edit */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Ghi chú</span>
            {editingNote ? (
              <div className="flex items-center gap-2 flex-1 justify-end">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveNote()}
                  className="rounded-lg px-2 py-1 text-sm focus:outline-none w-40"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-accent-blue)",
                    color: "var(--color-primary)",
                  }}
                  placeholder="Nhập ghi chú..."
                  maxLength={60}
                  autoFocus
                  aria-label="Ghi chú đơn hàng"
                />
                <button
                  onClick={handleSaveNote}
                  className="text-xs"
                  style={{ color: "var(--color-accent-green)" }}
                  aria-label="Lưu ghi chú"
                >
                  ✓
                </button>
                <button
                  onClick={() => setEditingNote(false)}
                  className="text-xs"
                  style={{ color: "var(--color-muted)" }}
                  aria-label="Hủy chỉnh sửa"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm italic" style={{ color: t.nickname ? "var(--color-secondary)" : "var(--color-muted)" }}>
                  {t.nickname || "(chưa có)"}
                </span>
                <button
                  onClick={() => { setNoteInput(t.nickname || ""); setEditingNote(true); }}
                  className="text-xs transition-colors hover:opacity-80"
                  style={{ color: "var(--color-muted)" }}
                  aria-label="Chỉnh sửa ghi chú"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>

          {/* Creation date */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Ngày thêm</span>
            <span className="text-xs" style={{ color: "var(--color-secondary)" }}>
              {new Date(t.created_at).toLocaleDateString("vi-VN")}
            </span>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && <DetailSkeleton />}

        {/* Results */}
        {!loading && result && (
          <>
            {result.ok ? (
              <>
                {/* SPX shopee order ID */}
                {t.carrier === "spx" && result.shopee_order_id && (
                  <div
                    className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}
                  >
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "var(--color-muted)" }}>🛍 Mã đơn Shopee</div>
                      <div className="text-sm font-mono select-all" style={{ color: "#FB923C" }}>
                        {result.shopee_order_id}
                      </div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.shopee_order_id!)}
                      className="text-xs px-2 py-1 rounded-lg transition-colors hover:opacity-80"
                      style={{ color: "#FB923C", background: "rgba(249,115,22,0.1)" }}
                      aria-label="Copy mã đơn Shopee"
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

                {/* Current status card */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: result.is_delivered ? "rgba(34,197,94,0.06)" : "rgba(59,130,246,0.06)",
                    border: `1px solid ${result.is_delivered ? "rgba(34,197,94,0.25)" : "rgba(59,130,246,0.25)"}`,
                  }}
                >
                  <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Trạng thái hiện tại</div>
                  <div className="text-base font-semibold" style={{ color: "var(--color-primary)" }}>
                    {result.status}
                  </div>
                  {result.status_time && (
                    <div className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                      ⏰ {result.status_time}
                    </div>
                  )}
                </div>

                {/* Order info (GHN) */}
                {orderInfo && (orderInfo.from_name || orderInfo.to_name) && (
                  <div
                    className="rounded-xl p-4 space-y-3"
                    style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                      👥 Thông tin đơn hàng
                    </div>
                    {orderInfo.from_name && (
                      <div>
                        <div className="text-xs" style={{ color: "var(--color-muted)" }}>📤 Người gửi</div>
                        <div className="text-sm" style={{ color: "var(--color-primary)" }}>{orderInfo.from_name}</div>
                        {orderInfo.from_address && (
                          <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{orderInfo.from_address}</div>
                        )}
                      </div>
                    )}
                    {orderInfo.to_name && (
                      <div>
                        <div className="text-xs" style={{ color: "var(--color-muted)" }}>📥 Người nhận</div>
                        <div className="text-sm" style={{ color: "var(--color-primary)" }}>{orderInfo.to_name}</div>
                        {orderInfo.to_address && (
                          <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{orderInfo.to_address}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                {result.history && result.history.length > 0 && (
                  <div>
                    <div
                      className="text-xs font-semibold uppercase tracking-wider mb-4"
                      style={{ color: "var(--color-muted)" }}
                    >
                      📜 Hành trình
                    </div>
                    <Timeline events={result.history} />
                  </div>
                )}

                {/* Call logs */}
                {result.call_logs && result.call_logs.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>
                      📞 Lịch sử cuộc gọi ({result.call_logs.length})
                    </div>
                    <div className="space-y-2">
                      {[...result.call_logs].reverse().map((cl, i) => (
                        <div key={i} className="rounded-lg p-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                          {cl.time && <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>🕐 {cl.time}</div>}
                          <pre className="text-xs whitespace-pre-wrap font-sans" style={{ color: "var(--color-secondary)" }}>{cl.content}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SMS logs */}
                {result.sms_logs && result.sms_logs.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>
                      💬 Lịch sử SMS ({result.sms_logs.length})
                    </div>
                    <div className="space-y-2">
                      {[...result.sms_logs].reverse().map((sl, i) => (
                        <div key={i} className="rounded-lg p-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                          {sl.time && <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>🕐 {sl.time}</div>}
                          <pre className="text-xs whitespace-pre-wrap font-sans" style={{ color: "var(--color-secondary)" }}>{sl.content}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}
                role="alert"
              >
                <div className="text-sm font-medium" style={{ color: "var(--color-accent-red)" }}>
                  ⚠️ Tra cứu thất bại
                </div>
                <div className="text-xs mt-1" style={{ color: "rgba(239,68,68,0.7)" }}>
                  {result.error}
                </div>
              </div>
            )}
          </>
        )}

        {/* No result / initial state */}
        {!loading && !result && (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-3xl mb-3">📦</div>
            <div className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
              Đang tra cứu thông tin đơn hàng…
            </div>
            <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto"
              style={{ borderColor: "rgba(59,130,246,0.2)", borderTopColor: "var(--color-accent-blue)" }} />
          </div>
        )}
      </div>
    </div>
  );
}
