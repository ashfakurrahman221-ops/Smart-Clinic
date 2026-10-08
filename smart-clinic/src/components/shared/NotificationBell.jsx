import React, { useState, useEffect, useRef } from "react";
import { Bell, Trash2 } from "lucide-react";
import { useAuth } from "../../Provider/AuthProvider";
import { useLanguage } from "../../context/LanguageContext";
import apiClient from "../../api/axios";

/**
 * Standardized Notification Bell Component
 * Handles real-time polling, unread count badge, and notification dropdown menu.
 */
export default function NotificationBell({ className = "" }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get("/notifications/");
      setNotifications((res.results || res || []).slice(0, 8));
    } catch {
      // Non-critical endpoint failure
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      await apiClient.post(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/notifications/${id}/`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleClearAllNotifications = async (e) => {
    e.stopPropagation();
    try {
      await apiClient.delete("/notifications/clear-all/");
      setNotifications([]);
    } catch {
      setNotifications([]);
    }
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`} ref={notifRef}>
      <button
        type="button"
        className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors relative cursor-pointer"
        onClick={() => setShowNotifDropdown((v) => !v)}
        aria-label={t("notifications") || "Notifications"}
        title={t("notifications") || "Notifications"}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showNotifDropdown && (
        <div
          className="absolute right-0 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: "calc(100% + 8px)" }}
        >
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800 tracking-tight">
                {t("notifications") || "Notifications"}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllNotifications}
                className="text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {t("noNotifications") || "No notifications"}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    handleMarkRead(n.id);
                    setShowNotifDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                    !n.is_read ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-800 leading-tight">
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 bg-[#283891] rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteNotification(e, n.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
