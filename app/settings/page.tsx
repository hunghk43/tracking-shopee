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

  // Fetch thống kê cá nhân từ toàn bộ lịch sử (kể cả archived)
  useEffect(() => {
    if (!user?.id) {
      // Auth chưa load xong, không set false vội
      return;
    }
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
      // Verify mật khẩu hiện tại bằng cách re-authenticate
      const { error: signInError } = await sb.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });
      if (signInError) throw new Error("Mật khẩu hiện tại không đúng");

      // Đổi mật khẩu
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

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700"
          >
            ←
          </button>
          <h1 className="text-base font-bold text-white">Cài đặt tài khoản</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Account info */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{user?.email}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Tham gia {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("vi-VN")
                  : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Personal stats */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-white">📊 Thống kê của bạn</h2>
          </div>
          {statsLoading ? (
            <div className="p-5 grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-900/60 rounded-xl p-3 text-center space-y-2">
                  <div className="skeleton h-8 w-12 mx-auto rounded" />
                  <div className="skeleton h-3 w-16 mx-auto rounded" />
                </div>
              ))}
            </div>
          ) : personalStats ? (
            <>
              <div className="p-5 grid grid-cols-3 gap-3">
                {/* Tổng đơn đã theo dõi */}
                <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">{personalStats.totalEver}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-tight">đơn đã theo dõi</div>
                </div>
                {/* Trung bình ngày giao */}
                <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {personalStats.avgDeliveryDays !== null ? personalStats.avgDeliveryDays : "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-tight">ngày TB giao</div>
                </div>
                {/* Nhanh nhất */}
                <div className="bg-slate-900/60 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {personalStats.fastestDays !== null ? personalStats.fastestDays : "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-tight">ngày nhanh nhất</div>
                </div>
              </div>

              {/* Dòng tóm tắt */}
              <div className="px-5 pb-5">
                <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3">
                  {personalStats.totalDelivered > 0 ? (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Bạn đã nhận thành công{" "}
                      <span className="text-white font-semibold">{personalStats.totalDelivered} đơn</span>
                      {personalStats.avgDeliveryDays !== null && (
                        <>
                          {", trung bình "}
                          <span className="text-blue-400 font-semibold">{personalStats.avgDeliveryDays} ngày</span>
                          {" mỗi đơn"}
                        </>
                      )}
                      {personalStats.fastestDays !== null && personalStats.fastestDays === 0 && (
                        <span className="text-green-400"> · Có đơn giao cùng ngày! 🚀</span>
                      )}
                      .
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Chưa có đơn nào được giao thành công. Dữ liệu sẽ hiện khi có đơn hoàn thành.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-5 text-center text-xs text-slate-500">
              Không thể tải thống kê
            </div>
          )}
        </div>

        {/* Change password */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-white">🔑 Đổi mật khẩu</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Lưu mật khẩu mới"}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-white">⚠️ Vùng nguy hiểm</h2>
          </div>
          <div className="p-5">
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-sm transition-all"
            >
              🚪 Đăng xuất khỏi tài khoản
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
