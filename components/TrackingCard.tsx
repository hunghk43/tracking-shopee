"use client";

import { useMemo } from "react";
import type { Tracking } from "@/types";
import { carrierDisplay } from "@/lib/tracker";
import StatusBadge from "./StatusBadge";

interface Props {
  tracking: Tracking;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
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

export default function TrackingCard({ tracking, onDelete }: Props) {
  const t = tracking;
  const displayId = t.display_id || 0;
  const checkedAgo = useMemo(() => relativeTime(t.last_checked_at), [t.last_checked_at]);

  return (
    <div className="p-3.5">
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
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-all text-xs shrink-0"
          title="Xóa"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
