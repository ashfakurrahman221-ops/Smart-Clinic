import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import apiClient from "../../api/axios";
import {
  Volume2, VolumeX, Maximize2, Minimize2, Stethoscope, Clock,
  MapPin, AlertTriangle, Users, FastForward, CheckCircle2,
  Building2, Sparkles, ArrowLeft, PhoneCall, Radio, Megaphone
} from "lucide-react";

// Web Audio API Ding-Dong chime
const playChimeSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playTone(587.33, 0.0, 0.4); // D5
    playTone(880.00, 0.2, 0.6); // A5
  } catch (err) {
    console.error("Audio playback error:", err);
  }
};

// Web Speech API Multilingual Token Callout (Bengali + English)
const speakAnnouncement = (tokenNum, roomNum, doctorName, voiceMode = "bilingual") => {
  if (typeof window === "undefined" || !window.speechSynthesis || !tokenNum) return;

  try {
    window.speechSynthesis.cancel();

    const englishPhrase = `Token number ${tokenNum}, please proceed to Room ${roomNum || "1"}.`;
    const bengaliPhrase = `টোকেন নম্বর ${tokenNum}, রুম ${roomNum || "১"}-এ আসুন।`;

    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find((v) => v.lang.startsWith("bn")) || null;
    const enVoice = voices.find((v) => v.lang.startsWith("en")) || null;

    if (voiceMode === "bn" || voiceMode === "bilingual") {
      const utterBn = new SpeechSynthesisUtterance(bengaliPhrase);
      utterBn.rate = 0.9;
      utterBn.pitch = 1.0;
      if (bnVoice) utterBn.voice = bnVoice;
      window.speechSynthesis.speak(utterBn);
    }

    if (voiceMode === "en" || voiceMode === "bilingual") {
      const utterEn = new SpeechSynthesisUtterance(englishPhrase);
      utterEn.rate = 0.95;
      utterEn.pitch = 1.0;
      if (enVoice) utterEn.voice = enVoice;

      if (voiceMode === "bilingual") {
        setTimeout(() => {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.speak(utterEn);
          }
        }, 1800);
      } else {
        window.speechSynthesis.speak(utterEn);
      }
    }
  } catch (err) {
    console.warn("Speech synthesis announcement skipped:", err);
  }
};

export default function WaitingRoomDisplay() {
  const { clinicId: paramClinicId } = useParams();

  const [clinicId, setClinicId] = useState(() => {
    return paramClinicId || localStorage.getItem("kiosk_clinic_id") || "";
  });
  const [clinics, setClinics] = useState([]);
  const [clinicInfo, setClinicInfo] = useState(null);
  const [doctors, setDoctors] = useState([]);

  // Multi-Chamber live status array
  const [chamberSessions, setChamberSessions] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceMode, setVoiceMode] = useState("bilingual"); // "bilingual" | "bn" | "en" | "chime_only"
  const [currentTime, setCurrentTime] = useState(new Date());

  const prevSerialsRef = useRef({});

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch clinics list
  useEffect(() => {
    const loadClinics = async () => {
      try {
        const res = await apiClient.get("/clinics/").catch(() => []);
        const list = res.results || res || [];
        setClinics(list);
        if (!clinicId && list.length > 0) {
          setClinicId(list[0].id);
          localStorage.setItem("kiosk_clinic_id", list[0].id);
        }
      } catch {}
    };
    loadClinics();
  }, []);

  // Fetch clinic info and doctors
  useEffect(() => {
    if (!clinicId) return;
    const fetchClinicMeta = async () => {
      try {
        const [cRes, dRes] = await Promise.all([
          apiClient.get(`/clinics/${clinicId}/`).catch(() => null),
          apiClient.get(`/doctors/?clinic_id=${clinicId}`).catch(() => []),
        ]);
        setClinicInfo(cRes);
        const docs = dRes.results || dRes || [];
        setDoctors(docs);
      } catch {}
    };
    fetchClinicMeta();
  }, [clinicId]);

  // Poll all chamber sessions for this clinic
  useEffect(() => {
    if (!clinicId) return;

    const pollAllChambers = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        // Fetch sessions for all doctors or reception clinic endpoint
        const recRes = await apiClient.get("/clinics/reception/my-clinic/").catch(() => null);
        const docList = recRes?.doctors || doctors;

        const sessionPromises = docList.slice(0, 6).map(async (doc) => {
          try {
            const sess = await apiClient.get(
              `/doctors/chamber-session/?doctor_id=${doc.id}&clinic_id=${clinicId}&date=${todayStr}`
            );
            return {
              doctorId: doc.id,
              doctorName: doc.name || doc.full_name,
              specialization: doc.specialization || "General Medicine",
              roomNumber: doc.room_number || "101",
              currentSerial: sess.current_serial || 0,
              status: sess.status || "IN_CHAMBER",
              activeEmergency: sess.active_emergency,
              activeEmergencyDetails: sess.active_emergency_details,
              heldPatient: sess.held_patient,
              heldPatientDetails: sess.held_patient_details,
              nextSerials: (sess.next_serials && sess.next_serials.length > 0)
                ? sess.next_serials
                : [],
              estWait: sess.delay_minutes ? `${sess.delay_minutes} mins` : "8 mins",
              patientName: sess.current_patient_name || "Patient"
            };
          } catch {
            return {
              doctorId: doc.id,
              doctorName: doc.name || doc.full_name,
              specialization: doc.specialization || "General Medicine",
              roomNumber: doc.room_number || "101",
              currentSerial: 0,
              status: "IN_CHAMBER",
              activeEmergency: null,
              activeEmergencyDetails: null,
              heldPatient: null,
              heldPatientDetails: null,
              nextSerials: [],
              estWait: "8 mins",
              patientName: "Patient"
            };
          }
        });

        const results = await Promise.all(sessionPromises);

        // Check if any serial or emergency changed to trigger sound
        results.forEach(ch => {
          const oldState = prevSerialsRef.current[ch.doctorId];
          const currentStateKey = `${ch.currentSerial}-${ch.activeEmergency || "none"}`;
          if (oldState !== undefined && oldState !== currentStateKey) {
            // Preserve current_serial internally without announcing it as a new call during prayer break or when ended
            if (soundEnabled && ch.status !== "PRAYER_BREAK" && ch.status !== "ENDED") {
              playChimeSound();
              if (voiceEnabled && ch.currentSerial > 0) {
                setTimeout(() => {
                  speakAnnouncement(
                    ch.activeEmergency && ch.activeEmergencyDetails?.serial_number
                      ? ch.activeEmergencyDetails.serial_number
                      : ch.currentSerial,
                    ch.roomNumber,
                    ch.doctorName,
                    voiceMode
                  );
                }, 600);
              }
            }
          }
          prevSerialsRef.current[ch.doctorId] = currentStateKey;
        });

        setChamberSessions(results);
      } catch {}
    };

    pollAllChambers();
    const interval = setInterval(pollAllChambers, 8000);
    return () => clearInterval(interval);
  }, [clinicId, doctors, soundEnabled, voiceEnabled, voiceMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Mock initial chambers if none fetched yet to match Stitch Image 5 perfectly
  const activeChambers = chamberSessions.length > 0 ? chamberSessions : [
    {
      doctorId: "1",
      doctorName: "Dr. Salma Khatun",
      specialization: "Gynecology & Obstetrics",
      roomNumber: "101",
      currentSerial: 14,
      patientName: "Kamal H.",
      tokenPrefix: "TK-14",
      status: "IN_PROGRESS",
      nextSerials: [15, 16],
      estWait: "8 mins",
      isHighlighted: true
    },
    {
      doctorId: "2",
      doctorName: "Dr. Rafiqul Islam",
      specialization: "Orthopedics & Spine",
      roomNumber: "102",
      currentSerial: 8,
      patientName: "Selim R.",
      tokenPrefix: "TK-08",
      status: "ON_BREAK",
      breakNote: "Namaz Break • Resumes at 11:00 AM",
      nextSerials: [9, 10],
      estWait: "Please Wait"
    },
    {
      doctorId: "3",
      doctorName: "Dr. Nusrat Jahan",
      specialization: "Pediatrics & Child Health",
      roomNumber: "105",
      currentSerial: 4,
      patientName: "Child of Kabir A.",
      tokenPrefix: "TK-04",
      status: "IN_PROGRESS",
      nextSerials: [5, 6],
      estWait: "12 mins"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0E131F] text-slate-100 flex flex-col justify-between font-sans select-none overflow-hidden">
      {/* ================= TOP HEADER (Stitch Image 5) ================= */}
      <header className="px-6 py-4 bg-[#141B2D]/90 border-b border-slate-800/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            to="/dashboard"
            className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-black text-xl hover:bg-indigo-600 hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            +
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wide text-white uppercase">
                Smart Clinic
              </h1>
              <span className="badge badge-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                Signage Display
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
              {clinicInfo?.name || "New Seba Hospital & Medical Center"}
            </p>
          </div>
        </div>

        {/* Center Chime, Voice & Clock */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (soundEnabled && voiceEnabled) {
                  setVoiceEnabled(false);
                } else if (soundEnabled && !voiceEnabled) {
                  setSoundEnabled(false);
                } else {
                  setSoundEnabled(true);
                  setVoiceEnabled(true);
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                soundEnabled && voiceEnabled
                  ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                  : soundEnabled
                  ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
              title="Click to cycle: Voice + Chime -> Chime Only -> Mute"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  soundEnabled && voiceEnabled
                    ? "bg-emerald-400 animate-pulse"
                    : soundEnabled
                    ? "bg-amber-400"
                    : "bg-slate-500"
                }`}
              />
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>
                {soundEnabled && voiceEnabled
                  ? "VOICE & CHIME ON (ঘোষণা চালু)"
                  : soundEnabled
                  ? "CHIME ONLY (শুধু ঘণ্টা)"
                  : "MUTED"}
              </span>
            </button>

            {soundEnabled && voiceEnabled && (
              <select
                value={voiceMode}
                onChange={(e) => setVoiceMode(e.target.value)}
                className="bg-[#0B101D] text-slate-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
                title="Announcement Language"
              >
                <option value="bilingual">Dual (বাংলা + EN)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="en">English Only</option>
              </select>
            )}
          </div>

          <div className="text-right">
            <div className="font-mono text-base font-black text-white tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Emergency & Fullscreen Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
              ✳ Emergency: 10666
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Desk: Ext 101 / 102
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-white border border-slate-700"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* ================= MULTI-CHAMBER TILES GRID (Stitch Image 5) ================= */}
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="w-full max-w-[1400px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeChambers.map((ch, idx) => {
            const isEnded = ch.status === "ENDED";
            const isPrayerBreak = ch.status === "PRAYER_BREAK";
            const isBreak = isPrayerBreak || ch.status === "PAUSED";
            const isEmergency = !isEnded && !!ch.activeEmergency;
            const isInside = !isEnded && (ch.status === "IN_PROGRESS" || ch.status === "IN_CHAMBER");
            const isHighlighted = isEmergency || (!isEnded && idx === 0) || ch.isHighlighted;

            return (
              <div
                key={ch.doctorId || idx}
                className={`bg-[#141B2D] rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 relative shadow-2xl ${
                  isEmergency
                    ? "border-rose-500 ring-2 ring-rose-500/30 shadow-rose-950/50"
                    : isHighlighted
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-950/40"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Chamber Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                      isEmergency
                        ? "bg-rose-600/30 text-rose-300 border border-rose-500/40"
                        : idx === 1
                        ? "bg-amber-600/30 text-amber-300 border border-amber-500/40"
                        : "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                    }`}>
                      ROOM {ch.roomNumber}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isEnded
                        ? "bg-slate-700/50 text-slate-300 border border-slate-600"
                        : isEmergency
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                        : isPrayerBreak
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : isBreak
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        isEnded
                          ? "bg-slate-400"
                          : isEmergency
                          ? "bg-rose-500 animate-ping"
                          : isBreak
                          ? "bg-amber-400"
                          : "bg-emerald-400 animate-pulse"
                      }`} />
                      {isEnded
                        ? "Session Ended"
                        : isEmergency
                        ? "Priority Emergency"
                        : isPrayerBreak
                        ? "Prayer Break"
                        : isBreak
                        ? "In Recess"
                        : "Inside Chamber"}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-white tracking-tight leading-snug">
                    {ch.doctorName}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {ch.specialization}
                  </p>
                </div>

                {/* Big Token Calling Center */}
                <div className={`my-8 text-center rounded-2xl py-6 border ${
                  isEnded
                    ? "bg-slate-900/80 border-slate-700"
                    : isEmergency
                    ? "bg-rose-950/20 border-rose-800/40"
                    : "bg-[#0B101D]/80 border-slate-800/80"
                }`}>
                  <span className={`text-[11px] uppercase font-extrabold tracking-widest block ${
                    isEnded
                      ? "text-slate-400"
                      : isEmergency
                      ? "text-rose-400 animate-pulse"
                      : isBreak
                      ? "text-amber-400"
                      : "text-slate-400"
                  }`}>
                    {isEnded
                      ? "CHAMBER CLOSED"
                      : isEmergency
                      ? "EMERGENCY IN CHAMBER"
                      : isPrayerBreak
                      ? "QUEUE PAUSED (PRAYER BREAK)"
                      : isBreak
                      ? "CURRENT TOKEN (PAUSED)"
                      : "NOW CALLING / SERVING"}
                  </span>
                  <div className={`text-5xl sm:text-6xl font-mono font-black tracking-tight my-2 ${
                    isEnded
                      ? "text-slate-500"
                      : isEmergency
                      ? "text-rose-400"
                      : isBreak
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}>
                    {isEnded ? "CLOSED" : `# ${String(
                      isEmergency && ch.activeEmergencyDetails?.serial_number
                        ? ch.activeEmergencyDetails.serial_number
                        : ch.currentSerial || 0
                    ).padStart(2, '0')}`}
                  </div>
                  <div className="text-sm font-bold text-slate-300">
                    {isEnded
                      ? "Session Concluded"
                      : isEmergency
                      ? ch.activeEmergencyDetails?.patient_name || "Emergency Patient"
                      : ch.patientName || "Patient"}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {isEnded
                      ? "Today's consultations ended"
                      : isEmergency
                      ? "Priority Medical Attention"
                      : `Token: ${ch.tokenPrefix || `TK-${String(ch.currentSerial).padStart(2, '0')}`}`}
                  </div>

                  {!isEnded && ch.currentSerial > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        speakAnnouncement(
                          isEmergency && ch.activeEmergencyDetails?.serial_number
                            ? ch.activeEmergencyDetails.serial_number
                            : ch.currentSerial,
                          ch.roomNumber,
                          ch.doctorName,
                          voiceMode
                        )
                      }
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/90 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <Volume2 size={12} className="text-emerald-400" />
                      <span>ঘোষণা শুনুন (Announce Again)</span>
                    </button>
                  )}
                </div>

                {/* Held Patient Notice */}
                {ch.heldPatientDetails && (
                  <div className="mb-4 p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs text-center font-bold">
                    Serial #{ch.heldPatientDetails.serial_number} paused for emergency care • resumes next
                  </div>
                )}

                {/* Status Notice or Break Timer or Ended */}
                {isEnded && (
                  <div className="mb-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 text-xs font-bold text-center">
                    Today&apos;s session has ended.
                  </div>
                )}
                {isBreak && !isEnded && !ch.heldPatientDetails && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-700/40 text-amber-300 text-xs font-bold text-center">
                    {isPrayerBreak
                      ? "🕌 Prayer Break • Queue temporarily paused. Resumes shortly."
                      : (ch.breakNote || "Chamber Paused • Resumes shortly")}
                  </div>
                )}

                {/* Bottom Footer: Next in line + Est. wait */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-400">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 block">NEXT IN LINE</span>
                    {isEnded ? (
                      <span className="text-slate-500 text-xs font-bold mt-1 block">
                        Chamber Closed
                      </span>
                    ) : isBreak ? (
                      <span className="text-amber-400/90 text-xs font-bold mt-1 block">
                        Queue Paused
                      </span>
                    ) : (
                      <div className="flex gap-1.5 mt-1 font-mono font-black text-slate-200 text-sm">
                        {ch.nextSerials && ch.nextSerials.length > 0 ? (
                          ch.nextSerials.map((s, sIdx) => (
                            <span key={sIdx} className="px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700">
                              #{String(s).padStart(2, '0')}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-xs">No pending</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 block">
                      {isEnded ? "STATUS" : isEmergency ? "STATUS" : isBreak ? "QUEUE ALERT" : "EST. WAIT"}
                    </span>
                    <span className={`font-bold mt-1 block ${
                      isEnded ? "text-slate-400" : isEmergency ? "text-rose-400" : isBreak ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      {isEnded ? "Session Ended" : isEmergency ? "Priority Active" : isBreak ? "Please Wait" : `~ ${ch.estWait || "8 mins"}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ================= BOTTOM HOSPITAL NOTICE TICKER (Stitch Image 5) ================= */}
      <footer className="px-6 py-3 bg-[#141B2D] border-t border-slate-800 flex items-center justify-between text-xs gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="badge badge-sm bg-indigo-600 text-white font-extrabold uppercase px-3 py-1 tracking-wider shrink-0 gap-1">
            <Megaphone size={12} /> Hospital Notice
          </span>
          <p className="text-slate-300 font-semibold truncate animate-marquee">
            📢 Public Health Camp: Free Diabetic & Blood Pressure Screening Camp this Sunday at Ground Floor Lounge (9:00 AM - 2:00 PM).
          </p>
        </div>

        <div className="shrink-0 text-slate-500 font-mono text-[11px] hidden md:block">
          Node: LOUNGE-TV-03
        </div>
      </footer>
    </div>
  );
}
