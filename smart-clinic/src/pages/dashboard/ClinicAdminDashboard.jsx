import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/axios";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import ClinicAdminOnboarding from "./ClinicAdminOnboarding";
import {
  Building2,
  Stethoscope,
  Users,
  Calendar,
  TrendingUp,
  Tv,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import { PageHeader, StatusBadge, ActionButton } from "../../components/ui";

import OverviewTab from "./clinic-admin/tabs/OverviewTab";
import ChamberReceptionTab from "./clinic-admin/tabs/ChamberReceptionTab";
import ClinicBrandingTab from "./clinic-admin/tabs/ClinicBrandingTab";
import DoctorsTab from "./clinic-admin/tabs/DoctorsTab";
import AppointmentsTab from "./clinic-admin/tabs/AppointmentsTab";
import StaffTab from "./clinic-admin/tabs/StaffTab";
import FinanceTab from "./clinic-admin/tabs/FinanceTab";

import DoctorSlideoverCard from "./clinic-admin/components/DoctorSlideoverCard";
import TokenPrintModal from "./clinic-admin/components/TokenPrintModal";
import { SAMPLE_CLINIC_PHOTOS, SERVICE_PRESETS } from "./clinic-admin/constants";

export default function ClinicAdminDashboard() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");

  const [clinic, setClinic] = useState(null);
  const [allDoctors, setAllDoctors] = useState([]);
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [specializations, setSpecializations] = useState([]);

  // Clinical Services & Decoration State
  const [services, setServices] = useState([]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [submittingService, setSubmittingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    department_id: "",
    fee: "",
    duration_minutes: 15,
    preparation_instructions: "",
    description: "",
    is_available: true,
  });

  const [editClinicModalOpen, setEditClinicModalOpen] = useState(false);
  const [submittingClinicEdit, setSubmittingClinicEdit] = useState(false);
  const [clinicEditForm, setClinicEditForm] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    description: "",
    opening_hours: "Open 24/7",
    emergency_contact: "",
    website: "",
  });

  // Clinic Photo Gallery & Virtual Tour State
  const [gallery, setGallery] = useState([]);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [uploadMode, setUploadMode] = useState("file");
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [photoForm, setPhotoForm] = useState({
    image_url: "",
    category: "Reception & Front Desk",
    title: "",
    description: "",
    is_featured: false,
  });

  // Live Chamber & Reception Desk State
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [chamberSession, setChamberSession] = useState(null);
  const [updatingChamber, setUpdatingChamber] = useState(false);
  const [receptionDelayMins, setReceptionDelayMins] = useState(15);
  const [receptionNotice, setReceptionNotice] = useState("");
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [broadcastingDelay, setBroadcastingDelay] = useState(false);
  const [receptionSearchQuery, setReceptionSearchQuery] = useState("");
  const [receptionDeptFilter, setReceptionDeptFilter] = useState("ALL");

  // Walk-in Counter Patient & Cash Check-in State
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);
  const [printTokenData, setPrintTokenData] = useState(null);
  const [walkInForm, setWalkInForm] = useState({
    walk_in_name: "",
    walk_in_phone: "",
    doctor_id: "",
    appointment_time: "",
    problem_description: "",
    is_emergency: false,
    emergency_reason: "",
  });

  // Financial Accounts & Settlement State
  const [financialAnalytics, setFinancialAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState("today");
  const [analyticsDate, setAnalyticsDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [analyticsCustomStart, setAnalyticsCustomStart] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [analyticsCustomEnd, setAnalyticsCustomEnd] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  // Overview Stats State
  const [overviewStats, setOverviewStats] = useState(null);
  const [loadingOverviewStats, setLoadingOverviewStats] = useState(false);
  const [overviewTrendRange, setOverviewTrendRange] = useState("30d");
  const [trendChartType, setTrendChartType] = useState("line");
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);

  // Doctor Clinic Card Slide Panel State
  const [selectedDoctorCard, setSelectedDoctorCard] = useState(null);
  const [doctorCardSession, setDoctorCardSession] = useState(null);
  const [loadingDoctorCard, setLoadingDoctorCard] = useState(false);

  // Announcements State
  const [announcements, setAnnouncements] = useState([]);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    announcement_type: "GENERAL",
    doctor: "",
    scheduled_date: "",
    scheduled_time: "",
    is_active: true,
    starts_at: "",
    ends_at: "",
  });

  // Staff & Reception Management State
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [staffMonthlySummary, setStaffMonthlySummary] = useState(null);
  const [selectedStaffMonth, setSelectedStaffMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [staffForm, setStaffForm] = useState({
    name: "",
    phone: "",
    role: "RECEPTIONIST",
    monthly_salary: "",
    notes: "",
  });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedStaffForLogin, setSelectedStaffForLogin] = useState(null);
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [dailyCashSummary, setDailyCashSummary] = useState(null);
  const [staffAttendanceList, setStaffAttendanceList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState("ALL");

  const [inviteForm, setInviteForm] = useState({
    doctor_id: "",
    department_id: "",
    consultation_fee: "",
    room_number: "",
  });

  const [clinicDeptForm, setClinicDeptForm] = useState({ department_id: "" });
  const [newSpec, setNewSpec] = useState({ name: "", description: "" });

  const showMsg = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 4000);
  };
  const showErr = (e) => {
    setError(e);
    setTimeout(() => setError(""), 5000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let owned = null;
      try {
        const myRes = await apiClient.get("/clinics/my-clinic/");
        if (myRes && myRes.id) {
          owned = myRes;
        }
      } catch {}

      if (!owned) {
        const cRes = await apiClient.get("/clinics/").catch(() => []);
        const cList = cRes.results || cRes || [];
        owned =
          cList.find(
            (c) => c.owner_email === user?.email || c.owner === user?.id
          ) || null;
      }

      setClinic(owned);

      if (owned) {
        setGallery(Array.isArray(owned.gallery) ? owned.gallery : []);
        setClinicEditForm({
          name: owned.name || "",
          city: owned.city || "",
          address: owned.address || "",
          phone: owned.phone || "",
          email: owned.email || "",
          logo_url: owned.logo_url || "",
          description: owned.description || "",
          opening_hours: owned.opening_hours || "Open 24/7",
          emergency_contact: owned.emergency_contact || "",
          website: owned.website || "",
        });
      } else {
        setGallery([]);
      }

      if (owned && owned.verification_status === "VERIFIED") {
        const [dRes, deptRes, specRes, aptRes, reqRes, servRes] =
          await Promise.all([
            apiClient.get("/doctors/"),
            apiClient.get("/clinics/departments/"),
            apiClient.get("/doctors/specializations/"),
            apiClient.get("/appointments/"),
            apiClient.get("/doctors/requests/").catch(() => []),
            apiClient.get(`/clinics/${owned.id}/services/`).catch(() => []),
          ]);

        const dList = dRes.results || dRes || [];
        const deptList = deptRes.results || deptRes || [];
        const specList = specRes.results || specRes || [];
        const aptList = aptRes.results || aptRes || [];
        const reqList = reqRes.results || reqRes || [];
        const servList = servRes.results || servRes || [];

        setAllDoctors(dList);
        setDepartments(deptList);
        setSpecializations(specList);
        setRequests(reqList);
        setServices(servList);

        const acceptedDoctorIds = reqList
          .filter((r) => r.clinic?.id === owned.id && r.status === "ACCEPTED")
          .map((r) => r.doctor?.id || r.doctor);

        const myDoctors = dList.filter(
          (d) =>
            acceptedDoctorIds.includes(d.id) ||
            d.doctor_clinics?.some(
              (dc) =>
                (dc.clinic?.id === owned.id || dc.clinic_id === owned.id) &&
                dc.status === "ACCEPTED"
            )
        );
        setAssignedDoctors(myDoctors);
        setAppointments(aptList);
        if (myDoctors.length > 0) {
          setSelectedDoctorId((prev) => prev || myDoctors[0].id);
        }
      } else {
        setAssignedDoctors([]);
        setAppointments([]);
        setServices([]);
      }
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleSaveClinicProfile = async (e) => {
    e.preventDefault();
    if (!clinic) return;
    setSubmittingClinicEdit(true);
    try {
      const res = await apiClient.patch(
        `/clinics/${clinic.id}/`,
        clinicEditForm
      );
      setClinic(res);
      setEditClinicModalOpen(false);
      showMsg("Clinic profile and branding updated successfully!");
    } catch (err) {
      showErr(
        typeof err === "object"
          ? Object.values(err).flat().join(" ")
          : "Failed to update clinic profile."
      );
    } finally {
      setSubmittingClinicEdit(false);
    }
  };

  const handleToggleAmenity = async (amenityId) => {
    if (!clinic) return;
    const currentFacilities = Array.isArray(clinic.facilities)
      ? [...clinic.facilities]
      : [];
    let updated;
    if (currentFacilities.includes(amenityId)) {
      updated = currentFacilities.filter((f) => f !== amenityId);
    } else {
      updated = [...currentFacilities, amenityId];
    }
    try {
      const res = await apiClient.patch(`/clinics/${clinic.id}/`, {
        facilities: updated,
      });
      setClinic(res);
      showMsg("Facility updated successfully!");
    } catch {
      showErr("Failed to update clinic facilities.");
    }
  };

  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showErr("Image size exceeds 10MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setPhotoForm((prev) => ({
        ...prev,
        image_url: uploadEvent.target.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddPhoto = () => {
    setEditingPhotoId(null);
    setUploadMode("file");
    setPhotoForm({
      image_url: "",
      category: "Reception & Front Desk",
      title: "",
      description: "",
      is_featured: false,
    });
    setPhotoModalOpen(true);
  };

  const handleOpenEditPhoto = (photo) => {
    setEditingPhotoId(photo.id);
    setUploadMode(photo.image_url?.startsWith("data:") ? "file" : "url");
    setPhotoForm({
      image_url: photo.image_url || "",
      category: photo.category || "Reception & Front Desk",
      title: photo.title || "",
      description: photo.description || "",
      is_featured: photo.is_featured ?? false,
    });
    setPhotoModalOpen(true);
  };

  const handleSavePhoto = async (e) => {
    e.preventDefault();
    if (!clinic) return;
    if (!photoForm.image_url) {
      showErr("Please choose or upload an image.");
      return;
    }
    if (!photoForm.title?.trim()) {
      showErr("Please provide a photo title.");
      return;
    }

    setSubmittingPhoto(true);
    try {
      let updatedGallery;
      if (editingPhotoId) {
        updatedGallery = gallery.map((item) => {
          if (item.id === editingPhotoId) {
            return {
              ...item,
              image_url: photoForm.image_url,
              category: photoForm.category,
              title: photoForm.title.trim(),
              description: photoForm.description?.trim() || "",
              is_featured: photoForm.is_featured,
            };
          }
          return photoForm.is_featured
            ? { ...item, is_featured: false }
            : item;
        });
      } else {
        const newPhotoItem = {
          id: `photo-${Date.now()}`,
          image_url: photoForm.image_url,
          category: photoForm.category,
          title: photoForm.title.trim(),
          description: photoForm.description?.trim() || "",
          is_featured: photoForm.is_featured,
        };
        const currentList = photoForm.is_featured
          ? gallery.map((g) => ({ ...g, is_featured: false }))
          : [...gallery];
        updatedGallery = [newPhotoItem, ...currentList];
      }

      const res = await apiClient.patch(`/clinics/${clinic.id}/`, {
        gallery: updatedGallery,
      });
      setClinic(res);
      setGallery(res.gallery || updatedGallery);
      setPhotoModalOpen(false);
      showMsg(
        editingPhotoId
          ? "Clinic photo updated successfully!"
          : "New clinic photo added to gallery!"
      );
    } catch (err) {
      showErr(
        typeof err === "object"
          ? Object.values(err).flat().join(" ")
          : "Failed to save photo."
      );
    } finally {
      setSubmittingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!clinic) return;
    if (
      !window.confirm("Are you sure you want to remove this photo from gallery?")
    )
      return;
    try {
      const updatedGallery = gallery.filter((p) => p.id !== photoId);
      const res = await apiClient.patch(`/clinics/${clinic.id}/`, {
        gallery: updatedGallery,
      });
      setClinic(res);
      setGallery(res.gallery || updatedGallery);
      showMsg("Photo removed from gallery.");
    } catch {
      showErr("Failed to delete photo.");
    }
  };

  const handleToggleFeaturedPhoto = async (photoId) => {
    if (!clinic) return;
    try {
      const updatedGallery = gallery.map((item) => {
        if (item.id === photoId) {
          return { ...item, is_featured: !item.is_featured };
        }
        return { ...item, is_featured: false };
      });
      const res = await apiClient.patch(`/clinics/${clinic.id}/`, {
        gallery: updatedGallery,
      });
      setClinic(res);
      setGallery(res.gallery || updatedGallery);
      showMsg("Cover photo updated!");
    } catch {
      showErr("Failed to update cover photo.");
    }
  };

  const handleLoadSampleGallery = async () => {
    if (!clinic) return;
    if (
      !window.confirm(
        "Load sample high-resolution clinic photos? You can customize or delete them anytime."
      )
    )
      return;
    try {
      const res = await apiClient.patch(`/clinics/${clinic.id}/`, {
        gallery: SAMPLE_CLINIC_PHOTOS,
      });
      setClinic(res);
      setGallery(res.gallery || SAMPLE_CLINIC_PHOTOS);
      showMsg("Sample clinic tour photos loaded successfully!");
    } catch {
      showErr("Failed to load sample photos.");
    }
  };

  const handleOpenAddService = (preset = null) => {
    setEditingServiceId(null);
    if (preset) {
      setServiceForm({
        name: preset.name,
        department_id: "",
        fee: preset.fee,
        duration_minutes: preset.duration_minutes,
        preparation_instructions: preset.preparation_instructions,
        description: preset.description,
        is_available: true,
      });
    } else {
      setServiceForm({
        name: "",
        department_id: "",
        fee: "",
        duration_minutes: 15,
        preparation_instructions: "",
        description: "",
        is_available: true,
      });
    }
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (service) => {
    setEditingServiceId(service.id);
    setServiceForm({
      name: service.name || "",
      department_id: service.department || "",
      fee: service.fee || "",
      duration_minutes: service.duration_minutes || 15,
      preparation_instructions: service.preparation_instructions || "",
      description: service.description || "",
      is_available: service.is_available ?? true,
    });
    setServiceModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!clinic) return;
    if (!serviceForm.name?.trim()) return showErr("Service name is required.");
    setSubmittingService(true);
    try {
      const payload = {
        name: serviceForm.name.trim(),
        department: serviceForm.department_id || null,
        fee: parseFloat(serviceForm.fee) || 0,
        duration_minutes: parseInt(serviceForm.duration_minutes, 10) || 15,
        preparation_instructions: serviceForm.preparation_instructions || "",
        description: serviceForm.description || "",
        is_available: serviceForm.is_available,
      };

      if (editingServiceId) {
        const updated = await apiClient.patch(
          `/clinics/${clinic.id}/services/${editingServiceId}/`,
          payload
        );
        setServices((prev) =>
          prev.map((s) => (s.id === editingServiceId ? updated : s))
        );
        showMsg(`Service "${updated.name}" updated successfully!`);
      } else {
        const created = await apiClient.post(
          `/clinics/${clinic.id}/services/`,
          payload
        );
        setServices((prev) => [created, ...prev]);
        showMsg(`Service "${created.name}" created successfully!`);
      }
      setServiceModalOpen(false);
    } catch (err) {
      showErr(
        typeof err === "object"
          ? Object.values(err).flat().join(" ")
          : "Failed to save service."
      );
    } finally {
      setSubmittingService(false);
    }
  };

  const handleToggleServiceAvailability = async (service) => {
    if (!clinic) return;
    try {
      const newStatus = !service.is_available;
      const updated = await apiClient.patch(
        `/clinics/${clinic.id}/services/${service.id}/`,
        { is_available: newStatus }
      );
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? updated : s))
      );
      showMsg(
        `"${service.name}" marked as ${newStatus ? "Available" : "Unavailable"}.`
      );
    } catch {
      showErr("Failed to toggle service status.");
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (
      !clinic ||
      !window.confirm("Are you sure you want to remove this clinical service?")
    )
      return;
    try {
      await apiClient.delete(`/clinics/${clinic.id}/services/${serviceId}/`);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      showMsg("Clinical service deleted successfully.");
    } catch {
      showErr("Failed to delete service.");
    }
  };

  const handleLoadDefaultDiagnosticCatalog = async () => {
    if (!clinic) return;
    setSubmittingService(true);
    try {
      const added = [];
      for (const preset of SERVICE_PRESETS) {
        if (
          !services.some(
            (s) => s.name.toLowerCase() === preset.name.toLowerCase()
          )
        ) {
          const res = await apiClient.post(`/clinics/${clinic.id}/services/`, {
            name: preset.name,
            department: null,
            fee: parseFloat(preset.fee) || 0,
            duration_minutes: preset.duration_minutes || 15,
            preparation_instructions: preset.preparation_instructions || "",
            description: preset.description || "",
            is_available: true,
          });
          added.push(res);
        }
      }
      if (added.length > 0) {
        setServices((prev) => [...added, ...prev]);
        showMsg(
          `Successfully loaded ${added.length} standard diagnostic services into your catalog!`
        );
      } else {
        showMsg("Default diagnostic catalog is already loaded.");
      }
    } catch {
      showErr("Failed to load diagnostic catalog.");
    } finally {
      setSubmittingService(false);
    }
  };

  const fetchFinancialAnalytics = useCallback(
    async (override = {}) => {
      if (!clinic) return;
      setLoadingAnalytics(true);
      try {
        let url = `/clinics/${clinic.id}/analytics/`;
        if (typeof override === "string") {
          // Backward compatibility if single date passed as string
          url += `?date=${override}`;
        } else {
          const range =
            override.range !== undefined ? override.range : analyticsRange;
          if (range === "custom") {
            const s = override.start_date || analyticsCustomStart;
            const e = override.end_date || analyticsCustomEnd;
            url += `?range=custom&start_date=${s}&end_date=${e}`;
          } else if (range === "date" || override.date) {
            const d = override.date || analyticsDate;
            url += `?date=${d}`;
          } else {
            url += `?range=${range}`;
          }
        }
        const res = await apiClient.get(url);
        setFinancialAnalytics(res.data || res);
      } catch {
      } finally {
        setLoadingAnalytics(false);
      }
    },
    [clinic, analyticsRange, analyticsDate, analyticsCustomStart, analyticsCustomEnd]
  );

  const fetchOverviewStats = useCallback(
    async (clinicObj) => {
      const c = clinicObj || clinic;
      if (!c) return;
      setLoadingOverviewStats(true);
      try {
        const res = await apiClient.get(`/clinics/${c.id}/overview-stats/`);
        setOverviewStats(res);
      } catch {
      } finally {
        setLoadingOverviewStats(false);
      }
    },
    [clinic]
  );

  const fetchAnnouncements = useCallback(
    async (clinicObj) => {
      const c = clinicObj || clinic;
      if (!c) return;
      try {
        const res = await apiClient.get(`/clinics/${c.id}/announcements/`);
        setAnnouncements(Array.isArray(res) ? res : res.results || []);
      } catch {
        setAnnouncements([]);
      }
    },
    [clinic]
  );

  const fetchStaffData = useCallback(async (monthOverride = null) => {
    setLoadingStaff(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const targetMonth = monthOverride || selectedStaffMonth;
      const [staffRes, attRes, cashRes, monthRes] = await Promise.allSettled([
        apiClient.get("/clinics/staff/"),
        apiClient.get(`/clinics/staff/attendance/?date=${today}`),
        apiClient.get("/clinics/reception/cash-summary/"),
        apiClient.get(`/clinics/staff/monthly-summary/?month=${targetMonth}`),
      ]);
      if (staffRes.status === "fulfilled") {
        setStaffList(
          Array.isArray(staffRes.value)
            ? staffRes.value
            : staffRes.value?.results || []
        );
      }
      if (attRes.status === "fulfilled") {
        setStaffAttendanceList(
          Array.isArray(attRes.value)
            ? attRes.value
            : attRes.value?.results || []
        );
      }
      if (cashRes.status === "fulfilled") {
        setDailyCashSummary(cashRes.value);
      }
      if (monthRes.status === "fulfilled") {
        setStaffMonthlySummary(monthRes.value);
      }
    } catch {
    } finally {
      setLoadingStaff(false);
    }
  }, [selectedStaffMonth]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.role)
      return showErr("Staff name and role are required.");
    setSubmittingStaff(true);
    try {
      await apiClient.post("/clinics/staff/", {
        ...staffForm,
        monthly_salary: staffForm.monthly_salary
          ? parseFloat(staffForm.monthly_salary)
          : 0,
      });
      showMsg("Staff member added successfully!");
      setStaffForm({
        name: "",
        phone: "",
        role: "RECEPTIONIST",
        monthly_salary: "",
        notes: "",
      });
      setStaffModalOpen(false);
      fetchStaffData();
    } catch (err) {
      showErr(err?.detail || "Failed to add staff member.");
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm("Are you sure you want to deactivate this staff member?"))
      return;
    try {
      await apiClient.delete(`/clinics/staff/${staffId}/`);
      showMsg("Staff member deactivated.");
      fetchStaffData();
    } catch {
      showErr("Failed to deactivate staff member.");
    }
  };

  const handleOpenCreateLogin = (staff) => {
    setSelectedStaffForLogin(staff);
    const names = (staff.name || "").trim().split(" ");
    setLoginForm({
      email: staff.phone
        ? `reception_${staff.phone.replace(/[^0-9]/g, "")}@clinic.internal`
        : "",
      first_name: names[0] || staff.name,
      last_name: names.slice(1).join(" ") || "",
      password: "",
    });
    setLoginModalOpen(true);
  };

  const handleCreateLoginSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaffForLogin || !loginForm.email || !loginForm.password) {
      return showErr("Email and password are required.");
    }
    setSubmittingLogin(true);
    try {
      await apiClient.post("/clinics/staff/create-login/", {
        staff_id: selectedStaffForLogin.id,
        email: loginForm.email,
        first_name: loginForm.first_name,
        last_name: loginForm.last_name,
        password: loginForm.password,
      });
      showMsg(
        `Receptionist account created for ${selectedStaffForLogin.name}! Credentials can now be used on any counter device.`
      );
      setLoginModalOpen(false);
      setSelectedStaffForLogin(null);
      fetchStaffData();
    } catch (err) {
      showErr(err?.detail || "Failed to create receptionist login.");
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleOpenAddAnnouncement = () => {
    setEditingAnnouncementId(null);
    setAnnouncementForm({
      title: "",
      message: "",
      announcement_type: "GENERAL",
      doctor: "",
      scheduled_date: "",
      scheduled_time: "",
      is_active: true,
      starts_at: "",
      ends_at: "",
    });
    setAnnouncementModalOpen(true);
  };

  const handleOpenEditAnnouncement = (a) => {
    setEditingAnnouncementId(a.id);
    setAnnouncementForm({
      title: a.title || "",
      message: a.message || "",
      announcement_type: a.announcement_type || "GENERAL",
      doctor: a.doctor || "",
      scheduled_date: a.scheduled_date || "",
      scheduled_time: a.scheduled_time || "",
      is_active: a.is_active ?? true,
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : "",
      ends_at: a.ends_at ? a.ends_at.slice(0, 16) : "",
    });
    setAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!clinic) return;
    if (!announcementForm.title?.trim() || !announcementForm.message?.trim()) {
      showErr("Title and message are required.");
      return;
    }
    setSubmittingAnnouncement(true);
    try {
      const payload = {
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        announcement_type: announcementForm.announcement_type,
        doctor: announcementForm.doctor || null,
        scheduled_date: announcementForm.scheduled_date || null,
        scheduled_time: announcementForm.scheduled_time || null,
        is_active: announcementForm.is_active,
        starts_at: announcementForm.starts_at || null,
        ends_at: announcementForm.ends_at || null,
      };
      if (editingAnnouncementId) {
        const updated = await apiClient.patch(
          `/clinics/${clinic.id}/announcements/${editingAnnouncementId}/`,
          payload
        );
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === editingAnnouncementId ? updated : a))
        );
        showMsg("Announcement updated successfully!");
      } else {
        const created = await apiClient.post(
          `/clinics/${clinic.id}/announcements/`,
          payload
        );
        setAnnouncements((prev) => [created, ...prev]);
        showMsg("Announcement created successfully!");
      }
      setAnnouncementModalOpen(false);
    } catch (err) {
      showErr(
        typeof err === "object"
          ? Object.values(err).flat().join(" ")
          : "Failed to save announcement."
      );
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleToggleAnnouncementActive = async (a) => {
    if (!clinic) return;
    try {
      const updated = await apiClient.patch(
        `/clinics/${clinic.id}/announcements/${a.id}/`,
        { is_active: !a.is_active }
      );
      setAnnouncements((prev) =>
        prev.map((x) => (x.id === a.id ? updated : x))
      );
    } catch {
      showErr("Failed to update announcement status.");
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!clinic || !window.confirm("Delete this announcement?")) return;
    try {
      await apiClient.delete(`/clinics/${clinic.id}/announcements/${id}/`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showMsg("Announcement deleted.");
    } catch {
      showErr("Failed to delete announcement.");
    }
  };

  // Live Sync & Auto-Polling State
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  const refreshDeskData = useCallback(async (isSilent = false) => {
    if (!clinic) return;
    if (!isSilent) setIsLiveSyncing(true);
    try {
      const promises = [];
      if (selectedDoctorId) {
        const todayStr = new Date().toISOString().split("T")[0];
        promises.push(
          apiClient
            .get(
              `/doctors/chamber-session/?doctor_id=${selectedDoctorId}&clinic_id=${clinic.id}&date=${todayStr}`
            )
            .then((res) => setChamberSession(res))
            .catch(() => {})
        );
      }
      promises.push(
        apiClient
          .get("/appointments/")
          .then((res) => {
            const aptList = res.results || res || [];
            setAppointments(aptList);
          })
          .catch(() => {})
      );
      await Promise.all(promises);
      setLastSyncedTime(new Date());
    } finally {
      if (!isSilent) setIsLiveSyncing(false);
    }
  }, [clinic, selectedDoctorId]);

  const fetchReceptionChamberSession = useCallback(async () => {
    return refreshDeskData(false);
  }, [refreshDeskData]);

  useEffect(() => {
    if (clinic && selectedDoctorId) {
      refreshDeskData(false);
    }
  }, [clinic, selectedDoctorId, refreshDeskData]);

  // Tab-visibility-aware auto-polling for Live Reception desk (every 15s)
  useEffect(() => {
    if (!liveSyncEnabled || !clinic || activeTab !== "chamber") return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        refreshDeskData(true);
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (!document.hidden && liveSyncEnabled) {
        refreshDeskData(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [liveSyncEnabled, clinic, activeTab, refreshDeskData]);

  const openDoctorCard = async (doctor) => {
    setSelectedDoctorCard(doctor);
    setDoctorCardSession(null);
    setLoadingDoctorCard(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await apiClient.get(
        `/doctors/chamber-session/?doctor_id=${doctor.id}&clinic_id=${clinic.id}&date=${todayStr}`
      );
      setDoctorCardSession(res);
    } catch {
      setDoctorCardSession(null);
    } finally {
      setLoadingDoctorCard(false);
    }
  };

  const closeDoctorCard = () => {
    setSelectedDoctorCard(null);
    setDoctorCardSession(null);
  };

  const handleReceptionChamberAction = async (
    action,
    newStatus = null,
    targetSerial = null,
    extraPayload = {}
  ) => {
    if (!clinic || !selectedDoctorId) return;
    setUpdatingChamber(true);
    try {
      const payload = {
        doctor_id: selectedDoctorId,
        clinic_id: clinic.id,
        action: action,
        ...extraPayload,
      };
      if (newStatus) payload.status = newStatus;
      if (targetSerial !== null) payload.current_serial = targetSerial;

      const res = await apiClient.post("/doctors/chamber-session/", payload);
      setChamberSession(res);
      showMsg(
        action === "NEXT_SERIAL"
          ? `Reception advanced queue to Serial #${res.current_serial}!`
          : action === "SKIP_SERIAL"
          ? `Serial held. Advanced to #${res.current_serial}!`
          : action === "RECALL_SERIAL"
          ? `Recalled Serial #${res.current_serial} into chamber!`
          : action === "ADMIT_EMERGENCY"
          ? `Emergency patient admitted to chamber!`
          : action === "COMPLETE_EMERGENCY"
          ? `Emergency consultation marked complete!`
          : action === "RESUME_HELD"
          ? `Resumed held patient into chamber!`
          : action === "RESET"
          ? "Queue reset to Serial #0."
          : `Doctor chamber status set to ${res.status}`
      );
    } catch (err) {
      showErr(err?.response?.data?.error || err?.detail || "Failed to update doctor chamber session.");
    } finally {
      setUpdatingChamber(false);
    }
  };

  const handleBroadcastReceptionDelay = async (e) => {
    e.preventDefault();
    if (!clinic || !selectedDoctorId) return;
    setBroadcastingDelay(true);
    try {
      const payload = {
        doctor_id: selectedDoctorId,
        clinic_id: clinic.id,
        action: "UPDATE_STATUS",
        delay_minutes: parseInt(receptionDelayMins, 10) || 0,
        announcement_note: receptionNotice,
      };
      const res = await apiClient.post("/doctors/chamber-session/", payload);
      setChamberSession(res);
      setDelayModalOpen(false);
      showMsg("Notice & Delay broadcasted to patient waiting displays!");
    } catch {
      showErr("Failed to broadcast delay notice.");
    } finally {
      setBroadcastingDelay(false);
    }
  };

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    if (!clinic) return showErr("No clinic registered.");
    if (!walkInForm.doctor_id || !walkInForm.walk_in_name) {
      return showErr("Please enter Patient Name and choose a Doctor.");
    }
    setSubmittingWalkIn(true);
    try {
      const selectedDoc = assignedDoctors.find(
        (d) => String(d.id) === String(walkInForm.doctor_id)
      );
      const fee = selectedDoc?.consultation_fee || 800;

      const payload = {
        doctor_id: walkInForm.doctor_id,
        patient_name: walkInForm.walk_in_name,
        patient_phone: walkInForm.walk_in_phone || "01700000000",
        problem_description:
          walkInForm.problem_description || "Walk-in patient registration",
        fee: fee,
        is_emergency: !!walkInForm.is_emergency,
        emergency_reason: walkInForm.emergency_reason || "",
      };

      const res = await apiClient.post("/clinics/reception/walk-in/", payload);
      setWalkInModalOpen(false);
      setWalkInForm({
        walk_in_name: "",
        walk_in_phone: "",
        doctor_id: assignedDoctors.length > 0 ? assignedDoctors[0].id : "",
        appointment_time: "",
        problem_description: "",
        is_emergency: false,
        emergency_reason: "",
      });
      loadData();
      fetchReceptionChamberSession();
      setPrintTokenData({
        id: res.appointment_id || res.id,
        serial_number: res.serial_number,
        patient_name: res.patient_name,
        doctor_name: res.doctor_name || selectedDoc?.full_name || "Doctor",
        amount: res.amount || fee,
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      showMsg(
        `Walk-in Serial #${res.serial_number} confirmed! Cash recorded.`
      );
    } catch (err) {
      showErr(
        err?.detail ||
          (typeof err === "object"
            ? Object.values(err).flat().join(" ")
            : "Failed to register walk-in patient.")
      );
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  const handleCashCheckIn = async (appointmentId) => {
    setCheckingInId(appointmentId);
    try {
      const res = await apiClient.post(
        `/appointments/${appointmentId}/checkin/`
      );
      loadData();
      setPrintTokenData(res);
      showMsg(
        `Appointment Serial #${res.serial_number} marked as Paid (Cash) & Checked-in!`
      );
    } catch {
      showErr("Failed to check-in appointment.");
    } finally {
      setCheckingInId(null);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!clinic) return showErr("You must create a clinic first.");
    if (clinic.verification_status !== "VERIFIED")
      return showErr("Your clinic registration is pending Admin approval.");
    if (!inviteForm.doctor_id || !inviteForm.consultation_fee) return;

    setMsg("");
    setError("");
    try {
      await apiClient.post("/doctors/requests/create/", {
        doctor_id: inviteForm.doctor_id,
        department_id: inviteForm.department_id || null,
        consultation_fee: parseFloat(inviteForm.consultation_fee),
        room_number: inviteForm.room_number || "",
      });
      showMsg(
        "Service request sent to doctor! Waiting for doctor's acceptance."
      );
      setInviteForm({
        doctor_id: "",
        department_id: "",
        consultation_fee: "",
        room_number: "",
      });
      loadData();
    } catch (err) {
      if (typeof err === "object")
        showErr(err.detail || Object.values(err).flat().join(" "));
      else showErr("Failed to send request to doctor.");
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    setMsg("");
    setError("");
    try {
      await apiClient.patch(`/doctors/requests/${requestId}/respond/`, {
        action,
      });
      showMsg(`Request ${action === "ACCEPT" ? "accepted" : "rejected"}.`);
      loadData();
    } catch {
      showErr("Failed to respond to request.");
    }
  };

  const handleLinkDept = async (e) => {
    e.preventDefault();
    if (!clinic || !clinicDeptForm.department_id) return;
    if (clinic.verification_status !== "VERIFIED")
      return showErr("Your clinic is pending Admin approval.");
    setMsg("");
    setError("");
    try {
      await apiClient.post(`/clinics/${clinic.id}/departments/`, {
        department_id: clinicDeptForm.department_id,
      });
      showMsg("Department linked to your clinic.");
      setClinicDeptForm({ department_id: "" });
      loadData();
    } catch {
      showErr("Failed to link department.");
    }
  };

  const handleCreateSpec = async (e) => {
    e.preventDefault();
    if (!newSpec.name) return;
    setMsg("");
    setError("");
    try {
      await apiClient.post("/doctors/specializations/", newSpec);
      showMsg("Specialization created!");
      setNewSpec({ name: "", description: "" });
      loadData();
    } catch (err) {
      if (typeof err === "object")
        showErr(err.name || Object.values(err).flat().join(" "));
      else showErr(err || "Specialization name already exists.");
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (clinic && activeTab === "overview") {
      fetchOverviewStats(clinic);
    }
    if (clinic && (activeTab === "clinic" || activeTab === "overview")) {
      fetchAnnouncements(clinic);
    }
    if (clinic && (activeTab === "finance" || activeTab === "appointments")) {
      fetchFinancialAnalytics();
      if (activeTab === "finance") {
        fetchStaffData();
      }
    }
    if (clinic && activeTab === "staff") {
      fetchStaffData();
    }
  }, [
    clinic,
    activeTab,
    fetchOverviewStats,
    fetchAnnouncements,
    fetchFinancialAnalytics,
    fetchStaffData,
  ]);

  const tabs = [
    { key: "overview", label: "Dashboard", icon: <TrendingUp size={16} /> },
    {
      key: "chamber",
      label: "Live Reception",
      icon: <Tv size={16} />,
      badge: "Live",
      badgeClass: "badge-error animate-pulse text-white",
    },
    {
      key: "appointments",
      label: "Appointments",
      icon: <Calendar size={16} />,
      count: appointments.length,
    },
    {
      key: "finance",
      label: "Finance & Accounts",
      icon: <DollarSign size={16} />,
    },
    {
      key: "doctors",
      label: "Doctors",
      icon: <Stethoscope size={16} />,
      count:
        requests.filter((r) => r.status === "PENDING_CLINIC_APPROVAL").length ||
        undefined,
    },
    {
      key: "staff",
      label: "Staff & HR",
      icon: <Users size={16} />,
      count: staffList.length || undefined,
    },
    { key: "clinic", label: "My Clinic", icon: <Building2 size={16} /> },
  ];

  const pendingIncomingRequests = requests.filter(
    (r) => r.status === "PENDING_CLINIC_APPROVAL"
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] space-y-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-sm text-base-content/60 font-medium">
          Loading Clinic Administrator Portal...
        </p>
      </div>
    );
  }

  // If clinic is not registered OR not verified, render the guided Onboarding Flow
  if (!clinic || clinic.verification_status !== "VERIFIED") {
    return (
      <ClinicAdminOnboarding
        clinic={clinic}
        onClinicUpdated={loadData}
        onStatusCheck={loadData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── CLINIC FACILITY STATUS & PAGE HEADER ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <PageHeader
          title={clinic?.name || "Clinic Administration Portal"}
          subtitle={
            clinic
              ? `${clinic.address}, ${clinic.city} • Registration: ${
                  clinic.id ? clinic.id.slice(0, 13).toUpperCase() : "BD-MED-9942"
                }`
              : "Clinic Operations & Management Console"
          }
          badge={
            <StatusBadge
              status="ACTIVE"
              customLabel="Active Facility"
              size="sm"
            />
          }
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {clinic?.id && (
                <a
                  href={`/clinics/${clinic.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Live Public Page</span>
                  <ExternalLink size={13} />
                </a>
              )}
              <ActionButton
                variant="primary"
                size="sm"
                icon={Tv}
                onClick={() => {
                  setActiveTab("chamber");
                  setMsg("");
                  setError("");
                }}
              >
                Open Live Reception
              </ActionButton>
            </div>
          }
          className="mb-0"
        />

        {/* Operational Load Strip */}
        {(() => {
          const todayDateStr = new Date().toISOString().split("T")[0];
          const todayAptsCount =
            overviewStats?.appointments?.total_today ??
            appointments.filter((a) => a.appointment_date === todayDateStr).length;
          return (
            <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <MapPin size={13} className="text-[#283891]" />
                  <span>{clinic ? `${clinic.city}` : "Facility"}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Today&apos;s Queue:{" "}
                  <strong className="text-slate-900 font-semibold">{todayAptsCount} Patients</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Active Doctors:{" "}
                  <strong className="text-slate-900 font-semibold">{assignedDoctors.length}</strong>
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Admin Approval Banner for Clinic */}
      {clinic && clinic.verification_status !== "VERIFIED" && (
        <div
          className={`p-5 rounded-3xl border flex items-start gap-4 ${
            clinic.verification_status === "REJECTED"
              ? "bg-error/15 border-error/30 text-error-content"
              : "bg-warning/15 border-warning/30 text-warning-content"
          }`}
        >
          <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base">
              {clinic.verification_status === "REJECTED"
                ? "Clinic Registration Rejected"
                : "Clinic Registration Pending Admin Verification"}
            </h3>
            <p className="text-xs mt-1">
              {clinic.verification_status === "REJECTED"
                ? "Your registration certificate was rejected by platform Admin. Please update your certificate URL."
                : "Your registration certificate has been submitted and is currently PENDING approval from platform Admin. You can invite doctors and offer services once approved."}
            </p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {msg && (
        <div className="alert alert-success text-sm py-3 px-4 flex items-center gap-2 shadow-sm rounded-2xl">
          <CheckCircle2 size={18} />
          <span>{msg}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error text-sm py-3 px-4 flex items-center gap-2 shadow-sm rounded-2xl">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs with Badges */}
      <div className="flex flex-wrap gap-2 pt-1 border-b border-slate-200 pb-3">
        {tabs.map((tItem) => (
          <button
            key={tItem.key}
            onClick={() => {
              setActiveTab(tItem.key);
              setMsg("");
              setError("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all border cursor-pointer select-none ${
              activeTab === tItem.key
                ? "bg-[#283891] text-white border-[#283891] shadow-2xs"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {tItem.icon}
            <span>{tItem.label}</span>
            {tItem.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  tItem.badgeClass || "bg-indigo-100 text-[#283891]"
                }`}
              >
                {tItem.badge}
              </span>
            )}
            {typeof tItem.count === "number" && tItem.count > 0 && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                  activeTab === tItem.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {tItem.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <OverviewTab
          clinic={clinic}
          overviewStats={overviewStats}
          loadingOverviewStats={loadingOverviewStats}
          assignedDoctors={assignedDoctors}
          appointments={appointments}
          pendingIncomingRequests={pendingIncomingRequests}
          overviewTrendRange={overviewTrendRange}
          setOverviewTrendRange={setOverviewTrendRange}
          trendChartType={trendChartType}
          setTrendChartType={setTrendChartType}
          hoveredTrendIdx={hoveredTrendIdx}
          setHoveredTrendIdx={setHoveredTrendIdx}
          setActiveTab={setActiveTab}
          setWalkInForm={setWalkInForm}
          setWalkInModalOpen={setWalkInModalOpen}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          openDoctorCard={openDoctorCard}
          language={language}
          t={t}
        />
      )}

      {activeTab === "chamber" && (
        <ChamberReceptionTab
          clinic={clinic}
          assignedDoctors={assignedDoctors}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          receptionSearchQuery={receptionSearchQuery}
          setReceptionSearchQuery={setReceptionSearchQuery}
          receptionDeptFilter={receptionDeptFilter}
          setReceptionDeptFilter={setReceptionDeptFilter}
          appointments={appointments}
          chamberSession={chamberSession}
          setChamberSession={setChamberSession}
          updatingChamber={updatingChamber}
          handleReceptionChamberAction={handleReceptionChamberAction}
          fetchReceptionChamberSession={fetchReceptionChamberSession}
          liveSyncEnabled={liveSyncEnabled}
          setLiveSyncEnabled={setLiveSyncEnabled}
          isLiveSyncing={isLiveSyncing}
          lastSyncedTime={lastSyncedTime}
          refreshDeskData={refreshDeskData}
          delayModalOpen={delayModalOpen}
          setDelayModalOpen={setDelayModalOpen}
          receptionDelayMins={receptionDelayMins}
          setReceptionDelayMins={setReceptionDelayMins}
          receptionNotice={receptionNotice}
          setReceptionNotice={setReceptionNotice}
          handleBroadcastReceptionDelay={handleBroadcastReceptionDelay}
          broadcastingDelay={broadcastingDelay}
          walkInModalOpen={walkInModalOpen}
          setWalkInModalOpen={setWalkInModalOpen}
          walkInForm={walkInForm}
          setWalkInForm={setWalkInForm}
          submittingWalkIn={submittingWalkIn}
          handleCreateWalkIn={handleCreateWalkIn}
          setPrintTokenData={setPrintTokenData}
          t={t}
        />
      )}

      {activeTab === "clinic" && (
        <ClinicBrandingTab
          clinic={clinic}
          services={services}
          departments={departments}
          specializations={specializations}
          gallery={gallery}
          announcements={announcements}
          assignedDoctors={assignedDoctors}
          editClinicModalOpen={editClinicModalOpen}
          setEditClinicModalOpen={setEditClinicModalOpen}
          submittingClinicEdit={submittingClinicEdit}
          clinicEditForm={clinicEditForm}
          setClinicEditForm={setClinicEditForm}
          handleSaveClinicProfile={handleSaveClinicProfile}
          handleToggleAmenity={handleToggleAmenity}
          handleLoadDefaultDiagnosticCatalog={handleLoadDefaultDiagnosticCatalog}
          handleOpenAddService={handleOpenAddService}
          handleOpenEditService={handleOpenEditService}
          handleDeleteService={handleDeleteService}
          handleToggleServiceAvailability={handleToggleServiceAvailability}
          serviceModalOpen={serviceModalOpen}
          setServiceModalOpen={setServiceModalOpen}
          editingServiceId={editingServiceId}
          submittingService={submittingService}
          serviceForm={serviceForm}
          setServiceForm={setServiceForm}
          handleSaveService={handleSaveService}
          handleLoadSampleGallery={handleLoadSampleGallery}
          handleOpenAddPhoto={handleOpenAddPhoto}
          handleOpenEditPhoto={handleOpenEditPhoto}
          handleDeletePhoto={handleDeletePhoto}
          handleToggleFeaturedPhoto={handleToggleFeaturedPhoto}
          photoModalOpen={photoModalOpen}
          setPhotoModalOpen={setPhotoModalOpen}
          editingPhotoId={editingPhotoId}
          submittingPhoto={submittingPhoto}
          uploadMode={uploadMode}
          setUploadMode={setUploadMode}
          previewPhoto={previewPhoto}
          setPreviewPhoto={setPreviewPhoto}
          photoForm={photoForm}
          setPhotoForm={setPhotoForm}
          handleImageFileUpload={handleImageFileUpload}
          handleSavePhoto={handleSavePhoto}
          clinicDeptForm={clinicDeptForm}
          setClinicDeptForm={setClinicDeptForm}
          handleLinkDept={handleLinkDept}
          newSpec={newSpec}
          setNewSpec={setNewSpec}
          handleCreateSpec={handleCreateSpec}
          announcementModalOpen={announcementModalOpen}
          setAnnouncementModalOpen={setAnnouncementModalOpen}
          editingAnnouncementId={editingAnnouncementId}
          submittingAnnouncement={submittingAnnouncement}
          announcementForm={announcementForm}
          setAnnouncementForm={setAnnouncementForm}
          handleOpenAddAnnouncement={handleOpenAddAnnouncement}
          handleOpenEditAnnouncement={handleOpenEditAnnouncement}
          handleSaveAnnouncement={handleSaveAnnouncement}
          handleDeleteAnnouncement={handleDeleteAnnouncement}
          handleToggleAnnouncementActive={handleToggleAnnouncementActive}
          t={t}
        />
      )}

      {activeTab === "doctors" && (
        <DoctorsTab
          clinic={clinic}
          assignedDoctors={assignedDoctors}
          appointments={appointments}
          selectedDoctorCard={selectedDoctorCard}
          openDoctorCard={openDoctorCard}
          onOpenLiveChamber={(docId) => {
            setSelectedDoctorId(docId);
            setActiveTab("chamber");
          }}
          pendingIncomingRequests={pendingIncomingRequests}
          handleRespondRequest={handleRespondRequest}
          allDoctors={allDoctors}
          departments={departments}
          inviteForm={inviteForm}
          setInviteForm={setInviteForm}
          handleSendInvite={handleSendInvite}
        />
      )}

      {activeTab === "appointments" && (
        <AppointmentsTab
          appointments={appointments}
          appointmentFilter={appointmentFilter}
          setAppointmentFilter={setAppointmentFilter}
          setWalkInForm={setWalkInForm}
          setWalkInModalOpen={setWalkInModalOpen}
          selectedDoctorId={selectedDoctorId}
          assignedDoctors={assignedDoctors}
          handleCashCheckIn={handleCashCheckIn}
          checkingInId={checkingInId}
          setPrintTokenData={setPrintTokenData}
        />
      )}

      {activeTab === "finance" && (
        <FinanceTab
          financialAnalytics={financialAnalytics}
          dailyCashSummary={dailyCashSummary}
          analyticsDate={analyticsDate}
          setAnalyticsDate={setAnalyticsDate}
          analyticsRange={analyticsRange}
          setAnalyticsRange={setAnalyticsRange}
          analyticsCustomStart={analyticsCustomStart}
          setAnalyticsCustomStart={setAnalyticsCustomStart}
          analyticsCustomEnd={analyticsCustomEnd}
          setAnalyticsCustomEnd={setAnalyticsCustomEnd}
          fetchFinancialAnalytics={fetchFinancialAnalytics}
          loadingAnalytics={loadingAnalytics}
          onViewPendingAppointments={() => {
            setAppointmentFilter("PENDING");
            setActiveTab("appointments");
          }}
        />
      )}

      {activeTab === "staff" && (
        <StaffTab
          staffList={staffList}
          loadingStaff={loadingStaff}
          fetchStaffData={fetchStaffData}
          dailyCashSummary={dailyCashSummary}
          staffAttendanceList={staffAttendanceList}
          staffModalOpen={staffModalOpen}
          setStaffModalOpen={setStaffModalOpen}
          staffForm={staffForm}
          setStaffForm={setStaffForm}
          submittingStaff={submittingStaff}
          handleAddStaff={handleAddStaff}
          loginModalOpen={loginModalOpen}
          setLoginModalOpen={setLoginModalOpen}
          selectedStaffForLogin={selectedStaffForLogin}
          setSelectedStaffForLogin={setSelectedStaffForLogin}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          submittingLogin={submittingLogin}
          handleCreateLoginSubmit={handleCreateLoginSubmit}
          handleOpenCreateLogin={handleOpenCreateLogin}
          handleDeleteStaff={handleDeleteStaff}
          staffMonthlySummary={staffMonthlySummary}
          selectedStaffMonth={selectedStaffMonth}
          setSelectedStaffMonth={setSelectedStaffMonth}
        />
      )}

      {/* Shared Modals and Overlays */}
      <DoctorSlideoverCard
        selectedDoctorCard={selectedDoctorCard}
        doctorCardSession={doctorCardSession}
        loadingDoctorCard={loadingDoctorCard}
        appointments={appointments}
        onClose={closeDoctorCard}
        onGoToLiveQueue={(docId) => {
          closeDoctorCard();
          setSelectedDoctorId(docId);
          setActiveTab("chamber");
        }}
        onViewAppointments={() => {
          closeDoctorCard();
          setActiveTab("appointments");
        }}
      />

      <TokenPrintModal
        printTokenData={printTokenData}
        clinic={clinic}
        onClose={() => setPrintTokenData(null)}
      />

      {/* Footer */}
      <div className="border-t border-base-200/80 pt-4 mt-6 pb-6 text-xs text-base-content/40 text-center">
        Smart Clinic — Clinic Administration Portal &copy;{" "}
        {new Date().getFullYear()}
      </div>
    </div>
  );
}
