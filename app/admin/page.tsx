"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Tracking, TrackingStats } from "@/types";
import { carrierDisplay } from "@/lib/tracker";
import StatusBadge from "@/components/StatusBadge";

/* ── Types ─────────────────────────────────────────────────── */

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  trackings_active: number;
  trackings_total: number;
  stats: TrackingStats;
  last_tracking_active: string | null;
  trackings: Tracking[];
  // Presence
  is_online: boolean;
  last_seen: string | null;
  seconds_ago: number | null;
}

/* ── Helpers ───────────────────────────────────────────────── */

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d trước`;
  return fmt(iso);
}

function presenceLabel(u: UserRow): { text: string; color: string; bg: string } {
  if (u.is_online) return { text: "🟢 Online", color: "var(--color-accent-green)", bg: "rgba(22,163,74,0.08)" };
  if (u.seconds_ago === null) return { text: "Chưa hoạt động", color: "var(--color-muted)", bg: "var(--color-border)" };
  const mins = Math.floor(u.seconds_ago / 60);
  if (mins < 60) return { text: `${mins}p trước`, color: "var(--color-accent-yellow)", bg: "rgba(217,119,6,0.08)" };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { text: `${hrs}h trước`, color: "var(--color-muted)", bg: "var(--color-border)" };
  return { text: relTime(u.last_seen), color: "var(--color-muted)", bg: "var(--color-border)" };
}

/* ── StatPill ──────────────────────────────────────────────── */

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {value} {label}
    </span>
  );
}

/* ── OnlineBadge ───────────────────────────────────────────── */

function OnlineBadge({ user }: { user: UserRow }) {
  const p = presenceLabel(user);
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}30` }}
      title={user.last_seen ? `Last seen: ${fmt(user.last_seen)}` : "Chưa có dữ liệu presence"}
    >
      {p.text}
    </span>
  );
}

/* ── TrackingRow ───────────────────────────────────────────── */

function TrackingRow({ t }: { t: Tracking }) {
  const [copied, setCopied] = useState(false);

  return (
    <tr
      className="border-b transition-colors hover:bg-[rgba(0,0,0,0.02)]"
      style={{ borderColor: "var(--color-border)", opacity: t.is_archived ? 0.5 : 1 }}
    >
      <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--color-muted)" }}>
        #{t.display_id}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { navigator.clipboard.writeText(t.tracking_code); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
            className="font-mono text-xs hover:underline"
            style={{ color: "var(--color-accent-blue)" }}
            title="Click để copy"
          >
            {t.tracking_code}
          </button>
          {copied && <span className="text-[10px] font-medium" style={{ color: "var(--color-accent-green)" }}>✓</span>}
        </div>
        {t.nickname && <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>📝 {t.nickname}</div>}
      </td>
      <td className="px-3 py-2">
        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: t.carrier === "ghn" ? "#FEE2E2" : "#FEF3C7", color: t.carrier === "ghn" ? "#B91C1C" : "#B45309" }}>
          {carrierDisplay(t.carrier)}
        </span>
      </td>
      <td className="px-3 py-2"><StatusBadge tracking={t} size="sm" /></td>
      <td className="px-3 py-2 max-w-[200px]">
        {t.last_status
          ? <span className="text-xs line-clamp-2" style={{ color: "var(--color-secondary)" }}>{t.last_status}</span>
          : <span className="text-xs italic" style={{ color: "var(--color-muted)" }}>Chưa tra cứu</span>}
      </td>
      <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: "var(--color-muted)" }}>{t.last_status_time || "—"}</td>
      <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: "var(--color-muted)" }}>{relTime(t.last_checked_at)}</td>
      <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: "var(--color-muted)" }}>{fmtDate(t.created_at)}</td>
      <td className="px-3 py-2 text-center">
        {t.is_archived && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-muted)" }}>archived</span>
        )}
      </td>
    </tr>
  );
}

/* ── UserCard ──────────────────────────────────────────────── */

function UserCard({ user }: { user: UserRow }) {
  const [expanded, setExpanded] = useState(false);
  const [filterCarrier, setFilterCarrier] = useState<"all" | "ghn" | "spx">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("active");
  const [searchCode, setSearchCode] = useState("");

  const filteredTrackings = useMemo(() => {
    return user.trackings.filter((t) => {
      if (filterCarrier !== "all" && t.carrier !== filterCarrier) return false;
      if (filterStatus === "active" && t.is_archived) return false;
      if (filterStatus === "archived" && !t.is_archived) return false;
      if (searchCode) {
        const q = searchCode.toLowerCase();
        if (!t.tracking_code.toLowerCase().includes(q) && !(t.nickname || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [user.trackings, filterCarrier, filterStatus, searchCode]);

  const daysSinceSignup = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: "var(--color-surface)", border: `1.5px solid ${user.is_online ? "rgba(22,163,74,0.35)" : "var(--color-border)"}`, boxShadow: user.is_online ? "0 0 0 3px rgba(22,163,74,0.08)" : "var(--shadow-card)" }}>

      <button className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left hover:opacity-90 transition-opacity" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with online ring */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white"
              style={{ background: user.is_online ? "var(--color-accent-green)" : "var(--color-accent-blue)" }}>
              {user.email.charAt(0).toUpperCase()}
            </div>
            {user.is_online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 pulse-dot"
                style={{ background: "var(--color-accent-green)", borderColor: "var(--color-surface)" }} />
            )}
          </div>

          <div className="min-w-0">
            <div className="font-semibold text-sm truncate flex items-center gap-2" style={{ color: "var(--color-primary)" }}>
              {user.email}
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
              <span style={{ color: "var(--color-muted)" }}>Tham gia {fmtDate(user.created_at)} · {daysSinceSignup}d</span>
              {user.last_sign_in_at && (
                <span style={{ color: "var(--color-muted)" }}>· Đăng nhập: {relTime(user.last_sign_in_at)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
          <OnlineBadge user={user} />
          <StatPill label="theo dõi" value={user.trackings_active} color="var(--color-accent-blue)" />
          <StatPill label="đã giao" value={user.stats.delivered} color="var(--color-accent-green)" />
          <StatPill label="đang VC" value={user.stats.in_transit} color="#2563EB" />
          <StatPill label="hủy/hoàn" value={user.stats.cancelled + user.stats.returned} color="var(--color-accent-red)" />
          {user.trackings_total > user.trackings_active && (
            <StatPill label="archived" value={user.trackings_total - user.trackings_active} color="var(--color-muted)" />
          )}
          <span className="text-xs ml-1" style={{ color: expanded ? "var(--color-accent-blue)" : "var(--color-muted)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--color-border)" }}>
          {/* Filter bar */}
          <div className="flex items-center gap-2 px-5 py-3 flex-wrap"
            style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
            <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
              {filteredTrackings.length}/{user.trackings.length} đơn
            </span>
            <input type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Tìm mã / ghi chú..." className="rounded-lg px-2.5 py-1 text-xs focus:outline-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary)", width: "160px" }} />
            <div className="flex gap-1">
              {(["all", "ghn", "spx"] as const).map((c) => (
                <button key={c} onClick={() => setFilterCarrier(c)} className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                  style={{ background: filterCarrier === c ? "var(--color-accent-blue)" : "var(--color-surface)", color: filterCarrier === c ? "#fff" : "var(--color-secondary)", border: `1px solid ${filterCarrier === c ? "var(--color-accent-blue)" : "var(--color-border)"}` }}>
                  {c === "all" ? "Tất cả" : c.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["active", "archived", "all"] as const).map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)} className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                  style={{ background: filterStatus === s ? "var(--color-secondary)" : "var(--color-surface)", color: filterStatus === s ? "#fff" : "var(--color-secondary)", border: `1px solid ${filterStatus === s ? "var(--color-secondary)" : "var(--color-border)"}` }}>
                  {s === "active" ? "Đang theo dõi" : s === "archived" ? "Archived" : "Tất cả"}
                </button>
              ))}
            </div>
          </div>

          {filteredTrackings.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>Không có đơn nào</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
                    {["#", "Mã vận đơn", "Hãng", "Trạng thái", "Mô tả", "Thời gian", "Tra lần cuối", "Ngày thêm", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTrackings.map((t) => <TrackingRow key={t.id} t={t} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Admin Page ───────────────────────────────────────── */

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [inputSecret, setInputSecret] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const globalStats = useMemo(() => ({
    totalUsers: users.length,
    totalTrackings: users.reduce((a, u) => a + u.trackings_total, 0),
    totalActive: users.reduce((a, u) => a + u.trackings_active, 0),
    totalDelivered: users.reduce((a, u) => a + u.stats.delivered, 0),
    totalInTransit: users.reduce((a, u) => a + u.stats.in_transit, 0),
  }), [users]);

  const fetchData = useCallback(async (s: string, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users?secret=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Lỗi không xác định"); return; }
      setUsers(data.users);
      setOnlineCount(data.online_count ?? 0);
      setSecret(s);
      setLastFetched(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Auto-refresh mỗi 30s khi admin đang xem
  useEffect(() => {
    if (!secret || !autoRefresh) return;
    const t = setInterval(() => fetchData(secret, true), 30_000);
    return () => clearInterval(t);
  }, [secret, autoRefresh, fetchData]);

  // Login screen
  if (!secret) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--color-bg)" }}>
        <div className="w-full max-w-sm rounded-2xl p-8 shadow-xl"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>Admin Dashboard</h1>
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>Nhập secret để truy cập</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (inputSecret) fetchData(inputSecret); }} className="space-y-3">
            <input type="password" value={inputSecret} onChange={(e) => setInputSecret(e.target.value)}
              placeholder="Admin secret..." autoFocus
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-primary)" }} />
            {error && <p className="text-xs" style={{ color: "var(--color-accent-red)" }}>⚠️ {error}</p>}
            <button type="submit" disabled={loading || !inputSecret}
              className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}>
              {loading ? "Đang xác thực..." : "Truy cập →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 glass" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ background: "linear-gradient(90deg, var(--color-shopee), #FF6633)", height: "3px" }} />
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🔐</span>
            <span className="font-bold text-sm" style={{ color: "var(--color-primary)" }}>Admin Dashboard</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(234,88,12,0.1)", color: "var(--color-shopee)", border: "1px solid rgba(234,88,12,0.2)" }}>
              {globalStats.totalUsers} users
            </span>
            {/* Online count badge */}
            {onlineCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                style={{ background: "rgba(22,163,74,0.1)", color: "var(--color-accent-green)", border: "1px solid rgba(22,163,74,0.25)" }}>
                <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ background: "var(--color-accent-green)" }} />
                {onlineCount} online
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastFetched && (
              <span className="text-xs hidden sm:inline" style={{ color: "var(--color-muted)" }}>
                {lastFetched.toLocaleTimeString("vi-VN")}
              </span>
            )}
            {/* Auto-refresh toggle */}
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: autoRefresh ? "rgba(22,163,74,0.08)" : "var(--color-surface)", color: autoRefresh ? "var(--color-accent-green)" : "var(--color-muted)", border: `1px solid ${autoRefresh ? "rgba(22,163,74,0.25)" : "var(--color-border)"}` }}
              title="Tự động cập nhật mỗi 30s">
              {autoRefresh ? "⏱ Auto" : "⏱ Off"}
            </button>
            <button onClick={() => fetchData(secret)} disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}>
              {loading ? "..." : "🔄 Làm mới"}
            </button>
            <button onClick={() => { setSecret(""); setUsers([]); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--color-accent-red)" }}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Global stats */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[
            { label: "Online ngay", value: onlineCount, color: "var(--color-accent-green)", icon: "🟢" },
            { label: "Tổng users", value: globalStats.totalUsers, color: "var(--color-primary)", icon: "👥" },
            { label: "Tổng đơn ever", value: globalStats.totalTrackings, color: "var(--color-secondary)", icon: "📦" },
            { label: "Đang theo dõi", value: globalStats.totalActive, color: "var(--color-accent-blue)", icon: "🔍" },
            { label: "Đang vận chuyển", value: globalStats.totalInTransit, color: "#2563EB", icon: "🚚" },
            { label: "Đã giao", value: globalStats.totalDelivered, color: "var(--color-accent-green)", icon: "✅" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
              <div className="text-lg mb-1">{s.icon}</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* User list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold px-1" style={{ color: "var(--color-secondary)" }}>
            Chi tiết theo người dùng — 🟢 viền xanh = đang online
          </h2>
          {loading && users.length === 0 ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="rounded-2xl h-20 skeleton" />)}</div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>Không có dữ liệu</p>
            </div>
          ) : (
            users.map((u) => <UserCard key={u.id} user={u} />)
          )}
        </div>
      </main>
    </div>
  );
}
