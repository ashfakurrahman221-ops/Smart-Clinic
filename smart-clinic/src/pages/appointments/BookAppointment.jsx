import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import apiClient from "../../api/axios";
import {
  CalendarCheck, Building2, Stethoscope, Clock, FileText,
  CheckCircle2, AlertCircle, ArrowLeft, Navigation, Loader2,
  ChevronRight, MapPin, Users, Heart, Calendar,
  Smartphone, CreditCard, ShieldCheck, User, ArrowRight,
  Sparkles, Check, Info, ChevronLeft, Sun, Sunset, Moon, Star, Search
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { formatTime, formatCurrency } from "../../utils/formatters";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES_BN = ["সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার", "রবিবার"];
const DAY_SHORT_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_SHORT_BN = ["সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি", "রবি"];
const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_SHORT_BN = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

const formatDocName = (name) => {
  if (!name) return "";
  const cleaned = String(name).trim();
  return /^dr\.?\s/i.test(cleaned) ? cleaned : `Dr. ${cleaned}`;
};

// Searchable clinic combobox component
function ClinicSearchSelect({ clinics, value, onChange, language }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = clinics.find((c) => c.id === value);

  const filtered = query.trim()
    ? clinics.filter((c) => {
        const q = query.toLowerCase();
        return (
          (c.name || "").toLowerCase().includes(q) ||
          (c.city || "").toLowerCase().includes(q) ||
          (c.address || "").toLowerCase().includes(q)
        );
      })
    : clinics;

  const handleSelect = (clinic) => {
    onChange(clinic.id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  };

  const displayValue = open
    ? query
    : selected
    ? `${selected.name} (${selected.city})`
    : query;

  return (
    <div className="space-y-1.5 relative">
      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
        <Building2 size={15} className="text-emerald-700" />
        <span>{language === "bn" ? "ক্লিনিক শাখা *" : "Clinic Branch *"}</span>
      </label>

      {/* Input box */}
      <div className="relative">
        <input
          type="text"
          placeholder={
            selected
              ? `${selected.name} (${selected.city})`
              : language === "bn"
              ? "ক্লিনিকের নাম লিখুন বা বেছে নিন..."
              : "Search clinic by name or city..."
          }
          value={displayValue}
          onFocus={() => {
            setOpen(true);
            if (!query && selected) setQuery("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          className={`w-full h-11 pl-3.5 pr-9 rounded-xl border text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 transition-all ${
            selected
              ? "border-emerald-500 bg-emerald-50 focus:ring-emerald-100 placeholder:text-emerald-700"
              : "border-slate-200 bg-white focus:border-emerald-600 focus:ring-emerald-100 placeholder:text-slate-400"
          }`}
        />
        {selected ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors text-sm font-bold"
          >✕</button>
        ) : (
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
      </div>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400 text-center">
              {language === "bn" ? "কোনো ক্লিনিক পাওয়া যায়নি" : "No clinics found"}
            </div>
          ) : (
            filtered.map((clinic) => (
              <button
                key={clinic.id}
                type="button"
                onMouseDown={() => handleSelect(clinic)}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between gap-2 ${
                  value === clinic.id ? "bg-emerald-50 text-emerald-700" : "text-slate-700"
                }`}
              >
                <span>{clinic.name}</span>
                <span className="text-[10px] font-normal text-slate-400 shrink-0">{clinic.city}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}



export default function BookAppointment() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const preselectedClinic = searchParams.get("clinic") || "";
  const preselectedDoctor = searchParams.get("doctor") || "";
  const preselectedFamilyMember = searchParams.get("family_member") || "";

  // Step indicator: 1 = Clinic & Doctor, 2 = Schedule & Slot, 3 = Patient & Symptoms, 4 = Review & Pay
  const [currentStep, setCurrentStep] = useState(
    preselectedClinic && preselectedDoctor ? 2 : 1
  );

  const [clinics, setClinics] = useState([]);
  const [nearbyClinics, setNearbyClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);

  const [formData, setFormData] = useState({
    clinic_id: preselectedClinic,
    doctor_id: preselectedDoctor,
    family_member_id: preselectedFamilyMember,
    appointment_date: new Date().toISOString().split("T")[0],
    appointment_time: "",
    problem_description: "",
  });

  const [selectedDoctorObj, setSelectedDoctorObj] = useState(null);
  const [consultationFee, setConsultationFee] = useState(null);

  // Smart Availability & 7-Day Strip State
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [stripStartIndex, setStripStartIndex] = useState(0);
  const [autoSelectedPairKey, setAutoSelectedPairKey] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [geoError, setGeoError] = useState("");
  const [paymentPreference, setPaymentPreference] = useState("ONLINE"); // "ONLINE" | "CASH"

  // Fetch clinics and family members on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const clinicsRes = await apiClient.get("/clinics/?all=true");
        setClinics(clinicsRes.results || clinicsRes || []);

        const familyRes = await apiClient.get("/accounts/family-members/");
        setFamilyMembers(familyRes.results || familyRes || []);
      } catch {
        setError(language === "bn" ? "তথ্য লোড করা যায়নি।" : "Failed to load initial data.");
      }
    };
    fetchInitialData();
  }, [language]);

  // Geolocation for nearby clinics
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await apiClient.get(
            `/clinics/nearby/?lat=${latitude}&lng=${longitude}&radius=50`
          );
          setNearbyClinics(res || []);
        } catch {
          // Silently fail
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setGeoError(
          language === "bn"
            ? "লোকেশন অনুমতি পাওয়া যায়নি। নিচের সব ক্লিনিক থেকে বেছে নিন।"
            : "Location permission denied. Showing all clinics below."
        );
      },
      { timeout: 8000 }
    );
  }, [language]);

  // Fetch doctors when clinic changes
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!formData.clinic_id) {
        try {
          const res = await apiClient.get("/doctors/");
          setDoctors(res.results || res || []);
        } catch {}
        return;
      }
      setLoading(true);
      try {
        const res = await apiClient.get(`/doctors/?clinic_id=${formData.clinic_id}`);
        setDoctors(res.results || res || []);
      } catch {
        setError(
          language === "bn"
            ? "নির্বাচিত ক্লিনিকের জন্য ডাক্তার লোড করা যায়নি।"
            : "Failed to load doctors for selected clinic."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [formData.clinic_id, language]);

  // Update consultation fee when doctor changes
  useEffect(() => {
    if (formData.doctor_id && doctors.length > 0) {
      const doc = doctors.find((d) => d.id === formData.doctor_id);
      setSelectedDoctorObj(doc || null);
      if (doc?.doctor_clinics) {
        const mapping = doc.doctor_clinics.find(
          (dc) => dc.clinic?.id === formData.clinic_id || dc.clinic_id === formData.clinic_id
        );
        setConsultationFee(mapping?.consultation_fee ?? (doc.doctor_clinics[0]?.consultation_fee ?? null));
      }
    } else {
      setSelectedDoctorObj(null);
      setConsultationFee(null);
    }
  }, [formData.doctor_id, formData.clinic_id, doctors]);

  // Fetch Doctor Availability & Time Slots + Auto-select First Open Date
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!formData.doctor_id || !formData.clinic_id || !formData.appointment_date) {
        setAvailability(null);
        return;
      }
      setLoadingAvailability(true);
      try {
        const res = await apiClient.get(
          `/doctors/availability/?doctor_id=${formData.doctor_id}&clinic_id=${formData.clinic_id}&date=${formData.appointment_date}`
        );
        setAvailability(res);

        const pairKey = `${formData.clinic_id}:${formData.doctor_id}`;
        const hasOpenSlotToday = res?.slots?.some((s) => s.available);

        // Auto-jump to next_available_date on initial selection if current date is closed/full
        if (
          pairKey !== autoSelectedPairKey &&
          !hasOpenSlotToday &&
          res?.next_available_date &&
          res.next_available_date !== formData.appointment_date
        ) {
          setAutoSelectedPairKey(pairKey);
          const idx = (res.upcoming_days || []).findIndex((d) => d.date === res.next_available_date);
          if (idx >= 0) {
            setStripStartIndex(Math.floor(idx / 7) * 7);
          }
          setFormData((prev) => ({
            ...prev,
            appointment_date: res.next_available_date,
            appointment_time: "",
          }));
          return;
        }

        if (pairKey !== autoSelectedPairKey) {
          setAutoSelectedPairKey(pairKey);
        }

        // Preselect first available slot on the active date
        if (res?.slots?.length > 0) {
          const firstAvailable = res.slots.find((s) => s.available);
          if (firstAvailable) {
            setFormData((prev) => ({
              ...prev,
              appointment_time:
                prev.appointment_time && res.slots.some((s) => s.time === prev.appointment_time && s.available)
                  ? prev.appointment_time
                  : firstAvailable.time,
            }));
          } else {
            setFormData((prev) => ({ ...prev, appointment_time: "" }));
          }
        } else {
          setFormData((prev) => ({ ...prev, appointment_time: "" }));
        }
      } catch {
        setAvailability(null);
      } finally {
        setLoadingAvailability(false);
      }
    };
    fetchAvailability();
  }, [formData.doctor_id, formData.clinic_id, formData.appointment_date, autoSelectedPairKey]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const selectNearbyClinic = (clinicId) => {
    setStripStartIndex(0);
    setAutoSelectedPairKey("");
    setFormData({ ...formData, clinic_id: clinicId, doctor_id: "", appointment_time: "" });
  };

  // Derive selectable chamber shift ranges (Morning, Afternoon, Evening)
  const sessionRanges = useMemo(() => {
    if (availability?.sessions?.length > 0) {
      return availability.sessions.map((s) => ({
        ...s,
        displayName: language === "bn" ? s.name_bn || s.name : s.name,
      }));
    }
    const slots = availability?.slots || [];
    if (!slots.length) return [];

    const morning = slots.filter((s) => parseInt(s.time.split(":")[0], 10) < 12);
    const afternoon = slots.filter((s) => {
      const h = parseInt(s.time.split(":")[0], 10);
      return h >= 12 && h < 17;
    });
    const evening = slots.filter((s) => parseInt(s.time.split(":")[0], 10) >= 17);

    const list = [];
    if (morning.length > 0) {
      list.push({
        id: "morning",
        name: "Morning Shift",
        displayName: language === "bn" ? "সকালের শিফট" : "Morning Shift",
        start_time: morning[0].time,
        end_time: morning[morning.length - 1].time,
        total_slots: morning.length,
        available_count: morning.filter((s) => s.available).length,
        first_available_time: morning.find((s) => s.available)?.time || null,
      });
    }
    if (afternoon.length > 0) {
      list.push({
        id: "afternoon",
        name: "Afternoon Shift",
        displayName: language === "bn" ? "দুপুরের শিফট" : "Afternoon Shift",
        start_time: afternoon[0].time,
        end_time: afternoon[afternoon.length - 1].time,
        total_slots: afternoon.length,
        available_count: afternoon.filter((s) => s.available).length,
        first_available_time: afternoon.find((s) => s.available)?.time || null,
      });
    }
    if (evening.length > 0) {
      list.push({
        id: "evening",
        name: "Evening Shift",
        displayName: language === "bn" ? "সন্ধ্যার শিফট" : "Evening Shift",
        start_time: evening[0].time,
        end_time: evening[evening.length - 1].time,
        total_slots: evening.length,
        available_count: evening.filter((s) => s.available).length,
        first_available_time: evening.find((s) => s.available)?.time || null,
      });
    }
    return list;
  }, [availability, language]);

  const [selectedSessionId, setSelectedSessionId] = useState("");

  const predictedSerial = useMemo(() => {
    return availability?.next_serial || (availability?.booked_count ? availability.booked_count + 1 : 1);
  }, [availability]);

  // Automatically select shift and auto-assign next available serial slot
  useEffect(() => {
    if (!sessionRanges.length) {
      setSelectedSessionId("");
      return;
    }

    let active = null;
    if (formData.appointment_time) {
      const h = parseInt(formData.appointment_time.split(":")[0], 10);
      active = sessionRanges.find((s) => {
        if (s.id === "morning") return h < 12;
        if (s.id === "afternoon") return h >= 12 && h < 17;
        if (s.id === "evening") return h >= 17;
        return false;
      });
    }

    if (!active) {
      active = sessionRanges.find((s) => s.available_count > 0) || sessionRanges[0];
    }

    if (active) {
      setSelectedSessionId(active.id);
      if (active.first_available_time && (!formData.appointment_time || !availability?.slots?.some((s) => s.time === formData.appointment_time && s.available))) {
        setFormData((prev) => ({
          ...prev,
          appointment_time: active.first_available_time,
        }));
      }
    }
  }, [sessionRanges, availability, formData.appointment_time]);

  const handleSelectSession = (session) => {
    setSelectedSessionId(session.id);
    if (session.first_available_time) {
      setFormData((prev) => ({
        ...prev,
        appointment_time: session.first_available_time,
      }));
    }
    setError("");
  };

  const selectedSessionObj = useMemo(() => {
    return sessionRanges.find((s) => s.id === selectedSessionId) || sessionRanges[0] || null;
  }, [sessionRanges, selectedSessionId]);

  // Validation before advancing to next step
  const handleNextStep = () => {
    setError("");
    if (currentStep === 1) {
      if (!formData.clinic_id) {
        setError(language === "bn" ? "অনুগ্রহ করে একটি ক্লিনিক নির্বাচন করুন।" : "Please select a clinic to proceed.");
        return;
      }
      if (!formData.doctor_id) {
        setError(language === "bn" ? "অনুগ্রহ করে একজন ডাক্তার নির্বাচন করুন।" : "Please select a doctor to proceed.");
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2) {
      if (!formData.appointment_date) {
        setError(language === "bn" ? "অনুগ্রহ করে অ্যাপয়েন্টমেন্টের তারিখ নির্বাচন করুন।" : "Please select an appointment date.");
        return;
      }
      if (!formData.appointment_time) {
        setError(language === "bn" ? "অনুগ্রহ করে একটি সময় বা স্লট নির্বাচন করুন।" : "Please select an available chamber time slot.");
        return;
      }
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 3) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.clinic_id || !formData.doctor_id || !formData.appointment_date || !formData.appointment_time) {
      return setError(
        language === "bn"
          ? "অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন এবং সময় স্লট বেছে নিন।"
          : "Please complete all required fields and select an available time slot."
      );
    }
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const aptRes = await apiClient.post("/appointments/", {
        clinic_id: formData.clinic_id,
        doctor_id: formData.doctor_id,
        family_member_id: formData.family_member_id || null,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        problem_description: formData.problem_description,
      });

      if (paymentPreference === "ONLINE") {
        setSuccess(
          language === "bn"
            ? "অ্যাপয়েন্টমেন্ট তৈরি হয়েছে! নিরাপদ SSLCommerz গেটওয়েতে পাঠানো হচ্ছে..."
            : "Appointment booked! Redirecting to secure SSLCommerz Gateway..."
        );
        try {
          const res = await apiClient.post("/payments/initiate-sslcommerz/", {
            appointment_id: aptRes.id,
          });
          if (res?.redirect_url) {
            window.location.href = res.redirect_url;
            return;
          } else {
            navigate(`/dashboard?payment=pending&apt_id=${aptRes.id}`);
          }
        } catch {
          // Fallback directly to dashboard if payment initiation had a glitch
          navigate(`/dashboard?payment=pending&apt_id=${aptRes.id}`);
        }
      } else {
        // Cash at Clinic Counter payment
        try {
          await apiClient.post("/payments/", {
            appointment_id: aptRes.id,
            payment_method: "CASH",
          });
        } catch {}

        setSuccess(
          language === "bn"
            ? "অ্যাপয়েন্টমেন্ট সফলভাবে সম্পন্ন হয়েছে। কাউন্টারে নগদ পরিশোধ করুন।"
            : "Appointment booked successfully. Payment pending — pay at clinic counter."
        );
        setTimeout(() => {
          navigate(`/dashboard?booking=success&apt_id=${aptRes.id}`);
        }, 1200);
      }
    } catch (err) {
      if (typeof err === "object") {
        setError(Object.values(err).flat().join(" ") || "Failed to book appointment.");
      } else {
        setError(err || "Failed to book appointment. Check slot availability.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Combine all clinics with any nearby clinics to guarantee selection & search match
  const allClinicsList = useMemo(() => {
    const map = new Map();
    (Array.isArray(clinics) ? clinics : []).forEach((c) => {
      if (c?.id) map.set(c.id, c);
    });
    (Array.isArray(nearbyClinics) ? nearbyClinics : []).forEach((c) => {
      if (c?.id && !map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [clinics, nearbyClinics]);

  const selectedClinicObj = useMemo(
    () => allClinicsList.find((c) => c.id === formData.clinic_id),
    [allClinicsList, formData.clinic_id]
  );

  const selectedFamilyMemberObj = useMemo(
    () => familyMembers.find((f) => f.id === formData.family_member_id),
    [familyMembers, formData.family_member_id]
  );

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  handlePrevStep();
                } else if (window.history.length > 2) {
                  navigate(-1);
                } else {
                  navigate("/dashboard");
                }
              }}
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft size={16} />
              <span>{language === "bn" ? "ফিরে যান" : "Back"}</span>
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                {t("bookAppointment") || (language === "bn" ? "অ্যাপয়েন্টমেন্ট বুকিং" : "Book Appointment")}
              </h1>
              <p className="text-xs text-slate-500">
                {language === "bn" ? "ডাক্তার ও চেম্বার স্লট নির্বাচন করুন" : "Select clinic, doctor, chamber slot & payment preference"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {language === "bn" ? "ড্যাশবোর্ড" : "Dashboard"}
            </Link>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>{language === "bn" ? "অফিসিয়াল পোর্টাল" : "Verified Booking"}</span>
            </div>
          </div>
        </div>

        {/* 4-Step Interactive Progress Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="grid grid-cols-4 gap-2 text-center">
            
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`p-2 rounded-xl transition-all text-left flex items-center gap-2 ${
                currentStep === 1
                  ? "bg-emerald-50 border border-emerald-300 shadow-2xs"
                  : currentStep > 1
                  ? "bg-slate-50 border border-slate-200 hover:bg-slate-100"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                currentStep > 1 ? "bg-emerald-600 text-white" : currentStep === 1 ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {currentStep > 1 ? <Check size={14} /> : "1"}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "bn" ? "ধাপ ১" : "Step 1"}
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {language === "bn" ? "ডাক্তার" : "Doctor"}
                </div>
              </div>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              disabled={!formData.doctor_id || !formData.clinic_id}
              onClick={() => setCurrentStep(2)}
              className={`p-2 rounded-xl transition-all text-left flex items-center gap-2 ${
                currentStep === 2
                  ? "bg-emerald-50 border border-emerald-300 shadow-2xs"
                  : currentStep > 2
                  ? "bg-slate-50 border border-slate-200 hover:bg-slate-100"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                currentStep > 2 ? "bg-emerald-600 text-white" : currentStep === 2 ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {currentStep > 2 ? <Check size={14} /> : "2"}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "bn" ? "ধাপ ২" : "Step 2"}
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {language === "bn" ? "তারিখ ও সময়" : "Schedule"}
                </div>
              </div>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              disabled={!formData.appointment_time}
              onClick={() => setCurrentStep(3)}
              className={`p-2 rounded-xl transition-all text-left flex items-center gap-2 ${
                currentStep === 3
                  ? "bg-emerald-50 border border-emerald-300 shadow-2xs"
                  : currentStep > 3
                  ? "bg-slate-50 border border-slate-200 hover:bg-slate-100"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                currentStep > 3 ? "bg-emerald-600 text-white" : currentStep === 3 ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {currentStep > 3 ? <Check size={14} /> : "3"}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "bn" ? "ধাপ ৩" : "Step 3"}
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {language === "bn" ? "রোগী ও কারণ" : "Patient"}
                </div>
              </div>
            </button>

            {/* Step 4 */}
            <button
              type="button"
              disabled={!formData.appointment_time}
              onClick={() => setCurrentStep(4)}
              className={`p-2 rounded-xl transition-all text-left flex items-center gap-2 ${
                currentStep === 4
                  ? "bg-emerald-50 border border-emerald-300 shadow-2xs"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                currentStep === 4 ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                4
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  {language === "bn" ? "ধাপ ৪" : "Step 4"}
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {language === "bn" ? "পর্যালোচনা ও ফি" : "Review & Pay"}
                </div>
              </div>
            </button>

          </div>
        </div>

        {/* Alerts & Messages */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        {/* STEP 1: CLINIC & DOCTOR SELECTION */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {language === "bn" ? "১. ক্লিনিক ও ডাক্তার নির্বাচন" : "1. Select Clinic & Doctor"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === "bn" ? "নিকটবর্তী ক্লিনিক বা ডাক্তারদের তালিকা থেকে পছন্দ করুন" : "Choose a certified clinic location and registered specialist"}
              </p>
            </div>

            {/* Nearby Clinics Section if available */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Navigation size={15} className="text-emerald-600" />
                  <span>{language === "bn" ? "নিকটবর্তী ক্লিনিক" : "Clinics Near You"}</span>
                </label>
                {geoLoading && (
                  <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                    <Loader2 size={13} className="animate-spin" /> {language === "bn" ? "খোঁজা হচ্ছে..." : "Locating..."}
                  </span>
                )}
              </div>

              {geoError && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 flex items-center gap-2">
                  <Info size={14} className="text-amber-600 shrink-0" />
                  <span>{geoError}</span>
                </div>
              )}

              {nearbyClinics.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {nearbyClinics.map((clinic) => {
                    const isSelected = formData.clinic_id === clinic.id;
                    return (
                      <button
                        key={clinic.id}
                        type="button"
                        onClick={() => selectNearbyClinic(clinic.id)}
                        className={`text-left p-3.5 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/60 shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug">
                            {clinic.name}
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                            {clinic.distance_km} km
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                          <MapPin size={12} className="text-slate-400" /> {clinic.city}
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-700 font-bold">
                            <CheckCircle2 size={13} /> {language === "bn" ? "নির্বাচিত" : "Selected"}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              
              {/* Clinic Searchable Dropdown */}
              <ClinicSearchSelect
                clinics={allClinicsList}
                value={formData.clinic_id}
                language={language}
                onChange={(clinicId) => {
                  setStripStartIndex(0);
                  setAutoSelectedPairKey("");
                  setFormData({ ...formData, clinic_id: clinicId, doctor_id: "", appointment_time: "" });
                }}
              />

              {/* Doctor Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between uppercase tracking-wide">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope size={15} className="text-emerald-700" />
                    <span>{language === "bn" ? "বিশেষজ্ঞ ডাক্তার *" : "Specialist Doctor *"}</span>
                  </span>
                  {loading && (
                    <span className="text-xs text-emerald-700 font-normal flex items-center gap-1 lowercase">
                      <Loader2 size={12} className="animate-spin" /> {language === "bn" ? "লোড হচ্ছে..." : "loading..."}
                    </span>
                  )}
                </label>
                <select
                  name="doctor_id"
                  required
                  disabled={loading || !formData.clinic_id}
                  value={formData.doctor_id}
                  onChange={(e) => {
                    setStripStartIndex(0);
                    setAutoSelectedPairKey("");
                    setFormData({ ...formData, doctor_id: e.target.value, appointment_time: "" });
                    setError("");
                  }}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                >
                  <option value="">
                    {!formData.clinic_id
                      ? language === "bn"
                        ? "-- প্রথমে ক্লিনিক নির্বাচন করুন --"
                        : "-- Select a Clinic First --"
                      : language === "bn"
                      ? "-- ডাক্তার নির্বাচন করুন --"
                      : "-- Choose a Doctor --"}
                  </option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {formatDocName(doctor.full_name)} ({doctor.qualification || "Specialist"})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Selected Doctor Highlight Card with Weekly Routine Preview */}
            {selectedDoctorObj && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center shrink-0 shadow-2xs">
                      {selectedDoctorObj.avatar_url ? (
                        <img src={selectedDoctorObj.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                      ) : (
                        selectedDoctorObj.full_name?.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {formatDocName(selectedDoctorObj.full_name)}
                        </h3>
                        {selectedDoctorObj.average_rating ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                            <Star size={11} className="fill-amber-500 text-amber-500" />
                            <span>{selectedDoctorObj.average_rating}</span>
                            <span className="text-amber-600">({selectedDoctorObj.review_count})</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {selectedDoctorObj.qualification || "Medical Specialist"} · {selectedDoctorObj.specializations?.map(s => s.name).join(", ") || "General Practice"}
                      </div>
                      {selectedDoctorObj.experience_years ? (
                        <div className="text-[11px] text-slate-500 mt-1">
                          {selectedDoctorObj.experience_years} {language === "bn" ? "বছরের অভিজ্ঞতা" : "years clinical experience"}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {consultationFee && (
                    <div className="sm:text-right shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {language === "bn" ? "পরামর্শ ফি" : "Consultation Fee"}
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-700">
                        ৳{consultationFee} <span className="text-xs font-bold text-slate-500">BDT</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 1 Weekly Routine Preview Strip */}
                {availability?.weekly_schedules?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-700 flex items-center gap-1 mr-1">
                        <Calendar size={14} className="text-emerald-700" />
                        {language === "bn" ? "চেম্বার দিনসমূহ:" : "Chamber Days:"}
                      </span>
                      {availability.weekly_schedules.map((ws) => (
                        <span
                          key={ws.id || ws.day_of_week}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-[11px]"
                        >
                          <span>{language === "bn" ? DAY_NAMES_BN[ws.day_of_week] : DAY_NAMES[ws.day_of_week]}</span>
                          <span className="text-emerald-600 font-medium">
                            ({formatTime(ws.start_time)}–{formatTime(ws.end_time)})
                          </span>
                        </span>
                      ))}
                    </div>
                    {availability?.next_available_date && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px]">
                        <CheckCircle2 size={12} />
                        {language === "bn"
                          ? `পরবর্তী খালি তারিখ: ${availability.next_available_date}`
                          : `Next Open: ${availability.next_available_date}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 1 Actions */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!formData.clinic_id || !formData.doctor_id}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs sm:text-sm shadow-2xs flex items-center justify-center gap-2 transition-all"
              >
                <span>{language === "bn" ? "পরবর্তী: চেম্বার তারিখ ও শিফট" : "Next: Chamber Date & Shift"}</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: DATE & SMART CHAMBER TIME SLOTS */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {language === "bn" ? "২. চেম্বার তারিখ ও শিফট নির্বাচন" : "2. Select Chamber Date & Shift"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDocName(selectedDoctorObj?.full_name)} · {selectedClinicObj?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                {language === "bn" ? "ডাক্তার পরিবর্তন" : "Change Doctor"}
              </button>
            </div>

            {/* 1. Prominent Weekly Routine Banner */}
            {availability?.weekly_schedules?.length > 0 ? (
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                    <Calendar size={16} className="text-emerald-700 shrink-0" />
                    <span>{language === "bn" ? "সাপ্তাহিক চেম্বার রুটিন" : "Weekly Chamber Routine"}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {language === "bn" ? "বাকি দিনগুলোতে চেম্বার বন্ধ থাকে" : "Closed on other weekdays"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availability.weekly_schedules.map((ws) => (
                    <div
                      key={ws.id || ws.day_of_week}
                      className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200/90 shadow-2xs flex items-center gap-2 text-xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="font-extrabold text-slate-900">
                        {language === "bn" ? DAY_NAMES_BN[ws.day_of_week] : DAY_NAMES[ws.day_of_week]}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {formatTime(ws.start_time)} – {formatTime(ws.end_time)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !loadingAvailability && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-semibold text-amber-900 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    {language === "bn"
                      ? "এই ক্লিনিকে ডাক্তারের কোনো সাপ্তাহিক চেম্বার রুটিন এখনো যুক্ত করা হয়নি।"
                      : "No weekly chamber schedule has been configured for this doctor at this clinic yet."}
                  </span>
                </div>
              )
            )}

            {/* 2. 7-Day Visual Horizontal Date Strip with Prev/Next Week Slider */}
            {availability?.upcoming_days?.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                    <CalendarCheck size={15} className="text-emerald-700" />
                    <span>
                      {language === "bn"
                        ? "অ্যাপয়েন্টমেন্টের তারিখ বেছে নিন (৭ দিনের ভিউ)"
                        : "Select Appointment Date (7-Day View)"}
                    </span>
                  </label>

                  {/* Left / Right Week Navigation Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={stripStartIndex === 0}
                      onClick={() => setStripStartIndex((prev) => Math.max(0, prev - 7))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 flex items-center gap-1 transition-all shadow-2xs"
                    >
                      <ChevronLeft size={14} />
                      <span>{language === "bn" ? "পূর্ববর্তী ৭ দিন" : "Prev 7 Days"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={stripStartIndex + 7 >= availability.upcoming_days.length}
                      onClick={() =>
                        setStripStartIndex((prev) =>
                          Math.min(Math.max(0, availability.upcoming_days.length - 7), prev + 7)
                        )
                      }
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 flex items-center gap-1 transition-all shadow-2xs"
                    >
                      <span>{language === "bn" ? "পরবর্তী ৭ দিন" : "Next 7 Days"}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* 7-Day Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {availability.upcoming_days
                    .slice(stripStartIndex, stripStartIndex + 7)
                    .map((dayItem, idx) => {
                      const isSelected = formData.appointment_date === dayItem.date;
                      const isAvailable = dayItem.status === "AVAILABLE";
                      const isFull = dayItem.status === "FULL";
                      const isLeave = dayItem.status === "ON_LEAVE";
                      const [, mo, dy] = dayItem.date.split("-").map(Number);

                      const globalIdx = stripStartIndex + idx;
                      const dayLabel =
                        globalIdx === 0
                          ? language === "bn"
                            ? "আজ"
                            : "Today"
                          : globalIdx === 1
                          ? language === "bn"
                            ? "আগামীকাল"
                            : "Tomorrow"
                          : language === "bn"
                          ? DAY_SHORT_BN[dayItem.day_of_week]
                          : DAY_SHORT_EN[dayItem.day_of_week];

                      const dateFormatted = `${dy} ${
                        language === "bn" ? MONTH_SHORT_BN[mo - 1] : MONTH_SHORT_EN[mo - 1]
                      }`;

                      return (
                        <button
                          key={dayItem.date}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              appointment_date: dayItem.date,
                              appointment_time: "",
                            }));
                            setError("");
                          }}
                          className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-between gap-1.5 ${
                            isSelected
                              ? "border-emerald-700 bg-emerald-700 text-white shadow-md scale-[1.02]"
                              : isAvailable
                              ? "border-emerald-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-900 cursor-pointer shadow-2xs"
                              : isLeave
                              ? "border-rose-200/80 bg-rose-50/50 text-rose-800 opacity-80 cursor-not-allowed"
                              : isFull
                              ? "border-amber-200/80 bg-amber-50/50 text-amber-900 opacity-80 cursor-not-allowed"
                              : "border-slate-100 bg-slate-100/80 text-slate-400 opacity-75 cursor-not-allowed"
                          }`}
                        >
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wide ${
                              isSelected ? "text-emerald-100" : "text-slate-500"
                            }`}
                          >
                            {dayLabel}
                          </span>

                          <span
                            className={`text-sm sm:text-base font-black leading-tight ${
                              isSelected ? "text-white" : isAvailable ? "text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {dateFormatted}
                          </span>

                          {/* Status Badge */}
                          {isAvailable ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                isSelected
                                  ? "bg-white text-emerald-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {dayItem.available_count} {language === "bn" ? "টি খালি" : "open"}
                            </span>
                          ) : isLeave ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              {language === "bn" ? "ছুটিতে" : "On Leave"}
                            </span>
                          ) : isFull ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              {language === "bn" ? "হাউসফুল" : "Full"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/70 text-slate-500">
                              {language === "bn" ? "বন্ধ" : "Off"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Real-time Doctor Delay Alert Banner (if doctor is running late on selected date) */}
            {availability?.delay_minutes > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-3 text-xs text-amber-950 shadow-2xs">
                <Clock size={18} className="text-amber-600 shrink-0" />
                <div>
                  <div className="font-extrabold">
                    {language === "bn"
                      ? `ডাক্তার আজ নির্ধারিত সময়ের চেয়ে ${availability.delay_minutes} মিনিট দেরিতে চেম্বার শুরু করছেন`
                      : `Doctor is running ${availability.delay_minutes} minutes behind schedule today`}
                  </div>
                  <div className="text-amber-800 mt-0.5">
                    {language === "bn"
                      ? "নিচের প্রতিটি স্লটের সাথে সম্ভাব্য নতুন সময় (~) দেখানো হয়েছে।"
                      : "Updated estimated consultation times (~) are shown on each slot below."}
                  </div>
                </div>
              </div>
            )}

            {/* Chamber Sessions & Available Slots */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Clock size={15} className="text-emerald-700" />
                  <span>
                    {language === "bn"
                      ? `উপলব্ধ সময় স্লট (${formData.appointment_date}) *`
                      : `Available Time Slots (${formData.appointment_date}) *`}
                  </span>
                </label>
                {loadingAvailability && (
                  <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                    <Loader2 size={13} className="animate-spin" />
                    <span>{language === "bn" ? "স্লট অনুসন্ধান..." : "Checking available chamber slots..."}</span>
                  </span>
                )}
              </div>

              {/* Slot Availability Feedback */}
              {availability?.schedule && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>
                      {language === "bn" ? "চেম্বার সময়:" : "Chamber:"}{" "}
                      <strong>{formatTime(availability.schedule.start_time)} – {formatTime(availability.schedule.end_time)}</strong>
                    </span>
                  </div>
                  <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {availability.available_count} / {availability.total_slots} {language === "bn" ? "টি খালি স্লট" : "slots open"}
                  </span>
                </div>
              )}

              {sessionRanges.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                      <Clock size={15} className="text-emerald-700" />
                      <span>
                        {sessionRanges.length > 1
                          ? (language === "bn" ? "চেম্বার শিফট নির্বাচন করুন (সকাল / দুপুর / সন্ধ্যা)" : "Select Chamber Shift (Morning / Afternoon / Evening)")
                          : (language === "bn" ? "নির্ধারিত চেম্বার শিফট" : "Scheduled Chamber Shift")}
                      </span>
                    </label>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={11} className="text-emerald-600" />
                      <span>{language === "bn" ? "স্বয়ংক্রিয় সিরিয়াল বরাদ্দ" : "Auto-Assigned Serial Queue"}</span>
                    </span>
                  </div>

                  {/* Session Range Selectable Cards */}
                  <div className={`grid gap-3 ${sessionRanges.length > 2 ? "grid-cols-1 sm:grid-cols-3" : sessionRanges.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                    {sessionRanges.map((session) => {
                      const isSelected = selectedSessionId === session.id;
                      const isAvailable = session.available_count > 0;
                      return (
                        <button
                          key={session.id}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleSelectSession(session)}
                          className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/70 shadow-2xs ring-2 ring-emerald-500/20"
                              : isAvailable
                              ? "border-slate-200 bg-white hover:border-emerald-400 hover:bg-slate-50 cursor-pointer"
                              : "border-slate-100 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}>
                                {session.id === "morning" && <Sun size={17} />}
                                {session.id === "afternoon" && <Sunset size={17} />}
                                {session.id === "evening" && <Moon size={17} />}
                              </div>
                              <div>
                                <div className="font-extrabold text-sm text-slate-900 leading-tight">
                                  {session.displayName || session.name}
                                </div>
                                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                                  {formatTime(session.start_time)} – {formatTime(session.end_time)}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-700 text-white flex items-center gap-1 shrink-0">
                                <CheckCircle2 size={11} /> {language === "bn" ? "নির্বাচিত" : "Selected"}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className={`font-bold flex items-center gap-1 ${isAvailable ? "text-emerald-700" : "text-rose-600"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                              {isAvailable
                                ? `${session.available_count} ${language === "bn" ? "টি সিরিয়াল বাকি" : "slots available"}`
                                : (language === "bn" ? "সেশন পূর্ণ" : "Fully Booked")}
                            </span>
                            {isAvailable && (
                              <span className="text-[11px] font-extrabold text-slate-600">
                                {language === "bn" ? "প্রত্যাশিত সিরিয়াল" : "Next Token"}: #{predictedSerial}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Prominent Auto-Assigned Serial Token Card */}
                  {formData.appointment_time && (
                    <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 rounded-2xl border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                      <div className="flex items-center gap-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-emerald-700 text-white flex flex-col items-center justify-center shrink-0 shadow-sm ring-4 ring-emerald-100">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-200">SERIAL</span>
                          <span className="text-lg font-black leading-none">#{predictedSerial}</span>
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{language === "bn" ? "টোকেন সিরিয়াল স্বয়ংক্রিয়ভাবে বরাদ্দ করা হয়েছে" : "Serial Token Auto-Assigned"}</span>
                            <span className="text-emerald-700 font-bold">✓</span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium mt-0.5">
                            {language === "bn"
                              ? `সম্ভাব্য ডাকবার সময়: ~${formatTime(formData.appointment_time)} (${selectedSessionObj?.displayName || selectedSessionObj?.name || "চেম্বার"})`
                              : `Estimated consultation slot: ~${formatTime(formData.appointment_time)} (${selectedSessionObj?.displayName || selectedSessionObj?.name || "Chamber"})`}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {language === "bn"
                              ? "রোগীদের সিরিয়াল ক্রমানুসারে ডাকা হবে। চেম্বার শুরুর ১৫ মিনিট আগে পৌঁছানোর অনুরোধ করা হচ্ছে।"
                              : "Consultations follow sequential serial order. Please arrive 15 minutes before your estimated time."}
                          </div>
                        </div>
                      </div>
                      <div className="sm:self-center shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>{language === "bn" ? "সিরিয়াল সংরক্ষিত" : "Token Reserved"}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                availability?.message && (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs sm:text-sm space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5">
                      <AlertCircle size={15} className="text-amber-600" />
                      <span>{language === "bn" ? "এই তারিখে ডাক্তারের চেম্বার নেই" : "Doctor not available on this date"}</span>
                    </div>
                    <div className="text-amber-800">{availability.message}</div>
                  </div>
                )
              )}
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {language === "bn" ? "← পেছনে" : "← Previous"}
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!formData.appointment_date || !formData.appointment_time}
                className="px-7 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs sm:text-sm shadow-2xs flex items-center gap-2 transition-all"
              >
                <span>{language === "bn" ? "পরবর্তী: রোগীর বিবরণ" : "Next: Patient Details"}</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        )}

        {/* STEP 3: PATIENT SELECTION & SYMPTOMS */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {language === "bn" ? "৩. রোগী ও স্বাস্থ্যগত কারণ" : "3. Patient Identity & Symptoms"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === "bn" ? "কার জন্য এই অ্যাপয়েন্টমেন্ট নেওয়া হচ্ছে এবং মূল লক্ষণ লিখুন" : "Select whether this booking is for yourself or a registered family member"}
              </p>
            </div>

            {/* Patient Selection: Myself vs Family Member */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <Users size={15} className="text-emerald-700" />
                <span>{language === "bn" ? "অ্যাপয়েন্টমেন্টটি কার জন্য? *" : "Who is this appointment for? *"}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Myself Card */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, family_member_id: "" })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    !formData.family_member_id
                      ? "border-emerald-600 bg-emerald-50/60 shadow-2xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {language === "bn" ? "আমার নিজের জন্য" : "Myself"}
                    </span>
                    {!formData.family_member_id && <CheckCircle2 size={16} className="text-emerald-600" />}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {language === "bn" ? "প্রধান অ্যাকাউন্টধারী" : "Primary Account Holder"}
                  </div>
                </button>

                {/* Family Members Cards */}
                {familyMembers.map((member) => {
                  const isSelected = formData.family_member_id === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, family_member_id: member.id })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/60 shadow-2xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-sm truncate">
                          {member.full_name}
                        </span>
                        {isSelected ? (
                          <CheckCircle2 size={16} className="text-emerald-600" />
                        ) : (
                          <Heart size={14} className="text-rose-400" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {member.relationship_display} {member.age ? `(${member.age} ${language === "bn" ? "বছর" : "yrs"})` : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Problem Description */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <FileText size={15} className="text-emerald-700" />
                  <span>{language === "bn" ? "লক্ষণ বা সমস্যার বিবরণ" : "Symptoms / Reason for Visit"}</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  {formData.problem_description.length}/500
                </span>
              </label>
              <textarea
                name="problem_description"
                rows={4}
                maxLength={500}
                placeholder={
                  language === "bn"
                    ? "আপনার শারীরিক সমস্যা বা লক্ষণ সংক্ষেপে লিখুন (যেমন: ৩ দিন ধরে জ্বর ও কাশি)..."
                    : "Briefly describe symptoms or medical concerns for the doctor's review..."
                }
                value={formData.problem_description}
                onChange={handleChange}
                className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all leading-relaxed"
              ></textarea>
            </div>

            {/* Step 3 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {language === "bn" ? "← পেছনে" : "← Previous"}
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-7 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-2xs flex items-center gap-2 transition-all"
              >
                <span>{language === "bn" ? "পরবর্তী: পর্যালোচনা ও পেমেন্ট" : "Next: Review & Payment"}</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        )}

        {/* STEP 4: AUTHORITATIVE REVIEW & PAYMENT CONFIRMATION */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {language === "bn" ? "৪. অ্যাপয়েন্টমেন্ট পর্যালোচনা ও পেমেন্ট" : "4. Review Appointment & Payment"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === "bn" ? "তথ্য নিশ্চিত করুন এবং আপনার পছন্দের পেমেন্ট পদ্ধতি বেছে নিন" : "Verify particulars before atomic slot reservation"}
              </p>
            </div>

            {/* Authoritative Appointment Particulars Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  {language === "bn" ? "রোগীর নাম" : "Patient Identity"}
                </div>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <User size={15} className="text-emerald-700 shrink-0" />
                  <span>
                    {selectedFamilyMemberObj
                      ? `${selectedFamilyMemberObj.full_name} (${selectedFamilyMemberObj.relationship_display})`
                      : language === "bn" ? "আমার নিজের জন্য (অ্যাকাউন্টধারী)" : "Myself (Account Holder)"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  {language === "bn" ? "বিশেষজ্ঞ ডাক্তার" : "Consultant Specialist"}
                </div>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Stethoscope size={15} className="text-emerald-700 shrink-0" />
                  <span>{formatDocName(selectedDoctorObj?.full_name)}</span>
                </div>
                <div className="text-slate-500">
                  {selectedDoctorObj?.qualification || "Specialist"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  {language === "bn" ? "ক্লিনিক ও অবস্থান" : "Clinic Location"}
                </div>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Building2 size={15} className="text-emerald-700 shrink-0" />
                  <span>{selectedClinicObj?.name}</span>
                </div>
                <div className="text-slate-500">{selectedClinicObj?.city}</div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  {language === "bn" ? "তারিখ ও চেম্বার স্লট" : "Date & Chamber Slot"}
                </div>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Calendar size={15} className="text-emerald-700 shrink-0" />
                  <span>{formData.appointment_date}</span>
                </div>
                <div className="text-emerald-700 font-extrabold flex items-center gap-2">
                  <Clock size={13} />
                  <span>{formatTime(formData.appointment_time)}</span>
                  <span className="text-slate-300">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-black">
                    {language === "bn" ? "টোকেন সিরিয়াল" : "Token Serial"} #{predictedSerial}
                  </span>
                </div>
              </div>

            </div>

            {/* Problem description preview if entered */}
            {formData.problem_description && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  {language === "bn" ? "উল্লেখিত লক্ষণ:" : "Reported Symptoms:"}
                </span>
                <p className="text-slate-700 italic">"{formData.problem_description}"</p>
              </div>
            )}

            {/* Authoritative Consultation Fee Banner */}
            {consultationFee && (
              <div className="p-4.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-xs font-semibold text-emerald-900">
                    {language === "bn" ? "নির্ধারিত পরামর্শ ফি" : "Authoritative Consultation Fee"}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {language === "bn" ? "ক্লিনিক চুক্তি অনুযায়ী নির্দিষ্ট হার" : "Official rate per clinic service agreement"}
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-800">
                  ৳{consultationFee} <span className="text-xs font-bold text-emerald-700">BDT</span>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <CreditCard size={15} className="text-emerald-700" />
                <span>{language === "bn" ? "পেমেন্ট মাধ্যম বেছে নিন *" : "Select Payment Method *"}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Option 1: Online Payment via SSLCommerz */}
                <button
                  type="button"
                  onClick={() => setPaymentPreference("ONLINE")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    paymentPreference === "ONLINE"
                      ? "border-indigo-600 bg-indigo-50/40 shadow-2xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <Smartphone size={16} className="text-indigo-600" />
                      <span>{language === "bn" ? "অনলাইন পেমেন্ট (SSLCommerz)" : "Pay Online (SSLCommerz)"}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {language === "bn" ? "তাৎক্ষণিক টোকেন" : "Instant Token"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {language === "bn"
                      ? "বিকাশ, নগদ, রকেট বা ভিসা/মাস্টারকার্ড দিয়ে নিরাপদ পেমেন্ট।"
                      : "Pay securely via bKash, Nagad, Rocket, or Credit/Debit Card."}
                  </div>
                  <div className="flex gap-1.5 mt-2.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">bKash</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white">Nagad</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#1e3a8a] text-white">Rocket</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-white">Cards</span>
                  </div>
                </button>

                {/* Option 2: Cash at Clinic Counter */}
                <button
                  type="button"
                  onClick={() => setPaymentPreference("CASH")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    paymentPreference === "CASH"
                      ? "border-emerald-600 bg-emerald-50/50 shadow-2xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <Building2 size={16} className="text-emerald-700" />
                      <span>{language === "bn" ? "ক্লিনিক কাউন্টারে নগদ" : "Cash at Clinic Counter"}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {language === "bn" ? "চেম্বারে পরিশোধ" : "Pay at Reception"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {language === "bn"
                      ? "অ্যাপয়েন্টমেন্ট নিশ্চিত করুন এবং ক্লিনিকে পৌঁছানোর পর কাউন্টারে ফি দিন।"
                      : "Reserve your slot now and pay at clinic desk before consultation."}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700 mt-2.5 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>{language === "bn" ? "রিসেপশনে টাকা জমা দেওয়া পর্যন্ত পেমেন্ট অপেক্ষমাণ" : "Payment pending until reception collects cash"}</span>
                  </div>
                </button>

              </div>
            </div>

            {/* Submission Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {language === "bn" ? "← বিবরণ পরিবর্তন" : "← Edit Details"}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || (availability?.slots && availability.available_count === 0)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all min-h-[48px]"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{language === "bn" ? "বুকিং প্রক্রিয়াধীন..." : "Confirming Booking..."}</span>
                  </>
                ) : paymentPreference === "ONLINE" ? (
                  <>
                    <Smartphone size={18} />
                    <span>{language === "bn" ? "অনলাইন পেমেন্টে এগিয়ে যান (SSLCommerz) ➔" : "Proceed to Online Payment (SSLCommerz) ➔"}</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck size={18} />
                    <span>{language === "bn" ? "বুকিং নিশ্চিত করুন (কাউন্টারে নগদ)" : "Confirm Booking (Cash at Counter)"}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
