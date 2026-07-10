import { useEffect, useRef } from "react";

const PING_INTERVAL = 30_000; // 30 giây

/**
 * Hook gửi ping lên /api/presence mỗi 30s để báo user đang online.
 * Cũng ping ngay khi tab được focus lại.
 */
export function usePresence(userId: string | undefined, email: string | undefined) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId || !email) return;

    const ping = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, email, page: "/" }),
      }).catch(() => {}); // silent fail
    };

    // Ping ngay lập tức khi mount
    ping();

    // Ping định kỳ
    timerRef.current = setInterval(ping, PING_INTERVAL);

    // Ping khi tab được focus lại
    const onFocus = () => ping();
    window.addEventListener("focus", onFocus);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, email]);
}
