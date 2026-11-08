import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import apiClient from "../../api/axios";
import { Stethoscope, Award, CalendarCheck, Star, Filter, Building2, Search, MapPin, X } from "lucide-react";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import { formatCurrency } from "../../utils/formatters";
import useBangladeshGeo from "../../hooks/useBangladeshGeo";

const formatDoctorName = (name) => {
  if (!name) return "";
  const cleaned = String(name).trim();
  return /^dr\.?\s/i.test(cleaned) ? cleaned : `Dr. ${cleaned}`;
};

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

  const handleFilterChange = (specId) => {
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

      {/* Modern Clinical Header Banner */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0d9488] text-white p-8 md:p-12 rounded-3xl shadow-xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-xs">
          <Stethoscope size={15} /> <span>{t("doctorPageBadge")}</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          {t("doctorPageTitle")}
        </h1>
        <p className="text-blue-100 text-sm md:text-base max-w-2xl leading-relaxed">
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

          {/* Specialization Filter Dropdown */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={selectedSpec}
              onChange={(e) => handleFilterChange(e.target.value)}
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

        {/* Horizontal Quick-Filter Specialization Chips */}
        {specializations.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => handleFilterChange("")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                selectedSpec === ""
                  ? "bg-white text-[#1e3a8a] shadow-md scale-105"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {language === "bn" ? "সকল বিভাগ" : "All Specialties"}
            </button>
            {specializations.slice(0, 8).map((spec) => (
              <button
                key={spec.id}
                type="button"
                onClick={() => handleFilterChange(spec.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                  selectedSpec === spec.id
                    ? "bg-white text-[#1e3a8a] shadow-md scale-105"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {spec.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Doctor Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="text-sm font-extrabold text-slate-700">
            {language === "bn" ? (
              <><span className="text-[#1e3a8a] font-black">{doctors.length}</span> {t("doctorRegisteredSpecs")}</>
            ) : (
              <>{t("doctorShowingCount")} <span className="text-[#1e3a8a] font-black">{doctors.length}</span> {t("doctorRegisteredSpecs")}</>
            )}
          </div>
          <Link
            to="/clinics"
            className="btn btn-ghost btn-sm gap-1.5 text-xs font-bold text-[#1e3a8a] hover:bg-blue-50"
          >
            <Building2 size={14} /> {t("doctorViewClinics")}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-shimmer h-64 w-full rounded-2xl border border-slate-200"></div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">{error}</div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-2xs">
            <Stethoscope size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">{t("doctorNotFound")}</h3>
            <p className="text-xs text-slate-500 mt-1">{t("doctorNotFoundMsg")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden card-hover-elevation flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    {doctor.avatar_url ? (
                      <img
                        src={doctor.avatar_url}
                        alt={doctor.full_name}
                        className="w-16 h-16 rounded-2xl object-cover shadow-2xs shrink-0 border border-slate-200"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1e3a8a] font-black flex items-center justify-center text-xl shrink-0 border border-blue-200/60 shadow-2xs">
                        {doctor.full_name ? doctor.full_name.replace(/^dr\.?\s*/i, "")[0]?.toUpperCase() : "D"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-extrabold text-slate-900 hover:text-[#1e3a8a] transition-colors truncate">
                        <Link to={`/doctors/${doctor.id}`}>{formatDoctorName(doctor.full_name)}</Link>
                      </h2>
                      <p className="text-xs text-[#0d9488] font-bold">
                        {doctor.qualification || "Medical Specialist"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1 font-medium text-[11px]">
                          <Award size={13} className="text-amber-500" />
                          <span>{doctor.experience_years} {t("doctorYrsExp")}</span>
                        </div>
                        {doctor.average_rating ? (
                          <div className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md text-[10px]">
                            <Star size={11} className="fill-amber-500 text-amber-500" />
                            <span>{doctor.average_rating} ({doctor.review_count})</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Specializations Chips */}
                  {doctor.specializations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doctor.specializations.map((spec) => (
                        <span key={spec.id} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {spec.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {doctor.bio || "Dedicated healthcare practitioner providing attentive patient care."}
                  </p>

                  {/* Practicing Clinics */}
                  {doctor.doctor_clinics?.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                        <Building2 size={13} className="text-[#1e3a8a]" /> {t("doctorPracticingClinics")}
                      </span>
                      <div className="space-y-1">
                        {doctor.doctor_clinics.slice(0, 2).map((dc) => (
                          <div key={dc.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                            <span className="font-semibold text-slate-800 truncate mr-2">{dc.clinic?.name}</span>
                            <span className="font-black text-[#0d9488] shrink-0">{formatCurrency(dc.consultation_fee)} BDT</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex gap-2">
                  <Link
                    to={`/doctors/${doctor.id}`}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white transition-all text-center flex-1 shadow-2xs"
                  >
                    {t("doctorViewProfile")}
                  </Link>
                  <Link
                    to={`/book?doctor=${doctor.id}`}
                    className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-extrabold transition-all text-center flex-1 flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/15 active:scale-95"
                  >
                    <CalendarCheck size={14} />
                    <span>{t("doctorBookBtn")}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
