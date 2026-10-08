import React from "react";
import { Loader2 } from "lucide-react";

const VARIANT_STYLES = {
  // Correction 2: Primary operational action uses the Smart Clinic #283891 indigo brand treatment
  primary:
    "bg-[#283891] hover:bg-[#1f2c7a] text-white border border-[#283891] shadow-2xs focus:ring-[#283891]/30",
  secondary:
    "bg-indigo-50/70 hover:bg-indigo-100 text-[#283891] border border-indigo-200 focus:ring-[#283891]/20",
  outline:
    "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs focus:ring-slate-300",
  ghost:
    "bg-transparent hover:bg-slate-100 text-slate-700 border-transparent focus:ring-slate-200",
  success:
    "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-2xs focus:ring-emerald-500/30",
  danger:
    "bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-2xs focus:ring-rose-500/30",
  warning:
    "bg-amber-500 hover:bg-amber-600 text-white border border-amber-500 shadow-2xs focus:ring-amber-500/30",
};

const SIZE_STYLES = {
  xs: "text-[11px] px-2.5 py-1 rounded-lg gap-1",
  sm: "text-xs px-3 py-1.5 rounded-xl gap-1.5",
  md: "text-xs sm:text-sm px-4 py-2.5 rounded-xl gap-2 font-bold",
  lg: "text-sm sm:text-base px-5 py-3 rounded-xl gap-2 font-extrabold",
};

/**
 * Standard ActionButton Primitive
 *
 * Enforces Smart Clinic button hierarchy:
 * - 'primary' strictly uses the #283891 brand color (NOT green).
 * - 'success' (emerald) is reserved for confirmations / check-in / cash collection.
 * - 'danger' (rose) for emergency / cancellations / deletions.
 *
 * @param {'primary'|'secondary'|'outline'|'ghost'|'success'|'danger'|'warning'} variant
 * @param {'xs'|'sm'|'md'|'lg'} size
 * @param {boolean} loading
 * @param {boolean} disabled
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {'left'|'right'} iconPosition
 * @param {React.ReactNode} children
 */
export default function ActionButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: IconComponent,
  iconPosition = "left",
  children,
  className = "",
  type = "button",
  ...props
}) {
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold transition-all select-none focus:outline-none focus:ring-2 active:scale-[0.99] ${
        isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
      } ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />
      ) : (
        IconComponent &&
        iconPosition === "left" && (
          <IconComponent size={14} className="shrink-0" aria-hidden="true" />
        )
      )}
      {children && <span>{children}</span>}
      {!loading && IconComponent && iconPosition === "right" && (
        <IconComponent size={14} className="shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}
