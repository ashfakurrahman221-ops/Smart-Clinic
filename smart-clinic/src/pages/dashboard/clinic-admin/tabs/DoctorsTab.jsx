import React from "react";
import {
  Stethoscope,
  ChevronRight,
  Info,
  Send,
  DoorOpen,
  AlertTriangle,
} from "lucide-react";


export default function DoctorsTab({
  clinic,
  assignedDoctors = [],
  appointments = [],
  selectedDoctorCard,
  openDoctorCard,
  onOpenLiveChamber,
  pendingIncomingRequests = [],
  handleRespondRequest,
  allDoctors = [],
  departments = [],
  inviteForm,
  setInviteForm,
  handleSendInvite,
  requests = [],
}) {
  const roomConflict = React.useMemo(() => {
    const raw = (inviteForm?.room_number || "").trim();
    if (!raw) return null;
    const norm = raw
      .toLowerCase()
      .replace(/^(room|chamber|rm)[\s\-_.:]*/i, "")
      .trim();
    if (!norm) return null;

    // Check active assignedDoctors
    const conflictDoc = assignedDoctors.find((d) => {
      if (String(d.id) === String(inviteForm.doctor_id)) return false;
      const docRoom = (d.room_number || "").trim();
      const normDocRoom = docRoom
        .toLowerCase()
        .replace(/^(room|chamber|rm)[\s\-_.:]*/i, "")
        .trim();
      return normDocRoom && normDocRoom === norm;
    });

    if (conflictDoc) {
      return {
        doctorName: conflictDoc.full_name?.startsWith("Dr.")
          ? conflictDoc.full_name
          : `Dr. ${conflictDoc.full_name || conflictDoc.name}`,
        room: raw,
      };
    }

    // Check active requests
    const conflictReq = requests.find((r) => {
      if (r.status === "REJECTED") return false;
      const reqDocId = r.doctor?.id || r.doctor;
      if (String(reqDocId) === String(inviteForm.doctor_id)) return false;
      const reqRoom = (r.room_number || "").trim();
      const normReqRoom = reqRoom
        .toLowerCase()
        .replace(/^(room|chamber|rm)[\s\-_.:]*/i, "")
        .trim();
      return normReqRoom && normReqRoom === norm;
    });

    if (conflictReq) {
      return {
        doctorName: conflictReq.doctor?.full_name?.startsWith("Dr.")
          ? conflictReq.doctor?.full_name
          : `Dr. ${conflictReq.doctor?.full_name || "Specialist"}`,
        room: raw,
      };
    }

    return null;
  }, [inviteForm?.room_number, inviteForm?.doctor_id, assignedDoctors, requests]);
  return (
    <div className="space-y-6">
      {/* Medical Workforce & Affiliated Doctors */}
      <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
              <Stethoscope className="text-primary" /> Medical Workforce &amp; Affiliated Doctors
              <span className="badge badge-primary badge-sm font-bold">
                {assignedDoctors.length}
              </span>
            </h2>
            <p className="text-xs text-base-content/60 mt-0.5">
              Consultant roster, room allocations, consultation fee structures, and clinical affiliations
            </p>
          </div>
          <span className="text-xs text-base-content/40 italic">
            Click any profile for full credentials →
          </span>
        </div>
        {assignedDoctors.length === 0 ? (
          <div className="text-center py-6 text-xs text-base-content/60">
            No active doctors linked to your clinic.
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
            {assignedDoctors.map((d) => {
              const isSelected = selectedDoctorCard?.id === d.id;

              return (
                <div
                  key={d.id}
                  onClick={() => clinic && openDoctorCard && openDoctorCard(d)}
                  className={`w-full text-left p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-base-200 bg-base-100 hover:border-primary/50 hover:bg-base-200/40 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-sm">
                      {(d.full_name || "?")[0].toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-base-content">
                          {d.full_name?.startsWith("Dr.")
                            ? d.full_name
                            : `Dr. ${d.full_name}`}
                        </span>
                        <span className="badge badge-xs badge-success text-white font-bold">
                          Active
                        </span>
                        {d.room_number && (
                          <span className="badge badge-xs badge-neutral font-semibold">
                            Room {d.room_number}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-base-content/60 mt-0.5 truncate">
                        {d.qualification || "Consultant"} · {d.department_name || d.department || "General Medicine"}
                      </div>
                      <div className="text-[11px] text-base-content/50 mt-0.5 flex items-center gap-3 flex-wrap">
                        {d.bmdc_number && (
                          <span className="font-mono">BMDC: {d.bmdc_number}</span>
                        )}
                        <span>•</span>
                        <span>Fee: <strong>৳{d.consultation_fee || "—"}</strong></span>
                        <span>•</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">80% Doctor / 20% Clinic</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Live Chamber Deep Link */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => clinic && openDoctorCard && openDoctorCard(d)}
                      className="btn btn-ghost btn-xs text-xs font-semibold cursor-pointer"
                    >
                      Profile Details
                    </button>
                    {onOpenLiveChamber && (
                      <button
                        type="button"
                        onClick={() => onOpenLiveChamber(d.id)}
                        className="btn btn-primary btn-xs font-bold gap-1 shadow-xs cursor-pointer"
                        title={`Open live operational chamber for Dr. ${d.full_name}`}
                      >
                        <DoorOpen size={13} />
                        <span>Open Live Chamber →</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incoming Doctor Requests */}
      {pendingIncomingRequests.length > 0 && (
        <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
          <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
            <Info className="text-warning" /> Incoming Join Requests from Doctors (
            {pendingIncomingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingIncomingRequests.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-base-200/50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="font-bold text-base-content">
                    {r.doctor?.full_name?.startsWith("Dr.")
                      ? r.doctor?.full_name
                      : `Dr. ${r.doctor?.full_name}`}
                  </div>
                  <div className="text-xs text-base-content/60">
                    Proposed Fee: ৳{r.consultation_fee} · Room:{" "}
                    {r.room_number || "N/A"}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleRespondRequest(r.id, "ACCEPT")}
                    className="btn btn-success btn-xs text-white cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespondRequest(r.id, "REJECT")}
                    className="btn btn-error btn-xs text-white cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Invite Form (Bottom) */}
      {clinic && clinic.verification_status === "VERIFIED" && (
        <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
          <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
            <Send className="text-primary" /> Send Service Request to Doctor
          </h2>
          <p className="text-xs text-base-content/60">
            Invite a registered, approved doctor to provide services at your clinic. They must accept before becoming active.
          </p>

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold">
                  Select Doctor *
                </label>
                <select
                  required
                  value={inviteForm.doctor_id}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, doctor_id: e.target.value })
                  }
                  className="select select-bordered w-full"
                >
                  <option value="">-- Choose Doctor --</option>
                  {allDoctors
                    .filter((d) => d.verification_status === "VERIFIED")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name?.startsWith("Dr.")
                          ? d.full_name
                          : `Dr. ${d.full_name}`}{" "}
                        ({d.qualification || d.email})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label text-xs font-semibold">
                  Consultation Fee (৳ / BDT) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="500.00"
                  value={inviteForm.consultation_fee}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      consultation_fee: e.target.value,
                    })
                  }
                  className="input input-bordered w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold">
                  Department (optional)
                </label>
                <select
                  value={inviteForm.department_id}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      department_id: e.target.value,
                    })
                  }
                  className="select select-bordered w-full"
                >
                  <option value="">-- No department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs font-semibold flex items-center justify-between">
                  <span>Room Number (optional)</span>
                  {roomConflict && (
                    <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                      <AlertTriangle size={12} /> Conflict Detected
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Room 204"
                  value={inviteForm.room_number}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      room_number: e.target.value,
                    })
                  }
                  className={`input input-bordered w-full transition-colors ${
                    roomConflict
                      ? "input-error border-rose-500 bg-rose-50/40 text-rose-900"
                      : ""
                  }`}
                />
                {roomConflict && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>
                      Room <strong>&quot;{inviteForm.room_number}&quot;</strong> is
                      already allocated to {roomConflict.doctorName}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full gap-2 font-bold cursor-pointer"
            >
              <Send size={16} /> Send Service Invite
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
