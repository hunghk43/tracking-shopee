"use client";

import type { TrackingStats, FilterMode } from "@/types";

interface Props {
  stats: TrackingStats;
  filter: FilterMode;
  onFilter: (f: FilterMode) => void;
}

const CARDS = [
  {
    key: "all" as FilterMode,
    label: "Tất cả",
    field: "total" as keyof TrackingStats,
    icon: "📦",
    color: "from-slate-700 to-slate-600",
    active: "from-slate-500 to-slate-400",
    border: "border-slate-500/50",
  },
  {
    key: "intransit" as FilterMode,
    label: "Đang VC",
    field: "in_transit" as keyof TrackingStats,
    icon: "🚚",
    color: "from-blue-900 to-blue-800",
    active: "from-blue-600 to-blue-500",
    border: "border-blue-500/50",
  },
  {
    key: "delivered" as FilterMode,
    label: "Đã giao",
    field: "delivered" as keyof TrackingStats,
    icon: "✅",
    color: "from-green-900 to-green-800",
    active: "from-green-600 to-green-500",
    border: "border-green-500/50",
  },
  {
    key: "cancelled" as FilterMode,
    label: "Hủy/Hoàn",
    field: null,
    icon: "↩️",
    color: "from-orange-900 to-orange-800",
    active: "from-orange-600 to-orange-500",
    border: "border-orange-500/50",
  },
];

export default function StatsBar({ stats, filter, onFilter }: Props) {
  const getCancelledCount = () => stats.cancelled + stats.returned;

  const getCount = (card: (typeof CARDS)[number]) => {
    if (card.field) return stats[card.field];
    return getCancelledCount();
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CARDS.map((card) => {
        const count = getCount(card);
        const isActive = filter === card.key;
        return (
          <button
            key={card.key}
            onClick={() => onFilter(card.key)}
            className={`
              relative rounded-xl p-4 text-left transition-all duration-200
              bg-gradient-to-br border cursor-pointer
              ${isActive ? `${card.active} ${card.border} shadow-lg scale-[1.02]` : `${card.color} border-slate-700/50 hover:border-slate-500/50`}
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{card.icon}</span>
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-white/70 pulse-dot" />
              )}
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-white/70 mt-0.5">{card.label}</div>
            </div>
            {isActive && (
              <div className="absolute inset-0 rounded-xl ring-2 ring-white/20 pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
}
