import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const ACCENT_STYLES = {
  primary: {
    iconBg: "bg-indigo-50 text-[#283891] border-indigo-100",
    valueText: "text-[#283891]",
    bar: "bg-[#283891]",
  },
  success: {
    iconBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
    valueText: "text-emerald-700",
    bar: "bg-emerald-600",
  },
  warning: {
    iconBg: "bg-amber-50 text-amber-800 border-amber-100",
    valueText: "text-amber-800",
    bar: "bg-amber-500",
  },
  danger: {
    iconBg: "bg-rose-50 text-rose-700 border-rose-100",
    valueText: "text-rose-700",
    bar: "bg-rose-600",
  },
  neutral: {
    iconBg: "bg-slate-100 text-slate-700 border-slate-200",
    valueText: "text-slate-900",
    bar: "bg-slate-300",
  },
};

/**
 * Standard MetricCard Primitive
 *
 * Designed for admin and operational KPI displays.
 * Clean, restrained, high-readability.
 *
 * @param {string} label - Metric label / description
 * @param {string|number} value - Metric value (supports 0, formatted strings, ৳, Bangla)
 * @param {string} subtext - Supporting contextual text
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {'primary'|'success'|'warning'|'danger'|'neutral'} accent - Visual accent tier
 * @param {{ direction: 'up'|'down', value: string }} trend - Optional trend indicator
 * @param {function} onClick - Optional click handler (makes card interactive)
 * @param {string} className - Optional additional CSS classes
 */
export default function MetricCard({
  label,
  value,
  subtext,
  icon: IconComponent,
  accent = "neutral",
  trend,
  onClick,
  className = "",
}) {
  const accentTheme = ACCENT_STYLES[accent] || ACCENT_STYLES.neutral;
  const isInteractive = typeof onClick === "function";

  // Clean value formatting — preserve 0, handle null/undefined gracefully
  const displayValue =
    value !== null && value !== undefined && value !== "" ? value : "—";

  return (
    <div
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={`relative bg-white border border-slate-200 rounded-2xl p-5 shadow-xs transition-all overflow-hidden flex flex-col justify-between ${
        isInteractive
          ? "cursor-pointer hover:border-slate-300 hover:shadow-sm active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#283891]/20"
          : ""
      } ${className}`}
    >
      {/* Top accent hairline */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${accentTheme.bar}`}
        aria-hidden="true"
      />

      {/* Header: Label + Icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide break-words line-clamp-2">
          {label}
        </span>
        {IconComponent && (
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${accentTheme.iconBg}`}
            aria-hidden="true"
          >
            <IconComponent size={18} />
          </div>
        )}
      </div>

      {/* Value & Trend */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight break-all ${accentTheme.valueText}`}
          >
            {displayValue}
          </span>
          {trend && trend.value && (
            <span
              className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md ${
                trend.direction === "up"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight size={13} className="mr-0.5" />
              ) : (
                <ArrowDownRight size={13} className="mr-0.5" />
              )}
              {trend.value}
            </span>
          )}
        </div>

        {/* Subtext */}
        {subtext && (
          <p className="text-xs text-slate-500 font-medium truncate" title={subtext}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
