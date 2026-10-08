import React, { useState, useMemo } from "react";
import {
  Lock,
  Printer,
  X,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Receipt,
  Building2,
  Calendar,
  Clock,
  UserCheck,
} from "lucide-react";
import { ActionButton } from "../ui";
import apiClient from "../../api/axios";

const DENOMINATIONS = [
  { key: "1000", label: "৳ 1,000 Note", factor: 1000 },
  { key: "500", label: "৳ 500 Note", factor: 500 },
  { key: "200", label: "৳ 200 Note", factor: 200 },
  { key: "100", label: "৳ 100 Note", factor: 100 },
  { key: "50", label: "৳ 50 Note", factor: 50 },
  { key: "20", label: "৳ 20 Note", factor: 20 },
  { key: "10", label: "৳ 10 Note", factor: 10 },
  { key: "coins", label: "Coins & Small Change (মুদ্রা)", factor: 1 },
];

export default function ShiftClosingModal({
  isOpen,
  onClose,
  cashSummary,
  user,
  clinic,
  totalTokensHandled = 0,
  onShiftClosed,
}) {
  const [counts, setCounts] = useState({
    "1000": 0,
    "500": 0,
    "200": 0,
    "100": 0,
    "50": 0,
    "20": 0,
    "10": 0,
    "coins": 0,
  });
  const [handedOverTo, setHandedOverTo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closedRecord, setClosedRecord] = useState(null);
  const [error, setError] = useState("");

  const systemCash = cashSummary?.total_cash_today || 0;
  const digitalTotal = cashSummary?.total_digital_today || 0;
  const totalTx = cashSummary?.total_transactions || 0;

  // Calculate physical cash counted from denomination breakdown
  const physicalCashCounted = useMemo(() => {
    return DENOMINATIONS.reduce((sum, d) => {
      const cnt = parseInt(counts[d.key], 10) || 0;
      return sum + cnt * d.factor;
    }, 0);
  }, [counts]);

  const discrepancy = physicalCashCounted - systemCash;

  const handleCountChange = (key, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setCounts((prev) => ({ ...prev, [key]: num }));
  };

  const handleQuickMatch = () => {
    // Fill out with exact matching notes as starting point
    let remaining = systemCash;
    const newCounts = { "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "coins": 0 };
    [1000, 500, 200, 100, 50, 20, 10].forEach((denom) => {
      if (remaining >= denom) {
        const c = Math.floor(remaining / denom);
        newCounts[String(denom)] = c;
        remaining -= c * denom;
      }
    });
    newCounts["coins"] = remaining;
    setCounts(newCounts);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!handedOverTo.trim()) {
      setError("Please provide the name of the receiving supervisor or incoming duty staff.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        system_cash_total: systemCash,
        physical_cash_counted: physicalCashCounted,
        digital_total: digitalTotal,
        total_tokens_handled: totalTokensHandled,
        total_transactions_count: totalTx,
        denominations: counts,
        handed_over_to: handedOverTo.trim(),
        notes: notes.trim(),
      };
      const res = await apiClient.post("/clinics/reception/shift-closing/", payload);
      setClosedRecord(res.closing || payload);
      if (onShiftClosed) onShiftClosed(res.closing || payload);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to log shift closing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#283891] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Lock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Counter Shift Closing & Cash Reconciliation
              </h3>
              <p className="text-xs text-indigo-200 font-medium">
                শিফট সমাপ্তি ও ক্যাশ হস্তান্তর নিরীক্ষণ — {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {closedRecord ? (
            /* Printed Receipt Confirmation View */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Shift Successfully Closed & Reconciled!</h4>
                  <p className="text-xs text-emerald-700">
                    Audit closing slip generated for handover to <strong>{closedRecord.handed_over_to}</strong>.
                  </p>
                </div>
              </div>

              {/* Printable Slip Container */}
              <div
                id="shift-audit-print-area"
                className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-slate-900 font-mono text-xs space-y-4 print:border-none print:p-0 print:m-0"
              >
                <div className="text-center pb-3 border-b border-slate-200 space-y-1">
                  <h2 className="text-base font-black tracking-wide uppercase">
                    {clinic?.clinic_name || clinic?.name || "Smart Clinic"}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-sans">
                    {clinic?.clinic_address || clinic?.address || "Bangladesh"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Phone: {clinic?.clinic_phone || clinic?.phone || "Hotline 10678"}
                  </p>
                  <div className="inline-block mt-2 px-3 py-1 bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wider rounded-md">
                    SHIFT CLOSING & CASH HANDOVER SLIP
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Date & Time:</span>
                    <span className="font-bold">
                      {closedRecord.shift_date} • {closedRecord.shift_end_time || new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Closing Officer:</span>
                    <span className="font-bold">{user?.full_name || "Receptionist"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Handed Over To:</span>
                    <span className="font-bold text-indigo-700">{closedRecord.handed_over_to}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tokens Served:</span>
                    <span className="font-bold">{totalTokensHandled} Patients</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">System Recorded Cash:</span>
                    <span className="font-bold">৳{systemCash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Physical Cash Counted:</span>
                    <span className="font-black text-emerald-700">
                      ৳{physicalCashCounted.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1">
                    <span className="text-slate-600">Variance / Discrepancy:</span>
                    <span
                      className={`font-bold ${
                        discrepancy === 0
                          ? "text-emerald-700"
                          : discrepancy > 0
                          ? "text-blue-700"
                          : "text-rose-700"
                      }`}
                    >
                      {discrepancy === 0
                        ? "৳0 (Exact Match ✓)"
                        : discrepancy > 0
                        ? `+৳${discrepancy.toLocaleString()} (Surplus)`
                        : `-৳${Math.abs(discrepancy).toLocaleString()} (Shortage)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Digital / Online Collections:</span>
                    <span className="font-bold text-slate-800">৳{digitalTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-slate-300 pt-1.5 text-sm">
                    <span className="font-bold text-slate-900">Total Shift Revenue:</span>
                    <span className="font-black text-indigo-900">
                      ৳{(physicalCashCounted + digitalTotal).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Denomination Matrix */}
                <div>
                  <h5 className="font-bold text-[11px] text-slate-700 mb-1">
                    Physical Denomination Breakdown (নোট গণনা):
                  </h5>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200">
                    {DENOMINATIONS.map((d) => {
                      const c = counts[d.key] || 0;
                      if (c === 0) return null;
                      return (
                        <div key={d.key} className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-600">{d.label}:</span>
                          <span className="font-bold">
                            {c} pcs = ৳{(c * d.factor).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {notes && (
                  <div className="text-[11px] text-slate-600 italic">
                    <strong>Handover Notes:</strong> {notes}
                  </div>
                )}

                {/* Signatures */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500 font-sans">
                  <div>
                    <div className="border-t border-slate-400 pt-1">
                      {user?.full_name || "Duty Receptionist"} (হস্তান্তরকারী)
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-1">
                      {closedRecord.handed_over_to} (গ্রহণকারী)
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <ActionButton variant="outline" size="sm" onClick={onClose}>
                  Done
                </ActionButton>
                <ActionButton
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={handlePrint}
                >
                  Print Shift Slip
                </ActionButton>
              </div>
            </div>
          ) : (
            /* Shift Closing Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Financial Snapshot Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">
                    System Expected Cash
                  </span>
                  <div className="text-2xl font-black font-mono text-indigo-900 mt-1">
                    ৳{systemCash.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-indigo-600/80 mt-0.5 block">
                    From {cashSummary?.cash_transactions_count || totalTx} cash tokens
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-emerald-950">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                      Physical Counted Cash
                    </span>
                    <button
                      type="button"
                      onClick={handleQuickMatch}
                      className="text-[10px] text-emerald-700 underline hover:text-emerald-900 font-semibold"
                    >
                      Auto-fill
                    </button>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-800 mt-1">
                    ৳{physicalCashCounted.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-700/80 mt-0.5 block">
                    Total in drawer cash box
                  </span>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    discrepancy === 0
                      ? "bg-slate-50 border-slate-200 text-slate-800"
                      : discrepancy > 0
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
                    Drawer Reconciliation
                  </span>
                  <div className="text-2xl font-black font-mono mt-1">
                    {discrepancy === 0 ? "৳0" : (discrepancy > 0 ? `+৳${discrepancy}` : `-৳${Math.abs(discrepancy)}`)}
                  </div>
                  <span className="text-[10px] font-bold mt-0.5 block">
                    {discrepancy === 0 ? "✓ Balanced (মিলিত)" : (discrepancy > 0 ? "Surplus (উদ্বৃত্ত)" : "Shortage (ঘাটতি)")}
                  </span>
                </div>
              </div>

              {/* Denomination Counter Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Receipt size={14} className="text-[#283891]" />
                      Drawer Physical Cash Breakdown (নোট অনুযায়ী গণনা)
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Enter quantity of each Bangladeshi currency note physically in your cash drawer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCounts({
                        "1000": 0,
                        "500": 0,
                        "200": 0,
                        "100": 0,
                        "50": 0,
                        "20": 0,
                        "10": 0,
                        "coins": 0,
                      })
                    }
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DENOMINATIONS.map((d) => (
                    <div key={d.key} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[10px] font-bold text-slate-600 mb-1">{d.label}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">×</span>
                        <input
                          type="number"
                          min="0"
                          value={counts[d.key] || ""}
                          placeholder="0"
                          onChange={(e) => handleCountChange(d.key, e.target.value)}
                          className="w-full px-2 py-1 text-xs font-bold font-mono text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#283891]"
                        />
                      </div>
                      <div className="text-[10px] font-mono text-right text-slate-400 mt-1">
                        ৳{((counts[d.key] || 0) * d.factor).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Handover Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cash Handed Over To (গ্রহণকারী কর্মকর্তা / সুপারভাইজার) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Md. Tariqul Islam (Shift Supervisor / Admin)"
                    value={handedOverTo}
                    onChange={(e) => setHandedOverTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Shift Notes / Drawer Observations
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. All drawer keys handed over, no petty cash discrepancy"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <ActionButton
                  variant="primary"
                  size="md"
                  icon={Lock}
                  loading={submitting}
                  onClick={handleSubmit}
                >
                  Confirm Closing & Generate Slip
                </ActionButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
