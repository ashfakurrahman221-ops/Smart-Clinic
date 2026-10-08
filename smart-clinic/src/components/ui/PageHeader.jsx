import React from "react";

/**
 * Standard PageHeader Primitive
 *
 * Provides a standardized header region across all dashboards and views.
 * Handles long titles (Bangla/English), contextual badges, breadcrumbs,
 * and responsive action wrapping.
 *
 * @param {string|React.ReactNode} title - Page title
 * @param {string|React.ReactNode} subtitle - Supporting description or context
 * @param {React.ReactNode} actions - Action buttons or controls
 * @param {React.ReactNode} breadcrumbs - Optional breadcrumb or parent navigation
 * @param {React.ReactNode} badge - Optional status badge or pill next to title
 * @param {string} className - Optional container CSS overrides
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  badge,
  className = "",
}) {
  return (
    <header className={`space-y-2 mb-6 ${className}`}>
      {/* Optional Breadcrumb / Parent Context */}
      {breadcrumbs && (
        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
          {breadcrumbs}
        </div>
      )}

      {/* Main Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Title Block */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight break-words">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed break-words max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
