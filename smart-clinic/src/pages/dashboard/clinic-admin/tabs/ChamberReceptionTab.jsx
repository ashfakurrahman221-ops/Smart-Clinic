import React, { useState, useEffect } from "react";
import apiClient from "../../../../api/axios";
import {
  Tv,
  AlertTriangle,
  UserPlus,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Pause,
  FastForward,
  Play,
  Users,
  Printer,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Send,
  Calendar,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  TableShell,
  ModalShell,
  ActionButton,
} from "../../../../components/ui";

/**
 * ChamberReceptionTab — Live Reception & Chamber Operations Workspace
 *
 * Implements UI-3 specifications:
 * - Zone 1: Operational Header (PageHeader, live sync status, instant walk-in token)
 * - Zone 2: Horizontally scannable Chamber Selector Deck (StatusBadge, room, live serials, no consultation fees)
 * - Zone 3: Selected Chamber Workspace (40:60 split controller & queue roster, mobile tab switching)
 * - State-Machine Strict Preservation: NEXT_SERIAL, SKIP_SERIAL, RECALL_SERIAL, RESET, ADMIT_EMERGENCY, COMPLETE_EMERGENCY, RESUME_HELD, UPDATE_STATUS
 * - Strict Separation: SKIP_SERIAL != HELD. held_patient exists ONLY via emergency interruption.
 * - Terminal State: ENDED strictly locks queue dispatch actions.
 * - Emergency Privacy: General queue roster does NOT leak emergency_reason into DOM.
 */
export default function ChamberReceptionTab({
  clinic,
  assignedDoctors = [],
  selectedDoctorId,
  setSelectedDoctorId,
  receptionSearchQuery,
  setReceptionSearchQuery,
  receptionDeptFilter,
  setReceptionDeptFilter,
  appointments = [],
  chamberSession,
  setChamberSession,
  updatingChamber,
  handleReceptionChamberAction,
  fetchReceptionChamberSession,
  liveSyncEnabled = true,
  setLiveSyncEnabled,
  isLiveSyncing = false,
  lastSyncedTime = null,
  refreshDeskData,
  delayModalOpen,
  setDelayModalOpen,
  receptionDelayMins,
  setReceptionDelayMins,
  receptionNotice,
  setReceptionNotice,
  handleBroadcastReceptionDelay,
  broadcastingDelay,
  walkInModalOpen,
  setWalkInModalOpen,
  walkInForm,
  setWalkInForm,
  submittingWalkIn,
  handleCreateWalkIn,
  setPrintTokenData,
  t = (k) => k,
}) {
  if (!clinic) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 text-amber-900">
        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-bold text-sm">No Clinic Registered</h3>
          <p className="text-xs text-amber-700 mt-1">
            Register your clinic first to manage live queue sessions.
          </p>
        </div>
      </div>
    );
  }

  if (assignedDoctors.length === 0) {
    return (
      <div className="p-6 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-4 text-slate-800">
        <AlertTriangle className="text-[#283891] shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-bold text-sm">No Active Doctors</h3>
          <p className="text-xs text-slate-600 mt-1">
            Invite and get at least one doctor accepted before managing live queues.
          </p>
        </div>
      </div>
    );
  }

  const todayDateStr = new Date().toISOString().split("T")[0];

  // Smart Patient Lookup State for Walk-in Modal
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [foundPatient, setFoundPatient] = useState(null);
  const [mobileViewTab, setMobileViewTab] = useState("controller");
  const [queueFilter, setQueueFilter] = useState("ALL");

  useEffect(() => {
    if (!walkInModalOpen) {
      setFoundPatient(null);
      setSearchingPatient(false);
      return;
    }
    const phone = (walkInForm?.walk_in_phone || "").trim();
    if (phone.length >= 11) {
      setSearchingPatient(true);
      const timer = setTimeout(async () => {
        try {
          const res = await apiClient.get(
            `/clinics/reception/patient-lookup/?phone=${encodeURIComponent(phone)}`
          );
          if (res?.found && res.patient) {
            setFoundPatient(res.patient);
            if (!walkInForm.walk_in_name && setWalkInForm) {
              setWalkInForm((prev) => ({
                ...prev,
                walk_in_name: res.patient.full_name || prev.walk_in_name,
              }));
            }
          } else {
            setFoundPatient(null);
          }
        } catch {
          setFoundPatient(null);
        } finally {
          setSearchingPatient(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    } else {
      setFoundPatient(null);
      setSearchingPatient(false);
    }
  }, [walkInForm?.walk_in_phone, walkInModalOpen, setWalkInForm]);

  const activeReceptionDoc =
    assignedDoctors.find((d) => String(d.id) === String(selectedDoctorId)) ||
    assignedDoctors[0];

  // Filter roster doctors based on search & department
  const filteredRosterDoctors = assignedDoctors.filter((d) => {
    const q = (receptionSearchQuery || "").toLowerCase().trim();
    const docName = (d.full_name || "").toLowerCase();
    const deptName = (d.department_name || d.department || "").toLowerCase();
    const room = (d.room_number || "").toLowerCase();
    const matchesQ =
      !q || docName.includes(q) || deptName.includes(q) || room.includes(q);
    const matchesDept =
      receptionDeptFilter === "ALL" ||
      String(d.department) === String(receptionDeptFilter) ||
      String(d.department_name) === String(receptionDeptFilter);
    return matchesQ && matchesDept;
  });

  // Today's appointments specifically for the active selected doctor
  const docTodayAppointments = appointments.filter(
    (a) =>
      a.appointment_date === todayDateStr &&
      (String(a.doctor) === String(selectedDoctorId) ||
        String(a.doctor_id) === String(selectedDoctorId))
  );
  const docSeenCount = docTodayAppointments.filter(
    (a) => a.status === "COMPLETED"
  ).length;
  const docWaitingCount = docTodayAppointments.filter(
    (a) => a.status === "PENDING" || a.status === "CONFIRMED"
  ).length;

  const emergencyWaitingPatients = docTodayAppointments.filter(
    (a) =>
      a.is_emergency &&
      a.status === "CONFIRMED" &&
      a.id !== chamberSession?.active_emergency
  );

  const handleToggleEmergency = async (apt) => {
    try {
      await apiClient.post(`/appointments/${apt.id}/emergency/`, {
        is_emergency: !apt.is_emergency,
        emergency_reason: !apt.is_emergency ? "Flagged by Front Desk" : "",
      });
      if (refreshDeskData) refreshDeskData();
      if (fetchReceptionChamberSession) fetchReceptionChamberSession();
    } catch (err) {
      alert(
        err?.response?.data?.error ||
          err?.detail ||
          "Failed to update emergency status."
      );
    }
  };

  const todayAllApts = appointments.filter(
    (a) => a.appointment_date === todayDateStr
  );
  const todayTotalQueueCount = todayAllApts.length;
  const todayTotalWaitingCount = todayAllApts.filter(
    (a) => a.status === "PENDING" || a.status === "CONFIRMED"
  ).length;
  const todayTotalCompletedCount = todayAllApts.filter(
    (a) => a.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-5">
      {/* ── ZONE 1: OPERATIONAL HEADER ── */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
        <PageHeader
          className="mb-0"
          title="Live Reception — Chamber Operations"
          subtitle="Real-time queue dispatch, patient calling, and chamber coordination console"
          badge={
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-[#283891] border border-indigo-100">
              {assignedDoctors.length} Chambers Roster
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Live Sync Status Toggle */}
              <button
                type="button"
                onClick={() =>
                  setLiveSyncEnabled && setLiveSyncEnabled(!liveSyncEnabled)
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none ${
                  liveSyncEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70"
                }`}
                title={
                  liveSyncEnabled
                    ? "Auto-sync (15s) is active. Click to pause."
                    : "Auto-sync is paused. Click to resume."
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    liveSyncEnabled
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-400"
                  }`}
                />
                <span>
                  {liveSyncEnabled ? "Live Sync: ON" : "Live Sync: PAUSED"}
                </span>
              </button>

              {lastSyncedTime && (
                <span
                  className="text-[11px] font-mono text-slate-400 hidden lg:inline"
                  title="Last synced time"
                >
                  {lastSyncedTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              )}

              <ActionButton
                variant="outline"
                size="sm"
                icon={RotateCcw}
                loading={isLiveSyncing}
                onClick={() =>
                  refreshDeskData
                    ? refreshDeskData(false)
                    : fetchReceptionChamberSession()
                }
                title="Refresh queue and appointments immediately"
              >
                {isLiveSyncing ? "Syncing..." : "Sync"}
              </ActionButton>

              <ActionButton
                variant="primary"
                size="sm"
                icon={UserPlus}
                onClick={() => {
                  setWalkInForm((prev) => ({
                    ...prev,
                    doctor_id:
                      selectedDoctorId || (assignedDoctors[0]?.id || ""),
                  }));
                  setWalkInModalOpen(true);
                }}
                title="Issue instant walk-in token"
              >
                + Walk-in Token
              </ActionButton>
            </div>
          }
        />

        {/* Restrained Operational Summary Strip */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            <span>Today:</span>
            <strong className="text-slate-800 font-semibold">{todayDateStr}</strong>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-slate-400" />
            <span>Total Clinic Queue:</span>
            <strong className="text-slate-800 font-bold font-mono">
              {todayTotalQueueCount} Patients
            </strong>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-amber-500" />
            <span>Waiting in Clinic:</span>
            <strong className="text-amber-700 font-bold font-mono">
              {todayTotalWaitingCount}
            </strong>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>Completed Today:</span>
            <strong className="text-emerald-700 font-bold font-mono">
              {todayTotalCompletedCount}
            </strong>
          </div>
        </div>

        {/* Search & Department Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={receptionSearchQuery}
              onChange={(e) => setReceptionSearchQuery(e.target.value)}
              placeholder="Search doctor by name, room # or department..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-slate-300"
            />
          </div>
          <select
            value={receptionDeptFilter}
            onChange={(e) => setReceptionDeptFilter(e.target.value)}
            className="w-full sm:w-60 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-slate-300 cursor-pointer"
          >
            <option value="ALL">
              All Departments ({assignedDoctors.length})
            </option>
            {clinic?.departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── ZONE 2: CHAMBER SELECTOR DECK ── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            document
              .getElementById("receptionDoctorStrip")
              ?.scrollBy({ left: -280, behavior: "smooth" });
          }}
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 z-10 hover:bg-[#283891] hover:text-white transition-all hidden sm:flex cursor-pointer"
          title="Scroll Left"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          id="receptionDoctorStrip"
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar px-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {filteredRosterDoctors.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 italic bg-white rounded-2xl border border-slate-200 w-full text-center">
              No chambers match your search or department filter.
            </div>
          ) : (
            filteredRosterDoctors.map((d) => {
              const isSelected = String(d.id) === String(selectedDoctorId);
              const docApts = appointments.filter(
                (a) =>
                  a.appointment_date === todayDateStr &&
                  (String(a.doctor) === String(d.id) ||
                    String(a.doctor_id) === String(d.id))
              );
              const docSeen = docApts.filter(
                (a) => a.status === "COMPLETED"
              ).length;
              const docWaiting = docApts.filter(
                (a) => a.status === "PENDING" || a.status === "CONFIRMED"
              ).length;
              const docEmergWaiting = docApts.filter(
                (a) => a.is_emergency && a.status === "CONFIRMED"
              ).length;

              const roomLabel = d.room_number
                ? d.room_number.toLowerCase().includes("room") ||
                  d.room_number.toLowerCase().includes("chamber")
                  ? d.room_number.toUpperCase()
                  : `ROOM ${d.room_number}`
                : "CHAMBER DESK";

              const isDocActiveChamber = isSelected && chamberSession;
              const nowServingSerial = isDocActiveChamber
                ? chamberSession.current_serial
                : null;
              const isDocPrayerBreak =
                isDocActiveChamber &&
                chamberSession.status === "PRAYER_BREAK";
              const isDocPaused =
                isDocActiveChamber && chamberSession.status === "PAUSED";
              const isDocEnded =
                isDocActiveChamber && chamberSession.status === "ENDED";
              const isDocEmergencyDoctor =
                isDocActiveChamber && chamberSession.status === "EMERGENCY";
              const hasHeld =
                isDocActiveChamber && !!chamberSession.held_patient;
              const hasDelay =
                isDocActiveChamber && chamberSession.delay_minutes > 0;

              return (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => {
                    setSelectedDoctorId(d.id);
                    setChamberSession(null);
                  }}
                  className={`flex-shrink-0 w-72 text-left p-4 rounded-2xl border transition-all duration-150 relative cursor-pointer select-none ${
                    isSelected
                      ? "bg-indigo-50/50 border-[#283891] shadow-xs ring-2 ring-[#283891]/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  {/* Header: Room Number & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      {roomLabel}
                    </span>
                    {isDocEnded ? (
                      <StatusBadge status="ENDED" size="xs" />
                    ) : isDocPrayerBreak ? (
                      <StatusBadge status="PRAYER_BREAK" size="xs" />
                    ) : isDocEmergencyDoctor ? (
                      <StatusBadge
                        status="EMERGENCY"
                        size="xs"
                        customLabel="Doctor in OT"
                      />
                    ) : isDocPaused ? (
                      <StatusBadge status="PAUSED" size="xs" />
                    ) : isDocActiveChamber ? (
                      <StatusBadge
                        status="IN_CHAMBER"
                        size="xs"
                        customLabel="Live"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                        Ready
                      </span>
                    )}
                  </div>

                  {/* Doctor Name & Specialty */}
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {d.full_name?.startsWith("Dr.")
                      ? d.full_name
                      : `Dr. ${d.full_name}`}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {d.department_name ||
                      d.qualification ||
                      "General Practice"}
                  </div>

                  {/* Now Serving & Counts Tally (Operational selection, NO consultation fees) */}
                  <div className="bg-slate-50 rounded-xl p-2.5 my-2.5 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Now Serving
                      </div>
                      <div className="font-mono font-bold text-base text-[#283891]">
                        {nowServingSerial ? `#${nowServingSerial}` : "—"}
                      </div>
                    </div>
                    <div className="text-right text-[11px] space-y-0.5">
                      <div className="text-amber-800 font-bold font-mono">
                        {docWaiting} Waiting
                      </div>
                      <div className="text-emerald-700 font-semibold font-mono">
                        {docSeen} Served
                      </div>
                    </div>
                  </div>

                  {/* Contextual Warning Indicators */}
                  <div className="flex items-center gap-1.5 flex-wrap min-h-[20px]">
                    {docEmergWaiting > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                        🚨 {docEmergWaiting} Priority
                      </span>
                    )}
                    {hasHeld && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        ⏸ Held Patient
                      </span>
                    )}
                    {hasDelay && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        ⏱ +{chamberSession.delay_minutes}m
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            document
              .getElementById("receptionDoctorStrip")
              ?.scrollBy({ left: 280, behavior: "smooth" });
          }}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 z-10 hover:bg-[#283891] hover:text-white transition-all hidden sm:flex cursor-pointer"
          title="Scroll Right"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Mobile/Tablet Operational View Toggle (xl:hidden) */}
      <div className="flex xl:hidden bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileViewTab("controller")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileViewTab === "controller"
              ? "bg-white text-[#283891] shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🎛️ Chamber Controller
        </button>
        <button
          type="button"
          onClick={() => setMobileViewTab("queue")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileViewTab === "queue"
              ? "bg-white text-[#283891] shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          👥 Live Dispatch ({docTodayAppointments.length})
        </button>
      </div>

      {/* ── ZONE 3: SELECTED CHAMBER WORKSPACE (Split 40:60) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (40% / 5 cols): Chamber & Serial Controller */}
        <div
          className={`xl:col-span-5 space-y-4 ${
            mobileViewTab === "queue" ? "hidden xl:block" : "block"
          }`}
        >
          {/* Active Doctor Chamber Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#283891] border border-indigo-100 flex items-center justify-center shrink-0">
                <Stethoscope size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-mono font-bold text-[11px] text-[#283891] uppercase">
                  {activeReceptionDoc?.room_number
                    ? `Chamber ${activeReceptionDoc.room_number}`
                    : "Chamber Operations Desk"}
                </div>
                <div className="font-bold text-sm text-slate-900 truncate">
                  {activeReceptionDoc?.full_name?.startsWith("Dr.")
                    ? activeReceptionDoc.full_name
                    : `Dr. ${activeReceptionDoc?.full_name}`}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {activeReceptionDoc?.department_name ||
                    activeReceptionDoc?.qualification ||
                    "General Practice"}
                </div>
              </div>
            </div>
            {selectedDoctorId && clinic && (
              <a
                href={`/queue-display/${clinic.id}/${selectedDoctorId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold shrink-0 transition-colors shadow-2xs"
                title="Open fullscreen TV screen for waiting room"
              >
                <Tv size={13} className="text-[#283891]" />
                <span>TV Display ↗</span>
              </a>
            )}
          </div>

          {chamberSession ? (
            <div className="space-y-4">
              {/* Broadcast Delay Notice (if active) */}
              {(chamberSession.delay_minutes > 0 ||
                chamberSession.announcement_note) && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900">
                  <AlertTriangle
                    className="text-amber-600 shrink-0 mt-0.5"
                    size={16}
                  />
                  <div className="text-xs">
                    {chamberSession.delay_minutes > 0 && (
                      <span className="font-bold">
                        ⏱ +{chamberSession.delay_minutes} min delay broadcast active.{" "}
                      </span>
                    )}
                    {chamberSession.announcement_note && (
                      <span className="text-amber-800">
                        {chamberSession.announcement_note}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Now Serving Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden text-center space-y-4">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#283891]" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Currently In Chamber
                  </div>
                  <div className="text-5xl font-black font-mono tracking-tight text-[#283891] my-2">
                    #{chamberSession.current_serial || 0}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Status:
                    </span>
                    <StatusBadge
                      status={chamberSession.status || "IN_CHAMBER"}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      Total Booked
                    </div>
                    <div className="text-base font-bold font-mono text-slate-800">
                      {chamberSession.total_serials ||
                        docTodayAppointments.length}
                    </div>
                  </div>
                  <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-100">
                    <div className="text-[10px] text-amber-800 font-bold uppercase">
                      Waiting
                    </div>
                    <div className="text-base font-bold font-mono text-amber-800">
                      {docWaitingCount}
                    </div>
                  </div>
                  <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-100">
                    <div className="text-[10px] text-emerald-800 font-bold uppercase">
                      Completed
                    </div>
                    <div className="text-base font-bold font-mono text-emerald-700">
                      {docSeenCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skipped Serials Strip (Click to Recall) */}
              {chamberSession.skipped_serials?.length > 0 && (
                <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-2">
                  <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Pause size={13} className="text-amber-500" />
                    <span>Skipped Serials (Click to Recall into chamber):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {chamberSession.skipped_serials.map((sn) => (
                      <button
                        type="button"
                        key={sn}
                        onClick={() =>
                          handleReceptionChamberAction(
                            "RECALL_SERIAL",
                            null,
                            sn
                          )
                        }
                        disabled={updatingChamber}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                        title={`Recall Serial #${sn}`}
                      >
                        <span>#{sn} Recall</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Emergency In Chamber Banner */}
              {chamberSession.active_emergency && (
                <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="relative flex shrink-0 mt-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white">
                          🚨 ACTIVE EMERGENCY IN CHAMBER
                        </span>
                        <span className="font-mono font-bold text-xs text-rose-900">
                          Serial #{chamberSession.active_emergency_details?.serial_number || "—"}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                        {chamberSession.active_emergency_details?.patient_name ||
                          "Emergency Patient"}
                      </div>
                      {chamberSession.active_emergency_details?.emergency_reason && (
                        <div className="text-xs text-rose-700 font-medium mt-0.5">
                          Triage Reason:{" "}
                          {chamberSession.active_emergency_details.emergency_reason}
                        </div>
                      )}
                      {chamberSession.held_patient_details && (
                        <div className="text-[11px] text-amber-800 font-semibold mt-1 bg-amber-100/70 px-2 py-0.5 rounded-md inline-block">
                          ⏸ Serial #{chamberSession.held_patient_details.serial_number} (
                          {chamberSession.held_patient_details.patient_name}) was paused and will resume next.
                        </div>
                      )}
                    </div>
                  </div>
                  <ActionButton
                    variant="danger"
                    size="sm"
                    loading={updatingChamber}
                    onClick={() =>
                      handleReceptionChamberAction("COMPLETE_EMERGENCY")
                    }
                  >
                    ✓ Complete Emergency
                  </ActionButton>
                </div>
              )}

              {/* Held Patient Paused Banner (Emergency Interruption Lifecycle Only) */}
              {chamberSession.held_patient &&
                !chamberSession.active_emergency && (
                  <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">
                          ⏸️ HELD PATIENT PAUSED
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900">
                          Serial #{chamberSession.held_patient_details?.serial_number || "—"}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {chamberSession.held_patient_details?.patient_name ||
                          "Held Patient"}
                      </div>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Consultation temporarily paused for emergency interruption. Ready to resume.
                      </p>
                    </div>
                    <ActionButton
                      variant="warning"
                      size="sm"
                      loading={updatingChamber}
                      onClick={() =>
                        handleReceptionChamberAction("RESUME_HELD")
                      }
                    >
                      ▶️ Resume Held Patient
                    </ActionButton>
                  </div>
                )}

              {/* Emergency Priority Queue Tray */}
              {emergencyWaitingPatients.length > 0 && (
                <div className="bg-rose-50/60 border border-rose-200 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-700">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Emergency Priority Queue (
                      {emergencyWaitingPatients.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Holds current serial on admit
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {emergencyWaitingPatients.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white border border-rose-200/80 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded-md font-mono font-bold text-[11px] bg-rose-600 text-white shrink-0">
                              #{a.serial_number}
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {a.patient_name ||
                                a.patient?.first_name ||
                                "Patient"}
                            </span>
                          </div>
                          {a.emergency_reason && (
                            <div className="text-[10px] text-rose-600 truncate mt-0.5">
                              {a.emergency_reason}
                            </div>
                          )}
                        </div>
                        <ActionButton
                          variant="danger"
                          size="xs"
                          disabled={
                            updatingChamber ||
                            !!chamberSession.active_emergency ||
                            chamberSession.status === "ENDED"
                          }
                          onClick={() =>
                            handleReceptionChamberAction(
                              "ADMIT_EMERGENCY",
                              null,
                              null,
                              { appointment_id: a.id, hold_current: true }
                            )
                          }
                          title={
                            chamberSession.status === "ENDED"
                              ? "Chamber session has ended. Reopen session before admitting emergency"
                              : chamberSession.active_emergency
                              ? "Chamber busy with active emergency"
                              : "Admit to chamber (holds current patient)"
                          }
                        >
                          Admit
                        </ActionButton>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fast Queue Actions Panel */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Queue Dispatch Controls
                </div>

                {/* Prayer Break Resume Prompt */}
                {chamberSession.status === "PRAYER_BREAK" && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between gap-2 text-amber-900">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>🕌 Doctor on Prayer Break (Queue Paused)</span>
                    </div>
                    <ActionButton
                      variant="warning"
                      size="xs"
                      disabled={updatingChamber}
                      onClick={() =>
                        handleReceptionChamberAction(
                          "UPDATE_STATUS",
                          "IN_CHAMBER"
                        )
                      }
                    >
                      ▶ Resume Queue
                    </ActionButton>
                  </div>
                )}

                {/* Session Ended Reopen Prompt */}
                {chamberSession.status === "ENDED" && (
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-2 text-white">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>⏹ Chamber Session Ended (Queue Locked)</span>
                    </div>
                    <ActionButton
                      variant="warning"
                      size="xs"
                      disabled={updatingChamber}
                      onClick={() =>
                        handleReceptionChamberAction(
                          "UPDATE_STATUS",
                          "IN_CHAMBER"
                        )
                      }
                    >
                      ▶ Reopen Session
                    </ActionButton>
                  </div>
                )}

                {/* Primary Action Button (Call Next Serial) */}
                <ActionButton
                  variant="primary"
                  size="lg"
                  className="w-full shadow-sm"
                  icon={FastForward}
                  loading={updatingChamber}
                  disabled={
                    updatingChamber ||
                    !!chamberSession.active_emergency ||
                    !!chamberSession.held_patient ||
                    chamberSession.status === "PRAYER_BREAK" ||
                    chamberSession.status === "ENDED"
                  }
                  onClick={() =>
                    handleReceptionChamberAction("NEXT_SERIAL")
                  }
                  title={
                    chamberSession.status === "ENDED"
                      ? "Chamber session has ended. Reopen session before calling next serial"
                      : chamberSession.status === "PRAYER_BREAK"
                      ? "Chamber is on Prayer Break. Resume 'In Chamber' before calling next serial"
                      : chamberSession.active_emergency
                      ? "Cannot call next serial while emergency patient is in chamber"
                      : chamberSession.held_patient
                      ? "Resume held patient first"
                      : "Call Next Serial"
                  }
                >
                  Call Next Serial
                </ActionButton>

                {/* Secondary Actions (Skip Serial & Reset) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <ActionButton
                    variant="outline"
                    size="sm"
                    icon={Pause}
                    disabled={
                      updatingChamber ||
                      !chamberSession.current_serial ||
                      !!chamberSession.active_emergency ||
                      !!chamberSession.held_patient ||
                      chamberSession.status === "PRAYER_BREAK" ||
                      chamberSession.status === "ENDED"
                    }
                    onClick={() =>
                      handleReceptionChamberAction("SKIP_SERIAL")
                    }
                    title={
                      chamberSession.status === "ENDED"
                        ? "Chamber session has ended. Reopen session before skipping serials"
                        : chamberSession.status === "PRAYER_BREAK"
                        ? "Chamber is on Prayer Break. Resume 'In Chamber' before skipping serials"
                        : "Skip Serial"
                    }
                  >
                    Skip Serial
                  </ActionButton>

                  <ActionButton
                    variant="ghost"
                    size="sm"
                    icon={RotateCcw}
                    disabled={
                      updatingChamber ||
                      !!chamberSession.active_emergency ||
                      !!chamberSession.held_patient ||
                      chamberSession.status === "ENDED"
                    }
                    onClick={() => handleReceptionChamberAction("RESET")}
                  >
                    Reset Queue
                  </ActionButton>
                </div>

                {/* Chamber State Quick Switch */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                    Chamber Operational State
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      {
                        label: "In Chamber",
                        status: "IN_CHAMBER",
                        variant: "success",
                      },
                      {
                        label: "Break",
                        status: "PRAYER_BREAK",
                        variant: "warning",
                      },
                      {
                        label: "Paused",
                        status: "PAUSED",
                        variant: "outline",
                      },
                      {
                        label: "Session Ended",
                        status: "ENDED",
                        variant: "danger",
                      },
                    ].map((b) => (
                      <ActionButton
                        key={b.status}
                        variant={b.variant}
                        size="xs"
                        className={
                          chamberSession.status === b.status
                            ? "ring-2 ring-[#283891]/30 font-bold"
                            : "opacity-80"
                        }
                        disabled={
                          updatingChamber || chamberSession.status === b.status
                        }
                        onClick={() =>
                          handleReceptionChamberAction(
                            "UPDATE_STATUS",
                            b.status
                          )
                        }
                      >
                        {b.label}
                      </ActionButton>
                    ))}
                  </div>
                </div>

                {/* Delay Notice Button */}
                <div className="pt-1">
                  <ActionButton
                    variant="outline"
                    size="xs"
                    className="w-full"
                    icon={AlertTriangle}
                    onClick={() => setDelayModalOpen(true)}
                  >
                    Broadcast Delay / Notice
                  </ActionButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <Tv size={36} className="mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-800">
                No active queue session found for today.
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Start today&apos;s live chamber session for this doctor to enable serial call and TV screen sync.
              </p>
              <ActionButton
                variant="primary"
                size="sm"
                icon={Play}
                disabled={updatingChamber}
                loading={updatingChamber}
                onClick={() =>
                  handleReceptionChamberAction("UPDATE_STATUS", "NOT_STARTED")
                }
              >
                Start Chamber Session
              </ActionButton>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (60% / 7 cols): Live Patient Queue Roster */}
        <div
          className={`xl:col-span-7 ${
            mobileViewTab === "controller" ? "hidden xl:block" : "block"
          }`}
        >
          <TableShell
            title="Today's Live Patient Queue"
            subtitle={`Patients scheduled for Dr. ${activeReceptionDoc?.full_name || "Doctor"} today`}
            badge={
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-[#283891] border border-indigo-100">
                {docTodayAppointments.length}
              </span>
            }
            actions={
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQueueFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    queueFilter === "ALL"
                      ? "bg-[#283891] text-white shadow-2xs font-bold"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({docTodayAppointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter("WAITING")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    queueFilter === "WAITING"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Waiting ({docWaitingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter("EMERGENCY")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    queueFilter === "EMERGENCY"
                      ? "bg-rose-600 text-white font-bold shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Priority (
                  {
                    docTodayAppointments.filter((a) => a.is_emergency).length
                  }
                  )
                </button>
              </div>
            }
            headers={[
              "Serial",
              "Patient Name & Phone",
              "Time",
              "Priority",
              "Queue Status",
              "Actions",
            ]}
            empty={docTodayAppointments.length === 0}
            emptyMessage="No appointments booked for this doctor today."
            footer={
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Summary: <strong>{docSeenCount} Completed</strong> ·{" "}
                  <strong>{docWaitingCount} Waiting</strong>
                </span>
                <span className="text-[11px] text-slate-400">
                  Appointments are ordered by authoritative schedule serial
                </span>
              </div>
            }
          >
            {docTodayAppointments
              .filter((apt) => {
                if (queueFilter === "WAITING") {
                  return (
                    apt.status === "PENDING" || apt.status === "CONFIRMED"
                  );
                }
                if (queueFilter === "EMERGENCY") {
                  return !!apt.is_emergency;
                }
                return true;
              })
              .map((apt, index) => {
                const isCompleted = apt.status === "COMPLETED";
                const isCancelled = apt.status === "CANCELLED";
                const isInChamber =
                  chamberSession &&
                  chamberSession.current_serial ===
                    (apt.serial_number || index + 1);

                return (
                  <tr
                    key={apt.id || index}
                    className={`hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0 ${
                      isInChamber
                        ? "bg-emerald-50/40"
                        : isCompleted
                        ? "opacity-60 bg-slate-50/30"
                        : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md ${
                          isInChamber
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        #{apt.serial_number || index + 1}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="truncate">
                          {apt.patient_name || apt.user_name || "Patient"}
                        </span>
                        {isInChamber && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            Serving
                          </span>
                        )}
                        {apt.is_emergency && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                            Priority
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {apt.patient_phone || apt.phone || "—"}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {apt.appointment_time || "Morning"}
                    </td>

                    <td className="py-3 px-4">
                      {/* Priority toggle button — STRICT PRIVACY: emergency_reason NOT in title or DOM */}
                      <button
                        type="button"
                        onClick={() => handleToggleEmergency(apt)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                          apt.is_emergency
                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            : "bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700"
                        }`}
                        title={
                          apt.is_emergency
                            ? "Remove Emergency Priority"
                            : "Flag as Emergency Priority"
                        }
                      >
                        <AlertTriangle size={12} />
                        <span>{apt.is_emergency ? "Priority" : "Normal"}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge
                        status={
                          isInChamber
                            ? "IN_CHAMBER"
                            : apt.status || "WAITING"
                        }
                        size="xs"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {setPrintTokenData && (
                          <button
                            type="button"
                            onClick={() => setPrintTokenData(apt)}
                            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-[#283891] hover:border-[#283891]/40 hover:bg-indigo-50/50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Print / Reprint Thermal Token Slip"
                          >
                            <Printer size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </TableShell>
        </div>
      </div>

      {/* ── BROADCAST DELAY MODAL (ModalShell) ── */}
      <ModalShell
        isOpen={delayModalOpen}
        onClose={() => setDelayModalOpen(false)}
        title="Broadcast Delay & Notice"
        subtitle="This will immediately push an operational notice to all patient waiting room displays for this doctor's queue."
        size="md"
        footer={
          <>
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => setDelayModalOpen(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="warning"
              size="sm"
              icon={AlertTriangle}
              loading={broadcastingDelay}
              onClick={handleBroadcastReceptionDelay}
            >
              Broadcast Now
            </ActionButton>
          </>
        }
      >
        <form onSubmit={handleBroadcastReceptionDelay} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Delay (minutes) *
            </label>
            <input
              type="number"
              min="0"
              max="180"
              value={receptionDelayMins}
              onChange={(e) => setReceptionDelayMins(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300"
              placeholder="e.g. 30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Announcement Message (optional)
            </label>
            <textarea
              value={receptionNotice}
              onChange={(e) => setReceptionNotice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300"
              placeholder="e.g. Doctor is delayed in surgery, consulting will resume shortly..."
              rows={3}
            />
          </div>
        </form>
      </ModalShell>

      {/* ── WALK-IN PATIENT ENTRY MODAL (ModalShell) ── */}
      <ModalShell
        isOpen={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        title={t("walkInModalTitle") || "Register Walk-in Patient"}
        subtitle="Issue instant serial token for counter patient with cash payment recording"
        size="lg"
        footer={
          <>
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => setWalkInModalOpen(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="primary"
              size="sm"
              icon={Printer}
              loading={submittingWalkIn}
              onClick={handleCreateWalkIn}
            >
              Confirm &amp; Issue Token Slip
            </ActionButton>
          </>
        }
      >
        <form onSubmit={handleCreateWalkIn} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number *
                {searchingPatient && (
                  <span className="ml-2 text-[10px] text-[#283891] font-semibold animate-pulse">
                    Searching profile...
                  </span>
                )}
              </label>
              <input
                type="tel"
                required
                value={walkInForm.walk_in_phone}
                onChange={(e) =>
                  setWalkInForm({
                    ...walkInForm,
                    walk_in_phone: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-slate-300"
                placeholder="e.g. 01712345678"
              />
              {foundPatient ? (
                <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>
                    <strong>Registered:</strong> {foundPatient.full_name} (
                    {foundPatient.clinic_visits_count} past visits)
                  </span>
                </div>
              ) : (
                walkInForm.walk_in_phone?.length >= 11 &&
                !searchingPatient && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    New walk-in patient profile will be created
                  </div>
                )
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Patient Full Name *
              </label>
              <input
                type="text"
                required
                value={walkInForm.walk_in_name}
                onChange={(e) =>
                  setWalkInForm({
                    ...walkInForm,
                    walk_in_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-slate-300"
                placeholder="e.g. Md. Rafiqul Islam"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Doctor *
              </label>
              <select
                required
                value={walkInForm.doctor_id}
                onChange={(e) =>
                  setWalkInForm({
                    ...walkInForm,
                    doctor_id: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-slate-300"
              >
                <option value="">-- Select Doctor --</option>
                {assignedDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Time Slot (Optional)
              </label>
              <input
                type="time"
                value={walkInForm.appointment_time}
                onChange={(e) =>
                  setWalkInForm({
                    ...walkInForm,
                    appointment_time: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chief Complaint / Notes (Optional)
            </label>
            <input
              type="text"
              value={walkInForm.problem_description}
              onChange={(e) =>
                setWalkInForm({
                  ...walkInForm,
                  problem_description: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-slate-300"
              placeholder="e.g. High fever for 3 days, headache"
            />
          </div>

          {/* Emergency / Urgent Priority Toggle in Walk-in */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="rounded text-rose-600 focus:ring-rose-500"
                checked={walkInForm.is_emergency || false}
                onChange={(e) =>
                  setWalkInForm({
                    ...walkInForm,
                    is_emergency: e.target.checked,
                  })
                }
              />
              <div>
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                  <AlertTriangle size={13} /> Urgent / Emergency Patient (জরুরি অগ্রাধিকার)
                </span>
                <p className="text-[11px] text-slate-500">
                  Flags patient for chamber priority without altering authoritative serial numbering.
                </p>
              </div>
            </label>
            {walkInForm.is_emergency && (
              <div>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  placeholder="Emergency Reason (e.g. Chest pain, severe trauma, respiratory distress)"
                  value={walkInForm.emergency_reason || ""}
                  onChange={(e) =>
                    setWalkInForm({
                      ...walkInForm,
                      emergency_reason: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
            <div className="flex justify-between font-bold text-slate-800">
              <span>Payment Mode:</span>
              <span className="text-emerald-700 font-bold">
                {t("cashAtCounterInstant") || "Cash at Counter (Instant Paid)"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Appointment will be immediately confirmed, serial token assigned, and cash transaction recorded in finance audit.
            </p>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
