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

        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
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

  const inputStyle = {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "var(--color-bg)" }}>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📦</div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>Theo dõi vận đơn</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>GHN · SPX · Tự động cập nhật</p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }}
      >
        {/* Tab bar */}
        {mode !== "forgot" && (
          <div className="flex" style={{ borderBottom: "1px solid var(--color-border)" }}>
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className="flex-1 py-3.5 text-sm font-semibold transition-colors"
                style={{
                  color: mode === m ? "var(--color-accent-blue)" : "var(--color-muted)",
                  borderBottom: mode === m ? "2px solid var(--color-accent-blue)" : "2px solid transparent",
                  background: mode === m ? "rgba(37,99,235,0.04)" : "transparent",
                }}
              >
                {m === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>{titles[mode]}</h2>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              className="w-full rounded-xl px-4 py-2.5 text-sm transition-colors focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          {mode !== "forgot" && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm transition-colors focus:outline-none"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg transition-colors hover:opacity-70"
                  style={{ color: "var(--color-muted)" }}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
          )}

          {/* Confirm password */}
          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>Xác nhận mật khẩu</label>
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
          )}

          {/* Forgot password link */}
          {mode === "login" && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                className="text-xs transition-colors hover:opacity-70"
                style={{ color: "var(--color-muted)" }}
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          {/* Error / Success */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
            style={{ background: "var(--color-accent-blue)", color: "#fff" }}
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
              className="w-full py-2 text-sm transition-colors hover:opacity-70"
              style={{ color: "var(--color-muted)" }}
            >
              ← Quay lại đăng nhập
            </button>
          )}
        </form>
      </div>

      <p className="text-xs mt-6 text-center" style={{ color: "var(--color-border)" }}>
        📦 Theo dõi vận đơn · GHN + SPX · Miễn phí
      </p>
    </div>
  );
}
