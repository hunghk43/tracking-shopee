"use client";

import { useEffect, useState, useCallback } from "react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const ICONS = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️",
};

const COLORS = {
  success: "border-green-500/50 bg-green-950/90",
  error: "border-red-500/50 bg-red-950/90",
  info: "border-blue-500/50 bg-blue-950/90",
  warning: "border-orange-500/50 bg-orange-950/90",
};

function ToastItem({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  const handleRemove = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const timer = setTimeout(handleRemove, 4000);
    return () => clearTimeout(timer);
  }, [handleRemove]);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-sm w-full min-w-[280px] max-w-[380px] cursor-pointer
        ${COLORS[toast.type]} ${exiting ? "toast-out" : "toast-in"}`}
      onClick={handleRemove}
    >
      <span className="text-xl mt-0.5 shrink-0">{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-300 mt-0.5 break-words">{toast.message}</p>
        )}
      </div>
      <button className="text-slate-400 hover:text-slate-200 text-lg leading-none shrink-0">×</button>
    </div>
  );
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
