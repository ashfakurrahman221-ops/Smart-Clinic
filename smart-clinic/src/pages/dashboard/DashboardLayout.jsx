import React, { useState, useEffect, Suspense, lazy } from "react";
import { NavLink, useLocation } from "react-router";
import { useAuth } from "../../Provider/AuthProvider";
import {
  LayoutDashboard,
  Calendar,
  Stethoscope,
  Building2,
  ShieldCheck,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Hospital,
} from "lucide-react";
import LanguageToggle from "../../components/shared/LanguageToggle";
import NotificationBell from "../../components/shared/NotificationBell";
import { useLanguage } from "../../context/LanguageContext";

const PatientDashboard = lazy(() => import("./PatientDashboard"));
const DoctorDashboard = lazy(() => import("./DoctorDashboard"));
const ClinicAdminDashboard = lazy(() => import("./ClinicAdminDashboard"));
const SuperAdminDashboard = lazy(() => import("./SuperAdminDashboard"));
const ProfileSettings = lazy(() => import("./ProfileSettings"));
const PrivacyPolicy = lazy(() => import("../legal/PrivacyPolicy"));
const ReceptionistPanel = lazy(() => import("./ReceptionistPanel"));

const DashboardLoader = () => (
  <div className="flex flex-col items-center justify-center p-16 text-center">
    <div className="w-10 h-10 border-3 border-[#283891] border-t-transparent rounded-full animate-spin"></div>
    <span className="mt-3 text-xs font-semibold tracking-wider text-slate-500">
      Loading workspace...
    </span>
  </div>
);

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [currentView, setCurrentView] = useState("overview");

  // Sidebar collapse state (desktop)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sc_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("sc_sidebar_collapsed", String(isCollapsed));
    } catch {}
  }, [isCollapsed]);

  // Close mobile drawer on route / hash change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, location.hash]);

  // Handle hash navigation
  useEffect(() => {
    const hash = location.hash?.toLowerCase();
    if (
      hash === "#privacy" ||
      hash === "#terms" ||
      hash === "#security" ||
      hash === "#consent"
    ) {
      setCurrentView("privacy");
    }
  }, [location.hash]);

  const renderDashboardView = () => {
    if (!user) return null;
    let content = null;
    switch (user.role) {
      case "DOCTOR":
        content = <DoctorDashboard />;
        break;
      case "CLINIC_ADMIN":
        content = <ClinicAdminDashboard />;
        break;
      case "ADMIN":
        content = <SuperAdminDashboard />;
        break;
      case "RECEPTIONIST":
        content = <ReceptionistPanel />;
        break;
      case "PATIENT":
      default:
        content = <PatientDashboard />;
        break;
    }
    return <Suspense fallback={<DashboardLoader />}>{content}</Suspense>;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Super Admin
          </span>
        );
      case "CLINIC_ADMIN":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-[#283891] border border-indigo-200">
            Clinic Admin
          </span>
        );
      case "DOCTOR":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Doctor
          </span>
        );
      case "RECEPTIONIST":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Receptionist
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Patient
          </span>
        );
    }
  };

  const { t, language } = useLanguage();

  const getWorkspaceLabel = () => {
    switch (user?.role) {
      case "DOCTOR":
        return language === "bn" ? "ডাক্তার চেম্বার" : "Doctor Chamber";
      case "CLINIC_ADMIN":
        return language === "bn" ? "ক্লিনিক অপারেশনস" : "Clinic Operations";
      case "RECEPTIONIST":
        return language === "bn" ? "অভ্যর্থনা ডেস্ক" : "Reception Desk";
      case "ADMIN":
        return language === "bn" ? "সিস্টেম অ্যাডমিন" : "System Admin";
      case "PATIENT":
      default:
        return language === "bn" ? "রোগী পোর্টাল" : "Patient Portal";
    }
  };

  const navItems = [
    {
      id: "overview",
      label: getWorkspaceLabel(),
      icon: LayoutDashboard,
      onClick: () => {
        setCurrentView("overview");
        setIsMobileOpen(false);
      },
      isActive: currentView === "overview",
    },
    {
      id: "profile",
      label: t("accountSettings") || "Account Settings",
      icon: User,
      onClick: () => {
        setCurrentView("profile");
        setIsMobileOpen(false);
      },
      isActive: currentView === "profile",
    },
    {
      id: "privacy",
      label: language === "bn" ? "প্রাইভেসি ও শর্তাবলী" : "Privacy & Compliance",
      icon: ShieldCheck,
      onClick: () => {
        setCurrentView("privacy");
        setIsMobileOpen(false);
      },
      isActive: currentView === "privacy",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col">
      {/* ── TOP HEADER (RESTRAINED APPLICATION TOPBAR) ── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-16 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between shadow-2xs sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Menu size={20} />
          </button>

          {/* Desktop Collapse Trigger */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 items-center justify-center transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Brand & Title / Role Context */}
          <NavLink
            to="/"
            className="flex items-center gap-2 text-[#283891] hover:opacity-90 transition-opacity shrink-0"
            title="Return to Public Homepage"
          >
            <div className="bg-indigo-50 p-2 rounded-xl text-[#283891] border border-indigo-100">
              <Hospital className="w-4 h-4" />
            </div>
            <span className="font-black text-sm tracking-tight text-[#283891] hidden sm:inline">
              Smart<span className="text-pink-600">Clinic</span>
            </span>
          </NavLink>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-xs text-slate-800 font-bold truncate max-w-[130px] sm:max-w-xs">
              {getWorkspaceLabel()}
            </span>
            <span className="hidden sm:inline-flex">
              {getRoleBadge(user?.role)}
            </span>
          </div>
        </div>

        {/* Right User & Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Language Toggle: Visible on desktop, accessible in drawer on mobile */}
          <LanguageToggle className="hidden sm:inline-flex" />

          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile Quick Chip */}
          <button
            type="button"
            onClick={() => setCurrentView("profile")}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left cursor-pointer"
            title={t("accountSettings") || "Account Settings"}
            aria-label={t("accountSettings") || "Account Settings"}
          >
            <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-[#283891] text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
              {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[100px]">
                {user?.first_name} {user?.last_name}
              </div>
            </div>
          </button>

          {/* Logout Button: Visible on desktop, accessible in drawer on mobile */}
          {typeof logout === "function" && (
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="hidden sm:flex w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 items-center justify-center transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 min-w-0">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xs transition-all duration-200 shrink-0 h-fit sticky top-20 ${
            isCollapsed ? "w-20 p-3" : "w-64 p-5"
          }`}
        >
          {/* User ID Header in Sidebar */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 pb-4 mb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#283891] font-bold flex items-center justify-center text-sm shrink-0">
                {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 truncate">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                    isCollapsed
                      ? "justify-center p-3"
                      : "gap-3 px-3.5 py-2.5 text-left"
                  } ${
                    item.isActive
                      ? "bg-indigo-50/70 text-[#283891] border-l-3 border-[#283891] shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={17} className="shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}

            {/* Patient Discovery Links (Patient workspace only, removed from admin/specialist sidebars per DEF-14) */}
            {user?.role === "PATIENT" && (
              <>
                <NavLink
                  to="/book"
                  title={isCollapsed ? (language === "bn" ? "অ্যাপয়েন্টমেন্ট নিন" : "Book Appointment") : undefined}
                  className={({ isActive }) =>
                    `w-full flex items-center rounded-xl font-semibold text-xs transition-all ${
                      isCollapsed
                        ? "justify-center p-3"
                        : "gap-3 px-3.5 py-2.5 text-left"
                    } ${
                      isActive
                        ? "bg-indigo-50/70 text-[#283891] border-l-3 border-[#283891] font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  <Calendar size={17} className="shrink-0" />
                  {!isCollapsed && <span>{language === "bn" ? "অ্যাপয়েন্টমেন্ট নিন" : "Book Appointment"}</span>}
                </NavLink>

                <div className="pt-2 pb-1">
                  <div className="h-px bg-slate-100" />
                </div>

                <NavLink
                  to="/clinics"
                  title={isCollapsed ? (language === "bn" ? "ক্লিনিক তালিকা" : "Clinics Directory") : undefined}
                  className={({ isActive }) =>
                    `w-full flex items-center rounded-xl font-semibold text-xs transition-all ${
                      isCollapsed
                        ? "justify-center p-3"
                        : "gap-3 px-3.5 py-2.5 text-left"
                    } ${
                      isActive
                        ? "bg-indigo-50/70 text-[#283891] border-l-3 border-[#283891] font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  <Building2 size={17} className="shrink-0" />
                  {!isCollapsed && <span>{language === "bn" ? "ক্লিনিক তালিকা" : "Clinics Directory"}</span>}
                </NavLink>

                <NavLink
                  to="/doctors"
                  title={isCollapsed ? (language === "bn" ? "ডাক্তার তালিকা" : "Doctors Directory") : undefined}
                  className={({ isActive }) =>
                    `w-full flex items-center rounded-xl font-semibold text-xs transition-all ${
                      isCollapsed
                        ? "justify-center p-3"
                        : "gap-3 px-3.5 py-2.5 text-left"
                    } ${
                      isActive
                        ? "bg-indigo-50/70 text-[#283891] border-l-3 border-[#283891] font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  <Stethoscope size={17} className="shrink-0" />
                  {!isCollapsed && <span>{language === "bn" ? "ডাক্তার তালিকা" : "Doctors Directory"}</span>}
                </NavLink>
              </>
            )}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer (Overlay) */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs lg:hidden flex"
            onClick={() => setIsMobileOpen(false)}
          >
            <div
              className="bg-white w-72 max-w-[85vw] h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#283891] text-white font-bold flex items-center justify-center text-xs">
                      {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div>{getRoleBadge(user?.role)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileOpen(false)}
                    aria-label="Close menu"
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Nav Links */}
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-xs transition-colors text-left cursor-pointer min-h-[44px] ${
                          item.isActive
                            ? "bg-indigo-50/70 text-[#283891] font-bold border-l-3 border-[#283891]"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  {user?.role === "PATIENT" && (
                    <>
                      <NavLink
                        to="/book"
                        onClick={() => setIsMobileOpen(false)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-50 min-h-[44px]"
                      >
                        <Calendar size={18} />
                        <span>{language === "bn" ? "অ্যাপয়েন্টমেন্ট নিন" : "Book Appointment"}</span>
                      </NavLink>
                      <div className="pt-2 pb-1">
                        <div className="h-px bg-slate-100" />
                      </div>
                      <NavLink
                        to="/clinics"
                        onClick={() => setIsMobileOpen(false)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-50 min-h-[44px]"
                      >
                        <Building2 size={18} />
                        <span>{language === "bn" ? "ক্লিনিক তালিকা" : "Clinics Directory"}</span>
                      </NavLink>
                      <NavLink
                        to="/doctors"
                        onClick={() => setIsMobileOpen(false)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-50 min-h-[44px]"
                      >
                        <Stethoscope size={18} />
                        <span>{language === "bn" ? "ডাক্তার তালিকা" : "Doctors Directory"}</span>
                      </NavLink>
                    </>
                  )}
                </nav>
              </div>

              {/* Bottom Drawer Actions: Language Switcher & Logout */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between px-1 py-0.5">
                  <span className="text-xs font-semibold text-slate-600">
                    {language === "bn" ? "ভাষা পরিবর্তন" : "Language"}
                  </span>
                  <LanguageToggle />
                </div>
                {typeof logout === "function" && (
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer min-h-[44px]"
                  >
                    <LogOut size={16} />
                    <span>{language === "bn" ? "লগআউট" : "Sign Out"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT OUTLET ── */}
        <main className="flex-1 min-w-0">
          {currentView === "profile" ? (
            <ProfileSettings />
          ) : currentView === "privacy" ? (
            <PrivacyPolicy
              embedded={true}
              initialTab={
                location.hash ? location.hash.replace("#", "") : "privacy"
              }
            />
          ) : (
            renderDashboardView()
          )}
        </main>
      </div>
    </div>
  );
}
