import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import apiClient from "../../api/axios";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatTime, formatCurrency, formatDoctorName } from "../../utils/formatters";
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  XCircle,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Users,
  Plus,
  Heart,
  Phone,
  FastForward,
  Navigation,
  Bell,
  FileText,
  Printer,
  CheckCircle2,
  FolderHeart,
  ExternalLink,
  Trash2,
  Upload,
  Pencil,
  Smartphone,
  Building2,
  Tv,
  Volume2,
  AlertTriangle,
  Star,
  MessageSquare,
  Send,
  ThumbsUp,
  Loader,
  ArrowRight,
  ShieldCheck,
  Activity,
  User,
  Sparkles,
  Info,
} from "lucide-react";
import VitalsTrendDashboard from "../../components/vitals/VitalsTrendDashboard";
import MedicalReportAIModal from "../../components/reports/MedicalReportAIModal";

const DOB_MONTHS = [
  { value: "01", label: "01 - Jan" },
  { value: "02", label: "02 - Feb" },
  { value: "03", label: "03 - Mar" },
  { value: "04", label: "04 - Apr" },
  { value: "05", label: "05 - May" },
  { value: "06", label: "06 - Jun" },
  { value: "07", label: "07 - Jul" },
  { value: "08", label: "08 - Aug" },
  { value: "09", label: "09 - Sep" },
  { value: "10", label: "10 - Oct" },
  { value: "11", label: "11 - Nov" },
  { value: "12", label: "12 - Dec" },
];

const CURRENT_YEAR = new Date().getFullYear();
const DOB_YEARS = Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) =>
  (CURRENT_YEAR - i).toString()
);
const DOB_DAYS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);

export default function PatientDashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();

  // Navigation & Sub-filter states
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointmentFilter, setAppointmentFilter] = useState("all"); // 'all' | 'upcoming' | 'past'

  // Data states
  const [appointments, setAppointments] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [chamberSessions, setChamberSessions] = useState({});
  const [medicalReports, setMedicalReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Filter for reports by family member
  const [reportFilterMember, setReportFilterMember] = useState("");

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("SSLCOMMERZ");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState(null);

  // Family Member Modal & CRUD States
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [editingFamilyMember, setEditingFamilyMember] = useState(null);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deletingFamily, setDeletingFamily] = useState(false);
  const [familyFormData, setFamilyFormData] = useState({
    full_name: "",
    relationship: "FATHER",
    phone: "",
    date_of_birth: "",
    age: "",
    gender: "MALE",
    blood_group: "B+",
    medical_notes: "",
  });
  const [submittingFamily, setSubmittingFamily] = useState(false);

  // Prescription View Modal State
  const [rxViewModalOpen, setRxViewModalOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);
  const [loadingRx, setLoadingRx] = useState(false);

  // Upload Medical Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportFile, setSelectedReportFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const reportFileInputRef = useRef(null);
  const [reportFormData, setReportFormData] = useState({
    title: "",
    report_type: "BLOOD_TEST",
    diagnostic_center: "Popular Diagnostic Center",
    test_date: new Date().toISOString().split("T")[0],
    summary_notes: "",
    family_member_id: "",
  });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [accessingReportId, setAccessingReportId] = useState(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedReportForAI, setSelectedReportForAI] = useState(null);
  const [analyzingReportId, setAnalyzingReportId] = useState(null);

  // Review / Rating Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAppointment, setReviewAppointment] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [existingReviews, setExistingReviews] = useState({}); // { [appointmentId]: review }

  const todayStr = new Date().toISOString().split("T")[0];

  // ----------------------------------------------------
  // DATA FETCHING & POLLING
  // ----------------------------------------------------
  const fetchAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/appointments/");
      const list = res.results || res || [];
      setAppointments(list);

      // Fetch live chamber session for today's appointments
      const todayApts = list.filter((a) => a.appointment_date === todayStr);
      const sessionMap = {};
      await Promise.all(
        todayApts.map(async (apt) => {
          if (apt.doctor?.id && apt.clinic?.id) {
            try {
              const sessionRes = await apiClient.get(
                `/doctors/chamber-session/?doctor_id=${apt.doctor.id}&clinic_id=${apt.clinic.id}&date=${todayStr}`
              );
              sessionMap[apt.id] = sessionRes;
            } catch {}
          }
        })
      );
      setChamberSessions(sessionMap);
    } catch {
      setError("Failed to load appointments. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const res = await apiClient.get("/accounts/family-members/");
      setFamilyMembers(res.results || res || []);
    } catch {}
  };

  const fetchMedicalReports = async () => {
    setLoadingReports(true);
    try {
      const res = await apiClient.get("/prescriptions/reports/");
      setMedicalReports(res.results || res || []);
    } catch {} finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchFamilyMembers();
    fetchMedicalReports();

    // 20s interval background sync for live queue updates
    const interval = setInterval(() => {
      fetchAppointments();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Listen to payment callback redirect params (SSLCommerz or Booking)
  useEffect(() => {
    const paymentParam = searchParams.get("payment");
    const bookingParam = searchParams.get("booking");
    if (bookingParam === "success") {
      setActionMessage(
        "Appointment booked successfully. Payment is pending — pay at clinic counter or online."
      );
      fetchAppointments();
    } else if (paymentParam === "success") {
      setActionMessage(
        "🎉 Payment completed successfully via SSLCommerz! Your appointment is now Confirmed."
      );
      fetchAppointments();
    } else if (paymentParam === "fail") {
      setError("Payment failed or was declined by the gateway. Please try again.");
    } else if (paymentParam === "cancel") {
      setActionMessage(
        "Payment was cancelled. You can complete payment anytime before consultation."
      );
    }
  }, [searchParams]);

  // ----------------------------------------------------
  // APPOINTMENT ACTIONS
  // ----------------------------------------------------
  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      await apiClient.post(`/appointments/${id}/cancel/`);
      setActionMessage("Appointment cancelled successfully.");
      fetchAppointments();
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to cancel appointment.");
    }
  };

  const openPaymentModal = (appointment) => {
    setSelectedAppointment(appointment);
    setPaymentMethod("SSLCOMMERZ");
    setPaymentModalOpen(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setProcessingPayment(true);
    setError("");
    try {
      if (paymentMethod === "CASH") {
        // Record preference for cash at clinic counter
        await apiClient.post("/payments/", {
          appointment_id: selectedAppointment.id,
          payment_method: "CASH",
        });

        setActionMessage(
          "Payment preference saved: Cash at Clinic Counter. Your appointment will remain payment-pending until reception confirms collection."
        );
        setPaymentModalOpen(false);
        fetchAppointments();
      } else {
        // SSLCOMMERZ Hosted Gateway Initiation & Direct Redirect
        const res = await apiClient.post("/payments/initiate-sslcommerz/", {
          appointment_id: selectedAppointment.id,
        });

        if (res?.redirect_url) {
          window.location.href = res.redirect_url;
        } else {
          setError("Failed to generate payment gateway session.");
        }
      }
    } catch (err) {
      setError(
        typeof err === "string" ? err : "Payment initiation failed. Please try again."
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  // ----------------------------------------------------
  // PRESCRIPTION & REVIEW ACTIONS
  // ----------------------------------------------------
  const openPrescriptionView = async (aptId) => {
    setLoadingRx(true);
    setSelectedRx(null);
    setRxViewModalOpen(true);
    try {
      const res = await apiClient.get(`/prescriptions/appointment/${aptId}/`);
      setSelectedRx(res);
    } catch {
      setError("Prescription not found or not yet issued by doctor.");
      setRxViewModalOpen(false);
    } finally {
      setLoadingRx(false);
    }
  };

  const openReviewModal = async (apt) => {
    setReviewAppointment(apt);
    setReviewRating(existingReviews[apt.id]?.rating || 5);
    setReviewComment(existingReviews[apt.id]?.comment || "");
    setReviewModalOpen(true);
    try {
      const res = await apiClient.get(`/reviews/check/?appointment_id=${apt.id}`);
      if (res?.has_review && res?.review) {
        setExistingReviews((prev) => ({ ...prev, [apt.id]: res.review }));
        setReviewRating(res.review.rating);
        setReviewComment(res.review.comment || "");
      }
    } catch {}
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewAppointment) return;
    setSubmittingReview(true);
    try {
      const res = await apiClient.post("/reviews/create/", {
        appointment_id: reviewAppointment.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setExistingReviews((prev) => ({ ...prev, [reviewAppointment.id]: res }));
      setActionMessage(
        `⭐ Thank you! Your review for Dr. ${reviewAppointment.doctor?.full_name} has been submitted.`
      );
      setReviewModalOpen(false);
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : "Could not submit review. You may have already reviewed this appointment."
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  // ----------------------------------------------------
  // FAMILY MEMBER ACTIONS
  // ----------------------------------------------------
  const initialFamilyForm = {
    full_name: "",
    relationship: "FATHER",
    phone: "",
    date_of_birth: "",
    age: "",
    gender: "MALE",
    blood_group: "B+",
    medical_notes: "",
  };

  const openAddFamilyModal = () => {
    setEditingFamilyMember(null);
    setFamilyFormData(initialFamilyForm);
    setError("");
    setFamilyModalOpen(true);
  };

  const openEditFamilyModal = (member) => {
    setEditingFamilyMember(member);
    setFamilyFormData({
      full_name: member.full_name || "",
      relationship: member.relationship || "OTHER",
      phone: member.phone || "",
      date_of_birth: member.date_of_birth || "",
      age: member.age || "",
      gender: member.gender || "MALE",
      blood_group: member.blood_group || "B+",
      medical_notes: member.medical_notes || "",
    });
    setError("");
    setFamilyModalOpen(true);
  };

  const openDeleteConfirm = (member) => {
    setMemberToDelete(member);
    setDeleteConfirmModalOpen(true);
  };

  const [dobYear, dobMonth, dobDay] = (familyFormData.date_of_birth || "").split("-");

  const handleDobChange = (part, val) => {
    let y = part === "year" ? val : dobYear || "";
    let m = part === "month" ? val : dobMonth || "";
    let d = part === "day" ? val : dobDay || "";

    if (y && m && d) {
      const formatted = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const birthDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      calculatedAge = Math.max(0, calculatedAge);

      setFamilyFormData((prev) => ({
        ...prev,
        date_of_birth: formatted,
        age: calculatedAge.toString(),
      }));
    } else {
      const formatted = [y, m, d].some(Boolean) ? `${y}-${m}-${d}` : "";
      setFamilyFormData((prev) => ({
        ...prev,
        date_of_birth: formatted,
      }));
    }
  };

  const handleSaveFamilyMember = async (e) => {
    e.preventDefault();

    if (familyFormData.phone) {
      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      if (!bdPhoneRegex.test(familyFormData.phone)) {
        setError(
          "Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)."
        );
        return;
      }
    }

    setSubmittingFamily(true);
    setError("");
    try {
      const payload = {
        full_name: familyFormData.full_name,
        relationship: familyFormData.relationship,
        phone: familyFormData.phone || "",
        date_of_birth: familyFormData.date_of_birth || null,
        age: familyFormData.age ? parseInt(familyFormData.age, 10) : null,
        gender: familyFormData.gender,
        blood_group: familyFormData.blood_group,
        medical_notes: familyFormData.medical_notes,
      };

      if (editingFamilyMember) {
        const updated = await apiClient.patch(
          `/accounts/family-members/${editingFamilyMember.id}/`,
          payload
        );
        setFamilyMembers((prev) =>
          prev.map((m) => (m.id === editingFamilyMember.id ? { ...m, ...updated } : m))
        );
        setActionMessage(`${familyFormData.full_name}'s profile updated successfully!`);
      } else {
        const created = await apiClient.post("/accounts/family-members/", payload);
        setFamilyMembers((prev) => [created, ...prev]);
        setActionMessage("Family member profile added successfully!");
      }
      setFamilyModalOpen(false);
      setEditingFamilyMember(null);
      setFamilyFormData(initialFamilyForm);
    } catch (err) {
      if (typeof err === "object") {
        setError(
          Object.values(err).flat().join(" ") ||
            "Failed to save family member. Please check required fields."
        );
      } else {
        setError(err || "Failed to save family member.");
      }
    } finally {
      setSubmittingFamily(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setDeletingFamily(true);
    setError("");
    try {
      await apiClient.delete(`/accounts/family-members/${memberToDelete.id}/`);
      setFamilyMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setActionMessage(`${memberToDelete.full_name} removed from family profiles.`);
      setDeleteConfirmModalOpen(false);
      setMemberToDelete(null);
    } catch {
      setError("Failed to delete family member profile.");
    } finally {
      setDeletingFamily(false);
    }
  };

  // ----------------------------------------------------
  // MEDICAL REPORT ACTIONS
  // ----------------------------------------------------
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError("");
    if (!file) {
      setSelectedReportFile(null);
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size === 0) {
      setFileError("The selected file is empty (0 bytes).");
      setSelectedReportFile(null);
      return;
    }
    if (file.size > maxBytes) {
      setFileError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10MB limit.`
      );
      setSelectedReportFile(null);
      return;
    }

    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setFileError(
        `Unsupported format "${ext}". Please select a PDF, JPG, or PNG document.`
      );
      setSelectedReportFile(null);
      return;
    }

    setSelectedReportFile(file);
  };

  const handleClearSelectedFile = () => {
    setSelectedReportFile(null);
    setFileError("");
    if (reportFileInputRef.current) {
      reportFileInputRef.current.value = "";
    }
  };

  const handleUploadReport = async (e) => {
    e.preventDefault();
    if (!selectedReportFile) {
      setFileError("Please select a physical medical report file (PDF, JPG, PNG).");
      return;
    }

    setSubmittingReport(true);
    setError("");
    setFileError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedReportFile);
      formData.append("title", reportFormData.title);
      formData.append("report_type", reportFormData.report_type);
      formData.append("diagnostic_center", reportFormData.diagnostic_center);
      formData.append("test_date", reportFormData.test_date);
      if (reportFormData.summary_notes) {
        formData.append("summary_notes", reportFormData.summary_notes);
      }
      if (reportFormData.family_member_id) {
        formData.append("family_member_id", reportFormData.family_member_id);
      }

      await apiClient.post("/prescriptions/reports/", formData);
      setActionMessage("Diagnostic report uploaded to patient records successfully!");
      setReportModalOpen(false);
      handleClearSelectedFile();
      setReportFormData({
        title: "",
        report_type: "BLOOD_TEST",
        diagnostic_center: "Popular Diagnostic Center",
        test_date: new Date().toISOString().split("T")[0],
        summary_notes: "",
        family_member_id: "",
      });
      fetchMedicalReports();
    } catch (err) {
      const backendErr =
        err?.response?.data?.file?.[0] ||
        err?.response?.data?.errors?.file?.[0] ||
        err?.response?.data?.detail ||
        "Failed to upload report. Please check file and details.";
      setError(backendErr);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Delete this diagnostic report from your records?")) return;
    try {
      await apiClient.delete(`/prescriptions/reports/${id}/`);
      setActionMessage("Report removed from records.");
      fetchMedicalReports();
    } catch {
      setError("Failed to delete report.");
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
        setError("Unable to obtain secure document delivery link.");
      }
    } catch {
      setError("You do not have authorization to view this medical document.");
    } finally {
      setAccessingReportId(null);
    }
  };

  const handleAnalyzeReportAI = async (report) => {
    setAnalyzingReportId(report.id);
    try {
      const res = await apiClient.post(`/prescriptions/reports/${report.id}/analyze-ai/`);
      const updatedReport = res.report || res.data?.report || res.data || res;
      setMedicalReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, ...updatedReport } : r))
      );
      setSelectedReportForAI({ ...report, ...updatedReport });
      setAiModalOpen(true);
      setActionMessage("স্মার্ট এআই দ্বারা মেডিক্যাল রিপোর্টটি বিশ্লেষণ করা হয়েছে! (Report analyzed successfully)");
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "মেডিক্যাল রিপোর্ট বিশ্লেষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
      );
    } finally {
      setAnalyzingReportId(null);
    }
  };

  const handleOpenAIModal = (report) => {
    setSelectedReportForAI(report);
    setAiModalOpen(true);
  };

  // ----------------------------------------------------
  // COMPUTED FILTERS & METRICS
  // ----------------------------------------------------
  const todayAppointments = appointments.filter((a) => a.appointment_date === todayStr);
  const upcomingAppointments = appointments.filter(
    (a) => a.appointment_date >= todayStr && a.status !== "COMPLETED" && a.status !== "CANCELLED"
  );
  const pastAppointments = appointments.filter(
    (a) => a.appointment_date < todayStr || a.status === "COMPLETED" || a.status === "CANCELLED"
  );

  const displayedAppointments = appointments.filter((apt) => {
    if (appointmentFilter === "upcoming") {
      return apt.appointment_date >= todayStr && apt.status !== "COMPLETED" && apt.status !== "CANCELLED";
    }
    if (appointmentFilter === "past") {
      return apt.appointment_date < todayStr || apt.status === "COMPLETED" || apt.status === "CANCELLED";
    }
    return true; // 'all'
  });

  const filteredReports = medicalReports.filter((r) => {
    if (!reportFilterMember) return true;
    if (reportFilterMember === "self") return !r.family_member;
    return (
      r.family_member === reportFilterMember ||
      r.family_member?.id === reportFilterMember
    );
  });

  // Topmost primary active appointment for Today's Consultation Hero
  const primaryTodayApt = todayAppointments.find(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING"
  ) || todayAppointments[0];

  const primaryTodaySession = primaryTodayApt ? chamberSessions[primaryTodayApt.id] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── 1. PATIENT HEADER & GREETING ── */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-[#283891] border border-indigo-100">
                Patient Portal
              </span>
              {todayAppointments.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Activity size={12} className="mr-1 text-emerald-600 animate-pulse" />
                  Today&apos;s Consultation Active
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {language === "bn" ? "স্বাগতম" : "Welcome back"}, {user?.first_name || "Patient"} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {t("patientDashboardSubtitle") ||
                "Live serial tracker, doctor appointments, family care, and diagnostic reports."}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                handleClearSelectedFile();
                setReportModalOpen(true);
              }}
              className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload size={15} className="text-slate-500" />
              <span>{t("uploadLabReport") || "Upload Report"}</span>
            </button>

            <button
              type="button"
              onClick={openAddFamilyModal}
              className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={15} className="text-slate-500" />
              <span>{t("addFamilyMember") || "Add Family"}</span>
            </button>

            <Link
              to="/book"
              className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <Calendar size={15} />
              <span>{t("bookAppointment") || "Book Consultation"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── ALERTS / FEEDBACK ── */}
      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3.5 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed font-medium">{actionMessage}</div>
          <button
            type="button"
            onClick={() => setActionMessage("")}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3.5 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed font-medium">{error}</div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-700 hover:text-rose-950 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 2. PROMINENT "TODAY'S CONSULTATION & LIVE QUEUE" HERO BLOCK ── */}
      {primaryTodayApt && (
        <section className="bg-white rounded-2xl border-2 border-[#283891]/25 p-5 sm:p-6 shadow-xs space-y-4">
          {(() => {
            const apt = primaryTodayApt;
            const session = primaryTodaySession;
            const currentSerial = session?.current_serial || 0;
            const yourSerial = apt.serial_number || 1;
            const patientsAhead = Math.max(0, yourSerial - currentSerial);
            const isSkipped = Boolean(session?.skipped_serials?.includes(yourSerial));
            const isSessionInactive = Boolean(
              session?.status === "PRAYER_BREAK" ||
              session?.status === "ENDED" ||
              session?.status === "PAUSED"
            );
            const isNearTurn = Boolean(
              currentSerial > 0 &&
              yourSerial > 0 &&
              patientsAhead > 0 &&
              patientsAhead <= 3 &&
              session?.status === "IN_CHAMBER" &&
              !isSkipped &&
              !isSessionInactive
            );
            const isYourTurn = Boolean(
              currentSerial > 0 &&
              yourSerial > 0 &&
              currentSerial === yourSerial &&
              session?.status === "IN_CHAMBER" &&
              !isSkipped &&
              !isSessionInactive
            );

            return (
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#283891] text-white tracking-wide uppercase">
                      {t("liveSerialTracker") || "LIVE CHAMBER QUEUE"}
                    </span>
                    <StatusBadge
                      status={session?.status || "NOT_STARTED"}
                      size="sm"
                      pulse={session?.status === "IN_CHAMBER"}
                    />
                    {session?.room_number && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <MapPin size={11} className="text-[#283891]" />
                        Room {session.room_number}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {t("refreshesAuto") || "Auto-sync active"}
                    </span>
                    <a
                      href={`/queue-display/${apt.clinic?.id}/${apt.doctor?.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Open Waiting Room Live TV Display"
                    >
                      <Tv size={13} className="text-[#283891]" />
                      <span>Waiting Room TV ↗</span>
                    </a>
                  </div>
                </div>

                {/* Attention Banners */}
                {isYourTurn && (
                  <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-xs flex items-center gap-3 animate-pulse">
                    <Bell className="w-6 h-6 shrink-0 animate-bounce" />
                    <div className="flex-1">
                      <div className="font-black text-sm uppercase tracking-wide">
                        {t("itsYourTurn") || "🔔 IT'S YOUR TURN NOW!"}
                      </div>
                      <div className="text-xs text-emerald-100 font-medium mt-0.5">
                        Please proceed directly to Dr. {apt.doctor?.full_name}&apos;s consultation
                        chamber {session?.room_number ? `(Room ${session.room_number})` : ""}.
                      </div>
                    </div>
                  </div>
                )}

                {isNearTurn && !isYourTurn && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {t("getReady") || "🔔 GET READY:"} Only {patientsAhead} patient(s) away!
                      Please wait right outside {session?.room_number ? `Room ${session.room_number}` : "the doctor's chamber"}.
                    </span>
                  </div>
                )}

                {isSkipped && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      ⚠️ Serial #{yourSerial} was temporarily skipped by the chamber. Please inform reception desk to recall your turn!
                    </span>
                  </div>
                )}

                {(session?.delay_minutes > 0 || session?.announcement_note) && (
                  <div className="bg-amber-500/10 border border-amber-300 text-amber-900 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {session.delay_minutes > 0 && `Chamber is delayed by ~${session.delay_minutes} minutes. `}
                      {session.announcement_note || "Doctor is held up in emergency round."}
                    </span>
                  </div>
                )}

                {/* Queue Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {t("currentlyCalled") || "Now Calling"}
                    </div>
                    <div className="text-3xl font-black text-[#283891] mt-0.5">
                      #{currentSerial}
                    </div>
                  </div>

                  <div className="bg-indigo-50/60 border border-indigo-200/70 p-3.5 rounded-xl text-center">
                    <div className="text-[10px] font-bold text-[#283891] uppercase tracking-wider">
                      {t("yourSerial") || "Your Serial"}
                    </div>
                    <div className="text-3xl font-black text-[#283891] mt-0.5">
                      #{yourSerial}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {t("patientsAhead") || "Patients Ahead"}
                    </div>
                    <div className="text-3xl font-black text-slate-900 mt-0.5">
                      {currentSerial >= yourSerial ? 0 : patientsAhead}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {t("estWait") || "Est. Wait"}
                    </div>
                    <div
                      className={`text-sm sm:text-base font-extrabold mt-2 ${
                        session?.status === "PRAYER_BREAK" || session?.status === "PAUSED"
                          ? "text-amber-700"
                          : session?.status === "ENDED"
                          ? "text-slate-500"
                          : "text-emerald-700"
                      }`}
                    >
                      {session?.status === "PRAYER_BREAK"
                        ? language === "bn"
                          ? "নামাজের বিরতি"
                          : "Prayer Break"
                        : session?.status === "ENDED"
                        ? language === "bn"
                          ? "চেম্বার শেষ"
                          : "Session Ended"
                        : session?.status === "PAUSED"
                        ? language === "bn"
                          ? "সাময়িক বিরতি"
                          : "Paused"
                        : currentSerial >= yourSerial
                        ? t("yourTurn") || "Your Turn"
                        : `~${patientsAhead * (session?.estimated_mins_per_patient || 12)} mins`}
                    </div>
                  </div>
                </div>

                {/* Bottom Detail & Primary Action */}
                <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-slate-100">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-900">{formatDoctorName(apt.doctor?.full_name)}</span>{" "}
                    • {apt.clinic?.name} {apt.appointment_time ? `(${formatTime(apt.appointment_time)})` : ""}
                    {apt.family_member && (
                      <span className="ml-2 inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Patient: {apt.family_member.full_name} ({apt.family_member.relationship_display || apt.family_member.relationship})
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/track-queue/${apt.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors"
                  >
                    <span>Track Live Queue ↗</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* ── 3. SEGMENTED NAVIGATION TABS ── */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("appointments")}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "appointments"
                ? "bg-[#283891] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Calendar size={16} />
            <span className="hidden sm:inline">{t("myAppointments") || "Appointments"}</span>
            <span className="sm:hidden">Appointments</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "appointments"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {appointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("family")}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "family"
                ? "bg-[#283891] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users size={16} />
            <span className="hidden sm:inline">{t("familyProfiles") || "Family Profiles"}</span>
            <span className="sm:hidden">Family</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "family"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {familyMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("reports");
              fetchMedicalReports();
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-[#283891] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FolderHeart size={16} />
            <span className="hidden sm:inline">
              {t("medicalReportVault") || "Medical Reports"}
            </span>
            <span className="sm:hidden">Reports</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "reports"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {medicalReports.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vitals")}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "vitals"
                ? "bg-[#283891] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Activity size={16} />
            <span className="hidden sm:inline">
              {language === "bn" ? "স্বাস্থ্য সূচক ও গ্রাফ" : "Vitals & Trends"}
            </span>
            <span className="sm:hidden">Vitals</span>
          </button>
        </div>
      </section>

      {/* ── 4. TAB 1: APPOINTMENTS ── */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          {/* Sub-filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAppointmentFilter("all")}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  appointmentFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({appointments.length})
              </button>
              <button
                type="button"
                onClick={() => setAppointmentFilter("upcoming")}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  appointmentFilter === "upcoming"
                    ? "bg-white text-[#283891] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Upcoming ({upcomingAppointments.length})
              </button>
              <button
                type="button"
                onClick={() => setAppointmentFilter("past")}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  appointmentFilter === "past"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Past / Completed ({pastAppointments.length})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing {displayedAppointments.length} record(s)
            </div>
          </div>

          {/* Appointments Grid / List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse space-y-3">
                  <div className="h-5 bg-slate-200 rounded-md w-1/3"></div>
                  <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
                  <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
                </div>
              ))}
            </div>
          ) : displayedAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#283891] mx-auto flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                {t("noAppointments") || "No Booked Appointments"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t("noAppointmentsHint") ||
                  "You have no scheduled consultations in this filter. Book a verified clinic specialist today."}
              </p>
              <Link
                to="/book"
                className="inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2 rounded-xl bg-[#283891] text-white font-bold text-xs shadow-2xs hover:bg-[#1f2c73] transition-colors mt-2"
              >
                <Plus size={15} />
                <span>{t("bookNow") || "Book an Appointment Now"}</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {displayedAppointments.map((apt) => {
                const isToday = apt.appointment_date === todayStr;
                const isConfirmed = apt.status === "CONFIRMED";
                const isPending = apt.status === "PENDING";
                const isCompleted = apt.status === "COMPLETED";
                const isCancelled = apt.status === "CANCELLED";

                return (
                  <div
                    key={apt.id}
                    className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs ${
                      isToday
                        ? "border-[#283891]/40 ring-1 ring-[#283891]/15"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Left: Details */}
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Status & Identity Chips */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 text-[#283891] border border-indigo-200">
                            Serial #{apt.serial_number || 1}
                          </span>
                          <StatusBadge status={apt.status} size="sm" />
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Today
                            </span>
                          )}
                          {apt.family_member && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                              <Heart size={11} className="text-rose-500" />
                              <span>
                                {t("forPatient") || "For:"} {apt.family_member.full_name} ({apt.family_member.relationship_display || apt.family_member.relationship})
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Doctor & Clinic Details */}
                        <div>
                          <Link
                            to={`/doctors?specialization_id=${apt.doctor?.specializations?.[0]?.id || ""}`}
                            className="font-extrabold text-base sm:text-lg text-slate-900 hover:text-[#283891] transition-colors inline-flex items-center gap-1 group"
                          >
                            <span>{formatDoctorName(apt.doctor?.full_name)}</span>
                            <span className="text-xs text-slate-400 group-hover:text-[#283891]">↗</span>
                          </Link>
                          {apt.doctor?.specializations?.[0]?.name && (
                            <span className="text-xs text-slate-500 ml-2">
                              • {apt.doctor.specializations[0].name}
                            </span>
                          )}
                        </div>

                        {/* Clinic, Date, Time Row */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600">
                          <Link
                            to={`/clinics/${apt.clinic?.id}`}
                            className="hover:text-[#283891] transition-colors font-medium flex items-center gap-1"
                          >
                            <MapPin size={13} className="text-[#283891] shrink-0" />
                            <span className="truncate max-w-[200px]">{apt.clinic?.name}</span>
                          </Link>
                          <div className="flex items-center gap-1">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            <span>{apt.appointment_date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={13} className="text-slate-400 shrink-0" />
                            <span>{formatTime(apt.appointment_time)}</span>
                          </div>
                        </div>

                        {apt.problem_description && (
                          <div className="text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-600 mt-1 max-w-xl">
                            <span className="font-semibold text-slate-700">Patient Notes: </span>
                            {apt.problem_description}
                          </div>
                        )}
                      </div>

                      {/* Right: Fee & Action Buttons */}
                      <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg sm:text-xl font-black text-[#283891]">
                            {formatCurrency(apt.amount)} BDT
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {isCancelled ? "(Cancelled)" : isPending ? "(Unpaid)" : "(Confirmed)"}
                          </span>
                        </div>

                        {/* Hierarchical Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          {/* COMPLETED ACTIONS */}
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => openPrescriptionView(apt.id)}
                              className="flex-1 md:flex-initial min-h-[44px] px-3.5 py-2 rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <FileText size={15} />
                              <span>{t("viewPrescription") || "View Prescription"}</span>
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => openReviewModal(apt)}
                              className={`flex-1 md:flex-initial min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                existingReviews[apt.id]
                                  ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                              <span>
                                {existingReviews[apt.id] ? "Edit Review" : t("leaveReview") || "Review"}
                              </span>
                            </button>
                          )}

                          {/* CONFIRMED ACTIONS */}
                          {isConfirmed && isToday && (
                            <Link
                              to={`/track-queue/${apt.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 md:flex-initial min-h-[44px] px-3.5 py-2 rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <Activity size={14} />
                              <span>Track Queue</span>
                            </Link>
                          )}

                          {(isConfirmed || isCompleted) && (
                            <button
                              type="button"
                              onClick={() => setReceiptModalData(apt)}
                              className="flex-1 md:flex-initial min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              title="Print confirmed thermal token receipt slip"
                            >
                              <Printer size={14} />
                              <span>Receipt Slip</span>
                            </button>
                          )}

                          {/* PENDING PAYMENT ACTION */}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(apt)}
                              className="flex-1 md:flex-initial min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <CreditCard size={15} />
                              <span>{t("payAndConfirm") || "Pay & Confirm"}</span>
                            </button>
                          )}

                          {/* CANCELLATION */}
                          {!isCancelled && !isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleCancel(apt.id)}
                              className="flex-1 md:flex-initial min-h-[44px] px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <XCircle size={14} />
                              <span>{t("cancel") || "Cancel"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 5. TAB 2: FAMILY PROFILES ── */}
      {activeTab === "family" && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-[#283891]" />
                {t("parentCareTitle") || "Parent Care & Family Profiles"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("parentCareSubtitle") ||
                  "Add parents, spouse, or dependents to book appointments and organize medical records for them."}
              </p>
            </div>
            <button
              type="button"
              onClick={openAddFamilyModal}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>{t("addMember") || "Add Family Member"}</span>
            </button>
          </div>

          {familyMembers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#283891] mx-auto flex items-center justify-center">
                <Users size={24} />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">
                {t("noFamilyMembers") || "No Family Profiles Added"}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t("noFamilyHint") ||
                  "Add your parents, spouse, or children to manage their clinical visits with single-click scheduling."}
              </p>
              <button
                type="button"
                onClick={openAddFamilyModal}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2 rounded-xl bg-[#283891] text-white font-bold text-xs shadow-2xs hover:bg-[#1f2c73] transition-colors mt-2 cursor-pointer"
              >
                <Plus size={15} />
                <span>{t("addMember") || "Add First Member"}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#283891] font-black text-sm flex items-center justify-center shrink-0">
                        {member.full_name ? member.full_name[0].toUpperCase() : "F"}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                          {member.full_name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-[#283891] border border-indigo-100">
                            {member.relationship_display || member.relationship}
                          </span>
                          {member.blood_group && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Blood: {member.blood_group}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditFamilyModal(member)}
                        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:text-[#283891] hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit profile"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(member)}
                        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete profile"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Demographics */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 font-medium">Age: </span>
                      <strong className="text-slate-800">
                        {member.age ? `${member.age} yrs` : "N/A"}
                      </strong>
                      {member.date_of_birth && (
                        <span className="block text-[11px] text-slate-400 font-mono">
                          DOB: {member.date_of_birth}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Gender: </span>
                      <strong className="text-slate-800">{member.gender}</strong>
                    </div>
                    {member.phone && (
                      <div className="col-span-2 flex items-center gap-1.5 text-slate-600 font-mono pt-1">
                        <Phone size={12} className="text-[#283891]" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  {member.medical_notes && (
                    <div className="text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-600">
                      <span className="font-semibold text-slate-700">Medical Notes: </span>
                      {member.medical_notes}
                    </div>
                  )}

                  {/* Book For This Member CTA */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Link
                      to={`/book?family_member=${member.id}`}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#283891] text-[#283891] hover:bg-indigo-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Calendar size={13} />
                      <span>Book for {member.full_name.split(" ")[0]}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 6. TAB 3: MEDICAL REPORTS ── */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <FolderHeart size={18} className="text-[#283891]" />
                Diagnostic & Medical Reports
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload and access verified diagnostic lab tests, blood work, imaging, and previous prescriptions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleClearSelectedFile();
                setReportModalOpen(true);
              }}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Upload size={15} />
              <span>{t("uploadLabReport") || "Upload Report Document"}</span>
            </button>
          </div>

          {/* Sub-filter: by Family Member */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setReportFilterMember("")}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                !reportFilterMember
                  ? "bg-[#283891] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All Reports ({medicalReports.length})
            </button>
            <button
              type="button"
              onClick={() => setReportFilterMember("self")}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                reportFilterMember === "self"
                  ? "bg-[#283891] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Myself ({medicalReports.filter((r) => !r.family_member).length})
            </button>
            {familyMembers.map((fm) => {
              const count = medicalReports.filter(
                (r) => r.family_member === fm.id || r.family_member?.id === fm.id
              ).length;
              return (
                <button
                  key={fm.id}
                  type="button"
                  onClick={() => setReportFilterMember(fm.id)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                    reportFilterMember === fm.id
                      ? "bg-[#283891] text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {fm.full_name} ({count})
                </button>
              );
            })}
          </div>

          {/* Reports Grid */}
          {loadingReports ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse space-y-3">
                  <div className="h-5 bg-slate-200 rounded-md w-1/3"></div>
                  <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#283891] mx-auto flex items-center justify-center">
                <FolderHeart size={24} />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">
                {t("noReportsFound") || "No Diagnostic Reports Available"}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t("noReportsHint") ||
                  "Upload blood tests, imaging reports, or previous scans to have them handy during doctor consultations."}
              </p>
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2 rounded-xl bg-[#283891] text-white font-bold text-xs shadow-2xs hover:bg-[#1f2c73] transition-colors mt-2 cursor-pointer"
              >
                <Upload size={15} />
                <span>{t("uploadLabReport") || "Upload First Document"}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-[#283891] border border-indigo-100">
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
                      <h4 className="font-extrabold text-slate-900 text-base mt-1.5 leading-snug">
                        {report.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report.id)}
                      className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete report"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Diagnostic Center:</span>
                      <span className="font-bold text-slate-800">
                        {report.diagnostic_center || "Diagnostic Center"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Test Date:</span>
                      <span className="font-medium text-slate-800">{report.test_date}</span>
                    </div>
                    {report.family_member_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Patient:</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {report.family_member_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {report.summary_notes && (
                    <div className="text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-600">
                      <span className="font-semibold text-slate-700">Findings: </span>
                      {report.summary_notes}
                    </div>
                  )}

                  {report.ai_analysis_status === "COMPLETED" && (report.ai_summary_bn || report.ai_summary_en) && (
                    <div className="text-xs bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-xl text-slate-700 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-700">
                        <Sparkles size={12} className="text-indigo-600" />
                        <span>AI সারসংক্ষেপ (Summary):</span>
                      </div>
                      <p className="line-clamp-2 text-slate-600">
                        {language === "bn" ? (report.ai_summary_bn || report.ai_summary_en) : (report.ai_summary_en || report.ai_summary_bn)}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {report.ai_analysis_status === "COMPLETED" ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAIModal(report)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Sparkles size={13} className="text-amber-300" />
                        <span>AI বিশ্লেষণ দেখুন (AI Insights)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAnalyzeReportAI(report)}
                        disabled={analyzingReportId === report.id}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#283891] border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {analyzingReportId === report.id ? (
                          <Loader size={13} className="animate-spin text-[#283891]" />
                        ) : (
                          <Sparkles size={13} className="text-[#283891]" />
                        )}
                        <span>
                          {analyzingReportId === report.id
                            ? "এআই বিশ্লেষণ করছে..."
                            : "এআই দিয়ে রিপোর্ট বিশ্লেষণ"}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleViewMedicalReport(report.id)}
                      disabled={accessingReportId === report.id}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {accessingReportId === report.id ? (
                        <Loader size={13} className="animate-spin text-slate-600" />
                      ) : (
                        <ExternalLink size={13} className="text-slate-500" />
                      )}
                      <span>{t("viewDocument") || "View Document ↗"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: CLINICAL VITALS & TREND ANALYTICS ── */}
      {activeTab === "vitals" && (
        <VitalsTrendDashboard />
      )}

      {/* ── 7. MODALS ── */}

      {/* MODAL 1: PAYMENT MODAL */}
      {paymentModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <CreditCard className="text-[#283891]" size={19} />
                <span>{t("processPayment") || "Process Consultation Payment"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl flex justify-between items-center">
              <div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  {t("amountPayable") || "Amount Payable"}
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                  Dr. {selectedAppointment.doctor?.full_name}
                </div>
                <div className="text-xs text-slate-500">{selectedAppointment.clinic?.name}</div>
              </div>
              <div className="text-2xl font-black text-[#283891]">
                {formatCurrency(selectedAppointment.amount)} BDT
              </div>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  {t("selectPaymentMethod") || "Choose Payment Option"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* OPTION 1: SSLCommerz */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("SSLCOMMERZ")}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      paymentMethod === "SSLCOMMERZ"
                        ? "border-[#283891] bg-indigo-50/40 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <Smartphone className="text-[#283891]" size={16} /> Pay Online
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-[#283891] border border-indigo-200">
                        SSLCommerz
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">bKash, Nagad, Cards</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className="bg-[#E2136E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">bKash</span>
                      <span className="bg-[#F7941D] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Nagad</span>
                      <span className="bg-[#8C3494] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Rocket</span>
                      <span className="bg-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Cards</span>
                    </div>
                  </button>

                  {/* OPTION 2: Cash at Counter */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      paymentMethod === "CASH"
                        ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <Building2 className="text-emerald-700" size={16} /> Cash Counter
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        কাউন্টারে নগদ
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Pay at clinic reception</div>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-2.5 flex items-center gap-1">
                      <Clock size={11} /> Verified upon arrival
                    </div>
                  </button>
                </div>
              </div>

              {paymentMethod === "SSLCOMMERZ" ? (
                <div className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl text-xs space-y-1 text-slate-700">
                  <div className="font-bold text-[#283891] flex items-center gap-1">
                    <ExternalLink size={13} /> Official Payment Gateway Redirect
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    You will be securely redirected to the official <strong>SSLCommerz</strong> gateway to pay via <strong>bKash, Nagad, Rocket</strong>, or <strong>Credit/Debit Card</strong>.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs space-y-1 text-emerald-900">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-700" /> Cash Payment at Reception Counter
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Your appointment remains payment-pending until clinic reception confirms collection of <strong>{formatCurrency(selectedAppointment.amount)} BDT</strong> before your consultation.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className={`flex-1 min-h-[44px] rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors ${
                    paymentMethod === "CASH"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-[#283891] hover:bg-[#1f2c73]"
                  }`}
                >
                  {processingPayment ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : paymentMethod === "CASH" ? (
                    <>
                      <CheckCircle2 size={15} /> Select Cash at Counter
                    </>
                  ) : (
                    <>
                      <ExternalLink size={15} /> Proceed to Gateway ↗
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: OFFICIAL DIGITAL PRESCRIPTION SHEET MODAL */}
      {rxViewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 print-modal-overlay">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 print-modal-content">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 print:hidden">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <FileText className="text-[#283891]" size={19} />
                <span>{t("officialPrescription") || "Official Digital E-Prescription"}</span>
              </h3>
              <div className="flex items-center gap-2">
                {selectedRx && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>{t("printPdf") || "Print / PDF"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRxViewModalOpen(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {loadingRx ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                Loading official prescription details...
              </div>
            ) : selectedRx ? (
              <div
                className="space-y-5 bg-white p-5 sm:p-6 rounded-xl text-slate-800 border border-slate-200 shadow-inner print-document a4-prescription-sheet"
                id="prescription-sheet"
              >
                {/* Doctor & Clinic Header */}
                <div className="flex justify-between items-start border-b-2 border-[#283891]/30 pb-3.5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-[#283891]">
                      Dr. {selectedRx.doctor?.full_name}
                    </h2>
                    <p className="text-xs text-slate-600 font-bold">
                      {selectedRx.doctor?.qualification || "Registered Medical Practitioner"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Exp: {selectedRx.doctor?.experience_years} Years
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs sm:text-sm text-slate-900">
                      {selectedRx.appointment?.clinic?.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedRx.appointment?.clinic?.city}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      Date: {selectedRx.created_at?.split("T")[0]}
                    </div>
                  </div>
                </div>

                {/* Patient Demographics & Vitals Bar */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Patient:
                    </span>
                    <strong className="text-slate-900">
                      {selectedRx.family_member
                        ? selectedRx.family_member.full_name
                        : `${selectedRx.patient?.first_name || ""} ${selectedRx.patient?.last_name || ""}`.trim() ||
                          "Patient"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Serial:
                    </span>
                    <strong className="text-slate-900">
                      #{selectedRx.appointment?.serial_number || 1}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Diagnosis:
                    </span>
                    <strong className="text-[#283891]">{selectedRx.diagnosis}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Vitals (BP):
                    </span>
                    <strong className="text-slate-900 font-mono">
                      {selectedRx.vitals?.bp || "—"}
                    </strong>
                  </div>
                </div>

                {/* Prescribed Medications (Rx Table) */}
                <div className="space-y-2">
                  <h4 className="font-black text-xs text-[#283891] uppercase tracking-wider flex items-center gap-1">
                    {t("prescribedMedicines") || "Rx (Prescribed Medicines)"}
                  </h4>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Medicine</th>
                          <th className="p-2.5">Dose</th>
                          <th className="p-2.5">Timing</th>
                          <th className="p-2.5">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRx.medications?.map((m, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-400">{i + 1}</td>
                            <td className="p-2.5 font-extrabold text-slate-900">
                              {m.medication_name}
                            </td>
                            <td className="p-2.5 font-mono text-[#283891] font-bold">{m.dosage}</td>
                            <td className="p-2.5 text-slate-600">{m.timing}</td>
                            <td className="p-2.5 font-medium text-slate-700">{m.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Diagnostic Tests & Advice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {selectedRx.diagnostic_tests && (
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                      <strong className="text-amber-950 uppercase block mb-1">
                        {t("recommendedTests") || "Recommended Lab Tests:"}
                      </strong>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                        {selectedRx.diagnostic_tests}
                      </p>
                    </div>
                  )}

                  {selectedRx.advice && (
                    <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                      <strong className="text-indigo-950 uppercase block mb-1">
                        {t("doctorAdvice") || "Doctor Advice:"}
                      </strong>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                        {selectedRx.advice}
                      </p>
                    </div>
                  )}
                </div>

                {/* QR Code Verification Footer */}
                <div className="pt-3.5 border-t-2 border-slate-200 flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-emerald-800 font-bold">
                      <CheckCircle2 size={13} /> Official E-Prescription
                    </div>
                    <div className="text-slate-400 font-mono text-[10px]">
                      Token: {selectedRx.qr_token}
                    </div>
                  </div>

                  <Link
                    to={`/verify-prescription/${selectedRx.qr_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-50 hover:bg-emerald-100 p-2 rounded-xl border border-emerald-200 font-mono text-[10px] text-emerald-800 transition flex flex-col items-center gap-0.5"
                    title="Open public verification page for pharmacies"
                  >
                    <div className="font-bold flex items-center gap-1">
                      {t("qrVerified") || "QR VERIFIED"} <ExternalLink size={10} />
                    </div>
                    <div className="text-emerald-700 text-[9px]">
                      {t("scanToVerify") || "Verify Online"}
                    </div>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE THERMAL TOKEN & RECEIPT MODAL */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 print-modal-overlay">
          <div className="bg-white text-slate-900 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 print-modal-content">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 print:hidden">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Printer size={14} /> Confirmed Token Slip
              </span>
              <button
                type="button"
                onClick={() => setReceiptModalData(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center space-y-3 font-mono text-xs bg-slate-50 print-document thermal-token-slip">
              <div className="space-y-0.5 border-b border-slate-200 pb-2">
                <div className="font-black text-sm uppercase tracking-wide">
                  {receiptModalData.clinic?.name || "Smart Clinic"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {receiptModalData.clinic?.address || ""}, {receiptModalData.clinic?.city || "Dhaka"}
                </div>
                <div className="text-[10px] text-slate-500">
                  Phone: {receiptModalData.clinic?.phone || "01700-000000"}
                </div>
              </div>

              <div className="py-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                  PATIENT SERIAL TOKEN
                </div>
                <div className="text-4xl font-black text-emerald-700 my-1">
                  #{receiptModalData.serial_number || 1}
                </div>
                <div className="text-[10px] text-emerald-800 font-bold">
                  Date: {receiptModalData.appointment_date}
                </div>
              </div>

              <div className="text-left space-y-1 bg-white p-3 rounded-xl border border-slate-200 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-bold text-slate-900">
                    {receiptModalData.family_member?.full_name ||
                      `${receiptModalData.patient?.first_name || ""} ${receiptModalData.patient?.last_name || ""}`.trim() ||
                      "Self"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Doctor:</span>
                  <span className="font-bold text-slate-900">{formatDoctorName(receiptModalData.doctor?.full_name)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Consultation Fee:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(receiptModalData.amount)} BDT (CONFIRMED)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scheduled Time:</span>
                  <span className="font-bold text-slate-900">
                    {formatTime(receiptModalData.appointment_time)}
                  </span>
                </div>
              </div>

              {/* Scannable Live Queue QR */}
              <div className="pt-2 border-t border-slate-200 flex flex-col items-center justify-center space-y-1">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                    `${window.location.origin}/track-queue/${receiptModalData.id}`
                  )}`}
                  alt="Track Queue QR"
                  className="w-22 h-22 border border-slate-300 rounded-lg p-1 bg-white"
                />
                <span className="text-[10px] font-bold text-emerald-800 tracking-tight">
                  Scan QR with Phone to Track Live Queue
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  smartclinic.bd/track/{receiptModalData.id.slice(0, 8)}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                Please be present in clinic lobby before your serial is called.
              </div>
            </div>

            <div className="flex gap-2 print:hidden">
              <Link
                to={`/track-queue/${receiptModalData.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[40px] rounded-xl border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-1"
              >
                Track Live
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 min-h-[40px] rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Printer size={14} /> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD / EDIT FAMILY MEMBER MODAL */}
      {familyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <Users className="text-[#283891]" size={19} />
                <span>
                  {editingFamilyMember
                    ? t("editMember") || "Edit Family Member"
                    : t("addFamilyMember") || "Add Family Member"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setFamilyModalOpen(false);
                  setEditingFamilyMember(null);
                }}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFamilyMember} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t("fullName") || "Full Name"} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Md. Abdul Karim"
                  value={familyFormData.full_name}
                  onChange={(e) =>
                    setFamilyFormData({ ...familyFormData, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t("relationship") || "Relationship"} *
                  </label>
                  <select
                    value={familyFormData.relationship}
                    onChange={(e) =>
                      setFamilyFormData({ ...familyFormData, relationship: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891]"
                  >
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="SPOUSE">Spouse</option>
                    <option value="CHILD">Child</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t("phone") || "Phone Number (BD)"}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="01712345678"
                    maxLength={11}
                    value={familyFormData.phone}
                    onChange={(e) =>
                      setFamilyFormData({
                        ...familyFormData,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 11),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-[#283891]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    11-digit BD mobile (e.g. 01712345678)
                  </span>
                </div>
              </div>

              {/* Day / Month / Year Dropdown DOB Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{t("dateOfBirth") || "Date of Birth (Day / Month / Year)"}</span>
                  {familyFormData.age ? (
                    <span className="text-[11px] font-bold text-[#283891] bg-indigo-50 px-2 py-0.5 rounded-md">
                      Calculated: {familyFormData.age} yrs
                    </span>
                  ) : null}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={dobDay || ""}
                    onChange={(e) => handleDobChange("day", e.target.value)}
                    className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-[#283891]"
                  >
                    <option value="">Day</option>
                    {DOB_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    value={dobMonth || ""}
                    onChange={(e) => handleDobChange("month", e.target.value)}
                    className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-[#283891]"
                  >
                    <option value="">Month</option>
                    {DOB_MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={dobYear || ""}
                    onChange={(e) => handleDobChange("year", e.target.value)}
                    className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-[#283891]"
                  >
                    <option value="">Year</option>
                    {DOB_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t("gender") || "Gender"}
                  </label>
                  <select
                    value={familyFormData.gender}
                    onChange={(e) =>
                      setFamilyFormData({ ...familyFormData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891]"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t("bloodGroup") || "Blood Group"}
                  </label>
                  <select
                    value={familyFormData.blood_group}
                    onChange={(e) =>
                      setFamilyFormData({ ...familyFormData, blood_group: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891]"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t("medicalNotes") || "Medical Notes / History"}
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Diabetes Type-2, High Blood Pressure"
                  value={familyFormData.medical_notes}
                  onChange={(e) =>
                    setFamilyFormData({ ...familyFormData, medical_notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891]"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setFamilyModalOpen(false);
                    setEditingFamilyMember(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingFamily}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white font-bold text-xs shadow-2xs transition-colors"
                >
                  {submittingFamily
                    ? t("saving") || "Saving..."
                    : editingFamilyMember
                    ? t("updateMember") || "Update Profile"
                    : t("saveMember") || "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE FAMILY MEMBER CONFIRMATION */}
      {deleteConfirmModalOpen && memberToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  {t("deleteMember") || "Delete Member Profile"}
                </h4>
                <p className="text-xs text-slate-500">
                  {memberToDelete.full_name} ({memberToDelete.relationship_display || memberToDelete.relationship})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t("confirmDeleteMember") ||
                "Are you sure you want to remove this family member from your profile? Past appointments will remain preserved."}
            </p>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmModalOpen(false);
                  setMemberToDelete(null);
                }}
                disabled={deletingFamily}
                className="flex-1 min-h-[40px] rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingFamily}
                className="flex-1 min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                {deletingFamily ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>{t("deleteMember") || "Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: UPLOAD MEDICAL REPORT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <FolderHeart className="text-[#283891]" size={19} />
                <span>{t("uploadLabReport") || "Upload Diagnostic Report"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadReport} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Report Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Blood Count (CBC) with ESR"
                  value={reportFormData.title}
                  onChange={(e) =>
                    setReportFormData({ ...reportFormData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t("testCategory") || "Test Category"} *
                  </label>
                  <select
                    value={reportFormData.report_type}
                    onChange={(e) =>
                      setReportFormData({ ...reportFormData, report_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-[#283891]"
                  >
                    <option value="BLOOD_TEST">Blood Test (CBC, Glucose, Lipid)</option>
                    <option value="IMAGING">Imaging (USG, X-Ray, MRI, CT)</option>
                    <option value="CARDIOLOGY">Cardiology (ECG, Echo)</option>
                    <option value="PATHOLOGY">Pathology & Biopsy</option>
                    <option value="PRESCRIPTION_SCAN">Previous Prescription Scan</option>
                    <option value="OTHER">Other Diagnostic Report</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    For Patient / Member
                  </label>
                  <select
                    value={reportFormData.family_member_id}
                    onChange={(e) =>
                      setReportFormData({ ...reportFormData, family_member_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-[#283891]"
                  >
                    <option value="">Myself (Account Holder)</option>
                    {familyMembers.map((fm) => (
                      <option key={fm.id} value={fm.id}>
                        {fm.full_name} ({fm.relationship_display || fm.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t("diagnosticCenter") || "Diagnostic Center"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Popular Diagnostic Center"
                    value={reportFormData.diagnostic_center}
                    onChange={(e) =>
                      setReportFormData({ ...reportFormData, diagnostic_center: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t("testDate") || "Test Date"} *
                  </label>
                  <input
                    type="date"
                    required
                    value={reportFormData.test_date}
                    onChange={(e) =>
                      setReportFormData({ ...reportFormData, test_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891]"
                  />
                </div>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>Physical Report Document (PDF, JPG, PNG) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Max 10MB</span>
                </label>

                <input
                  type="file"
                  ref={reportFileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="hidden"
                  id="patient-report-file-input"
                />

                {!selectedReportFile ? (
                  <label
                    htmlFor="patient-report-file-input"
                    className="border-2 border-dashed border-slate-200 hover:border-[#283891]/60 bg-slate-50 hover:bg-indigo-50/20 transition-all rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer space-y-1.5 group"
                  >
                    <div className="p-2.5 bg-indigo-50 group-hover:bg-indigo-100 text-[#283891] rounded-full transition-colors">
                      <Upload size={20} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#283891] transition-colors">
                        Click to select document from your device
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PDF, JPG, or PNG up to 10MB
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-indigo-100 text-[#283891] rounded-lg shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {selectedReportFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {(selectedReportFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {fileError && (
                  <p className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle size={13} /> {fileError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t("summaryFindings") || "Summary Findings"}
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. HbA1c: 7.2%, Fasting Glucose: 6.8 mmol/L, Total Cholesterol: 210 mg/dL"
                  value={reportFormData.summary_notes}
                  onChange={(e) =>
                    setReportFormData({ ...reportFormData, summary_notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-[#283891]"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleClearSelectedFile();
                    setReportModalOpen(false);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || !selectedReportFile}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#283891] hover:bg-[#1f2c73] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  {submittingReport ? (
                    <>
                      <Loader size={14} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    "Save Document"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: REVIEW / RATING MODAL */}
      {reviewModalOpen && reviewAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <Star className="text-amber-500 fill-amber-500" size={19} />
                <span>
                  {existingReviews[reviewAppointment.id]
                    ? "Update Your Doctor Review"
                    : "Leave a Doctor Review"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-3">
              <div className="bg-indigo-50 text-[#283891] p-2 rounded-lg">
                <Stethoscope size={18} />
              </div>
              <div>
                <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                  Dr. {reviewAppointment.doctor?.full_name}
                </div>
                <div className="text-xs text-slate-500">
                  {reviewAppointment.clinic?.name} • {reviewAppointment.appointment_date}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Your Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-115 cursor-pointer"
                    >
                      <Star
                        size={28}
                        className={
                          star <= reviewRating
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-200"
                        }
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-black text-amber-600 text-base">
                    {reviewRating}/5
                  </span>
                  <span className="text-xs text-slate-400 ml-1">
                    {reviewRating === 5
                      ? "Excellent! 🌟"
                      : reviewRating === 4
                      ? "Very Good 👍"
                      : reviewRating === 3
                      ? "Average 😐"
                      : reviewRating === 2
                      ? "Poor 😕"
                      : "Very Poor 😞"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Your Comments (Optional)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Describe your consultation experience — doctor attentiveness, diagnosis, advice clarity, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-[#283891] resize-none"
                  maxLength={500}
                />
                <div className="text-[10px] text-slate-400 text-right">
                  {reviewComment.length}/500
                </div>
              </div>

              {existingReviews[reviewAppointment.id] && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center gap-2">
                  <ThumbsUp size={14} className="text-amber-600 shrink-0" />
                  <span>
                    You already reviewed this appointment. Submitting again will update your feedback.
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  {submittingReview ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Send size={15} />
                  )}
                  <span>{submittingReview ? "Submitting..." : "Submit Review"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: MEDICAL REPORT AI ANALYZER MODAL */}
      <MedicalReportAIModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        report={selectedReportForAI}
      />
    </div>
  );
}
