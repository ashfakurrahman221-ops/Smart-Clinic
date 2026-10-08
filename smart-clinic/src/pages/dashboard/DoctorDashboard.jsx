import { useState, useEffect, useMemo, useRef } from "react";
import apiClient from "../../api/axios";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  Award,
  BookOpen,
  Edit3,
  Save,
  X,
  Loader,
  MapPin,
  Building2,
  Send,
  Play,
  Pause,
  FastForward,
  Navigation,
  FileText,
  Plus,
  Trash2,
  Heart,
  FolderHeart,
  ExternalLink,
  RotateCcw,
  Tv,
  AlertTriangle,
  Printer,
  Sparkles,
  Volume2,
  RefreshCw,
  Search,
  ChevronRight,
  ShieldCheck,
  Activity,
  Users,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  TableShell,
  ModalShell,
  ActionButton,
  MetricCard,
} from "../../components/ui";
import MedicalReportAIModal from "../../components/reports/MedicalReportAIModal";
import { formatTime, formatDoctorName } from "../../utils/formatters";
import { useLanguage } from "../../context/LanguageContext";

// Bangladesh Standard Clinical Prescription Presets
const RX_PRESETS = [
  {
    id: "flu",
    name: "জ্বর ও সর্দি (Flu & Fever)",
    icon: "🌡️",
    diagnosis: "Acute Upper Respiratory Tract Infection (URTI) with Fever",
    tests: "CBC with ESR (if fever > 3 days)",
    advice:
      "পর্যাপ্ত বিশ্রাম নিন। প্রচুর কুসুম গরম পানি ও তরল খাবার খান। ১০১° এর বেশি জ্বর হলে কপালে জলপট্টি দিন।",
    vitals: {
      bp: "120/80",
      pulse: "78",
      temp: "101.2F",
      weight: "65kg",
      blood_sugar: "5.8",
    },
    medications: [
      {
        medication_name: "Tab. Napa Extra 500mg+65mg (Paracetamol + Caffeine)",
        dosage: "1 + 0 + 1",
        timing: "খাবারের পরে",
        duration: "৫ দিন",
        instructions: "জ্বর বা ব্যথায়",
      },
      {
        medication_name: "Tab. Fexo 120mg (Fexofenadine)",
        dosage: "0 + 0 + 1",
        timing: "খাবারের পরে",
        duration: "৭ দিন",
        instructions: "রাতে শোবার আগে",
      },
      {
        medication_name: "Cap. Seclo 20mg (Omeprazole)",
        dosage: "1 + 0 + 1",
        timing: "খাবারের ২০ মিনিট আগে",
        duration: "৭ দিন",
        instructions: "",
      },
    ],
  },
  {
    id: "gerd",
    name: "গ্যাস্ট্রিক ও বুকজ্বালা (Acidity & GERD)",
    icon: "🫄",
    diagnosis: "Gastroesophageal Reflux Disease (GERD) / Dyspepsia",
    tests: "USG of Whole Abdomen (if symptoms persist)",
    advice:
      "তেল, ঝাল, চর্বিযুক্ত ও ভাজাপোড়া খাবার পরিহার করুন। রাতের খাবার খাওয়ার অন্তত ২ ঘণ্টা পর ঘুমাতে যাবেন। ধূমপান ও চা-কফি পরিহার করুন।",
    vitals: {
      bp: "120/80",
      pulse: "74",
      temp: "98.4F",
      weight: "68kg",
      blood_sugar: "5.6",
    },
    medications: [
      {
        medication_name: "Tab. Sergel 20mg (Esomeprazole)",
        dosage: "1 + 0 + 1",
        timing: "খাবারের ২০ মিনিট আগে",
        duration: "১৪ দিন",
        instructions: "সকালে ও রাতে",
      },
      {
        medication_name:
          "Syr. Entacyd Plus 200ml (Magaldrate + Simethicone)",
        dosage: "২ চামচ করে দিনে ৩ বার",
        timing: "খাবারের ১ ঘণ্টা পর",
        duration: "৭ দিন",
        instructions: "গ্যাসের অস্বস্তিতে",
      },
      {
        medication_name: "Tab. Flatuna 40mg (Simethicone)",
        dosage: "1 + 1 + 1",
        timing: "খাবারের পরে",
        duration: "৫ দিন",
        instructions: "চিবিয়ে খেতে হবে",
      },
    ],
  },
  {
    id: "cough",
    name: "কাশি ও ব্রঙ্কাইটিস (Cough & Bronchitis)",
    icon: "🫁",
    diagnosis: "Acute Bronchitis / Dry Allergic Cough",
    tests: "Chest X-Ray P/A view, CBC with ESR",
    advice:
      "ঠান্ডা পানি ও আইসক্রিম পরিহার করুন। গরম পানির ভাপ নিন। ধুলাবালি এড়িয়ে চলুন ও বাইরে মাস্ক ব্যবহার করুন।",
    vitals: {
      bp: "125/82",
      pulse: "80",
      temp: "99.0F",
      weight: "62kg",
      blood_sugar: "5.4",
    },
    medications: [
      {
        medication_name: "Syr. Miracof 100ml (Butamirate Citrate)",
        dosage: "২ চামচ করে দিনে ৩ বার",
        timing: "খাবারের পরে",
        duration: "৭ দিন",
        instructions: "",
      },
      {
        medication_name: "Tab. Monas 10 10mg (Montelukast)",
        dosage: "0 + 0 + 1",
        timing: "খাবারের পরে",
        duration: "১৪ দিন",
        instructions: "রাতে শোবার আগে",
      },
      {
        medication_name: "Cap. Cef-3 200mg (Cefixime)",
        dosage: "1 + 0 + 1",
        timing: "খাবারের পরে",
        duration: "৭ দিন",
        instructions: "পুরো কোর্স শেষ করুন",
      },
      {
        medication_name: "Cap. Maxpro 20mg (Esomeprazole)",
        dosage: "1 + 0 + 1",
        timing: "খাবারের আগে",
        duration: "৭ দিন",
        instructions: "",
      },
    ],
  },
  {
    id: "htn",
    name: "উচ্চ রক্তচাপ (Hypertension)",
    icon: "🩺",
    diagnosis: "Essential Hypertension (Primary High Blood Pressure)",
    tests: "ECG, Serum Creatinine, Serum Electrolytes, Lipid Profile",
    advice:
      "খাবারে কাঁচা লবণ একেবারেই পরিহার করুন। প্রতিদিন অন্তত ৩০ মিনিট দ্রুত হাঁটার অভ্যাস করুন। মানসিক চাপ মুক্ত থাকুন ও নিয়মিত রক্তচাপ পরিমাপ করুন।",
    vitals: {
      bp: "145/95",
      pulse: "84",
      temp: "98.6F",
      weight: "74kg",
      blood_sugar: "6.0",
    },
    medications: [
      {
        medication_name: "Tab. Bislol 5mg (Bisoprolol Fumarate)",
        dosage: "1 + 0 + 0",
        timing: "সকালে খাবারের পর",
        duration: "১ মাস",
        instructions: "নিয়মিত চলবে",
      },
      {
        medication_name: "Tab. Cardipin 5mg (Amlodipine Besylate)",
        dosage: "0 + 0 + 1",
        timing: "রাতে খাবারের পর",
        duration: "১ মাস",
        instructions: "নিয়মিত চলবে",
      },
      {
        medication_name: "Tab. A-Card 75mg (Aspirin)",
        dosage: "0 + 1 + 0",
        timing: "দুপুরে ভরা পেটে",
        duration: "১ মাস",
        instructions: "",
      },
    ],
  },
  {
    id: "diabetes",
    name: "ডায়াবেটিস (Type 2 Diabetes)",
    icon: "🩸",
    diagnosis: "Type 2 Diabetes Mellitus (Uncontrolled)",
    tests:
      "HbA1c, Fasting Blood Sugar (FBS), 2 Hours After Breakfast (2HABF), Urine R/M/E",
    advice:
      "মিষ্টি ও চিনিজাতীয় খাবার সম্পূর্ণ বর্জন করুন। লাল আটার রুটি ও সবুজ শাকসবজি বেশি খান। প্রতিদিন নির্দিষ্ট সময়ে খাবার ও ওষুধ গ্রহণ করুন।",
    vitals: {
      bp: "130/85",
      pulse: "76",
      temp: "98.6F",
      weight: "72kg",
      blood_sugar: "9.2",
    },
    medications: [
      {
        medication_name:
          "Tab. Janumet 50mg/500mg (Sitagliptin + Metformin)",
        dosage: "1 + 0 + 1",
        timing: "খাবারের সাথে",
        duration: "১ মাস",
        instructions: "সকালে ও রাতে",
      },
      {
        medication_name: "Tab. Calbo-D (Calcium + Vit D3)",
        dosage: "0 + 1 + 0",
        timing: "দুপুরে খাবারের পর",
        duration: "১ মাস",
        instructions: "",
      },
    ],
  },
  {
    id: "pain",
    name: "কোমর ও জয়েন্ট ব্যথা (Back & Joint Pain)",
    icon: "🦴",
    diagnosis: "Lumbago / Mechanical Low Back Pain with Muscle Spasm",
    tests: "X-Ray Lumbosacral Spine (L/S Spine) A/P & Lateral views",
    advice:
      "ভারী জিনিস তোলা ও সামনে ঝুঁকে কাজ করা বন্ধ রাখুন। শক্ত ও সমান বিছানায় শয়ন করুন। ব্যথার জায়গায় গরম সেক দিন।",
    vitals: {
      bp: "120/80",
      pulse: "72",
      temp: "98.4F",
      weight: "70kg",
      blood_sugar: "5.5",
    },
    medications: [
      {
        medication_name: "Tab. Rolac 10mg (Ketorolac Tromethamine)",
        dosage: "1 + 0 + 1",
        timing: "খাবারের পরে",
        duration: "৫ দিন",
        instructions: "ভরা পেটে সেব্য",
      },
      {
        medication_name: "Cap. Seclo 20mg (Omeprazole)",
        dosage: "1 + 0 + 1",
        timing: "খাবারের আগে",
        duration: "৭ দিন",
        instructions: "",
      },
      {
        medication_name: "Tab. Coralcal-D (Coral Calcium + Vit D3)",
        dosage: "0 + 1 + 0",
        timing: "দুপুরে খাবারের পর",
        duration: "১ মাস",
        instructions: "",
      },
    ],
  },
];

/**
 * DoctorDashboard — Professional Clinical Chamber Workspace
 *
 * Implements UI-5 specifications:
 * - Zone 1: Doctor / Chamber Header (PageHeader, status badge, active clinic switcher, session mode toggles)
 * - Zone 2: Active Patient Clinical Context Strip (Current serial, patient info, chief complaint, stopwatch timer)
 * - Zone 3: Split Clinical Workspace (Left: Chamber controls & Queue roster, Right: E-Rx & Medical Reports Console)
 * - Mobile Responsiveness (390px): Segmented view [ Chamber & Queue ] vs [ Clinical & Rx ]
 * - State Machine Integrity: NEXT_SERIAL, SKIP_SERIAL, PREV_SERIAL, RECALL_SERIAL, RESET, UPDATE_STATUS, ADMIT_EMERGENCY, COMPLETE_EMERGENCY, RESUME_HELD
 * - Strict Separation: SKIP_SERIAL != HELD. SKIP is skip only. No generic manual hold.
 * - Prescription Safety: Exact payload preserved, DGDA catalog search, duplicate generic warning, 1-click clinical presets
 * - Medical Reports Access: Diagnostic reports fetched via backend endpoints
 * - A4 Print Isolation: Preserves exact A4 Bangladesh standard prescription print layout
 */
export default function DoctorDashboard() {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState("appointments"); // "appointments" | "affiliations" | "profile" | "schedule"
  const [appointments, setAppointments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [approvedClinics, setApprovedClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  // Live Chamber Session State
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [chamberSession, setChamberSession] = useState(null);
  const [updatingChamber, setUpdatingChamber] = useState(false);

  // Active Selected Patient for Clinical Workspace
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Clinical Workspace Sub-tab: "rx" | "vault" | "history"
  const [clinicalTab, setClinicalTab] = useState("rx");

  // Mobile Clinical Switcher: "queue" | "clinical"
  const [mobileView, setMobileView] = useState("clinical");

  // Search & Filter state for queue
  const [queueSearchQuery, setQueueSearchQuery] = useState("");
  const [queueFilterTab, setQueueFilterTab] = useState("all"); // "all" | "waiting" | "emergency"

  // Profile state
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    qualification: "",
    experience_years: 0,
    bio: "",
    certificate_url: "",
    specialization_ids: [],
  });

  // Request form state
  const [joinClinicForm, setJoinClinicForm] = useState({
    clinic_id: "",
    consultation_fee: "",
    department_id: "",
    room_number: "",
  });

  // Patient Stopwatch & Session Time Management
  const [patientSeconds, setPatientSeconds] = useState(0);

  // Delay & Announcement Modal
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [announcementNote, setAnnouncementNote] = useState("");
  const [broadcastingDelay, setBroadcastingDelay] = useState(false);

  // Rx Print Modal
  const [rxPrintModalOpen, setRxPrintModalOpen] = useState(false);
  const [printRxData, setPrintRxData] = useState(null);

  // E-Prescription Form State (Neutral empty initialization - no synthetic defaults)
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [selectedRxApt, setSelectedRxApt] = useState(null);
  const [rxFormData, setRxFormData] = useState({
    diagnosis: "",
    vitals: { bp: "", pulse: "", weight: "", temp: "", blood_sugar: "" },
    diagnostic_tests: "",
    advice: "",
    follow_up_date: "",
    follow_up_notes: "",
    medications: [],
  });
  const [medSearchQuery, setMedSearchQuery] = useState("");
  const [dgdaSearchResults, setDgdaSearchResults] = useState([]);
  const [submittingRx, setSubmittingRx] = useState(false);

  // Patient Vitals History State (for chamber comparison)
  const [patientVitalsHistory, setPatientVitalsHistory] = useState([]);
  const [loadingVitalsHistory, setLoadingVitalsHistory] = useState(false);
  const [showVitalsDrawer, setShowVitalsDrawer] = useState(false);

  // Patient Medical Reports AI Modal State (for Doctors)
  const [selectedReportForAI, setSelectedReportForAI] = useState(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [analyzingReportId, setAnalyzingReportId] = useState(null);

  // Chamber Schedule State
  const [schedules, setSchedules] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    clinic_id: "",
    day_of_week: 0,
    start_time: "10:00",
    end_time: "14:00",
    slot_duration_minutes: 15,
    max_patients: 20,
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Patient Medical Reports Modal State (for Doctors)
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultReports, setVaultReports] = useState([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [selectedVaultApt, setSelectedVaultApt] = useState(null);
  const [accessingReportId, setAccessingReportId] = useState(null);

  const fetchSchedules = async () => {
    if (!profile?.id) return;
    try {
      const res = await apiClient.get(`/doctors/schedule/?doctor_id=${profile.id}`);
      setSchedules(res.results || res || []);
    } catch {}
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!profile?.id) return showErr("Doctor profile not found.");
    const targetClinic = scheduleForm.clinic_id || selectedClinicId;
    if (!targetClinic) return showErr("Please choose a clinic for this schedule.");

    setSavingSchedule(true);
    try {
      await apiClient.post("/doctors/schedule/", {
        doctor: profile.id,
        clinic: targetClinic,
        day_of_week: parseInt(scheduleForm.day_of_week, 10),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        slot_duration_minutes: parseInt(scheduleForm.slot_duration_minutes, 10),
        max_patients: parseInt(scheduleForm.max_patients, 10),
      });
      showMsg("Chamber schedule updated successfully!");
      fetchSchedules();
    } catch {
      showErr("Failed to save chamber schedule.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await apiClient.delete(`/doctors/schedule/${id}/`);
      showMsg("Schedule deactivated.");
      fetchSchedules();
    } catch {
      showErr("Failed to deactivate schedule.");
    }
  };

  const openHealthVault = async (apt) => {
    setSelectedVaultApt(apt);
    setVaultModalOpen(true);
    setLoadingVault(true);
    try {
      const patientId = apt.patient?.id;
      const familyMemberId = apt.family_member?.id;
      const url = `/prescriptions/reports/?patient_id=${patientId}${
        familyMemberId ? `&family_member_id=${familyMemberId}` : ""
      }`;
      const res = await apiClient.get(url);
      setVaultReports(res.results || res || []);
    } catch {
      setVaultReports([]);
    } finally {
      setLoadingVault(false);
    }
  };

  const handleViewMedicalReport = async (reportId) => {
    setAccessingReportId(reportId);
    try {
      const res = await apiClient.get(`/prescriptions/reports/${reportId}/access/`);
      const targetUrl = res.access_url || res.data?.access_url;
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      } else {
        alert("Unable to obtain authorized document delivery link.");
      }
    } catch (err) {
      alert(
        typeof err === "string"
          ? err
          : "You do not have authorization to view this medical document."
      );
    } finally {
      setAccessingReportId(null);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/appointments/");
      const list = res.results || res || [];
      setAppointments(list);
    } catch {
      setError("Failed to load patient schedule.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await apiClient.get("/doctors/setup-profile/");
      setProfile(res);
      setProfileForm({
        full_name: res.full_name || "",
        qualification: res.qualification || "",
        experience_years: res.experience_years || 0,
        bio: res.bio || "",
        certificate_url: res.certificate_url || "",
        specialization_ids: res.specializations?.map((s) => s.id) || [],
      });
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchRequestsAndClinics = async () => {
    try {
      const [reqRes, cRes] = await Promise.all([
        apiClient.get("/doctors/requests/").catch(() => []),
        apiClient.get("/clinics/").catch(() => []),
      ]);
      const reqList = reqRes.results || reqRes || [];
      setRequests(reqList);
      const verifiedList = (cRes.results || cRes || []).filter(
        (c) => c.verification_status === "VERIFIED"
      );
      setApprovedClinics(verifiedList);

      const acceptedReq = reqList.find((r) => r.status === "ACCEPTED");
      if (acceptedReq && acceptedReq.clinic) {
        setSelectedClinicId(acceptedReq.clinic.id);
      }
    } catch {}
  };

  const fetchChamberSession = async () => {
    if (!profile || !selectedClinicId) return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await apiClient.get(
        `/doctors/chamber-session/?doctor_id=${profile.id}&clinic_id=${selectedClinicId}&date=${todayStr}`
      );
      setChamberSession(res);
    } catch {}
  };

  useEffect(() => {
    fetchAppointments();
    fetchProfile();
    fetchRequestsAndClinics();
  }, []);

  useEffect(() => {
    if (profile && selectedClinicId) {
      fetchChamberSession();
      fetchSchedules();
    }
  }, [profile, selectedClinicId]);

  // Live Patient Consultation Stopwatch Timer
  useEffect(() => {
    let timer;
    if (
      chamberSession?.status === "IN_CHAMBER" &&
      (chamberSession?.current_serial || 0) > 0
    ) {
      timer = setInterval(() => {
        setPatientSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setPatientSeconds(0);
    }
    return () => clearInterval(timer);
  }, [chamberSession?.status, chamberSession?.current_serial]);

  // Keyboard Hotkeys: [N] Next, [S] Skip, [P] Pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) ||
        rxModalOpen ||
        delayModalOpen ||
        rxPrintModalOpen ||
        tab !== "appointments"
      ) {
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (
          chamberSession?.status !== "PRAYER_BREAK" &&
          chamberSession?.status !== "ENDED"
        ) {
          handleChamberAction("NEXT_SERIAL");
        }
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (
          chamberSession?.status !== "PRAYER_BREAK" &&
          chamberSession?.status !== "ENDED"
        ) {
          handleChamberAction("SKIP_SERIAL");
        }
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (chamberSession?.status !== "ENDED") {
          const nextStat =
            chamberSession?.status === "PAUSED" ? "IN_CHAMBER" : "PAUSED";
          handleChamberAction("UPDATE_STATUS", nextStat);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    chamberSession,
    profile,
    selectedClinicId,
    rxModalOpen,
    delayModalOpen,
    rxPrintModalOpen,
    tab,
  ]);

  const showMsg = (m) => {
    setActionMsg(m);
    setTimeout(() => setActionMsg(""), 4000);
  };
  const showErr = (e) => {
    setError(e);
    setTimeout(() => setError(""), 5000);
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSec
      .toString()
      .padStart(2, "0")}`;
  };

  // Reset clinical consultation state to strictly prevent cross-patient data leakage
  const resetClinicalState = () => {
    setSelectedRxApt(null);
    setRxFormData({
      diagnosis: "",
      vitals: { bp: "", pulse: "", weight: "", temp: "", blood_sugar: "" },
      diagnostic_tests: "",
      advice: "",
      medications: [],
    });
    setMedSearchQuery("");
    setDgdaSearchResults([]);
    setVaultReports([]);
    setSelectedVaultApt(null);
    setAccessingReportId(null);
    setSelectedPatientId(null);
  };

  // Chamber Action Dispatcher
  const handleChamberAction = async (
    action,
    newStatus = null,
    targetSerial = null,
    extraPayload = {}
  ) => {
    if (!profile || !selectedClinicId) return;
    setUpdatingChamber(true);
    try {
      const payload = {
        doctor_id: profile.id,
        clinic_id: selectedClinicId,
        action: action,
        ...extraPayload,
      };
      if (newStatus) payload.status = newStatus;
      if (targetSerial !== null) payload.current_serial = targetSerial;

      const res = await apiClient.post("/doctors/chamber-session/", payload);
      setChamberSession(res);

      if (
        action === "NEXT_SERIAL" ||
        action === "RECALL_SERIAL" ||
        action === "SKIP_SERIAL" ||
        action === "ADMIT_EMERGENCY" ||
        action === "COMPLETE_EMERGENCY" ||
        action === "RESUME_HELD" ||
        action === "RESET"
      ) {
        setPatientSeconds(0);
        resetClinicalState();
        fetchAppointments();
      }

      showMsg(
        action === "NEXT_SERIAL"
          ? `Called Serial #${res.current_serial}!`
          : action === "SKIP_SERIAL"
          ? `Skipped Serial. Advanced to #${res.current_serial}!`
          : action === "RECALL_SERIAL"
          ? `Recalled Serial #${res.current_serial} into chamber!`
          : action === "ADMIT_EMERGENCY"
          ? `Emergency patient admitted to chamber!`
          : action === "COMPLETE_EMERGENCY"
          ? `Emergency consultation completed!`
          : action === "RESUME_HELD"
          ? `Resumed held patient into chamber!`
          : action === "RESET"
          ? "Chamber queue reset to start."
          : `Chamber status updated: ${res.status}`
      );
    } catch (err) {
      showErr(
        err?.response?.data?.error ||
          err?.detail ||
          "Failed to update chamber session."
      );
    } finally {
      setUpdatingChamber(false);
    }
  };

  const handleToggleEmergency = async (apt) => {
    try {
      const res = await apiClient.post(`/appointments/${apt.id}/emergency/`, {
        is_emergency: !apt.is_emergency,
        emergency_reason: !apt.is_emergency ? "Flagged by Doctor" : "",
      });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === apt.id
            ? {
                ...a,
                is_emergency: res.is_emergency,
                emergency_reason: res.emergency_reason,
              }
            : a
        )
      );
      showMsg(
        res.is_emergency
          ? "Marked as Emergency Priority!"
          : "Emergency priority removed."
      );
    } catch (err) {
      showErr(
        err?.response?.data?.error ||
          err?.detail ||
          "Failed to update emergency status."
      );
    }
  };

  const handleBroadcastDelay = async (e) => {
    e.preventDefault();
    if (!profile || !selectedClinicId) return;
    setBroadcastingDelay(true);
    try {
      const payload = {
        doctor_id: profile.id,
        clinic_id: selectedClinicId,
        action: "UPDATE_STATUS",
        delay_minutes: parseInt(delayMinutes, 10) || 0,
        announcement_note: announcementNote,
      };
      const res = await apiClient.post("/doctors/chamber-session/", payload);
      setChamberSession(res);
      setDelayModalOpen(false);
      showMsg("Chamber delay announcement broadcasted to waiting room & patients!");
    } catch {
      showErr("Failed to broadcast delay notice.");
    } finally {
      setBroadcastingDelay(false);
    }
  };

  const applyRxPreset = (preset) => {
    setRxFormData({
      diagnosis: preset.diagnosis,
      vitals: preset.vitals || rxFormData.vitals,
      diagnostic_tests: preset.tests,
      advice: preset.advice,
      medications: preset.medications.map((m) => ({ ...m })),
    });
    showMsg(`Preset applied: "${preset.name}"!`);
  };

  const findDuplicateGenerics = () => {
    const genericCount = {};
    rxFormData.medications.forEach((m) => {
      const match = m.medication_name.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        const gen = match[1].toLowerCase().trim();
        genericCount[gen] = (genericCount[gen] || 0) + 1;
      }
    });
    return Object.entries(genericCount)
      .filter(([_, count]) => count > 1)
      .map(([gen]) => gen);
  };

  const handleSearchDgda = async (query) => {
    setMedSearchQuery(query);
    if (!query || query.length < 2) return setDgdaSearchResults([]);
    try {
      const res = await apiClient.get(
        `/prescriptions/medications/?search=${encodeURIComponent(query)}`
      );
      setDgdaSearchResults(res.results || res || []);
    } catch {
      setDgdaSearchResults([]);
    }
  };

  const addMedicationFromDgda = (med) => {
    const medName = `${
      med.form === "TABLET"
        ? "Tab."
        : med.form === "CAPSULE"
        ? "Cap."
        : med.form === "SYRUP"
        ? "Syr."
        : "Med."
    } ${med.brand_name} ${med.strength} (${med.generic_name})`;
    setRxFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          medication_name: medName,
          dosage: "1 + 0 + 1",
          timing: "After Meal",
          duration: "7 Days",
          instructions: "",
        },
      ],
    }));
    setMedSearchQuery("");
    setDgdaSearchResults([]);
  };

  const removeMedication = (index) => {
    setRxFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const updateMedicationItem = (index, field, value) => {
    setRxFormData((prev) => {
      const updated = [...prev.medications];
      updated[index][field] = value;
      return { ...prev, medications: updated };
    });
  };

  const openPrescriptionModal = async (apt) => {
    setSelectedRxApt(apt);
    setRxFormData({
      diagnosis: "",
      vitals: {
        bp: "",
        pulse: "",
        weight: "",
        temp: "",
        blood_sugar: "",
      },
      diagnostic_tests: "",
      advice: "",
      follow_up_date: "",
      follow_up_notes: "",
      medications: [],
    });

    // Fetch Patient Vitals History for comparison during consultation
    const patientId = apt?.patient?.id || apt?.patient;
    if (patientId) {
      setLoadingVitalsHistory(true);
      apiClient
        .get(`/prescriptions/vitals/?patient_id=${patientId}`)
        .then((res) => {
          const list = res.data?.results || res.results || res.data || res || [];
          setPatientVitalsHistory(Array.isArray(list) ? list : []);
        })
        .catch(() => setPatientVitalsHistory([]))
        .finally(() => setLoadingVitalsHistory(false));
    }

    try {
      const existing = await apiClient.get(
        `/prescriptions/appointment/${apt.id}/`
      );
      if (existing) {
        setRxFormData({
          diagnosis: existing.diagnosis || "",
          vitals: existing.vitals || {
            bp: "",
            pulse: "",
            weight: "",
            temp: "",
            blood_sugar: "",
          },
          diagnostic_tests: existing.diagnostic_tests || "",
          advice: existing.advice || "",
          follow_up_date: existing.follow_up_date || "",
          follow_up_notes: existing.follow_up_notes || "",
          medications: existing.medications || [],
        });
      }
    } catch {}

    setRxModalOpen(true);
  };

  const openPrintRxModal = async (apt) => {
    try {
      const existing = await apiClient.get(
        `/prescriptions/appointment/${apt.id}/`
      );
      if (existing) {
        setPrintRxData({ ...existing, appointment: apt });
        setRxPrintModalOpen(true);
      } else {
        showErr(
          "No prescription written for this appointment yet. Click 'Write E-Prescription'."
        );
      }
    } catch {
      showErr(
        "Prescription not found. Please click 'Write E-Prescription' first."
      );
    }
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    const aptToUse = selectedRxApt || currentActivePatient;
    if (!aptToUse) return;
    setSubmittingRx(true);
    setError("");
    try {
      const res = await apiClient.post("/prescriptions/", {
        appointment_id: aptToUse.id,
        diagnosis: rxFormData.diagnosis,
        vitals: rxFormData.vitals,
        diagnostic_tests: rxFormData.diagnostic_tests,
        advice: rxFormData.advice,
        follow_up_date: rxFormData.follow_up_date || null,
        follow_up_notes: rxFormData.follow_up_notes || "",
        medications: rxFormData.medications,
      });
      showMsg("Digital E-Prescription issued successfully!");
      setRxModalOpen(false);
      fetchAppointments();
      setPrintRxData({ ...res, appointment: aptToUse });
      setRxPrintModalOpen(true);
    } catch {
      showErr("Failed to issue prescription. Check details.");
    } finally {
      setSubmittingRx(false);
    }
  };

  const handleAnalyzeReportAI = async (report) => {
    setAnalyzingReportId(report.id);
    try {
      const res = await apiClient.post(`/prescriptions/reports/${report.id}/analyze-ai/`);
      const updatedReport = res.report || res.data?.report || res.data || res;
      setVaultReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, ...updatedReport } : r))
      );
      setSelectedReportForAI({ ...report, ...updatedReport });
      setAiModalOpen(true);
      showMsg("মেডিক্যাল রিপোর্টটি এআই দ্বারা সফলভাবে বিশ্লেষণ করা হয়েছে!");
    } catch (err) {
      showErr(
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "রিপোর্ট বিশ্লেষণ করতে সমস্যা হয়েছে।"
      );
    } finally {
      setAnalyzingReportId(null);
    }
  };

  const handleComplete = async (id) => {
    try {
      await apiClient.post(`/appointments/${id}/complete/`);
      showMsg("Appointment marked as completed.");
      resetClinicalState();
      fetchAppointments();
    } catch (err) {
      showErr(
        typeof err === "string"
          ? err
          : "Only confirmed appointments can be completed."
      );
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await apiClient.post(`/appointments/${id}/cancel/`);
      showMsg("Appointment cancelled.");
      fetchAppointments();
    } catch {
      showErr("Failed to cancel appointment.");
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.certificate_url)
      return showErr("Medical License / Certificate URL is required.");
    setProfileLoading(true);
    setError("");
    try {
      await apiClient.post("/doctors/setup-profile/", {
        ...profileForm,
        experience_years: parseInt(profileForm.experience_years, 10) || 0,
      });
      await fetchProfile();
      setEditingProfile(false);
      showMsg(
        "Profile updated successfully! Submitted for Admin verification."
      );
    } catch (err) {
      if (typeof err === "object") {
        showErr(
          Object.entries(err)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
            .join(" ")
        );
      } else {
        showErr(err || "Failed to update profile.");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSendJoinRequest = async (e) => {
    e.preventDefault();
    if (!profile || profile.verification_status !== "VERIFIED") {
      return showErr(
        "Your doctor profile must be approved by platform Admin before requesting clinic affiliations."
      );
    }
    if (!joinClinicForm.clinic_id || !joinClinicForm.consultation_fee) return;

    setError("");
    setActionMsg("");
    try {
      await apiClient.post("/doctors/requests/create/", {
        clinic_id: joinClinicForm.clinic_id,
        consultation_fee: parseFloat(joinClinicForm.consultation_fee),
        department_id: joinClinicForm.department_id || null,
        room_number: joinClinicForm.room_number || "",
      });
      showMsg("Request sent to clinic! Waiting for clinic admin's approval.");
      setJoinClinicForm({
        clinic_id: "",
        consultation_fee: "",
        department_id: "",
        room_number: "",
      });
      fetchRequestsAndClinics();
    } catch (err) {
      if (typeof err === "object")
        showErr(err.detail || Object.values(err).flat().join(" "));
      else showErr("Failed to send request to clinic.");
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    setError("");
    setActionMsg("");
    try {
      await apiClient.patch(`/doctors/requests/${requestId}/respond/`, {
        action,
      });
      showMsg(`Request ${action === "ACCEPT" ? "accepted" : "rejected"}.`);
      fetchRequestsAndClinics();
      fetchProfile();
    } catch {
      showErr("Failed to respond to request.");
    }
  };

  const pendingIncomingInvites = requests.filter(
    (r) => r.status === "PENDING_DOCTOR_APPROVAL"
  );
  const activeAffiliations = requests.filter((r) => r.status === "ACCEPTED");

  // Filtered Appointments for Queue
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const pName = `${a.patient?.first_name || ""} ${
        a.patient?.last_name || ""
      } ${a.patient_name || ""} ${
        a.family_member?.full_name || ""
      }`.toLowerCase();
      const pPhone = (
        a.patient?.phone ||
        a.patient_phone ||
        ""
      ).toLowerCase();
      const serial = String(a.serial_number || "");
      const q = queueSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q || pName.includes(q) || pPhone.includes(q) || serial.includes(q);

      let matchesFilter = true;
      if (queueFilterTab === "waiting") {
        matchesFilter =
          a.status === "CONFIRMED" &&
          a.serial_number !== chamberSession?.current_serial;
      } else if (queueFilterTab === "emergency") {
        matchesFilter = a.is_emergency;
      }

      return matchesSearch && matchesFilter;
    });
  }, [appointments, queueSearchQuery, queueFilterTab, chamberSession]);

  // Active Calling Patient in Chamber
  const currentServingPatient = useMemo(() => {
    const s = chamberSession?.current_serial;
    if (!s) return null;
    return appointments.find((a) => a.serial_number === s);
  }, [chamberSession, appointments]);

  // Selected Active Patient (defaults to current called patient if none explicitly clicked)
  const currentActivePatient = useMemo(() => {
    if (selectedPatientId) {
      const match = appointments.find((a) => a.id === selectedPatientId);
      if (match) return match;
    }
    return currentServingPatient || null;
  }, [selectedPatientId, currentServingPatient, appointments]);

  // Synchronize clinical context with active patient and strictly isolate cross-patient state
  useEffect(() => {
    let isMounted = true;
    if (!currentActivePatient) {
      setRxFormData({
        diagnosis: "",
        vitals: { bp: "", pulse: "", weight: "", temp: "", blood_sugar: "" },
        diagnostic_tests: "",
        advice: "",
        medications: [],
      });
      setVaultReports([]);
      setSelectedRxApt(null);
      setSelectedVaultApt(null);
      return;
    }

    const syncPatientClinicalState = async () => {
      setSelectedRxApt(currentActivePatient);
      setSelectedVaultApt(currentActivePatient);
      setRxFormData({
        diagnosis: "",
        vitals: { bp: "", pulse: "", weight: "", temp: "", blood_sugar: "" },
        diagnostic_tests: "",
        advice: "",
        medications: [],
      });
      setMedSearchQuery("");
      setDgdaSearchResults([]);

      if (clinicalTab === "reports") {
        openHealthVault(currentActivePatient);
      }

      try {
        const existing = await apiClient.get(
          `/prescriptions/appointment/${currentActivePatient.id}/`
        );
        if (isMounted && existing) {
          setRxFormData({
            diagnosis: existing.diagnosis || "",
            vitals: existing.vitals || {
              bp: "",
              pulse: "",
              weight: "",
              temp: "",
              blood_sugar: "",
            },
            diagnostic_tests: existing.diagnostic_tests || "",
            advice: existing.advice || "",
            medications: existing.medications || [],
          });
        }
      } catch {}
    };

    syncPatientClinicalState();

    return () => {
      isMounted = false;
    };
  }, [currentActivePatient?.id, clinicalTab]);

  const nextSerialCandidate = (chamberSession?.current_serial || 0) + 1;
  const isSessionEnded = chamberSession?.status === "ENDED";
  const isPrayerBreak = chamberSession?.status === "PRAYER_BREAK";
  const hasActiveEmergency = !!chamberSession?.active_emergency;
  const hasHeldPatient = !!chamberSession?.held_patient;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12 font-sans">
      {/* ================= ZONE 1: DOCTOR / CHAMBER HEADER ================= */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Stethoscope className="text-[#283891]" size={24} />
            <span>
              {formatDoctorName(profile?.full_name || profile?.user?.full_name || "Doctor")}
            </span>
          </div>
        }
        badge={
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
        }
        subtitle={`${profile?.qualification || "MBBS"} • BMDC Reg: ${
          profile?.id?.slice(0, 8).toUpperCase() || "A-78902"
        } • ${
          activeAffiliations.find((a) => a.clinic?.id === selectedClinicId)
            ?.clinic?.name || "Smart Clinic BD"
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Active Clinic Switcher */}
            {activeAffiliations.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <Building2 size={14} className="text-[#283891]" />
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {activeAffiliations.map((a) => (
                    <option key={a.clinic?.id} value={a.clinic?.id}>
                      {a.clinic?.name} ({a.clinic?.city})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Waiting Room TV */}
            {selectedClinicId && profile?.id && (
              <a
                href={`/queue-display/${selectedClinicId}/${profile.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ActionButton
                  variant="outline"
                  size="sm"
                  icon={Tv}
                  title="Launch Waiting Room TV Screen"
                >
                  <span className="hidden sm:inline">Waiting Room TV</span>
                </ActionButton>
              </a>
            )}

            {/* Delay Broadcast */}
            <ActionButton
              variant="warning"
              size="sm"
              icon={Clock}
              onClick={() => setDelayModalOpen(true)}
              title="Broadcast Delay or Chamber Notice"
            >
              <span className="hidden md:inline">Broadcast Delay</span>
            </ActionButton>
          </div>
        }
      />

      {/* Admin Approval Notice Banner */}
      {profile && profile.verification_status !== "VERIFIED" && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 shadow-2xs ${
            profile.verification_status === "REJECTED"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-bold text-sm">
              {profile.verification_status === "REJECTED"
                ? "Medical License / Certificate Rejected"
                : "Profile Verification Pending Platform Admin Approval"}
            </h3>
            <p className="mt-0.5 opacity-90">
              {profile.verification_status === "REJECTED"
                ? "Your submitted certificate was rejected by platform Admin. Please update your certificate URL in My Profile."
                : "Your professional qualifications and BMDC certificate are currently undergoing verification. Public booking will activate upon approval."}
            </p>
          </div>
        </div>
      )}

      {/* Main Doctor Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setTab("appointments");
            setError("");
            setActionMsg("");
          }}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            tab === "appointments"
              ? "bg-[#283891] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Stethoscope size={15} />
          <span className="sm:hidden">{t("clinical") || "Clinical"}</span>
          <span className="hidden sm:inline">{t("clinicalWorkspace") || "Clinical Workspace"}</span>
          <span className={`ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
            tab === "appointments" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
          }`}>
            {appointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("affiliations");
            setError("");
            setActionMsg("");
          }}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            tab === "affiliations"
              ? "bg-[#283891] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Building2 size={15} />
          <span className="sm:hidden">{t("affiliations") || "Affiliations"}</span>
          <span className="hidden sm:inline">{t("clinicAffiliations") || "Clinic Affiliations"}</span>
          <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800">
            {requests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("schedule");
            setError("");
            setActionMsg("");
            fetchSchedules();
          }}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            tab === "schedule"
              ? "bg-[#283891] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Clock size={15} />
          <span className="sm:hidden">{t("schedule") || "Schedule"}</span>
          <span className="hidden sm:inline">{t("chamberSchedule") || "Chamber Schedule"}</span>
          <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800">
            {schedules.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("profile");
            setError("");
            setActionMsg("");
          }}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            tab === "profile"
              ? "bg-[#283891] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Award size={15} />
          <span className="sm:hidden">{t("credentials") || "Credentials"}</span>
          <span className="hidden sm:inline">{t("doctorCredentials") || "Credentials & License"}</span>
        </button>
      </div>

      {/* Action / Error Alerts */}
      {actionMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2 shadow-2xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= TAB 1: CLINICAL WORKSPACE ================= */}
      {tab === "appointments" && (
        <div className="space-y-5">
          {/* ====== ZONE 2: ACTIVE PATIENT CLINICAL CONTEXT STRIP ====== */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              {/* Patient Demographics & Serial */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-[#283891] uppercase tracking-wider">
                    Serial
                  </span>
                  <span className="text-lg sm:text-xl font-mono font-black text-[#283891]">
                    #{currentActivePatient?.serial_number || "--"}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {currentActivePatient?.family_member
                        ? currentActivePatient.family_member.full_name
                        : `${currentActivePatient?.patient?.first_name || ""} ${
                            currentActivePatient?.patient?.last_name || ""
                          }`.trim() ||
                          currentActivePatient?.patient_name ||
                          "No Active Patient"}
                    </h2>
                    {currentActivePatient?.is_emergency && (
                      <StatusBadge status="EMERGENCY" size="xs" />
                    )}
                    {currentActivePatient?.family_member && (
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {currentActivePatient.family_member.relationship_display} (
                        {currentActivePatient.family_member.age} yrs,{" "}
                        {currentActivePatient.family_member.gender})
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 flex-wrap font-medium">
                    <span>
                      📞 {currentActivePatient?.patient?.phone || "No phone"}
                    </span>
                    <span>•</span>
                    <span>
                      🕒 Slot: {formatTime(currentActivePatient?.appointment_time) || "10:00 AM"}
                    </span>
                    <span>•</span>
                    <span className="text-slate-700 font-semibold truncate max-w-[200px] sm:max-w-none">
                      Chief Complaint:{" "}
                      {currentActivePatient?.problem_description ||
                        "General Consultation"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consultation Stopwatch Timer & Status */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Duration
                  </span>
                  <div
                    className={`text-lg sm:text-xl font-mono font-black ${
                      patientSeconds > 900 ? "text-rose-600" : "text-[#283891]"
                    }`}
                  >
                    ⏱ {formatSeconds(patientSeconds)}
                  </div>
                </div>

                {currentActivePatient?.status === "CONFIRMED" && (
                  <ActionButton
                    variant="success"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => handleComplete(currentActivePatient.id)}
                  >
                    Complete Visit
                  </ActionButton>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Segmented View Switcher (< lg) - Unifies clinical console & queue into 1 compact bar */}
          <div className="lg:hidden grid grid-cols-3 bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setMobileView("clinical");
                setClinicalTab("rx");
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                mobileView === "clinical" && clinicalTab === "rx"
                  ? "bg-white text-[#283891] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={13} className="shrink-0" />
              <span className="truncate">{t("erxAndVitals") || "E-Rx & Vitals"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileView("clinical");
                setClinicalTab("reports");
                if (currentActivePatient)
                  openHealthVault(currentActivePatient);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                mobileView === "clinical" && clinicalTab === "reports"
                  ? "bg-white text-[#283891] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FolderHeart size={13} className="shrink-0" />
              <span className="truncate">{t("medicalReports") || "Reports"}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileView("queue")}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                mobileView === "queue"
                  ? "bg-white text-[#283891] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={13} className="shrink-0" />
              <span className="truncate">{t("chamberQueue") || "Queue"} ({filteredAppointments.length})</span>
            </button>
          </div>

          {/* ====== ZONE 3: SPLIT CLINICAL WORKSPACE ====== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: CHAMBER CONTROLLER & QUEUE ROSTER (5 cols on lg) */}
            <div
              className={`lg:col-span-5 space-y-4 ${
                mobileView === "clinical" ? "hidden lg:block" : "block"
              }`}
            >
              {/* Chamber Calling Card */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs relative overflow-hidden space-y-4">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#283891]" />

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Live Calling Deck
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">
                      Now In Chamber
                    </h3>
                  </div>
                  <StatusBadge
                    status={chamberSession?.status || "IN_CHAMBER"}
                    size="sm"
                  />
                </div>

                {/* Big Token Display */}
                <div className="text-center py-3 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <div className="text-5xl font-mono font-black text-[#283891] tracking-tight">
                    #{chamberSession?.current_serial || 0}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                    {currentServingPatient
                      ? currentServingPatient.family_member?.full_name ||
                        `${currentServingPatient.patient?.first_name || ""} ${
                          currentServingPatient.patient?.last_name || ""
                        }`.trim() ||
                        currentServingPatient.patient_name
                      : "Awaiting next patient"}
                  </span>
                </div>

                {/* Active Emergency In Chamber Banner */}
                {hasActiveEmergency && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <StatusBadge status="EMERGENCY" size="xs" />
                      <span className="font-mono font-bold text-rose-900">
                        Serial #{chamberSession.active_emergency_details?.serial_number || "—"}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-rose-950">
                        {chamberSession.active_emergency_details?.patient_name ||
                          "Emergency Patient"}
                      </div>
                      {chamberSession.active_emergency_details?.emergency_reason && (
                        <div className="text-rose-700 text-[11px] mt-0.5">
                          Triage Reason:{" "}
                          {chamberSession.active_emergency_details.emergency_reason}
                        </div>
                      )}
                      {chamberSession.held_patient_details && (
                        <div className="text-amber-800 text-[11px] font-semibold mt-1 bg-amber-100/70 px-2 py-0.5 rounded-md inline-block">
                          ⏸ Serial #{chamberSession.held_patient_details.serial_number} is held on pause.
                        </div>
                      )}
                    </div>
                    <ActionButton
                      variant="danger"
                      size="xs"
                      loading={updatingChamber}
                      onClick={() => handleChamberAction("COMPLETE_EMERGENCY")}
                    >
                      ✓ Complete Emergency Consultation
                    </ActionButton>
                  </div>
                )}

                {/* Held Patient Paused Banner */}
                {hasHeldPatient && !hasActiveEmergency && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <StatusBadge status="HELD" size="xs" />
                      <div className="font-bold text-amber-950 text-xs mt-1">
                        Serial #{chamberSession.held_patient_details?.serial_number} —{" "}
                        {chamberSession.held_patient_details?.patient_name}
                      </div>
                    </div>
                    <ActionButton
                      variant="warning"
                      size="xs"
                      loading={updatingChamber}
                      onClick={() => handleChamberAction("RESUME_HELD")}
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
                  <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 text-xs">
                    <span className="font-bold text-rose-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={12} className="text-rose-600" />
                      Priority Emergency Queue (
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
                            className="p-2 rounded-xl bg-white border border-rose-200 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <span className="font-bold text-xs text-slate-900">
                              #{a.serial_number}{" "}
                              {a.patient?.first_name || a.patient_name}
                            </span>
                            <ActionButton
                              variant="danger"
                              size="xs"
                              disabled={hasActiveEmergency}
                              loading={updatingChamber}
                              onClick={() =>
                                handleChamberAction(
                                  "ADMIT_EMERGENCY",
                                  null,
                                  null,
                                  { appointment_id: a.id, hold_current: true }
                                )
                              }
                            >
                              Admit Now
                            </ActionButton>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Skipped Serials Recall Strip */}
                {chamberSession?.skipped_serials?.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-900">
                      Skipped Serials:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {chamberSession.skipped_serials.map((sn) => (
                        <button
                          key={sn}
                          type="button"
                          onClick={() =>
                            handleChamberAction(
                              "RECALL_SERIAL",
                              "IN_CHAMBER",
                              sn
                            )
                          }
                          disabled={
                            updatingChamber ||
                            hasActiveEmergency ||
                            isSessionEnded
                          }
                          className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
                        >
                          #{sn} Recall
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prayer Break / Session Ended Notices */}
                {isPrayerBreak && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900 font-bold">
                    <span>⏸ Chamber on Prayer Break</span>
                    <ActionButton
                      variant="warning"
                      size="xs"
                      onClick={() =>
                        handleChamberAction("UPDATE_STATUS", "IN_CHAMBER")
                      }
                    >
                      Resume
                    </ActionButton>
                  </div>
                )}

                {isSessionEnded && (
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-between gap-2 text-xs text-slate-800 font-bold">
                    <span>⏹ Session Ended (Queue Locked)</span>
                    <ActionButton
                      variant="secondary"
                      size="xs"
                      onClick={() =>
                        handleChamberAction("UPDATE_STATUS", "IN_CHAMBER")
                      }
                    >
                      Reopen
                    </ActionButton>
                  </div>
                )}

                {/* Primary Calling Action */}
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
                  onClick={() => handleChamberAction("NEXT_SERIAL")}
                  className="w-full justify-center"
                >
                  <FastForward size={18} />
                  <span>CALL NEXT SERIAL (#{nextSerialCandidate})</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-white/20 ml-1">
                    N
                  </span>
                </ActionButton>

                {/* Secondary Actions: Skip, Prev, Reset */}
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton
                    variant="warning"
                    size="sm"
                    disabled={
                      updatingChamber ||
                      (chamberSession?.current_serial || 0) === 0 ||
                      hasActiveEmergency ||
                      hasHeldPatient ||
                      isPrayerBreak ||
                      isSessionEnded
                    }
                    loading={updatingChamber}
                    onClick={() => handleChamberAction("SKIP_SERIAL")}
                    icon={Pause}
                  >
                    Skip Serial
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    size="sm"
                    disabled={
                      updatingChamber ||
                      (chamberSession?.current_serial || 0) === 0 ||
                      hasActiveEmergency ||
                      isSessionEnded
                    }
                    loading={updatingChamber}
                    onClick={() => handleChamberAction("PREV_SERIAL")}
                    icon={RotateCcw}
                  >
                    Prev Serial
                  </ActionButton>
                </div>

                {/* Quick Status Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleChamberAction("UPDATE_STATUS", "IN_CHAMBER")
                    }
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                      chamberSession?.status === "IN_CHAMBER"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    ● Active
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleChamberAction("UPDATE_STATUS", "PRAYER_BREAK")
                    }
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                      chamberSession?.status === "PRAYER_BREAK"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    ⏸ Namaz
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleChamberAction("UPDATE_STATUS", "PAUSED")
                    }
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                      chamberSession?.status === "PAUSED"
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    ⏸ Pause
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleChamberAction(
                        "UPDATE_STATUS",
                        isSessionEnded ? "IN_CHAMBER" : "ENDED"
                      )
                    }
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                      isSessionEnded
                        ? "bg-[#283891] text-white border-[#283891]"
                        : "bg-white text-rose-700 border-rose-200"
                    }`}
                  >
                    {isSessionEnded ? "▶ Reopen" : "⏹ End"}
                  </button>
                </div>
              </div>

              {/* Patient Queue Roster Table */}
              <TableShell
                title="Today's Patient Queue"
                badge={
                  <StatusBadge
                    status="WAITING"
                    customLabel={`${filteredAppointments.length} Booked`}
                  />
                }
                actions={
                  <div className="flex items-center gap-1.5">
                    <div className="relative min-w-[140px]">
                      <Search
                        size={12}
                        className="absolute left-2.5 top-2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={queueSearchQuery}
                        onChange={(e) => setQueueSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-900 font-medium"
                      />
                    </div>
                    <ActionButton
                      variant="outline"
                      size="xs"
                      icon={RefreshCw}
                      onClick={fetchAppointments}
                      title="Refresh Queue"
                    />
                  </div>
                }
                headers={["SERIAL", "PATIENT", "TIME", "STATUS", "ACTION"]}
                empty={filteredAppointments.length === 0}
                emptyMessage="No scheduled patients."
              >
                {filteredAppointments.map((apt) => {
                    const isSelected =
                      currentActivePatient?.id === apt.id;
                    const isServing =
                      chamberSession?.current_serial === apt.serial_number;

                    return (
                      <tr
                        key={apt.id}
                        onClick={() => setSelectedPatientId(apt.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-50/70 font-semibold"
                            : isServing
                            ? "bg-emerald-50/50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          #{apt.serial_number}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-900 truncate max-w-[120px]">
                            {apt.family_member?.full_name ||
                              `${apt.patient?.first_name || ""} ${
                                apt.patient?.last_name || ""
                              }`.trim() ||
                              apt.patient_name ||
                              "Patient"}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 font-medium">
                          {formatTime(apt.appointment_time) || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={apt.status} size="xs" showIcon={false} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatientId(apt.id);
                              setMobileView("clinical");
                            }}
                            className="text-[#283891] hover:underline font-bold text-[11px]"
                          >
                            Open →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </TableShell>
            </div>

            {/* RIGHT COLUMN: CLINICAL WORKSPACE (7 cols on lg) */}
            <div
              className={`lg:col-span-7 space-y-4 ${
                mobileView === "queue" ? "hidden lg:block" : "block"
              }`}
            >
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-5">
                {/* Clinical Section Sub-Navigation Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  {/* Desktop Sub-Tabs */}
                  <div className="hidden lg:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setClinicalTab("rx")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        clinicalTab === "rx"
                          ? "bg-[#283891] text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <FileText size={14} />
                      <span>{t("erxAndVitals") || "E-Prescription & Vitals"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setClinicalTab("reports");
                        if (currentActivePatient)
                          openHealthVault(currentActivePatient);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        clinicalTab === "reports"
                          ? "bg-[#283891] text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <FolderHeart size={14} />
                      <span>{t("medicalReports") || "Diagnostic & Medical Reports"}</span>
                    </button>
                  </div>

                  {/* Mobile Section Indicator (Tabs are unified above) */}
                  <div className="lg:hidden flex items-center gap-2">
                    {clinicalTab === "rx" ? (
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText size={14} className="text-[#283891]" />
                        {t("erxAndVitals") || "E-Prescription & Vitals"}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FolderHeart size={14} className="text-[#283891]" />
                        {t("medicalReports") || "Diagnostic & Medical Reports"}
                      </span>
                    )}
                  </div>

                  {currentActivePatient && (
                    <ActionButton
                      variant="outline"
                      size="xs"
                      icon={Printer}
                      onClick={() => openPrintRxModal(currentActivePatient)}
                    >
                      Print Rx Preview
                    </ActionButton>
                  )}
                </div>

                {/* SUB-SECTION 1: E-PRESCRIPTION WORKSPACE */}
                {clinicalTab === "rx" && (
                  <form onSubmit={handleSavePrescription} className="space-y-4">
                    {/* 1-Click Clinical Presets Bar */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Sparkles size={13} className="text-[#283891]" />
                          1-Click Standard BD Clinical Presets:
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Auto-populates diagnosis & standard medicines
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {RX_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyRxPreset(preset)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-800 transition-colors shadow-2xs"
                          >
                            <span>{preset.icon}</span>{" "}
                            <span>{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duplicate Generic Molecule Warning */}
                    {findDuplicateGenerics().length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Duplicate Molecule Warning:{" "}
                          <strong>{findDuplicateGenerics().join(", ")}</strong>.
                          Verify dosage to prevent duplication.
                        </span>
                      </div>
                    )}

                    {/* Diagnosis */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        Clinical Diagnosis *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acute Upper Respiratory Tract Infection, Type-2 Diabetes..."
                        value={rxFormData.diagnosis}
                        onChange={(e) =>
                          setRxFormData({
                            ...rxFormData,
                            diagnosis: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900 font-semibold"
                      />
                    </div>

                    {/* Patient Vitals Grid with Longitudinal Trend Drawer */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Patient Vitals Recorded in Chamber
                        </span>
                        {patientVitalsHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowVitalsDrawer(!showVitalsDrawer)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Activity size={12} className="text-indigo-600" />
                            <span>
                              {showVitalsDrawer
                                ? "Hide Previous Vitals ▲"
                                : `View Previous Vitals (${patientVitalsHistory.length}) ▼`}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Longitudinal Vitals Quick Comparison Box */}
                      {showVitalsDrawer && patientVitalsHistory.length > 0 && (
                        <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
                          <span className="text-[10px] font-bold text-indigo-900 uppercase">
                            Recent Longitudinal Readings:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            {patientVitalsHistory.slice(0, 3).map((log, idx) => (
                              <div
                                key={log.id || idx}
                                className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5"
                              >
                                <div className="text-[10px] font-bold text-slate-500">
                                  📅 {log.recorded_at ? log.recorded_at.split("T")[0] : "Previous"}
                                </div>
                                <div className="font-mono font-bold text-slate-800 text-[11px]">
                                  BP: {log.systolic_bp && log.diastolic_bp ? `${log.systolic_bp}/${log.diastolic_bp} mmHg` : "—"}
                                </div>
                                <div className="text-[10px] text-slate-600">
                                  Sugar: {log.blood_glucose ? `${log.blood_glucose} (${log.glucose_type || 'RBS'})` : "—"} | Pulse: {log.pulse_rate || "—"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            BP (mmHg)
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. 120/80"
                            value={rxFormData.vitals.bp || ""}
                            onChange={(e) =>
                              setRxFormData({
                                ...rxFormData,
                                vitals: {
                                  ...rxFormData.vitals,
                                  bp: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Pulse (bpm)
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. 72"
                            value={rxFormData.vitals.pulse || ""}
                            onChange={(e) =>
                              setRxFormData({
                                ...rxFormData,
                                vitals: {
                                  ...rxFormData.vitals,
                                  pulse: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Weight (kg)
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. 70kg"
                            value={rxFormData.vitals.weight || ""}
                            onChange={(e) =>
                              setRxFormData({
                                ...rxFormData,
                                vitals: {
                                  ...rxFormData.vitals,
                                  weight: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Temp (°F)
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. 98.6F"
                            value={rxFormData.vitals.temp || ""}
                            onChange={(e) =>
                              setRxFormData({
                                ...rxFormData,
                                vitals: {
                                  ...rxFormData.vitals,
                                  temp: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Blood Sugar
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. 5.8 mmol/L"
                            value={rxFormData.vitals.blood_sugar || ""}
                            onChange={(e) =>
                              setRxFormData({
                                ...rxFormData,
                                vitals: {
                                  ...rxFormData.vitals,
                                  blood_sugar: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Prescribed Medications Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Rx Medications (ওষুধসমূহ)
                        </label>
                        <span className="text-[10px] font-bold text-[#283891]">
                          DGDA Bangladesh Drug Catalogue Search
                        </span>
                      </div>

                      {/* Autocomplete Input */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search medicines (e.g. Napa, Seclo, Maxpro, Sergel, Cef-3, Fexo, Bislol)..."
                          value={medSearchQuery}
                          onChange={(e) => handleSearchDgda(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283891]/20 focus:border-[#283891] text-slate-900"
                        />
                        {dgdaSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl mt-1 max-h-52 overflow-y-auto divide-y divide-slate-100">
                            {dgdaSearchResults.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => addMedicationFromDgda(m)}
                                className="w-full text-left p-2.5 hover:bg-indigo-50/60 transition-colors flex justify-between items-center text-xs"
                              >
                                <div>
                                  <span className="font-bold text-slate-900">
                                    {m.brand_name} {m.strength}
                                  </span>
                                  <span className="text-slate-500 font-mono ml-2 text-[11px]">
                                    ({m.generic_name})
                                  </span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {m.manufacturer}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Medication Rows */}
                      <div className="space-y-2.5 pt-1">
                        {rxFormData.medications.map((item, index) => (
                          <div
                            key={index}
                            className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                required
                                placeholder="Medicine Brand, Strength & Generic"
                                value={item.medication_name}
                                onChange={(e) =>
                                  updateMedicationItem(
                                    index,
                                    "medication_name",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => removeMedication(index)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Remove medication"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <span className="text-[10px] text-slate-500 font-semibold block">
                                  Dose (সকাল+দুপুর+রাত)
                                </span>
                                <input
                                  type="text"
                                  placeholder="1 + 0 + 1"
                                  value={item.dosage}
                                  onChange={(e) =>
                                    updateMedicationItem(
                                      index,
                                      "dosage",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 font-semibold block">
                                  Timing (কখন খাবে)
                                </span>
                                <input
                                  type="text"
                                  placeholder="After Meal"
                                  value={item.timing}
                                  onChange={(e) =>
                                    updateMedicationItem(
                                      index,
                                      "timing",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 font-semibold block">
                                  Duration (কতদিন)
                                </span>
                                <input
                                  type="text"
                                  placeholder="7 Days"
                                  value={item.duration}
                                  onChange={(e) =>
                                    updateMedicationItem(
                                      index,
                                      "duration",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <ActionButton
                          variant="outline"
                          size="xs"
                          icon={Plus}
                          onClick={() =>
                            setRxFormData((prev) => ({
                              ...prev,
                              medications: [
                                ...prev.medications,
                                {
                                  medication_name: "",
                                  dosage: "1 + 0 + 1",
                                  timing: "After Meal",
                                  duration: "7 Days",
                                  instructions: "",
                                },
                              ],
                            }))
                          }
                        >
                          Add Custom Medicine Row
                        </ActionButton>
                      </div>
                    </div>

                    {/* Diagnostic Tests & Advice */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Diagnostic Lab Orders (টেস্ট)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. CBC with ESR, Lipid Profile, USG..."
                          value={rxFormData.diagnostic_tests}
                          onChange={(e) =>
                            setRxFormData({
                              ...rxFormData,
                              diagnostic_tests: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Advice & Lifestyle (পরামর্শ)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. পর্যাপ্ত বিশ্রাম নিন, তেল-ঝাল কম খান..."
                          value={rxFormData.advice}
                          onChange={(e) =>
                            setRxFormData({
                              ...rxFormData,
                              advice: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none text-slate-900"
                        />
                      </div>

                      {/* Follow-up Visit Scheduling */}
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={13} className="text-emerald-700" />
                            <span>পরবর্তী সাক্ষাত / ফলো-আপ (Follow-up Visit)</span>
                          </label>
                          <div className="flex items-center gap-1">
                            {[
                              { label: "+7 Days", days: 7 },
                              { label: "+14 Days", days: 14 },
                              { label: "+1 Month", days: 30 },
                            ].map((preset) => (
                              <button
                                key={preset.days}
                                type="button"
                                onClick={() => {
                                  const d = new Date();
                                  d.setDate(d.getDate() + preset.days);
                                  setRxFormData((prev) => ({
                                    ...prev,
                                    follow_up_date: d.toISOString().split("T")[0],
                                    follow_up_notes: prev.follow_up_notes || `Come after ${preset.label} with investigation reports`,
                                  }));
                                }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                              >
                                {preset.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setRxFormData((prev) => ({
                                  ...prev,
                                  follow_up_date: "",
                                  follow_up_notes: "",
                                }))
                              }
                              className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer"
                              title="Clear follow-up"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] font-semibold text-emerald-800 block mb-0.5">
                              Follow-up Date
                            </span>
                            <input
                              type="date"
                              value={rxFormData.follow_up_date || ""}
                              onChange={(e) =>
                                setRxFormData({
                                  ...rxFormData,
                                  follow_up_date: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-800 font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[10px] font-semibold text-emerald-800 block mb-0.5">
                              Instructions for Follow-up (নির্দেশনা)
                            </span>
                            <input
                              type="text"
                              placeholder="e.g. Come with CBC & Fasting Blood Sugar reports"
                              value={rxFormData.follow_up_notes || ""}
                              onChange={(e) =>
                                setRxFormData({
                                  ...rxFormData,
                                  follow_up_notes: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <ActionButton
                        variant="primary"
                        size="md"
                        loading={submittingRx}
                        onClick={handleSavePrescription}
                      >
                        ✓ Issue Digital Prescription & Complete
                      </ActionButton>
                    </div>
                  </form>
                )}

                {/* SUB-SECTION 2: PATIENT MEDICAL REPORTS */}
                {clinicalTab === "reports" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <FolderHeart size={16} className="text-[#283891]" />
                          <span>Patient Diagnostic & Medical Reports</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Digital lab records and diagnostic test reports on file
                          for this patient.
                        </p>
                      </div>
                      <ActionButton
                        variant="outline"
                        size="xs"
                        icon={RefreshCw}
                        onClick={() =>
                          currentActivePatient &&
                          openHealthVault(currentActivePatient)
                        }
                      >
                        Refresh Reports
                      </ActionButton>
                    </div>

                    {loadingVault ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        Loading patient medical records...
                      </div>
                    ) : vaultReports.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                        No diagnostic test reports available on file for this patient.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {vaultReports.map((report) => (
                          <div
                            key={report.id}
                            className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                    {report.report_type_display || report.report_type}
                                  </span>
                                  {report.ai_analysis_status === "COMPLETED" && (
                                    report.ai_risk_level === "CRITICAL" ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                        <AlertTriangle size={11} /> AI: জরুরি (Critical)
                                      </span>
                                    ) : report.ai_risk_level === "ATTENTION_NEEDED" ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                        <AlertCircle size={11} /> AI: সতর্কতা (Attention)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle2 size={11} /> AI: স্বাভাবিক (Normal)
                                      </span>
                                    )
                                  )}
                                </div>
                                <h5 className="font-bold text-xs text-slate-900 mt-1">
                                  {report.title}
                                </h5>
                                <div className="text-[11px] text-slate-500">
                                  {report.diagnostic_center && `🏥 ${report.diagnostic_center} • `}
                                  <span>📅 {report.test_date}</span>
                                </div>
                              </div>
                            </div>

                            {report.summary_notes && (
                              <div className="text-[11px] bg-white p-2 rounded-xl border border-slate-100 text-slate-700 font-medium">
                                <span className="font-bold text-[#283891]">Findings: </span>
                                {report.summary_notes}
                              </div>
                            )}

                            {report.ai_analysis_status === "COMPLETED" && (report.ai_summary_bn || report.ai_summary_en) && (
                              <div className="text-[11px] bg-indigo-50/70 border border-indigo-100 p-2 rounded-xl text-slate-700 space-y-1">
                                <div className="flex items-center gap-1 font-bold text-indigo-800 text-[10px]">
                                  <Sparkles size={11} className="text-indigo-600" />
                                  <span>AI ক্লিনিক্যাল সারসংক্ষেপ (Clinical Summary):</span>
                                </div>
                                <p className="line-clamp-2 text-slate-600">
                                  {report.ai_summary_bn || report.ai_summary_en}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                              {report.ai_analysis_status === "COMPLETED" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReportForAI(report);
                                    setAiModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Sparkles size={12} className="text-amber-300" />
                                  <span>AI অ্যানালাইসিস দেখুন (Insights)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAnalyzeReportAI(report)}
                                  disabled={analyzingReportId === report.id}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#283891] border border-indigo-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {analyzingReportId === report.id ? (
                                    <Loader size={12} className="animate-spin text-[#283891]" />
                                  ) : (
                                    <Sparkles size={12} className="text-[#283891]" />
                                  )}
                                  <span>
                                    {analyzingReportId === report.id
                                      ? "বিশ্লেষণ হচ্ছে..."
                                      : "এআই বিশ্লেষণ করুন (AI Analyze)"}
                                  </span>
                                </button>
                              )}

                              <ActionButton
                                variant="outline"
                                size="xs"
                                icon={ExternalLink}
                                disabled={accessingReportId === report.id}
                                onClick={() => handleViewMedicalReport(report.id)}
                              >
                                {accessingReportId === report.id ? "Opening..." : "View Document ↗"}
                              </ActionButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CLINIC AFFILIATIONS ================= */}
      {tab === "affiliations" && (
        <div className="space-y-5">
          {profile && profile.verification_status === "VERIFIED" && (
            <div className="bg-white border border-slate-200/90 p-6 rounded-3xl shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="text-[#283891]" size={18} />
                <span>Send Service Request to a Clinic</span>
              </h2>
              <form onSubmit={handleSendJoinRequest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Clinic *
                    </label>
                    <select
                      required
                      value={joinClinicForm.clinic_id}
                      onChange={(e) =>
                        setJoinClinicForm({
                          ...joinClinicForm,
                          clinic_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="">-- Choose Clinic --</option>
                      {approvedClinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Proposed Consultation Fee (৳ BDT) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      placeholder="1000"
                      value={joinClinicForm.consultation_fee}
                      onChange={(e) =>
                        setJoinClinicForm({
                          ...joinClinicForm,
                          consultation_fee: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold font-mono text-emerald-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Room Number (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 101"
                    value={joinClinicForm.room_number}
                    onChange={(e) =>
                      setJoinClinicForm({
                        ...joinClinicForm,
                        room_number: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <ActionButton
                  variant="primary"
                  size="md"
                  icon={Send}
                  onClick={handleSendJoinRequest}
                >
                  Send Join Request
                </ActionButton>
              </form>
            </div>
          )}

          {pendingIncomingInvites.length > 0 && (
            <div className="bg-white border border-slate-200/90 p-6 rounded-3xl shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={18} />
                <span>
                  Incoming Clinic Invites ({pendingIncomingInvites.length})
                </span>
              </h2>
              <div className="space-y-3">
                {pendingIncomingInvites.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {r.clinic?.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        📍 {r.clinic?.city} • Consultation Fee: ৳
                        {r.consultation_fee} BDT
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <ActionButton
                        variant="success"
                        size="xs"
                        onClick={() => handleRespondRequest(r.id, "ACCEPT")}
                      >
                        Accept Invite
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        size="xs"
                        onClick={() => handleRespondRequest(r.id, "REJECT")}
                      >
                        Reject
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 p-6 rounded-3xl shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="text-[#283891]" size={18} />
              <span>
                Active Clinic Affiliations ({activeAffiliations.length})
              </span>
            </h2>
            {activeAffiliations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                You have no active clinic affiliations yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeAffiliations.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3"
                  >
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-[#283891]">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {r.clinic?.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        📍 {r.clinic?.city} • Fee: ৳{r.consultation_fee} BDT
                      </div>
                      <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Active Service Agreement
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: MY PROFILE ================= */}
      {tab === "profile" && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs">
          {profileLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Loading doctor credentials...
            </div>
          ) : !editingProfile ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="text-[#283891]" size={20} />
                    <span>{formatDoctorName(profile?.full_name || "Doctor")}</span>
                  </h2>
                  {profile && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-indigo-700 font-semibold">
                        {profile.qualification}
                      </span>
                      <StatusBadge
                        status={
                          profile.verification_status === "VERIFIED"
                            ? "ACTIVE"
                            : profile.verification_status === "REJECTED"
                            ? "CANCELLED"
                            : "PENDING"
                        }
                        size="xs"
                        customLabel={profile.verification_status}
                      />
                    </div>
                  )}
                </div>
                <ActionButton
                  variant="outline"
                  size="sm"
                  icon={Edit3}
                  onClick={() => setEditingProfile(true)}
                >
                  Edit Profile
                </ActionButton>
              </div>

              {profile && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Experience
                      </div>
                      <div className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                        <BookOpen size={18} className="text-[#283891]" />
                        <span>{profile.experience_years} years</span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Qualification
                      </div>
                      <div className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                        <Award size={18} className="text-[#283891]" />
                        <span>{profile.qualification}</span>
                      </div>
                    </div>
                  </div>

                  {profile.certificate_url && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      <div className="font-bold text-slate-400 uppercase tracking-wider mb-1">
                        License Certificate
                      </div>
                      <a
                        href={profile.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#283891] hover:underline font-bold"
                      >
                        View Uploaded Certificate Document ↗
                      </a>
                    </div>
                  )}

                  {profile.bio && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                        Professional Bio
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-base text-slate-900">
                  Edit Doctor Profile
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Qualification *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.qualification}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        qualification: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={profileForm.experience_years}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        experience_years: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Medical License / Certificate URL *
                </label>
                <input
                  type="url"
                  required
                  value={profileForm.certificate_url}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      certificate_url: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Professional Bio
                </label>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bio: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProfile(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="primary"
                  size="sm"
                  loading={profileLoading}
                  onClick={handleProfileSave}
                >
                  Save Profile
                </ActionButton>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ================= TAB 4: CHAMBER SCHEDULE ================= */}
      {tab === "schedule" && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/90 p-6 rounded-3xl shadow-2xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="text-[#283891]" size={18} />
                <span>Weekly Chamber Availability Schedule</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your recurring consultation days, chamber hours, and
                patient capacity per clinic.
              </p>
            </div>

            <form
              onSubmit={handleSaveSchedule}
              className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Clinic *
                  </label>
                  <select
                    value={scheduleForm.clinic_id || selectedClinicId}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        clinic_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                    required
                  >
                    <option value="">-- Choose Clinic --</option>
                    {activeAffiliations.map((a) => (
                      <option key={a.clinic?.id} value={a.clinic?.id}>
                        {a.clinic?.name} ({a.clinic?.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Day of Week *
                  </label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        day_of_week: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value={0}>Monday (সোমবার)</option>
                    <option value={1}>Tuesday (মঙ্গলবার)</option>
                    <option value={2}>Wednesday (বুধবার)</option>
                    <option value={3}>Thursday (বৃহস্পতিবার)</option>
                    <option value={4}>Friday (শুক্রবার)</option>
                    <option value={5}>Saturday (শনিবার)</option>
                    <option value={6}>Sunday (রবিবার)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consultation Slot Duration
                  </label>
                  <select
                    value={scheduleForm.slot_duration_minutes}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        slot_duration_minutes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                  >
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes (Standard)</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.start_time}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        start_time: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.end_time}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        end_time: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Max Patients Per Session
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={scheduleForm.max_patients}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        max_patients: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <ActionButton
                  variant="primary"
                  size="sm"
                  loading={savingSchedule}
                  onClick={handleSaveSchedule}
                >
                  Save Chamber Schedule
                </ActionButton>
              </div>
            </form>

            {/* List of Configured Schedules */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-sm text-slate-900">
                Configured Weekly Schedules ({schedules.length})
              </h3>
              {schedules.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  No schedules configured yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schedules.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="font-bold text-xs text-[#283891] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {s.day_of_week_display}
                          </span>
                          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1">
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px] sm:max-w-[200px]">
                              {s.clinic_name || (approvedClinics.find((c) => c.id === s.clinic)?.name) || "Affiliated Clinic"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="text-slate-400 hover:text-rose-600"
                          title="Remove Schedule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="font-mono font-bold text-sm text-slate-900">
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </div>

                      <div className="text-xs text-slate-500 flex justify-between">
                        <span>Max: {s.max_patients} patients</span>
                        <span>{s.slot_duration_minutes}m slots</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== BROADCAST DELAY & NOTICE MODAL ====== */}
      <ModalShell
        isOpen={delayModalOpen}
        onClose={() => setDelayModalOpen(false)}
        title="Chamber Delay & Notice Broadcast"
        subtitle="Broadcast expected delay or real-time chamber status to waiting patients."
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => {
                setDelayMinutes(0);
                setAnnouncementNote("");
                handleBroadcastDelay({ preventDefault: () => {} });
              }}
            >
              Clear Delay
            </ActionButton>
            <ActionButton
              variant="warning"
              size="sm"
              loading={broadcastingDelay}
              onClick={handleBroadcastDelay}
            >
              Broadcast Notice
            </ActionButton>
          </div>
        }
      >
        <form onSubmit={handleBroadcastDelay} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Expected Delay (Minutes)
            </label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    delayMinutes === mins
                      ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              max="240"
              value={delayMinutes}
              onChange={(e) =>
                setDelayMinutes(parseInt(e.target.value, 10) || 0)
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl mt-2 font-mono font-bold"
              placeholder="Custom delay in minutes"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chamber Notice / Clinical Reason (বার্তা)
            </label>
            <input
              type="text"
              placeholder="e.g. Performing Emergency OT / Traffic delay, arriving shortly..."
              value={announcementNote}
              onChange={(e) => setAnnouncementNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
            />
          </div>
        </form>
      </ModalShell>

      {/* ====== PATIENT MEDICAL REPORTS MODAL (STANDALONE TRIGGER) ====== */}
      <ModalShell
        isOpen={vaultModalOpen}
        onClose={() => setVaultModalOpen(false)}
        title="Patient Medical Reports"
        subtitle="Digital lab reports on file for this patient."
        size="lg"
        footer={
          <div className="flex justify-end w-full">
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => setVaultModalOpen(false)}
            >
              Close
            </ActionButton>
          </div>
        }
      >
        {loadingVault ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading diagnostic reports...
          </div>
        ) : vaultReports.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
            No diagnostic test reports available on file.
          </div>
        ) : (
          <div className="space-y-3">
            {vaultReports.map((report) => (
              <div
                key={report.id}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">
                      {report.title}
                    </h5>
                    <div className="text-[11px] text-slate-500">
                      {report.diagnostic_center &&
                        `🏥 ${report.diagnostic_center} • `}
                      <span>📅 {report.test_date}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    {report.report_type_display || report.report_type}
                  </span>
                </div>

                {report.summary_notes && (
                  <div className="text-[11px] bg-white p-2 rounded-xl border border-slate-100 text-slate-700 font-medium">
                    <span className="font-bold text-[#283891]">Findings: </span>
                    {report.summary_notes}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <ActionButton
                    variant="outline"
                    size="xs"
                    icon={ExternalLink}
                    disabled={accessingReportId === report.id}
                    onClick={() => handleViewMedicalReport(report.id)}
                  >
                    {accessingReportId === report.id
                      ? "Opening..."
                      : "View Report"}
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalShell>

      {/* ====== BANGLADESH STANDARD A4 PRINTABLE E-PRESCRIPTION MODAL ====== */}
      {rxPrintModalOpen && printRxData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print-modal-overlay">
          <div className="bg-white text-slate-900 max-w-4xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-auto animate-in fade-in zoom-in-95 print-modal-content">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 print:hidden">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-base">
                <Printer size={20} />
                <span>Bangladesh Standard E-Prescription Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <ActionButton
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                >
                  Print Prescription (A4)
                </ActionButton>
                <button
                  type="button"
                  onClick={() => setRxPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Prescription Body (A4 Styled) */}
            <div className="space-y-6 print:p-0 print-document a4-prescription-sheet">
              {/* Rx Header: Clinic & Doctor Details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-emerald-600 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-emerald-800">
                    {formatDoctorName(printRxData.doctor?.full_name || profile?.full_name)}
                  </h2>
                  <p className="text-xs font-bold text-slate-700">
                    {printRxData.doctor?.qualification ||
                      profile?.qualification ||
                      "MBBS, Specialist Physician"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    BMDC Reg. No:{" "}
                    {profile?.id?.slice(0, 8).toUpperCase() || "A-78902"}
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-0.5">
                  <h3 className="text-lg font-black text-slate-800">
                    {printRxData.appointment?.clinic?.name || "Smart Clinic BD"}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {printRxData.appointment?.clinic?.address ||
                      "Dhaka, Bangladesh"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Serial #{printRxData.appointment?.serial_number || 1} •
                    Date:{" "}
                    {printRxData.appointment?.appointment_date ||
                      new Date().toISOString().split("T")[0]}
                  </p>
                </div>
              </div>

              {/* Patient Demographics & Vitals Bar */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px]">
                    Patient Name
                  </span>
                  <div className="font-extrabold text-slate-900">
                    {printRxData.appointment?.family_member?.full_name ||
                      `${
                        printRxData.appointment?.patient?.first_name || ""
                      } ${
                        printRxData.appointment?.patient?.last_name || ""
                      }`.trim() ||
                      printRxData.appointment?.patient_name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px]">
                    Age / Gender
                  </span>
                  <div className="font-extrabold text-slate-900">
                    {printRxData.appointment?.family_member?.age || "Adult"}{" "}
                    yrs /{" "}
                    {printRxData.appointment?.family_member?.gender ||
                      "Patient"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px]">
                    Blood Pressure
                  </span>
                  <div className="font-mono font-bold text-slate-900">
                    {printRxData.vitals?.bp || "120/80"} mmHg
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px]">
                    Weight / Sugar
                  </span>
                  <div className="font-mono font-bold text-slate-900">
                    {printRxData.vitals?.weight || "—"} |{" "}
                    {printRxData.vitals?.blood_sugar || "—"}
                  </div>
                </div>
              </div>

              {/* Clinical Columns: Diagnosis & Tests (Left) vs Medications (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[320px]">
                {/* Left 4 Cols: Findings, Diagnosis, Tests */}
                <div className="md:col-span-4 border-r border-slate-200 pr-4 space-y-4">
                  {printRxData.diagnosis && (
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 border-b pb-1 mb-1">
                        Clinical Diagnosis
                      </h4>
                      <p className="text-xs font-extrabold text-slate-900">
                        {printRxData.diagnosis}
                      </p>
                    </div>
                  )}

                  {printRxData.diagnostic_tests && (
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 border-b pb-1 mb-1">
                        Investigations Advised (ল্যাব টেস্ট)
                      </h4>
                      <div className="text-xs text-slate-700 whitespace-pre-line font-medium leading-relaxed">
                        {printRxData.diagnostic_tests}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 text-[11px] text-slate-400">
                    <div>Ref No: {printRxData.id?.slice(0, 8)}</div>
                    <div>Issued: {new Date().toLocaleDateString("en-GB")}</div>
                  </div>
                </div>

                {/* Right 8 Cols: Rx Medications */}
                <div className="md:col-span-8 space-y-4">
                  <div className="text-3xl font-serif font-black text-emerald-700 select-none">
                    ℞
                  </div>

                  <div className="space-y-4">
                    {printRxData.medications?.map((m, idx) => (
                      <div
                        key={idx}
                        className="border-b border-slate-100 pb-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-sm text-slate-900">
                              {idx + 1}. {m.medication_name}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {m.dosage}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-600 mt-1 pl-4">
                          <span>
                            Timing: <strong>{m.timing}</strong>
                          </span>
                          <span>
                            Duration: <strong>{m.duration}</strong>
                          </span>
                          {m.instructions && (
                            <span className="text-slate-500">
                              ({m.instructions})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {printRxData.advice && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mt-4 space-y-1">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Advice & Instructions (পরামর্শ):
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                        {printRxData.advice}
                      </p>
                    </div>
                  )}

                  {(printRxData.follow_up_date || printRxData.follow_up_notes) && (
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 mt-4 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-emerald-900">
                          Follow-up Consultation (পরবর্তী সাক্ষাত):
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-0.5">
                          {printRxData.follow_up_notes || "Please bring all diagnostic reports"}
                        </p>
                      </div>
                      {printRxData.follow_up_date && (
                        <div className="font-mono font-black text-xs text-emerald-950 bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs shrink-0">
                          📅 {printRxData.follow_up_date}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Rx Footer: QR Token Verification & Doctor Signature */}
              <div className="border-t-2 border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-end gap-4">
                <div className="text-left space-y-1">
                  {printRxData.qr_token ? (
                    <>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        Verification Token: {printRxData.qr_token}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        Verify authenticity online at{" "}
                        <a
                          href={`/verify-prescription/${printRxData.qr_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#283891] underline font-semibold hover:text-indigo-800"
                        >
                          smartclinic.bd/verify/
                          {printRxData.qr_token.slice(0, 8)}... ↗
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] font-mono text-slate-400">
                      Prescription Token: Pending Generation
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-right border-t border-slate-400 pt-1 min-w-[200px]">
                  <div className="font-serif italic text-sm font-bold text-slate-800">
                    {formatDoctorName(printRxData.doctor?.full_name || profile?.full_name)}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Authorized Medical Signature
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MEDICAL REPORT AI ANALYZER MODAL (FOR DOCTORS) */}
      <MedicalReportAIModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        report={selectedReportForAI}
      />
    </div>
  );
}
