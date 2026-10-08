import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  AlertTriangle,
  PauseCircle,
  Moon,
  Activity,
  MapPin,
  Pause,
  StopCircle,
  CalendarCheck,
  Clock,
  FastForward,
  CheckCircle2,
  SkipForward,
  XCircle,
  WifiOff,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

/**
 * Smart Clinic Standard Status Contract Definitions
 *
 * NOTE:
 * - SKIP_SERIAL is SKIP only (never hold).
 * - HELD exists ONLY via the emergency interruption workflow (ADMIT_EMERGENCY -> held -> RESUME_HELD).
 * - Backend enum values are strictly preserved.
 */
const STATUS_CONFIGS = {
  // 1. Emergency (Top Priority)
  EMERGENCY: {
    label: "Emergency",
    labelBn: "জরুরি",
    bg: "bg-rose-50 border-rose-300 text-rose-800",
    badge: "bg-rose-600 text-white font-black",
    icon: AlertTriangle,
    pulse: true,
  },
  // 2. Held Patient (Emergency interruption only)
  HELD: {
    label: "On Hold",
    labelBn: "স্থগিত (জরুরি কারণে)",
    bg: "bg-amber-50 border-amber-300 text-amber-900",
    badge: "bg-amber-500 text-slate-950 font-bold",
    icon: PauseCircle,
    pulse: false,
  },
  // 3. Prayer Break
  PRAYER_BREAK: {
    label: "Prayer Break",
    labelBn: "নামাজের বিরতি",
    bg: "bg-amber-50 border-amber-200 text-amber-800",
    badge: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
    icon: Moon,
    pulse: false,
  },
  // 4. In Chamber / Active Consulting
  IN_CHAMBER: {
    label: "In Chamber",
    labelBn: "রোগী দেখা হচ্ছে",
    bg: "bg-emerald-50 border-emerald-300 text-emerald-800",
    badge: "bg-emerald-600 text-white font-bold",
    icon: Activity,
    pulse: true,
  },
  ACTIVE: {
    label: "Active",
    labelBn: "সক্রিয়",
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-500 text-white font-bold",
    icon: Activity,
    pulse: true,
  },
  // 5. In Transit
  IN_TRANSIT: {
    label: "In Transit",
    labelBn: "ডাক্তার পথে আছেন",
    bg: "bg-amber-50 border-amber-200 text-amber-800",
    badge: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
    icon: MapPin,
    pulse: false,
  },
  // 6. Paused
  PAUSED: {
    label: "Paused",
    labelBn: "বিরতি",
    bg: "bg-slate-100 border-slate-300 text-slate-700",
    badge: "bg-slate-200 text-slate-700 font-medium",
    icon: Pause,
    pulse: false,
  },
  // 7. Ended
  ENDED: {
    label: "Session Ended",
    labelBn: "চেম্বার শেষ",
    bg: "bg-slate-100 border-slate-300 text-slate-600",
    badge: "bg-slate-700 text-white font-semibold",
    icon: StopCircle,
    pulse: false,
  },
  // 7b. Not Started
  NOT_STARTED: {
    label: "Not Started",
    labelBn: "শুরু হয়নি",
    bg: "bg-slate-100 border-slate-200 text-slate-600",
    badge: "bg-slate-100 text-slate-600 font-medium border-slate-200",
    icon: Clock,
    pulse: false,
  },
  // 8. Confirmed
  CONFIRMED: {
    label: "Confirmed",
    labelBn: "নিশ্চিত",
    bg: "bg-emerald-50/70 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
    icon: CalendarCheck,
    pulse: false,
  },
  // 9. Waiting in Lobby
  WAITING: {
    label: "Waiting",
    labelBn: "অপেক্ষমান",
    bg: "bg-indigo-50/70 border-indigo-200 text-indigo-700",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold",
    icon: Clock,
    pulse: false,
  },
  // 10. Next Calling
  NEXT: {
    label: "Next",
    labelBn: "পরবর্তী",
    bg: "bg-indigo-100 border-indigo-300 text-indigo-900",
    badge: "bg-[#283891] text-white font-bold",
    icon: FastForward,
    pulse: false,
  },
  // 11. Completed
  COMPLETED: {
    label: "Completed",
    labelBn: "সম্পন্ন",
    bg: "bg-slate-50 border-slate-200 text-slate-600",
    badge: "bg-slate-100 text-slate-600 font-medium border-slate-200",
    icon: CheckCircle2,
    pulse: false,
  },
  // 12. Skipped (SKIP ONLY — NOT HOLD)
  SKIPPED: {
    label: "Skipped",
    labelBn: "স্কিপ করা",
    bg: "bg-amber-50/60 border-amber-200 text-amber-800",
    badge: "bg-amber-50 text-amber-800 border-amber-200 font-medium",
    icon: SkipForward,
    pulse: false,
  },
  // 13. Pending
  PENDING: {
    label: "Pending",
    labelBn: "অপেক্ষমাণ",
    bg: "bg-amber-50/70 border-amber-200 text-amber-800",
    badge: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
    icon: Clock,
    pulse: false,
  },
  // 14. Cancelled
  CANCELLED: {
    label: "Cancelled",
    labelBn: "বাতিল",
    bg: "bg-rose-50/50 border-rose-200 text-rose-700",
    badge: "bg-rose-50 text-rose-700 border-rose-200 font-medium",
    icon: XCircle,
    pulse: false,
  },
  // 15. Offline / Inactive
  OFFLINE: {
    label: "Offline",
    labelBn: "অফলাইন",
    bg: "bg-slate-50 border-slate-200 text-slate-400",
    badge: "bg-slate-100 text-slate-500 font-normal",
    icon: WifiOff,
    pulse: false,
  },
  // Account/Facility Verification Statuses
  VERIFIED: {
    label: "Verified",
    labelBn: "যাচাইকৃত",
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
    icon: ShieldCheck,
    pulse: false,
  },
  REJECTED: {
    label: "Rejected",
    labelBn: "প্রত্যাখ্যাত",
    bg: "bg-rose-50 border-rose-200 text-rose-700",
    badge: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
    icon: XCircle,
    pulse: false,
  },
};

const SIZE_STYLES = {
  xs: {
    container: "text-[10px] px-1.5 py-0.5 gap-1",
    icon: 10,
    dot: "w-1 h-1",
  },
  sm: {
    container: "text-[11px] px-2 py-0.5 gap-1.5",
    icon: 12,
    dot: "w-1.5 h-1.5",
  },
  md: {
    container: "text-xs px-2.5 py-1 gap-1.5",
    icon: 13,
    dot: "w-1.5 h-1.5",
  },
  lg: {
    container: "text-sm px-3 py-1.5 gap-2",
    icon: 15,
    dot: "w-2 h-2",
  },
};

/**
 * Standard StatusBadge Component
 *
 * @param {string} status - Canonical status string (case-insensitive)
 * @param {'xs'|'sm'|'md'|'lg'} size - Badge size
 * @param {boolean} pulse - Explicit pulse override (defaults to status-defined)
 * @param {boolean} showIcon - Whether to display the icon
 * @param {string} customLabel - Custom text override
 * @param {'en'|'bn'} lang - Language variant ('en' by default)
 * @param {string} className - Additional CSS classes
 */
export default function StatusBadge({
  status,
  size = "sm",
  pulse,
  showIcon = true,
  customLabel,
  lang,
  className = "",
}) {
  const langContext = useLanguage ? useLanguage() : null;
  const activeLang = lang || langContext?.language || "en";
  const normalizedKey = typeof status === "string" ? status.trim().toUpperCase() : "";
  const config = STATUS_CONFIGS[normalizedKey];
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  // Graceful fallback for unknown, null, or undefined status
  if (!config) {
    const rawFallback = customLabel || status || "Unknown";
    const fallbackText =
      typeof rawFallback === "string"
        ? rawFallback
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : rawFallback;
    return (
      <span
        className={`inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-medium ${sizeStyle.container} ${className}`}
        title={`Status: ${fallbackText}`}
      >
        {showIcon && <HelpCircle size={sizeStyle.icon} className="shrink-0 text-slate-400" />}
        <span className="truncate">{fallbackText}</span>
      </span>
    );
  }

  const IconComponent = config.icon;
  const isPulsing = pulse !== undefined ? pulse : config.pulse;
  const labelText = customLabel || (activeLang === "bn" ? config.labelBn : config.label);

  return (
    <span
      className={`inline-flex items-center rounded-lg border transition-colors ${config.bg} ${sizeStyle.container} ${className}`}
      title={`Status: ${labelText}`}
    >
      {isPulsing && (
        <span className="relative flex shrink-0">
          <span
            className={`motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              normalizedKey === "EMERGENCY" ? "bg-rose-500" : "bg-emerald-500"
            }`}
          />
          <span
            className={`relative inline-flex rounded-full ${sizeStyle.dot} ${
              normalizedKey === "EMERGENCY" ? "bg-rose-600" : "bg-emerald-600"
            }`}
          />
        </span>
      )}
      {showIcon && !isPulsing && IconComponent && (
        <IconComponent size={sizeStyle.icon} className="shrink-0" />
      )}
      <span className="font-semibold tracking-tight truncate">{labelText}</span>
    </span>
  );
}

export { STATUS_CONFIGS };
