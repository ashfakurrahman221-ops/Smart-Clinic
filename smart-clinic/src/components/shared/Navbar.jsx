import { useState, useEffect, useRef } from "react";
import {
  Hospital,
  LogIn,
  LogOut,
  User,
  UserPlus,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGuestMenu, setShowGuestMenu] = useState(false);

  const mobileMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const guestMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target))
        setShowMobileMenu(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setShowUserMenu(false);
      if (guestMenuRef.current && !guestMenuRef.current.contains(e.target))
        setShowGuestMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    isActive
      ? "bg-[#1e3a8a] text-white px-3.5 py-1.5 rounded-lg font-bold text-sm shadow-sm"
      : "text-slate-600 hover:text-slate-900 px-3 py-1.5 font-medium text-sm transition-colors";

  const navItems = (
    <>
      <li><NavLink to="/" className={navLinkClass}>{t("home")}</NavLink></li>
      <li><NavLink to="/clinics" className={navLinkClass}>{t("clinics")}</NavLink></li>
      <li><NavLink to="/doctors" className={navLinkClass}>{t("doctors")}</NavLink></li>
      {user && (
        <li>
          <NavLink to="/book" className={navLinkClass}>
            {t("bookAppointment")}
          </NavLink>
        </li>
      )}
    </>
  );


  return (
    <header className="navbar bg-white/95 backdrop-blur-md shadow-xs px-4 lg:px-8 border-b border-slate-100 sticky top-0 z-40 transition-colors">
      <div className="navbar-start">
        {/* Mobile hamburger */}
        <div className="relative lg:hidden mr-1" ref={mobileMenuRef}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowMobileMenu((v) => !v)}
            aria-label="Open menu"
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
          {showMobileMenu && (
            <div
              className="absolute left-0 w-56 bg-white rounded-2xl shadow-xl border border-slate-100"
              style={{ top: "calc(100% + 8px)", bottom: "auto", zIndex: 9999 }}
            >
              <ul className="flex flex-col gap-1 p-2">
                {[
                  { to: "/", label: t("home") },
                  { to: "/clinics", label: t("clinics") },
                  { to: "/doctors", label: t("doctors") },
                  ...(user ? [{ to: "/book", label: t("bookAppointment") }] : []),
                ].map(({ to, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={() => setShowMobileMenu(false)}
                      className={({ isActive }) =>
                        isActive
                          ? "block bg-[#1e3a8a] text-white px-4 py-2.5 rounded-xl font-bold text-sm"
                          : "block text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
                      }
                    >
                      {label}
                    </NavLink>
                  </li>
                ))}

              </ul>
            </div>
          )}
        </div>

        <Logo />
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="flex items-center gap-1">{navItems}</ul>
      </div>

      <div className="navbar-end gap-3 items-center">
        {/* Language Toggle */}
        <LanguageToggle />

        {/* Notification Bell */}
        {user && <NotificationBell />}

        {/* User Role Pill & Dashboard / Open Clinic Button */}
        {user ? (
          <div className="hidden md:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs">
              {user.role === "DOCTOR"
                ? "👨‍⚕️ Doctor"
                : user.role === "CLINIC_ADMIN"
                ? "🏥 Clinic Admin"
                : user.role === "RECEPTIONIST"
                ? "👩‍💼 Front Desk"
                : user.role === "ADMIN"
                ? "🛡️ Super Admin"
                : "🧑‍🦱 Patient"}
            </span>
            <NavLink
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] shadow-md shadow-blue-900/15 active:scale-95 transition-all"
            >
              <LayoutDashboard size={14} />
              <span>{t("dashboard")}</span>
            </NavLink>
          </div>
        ) : (
          <NavLink
            to="/register"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] shadow-md shadow-blue-900/15 active:scale-95 transition-all"
          >
            {t("openClinicBtn")}
          </NavLink>
        )}

        {/* User / Guest menu */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              className="btn btn-ghost btn-circle avatar"
              onClick={() => setShowUserMenu((v) => !v)}
              aria-label="User menu"
            >
              <div className="w-9 h-9 rounded-full ring-2 ring-[#1E3A8A] ring-offset-2 flex items-center justify-center bg-[#1E3A8A] text-white font-black text-sm shadow-2xs">
                {user.first_name ? user.first_name[0].toUpperCase() : <User size={18} />}
              </div>
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden"
                style={{ top: "calc(100% + 8px)", bottom: "auto", zIndex: 9999 }}
              >
                <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
                  <div className="font-extrabold text-slate-900 text-sm">{user.first_name} {user.last_name}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
                  <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                    {user.role}
                  </div>
                </div>
                <div className="p-2 flex flex-col gap-1">
                  <NavLink
                    to="/dashboard"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    <LayoutDashboard size={15} className="text-[#1E3A8A]" />
                    <span>{t("dashboard")}</span>
                  </NavLink>
                  <button
                    onClick={() => { setShowUserMenu(false); handleLogout(); }}
                    className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors w-full text-left"
                  >
                    <LogOut size={15} />
                    <span>{t("signOut")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative" ref={guestMenuRef}>
            <button
              className="btn btn-ghost btn-circle border border-slate-200 text-slate-600 hover:text-[#1e3a8a]"
              onClick={() => setShowGuestMenu((v) => !v)}
              aria-label="Sign in"
            >
              <User size={18} />
            </button>
            {showGuestMenu && (
              <div
                className="absolute right-0 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
                style={{ top: "calc(100% + 8px)", bottom: "auto", zIndex: 9999 }}
              >
                <div className="p-2 flex flex-col gap-1">
                  <NavLink
                    to="/login"
                    onClick={() => setShowGuestMenu(false)}
                    className="flex items-center gap-2 text-slate-700 hover:bg-slate-50 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                  >
                    <LogIn size={16} /> {t("signIn")}
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={() => setShowGuestMenu(false)}
                    className="flex items-center gap-2 text-[#1e3a8a] hover:bg-indigo-50 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                  >
                    <UserPlus size={16} /> {t("signUp")}
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
