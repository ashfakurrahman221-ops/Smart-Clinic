import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import apiClient from "../../api/axios";
import { Stethoscope, Award, CalendarCheck, Star, Filter, Building2, Search, MapPin, X } from "lucide-react";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import { formatCurrency } from "../../utils/formatters";
import useBangladeshGeo from "../../hooks/useBangladeshGeo";

export default function DoctorList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState("");
  const [searchDoctor, setSearchDoctor] = useState("");
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    divisions: geoDivisions,
    districts: geoDistricts,
    fetchDistricts: fetchGeoDistricts,
  } = useBangladeshGeo();

  const fetchData = async (overrides = {}) => {
    setLoading(true);
    setError("");
    try {
      const specRes = await apiClient.get("/doctors/specializations/");
      setSpecializations(specRes.results || specRes || []);

      const specId = overrides.specId !== undefined ? overrides.specId : selectedSpec;
      const divisionId = overrides.divisionId !== undefined ? overrides.divisionId : selectedDivisionId;
      const districtId = overrides.districtId !== undefined ? overrides.districtId : selectedDistrictId;
      const search = overrides.search !== undefined ? overrides.search : searchDoctor;

      const params = new URLSearchParams();
      if (specId) params.append("specialization_id", specId);
      if (divisionId) params.append("division_id", divisionId);
      if (districtId) params.append("district_id", districtId);
      if (search) params.append("search", search.trim());

      const qs = params.toString() ? `?${params.toString()}` : "";
      const docRes = await apiClient.get(`/doctors/${qs}`);
      setDoctors(docRes.results || docRes || []);
    } catch {
      setError("Failed to fetch doctors list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (e) => {
    const specId = e.target.value;
    setSelectedSpec(specId);
    fetchData({ specId });
  };

  const handleDivisionChange = (e) => {
    const divId = e.target.value;
    setSelectedDivisionId(divId);
    setSelectedDistrictId("");
    fetchGeoDistricts(divId);
    fetchData({ divisionId: divId, districtId: "" });
  };

  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    setSelectedDistrictId(distId);
    fetchData({ districtId: distId });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-secondary/90 via-primary to-accent text-white p-8 md:p-12 rounded-3xl shadow-2xl space-y-4">
        <div className="badge badge-lg bg-white/20 text-white border-none gap-2 font-medium">
          <Stethoscope size={16} /> {t("doctorPageBadge")}
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          {t("doctorPageTitle")}
        </h1>
        <p className="text-white/80 text-base md:text-lg max-w-2xl">
          {t("doctorPageSubtitle")}
        </p>

        {/* Search & Geo Filters Bar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          {/* Name/Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={language === "bn" ? "ডাক্তারের নাম দিয়ে খুঁজুন..." : "Search doctor name..."}
              value={searchDoctor}
              onChange={(e) => setSearchDoctor(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:outline-none shadow-md"
            />
          </div>

          {/* Specialization Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={selectedSpec}
              onChange={handleFilterChange}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:outline-none shadow-md cursor-pointer"
            >
              <option value="">{t("doctorAllSpecs")}</option>
              {specializations.map((spec) => (
                <option key={spec.id} value={spec.id}>{spec.name}</option>
              ))}
            </select>
          </div>

          {/* Division Filter */}
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={selectedDivisionId}
              onChange={handleDivisionChange}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:outline-none shadow-md cursor-pointer"
            >
              <option value="">{language === "bn" ? "সকল বিভাগ (All Divisions)" : "All Divisions"}</option>
              {geoDivisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {language === "bn" && div.bn_name ? div.bn_name : div.name}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={selectedDistrictId}
              onChange={handleDistrictChange}
              disabled={!selectedDivisionId}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:outline-none shadow-md cursor-pointer disabled:opacity-50"
            >
              <option value="">{language === "bn" ? "সকল জেলা (All Districts)" : "All Districts"}</option>
              {geoDistricts.map((dist) => (
                <option key={dist.id} value={dist.id}>
                  {language === "bn" && dist.bn_name ? dist.bn_name : dist.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Doctor Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-base-200">
          <div className="text-sm font-bold text-base-content/70">
            {language === "bn" ? (
              <><span className="text-primary font-black">{doctors.length}</span> {t("doctorRegisteredSpecs")}</>
            ) : (
              <>{t("doctorShowingCount")} <span className="text-primary font-black">{doctors.length}</span> {t("doctorRegisteredSpecs")}</>
            )}
          </div>
          <Link
            to="/clinics"
            className="btn btn-ghost btn-sm gap-1.5 text-xs font-bold text-primary hover:bg-primary/10"
          >
            <Building2 size={14} /> {t("doctorViewClinics")}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-64 w-full rounded-2xl"></div>
            ))}
          </div>
        ) : error ? (
          <div className="alert alert-error shadow-md">{error}</div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-16 bg-base-100 rounded-3xl border border-base-200">
            <Stethoscope size={48} className="mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-bold text-base-content">{t("doctorNotFound")}</h3>
            <p className="text-base-content/60 mt-1">{t("doctorNotFoundMsg")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="card bg-base-100 border border-base-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden group"
              >
                <div className="card-body p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    {doctor.avatar_url ? (
                      <img
                        src={doctor.avatar_url}
                        alt={doctor.full_name}
                        className="w-16 h-16 rounded-2xl object-cover shadow-sm shrink-0 border border-base-200"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-black flex items-center justify-center text-2xl shrink-0 border border-primary/20 shadow-xs">
                        {doctor.full_name ? doctor.full_name[0].toUpperCase() : "D"}
                      </div>
                    )}
                    <div>
                      <h2 className="card-title text-xl font-bold text-base-content group-hover:text-primary transition-colors">
                        <Link to={`/doctors/${doctor.id}`}>Dr. {doctor.full_name}</Link>
                      </h2>
                      <p className="text-xs text-primary font-semibold">
                        {doctor.qualification || "Medical Specialist"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-base-content/60">
                        <div className="flex items-center gap-1">
                          <Award size={14} className="text-warning" />
                          <span>{doctor.experience_years} {t("doctorYrsExp")}</span>
                        </div>
                        {doctor.average_rating ? (
                          <div className="flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            <span>{doctor.average_rating} ({doctor.review_count})</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-base-content/40">{t("doctorNoReviews")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Specializations */}
                  {doctor.specializations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doctor.specializations.map((spec) => (
                        <span key={spec.id} className="badge badge-accent badge-soft text-xs">
                          {spec.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  <p className="text-xs text-base-content/70 line-clamp-2">
                    {doctor.bio || "Dedicated healthcare practitioner providing attentive patient care."}
                  </p>

                  {/* Practicing Clinics */}
                  {doctor.doctor_clinics?.length > 0 && (
                    <div className="pt-2 border-t border-base-200 text-xs text-base-content/70">
                      <span className="font-semibold text-base-content flex items-center gap-1">
                        <Building2 size={14} className="text-primary" /> {t("doctorPracticingClinics")}
                      </span>
                      <ul className="mt-1 space-y-1 pl-4 list-disc">
                        {doctor.doctor_clinics.map((dc) => (
                          <li key={dc.id}>
                            <span className="font-medium">{dc.clinic?.name}</span>
                            {" - "}{t("doctorFee")} {formatCurrency(dc.consultation_fee)} BDT
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="card-actions justify-end pt-3 border-t border-base-200 flex gap-2">
                    <Link
                      to={`/doctors/${doctor.id}`}
                      className="btn btn-outline btn-sm flex-1 text-xs"
                    >
                      {t("doctorViewProfile")}
                    </Link>
                    <Link
                      to={user ? `/book?doctor=${doctor.id}` : `/login?next=/book?doctor=${doctor.id}`}
                      className="btn btn-primary btn-sm flex-1 text-xs gap-1.5 shadow-sm"
                    >
                      <CalendarCheck size={15} /> {t("doctorBookBtn")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
