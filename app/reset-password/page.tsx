"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

type PageState = "loading" | "form" | "success" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase gửi token qua URL hash: #access_token=...&type=recovery
    // onAuthStateChange sẽ bắt được event PASSWORD_RECOVERY khi có token hợp lệ
    const sb = getSupabaseBrowser();

    const { data: { subscription } } = sb.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        // Token hợp lệ, cho phép đặt mật khẩu mới
        setPageState("form");
      } else if (event === "SIGNED_IN") {
        // Đã có session nhưng không phải recovery flow
        // Có thể user đã login bình thường trước đó
        setPageState("form");
      }
    });

    // Timeout: nếu sau 4 giây không nhận được event → link không hợp lệ/hết hạn
    const timeout = setTimeout(() => {
      setPageState((prev) => {
        if (prev === "loading") return "invalid";
        return prev;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    const sb = getSupabaseBrowser();

    try {
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPageState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Auth session missing")) {
        setError("Phiên đặt lại đã hết hạn. Vui lòng gửi lại email.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📦</div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
          Theo dõi vận đơn
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          GHN · SPX · Tự động cập nhật
        </p>
      </div>

      <div
        className="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        {/* ── Loading ── */}
        {pageState === "loading" && (
          <div className="p-8 flex flex-col items-center gap-4">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: "rgba(37,99,235,0.2)",
                borderTopColor: "var(--color-accent-blue)",
              }}
            />
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Đang xác thực link...
            </p>
          </div>
        )}

        {/* ── Invalid / Expired ── */}
        {pageState === "invalid" && (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-3">⏱</div>
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--color-primary)" }}>
                Link đã hết hạn
              </h2>
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                Link đặt lại mật khẩu chỉ có hiệu lực trong vòng 1 giờ.
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}
            >
              Gửi lại email đặt lại mật khẩu
            </button>
          </div>
        )}

        {/* ── Form đặt mật khẩu mới ── */}
        {pageState === "form" && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
                🔑 Đặt mật khẩu mới
              </h2>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                Nhập mật khẩu mới cho tài khoản của bạn.
              </p>
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--color-muted)" }}
              >
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm transition-colors focus:outline-none"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg transition-colors hover:opacity-70"
                  style={{ color: "var(--color-muted)" }}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--color-muted)" }}
              >
                Xác nhận mật khẩu mới
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full rounded-xl px-4 py-2.5 text-sm transition-colors focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Strength hint */}
            {newPassword.length > 0 && (
              <div className="flex items-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      background:
                        newPassword.length >= 6 && i === 0
                          ? "var(--color-accent-green)"
                          : newPassword.length >= 10 && i === 1
                          ? "var(--color-accent-blue)"
                          : newPassword.length >= 14 && i === 2
                          ? "var(--color-shopee)"
                          : "var(--color-border)",
                    }}
                  />
                ))}
                <span className="text-xs shrink-0" style={{ color: "var(--color-muted)" }}>
                  {newPassword.length < 6
                    ? "Quá ngắn"
                    : newPassword.length < 10
                    ? "Đủ dùng"
                    : newPassword.length < 14
                    ? "Tốt"
                    : "Mạnh"}
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.25)",
                  color: "var(--color-accent-red)",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu mật khẩu mới"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full py-2 text-sm transition-colors hover:opacity-70"
              style={{ color: "var(--color-muted)" }}
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        )}

        {/* ── Thành công ── */}
        {pageState === "success" && (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--color-primary)" }}>
                Đổi mật khẩu thành công!
              </h2>
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                Mật khẩu mới đã được lưu. Bạn có thể đăng nhập ngay bây giờ.
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}
            >
              Về trang chính →
            </button>
          </div>
        )}
      </div>

      <p className="text-xs mt-6 text-center" style={{ color: "var(--color-border)" }}>
        📦 Theo dõi vận đơn · GHN + SPX · Miễn phí
      </p>
    </div>
  );
}
