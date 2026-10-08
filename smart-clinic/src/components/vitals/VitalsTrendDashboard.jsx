import { useState, useEffect, useMemo } from "react";
import apiClient from "../../api/axios";
import {
  Activity,
  Heart,
  Droplets,
  Scale,
  TrendingUp,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  X,
  Loader
} from "lucide-react";

export default function VitalsTrendDashboard({ patientId = "", familyMemberId = "", readOnly = false }) {
  const [vitalsData, setVitalsData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMetric, setActiveMetric] = useState("bp"); // 'bp' | 'glucose' | 'pulse' | 'weight'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // New Log Modal State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [logError, setLogError] = useState("");
  const [logForm, setLogForm] = useState({
    systolic_bp: "",
    diastolic_bp: "",
    pulse_rate: "",
    blood_glucose: "",
    glucose_type: "RBS",
    weight_kg: "",
    height_cm: "",
    temperature_f: "",
    notes: "",
  });

  const fetchVitals = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/prescriptions/vitals/";
      const params = new URLSearchParams();
      if (patientId) params.append("patient_id", patientId);
      if (familyMemberId) params.append("family_member_id", familyMemberId);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const res = await apiClient.get(url);
      const data = res.data || res;
      setVitalsData(data.results || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Failed to load vitals:", err);
      setError("Failed to load clinical vitals data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVitals();
  }, [patientId, familyMemberId]);

  const handleCreateVital = async (e) => {
    e.preventDefault();
    setSavingLog(true);
    setLogError("");

    try {
      const payload = {
        glucose_type: logForm.glucose_type,
        notes: logForm.notes.trim(),
      };
      if (patientId) payload.patient = patientId;
      if (familyMemberId) payload.family_member = familyMemberId;
      if (logForm.systolic_bp) payload.systolic_bp = parseInt(logForm.systolic_bp, 10);
      if (logForm.diastolic_bp) payload.diastolic_bp = parseInt(logForm.diastolic_bp, 10);
      if (logForm.pulse_rate) payload.pulse_rate = parseInt(logForm.pulse_rate, 10);
      if (logForm.blood_glucose) payload.blood_glucose = parseFloat(logForm.blood_glucose);
      if (logForm.weight_kg) payload.weight_kg = parseFloat(logForm.weight_kg);
      if (logForm.height_cm) payload.height_cm = parseFloat(logForm.height_cm);
      if (logForm.temperature_f) payload.temperature_f = parseFloat(logForm.temperature_f);

      await apiClient.post("/prescriptions/vitals/", payload);
      setLogModalOpen(false);
      setLogForm({
        systolic_bp: "",
        diastolic_bp: "",
        pulse_rate: "",
        blood_glucose: "",
        glucose_type: "RBS",
        weight_kg: "",
        height_cm: "",
        temperature_f: "",
        notes: "",
      });
      fetchVitals();
    } catch (err) {
      setLogError(
        typeof err === "object"
          ? Object.values(err).flat().join(" ") || "Failed to save reading."
          : err || "Failed to save reading."
      );
    } finally {
      setSavingLog(false);
    }
  };

  // Prepare chart series points
  const chartPoints = useMemo(() => {
    if (!vitalsData || vitalsData.length === 0) return [];
    return vitalsData.map((d, index) => {
      const dateStr = d.recorded_at ? d.recorded_at.slice(0, 10) : "";
      return {
        id: d.id,
        index,
        date: dateStr,
        raw: d,
        systolic: d.systolic_bp,
        diastolic: d.diastolic_bp,
        glucose: d.blood_glucose ? parseFloat(d.blood_glucose) : null,
        pulse: d.pulse_rate,
        weight: d.weight_kg ? parseFloat(d.weight_kg) : null,
        bmi: d.bmi,
      };
    });
  }, [vitalsData]);

  // Compute SVG coordinates
  const svgMetrics = useMemo(() => {
    const width = 700;
    const height = 260;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    if (chartPoints.length === 0) return { width, height, padding, innerWidth, innerHeight, points: [] };

    let minY = 0;
    let maxY = 100;

    if (activeMetric === "bp") {
      const allVals = chartPoints.flatMap((p) => [p.systolic, p.diastolic]).filter(Boolean);
      minY = allVals.length > 0 ? Math.min(50, Math.min(...allVals) - 10) : 50;
      maxY = allVals.length > 0 ? Math.max(180, Math.max(...allVals) + 15) : 180;
    } else if (activeMetric === "glucose") {
      const allVals = chartPoints.map((p) => p.glucose).filter(Boolean);
      minY = 3.0;
      maxY = allVals.length > 0 ? Math.max(14.0, Math.max(...allVals) + 2) : 14.0;
    } else if (activeMetric === "pulse") {
      const allVals = chartPoints.map((p) => p.pulse).filter(Boolean);
      minY = 40;
      maxY = allVals.length > 0 ? Math.max(120, Math.max(...allVals) + 10) : 120;
    } else if (activeMetric === "weight") {
      const allVals = chartPoints.map((p) => p.weight).filter(Boolean);
      minY = allVals.length > 0 ? Math.min(40, Math.min(...allVals) - 5) : 40;
      maxY = allVals.length > 0 ? Math.max(100, Math.max(...allVals) + 5) : 100;
    }

    const n = chartPoints.length;
    const stepX = n > 1 ? innerWidth / (n - 1) : innerWidth / 2;

    const mapped = chartPoints.map((p, i) => {
      const cx = padding.left + (n > 1 ? i * stepX : innerWidth / 2);

      const getY = (val) => {
        if (val === null || val === undefined) return null;
        const normalized = (val - minY) / (maxY - minY);
        return padding.top + innerHeight - normalized * innerHeight;
      };

      return {
        ...p,
        cx,
        cySystolic: getY(p.systolic),
        cyDiastolic: getY(p.diastolic),
        cyGlucose: getY(p.glucose),
        cyPulse: getY(p.pulse),
        cyWeight: getY(p.weight),
      };
    });

    return {
      width,
      height,
      padding,
      innerWidth,
      innerHeight,
      minY,
      maxY,
      points: mapped,
    };
  }, [chartPoints, activeMetric]);

  // Generate SVG path for a given key
  const generatePath = (points, key) => {
    const valid = points.filter((p) => p[key] !== null);
    if (valid.length === 0) return "";
    return valid.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.cx} ${curr[key]}` : `${acc} L ${curr.cx} ${curr[key]}`;
    }, "");
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-base-100 p-5 rounded-3xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-base-content flex items-center gap-2">
              Clinical Vitals & Trend Analytics
              <span className="badge badge-primary badge-sm font-bold">Live PHR</span>
            </h2>
            <p className="text-xs text-base-content/60">
              Longitudinal tracking of Blood Pressure, Blood Glucose, Heart Rate and BMI over clinical visits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchVitals}
            className="btn btn-ghost btn-sm btn-square rounded-xl"
            title="Refresh vitals"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {!readOnly && (
            <button
              onClick={() => setLogModalOpen(true)}
              className="btn btn-primary btn-sm rounded-xl font-bold shadow-md gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Log Reading</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Blood Pressure */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-base-content/60">Blood Pressure</span>
            <div className="p-2 rounded-xl bg-error/10 text-error">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-base-content">
              {summary?.latest_bp || "--/--"}
            </span>
            <span className="text-xs font-semibold text-base-content/50">mmHg</span>
          </div>
          {summary?.latest_bp && vitalsData.length > 0 && (
            <div className="pt-1">
              <span className={`badge badge-xs font-bold ${
                vitalsData[vitalsData.length - 1]?.bp_category?.color === "error"
                  ? "badge-error text-error-content"
                  : vitalsData[vitalsData.length - 1]?.bp_category?.color === "warning"
                  ? "badge-warning text-warning-content"
                  : "badge-success text-success-content"
              }`}>
                {vitalsData[vitalsData.length - 1]?.bp_category?.label || "Recorded"}
              </span>
            </div>
          )}
        </div>

        {/* 2. Blood Sugar */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-base-content/60">Blood Glucose</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-base-content">
              {summary?.latest_sugar !== null && summary?.latest_sugar !== undefined
                ? summary.latest_sugar
                : "--"}
            </span>
            <span className="text-xs font-semibold text-base-content/50">mmol/L</span>
          </div>
          {summary?.latest_sugar && vitalsData.length > 0 && (
            <div className="pt-1">
              <span className={`badge badge-xs font-bold ${
                vitalsData[vitalsData.length - 1]?.glucose_category?.color === "error"
                  ? "badge-error text-error-content"
                  : vitalsData[vitalsData.length - 1]?.glucose_category?.color === "warning"
                  ? "badge-warning text-warning-content"
                  : "badge-success text-success-content"
              }`}>
                {vitalsData[vitalsData.length - 1]?.glucose_category?.label || "Normal"}
              </span>
            </div>
          )}
        </div>

        {/* 3. Pulse Rate */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-base-content/60">Heart Rate (Pulse)</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-base-content">
              {summary?.latest_pulse || "--"}
            </span>
            <span className="text-xs font-semibold text-base-content/50">bpm</span>
          </div>
          <div className="pt-1">
            <span className="text-[11px] text-base-content/60 font-medium">Normal resting: 60-100</span>
          </div>
        </div>

        {/* 4. Weight & BMI */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-base-content/60">Weight & BMI</span>
            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-base-content">
              {summary?.latest_weight || "--"}
            </span>
            <span className="text-xs font-semibold text-base-content/50">kg</span>
            {summary?.latest_bmi && (
              <span className="text-xs font-bold text-primary ml-1">
                (BMI {summary.latest_bmi})
              </span>
            )}
          </div>
          {summary?.latest_bmi && (
            <div className="pt-1">
              <span className="badge badge-xs badge-success text-success-content font-bold">
                Healthy BMI
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Trend Chart Card */}
      <div className="bg-base-100 p-6 rounded-3xl border border-base-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold text-base text-base-content">
              Longitudinal Clinical Trend
            </h3>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1 bg-base-200 p-1 rounded-2xl">
            <button
              onClick={() => setActiveMetric("bp")}
              className={`btn btn-xs rounded-xl font-bold transition-all ${
                activeMetric === "bp" ? "btn-primary shadow-sm" : "btn-ghost"
              }`}
            >
              Blood Pressure
            </button>
            <button
              onClick={() => setActiveMetric("glucose")}
              className={`btn btn-xs rounded-xl font-bold transition-all ${
                activeMetric === "glucose" ? "btn-primary shadow-sm" : "btn-ghost"
              }`}
            >
              Glucose
            </button>
            <button
              onClick={() => setActiveMetric("pulse")}
              className={`btn btn-xs rounded-xl font-bold transition-all ${
                activeMetric === "pulse" ? "btn-primary shadow-sm" : "btn-ghost"
              }`}
            >
              Pulse
            </button>
            <button
              onClick={() => setActiveMetric("weight")}
              className={`btn btn-xs rounded-xl font-bold transition-all ${
                activeMetric === "weight" ? "btn-primary shadow-sm" : "btn-ghost"
              }`}
            >
              Weight
            </button>
          </div>
        </div>

        {/* Chart View Container */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-base-content/50">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs font-semibold">Loading health indicators...</span>
          </div>
        ) : chartPoints.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 border-2 border-dashed border-base-200 rounded-2xl">
            <div className="p-3 bg-base-200 text-base-content/40 rounded-full">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-base-content">No Vitals Recorded Yet</p>
              <p className="text-xs text-base-content/50 max-w-sm mt-0.5">
                Vitals will automatically populate here after doctor prescriptions or manual logging.
              </p>
            </div>
            {!readOnly && (
              <button
                onClick={() => setLogModalOpen(true)}
                className="btn btn-primary btn-sm rounded-xl font-bold"
              >
                Log First Reading
              </button>
            )}
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            {/* SVG Visualizer */}
            <svg
              viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`}
              className="w-full h-64 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="bpGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = svgMetrics.padding.top + svgMetrics.innerHeight * ratio;
                const val = (svgMetrics.maxY - ratio * (svgMetrics.maxY - svgMetrics.minY)).toFixed(
                  activeMetric === "glucose" ? 1 : 0
                );
                return (
                  <g key={idx}>
                    <line
                      x1={svgMetrics.padding.left}
                      y1={y}
                      x2={svgMetrics.width - svgMetrics.padding.right}
                      y2={y}
                      stroke="currentColor"
                      className="text-base-200"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={svgMetrics.padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] fill-base-content/40 font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Threshold Zones for Blood Pressure */}
              {activeMetric === "bp" && (
                <>
                  {/* Warning line at 140 mmHg systolic */}
                  {140 >= svgMetrics.minY && 140 <= svgMetrics.maxY && (
                    <line
                      x1={svgMetrics.padding.left}
                      y1={
                        svgMetrics.padding.top +
                        svgMetrics.innerHeight -
                        ((140 - svgMetrics.minY) / (svgMetrics.maxY - svgMetrics.minY)) *
                          svgMetrics.innerHeight
                      }
                      x2={svgMetrics.width - svgMetrics.padding.right}
                      y2={
                        svgMetrics.padding.top +
                        svgMetrics.innerHeight -
                        ((140 - svgMetrics.minY) / (svgMetrics.maxY - svgMetrics.minY)) *
                          svgMetrics.innerHeight
                      }
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                      opacity="0.6"
                    />
                  )}
                  {/* Normal line at 120 mmHg systolic */}
                  {120 >= svgMetrics.minY && 120 <= svgMetrics.maxY && (
                    <line
                      x1={svgMetrics.padding.left}
                      y1={
                        svgMetrics.padding.top +
                        svgMetrics.innerHeight -
                        ((120 - svgMetrics.minY) / (svgMetrics.maxY - svgMetrics.minY)) *
                          svgMetrics.innerHeight
                      }
                      x2={svgMetrics.width - svgMetrics.padding.right}
                      y2={
                        svgMetrics.padding.top +
                        svgMetrics.innerHeight -
                        ((120 - svgMetrics.minY) / (svgMetrics.maxY - svgMetrics.minY)) *
                          svgMetrics.innerHeight
                      }
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                      opacity="0.6"
                    />
                  )}
                </>
              )}

              {/* Data Lines */}
              {activeMetric === "bp" && (
                <>
                  {/* Systolic Line */}
                  <path
                    d={generatePath(svgMetrics.points, "cySystolic")}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Diastolic Line */}
                  <path
                    d={generatePath(svgMetrics.points, "cyDiastolic")}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {activeMetric === "glucose" && (
                <path
                  d={generatePath(svgMetrics.points, "cyGlucose")}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {activeMetric === "pulse" && (
                <path
                  d={generatePath(svgMetrics.points, "cyPulse")}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {activeMetric === "weight" && (
                <path
                  d={generatePath(svgMetrics.points, "cyWeight")}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Dots & Hover Triggers */}
              {svgMetrics.points.map((p, idx) => {
                const dateShort = p.date ? p.date.slice(5) : "";
                return (
                  <g key={idx}>
                    {/* X-axis date label */}
                    <text
                      x={p.cx}
                      y={svgMetrics.height - 10}
                      textAnchor="middle"
                      className="text-[10px] fill-base-content/60 font-semibold"
                    >
                      {dateShort}
                    </text>

                    {/* Metric Dots */}
                    {activeMetric === "bp" && p.cySystolic !== null && (
                      <>
                        <circle
                          cx={p.cx}
                          cy={p.cySystolic}
                          r={hoveredPoint?.id === p.id ? 6 : 4.5}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="cursor-pointer transition-all duration-150"
                          onMouseEnter={() => setHoveredPoint(p)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                        {p.cyDiastolic !== null && (
                          <circle
                            cx={p.cx}
                            cy={p.cyDiastolic}
                            r={hoveredPoint?.id === p.id ? 6 : 4.5}
                            fill="#0ea5e9"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-pointer transition-all duration-150"
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        )}
                      </>
                    )}

                    {activeMetric === "glucose" && p.cyGlucose !== null && (
                      <circle
                        cx={p.cx}
                        cy={p.cyGlucose}
                        r={hoveredPoint?.id === p.id ? 6 : 4.5}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredPoint(p)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    )}

                    {activeMetric === "pulse" && p.cyPulse !== null && (
                      <circle
                        cx={p.cx}
                        cy={p.cyPulse}
                        r={hoveredPoint?.id === p.id ? 6 : 4.5}
                        fill="#0ea5e9"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredPoint(p)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    )}

                    {activeMetric === "weight" && p.cyWeight !== null && (
                      <circle
                        cx={p.cx}
                        cy={p.cyWeight}
                        r={hoveredPoint?.id === p.id ? 6 : 4.5}
                        fill="#8b5cf6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredPoint(p)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredPoint && (
              <div
                className="absolute top-2 right-4 bg-base-100/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-base-200 text-xs space-y-1.5 z-20 pointer-events-none"
              >
                <div className="font-extrabold text-base-content flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>{hoveredPoint.date}</span>
                </div>
                {activeMetric === "bp" && (
                  <div>
                    <span className="font-bold text-error">Systolic: {hoveredPoint.systolic} mmHg</span> |{" "}
                    <span className="font-bold text-info">Diastolic: {hoveredPoint.diastolic} mmHg</span>
                  </div>
                )}
                {activeMetric === "glucose" && (
                  <div className="font-bold text-amber-500">
                    Blood Sugar: {hoveredPoint.glucose} mmol/L
                  </div>
                )}
                {activeMetric === "pulse" && (
                  <div className="font-bold text-primary">
                    Pulse: {hoveredPoint.pulse} bpm
                  </div>
                )}
                {activeMetric === "weight" && (
                  <div className="font-bold text-secondary">
                    Weight: {hoveredPoint.weight} kg {hoveredPoint.bmi ? `(BMI: ${hoveredPoint.bmi})` : ""}
                  </div>
                )}
                {hoveredPoint.raw?.notes && (
                  <p className="text-[11px] text-base-content/60 italic pt-0.5">
                    "{hoveredPoint.raw.notes}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        {activeMetric === "bp" && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-2 text-base-content/70">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-error inline-block" />
              <span>Systolic BP (Upper limit)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-info inline-block" />
              <span>Diastolic BP (Lower limit)</span>
            </div>
            <div className="flex items-center gap-1.5 text-success">
              <span className="w-4 border-b-2 border-dashed border-success inline-block" />
              <span>Normal Benchmark (&lt;120/80)</span>
            </div>
          </div>
        )}
      </div>

      {/* Historical Readings Log Table */}
      <div className="bg-base-100 rounded-3xl border border-base-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-base-200 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-base-content flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>Chronological Records History</span>
          </h3>
          <span className="text-xs text-base-content/60 font-semibold">
            {vitalsData.length} records logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm w-full text-xs">
            <thead>
              <tr className="bg-base-200/50 text-base-content/70">
                <th>Date & Time</th>
                <th>Blood Pressure</th>
                <th>Blood Sugar</th>
                <th>Pulse</th>
                <th>Weight / BMI</th>
                <th>Doctor / Context</th>
                <th>Clinical Notes</th>
              </tr>
            </thead>
            <tbody>
              {vitalsData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-base-content/40">
                    No clinical records available.
                  </td>
                </tr>
              ) : (
                vitalsData.slice().reverse().map((item) => (
                  <tr key={item.id} className="hover:bg-base-200/30 transition-colors">
                    <td className="font-semibold whitespace-nowrap">
                      {item.recorded_at ? item.recorded_at.slice(0, 10) : "--"}
                    </td>
                    <td>
                      {item.systolic_bp && item.diastolic_bp ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">
                            {item.systolic_bp}/{item.diastolic_bp}
                          </span>
                          {item.bp_category && (
                            <span
                              className={`badge badge-xs font-semibold ${
                                item.bp_category.color === "error"
                                  ? "badge-error text-error-content"
                                  : item.bp_category.color === "warning"
                                  ? "badge-warning text-warning-content"
                                  : "badge-success text-success-content"
                              }`}
                            >
                              {item.bp_category.label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-base-content/30">--</span>
                      )}
                    </td>
                    <td>
                      {item.blood_glucose ? (
                        <span className="font-bold">
                          {item.blood_glucose} <span className="text-[10px] text-base-content/50">mmol/L</span>
                        </span>
                      ) : (
                        <span className="text-base-content/30">--</span>
                      )}
                    </td>
                    <td>
                      {item.pulse_rate ? (
                        <span className="font-semibold">{item.pulse_rate} bpm</span>
                      ) : (
                        <span className="text-base-content/30">--</span>
                      )}
                    </td>
                    <td>
                      {item.weight_kg ? (
                        <span>
                          {item.weight_kg} kg {item.bmi ? `(BMI ${item.bmi})` : ""}
                        </span>
                      ) : (
                        <span className="text-base-content/30">--</span>
                      )}
                    </td>
                    <td>
                      <span className="text-base-content/80 font-medium">
                        {item.doctor_name ? `Dr. ${item.doctor_name}` : "Self Log"}
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-base-content/70">
                      {item.notes || "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal */}
      {logModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box rounded-3xl max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-base-200 pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <span>Log Clinical Vital Reading</span>
              </h3>
              <button
                onClick={() => setLogModalOpen(false)}
                className="btn btn-ghost btn-sm btn-square rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {logError && (
              <div className="alert alert-error text-xs py-2.5 rounded-xl">
                <span>{logError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVital} className="space-y-4">
              {/* BP Inputs */}
              <div>
                <label className="label text-xs font-bold text-base-content/70 py-1">
                  Blood Pressure (mmHg)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Systolic (e.g. 120)"
                    value={logForm.systolic_bp}
                    onChange={(e) => setLogForm({ ...logForm, systolic_bp: e.target.value })}
                    className="input input-bordered input-sm w-full text-xs"
                    min="50"
                    max="250"
                  />
                  <input
                    type="number"
                    placeholder="Diastolic (e.g. 80)"
                    value={logForm.diastolic_bp}
                    onChange={(e) => setLogForm({ ...logForm, diastolic_bp: e.target.value })}
                    className="input input-bordered input-sm w-full text-xs"
                    min="30"
                    max="160"
                  />
                </div>
              </div>

              {/* Blood Sugar & Pulse */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-bold text-base-content/70 py-1">
                    Blood Sugar (mmol/L)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 6.4"
                    value={logForm.blood_glucose}
                    onChange={(e) => setLogForm({ ...logForm, blood_glucose: e.target.value })}
                    className="input input-bordered input-sm w-full text-xs"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70 py-1">
                    Pulse Rate (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 74"
                    value={logForm.pulse_rate}
                    onChange={(e) => setLogForm({ ...logForm, pulse_rate: e.target.value })}
                    className="input input-bordered input-sm w-full text-xs"
                    min="30"
                    max="220"
                  />
                </div>
              </div>

              {/* Weight & Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-bold text-base-content/70 py-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 68.5"
                    value={logForm.weight_kg}
                    onChange={(e) => setLogForm({ ...logForm, weight_kg: e.target.value })}
                    className="input input-bordered input-sm w-full text-xs"
                  />
                </div>

                <div>
                  <label className="label text-xs font-bold text-base-content/70 py-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 172"
                    value={logForm.height_cm}
                    onChange={(e) => setLogForm({ ...logForm, height_cm: e.target.value })}
                    className="input input-bordered input-sm w-full text-xs"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="label text-xs font-bold text-base-content/70 py-1">
                  Clinical Notes / Context
                </label>
                <input
                  type="text"
                  placeholder="e.g. Before breakfast, felt lightheaded"
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  className="input input-bordered input-sm w-full text-xs"
                />
              </div>

              <div className="modal-action pt-2">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="btn btn-ghost btn-sm rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLog}
                  className="btn btn-primary btn-sm rounded-xl font-bold gap-2"
                >
                  {savingLog && <Loader className="h-4 w-4 animate-spin" />}
                  <span>Save Vital Reading</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
