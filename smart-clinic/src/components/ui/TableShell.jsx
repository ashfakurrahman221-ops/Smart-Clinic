import React from "react";
import { Loader2, Inbox } from "lucide-react";

/**
 * Standard TableShell Primitive
 *
 * Provides a standardized operational wrapper for data tables.
 * Encapsulates the header bar, actions, loading state, empty state,
 * responsive horizontal overflow, and footer/pagination.
 *
 * @param {string|React.ReactNode} title - Table section title
 * @param {string|React.ReactNode} subtitle - Optional description
 * @param {React.ReactNode} badge - Optional badge / tally
 * @param {React.ReactNode} actions - Search inputs, filters, action buttons
 * @param {Array<string|React.ReactNode>} headers - Optional standard table header columns
 * @param {React.ReactNode} children - Table body rows or custom cards
 * @param {boolean} loading - Displays loading indicator
 * @param {boolean} empty - Renders empty state when true
 * @param {string} emptyMessage - Custom empty message text
 * @param {React.ReactNode} emptyState - Custom empty state component
 * @param {React.ReactNode} footer - Optional footer / pagination bar
 * @param {string} className - Optional outer container CSS classes
 */
export default function TableShell({
  title,
  subtitle,
  badge,
  actions,
  headers,
  children,
  loading = false,
  empty = false,
  emptyMessage = "No records found",
  emptyState,
  footer,
  className = "",
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col ${className}`}
    >
      {/* Header Bar (if title or actions exist) */}
      {(title || actions) && (
        <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {title && (
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
            )}
            {badge && <div>{badge}</div>}
            {subtitle && (
              <span className="text-xs text-slate-500 font-normal hidden md:inline">
                • {subtitle}
              </span>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="overflow-x-auto relative min-h-[140px] flex-1">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2
              size={24}
              className="animate-spin text-[#283891] mb-2"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-slate-500">
              Loading operational data...
            </span>
          </div>
        ) : empty ? (
          emptyState || (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <Inbox
                size={32}
                className="text-slate-300 mb-2"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-slate-600">
                {emptyMessage}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                New records will appear here as they are processed.
              </p>
            </div>
          )
        ) : headers && headers.length > 0 ? (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 tracking-wider">
                {headers.map((col, idx) => (
                  <th key={idx} className="py-2.5 px-4 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          </table>
        ) : (
          children
        )}
      </div>

      {/* Footer / Pagination */}
      {footer && (
        <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/50 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}
