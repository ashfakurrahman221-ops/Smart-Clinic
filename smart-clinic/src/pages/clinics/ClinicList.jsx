import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import apiClient from "../../api/axios";
import {
  MapPin, Phone, Mail, Building2, Search, ArrowRight,
  Stethoscope, ShieldCheck, Navigation, LocateFixed, Loader2, X
} from "lucide-react";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import useBangladeshGeo from "../../hooks/useBangladeshGeo";

// Bangladesh 8 official division names in EN and BN
const DIVISIONS_EN = [
  "All", "Dhaka", "Chattogram", "Rajshahi",
  "Khulna", "Barishal", "Sylhet", "Rangpur", "Mymensingh"
];
const DIVISIONS_BN = [
  "সকল", "ঢাকা", "চট্টগ্রাম", "রাজশাহী",
  "খুলনা", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ"
];

// Haversine formula — returns distance in km between two lat/lng points
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEAREST_COUNT = 7;

export default function ClinicList() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("All");
  const [error, setError] = useState("");

  // Bangladesh Official Geo Hook
  const {
    divisions: geoDivisions,
    districts: geoDistricts,
    handleDivisionChange: setGeoDivision,
  } = useBangladeshGeo();
  const [selectedGeoDivisionId, setSelectedGeoDivisionId] = useState("");
  const [selectedGeoDistrictId, setSelectedGeoDistrictId] = useState("");

  // Location state
  const [userLocation, setUserLocation] = useState(null);     // { lat, lng }
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const divisions = language === "bn" ? DIVISIONS_BN : DIVISIONS_EN;

  const getEnglishDivision = (div) => {
    const idx = divisions.indexOf(div);
    return idx !== -1 ? DIVISIONS_EN[idx] : div;
  };

  const [allClinicsCache, setAllClinicsCache] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch clinics from API with division_id and district_id support
  const fetchClinics = useCallback(async ({ division = "", division_id = "", district_id = "", search = "" } = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (division_id) {
        params.append("division_id", division_id);
      } else if (division && division !== "All") {
        params.append("city", division);
      }
      if (district_id) {
        params.append("district_id", district_id);
      }
      if (search) {
        params.append("search", search.trim());
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiClient.get(`/clinics/${qs}`);
      const list = res.results || res || [];
      setClinics(list);
      if (!division && !division_id && !district_id && !search) {
        setAllClinicsCache(list);
      }
    } catch {
      setError("Failed to load clinics. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  // Suggestions for Google-like autocomplete dropdown
  const suggestions = useMemo(() => {
    const q = searchCity.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return allClinicsCache
      .filter((c) => {
        const full = (c.name + " " + c.city + " " + (c.address || "")).toLowerCase();
        return q.split(" ").some((w) => w.length >= 2 && full.includes(w));
      })
      .slice(0, 6);
  }, [searchCity, allClinicsCache]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setSelectedDivision(divisions[0]);
    fetchClinics({ search: searchCity });
  };

  const handleSelectSuggestion = (clinicName) => {
    setSearchCity(clinicName);
    setShowSuggestions(false);
    setSelectedDivision(divisions[0]);
    fetchClinics({ search: clinicName });
  };

  const handleClearSearch = () => {
    setSearchCity("");
    setShowSuggestions(false);
    fetchClinics({ division: getEnglishDivision(selectedDivision) });
  };

  // Auto-detect location for registered users only
  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setLocationDenied(true);
        setLocationLoading(false);
      },
      { timeout: 8000 }
    );
  }, [user]);

  // Manual location request
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    setLocationDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setLocationDenied(true);
        setLocationLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleDivisionClick = (div) => {
    setSelectedDivision(div);
    setSelectedGeoDistrictId("");
    setSearchCity("");

    if (div === divisions[0] || div === "All" || div === "সকল") {
      setSelectedGeoDivisionId("");
      setGeoDivision("");
      fetchClinics({});
      return;
    }

    const enDiv = getEnglishDivision(div);
    const matched = geoDivisions.find(
      (gd) => gd.name.toLowerCase() === enDiv.toLowerCase()
    );
    if (matched) {
      setSelectedGeoDivisionId(matched.id);
      setGeoDivision(matched.id);
      fetchClinics({ division_id: matched.id });
    } else {
      setSelectedGeoDivisionId("");
      setGeoDivision("");
      fetchClinics({ division: enDiv });
    }
  };

  const handleDistrictClick = (district) => {
    if (selectedGeoDistrictId === district.id) {
      setSelectedGeoDistrictId("");
      fetchClinics({ division_id: selectedGeoDivisionId });
    } else {
      setSelectedGeoDistrictId(district.id);
      fetchClinics({ division_id: selectedGeoDivisionId, district_id: district.id });
    }
  };

  const isAllSelected = selectedDivision === divisions[0];

  // Add distance to each clinic and sort
  const clinicsWithDistance = clinics.map((c) => ({
    ...c,
    distanceKm:
      userLocation && c.latitude && c.longitude
        ? getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(c.latitude), parseFloat(c.longitude))
        : null,
  }));

  // Nearest section — only when location available and no active filter
  const nearestClinics =
    userLocation && isAllSelected && !searchCity
      ? [...clinicsWithDistance]
          .filter((c) => c.distanceKm !== null)
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, NEAREST_COUNT)
      : [];

  // All clinics — sorted by rating, excluding already-shown nearest clinics
  const nearestIds = new Set(nearestClinics.map((c) => c.id));
  const sortedClinics = [...clinicsWithDistance]
    .filter((c) => !nearestIds.has(c.id))
    .sort((a, b) => {
      const aR = a.average_rating ?? null;
      const bR = b.average_rating ?? null;
      if (aR !== null && bR !== null) return bR - aR;
      if (aR !== null) return -1;
      if (bR !== null) return 1;
      return 0;
    });

  // Star renderer
  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.round(rating) ? "text-amber-400" : "text-slate-200"}>★</span>
    ));

  // Reusable clinic card
  const ClinicCard = ({ clinic, idx }) => {
    const avatarColors = [
      "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600",
      "from-violet-500 to-purple-600", "from-rose-500 to-pink-600",
      "from-amber-500 to-orange-600",
    ];
    const gradientClass = avatarColors[idx % avatarColors.length];
    const initial = clinic.name?.charAt(0)?.toUpperCase() || "C";
    const hasRating = clinic.average_rating !== null && clinic.average_rating !== undefined;
    const isNew = !hasRating;

    return (
      <div className="card bg-base-100 border border-base-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden group flex flex-col justify-between">
        <div className="h-2 bg-gradient-to-r from-primary to-secondary"></div>
        <div className="card-body p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            {clinic.logo_url ? (
              <img src={clinic.logo_url} alt={clinic.name}
                className="w-16 h-16 rounded-2xl object-cover shadow-sm shrink-0 border border-base-200" />
            ) : (
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-black text-2xl shadow-sm shrink-0`}>
                {initial}
              </div>
            )}
            <div className="space-y-1 flex-1 min-w-0">
              <h2 className="card-title text-lg font-extrabold text-base-content group-hover:text-primary transition-colors leading-tight">
                {clinic.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="badge badge-success badge-soft text-[10px] font-bold gap-1">
                  <ShieldCheck size={10} /> {t("clinicVerified")}
                </span>
                {isNew && (
                  <span className="badge badge-warning badge-soft text-[10px] font-bold">
                    ✨ {t("clinicNewBadge")}
                  </span>
                )}
                {clinic.distanceKm !== null && (
                  <span className="badge badge-info badge-soft text-[10px] font-bold gap-1">
                    <MapPin size={9} /> {clinic.distanceKm.toFixed(1)} {t("clinicAwayKm")}
                  </span>
                )}
                <span className="badge badge-primary badge-outline text-[10px] font-bold">
                  {clinic.city}
                </span>
              </div>

              {/* Rating */}
              {hasRating ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="flex text-sm leading-none">{renderStars(clinic.average_rating)}</div>
                  <span className="text-xs font-black text-slate-700">{clinic.average_rating}</span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({clinic.review_count} {t("clinicReviews")})
                  </span>
                </div>
              ) : (
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 italic">{t("clinicNoRating")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2 text-xs text-base-content/70">
            <div className="flex items-start gap-2">
              <MapPin size={15} className="text-primary shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed">{clinic.address}, {clinic.city}</span>
            </div>
            {clinic.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-primary shrink-0" />
                <span className="font-semibold">{clinic.phone}</span>
              </div>
            )}
            {clinic.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-primary shrink-0" />
                <span className="line-clamp-1">{clinic.email}</span>
              </div>
            )}
          </div>

          {/* Departments */}
          {clinic.departments?.length > 0 && (
            <div className="pt-2 border-t border-base-200">
              <div className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider mb-1.5">
                {t("clinicSpecializedDepts")} ({clinic.departments.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {clinic.departments.slice(0, 3).map((dept) => (
                  <span key={dept.id} className="badge badge-sm badge-ghost font-medium text-[10px]">
                    {dept.name}
                  </span>
                ))}
                {clinic.departments.length > 3 && (
                  <span className="badge badge-ghost badge-sm text-[10px] text-base-content/50">
                    +{clinic.departments.length - 3} {t("clinicMore")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="card-actions justify-end pt-3 border-t border-base-200">
            <Link to={`/clinics/${clinic.id}`}
              className="btn btn-primary btn-sm w-full gap-2 shadow-sm font-bold text-xs">
              {t("clinicViewDetails")} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#283891] via-indigo-700 to-pink-600 text-white p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-wide">
            <Building2 size={14} /> {t("clinicPageBadge")}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {t("clinicPageTitle")}
          </h1>
          <p className="text-white/85 text-base md:text-lg max-w-2xl">
            {t("clinicPageSubtitle")}
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 pt-2 relative z-30">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={t("clinicSearchPlaceholder")}
                value={searchCity}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onChange={(e) => {
                  setSearchCity(e.target.value);
                  setShowSuggestions(true);
                }}
                className="input text-slate-800 w-full pl-11 pr-10 bg-white focus:bg-white border-none shadow-lg text-sm rounded-xl"
              />
              {searchCity && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              )}

              {/* Google-like Auto-complete Suggestion Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 text-slate-800">
                  <div className="px-3.5 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span>{language === "bn" ? "পরামর্শকৃত ক্লিনিক" : "Suggested Clinics"}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{suggestions.length} {language === "bn" ? "টি পাওয়া গেছে" : "found"}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => handleSelectSuggestion(item.name)}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50/70 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-[#283891] flex items-center justify-center shrink-0 font-bold text-xs">
                            <Building2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 group-hover:text-[#283891] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <MapPin size={10} className="shrink-0 text-slate-400" />
                              <span>{item.city}</span>
                              {item.address && <span className="opacity-70">· {item.address}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-[#283891] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {language === "bn" ? "বাছাই করুন ➔" : "Select ➔"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-secondary shadow-lg gap-2 text-white font-bold rounded-xl px-6 shrink-0">
              <Search size={18} /> {t("clinicSearchBtn")}
            </button>
          </form>

          {/* Division Filter */}
          <div className="pt-3 space-y-2">
            <div className="text-xs font-bold text-white/75 flex items-center gap-1.5">
              <Navigation size={12} /> {t("clinicFilterLabel")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {divisions.map((div) => (
                <button
                  key={div}
                  type="button"
                  onClick={() => handleDivisionClick(div)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedDivision === div
                      ? "bg-white text-[#283891] shadow-md scale-105"
                      : "bg-white/15 text-white hover:bg-white/30"
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>

            {/* Cascading Districts Filter */}
            {selectedGeoDivisionId && geoDistricts.length > 0 && (
              <div className="pt-2 border-t border-white/20 space-y-1.5 animate-in fade-in duration-200">
                <div className="text-[11px] font-bold text-white/80 flex items-center gap-1">
                  <MapPin size={11} />
                  <span>{language === "bn" ? "জেলা বাছাই করুন (Districts):" : "Select District:"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGeoDistrictId("");
                      fetchClinics({ division_id: selectedGeoDivisionId });
                    }}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      !selectedGeoDistrictId
                        ? "bg-amber-400 text-slate-900 shadow-xs"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    {language === "bn" ? "সকল জেলা" : "All Districts"}
                  </button>
                  {geoDistricts.map((dist) => (
                    <button
                      key={dist.id}
                      type="button"
                      onClick={() => handleDistrictClick(dist)}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        selectedGeoDistrictId === dist.id
                          ? "bg-amber-400 text-slate-900 shadow-xs scale-105"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                    >
                      {language === "bn" && dist.bn_name ? dist.bn_name : dist.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Status Bar — Registered users only */}
      {user && (
        <div className="flex items-center gap-3 text-sm">
          {locationLoading ? (
            <span className="flex items-center gap-2 text-slate-500">
              <Loader2 size={15} className="animate-spin" /> {t("clinicLocationDetecting")}
            </span>
          ) : locationDenied ? (
            <span className="flex items-center gap-3 text-slate-500">
              <span>{t("clinicLocationDenied")}</span>
              <button onClick={requestLocation}
                className="btn btn-xs btn-outline btn-primary gap-1 font-bold">
                <LocateFixed size={12} /> {t("clinicUseLocation")}
              </button>
            </span>
          ) : userLocation ? (
            <span className="flex items-center gap-2 text-emerald-600 font-semibold">
              <LocateFixed size={15} /> {t("clinicNearYouSub")}
            </span>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-72 w-full rounded-2xl"></div>
          ))}
        </div>
      ) : error ? (
        <div className="alert alert-error shadow-md max-w-xl mx-auto"><span>{error}</span></div>
      ) : clinics.length === 0 ? (
        <div className="text-center py-16 bg-base-100 rounded-3xl border border-base-200 space-y-3">
          <Building2 size={48} className="mx-auto text-base-content/30" />
          <h3 className="text-xl font-bold text-base-content">{t("clinicNotFound")}</h3>
          <p className="text-base-content/60 text-sm">{t("clinicNotFoundMsg")} "{searchCity || selectedDivision}".</p>
          <button
            onClick={() => { setSearchCity(""); setSelectedDivision(divisions[0]); fetchClinics(); }}
            className="btn btn-primary btn-outline btn-sm font-bold">
            {t("clinicResetFilters")}
          </button>
        </div>
      ) : (
        <div className="space-y-10">

          {/* ── NEAREST CLINICS SECTION ── */}
          {nearestClinics.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-base-200">
                <div>
                  <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
                    <LocateFixed size={18} className="text-primary" /> {t("clinicNearYou")}
                  </h2>
                  <p className="text-xs text-base-content/50 mt-0.5">{t("clinicNearYouSub")}</p>
                </div>
                <span className="badge badge-primary badge-soft font-bold text-xs">
                  {nearestClinics.length} {language === "bn" ? "টি" : ""} clinics
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearestClinics.map((clinic, idx) => (
                  <ClinicCard key={`near-${clinic.id}`} clinic={clinic} idx={idx} />
                ))}
              </div>
            </section>
          )}

          {/* ── ALL CLINICS SECTION ── */}
          <section>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-base-200">
              <div>
                <h2 className="text-lg font-extrabold text-base-content flex items-center gap-2">
                  <Stethoscope size={18} className="text-primary" /> {t("clinicAllTitle")}
                </h2>
                <p className="text-xs text-base-content/50 mt-0.5">{t("clinicAllSub")}</p>
              </div>
              <span className="text-sm font-bold text-base-content/60">
                {language === "bn"
                  ? <><span className="text-primary font-black">{clinics.length}</span>{t("clinicVerifiedCenters")}</>
                  : <>{t("clinicShowingCount")} <span className="text-primary font-black">{clinics.length}</span> {t("clinicVerifiedCenters")}</>
                }
                {!isAllSelected && <span className="text-primary font-black"> · {selectedDivision}</span>}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedClinics.map((clinic, idx) => (
                <ClinicCard key={`all-${clinic.id}`} clinic={clinic} idx={idx} />
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
