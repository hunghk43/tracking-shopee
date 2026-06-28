"use client";

import { useState, useEffect, useCallback } from "react";

interface CronStatus {
  last_checked_at: string | null;
  active_count: number;
  updated_today: number;
  interval_minutes: number;
}

interface Props {
  userId: string;
}

function useRelativeTime(isoStr: string | null) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!isoStr) { setDisplay("Chưa quét lần nào"); return; }

    const update = () => {
      const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
      if (diff < 60) setDisplay(`${diff}s trước`);
      else if (diff < 3600) setDisplay(`${Math.floor(diff / 60)} phút trước`);
      else if (diff < 86400) setDisplay(`${Math.floor(diff / 3600)} giờ trước`);
      else setDisplay(`${Math.floor(diff / 86400)} ngày trước`);
    };

    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, [isoStr]);

  return display;
}

function useNextScan(lastCheckedAt: string | null, intervalMinutes: number) {
  const [countdown, setCountdown] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!lastCheckedAt) return;

    const intervalMs = intervalMinutes * 60 * 1000;

    const update = () => {
      const lastMs = new Date(lastCheckedAt).getTime();
      const nextMs = lastMs + intervalMs;
      const remaining = nextMs - Date.now();

      if (remaining <= 0) {
        setCountdown("Sắp quét...");
        setProgress(100);
        return;
      }

      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(mins > 0 ? `${mins}p ${secs}s` : `${secs}s`);
      setProgress(Math.min(100, ((intervalMs - remaining) / intervalMs) * 100));
    };

    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [lastCheckedAt, intervalMinutes]);

  return { countdown, progress };
}

export default function CronStatusBar({ userId }: Props) {
  const [status, setStatus] = useState<CronStatus | null>(null);
  const [open, setOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/cron/status?user_id=${userId}`);
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchStatus();
    const t = setInterval(fetchStatus, 60000);
    return () => clearInterval(t);
  }, [userId, fetchStatus]);

  const lastCheckedDisplay = useRelativeTime(status?.last_checked_at ?? null);
  const { countdown, progress } = useNextScan(
    status?.last_checked_at ?? null,
    status?.interval_minutes ?? 15
  );

  if (!status) return null;

  const isHealthy = status.last_checked_at
    ? Date.now() - new Date(status.last_checked_at).getTime() < 20 * 60 * 1000
    : false;

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          isHealthy
            ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
            : status.last_checked_at
              ? "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
        }`}
        title="Trạng thái tự động quét"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? "bg-green-400 pulse-dot" : "bg-orange-400"}`} />
        <span className="hidden sm:inline">
          {status.active_count > 0 ? `${status.active_count} đơn` : "0 đơn"}
        </span>
        {countdown && <span className="hidden md:inline text-current/70">· {countdown}</span>}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-40 overflow-hidden fade-in">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">🔄 Tự động theo dõi</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isHealthy ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
                {isHealthy ? "Đang hoạt động" : "Chậm trễ"}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* Last scan */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Lần quét cuối</span>
                <span className="text-xs text-slate-200 font-medium">{lastCheckedDisplay}</span>
              </div>

              {/* Next scan countdown */}
              {status.last_checked_at && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Quét tiếp theo</span>
                    <span className="text-xs text-blue-400 font-medium tabular-nums">{countdown}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="h-px bg-slate-700" />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-white">{status.active_count}</div>
                  <div className="text-xs text-slate-500">đơn đang theo dõi</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-blue-400">{status.interval_minutes}p</div>
                  <div className="text-xs text-slate-500">chu kỳ quét</div>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bot tự động kiểm tra <span className="text-blue-400 font-medium">mỗi 15 phút</span> và gửi thông báo ngay khi trạng thái đơn thay đổi.
                </p>
              </div>

              {!isHealthy && status.last_checked_at && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-orange-400">
                    ⚠️ Lần quét cuối đã hơn 20 phút. GitHub Actions cron có thể đang bị delay.
                  </p>
                </div>
              )}

              {!status.last_checked_at && (
                <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400">
                    ℹ️ Chưa có lần quét nào. Thêm đơn để bắt đầu theo dõi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
