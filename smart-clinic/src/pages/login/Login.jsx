import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import {
  LogIn, Mail, Lock, AlertCircle, CheckCircle2, Eye, EyeOff,
  Smartphone, ShieldCheck, HeartPulse, Clock, UserPlus
} from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getRedirectDestination = (userRole) => {
    const rawFrom = location.state?.from;
    const path = rawFrom?.pathname || (typeof rawFrom === "string" ? rawFrom : null);
    const search = rawFrom?.search || "";
    const targetUrl = path ? `${path}${search}` : "/dashboard";
    if (targetUrl.startsWith("/book") && userRole && userRole !== "PATIENT") {
      return "/dashboard";
    }
    return targetUrl;
  };

  useEffect(() => {
    const savedId = localStorage.getItem("smart_clinic_login_id");
    if (savedId) setLoginId(savedId);
  }, []);

  const isPhoneInput =
    loginId.trim().length > 0 &&
    !loginId.includes("@") &&
    /^[0-9+ \-]+$/.test(loginId.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanId = loginId.trim();
    if (!cleanId || !password) {
      setError(t("loginErrorEmpty"));
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const userInfo = await login(cleanId, password);
      if (rememberMe) {
        localStorage.setItem("smart_clinic_login_id", cleanId);
      } else {
        localStorage.removeItem("smart_clinic_login_id");
      }
      const destination = getRedirectDestination(userInfo?.role);
      setSuccess(
        language === "bn"
          ? `স্বাগতম, ${userInfo?.first_name || "ব্যবহারকারী"}! পুনঃনির্দেশ করা হচ্ছে...`
          : `Welcome back, ${userInfo?.first_name || "User"}! Redirecting...`
      );
      setTimeout(() => navigate(destination, { replace: true }), 700);
    } catch (err) {
      if (typeof err === "string") {
        setError(err);
      } else if (typeof err === "object" && err !== null) {
        setError(Object.values(err).flat().join(" ") || t("loginErrorInvalid"));
      } else {
        setError(t("loginErrorInvalid"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-100/70">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">

        {/* LEFT BRANDING PANEL */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg font-black text-xl">
                <HeartPulse size={22} />
              </div>
              <div>
                <div className="font-black text-lg tracking-tight text-white">Smart Clinic</div>
                <div className="text-[11px] text-slate-400">Bangladesh Digital Healthcare Platform</div>
              </div>
            </div>

            {/* Hero Text */}
            <div className="space-y-2 pt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t("loginLiveStatus")}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {t("loginHeroTitle")}
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("loginHeroSubtitle")}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Smartphone size={14} />
                </div>
                <span>{t("loginFeature1")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                  <Clock size={14} />
                </div>
                <span>{t("loginFeature2")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldCheck size={14} />
                </div>
                <span>{t("loginFeature3")}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <Link to="/privacy" className="hover:text-primary transition-colors underline">
              {t("loginPrivacyLink")}
            </Link>
            <span>© {new Date().getFullYear()} Smart Clinic BD</span>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="lg:col-span-7 p-7 sm:p-10 space-y-6 bg-white flex flex-col justify-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {t("loginTitle")}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t("loginSubtitle")}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error text-white text-xs font-bold rounded-2xl shadow-sm animate-in fade-in flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <div>{error}</div>
                <div className="text-[11px] font-normal opacity-90 mt-1">
                  {t("loginForgotHint")}{" "}
                  <Link to="/forgot-password" className="underline font-bold hover:text-white">
                    {t("loginForgotReset")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success text-white text-xs font-bold rounded-2xl shadow-sm animate-in fade-in flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Phone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                {t("loginEmailLabel")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {isPhoneInput ? <Smartphone size={17} className="text-primary" /> : <Mail size={17} />}
                </div>
                <input
                  name="loginId"
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => { setLoginId(e.target.value); setError(""); }}
                  className="input input-bordered w-full pl-10 bg-slate-50 focus:bg-white text-sm font-medium rounded-xl border-slate-300"
                  placeholder={t("loginEmailPlaceholder")}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                {t("loginPasswordLabel")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={17} />
                </div>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="input input-bordered w-full pl-10 pr-10 bg-slate-50 focus:bg-white text-sm rounded-xl border-slate-300"
                  placeholder={t("loginPasswordPlaceholder")}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox checkbox-primary checkbox-xs rounded-sm"
                />
                <span>{t("loginRememberMe")}</span>
              </label>
              <Link to="/forgot-password" className="text-primary hover:underline font-semibold text-xs transition-colors">
                {t("loginForgotPassword")}
              </Link>
            </div>

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full shadow-md text-white font-extrabold text-sm sm:text-base rounded-xl gap-2 h-11"
              >
                {loading ? (
                  <><span className="loading loading-spinner loading-sm" /> {t("loginLoading")}</>
                ) : (
                  <><LogIn size={18} /> {t("loginBtn")}</>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">{t("loginOr")}</span>
            </div>
          </div>

          {/* Create Account */}
          <div className="text-center">
            <Link
              to="/register"
              className="btn btn-success text-white font-extrabold text-xs sm:text-sm rounded-xl gap-1.5 px-6 h-10 shadow-xs"
            >
              <UserPlus size={16} /> {t("loginCreateAccount")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}