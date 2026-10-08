import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import apiClient from "../../api/axios";
import { 
  MapPin, Phone, Mail, Building2, Stethoscope, CalendarCheck, 
  UserCheck, ArrowLeft, Award, ExternalLink, LayoutDashboard, 
  Star, MessageSquare, Clock, PhoneCall, Globe, CheckCircle2, 
  Search, Activity, FileText, Info, Camera, ChevronLeft, ChevronRight, 
  X, Maximize2 
} from "lucide-react";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";

export default function ClinicDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/clinics");
    }
  };

  useEffect(() => {
    const fetchClinicData = async () => {
      setLoading(true);
      setError("");
      try {
        const clinicData = await apiClient.get(`/clinics/${id}/`);
        setClinic(clinicData);
        if (clinicData.services) {
          setServices(clinicData.services);
        } else {
          try {
            const srvData = await apiClient.get(`/clinics/${id}/services/`);
            setServices(srvData.results || srvData || []);
          } catch (e) {
            setServices([]);
          }
        }

        const doctorsData = await apiClient.get(`/doctors/?clinic_id=${id}`);
        setDoctors(doctorsData.results || doctorsData || []);

        const reviewsData = await apiClient.get(`/reviews/?clinic_id=${id}`);
        setReviews(reviewsData.results || reviewsData || []);
      } catch (err) {
        setError("Failed to load clinic details.");
      } finally {
        setLoading(false);
      }
    };

    fetchClinicData();
  }, [id]);

  const galleryItems = Array.isArray(clinic?.gallery) ? clinic.gallery : [];
  const galleryCategories = ["All", ...new Set(galleryItems.map((g) => g.category || "General").filter(Boolean))];
  const filteredGallery = selectedCategory === "All"
    ? galleryItems
    : galleryItems.filter((g) => (g.category || "General") === selectedCategory);

  const handleOpenLightbox = (index) => {
    setLightboxIndex(index);
  };
  const handleCloseLightbox = () => {
    setLightboxIndex(null);
  };
  const handleNextPhoto = () => {
    if (lightboxIndex !== null && filteredGallery.length > 0) {
      setLightboxIndex((prev) => (prev + 1) % filteredGallery.length);
    }
  };
  const handlePrevPhoto = () => {
    if (lightboxIndex !== null && filteredGallery.length > 0) {
      setLightboxIndex((prev) => (prev - 1 + filteredGallery.length) % filteredGallery.length);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") handleCloseLightbox();
      if (e.key === "ArrowRight") handleNextPhoto();
      if (e.key === "ArrowLeft") handlePrevPhoto();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, filteredGallery.length]);

  const filteredServices = Array.isArray(services) ? services.filter((srv) => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      srv.name?.toLowerCase().includes(q) ||
      srv.department_name?.toLowerCase().includes(q) ||
      srv.description?.toLowerCase().includes(q) ||
      srv.preparation_instructions?.toLowerCase().includes(q)
    );
  }) : [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <div className="skeleton h-48 w-full rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="skeleton h-64 w-full rounded-2xl"></div>
          <div className="skeleton h-64 w-full rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="alert alert-error">{error || "Clinic not found."}</div>
        <button onClick={handleGoBack} className="btn btn-outline btn-sm gap-2">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Smart Back Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm">
        <button
          type="button"
          onClick={handleGoBack}
          className="btn btn-ghost btn-sm gap-2 font-bold text-base-content/80 hover:text-primary"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              to="/dashboard"
              className="btn btn-outline btn-primary btn-sm gap-2 font-bold shadow-xs"
            >
              <LayoutDashboard size={16} /> Return to Dashboard
            </Link>
          )}
          <Link
            to="/clinics"
            className="btn btn-ghost btn-sm gap-1.5 font-semibold text-base-content/70 hover:text-primary"
          >
            <Building2 size={16} /> All Clinics
          </Link>
        </div>
      </div>

      {/* Clinic Header Banner */}
      <div className="bg-base-100 border border-base-200 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {clinic.logo_url ? (
              <img
                src={clinic.logo_url}
                alt={clinic.name}
                className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0 border border-base-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-content font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                {clinic.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-base-content">{clinic.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="badge badge-accent badge-soft font-semibold">{clinic.subscription_plan || "Verified"}</span>
                {clinic.average_rating ? (
                  <span className="badge badge-warning gap-1 font-bold text-xs text-amber-900 bg-amber-100 border-amber-300">
                    <Star size={12} className="fill-amber-400 text-amber-500" />
                    {clinic.average_rating} / 5 ({clinic.review_count || reviews.length} reviews)
                  </span>
                ) : null}
                <span className="text-sm text-base-content/60 flex items-center gap-1">
                  <MapPin size={14} className="text-primary" /> {clinic.city}
                </span>
              </div>
            </div>
          </div>
          <p className="text-base-content/70 max-w-2xl">{clinic.address}</p>
        </div>

        <div className="flex flex-wrap gap-3.5 text-sm bg-base-200/50 p-4 rounded-2xl border border-base-200">
          {clinic.emergency_contact && (
            <div className="flex items-center gap-2 text-error font-bold px-2 py-1 bg-error/10 rounded-xl border border-error/20">
              <PhoneCall size={16} className="text-error animate-pulse shrink-0" />
              <span>Emergency: {clinic.emergency_contact}</span>
            </div>
          )}
          {clinic.opening_hours && (
            <div className="flex items-center gap-2 text-base-content/80">
              <Clock size={16} className="text-primary shrink-0" />
              <span className="font-semibold">{clinic.opening_hours}</span>
            </div>
          )}
          {clinic.phone && (
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-primary shrink-0" />
              <span className="font-semibold">{clinic.phone}</span>
            </div>
          )}
          {clinic.email && (
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-primary shrink-0" />
              <span className="font-semibold">{clinic.email}</span>
            </div>
          )}
          {clinic.website && (
            <a
              href={clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline font-semibold"
            >
              <Globe size={16} className="shrink-0" /> Website <ExternalLink size={13} />
            </a>
          )}
          {clinic.latitude && clinic.longitude && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${clinic.latitude}&mlon=${clinic.longitude}#map=15/${clinic.latitude}/${clinic.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline font-semibold"
            >
              <MapPin size={16} className="shrink-0" /> View on Map <ExternalLink size={13} />
            </a>
          )}
          {clinic.certificate_url && (
            <a
              href={clinic.certificate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-success hover:underline font-semibold"
            >
              <Award size={16} className="shrink-0" /> Certificate <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* About Clinic & Facilities Section */}
      {(clinic.description || (clinic.facilities && clinic.facilities.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {clinic.description && (
            <div className={`${clinic.facilities?.length > 0 ? "lg:col-span-2" : "lg:col-span-3"} bg-base-100 border border-base-200 rounded-3xl p-6 shadow-sm space-y-3`}>
              <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
                <Info size={18} className="text-primary" /> About {clinic.name}
              </h2>
              <p className="text-sm text-base-content/80 whitespace-pre-line leading-relaxed">
                {clinic.description}
              </p>
            </div>
          )}

          {clinic.facilities && clinic.facilities.length > 0 && (
            <div className={`${clinic.description ? "lg:col-span-1" : "lg:col-span-3"} bg-base-100 border border-base-200 rounded-3xl p-6 shadow-sm space-y-3`}>
              <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
                <CheckCircle2 size={18} className="text-success" /> Facilities & Amenities
              </h2>
              <div className="flex flex-wrap gap-2">
                {clinic.facilities.map((fac, idx) => (
                  <span
                    key={idx}
                    className="badge badge-outline border-base-300 bg-base-200/50 text-xs font-semibold py-3 px-3.5 gap-1.5 text-base-content/80 shadow-xs"
                  >
                    <CheckCircle2 size={13} className="text-success" />
                    {fac}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clinic Virtual Tour & Photo Gallery Section */}
      {galleryItems.length > 0 && (
        <div className="space-y-5 bg-base-100 border border-base-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Camera className="text-primary" size={24} />
                <h2 className="text-2xl font-black text-base-content">
                  Virtual Tour &amp; Photo Showcase
                </h2>
                <span className="badge badge-primary badge-sm font-bold">{galleryItems.length}</span>
              </div>
              <p className="text-xs text-base-content/60 mt-0.5">
                Take a visual walkthrough of our reception, sanitized chambers, diagnostic labs, and patient care suites.
              </p>
            </div>

            {/* Category Filter Pills */}
            {galleryCategories.length > 2 && (
              <div className="flex flex-wrap items-center gap-1.5 bg-base-200/50 p-1.5 rounded-2xl border border-base-200">
                {galleryCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`btn btn-xs rounded-xl font-bold transition-all ${
                      selectedCategory === cat
                        ? "btn-primary shadow-xs"
                        : "btn-ghost text-base-content/70 hover:text-base-content"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGallery.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => handleOpenLightbox(idx)}
                className="group relative bg-base-200/30 rounded-2xl border border-base-200 overflow-hidden shadow-xs hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-base-300">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80"; }}
                  />
                  {item.is_featured && (
                    <span className="absolute top-3 left-3 badge badge-warning gap-1 font-bold text-xs shadow-md">
                      <Star size={12} className="fill-current" /> Featured
                    </span>
                  )}
                  <span className="absolute top-3 right-3 badge badge-neutral/85 backdrop-blur-md text-[11px] font-semibold text-white shadow-xs">
                    {item.category || "Facility"}
                  </span>

                  {/* Gradient Hover Prompt */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Maximize2 size={13} /> View Fullscreen
                      </span>
                      <span className="badge badge-xs badge-outline text-white border-white/60">
                        {idx + 1} of {filteredGallery.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-base-content group-hover:text-primary transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-base-content/70 line-clamp-2 mt-1 leading-relaxed">
                      {item.description || "Hygienic and fully equipped healthcare facility area."}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-base-content/50 border-t border-base-200/60">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-success" /> Verified In-Clinic
                    </span>
                    <span className="text-primary font-semibold group-hover:underline">Explore ↗</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Services & Diagnostic Tests Section */}
      {services && services.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-base-content flex items-center gap-2">
                <Activity className="text-primary" /> Clinical Services & Diagnostic Tests ({services.length})
              </h2>
              <p className="text-xs text-base-content/60">
                In-house lab tests, imaging, investigations, and healthcare services offered at this clinic.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search test or service..."
                className="input input-sm input-bordered w-full pl-9 pr-3 rounded-xl bg-base-100"
              />
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="p-8 text-center bg-base-100 rounded-2xl border border-base-200 text-base-content/60 text-sm">
              No services match "{serviceSearch}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-base-content">{srv.name}</h3>
                        {srv.department_name && (
                          <span className="badge badge-ghost badge-sm text-[11px] font-semibold mt-1">
                            {srv.department_name}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-primary">৳ {srv.fee}</div>
                        {srv.duration_minutes ? (
                          <div className="text-[11px] text-base-content/50 flex items-center justify-end gap-1">
                            <Clock size={11} /> {srv.duration_minutes}m
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {srv.description && (
                      <p className="text-xs text-base-content/70 line-clamp-2">{srv.description}</p>
                    )}

                    {srv.preparation_instructions && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-2.5 rounded-xl text-xs flex items-start gap-2">
                        <FileText size={14} className="shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Instructions: </span>
                          {srv.preparation_instructions}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-base-200/80 flex items-center justify-between text-xs text-base-content/60">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Available In-Clinic
                    </span>
                    <span className="text-[11px] text-base-content/40">Walk-ins welcome</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Departments Section */}
      {clinic.departments && clinic.departments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
            <Stethoscope className="text-primary" /> Medical Departments
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {clinic.departments.map((dept) => (
              <div key={dept.id} className="p-4 bg-base-100 border border-base-200 rounded-2xl text-center space-y-1 shadow-sm hover:border-primary transition-colors">
                <div className="font-bold text-base-content">{dept.name}</div>
                {dept.description && <div className="text-xs text-base-content/60">{dept.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practicing Doctors Section */}
      <div className="space-y-6 pt-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-base-content flex items-center gap-2">
            <UserCheck className="text-primary" /> {t("clinicDetailPracticingDoctors")} ({doctors.length})
          </h2>
        </div>

        {doctors.length === 0 ? (
          <div className="p-8 text-center bg-base-100 rounded-2xl border border-base-200 text-base-content/60">
            {t("clinicDetailNoDoctors")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => {
              const bookUrl = user
                ? `/book?clinic=${clinic.id}&doctor=${doctor.id}`
                : `/login?next=/book?clinic=${clinic.id}&doctor=${doctor.id}`;

              return (
                <div key={doctor.id} className="card bg-base-100 border border-base-200 shadow-md hover:shadow-lg transition-all rounded-2xl">
                  <div className="card-body p-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {doctor.avatar_url ? (
                          <img
                            src={doctor.avatar_url}
                            alt={doctor.full_name}
                            className="w-12 h-12 rounded-xl object-cover shadow-xs shrink-0 border border-base-200"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center shrink-0 border border-primary/20">
                            {doctor.full_name ? doctor.full_name[0].toUpperCase() : "D"}
                          </div>
                        )}
                        <div>
                          <h3 className="card-title text-lg font-bold text-base-content">
                            Dr. {doctor.full_name}
                          </h3>
                          <p className="text-xs text-primary font-semibold">{doctor.qualification || "Medical Specialist"}</p>
                        </div>
                      </div>
                      <span className="badge badge-secondary badge-outline text-xs shrink-0">
                        {doctor.experience_years} {language === "bn" ? "বছরের অভিজ্ঞতা" : "yrs exp"}
                      </span>
                    </div>

                    {doctor.specializations && doctor.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doctor.specializations.map((spec) => (
                          <span key={spec.id} className="badge badge-sm badge-ghost">
                            {spec.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-base-content/70 line-clamp-2">{doctor.bio || "Dedicated healthcare professional providing compassionate care."}</p>

                    <div className="card-actions justify-end pt-3 border-t border-base-200">
                      <Link
                        to={bookUrl}
                        className="btn btn-primary btn-sm w-full gap-2"
                      >
                        <CalendarCheck size={16} /> {t("clinicDetailBookAppointment")}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Reviews Section */}
      <div className="space-y-4 pt-6 border-t border-base-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
              <Star className="text-warning fill-warning" size={20} /> Verified Patient Reviews
            </h2>
            <p className="text-xs text-base-content/60">
              Honest ratings and feedback submitted by patients after completing visits.
            </p>
          </div>
          {reviews.length > 0 && (
            <span className="badge badge-warning badge-soft font-bold text-xs">
              {reviews.length} Verified Review{reviews.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-10 bg-base-100 rounded-3xl border border-base-200 text-xs text-base-content/50 space-y-1">
            <MessageSquare size={28} className="mx-auto text-base-content/30 mb-2" />
            <div className="font-semibold text-base-content/70">No patient reviews yet for this clinic</div>
            <div>Reviews appear automatically after verified patients complete their consultations.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-base-100 border border-base-200 p-5 rounded-2xl space-y-2.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-extrabold text-sm text-base-content">{rev.patient_name}</div>
                    <div className="text-[11px] text-base-content/50">
                      Dr. {rev.doctor_name} · {new Date(rev.created_at).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={s <= rev.rating ? "text-warning fill-warning" : "text-base-300"}
                      />
                    ))}
                    <span className="font-black text-xs text-amber-700 ml-1">{rev.rating}.0</span>
                  </div>
                </div>
                {rev.comment ? (
                  <p className="text-xs text-base-content/80 leading-relaxed italic bg-base-200/40 p-3 rounded-xl">
                    "{rev.comment}"
                  </p>
                ) : (
                  <div className="text-[11px] text-base-content/40 italic">Rated {rev.rating} stars with no written comment.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && filteredGallery[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
          onClick={handleCloseLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleCloseLightbox}
            className="btn btn-circle btn-sm sm:btn-md btn-ghost absolute top-4 right-4 text-white bg-white/10 hover:bg-white/25 z-50 shadow-lg"
          >
            <X size={22} />
          </button>

          {/* Left Arrow */}
          {filteredGallery.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }}
              className="btn btn-circle btn-sm sm:btn-md btn-ghost absolute left-3 sm:left-6 text-white bg-white/10 hover:bg-white/25 z-50 shadow-lg"
              title="Previous Photo (Left Arrow)"
            >
              <ChevronLeft size={26} />
            </button>
          )}

          {/* Right Arrow */}
          {filteredGallery.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
              className="btn btn-circle btn-sm sm:btn-md btn-ghost absolute right-3 sm:right-6 text-white bg-white/10 hover:bg-white/25 z-50 shadow-lg"
              title="Next Photo (Right Arrow)"
            >
              <ChevronRight size={26} />
            </button>
          )}

          {/* Center Card */}
          <div
            className="max-w-4xl w-full max-h-[92vh] flex flex-col bg-base-100 rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-black flex items-center justify-center max-h-[65vh] overflow-hidden">
              <img
                src={filteredGallery[lightboxIndex].image_url}
                alt={filteredGallery[lightboxIndex].title}
                className="w-full h-auto max-h-[65vh] object-contain"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80"; }}
              />
              <span className="absolute bottom-3 right-3 badge badge-neutral/80 backdrop-blur-md text-white text-xs font-bold shadow-md">
                {lightboxIndex + 1} / {filteredGallery.length}
              </span>
            </div>

            <div className="p-5 sm:p-6 bg-base-100 space-y-2 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-base-content">
                  {filteredGallery[lightboxIndex].title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary font-bold text-xs">
                    {filteredGallery[lightboxIndex].category}
                  </span>
                  {filteredGallery[lightboxIndex].is_featured && (
                    <span className="badge badge-warning gap-1 font-bold text-xs">
                      <Star size={11} className="fill-current" /> Cover
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-base-content/80 whitespace-pre-line leading-relaxed">
                {filteredGallery[lightboxIndex].description || "Hygienic, fully equipped healthcare facility area for patient consultation and medical services."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
