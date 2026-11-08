import { useState, useEffect } from "react";
import apiClient from "../../api/axios";
import { useAuth } from "../../Provider/AuthProvider";
import { useBangladeshGeo } from "../../hooks/useBangladeshGeo";
import {
  UserCheck,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Phone,
  User,
  Mail,
  MapPin,
  Loader,
  Edit3,
} from "lucide-react";

export default function ClinicAdminOnboarding({ clinic, onClinicUpdated, onStatusCheck }) {
  const { user, updateUser } = useAuth();

  // Helper to test if personal profile is complete
  const isProfileComplete = (u) => {
    if (!u?.first_name?.trim() || !u?.last_name?.trim()) return false;
    const phone = (u?.phone || "").replace(/\D/g, "");
    return /^01[3-9]\d{8}$/.test(phone);
  };

  // Determine initial step based on existing state
  const getInitialStep = () => {
    if (clinic) {
      if (clinic.verification_status === "REJECTED") return "REJECTED";
      if (clinic.verification_status === "PENDING") return "PENDING";
    }
    if (!isProfileComplete(user)) {
      return "PROFILE_COMPLETION";
    }
    return "INFO_CONFIRMATION";
  };

  const [step, setStep] = useState(getInitialStep);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const {
    divisions,
    districts,
    upazilas,
    selectedDivisionId,
    selectedDistrictId,
    selectedUpazilaId,
    loadingDivisions,
    loadingDistricts,
    loadingUpazilas,
    setSelectedDivisionId,
    setSelectedDistrictId,
    setSelectedUpazilaId,
    handleDivisionChange,
    handleDistrictChange,
    handleUpazilaChange,
  } = useBangladeshGeo(clinic?.division || "", clinic?.district || "", clinic?.upazila || "");

  // Clinic Registration Form state
  const [clinicForm, setClinicForm] = useState({
    name: clinic?.name || "",
    city: clinic?.city || "",
    division: clinic?.division || "",
    district: clinic?.district || "",
    upazila: clinic?.upazila || "",
    address: clinic?.address || "",
    phone: clinic?.phone || user?.phone || "",
    email: clinic?.email || user?.email || "",
    latitude: clinic?.latitude || "",
    longitude: clinic?.longitude || "",
    certificate_url: clinic?.certificate_url || "",
  });
  const [submittingClinic, setSubmittingClinic] = useState(false);
  const [clinicError, setClinicError] = useState("");

  const onDivisionSelect = (e) => {
    const divId = e.target.value;
    handleDivisionChange(divId);
    const divObj = divisions.find((d) => d.id === divId);
    setClinicForm((prev) => ({
      ...prev,
      division: divId,
      district: "",
      upazila: "",
      city: divObj ? divObj.name : prev.city,
    }));
  };

  const onDistrictSelect = (e) => {
    const distId = e.target.value;
    handleDistrictChange(distId);
    const distObj = districts.find((d) => d.id === distId);
    setClinicForm((prev) => ({
      ...prev,
      district: distId,
      upazila: "",
      city: distObj ? distObj.name : prev.city,
    }));
  };

  const onUpazilaSelect = (e) => {
    const upzId = e.target.value;
    handleUpazilaChange(upzId);
    setClinicForm((prev) => ({
      ...prev,
      upazila: upzId,
    }));
  };

  // Location capture state
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [locationError, setLocationError] = useState("");

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Unable to detect your location. Please try again.");
      setLocationStatus("");
      return;
    }

    setCapturingLocation(true);
    setLocationStatus("");
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = typeof position.coords.latitude === "number"
          ? position.coords.latitude.toFixed(6)
          : String(position.coords.latitude);
        const lng = typeof position.coords.longitude === "number"
          ? position.coords.longitude.toFixed(6)
          : String(position.coords.longitude);

        setClinicForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setLocationStatus("✓ Location captured successfully");
        setLocationError("");
        setCapturingLocation(false);
      },
      (err) => {
        setCapturingLocation(false);
        if (err.code === 1) {
          setLocationError(
            "Location permission was denied. Please allow location access in your browser settings or try again."
          );
        } else {
          setLocationError("Unable to detect your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Status check loading
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState("");

  // Synchronize state when props change
  useEffect(() => {
    if (clinic) {
      if (clinic.verification_status === "REJECTED") {
        setStep("REJECTED");
        setClinicForm({
          name: clinic.name || "",
          city: clinic.city || "",
          division: clinic.division || "",
          district: clinic.district || "",
          upazila: clinic.upazila || "",
          address: clinic.address || "",
          phone: clinic.phone || "",
          email: clinic.email || "",
          latitude: clinic.latitude || "",
          longitude: clinic.longitude || "",
          certificate_url: clinic.certificate_url || "",
        });
        if (clinic.division) setSelectedDivisionId(clinic.division);
        if (clinic.district) setSelectedDistrictId(clinic.district);
        if (clinic.upazila) setSelectedUpazilaId(clinic.upazila);
      } else if (clinic.verification_status === "PENDING") {
        setStep("PENDING");
      }
    } else if (!isProfileComplete(user)) {
      setStep("PROFILE_COMPLETION");
    }
  }, [clinic, user]);

  // Handle Step 1: Save Personal Profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");

    const cleanedPhone = (profileForm.phone || "").replace(/\D/g, "");
    if (!/^01[3-9]\d{8}$/.test(cleanedPhone)) {
      setProfileError("Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678).");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await apiClient.patch("/accounts/me/", {
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone: cleanedPhone,
      });

      if (updateUser) {
        updateUser(updated);
      }
      setStep("INFO_CONFIRMATION");
    } catch (err) {
      setProfileError(
        typeof err === "object"
          ? Object.values(err).flat().join(" ") || "Failed to update profile."
          : err || "Failed to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Step 3 & Step 5: Register or Resubmit Clinic
  const handleClinicSubmit = async (e) => {
    e.preventDefault();
    setClinicError("");

    if (!clinicForm.certificate_url?.trim()) {
      setClinicError("Registration certificate document URL is required.");
      return;
    }

    setSubmittingClinic(true);
    try {
      const payload = {
        name: clinicForm.name.trim(),
        city: clinicForm.city.trim(),
        address: clinicForm.address.trim(),
        phone: clinicForm.phone.trim(),
        email: clinicForm.email.trim().toLowerCase(),
        certificate_url: clinicForm.certificate_url.trim(),
      };
      if (selectedDivisionId) payload.division = selectedDivisionId;
      if (selectedDistrictId) payload.district = selectedDistrictId;
      if (selectedUpazilaId) payload.upazila = selectedUpazilaId;
      if (clinicForm.latitude) payload.latitude = clinicForm.latitude;
      if (clinicForm.longitude) payload.longitude = clinicForm.longitude;

      if (clinic && clinic.id) {
        // Resubmission of existing clinic
        await apiClient.patch(`/clinics/${clinic.id}/`, payload);
      } else {
        // Brand new clinic registration
        await apiClient.post("/clinics/", payload);
      }

      if (onClinicUpdated) {
        await onClinicUpdated();
      }
      setStep("PENDING");
    } catch (err) {
      setClinicError(
        typeof err === "object"
          ? Object.values(err).flat().join(" ") || "Failed to submit clinic registration."
          : err || "Failed to submit clinic registration."
      );
    } finally {
      setSubmittingClinic(false);
    }
  };

  // Handle Manual Status Refresh in Pending screen
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setStatusFeedback("");
    try {
      if (onStatusCheck) {
        await onStatusCheck();
      }
      setStatusFeedback("Status refreshed. Verification is currently in review.");
      setTimeout(() => setStatusFeedback(""), 4000);
    } catch {
      setStatusFeedback("Could not refresh status right now. Please try again.");
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Flow Progress Stepper */}
      <div className="bg-base-100 p-6 rounded-3xl border border-base-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
          <div>
            <span className="badge badge-primary badge-sm font-bold uppercase tracking-wider mb-1">
              Clinic Admin Setup
            </span>
            <h1 className="text-xl font-black text-base-content flex items-center gap-2">
              <ShieldCheck className="text-primary" size={22} />
              Clinic Administrator Onboarding
            </h1>
          </div>
          <div className="text-xs text-base-content/60 font-medium">
            Step {step === "PROFILE_COMPLETION" ? "1 of 4" : step === "INFO_CONFIRMATION" ? "2 of 4" : step === "REGISTER_CLINIC" ? "3 of 4" : "4 of 4"}
          </div>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
          <div
            className={`p-2.5 rounded-2xl border text-center transition-all ${
              step === "PROFILE_COMPLETION"
                ? "border-primary bg-primary/10 text-primary font-bold"
                : isProfileComplete(user)
                ? "border-success/40 bg-success/5 text-success font-semibold"
                : "border-base-200 text-base-content/40"
            }`}
          >
            <div className="text-xs">1. Profile Info</div>
          </div>

          <div
            className={`p-2.5 rounded-2xl border text-center transition-all ${
              step === "INFO_CONFIRMATION"
                ? "border-primary bg-primary/10 text-primary font-bold"
                : isProfileComplete(user) && (clinic || step === "REGISTER_CLINIC")
                ? "border-success/40 bg-success/5 text-success font-semibold"
                : "border-base-200 text-base-content/40"
            }`}
          >
            <div className="text-xs">2. Confirmation</div>
          </div>

          <div
            className={`p-2.5 rounded-2xl border text-center transition-all ${
              step === "REGISTER_CLINIC"
                ? "border-primary bg-primary/10 text-primary font-bold"
                : clinic
                ? "border-success/40 bg-success/5 text-success font-semibold"
                : "border-base-200 text-base-content/40"
            }`}
          >
            <div className="text-xs">3. Clinic Details</div>
          </div>

          <div
            className={`p-2.5 rounded-2xl border text-center transition-all ${
              step === "PENDING"
                ? "border-warning bg-warning/10 text-warning-content font-bold"
                : step === "REJECTED"
                ? "border-error bg-error/10 text-error font-bold"
                : clinic?.verification_status === "VERIFIED"
                ? "border-success bg-success/10 text-success font-bold"
                : "border-base-200 text-base-content/40"
            }`}
          >
            <div className="text-xs">4. Verification</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: Clinic Admin Profile Completion                                   */}
      {/* ========================================================================= */}
      {step === "PROFILE_COMPLETION" && (
        <div className="bg-base-100 p-8 rounded-3xl border border-base-200 shadow-md space-y-6">
          <div className="flex items-center gap-3 border-b border-base-200 pb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <UserCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-base-content">
                Clinic Admin Profile Completion
              </h2>
              <p className="text-xs text-base-content/60 mt-0.5">
                Please complete your personal contact information before registering your clinic.
              </p>
            </div>
          </div>

          {profileError && (
            <div className="alert alert-error text-xs py-3 px-4 rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="label text-xs font-bold text-base-content/70">
                Email Address (Registered Account)
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-base-content/40" />
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="input input-bordered w-full pl-10 bg-base-200/50 cursor-not-allowed text-sm"
                />
              </div>
              <span className="text-[11px] text-base-content/40 mt-1 block">
                Your email is uniquely linked to your Clinic Admin credentials.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-bold text-base-content/70">First Name *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-base-content/40" />
                  <input
                    type="text"
                    required
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="input input-bordered w-full pl-10 text-sm"
                    placeholder="e.g. Istiak"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">Last Name *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-base-content/40" />
                  <input
                    type="text"
                    required
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="input input-bordered w-full pl-10 text-sm"
                    placeholder="e.g. Ahmed"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label text-xs font-bold text-base-content/70">
                Personal Contact Number (Bangladesh) *
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-3.5 text-base-content/40" />
                <input
                  type="tel"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="input input-bordered w-full pl-10 text-sm font-mono"
                  placeholder="017XXXXXXXX"
                  maxLength={11}
                />
              </div>
              <span className="text-[11px] text-base-content/50 mt-1 block">
                Standard 11-digit mobile number for administrative verification &amp; system notifications.
              </span>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="btn btn-primary w-full shadow-lg gap-2 font-bold"
              >
                {savingProfile ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Save &amp; Continue</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: "Your Information" Confirmation Page                              */}
      {/* ========================================================================= */}
      {step === "INFO_CONFIRMATION" && (
        <div className="bg-base-100 p-8 rounded-3xl border border-base-200 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-base-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-success/10 text-success rounded-2xl">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-base-content">Your Information</h2>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Your personal profile details on Smart Clinic
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep("PROFILE_COMPLETION")}
              className="btn btn-ghost btn-sm gap-1.5 text-xs text-primary font-bold"
            >
              <Edit3 size={14} /> Edit Details
            </button>
          </div>

          {/* Personal Information Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-base-200/40 rounded-2xl border border-base-200 text-sm">
            <div>
              <span className="text-xs text-base-content/50 block font-semibold">Administrator Name</span>
              <span className="font-extrabold text-base-content text-base">
                {user?.first_name} {user?.last_name}
              </span>
            </div>

            <div>
              <span className="text-xs text-base-content/50 block font-semibold">Email Address</span>
              <span className="font-mono text-base-content/90">{user?.email}</span>
            </div>

            <div>
              <span className="text-xs text-base-content/50 block font-semibold">Contact Mobile</span>
              <span className="font-mono text-base-content/90 font-bold">{user?.phone || "—"}</span>
            </div>

            <div>
              <span className="text-xs text-base-content/50 block font-semibold">Account Role</span>
              <span className="badge badge-primary badge-sm font-bold">CLINIC ADMIN</span>
            </div>
          </div>

          {/* Prompt Message (Exact Prompt Requirement #3) */}
          <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-3">
            <div className="flex items-center gap-2 text-primary font-black text-base">
              <Sparkles size={20} />
              <span>Personal Profile Complete</span>
            </div>
            <p className="text-base text-base-content/80 leading-relaxed font-medium">
              Your personal information has been registered successfully. Now you need to register your clinic.
            </p>
          </div>

          {/* Action Button (Exact Prompt Requirement #3) */}
          <button
            type="button"
            onClick={() => setStep("REGISTER_CLINIC")}
            className="btn btn-primary btn-lg w-full shadow-xl gap-2 font-black text-base"
          >
            <Building2 size={20} />
            <span>Register Your Clinic</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Register Clinic Form                                              */}
      {/* ========================================================================= */}
      {step === "REGISTER_CLINIC" && (
        <div className="bg-base-100 p-8 rounded-3xl border border-base-200 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-base-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-base-content">
                  Register Your Healthcare Clinic
                </h2>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Fill in your clinic identity and attach official registration proof for Super Admin review.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep("INFO_CONFIRMATION")}
              className="btn btn-ghost btn-sm text-xs"
            >
              Back
            </button>
          </div>

          {clinicError && (
            <div className="alert alert-error text-xs py-3 px-4 rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{clinicError}</span>
            </div>
          )}

          <form onSubmit={handleClinicSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-bold text-base-content/70">Clinic Official Name *</label>
                <input
                  type="text"
                  required
                  value={clinicForm.name}
                  onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                  className="input input-bordered w-full text-sm"
                  placeholder="e.g. Central Medicare Clinic"
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">City / District Display *</label>
                <input
                  type="text"
                  required
                  value={clinicForm.city}
                  onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })}
                  className="input input-bordered w-full text-sm"
                  placeholder="e.g. Dhaka (Auto-updated from district)"
                />
              </div>
            </div>

            {/* Bangladesh Geographic Hierarchy Cascading Selectors */}
            <div className="p-4 bg-base-200/50 rounded-2xl border border-base-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <MapPin size={14} />
                <span>Geographic Location (Bangladesh Administrative Area)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Division Dropdown */}
                <div>
                  <label className="label text-xs font-semibold text-base-content/70 py-1">
                    Division (বিভাগ) *
                  </label>
                  <select
                    required
                    value={selectedDivisionId}
                    onChange={onDivisionSelect}
                    className="select select-bordered select-sm w-full text-xs"
                    disabled={loadingDivisions}
                  >
                    <option value="">Select Division</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.bn_name || d.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. District Dropdown */}
                <div>
                  <label className="label text-xs font-semibold text-base-content/70 py-1">
                    District (জেলা) *
                  </label>
                  <select
                    required
                    value={selectedDistrictId}
                    onChange={onDistrictSelect}
                    className="select select-bordered select-sm w-full text-xs"
                    disabled={!selectedDivisionId || loadingDistricts}
                  >
                    <option value="">
                      {!selectedDivisionId
                        ? "Select Division First"
                        : loadingDistricts
                        ? "Loading Districts..."
                        : "Select District"}
                    </option>
                    {districts.map((dist) => (
                      <option key={dist.id} value={dist.id}>
                        {dist.name} ({dist.bn_name || dist.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Upazila / Thana Dropdown */}
                <div>
                  <label className="label text-xs font-semibold text-base-content/70 py-1">
                    Upazila / Thana (উপজেলা / থানা)
                  </label>
                  <select
                    value={selectedUpazilaId}
                    onChange={onUpazilaSelect}
                    className="select select-bordered select-sm w-full text-xs"
                    disabled={!selectedDistrictId || loadingUpazilas}
                  >
                    <option value="">
                      {!selectedDistrictId
                        ? "Select District First"
                        : loadingUpazilas
                        ? "Loading Upazilas..."
                        : "Select Upazila / Thana"}
                    </option>
                    {upazilas.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.post_code ? `(${u.post_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="label text-xs font-bold text-base-content/70">Complete Physical Address *</label>
              <textarea
                required
                rows={2}
                value={clinicForm.address}
                onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                className="textarea textarea-bordered w-full text-sm"
                placeholder="e.g. House #14, Road #7, Dhanmondi, Dhaka-1205"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-bold text-base-content/70">Clinic Official Phone *</label>
                <input
                  type="tel"
                  required
                  value={clinicForm.phone}
                  onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
                  className="input input-bordered w-full text-sm"
                  placeholder="e.g. 01700000000 or 02-9876543"
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">Clinic Official Email *</label>
                <input
                  type="email"
                  required
                  value={clinicForm.email}
                  onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })}
                  className="input input-bordered w-full text-sm lowercase"
                  placeholder="info@centralmedicare.com"
                />
              </div>
            </div>

            {/* Location Capture - Easy 1-click location detection */}
            <div className="bg-base-200/50 border border-base-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="label-text font-bold text-sm text-base-content flex items-center gap-1.5">
                    <MapPin size={16} className="text-primary" /> Clinic Location (Optional)
                  </label>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    Helps nearby patients discover your clinic on the map and calculate distance for appointments.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={capturingLocation}
                  className="btn btn-sm btn-primary rounded-xl font-bold shadow-xs gap-2 shrink-0"
                >
                  {capturingLocation ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Detecting Location...
                    </>
                  ) : (
                    <>📍 Use My Current Location</>
                  )}
                </button>
              </div>

              {/* Success Message */}
              {locationStatus && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-success flex items-center gap-1.5">
                    <span>{locationStatus}</span>
                  </div>
                  {clinicForm.latitude && clinicForm.longitude && (
                    <div className="text-[11px] font-mono text-base-content/60">
                      Latitude: {clinicForm.latitude}, Longitude: {clinicForm.longitude}
                    </div>
                  )}
                </div>
              )}

              {/* Graceful Error Feedback */}
              {locationError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-xs text-error flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <div>{locationError}</div>
                </div>
              )}

              {/* Already captured (when no fresh active message is showing) */}
              {!locationStatus && !locationError && clinicForm.latitude && clinicForm.longitude && (
                <div className="p-3 bg-base-100 rounded-xl border border-base-200 flex items-center justify-between text-xs">
                  <span className="text-success font-semibold flex items-center gap-1.5">
                    <span>✓</span> Location captured
                  </span>
                  <span className="text-[11px] font-mono text-base-content/60">
                    Latitude: {clinicForm.latitude}, Longitude: {clinicForm.longitude}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="label text-xs font-bold text-base-content/70 flex items-center gap-1">
                <FileText size={13} className="text-primary" /> Registration Certificate Document URL *
              </label>
              <input
                type="url"
                required
                value={clinicForm.certificate_url}
                onChange={(e) => setClinicForm({ ...clinicForm, certificate_url: e.target.value })}
                className="input input-bordered w-full text-sm"
                placeholder="https://res.cloudinary.com/... or official medical license link"
              />
              <span className="text-[11px] text-base-content/50 mt-1 block">
                Required for Super Admin verification. Submit DGDA / Ministry of Health certificate URL.
              </span>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setStep("INFO_CONFIRMATION")}
                className="btn btn-outline flex-1"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submittingClinic}
                className="btn btn-primary flex-2 shadow-xl gap-2 font-bold"
              >
                {submittingClinic ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Submit Clinic for Verification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: Dedicated Pending Verification Screen (Exact Requirements #5 & #6) */}
      {/* ========================================================================= */}
      {step === "PENDING" && (
        <div className="space-y-6">
          <div className="bg-base-100 p-8 rounded-3xl border border-base-200 shadow-md text-center space-y-6">
            {/* Pulsing Status Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-warning/15 text-warning flex items-center justify-center relative">
              <Clock size={40} className="animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-warning/40 animate-ping" />
            </div>

            {/* Exact Required Titles and Messages (Requirement #6) */}
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl font-black text-base-content tracking-tight">
                Request Successfully Submitted
              </h2>
              <p className="text-base text-base-content/80 font-medium">
                Your clinic registration request has been successfully submitted to Smart Clinic.
              </p>
              <p className="text-sm text-base-content/60">
                Please wait while our Super Admin verifies your information.
              </p>
            </div>

            {/* Exact Timeline Component (Requirement #6) */}
            <div className="bg-base-200/40 p-6 rounded-3xl border border-base-200 text-left max-w-lg mx-auto space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-base-content/50 border-b border-base-200 pb-2">
                Verification Progress Timeline
              </div>

              <div className="space-y-4">
                {/* 1. Information Submitted */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success text-success-content flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-base-content">✓ Information Submitted</div>
                    <div className="text-xs text-base-content/50">Personal &amp; clinic details registered</div>
                  </div>
                </div>

                {/* 2. Verification Request Created */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success text-success-content flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-base-content">✓ Verification Request Created</div>
                    <div className="text-xs text-base-content/50">Official certificate document queued</div>
                  </div>
                </div>

                {/* 3. Waiting for Super Admin Review */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-warning text-warning-content flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Clock size={15} className="animate-spin" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-warning-content">⏳ Waiting for Super Admin Review</div>
                    <div className="text-xs text-base-content/60">Credentials under administrative evaluation</div>
                  </div>
                </div>

                {/* 4. Clinic Approval */}
                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-6 h-6 rounded-full border-2 border-base-content/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-base-content/40">○</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-base-content">○ Clinic Approval</div>
                    <div className="text-xs text-base-content/50">Super Admin authorization grant</div>
                  </div>
                </div>

                {/* 5. Clinic Activation */}
                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-6 h-6 rounded-full border-2 border-base-content/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-base-content/40">○</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-base-content">○ Clinic Activation</div>
                    <div className="text-xs text-base-content/50">Access to complete Clinic Admin Dashboard</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submitted Clinic Overview */}
            {clinic && (
              <div className="bg-base-100 p-5 rounded-2xl border border-base-200 text-left max-w-lg mx-auto space-y-2 text-xs">
                <div className="font-bold text-base-content text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={16} className="text-primary" /> {clinic.name}
                  </span>
                  <span className="badge badge-warning badge-soft font-bold">PENDING REVIEW</span>
                </div>
                <div className="text-base-content/70">{clinic.address}, {clinic.city}</div>
                {clinic.certificate_url && (
                  <div className="pt-2 border-t border-base-200 flex items-center justify-between">
                    <span className="text-base-content/50">Submitted Certificate:</span>
                    <a
                      href={clinic.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-bold flex items-center gap-1"
                    >
                      <span>View Document</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Refresh / Check Status Action */}
            <div className="max-w-md mx-auto pt-2 space-y-2">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="btn btn-outline w-full gap-2 shadow-sm font-bold"
              >
                {checkingStatus ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                <span>Check Approval Status</span>
              </button>
              {statusFeedback && (
                <div className="text-xs text-primary font-medium">{statusFeedback}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: Rejected / Action Required Screen (Requirement #9)                */}
      {/* ========================================================================= */}
      {step === "REJECTED" && (
        <div className="space-y-6">
          <div className="bg-base-100 p-8 rounded-3xl border border-error/30 shadow-md space-y-6">
            <div className="p-5 bg-error/10 border border-error/20 rounded-2xl flex items-start gap-3 text-error-content">
              <AlertCircle size={24} className="text-error shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-black text-base text-error">Registration Review: Updates Required</h3>
                <p className="text-xs text-base-content/80 leading-relaxed">
                  Your clinic registration request was reviewed by the Super Admin and requires updates or corrections before approval.
                  Please update your medical registration certificate URL or clinic contact information below to resubmit.
                </p>
              </div>
            </div>

            {clinicError && (
              <div className="alert alert-error text-xs py-3 px-4 rounded-2xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{clinicError}</span>
              </div>
            )}

            <form onSubmit={handleClinicSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-bold text-base-content/70">Clinic Name *</label>
                  <input
                    type="text"
                    required
                    value={clinicForm.name}
                    onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                    className="input input-bordered w-full text-sm"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70">City / District Display *</label>
                  <input
                    type="text"
                    required
                    value={clinicForm.city}
                    onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })}
                    className="input input-bordered w-full text-sm"
                  />
                </div>
              </div>

              {/* Bangladesh Geographic Hierarchy Cascading Selectors */}
              <div className="p-4 bg-base-200/50 rounded-2xl border border-base-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <MapPin size={14} />
                  <span>Geographic Location (Bangladesh Administrative Area)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Division Dropdown */}
                  <div>
                    <label className="label text-xs font-semibold text-base-content/70 py-1">
                      Division (বিভাগ) *
                    </label>
                    <select
                      required
                      value={selectedDivisionId}
                      onChange={onDivisionSelect}
                      className="select select-bordered select-sm w-full text-xs"
                      disabled={loadingDivisions}
                    >
                      <option value="">Select Division</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.bn_name || d.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. District Dropdown */}
                  <div>
                    <label className="label text-xs font-semibold text-base-content/70 py-1">
                      District (জেলা) *
                    </label>
                    <select
                      required
                      value={selectedDistrictId}
                      onChange={onDistrictSelect}
                      className="select select-bordered select-sm w-full text-xs"
                      disabled={!selectedDivisionId || loadingDistricts}
                    >
                      <option value="">
                        {!selectedDivisionId
                          ? "Select Division First"
                          : loadingDistricts
                          ? "Loading Districts..."
                          : "Select District"}
                      </option>
                      {districts.map((dist) => (
                        <option key={dist.id} value={dist.id}>
                          {dist.name} ({dist.bn_name || dist.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Upazila / Thana Dropdown */}
                  <div>
                    <label className="label text-xs font-semibold text-base-content/70 py-1">
                      Upazila / Thana (উপজেলা / থানা)
                    </label>
                    <select
                      value={selectedUpazilaId}
                      onChange={onUpazilaSelect}
                      className="select select-bordered select-sm w-full text-xs"
                      disabled={!selectedDistrictId || loadingUpazilas}
                    >
                      <option value="">
                        {!selectedDistrictId
                          ? "Select District First"
                          : loadingUpazilas
                          ? "Loading Upazilas..."
                          : "Select Upazila / Thana"}
                      </option>
                      {upazilas.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.post_code ? `(${u.post_code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">Address *</label>
                <textarea
                  required
                  rows={2}
                  value={clinicForm.address}
                  onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                  className="textarea textarea-bordered w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-bold text-base-content/70">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={clinicForm.phone}
                    onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
                    className="input input-bordered w-full text-sm"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={clinicForm.email}
                    onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })}
                    className="input input-bordered w-full text-sm lowercase"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70 flex items-center gap-1">
                  <FileText size={13} className="text-primary" /> Updated Certificate Document URL *
                </label>
                <input
                  type="url"
                  required
                  value={clinicForm.certificate_url}
                  onChange={(e) => setClinicForm({ ...clinicForm, certificate_url: e.target.value })}
                  className="input input-bordered w-full text-sm font-mono"
                  placeholder="https://res.cloudinary.com/... link to clear valid certificate"
                />
                <span className="text-[11px] text-base-content/50 mt-1 block">
                  Ensure the uploaded certificate is clear, valid, and registered with the DGDA / Ministry of Health.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingClinic}
                  className="btn btn-warning w-full shadow-lg gap-2 font-bold"
                >
                  {submittingClinic ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <>
                      <RotateCcw size={18} />
                      <span>Update &amp; Resubmit for Verification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}