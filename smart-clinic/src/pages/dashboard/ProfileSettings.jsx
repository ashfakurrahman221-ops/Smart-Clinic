import { useState, useEffect } from "react";
import apiClient from "../../api/axios";
import { useAuth } from "../../Provider/AuthProvider";
import { User, Phone, Lock, Save, KeyRound, CheckCircle2, AlertCircle, Loader } from "lucide-react";

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  });

  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileMsg("");

    if (formData.phone) {
      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      const cleaned = formData.phone.replace(/[\s\-]/g, "");
      const normalized = cleaned.startsWith("+880")
        ? "0" + cleaned.slice(4)
        : cleaned.startsWith("880")
        ? "0" + cleaned.slice(3)
        : cleaned;

      if (!bdPhoneRegex.test(normalized)) {
        setProfileError("Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678).");
        return;
      }
    }

    setSavingProfile(true);
    try {
      const updated = await apiClient.patch("/accounts/me/", formData);
      if (updateUser) {
        updateUser(updated);
      }
      setProfileMsg("Profile updated successfully!");
    } catch (err) {
      setProfileError(
        typeof err === "object"
          ? Object.values(err).flat().join(" ") || "Failed to update profile."
          : err || "Failed to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (passwordData.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.post("/accounts/change-password/", {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      setPasswordMsg("Password changed successfully! Use your new password for your next login.");
      setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPasswordError(
        typeof err === "object"
          ? Object.values(err).flat().join(" ") || "Failed to change password. Check old password."
          : err || "Failed to change password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-base-100 p-6 rounded-3xl border border-base-200 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-content font-black text-2xl flex items-center justify-center shadow-md">
            {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-base-content">
              {user?.first_name} {user?.last_name}
            </h1>
            <p className="text-sm text-base-content/60">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-primary badge-sm font-bold uppercase">{user?.role}</span>
              <span className="text-xs text-base-content/40">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB") : "2026"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-base-100 p-6 rounded-3xl border border-base-200 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-base-200">
            <User className="text-primary" size={20} />
            <h2 className="text-lg font-bold text-base-content">Personal Details</h2>
          </div>

          {profileMsg && (
            <div className="alert alert-success text-xs py-2 px-3 shadow-xs flex items-center gap-2">
              <CheckCircle2 size={16} /> {profileMsg}
            </div>
          )}

          {profileError && (
            <div className="alert alert-error text-xs py-2 px-3 shadow-xs flex items-center gap-2">
              <AlertCircle size={16} /> {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="label text-xs font-bold text-base-content/70">Email Address (Read-Only)</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="input input-bordered w-full bg-base-200/50 cursor-not-allowed text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs font-bold text-base-content/70">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="input input-bordered w-full text-sm"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="label text-xs font-bold text-base-content/70">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="input input-bordered w-full text-sm"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="label text-xs font-bold text-base-content/70 flex items-center gap-1">
                <Phone size={13} className="text-primary" /> Contact Number (Bangladesh)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input input-bordered w-full text-sm"
                placeholder="e.g. 01712345678"
              />
              <p className="text-[11px] text-base-content/50 mt-1">Used for appointment confirmations & SMS queue alerts.</p>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn btn-primary w-full shadow-md gap-2 mt-2"
            >
              {savingProfile ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              Save Profile Changes
            </button>
          </form>
        </div>

        <div className="bg-base-100 p-6 rounded-3xl border border-base-200 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-base-200">
            <Lock className="text-secondary" size={20} />
            <h2 className="text-lg font-bold text-base-content">Change Password</h2>
          </div>

          {passwordMsg && (
            <div className="alert alert-success text-xs py-2 px-3 shadow-xs flex items-center gap-2">
              <CheckCircle2 size={16} /> {passwordMsg}
            </div>
          )}

          {passwordError && (
            <div className="alert alert-error text-xs py-2 px-3 shadow-xs flex items-center gap-2">
              <AlertCircle size={16} /> {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="label text-xs font-bold text-base-content/70">Current Password</label>
              <input
                type="password"
                required
                value={passwordData.old_password}
                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                className="input input-bordered w-full text-sm"
                placeholder="Enter existing password"
              />
            </div>

            <div>
              <label className="label text-xs font-bold text-base-content/70">New Password (min. 8 characters)</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="input input-bordered w-full text-sm"
                placeholder="Enter new strong password"
              />
            </div>

            <div>
              <label className="label text-xs font-bold text-base-content/70">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="input input-bordered w-full text-sm"
                placeholder="Re-type new password"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="btn btn-secondary w-full shadow-md gap-2 mt-2"
            >
              {savingPassword ? <Loader size={16} className="animate-spin" /> : <KeyRound size={16} />}
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
