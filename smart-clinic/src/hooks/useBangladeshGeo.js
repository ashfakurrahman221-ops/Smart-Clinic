import { useState, useEffect, useRef } from "react";
import apiClient from "../api/axios";

// In-memory cache to prevent redundant HTTP requests across pages
const geoCache = {
  divisions: null,
  districtsByDivision: {},
  upazilasByDistrict: {},
};

export function useBangladeshGeo(initialDivisionId = "", initialDistrictId = "", initialUpazilaId = "") {
  const [divisions, setDivisions] = useState(geoCache.divisions || []);
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);

  const [selectedDivisionId, setSelectedDivisionId] = useState(initialDivisionId);
  const [selectedDistrictId, setSelectedDistrictId] = useState(initialDistrictId);
  const [selectedUpazilaId, setSelectedUpazilaId] = useState(initialUpazilaId);

  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingUpazilas, setLoadingUpazilas] = useState(false);

  // 1. Fetch Divisions (once)
  useEffect(() => {
    if (geoCache.divisions && geoCache.divisions.length > 0) {
      setDivisions(geoCache.divisions);
      return;
    }

    let isMounted = true;
    setLoadingDivisions(true);

    apiClient
      .get("/common/divisions/")
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        geoCache.divisions = list;
        if (isMounted) setDivisions(list);
      })
      .catch((err) => {
        console.error("Error fetching divisions:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingDivisions(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Districts whenever selectedDivisionId changes
  useEffect(() => {
    if (!selectedDivisionId) {
      setDistricts([]);
      return;
    }

    if (geoCache.districtsByDivision[selectedDivisionId]) {
      setDistricts(geoCache.districtsByDivision[selectedDivisionId]);
      return;
    }

    let isMounted = true;
    setLoadingDistricts(true);

    apiClient
      .get(`/common/districts/?division_id=${selectedDivisionId}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        geoCache.districtsByDivision[selectedDivisionId] = list;
        if (isMounted) setDistricts(list);
      })
      .catch((err) => {
        console.error("Error fetching districts:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingDistricts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDivisionId]);

  // 3. Fetch Upazilas whenever selectedDistrictId changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setUpazilas([]);
      return;
    }

    if (geoCache.upazilasByDistrict[selectedDistrictId]) {
      setUpazilas(geoCache.upazilasByDistrict[selectedDistrictId]);
      return;
    }

    let isMounted = true;
    setLoadingUpazilas(true);

    apiClient
      .get(`/common/upazilas/?district_id=${selectedDistrictId}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        geoCache.upazilasByDistrict[selectedDistrictId] = list;
        if (isMounted) setUpazilas(list);
      })
      .catch((err) => {
        console.error("Error fetching upazilas:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingUpazilas(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDistrictId]);

  // Handler helpers with cascade reset
  const handleDivisionChange = (divisionId) => {
    setSelectedDivisionId(divisionId);
    setSelectedDistrictId("");
    setSelectedUpazilaId("");
    setUpazilas([]);
  };

  const handleDistrictChange = (districtId) => {
    setSelectedDistrictId(districtId);
    setSelectedUpazilaId("");
  };

  const handleUpazilaChange = (upazilaId) => {
    setSelectedUpazilaId(upazilaId);
  };

  return {
    divisions,
    districts,
    upazilas,
    selectedDivisionId,
    selectedDistrictId,
    selectedUpazilaId,
    loadingDivisions,
    loadingDistricts,
    loadingUpazilas,
    setSelectedDivisionId,
    setSelectedDistrictId,
    setSelectedUpazilaId,
    handleDivisionChange,
    handleDistrictChange,
    handleUpazilaChange,
    fetchDistricts: handleDivisionChange,
    fetchUpazilas: handleDistrictChange,
  };
}

export default useBangladeshGeo;
