import { useState, useEffect } from "react";
import apiClient from "../../api/axios";
import { useLanguage } from "../../context/LanguageContext";

export default function Stats() {
  const { language } = useLanguage();
  const [counts, setCounts] = useState({
    clinics: 19,
    doctors: 24,
    departments: 12,
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiClient.get("/clinics/").catch(() => null),
      apiClient.get("/doctors/").catch(() => null),
      apiClient.get("/clinics/departments/").catch(() => null),
    ]).then(([cRes, dRes, deptRes]) => {
      if (!mounted) return;
      const cCount = cRes?.count ?? (Array.isArray(cRes?.results) ? cRes.results.length : 19);
      const dCount = dRes?.count ?? (Array.isArray(dRes?.results) ? dRes.results.length : 24);
      const deptCount = deptRes?.count ?? (Array.isArray(deptRes?.results) ? deptRes.results.length : 12);
      setCounts({
        clinics: cCount,
        doctors: dCount,
        departments: deptCount,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = [
    {
      value: `${counts.clinics}+`,
      label: language === "bn" ? "নিবন্ধিত ক্লিনিক ও হাসপাতাল" : "Registered Clinics",
      color: "text-[#2534a5]",
    },
    {
      value: `${counts.doctors}+`,
      label: language === "bn" ? "সার্টিফাইড বিশেষজ্ঞ চিকিৎসক" : "Certified Doctors",
      color: "text-[#d91a6e]",
    },
    {
      value: `${counts.departments}+`,
      label: language === "bn" ? "মেডিকেল বিভাগ ও স্পেশালিটি" : "Medical Departments",
      color: "text-slate-900",
    },
    {
      value: "100%",
      label: language === "bn" ? "ডিজিটাল সিরিয়াল ও কিউ ট্র্যাকিং" : "Live Queue Orchestration",
      color: "text-emerald-600",
    },
  ];

  return (
    <section className="py-16 bg-white border-y border-slate-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((item) => (
            <div key={item.label} className="text-center lg:text-left">
              <div className={`text-4xl sm:text-5xl font-black tracking-tight ${item.color}`}>
                {item.value}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-2">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}