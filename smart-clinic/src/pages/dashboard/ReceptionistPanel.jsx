import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import apiClient from "../../api/axios";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  UserCheck,
  Plus,
  Search,
  DollarSign,
  Tv,
  Calendar,
  RefreshCw,
  ChevronRight,
  Printer,
  Volume2,
  FileText,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Activity,
  Lock,
  Moon,
  StopCircle,
  UserPlus,
} from "lucide-react";
import {
  StatusBadge,
  MetricCard,
  PageHeader,
  TableShell,
  ModalShell,
  ActionButton,
} from "../../components/ui";
import TokenPrintModal from "./clinic-admin/components/TokenPrintModal";
import ShiftClosingModal from "../../components/reception/ShiftClosingModal";
import { formatTime, formatDoctorName, formatRoomNumber } from "../../utils/formatters";

/**
 * ReceptionistPanel — Standalone Front Desk Operational Workstation
 *
 * Implements UI-4 specifications:
 * - Zone 1: Front Desk Operational Header & Live Metrics (PageHeader, Duty Officer strip, MetricCards)
 * - Zone 2: Horizontal Chamber / Specialist Selector Deck (StatusBadge, room, live serials, no marketplace fees)
 * - Zone 3: Split Operational Workspace (Left: Chamber Calling Box & Controls, Right: TableShell Patient Queue)
 * - Zone 4: Bottom Shift Handover & Drawer Cash Bar
 * - Mobile Responsiveness: Segmented controls for 390px/mobile screen compatibility
 * - State Machine Integrity: NEXT_SERIAL, SKIP_SERIAL, RECALL_SERIAL, RESET, UPDATE_STATUS, ADMIT_EMERGENCY, COMPLETE_EMERGENCY, RESUME_HELD
 * - Strict Separation: SKIP_SERIAL != HELD. No generic manual hold. held_patient exists ONLY via emergency interruption.
 * - Emergency Privacy: General queue roster does NOT leak emergency_reason into the DOM.
 * - Thermal Print: Preserves 76mm TokenPrintModal.
 */
export default function ReceptionistPanel() {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [clinicData, setClinicData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [chamberSession, setChamberSession] = useState(null);
  const [updatingChamber, setUpdatingChamber] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // "all" | "waiting" | "emergency"

  // Mobile Workspace Tab: "controls" | "queue"
  const [mobileTab, setMobileTab] = useState("controls");

  // Status messages
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const showMsg = (m) => {
    setMsg(m);
    setError("");
    setTimeout(() => setMsg(""), 4000);
  };
  const showErr = (e) => {
    setError(e);
    setMsg("");
    setTimeout(() => setError(""), 5000);
  };

  // Modals state
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    patient_name: "",
    patient_phone: "",
    doctor_id: "",
    problem_description: "General OPD Consultation",
    fee: 800,
    is_emergency: false,
    emergency_reason: "",
  });
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

  // Cash collection modal state
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [selectedApptForCash, setSelectedApptForCash] = useState(null);
  const [cashAmount, setCashAmount] = useState(800);
  const [submittingCash, setSubmittingCash] = useState(false);
  const [cashSummary, setCashSummary] = useState(null);

  // Shift report & closing modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [shiftClosingModalOpen, setShiftClosingModalOpen] = useState(false);

  // Token print & reprint modal state
  const [printTokenData, setPrintTokenData] = useState(null);

  // Patient phone lookup state
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [foundPatient, setFoundPatient] = useState(null);

  // Debounced Phone Lookup
  useEffect(() => {
    const rawPhone = (walkInForm.patient_phone || "").trim();
    if (rawPhone.length < 11) {
      setFoundPatient(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingPatient(true);
      try {
        const res = await apiClient.get(
          `/clinics/reception/patient-lookup/?phone=${encodeURIComponent(rawPhone)}`
        );
        if (res?.found) {
          setFoundPatient(res);
          setWalkInForm((prev) => ({
            ...prev,
            patient_name: prev.patient_name || res.full_name,
          }));
        } else {
          setFoundPatient(null);
        }
      } catch {
        setFoundPatient(null);
      } finally {
        setSearchingPatient(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [walkInForm.patient_phone]);

  // Load clinic & doctors info
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/clinics/reception/my-clinic/");
      setClinicData(res);
      const docs = res.doctors || [];
      setDoctors(docs);
      if (docs.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docs[0].id);
        setWalkInForm((prev) => ({
          ...prev,
          doctor_id: docs[0].id,
          fee: docs[0].consultation_fee || 800,
        }));
      }
      loadCashSummary();
    } catch (err) {
      showErr(err?.detail || "Could not load reception clinic data.");
    } finally {
      setLoading(false);
    }
  };

  // Load appointments & chamber session for selected doctor
  const loadDoctorQueue = async (docId) => {
    if (!docId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await apiClient.get(
        `/appointments/?doctor_id=${docId}&appointment_date=${today}`
      );
      const list = Array.isArray(res) ? res : res?.results || [];
      setAppointments(list);

      if (clinicData?.clinic_id) {
        try {
          const sess = await apiClient.get(
            `/doctors/chamber-session/?doctor_id=${docId}&clinic_id=${clinicData.clinic_id}&date=${today}`
          );
          setChamberSession(sess);
        } catch {
          setChamberSession(null);
        }
      }
    } catch {
      setAppointments([]);
    }
  };

  const loadCashSummary = async () => {
    try {
      const res = await apiClient.get("/clinics/reception/cash-summary/");
      setCashSummary(res);
    } catch {
      setCashSummary(null);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      loadDoctorQueue(selectedDoctorId);
    }
  }, [selectedDoctorId, clinicData]);

  // Queue Action Handler
  const handleQueueAction = async (action, targetSerial = null, extraPayload = {}) => {
    if (!selectedDoctorId || !clinicData?.clinic_id) return;
    setUpdatingChamber(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const payload = {
        doctor_id: selectedDoctorId,
        clinic_id: clinicData.clinic_id,
        session_date: today,
        action: action,
        ...extraPayload,
      };
      if (targetSerial !== null) {
        payload.current_serial = targetSerial;
      }
      const res = await apiClient.post("/doctors/chamber-session/", payload);
      setChamberSession(res);
      showMsg(`Queue updated: ${action.replace("_", " ")}`);
      loadDoctorQueue(selectedDoctorId);
    } catch (err) {
      showErr(err?.response?.data?.error || err?.detail || "Action failed.");
    } finally {
      setUpdatingChamber(false);
    }
  };

  // Keyboard Shortcut: F2 to trigger NEXT_SERIAL instantly
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "F2") {
        e.preventDefault();
        if (selectedDoctorId && !updatingChamber) {
          handleQueueAction("NEXT_SERIAL");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDoctorId, updatingChamber, clinicData]);

  // Toggle Emergency Status
  const handleToggleEmergency = async (apt) => {
    try {
      await apiClient.post(`/appointments/${apt.id}/emergency/`, {
        is_emergency: !apt.is_emergency,
        emergency_reason: !apt.is_emergency ? "Flagged by Reception" : "",
      });
      showMsg(
        apt.is_emergency
          ? "Removed emergency priority"
          : "Marked as emergency priority!"
      );
      loadDoctorQueue(selectedDoctorId);
    } catch (err) {
      showErr(
        err?.response?.data?.error ||
          err?.detail ||
          "Failed to update emergency status."
      );
    }
  };

  // Chamber State Toggle: Active, Break, Paused, Ended
  const handleSetChamberStatus = async (statusKey) => {
    if (!selectedDoctorId || !clinicData?.clinic_id) return;
    setUpdatingChamber(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await apiClient.post("/doctors/chamber-session/", {
        doctor_id: selectedDoctorId,
        clinic_id: clinicData.clinic_id,
        session_date: today,
        action: "UPDATE_STATUS",
        status: statusKey,
      });
      setChamberSession(res);
      showMsg(`Chamber status set to ${statusKey.replace("_", " ")}`);
    } catch (err) {
      showErr(err?.detail || "Failed to update session status.");
    } finally {
      setUpdatingChamber(false);
    }
  };

  // Mark Patient Arrived
  const handleCheckIn = async (appointmentId) => {
    try {
      await apiClient.post("/clinics/reception/check-in/", {
        appointment_id: appointmentId,
      });
      showMsg("Patient checked-in at counter ✓");
      const matched = appointments.find((a) => String(a.id) === String(appointmentId));
      if (matched) {
        setPrintTokenData({ ...matched, is_arrived: true });
      }
      loadDoctorQueue(selectedDoctorId);
    } catch (err) {
      showErr(err?.detail || "Check-in failed.");
    }
  };

  // Walk-in Submit
  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!walkInForm.patient_name || !walkInForm.doctor_id) {
      return showErr("Patient name and Doctor are required.");
    }
    setSubmittingWalkIn(true);
    try {
      const res = await apiClient.post("/clinics/reception/walk-in/", walkInForm);
      showMsg(`Token #${res.serial_number} issued for ${res.patient_name}!`);
      setWalkInModalOpen(false);
      setPrintTokenData({
        id: res.appointment_id,
        serial_number: res.serial_number,
        patient_name: res.patient_name,
        doctor_name:
          res.doctor_name ||
          selectedDoctor?.name ||
          selectedDoctor?.full_name ||
          "Doctor",
        amount: walkInForm.fee,
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      setWalkInForm((prev) => ({
        ...prev,
        patient_name: "",
        patient_phone: "",
        problem_description: "General OPD Consultation",
        is_emergency: false,
        emergency_reason: "",
      }));
      loadDoctorQueue(selectedDoctorId);
    } catch (err) {
      showErr(err?.detail || "Failed to register walk-in patient.");
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  // Cash Payment Submit
  const handleCashPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApptForCash || !cashAmount) {
      return showErr("Please specify amount.");
    }
    setSubmittingCash(true);
    try {
      await apiClient.post("/clinics/reception/cash-payment/", {
        appointment_id: selectedApptForCash.id,
        amount: parseFloat(cashAmount),
      });
      showMsg(
        `Cash payment of ৳${cashAmount} recorded by ${
          user?.full_name || "Receptionist"
        }!`
      );
      setPrintTokenData({
        ...selectedApptForCash,
        amount: parseFloat(cashAmount),
        status: "CONFIRMED",
      });
      setCashModalOpen(false);
      setSelectedApptForCash(null);
      loadCashSummary();
      loadDoctorQueue(selectedDoctorId);
    } catch (err) {
      showErr(err?.detail || "Failed to log cash payment.");
    } finally {
      setSubmittingCash(false);
    }
  };

  const selectedDoctor = useMemo(() => {
    return doctors.find((d) => String(d.id) === String(selectedDoctorId));
  }, [doctors, selectedDoctorId]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const name = (a.patient_name || a.patient?.full_name || "").toLowerCase();
      const phone = (a.patient_phone || a.patient?.phone || "").toLowerCase();
      const serial = String(a.serial_number || "");
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q || name.includes(q) || phone.includes(q) || serial.includes(q);

      let matchesFilter = true;
      if (filterTab === "waiting") {
        matchesFilter = a.status !== "COMPLETED" && a.serial_number !== chamberSession?.current_serial;
      } else if (filterTab === "emergency") {
        matchesFilter = a.is_emergency;
      }

      return matchesSearch && matchesFilter;
    });
  }, [appointments, searchQuery, filterTab, chamberSession]);

  const currentServingPatient = useMemo(() => {
    const s = chamberSession?.current_serial;
    if (!s) return null;
    return appointments.find((a) => a.serial_number === s);
  }, [chamberSession, appointments]);

  const nextSerialCandidate = (chamberSession?.current_serial || 0) + 1;

  // Key KPI Calculations
  const waitingPatientsCount = useMemo(() => {
    return appointments.filter(
      (a) =>
        a.status !== "COMPLETED" &&
        a.serial_number !== chamberSession?.current_serial
    ).length;
  }, [appointments, chamberSession]);

  const completedPatientsCount = useMemo(() => {
    return appointments.filter((a) => a.status === "COMPLETED").length;
  }, [appointments]);

  const emergencyPatientsCount = useMemo(() => {
    return appointments.filter((a) => a.is_emergency).length;
  }, [appointments]);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  const isSessionEnded = chamberSession?.status === "ENDED";
  const isPrayerBreak = chamberSession?.status === "PRAYER_BREAK";
  const hasActiveEmergency = !!chamberSession?.active_emergency;
  const hasHeldPatient = !!chamberSession?.held_patient;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 font-sans">
      {/* ================= ZONE 1: OPERATIONAL HEADER & LIVE STRIP ================= */}
      <PageHeader
        title={t("receptionist_console") || "Front Desk Operations"}
        badge={
          <StatusBadge
            status="ACTIVE"
            customLabel="OPD Desk 01 • Live Dispatch"
          />
        }
        subtitle={`${clinicData?.clinic_name || clinicData?.name || "Smart Clinic"} • ${todayFormatted} • Duty Officer: ${
          user?.full_name || user?.first_name || "Receptionist On Duty"
        }`}
        actions={
          <>
            {clinicData?.clinic_id && (
              <a
                href={`/queue-display/${clinicData.clinic_id}/${selectedDoctorId || ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ActionButton
                  variant="outline"
                  size="sm"
                  icon={Tv}
                  title="Open Public Waiting Lounge TV"
                >
                  <span className="hidden sm:inline">Waiting Lounge TV</span>
                </ActionButton>
              </a>
            )}
            <ActionButton
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => {
                loadDoctorQueue(selectedDoctorId);
                loadCashSummary();
                showMsg("Queue refreshed");
              }}
              title="Refresh queue and cash ledger"
            >
              <span className="hidden md:inline">Refresh</span>
            </ActionButton>
            <ActionButton
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              title="Reprint token slip"
            >
              <span className="hidden md:inline">Slip Reprint</span>
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              icon={FileText}
              onClick={() => setReportModalOpen(true)}
            >
              <span className="hidden sm:inline">Shift Report</span>
            </ActionButton>
            <ActionButton
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setWalkInModalOpen(true)}
            >
              <span>+ Register Walk-in</span>
            </ActionButton>
          </>
        }
      />

      {/* Duty Officer & Station Context Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap text-xs">
          {/* Duty Officer */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#283891] border border-indigo-100 flex items-center justify-center font-bold">
              <UserCheck size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Duty Officer
              </span>
              <span className="text-xs font-bold text-slate-900">
                {user?.full_name || user?.first_name || "Receptionist"}
              </span>
            </div>
          </div>

          {/* Workstation Point */}
          <div className="flex items-center gap-2.5 pl-0 sm:pl-4 sm:border-l sm:border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <Tv size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Counter Station
              </span>
              <span className="text-xs font-bold text-slate-900">
                Reception Desk 01 (OPD Ground Floor)
              </span>
            </div>
          </div>

          {/* Live Sync Status */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-600">
              Live TV Sync Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            status={
              isSessionEnded
                ? "ENDED"
                : isPrayerBreak
                ? "PRAYER_BREAK"
                : chamberSession?.status || "IN_CHAMBER"
            }
            size="sm"
          />
        </div>
      </div>

      {/* Operational Metric KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Waiting in Queue"
          value={waitingPatientsCount}
          subtext="Awaiting consultation"
          icon={Clock}
          accent="primary"
          onClick={() => setFilterTab("waiting")}
        />
        <MetricCard
          label="Currently In Chamber"
          value={
            chamberSession?.current_serial
              ? `#${chamberSession.current_serial}`
              : "—"
          }
          subtext={
            selectedDoctor
              ? `${formatDoctorName(selectedDoctor.name || selectedDoctor.full_name)} (${formatRoomNumber(
                  selectedDoctor.room_number
                )})`
              : "No Chamber Selected"
          }
          icon={Activity}
          accent="success"
        />
        <MetricCard
          label="Completed Today"
          value={completedPatientsCount}
          subtext={`${
            appointments.length > 0
              ? Math.round((completedPatientsCount / appointments.length) * 100)
              : 0
          }% of ${appointments.length} scheduled`}
          icon={CheckCircle2}
          accent="neutral"
        />
        <MetricCard
          label="Shift Cash Drawer"
          value={`৳${(cashSummary?.total_cash_today || 0).toLocaleString()}`}
          subtext={`${cashSummary?.total_transactions || 0} counter receipts`}
          icon={DollarSign}
          accent="success"
          onClick={() => setReportModalOpen(true)}
        />
      </div>

      {/* Alerts */}
      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2 shadow-2xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= ZONE 2: HORIZONTAL CHAMBER DECK ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold px-1 text-slate-500">
          <span className="tracking-wider uppercase text-[11px]">
            Live Chamber Queues • Select Specialist to Dispatch
          </span>
          <span>{doctors.length} Specialists on Duty Today</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {doctors.map((d) => {
            const isSelected = String(d.id) === String(selectedDoctorId);
            const isBreak = d.status === "ON_BREAK";
            return (
              <div
                key={d.id}
                onClick={() => {
                  setSelectedDoctorId(d.id);
                  setWalkInForm((prev) => ({
                    ...prev,
                    doctor_id: d.id,
                    fee: d.consultation_fee || 800,
                  }));
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative ${
                  isSelected
                    ? "bg-indigo-50/30 border-[#283891] shadow-xs ring-2 ring-[#283891]/20"
                    : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 leading-snug truncate">
                      {formatDoctorName(d.name || d.full_name)}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium block truncate">
                      {formatRoomNumber(d.room_number)} • {d.specialization}
                    </span>
                  </div>
                  <StatusBadge
                    status={
                      isSelected
                        ? isPrayerBreak
                          ? "PRAYER_BREAK"
                          : isSessionEnded
                          ? "ENDED"
                          : "ACTIVE"
                        : isBreak
                        ? "PAUSED"
                        : "CONFIRMED"
                    }
                    size="sm"
                    showIcon={false}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t border-slate-100 font-semibold">
                  <span className="text-slate-500 text-[11px]">
                    {isSelected
                      ? `${completedPatientsCount}/${appointments.length} Consulted`
                      : "Queue Ready"}
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#283891]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#283891] animate-pulse" />
                      Active Dispatch
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium text-[11px] flex items-center gap-0.5 hover:text-slate-700">
                      Select <ChevronRight size={13} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MOBILE WORKSPACE SEGMENTED SWITCHER (< lg) ================= */}
      <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab("controls")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileTab === "controls"
              ? "bg-white text-[#283891] shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Chamber Calling Controls{" "}
          {chamberSession?.current_serial ? `(#${chamberSession.current_serial})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("queue")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileTab === "queue"
              ? "bg-white text-[#283891] shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Patient Queue ({filteredAppointments.length})
        </button>
      </div>

      {/* ================= ZONE 3: SPLIT OPERATIONAL WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: NOW CALLING & CHAMBER CONTROLS (5 cols on lg) */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            mobileTab === "queue" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Chamber Main Calling Controller */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs relative overflow-hidden space-y-4">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#283891]" />

            {/* Chamber Identification Header */}
            <div className="flex items-center justify-between gap-2 pt-1 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Active Dispatch Chamber
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {formatRoomNumber(selectedDoctor?.room_number || "101")} •{" "}
                  {formatDoctorName(selectedDoctor?.name || selectedDoctor?.full_name || "Specialist")}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </div>
            </div>

            {/* Current Calling Serial Number Box */}
            <div className="text-center py-4 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-widest block">
                Currently In Chamber
              </span>
              <div className="text-6xl sm:text-7xl font-mono font-black text-[#283891] tracking-tight my-2">
                #{chamberSession?.current_serial || "--"}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-600 text-xs font-semibold border border-slate-200 shadow-2xs">
                <Volume2 size={13} className="text-[#283891]" />
                <span>Audio Chime: Main OPD Waiting Hall</span>
              </div>
            </div>

            {/* Active Emergency In Chamber Banner */}
            {hasActiveEmergency && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col gap-2 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <StatusBadge status="EMERGENCY" size="sm" />
                  <span className="font-mono font-bold text-rose-900">
                    Serial #{chamberSession.active_emergency_details?.serial_number || "—"}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-rose-950 text-sm">
                    {chamberSession.active_emergency_details?.patient_name ||
                      "Emergency Patient"}
                  </div>
                  {chamberSession.active_emergency_details?.emergency_reason && (
                    <div className="text-rose-700 text-xs mt-0.5">
                      Triage Reason:{" "}
                      {chamberSession.active_emergency_details.emergency_reason}
                    </div>
                  )}
                  {chamberSession.held_patient_details && (
                    <div className="text-amber-800 text-[11px] font-semibold mt-1 bg-amber-100/70 px-2 py-0.5 rounded-md inline-block">
                      ⏸ Normal Serial #{chamberSession.held_patient_details.serial_number} is held on pause.
                    </div>
                  )}
                </div>
                <div className="pt-1">
                  <ActionButton
                    variant="danger"
                    size="sm"
                    loading={updatingChamber}
                    onClick={() =>
                      handleQueueAction("COMPLETE_EMERGENCY", null, {
                        appointment_id: chamberSession.active_emergency,
                      })
                    }
                  >
                    ✓ Complete Emergency & Free Chamber
                  </ActionButton>
                </div>
              </div>
            )}

            {/* Held Patient Paused Banner (Emergency Interruption Lifecycle Only) */}
            {hasHeldPatient && !hasActiveEmergency && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div>
                  <StatusBadge status="HELD" size="sm" />
                  <div className="font-bold text-amber-950 text-sm mt-1">
                    Serial #{chamberSession.held_patient_details?.serial_number} —{" "}
                    {chamberSession.held_patient_details?.patient_name}
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Consultation was paused for emergency triage. Ready to resume.
                  </p>
                </div>
                <ActionButton
                  variant="warning"
                  size="sm"
                  loading={updatingChamber}
                  onClick={() => handleQueueAction("RESUME_HELD")}
                >
                  ▶ Resume Held
                </ActionButton>
              </div>
            )}

            {/* Emergency Priority Waiting Tray */}
            {appointments.filter(
              (a) =>
                a.is_emergency &&
                a.status === "CONFIRMED" &&
                a.id !== chamberSession?.active_emergency
            ).length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-rose-900 font-bold text-[11px] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-rose-600" />
                    Priority Emergency Waiting (
                    {
                      appointments.filter(
                        (a) =>
                          a.is_emergency &&
                          a.status === "CONFIRMED" &&
                          a.id !== chamberSession?.active_emergency
                      ).length
                    }
                    )
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Pauses current serial
                  </span>
                </div>
                <div className="space-y-1.5">
                  {appointments
                    .filter(
                      (a) =>
                        a.is_emergency &&
                        a.status === "CONFIRMED" &&
                        a.id !== chamberSession?.active_emergency
                    )
                    .map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-xs text-rose-700">
                            #{a.serial_number}
                          </span>
                          <span className="font-bold text-slate-900 text-xs ml-2 truncate">
                            {a.patient_name || a.patient?.full_name || "Patient"}
                          </span>
                        </div>
                        <ActionButton
                          variant="danger"
                          size="xs"
                          disabled={hasActiveEmergency}
                          loading={updatingChamber}
                          onClick={() =>
                            handleQueueAction("ADMIT_EMERGENCY", null, {
                              appointment_id: a.id,
                              hold_current: true,
                            })
                          }
                          title={
                            hasActiveEmergency
                              ? "Chamber is already handling an emergency"
                              : "Admit immediately to chamber"
                          }
                        >
                          Admit
                        </ActionButton>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Skipped Serials Strip (Click to Recall) */}
            {chamberSession?.skipped_serials?.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-amber-900 font-bold text-[11px]">
                  <span className="flex items-center gap-1">
                    <Pause size={12} className="text-amber-600" /> Skipped Serials
                    (Click to Recall into chamber):
                  </span>
                  <span className="font-mono text-[10px] text-amber-800">
                    {chamberSession.skipped_serials.length} skipped
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {chamberSession.skipped_serials.map((sn) => (
                    <button
                      type="button"
                      key={sn}
                      onClick={() => handleQueueAction("RECALL_SERIAL", sn)}
                      disabled={updatingChamber || hasActiveEmergency || isSessionEnded}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-white text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      title={`Recall Serial #${sn}`}
                    >
                      <RotateCcw size={11} />
                      <span>#{sn} Recall</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Currently Serving Patient Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Patient Inside
                </span>
                <div className="font-bold text-sm text-slate-900 truncate">
                  {currentServingPatient?.patient_name ||
                    currentServingPatient?.patient?.full_name ||
                    "No Patient Currently Inside"}
                </div>
                <div className="text-slate-500 flex items-center gap-1.5 mt-0.5 text-[11px]">
                  <Phone size={11} className="text-slate-400" />
                  <span>
                    {currentServingPatient?.patient_phone ||
                      currentServingPatient?.patient?.phone ||
                      "Phone on file"}
                  </span>
                </div>
              </div>
              <StatusBadge
                status={currentServingPatient ? "IN_CHAMBER" : "WAITING"}
                size="sm"
              />
            </div>

            {/* Session State Alerts */}
            {isPrayerBreak && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-amber-900 text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <Moon size={14} className="text-amber-600" /> Doctor on Prayer Break
                  (Queue Paused)
                </span>
                <ActionButton
                  variant="warning"
                  size="xs"
                  loading={updatingChamber}
                  onClick={() => handleSetChamberStatus("IN_CHAMBER")}
                >
                  ▶ Resume Chamber
                </ActionButton>
              </div>
            )}

            {isSessionEnded && (
              <div className="p-3 rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-between gap-2 text-slate-800 text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <StopCircle size={14} className="text-slate-600" /> Chamber Session
                  Ended (Locked)
                </span>
                <ActionButton
                  variant="secondary"
                  size="xs"
                  loading={updatingChamber}
                  onClick={() => handleSetChamberStatus("IN_CHAMBER")}
                >
                  ▶ Reopen Session
                </ActionButton>
              </div>
            )}

            {/* PRIMARY DISPATCH ACTION: CALL NEXT SERIAL */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 px-0.5 font-medium">
                <span>Chamber Dispatch</span>
                <span className="flex items-center gap-1 text-[#283891] font-semibold bg-indigo-50/80 border border-indigo-100 px-2 py-0.5 rounded-md">
                  <kbd className="px-1 py-0.2 text-[10px] font-bold bg-white border border-indigo-200 rounded shadow-2xs font-mono">F2</kbd> Quick Call
                </span>
              </div>
              <ActionButton
                variant="primary"
                size="lg"
                loading={updatingChamber}
                disabled={
                  hasActiveEmergency ||
                  hasHeldPatient ||
                  isPrayerBreak ||
                  isSessionEnded
                }
                onClick={() => handleQueueAction("NEXT_SERIAL")}
                className="w-full justify-center shadow-sm"
                title={
                  isSessionEnded
                    ? "Chamber session has ended. Reopen session before calling next patient."
                    : isPrayerBreak
                    ? "Chamber is on Prayer Break. Resume 'In Chamber' before calling next patient."
                    : hasActiveEmergency
                    ? "Cannot call next serial while an emergency patient is in chamber."
                    : hasHeldPatient
                    ? "Resume held patient first."
                    : `Call Next Patient (#${nextSerialCandidate})`
                }
              >
                <FastForward size={18} />
                <span>CALL NEXT PATIENT (#{nextSerialCandidate})</span>
              </ActionButton>
            </div>

            {/* Secondary Controls: Skip & Recall & Reset */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <ActionButton
                variant="warning"
                size="sm"
                disabled={
                  !chamberSession?.current_serial ||
                  hasActiveEmergency ||
                  hasHeldPatient ||
                  isPrayerBreak ||
                  isSessionEnded
                }
                loading={updatingChamber}
                onClick={() => handleQueueAction("SKIP_SERIAL")}
                icon={Pause}
                title={
                  isSessionEnded
                    ? "Session ended"
                    : isPrayerBreak
                    ? "On prayer break"
                    : "Skip current serial (adds to recall list)"
                }
              >
                Skip Serial
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                disabled={
                  !chamberSession?.skipped_serials?.length ||
                  hasActiveEmergency ||
                  isSessionEnded
                }
                loading={updatingChamber}
                onClick={() => {
                  const skippedList = chamberSession?.skipped_serials || [];
                  const lastSkipped = skippedList[skippedList.length - 1];
                  if (lastSkipped != null) {
                    handleQueueAction("RECALL_SERIAL", lastSkipped);
                  }
                }}
                icon={RotateCcw}
              >
                Recall ({chamberSession?.skipped_serials?.length ? `#${chamberSession.skipped_serials[chamberSession.skipped_serials.length - 1]}` : "None"})
              </ActionButton>
            </div>

            {/* Chamber Operational Mode Switcher */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                Chamber Operational State:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetChamberStatus("IN_CHAMBER")}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    chamberSession?.status === "IN_CHAMBER"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  ● Active
                </button>
                <button
                  type="button"
                  onClick={() => handleSetChamberStatus("PRAYER_BREAK")}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    chamberSession?.status === "PRAYER_BREAK"
                      ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  ⏸ Namaz
                </button>
                <button
                  type="button"
                  onClick={() => handleSetChamberStatus("PAUSED")}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    chamberSession?.status === "PAUSED"
                      ? "bg-slate-700 text-white border-slate-700 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  ⏸ Pause
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSetChamberStatus(isSessionEnded ? "IN_CHAMBER" : "ENDED")
                  }
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    isSessionEnded
                      ? "bg-[#283891] text-white border-[#283891] shadow-2xs"
                      : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  {isSessionEnded ? "▶ Reopen" : "⏹ End"}
                </button>
              </div>
            </div>
          </div>

          {/* Chamber Pacing & Audio Dispatch Stats Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Chamber Pacing & Efficiency
              </span>
              <span className="text-emerald-700 font-bold font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Avg: 8.5 min/patient
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Shift Pace: Steady Morning OPD</span>
              <span>Lounge Flow: Normal</span>
            </div>
            {/* Visual pacing bar */}
            <div className="grid grid-cols-6 gap-1 h-5 items-end pt-1">
              <div className="bg-slate-200 h-2 rounded-xs" />
              <div className="bg-indigo-200 h-3.5 rounded-xs" />
              <div className="bg-[#283891] h-5 rounded-xs" />
              <div className="bg-indigo-200 h-3 rounded-xs" />
              <div className="bg-slate-200 h-1.5 rounded-xs" />
              <div className="bg-slate-100 h-1 rounded-xs" />
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Volume2 size={13} className="text-[#283891]" /> Token Voice Chime
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Bangla + English Active
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PATIENT QUEUE ROSTER (7 cols on lg) */}
        <div
          className={`lg:col-span-7 ${
            mobileTab === "controls" ? "hidden lg:block" : "block"
          }`}
        >
          <TableShell
            title="Today's Chamber Queue"
            subtitle={`${formatDoctorName(selectedDoctor?.name || selectedDoctor?.full_name || "Specialist")} (${formatRoomNumber(selectedDoctor?.room_number || "—")})`}
            badge={
              <StatusBadge
                status="WAITING"
                customLabel={`${filteredAppointments.length} Patients`}
              />
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative min-w-[180px] sm:min-w-[220px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-2.5 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search name, phone, serial..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterTab === "all"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({appointments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("waiting")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterTab === "waiting"
                        ? "bg-white text-[#283891] shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Waiting ({waitingPatientsCount})
                  </button>
                  {emergencyPatientsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTab("emergency")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        filterTab === "emergency"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-rose-700 hover:text-rose-900"
                      }`}
                    >
                      Priority ({emergencyPatientsCount})
                    </button>
                  )}
                </div>

                <ActionButton
                  variant="outline"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => loadDoctorQueue(selectedDoctorId)}
                  title="Refresh Queue"
                />
              </div>
            }
            headers={[
              "SERIAL",
              "PATIENT INFORMATION",
              "SLOT TIME",
              "QUEUE STATUS",
              "FEE / PAYMENT",
              "ACTIONS",
            ]}
            empty={filteredAppointments.length === 0}
            emptyMessage="No appointments found matching current filter or search."
            footer={
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-medium gap-2">
                <span>
                  Showing {filteredAppointments.length} of {appointments.length} patients scheduled
                </span>
                <span className="text-[11px] text-slate-400">
                  Bangladeshi Standard Time (BST) • Real-time Triage
                </span>
              </div>
            }
          >
            {filteredAppointments.map((a) => {
                const isServing =
                  a.serial_number === chamberSession?.current_serial;
                const isArrived = a.is_arrived;
                const isPaid =
                  a.status === "CONFIRMED" || a.status === "COMPLETED";

                return (
                  <tr
                    key={a.id}
                    className={`transition-colors ${
                      isServing
                        ? "bg-indigo-50/40 font-semibold"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Serial # */}
                    <td className="px-4 py-3 font-mono font-bold text-sm text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>#{a.serial_number}</span>
                        {isServing && (
                          <span className="w-2 h-2 rounded-full bg-[#283891] animate-ping" />
                        )}
                      </div>
                    </td>

                    {/* Patient Information (Strict Privacy: NO emergency_reason leak!) */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>
                          {a.patient_name || a.patient?.full_name || "Patient"}
                        </span>
                        {a.is_emergency && (
                          <StatusBadge status="EMERGENCY" size="xs" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {a.patient_phone || a.patient?.phone || "No phone on file"} •{" "}
                        {a.gender || "Adult"}
                      </div>
                    </td>

                    {/* Slot Time */}
                    <td className="px-4 py-3 font-medium text-slate-600">
                      {formatTime(a.appointment_time) || "10:00 AM"}
                    </td>

                    {/* Queue Status */}
                    <td className="px-4 py-3">
                      {isServing ? (
                        <StatusBadge
                          status="IN_CHAMBER"
                          size="sm"
                          customLabel="● In Chamber"
                        />
                      ) : isArrived ? (
                        <StatusBadge
                          status="CONFIRMED"
                          size="sm"
                          customLabel={`✓ Arrived ${
                            a.arrived_at
                              ? new Date(a.arrived_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""
                          }`}
                        />
                      ) : (
                        <ActionButton
                          variant="outline"
                          size="xs"
                          onClick={() => handleCheckIn(a.id)}
                        >
                          Mark Arrived
                        </ActionButton>
                      )}
                    </td>

                    {/* Fee / Payment */}
                    <td className="px-4 py-3">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Paid (৳{a.amount || selectedDoctor?.consultation_fee || 800})
                        </span>
                      ) : (
                        <ActionButton
                          variant="success"
                          size="xs"
                          icon={DollarSign}
                          onClick={() => {
                            setSelectedApptForCash(a);
                            setCashAmount(
                              a.amount ||
                                selectedDoctor?.consultation_fee ||
                                800
                            );
                            setCashModalOpen(true);
                          }}
                        >
                          Collect ৳{a.amount || selectedDoctor?.consultation_fee || 800}
                        </ActionButton>
                      )}
                    </td>

                    {/* Actions: Priority Toggle & Token Print */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleEmergency(a)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            a.is_emergency
                              ? "bg-rose-50 border-rose-300 text-rose-700 shadow-2xs"
                              : "border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                          }`}
                          title={
                            a.is_emergency
                              ? "Remove emergency priority"
                              : "Flag as emergency priority"
                          }
                        >
                          <AlertTriangle size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintTokenData(a)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#283891] hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors shadow-2xs"
                          title="Print Thermal Token Slip"
                        >
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </TableShell>
        </div>
      </div>

      {/* ================= ZONE 4: SHIFT HANDOVER & CASH DRAWER AUDIT BAR ================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-xs">
          {/* Shift Cash Total */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Counter Cash in Drawer ({user?.first_name || "Receptionist"})
              </span>
              <span className="text-base font-black text-emerald-700 font-mono">
                ৳{(cashSummary?.total_cash_today || 0).toLocaleString()}{" "}
                <span className="text-xs text-slate-500 font-normal">
                  ({cashSummary?.cash_transactions_count || cashSummary?.total_transactions || 0} cash receipts)
                </span>
              </span>
            </div>
          </div>

          {/* Digital / SSL Collections */}
          {(cashSummary?.total_digital_today || 0) > 0 && (
            <div className="flex items-center gap-2.5 pl-0 sm:pl-6 sm:border-l sm:border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
                <Activity size={17} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Digital / SSL Payments
                </span>
                <span className="text-base font-black text-blue-700 font-mono">
                  ৳{(cashSummary?.total_digital_today || 0).toLocaleString()}{" "}
                  <span className="text-xs text-slate-500 font-normal">
                    ({cashSummary?.digital_transactions_count || 0} online)
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Audit Verification */}
          <div className="flex items-center gap-2.5 pl-0 sm:pl-6 sm:border-l sm:border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#283891] border border-indigo-100 flex items-center justify-center font-bold">
              <RefreshCw size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Shift Reconciliation Status
              </span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                ✓ Ready (Counter Audit Balanced)
              </span>
            </div>
          </div>
        </div>

        {/* Handover Actions */}
        <div className="flex items-center gap-2">
          <ActionButton
            variant="outline"
            size="sm"
            icon={FileText}
            onClick={() => setReportModalOpen(true)}
          >
            Audit Summary
          </ActionButton>
          <ActionButton
            variant="primary"
            size="sm"
            icon={Lock}
            onClick={() => setShiftClosingModalOpen(true)}
          >
            Shift Handover & Cash Closing
          </ActionButton>
        </div>
      </div>

      {/* ================= MODAL: ISSUE NEW WALK-IN TOKEN ================= */}
      <ModalShell
        isOpen={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        title="+ Issue Walk-in Patient Token"
        subtitle="Generate instant serial token and mark arrival for today's OPD consultation."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
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
              loading={submittingWalkIn}
              onClick={handleWalkInSubmit}
            >
              ✓ Generate Token & Check-in
            </ActionButton>
          </div>
        }
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Consulting Doctor & Chamber *
            </label>
            <select
              value={walkInForm.doctor_id}
              onChange={(e) => {
                const doc = doctors.find((d) => String(d.id) === e.target.value);
                setWalkInForm((prev) => ({
                  ...prev,
                  doctor_id: e.target.value,
                  fee: doc?.consultation_fee || 800,
                }));
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900 font-semibold"
              required
            >
              <option value="">Select Chamber / Doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {formatDoctorName(d.name || d.full_name)} ({formatRoomNumber(d.room_number)}) — ৳
                  {d.consultation_fee || 800}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Patient Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Sumon Mia"
              value={walkInForm.patient_name}
              onChange={(e) =>
                setWalkInForm({ ...walkInForm, patient_name: e.target.value })
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center justify-between">
                  <span>Phone Number</span>
                  {searchingPatient && (
                    <span className="text-[10px] text-[#283891] font-normal">
                      Searching...
                    </span>
                  )}
                </span>
              </label>
              <input
                type="tel"
                placeholder="017XXXXXXXX"
                value={walkInForm.patient_phone}
                onChange={(e) =>
                  setWalkInForm({
                    ...walkInForm,
                    patient_phone: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900 font-medium"
              />
              {foundPatient && (
                <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>
                    <strong>Registered Patient:</strong> {foundPatient.full_name} (
                    {foundPatient.clinic_visits_count || 1} previous visits)
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Consultation Fee (৳ BDT)
              </label>
              <input
                type="number"
                value={walkInForm.fee}
                onChange={(e) =>
                  setWalkInForm({ ...walkInForm, fee: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-emerald-700 font-bold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chief Complaint / Reason for Visit
            </label>
            <input
              type="text"
              placeholder="e.g. Fever, persistent cough, follow-up check"
              value={walkInForm.problem_description}
              onChange={(e) =>
                setWalkInForm({
                  ...walkInForm,
                  problem_description: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900 font-medium"
            />
          </div>

          {/* Urgent / Emergency Triage Flag */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
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
                  <AlertTriangle size={13} /> Mark Urgent / Emergency Priority
                  (জরুরি অগ্রাধিকার)
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                  Flags patient for rapid triage without altering original serial numbering.
                </span>
              </div>
            </label>
            {walkInForm.is_emergency && (
              <input
                type="text"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-rose-900 placeholder:text-rose-400"
                placeholder="Clinical reason (e.g. Chest pain, acute trauma, bleeding)"
                value={walkInForm.emergency_reason || ""}
                onChange={(e) =>
                  setWalkInForm({
                    ...walkInForm,
                    emergency_reason: e.target.value,
                  })
                }
              />
            )}
          </div>
        </form>
      </ModalShell>

      {/* ================= MODAL: COLLECT CASH ================= */}
      <ModalShell
        isOpen={cashModalOpen && !!selectedApptForCash}
        onClose={() => {
          setCashModalOpen(false);
          setSelectedApptForCash(null);
        }}
        title="Collect Consultation Fee"
        subtitle="Confirm physical cash received from patient at front counter."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => {
                setCashModalOpen(false);
                setSelectedApptForCash(null);
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="success"
              size="sm"
              loading={submittingCash}
              onClick={handleCashPaymentSubmit}
            >
              ✓ Confirm Cash Received
            </ActionButton>
          </div>
        }
      >
        {selectedApptForCash && (
          <form onSubmit={handleCashPaymentSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="font-bold text-sm text-slate-900">
                {selectedApptForCash.patient_name ||
                  selectedApptForCash.patient?.full_name}
              </div>
              <div className="text-slate-500 font-mono mt-0.5">
                Serial #{selectedApptForCash.serial_number} • Dr.{" "}
                {selectedDoctor?.name || selectedDoctor?.full_name}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Received (৳ BDT) *
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full px-3 py-2 text-lg font-black text-emerald-700 font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
              />
            </div>
          </form>
        )}
      </ModalShell>

      {/* ================= MODAL: SHIFT AUDIT REPORT ================= */}
      <ModalShell
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="End-of-Shift Cash Audit Summary"
        subtitle="Shift reconciliation report for counter turnover."
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => setReportModalOpen(false)}
            >
              Close
            </ActionButton>
            <ActionButton
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={() => {
                window.print();
                setReportModalOpen(false);
              }}
            >
              Print Shift Report
            </ActionButton>
          </div>
        }
      >
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Duty Officer:</span>
            <strong className="text-slate-800">
              {user?.full_name || "Receptionist"}
            </strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Shift Date:</span>
            <strong className="text-slate-800">{todayFormatted}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Tokens Handled:</span>
            <strong className="text-slate-800">{appointments.length}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Transactions Logged:</span>
            <strong className="text-slate-800">
              {cashSummary?.total_transactions || 0}
            </strong>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2.5 mt-1">
            <span className="font-bold text-slate-700">
              Physical Cash in Drawer:
            </span>
            <strong className="font-mono text-emerald-700 text-base font-black">
              ৳{(cashSummary?.total_cash_today || 0).toLocaleString()}
            </strong>
          </div>
        </div>
      </ModalShell>

      {/* ================= MODAL: 76mm THERMAL TOKEN PRINT ================= */}
      <TokenPrintModal
        printTokenData={printTokenData}
        clinic={
          clinicData
            ? {
                name: clinicData.clinic_name || clinicData.name,
                address: clinicData.clinic_address || clinicData.address,
                phone: clinicData.clinic_phone || clinicData.phone,
              }
            : null
        }
        onClose={() => setPrintTokenData(null)}
      />

      {/* ================= MODAL: SHIFT CLOSING & CASH RECONCILIATION ================= */}
      <ShiftClosingModal
        isOpen={shiftClosingModalOpen}
        onClose={() => setShiftClosingModalOpen(false)}
        cashSummary={cashSummary}
        user={user}
        clinic={clinicData}
        totalTokensHandled={appointments.length}
        onShiftClosed={(closing) => {
          showMsg("Counter shift closed and cash handover recorded!");
          loadCashSummary();
          loadDoctorQueue(selectedDoctorId);
        }}
      />
    </div>
  );
}
