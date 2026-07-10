"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { Tracking } from "@/types";
import { carrierDisplay } from "@/lib/tracker";
import StatusBadge from "./StatusBadge";

interface Props {
  tracking: Tracking;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onCopy?: () => void;
  onRefresh?: (e: React.MouseEvent) => void;
  onEditNote?: (e: React.MouseEvent) => void;
  selected?: boolean;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  showCheckbox?: boolean;
}

/* ── Helpers ────────────────────────────────────────────────── */

function useLongPress(onLongPress: () => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const start = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => { didLongPress.current = true; onLongPress(); }, delay);
  }, [onLongPress, delay]);
  const cancel = useCallback(() => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); },
  };
}

function relativeTime(isoStr: string | null): string {
  if (!isoStr) return "";
  try {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return "vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
    return `${Math.floor(diff / 86400)}d trước`;
  } catch { return ""; }
}

function daysSince(isoStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000));
}

function isDone(t: Tracking): boolean {
  const s = (t.last_status || "").toLowerCase();
  return (
    t.is_delivered ||
    s.includes("giao hàng thành công") || s.includes("delivered") ||
    s.includes("huỷ") || s.includes("hủy") || s.includes("cancel") ||
    s.includes("hoàn") || s.includes("trả về") || s.includes("return")
  );
}

function isLateParcel(t: Tracking): boolean {
  return !isDone(t) && daysSince(t.created_at) > 5;
}

function carrierColor(carrier: string): string {
  if (carrier === "ghn") return "#FEE2E2";
  if (carrier === "spx") return "#FEF3C7";
  return "#F3F4F6";
}
function carrierTextColor(carrier: string): string {
  if (carrier === "ghn") return "#B91C1C";
  if (carrier === "spx") return "#B45309";
  return "var(--color-muted)";
}

/* ── Component ──────────────────────────────────────────────── */

export default function TrackingCard({
  tracking,
  onDelete,
  onCopy,
  onRefresh,
  onEditNote,
  selected = false,
  checked = false,
  onCheck,
  showCheckbox = false,
}: Props) {
  const t = tracking;
  const displayId = t.display_id || 0;
  const checkedAgo = useMemo(() => relativeTime(t.last_checked_at), [t.last_checked_at]);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const days = daysSince(t.created_at);
  const done = isDone(t);
  const late = isLateParcel(t);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(t.tracking_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onCopy?.();
    }).catch(() => {});
  }, [t.tracking_code, onCopy]);

  const longPress = useLongPress(handleCopy);

  const showActions = hovered || showCheckbox;

  return (
    <div
      className="relative p-3.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...longPress}
    >
      {/* Left accent bar when selected */}
      {selected && (
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: "var(--color-accent-blue)" }}
        />
      )}

      {/* Late parcel left border */}
      {late && !selected && (
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: "var(--color-accent-red)" }}
        />
      )}

      {/* Copied tooltip */}
      {copied && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-lg fade-in pointer-events-none select-none">
          ✓ Đã copy
        </div>
      )}

      <div className="flex items-start gap-2.5">
        {/* Checkbox — visible on hover or when any card is checked */}
        <div
          className="shrink-0 mt-0.5 transition-all duration-150"
          style={{ opacity: showActions ? 1 : 0, width: showActions ? "16px" : "0px", overflow: "hidden" }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => { e.stopPropagation(); onCheck?.(e.target.checked); }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded cursor-pointer accent-blue-500"
            aria-label={`Chọn đơn #${displayId}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: ID · carrier badge · status badge */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
              #{displayId}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: carrierColor(t.carrier), color: carrierTextColor(t.carrier) }}
            >
              {carrierDisplay(t.carrier)}
            </span>
            <StatusBadge tracking={t} size="sm" />

            {/* Late warning badge */}
            {late && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FECACA" }}
                title="Đơn hàng trễ giao"
              >
                ⚠ Trễ giao
              </span>
            )}
          </div>

          {/* Row 2: Tracking code */}
          <div
            className="font-mono text-sm truncate mb-1 cursor-pointer hover:underline"
            style={{ color: "var(--color-accent-blue)" }}
            onClick={handleCopy}
            title="Click để copy mã vận đơn"
          >
            {t.tracking_code}
          </div>

          {/* Row 3: Nickname */}
          {t.nickname && (
            <div className="text-xs truncate mb-1" style={{ color: "var(--color-muted)" }}>
              📝 {t.nickname}
            </div>
          )}

          {/* Row 4: Status text */}
          {t.last_status ? (
            <div className="text-xs line-clamp-1 mb-1" style={{ color: "var(--color-secondary)" }}>
              {t.last_status}
            </div>
          ) : (
            <div className="text-xs italic mb-1" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
              Chưa tra cứu
            </div>
          )}

          {/* Row 5: Times */}
          <div className="flex items-center gap-2 flex-wrap">
            {t.last_status_time && (
              <span className="text-xs" style={{ color: "var(--color-muted)", opacity: 0.7 }}>
                📅 {t.last_status_time}
              </span>
            )}
            {checkedAgo && (
              <span className="text-xs" style={{ color: "var(--color-muted)", opacity: 0.5 }}
                title={`Tra cứu: ${t.last_checked_at}`}>
                · 🔄 {checkedAgo}
              </span>
            )}
            {/* Days in transit */}
            {days > 0 && (
              <span
                className="text-xs tabular-nums"
                style={{ color: late ? "var(--color-accent-orange)" : done ? "var(--color-muted)" : "var(--color-muted)", opacity: late ? 1 : 0.6 }}
              >
                · {done ? `✓ ${days}d` : late ? `⏳ ${days}d — chậm` : `⏳ ${days}d`}
              </span>
            )}
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="shrink-0 flex flex-col gap-1">
          {onRefresh && (
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh(e); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 text-xs
                opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:scale-110"
              style={{ background: "#EFF6FF", color: "#2563EB" }}
              title="Làm mới"
              aria-label="Làm mới đơn"
            >
              🔄
            </button>
          )}
          {onEditNote && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditNote(e); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 text-xs
                opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:scale-110"
              style={{ background: "#F3F4F6", color: "#374151" }}
              title="Sửa ghi chú"
              aria-label="Sửa ghi chú"
            >
              ✏️
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 text-xs
              opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:scale-110"
            style={{ background: "#FEE2E2", color: "#DC2626" }}
            title="Xóa"
            aria-label="Xóa đơn"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Late parcel warning badge (top-right corner icon) */}
      {late && (
        <div
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-xs"
          style={{ background: "#FEE2E2", color: "#DC2626" }}
          title={`Đơn này đã ${days} ngày chưa được giao`}
        >
          ⚠
        </div>
      )}
    </div>
  );
}
