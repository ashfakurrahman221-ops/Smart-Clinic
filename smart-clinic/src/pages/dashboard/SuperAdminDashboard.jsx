import { useState, useEffect } from "react";
import apiClient from "../../api/axios";
import {
  Building2, Stethoscope, Layers, Plus, CheckCircle2, AlertCircle,
  Award, ShieldCheck, Users, Calendar, TrendingUp, Globe,
  Link as LinkIcon, Info, MapPin, Clock, Activity, FileCheck, XCircle, ExternalLink
} from "lucide-react";
import { formatDoctorName } from "../../utils/formatters";

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Forms
  const [newDept, setNewDept] = useState({ name: "", description: "" });
  const [newSpec, setNewSpec] = useState({ name: "", description: "" });
  const [assignForm, setAssignForm] = useState({
    doctor_id: "", clinic_id: "", department_id: "", consultation_fee: "", room_number: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, dRes, deptRes, specRes, aptRes] = await Promise.all([
        apiClient.get("/clinics/"),
        apiClient.get("/doctors/"),
        apiClient.get("/clinics/departments/"),
        apiClient.get("/doctors/specializations/"),
        apiClient.get("/appointments/"),
      ]);
      setClinics(cRes.results || cRes || []);
      setDoctors(dRes.results || dRes || []);
      setDepartments(deptRes.results || deptRes || []);
      setSpecializations(specRes.results || specRes || []);
      setAppointments(aptRes.results || aptRes || []);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };
  const showErr = (e) => { setError(e); setTimeout(() => setError(""), 5000); };

  const handleVerifyClinic = async (clinicId, verification_status) => {
    if (verification_status === "REJECTED") {
      const confirmed = window.confirm("Are you sure you want to reject/suspend this clinic? They will lose ability to accept new appointments.");
      if (!confirmed) return;
    }
    try {
      await apiClient.patch(`/clinics/${clinicId}/verify/`, { verification_status });
      showMsg(`Clinic ${verification_status === "VERIFIED" ? "approved" : "status updated"} successfully! Notification sent.`);
      loadData();
    } catch {
      showErr("Failed to update clinic status.");
    }
  };

  const handleVerifyDoctor = async (doctorId, verification_status) => {
    if (verification_status === "REJECTED") {
      const confirmed = window.confirm("Are you sure you want to reject/suspend this doctor profile? They will not appear in the active doctors directory.");
      if (!confirmed) return;
    }
    try {
      await apiClient.patch(`/doctors/${doctorId}/verify/`, { verification_status });
      showMsg(`Doctor ${verification_status === "VERIFIED" ? "approved" : "status updated"} successfully! Notification sent.`);
      loadData();
    } catch {
      showErr("Failed to update doctor status.");
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/clinics/departments/", newDept);
      showMsg("Department created.");
      setNewDept({ name: "", description: "" });
      loadData();
    } catch (err) {
      if (typeof err === "object") showErr(err.name || Object.values(err).flat().join(" "));
      else showErr(err || "Failed.");
    }
  };

  const handleCreateSpec = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/doctors/specializations/", newSpec);
      showMsg("Specialization created.");
      setNewSpec({ name: "", description: "" });
      loadData();
    } catch (err) {
      if (typeof err === "object") showErr(err.name || Object.values(err).flat().join(" "));
      else showErr(err || "Name already exists.");
    }
  };

  const handleAssignDoctor = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/doctors/${assignForm.doctor_id}/assign-clinic/`, {
        clinic_id: assignForm.clinic_id,
        department_id: assignForm.department_id || null,
        consultation_fee: parseFloat(assignForm.consultation_fee),
        room_number: assignForm.room_number || "",
      });
      showMsg("Doctor assigned to clinic.");
      setAssignForm({ doctor_id: "", clinic_id: "", department_id: "", consultation_fee: "", room_number: "" });
      loadData();
    } catch { showErr("Failed to assign doctor."); }
  };

  const pendingClinics = clinics.filter(c => c.verification_status === "PENDING");
  const pendingDoctors = doctors.filter(d => d.verification_status === "PENDING");
  const totalPending = pendingClinics.length + pendingDoctors.length;

  const tabs = [
    { key: "overview", label: "Overview", icon: <TrendingUp size={16} /> },
    { key: "approvals", label: `Pending Approvals (${totalPending})`, icon: <FileCheck size={16} /> },
    { key: "clinics", label: "All Clinics", icon: <Building2 size={16} /> },
    { key: "doctors", label: "All Doctors", icon: <Stethoscope size={16} /> },
    { key: "appointments", label: "All Appointments", icon: <Calendar size={16} /> },
    { key: "taxonomy", label: "Depts & Specializations", icon: <Award size={16} /> },
  ];

  const statusCounts = appointments.reduce((acc, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-3xl border border-base-200 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-base-content flex items-center gap-2">
            <Globe className="text-primary" /> System Administration
          </h1>
          <p className="text-sm text-base-content/60 mt-1">Full system overview — verify clinics/doctors, manage platform data</p>
        </div>
        <div className="badge badge-error badge-lg">SUPER ADMIN</div>
      </div>

      {/* Alerts */}
      {msg && <div className="alert alert-success text-sm py-3 px-4 flex items-center gap-2"><CheckCircle2 size={18} /><span>{msg}</span></div>}
      {error && <div className="alert alert-error text-sm py-3 px-4 flex items-center gap-2"><AlertCircle size={18} /><span>{error}</span></div>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setMsg(""); setError(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border ${
              activeTab === t.key
                ? "bg-primary text-primary-content border-primary shadow-md"
                : "bg-base-100 border-base-200 text-base-content/70 hover:border-primary/40"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Pending notification banner */}
          {totalPending > 0 && (
            <div className="p-5 bg-warning/15 border border-warning/30 rounded-3xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileCheck size={24} className="text-warning shrink-0" />
                <div>
                  <div className="font-extrabold text-base-content">
                    {totalPending} Registration Certificate(s) Awaiting Review
                  </div>
                  <div className="text-xs text-base-content/70">
                    {pendingClinics.length} clinic(s) and {pendingDoctors.length} doctor(s) need your approval before they can operate.
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveTab("approvals")} className="btn btn-warning btn-sm gap-1 shrink-0">
                Review Now
              </button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Clinics", value: clinics.length, icon: <Building2 size={24} />, color: "primary" },
              { label: "Registered Doctors", value: doctors.length, icon: <Stethoscope size={24} />, color: "secondary" },
              { label: "Total Appointments", value: appointments.length, icon: <Calendar size={24} />, color: "accent" },
              { label: "Specializations", value: specializations.length, icon: <Award size={24} />, color: "info" },
            ].map((s) => (
              <div key={s.label} className="p-5 bg-base-100 border border-base-200 rounded-2xl shadow-sm flex items-center gap-3">
                <div className={`p-3 bg-${s.color}/10 rounded-2xl text-${s.color}`}>{s.icon}</div>
                <div>
                  <div className="text-xs text-base-content/60 font-medium">{s.label}</div>
                  <div className="text-2xl font-extrabold text-base-content">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Appointment Status Breakdown */}
          <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md">
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2 mb-4">
              <Activity className="text-primary" /> Appointment Status Breakdown
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Pending", key: "PENDING", color: "warning" },
                { label: "Confirmed", key: "CONFIRMED", color: "success" },
                { label: "Completed", key: "COMPLETED", color: "info" },
                { label: "Cancelled", key: "CANCELLED", color: "error" },
              ].map((s) => (
                <div key={s.key} className={`p-4 rounded-2xl bg-${s.color}/10 border border-${s.color}/20 text-center`}>
                  <div className={`text-2xl font-extrabold text-${s.color}`}>{statusCounts[s.key] || 0}</div>
                  <div className="text-xs font-semibold text-base-content/70 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== PENDING APPROVALS TAB ===== */}
      {activeTab === "approvals" && (
        <div className="space-y-6">
          {/* Pending Clinics */}
          <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
              <Building2 className="text-primary" /> Pending Clinic Approvals ({pendingClinics.length})
            </h2>
            {pendingClinics.length === 0 ? (
              <div className="text-center py-6 text-sm text-base-content/60">No pending clinic registrations.</div>
            ) : (
              <div className="space-y-4">
                {pendingClinics.map((c) => (
                  <div key={c.id} className="p-5 bg-base-200/50 rounded-2xl border border-base-200 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="font-extrabold text-lg flex items-center gap-2">
                        {c.name} <span className="badge badge-warning badge-soft text-xs">PENDING</span>
                      </div>
                      <div className="text-xs text-base-content/70 flex flex-wrap gap-4">
                        <span>📍 {c.address}, {c.city}</span>
                        <span>📧 {c.email}</span>
                        <span>👤 Owner: {c.owner_email}</span>
                      </div>
                      {c.certificate_url ? (
                        <a href={c.certificate_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline bg-primary/10 px-3 py-1.5 rounded-lg">
                          <ExternalLink size={13} /> View Registration Certificate
                        </a>
                      ) : (
                        <span className="text-xs text-error font-semibold">No certificate provided</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleVerifyClinic(c.id, "VERIFIED")} className="btn btn-success btn-sm gap-1 text-white">
                        <CheckCircle2 size={16} /> Approve
                      </button>
                      <button onClick={() => handleVerifyClinic(c.id, "REJECTED")} className="btn btn-error btn-sm gap-1 text-white">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Doctors */}
          <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
              <Stethoscope className="text-secondary" /> Pending Doctor Approvals ({pendingDoctors.length})
            </h2>
            {pendingDoctors.length === 0 ? (
              <div className="text-center py-6 text-sm text-base-content/60">No pending doctor profile applications.</div>
            ) : (
              <div className="space-y-4">
                {pendingDoctors.map((d) => (
                  <div key={d.id} className="p-5 bg-base-200/50 rounded-2xl border border-base-200 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="font-extrabold text-lg flex items-center gap-2">
                        {formatDoctorName(d.full_name)} <span className="badge badge-warning badge-soft text-xs">PENDING</span>
                      </div>
                      <div className="text-xs text-base-content/70 flex flex-wrap gap-4">
                        <span>🎓 {d.qualification}</span>
                        <span>⏱️ {d.experience_years} years exp</span>
                        <span>📧 {d.email}</span>
                      </div>
                      {d.certificate_url ? (
                        <a href={d.certificate_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-secondary font-bold hover:underline bg-secondary/10 px-3 py-1.5 rounded-lg">
                          <ExternalLink size={13} /> View Medical License / Certificate
                        </a>
                      ) : (
                        <span className="text-xs text-error font-semibold">No certificate URL provided</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleVerifyDoctor(d.id, "VERIFIED")} className="btn btn-success btn-sm gap-1 text-white">
                        <CheckCircle2 size={16} /> Approve
                      </button>
                      <button onClick={() => handleVerifyDoctor(d.id, "REJECTED")} className="btn btn-error btn-sm gap-1 text-white">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ALL CLINICS TAB ===== */}
      {activeTab === "clinics" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
              <Building2 className="text-primary" /> All Clinics ({clinics.length})
            </h2>
          </div>
          {clinics.length === 0 ? (
            <div className="text-center py-12 bg-base-100 rounded-3xl border border-base-200 text-base-content/60">
              No clinics registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinics.map((c) => (
                <div key={c.id} className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-extrabold text-base-content">{c.name}</div>
                      <div className="text-xs text-base-content/60">{c.address}, {c.city}</div>
                    </div>
                    <span className={`badge badge-sm ${
                      c.verification_status === "VERIFIED" ? "badge-success badge-soft" :
                      c.verification_status === "REJECTED" ? "badge-error badge-soft" : "badge-warning badge-soft"
                    }`}>{c.verification_status}</span>
                  </div>
                  <div className="text-xs text-base-content/60 flex flex-wrap gap-3">
                    <span>📧 {c.email}</span>
                    <span>📞 {c.phone}</span>
                    <span>👤 {c.owner_email}</span>
                  </div>
                  {c.certificate_url && (
                    <a href={c.certificate_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Award size={12} /> Certificate Document ↗
                    </a>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-base-200">
                    {c.verification_status === "VERIFIED" ? (
                      <button
                        onClick={() => handleVerifyClinic(c.id, "REJECTED")}
                        className="btn btn-ghost hover:btn-error btn-xs text-slate-500 hover:text-white"
                        title="Suspend active clinic verification"
                      >
                        Suspend / Revoke
                      </button>
                    ) : c.verification_status === "REJECTED" ? (
                      <button
                        onClick={() => handleVerifyClinic(c.id, "VERIFIED")}
                        className="btn btn-success btn-xs text-white"
                      >
                        Re-activate / Approve
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleVerifyClinic(c.id, "VERIFIED")} className="btn btn-success btn-xs text-white">Approve</button>
                        <button onClick={() => handleVerifyClinic(c.id, "REJECTED")} className="btn btn-error btn-xs text-white">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ALL DOCTORS TAB ===== */}
      {activeTab === "doctors" && (
        <div className="space-y-6">
          <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
              <Stethoscope className="text-primary" /> All Registered Doctors ({doctors.length})
            </h2>
            {doctors.length === 0 ? (
              <div className="text-center py-8 text-base-content/60 text-sm">No doctors registered yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((d) => (
                  <div key={d.id} className="p-4 bg-base-200/40 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="font-extrabold text-base-content">{formatDoctorName(d.full_name)}</div>
                      <span className={`badge badge-sm ${
                        d.verification_status === "VERIFIED" ? "badge-success badge-soft" :
                        d.verification_status === "REJECTED" ? "badge-error badge-soft" : "badge-warning badge-soft"
                      }`}>{d.verification_status}</span>
                    </div>
                    <div className="text-xs text-base-content/60">{d.qualification} · {d.experience_years} yrs exp</div>
                    <div className="text-xs text-base-content/50">{d.email}</div>
                    {d.certificate_url && (
                      <a href={d.certificate_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block">
                        License Certificate ↗
                      </a>
                    )}
                    <div className="flex gap-2 pt-2 border-t border-base-200">
                      {d.verification_status === "VERIFIED" ? (
                        <button
                          onClick={() => handleVerifyDoctor(d.id, "REJECTED")}
                          className="btn btn-ghost hover:btn-error btn-xs text-slate-500 hover:text-white"
                          title="Suspend doctor account"
                        >
                          Suspend / Revoke
                        </button>
                      ) : d.verification_status === "REJECTED" ? (
                        <button
                          onClick={() => handleVerifyDoctor(d.id, "VERIFIED")}
                          className="btn btn-success btn-xs text-white"
                        >
                          Re-activate / Approve
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleVerifyDoctor(d.id, "VERIFIED")} className="btn btn-success btn-xs text-white">Approve</button>
                          <button onClick={() => handleVerifyDoctor(d.id, "REJECTED")} className="btn btn-error btn-xs text-white">Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ALL APPOINTMENTS TAB ===== */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
              <Calendar className="text-primary" /> All Appointments ({appointments.length})
            </h2>
          </div>
          {appointments.length === 0 ? (
            <div className="text-center py-12 bg-base-100 rounded-3xl border border-base-200 text-base-content/60">
              No appointments in the system yet.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-base-content flex items-center gap-2">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                        <span className={`badge badge-sm ${
                          apt.status === "CONFIRMED" ? "badge-success badge-soft" :
                          apt.status === "COMPLETED" ? "badge-info badge-soft" :
                          apt.status === "CANCELLED" ? "badge-error badge-soft" : "badge-warning badge-soft"
                        }`}>{apt.status}</span>
                      </div>
                      <div className="text-sm text-base-content/60 flex flex-wrap gap-3">
                        <span className="flex items-center gap-1"><Stethoscope size={13} className="text-primary" /> {formatDoctorName(apt.doctor?.full_name)}</span>
                        <span className="flex items-center gap-1"><Building2 size={13} className="text-primary" /> {apt.clinic?.name}</span>
                        <span className="flex items-center gap-1"><Calendar size={13} className="text-primary" /> {apt.appointment_date}</span>
                        <span className="flex items-center gap-1"><Clock size={13} className="text-primary" /> {apt.appointment_time}</span>
                      </div>
                    </div>
                    <div className="text-primary font-extrabold text-lg shrink-0">${apt.amount}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAXONOMY TAB ===== */}
      {activeTab === "taxonomy" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Department */}
          <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
              <Layers className="text-primary" /> Create Medical Department
            </h2>
            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="label text-xs font-semibold">Department Name *</label>
                <input type="text" required placeholder="Cardiology" value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} className="input input-bordered w-full" />
              </div>
              <div>
                <label className="label text-xs font-semibold">Description</label>
                <input type="text" placeholder="Heart & Cardiovascular health" value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })} className="input input-bordered w-full" />
              </div>
              <button type="submit" className="btn btn-primary w-full gap-2"><Plus size={16} /> Add Department</button>
            </form>

            {departments.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Existing ({departments.length})</div>
                <div className="flex flex-wrap gap-2">
                  {departments.map((d) => (<span key={d.id} className="badge badge-outline badge-primary">{d.name}</span>))}
                </div>
              </div>
            )}
          </div>

          {/* Create Specialization */}
          <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
              <Award className="text-secondary" /> Create Specialization
            </h2>
            <form onSubmit={handleCreateSpec} className="space-y-4">
              <div>
                <label className="label text-xs font-semibold">Specialization Name *</label>
                <input type="text" required placeholder="Pediatric Surgery" value={newSpec.name}
                  onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })} className="input input-bordered w-full" />
              </div>
              <div>
                <label className="label text-xs font-semibold">Description</label>
                <input type="text" placeholder="Specialized care for children" value={newSpec.description}
                  onChange={(e) => setNewSpec({ ...newSpec, description: e.target.value })} className="input input-bordered w-full" />
              </div>
              <button type="submit" className="btn btn-secondary w-full gap-2"><Plus size={16} /> Add Specialization</button>
            </form>

            {specializations.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Existing ({specializations.length})</div>
                <div className="flex flex-wrap gap-2">
                  {specializations.map((s) => (<span key={s.id} className="badge badge-outline badge-secondary">{s.name}</span>))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
