import React from "react";
import {
  Building2,
  Edit3,
  ExternalLink,
  MapPin,
  PhoneCall,
  Globe,
  Activity,
  Sparkles,
  Plus,
  Clock,
  Trash2,
  Camera,
  Upload,
  Star,
  Eye,
  CheckCircle2,
  XCircle,
  Megaphone,
  Layers,
  Stethoscope,
  Award,
  Check,
} from "lucide-react";
import { GALLERY_CATEGORIES, POPULAR_AMENITIES, SERVICE_PRESETS } from "../constants";

export default function ClinicBrandingTab({
  clinic,
  services = [],
  departments = [],
  specializations = [],
  gallery = [],
  announcements = [],
  assignedDoctors = [],
  editClinicModalOpen,
  setEditClinicModalOpen,
  submittingClinicEdit,
  clinicEditForm,
  setClinicEditForm,
  handleSaveClinicProfile,
  handleToggleAmenity,
  handleLoadDefaultDiagnosticCatalog,
  handleOpenAddService,
  handleOpenEditService,
  handleDeleteService,
  handleToggleServiceAvailability,
  serviceModalOpen,
  setServiceModalOpen,
  editingServiceId,
  submittingService,
  serviceForm,
  setServiceForm,
  handleSaveService,
  handleLoadSampleGallery,
  handleOpenAddPhoto,
  handleOpenEditPhoto,
  handleDeletePhoto,
  handleToggleFeaturedPhoto,
  photoModalOpen,
  setPhotoModalOpen,
  editingPhotoId,
  submittingPhoto,
  uploadMode,
  setUploadMode,
  previewPhoto,
  setPreviewPhoto,
  photoForm,
  setPhotoForm,
  handleImageFileUpload,
  handleSavePhoto,
  clinicDeptForm,
  setClinicDeptForm,
  handleLinkDept,
  newSpec,
  setNewSpec,
  handleCreateSpec,
  announcementModalOpen,
  setAnnouncementModalOpen,
  editingAnnouncementId,
  submittingAnnouncement,
  announcementForm,
  setAnnouncementForm,
  handleOpenAddAnnouncement,
  handleOpenEditAnnouncement,
  handleSaveAnnouncement,
  handleDeleteAnnouncement,
  handleToggleAnnouncementActive,
  t = (k) => k,
}) {
  return (
    <div className="space-y-8">
      {/* 1. Clinic Branding & Profile Card */}
      <div className="bg-base-100 border border-base-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-base-200">
          <div className="flex items-center gap-4">
            {clinic?.logo_url ? (
              <img
                src={clinic.logo_url}
                alt={clinic.name}
                className="w-20 h-20 rounded-2xl object-cover shadow-sm shrink-0 border border-base-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-sm shrink-0">
                {clinic?.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-base-content">
                  {clinic?.name}
                </h2>
                <span className="badge badge-success badge-sm font-bold gap-1 py-1 px-2.5">
                  <CheckCircle2 size={12} /> VERIFIED
                </span>
              </div>
              <p className="text-xs text-base-content/60 flex items-center gap-1.5">
                <MapPin size={14} className="text-primary shrink-0" />{" "}
                {clinic?.address}, {clinic?.city}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {clinic?.opening_hours
                    ? clinic.opening_hours
                    : "Open 24/7 (Emergency & Pharmacy)"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEditClinicModalOpen(true)}
              className="btn btn-primary btn-sm gap-2 shadow-sm font-bold cursor-pointer"
            >
              <Edit3 size={15} /> Edit Clinic Details
            </button>
            <a
              href={`/clinics/${clinic?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm gap-1.5 font-bold"
            >
              <span>Public View</span> <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Care Mission Statement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/50">
              About Clinic &amp; Care Mission
            </h3>
            <button
              type="button"
              onClick={() => setEditClinicModalOpen(true)}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit3 size={12} /> Add / Edit Mission Statement
            </button>
          </div>
          <p className="text-sm text-base-content/80 leading-relaxed bg-base-200/40 p-4 rounded-2xl border border-base-200">
            {clinic?.description ||
              "Dedicated to providing accessible, high-quality healthcare and advanced outpatient diagnostic services with compassion, state-of-the-art laboratory testing, and distinguished medical specialists."}
          </p>
        </div>

        {/* 4-Card Color-Tinted Contact & Ambulance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col justify-between space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold">
              <PhoneCall size={14} /> General Helpline
            </div>
            <div className="font-extrabold text-sm text-base-content tracking-tight">
              {clinic?.phone || "01887530601"}
            </div>
          </div>

          <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/60 dark:border-teal-900/40 flex flex-col justify-between space-y-1">
            <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-bold">
              <Globe size={14} /> Official Email
            </div>
            <div className="font-bold text-sm text-base-content truncate">
              {clinic?.email || "admin@smartclinic.com"}
            </div>
          </div>

          <div className="p-3.5 bg-sky-50/60 dark:bg-sky-950/30 rounded-2xl border border-sky-200/60 dark:border-sky-900/40 flex flex-col justify-between space-y-1">
            <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold">
              <ExternalLink size={14} /> Official Website
            </div>
            <div className="font-bold text-sm truncate">
              {clinic?.website ? (
                <a
                  href={clinic.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {clinic.website}
                </a>
              ) : (
                <span className="text-base-content/40 italic font-normal">
                  Not configured
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 flex flex-col justify-between space-y-1">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
              <Activity size={14} /> Emergency Ambulance
            </div>
            <div className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
              {clinic?.emergency_contact || "+880 1700 - 000000"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Clinical Services & Diagnostics Suite */}
      <div className="bg-base-100 border border-base-200 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="text-primary" size={24} />
              <h2 className="text-xl font-black text-base-content">
                Clinical Services &amp; Diagnostic Tests
              </h2>
              <span className="badge badge-primary badge-sm font-bold">
                {services.length}
              </span>
            </div>
            <p className="text-xs text-base-content/60 mt-1">
              Configure clinical tests, packages, and treatments offered with BDT pricing and prep instructions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDefaultDiagnosticCatalog}
              disabled={submittingService}
              className="btn btn-outline btn-primary btn-sm gap-1.5 font-bold cursor-pointer"
              title="Bulk load standard diagnostic tests with pre-set BDT fees"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Load Default Bangladesh Diagnostic Catalog</span>
            </button>
            <button
              onClick={() => handleOpenAddService()}
              className="btn btn-primary btn-sm gap-2 shadow-md font-bold cursor-pointer"
            >
              <Plus size={16} /> Add Clinical Service
            </button>
          </div>
        </div>

        {/* Quick 1-Click Presets */}
        <div className="space-y-2 bg-base-200/30 p-4 rounded-2xl border border-base-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-base-content/70">
            <Sparkles size={14} className="text-amber-500" />
            <span>1-Click Popular Service Presets (Click to Add):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SERVICE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleOpenAddService(preset)}
                className="btn btn-xs btn-outline hover:btn-primary gap-1 font-semibold rounded-lg cursor-pointer"
              >
                <span>+ {preset.name}</span>
                <span className="opacity-70 font-mono">৳{preset.fee}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Services List Table / Cards */}
        {services.length === 0 ? (
          <div className="text-center py-12 px-4 bg-base-200/20 rounded-3xl border border-base-200 space-y-3">
            <Activity size={40} className="mx-auto text-base-content/20" />
            <div className="font-bold text-base-content text-base">
              No clinical services added yet
            </div>
            <p className="text-xs text-base-content/60 max-w-md mx-auto">
              Use the 1-click presets above, click &quot;Add Clinical Service&quot;, or bulk-load the standard Bangladesh diagnostic catalog to showcase your lab investigations, imaging tests, and outpatient care.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLoadDefaultDiagnosticCatalog}
                disabled={submittingService}
                className="btn btn-primary btn-sm gap-2 font-bold shadow-md cursor-pointer"
              >
                <Sparkles size={14} /> Load Default Bangladesh Diagnostic Catalog
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b border-base-200 text-xs text-base-content/60 uppercase">
                  <th>Service Name</th>
                  <th>Fee (BDT)</th>
                  <th>Duration</th>
                  <th>Preparation / Patient Instructions</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-base-200/40 border-b border-base-200"
                  >
                    <td>
                      <div className="font-extrabold text-sm text-base-content">
                        {s.name}
                      </div>
                      {s.description && (
                        <div className="text-xs text-base-content/60 line-clamp-1">
                          {s.description}
                        </div>
                      )}
                      {s.department_name && (
                        <span className="badge badge-ghost badge-xs mt-1 font-semibold">
                          {s.department_name}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="font-black text-sm text-primary font-mono">
                        ৳{parseFloat(s.fee).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-base-content/70 flex items-center gap-1">
                        <Clock size={12} /> {s.duration_minutes} mins
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-base-content/70 italic max-w-xs block truncate">
                        {s.preparation_instructions || "None required"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleServiceAvailability(s)}
                        className={`badge badge-sm font-bold cursor-pointer transition-all ${
                          s.is_available
                            ? "badge-success text-success-content"
                            : "badge-error text-error-content"
                        }`}
                      >
                        {s.is_available ? "Active / Available" : "Unavailable"}
                      </button>
                    </td>
                    <td className="text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditService(s)}
                        className="btn btn-ghost btn-xs text-primary cursor-pointer"
                        title="Edit Service"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(s.id)}
                        className="btn btn-ghost btn-xs text-error cursor-pointer"
                        title="Delete Service"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Visual Gallery & Virtual Tour Showcase */}
      <div className="bg-base-100 border border-base-200 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="text-primary" size={24} />
              <h2 className="text-xl font-black text-base-content">
                Clinic Photo Gallery &amp; Virtual Tour
              </h2>
              <span className="badge badge-primary badge-sm font-bold">
                {gallery.length}
              </span>
            </div>
            <p className="text-xs text-base-content/60 mt-0.5">
              Upload or link real photos of your reception, chambers, waiting lounges, and labs to give patients an inspiring virtual tour.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSampleGallery}
              className="btn btn-outline btn-secondary btn-sm gap-1.5 font-bold shadow-xs cursor-pointer"
              title="Load preset high-res clinic photos to get started immediately"
            >
              <Sparkles size={14} /> Sample Tour Pack
            </button>
            <button
              type="button"
              onClick={handleOpenAddPhoto}
              className="btn btn-primary btn-sm gap-2 shadow-xs font-bold cursor-pointer"
            >
              <Plus size={16} /> Add Photo
            </button>
          </div>
        </div>

        {gallery.length === 0 ? (
          <div className="text-center py-12 px-4 bg-base-200/40 rounded-3xl border-2 border-dashed border-base-300 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Camera size={32} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-extrabold text-base text-base-content">
                No Clinic Photos Uploaded Yet
              </h3>
              <p className="text-xs text-base-content/60">
                Clinics with high-quality photos of their consultation chambers, hygienic waiting rooms, and diagnostic labs attract up to 3x more patient bookings!
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenAddPhoto}
                className="btn btn-primary btn-sm gap-2 font-bold cursor-pointer"
              >
                <Upload size={14} /> Upload First Photo
              </button>
              <button
                type="button"
                onClick={handleLoadSampleGallery}
                className="btn btn-ghost btn-sm gap-1.5 text-secondary font-bold cursor-pointer"
              >
                <Sparkles size={14} /> Load Sample Photos
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="group relative bg-base-200/40 rounded-2xl border border-base-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-base-300">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  {item.is_featured && (
                    <span className="absolute top-2.5 left-2.5 badge badge-warning gap-1 font-bold text-xs shadow-md">
                      <Star size={12} className="fill-current" /> Cover Photo
                    </span>
                  )}
                  <span className="absolute top-2.5 right-2.5 badge badge-neutral/80 backdrop-blur-md text-[11px] font-semibold text-white">
                    {item.category || "Facility"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(item)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs cursor-pointer"
                  >
                    <Eye size={16} /> Click to Preview
                  </button>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-base-content leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
                      {item.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-base-200/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleFeaturedPhoto(item.id)}
                      className={`btn btn-xs gap-1 font-bold cursor-pointer ${
                        item.is_featured
                          ? "btn-warning"
                          : "btn-ghost text-base-content/60"
                      }`}
                      title={
                        item.is_featured
                          ? "Remove featured cover status"
                          : "Set as primary clinic cover photo"
                      }
                    >
                      <Star
                        size={12}
                        className={item.is_featured ? "fill-current" : ""}
                      />
                      {item.is_featured ? "Cover" : "Set Cover"}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPhoto(item)}
                        className="btn btn-ghost btn-xs text-primary cursor-pointer"
                        title="Edit details"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(item.id)}
                        className="btn btn-ghost btn-xs text-error cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Facilities & Amenities Decorator */}
      <div className="bg-base-100 border border-base-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-base-200 pb-3">
          <div>
            <h2 className="text-xl font-black text-base-content flex items-center gap-2">
              <Building2 className="text-primary" size={22} /> Clinic Facilities &amp; Key Amenities
            </h2>
            <p className="text-xs text-base-content/60 mt-0.5">
              Click any amenity to enable or disable it for your clinic. Active amenities are highlighted on your public clinic profile for patients.
            </p>
          </div>
          <span className="badge badge-outline text-xs font-bold">
            {Array.isArray(clinic?.facilities) ? clinic.facilities.length : 0} /{" "}
            {POPULAR_AMENITIES.length} Enabled
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {POPULAR_AMENITIES.map((am) => {
            const isSelected =
              Array.isArray(clinic?.facilities) &&
              clinic.facilities.includes(am.id);
            return (
              <button
                key={am.id}
                type="button"
                onClick={() => handleToggleAmenity(am.id)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs ring-1 ring-emerald-500/30"
                    : "border-base-200 bg-base-100 hover:border-base-300 text-base-content/70 font-medium hover:bg-base-200/40"
                }`}
              >
                <div className="text-2xl mb-2">{am.icon}</div>
                <div className="text-xs font-bold leading-tight">{am.label}</div>
                <div className="mt-3 text-[10px] uppercase font-black tracking-wider flex items-center gap-1">
                  {isSelected ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      ✓ ACTIVE
                    </span>
                  ) : (
                    <span className="text-base-content/40">+ ADD</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Medical Departments & Associated Specialists */}
      <div className="bg-base-100 border border-base-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-base-200 pb-3">
          <div>
            <h2 className="text-xl font-black text-base-content flex items-center gap-2">
              <Layers className="text-primary" size={22} /> Medical Departments &amp; Specialties
            </h2>
            <p className="text-xs text-base-content/60 mt-0.5">
              Link medical departments to allow specialist doctors in those disciplines to practice at your clinic.
            </p>
          </div>
          <span className="badge badge-outline text-xs font-bold">
            {clinic?.departments?.length || 0} Departments Active
          </span>
        </div>

        <form onSubmit={handleLinkDept} className="flex flex-col sm:flex-row gap-3">
          <select
            required
            value={clinicDeptForm.department_id}
            onChange={(e) =>
              setClinicDeptForm({ department_id: e.target.value })
            }
            className="select select-bordered flex-1 rounded-xl"
          >
            <option value="">-- Choose Medical Department to Link --</option>
            {departments
              .filter((d) => !clinic?.departments?.some((cd) => cd.id === d.id))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
          <button
            type="submit"
            className="btn btn-primary gap-2 shrink-0 rounded-xl font-bold cursor-pointer"
          >
            <Plus size={16} /> Link Department
          </button>
        </form>

        {clinic?.departments && clinic.departments.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 pt-2">
            {clinic.departments.map((dept) => {
              const doctorsInDept = assignedDoctors.filter(
                (d) =>
                  d.department === dept.id || d.department_name === dept.name
              ).length;
              return (
                <span
                  key={dept.id}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-base-200/70 border border-base-300 text-xs font-bold text-base-content"
                >
                  <Stethoscope size={14} className="text-primary shrink-0" />
                  <span>{dept.name}</span>
                  <span className="badge badge-xs badge-neutral font-semibold">
                    {doctorsInDept} {doctorsInDept === 1 ? "Doctor" : "Doctors"}
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-base-content/50 italic">
            No medical departments linked yet. Select a department from the dropdown above to link it.
          </p>
        )}
      </div>

      {/* 6. Specializations */}
      <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Award className="text-primary" size={20} />
          <h2 className="text-base font-extrabold text-base-content">
            Medical Specializations
          </h2>
          <span className="badge badge-ghost badge-sm text-xs">
            {specializations.length} total
          </span>
        </div>
        <p className="text-xs text-base-content/50">
          Create custom specializations for doctors to be categorized under on this platform.
        </p>
        <form onSubmit={handleCreateSpec} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="Specialization name (e.g. Pediatric Surgery)"
            value={newSpec.name}
            onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })}
            className="input input-bordered flex-1 text-sm rounded-xl"
          />
          <input
            type="text"
            placeholder="Brief description (optional)"
            value={newSpec.description}
            onChange={(e) =>
              setNewSpec({ ...newSpec, description: e.target.value })
            }
            className="input input-bordered flex-1 text-sm rounded-xl"
          />
          <button
            type="submit"
            className="btn btn-primary gap-2 shrink-0 rounded-xl cursor-pointer"
          >
            <Plus size={15} /> Add
          </button>
        </form>
        {specializations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {specializations.map((s) => (
              <span
                key={s.id}
                className="badge badge-outline badge-sm font-semibold"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 7. Clinic Announcements & Patient Notices (নোটিশ বোর্ড) */}
      <div className="bg-base-100 border border-base-200 p-6 rounded-3xl shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Megaphone size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-base-content">
                  {t("announcementsTitle") || "Clinic Announcements & Notices"}
                </h2>
                {announcements.filter((a) => a.is_active).length > 0 && (
                  <span className="badge badge-primary badge-sm font-bold">
                    {announcements.filter((a) => a.is_active).length} active
                  </span>
                )}
              </div>
              <p className="text-xs text-base-content/50">
                Publish notices on your public clinic page for doctor visits, schedule changes, or holiday closures.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAddAnnouncement}
            className="btn btn-primary btn-sm gap-1.5 font-bold shadow-sm rounded-xl cursor-pointer"
          >
            <Plus size={14} /> New Announcement
          </button>
        </div>

        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center bg-base-200/30 rounded-2xl border border-dashed border-base-300">
            <Megaphone size={32} className="text-base-content/20" />
            <div>
              <div className="text-sm font-semibold text-base-content/60">
                No announcements yet
              </div>
              <div className="text-xs text-base-content/40 mt-0.5 max-w-sm">
                Inform patients about upcoming doctor visits, schedule changes, or holiday notices.
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenAddAnnouncement}
              className="btn btn-outline btn-primary btn-xs gap-1 rounded-xl cursor-pointer"
            >
              <Plus size={12} /> Post First Notice
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {announcements.map((a) => {
              const typeColor =
                a.announcement_type === "DOCTOR_VISIT"
                  ? "badge-primary"
                  : a.announcement_type === "HOLIDAY"
                  ? "badge-error"
                  : a.announcement_type === "SCHEDULE_CHANGE"
                  ? "badge-warning"
                  : a.announcement_type === "NEW_SERVICE"
                  ? "badge-success"
                  : "badge-ghost";

              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    a.is_active
                      ? "bg-base-200/40 border-base-300"
                      : "bg-base-100 border-base-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`badge badge-xs font-bold uppercase ${typeColor}`}
                        >
                          {a.announcement_type?.replace("_", " ")}
                        </span>
                        {!a.is_active && (
                          <span className="badge badge-xs badge-neutral">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm text-base-content truncate">
                        {a.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleAnnouncementActive(a)}
                        className={`btn btn-xs ${
                          a.is_active ? "btn-success" : "btn-ghost btn-outline"
                        }`}
                        title={a.is_active ? "Deactivate" : "Activate"}
                      >
                        {a.is_active ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditAnnouncement(a)}
                        className="btn btn-ghost btn-xs cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="btn btn-ghost btn-xs text-error cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-base-content/70 leading-relaxed whitespace-pre-line line-clamp-3">
                    {a.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== EDIT CLINIC PROFILE & BRANDING MODAL ===== */}
      {editClinicModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-base-200 my-8">
            <div className="flex items-center justify-between border-b border-base-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-base-content">
                    Edit Clinic Profile &amp; Decoration
                  </h3>
                  <p className="text-xs text-base-content/60">
                    Update your clinic identity, operating hours, emergency contact, and branding.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditClinicModalOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClinicProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    Clinic Official Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clinicEditForm.name}
                    onChange={(e) =>
                      setClinicEditForm({
                        ...clinicEditForm,
                        name: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-sm"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    City / Division *
                  </label>
                  <input
                    type="text"
                    required
                    value={clinicEditForm.city}
                    onChange={(e) =>
                      setClinicEditForm({
                        ...clinicEditForm,
                        city: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Complete Physical Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={clinicEditForm.address}
                  onChange={(e) =>
                    setClinicEditForm({
                      ...clinicEditForm,
                      address: e.target.value,
                    })
                  }
                  className="textarea textarea-bordered w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    General Phone
                  </label>
                  <input
                    type="text"
                    value={clinicEditForm.phone}
                    onChange={(e) =>
                      setClinicEditForm({
                        ...clinicEditForm,
                        phone: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-sm"
                    placeholder="e.g. 01700000000"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={clinicEditForm.email}
                    onChange={(e) =>
                      setClinicEditForm({
                        ...clinicEditForm,
                        email: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-sm"
                    placeholder="contact@clinic.com"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70 flex items-center gap-1 text-error">
                    <PhoneCall size={12} /> Emergency Hotline
                  </label>
                  <input
                    type="text"
                    value={clinicEditForm.emergency_contact}
                    onChange={(e) =>
                      setClinicEditForm({
                        ...clinicEditForm,
                        emergency_contact: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-sm"
                    placeholder="e.g. 01711999999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-bold text-base-content/70 flex items-center gap-1">
                    <Clock size={12} className="text-primary" /> Operating Hours
                  </label>
                  <input
                    type="text"
                    value={clinicEditForm.opening_hours}
                    onChange={(e) =>
                      setClinicEditForm({
                        ...clinicEditForm,
                        opening_hours: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-sm"
                    placeholder="e.g. Sat - Thu: 8:00 AM - 10:00 PM"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70 flex items-center gap-1">
                    <Globe size={12} className="text-primary" /> Official Website
                  </label>
                  <input
                    type="url"
                    value={clinicEditForm.website}
                    onChange={(e) =>
                      setClinicEditForm({
                        ...clinicEditForm,
                        website: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-sm"
                    placeholder="https://yourclinic.com"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Clinic Logo URL
                </label>
                <input
                  type="url"
                  value={clinicEditForm.logo_url}
                  onChange={(e) =>
                    setClinicEditForm({
                      ...clinicEditForm,
                      logo_url: e.target.value,
                    })
                  }
                  className="input input-bordered w-full text-sm font-mono"
                  placeholder="https://res.cloudinary.com/... or image link"
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  About Clinic &amp; Medical Mission (Public Bio)
                </label>
                <textarea
                  rows={4}
                  value={clinicEditForm.description}
                  onChange={(e) =>
                    setClinicEditForm({
                      ...clinicEditForm,
                      description: e.target.value,
                    })
                  }
                  className="textarea textarea-bordered w-full text-sm"
                  placeholder="Describe your clinic's modern facilities, clinical specialties, and patient-centered services..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditClinicModalOpen(false)}
                  className="btn btn-outline flex-1 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClinicEdit}
                  className="btn btn-primary flex-2 font-bold shadow-lg gap-2"
                >
                  {submittingClinicEdit ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Edit3 size={16} />
                  )}
                  Save Clinic Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== ADD / EDIT CLINICAL SERVICE MODAL ===== */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-6 border border-base-200 my-8">
            <div className="flex items-center justify-between border-b border-base-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-base-content">
                    {editingServiceId
                      ? "Edit Clinical Service"
                      : "Add Clinical Service"}
                  </h3>
                  <p className="text-xs text-base-content/60">
                    Specify service name, diagnostic pricing in BDT, and patient prep notes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setServiceModalOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Service / Test Name *
                </label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, name: e.target.value })
                  }
                  className="input input-bordered w-full text-sm"
                  placeholder="e.g. Ultrasound (USG) Whole Abdomen"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    Service Fee (BDT) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-sm font-bold text-base-content/40">
                      ৳
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={serviceForm.fee}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          fee: e.target.value,
                        })
                      }
                      className="input input-bordered w-full pl-8 text-sm font-mono font-bold"
                      placeholder="e.g. 1200"
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    Estimated Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={serviceForm.duration_minutes}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        duration_minutes: e.target.value,
                      })
                    }
                    className="input input-bordered w-full text-sm font-mono"
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Department (Optional)
                </label>
                <select
                  value={serviceForm.department_id}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      department_id: e.target.value,
                    })
                  }
                  className="select select-bordered w-full text-sm"
                >
                  <option value="">-- None / General Facility --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Preparation / Patient Instructions
                </label>
                <input
                  type="text"
                  value={serviceForm.preparation_instructions}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      preparation_instructions: e.target.value,
                    })
                  }
                  className="input input-bordered w-full text-sm"
                  placeholder="e.g. Overnight 8-hour fasting required; bring prior reports"
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Service Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      description: e.target.value,
                    })
                  }
                  className="textarea textarea-bordered w-full text-sm"
                  placeholder="Additional details about the investigation, equipment, or doctor consultation included..."
                />
              </div>

              <div className="p-3 bg-base-200/50 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-base-content">
                    Service Availability Status
                  </div>
                  <div className="text-[11px] text-base-content/60">
                    When active, patients can view this service on your clinic page.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={serviceForm.is_available}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      is_available: e.target.checked,
                    })
                  }
                  className="toggle toggle-primary toggle-sm"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="btn btn-outline flex-1 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingService}
                  className="btn btn-primary flex-2 font-bold shadow-lg gap-2"
                >
                  {submittingService ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Activity size={16} />
                  )}
                  {editingServiceId ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== ADD / EDIT CLINIC PHOTO MODAL ===== */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-6 border border-base-200 my-8">
            <div className="flex items-center justify-between border-b border-base-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <Camera size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-base-content">
                    {editingPhotoId ? "Edit Photo Details" : "Add Clinic Tour Photo"}
                  </h3>
                  <p className="text-xs text-base-content/60">
                    Showcase consultation chambers, waiting lounge, reception, and pathology labs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPhotoModalOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4">
              {/* Upload Mode Selector */}
              <div className="flex rounded-xl bg-base-200 p-1">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    uploadMode === "file"
                      ? "bg-primary text-primary-content shadow-xs"
                      : "text-base-content/70 hover:text-base-content"
                  }`}
                >
                  Upload File from Device
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    uploadMode === "url"
                      ? "bg-primary text-primary-content shadow-xs"
                      : "text-base-content/70 hover:text-base-content"
                  }`}
                >
                  Image URL / Cloud Link
                </button>
              </div>

              {uploadMode === "file" ? (
                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    Choose Photo File (Max 10MB) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="file-input file-input-bordered file-input-primary w-full rounded-xl text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    Direct Image URL *
                  </label>
                  <input
                    type="url"
                    value={photoForm.image_url}
                    onChange={(e) =>
                      setPhotoForm({ ...photoForm, image_url: e.target.value })
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="input input-bordered w-full rounded-xl text-xs font-mono"
                  />
                </div>
              )}

              {/* Photo Preview */}
              {photoForm.image_url && (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-base-300 bg-base-300">
                  <img
                    src={photoForm.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  <span className="absolute bottom-2 left-2 badge badge-neutral/90 text-xs">
                    Live Preview
                  </span>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Facility Area / Category *
                </label>
                <select
                  value={photoForm.category}
                  onChange={(e) =>
                    setPhotoForm({ ...photoForm, category: e.target.value })
                  }
                  className="select select-bordered w-full rounded-xl text-sm"
                >
                  {GALLERY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Caption */}
              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Photo Title / Caption *
                </label>
                <input
                  type="text"
                  required
                  value={photoForm.title}
                  onChange={(e) =>
                    setPhotoForm({ ...photoForm, title: e.target.value })
                  }
                  placeholder="e.g. Modern Waiting Lounge with AC"
                  className="input input-bordered w-full rounded-xl text-sm"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Detailed Description / Story for Patients
                </label>
                <textarea
                  rows={3}
                  value={photoForm.description}
                  onChange={(e) =>
                    setPhotoForm({
                      ...photoForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Tell patients about this room, hygiene practices, comfortable seating, modern equipment..."
                  className="textarea textarea-bordered w-full rounded-xl text-sm"
                />
              </div>

              {/* Set as Featured Cover toggle */}
              <label className="label cursor-pointer justify-start gap-3 bg-base-200/50 p-3 rounded-xl border border-base-200">
                <input
                  type="checkbox"
                  checked={photoForm.is_featured}
                  onChange={(e) =>
                    setPhotoForm({
                      ...photoForm,
                      is_featured: e.target.checked,
                    })
                  }
                  className="checkbox checkbox-primary checkbox-sm"
                />
                <div className="text-xs">
                  <span className="font-bold text-base-content block">
                    Set as Primary Featured Cover
                  </span>
                  <span className="text-base-content/60">
                    This photo will be displayed prominently as hero in your virtual tour.
                  </span>
                </div>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(false)}
                  className="btn btn-outline flex-1 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingPhoto ||
                    !photoForm.image_url ||
                    !photoForm.title.trim()
                  }
                  className="btn btn-primary flex-2 rounded-xl shadow-lg font-bold gap-2"
                >
                  {submittingPhoto ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Check size={16} />
                  )}
                  {editingPhotoId ? "Update Photo" : "Add to Gallery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PREVIEW LIGHTBOX MODAL IN DASHBOARD ===== */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-base-100 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-base-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full bg-black">
              <img
                src={previewPhoto.image_url}
                alt={previewPhoto.title}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setPreviewPhoto(null)}
                className="btn btn-circle btn-sm btn-ghost absolute top-3 right-3 text-white bg-black/60 hover:bg-black/80"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold text-lg text-base-content">
                  {previewPhoto.title}
                </h3>
                <span className="badge badge-primary font-bold text-xs">
                  {previewPhoto.category}
                </span>
              </div>
              <p className="text-sm text-base-content/80 whitespace-pre-line leading-relaxed">
                {previewPhoto.description || "No description provided."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD / EDIT ANNOUNCEMENT MODAL ===== */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-6 border border-base-200 my-8">
            <div className="flex items-center justify-between border-b border-base-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-base-content">
                    {editingAnnouncementId
                      ? "Edit Clinic Notice"
                      : "Post New Clinic Notice"}
                  </h3>
                  <p className="text-xs text-base-content/60">
                    Publish an announcement for doctor visits, holidays, or schedule notices.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnnouncementModalOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Notice Type *
                </label>
                <select
                  value={announcementForm.announcement_type}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      announcement_type: e.target.value,
                    })
                  }
                  className="select select-bordered w-full rounded-xl text-sm"
                >
                  <option value="GENERAL">General Announcement</option>
                  <option value="DOCTOR_VISIT">
                    Doctor Visit / Special Chamber
                  </option>
                  <option value="SCHEDULE_CHANGE">Schedule Change</option>
                  <option value="NEW_SERVICE">New Service Announcement</option>
                  <option value="HOLIDAY">Holiday / Clinic Closure</option>
                  <option value="CLINIC_NOTICE">Important Clinic Notice</option>
                </select>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Notice Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="e.g. Dr. Rahman visiting Friday 5-8 PM"
                  className="input input-bordered w-full rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/70">
                  Detailed Notice Message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={announcementForm.message}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      message: e.target.value,
                    })
                  }
                  placeholder="Provide complete instructions, serial token instructions, emergency alternatives..."
                  className="textarea textarea-bordered w-full rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    Related Doctor (Optional)
                  </label>
                  <select
                    value={announcementForm.doctor}
                    onChange={(e) =>
                      setAnnouncementForm({
                        ...announcementForm,
                        doctor: e.target.value,
                      })
                    }
                    className="select select-bordered w-full rounded-xl text-sm"
                  >
                    <option value="">-- No Specific Doctor --</option>
                    {assignedDoctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70">
                    Event Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={announcementForm.scheduled_date}
                    onChange={(e) =>
                      setAnnouncementForm({
                        ...announcementForm,
                        scheduled_date: e.target.value,
                      })
                    }
                    className="input input-bordered w-full rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-base-content block">
                    Display Immediately on Public Page
                  </span>
                  <span className="text-[11px] text-base-content/60">
                    Patients will see this notice pinned on your clinic banner.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={announcementForm.is_active}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      is_active: e.target.checked,
                    })
                  }
                  className="toggle toggle-primary toggle-sm"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="btn btn-outline flex-1 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAnnouncement}
                  className="btn btn-primary flex-2 rounded-xl shadow-lg font-bold gap-2"
                >
                  {submittingAnnouncement ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Megaphone size={16} />
                  )}
                  {editingAnnouncementId ? "Save Changes" : "Publish Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
