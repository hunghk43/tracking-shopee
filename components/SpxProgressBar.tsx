"use client";

// milestone_code từ API SPX:
// 1 = Preparing to ship
// 2 = Picked up (đang lấy)
// 3 = Picked up thành công
// 4 = Sorting (phân loại)
// 5 = In transit (đang vận chuyển)
// 6 = At delivery station (đến trạm giao)
// 7 = Out for delivery (đang giao)
// 8 = Delivered (đã giao)
// -1 = Cancelled
// 9 = Return to sender

const STEPS = [
  { milestone: 1, label: "Tạo đơn",   icon: "📋" },
  { milestone: 3, label: "Lấy hàng",  icon: "🏪" },
  { milestone: 5, label: "Phân loại", icon: "🔄" },
  { milestone: 7, label: "Đang giao", icon: "🚚" },
  { milestone: 8, label: "Đã giao",   icon: "✅" },
];

function getStepIndex(milestoneCode: number): number {
  if (milestoneCode >= 8) return 4;
  if (milestoneCode >= 7) return 3;
  if (milestoneCode >= 5) return 2;
  if (milestoneCode >= 3) return 1;
  return 0;
}

interface Props {
  milestoneCode: number;
  isCancelled?: boolean;
}

export default function SpxProgressBar({ milestoneCode, isCancelled }: Props) {
  /* ── Special states ─────────────────────────────────────────── */
  if (isCancelled || milestoneCode === -1) {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-2"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <span className="text-lg">❌</span>
        <span className="text-sm font-medium" style={{ color: "var(--color-accent-red)" }}>
          Đơn hàng đã bị hủy
        </span>
      </div>
    );
  }

  if (milestoneCode === 9) {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-2"
        style={{
          background: "rgba(249,115,22,0.08)",
          border: "1px solid rgba(249,115,22,0.2)",
        }}
      >
        <span className="text-lg">↩️</span>
        <span className="text-sm font-medium" style={{ color: "var(--color-accent-orange)" }}>
          Đang hoàn hàng về người gửi
        </span>
      </div>
    );
  }

  const currentStep = getStepIndex(milestoneCode);
  const isDelivered = milestoneCode >= 8;
  const fillPct = Math.min(100, (currentStep / (STEPS.length - 1)) * 100);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="text-xs font-semibold mb-4" style={{ color: "var(--color-muted)" }}>
        📍 Tiến trình đơn hàng
      </div>

      <div className="relative flex items-start justify-between">
        {/* Background connecting line */}
        <div
          className="absolute h-0.5 top-4 left-4 right-4 rounded-full"
          style={{ background: "var(--color-border)" }}
        />

        {/* Filled connecting line — animated via CSS */}
        <div
          className="absolute h-0.5 top-4 left-4 rounded-full spx-line-fill"
          style={{
            background: isDelivered
              ? "var(--color-accent-green)"
              : `linear-gradient(to right, var(--color-accent-blue), var(--color-accent-cyan))`,
            ["--fill-width" as string]: `calc(${fillPct}% - 0px)`,
            right: "auto",
          }}
        />

        {STEPS.map((step, idx) => {
          const done = idx < currentStep;
          const active = idx === currentStep;
          const pending = idx > currentStep;

          let circleStyle: React.CSSProperties;
          let circleContent: string;

          if (done || (active && isDelivered)) {
            circleStyle = {
              background: "var(--color-accent-green)",
              border: "2px solid var(--color-accent-green)",
              color: "#fff",
            };
            circleContent = "✓";
          } else if (active) {
            circleStyle = {
              background: "var(--color-accent-blue)",
              border: "2px solid var(--color-accent-blue)",
              color: "#fff",
            };
            circleContent = step.icon;
          } else {
            circleStyle = {
              background: "var(--color-card)",
              border: `2px solid ${pending ? "rgba(148,163,184,0.2)" : "var(--color-border)"}`,
              color: "var(--color-muted)",
              opacity: 0.5,
            };
            circleContent = step.icon;
          }

          return (
            <div
              key={step.milestone}
              className="relative flex flex-col items-center gap-2 z-10 flex-1"
            >
              {/* Pulse ring for active step */}
              {active && !isDelivered && (
                <div
                  className="absolute top-0 w-8 h-8 rounded-full pulse-ring"
                  style={{
                    background: "transparent",
                    border: `2px solid var(--color-accent-blue)`,
                    opacity: 0.5,
                  }}
                />
              )}

              {/* Step circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={circleStyle}
              >
                {circleContent}
              </div>

              {/* Step label */}
              <span
                className="text-xs text-center leading-tight"
                style={{
                  color: done || active
                    ? isDelivered ? "var(--color-accent-green)" : "var(--color-accent-blue)"
                    : "var(--color-muted)",
                  fontWeight: active ? 600 : 400,
                  opacity: pending ? 0.5 : 1,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
