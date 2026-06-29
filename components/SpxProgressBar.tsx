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
  if (isCancelled || milestoneCode === -1) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
        <span className="text-lg">❌</span>
        <span className="text-sm text-red-400 font-medium">Đơn hàng đã bị hủy</span>
      </div>
    );
  }

  if (milestoneCode === 9) {
    return (
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
        <span className="text-lg">↩️</span>
        <span className="text-sm text-orange-400 font-medium">Đang hoàn hàng về người gửi</span>
      </div>
    );
  }

  const currentStep = getStepIndex(milestoneCode);
  const isDelivered = milestoneCode >= 8;

  return (
    <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
      <div className="text-xs text-slate-400 mb-3 font-medium">📍 Tiến trình đơn hàng</div>

      {/* Steps */}
      <div className="relative flex items-start justify-between">
        {/* Connecting line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-700">
          <div
            className={`h-full transition-all duration-500 ${isDelivered ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${Math.min(100, (currentStep / (STEPS.length - 1)) * 100)}%` }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;
          const isPending = idx > currentStep;

          return (
            <div key={step.milestone} className="flex flex-col items-center gap-1.5 z-10 flex-1">
              {/* Circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                isDone
                  ? "bg-green-500 border-green-500 text-white"
                  : isActive
                    ? isDelivered
                      ? "bg-green-500 border-green-500 text-white"
                      : "bg-blue-500 border-blue-500 text-white ring-4 ring-blue-500/20"
                    : "bg-slate-800 border-slate-600 text-slate-600"
              }`}>
                {isDone || (isActive && isDelivered) ? "✓" : isActive ? step.icon : step.icon}
              </div>

              {/* Label */}
              <span className={`text-xs text-center leading-tight ${
                isDone || isActive
                  ? isDelivered ? "text-green-400 font-medium" : "text-blue-400 font-medium"
                  : "text-slate-600"
              } ${isPending ? "opacity-50" : ""}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
