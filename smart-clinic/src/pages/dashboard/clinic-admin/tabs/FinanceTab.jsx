import React from "react";
import {
  DollarSign,
  RefreshCw,
  Printer,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function FinanceTab({
  financialAnalytics,
  dailyCashSummary,
  analyticsDate,
  setAnalyticsDate,
  analyticsRange = "today",
  setAnalyticsRange,
  analyticsCustomStart,
  setAnalyticsCustomStart,
  analyticsCustomEnd,
  setAnalyticsCustomEnd,
  fetchFinancialAnalytics,
  loadingAnalytics = false,
  onViewPendingAppointments,
}) {
  const handleRangeChange = (rangeKey) => {
    if (setAnalyticsRange) setAnalyticsRange(rangeKey);
    if (rangeKey !== "custom") {
      fetchFinancialAnalytics({ range: rangeKey });
    }
  };

  const handleApplyCustomRange = () => {
    fetchFinancialAnalytics({
      range: "custom",
      start_date: analyticsCustomStart,
      end_date: analyticsCustomEnd,
    });
  };

  const summary = financialAnalytics?.summary || {};
  const settlements = financialAnalytics?.doctor_settlements || [];

  return (
    <div className="space-y-5">
      {/* ── 1. HEADER & DATE RANGE SELECTOR ── */}
      <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-lg text-base-content flex items-center gap-2">
              <DollarSign size={22} className="text-emerald-500" /> Revenue &amp; Doctor Fee Settlements
            </h3>
            <p className="text-xs text-base-content/60 mt-1">
              20% clinic facility share · 80% doctor payout · Period:{" "}
              <strong className="text-base-content font-mono font-bold">
                {financialAnalytics?.range_label || analyticsDate}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Range Chips */}
            <div className="join join-horizontal bg-base-200 p-0.5 rounded-xl">
              {[
                { key: "today", label: "Today" },
                { key: "7d", label: "7 Days" },
                { key: "30d", label: "30 Days" },
                { key: "custom", label: "Custom" },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => handleRangeChange(r.key)}
                  className={`btn btn-xs join-item font-bold border-none cursor-pointer ${
                    analyticsRange === r.key
                      ? "btn-primary text-white shadow-xs"
                      : "btn-ghost text-base-content/70"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Selectors */}
            {analyticsRange === "custom" && (
              <div className="flex items-center gap-1.5 bg-base-200/60 p-1 rounded-xl border border-base-300 text-xs">
                <input
                  type="date"
                  value={analyticsCustomStart}
                  onChange={(e) =>
                    setAnalyticsCustomStart && setAnalyticsCustomStart(e.target.value)
                  }
                  className="bg-transparent font-mono text-xs focus:outline-none"
                  title="Start Date"
                />
                <span className="text-base-content/40 font-semibold">to</span>
                <input
                  type="date"
                  value={analyticsCustomEnd}
                  onChange={(e) =>
                    setAnalyticsCustomEnd && setAnalyticsCustomEnd(e.target.value)
                  }
                  className="bg-transparent font-mono text-xs focus:outline-none"
                  title="End Date"
                />
                <button
                  onClick={handleApplyCustomRange}
                  className="btn btn-primary btn-xs font-bold cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}

            <button
              onClick={() =>
                fetchFinancialAnalytics({
                  range: analyticsRange,
                  start_date: analyticsCustomStart,
                  end_date: analyticsCustomEnd,
                })
              }
              className="btn btn-outline btn-xs gap-1 font-bold cursor-pointer"
              title="Refresh financial analytics"
            >
              <RefreshCw
                size={12}
                className={loadingAnalytics ? "animate-spin text-primary" : ""}
              />{" "}
              Refresh
            </button>

            <button
              onClick={() => window.print()}
              className="btn btn-primary btn-xs gap-1 font-bold shadow-sm print:hidden cursor-pointer"
              title="Print financial audit sheet"
            >
              <Printer size={12} /> Print Audit Sheet
            </button>
          </div>
        </div>

        {/* Unpaid Pending Collection Alert */}
        {summary.unpaid_pending_count > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="badge badge-warning badge-sm font-black">
                ⚠️ Counter Collection Alert
              </span>
              <span>
                <strong>
                  {summary.unpaid_pending_count} Unconfirmed Appointments
                </strong>{" "}
                (Total: ৳{parseFloat(summary.unpaid_pending_amount || 0).toLocaleString()} BDT) are pending payment confirmation at counter.
              </span>
            </div>
            {onViewPendingAppointments && (
              <button
                onClick={onViewPendingAppointments}
                className="btn btn-warning btn-xs font-bold shrink-0 cursor-pointer"
              >
                View Pending Cash Check-ins →
              </button>
            )}
          </div>
        )}

        {/* ── 2. KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {[
            {
              label: "Gross Revenue",
              value:
                summary.period_gross_revenue ??
                summary.today_gross_revenue ??
                0,
              color: "text-emerald-600",
              sub: `${
                summary.period_confirmed_appointments ??
                summary.today_confirmed_appointments ??
                0
              } paid appointments`,
            },
            {
              label: "Counter Cash",
              value:
                summary.period_cash_collected ??
                summary.today_cash_collected ??
                0,
              color: "text-primary",
              sub: "Direct cash drawer collection",
            },
            {
              label: "Clinic Share (20%)",
              value:
                summary.period_clinic_net_share ??
                summary.today_clinic_net_share ??
                0,
              color: "text-indigo-600",
              sub: "Clinic facility operational income",
            },
            {
              label: "Doctors Payout (80%)",
              value:
                summary.period_doctors_total_payout ??
                summary.today_doctors_total_payout ??
                0,
              color: "text-amber-600",
              sub: "Payable to consultant doctors",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-base-200/40 border border-base-200/70 p-4 rounded-xl space-y-0.5"
            >
              <div className="text-xs text-base-content/60 font-semibold">
                {k.label}
              </div>
              <div className={`text-xl font-black font-mono ${k.color}`}>
                ৳{parseFloat(k.value).toLocaleString()}
              </div>
              <div className="text-[11px] text-base-content/50">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. DAILY COUNTER CASH REGISTER (RELOCATED FROM STAFF) ── */}
      <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-base-200">
          <div>
            <h4 className="font-extrabold text-sm text-base-content flex items-center gap-2">
              <DollarSign className="text-emerald-500" size={18} />
              <span>Daily Counter Cash Register</span>
              {dailyCashSummary?.transactions && (
                <span className="badge badge-sm badge-neutral font-mono font-bold">
                  {dailyCashSummary.transactions.length} Received
                </span>
              )}
            </h4>
            <p className="text-xs text-base-content/60 mt-0.5">
              Itemized record of cash collections taken at front desk counters
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 font-mono">
            Total Cash Today: ৳{dailyCashSummary?.total_cash_today || 0}
          </span>
        </div>

        {!dailyCashSummary?.transactions ||
        dailyCashSummary.transactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-base-content/50">
            No cash payments received at reception desk for this date.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-base-200">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-xs text-base-content/60 border-b border-base-200 bg-base-200/40 uppercase">
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Serial #</th>
                  <th>Collected By</th>
                  <th>Payment Mode</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {dailyCashSummary.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-base-200/40 border-b border-base-200 text-xs">
                    <td className="text-xs text-base-content/60 font-mono">{tx.time}</td>
                    <td className="font-bold text-base-content">
                      {tx.patient}
                    </td>
                    <td>
                      {tx.serial_number ? (
                        <span className="badge badge-sm badge-neutral font-mono font-bold">
                          #{tx.serial_number}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-base-content/80 font-medium">
                      {tx.received_by}
                    </td>
                    <td>
                      <span className="badge badge-xs badge-success badge-outline font-bold">
                        💵 Counter Cash
                      </span>
                    </td>
                    <td className="text-right font-mono font-bold text-emerald-600 text-sm">
                      ৳{tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. DOCTOR SETTLEMENT LEADERBOARD ── */}
      <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-base-200">
          <h4 className="font-extrabold text-sm text-base-content flex items-center gap-2">
            <span>👨‍⚕️ Consultant Settlement Breakdown</span>
            <span className="badge badge-ghost badge-xs font-mono">
              {settlements.length} Doctors
            </span>
          </h4>
          <span className="text-xs text-base-content/50">
            Sorted by Gross Revenue
          </span>
        </div>

        {settlements.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-base-200">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-xs text-base-content/60 uppercase bg-base-200/50">
                  <th className="w-12 text-center">Rank</th>
                  <th>Doctor</th>
                  <th>Specialty</th>
                  <th>Slot Fee</th>
                  <th className="text-center">Attended</th>
                  <th>Gross Collected</th>
                  <th>Clinic Cut (20%)</th>
                  <th className="text-right text-emerald-700">
                    Doctor Net (80%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((doc, idx) => (
                  <tr
                    key={doc.doctor_id}
                    className="hover:bg-base-200/40 border-b border-base-200 text-xs"
                  >
                    <td className="text-center font-bold">
                      {idx === 0 ? (
                        <span className="badge badge-warning badge-xs font-black">
                          #1 🥇
                        </span>
                      ) : idx === 1 ? (
                        <span className="badge badge-neutral badge-xs font-black">
                          #2 🥈
                        </span>
                      ) : idx === 2 ? (
                        <span className="badge badge-ghost badge-xs font-black">
                          #3 🥉
                        </span>
                      ) : (
                        <span className="text-base-content/50 font-mono">#{idx + 1}</span>
                      )}
                    </td>
                    <td>
                      <div className="font-bold text-base-content">
                        {doc.doctor_name}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-ghost badge-xs">
                        {doc.specialization}
                      </span>
                    </td>
                    <td className="font-mono">৳{doc.consultation_fee}</td>
                    <td className="font-bold text-center">
                      {doc.patients_seen ?? doc.patients_seen_today ?? 0}
                    </td>
                    <td className="font-mono font-bold">
                      ৳{doc.gross_collected.toLocaleString()}
                    </td>
                    <td className="font-mono text-indigo-600">
                      ৳{doc.clinic_facility_cut.toLocaleString()}
                    </td>
                    <td className="text-right font-black font-mono text-emerald-600">
                      ৳{doc.doctor_net_payout.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-base-content/50 space-y-1">
            <Clock size={28} className="mx-auto text-base-content/30" />
            <div className="font-semibold text-sm">No settlement records for this period</div>
            <div className="text-xs">Appointments completed during this period will appear here automatically.</div>
          </div>
        )}
      </div>
    </div>
  );
}
