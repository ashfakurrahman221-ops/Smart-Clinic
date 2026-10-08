import React from "react";
import { X, Tv, Calendar } from "lucide-react";

export default function DoctorSlideoverCard({
  selectedDoctorCard,
  doctorCardSession,
  loadingDoctorCard,
  appointments,
  onClose,
  onGoToLiveQueue,
  onViewAppointments,
}) {
  if (!selectedDoctorCard) return null;

  const d = selectedDoctorCard;
  const todayStr = new Date().toISOString().split("T")[0];
  const docAptsToday = appointments.filter(
    (a) =>
      a.appointment_date === todayStr &&
      (a.doctor === d.id || a.doctor_id === d.id)
  );
  const seenToday = docAptsToday.filter((a) => a.status === "COMPLETED").length;
  const totalToday = docAptsToday.length;
  const pct = totalToday > 0 ? Math.round((seenToday / totalToday) * 100) : 0;

  // 7-day data from appointments array
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d2 = new Date();
    d2.setDate(d2.getDate() - (6 - i));
    const ds = d2.toISOString().split("T")[0];
    const label = d2.toLocaleDateString("en-BD", { weekday: "short" });
    const count = appointments.filter(
      (a) =>
        a.appointment_date === ds && (a.doctor === d.id || a.doctor_id === d.id)
    ).length;
    return { label, count, isToday: i === 6 };
  });
  const maxBar = Math.max(...last7.map((x) => x.count), 1);

  // Monthly stats from appointments (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthApts = appointments.filter((a) => {
    if (a.doctor !== d.id && a.doctor_id !== d.id) return false;
    const dt = new Date(a.appointment_date);
    return dt >= thirtyDaysAgo;
  });
  const monthTotal = monthApts.length;
  const monthCompleted = monthApts.filter((a) => a.status === "COMPLETED").length;
  const monthCR =
    monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;

  // Session info from doctorCardSession
  const sess = doctorCardSession;
  const hasSession = !!sess;
  const sessionStatus = sess?.status || null;
  const isLive =
    hasSession &&
    sessionStatus &&
    sessionStatus !== "ENDED" &&
    sessionStatus !== "CANCELLED";
  const isEnded =
    hasSession && (sessionStatus === "ENDED" || sessionStatus === "CANCELLED");

  const statusBadge = isLive ? (
    <span className="badge badge-success badge-sm font-bold gap-1">
      🟢 Live Session
    </span>
  ) : isEnded ? (
    <span className="badge badge-error badge-sm font-bold gap-1">
      🔴 Session Ended
    </span>
  ) : (
    <span className="badge badge-ghost badge-sm font-bold gap-1">
      ⚪ No Session Today
    </span>
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-base-100 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out translate-x-0">
        {/* Panel Header */}
        <div className="bg-gradient-to-br from-primary to-purple-700 text-white px-6 pt-8 pb-10 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-white/25 flex items-center justify-center text-3xl font-black mb-3">
            {(d.full_name || "?")[0].toUpperCase()}
          </div>
          <div className="text-xl font-black leading-tight">
            {d.full_name?.startsWith("Dr.") ? d.full_name : `Dr. ${d.full_name}`}
          </div>
          <div className="text-sm opacity-80 mt-1">{d.qualification || "—"}</div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
              🚪 {d.room_number || (sess?.room_number ? `Room ${sess.room_number}` : "No Room")}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
              💊 Fee: ৳{d.consultation_fee || sess?.consultation_fee || "—"}
            </span>
          </div>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Today's Session */}
          <div>
            <div className="text-xs font-black text-base-content/50 uppercase tracking-widest mb-2">
              📅 Today&apos;s Session
            </div>
            <div className="bg-base-200/50 rounded-2xl p-4 space-y-3 border border-base-300">
              <div className="flex items-center justify-between">
                {statusBadge}
                <span className="text-xs text-base-content/50">
                  {new Date().toLocaleDateString("en-BD", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {loadingDoctorCard ? (
                <div className="text-xs text-center text-base-content/40 py-2">
                  Loading session data…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                      <div className="text-[10px] text-base-content/40 font-bold uppercase tracking-wide mb-1">
                        ▶ Start Time
                      </div>
                      <div className="text-lg font-black text-base-content font-mono">
                        {sess?.session_start
                          ? new Date("1970-01-01T" + sess.session_start).toLocaleTimeString("en-BD", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : sess?.started_at
                          ? new Date(sess.started_at).toLocaleTimeString("en-BD", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                    </div>
                    <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                      <div className="text-[10px] text-base-content/40 font-bold uppercase tracking-wide mb-1">
                        ⏹ End Time
                      </div>
                      <div className="text-lg font-black text-base-content font-mono">
                        {sess?.session_end
                          ? new Date("1970-01-01T" + sess.session_end).toLocaleTimeString("en-BD", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : sess?.ended_at
                          ? new Date(sess.ended_at).toLocaleTimeString("en-BD", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {hasSession && (
                    <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                      <div className="flex justify-between text-xs font-bold text-base-content mb-2">
                        <span>Queue Progress</span>
                        <span>
                          #{sess?.current_serial || 0} / {sess?.total_serials || 0} serials
                        </span>
                      </div>
                      <div className="w-full bg-base-300 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary to-purple-600 rounded-full h-2 transition-all"
                          style={{
                            width:
                              sess?.total_serials > 0
                                ? `${Math.round((sess.current_serial / sess.total_serials) * 100)}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {totalToday > 0 && (
                    <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                      <div className="flex justify-between text-xs font-bold text-base-content mb-2">
                        <span>Appointments Seen</span>
                        <span>
                          {seenToday} / {totalToday} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-base-300 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-success to-emerald-400 rounded-full h-2 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Monthly Stats */}
          <div>
            <div className="text-xs font-black text-base-content/50 uppercase tracking-widest mb-2">
              📊 Last 30 Days
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-base-200/50 rounded-xl p-3 border border-base-300">
                <div className="text-2xl font-black text-base-content">{monthTotal}</div>
                <div className="text-xs text-base-content/55 font-semibold mt-0.5">
                  Total Visits
                </div>
              </div>
              <div className="bg-base-200/50 rounded-xl p-3 border border-base-300">
                <div className="text-2xl font-black text-base-content">{monthCR}%</div>
                <div className="text-xs text-base-content/55 font-semibold mt-0.5">
                  Completion Rate
                </div>
              </div>
              <div className="bg-base-200/50 rounded-xl p-3 border border-base-300 col-span-2">
                <div className="text-lg font-black text-base-content">
                  {monthCompleted} completed
                </div>
                <div className="text-xs text-base-content/55 font-semibold mt-0.5">
                  Appointments marked done
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Mini Chart */}
          <div>
            <div className="text-xs font-black text-base-content/50 uppercase tracking-widest mb-2">
              📈 Last 7 Days — Patients
            </div>
            <div className="bg-base-200/50 rounded-2xl p-4 border border-base-300">
              <div className="flex items-end gap-1.5 h-14">
                {last7.map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                  >
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        bar.isToday ? "bg-primary" : "bg-primary/30"
                      }`}
                      style={{
                        height: `${Math.max(
                          Math.round((bar.count / maxBar) * 100),
                          bar.count > 0 ? 15 : 5
                        )}%`,
                      }}
                      title={`${bar.label}: ${bar.count} patient${
                        bar.count !== 1 ? "s" : ""
                      }`}
                    />
                    <div className="text-[9px] text-base-content/40 font-bold">
                      {bar.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="text-xs font-black text-base-content/50 uppercase tracking-widest mb-2">
              ⚡ Quick Actions
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onGoToLiveQueue(d.id.toString())}
                className="btn btn-primary btn-sm w-full gap-2 rounded-xl font-bold"
              >
                <Tv size={14} /> Go to Live Queue Control
              </button>
              <button
                onClick={onViewAppointments}
                className="btn btn-outline btn-sm w-full gap-2 rounded-xl font-bold"
              >
                <Calendar size={14} /> View All Appointments
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
