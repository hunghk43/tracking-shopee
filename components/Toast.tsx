"use client";

import { useEffect, useState, useCallback } from "react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const ICONS: Record<ToastItem["type"], string> = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
  warning: "⚠️",
};

const BORDER_COLORS: Record<ToastItem["type"], string> = {
  success: "var(--color-accent-green)",
  error:   "var(--color-accent-red)",
  info:    "var(--color-accent-blue)",
  warning: "var(--color-accent-yellow)",
};

function ToastItemComponent({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  const handleRemove = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const ms = toast.duration ?? (toast.action ? 5000 : 4000);
    const timer = setTimeout(handleRemove, ms);
    return () => clearTimeout(timer);
  }, [handleRemove, toast.action, toast.duration]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-xl p-4 w-full min-w-[280px] max-w-[380px] cursor-pointer backdrop-blur-sm
        ${exiting ? "toast-out" : "toast-in"}`}
      style={{
        background: "var(--color-card)",
        border: `1px solid ${BORDER_COLORS[toast.type]}40`,
        borderLeft: `3px solid ${BORDER_COLORS[toast.type]}`,
        boxShadow: "var(--shadow-modal)",
      }}
      onClick={handleRemove}
    >
      <span className="text-xl mt-0.5 shrink-0" aria-hidden="true">{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs mt-0.5 break-words" style={{ color: "var(--color-secondary)" }}>
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={(e) => { e.stopPropagation(); toast.action!.onClick(); handleRemove(); }}
            className="mt-1.5 text-xs font-semibold underline underline-offset-2 transition-colors hover:opacity-80"
            style={{ color: "var(--color-accent-blue)" }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        className="text-lg leading-none shrink-0 transition-colors hover:opacity-80"
        style={{ color: "var(--color-muted)" }}
        aria-label="Đóng thông báo"
      >
        ×
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <>
      {/* Desktop: top-right */}
      <div className="fixed top-4 right-4 z-50 hidden sm:flex flex-col gap-2 max-w-[calc(100vw-2rem)]"
        aria-label="Thông báo" role="region">
        {toasts.map((t) => (
          <ToastItemComponent key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </div>
      {/* Mobile: bottom, avoids BottomNav */}
      <div className="fixed bottom-[72px] left-4 right-4 z-50 flex sm:hidden flex-col gap-2"
        aria-label="Thông báo" role="region">
        {toasts.map((t) => (
          <ToastItemComponent key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </div>
    </>
  );
}
