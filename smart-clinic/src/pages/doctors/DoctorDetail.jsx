import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import apiClient from "../../api/axios";
import {
  Stethoscope, Award, CalendarCheck, MapPin, Phone, Mail,
  Building2, ArrowLeft, Star, MessageSquare, ExternalLink,
  ShieldCheck, LayoutDashboard
} from "lucide-react";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import { formatCurrency } from "../../utils/formatters";

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/doctors");
    }
  };

  useEffect(() => {
    const fetchDoctorData = async () => {
      setLoading(true);
      setError("");
      try {
        const docData = await apiClient.get(`/doctors/${id}/`);
        setDoctor(docData);

        const revData = await apiClient.get(`/reviews/?doctor_id=${id}`);
        setReviews(revData.results || revData || []);
      } catch {
        setError(language === "bn" ? "ডাক্তার প্রোফাইল লোড করা যায়নি।" : "Failed to load doctor profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, [id, language]);

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

  if (error || !doctor) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="alert alert-error">{error || (language === "bn" ? "ডাক্তার পাওয়া যায়নি।" : "Doctor not found.")}</div>
        <button onClick={handleGoBack} className="btn btn-outline btn-sm gap-2">
          <ArrowLeft size={16} /> {t("docDetailBack")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Smart Back Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm">
        <button
          type="button"
          onClick={handleGoBack}
          className="btn btn-ghost btn-sm gap-2 font-bold text-base-content/80 hover:text-primary"
        >
          <ArrowLeft size={18} /> {t("docDetailBack")}
        </button>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              to="/dashboard"
              className="btn btn-outline btn-primary btn-sm gap-2 font-bold shadow-xs"
            >
              <LayoutDashboard size={16} /> {t("docDetailReturnDashboard")}
            </Link>
          )}
          <Link
            to="/doctors"
            className="btn btn-ghost btn-sm gap-1.5 font-semibold text-base-content/70 hover:text-primary"
          >
            <Stethoscope size={16} /> {t("docDetailAllDoctors")}
          </Link>
        </div>
      </div>

      {/* Doctor Header Banner */}
      <div className="bg-base-100 border border-base-200 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5">
          {doctor.avatar_url ? (
            <img
              src={doctor.avatar_url}
              alt={doctor.full_name}
              className="w-24 h-24 rounded-3xl object-cover shadow-md shrink-0 border-2 border-primary/20"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-secondary text-primary-content font-black text-4xl flex items-center justify-center shadow-lg shrink-0">
              {doctor.full_name ? doctor.full_name[0].toUpperCase() : "D"}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-base-content">
                Dr. {doctor.full_name}
              </h1>
              <span className="badge badge-success badge-soft text-xs gap-1 font-bold">
                <ShieldCheck size={12} /> {t("docDetailVerified")}
              </span>
            </div>

            <p className="text-sm text-primary font-bold">{doctor.qualification || "Registered Medical Practitioner"}</p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/70">
              <span className="badge badge-outline gap-1 font-semibold">
                <Award size={13} className="text-warning" /> {doctor.experience_years} {t("docDetailYearsExp")}
              </span>

              {doctor.average_rating ? (
                <span className="badge badge-warning gap-1 font-bold text-xs text-amber-900 bg-amber-100 border-amber-300">
                  <Star size={12} className="fill-amber-400 text-amber-500" />
                  {doctor.average_rating} / 5 ({doctor.review_count || reviews.length} {t("docDetailReviews")})
                </span>
              ) : null}
            </div>

            {doctor.specializations && doctor.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {doctor.specializations.map((spec) => (
                  <span key={spec.id} className="badge badge-primary badge-sm font-semibold">
                    {spec.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Doctor Contact / License Box */}
        <div className="flex flex-col gap-2 text-xs bg-base-200/50 p-4 rounded-2xl border border-base-200 shrink-0 w-full md:w-auto">
          {doctor.phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-primary" />
              <span className="font-semibold">{doctor.phone}</span>
            </div>
          )}
          {doctor.email && (
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-primary" />
              <span className="font-semibold">{doctor.email}</span>
            </div>
          )}
          {doctor.certificate_url && (
            <a
              href={doctor.certificate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-success hover:underline font-semibold pt-1"
            >
              <Award size={14} /> {t("docDetailCert")} <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Bio / Summary */}
      {doctor.bio && (
        <div className="bg-base-100 border border-base-200 rounded-3xl p-6 shadow-sm space-y-2">
          <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
            <Stethoscope className="text-primary" size={20} /> {t("docDetailAbout")} Dr. {doctor.full_name}
          </h2>
          <p className="text-sm text-base-content/80 leading-relaxed whitespace-pre-line">
            {doctor.bio}
          </p>
        </div>
      )}

      {/* Practicing Clinics & Chamber Details */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
          <Building2 className="text-primary" size={22} /> {t("docDetailClinicsTitle")} ({doctor.doctor_clinics?.length || 0})
        </h2>

        {(!doctor.doctor_clinics || doctor.doctor_clinics.length === 0) ? (
          <div className="p-8 text-center bg-base-100 rounded-2xl border border-base-200 text-base-content/60">
            {t("docDetailNoClinics")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doctor.doctor_clinics.map((dc) => {
              const bookUrl = user
                ? `/book?clinic=${dc.clinic?.id}&doctor=${doctor.id}`
                : `/login?next=/book?clinic=${dc.clinic?.id}&doctor=${doctor.id}`;

              return (
                <div
                  key={dc.id}
                  className="bg-base-100 border border-base-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-base-content hover:text-primary transition-colors">
                          <Link to={`/clinics/${dc.clinic?.id}`}>{dc.clinic?.name}</Link>
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-base-content/60 mt-1">
                          <MapPin size={13} className="text-primary shrink-0" />
                          <span>{dc.clinic?.address}, {dc.clinic?.city}</span>
                        </div>
                      </div>
                      <div className="badge badge-accent badge-soft text-xs font-bold shrink-0">
                        {dc.department?.name || "Consultant"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-200 text-xs">
                      <span className="font-semibold text-base-content/70">{t("docDetailFee")}</span>
                      <span className="font-black text-base text-primary">{formatCurrency(dc.consultation_fee)} BDT</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-base-200 flex gap-2">
                    <Link
                      to={`/clinics/${dc.clinic?.id}`}
                      className="btn btn-outline btn-sm flex-1 text-xs"
                    >
                      {t("docDetailViewClinic")}
                    </Link>
                    <Link
                      to={bookUrl}
                      className="btn btn-primary btn-sm flex-1 text-xs gap-1.5 shadow-sm"
                    >
                      <CalendarCheck size={15} /> {t("docDetailBookHere")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verified Patient Reviews */}
      <div className="space-y-4 pt-4 border-t border-base-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
              <Star className="text-warning fill-warning" size={20} /> {t("docDetailVerifiedReviews")}
            </h2>
            <p className="text-xs text-base-content/60">
              {t("docDetailReviewsSub")} Dr. {doctor.full_name}
            </p>
          </div>
          {reviews.length > 0 && (
            <span className="badge badge-warning badge-soft font-bold text-xs">
              {reviews.length} {t("docDetailReviews")}
            </span>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-10 bg-base-100 rounded-3xl border border-base-200 text-xs text-base-content/50 space-y-1">
            <MessageSquare size={28} className="mx-auto text-base-content/30 mb-2" />
            <div className="font-semibold text-base-content/70">{t("docDetailNoReviewsYet")}</div>
            <div>{t("docDetailNoReviewsSub")}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-base-100 border border-base-200 p-5 rounded-2xl space-y-2.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-extrabold text-sm text-base-content">{rev.patient_name}</div>
                    <div className="text-[11px] text-base-content/50">
                      {new Date(rev.created_at).toLocaleDateString("en-GB")}
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
                  <div className="text-[11px] text-base-content/40 italic">
                    {language === "bn" ? `রেটিং ${rev.rating} স্টার (কোনো লিখিত মতামত নেই)` : `Rated ${rev.rating} stars with no written feedback.`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
