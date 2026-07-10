"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

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
      if (diff < 60) setDisplay("vừa xong");
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
      const remaining = new Date(lastCheckedAt).getTime() + intervalMs - Date.now();
      if (remaining <= 0) { setCountdown("Sắp quét..."); setProgress(100); return; }
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

// Modal dùng Portal — render thẳng vào body, không bị ảnh hưởng bởi parent
function CronModal({
  status,
  onClose,
  lastCheckedDisplay,
  countdown,
  progress,
  isHealthy,
}: {
  status: CronStatus;
  onClose: () => void;
  lastCheckedDisplay: string;
  countdown: string;
  progress: number;
  isHealthy: boolean;
}) {
  // Ngăn scroll body khi modal mở
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden slide-in-up sm:fade-in-scale"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }}>
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>🔄 Tự động theo dõi</span>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: isHealthy ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.15)",
                color: isHealthy ? "var(--color-accent-green)" : "var(--color-accent-orange)",
              }}>
              {isHealthy ? "Hoạt động" : "Chậm trễ"}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-lg leading-none"
              style={{ color: "var(--color-muted)" }}
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Last scan */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Quét cuối</span>
            <span className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>{lastCheckedDisplay}</span>
          </div>

          {/* Countdown */}
          {status.last_checked_at && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>Quét tiếp theo</span>
                <span className="text-xs font-medium tabular-nums" style={{ color: "var(--color-accent-blue)" }}>{countdown}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%`, background: "var(--color-accent-blue)" }}
                />
              </div>
            </div>
          )}

          <div className="h-px" style={{ background: "var(--color-border)" }} />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--color-card)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{status.active_count}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>đơn đang theo dõi</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--color-card)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--color-accent-blue)" }}>{status.interval_minutes}p</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>chu kỳ quét</div>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
              Bot tự động kiểm tra{" "}
              <span className="font-medium" style={{ color: "var(--color-accent-blue)" }}>mỗi 15 phút</span>{" "}
              và gửi thông báo khi trạng thái đơn thay đổi.
            </p>
          </div>

          {!isHealthy && status.last_checked_at && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <p className="text-xs" style={{ color: "var(--color-accent-orange)" }}>
                ⚠️ Lần quét cuối hơn 8 phút. App đang tự kích hoạt quét bù khi bạn mở tab.
              </p>
            </div>
          )}

          {!status.last_checked_at && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--color-card)" }}>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                ℹ️ Chưa có lần quét nào. Thêm đơn để bắt đầu theo dõi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function CronStatusBar({ userId }: Props) {
  const [status, setStatus] = useState<CronStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fetchRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchStatus = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const res = await fetch(`/api/cron/status?user_id=${userId}`);
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
    finally { fetchRef.current = false; }
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

  if (!status || !mounted) return null;

  const isHealthy = status.last_checked_at
    ? Date.now() - new Date(status.last_checked_at).getTime() < 8 * 60 * 1000
    : false;

  const btnStyle = isHealthy
    ? { background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)", color: "var(--color-accent-green)" }
    : status.last_checked_at
      ? { background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.25)", color: "var(--color-accent-orange)" }
      : { background: "var(--color-border)", border: "1px solid var(--color-border)", color: "var(--color-muted)" };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={btnStyle}
        title={countdown ? `Quét tiếp theo: ${countdown}` : "Xem trạng thái tự động quét"}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHealthy ? "pulse-dot" : ""}`}
          style={{ background: isHealthy ? "var(--color-accent-green)" : "var(--color-accent-orange)" }}
        />
        <span className="hidden sm:inline">{status.active_count} đơn</span>
        {countdown && (
          <span className="hidden md:inline tabular-nums" style={{ color: "var(--color-muted)" }}>· {countdown}</span>
        )}
      </button>

      {open && (
        <CronModal
          status={status}
          onClose={() => setOpen(false)}
          lastCheckedDisplay={lastCheckedDisplay}
          countdown={countdown}
          progress={progress}
          isHealthy={isHealthy}
        />
      )}
    </>
  );
}
