"use client";

import { useState, useCallback } from "react";
import type { ToastItem } from "@/components/Toast";

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (type: ToastItem["type"], title: string, message?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, title, message }]);
    },
    []
  );

  const addToastWithAction = useCallback(
    (
      type: ToastItem["type"],
      title: string,
      message?: string,
      action?: ToastItem["action"]
    ) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, title, message, action, duration: 5000 }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, addToastWithAction, removeToast };
}
