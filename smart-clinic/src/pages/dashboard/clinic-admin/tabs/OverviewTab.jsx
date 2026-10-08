import React from "react";
import {
  Stethoscope,
  Activity,
  DollarSign,
  Calendar,
  TrendingUp,
  UserPlus,
  Tv,
  Printer,
  AlertTriangle,
  Send,
  CheckCircle2,
  LineChart,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ArrowRight,
  Users,
  Building,
  Check,
} from "lucide-react";
import {
  MetricCard,
  TableShell,
  StatusBadge,
  ActionButton,
} from "../../../../components/ui";

/**
 * OverviewTab — Clinic Admin Operational Command Center
 *
 * Implements UI-2 specifications:
 * - 4 core KPI cards (MetricCard) mapped to authentic overviewStats
 * - Quick reception actions strip
 * - Today's Live Chambers section with deep-link into chamber reception desk
 * - 5:7 split: Today's queue breakdown & action required alerts (left),
 *             SVG 7d/30d trend chart with line/bar modes (right)
 * - Today's appointment preview table (TableShell) with real data
 *
 * ZERO mock data. Authentic backend contract strictly preserved.
 */
export default function OverviewTab({
  clinic,
  overviewStats,
  loadingOverviewStats,
  assignedDoctors = [],
  appointments = [],
  pendingIncomingRequests = [],
  overviewTrendRange = "30d",
  setOverviewTrendRange,
  trendChartType = "line",
  setTrendChartType,
  hoveredTrendIdx,
  setHoveredTrendIdx,
  setActiveTab,
  setWalkInForm,
  setWalkInModalOpen,
  selectedDoctorId,
  setSelectedDoctorId,
  openDoctorCard,
  language = "en",
  t = (k) => k,
}) {
  // Today's date calculations
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayApts = appointments.filter(
    (a) => a.appointment_date === todayDateStr
  );

  // Authentic stats fallback
  const totalBookedToday =
    overviewStats?.appointments?.total_today ?? todayApts.length;
  const completedToday =
    overviewStats?.appointments?.completed ??
    todayApts.filter((a) => a.status === "COMPLETED").length;
  const confirmedToday =
    overviewStats?.appointments?.confirmed_upcoming ??
    todayApts.filter((a) => a.status === "CONFIRMED").length;
  const pendingToday =
    overviewStats?.appointments?.pending ??
    todayApts.filter((a) => a.status === "PENDING").length;
  const cancelledToday =
    overviewStats?.appointments?.cancelled ??
    todayApts.filter((a) => a.status === "CANCELLED").length;

  const activeDoctorsCount =
    overviewStats?.doctors?.active ?? assignedDoctors.length;
  const workingTodayCount = overviewStats?.doctors?.working_today ?? 0;
  const pendingDocRequests =
    overviewStats?.doctors?.pending_requests ?? pendingIncomingRequests.length;

  const revenueTotal = overviewStats?.financial_snapshot?.today_total ?? 0;
  const revenueCash = overviewStats?.financial_snapshot?.today_cash ?? 0;
  const revenueDigital = overviewStats?.financial_snapshot?.today_digital ?? 0;

  const liveChambers = overviewStats?.live_chambers || [];

  return (
    <div className="space-y-6">
      {/* Loading Indicator */}
      {loadingOverviewStats && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-[#283891] font-medium animate-pulse">
          <div className="w-4 h-4 border-2 border-[#283891] border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Refreshing clinic operational telemetry...</span>
        </div>
      )}

      {/* ── 1. CORE OPERATIONAL KPIS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Appointments"
          value={totalBookedToday}
          subtext={`${completedToday} completed • ${pendingToday} pending`}
          icon={Calendar}
          accent="primary"
          onClick={() => setActiveTab("appointments")}
        />

        <MetricCard
          label="Chambers on Duty"
          value={workingTodayCount}
          subtext={`${activeDoctorsCount} active registered doctors`}
          icon={Stethoscope}
          accent="success"
          onClick={() => setActiveTab("chamber")}
        />

        <MetricCard
          label="Counter Collections"
          value={`৳${revenueTotal.toLocaleString("en-BD")}`}
          subtext={`৳${revenueCash.toLocaleString("en-BD")} cash • ৳${revenueDigital.toLocaleString("en-BD")} digital`}
          icon={DollarSign}
          accent="primary"
          onClick={() => setActiveTab("finance")}
        />

        <MetricCard
          label="Pending Payments"
          value={pendingToday}
          subtext="Awaiting counter check-in or cash"
          icon={Activity}
          accent={pendingToday > 0 ? "warning" : "neutral"}
          onClick={() => setActiveTab("appointments")}
        />
      </div>

      {/* ── 2. QUICK RECEPTION ACTIONS STRIP ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("quickShortcuts") || "Reception Fast Actions"}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Front Desk Operations
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => {
              if (setWalkInForm) {
                setWalkInForm((prev) => ({
                  ...prev,
                  doctor_id:
                    selectedDoctorId || (assignedDoctors[0]?.id || ""),
                }));
              }
              if (setWalkInModalOpen) {
                setWalkInModalOpen(true);
              }
            }}
            className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80 text-[#283891] transition text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#283891] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <UserPlus size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900">
                {t("newWalkIn") || "New Walk-in"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Counter Registration
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chamber")}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Tv size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900">
                {t("waitingRoomTv") || "Waiting Room TV"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Live Token Display
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200/80 text-emerald-900 transition text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Printer size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900">
                {t("dailyCashAudit") || "Daily Cash Audit"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Counter Tally & Audit
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("doctors")}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#283891] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Stethoscope size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900">
                {t("inviteDoctor") || "Manage Doctors"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Roster & Chambers
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ── 3. TODAY'S LIVE CHAMBER OPERATIONS ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Activity size={16} className="text-[#283891]" />
              Today&apos;s Live Chamber Operations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time chamber session telemetry and doctor queue states
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-[#283891] border border-indigo-100">
              {liveChambers.length} Active Chamber{liveChambers.length === 1 ? "" : "s"}
            </span>
            <ActionButton
              variant="outline"
              size="xs"
              onClick={() => setActiveTab("chamber")}
            >
              Open Desk →
            </ActionButton>
          </div>
        </div>

        {liveChambers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveChambers.map((chamber) => (
              <div
                key={chamber.doctor_id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {chamber.doctor_name || "Doctor Chamber"}
                    </h4>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {chamber.specialization || "General Medicine"}
                      {chamber.room_number ? ` • Room ${chamber.room_number}` : ""}
                    </div>
                  </div>
                  <StatusBadge
                    status={chamber.session_status || "ACTIVE"}
                    size="xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/80 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">
                      Current
                    </div>
                    <div className="text-sm font-bold font-mono text-[#283891]">
                      #{chamber.current_serial || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">
                      Waiting
                    </div>
                    <div className="text-sm font-bold font-mono text-slate-700">
                      {chamber.waiting || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">
                      Booked
                    </div>
                    <div className="text-sm font-bold font-mono text-slate-700">
                      {chamber.total_serials || 0}
                    </div>
                  </div>
                </div>

                {chamber.delay_minutes > 0 && (
                  <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex items-center gap-1.5">
                    <Clock size={12} className="shrink-0" />
                    <span>+{chamber.delay_minutes} min running delay</span>
                  </div>
                )}

                <ActionButton
                  variant="secondary"
                  size="xs"
                  className="w-full"
                  onClick={() => {
                    if (setSelectedDoctorId) {
                      setSelectedDoctorId(chamber.doctor_id);
                    }
                    setActiveTab("chamber");
                  }}
                >
                  Manage Live Chamber →
                </ActionButton>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Stethoscope size={28} className="mx-auto text-slate-300 mb-2" />
            <h4 className="text-xs font-bold text-slate-700">
              No Doctor Chamber Sessions Running Right Now
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-md mx-auto">
              Chamber sessions will show here in real-time once a doctor or receptionist starts consulting.
            </p>
            <ActionButton
              variant="outline"
              size="xs"
              className="mt-3"
              onClick={() => setActiveTab("chamber")}
            >
              Go to Chamber Reception Desk →
            </ActionButton>
          </div>
        )}
      </div>

      {/* ── 4. 5:7 OPERATIONAL SPLIT: QUEUE BREAKDOWN & TREND CHART ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (5 cols): Today's Queue Breakdown & Operational Alerts */}
        <div className="lg:col-span-5 space-y-4">
          {/* Today's Queue Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#283891]" />
                Today&apos;s Queue Breakdown
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-600">
                  Total Booked (Today)
                </span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {totalBookedToday} Patients
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-slate-600">
                    Completed Visits
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-emerald-700">
                    {completedToday}
                  </span>
                  <StatusBadge status="COMPLETED" size="xs" showIcon={false} />
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="text-xs font-medium text-slate-600">
                    Confirmed in Lobby
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-sky-700">
                    {confirmedToday}
                  </span>
                  <StatusBadge status="CONFIRMED" size="xs" showIcon={false} />
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-slate-600">
                    Pending at Counter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-amber-800">
                    {pendingToday}
                  </span>
                  <StatusBadge status="PENDING" size="xs" showIcon={false} />
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-xs font-medium text-slate-600">
                    Cancelled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-rose-700">
                    {cancelledToday}
                  </span>
                  <StatusBadge status="CANCELLED" size="xs" showIcon={false} />
                </div>
              </div>
            </div>

            <ActionButton
              variant="outline"
              size="xs"
              className="w-full mt-2"
              onClick={() => setActiveTab("appointments")}
            >
              View All in Appointments Tab →
            </ActionButton>
          </div>

          {/* Operational Alerts / Action Required */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" />
                Action Required
              </span>
            </div>

            {pendingDocRequests > 0 ? (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/70">
                <Send size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-amber-900">
                    {pendingDocRequests} doctor request{pendingDocRequests > 1 ? "s" : ""} waiting for review
                  </div>
                  <div className="text-[11px] text-amber-700 mt-0.5">
                    Doctors cannot practice until their clinic affiliation is approved.
                  </div>
                </div>
                <ActionButton
                  variant="warning"
                  size="xs"
                  onClick={() => setActiveTab("doctors")}
                >
                  Review
                </ActionButton>
              </div>
            ) : activeDoctorsCount === 0 ? (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50/60">
                <Stethoscope size={15} className="text-[#283891] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">
                    No active doctors in clinic
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Invite doctors to begin scheduling appointments.
                  </div>
                </div>
                <ActionButton
                  variant="primary"
                  size="xs"
                  onClick={() => setActiveTab("doctors")}
                >
                  Invite
                </ActionButton>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Clinic Operations Normal
                  </div>
                  <div className="text-[11px] text-slate-500">
                    0 pending doctor requests • All doctors verified
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right (7 cols): Appointment Trend Graph */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          {(() => {
            const trendData = overviewStats?.appointment_trend || [];
            const data =
              overviewTrendRange === "7d" ? trendData.slice(-7) : trendData;
            const totalBookings = data.reduce(
              (s, d) => s + (d.total || 0),
              0
            );
            const totalCompleted = data.reduce(
              (s, d) => s + (d.completed || 0),
              0
            );
            const totalCancelled = data.reduce(
              (s, d) => s + (d.cancelled || 0),
              0
            );
            const completionRate =
              totalBookings > 0
                ? Math.round((totalCompleted / totalBookings) * 100)
                : 100;

            const parseDateInfo = (dStr) => {
              if (!dStr) {
                return {
                  day: "",
                  month: "",
                  fullDate: "",
                  formatted: "",
                  weekday: "",
                };
              }
              const parts = dStr.split("-");
              if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const dateObj = new Date(y, m, d);
                const monthShort = [
                  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                ];
                const monthFull = [
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December",
                ];
                const weekShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                return {
                  day: String(d).padStart(2, "0"),
                  dayNum: d,
                  weekday: weekShort[dateObj.getDay()] || "",
                  month: monthShort[m] || "",
                  monthFull: monthFull[m] || "",
                  year: parts[0],
                  formatted: `${d} ${monthShort[m] || ""}`,
                  fullDate: `${d} ${monthFull[m] || ""}, ${parts[0]}`,
                };
              }
              return {
                day: "",
                month: "",
                fullDate: dStr,
                formatted: dStr,
                weekday: "",
              };
            };

            const firstInfo =
              data.length > 0 ? parseDateInfo(data[0].date) : null;
            const lastInfo =
              data.length > 0
                ? parseDateInfo(data[data.length - 1].date)
                : null;
            const monthDisplayTitle = !firstInfo
              ? "Appointment Trends"
              : firstInfo.month === lastInfo?.month
              ? `${firstInfo.monthFull} ${firstInfo.year}`
              : `${firstInfo.monthFull} – ${lastInfo?.monthFull} ${lastInfo?.year}`;

            const half = Math.floor(data.length / 2);
            const firstHalfTotal = data
              .slice(0, half)
              .reduce((s, d) => s + (d.total || 0), 0);
            const secondHalfTotal = data
              .slice(half)
              .reduce((s, d) => s + (d.total || 0), 0);
            const trendDiff = secondHalfTotal - firstHalfTotal;
            const trendPct =
              firstHalfTotal > 0
                ? Math.round((Math.abs(trendDiff) / firstHalfTotal) * 100)
                : secondHalfTotal > 0
                ? 100
                : 0;
            const isUpTrend = trendDiff >= 0;

            let peakMax = 0;
            let peakDateStr = "";
            data.forEach((d) => {
              if ((d.total || 0) > peakMax) {
                peakMax = d.total || 0;
                peakDateStr = d.date;
              }
            });

            const peakCount = Math.max(
              ...data.map((d) => d.total || 0),
              0
            );
            const yMax =
              peakCount <= 4 ? 6 : Math.ceil(peakCount / 4) * 4;
            const yTicks = [
              yMax,
              Math.round(yMax * 0.75),
              Math.round(yMax * 0.5),
              Math.round(yMax * 0.25),
              0,
            ];

            const svgW = 680;
            const svgH = 190;
            const padL = 36;
            const padR = 24;
            const padT = 20;
            const padB = 34;
            const plotW = svgW - padL - padR;
            const plotH = svgH - padT - padB;
            const baseLineY = padT + plotH;
            const nPts = data.length;

            const points = data.map((d, i) => {
              const x =
                padL + (nPts > 1 ? (i / (nPts - 1)) * plotW : plotW / 2);
              const ratio = Math.min((d.total || 0) / yMax, 1);
              const y = padT + plotH - ratio * plotH;
              return { x, y, data: d, idx: i };
            });

            const compPoints = data.map((d, i) => {
              const x =
                padL + (nPts > 1 ? (i / (nPts - 1)) * plotW : plotW / 2);
              const ratio = Math.min((d.completed || 0) / yMax, 1);
              const y = padT + plotH - ratio * plotH;
              return { x, y, val: d.completed || 0 };
            });

            const buildSmoothPath = (pts) => {
              if (!pts || pts.length === 0) return "";
              if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
              let str = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
              for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[i === 0 ? 0 : i - 1];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

                const cp1x = p1.x + (p2.x - p0.x) * 0.18;
                const cp1y = p1.y + (p2.y - p0.y) * 0.18;
                const cp2x = p2.x - (p3.x - p1.x) * 0.18;
                const cp2y = p2.y - (p3.y - p1.y) * 0.18;

                str += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
              }
              return str;
            };

            const linePath = buildSmoothPath(points);
            const areaPath =
              points.length > 1
                ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseLineY} L ${points[0].x.toFixed(1)} ${baseLineY} Z`
                : "";
            const compLinePath = buildSmoothPath(compPoints);

            const xTickIndices =
              overviewTrendRange === "7d"
                ? [0, 1, 2, 3, 4, 5, 6].filter((idx) => idx < nPts)
                : [
                    0,
                    Math.floor((nPts - 1) * 0.2),
                    Math.floor((nPts - 1) * 0.4),
                    Math.floor((nPts - 1) * 0.6),
                    Math.floor((nPts - 1) * 0.8),
                    nPts - 1,
                  ];

            const activeHoverPoint =
              hoveredTrendIdx !== null && points[hoveredTrendIdx]
                ? points[hoveredTrendIdx]
                : null;

            return (
              <div className="space-y-4">
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <TrendingUp size={16} className="text-[#283891]" />
                        Appointment Flow &amp; Trends
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-[#283891] border border-indigo-100">
                        {monthDisplayTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>
                        {overviewTrendRange === "7d"
                          ? "Daily trajectory for current week"
                          : "30-day comprehensive volume"}
                      </span>
                      {totalBookings > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-1.5 py-0.5 rounded-md ${
                            isUpTrend
                              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                              : "text-rose-700 bg-rose-50 border border-rose-200"
                          }`}
                        >
                          {isUpTrend ? (
                            <ArrowUpRight size={12} className="stroke-[3]" />
                          ) : (
                            <ArrowDownRight size={12} className="stroke-[3]" />
                          )}
                          {isUpTrend
                            ? `+${trendPct}% Rise`
                            : `-${trendPct}% Fall`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Range and Chart Type Selectors */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setTrendChartType("line")}
                        className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                          trendChartType === "line"
                            ? "bg-white text-[#283891] shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <LineChart size={13} /> Line
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendChartType("bar")}
                        className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                          trendChartType === "bar"
                            ? "bg-white text-[#283891] shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <BarChart2 size={13} /> Bar
                      </button>
                    </div>

                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewTrendRange("7d");
                          setHoveredTrendIdx(null);
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          overviewTrendRange === "7d"
                            ? "bg-white text-[#283891] shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        7d
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewTrendRange("30d");
                          setHoveredTrendIdx(null);
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          overviewTrendRange === "30d"
                            ? "bg-white text-[#283891] shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        30d
                      </button>
                    </div>
                  </div>
                </div>

                {/* Period KPI Summary Strip */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      {overviewTrendRange === "7d" ? "7d Volume" : "30d Volume"}
                    </div>
                    <div className="text-sm font-bold font-mono text-slate-800">
                      {totalBookings} Bookings
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
                      Completed
                    </div>
                    <div className="text-sm font-bold font-mono text-emerald-700">
                      {totalCompleted} Visits
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#283891] font-semibold uppercase tracking-wider">
                      Success Rate
                    </div>
                    <div className="text-sm font-bold font-mono text-[#283891]">
                      {completionRate}%
                    </div>
                  </div>
                </div>

                {/* SVG Line / Bar Rendering */}
                {trendChartType === "line" ? (
                  <div className="relative pt-1 pb-1 select-none">
                    <div className="h-6 flex items-center justify-between px-1 mb-1 text-xs">
                      {activeHoverPoint ? (
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-2.5 py-1 rounded-lg shadow-sm text-[11px]">
                          <span className="font-semibold text-indigo-200">
                            {parseDateInfo(activeHoverPoint.data.date).weekday},{" "}
                            {parseDateInfo(activeHoverPoint.data.date).fullDate}:
                          </span>
                          <span className="font-bold text-white">
                            {activeHoverPoint.data.total || 0} Booked
                          </span>
                          <span className="text-emerald-400 font-medium">
                            • {activeHoverPoint.data.completed || 0} Done
                          </span>
                          {activeHoverPoint.data.cancelled > 0 && (
                            <span className="text-rose-400 font-medium">
                              • {activeHoverPoint.data.cancelled} Cancelled
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Hover over any point to inspect volume
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                        Range: {firstInfo?.formatted} – {lastInfo?.formatted}
                      </span>
                    </div>

                    <div className="w-full relative overflow-x-auto overflow-y-visible bg-slate-50/40 rounded-xl border border-slate-200/60 p-2">
                      <svg
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        className="w-full h-44 block overflow-visible"
                        onMouseLeave={() => setHoveredTrendIdx(null)}
                      >
                        <defs>
                          <linearGradient
                            id="scTrendAreaGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#283891"
                              stopOpacity="0.22"
                            />
                            <stop
                              offset="100%"
                              stopColor="#283891"
                              stopOpacity="0.0"
                            />
                          </linearGradient>
                        </defs>

                        {yTicks.map((val, idx) => {
                          const yPos =
                            padT + (idx / (yTicks.length - 1)) * plotH;
                          return (
                            <g key={idx}>
                              <text
                                x={padL - 8}
                                y={yPos + 3.5}
                                textAnchor="end"
                                className="text-[10px] font-mono fill-slate-400 select-none"
                              >
                                {val}
                              </text>
                              <line
                                x1={padL}
                                y1={yPos}
                                x2={padL + plotW}
                                y2={yPos}
                                stroke="currentColor"
                                className="text-slate-200"
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                            </g>
                          );
                        })}

                        {areaPath && (
                          <path d={areaPath} fill="url(#scTrendAreaGrad)" />
                        )}

                        {compLinePath && (
                          <path
                            d={compLinePath}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            className="opacity-75"
                          />
                        )}

                        {linePath && (
                          <path
                            d={linePath}
                            fill="none"
                            stroke="#283891"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {xTickIndices.map((idx) => {
                          const pt = points[idx];
                          if (!pt) return null;
                          const info = parseDateInfo(pt.data.date);
                          return (
                            <g key={idx}>
                              <line
                                x1={pt.x}
                                y1={baseLineY}
                                x2={pt.x}
                                y2={baseLineY + 4}
                                stroke="currentColor"
                                className="text-slate-300"
                                strokeWidth="1"
                              />
                              <text
                                x={pt.x}
                                y={baseLineY + 16}
                                textAnchor="middle"
                                className="text-[9px] font-semibold fill-slate-500 font-mono select-none"
                              >
                                {info.formatted}
                              </text>
                              {overviewTrendRange === "7d" && (
                                <text
                                  x={pt.x}
                                  y={baseLineY + 26}
                                  textAnchor="middle"
                                  className="text-[9px] font-medium fill-slate-400 select-none"
                                >
                                  {info.weekday}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        {points.map((pt, i) => {
                          const isHovered = hoveredTrendIdx === i;
                          return (
                            <circle
                              key={i}
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 5.5 : 3}
                              fill={isHovered ? "#283891" : "#ffffff"}
                              stroke="#283891"
                              strokeWidth={isHovered ? "2.5" : "1.5"}
                              className="cursor-pointer transition-all"
                            />
                          );
                        })}

                        {activeHoverPoint && (
                          <g pointerEvents="none">
                            <line
                              x1={activeHoverPoint.x}
                              y1={padT}
                              x2={activeHoverPoint.x}
                              y2={baseLineY}
                              stroke="#283891"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                            />
                            <circle
                              cx={activeHoverPoint.x}
                              cy={activeHoverPoint.y}
                              r="6"
                              fill="#283891"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                            />
                          </g>
                        )}

                        {points.map((pt, i) => {
                          const colW = plotW / Math.max(nPts, 1);
                          return (
                            <rect
                              key={i}
                              x={pt.x - colW / 2}
                              y={padT}
                              width={colW}
                              height={plotH + padB}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredTrendIdx(i)}
                            />
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="relative pt-3 pb-1">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pl-6">
                      {yTicks.map((val, idx) => (
                        <div key={idx} className="flex items-center w-full">
                          <span className="text-[10px] font-mono text-slate-400 w-6 text-right pr-2 select-none -translate-y-1/2">
                            {val}
                          </span>
                          <div className="flex-1 border-b border-dashed border-slate-200" />
                        </div>
                      ))}
                    </div>

                    <div className="relative z-10 pl-6 h-40 flex items-end justify-around gap-1.5">
                      {data.map((d, i) => {
                        const info = parseDateInfo(d.date);
                        const isToday = i === data.length - 1;
                        const heightPct = Math.round(
                          ((d.total || 0) / yMax) * 100
                        );
                        const completedPct =
                          d.total > 0
                            ? Math.round(
                                ((d.completed || 0) / d.total) * 100
                              )
                            : 0;

                        return (
                          <div
                            key={d.date}
                            className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                          >
                            <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-lg z-30 whitespace-nowrap pointer-events-none">
                              <span className="font-bold">
                                {info.weekday}, {info.formatted}
                              </span>
                              <span className="text-indigo-200 font-medium">
                                {d.total} Booked • {d.completed} Done
                              </span>
                            </div>

                            <div className="text-[10px] font-bold font-mono text-slate-500 mb-1">
                              {d.total > 0 ? d.total : "0"}
                            </div>

                            <div className="w-full max-w-[28px] flex flex-col justify-end">
                              {d.total > 0 ? (
                                <div
                                  className={`w-full rounded-t-md overflow-hidden flex flex-col justify-end ${
                                    isToday ? "ring-2 ring-[#283891]" : ""
                                  }`}
                                  style={{
                                    height: `${Math.max(heightPct, 12)}%`,
                                  }}
                                >
                                  <div className="w-full flex-1 bg-[#283891] relative">
                                    {d.completed > 0 && (
                                      <div
                                        className="w-full bg-emerald-500"
                                        style={{ height: `${completedPct}%` }}
                                      />
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-1 bg-slate-200 rounded-full mx-auto" />
                              )}
                            </div>

                            <div className="text-center mt-2 pt-1 border-t border-slate-100 w-full">
                              <div className="text-[9px] font-semibold text-slate-600">
                                {info.formatted}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5 font-medium text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#283891] inline-block" />{" "}
                      Total Bookings
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
                      Completed Visits
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    Live aggregate from clinic appointments database
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── 5. TODAY'S APPOINTMENTS ROSTER PREVIEW (TableShell) ── */}
      <TableShell
        title="Today's Appointments Roster"
        subtitle={`${todayApts.length} total scheduled today`}
        badge={
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            {todayApts.length}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <ActionButton
              variant="outline"
              size="xs"
              onClick={() => setActiveTab("appointments")}
            >
              All Appointments →
            </ActionButton>
          </div>
        }
        headers={[
          "Serial",
          "Patient Name & Contact",
          "Doctor & Chamber",
          "Time",
          "Queue Status",
          "Payment",
          "Action",
        ]}
        empty={todayApts.length === 0}
        emptyMessage="No appointments scheduled for today yet."
        footer={
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {Math.min(todayApts.length, 6)} of {todayApts.length} appointments for today.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("appointments")}
              className="text-[#283891] hover:underline font-semibold cursor-pointer"
            >
              Open Full Appointments Management →
            </button>
          </div>
        }
      >
        {todayApts.slice(0, 6).map((apt) => (
          <tr
            key={apt.id}
            className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
          >
            <td className="py-3 px-4 font-mono font-bold text-slate-900">
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                #{apt.serial_number || "—"}
              </span>
            </td>

            <td className="py-3 px-4">
              <div className="font-semibold text-slate-900 text-xs">
                {apt.patient_name || apt.patient?.full_name || "Patient"}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {apt.patient_phone || apt.patient?.phone_number || "—"}
              </div>
            </td>

            <td className="py-3 px-4">
              <div className="font-semibold text-slate-900 text-xs">
                Dr. {apt.doctor_name || apt.doctor?.full_name || "Doctor"}
              </div>
              <div className="text-[11px] text-slate-500">
                {apt.doctor_specialization || "Consultant"}
              </div>
            </td>

            <td className="py-3 px-4 font-mono text-xs text-slate-600">
              {apt.appointment_time ? apt.appointment_time.slice(0, 5) : "—"}
            </td>

            <td className="py-3 px-4">
              <StatusBadge status={apt.status} size="xs" />
            </td>

            <td className="py-3 px-4">
              {apt.is_paid ? (
                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Paid (৳{apt.fee || apt.consultation_fee || 0})
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Unpaid
                </span>
              )}
            </td>

            <td className="py-3 px-4">
              <ActionButton
                variant="ghost"
                size="xs"
                onClick={() => {
                  if (setSelectedDoctorId && (apt.doctor_id || apt.doctor?.id)) {
                    setSelectedDoctorId(apt.doctor_id || apt.doctor?.id);
                    setActiveTab("chamber");
                  } else {
                    setActiveTab("appointments");
                  }
                }}
              >
                Chamber Desk →
              </ActionButton>
            </td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
