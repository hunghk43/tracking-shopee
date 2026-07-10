"use client";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 slide-in-up sm:fade-in-scale"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 id="delete-modal-title" className="text-lg font-bold mb-2" style={{ color: "var(--color-primary)" }}>
            {title}
          </h3>
          <p className="text-sm mb-3" style={{ color: "var(--color-secondary)" }}>{message}</p>
          <p className="text-xs mb-6" style={{ color: "var(--color-accent-red)" }}>Hành động này không thể hoàn tác!</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "var(--color-accent-red)", color: "#fff" }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "🗑 Xoá"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
