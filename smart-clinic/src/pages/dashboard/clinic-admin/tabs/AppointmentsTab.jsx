import React from "react";
import {
  Calendar,
  UserPlus,
  Stethoscope,
  Clock,
  CreditCard,
  Activity,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { formatTime, formatDoctorName } from "../../../../utils/formatters";

export default function AppointmentsTab({
  appointments = [],
  appointmentFilter = "ALL",
  setAppointmentFilter,
  setWalkInForm,
  setWalkInModalOpen,
  selectedDoctorId,
  assignedDoctors = [],
  handleCashCheckIn,
  checkingInId,
  setPrintTokenData,
}) {
  const filtered = appointments.filter((apt) => {
    if (appointmentFilter === "ALL") return true;
    if (appointmentFilter === "WALK_IN") return apt.is_walk_in;
    return apt.status === appointmentFilter;
  });

  return (
    <div className="space-y-3.5">
      {/* ── UNIFIED ROSTER TOOLBAR (Title + Filters + Walk-in Action) ── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title & Total Count */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center font-bold border border-blue-100 shadow-2xs">
            <Calendar size={18} />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">Clinic Appointments</h2>
            <span className="px-2 py-0.2 rounded-full bg-[#1e3a8a] text-white font-black text-xs font-mono">
              {appointments.length}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 overflow-x-auto">
          {[
            { key: "ALL", label: "All", count: appointments.length },
            { key: "CONFIRMED", label: "Confirmed", count: appointments.filter((a) => a.status === "CONFIRMED").length, dot: "bg-emerald-500" },
            { key: "PENDING", label: "Pending", count: appointments.filter((a) => a.status === "PENDING").length, dot: "bg-amber-500" },
            { key: "COMPLETED", label: "Completed", count: appointments.filter((a) => a.status === "COMPLETED").length, dot: "bg-blue-500" },
            { key: "CANCELLED", label: "Cancelled", count: appointments.filter((a) => a.status === "CANCELLED").length, dot: "bg-rose-500" },
            { key: "WALK_IN", label: "Walk-in", count: appointments.filter((a) => a.is_walk_in).length, dot: "bg-teal-500" },
          ].map((f) => {
            const isSelected = appointmentFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setAppointmentFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 scale-[1.02]"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                }`}
              >
                {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />}
                <span>{f.label}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded-md font-mono font-black ${
                  isSelected ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-600"
                }`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Walk-in Action */}
        <button
          onClick={() => {
            setWalkInForm((prev) => ({
              ...prev,
              doctor_id: selectedDoctorId || (assignedDoctors[0]?.id || ""),
            }));
            setWalkInModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-98 shrink-0 self-start md:self-auto"
        >
          <UserPlus size={14} />
          <span>+ New Walk-in</span>
        </button>
      </div>

      {/* ── APPOINTMENT ROSTER ITEMS ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 text-slate-500 shadow-xs space-y-1.5">
          <Calendar size={28} className="mx-auto text-slate-300" />
          <div className="font-bold text-xs sm:text-sm text-slate-700">No appointments found</div>
          <p className="text-[11px] text-slate-400">
            No {appointmentFilter !== "ALL" ? appointmentFilter.toLowerCase() : ""} records in the current roster.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((apt) => (
            <div
              key={apt.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-4 py-3 shadow-xs hover:shadow-xs card-hover-elevation transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-3 relative overflow-hidden"
            >
              {/* Left Status Stripe Indicator */}
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                apt.status === "CONFIRMED" ? "bg-emerald-500" :
                apt.status === "COMPLETED" ? "bg-blue-500" :
                apt.status === "CANCELLED" ? "bg-rose-500" : "bg-amber-500"
              }`} />

              {/* Col 1: Token Serial + Patient Information + Status */}
              <div className="flex items-center gap-3 pl-1.5 min-w-0 flex-1">
                <span className="bg-[#1e3a8a] text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                  #{String(apt.serial_number || 0).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-sm truncate">
                      {apt.patient?.first_name} {apt.patient?.last_name}
                    </span>
                    {apt.is_walk_in && (
                      <span className="px-1.5 py-0.2 rounded-md bg-teal-50 border border-teal-200 text-[#0d9488] font-bold text-[10px]">
                        Walk-in
                      </span>
                    )}
                    {apt.patient?.phone && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        {apt.patient.phone}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        apt.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : apt.status === "COMPLETED"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : apt.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        apt.status === "CONFIRMED" ? "bg-emerald-500" :
                        apt.status === "COMPLETED" ? "bg-blue-500" :
                        apt.status === "CANCELLED" ? "bg-rose-500" : "bg-amber-500"
                      }`} />
                      {apt.status === "PENDING" ? "Pending (Desk)" : apt.status}
                    </span>
                    {apt.is_emergency && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                        <AlertTriangle size={10} /> Emergency
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Col 2: Doctor & Schedule Chip */}
              <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                  <Stethoscope size={13} className="text-[#0d9488]" />
                  <span className="truncate max-w-[160px]">{formatDoctorName(apt.doctor?.full_name)}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60 font-mono text-[11px]">
                  <Clock size={12} className="text-[#1e3a8a]" />
                  <span>{formatTime(apt.appointment_time)}</span>
                </span>
              </div>

              {/* Col 3: Amount & Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 justify-between xl:justify-end border-t xl:border-t-0 pt-2 xl:pt-0 border-slate-100">
                <div className="text-slate-900 font-black text-sm sm:text-base font-mono">
                  ৳{apt.amount} <span className="text-[10px] text-slate-400 font-sans font-bold">BDT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {apt.status === "PENDING" && (
                    <button
                      onClick={() => handleCashCheckIn(apt.id)}
                      disabled={checkingInId === apt.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer transition-all active:scale-98"
                      title="Confirm cash paid at counter & check-in patient"
                    >
                      <CreditCard size={12} />
                      <span>{checkingInId === apt.id ? "Checking..." : "Mark Paid"}</span>
                    </button>
                  )}
                  {apt.status === "CANCELLED" ? (
                    <span className="text-[11px] text-rose-500 font-semibold px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-200">
                      Cancelled
                    </span>
                  ) : (
                    <>
                      <a
                        href={`/track-queue/${apt.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 font-bold text-xs transition-colors"
                        title="Open Live Patient Queue Tracker"
                      >
                        <Activity size={12} /> <span>Track</span>
                      </a>
                      <button
                        onClick={() => setPrintTokenData(apt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer transition-colors"
                        title="Print thermal token slip with QR code"
                      >
                        <Printer size={12} /> <span>Print</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
