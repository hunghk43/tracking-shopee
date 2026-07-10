"use client";

interface CTAButton {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

interface Props {
  illustration?: string;       // emoji or string
  headline: string;
  subtext?: string;
  cta?: CTAButton;
  secondaryCta?: CTAButton;
  className?: string;
}

export default function EmptyState({
  illustration = "📦",
  headline,
  subtext,
  cta,
  secondaryCta,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 px-4 fade-in ${className}`}
      role="status"
      aria-label={headline}
    >
      <div className="text-5xl mb-4 select-none" aria-hidden="true">
        {illustration}
      </div>
      <h3
        className="text-base font-semibold mb-1"
        style={{ color: "var(--color-secondary)" }}
      >
        {headline}
      </h3>
      {subtext && (
        <p
          className="text-sm max-w-xs leading-relaxed mb-6"
          style={{ color: "var(--color-muted)" }}
        >
          {subtext}
        </p>
      )}
      {(cta || secondaryCta) && (
        <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
          {cta && (
            <button
              onClick={cta.onClick}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
              style={
                cta.variant === "secondary"
                  ? {
                      background: "transparent",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-secondary)",
                    }
                  : {
                      background: "var(--color-accent-blue)",
                      color: "#fff",
                      boxShadow: "0 0 16px rgba(59,130,246,0.3)",
                    }
              }
            >
              {cta.label}
            </button>
          )}
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="px-5 py-2 rounded-xl text-sm transition-all duration-200 hover:opacity-80"
              style={{
                background: "transparent",
                border: "1px solid var(--color-border)",
                color: "var(--color-muted)",
              }}
            >
              {secondaryCta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
