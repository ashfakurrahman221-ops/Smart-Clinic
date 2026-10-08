import { Link } from "react-router";
import { Check } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../Provider/AuthProvider";

export default function CTA() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        
        {/* Main Banner */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#1c278a] via-[#2a37ad] to-[#6c1b7a] px-6 py-16 sm:px-12 sm:py-20 text-center text-white shadow-2xl shadow-indigo-900/30">
          
          {/* Subtle decorative glow circles */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-fuchsia-400/20 blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="relative z-10 inline-block px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-white/10 border border-white/20 backdrop-blur-md mb-6">
            JOIN THE FUTURE OF HEALTH
          </div>

          {/* Headline */}
          <h2 className="relative z-10 text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
            {t("readyToModernize")}
          </h2>

          {/* Subtitle */}
          <p className="relative z-10 mt-4 text-base sm:text-lg text-indigo-100/90 max-w-xl mx-auto font-medium">
            {t("readyToModernizeSubtitle")}
          </p>

          {/* Action Buttons */}
          <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={user ? "/dashboard" : "/register"}
              className="px-8 py-3.5 rounded-xl font-extrabold text-[#1c278a] bg-white hover:bg-slate-100 shadow-xl active:scale-[0.98] transition-all text-sm sm:text-base cursor-pointer"
            >
              {t("getStarted")}
            </Link>

            <Link
              to="/clinics"
              className="px-8 py-3.5 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-md active:scale-[0.98] transition-all text-sm sm:text-base"
            >
              {t("requestDemo")}
            </Link>
          </div>

          {/* Trust Guarantees Row */}
          <div className="relative z-10 mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm font-medium text-indigo-100/90">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
              {t("noCardRequired")}
            </span>
            <span className="text-white/40">•</span>
            <span>{t("freeTrial")}</span>
            <span className="text-white/40">•</span>
            <span>{t("hipaaCompliant")}</span>
          </div>

        </div>

      </div>
    </section>
  );
}