"use client";

import type { TrackingStats, FilterMode } from "@/types";

interface Props {
  stats: TrackingStats;
  filter: FilterMode;
  onFilter: (f: FilterMode) => void;
}

interface CardConfig {
  key: FilterMode;
  label: string;
  field: keyof TrackingStats | null;
  icon: string;
  accentColor: string;
  bgActive: string;
  borderActive: string;
  iconBg: string;
  trendLabel: string;
}

const CARDS: CardConfig[] = [
  {
    key: "all",
    label: "Tất cả",
    field: "total",
    icon: "📦",
    accentColor: "#374151",
    bgActive: "#F9FAFB",
    borderActive: "#374151",
    iconBg: "#F3F4F6",
    trendLabel: "đơn",
  },
  {
    key: "intransit",
    label: "Đang vận chuyển",
    field: "in_transit",
    icon: "🚚",
    accentColor: "#2563EB",
    bgActive: "#EFF6FF",
    borderActive: "#2563EB",
    iconBg: "#DBEAFE",
    trendLabel: "đang di chuyển",
  },
  {
    key: "delivered",
    label: "Đã giao",
    field: "delivered",
    icon: "✅",
    accentColor: "#16A34A",
    bgActive: "#F0FDF4",
    borderActive: "#16A34A",
    iconBg: "#DCFCE7",
    trendLabel: "đã nhận hàng",
  },
  {
    key: "cancelled",
    label: "Đã hủy",
    field: "cancelled",
    icon: "❌",
    accentColor: "#DC2626",
    bgActive: "#FEF2F2",
    borderActive: "#DC2626",
    iconBg: "#FEE2E2",
    trendLabel: "bị hủy",
  },
];

export default function StatsBar({ stats, filter, onFilter }: Props) {
  const getCount = (card: CardConfig) => {
    if (card.key === "cancelled") return stats.cancelled + stats.returned;
    if (card.field) return stats[card.field] as number;
    return 0;
  };

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      role="group"
      aria-label="Bộ lọc theo trạng thái"
    >
      {CARDS.map((card) => {
        const count = getCount(card);
        const isActive = filter === card.key;

        return (
          <button
            key={card.key}
            onClick={() => onFilter(card.key)}
            aria-pressed={isActive}
            aria-label={`${card.label}: ${count} đơn`}
            className="relative rounded-xl p-4 text-left cursor-pointer transition-all duration-200 overflow-hidden group"
            style={{
              background: isActive ? card.bgActive : "var(--color-card)",
              border: `1.5px solid ${isActive ? card.borderActive : "var(--color-border)"}`,
              boxShadow: isActive
                ? `0 4px 16px ${card.accentColor}22, var(--shadow-card)`
                : "var(--shadow-card)",
              transform: isActive ? "scale(1.02)" : "scale(1)",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = card.accentColor + "80";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${card.accentColor}18, var(--shadow-card)`;
                (e.currentTarget as HTMLElement).style.transform = "scale(1.01)";
                (e.currentTarget as HTMLElement).style.background = card.bgActive;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLElement).style.background = "var(--color-card)";
              }
            }}
          >
            {/* Pulsing dot when active */}
            {isActive && (
              <span
                className="absolute top-3 right-3 w-2 h-2 rounded-full pulse-dot"
                style={{ background: card.accentColor }}
              />
            )}

            {/* Icon */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 transition-colors"
              style={{ background: card.iconBg }}
            >
              {card.icon}
            </div>

            {/* Count */}
            <div
              className="text-2xl font-bold leading-none mb-1 tabular-nums"
              style={{ color: isActive ? card.accentColor : "var(--color-primary)" }}
            >
              {count}
            </div>

            {/* Label */}
            <div className="text-xs font-medium" style={{ color: isActive ? card.accentColor : "var(--color-muted)" }}>
              {card.label}
            </div>

            {/* Active ring overlay */}
            {isActive && (
              <div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ boxShadow: `inset 0 0 0 1.5px ${card.borderActive}` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
