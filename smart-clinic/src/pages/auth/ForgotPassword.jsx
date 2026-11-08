import { useState } from "react";
import { Link } from "react-router";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import apiClient from "../../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post("/accounts/forgot-password/", { email: cleanEmail });
      setMessage(
        res?.detail ||
          "If an account exists for this email, password reset instructions have been sent."
      );
      setSubmitted(true);
    } catch (err) {
      if (typeof err === "string") {
        setError(err);
      } else if (typeof err === "object" && err !== null) {
        const msg = Object.values(err).flat().join(" ") || "Failed to process request.";
        setError(msg);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100/70">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10">
        {/* Header Icon */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-inner">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Forgot Password
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Enter the email address associated with your Smart Clinic account to receive a secure password reset link.
          </p>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="mt-8 space-y-6 animate-in fade-in">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Instructions Sent</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-700">
                {message}
              </p>
              <p className="text-[11px] text-emerald-600/90 pt-1">
                The reset link will expire in 1 hour. Be sure to check your spam or junk folder if you don't see it shortly.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="btn btn-outline btn-sm w-full rounded-xl text-xs font-bold"
              >
                Send Another Request
              </button>
              <Link
                to="/login"
                className="btn btn-primary w-full shadow-md text-white font-bold text-sm rounded-xl gap-2 h-11 flex items-center justify-center"
              >
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="alert alert-error text-white text-xs font-bold rounded-2xl shadow-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={17} />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="input input-bordered w-full pl-10 bg-slate-50 focus:bg-white text-sm font-medium rounded-xl border-slate-300"
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full shadow-md text-white font-extrabold text-sm rounded-xl gap-2 h-11"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </div>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary font-semibold transition-colors"
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
