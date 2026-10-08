import {
  Building2,
  UserRound,
  ArrowRight,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../Provider/AuthProvider";

export default function RoleSection() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const clinicFeatures = [
    t("clinicFeature1"),
    t("clinicFeature2"),
    t("clinicFeature3"),
    t("clinicFeature4"),
    t("clinicFeature5"),
  ];

  const patientFeatures = [
    t("patientFeature1"),
    t("patientFeature2"),
    t("patientFeature3"),
    t("patientFeature4"),
    t("patientFeature5"),
  ];

  return (
    <section className="py-20 lg:py-24 bg-slate-50/60 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 mb-3">
            {t("dualPortalsBadge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            {t("chooseYourJourney")}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-500 font-normal">
            {t("chooseYourJourneySubtitle")}
          </p>
        </div>

        {/* Dual Portals Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto">
          
          {/* Clinic Owner Card */}
          <div className="relative bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            {/* Top highlight bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Building2 className="w-7 h-7" />
                </div>
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                  {t("forProviders")}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-6 tracking-tight">
                {t("clinicOwner")}
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-500 leading-relaxed">
                {t("clinicOwnerDesc")}
              </p>

              {/* Checklist */}
              <ul className="mt-7 space-y-3.5">
                {clinicFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base font-semibold text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 fill-blue-50" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mt-10">
              <Link
                to={user ? "/dashboard" : "/register"}
                className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-white bg-[#2534a5] hover:bg-[#1a2578] shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all text-base group cursor-pointer"
              >
                <span>{t("openClinicBtn")}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Patient Card */}
          <div className="relative bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            {/* Top highlight bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 to-rose-600" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <UserRound className="w-7 h-7" />
                </div>
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-pink-50 text-pink-700 border border-pink-100">
                  {t("forPatients")}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-6 tracking-tight">
                {t("patient")}
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-500 leading-relaxed">
                {t("patientDesc")}
              </p>

              {/* Checklist */}
              <ul className="mt-7 space-y-3.5">
                {patientFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base font-semibold text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-pink-600 shrink-0 fill-pink-50" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mt-10">
              <Link
                to={user ? "/clinics" : "/register"}
                className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-lg shadow-pink-600/25 active:scale-[0.98] transition-all text-base group cursor-pointer"
              >
                <span>{t("becomePatientBtn")}</span>
                <Heart className="w-4 h-4 transition-transform group-hover:scale-125 fill-white/20" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}