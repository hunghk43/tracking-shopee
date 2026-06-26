"use client";

import { useState, useEffect } from "react";

interface Props {
  userId: string;
  onToast: (type: "success" | "error" | "info", title: string, msg?: string) => void;
}

export default function PushNotificationBtn({ userId, onToast }: Props) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch { /* ignore */ }
  }

  async function subscribe() {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      onToast("error", "Chưa cấu hình VAPID", "Liên hệ admin để bật thông báo");
      return;
    }

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        onToast("warning" as "error", "Bị từ chối", "Bạn đã chặn thông báo. Vui lòng cho phép trong cài đặt trình duyệt");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, subscription: subJson }),
      });

      setSubscribed(true);
      onToast("success", "Đã bật thông báo! 🔔", "Bot sẽ thông báo khi đơn có cập nhật");
    } catch (e) {
      console.error(e);
      onToast("error", "Lỗi bật thông báo", String(e));
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      onToast("info", "Đã tắt thông báo");
    } catch (e) {
      onToast("error", "Lỗi tắt thông báo", String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  if (subscribed) {
    return (
      <button
        onClick={unsubscribe}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium transition-all"
        title="Tắt thông báo"
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
        ) : (
          "🔔"
        )}
        <span className="hidden sm:inline">Đang bật</span>
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={loading || permission === "denied"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
      title={permission === "denied" ? "Bị chặn trong trình duyệt" : "Bật thông báo"}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
      ) : (
        "🔕"
      )}
      <span className="hidden sm:inline">Thông báo</span>
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
