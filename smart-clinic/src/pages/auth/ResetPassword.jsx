import { useState } from "react";
import { useParams, Link } from "react-router";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import apiClient from "../../api/axios";

export default function ResetPassword() {
  const { uid, token } = useParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const hasParams = Boolean(uid && token);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasParams) {
      setError("Invalid or missing password reset link parameters.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiClient.post("/accounts/reset-password/", {
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      if (typeof err === "string") {
        setError(err);
      } else if (typeof err === "object" && err !== null) {
        const msg = Object.values(err).flat().join(" ") || "Failed to reset password.";
        setError(msg);
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
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
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Set New Password
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please enter your new password below. It must be at least 8 characters long.
          </p>
        </div>

        {/* Missing Parameters Guard */}
        {!hasParams && !success ? (
          <div className="mt-8 space-y-5">
            <div className="alert alert-warning text-slate-800 text-xs font-semibold rounded-2xl shadow-sm flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
              <div>
                <div className="font-bold">Missing Reset Token</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  This reset link appears incomplete or malformed. Please click the full link sent to your email or request a new one.
                </div>
              </div>
            </div>
            <Link
              to="/forgot-password"
              className="btn btn-primary w-full shadow-md text-white font-bold text-sm rounded-xl gap-2 h-11 flex items-center justify-center"
            >
              Request New Reset Link
            </Link>
          </div>
        ) : success ? (
          /* Success State */
          <div className="mt-8 space-y-6 animate-in fade-in">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 text-center">
              <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
              <h2 className="font-extrabold text-base text-emerald-900">
                Password Reset Successfully!
              </h2>
              <p className="text-xs leading-relaxed text-emerald-700">
                Your account password has been updated. You can now securely log in with your new password.
              </p>
            </div>

            <Link
              to="/login"
              className="btn btn-primary w-full shadow-md text-white font-extrabold text-sm rounded-xl gap-2 h-11 flex items-center justify-center"
            >
              Login Now <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="alert alert-error text-white text-xs font-bold rounded-2xl shadow-sm flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{error}</span>
                  {error.toLowerCase().includes("expired") || error.toLowerCase().includes("invalid") ? (
                    <div className="pt-1.5">
                      <Link
                        to="/forgot-password"
                        className="underline hover:text-white/80 text-[11px] font-semibold"
                      >
                        Request a fresh reset link &rarr;
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={17} />
                </div>
                <input
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  className="input input-bordered w-full pl-10 pr-10 bg-slate-50 focus:bg-white text-sm rounded-xl border-slate-300"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={17} />
                </div>
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  className="input input-bordered w-full pl-10 bg-slate-50 focus:bg-white text-sm rounded-xl border-slate-300"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
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
                  "Reset Password"
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
