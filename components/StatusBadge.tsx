"use client";

import type { Tracking } from "@/types";

function getStatusInfo(t: Tracking | { last_status?: string | null; is_delivered?: boolean }) {
  const s = (t.last_status || "").toLowerCase();
  const isDelivered = (t as Tracking).is_delivered;

  if (isDelivered || s.includes("giao hàng thành công") || s.includes("delivered")) {
    return { label: "Đã giao", color: "badge-delivered", style: { background: "#DCFCE7", color: "#15803D", border: "1px solid #BBF7D0" }, icon: "✅" };
  }
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("cancel")) {
    return { label: "Đã hủy", color: "badge-cancelled", style: { background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FECACA" }, icon: "❌" };
  }
  if (s.includes("hoàn") || s.includes("trả về") || s.includes("return")) {
    return { label: "Đang hoàn", color: "badge-returned", style: { background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" }, icon: "↩️" };
  }
  if (s) {
    return { label: "Đang VC", color: "badge-intransit", style: { background: "#DBEAFE", color: "#1D4ED8", border: "1px solid #BFDBFE" }, icon: "🚚" };
  }
  return { label: "Chưa tra", color: "", style: { background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }, icon: "📦" };
}

interface Props {
  tracking: Tracking | { last_status?: string | null; is_delivered?: boolean };
  size?: "sm" | "md";
}

export default function StatusBadge({ tracking, size = "sm" }: Props) {
  const info = getStatusInfo(tracking);
  const cls = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${cls} ${info.color}`}
      style={info.style}
    >
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
