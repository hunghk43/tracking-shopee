"use client";

import { useState, useEffect } from "react";

interface Props {
  userId: string;
  onToast: (type: "success" | "error" | "info", title: string, msg?: string) => void;
}

type SupportState = "checking" | "unsupported" | "ios-not-installed" | "supported";

export default function PushNotificationBtn({ userId, onToast }: Props) {
  const [supportState, setSupportState] = useState<SupportState>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    detectSupport();
  }, []);

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isInStandaloneMode() {
    return (
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
      window.matchMedia("(display-mode: standalone)").matches
    );
  }

  async function detectSupport() {
    if (typeof window === "undefined") return;

    // iOS: chỉ hỗ trợ khi đã "Add to Home Screen"
    if (isIos()) {
      if (!isInStandaloneMode()) {
        setSupportState("ios-not-installed");
        return;
      }
    }

    // Kiểm tra browser support
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setSupportState("unsupported");
      return;
    }

    setSupportState("supported");
    setPermission(Notification.permission);
    await checkSubscription();
  }

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
        onToast("error", "Thông báo bị chặn", "Vào Settings trình duyệt → cho phép thông báo từ trang này");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, subscription: subJson }),
      });

      if (!res.ok) throw new Error("Lưu subscription thất bại");

      setSubscribed(true);
      onToast("success", "🔔 Đã bật thông báo!", "Sẽ thông báo mỗi khi đơn có cập nhật");
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

  // Đang check
  if (supportState === "checking") return null;

  // iOS chưa cài lên màn hình chính
  if (supportState === "ios-not-installed") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium"
        >
          🔕 <span className="hidden sm:inline">Thông báo</span>
        </button>

        {showTooltip && (
          <div className="absolute right-0 top-10 w-72 bg-slate-700 border border-slate-600 rounded-xl p-4 shadow-2xl z-50 fade-in">
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute top-2 right-3 text-slate-400 hover:text-white text-lg"
            >×</button>
            <p className="text-sm font-semibold text-white mb-2">📱 Cài web lên màn hình chính</p>
            <p className="text-xs text-slate-300 mb-3">
              Safari trên iPhone/iPad yêu cầu cài web lên màn hình chính mới nhận được thông báo.
            </p>
            <ol className="text-xs text-slate-300 space-y-1.5">
              <li className="flex gap-2"><span className="text-blue-400 font-bold shrink-0">1.</span> Nhấn nút <span className="bg-slate-600 px-1 rounded">⎙ Share</span> ở thanh Safari</li>
              <li className="flex gap-2"><span className="text-blue-400 font-bold shrink-0">2.</span> Chọn <span className="bg-slate-600 px-1 rounded">Add to Home Screen</span></li>
              <li className="flex gap-2"><span className="text-blue-400 font-bold shrink-0">3.</span> Mở app từ màn hình chính → bật thông báo</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  // Trình duyệt không hỗ trợ
  if (supportState === "unsupported") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-700 text-slate-500 text-xs font-medium cursor-help"
          title="Trình duyệt không hỗ trợ thông báo"
        >
          🔕 <span className="hidden sm:inline">Thông báo</span>
        </button>
        {showTooltip && (
          <div className="absolute right-0 top-10 w-64 bg-slate-700 border border-slate-600 rounded-xl p-4 shadow-2xl z-50 fade-in">
            <button onClick={() => setShowTooltip(false)} className="absolute top-2 right-3 text-slate-400 hover:text-white text-lg">×</button>
            <p className="text-sm font-semibold text-white mb-1">Trình duyệt chưa hỗ trợ</p>
            <p className="text-xs text-slate-300">Dùng Chrome hoặc Edge để nhận thông báo push.</p>
          </div>
        )}
      </div>
    );
  }

  // Đã subscribe
  if (subscribed) {
    return (
      <button
        onClick={unsubscribe}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium transition-all"
        title="Click để tắt thông báo"
      >
        {loading
          ? <span className="w-3.5 h-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          : "🔔"
        }
        <span className="hidden sm:inline">Đang bật</span>
      </button>
    );
  }

  // Bị chặn
  if (permission === "denied") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium"
        >
          🚫 <span className="hidden sm:inline">Bị chặn</span>
        </button>
        {showTooltip && (
          <div className="absolute right-0 top-10 w-72 bg-slate-700 border border-slate-600 rounded-xl p-4 shadow-2xl z-50 fade-in">
            <button onClick={() => setShowTooltip(false)} className="absolute top-2 right-3 text-slate-400 hover:text-white text-lg">×</button>
            <p className="text-sm font-semibold text-white mb-2">🚫 Thông báo bị chặn</p>
            <p className="text-xs text-slate-300 mb-2">Cần cho phép thủ công trong trình duyệt:</p>
            <p className="text-xs text-slate-300">
              Chrome: click 🔒 trên thanh địa chỉ → <span className="text-white">Notifications</span> → <span className="text-green-400">Allow</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  // Chưa subscribe — trạng thái mặc định
  return (
    <button
      onClick={subscribe}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium transition-all disabled:opacity-50"
      title="Bật thông báo khi đơn có cập nhật"
    >
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
        : "🔕"
      }
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
