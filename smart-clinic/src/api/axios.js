import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach JWT token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for response handling and data unwrapping
apiClient.interceptors.response.use(
  (response) => {
    // Backend standard renderer wraps response in { success: true, data: ..., errors: null }
    if (response.data && response.data.success !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle Token Expiry & Automatic Refresh (skip for authentication endpoints)
    const isAuthEndpoint =
      originalRequest?.url?.includes("/accounts/login/") ||
      originalRequest?.url?.includes("/accounts/token/refresh/") ||
      originalRequest?.url?.includes("/accounts/register/") ||
      originalRequest?.url?.includes("/accounts/forgot-password/") ||
      originalRequest?.url?.includes("/accounts/reset-password/");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccess = res.data?.data?.access || res.data?.access;
          if (newAccess) {
            localStorage.setItem("accessToken", newAccess);
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }
    }

    let errorMessage = "An unexpected error occurred.";
    const errData =
      error.response?.data?.errors ||
      error.response?.data?.detail ||
      error.message;

    if (typeof errData === "string") {
      errorMessage = errData;
    } else if (Array.isArray(errData)) {
      errorMessage = errData.join(" ");
    } else if (typeof errData === "object" && errData !== null) {
      // Flatten DRF validation error maps e.g. { phone: ["Already in use"] } into readable strings
      errorMessage = Object.entries(errData)
        .map(([field, msgs]) => {
          const detail = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
          return field && field !== "detail" && field !== "non_field_errors"
            ? `${field.charAt(0).toUpperCase() + field.slice(1)}: ${detail}`
            : detail;
        })
        .join(" | ");
    }

    return Promise.reject(errorMessage || "An unexpected error occurred.");
  }
);

export default apiClient;
