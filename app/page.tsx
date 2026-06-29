"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Tracking, TrackingStats, TrackResult, FilterMode, Carrier } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { isStatusDone, isStatusCancelledOrReturned } from "@/lib/tracker";

import StatsBar from "@/components/StatsBar";
import TrackingCard from "@/components/TrackingCard";
import TrackingDetail from "@/components/TrackingDetail";
import AddTrackingModal from "@/components/AddTrackingModal";
import QuickTrackModal from "@/components/QuickTrackModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ToastContainer from "@/components/Toast";
import PushNotificationBtn from "@/components/PushNotificationBtn";
import CronStatusBar from "@/components/CronStatusBar";

const MAX_TRACKINGS = 100;

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

export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();
  const { display: lastUpdatedDisplay, update: markUpdated } = useLastUpdated();

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
  const [deleteTarget, setDeleteTarget] = useState<Tracking | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<"delivered" | "cancelled" | null>(null);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const userId = user?.id ?? "";

  // Register SW
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
      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      setSelectedTracking(prev => {
        if (!prev) return null;
        return (data.trackings as Tracking[]).find((t: Tracking) => t.id === prev.id) || null;
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

  // Auto refresh data mỗi 2 phút khi tab đang active
  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => loadData(true), 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [userId, loadData]);

  // Smart client-side cron: nếu user đang mở app và last_checked quá 18 phút
  // → tự gọi cron endpoint thay vì chờ GitHub Actions
  useEffect(() => {
    if (!userId) return;

    const checkAndTriggerCron = async () => {
      // Chỉ chạy khi tab đang focus
      if (document.hidden) return;

      try {
        const res = await fetch(`/api/cron/status?user_id=${userId}`);
        if (!res.ok) return;
        const status = await res.json();

        if (!status.last_checked_at) return;

        const minutesSinceLastCheck = (Date.now() - new Date(status.last_checked_at).getTime()) / 60000;

        // Nếu quá 8 phút chưa quét → trigger cron ngay (cron-job.org chạy mỗi 5p)
        if (minutesSinceLastCheck >= 8 && status.active_count > 0) {
          console.log(`[Client Cron] Last check ${minutesSinceLastCheck.toFixed(1)}m ago, triggering...`);
          const cronRes = await fetch("/api/cron/check-trackings");
          if (cronRes.ok) {
            await loadData(true);
          }
        }
      } catch { /* ignore */ }
    };

    // Check ngay khi mount, sau đó mỗi 3 phút
    checkAndTriggerCron();
    const t = setInterval(checkAndTriggerCron, 3 * 60 * 1000);

    // Check lại khi user quay lại tab
    const onVisibilityChange = () => {
      if (!document.hidden) checkAndTriggerCron();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const filteredTrackings = trackings.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.tracking_code.toLowerCase().includes(q) && !(t.nickname || "").toLowerCase().includes(q) && !(t.last_status || "").toLowerCase().includes(q)) return false;
    }
    if (filter === "intransit") return !isStatusDone(t.last_status, t.is_delivered);
    if (filter === "delivered") return t.is_delivered || (t.last_status || "").toLowerCase().includes("giao hàng thành công");
    if (filter === "cancelled") return isStatusCancelledOrReturned(t.last_status);
    return true;
  });

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
      data.existed ? addToast("info", "Đã tồn tại", "Mã này đã có (đã khôi phục nếu đã xóa)")
                   : addToast("success", `✅ Đã thêm đơn #${data.display_id}`);
      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      setAddModal(false);
      if (!data.existed && data.display_id) {
        const newT = (data.trackings as Tracking[]).find((t: Tracking) => t.display_id === data.display_id);
        if (newT) { setSelectedTracking(newT); setDetailResult(data.track_result); }
      }
    } catch (e) { addToast("error", "Lỗi kết nối", String(e)); }
    finally { setAddLoading(false); }
  }

  async function handleDelete(t: Tracking) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/trackings/${t.display_id}?user_id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { addToast("error", "Xóa thất bại", data.error); return; }
      addToast("success", `🗑 Đã xóa đơn #${t.display_id}`);
      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      if (selectedTracking?.id === t.id) { setSelectedTracking(null); setDetailResult(null); }
    } catch (e) { addToast("error", "Lỗi kết nối", String(e)); }
    finally { setDeleteLoading(false); setDeleteTarget(null); }
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
      data.result?.ok ? addToast("success", "✅ Tra cứu thành công") : addToast("error", "Tra cứu thất bại", data.result?.error);
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
      addToast("success", "✏️ Đã cập nhật ghi chú");
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
      addToast("success", `🗑 Đã xóa ${data.count} đơn`);
      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      const still = (data.trackings as Tracking[]).find((t: Tracking) => t.id === selectedTracking?.id);
      if (!still) { setSelectedTracking(null); setDetailResult(null); }
    } catch (e) { addToast("error", "Lỗi kết nối", String(e)); }
    finally { setBulkDeleteLoading(false); setBulkDeleteType(null); }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">📦</div>
          <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const showPanel = !!selectedTracking;

  return (
    <div className="min-h-screen bg-slate-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <DeleteConfirmModal
        open={!!deleteTarget}
        title={`Xóa đơn #${deleteTarget?.display_id}?`}
        message={`Mã: ${deleteTarget?.tracking_code}`}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
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

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 safe-top">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">📦</span>
            <div className="min-w-0 hidden sm:block">
              <div className="text-sm font-bold text-white leading-none">Vận đơn</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-500">GHN · SPX</span>
                {lastUpdatedDisplay && <span className="text-xs text-slate-600">· {lastUpdatedDisplay}</span>}
                {refreshing && <span className="w-2.5 h-2.5 border border-slate-600 border-t-blue-500 rounded-full animate-spin" />}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {userId && <PushNotificationBtn userId={userId} onToast={addToast} />}

            {userId && <CronStatusBar userId={userId} />}

            <button onClick={() => setQuickTrackModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-all">
              🔍 <span className="hidden sm:inline">Tra nhanh</span>
            </button>

            <button onClick={() => loadData()} disabled={refreshing}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all disabled:opacity-50">
              🔄
            </button>

            <button onClick={() => setAddModal(true)} disabled={stats.total >= MAX_TRACKINGS}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold transition-all">
              ➕ <span className="hidden sm:inline">Thêm</span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
                title={user?.email}>
                <span className="text-sm font-bold text-blue-400">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-10 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden fade-in">
                  <div className="px-4 py-3 border-b border-slate-700">
                    <p className="text-xs text-slate-400">Đăng nhập với</p>
                    <p className="text-sm text-white font-medium truncate">{user?.email}</p>
                  </div>
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left">
                    🚪 Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close user menu */}
      {showUserMenu && <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />}

      {/* ===== MAIN ===== */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Stats */}
        <div className="mb-4">
          <StatsBar stats={stats} filter={filter} onFilter={(f) => { setFilter(f); setSelectedTracking(null); setDetailResult(null); }} />
        </div>

        {/* Capacity bar */}
        <div className="mb-4 flex items-center gap-3 px-1">
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${stats.total / MAX_TRACKINGS > 0.85 ? "bg-orange-500" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, (stats.total / MAX_TRACKINGS) * 100)}%` }} />
          </div>
          <span className="text-xs text-slate-500 shrink-0 tabular-nums">{stats.total}/{MAX_TRACKINGS}</span>
        </div>

        {/* Layout */}
        <div className="flex gap-4 items-start">
          {/* List */}
          <div className={`${showPanel ? "hidden lg:block lg:w-[380px] xl:w-[420px] shrink-0" : "w-full"}`}>
            {/* Search + bulk delete */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã, ghi chú, trạng thái..."
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2 pl-8 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors" />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">🔍</span>
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-base leading-none">×</button>}
              </div>
              {filter === "delivered" && stats.delivered > 0 && (
                <button onClick={() => setBulkDeleteType("delivered")} className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-all whitespace-nowrap">🗑 Xóa tất cả</button>
              )}
              {filter === "cancelled" && (stats.cancelled + stats.returned) > 0 && (
                <button onClick={() => setBulkDeleteType("cancelled")} className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-all whitespace-nowrap">🗑 Xóa tất cả</button>
              )}
            </div>

            {filteredTrackings.length > 0 && (
              <p className="text-xs text-slate-600 mb-2 px-1">{filteredTrackings.length} đơn{searchQuery ? ` · "${searchQuery}"` : ""}</p>
            )}

            {/* List items */}
            {dataLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-[80px] rounded-xl" />)}</div>
            ) : filteredTrackings.length === 0 ? (
              <div className="text-center py-14 fade-in">
                <div className="text-4xl mb-3">{searchQuery ? "🔍" : stats.total === 0 ? "📦" : "🎯"}</div>
                <p className="text-slate-400 text-sm">{searchQuery ? `Không tìm thấy "${searchQuery}"` : stats.total === 0 ? "Chưa có đơn nào" : "Không có đơn trong bộ lọc này"}</p>
                {!searchQuery && stats.total === 0 && (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                    <button onClick={() => setAddModal(true)} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all">➕ Thêm đơn đầu tiên</button>
                    <button onClick={() => setQuickTrackModal(true)} className="px-5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm transition-all">🔍 Tra cứu nhanh</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredTrackings.map((t) => (
                  <div key={t.id}
                    className={`group relative rounded-xl border transition-all duration-150 cursor-pointer ${selectedTracking?.id === t.id ? "border-blue-500/50 bg-blue-950/20" : "border-slate-700/80 bg-slate-800/80 hover:border-slate-600 hover:bg-slate-800"}`}
                    onClick={() => { setSelectedTracking(t); setDetailResult(null); detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                    {selectedTracking?.id === t.id && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-blue-500" />}
                    <TrackingCard tracking={t} onClick={() => {}} onDelete={(e) => { e.stopPropagation(); setDeleteTarget(t); }} />
                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(t.tracking_code).then(() => addToast("info", "Đã copy mã")); }}
                      className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs transition-all" title="Copy mã">
                      📋
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel — mobile full screen, desktop side panel */}
          {showPanel && (
            <div ref={detailPanelRef} className="flex-1 min-w-0 w-full lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-76px)] bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden slide-in-right">
              <TrackingDetail
                tracking={selectedTracking!}
                result={detailResult}
                loading={detailLoading}
                onRefresh={() => handleRefresh(selectedTracking!)}
                onDelete={() => setDeleteTarget(selectedTracking)}
                onEditNote={(note) => handleEditNote(selectedTracking!, note)}
                onClose={() => { setSelectedTracking(null); setDetailResult(null); }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Mobile: back button khi xem detail */}
      {showPanel && (
        <div className="lg:hidden fixed bottom-4 left-4 z-40">
          <button onClick={() => { setSelectedTracking(null); setDetailResult(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-medium shadow-xl">
            ← Danh sách
          </button>
        </div>
      )}
    </div>
  );
}
