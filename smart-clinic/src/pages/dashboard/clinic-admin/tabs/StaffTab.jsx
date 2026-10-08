import React from "react";
import {
  Users,
  Plus,
  RefreshCw,
  ShieldCheck,
  DollarSign,
  Lock,
  Trash2,
} from "lucide-react";

export default function StaffTab({
  staffList = [],
  loadingStaff,
  fetchStaffData,
  staffAttendanceList = [],
  staffModalOpen,
  setStaffModalOpen,
  staffForm,
  setStaffForm,
  submittingStaff,
  handleAddStaff,
  loginModalOpen,
  setLoginModalOpen,
  selectedStaffForLogin,
  setSelectedStaffForLogin,
  loginForm,
  setLoginForm,
  submittingLogin,
  handleCreateLoginSubmit,
  handleOpenCreateLogin,
  handleDeleteStaff,
  staffMonthlySummary,
  selectedStaffMonth,
  setSelectedStaffMonth,
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-base-100 p-6 rounded-3xl border border-base-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-primary w-6 h-6" />
            <h2 className="text-xl font-black text-base-content">
              Staff &amp; HR Management
            </h2>
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            Manage clinic receptionists, compounders, helpers, and cleaners. Track monthly attendance, payroll budgets, and assign front-desk access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStaffModalOpen(true)}
            className="btn btn-primary btn-sm font-bold shadow-md gap-1.5 cursor-pointer"
          >
            <Plus size={16} /> Add Staff Member
          </button>
          <button
            onClick={() => fetchStaffData()}
            className="btn btn-ghost btn-sm gap-1 cursor-pointer"
            title="Refresh staff data"
          >
            <RefreshCw size={14} className={loadingStaff ? "animate-spin text-primary" : ""} />
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs text-base-content/60 font-semibold uppercase">
              Total Staff
            </span>
            <div className="text-2xl font-black text-base-content">
              {staffList.length}
            </div>
          </div>
        </div>

        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-bold text-lg">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-xs text-base-content/60 font-semibold uppercase">
              Receptionists
            </span>
            <div className="text-2xl font-black text-base-content">
              {staffList.filter((s) => s.role === "RECEPTIONIST").length}
            </div>
          </div>
        </div>

        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs text-base-content/60 font-semibold uppercase">
              Present Today
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {staffAttendanceList.filter((a) => a.status === "PRESENT").length}
            </div>
          </div>
        </div>

        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-lg">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-xs text-base-content/60 font-semibold uppercase">
              Monthly Payroll Budget
            </span>
            <div className="text-2xl font-black text-indigo-600 font-mono">
              ৳{staffMonthlySummary?.total_monthly_payroll ? staffMonthlySummary.total_monthly_payroll.toLocaleString() : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Staff Roster Cards */}
      <div className="bg-base-100 p-6 rounded-3xl border border-base-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-extrabold text-base flex items-center gap-2 text-base-content">
            <span>Active Personnel &amp; Monthly Performance</span>
            <span className="badge badge-sm badge-neutral">{staffList.length}</span>
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base-content/60 font-semibold">Attendance Month:</span>
            <input
              type="month"
              value={selectedStaffMonth || ""}
              onChange={(e) => {
                if (setSelectedStaffMonth) setSelectedStaffMonth(e.target.value);
                if (fetchStaffData) fetchStaffData(e.target.value);
              }}
              className="input input-xs input-bordered rounded-lg font-mono font-bold"
            />
          </div>
        </div>

        {loadingStaff ? (
          <div className="flex items-center justify-center py-12 text-sm text-base-content/60">
            <span className="loading loading-spinner loading-md text-primary mr-2" />
            Loading staff roster...
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-12 text-sm text-base-content/50">
            No staff members added yet. Click &quot;Add Staff Member&quot; to assign receptionists, helpers, or cleaners.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((staff) => {
              const att = staffAttendanceList.find(
                (a) => String(a.staff) === String(staff.id)
              );
              const mSummary = staffMonthlySummary?.staff_summaries?.find(
                (s) => String(s.staff_id) === String(staff.id)
              );

              return (
                <div
                  key={staff.id}
                  className="p-5 rounded-2xl border border-base-200 hover:border-primary/40 transition-all bg-base-100 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-base-content">
                        {staff.name}
                      </h4>
                      <span className="badge badge-sm badge-outline font-semibold mt-1">
                        {staff.role_display || staff.role}
                      </span>
                    </div>
                    {att?.status === "PRESENT" && (
                      <span className="badge badge-success badge-xs text-white font-bold">
                        Today: Present ✓
                      </span>
                    )}
                    {att?.status === "LATE" && (
                      <span className="badge badge-warning badge-xs text-white font-bold">
                        Today: Late
                      </span>
                    )}
                    {att?.status === "ABSENT" && (
                      <span className="badge badge-error badge-xs text-white font-bold">
                        Today: Absent
                      </span>
                    )}
                    {!att?.status && (
                      <span className="badge badge-ghost badge-xs text-base-content/40">
                        No Check-in
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-base-content/60 space-y-1.5 pt-1">
                    <div>📞 {staff.phone || "No phone number"}</div>
                    <div className="flex items-center gap-1 font-mono text-base-content/80">
                      💰 <strong>Salary:</strong> ৳{staff.monthly_salary ? parseFloat(staff.monthly_salary).toLocaleString() : "0"} BDT/mo
                    </div>
                    {mSummary && (
                      <div className="bg-base-200/50 p-2 rounded-xl text-[11px] space-y-1 border border-base-200">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-base-content/70">Month Attendance:</span>
                          {mSummary.total_logged_days > 0 && mSummary.attendance_rate !== null && mSummary.attendance_rate !== undefined ? (
                            <span className={`font-bold ${mSummary.attendance_rate >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                              {mSummary.attendance_rate}%
                            </span>
                          ) : (
                            <span className="font-medium text-base-content/40">No records yet</span>
                          )}
                        </div>
                        <div className="text-base-content/50 text-[10px] flex gap-2">
                          <span>{mSummary.presents || 0} Present</span>
                          <span>•</span>
                          <span>{mSummary.lates || 0} Late</span>
                          <span>•</span>
                          <span>{mSummary.absents || 0} Absent</span>
                        </div>
                      </div>
                    )}
                    {staff.user_email && (
                      <div className="text-primary font-medium flex items-center gap-1 truncate pt-0.5">
                        <Lock size={12} /> Login: {staff.user_email}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-base-200 flex items-center justify-between gap-2">
                    {staff.role === "RECEPTIONIST" &&
                      (staff.user_email ? (
                        <span className="badge badge-success badge-sm text-white font-bold gap-1">
                          ✓ Portal Access Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenCreateLogin(staff)}
                          className="btn btn-xs btn-primary font-bold gap-1 cursor-pointer"
                        >
                          <Lock size={12} /> Create Login
                        </button>
                      ))}
                    <button
                      onClick={() => handleDeleteStaff(staff.id)}
                      className="btn btn-xs btn-ghost text-error ml-auto cursor-pointer"
                      title="Deactivate staff member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* ADD STAFF MODAL */}
      {staffModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md rounded-3xl p-6">
            <h3 className="font-black text-lg text-base-content flex items-center gap-2 mb-4">
              <Plus className="text-primary" /> Add Staff Member
            </h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="label text-xs font-bold">Staff Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahela Begum"
                  value={staffForm.name}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, name: e.target.value })
                  }
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div>
                <label className="label text-xs font-bold">Staff Role *</label>
                <select
                  value={staffForm.role}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, role: e.target.value })
                  }
                  className="select select-bordered w-full"
                  required
                >
                  <option value="RECEPTIONIST">Receptionist (Front Desk)</option>
                  <option value="COMPOUNDER">Compounder / Dresser</option>
                  <option value="HELPER">Chamber Helper</option>
                  <option value="CLEANER">Clinic Cleaner</option>
                  <option value="SECURITY">Security Guard</option>
                  <option value="MANAGER">Clinic Floor Manager</option>
                </select>
              </div>

              <div>
                <label className="label text-xs font-bold">Phone Number</label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={staffForm.phone}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, phone: e.target.value })
                  }
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label className="label text-xs font-bold">Monthly Salary (BDT)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/50 font-bold">
                    ৳
                  </span>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={staffForm.monthly_salary || ""}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        monthly_salary: e.target.value,
                      })
                    }
                    className="input input-bordered w-full pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold">
                  Duty Notes / Assigned Area
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground floor counter 1"
                  value={staffForm.notes}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, notes: e.target.value })
                  }
                  className="input input-bordered w-full text-xs"
                />
              </div>

              <div className="modal-action pt-2">
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="btn btn-primary btn-sm font-bold shadow-md cursor-pointer"
                >
                  {submittingStaff ? "Adding..." : "Add Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE RECEPTIONIST LOGIN MODAL */}
      {loginModalOpen && selectedStaffForLogin && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md rounded-3xl p-6 space-y-4">
            <h3 className="font-black text-lg text-base-content flex items-center gap-2">
              <Lock className="text-primary" /> Create Receptionist Login
            </h3>
            <p className="text-xs text-base-content/70">
              Assign login credentials for <strong>{selectedStaffForLogin.name}</strong>. They will use this to sign in to the Receptionist Counter Desk.
            </p>

            <form onSubmit={handleCreateLoginSubmit} className="space-y-4">
              <div>
                <label className="label text-xs font-bold">Login Email *</label>
                <input
                  type="email"
                  placeholder="e.g. rahela@clinic.internal"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div>
                <label className="label text-xs font-bold">
                  Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  placeholder="Set strong temporary password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  className="input input-bordered w-full"
                  minLength={6}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-base-200/60 text-xs text-base-content/70">
                💡 After creating, the receptionist can log in on any counter device with these credentials.
              </div>

              <div className="modal-action pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginModalOpen(false);
                    setSelectedStaffForLogin(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLogin}
                  className="btn btn-primary btn-sm font-bold shadow-md cursor-pointer"
                >
                  {submittingLogin ? "Creating..." : "✓ Create Login Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
