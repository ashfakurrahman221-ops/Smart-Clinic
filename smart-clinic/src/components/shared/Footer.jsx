import { Hospital, ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200/80 text-slate-600 text-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-14 lg:py-16">
        
        {/* 4 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          
          {/* Brand Column (takes 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-[#2534a5]">
              <div className="bg-indigo-50 p-2 rounded-xl text-[#2534a5] border border-indigo-100">
                <Hospital className="w-5 h-5" />
              </div>
              <span>Smart<span className="text-pink-600">Clinic</span></span>
            </Link>

            <p className="text-slate-500 text-xs sm:text-sm max-w-sm leading-relaxed">
              Connecting clinic owners, practitioners, and patients through a simple, secure, and modern healthcare platform.
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Encrypted Health Records
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-3 h-3" />
                Role-Based Access
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Lock className="w-3 h-3" />
                Audit Logging
              </span>
            </div>
          </div>

          {/* Platform & Solutions */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Platform & Solutions
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-500">
              <li>
                <Link to="/clinics" className="hover:text-indigo-600 transition-colors">
                  Smart Clinic Hub
                </Link>
              </li>
              <li>
                <Link to="/clinics" className="hover:text-indigo-600 transition-colors">
                  Online Appointments
                </Link>
              </li>
              <li>
                <Link to="/queue-display" className="hover:text-indigo-600 transition-colors">
                  Live Queue Screen
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-indigo-600 transition-colors">
                  Patient Portal Access
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-indigo-600 transition-colors">
                  Directory of Doctors
                </Link>
              </li>
            </ul>
          </div>


          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Legal & Compliance
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-500">
              <li>
                <Link to="/privacy" className="hover:text-indigo-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-indigo-600 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/security" className="hover:text-indigo-600 transition-colors">
                  Security Overview
                </Link>
              </li>
              <li>
                <Link to="/privacy#consent" className="hover:text-indigo-600 transition-colors">
                  Consent Agreements
                </Link>
              </li>
            </ul>

          </div>

        </div>

        {/* Bottom Strip */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} Smart Clinic. All rights reserved.
          </div>
          <div className="flex items-center gap-2 font-medium text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cloud Connected Platform</span>
          </div>
        </div>

      </div>
    </footer>
  );
}