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
}

function useLongPress(onLongPress: () => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const start = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    // ngăn context menu native trên mobile
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); },
  };
}

function relativeTime(isoStr: string | null): string {
  if (!isoStr) return "";
  try {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return "vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  } catch { return ""; }
}

function daysSince(isoStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000));
}

function isDoneStatus(t: Tracking): boolean {
  const s = (t.last_status || "").toLowerCase();
  return (
    t.is_delivered ||
    s.includes("giao hàng thành công") ||
    s.includes("delivered") ||
    s.includes("huỷ") || s.includes("hủy") || s.includes("cancel") ||
    s.includes("hoàn") || s.includes("trả về") || s.includes("return")
  );
}

export default function TrackingCard({ tracking, onDelete, onCopy }: Props) {
  const t = tracking;
  const displayId = t.display_id || 0;
  const checkedAgo = useMemo(() => relativeTime(t.last_checked_at), [t.last_checked_at]);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(t.tracking_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onCopy?.();
    }).catch(() => {});
  }, [t.tracking_code, onCopy]);

  const longPress = useLongPress(handleCopy);

  return (
    <div className="p-3.5 relative" {...longPress}>
      {/* Copied tooltip */}
      {copied && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-lg fade-in pointer-events-none select-none">
          ✓ Đã copy
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Row 1: ID + carrier + status */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-xs font-bold text-slate-500">#{displayId}</span>
            <span className="text-xs text-slate-700">·</span>
            <span className="text-xs text-slate-500">{carrierDisplay(t.carrier)}</span>
            <StatusBadge tracking={t} size="sm" />
          </div>

          {/* Row 2: tracking code */}
          <div className="font-mono text-sm text-blue-300 truncate mb-1">
            {t.tracking_code}
          </div>

          {/* Row 3: nickname */}
          {t.nickname && (
            <div className="text-xs text-slate-400 truncate mb-1">
              📝 {t.nickname}
            </div>
          )}

          {/* Row 4: status */}
          {t.last_status ? (
            <div className="text-xs text-slate-300 line-clamp-1">{t.last_status}</div>
          ) : (
            <div className="text-xs text-slate-600 italic">Chưa tra cứu</div>
          )}

          {/* Row 5: times */}
          <div className="flex items-center gap-2 mt-1">
            {t.last_status_time && (
              <span className="text-xs text-slate-600">📅 {t.last_status_time}</span>
            )}
            {checkedAgo && (
              <span className="text-xs text-slate-700" title={`Tra cứu: ${t.last_checked_at}`}>
                · 🔄 {checkedAgo}
              </span>
            )}
          </div>

          {/* Row 6: số ngày xử lý */}
          {(() => {
            const days = daysSince(t.created_at);
            if (days === 0) return null;
            const done = isDoneStatus(t);
            // Đơn đang chạy > 5 ngày → highlight cam cảnh báo
            const isLate = !done && days > 5;
            return (
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs tabular-nums ${
                  done ? "text-slate-600" : isLate ? "text-orange-500" : "text-slate-600"
                }`}>
                  {done ? `✓ ${days} ngày` : isLate ? `⏳ ${days} ngày` : `⏳ Ngày ${days}`}
                </span>
                {isLate && (
                  <span className="text-xs text-orange-500/70">· chậm</span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Delete — hover trên desktop, luôn hiện trên mobile */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 [@media(hover:none)]:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-all text-xs shrink-0"
          title="Xóa"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
