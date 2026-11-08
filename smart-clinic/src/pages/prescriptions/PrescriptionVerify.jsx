import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import apiClient from "../../api/axios";
import {
  CheckCircle2, AlertTriangle, ShieldCheck, Printer, Copy, Check,
  Search, Stethoscope, Building2, Calendar, Hash, User, Activity,
  FileText, Pill, ArrowLeft, ExternalLink, QrCode
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function PrescriptionVerify() {
  const { qrToken: routeToken } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [inputToken, setInputToken] = useState(routeToken || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dispensedItems, setDispensedItems] = useState({});
  const [completedTests, setCompletedTests] = useState({});

  const fetchPrescription = async (tokenToFetch) => {
    if (!tokenToFetch || !tokenToFetch.trim()) {
      setError("Please enter a valid QR token.");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await apiClient.get(`/prescriptions/verify/${tokenToFetch.trim()}/`);
      // Axios interceptor already unwraps { success, data, errors } -> returns data directly
      // So res == { is_valid: true, verification_message: "...", prescription: {...} }
      if (res && res.is_valid && res.prescription) {
        setData(res.prescription);
      } else if (res && res.id) {
        // Fallback: direct prescription object
        setData(res);
      } else {
        setError(res?.verification_message || "Prescription could not be verified.");
      }
    } catch (err) {
      console.error("Prescription verification error:", err);
      const errMsg =
        typeof err === "string"
          ? err
          : err?.verification_message ||
            err?.message ||
            "Invalid or unverified prescription QR token.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeToken) {
      setInputToken(routeToken);
      fetchPrescription(routeToken);
    }
  }, [routeToken]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (inputToken.trim()) {
      navigate(`/verify-prescription/${inputToken.trim()}`);
      fetchPrescription(inputToken.trim());
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleDispensed = (idx) => {
    setDispensedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleTest = (idx) => {
    setCompletedTests((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const testsList = data?.diagnostic_tests
    ? data.diagnostic_tests
        .split(/[\n,;]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 py-8 px-4 sm:px-6 print:p-0 print:bg-white text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Brand Header - Hidden in Print */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.history.length > 2 ? navigate(-1) : navigate("/"))}
              className="btn btn-sm btn-circle btn-ghost bg-white shadow-xs border border-slate-200"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={24} />
                SmartClinic E-Rx Verification
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {t("rxVerificationSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/" className="btn btn-sm btn-ghost text-xs">
              Home
            </Link>
            <Link to="/doctors" className="btn btn-sm btn-ghost text-xs">
              Doctors
            </Link>
            <Link to="/clinics" className="btn btn-sm btn-ghost text-xs">
              Clinics
            </Link>
          </div>
        </div>

        {/* Token Search Bar - Hidden in Print */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 print:hidden">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={t("enterQrToken")}
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="input input-bordered w-full pl-10 text-sm font-mono text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputToken.trim()}
              className="btn btn-primary text-white font-bold gap-2 px-6"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Search size={16} />
              )}
              {t("verifyPrescription")}
            </button>
          </form>
        </div>

        {/* Error / Invalid Token Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl shadow-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-base">
              <AlertTriangle className="text-rose-600 shrink-0" size={20} />
              Prescription Verification Failed
            </div>
            <p className="text-sm text-rose-700">{error}</p>
            <div className="text-xs text-rose-600/80">
              Please double check the QR token code printed on the patient slip, or ask the patient for an updated prescription link.
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 space-y-6 animate-pulse">
            <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-slate-100 rounded-2xl" />
              <div className="h-24 bg-slate-100 rounded-2xl" />
            </div>
            <div className="h-40 bg-slate-100 rounded-2xl" />
          </div>
        )}

        {/* Verified Prescription Document */}
        {data && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
            {/* Top Official Seal & Verification Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-800 print:p-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-xs print:hidden">
                    <CheckCircle2 size={28} className="text-emerald-100" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-emerald-100 print:text-emerald-700">
                      OFFICIAL DIGITAL E-PRESCRIPTION VERIFIED
                    </div>
                    <h2 className="text-lg font-black leading-tight">
                      Smart Clinic Bangladesh Digital Healthcare Network
                    </h2>
                    <div className="text-[11px] text-emerald-100/90 font-mono print:text-slate-500">
                      DGDA Compliant • Authenticated Token: {data.qr_token}
                    </div>
                  </div>
                </div>

                {/* Print & Share Actions - Hidden in Print */}
                <div className="flex items-center gap-2 print:hidden self-end sm:self-center">
                  <button
                    onClick={handleCopyLink}
                    className="btn btn-xs bg-white/20 hover:bg-white/30 text-white border-0 gap-1 rounded-lg"
                    title="Copy verification link"
                  >
                    {copied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
                    {copied ? t("linkCopied") : t("copyVerifyLink")}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="btn btn-xs bg-white text-emerald-800 font-bold hover:bg-emerald-50 border-0 gap-1 rounded-lg shadow-sm"
                  >
                    <Printer size={12} />
                    {t("printPdf")}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6 print:p-4">
              {/* Doctor & Clinic Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b-2 border-slate-200">
                {/* Doctor Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                    <Stethoscope size={14} /> Attending Doctor
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Dr. {data.doctor?.full_name}
                  </h3>
                  <p className="text-sm font-semibold text-slate-700">
                    {data.doctor?.qualification || "Registered Medical Practitioner"}
                  </p>
                  {data.doctor?.specializations && data.doctor.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {data.doctor.specializations.map((spec, i) => (
                        <span key={i} className="badge badge-sm bg-emerald-50 text-emerald-800 border-emerald-200 font-medium">
                          {spec.name || spec}
                        </span>
                      ))}
                    </div>
                  )}
                  {data.doctor?.phone && (
                    <div className="text-xs text-slate-500 font-mono pt-1">
                      Dr. Chamber Contact: {data.doctor.phone}
                    </div>
                  )}
                </div>

                {/* Clinic Info */}
                <div className="space-y-1 md:text-right">
                  <div className="flex items-center md:justify-end gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                    <Building2 size={14} /> Clinic / Hospital
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {data.clinic_name || "Smart Clinic Bangladesh Partner"}
                  </h3>
                  {data.clinic_address && (
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {data.clinic_address}
                    </p>
                  )}
                  {data.clinic_phone && (
                    <p className="text-xs text-slate-500 font-mono">
                      Reception: {data.clinic_phone}
                    </p>
                  )}
                  <div className="flex items-center md:justify-end gap-3 text-xs text-slate-600 font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-slate-400" />
                      {data.appointment_date || new Date(data.created_at).toLocaleDateString("en-GB")}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-slate-800">
                      <Hash size={13} className="text-slate-400" />
                      Serial #{data.serial_number || 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Identification Card */}
              <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200 flex flex-wrap justify-between items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold uppercase block text-[10px]">
                    Patient Name / রোগী
                  </span>
                  <span className="font-extrabold text-sm text-slate-900">
                    {data.family_member ? data.family_member.full_name : `${data.patient?.first_name || ""} ${data.patient?.last_name || ""}`.trim() || data.patient?.email}
                  </span>
                  {data.family_member && (
                    <span className="ml-2 badge badge-xs bg-slate-200 text-slate-700">
                      Family Profile: {data.family_member.relationship_display || data.family_member.relationship}
                    </span>
                  )}
                </div>

                {data.patient?.phone && (
                  <div>
                    <span className="text-slate-500 font-semibold uppercase block text-[10px]">
                      Registered Phone
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {data.patient.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 font-semibold uppercase block text-[10px]">
                    Date of Issue
                  </span>
                  <span className="font-semibold text-slate-800">
                    {new Date(data.created_at).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold uppercase block text-[10px]">
                    Verification Status
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 size={12} /> Valid Digital Rx
                  </span>
                </div>
              </div>

              {/* Clinical Vitals (if recorded) */}
              {data.vitals && Object.keys(data.vitals).length > 0 && (
                <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200/60">
                  <div className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5 mb-2">
                    <Activity size={14} className="text-emerald-700" /> Patient Vitals Recorded at Chamber:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {data.vitals.bp && (
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="text-slate-500 block text-[10px]">Blood Pressure</span>
                        <span className="font-black text-slate-800">{data.vitals.bp} mmHg</span>
                      </div>
                    )}
                    {data.vitals.pulse && (
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="text-slate-500 block text-[10px]">Pulse Rate</span>
                        <span className="font-black text-slate-800">{data.vitals.pulse} bpm</span>
                      </div>
                    )}
                    {data.vitals.weight && (
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="text-slate-500 block text-[10px]">Weight</span>
                        <span className="font-black text-slate-800">{data.vitals.weight} kg</span>
                      </div>
                    )}
                    {data.vitals.temp && (
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="text-slate-500 block text-[10px]">Temperature</span>
                        <span className="font-black text-slate-800">{data.vitals.temp} °F</span>
                      </div>
                    )}
                    {data.vitals.blood_sugar && (
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="text-slate-500 block text-[10px]">Blood Sugar</span>
                        <span className="font-black text-slate-800">{data.vitals.blood_sugar} mmol/L</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {data.diagnosis && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Clinical Diagnosis / শারীরিক সমস্যা ও রোগ নির্ণয়:
                  </span>
                  <p className="text-sm font-semibold text-slate-900 whitespace-pre-line">
                    {data.diagnosis}
                  </p>
                </div>
              )}

              {/* Prescribed Medications (Rx) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="font-serif italic text-xl text-emerald-700">℞</span>
                    {t("prescribedMedicines")}
                  </h4>
                  <span className="text-xs font-semibold text-slate-500 print:hidden">
                    {t("dispenseHelper")}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="table table-zebra w-full text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 uppercase font-black tracking-wider text-[11px]">
                      <tr>
                        <th className="w-10 text-center print:hidden">Dispense</th>
                        <th>#</th>
                        <th>Medicine & Strength</th>
                        <th>Dosage (মাত্রা)</th>
                        <th>Timing (সময়)</th>
                        <th>Duration (মেয়াদ)</th>
                        <th>Instructions (নির্দেশনা)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.medications && data.medications.length > 0 ? (
                        data.medications.map((med, idx) => (
                          <tr
                            key={med.id || idx}
                            className={dispensedItems[idx] ? "bg-emerald-50/50 line-through opacity-75" : ""}
                          >
                            <td className="text-center print:hidden">
                              <input
                                type="checkbox"
                                checked={!!dispensedItems[idx]}
                                onChange={() => toggleDispensed(idx)}
                                className="checkbox checkbox-sm checkbox-success"
                                title="Mark Dispensed"
                              />
                            </td>
                            <td className="font-bold text-slate-400">{idx + 1}</td>
                            <td className="font-black text-slate-900 text-sm">
                              {med.medication_name}
                            </td>
                            <td>
                              <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                                {med.dosage}
                              </span>
                            </td>
                            <td className="font-medium text-slate-700">{med.timing}</td>
                            <td className="font-semibold text-slate-800">{med.duration}</td>
                            <td className="text-slate-600 italic">
                              {med.instructions || "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-6 text-slate-400">
                            No medications recorded on this prescription.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Diagnostic Tests & Advice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testsList.length > 0 && (
                  <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <h5 className="font-black text-xs uppercase text-amber-900 flex items-center gap-1.5">
                        <FileText size={14} className="text-amber-700" />
                        {t("recommendedTests")}
                      </h5>
                      <span className="text-[10px] text-amber-700 font-semibold print:hidden">
                        Diagnostic Center Checklist
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      {testsList.map((test, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!completedTests[idx]}
                            onChange={() => toggleTest(idx)}
                            className="checkbox checkbox-xs checkbox-warning print:hidden"
                          />
                          <span
                            className={`font-semibold ${
                              completedTests[idx] ? "line-through text-slate-400" : "text-slate-800"
                            }`}
                          >
                            • {test}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.advice && (
                  <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200/80 space-y-1.5">
                    <h5 className="font-black text-xs uppercase text-blue-900">
                      {t("doctorAdvice")}
                    </h5>
                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                      {data.advice}
                    </p>
                  </div>
                )}
              </div>

              {/* Digital Authentication Footer & QR Sign-Off */}
              <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
                <div className="space-y-1.5 text-left w-full sm:w-auto">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <ShieldCheck size={16} />
                    Verified Authenticity Seal
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    Token: {data.qr_token}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Authorized digital record issued via Smart Clinic Bangladesh network.
                  </div>
                </div>

                <div className="border-t border-slate-400 pt-2 min-w-[220px] text-center sm:text-right">
                  <div className="font-serif italic text-sm font-bold text-slate-900">
                    Dr. {data.doctor?.full_name}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Authorized Medical Signature
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
