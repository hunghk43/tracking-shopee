"use client";

import type { Tracking } from "@/types";
import { carrierDisplay } from "@/lib/tracker";
import StatusBadge from "./StatusBadge";

interface Props {
  tracking: Tracking;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export default function TrackingCard({ tracking, onDelete }: Props) {
  const t = tracking;
  const displayId = t.display_id || 0;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        {/* Left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-xs font-bold text-slate-500">#{displayId}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs font-medium text-slate-500">{carrierDisplay(t.carrier)}</span>
            <StatusBadge tracking={t} size="sm" />
          </div>

          <div className="font-mono text-sm text-blue-300 truncate mb-1 pr-2">
            {t.tracking_code}
          </div>

          {t.nickname && (
            <div className="text-xs text-slate-400 truncate mb-1">
              📝 {t.nickname}
            </div>
          )}

          {t.last_status ? (
            <div className="text-xs text-slate-300 line-clamp-1">{t.last_status}</div>
          ) : (
            <div className="text-xs text-slate-600 italic">Chưa tra cứu</div>
          )}

          {t.last_status_time && (
            <div className="text-xs text-slate-600 mt-0.5">⏰ {t.last_status_time}</div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all text-sm shrink-0 mt-0.5"
          title="Xóa"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
