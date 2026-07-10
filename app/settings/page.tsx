"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Tracking } from "@/types";

interface PersonalStats {
  totalEver: number;
  avgDeliveryDays: number | null;
  fastestDays: number | null;
  totalDelivered: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setStatsLoading(true);
    fetch(`/api/trackings?user_id=${user.id}&include_archived=true`)
      .then(r => r.json())
      .then(data => {
        const all: Tracking[] = data.trackings || [];
        const delivered = all.filter(t =>
          t.is_delivered && t.created_at && t.last_checked_at
        );
        const days = delivered
          .map(t => Math.floor(
            (new Date(t.last_checked_at!).getTime() - new Date(t.created_at).getTime()) / 86400000
          ))
          .filter(d => d >= 0 && d <= 60);

        setPersonalStats({
          totalEver: all.length,
          avgDeliveryDays: days.length > 0
            ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
            : null,
          fastestDays: days.length > 0 ? Math.min(...days) : null,
          totalDelivered: delivered.length,
        });
      })
      .catch(() => setPersonalStats(null))
      .finally(() => setStatsLoading(false));
  }, [user?.id]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    const sb = getSupabaseBrowser();

    try {
      const { error: signInError } = await sb.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });
      if (signInError) throw new Error("Mật khẩu hiện tại không đúng");

      const { error: updateError } = await sb.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setSuccess("✅ Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const inputStyle = {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  const cardStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    boxShadow: "var(--shadow-card)",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 glass"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {/* Shopee accent bar */}
        <div style={{ background: "linear-gradient(90deg, var(--color-shopee), #FF6633)", height: "3px" }} />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
            style={{ color: "var(--color-muted)", background: "var(--color-border)" }}
            aria-label="Quay lại"
          >
            ←
          </button>
          <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Cài đặt tài khoản</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Account info */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white"
              style={{ background: "var(--color-accent-blue)" }}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>{user?.email}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                Tham gia {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("vi-VN")
                  : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Personal stats */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>📊 Thống kê của bạn</h2>
          </div>
          {statsLoading ? (
            <div className="p-5 grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl p-3 text-center space-y-2" style={{ background: "var(--color-bg)" }}>
                  <div className="skeleton h-8 w-12 mx-auto rounded" />
                  <div className="skeleton h-3 w-16 mx-auto rounded" />
                </div>
              ))}
            </div>
          ) : personalStats ? (
            <>
              <div className="p-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: "var(--color-bg)" }}>
                  <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{personalStats.totalEver}</div>
                  <div className="text-xs mt-0.5 leading-tight" style={{ color: "var(--color-muted)" }}>đơn đã theo dõi</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "var(--color-bg)" }}>
                  <div className="text-2xl font-bold" style={{ color: "var(--color-accent-blue)" }}>
                    {personalStats.avgDeliveryDays !== null ? personalStats.avgDeliveryDays : "—"}
                  </div>
                  <div className="text-xs mt-0.5 leading-tight" style={{ color: "var(--color-muted)" }}>ngày TB giao</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "var(--color-bg)" }}>
                  <div className="text-2xl font-bold" style={{ color: "var(--color-accent-green)" }}>
                    {personalStats.fastestDays !== null ? personalStats.fastestDays : "—"}
                  </div>
                  <div className="text-xs mt-0.5 leading-tight" style={{ color: "var(--color-muted)" }}>ngày nhanh nhất</div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.12)" }}
                >
                  {personalStats.totalDelivered > 0 ? (
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-secondary)" }}>
                      Bạn đã nhận thành công{" "}
                      <span className="font-semibold" style={{ color: "var(--color-primary)" }}>{personalStats.totalDelivered} đơn</span>
                      {personalStats.avgDeliveryDays !== null && (
                        <>
                          {", trung bình "}
                          <span className="font-semibold" style={{ color: "var(--color-accent-blue)" }}>{personalStats.avgDeliveryDays} ngày</span>
                          {" mỗi đơn"}
                        </>
                      )}
                      {personalStats.fastestDays !== null && personalStats.fastestDays === 0 && (
                        <span style={{ color: "var(--color-accent-green)" }}> · Có đơn giao cùng ngày! 🚀</span>
                      )}
                      .
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                      Chưa có đơn nào được giao thành công. Dữ liệu sẽ hiện khi có đơn hoàn thành.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-5 text-center text-xs" style={{ color: "var(--color-muted)" }}>
              Không thể tải thống kê
            </div>
          )}
        </div>

        {/* Change password */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>🔑 Đổi mật khẩu</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--color-accent-red)" }}
              >
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.25)", color: "var(--color-accent-green)" }}
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Lưu mật khẩu mới"}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>⚠️ Vùng nguy hiểm</h2>
          </div>
          <div className="p-5">
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
              style={{
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.2)",
                color: "var(--color-accent-red)",
              }}
            >
              🚪 Đăng xuất khỏi tài khoản
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
