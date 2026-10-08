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

  const borderColors = {
    CONFIRMED: "border-l-4 border-l-emerald-400",
    COMPLETED: "border-l-4 border-l-sky-400",
    CANCELLED: "border-l-4 border-l-rose-400",
    PENDING: "border-l-4 border-l-amber-400",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-base-100 p-4 rounded-2xl border border-base-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <span className="font-bold text-base-content">Clinic Appointments</span>
          <span className="badge badge-primary font-bold">
            {appointments.length}
          </span>
        </div>
        <button
          onClick={() => {
            setWalkInForm((prev) => ({
              ...prev,
              doctor_id: selectedDoctorId || (assignedDoctors[0]?.id || ""),
            }));
            setWalkInModalOpen(true);
          }}
          className="btn btn-primary btn-sm gap-1.5 shadow-md font-bold cursor-pointer"
        >
          <UserPlus size={15} /> + New Walk-in Patient
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "ALL", label: "All", color: "btn-neutral" },
          { key: "CONFIRMED", label: "✅ Confirmed", color: "btn-success" },
          { key: "COMPLETED", label: "🔵 Completed", color: "btn-info" },
          { key: "CANCELLED", label: "🔴 Cancelled", color: "btn-error" },
          { key: "PENDING", label: "🟡 Pending", color: "btn-warning" },
          { key: "WALK_IN", label: "🚶 Walk-in", color: "btn-secondary" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setAppointmentFilter(f.key)}
            className={`btn btn-xs font-bold rounded-xl border cursor-pointer ${
              appointmentFilter === f.key
                ? f.color + " text-white shadow-sm"
                : "btn-ghost border-base-300"
            }`}
          >
            {f.label}
            {f.key !== "ALL" && (
              <span className="ml-1 opacity-70">
                (
                {f.key === "WALK_IN"
                  ? appointments.filter((a) => a.is_walk_in).length
                  : appointments.filter((a) => a.status === f.key).length}
                )
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-base-100 rounded-3xl border border-base-200 text-base-content/60">
          No {appointmentFilter !== "ALL" ? appointmentFilter.toLowerCase() : ""}{" "}
          appointments found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((apt) => (
            <div
              key={apt.id}
              className={`bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow ${
                borderColors[apt.status] || ""
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-secondary font-black text-xs">
                      Serial #{apt.serial_number || "—"}
                    </span>
                    <div className="font-bold text-base-content">
                      {apt.patient?.first_name} {apt.patient?.last_name}
                      {apt.is_walk_in && (
                        <span className="ml-1 badge badge-ghost badge-xs font-semibold">
                          Walk-in
                        </span>
                      )}
                    </div>
                    {apt.patient?.phone && (
                      <span className="text-xs text-base-content/60">
                        ({apt.patient.phone})
                      </span>
                    )}
                    <span
                      className={`badge badge-sm font-bold ${
                        apt.status === "CONFIRMED"
                          ? "badge-success"
                          : apt.status === "COMPLETED"
                          ? "badge-info"
                          : apt.status === "CANCELLED"
                          ? "badge-error"
                          : "badge-warning"
                      }`}
                    >
                      {apt.status}
                    </span>
                    {apt.is_emergency && (
                      <span className="badge badge-error badge-xs font-black text-white gap-1 animate-pulse">
                        <AlertTriangle size={10} /> Emergency
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-base-content/60 flex flex-wrap gap-3 pt-1">
                    <span className="flex items-center gap-1">
                      <Stethoscope size={13} className="text-primary" />{" "}
                      {formatDoctorName(apt.doctor?.full_name)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-primary" />{" "}
                      {apt.appointment_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-primary" />{" "}
                      {formatTime(apt.appointment_time)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                  <div className="text-primary font-bold text-lg font-mono">
                    ৳{apt.amount} BDT
                  </div>
                  <div className="flex items-center gap-2">
                    {apt.status === "PENDING" && (
                      <button
                        onClick={() => handleCashCheckIn(apt.id)}
                        disabled={checkingInId === apt.id}
                        className="btn btn-success btn-xs text-white font-bold gap-1 shadow-sm cursor-pointer"
                        title="Confirm cash paid at counter & check-in patient"
                      >
                        <CreditCard size={12} />
                        {checkingInId === apt.id
                          ? "Checking in..."
                          : "Mark Paid (Cash)"}
                      </button>
                    )}
                    {apt.status === "CANCELLED" ? (
                      <span className="text-xs text-rose-500 font-semibold px-2 py-1 bg-rose-50 rounded-lg border border-rose-200">
                        Cancelled — No active token or tracking available
                      </span>
                    ) : (
                      <>
                        <a
                          href={`/track-queue/${apt.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-primary btn-xs gap-1 font-bold"
                          title="Open Live Patient Queue Tracker"
                        >
                          <Activity size={12} /> Track Live
                        </a>
                        <button
                          onClick={() => setPrintTokenData(apt)}
                          className="btn btn-outline btn-xs gap-1 font-semibold cursor-pointer"
                          title="Print thermal token slip with QR code"
                        >
                          <Printer size={12} /> Print Token
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
