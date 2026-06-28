"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const sb = getSupabaseBrowser();

    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();

      } else if (mode === "register") {
        if (password !== confirmPassword) throw new Error("Mật khẩu xác nhận không khớp");
        if (password.length < 6) throw new Error("Mật khẩu phải ít nhất 6 ký tự");

        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;

        // Nếu confirm email đã tắt → session có sẵn, redirect luôn
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          // Confirm email còn bật → báo user check email
          setSuccess("✅ Đăng ký thành công! Kiểm tra email để xác nhận tài khoản rồi đăng nhập.");
          setMode("login");
        }

      } else if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setSuccess("✅ Đã gửi link đặt lại mật khẩu vào email của bạn.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Invalid login credentials")) setError("Email hoặc mật khẩu không đúng");
      else if (msg.includes("Email not confirmed")) setError("Email chưa được xác nhận. Kiểm tra hộp thư của bạn.");
      else if (msg.includes("User already registered")) setError("Email này đã được đăng ký. Hãy đăng nhập.");
      else if (msg.includes("Password should be")) setError("Mật khẩu phải ít nhất 6 ký tự");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: "Đăng nhập",
    register: "Tạo tài khoản",
    forgot: "Quên mật khẩu",
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📦</div>
        <h1 className="text-2xl font-bold text-white">Theo dõi vận đơn</h1>
        <p className="text-slate-400 text-sm mt-1">GHN · SPX · Tự động cập nhật</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Tab bar */}
        {mode !== "forgot" && (
          <div className="flex border-b border-slate-700">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  mode === m
                    ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-base font-bold text-white">{titles[mode]}</h2>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-sm transition-colors"
            />
          </div>

          {/* Password */}
          {mode !== "forgot" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-sm transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-lg"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
          )}

          {/* Confirm password */}
          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Xác nhận mật khẩu</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-sm transition-colors"
              />
            </div>
          )}

          {/* Forgot password link */}
          {mode === "login" && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          {/* Error / Success */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : titles[mode]}
          </button>

          {/* Back to login */}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className="w-full py-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              ← Quay lại đăng nhập
            </button>
          )}
        </form>
      </div>

      <p className="text-xs text-slate-600 mt-6 text-center">
        📦 Theo dõi vận đơn · GHN + SPX · Miễn phí
      </p>
    </div>
  );
}
