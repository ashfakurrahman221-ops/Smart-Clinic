import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import apiClient from "../../api/axios";
import {
  ShieldCheck, Lock, CreditCard, Smartphone, Building2,
  CheckCircle2, AlertCircle, ArrowLeft, Loader2,
  Calendar, Clock, User, Stethoscope, ExternalLink
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { formatTime, formatCurrency } from "../../utils/formatters";

export default function CheckoutGateway() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const directRes = await apiClient.get(`/payments/${paymentId}/`);
        if (directRes && directRes.id) {
          setPayment(directRes);
          return;
        }
      } catch {
        try {
          const res = await apiClient.get("/payments/");
          const list = res.results || res || [];
          const found = list.find((p) => p.id === paymentId);
          if (found) {
            setPayment(found);
            return;
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [paymentId]);

  const handleProceedSSLCommerz = async () => {
    if (!payment?.appointment?.id) {
      setError(
        language === "bn"
          ? "এই পেমেন্টের জন্য অ্যাপয়েন্টমেন্ট তথ্য পাওয়া যায়নি।"
          : "Appointment information missing for this payment."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await apiClient.post("/payments/initiate-sslcommerz/", {
        appointment_id: payment.appointment.id,
      });

      if (res?.redirect_url) {
        window.location.href = res.redirect_url;
      } else {
        setError(
          language === "bn"
            ? "পেমেন্ট গেটওয়ে সেশন তৈরি করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন বা ক্লিনিকে নগদ পরিশোধ করুন।"
            : "Failed to generate payment gateway session. Please try again or pay at clinic counter."
        );
      }
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.detail ||
            (language === "bn"
              ? "পেমেন্ট গেটওয়ের সাথে সংযোগ স্থাপন করা যায়নি। পুনরায় চেষ্টা করুন।"
              : "Unable to connect to payment gateway. Please try again.");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayAtCounter = () => {
    const aptId = payment?.appointment?.id || "";
    navigate(`/dashboard?booking=success&apt_id=${aptId}`, { replace: true });
  };

  const handleCancel = () => {
    navigate("/dashboard?payment=cancel", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          <span className="text-xs font-bold text-slate-500">
            {language === "bn" ? "পেমেন্ট তথ্য লোড হচ্ছে..." : "Loading Payment Information..."}
          </span>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {language === "bn" ? "পেমেন্ট রেকর্ড পাওয়া যায়নি" : "Payment Record Not Found"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {language === "bn"
              ? "অনুরোধকৃত পেমেন্ট তথ্য লোড করা যায়নি বা মেয়াদ উত্তীর্ণ হয়েছে।"
              : "The requested payment record could not be loaded or may have expired."}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition-colors"
          >
            {language === "bn" ? "ড্যাশবোর্ডে ফিরে যান" : "Return to Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = payment.payment_status === "COMPLETED";
  const apt = payment.appointment || {};

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-5">
        
        {/* Navigation & Encryption Notice */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={15} />
            <span>{language === "bn" ? "ড্যাশবোর্ডে ফিরে যান" : "Return to Dashboard"}</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-bold shadow-2xs">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-1.5 border-b border-slate-100 pb-5">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-2xs border border-emerald-100">
              <CreditCard size={24} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              {language === "bn" ? "নিরাপদ পেমেন্ট পোর্টাল" : "Secure Payment Portal"}
            </h1>
            <p className="text-xs text-slate-500">
              {language === "bn"
                ? "SSLCommerz এর মাধ্যমে আপনার অ্যাপয়েন্টমেন্ট পরামর্শ ফি প্রদান করুন"
                : "Complete your appointment consultation payment via SSLCommerz"}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3.5 rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Already Completed Notice */}
          {isCompleted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
              <div className="font-extrabold text-emerald-900 text-sm sm:text-base">
                {language === "bn" ? "পেমেন্ট সফলভাবে সম্পন্ন হয়েছে" : "Payment Already Completed"}
              </div>
              <p className="text-xs text-emerald-800">
                {language === "bn"
                  ? "এই অ্যাপয়েন্টমেন্ট ফি ইতিমধ্যে যাচাই ও নিশ্চিত করা হয়েছে।"
                  : "This appointment payment has already been verified and confirmed."}
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-2xs"
              >
                {language === "bn" ? "ড্যাশবোর্ডে দেখুন" : "View in Dashboard"}
              </button>
            </div>
          ) : (
            <>
              {/* Appointment Summary Box */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  {language === "bn" ? "অ্যাপয়েন্টমেন্ট বিবরণ" : "Appointment Details"}
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-emerald-700" />
                      <span>{language === "bn" ? "ডাক্তার:" : "Doctor:"}</span>
                    </span>
                    <span className="font-extrabold text-slate-900">
                      Dr. {apt.doctor?.full_name || "Specialist Doctor"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building2 size={14} className="text-emerald-700" />
                      <span>{language === "bn" ? "ক্লিনিক:" : "Clinic:"}</span>
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {apt.clinic?.name || "Smart Clinic"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar size={14} className="text-emerald-700" />
                      <span>{language === "bn" ? "তারিখ ও সময়:" : "Date & Time:"}</span>
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {apt.appointment_date} {apt.appointment_time ? `(${formatTime(apt.appointment_time)})` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <User size={14} className="text-emerald-700" />
                      <span>{language === "bn" ? "সিরিয়াল নম্বর:" : "Serial Number:"}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                      Serial #{apt.serial_number || 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-emerald-50/70 p-4.5 rounded-2xl border border-emerald-200 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-xs text-emerald-900 font-semibold">
                    {language === "bn" ? "মোট পরামর্শ ফি" : "Total Consultation Fee"}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700">BDT Currency (Bangladesh)</div>
                </div>
                <div className="text-2xl font-black text-emerald-800">
                  {formatCurrency(payment.amount)} <span className="text-xs font-bold text-emerald-700">BDT</span>
                </div>
              </div>

              {/* SSLCommerz Supported Gateway Badges */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {language === "bn" ? "গৃহীত ডিজিটাল পেমেন্ট মাধ্যম:" : "Accepted Digital Payment Channels:"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-[#E2136E] text-white rounded-md text-xs font-bold shadow-2xs">bKash</span>
                  <span className="px-2.5 py-1 bg-[#F7941D] text-white rounded-md text-xs font-bold shadow-2xs">Nagad</span>
                  <span className="px-2.5 py-1 bg-[#8C3494] text-white rounded-md text-xs font-bold shadow-2xs">Rocket</span>
                  <span className="px-2.5 py-1 bg-slate-700 text-white rounded-md text-xs font-bold shadow-2xs">Visa / Mastercard</span>
                  <span className="px-2.5 py-1 bg-blue-700 text-white rounded-md text-xs font-bold shadow-2xs">DBBL Nexus</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {language === "bn"
                    ? "লেনদেনগুলো অফিসিয়াল SSLCommerz হোস্টেড পেমেন্ট অবকাঠামোর মাধ্যমে নিরাপদে সম্পন্ন হয়।"
                    : "Transactions are processed securely via SSLCommerz Hosted Payment Infrastructure."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleProceedSSLCommerz}
                  className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all min-h-[46px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{language === "bn" ? "SSLCommerz এর সাথে সংযোগ স্থাপন হচ্ছে..." : "Connecting to SSLCommerz..."}</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink size={16} />
                      <span>{language === "bn" ? "অফিসিয়াল SSLCommerz গেটওয়েতে যান ➔" : "Proceed to Official SSLCommerz Gateway ➔"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handlePayAtCounter}
                  className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                >
                  <Building2 size={15} className="text-emerald-700" />
                  <span>{language === "bn" ? "পরিবর্তে চেম্বার কাউন্টারে নগদ পরিশোধ করুন" : "Pay Cash at Clinic Counter Instead"}</span>
                </button>
              </div>
            </>
          )}

          {/* Security Footer */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><Lock size={12} /> PCI-DSS Level 1</span>
            <span>•</span>
            <span>Bank-Grade Encryption</span>
            <span>•</span>
            <span>SSLCommerz Certified</span>
          </div>

        </div>

      </div>
    </div>
  );
}
