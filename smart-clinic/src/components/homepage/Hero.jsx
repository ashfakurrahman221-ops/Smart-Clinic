import {
  CalendarCheck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Search,
  Clock,
  Bell,
  Building2,
  Check,
} from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../Provider/AuthProvider";

export default function Hero() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden pt-10 pb-20 lg:pt-14 lg:pb-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-100">
      {/* Background subtle radial ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-fuchsia-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50/90 text-indigo-700 border border-indigo-100 shadow-sm mb-6 hover:bg-indigo-100/80 transition-colors">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>{t("heroBadge")}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              <span>{t("heroTitle1")}</span>
              <br />
              <span>{t("heroTitle2")}</span>
              <br />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                {t("heroTitle3").replace(".", "")}
              </span>
              <span className="text-fuchsia-600">.</span>
            </h1>

            {/* Subtitle Description */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              {t("heroSubtitle")}
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
              <Link
                to={user ? "/dashboard" : "/register"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white bg-[#2534a5] hover:bg-[#1c2885] active:scale-[0.98] shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all duration-200 text-sm sm:text-base group cursor-pointer"
              >
                <span>{t("openYourClinic")}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/clinics"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm active:scale-[0.98] transition-all duration-200 text-sm sm:text-base hover:border-slate-300"
              >
                <Search className="w-4 h-4 text-slate-400" />
                <span>{t("findClinic")}</span>
              </Link>
            </div>

            {/* Trust Badges Row */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
                <span>{t("onlineBookingBadge")}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span>{t("secureDataBadge")}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span>{t("uptimeBadge")}</span>
              </div>
            </div>

            {/* Social Proof Practitioners & Rating */}
            <div className="mt-8 flex flex-wrap items-center gap-4 bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="flex -space-x-2.5 overflow-hidden">
                {[
                  "https://randomuser.me/api/portraits/women/44.jpg",
                  "https://randomuser.me/api/portraits/men/32.jpg",
                  "https://randomuser.me/api/portraits/women/68.jpg",
                  "https://randomuser.me/api/portraits/men/75.jpg",
                ].map((src, i) => (
                  <img
                    key={i}
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-white object-cover shadow-sm"
                    src={src}
                    alt="Doctor avatar"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ))}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400 text-xs tracking-tight">
                    {"★".repeat(5)}
                  </div>
                  <span className="text-xs font-black text-slate-800">4.9/5</span>
                </div>
                <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  {t("trustedByPractitioners")}
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Live Clinic Console Interactive Mockup Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              
              {/* Decorative background blur glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 rounded-[2.5rem] opacity-20 blur-xl"></div>

              {/* Main Card Container */}
              <div className="relative bg-white rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-100/80 border border-slate-100 flex flex-col gap-5">
                
                {/* Clinic Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#2534a5] text-white flex items-center justify-center shadow-md shadow-indigo-900/20">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base leading-tight">Metro Health Hub</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[11px] font-medium text-emerald-600">Live Queue on Screen</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-100">
                    ACTIVE
                  </span>
                </div>

                {/* Current Consultation Box */}
                <div className="space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-1">
                    Current Consultation
                  </div>
                  <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120"
                        alt="Dr. Sarah Jenkins"
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
                      />
                      <div className="truncate">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          Dr. Sarah Jenkins
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                          Cardiology Specialist
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Confirmed
                      </span>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        10:30 AM • Room 04
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Metric Stats */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-blue-50/70 border border-blue-100/80 rounded-2xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-tight">
                      Today's Visits
                    </div>
                    <div className="text-xl font-black text-blue-800 mt-1">38</div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-tight">
                      Avg Wait
                    </div>
                    <div className="text-xl font-black text-emerald-700 mt-1">6 min</div>
                  </div>

                  <div className="bg-rose-50/70 border border-rose-100/80 rounded-2xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-tight">
                      Open Slots
                    </div>
                    <div className="text-xl font-black text-rose-600 mt-1">14</div>
                  </div>
                </div>

                {/* Next available & Quick Book */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Next available: <strong className="text-slate-800 font-bold">11:30 AM</strong></span>
                  </div>
                  <Link
                    to={user ? "/book" : "/register"}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2534a5] hover:bg-[#1c2885] shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    {t("quickBook")}
                  </Link>
                </div>

                {/* Floating Notification Toast */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-100 shadow-xl shadow-slate-200/60 flex items-center justify-between gap-3 transform -translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Appointment Reminder Sent
                      </div>
                      <div className="text-[10px] text-slate-500">
                        SMS notification dispatched to (+1) 555-014...
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    9s ago
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}