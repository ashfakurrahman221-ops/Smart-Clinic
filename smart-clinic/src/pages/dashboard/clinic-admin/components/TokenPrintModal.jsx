import React from "react";
import { Printer } from "lucide-react";

export default function TokenPrintModal({ printTokenData, clinic, onClose }) {
  if (!printTokenData) return null;

  const appointmentId = printTokenData.id || printTokenData.appointment_id || "";
  const patientName =
    printTokenData.family_member?.full_name ||
    printTokenData.patient?.full_name ||
    [printTokenData.patient?.first_name, printTokenData.patient?.last_name].filter(Boolean).join(" ") ||
    printTokenData.patient_name ||
    printTokenData.walk_in_name ||
    "Patient";
  const doctorName =
    printTokenData.doctor?.full_name ||
    printTokenData.doctor_name ||
    "Consultant Doctor";
  const apptDate =
    printTokenData.appointment_date || new Date().toISOString().split("T")[0];
  const apptTime = printTokenData.appointment_time || "General Hours";
  const feeAmount = printTokenData.amount != null ? printTokenData.amount : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print-modal-overlay">
      <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 print-modal-content">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 print:hidden">
          <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <Printer size={15} /> Thermal Token Preview
          </span>
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle cursor-pointer">
            ✕
          </button>
        </div>

        {/* Printable Slip Container */}
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center space-y-3 font-mono text-xs bg-slate-50 print-document thermal-token-slip">
          <div className="space-y-0.5 border-b border-slate-200 pb-2">
            <div className="font-black text-sm uppercase tracking-wide">
              {clinic?.name || "Smart Clinic BD"}
            </div>
            <div className="text-[10px] text-slate-500">
              {clinic?.address || ""}{clinic?.city ? `, ${clinic.city}` : ""}
            </div>
            <div className="text-[10px] text-slate-500">
              Phone: {clinic?.phone || "01700-000000"}
            </div>
          </div>

          <div className="py-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              PATIENT SERIAL TOKEN
            </div>
            <div className="text-5xl font-black text-emerald-600 my-1">
              #{printTokenData.serial_number || 1}
            </div>
            <div className="text-[10px] text-slate-400">
              Date: {apptDate}
            </div>
          </div>

          <div className="text-left space-y-1 bg-white p-3 rounded-xl border border-slate-200 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Patient:</span>
              <span className="font-bold truncate ml-2">
                {patientName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Doctor:</span>
              <span className="font-bold truncate ml-2">
                Dr. {doctorName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fee:</span>
              <span className="font-bold text-emerald-600 font-mono">
                ৳{feeAmount} BDT (PAID)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time:</span>
              <span className="font-bold">{apptTime}</span>
            </div>
          </div>

          {/* Scannable Live Queue QR Code */}
          {appointmentId && (
            <div className="pt-2 border-t border-slate-200 flex flex-col items-center justify-center space-y-1.5">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                  `${window.location.origin}/track-queue/${appointmentId}`
                )}`}
                alt="Track Queue QR"
                className="w-24 h-24 border border-slate-300 rounded-lg p-1 bg-white"
              />
              <span className="text-[10px] font-bold text-emerald-700 tracking-tight">
                Scan QR with Phone to Track Live Queue
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {window.location.origin}/track-queue/{appointmentId.slice(0, 8)}
              </span>
            </div>
          )}

          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
            Please wait in lobby until your serial is called on the TV screen.
          </div>
        </div>

        <div className="flex gap-2 print:hidden">
          {appointmentId && (
            <a
              href={`/track-queue/${appointmentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm flex-1 gap-1 font-bold text-xs"
            >
              <span>Live Preview</span>
            </a>
          )}
          <button
            onClick={() => window.print()}
            className="btn btn-primary btn-sm flex-1 gap-1.5 font-bold shadow-md"
          >
            <Printer size={15} /> Print Slip
          </button>
          <button onClick={onClose} className="btn btn-ghost btn-sm flex-1">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
