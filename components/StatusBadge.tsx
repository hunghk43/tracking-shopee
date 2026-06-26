"use client";

import type { Tracking } from "@/types";

function getStatusInfo(t: Tracking | { last_status?: string | null; is_delivered?: boolean }) {
  const s = (t.last_status || "").toLowerCase();
  const isDelivered = (t as Tracking).is_delivered;

  if (isDelivered || s.includes("giao hàng thành công") || s.includes("delivered")) {
    return { label: "Đã giao", color: "bg-green-500/20 text-green-400 border-green-500/30 badge-delivered", icon: "✅" };
  }
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("cancel")) {
    return { label: "Đã hủy", color: "bg-red-500/20 text-red-400 border-red-500/30 badge-cancelled", icon: "❌" };
  }
  if (s.includes("hoàn") || s.includes("trả về") || s.includes("return")) {
    return { label: "Đang hoàn", color: "bg-orange-500/20 text-orange-400 border-orange-500/30 badge-returned", icon: "↩️" };
  }
  if (s) {
    return { label: "Đang VC", color: "bg-blue-500/20 text-blue-400 border-blue-500/30 badge-intransit", icon: "🚚" };
  }
  return { label: "Chưa tra", color: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: "📦" };
}

interface Props {
  tracking: Tracking | { last_status?: string | null; is_delivered?: boolean };
  size?: "sm" | "md";
}

export default function StatusBadge({ tracking, size = "sm" }: Props) {
  const info = getStatusInfo(tracking);
  const cls = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${info.color}`}>
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </span>
  );
}

export function getStatusIcon(t: Tracking): string {
  const s = (t.last_status || "").toLowerCase();
  if (t.is_delivered || s.includes("giao hàng thành công") || s.includes("delivered")) return "✅";
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("cancel")) return "❌";
  if (s.includes("hoàn") || s.includes("trả về") || s.includes("return")) return "↩️";
  if (s) return "🚚";
  return "📦";
}
