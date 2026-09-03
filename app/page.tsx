"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Tracking, TrackingStats, TrackResult, FilterMode, Carrier } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { isStatusCancelledOrReturned } from "@/lib/tracker";

import StatsBar from "@/components/StatsBar";
import TrackingCard from "@/components/TrackingCard";
import TrackingDetail from "@/components/TrackingDetail";
import AddTrackingModal from "@/components/AddTrackingModal";
import QuickTrackModal from "@/components/QuickTrackModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ToastContainer from "@/components/Toast";
import PushNotificationBtn from "@/components/PushNotificationBtn";
import CronStatusBar from "@/components/CronStatusBar";
import BulkToolbar, { exportTrackingsCSV } from "@/components/BulkToolbar";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useFaviconBadge } from "@/hooks/useFaviconBadge";
import { usePresence } from "@/hooks/usePresence";

const MAX_TRACKINGS = 500;

function usePullToRefresh(onRefresh: () => void) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const THRESHOLD = 70;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) { startY.current = e.touches[0].clientY; pulling.current = true; }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const dist = Math.max(0, Math.min(e.touches[0].clientY - startY.current, 110));
      pullDistanceRef.current = dist;
      setPullDistance(dist);
    };
    const onTouchEnd = () => {
      if (pulling.current && pullDistanceRef.current >= THRESHOLD) onRefreshRef.current();
      pullDistanceRef.current = 0; setPullDistance(0); pulling.current = false;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return { pullDistance, threshold: THRESHOLD };
}

function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [display, setDisplay] = useState("");
  const update = useCallback(() => setLastUpdated(new Date()), []);

  useEffect(() => {
    if (!lastUpdated) return;
    const fmt = () => {
      const s = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (s < 60) setDisplay(`${s}s trước`);
      else if (s < 3600) setDisplay(`${Math.floor(s / 60)}p trước`);
      else setDisplay(lastUpdated.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
    };
    fmt();
    const t = setInterval(fmt, 15000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  return { display, update };
}

/* ── Skeleton Cards ─────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div
      className="p-3.5 rounded-xl"
      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="skeleton h-3 w-6 rounded" />
            <div className="skeleton h-3 w-10 rounded" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
          <div className="skeleton h-4 w-44 rounded" />
          <div className="skeleton h-3 w-56 rounded" />
          <div className="skeleton h-3 w-36 rounded" />
        </div>
        <div className="skeleton w-7 h-7 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

/* ── HomePage ───────────────────────────────────────────────── */
export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { toasts, addToast, addToastWithAction, removeToast } = useToast();
  const { display: lastUpdatedDisplay, update: markUpdated } = useLastUpdated();
  const { pullDistance, threshold: pullThreshold } = usePullToRefresh(() => loadData());

  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [stats, setStats] = useState<TrackingStats>({ total: 0, in_transit: 0, delivered: 0, cancelled: 0, returned: 0 });
  const [filter, setFilter] = useState<FilterMode>("all");
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [quickTrackModal, setQuickTrackModal] = useState(false);
  const [selectedTracking, setSelectedTracking] = useState<Tracking | null>(null);
  const [detailResult, setDetailResult] = useState<TrackResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<"delivered" | "cancelled" | null>(null);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<"default" | "updated" | "created" | "nickname">("default");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteCheckedLoading, setBulkDeleteCheckedLoading] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const userId = user?.id ?? "";
  useFaviconBadge(stats.in_transit);
  usePresence(user?.id, user?.email);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(console.error);
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/trackings?user_id=${userId}`);
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error("Lỗi tải dữ liệu");
      const data = await res.json();
      const newTrackings: Tracking[] = data.trackings || [];

      setTrackings(prev => {
        const prevMap = new Map(prev.map(t => [t.id, t.last_status]));
        const changed = newTrackings
          .filter(t => prevMap.has(t.id) && prevMap.get(t.id) !== t.last_status)
          .map(t => t.id);
        if (changed.length > 0) {
          setUpdatedIds(new Set(changed));
          setTimeout(() => setUpdatedIds(new Set()), 3000);
        }
        return newTrackings;
      });

      setStats(data.stats || {});
      markUpdated();
      setSelectedTracking(prev => {
        if (!prev) return null;
        return newTrackings.find((t: Tracking) => t.id === prev.id) || null;
      });
    } catch (e) {
      if (!silent) addToast("error", "Lỗi tải dữ liệu", String(e));
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => { if (userId) loadData(); }, [userId, loadData]);

  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => loadData(true), 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [userId, loadData]);

  useEffect(() => {
    if (!userId) return;
    const checkAndTriggerCron = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/cron/status?user_id=${userId}`);
        if (!res.ok) return;
        const status = await res.json();
        if (!status.last_checked_at) return;
        const minutesSinceLastCheck = (Date.now() - new Date(status.last_checked_at).getTime()) / 60000;
        if (minutesSinceLastCheck >= 8 && status.active_count > 0) {
          const cronRes = await fetch("/api/cron/check-trackings");
          if (cronRes.ok) await loadData(true);
        }
      } catch { /* ignore */ }
    };
    checkAndTriggerCron();
    const t = setInterval(checkAndTriggerCron, 3 * 60 * 1000);
    const onVisibilityChange = () => { if (!document.hidden) checkAndTriggerCron(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisibilityChange); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ── Filtering & sorting ──────────────────────────────────── */
  const filteredTrackings = trackings.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !t.tracking_code.toLowerCase().includes(q) &&
        !(t.nickname || "").toLowerCase().includes(q) &&
        !(t.last_status || "").toLowerCase().includes(q)
      ) return false;
    }
    const s = (t.last_status || "").toLowerCase();
    if (filter === "intransit") {
      return !!s && !t.is_delivered &&
        !s.includes("giao hàng thành công") && !s.includes("delivered") &&
        !s.includes("huỷ") && !s.includes("hủy") && !s.includes("cancel") &&
        !s.includes("hoàn") && !s.includes("trả về") && !s.includes("return");
    }
    if (filter === "delivered") return t.is_delivered || s.includes("giao hàng thành công") || s.includes("delivered");
    if (filter === "cancelled") return isStatusCancelledOrReturned(t.last_status);
    return true;
  });

  const sortedTrackings = [...filteredTrackings].sort((a, b) => {
    if (sortMode === "updated") return new Date(b.last_checked_at || 0).getTime() - new Date(a.last_checked_at || 0).getTime();
    if (sortMode === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortMode === "nickname") return (a.nickname || a.tracking_code).localeCompare(b.nickname || b.tracking_code, "vi");
    return 0;
  });

  /* ── Bulk selection helpers ───────────────────────────────── */
  const checkedTrackings = sortedTrackings.filter(t => checkedIds.has(t.id));
  const showCheckbox = checkedIds.size > 0;

  function toggleCheck(id: string, checked: boolean) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function clearSelection() { setCheckedIds(new Set()); }

  /* ── Handlers ─────────────────────────────────────────────── */
  async function handleAdd(carrier: Carrier, code: string, nickname: string) {
    setAddLoading(true);
    try {
      const res = await fetch("/api/trackings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, carrier, tracking_code: code, nickname: nickname || null }),
      });
      const data = await res.json();
      if (!res.ok) { addToast("error", "Thêm thất bại", data.error); return; }
      data.existed
        ? addToast("info", "Đã tồn tại", "Mã này đã có (đã khôi phục nếu đã xóa)")
        : addToast("success", `Đã thêm đơn #${data.display_id}`);
      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      setAddModal(false);
      if (!data.existed && data.display_id) {
        const newT = (data.trackings as Tracking[]).find((t: Tracking) => t.display_id === data.display_id);
        if (newT) { setSelectedTracking(newT); setDetailResult(null); }
      }
    } catch (e) { addToast("error", "Lỗi kết nối", String(e)); }
    finally { setAddLoading(false); }
  }

  async function handleDelete(t: Tracking) {
    const snapshotTrackings = trackings;
    const snapshotStats = stats;
    try {
      const res = await fetch(`/api/trackings/${t.display_id}?user_id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { addToast("error", "Xóa thất bại", data.error); return; }
      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      if (selectedTracking?.id === t.id) { setSelectedTracking(null); setDetailResult(null); }
      addToastWithAction("info", `Đã xóa đơn #${t.display_id}`, t.nickname || t.tracking_code, {
        label: "↩ Hoàn tác",
        onClick: async () => {
          try {
            const reRes = await fetch("/api/trackings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: userId, carrier: t.carrier, tracking_code: t.tracking_code, nickname: t.nickname }),
            });
            if (reRes.ok) {
              const reData = await reRes.json();
              setTrackings(reData.trackings || snapshotTrackings);
              setStats(reData.stats || snapshotStats);
              markUpdated();
              addToast("success", `Đã khôi phục đơn #${t.display_id}`);
            } else { addToast("error", "Không thể hoàn tác"); }
          } catch { addToast("error", "Không thể hoàn tác"); }
        },
      });
    } catch (e) { addToast("error", "Lỗi kết nối", String(e)); }
  }

  async function handleDeleteChecked() {
    setBulkDeleteCheckedLoading(true);
    try {
      await Promise.all(
        checkedTrackings.map(t =>
          fetch(`/api/trackings/${t.display_id}?user_id=${userId}`, { method: "DELETE" })
        )
      );
      await loadData(true);
      addToast("success", `Đã xóa ${checkedTrackings.length} đơn`);
      clearSelection();
    } catch (e) { addToast("error", "Xóa thất bại", String(e)); }
    finally { setBulkDeleteCheckedLoading(false); setShowBulkDeleteConfirm(false); }
  }

  async function handleRefresh(t: Tracking) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/trackings/${t.display_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) { setDetailResult({ ok: false, error: data.error }); addToast("error", "Tra cứu thất bại", data.error); return; }
      setDetailResult(data.result);
      await loadData(true);
      data.result?.ok ? addToast("success", "Tra cứu thành công") : addToast("error", "Tra cứu thất bại", data.result?.error);
    } catch (e) { addToast("error", "Lỗi kết nối", String(e)); }
    finally { setDetailLoading(false); }
  }

  async function handleEditNote(t: Tracking, newNote: string) {
    try {
      const res = await fetch(`/api/trackings/${t.display_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, nickname: newNote || null }),
      });
      if (!res.ok) { addToast("error", "Cập nhật thất bại"); return; }
      addToast("success", "Đã cập nhật ghi chú");
      await loadData(true);
      setSelectedTracking(prev => prev?.id === t.id ? { ...prev, nickname: newNote || null } : prev);
    } catch (e) { addToast("error", "Lỗi kết nối", String(e)); }
  }

  async function handleBulkDelete(type: "delivered" | "cancelled") {
    setBulkDeleteLoading(true);
    try {
      const res = await fetch("/api/trackings/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, type }),
      });
      const data = await res.json();
      if (!res.ok) { addToast("error", "Xóa thất bại", data.error); return; }
      addToast("success", `Đã xóa ${data.count} đơn`);
      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      const still = (data.trackings as Tracking[]).find((t: Tracking) => t.id === selectedTracking?.id);
      if (!still) { setSelectedTracking(null); setDetailResult(null); }
    } catch (e) { addToast("error", "Lỗi kết nối", String(e)); }
    finally { setBulkDeleteLoading(false); setBulkDeleteType(null); }
  }

  async function handleSignOut() { await signOut(); router.push("/login"); }

  /* ── Auth loading splash ──────────────────────────────────── */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">📦</div>
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: "rgba(59,130,246,0.2)", borderTopColor: "var(--color-accent-blue)" }} />
        </div>
      </div>
    );
  }

  const showPanel = !!selectedTracking;

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {/* extra bottom space for BottomNav on mobile */}
      <style>{`@media (max-width: 639px) { main { padding-bottom: 88px !important; } }`}</style>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Bulk delete confirmation for checked items */}
      <DeleteConfirmModal
        open={showBulkDeleteConfirm}
        title={`Xóa ${checkedTrackings.length} đơn đã chọn?`}
        message="Tất cả đơn đã chọn sẽ bị xóa vĩnh viễn"
        onConfirm={handleDeleteChecked}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        loading={bulkDeleteCheckedLoading}
      />

      {/* Bulk delete by filter */}
      <DeleteConfirmModal
        open={!!bulkDeleteType}
        title={bulkDeleteType === "delivered" ? `Xóa ${stats.delivered} đơn đã giao?` : `Xóa ${stats.cancelled + stats.returned} đơn hủy/hoàn?`}
        message="Toàn bộ đơn trong bộ lọc hiện tại sẽ bị xóa"
        onConfirm={() => bulkDeleteType && handleBulkDelete(bulkDeleteType)}
        onCancel={() => setBulkDeleteType(null)}
        loading={bulkDeleteLoading}
      />

      <AddTrackingModal open={addModal} onClose={() => setAddModal(false)} onAdd={handleAdd} loading={addLoading} />
      <QuickTrackModal open={quickTrackModal} onClose={() => setQuickTrackModal(false)} onSave={async (c, code) => { setQuickTrackModal(false); await handleAdd(c, code, ""); }} />

      {/* ── HEADER (Shopee style) ─────────────────────────── */}
      <header
        className="sticky top-0 z-30 glass safe-top"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {/* Shopee orange accent bar */}
        <div style={{ background: "linear-gradient(90deg, var(--color-shopee), #FF6633)", height: "3px" }} />
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">📦</span>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-none" style={{ color: "var(--color-shopee)" }}>Vận đơn</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs hidden sm:inline" style={{ color: "var(--color-muted)" }}>GHN · SPX</span>
                {lastUpdatedDisplay && (
                  <span className="text-xs" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
                    <span className="hidden sm:inline">· </span>{lastUpdatedDisplay}
                  </span>
                )}
                {refreshing && (
                  <span className="w-2.5 h-2.5 border rounded-full animate-spin"
                    style={{ borderColor: "rgba(59,130,246,0.2)", borderTopColor: "var(--color-accent-blue)" }} />
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {userId && <PushNotificationBtn userId={userId} onToast={addToast} />}
            {userId && <CronStatusBar userId={userId} />}

            <button
              onClick={() => setQuickTrackModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-80"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
              aria-label="Tra cứu nhanh"
            >
              🔍 <span>Tra nhanh</span>
            </button>

            <button
              onClick={() => loadData()}
              disabled={refreshing}
              className="w-8 h-8 hidden sm:flex items-center justify-center rounded-lg transition-all duration-200 hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
              aria-label="Tải lại dữ liệu"
            >
              🔄
            </button>

            {user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "hoangkimhung2004@gmail.com").toLowerCase() && (
              <button
                onClick={() => router.push("/admin")}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:opacity-90"
                style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.45)", color: "var(--color-shopee)" }}
                aria-label="Admin Dashboard"
                title="Admin Dashboard"
              >
                🔐 Admin
              </button>
            )}

            <button
              onClick={() => setAddModal(true)}
              disabled={stats.total >= MAX_TRACKINGS}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--color-accent-blue)", color: "#fff" }}
              aria-label="Thêm đơn mới"
            >
              ➕ <span className="hidden sm:inline">Thêm</span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:opacity-80"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                title={user?.email}
                aria-label="Menu tài khoản"
                aria-expanded={showUserMenu}
              >
                <span className="text-sm font-bold" style={{ color: "var(--color-accent-blue)" }}>
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </button>
              {showUserMenu && (
                <div
                  className="absolute right-0 top-10 w-56 rounded-xl shadow-2xl z-50 overflow-hidden fade-in-scale"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-panel)", borderRadius: "var(--radius-lg)" }}
                  role="menu"
                >
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <p className="text-xs" style={{ color: "var(--color-muted)" }}>Đăng nhập với</p>
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-primary)" }}>{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); router.push("/settings"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:opacity-80"
                    style={{ color: "var(--color-secondary)" }}
                    role="menuitem"
                  >
                    ⚙️ Cài đặt tài khoản
                  </button>
                  {user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                    <button
                      onClick={() => { setShowUserMenu(false); router.push("/admin"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:opacity-80"
                      style={{ color: "var(--color-shopee)", borderTop: "1px solid var(--color-border)" }}
                      role="menuitem"
                    >
                      🔐 Admin Dashboard
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:opacity-80"
                    style={{ color: "var(--color-accent-red)", borderTop: "1px solid var(--color-border)" }}
                    role="menuitem"
                  >
                    🚪 Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showUserMenu && <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} aria-hidden="true" />}

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Pull-to-refresh indicator */}
        {pullDistance > 0 && (
          <div
            className="fixed top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-100"
            style={{ opacity: Math.min(1, pullDistance / pullThreshold) }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-xs"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
            >
              <span
                className="inline-block transition-transform duration-100"
                style={{ transform: `rotate(${Math.min(180, (pullDistance / pullThreshold) * 180)}deg)` }}
              >
                🔄
              </span>
              {pullDistance >= pullThreshold ? "Thả để làm mới" : "Kéo để làm mới"}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-4">
          <StatsBar stats={stats} filter={filter} onFilter={(f) => { setFilter(f); setSelectedTracking(null); setDetailResult(null); }} />
        </div>

        {/* Capacity bar */}
        <div className="mb-4 flex items-center gap-3 px-1">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (stats.total / MAX_TRACKINGS) * 100)}%`,
                background: stats.total / MAX_TRACKINGS > 0.85 ? "var(--color-accent-orange)" : "var(--color-accent-blue)",
              }}
            />
          </div>
          <span className="text-xs shrink-0 tabular-nums" style={{ color: "var(--color-muted)" }}>
            {stats.total}/{MAX_TRACKINGS}
          </span>
        </div>

        {/* Layout: list + optional detail panel */}
        <div className="flex gap-4 items-start">
          {/* ── List column ──────────────────────────────────── */}
          <div className={`${showPanel ? "hidden lg:block lg:w-[380px] xl:w-[420px] shrink-0" : "w-full"}`}>
            {/* SearchBar */}
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "var(--color-muted)" }}>
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã vận đơn, ghi chú, trạng thái…"
                className="w-full rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none transition-all duration-200"
                style={{
                  background: "var(--color-surface)",
                  border: `1px solid ${searchQuery ? "var(--color-accent-blue)" : "var(--color-border)"}`,
                  color: "var(--color-primary)",
                }}
                aria-label="Tìm kiếm đơn hàng"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base leading-none transition-colors hover:opacity-80"
                  style={{ color: "var(--color-muted)" }}
                  aria-label="Xóa tìm kiếm"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter row: sort + bulk delete */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                className="rounded-xl px-2.5 py-2 text-xs focus:outline-none cursor-pointer transition-all"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
                aria-label="Sắp xếp đơn hàng"
              >
                <option value="default">📦 Mặc định</option>
                <option value="updated">🔄 Mới cập nhật</option>
                <option value="created">🕐 Mới thêm</option>
                <option value="nickname">🔤 Tên A-Z</option>
              </select>

              {filter === "delivered" && stats.delivered > 0 && (
                <button
                  onClick={() => setBulkDeleteType("delivered")}
                  className="px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--color-accent-red)" }}
                >
                  🗑 Xóa tất cả đã giao
                </button>
              )}
              {filter === "cancelled" && (stats.cancelled + stats.returned) > 0 && (
                <button
                  onClick={() => setBulkDeleteType("cancelled")}
                  className="px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--color-accent-red)" }}
                >
                  🗑 Xóa tất cả hủy/hoàn
                </button>
              )}
            </div>

            {/* Result count */}
            {sortedTrackings.length > 0 && (
              <p className="text-xs mb-2 px-1" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
                {sortedTrackings.length} đơn
                {searchQuery ? ` · "${searchQuery}"` : ""}
                {sortMode !== "default" ? ` · ${sortMode === "updated" ? "mới cập nhật" : sortMode === "created" ? "mới thêm" : "A-Z"}` : ""}
              </p>
            )}

            {/* List */}
            {dataLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : sortedTrackings.length === 0 ? (
              stats.total === 0 ? (
                <EmptyState
                  illustration="📦"
                  headline="Chưa có đơn nào"
                  subtext="Thêm mã vận đơn đầu tiên để bắt đầu theo dõi hành trình giao hàng."
                  cta={{ label: "➕ Thêm đơn đầu tiên", onClick: () => setAddModal(true) }}
                  secondaryCta={{ label: "🔍 Tra cứu nhanh", onClick: () => setQuickTrackModal(true), variant: "secondary" }}
                />
              ) : (
                <EmptyState
                  illustration="🔍"
                  headline={searchQuery ? `Không tìm thấy "${searchQuery}"` : "Không có đơn trong bộ lọc này"}
                  subtext={searchQuery ? "Thử tìm với mã vận đơn, ghi chú hoặc trạng thái khác." : "Chuyển sang bộ lọc khác để xem đơn hàng."}
                  cta={searchQuery
                    ? { label: "Xóa tìm kiếm", onClick: () => setSearchQuery(""), variant: "secondary" }
                    : { label: "Xem tất cả", onClick: () => setFilter("all"), variant: "secondary" }
                  }
                />
              )
            ) : (
              <div className="space-y-2">
                {sortedTrackings.map((t) => (
                  <div
                    key={t.id}
                    className={`group relative rounded-xl transition-all duration-200 cursor-pointer ${updatedIds.has(t.id) ? "tracking-updated" : ""}`}
                    style={{
                      background: selectedTracking?.id === t.id ? "rgba(59,130,246,0.06)" : "var(--color-card)",
                      border: `1px solid ${selectedTracking?.id === t.id ? "rgba(59,130,246,0.4)" : "var(--color-border)"}`,
                      boxShadow: "var(--shadow-card)",
                      transform: "translateY(0)",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTracking?.id !== t.id) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
                        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTracking?.id !== t.id) {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = "var(--color-border)";
                        e.currentTarget.style.boxShadow = "var(--shadow-card)";
                      }
                    }}
                    onClick={() => {
                      setSelectedTracking(t);
                      setDetailResult(null);
                      // scroll to top on mobile so detail panel is visible
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <TrackingCard
                      tracking={t}
                      onClick={() => {}}
                      onDelete={(e) => { e.stopPropagation(); handleDelete(t); }}
                      onCopy={() => addToast("info", "Đã copy mã")}
                      onRefresh={(e) => { e.stopPropagation(); setSelectedTracking(t); handleRefresh(t); }}
                      onEditNote={(e) => { e.stopPropagation(); setSelectedTracking(t); }}
                      selected={selectedTracking?.id === t.id}
                      checked={checkedIds.has(t.id)}
                      onCheck={(checked) => toggleCheck(t.id, checked)}
                      showCheckbox={showCheckbox}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Detail panel ─────────────────────────────────── */}
          {showPanel && (
            <div
              ref={detailPanelRef}
              className="flex-1 min-w-0 w-full lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-76px)] rounded-2xl overflow-hidden lg:slide-in-right slide-in-up"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-panel)",
                // On mobile: enough height to show all content without needing outer scroll
                minHeight: "calc(100vh - 140px)",
              }}
            >
              <TrackingDetail
                tracking={selectedTracking!}
                result={detailResult}
                loading={detailLoading}
                onRefresh={() => handleRefresh(selectedTracking!)}
                onDelete={() => selectedTracking && handleDelete(selectedTracking)}
                onEditNote={(note) => handleEditNote(selectedTracking!, note)}
                onClose={() => { setSelectedTracking(null); setDetailResult(null); }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Mobile back button when viewing detail */}
      {showPanel && (
        <div
          className="lg:hidden fixed left-4 z-40"
          style={{ bottom: checkedIds.size > 0 ? "calc(72px + 60px)" : "72px" }}
        >
          <button
            onClick={() => { setSelectedTracking(null); setDetailResult(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl transition-all hover:opacity-90"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary)", boxShadow: "var(--shadow-modal)" }}
          >
            ← Danh sách
          </button>
        </div>
      )}

      {/* Bulk action toolbar */}
      <BulkToolbar
        selectedItems={checkedTrackings}
        onClearSelection={clearSelection}
        onDeleteSelected={() => setShowBulkDeleteConfirm(true)}
        onExportCSV={() => { exportTrackingsCSV(checkedTrackings); addToast("success", `Đã xuất ${checkedTrackings.length} đơn`); }}
      />

      {/* Bottom Nav (mobile only) */}
      <BottomNav
        onOpenTrackings={() => { setSelectedTracking(null); setDetailResult(null); }}
        onOpenQuickTrack={() => setQuickTrackModal(true)}
        onOpenAdd={() => setAddModal(true)}
        onOpenSettings={() => router.push("/settings")}
        onOpenAdmin={() => router.push("/admin")}
        isAdmin={user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "hoangkimhung2004@gmail.com").toLowerCase()}
        activeTab={showPanel ? "trackings" : "trackings"}
      />
    </div>
  );
}
