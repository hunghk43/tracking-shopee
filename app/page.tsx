"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Tracking, TrackingStats, TrackResult, FilterMode, Carrier } from "@/types";
import { useUserId } from "@/hooks/useUserId";
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

const MAX_TRACKINGS = 100;

function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [display, setDisplay] = useState("");

  const update = useCallback(() => {
    const now = new Date();
    setLastUpdated(now);
  }, []);

  useEffect(() => {
    if (!lastUpdated) return;
    const fmt = () => {
      const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diffSec < 60) setDisplay(`${diffSec}s trước`);
      else if (diffSec < 3600) setDisplay(`${Math.floor(diffSec / 60)}m trước`);
      else setDisplay(lastUpdated.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
    };
    fmt();
    const t = setInterval(fmt, 15000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  return { display, update };
}

export default function HomePage() {
  const userId = useUserId();
  const { toasts, addToast, removeToast } = useToast();
  const { display: lastUpdatedDisplay, update: markUpdated } = useLastUpdated();

  // Data
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [stats, setStats] = useState<TrackingStats>({
    total: 0, in_transit: 0, delivered: 0, cancelled: 0, returned: 0,
  });

  // UI state
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

  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  // Load data
  const loadData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/trackings?user_id=${userId}`);
      if (!res.ok) throw new Error("Lỗi tải dữ liệu");
      const data = await res.json();
      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      // Sync selected tracking nếu đang mở detail
      if (selectedTracking) {
        const updated = (data.trackings as Tracking[]).find((t: Tracking) => t.id === selectedTracking.id);
        if (updated) setSelectedTracking(updated);
      }
    } catch (e) {
      if (!silent) addToast("error", "Lỗi tải dữ liệu", String(e));
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [userId, addToast, markUpdated, selectedTracking]);

  useEffect(() => {
    if (userId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Auto refresh mỗi 5 phút (silent)
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Filtered list
  const filteredTrackings = trackings.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !t.tracking_code.toLowerCase().includes(q) &&
        !(t.nickname || "").toLowerCase().includes(q) &&
        !(t.last_status || "").toLowerCase().includes(q)
      ) return false;
    }
    if (filter === "intransit") return !isStatusDone(t.last_status, t.is_delivered);
    if (filter === "delivered") return t.is_delivered || (t.last_status || "").toLowerCase().includes("giao hàng thành công");
    if (filter === "cancelled") return isStatusCancelledOrReturned(t.last_status);
    return true;
  });

  // ==================== HANDLERS ====================

  async function handleAdd(carrier: Carrier, code: string, nickname: string) {
    if (!userId) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/trackings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, carrier, tracking_code: code, nickname: nickname || null }),
      });
      const data = await res.json();
      if (!res.ok) { addToast("error", "Thêm thất bại", data.error); return; }

      if (data.existed) {
        addToast("info", "Đã tồn tại", "Mã này đã có (đã khôi phục nếu đã xóa)");
      } else {
        addToast("success", `✅ Đã thêm đơn #${data.display_id}`);
      }

      setTrackings(data.trackings || []);
      setStats(data.stats || {});
      markUpdated();
      setAddModal(false);

      if (!data.existed && data.display_id) {
        const newT = (data.trackings as Tracking[]).find((t: Tracking) => t.display_id === data.display_id);
        if (newT) {
          setSelectedTracking(newT);
          setDetailResult(data.track_result);
          detailPanelRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    } catch (e) {
      addToast("error", "Lỗi kết nối", String(e));
    } finally {
      setAddLoading(false);
    }
  }

  async function handleQuickSave(carrier: Carrier, code: string) {
    setAddModal(false);
    await handleAdd(carrier, code, "");
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
    } catch (e) {
      addToast("error", "Lỗi kết nối", String(e));
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
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
      if (!res.ok) {
        setDetailResult({ ok: false, error: data.error });
        addToast("error", "Tra cứu thất bại", data.error);
        return;
      }
      setDetailResult(data.result);
      await loadData(true);
      if (data.result?.ok) addToast("success", "✅ Tra cứu thành công");
      else addToast("error", "Tra cứu thất bại", data.result?.error);
    } catch (e) {
      addToast("error", "Lỗi kết nối", String(e));
    } finally {
      setDetailLoading(false);
    }
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
      setSelectedTracking((prev) => prev?.id === t.id ? { ...prev, nickname: newNote || null } : prev);
    } catch (e) {
      addToast("error", "Lỗi kết nối", String(e));
    }
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
    } catch (e) {
      addToast("error", "Lỗi kết nối", String(e));
    } finally {
      setBulkDeleteLoading(false);
      setBulkDeleteType(null);
    }
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => addToast("info", "Đã copy mã vận đơn"));
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
        title={bulkDeleteType === "delivered"
          ? `Xóa tất cả ${stats.delivered} đơn đã giao?`
          : `Xóa tất cả ${stats.cancelled + stats.returned} đơn hủy/hoàn?`}
        message="Toàn bộ đơn trong bộ lọc hiện tại sẽ bị xóa"
        onConfirm={() => bulkDeleteType && handleBulkDelete(bulkDeleteType)}
        onCancel={() => setBulkDeleteType(null)}
        loading={bulkDeleteLoading}
      />

      <AddTrackingModal
        open={addModal}
        onClose={() => setAddModal(false)}
        onAdd={handleAdd}
        loading={addLoading}
      />

      <QuickTrackModal
        open={quickTrackModal}
        onClose={() => setQuickTrackModal(false)}
        onSave={handleQuickSave}
      />

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl shrink-0">📦</div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white leading-tight truncate">Theo dõi vận đơn</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400 hidden sm:block">GHN · SPX</p>
                {lastUpdatedDisplay && (
                  <span className="text-xs text-slate-600 hidden sm:block">· cập nhật {lastUpdatedDisplay}</span>
                )}
                {refreshing && (
                  <span className="w-3 h-3 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {userId && (
              <PushNotificationBtn userId={userId} onToast={addToast} />
            )}
            <button
              onClick={() => setQuickTrackModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-all"
              title="Tra cứu nhanh không lưu"
            >
              🔍 <span className="hidden sm:inline">Tra nhanh</span>
            </button>
            <button
              onClick={() => loadData()}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-xs transition-all"
              title="Làm mới"
            >
              🔄
            </button>
            <button
              onClick={() => setAddModal(true)}
              disabled={stats.total >= MAX_TRACKINGS}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold transition-all"
            >
              ➕ <span className="hidden sm:inline">Thêm đơn</span><span className="sm:hidden">Thêm</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="max-w-7xl mx-auto px-4 py-5">
        {/* Stats */}
        <div className="mb-4">
          <StatsBar stats={stats} filter={filter} onFilter={(f) => { setFilter(f); setSelectedTracking(null); setDetailResult(null); }} />
        </div>

        {/* Capacity bar */}
        <div className="mb-4 bg-slate-800/60 rounded-xl px-4 py-2.5 border border-slate-700/50 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                stats.total / MAX_TRACKINGS > 0.85 ? "bg-orange-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(100, (stats.total / MAX_TRACKINGS) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 shrink-0 font-medium tabular-nums">
            {stats.total}/{MAX_TRACKINGS}
          </span>
          {stats.total >= MAX_TRACKINGS && (
            <span className="text-xs text-orange-400 shrink-0">⚠️ Đầy</span>
          )}
        </div>

        {/* Mobile detail overlay (bottom sheet) */}
        {showPanel && (
          <div className="lg:hidden fixed inset-0 z-30 flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setSelectedTracking(null); setDetailResult(null); }}
            />
            <div className="relative bg-slate-800 rounded-t-2xl border-t border-slate-700 shadow-2xl slide-in-up max-h-[90vh] flex flex-col">
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
          </div>
        )}

        {/* Layout: list + detail panel */}
        <div className="flex gap-4 items-start">
          {/* Left: list */}
          <div className={`${showPanel ? "lg:w-[400px] xl:w-[440px] shrink-0" : "w-full"} transition-all duration-300`}>

            {/* Search + bulk actions */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã, ghi chú, trạng thái..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>
                )}
              </div>
              {filter === "delivered" && stats.delivered > 0 && (
                <button onClick={() => setBulkDeleteType("delivered")} className="shrink-0 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium transition-all whitespace-nowrap">
                  🗑 Xóa tất cả
                </button>
              )}
              {filter === "cancelled" && (stats.cancelled + stats.returned) > 0 && (
                <button onClick={() => setBulkDeleteType("cancelled")} className="shrink-0 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium transition-all whitespace-nowrap">
                  🗑 Xóa tất cả
                </button>
              )}
            </div>

            {/* Count */}
            {filteredTrackings.length > 0 && (
              <p className="text-xs text-slate-500 mb-2 px-1">
                {filteredTrackings.length} đơn{searchQuery ? ` khớp "${searchQuery}"` : ""}
              </p>
            )}

            {/* List */}
            {dataLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[88px] w-full rounded-xl" />)}
              </div>
            ) : filteredTrackings.length === 0 ? (
              <div className="text-center py-16 fade-in">
                <div className="text-5xl mb-4">{searchQuery ? "🔍" : stats.total === 0 ? "📦" : "🎯"}</div>
                <p className="text-slate-400 text-sm mb-1">
                  {searchQuery ? `Không tìm thấy "${searchQuery}"` : stats.total === 0 ? "Chưa có đơn nào" : "Không có đơn trong bộ lọc này"}
                </p>
                {!searchQuery && stats.total === 0 && (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                    <button onClick={() => setAddModal(true)} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all">
                      ➕ Thêm đơn theo dõi
                    </button>
                    <button onClick={() => setQuickTrackModal(true)} className="px-5 py-2 rounded-xl border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all">
                      🔍 Tra cứu nhanh
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTrackings.map((t) => (
                  <div
                    key={t.id}
                    className={`group relative rounded-xl border transition-all duration-150 cursor-pointer card-hover ${
                      selectedTracking?.id === t.id
                        ? "border-blue-500/60 bg-blue-950/30"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-750"
                    }`}
                    onClick={() => {
                      setSelectedTracking(t);
                      setDetailResult(null);
                    }}
                  >
                    <TrackingCard
                      tracking={t}
                      onClick={() => {}}
                      onDelete={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
                    />
                    {/* Copy button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyCode(t.tracking_code); }}
                      className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-all text-xs"
                      title="Copy mã"
                    >
                      📋
                    </button>
                    {selectedTracking?.id === t.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl bg-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: detail panel — desktop only */}
          {showPanel && (
            <div
              ref={detailPanelRef}
              className="hidden lg:flex flex-1 min-w-0 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden slide-in-right lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-84px)] flex-col"
            >
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

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-700 border-t border-slate-800 mt-10">
        <p>📦 Theo dõi vận đơn · GHN + SPX · Tự động cập nhật mỗi 15 phút</p>
      </footer>
    </div>
  );
}
