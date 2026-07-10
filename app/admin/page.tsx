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
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
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

/* ── TrackingCard (mobile-friendly thay thế table row) ─────── */

function TrackingCard({ t }: { t: Tracking }) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        opacity: t.is_archived ? 0.55 : 1,
      }}
    >
      {/* Row 1: ID + carrier + status badge */}
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className="text-xs font-mono font-semibold" style={{ color: "var(--color-muted)" }}>
          #{t.display_id}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{
            background: t.carrier === "ghn" ? "#FEE2E2" : "#FEF3C7",
            color: t.carrier === "ghn" ? "#B91C1C" : "#B45309",
          }}
        >
          {carrierDisplay(t.carrier)}
        </span>
        <StatusBadge tracking={t} size="sm" />
        {t.is_archived && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-muted)" }}>
            archived
          </span>
        )}
      </div>

      {/* Row 2: tracking code + copy */}
      <div className="flex items-center gap-1.5 mb-1">
        <button
          onClick={() => {
            navigator.clipboard.writeText(t.tracking_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="font-mono text-xs hover:underline truncate"
          style={{ color: "var(--color-accent-blue)", maxWidth: "220px" }}
          title="Click để copy"
        >
          {t.tracking_code}
        </button>
        {copied && (
          <span className="text-[10px] font-medium shrink-0" style={{ color: "var(--color-accent-green)" }}>✓ Đã copy</span>
        )}
      </div>

      {/* Row 3: nickname */}
      {t.nickname && (
        <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>
          📝 {t.nickname}
        </div>
      )}

      {/* Row 4: last status */}
      {t.last_status && (
        <div className="text-xs mb-1 line-clamp-2" style={{ color: "var(--color-secondary)" }}>
          {t.last_status}
        </div>
      )}

      {/* Row 5: times */}
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {t.last_status_time && (
          <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
            🕐 {t.last_status_time}
          </span>
        )}
        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
          Tra: {relTime(t.last_checked_at)}
        </span>
        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
          Thêm: {fmtDate(t.created_at)}
        </span>
      </div>
    </div>
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
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--color-surface)",
        border: `1.5px solid ${user.is_online ? "rgba(22,163,74,0.35)" : "var(--color-border)"}`,
        boxShadow: user.is_online ? "0 0 0 3px rgba(22,163,74,0.08)" : "var(--shadow-card)",
      }}
    >
      {/* ── Card header (tap to expand) ── */}
      <button
        className="w-full px-4 py-3.5 flex items-start gap-3 text-left hover:opacity-90 transition-opacity"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div className="relative shrink-0 mt-0.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
            style={{ background: user.is_online ? "var(--color-accent-green)" : "var(--color-accent-blue)" }}
          >
            {user.email.charAt(0).toUpperCase()}
          </div>
          {user.is_online && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 pulse-dot"
              style={{ background: "var(--color-accent-green)", borderColor: "var(--color-surface)" }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Email + expand arrow */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-sm truncate" style={{ color: "var(--color-primary)" }}>
              {user.email}
            </span>
            <span className="text-xs shrink-0" style={{ color: "var(--color-muted)" }}>
              {expanded ? "▲" : "▼"}
            </span>
          </div>

          {/* Join date + last login */}
          <div className="text-xs mb-2" style={{ color: "var(--color-muted)" }}>
            Tham gia {fmtDate(user.created_at)} · {daysSinceSignup}d
            {user.last_sign_in_at && (
              <span> · Đăng nhập: {relTime(user.last_sign_in_at)}</span>
            )}
          </div>

          {/* Badges — wrap freely */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <OnlineBadge user={user} />
            <StatPill label="theo dõi" value={user.trackings_active} color="var(--color-accent-blue)" />
            <StatPill label="đã giao" value={user.stats.delivered} color="var(--color-accent-green)" />
            <StatPill label="đang VC" value={user.stats.in_transit} color="#2563EB" />
            <StatPill label="hủy/hoàn" value={user.stats.cancelled + user.stats.returned} color="var(--color-accent-red)" />
            {user.trackings_total > user.trackings_active && (
              <StatPill label="archived" value={user.trackings_total - user.trackings_active} color="var(--color-muted)" />
            )}
          </div>
        </div>
      </button>

      {/* ── Expanded: filter + tracking list ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--color-border)" }}>
          {/* Filter bar */}
          <div
            className="px-4 py-3 space-y-2"
            style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}
          >
            {/* Search + count */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium shrink-0" style={{ color: "var(--color-muted)" }}>
                {filteredTrackings.length}/{user.trackings.length} đơn
              </span>
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Tìm mã / ghi chú..."
                className="flex-1 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-primary)",
                  minWidth: 0,
                }}
              />
            </div>

            {/* Carrier filter */}
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "ghn", "spx"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setFilterCarrier(c)}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                  style={{
                    background: filterCarrier === c ? "var(--color-accent-blue)" : "var(--color-surface)",
                    color: filterCarrier === c ? "#fff" : "var(--color-secondary)",
                    border: `1px solid ${filterCarrier === c ? "var(--color-accent-blue)" : "var(--color-border)"}`,
                  }}
                >
                  {c === "all" ? "Tất cả" : c.toUpperCase()}
                </button>
              ))}
              {(["active", "archived", "all"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                  style={{
                    background: filterStatus === s ? "var(--color-secondary)" : "var(--color-surface)",
                    color: filterStatus === s ? "#fff" : "var(--color-secondary)",
                    border: `1px solid ${filterStatus === s ? "var(--color-secondary)" : "var(--color-border)"}`,
                  }}
                >
                  {s === "active" ? "Đang theo dõi" : s === "archived" ? "Archived" : "Tất cả"}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking list */}
          {filteredTrackings.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
              Không có đơn nào
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {filteredTrackings.map((t) => (
                <TrackingCard key={t.id} t={t} />
              ))}
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

  useEffect(() => {
    if (!secret || !autoRefresh) return;
    const t = setInterval(() => fetchData(secret, true), 30_000);
    return () => clearInterval(t);
  }, [secret, autoRefresh, fetchData]);

  /* ── Login screen ── */
  if (!secret) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--color-bg)" }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 shadow-xl"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }}
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>Admin Dashboard</h1>
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>Nhập secret để truy cập</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (inputSecret) fetchData(inputSecret); }} className="space-y-3">
            <input
              type="password"
              value={inputSecret}
              onChange={(e) => setInputSecret(e.target.value)}
              placeholder="Admin secret..."
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-primary)" }}
            />
            {error && <p className="text-xs" style={{ color: "var(--color-accent-red)" }}>⚠️ {error}</p>}
            <button
              type="submit"
              disabled={loading || !inputSecret}
              className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}
            >
              {loading ? "Đang xác thực..." : "Truy cập →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Dashboard ── */
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 glass" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ background: "linear-gradient(90deg, var(--color-shopee), #FF6633)", height: "3px" }} />
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          {/* Left: title + badges */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-lg shrink-0">🔐</span>
            <span className="font-bold text-sm shrink-0" style={{ color: "var(--color-primary)" }}>Admin</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ background: "rgba(234,88,12,0.1)", color: "var(--color-shopee)", border: "1px solid rgba(234,88,12,0.2)" }}
            >
              {globalStats.totalUsers} users
            </span>
            {onlineCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0"
                style={{ background: "rgba(22,163,74,0.1)", color: "var(--color-accent-green)", border: "1px solid rgba(22,163,74,0.25)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ background: "var(--color-accent-green)" }} />
                {onlineCount} online
              </span>
            )}
            {lastFetched && (
              <span className="text-xs hidden md:inline" style={{ color: "var(--color-muted)" }}>
                {lastFetched.toLocaleTimeString("vi-VN")}
              </span>
            )}
          </div>

          {/* Right: actions — compact on mobile */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: autoRefresh ? "rgba(22,163,74,0.08)" : "var(--color-surface)",
                color: autoRefresh ? "var(--color-accent-green)" : "var(--color-muted)",
                border: `1px solid ${autoRefresh ? "rgba(22,163,74,0.25)" : "var(--color-border)"}`,
              }}
              title="Tự động cập nhật mỗi 30s"
            >
              ⏱ {autoRefresh ? "Auto" : "Off"}
            </button>
            <button
              onClick={() => fetchData(secret)}
              disabled={loading}
              className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 flex items-center gap-1"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
            >
              🔄 <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={() => { setSecret(""); setUsers([]); }}
              className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--color-accent-red)" }}
            >
              <span className="hidden sm:inline">Đăng xuất</span>
              <span className="sm:hidden">✕</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Global stats: 2 cols on mobile, 6 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {[
            { label: "Online ngay", value: onlineCount, color: "var(--color-accent-green)", icon: "🟢" },
            { label: "Tổng users", value: globalStats.totalUsers, color: "var(--color-primary)", icon: "👥" },
            { label: "Tổng đơn", value: globalStats.totalTrackings, color: "var(--color-secondary)", icon: "📦" },
            { label: "Đang theo dõi", value: globalStats.totalActive, color: "var(--color-accent-blue)", icon: "🔍" },
            { label: "Đang VC", value: globalStats.totalInTransit, color: "#2563EB", icon: "🚚" },
            { label: "Đã giao", value: globalStats.totalDelivered, color: "var(--color-accent-green)", icon: "✅" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3 sm:p-4"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="text-base sm:text-lg mb-1">{s.icon}</div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] sm:text-xs mt-0.5 leading-tight" style={{ color: "var(--color-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* User list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold px-1" style={{ color: "var(--color-secondary)" }}>
            Chi tiết theo người dùng — 🟢 viền xanh = đang online
          </h2>
          {loading && users.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="rounded-2xl h-20 skeleton" />)}
            </div>
          ) : users.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
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
