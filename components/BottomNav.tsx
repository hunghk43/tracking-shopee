"use client";

interface NavItem {
  icon: string;
  label: string;
  action: () => void;
  active?: boolean;
  badge?: number;
}

interface Props {
  onOpenTrackings: () => void;
  onOpenQuickTrack: () => void;
  onOpenAdd: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
  activeTab?: "trackings" | "quicktrack" | "add" | "notifications" | "settings" | "admin";
  notificationBadge?: number;
}

export default function BottomNav({
  onOpenTrackings,
  onOpenQuickTrack,
  onOpenAdd,
  onOpenNotifications,
  onOpenSettings,
  onOpenAdmin,
  isAdmin = false,
  activeTab = "trackings",
  notificationBadge = 0,
}: Props) {
  const items: NavItem[] = [
    { icon: "📦", label: "Đơn hàng",   action: onOpenTrackings,     active: activeTab === "trackings" },
    { icon: "🔍", label: "Tra nhanh",   action: onOpenQuickTrack,    active: activeTab === "quicktrack" },
    { icon: "➕", label: "Thêm",        action: onOpenAdd,           active: false },
    {
      icon: "🔔", label: "Thông báo",
      action: onOpenNotifications ?? (() => {}),
      active: activeTab === "notifications",
      badge: notificationBadge,
    },
    { icon: "⚙️", label: "Cài đặt",    action: onOpenSettings,      active: activeTab === "settings" },
    ...(isAdmin ? [{ icon: "🔐", label: "Admin", action: onOpenAdmin ?? (() => {}), active: activeTab === "admin" }] : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 sm:hidden glass"
      style={{
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Điều hướng chính"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 min-w-[52px]"
            style={{
              color: item.label === "Admin"
                ? (item.active ? "var(--color-shopee)" : "rgba(251,146,60,0.7)")
                : (item.active ? "var(--color-accent-blue)" : "var(--color-muted)"),
              background: item.label === "Admin"
                ? (item.active ? "rgba(251,146,60,0.12)" : "transparent")
                : (item.active ? "rgba(59,130,246,0.08)" : "transparent"),
            }}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span
                className="absolute top-0.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: "var(--color-accent-red)", color: "#fff" }}
              >
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
