import { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Printer,
  X,
  FileText,
  Calendar,
  Building2,
  Languages,
  ShieldAlert
} from "lucide-react";

export default function MedicalReportAIModal({ report, isOpen, onClose }) {
  const [lang, setLang] = useState("bn"); // 'bn' | 'en'

  if (!isOpen || !report) return null;

  const parameters = Array.isArray(report.ai_extracted_parameters)
    ? report.ai_extracted_parameters
    : [];
  const doctorQuestions = Array.isArray(report.ai_doctor_questions)
    ? report.ai_doctor_questions
    : [];

  const riskLevel = report.ai_risk_level || "NORMAL";

  const getRiskBadge = () => {
    switch (riskLevel) {
      case "HIGH_RISK":
        return {
          label: lang === "bn" ? "উচ্চ সতর্কতা প্রয়োজন" : "High Risk / Critical Attention",
          className: "badge-error text-error-content",
          icon: AlertCircle,
        };
      case "ATTENTION_NEEDED":
        return {
          label: lang === "bn" ? "ডাক্তারের পরামর্শ প্রয়োজন" : "Attention Recommended",
          className: "badge-warning text-warning-content",
          icon: AlertTriangle,
        };
      default:
        return {
          label: lang === "bn" ? "স্বাভাবিক ফলাফল" : "Normal Findings",
          className: "badge-success text-success-content",
          icon: CheckCircle2,
        };
    }
  };

  const riskInfo = getRiskBadge();
  const RiskIcon = riskInfo.icon;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-base-100 max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-base-200 space-y-6 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-base-200 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold text-xs px-2.5 py-1 gap-1 border-0 shadow-sm">
                <Sparkles size={12} className="animate-pulse" />
                AI Diagnostic Summary
              </span>
              <span className={`badge font-bold text-xs gap-1 ${riskInfo.className}`}>
                <RiskIcon size={12} />
                {riskInfo.label}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-base-content mt-1">
              {report.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/60 pt-0.5">
              {report.diagnostic_center && (
                <span className="flex items-center gap-1 font-medium">
                  <Building2 size={13} className="text-primary" />
                  {report.diagnostic_center}
                </span>
              )}
              {report.test_date && (
                <span className="flex items-center gap-1 font-medium">
                  <Calendar size={13} className="text-primary" />
                  {report.test_date}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square rounded-full shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Language Switcher Bar */}
        <div className="flex items-center justify-between bg-base-200/50 p-2 rounded-2xl border border-base-200">
          <div className="flex items-center gap-2 text-xs font-bold text-base-content/70 px-2">
            <Languages size={15} className="text-primary" />
            <span>Summary Language:</span>
          </div>
          <div className="join">
            <button
              onClick={() => setLang("bn")}
              className={`btn btn-xs join-item font-bold ${
                lang === "bn" ? "btn-primary shadow-xs" : "btn-ghost"
              }`}
            >
              বাংলা (Bengali)
            </button>
            <button
              onClick={() => setLang("en")}
              className={`btn btn-xs join-item font-bold ${
                lang === "en" ? "btn-primary shadow-xs" : "btn-ghost"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* AI Patient Summary Box */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-base-100 to-purple-500/5 border border-primary/20 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles size={14} />
            <span>{lang === "bn" ? "সহজ ভাষায় ফলাফলের ব্যাখ্যা" : "Key Clinical Overview"}</span>
          </h3>
          <p className="text-sm text-base-content leading-relaxed font-medium">
            {lang === "bn"
              ? report.ai_summary_bn || report.ai_summary_en || "ফলাফল বিশ্লেষণ সম্পন্ন হয়েছে।"
              : report.ai_summary_en || report.ai_summary_bn || "Diagnostic analysis completed."}
          </p>
        </div>

        {/* Extracted Parameters Table */}
        {parameters.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
              <FileText size={14} className="text-primary" />
              <span>Extracted Test Parameters & Normal Ranges</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-base-200">
              <table className="table table-sm w-full text-xs">
                <thead>
                  <tr className="bg-base-200/70 text-base-content/80 font-bold">
                    <th>Parameter Name</th>
                    <th>Result Value</th>
                    <th>Reference Range</th>
                    <th>Clinical Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200">
                  {parameters.map((param, idx) => {
                    const isAbnormal = param.status === "HIGH" || param.status === "LOW" || param.status === "CRITICAL";
                    return (
                      <tr
                        key={idx}
                        className={isAbnormal ? "bg-amber-500/5 hover:bg-amber-500/10" : "hover:bg-base-200/40"}
                      >
                        <td className="font-bold text-base-content py-2.5">
                          {param.parameter}
                        </td>
                        <td className="py-2.5">
                          <span className={`font-black ${isAbnormal ? "text-error" : "text-base-content"}`}>
                            {param.value}
                          </span>{" "}
                          <span className="text-[11px] text-base-content/50">{param.unit}</span>
                        </td>
                        <td className="text-base-content/60 py-2.5 font-mono text-[11px]">
                          {param.reference_range || "--"}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`badge badge-xs font-bold ${
                              param.status === "CRITICAL"
                                ? "badge-error text-error-content animate-pulse"
                                : param.status === "HIGH"
                                ? "badge-error text-error-content"
                                : param.status === "LOW"
                                ? "badge-warning text-warning-content"
                                : "badge-success text-success-content"
                            }`}
                          >
                            {param.flag || param.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Doctor Questions Checklist */}
        {doctorQuestions.length > 0 && (
          <div className="p-5 rounded-2xl bg-base-200/50 border border-base-200 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-base-content/80 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-secondary" />
              <span>
                {lang === "bn"
                  ? "ডাক্তারকে যেসব প্রশ্ন করতে পারেন (Doctor Consultation Tips)"
                  : "Recommended Questions for Your Doctor"}
              </span>
            </h3>
            <ul className="space-y-2">
              {doctorQuestions.map((q, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-base-content/90 font-medium"
                >
                  <span className="w-5 h-5 rounded-full bg-secondary/15 text-secondary font-black flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Medical Disclaimer Note */}
        <div className="p-4 rounded-2xl bg-base-200/30 border border-base-200 flex items-start gap-3 text-xs text-base-content/60 leading-relaxed">
          <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p>
            <strong>Medical Notice:</strong> This analysis is an AI-generated informational summary intended to help you understand your laboratory report. It does NOT replace a clinical diagnosis by a certified medical practitioner. Always consult your doctor before modifying medication or diet.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-base-200">
          {report.file_url ? (
            <a
              href={report.file_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm rounded-xl text-xs gap-1.5 font-bold"
            >
              <ExternalLink size={13} />
              <span>Original Document</span>
            </a>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn btn-ghost btn-sm rounded-xl text-xs font-bold gap-1.5"
            >
              <Printer size={14} />
              <span>Print Summary</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-primary btn-sm rounded-xl text-xs font-bold px-5"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
