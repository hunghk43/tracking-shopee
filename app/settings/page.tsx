"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Tracking } from "@/types";

/* ── Types ──────────────────────────────────────────────────── */
interface PersonalStats {
  totalEver: number;
  active: number;
  delivered: number;
  cancelled: number;
  returned: number;
  inTransit: number;
  ghn: number;
  spx: number;
  ghnDelivered: number;
  spxDelivered: number;
  avgDeliveryDays: number | null;
  fastestDays: number | null;
  slowestDays: number | null;
  deliveryBuckets: number[]; // [0d, 1d, 2d, 3d, 4d, 5d, 6-10d, 11+d]
  monthlyAdded: { label: string; count: number }[];
}

/* ── Helpers ────────────────────────────────────────────────── */

/**
 * Parse last_status_time từ DB — có thể là:
 * 1. ISO string: "2026-08-15T10:30:00.000Z"
 * 2. Format VN từ fmtIso/fmtTimestamp: "10:30 15/08/2026"
 * 3. Chuỗi khác không parse được → trả null
 */
function parseStatusTime(raw: string | null | undefined): Date | null {
  if (!raw) return null;

  // Thử ISO trước
  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso;

  // Thử format "HH:mm DD/MM/YYYY" (output của fmtIso/fmtTimestamp)
  const m = raw.match(/^(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, hh, mm, dd, mo, yyyy] = m;
    // Tạo Date theo múi giờ UTC+7 (VN)
    const utc = Date.UTC(+yyyy, +mo - 1, +dd, +hh - 7, +mm);
    const d = new Date(utc);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function calcStats(all: Tracking[]): PersonalStats {
  const active = all.filter(t => !t.is_archived);
  const delivered = all.filter(t => t.is_delivered ||
    (t.last_status || "").toLowerCase().includes("giao hàng thành công") ||
    (t.last_status || "").toLowerCase().includes("delivered"));
  const cancelled = all.filter(t => {
    const s = (t.last_status || "").toLowerCase();
    return s.includes("huỷ") || s.includes("hủy") || s.includes("cancel");
  });
  const returned = all.filter(t => {
    const s = (t.last_status || "").toLowerCase();
    return s.includes("hoàn") || s.includes("trả về") || s.includes("return");
  });
  const inTransit = active.filter(t => {
    const s = (t.last_status || "").toLowerCase();
    return !!s && !t.is_delivered &&
      !s.includes("giao hàng thành công") && !s.includes("delivered") &&
      !s.includes("huỷ") && !s.includes("hủy") && !s.includes("cancel") &&
      !s.includes("hoàn") && !s.includes("trả về") && !s.includes("return");
  });

  const ghn = all.filter(t => t.carrier === "ghn");
  const spx = all.filter(t => t.carrier === "spx");
  const ghnDelivered = delivered.filter(t => t.carrier === "ghn").length;
  const spxDelivered = delivered.filter(t => t.carrier === "spx").length;

  // Tính số ngày giao: từ created_at đến last_status_time
  // last_status_time có thể là ISO hoặc "HH:mm DD/MM/YYYY" → dùng parseStatusTime
  const deliveryDays = delivered
    .filter(t => t.created_at)
    .map(t => {
      const endDate = parseStatusTime(t.last_status_time) ?? parseStatusTime(t.last_checked_at);
      if (!endDate) return -1;
      const days = Math.floor((endDate.getTime() - new Date(t.created_at).getTime()) / 86400000);
      return days;
    })
    .filter(d => d >= 0 && d <= 60);

  const avgDeliveryDays = deliveryDays.length > 0
    ? Math.round(deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length)
    : null;
  const fastestDays = deliveryDays.length > 0 ? Math.min(...deliveryDays) : null;
  const slowestDays = deliveryDays.length > 0 ? Math.max(...deliveryDays) : null;

  // Phân bố ngày giao: [0, 1, 2, 3, 4, 5, 6-10, 11+]
  const deliveryBuckets = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const d of deliveryDays) {
    if (d <= 5) deliveryBuckets[d]++;
    else if (d <= 10) deliveryBuckets[6]++;
    else deliveryBuckets[7]++;
  }

  // Số đơn thêm theo tháng (6 tháng gần nhất)
  const now = new Date();
  const monthlyAdded: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });
    const count = all.filter(t => {
      const td = new Date(t.created_at);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    }).length;
    monthlyAdded.push({ label, count });
  }

  return {
    totalEver: all.length,
    active: active.length,
    delivered: delivered.length,
    cancelled: cancelled.length,
    returned: returned.length,
    inTransit: inTransit.length,
    ghn: ghn.length,
    spx: spx.length,
    ghnDelivered,
    spxDelivered,
    avgDeliveryDays,
    fastestDays,
    slowestDays,
    deliveryBuckets,
    monthlyAdded,
  };
}

/* ── Donut Chart ─────────────────────────────────────────────── */
function DonutChart({ segments, size = 96 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="rounded-full" style={{
          width: size, height: size,
          background: "var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>—</span>
        </div>
      </div>
    );
  }

  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const paths = segments.map((seg, i) => {
    const pct = seg.value / total;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotation = offset * 360 - 90;
    offset += pct;
    return (
      <circle
        key={i}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={size / 8}
        strokeDasharray={dashArray}
        strokeDashoffset={0}
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "stroke-dasharray 0.6s ease" }}
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={size / 8} />
      {paths}
    </svg>
  );
}

/* ── Bar Chart ───────────────────────────────────────────────── */
function BarChart({ bars, color = "var(--color-accent-blue)" }: {
  bars: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {bars.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs font-medium tabular-nums" style={{ color: "var(--color-muted)", fontSize: "10px" }}>
            {b.value > 0 ? b.value : ""}
          </span>
          <div
            className="w-full rounded-t-md transition-all duration-700"
            style={{
              height: `${Math.max(3, (b.value / max) * 56)}px`,
              background: b.value > 0 ? color : "var(--color-border)",
              minHeight: "3px",
            }}
          />
          <span className="text-center leading-none" style={{ color: "var(--color-muted)", fontSize: "9px" }}>
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────────── */
function StatCard({ value, label, color, sub }: {
  value: string | number;
  label: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "var(--color-bg)" }}>
      <div className="text-2xl font-bold tabular-nums" style={{ color: color || "var(--color-primary)" }}>
        {value}
      </div>
      <div className="text-xs mt-0.5 leading-tight" style={{ color: "var(--color-muted)" }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)", opacity: 0.6 }}>{sub}</div>}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
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
        setPersonalStats(calcStats(all));
      })
      .catch(() => setPersonalStats(null))
      .finally(() => setStatsLoading(false));
  }, [user?.id]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (newPassword !== confirmPassword) { setError("Mật khẩu xác nhận không khớp"); return; }
    if (newPassword.length < 6) { setError("Mật khẩu mới phải ít nhất 6 ký tự"); return; }
    setLoading(true);
    const sb = getSupabaseBrowser();
    try {
      const { error: signInError } = await sb.auth.signInWithPassword({ email: user?.email || "", password: currentPassword });
      if (signInError) throw new Error("Mật khẩu hiện tại không đúng");
      const { error: updateError } = await sb.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess("✅ Đổi mật khẩu thành công!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }

  async function handleSignOut() { await signOut(); router.push("/login"); }

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

  const s = personalStats;
  const deliveryRate = s && s.totalEver > 0 ? Math.round((s.delivered / s.totalEver) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 glass" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ background: "linear-gradient(90deg, var(--color-shopee), #FF6633)", height: "3px" }} />
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/")}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
            style={{ color: "var(--color-muted)", background: "var(--color-border)" }} aria-label="Quay lại">
            ←
          </button>
          <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Cài đặt tài khoản</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Account info */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white"
              style={{ background: "var(--color-accent-blue)" }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>{user?.email}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                Tham gia {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>📊 Thống kê của bạn</h2>
            {s && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(37,99,235,0.08)", color: "var(--color-accent-blue)" }}>
                {s.totalEver} đơn tổng
              </span>
            )}
          </div>

          {statsLoading ? (
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
              <div className="skeleton h-28 rounded-xl" />
            </div>
          ) : s ? (
            <div className="p-4 space-y-4">

              {/* Row 1: 4 số chính */}
              <div className="grid grid-cols-4 gap-2">
                <StatCard value={s.active} label="Đang theo dõi" color="var(--color-primary)" />
                <StatCard value={s.delivered} label="Đã giao" color="var(--color-accent-green)" sub={`${deliveryRate}%`} />
                <StatCard value={s.cancelled} label="Đã hủy" color="var(--color-accent-red)" />
                <StatCard value={s.returned} label="Hoàn hàng" color="var(--color-accent-orange)" />
              </div>

              {/* Row 2: Donut + tóm tắt */}
              <div className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="shrink-0">
                  <DonutChart size={88} segments={[
                    { value: s.delivered, color: "#22c55e", label: "Đã giao" },
                    { value: s.inTransit, color: "#3b82f6", label: "Đang VC" },
                    { value: s.cancelled, color: "#ef4444", label: "Hủy" },
                    { value: s.returned, color: "#f97316", label: "Hoàn" },
                  ]} />
                </div>
                <div className="flex-1 space-y-1.5">
                  {[
                    { label: "Đang vận chuyển", value: s.inTransit, color: "#3b82f6" },
                    { label: "Đã giao thành công", value: s.delivered, color: "#22c55e" },
                    { label: "Đã hủy", value: s.cancelled, color: "#ef4444" },
                    { label: "Hoàn hàng", value: s.returned, color: "#f97316" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                      <span className="text-xs flex-1" style={{ color: "var(--color-secondary)" }}>{row.label}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-primary)" }}>{row.value}</span>
                      <span className="text-xs tabular-nums" style={{ color: "var(--color-muted)", minWidth: "32px", textAlign: "right" }}>
                        {s.totalEver > 0 ? `${Math.round(row.value / s.totalEver * 100)}%` : "0%"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Carrier breakdown */}
              <div className="grid grid-cols-2 gap-2">
                {/* GHN */}
                <div className="rounded-xl p-3.5" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "#FEE2E2", color: "#B91C1C" }}>GHN</span>
                    <span className="text-xs tabular-nums font-bold" style={{ color: "var(--color-primary)" }}>{s.ghn}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                      <div className="h-full rounded-full" style={{
                        width: `${s.ghn > 0 ? Math.round(s.ghnDelivered / s.ghn * 100) : 0}%`,
                        background: "#22c55e", transition: "width 0.7s ease"
                      }} />
                    </div>
                    <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--color-muted)" }}>
                      {s.ghn > 0 ? Math.round(s.ghnDelivered / s.ghn * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {s.ghnDelivered}/{s.ghn} đã giao
                  </div>
                </div>
                {/* SPX */}
                <div className="rounded-xl p-3.5" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "#FEF3C7", color: "#B45309" }}>SPX</span>
                    <span className="text-xs tabular-nums font-bold" style={{ color: "var(--color-primary)" }}>{s.spx}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                      <div className="h-full rounded-full" style={{
                        width: `${s.spx > 0 ? Math.round(s.spxDelivered / s.spx * 100) : 0}%`,
                        background: "#22c55e", transition: "width 0.7s ease"
                      }} />
                    </div>
                    <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--color-muted)" }}>
                      {s.spx > 0 ? Math.round(s.spxDelivered / s.spx * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {s.spxDelivered}/{s.spx} đã giao
                  </div>
                </div>
              </div>

              {/* Row 4: Thời gian giao hàng */}
              {s.delivered > 0 && (
                <div className="rounded-xl p-4" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  <div className="text-xs font-semibold mb-3" style={{ color: "var(--color-secondary)" }}>
                    ⏱ Thời gian giao hàng
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: "var(--color-accent-blue)" }}>
                        {s.avgDeliveryDays !== null ? `${s.avgDeliveryDays}d` : "—"}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Trung bình</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: "var(--color-accent-green)" }}>
                        {s.fastestDays !== null ? `${s.fastestDays}d` : "—"}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Nhanh nhất</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: "var(--color-accent-orange)" }}>
                        {s.slowestDays !== null ? `${s.slowestDays}d` : "—"}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Chậm nhất</div>
                    </div>
                  </div>
                  {/* Phân bố ngày giao */}
                  <div className="text-xs mb-2" style={{ color: "var(--color-muted)" }}>Phân bố ngày nhận hàng</div>
                  <BarChart
                    color="var(--color-accent-blue)"
                    bars={[
                      { label: "0d", value: s.deliveryBuckets[0] },
                      { label: "1d", value: s.deliveryBuckets[1] },
                      { label: "2d", value: s.deliveryBuckets[2] },
                      { label: "3d", value: s.deliveryBuckets[3] },
                      { label: "4d", value: s.deliveryBuckets[4] },
                      { label: "5d", value: s.deliveryBuckets[5] },
                      { label: "6-10", value: s.deliveryBuckets[6] },
                      { label: "11+", value: s.deliveryBuckets[7] },
                    ]}
                  />
                </div>
              )}

              {/* Row 5: Hoạt động theo tháng */}
              <div className="rounded-xl p-4" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="text-xs font-semibold mb-3" style={{ color: "var(--color-secondary)" }}>
                  📅 Đơn thêm theo tháng (6 tháng gần nhất)
                </div>
                <BarChart
                  color="var(--color-shopee)"
                  bars={s.monthlyAdded.map(m => ({ label: m.label, value: m.count }))}
                />
              </div>

              {/* Row 6: Insight */}
              <div className="rounded-xl px-4 py-3"
                style={{ background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.12)" }}>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-secondary)" }}>
                  {s.delivered > 0 ? (
                    <>
                      Tỷ lệ giao thành công{" "}
                      <span className="font-semibold" style={{ color: "#22c55e" }}>{deliveryRate}%</span>
                      {s.avgDeliveryDays !== null && (
                        <> · TB <span className="font-semibold" style={{ color: "var(--color-accent-blue)" }}>{s.avgDeliveryDays} ngày</span>/đơn</>
                      )}
                      {s.fastestDays === 0 && <span style={{ color: "#22c55e" }}> · Có đơn giao cùng ngày! 🚀</span>}
                      {s.fastestDays !== null && s.fastestDays > 0 && s.fastestDays <= 1 && (
                        <span style={{ color: "#22c55e" }}> · Đơn nhanh nhất chỉ {s.fastestDays} ngày! ⚡</span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: "var(--color-muted)" }}>
                      Chưa có đơn nào được giao. Dữ liệu sẽ hiện sau khi có đơn hoàn thành.
                    </span>
                  )}
                </p>
              </div>
            </div>
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
            {[
              { label: "Mật khẩu hiện tại", val: currentPassword, set: setCurrentPassword },
              { label: "Mật khẩu mới", val: newPassword, set: setNewPassword },
              { label: "Xác nhận mật khẩu mới", val: confirmPassword, set: setConfirmPassword },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>{label}</label>
                <input type="password" value={val} onChange={e => set(e.target.value)} required minLength={label.includes("mới") ? 6 : undefined}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors" style={inputStyle} />
              </div>
            ))}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--color-accent-red)" }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.25)", color: "var(--color-accent-green)" }}>
                {success}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}>
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Lưu mật khẩu mới"}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>⚠️ Vùng nguy hiểm</h2>
          </div>
          <div className="p-5">
            <button onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
              style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--color-accent-red)" }}>
              🚪 Đăng xuất khỏi tài khoản
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
