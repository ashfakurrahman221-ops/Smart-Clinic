import React from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Standardized Language Toggle Button
 * Switches smoothly between English and Bengali across all headers.
 */
export default function LanguageToggle({ className = "" }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer ${className}`}
      title={language === "en" ? "বাংলায় দেখুন" : "View in English"}
      aria-label={language === "en" ? "Switch to Bengali" : "Switch to English"}
    >
      <Languages size={15} className="text-[#283891]" />
      <span>{language === "en" ? "বাংলা" : "EN"}</span>
    </button>
  );
}
