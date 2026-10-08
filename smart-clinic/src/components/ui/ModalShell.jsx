import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

/**
 * Standard ModalShell Primitive
 *
 * Provides a reliable, accessible modal overlay.
 * Supports keyboard Escape dismiss, background click dismiss,
 * scroll containment for long forms, and mobile safe boundaries.
 *
 * @param {boolean} isOpen - Visibility state
 * @param {function} onClose - Dismiss handler
 * @param {string|React.ReactNode} title - Modal title
 * @param {string|React.ReactNode} subtitle - Optional description below title
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'} size - Max width sizing
 * @param {React.ReactNode} children - Modal content body
 * @param {React.ReactNode} footer - Action buttons at base
 * @param {boolean} closeOnOverlay - Allow dismissing by clicking backdrop
 * @param {string} className - Optional modal panel CSS overrides
 */
export default function ModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  footer,
  closeOnOverlay = true,
  className = "",
}) {
  const panelRef = useRef(null);

  // Keyboard accessibility — Dismiss on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-shell-title" : undefined}
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`bg-white border border-slate-200 rounded-2xl shadow-xl w-full ${sizeClass} max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${className}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
          <div className="space-y-0.5 min-w-0 pr-2">
            {title && (
              <h2
                id="modal-shell-title"
                className="text-base font-bold text-slate-900 tracking-tight break-words"
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 font-normal leading-relaxed break-words">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-[#283891]/20"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
          {children}
        </div>

        {/* Footer Actions */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
