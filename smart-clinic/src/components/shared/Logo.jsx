import React from "react";
import { Link } from "react-router";
import { Hospital } from "lucide-react";

/**
 * Exact canonical logo matching the landing page:
 * - Container: bg-indigo-50 p-1.5 rounded-xl border border-indigo-100 text-[#1e3a8a]
 * - Icon: w-5 h-5
 * - Typography: text-xl font-black tracking-tight text-[#1e3a8a]
 * - Clinic span: text-[#0d9488]
 */
export default function Logo({
  to = "/",
  className = "",
  showTextOnMobile = true,
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 text-xl font-black tracking-tight text-[#1e3a8a] hover:opacity-90 transition-opacity shrink-0 ${className}`}
      title="Smart Clinic"
    >
      <div className="bg-indigo-50 p-1.5 rounded-xl text-[#1e3a8a] border border-indigo-100 shrink-0">
        <Hospital className="w-5 h-5" />
      </div>
      <span className={showTextOnMobile ? "inline" : "hidden sm:inline"}>
        Smart<span className="text-[#0d9488]">Clinic</span>
      </span>
    </Link>
  );
}
