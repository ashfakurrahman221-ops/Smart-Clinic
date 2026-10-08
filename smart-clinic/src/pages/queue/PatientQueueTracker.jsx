import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import apiClient from "../../api/axios";
import {
  Clock, MapPin, AlertTriangle, Users, Building2, Stethoscope,
  Volume2, VolumeX, Sparkles, ArrowLeft, RefreshCw, CheckCircle2,
  Calendar, Phone, ShieldCheck, QrCode, Hourglass, BellRing, Pause
} from "lucide-react";

// Synthesize pleasant attention chime via Web Audio API when serial is called
const playAttentionChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Uplifting chime sequence: C5 -> E5 -> G5 -> C6
    playTone(523.25, 0.0, 0.25);
    playTone(659.25, 0.18, 0.25);
    playTone(783.99, 0.36, 0.3);
    playTone(1046.50, 0.54, 0.6);
  } catch (err) {
    console.error("Audio error:", err);
  }
};

export default function PatientQueueTracker() {
  const { appointmentId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackData, setTrackData] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const prevTurnNowRef = useRef(false);

  const fetchTrackData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await apiClient.get(`/appointments/${appointmentId}/track/`);
      const payload = res.data || res;
      setTrackData(payload);
      setError(null);
      setLastSyncTime(new Date());

      // If patient's turn just became active, ring audio chime (unless on prayer break or session ended)
      const isPrayerBreak = payload?.live_queue?.is_prayer_break || payload?.live_queue?.chamber_status === "PRAYER_BREAK";
      const isSessionEnded = payload?.live_queue?.is_session_ended || payload?.live_queue?.chamber_status === "ENDED";
      const isTurnNow = !isPrayerBreak && !isSessionEnded && payload?.live_queue?.is_turn_now;
      if (isTurnNow && !prevTurnNowRef.current) {
        if (soundEnabled) {
          playAttentionChime();
        }
      }
      prevTurnNowRef.current = isTurnNow;
    } catch (err) {
      setError(err?.detail || "Unable to fetch live queue status for this appointment token.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (appointmentId) {
      fetchTrackData();
    }
  }, [appointmentId]);

  // Live Auto-Refresh every 4 seconds (Real-Time Live Queue Polling with Tab Visibility Awareness)
  useEffect(() => {
    if (!appointmentId) return;
    const interval = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        fetchTrackData();
      }
    }, 4000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchTrackData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [appointmentId, soundEnabled]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center space-y-4">
          <span className="loading loading-spinner loading-lg text-emerald-400" />
          <p className="text-sm text-slate-400 font-mono tracking-wide">Connecting to Live Hospital Chamber Queue...</p>
        </div>
      </div>
    );
  }

  if (error || !trackData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">Token Not Found</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {error || "We could not find active serial data for this QR code. Please ask the clinic reception desk."}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => fetchTrackData(true)}
              className="btn btn-primary btn-sm rounded-xl font-bold gap-2"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Try Again
            </button>
            <Link to="/clinics" className="btn btn-ghost btn-sm text-slate-400 text-xs">
              Back to Clinics Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { appointment, live_queue } = trackData;
  const isSessionEnded = live_queue.is_session_ended || live_queue.chamber_status === "ENDED";
  const isPrayerBreak = live_queue.is_prayer_break || live_queue.chamber_status === "PRAYER_BREAK";
  const isTurn = !isPrayerBreak && !isSessionEnded && live_queue.is_turn_now;
  const isPassed = live_queue.is_passed;
  const patientsAhead = live_queue.patients_ahead;
  const isActiveEmergency = live_queue.is_active_emergency;
  const isHeld = live_queue.is_held;
  const hasActiveEmergency = live_queue.has_active_emergency;
  const isEmergencyPatient = appointment.is_emergency;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-sm tracking-wide text-white uppercase">
              Live Patient Queue
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`btn btn-xs btn-circle ${soundEnabled ? "btn-emerald text-white bg-emerald-600 hover:bg-emerald-500" : "btn-ghost text-slate-400"}`}
              title={soundEnabled ? "Mute Turn Audio Chime" : "Enable Turn Audio Chime"}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
            <button
              type="button"
              onClick={() => fetchTrackData(true)}
              className="btn btn-xs btn-ghost text-slate-300 gap-1 font-mono text-[11px]"
              title="Manual Refresh"
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin text-emerald-400" : ""} />
              <span>{refreshing ? "Syncing..." : "Auto-Live"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto w-full p-4 sm:p-6 space-y-5 flex-1 flex flex-col justify-center">
        {/* Dynamic Status Alert Banner */}
        {isSessionEnded && !isPassed ? (
          <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-3">
            <AlertTriangle size={22} className="shrink-0 text-amber-400" />
            <div>
              <div className="font-bold text-white text-sm">Chamber Closed for Today</div>
              <div className="text-slate-300 mt-0.5">
                Your appointment could not be completed during today&apos;s chamber session. Please contact reception for assistance with rescheduling or payment/refund resolution.
              </div>
            </div>
          </div>
        ) : isActiveEmergency ? (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xl shadow-rose-500/30 border border-rose-400 animate-bounce flex items-center gap-3.5">
            <BellRing size={28} className="shrink-0 animate-spin" />
            <div>
              <div className="font-black text-base uppercase tracking-wider">🚨 EMERGENCY TURN NOW!</div>
              <div className="text-xs text-rose-100 font-medium">
                Your priority emergency consultation is ready. Please proceed directly inside Chamber ({live_queue.room_number}).
              </div>
            </div>
          </div>
        ) : isHeld ? (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-3">
            <Pause size={22} className="shrink-0 text-amber-400" />
            <div>
              <div className="font-bold text-white text-sm">Consultation Temporarily Paused</div>
              <div className="text-amber-200 mt-0.5">
                An urgent medical emergency is currently being attended. Your consultation is on hold and will resume immediately next.
              </div>
            </div>
          </div>
        ) : isPrayerBreak ? (
          <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs flex items-center gap-3">
            <Clock size={22} className="shrink-0 text-indigo-400" />
            <div>
              <div className="font-bold text-white text-sm">🕌 Prayer Break — Queue temporarily paused.</div>
              <div className="text-indigo-200 mt-0.5">
                Please wait for the doctor to resume.
              </div>
            </div>
          </div>
        ) : isTurn ? (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-500/20 border border-emerald-400 animate-bounce flex items-center gap-3.5">
            <BellRing size={28} className="shrink-0 animate-spin" />
            <div>
              <div className="font-black text-base uppercase tracking-wider">IT&apos;S YOUR TURN NOW!</div>
              <div className="text-xs text-emerald-100 font-medium">
                Please proceed directly inside Chamber ({live_queue.room_number}).
              </div>
            </div>
          </div>
        ) : isPassed ? (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-amber-400" />
            <div>
              <span className="font-bold">Your serial was already called.</span> If you missed it, please speak with the reception desk to recall your serial.
            </div>
          </div>
        ) : hasActiveEmergency ? (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-rose-400 animate-pulse" />
            <div>
              <strong className="text-white">Emergency in Chamber:</strong> The doctor is attending an urgent medical emergency. Normal queue will resume shortly.
            </div>
          </div>
        ) : patientsAhead <= 3 ? (
          <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs flex items-center gap-2.5">
            <Hourglass size={18} className="shrink-0 text-indigo-400 animate-pulse" />
            <div>
              <strong className="text-white">Almost your turn!</strong> You have only {patientsAhead} {patientsAhead === 1 ? "patient" : "patients"} ahead. Please stay near the chamber door.
            </div>
          </div>
        ) : null}

        {/* Doctor Delay Announcement Notice (if any) */}
        {live_queue.delay_minutes > 0 && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-300 uppercase tracking-wider">
              <AlertTriangle size={14} /> Doctor Chamber Delay Notice (+{live_queue.delay_minutes} mins)
            </div>
            <p className="text-rose-100 text-[11px] leading-relaxed">
              {live_queue.announcement_note || `Dr. ${appointment.doctor.full_name} is running approximately ${live_queue.delay_minutes} minutes behind schedule. Thank you for your patience.`}
            </p>
          </div>
        )}

        {/* Big High-Impact Live Token Counter Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

          {/* Header Info */}
          <div className="relative z-10 flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Patient Token Slip
              </span>
              <h2 className="text-lg font-black text-white">{appointment.patient_name}</h2>
              <div className="text-xs text-slate-400 mt-0.5">
                Token ID: <span className="font-mono text-slate-300">{appointment.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEmergencyPatient && (
                <span className="badge badge-error badge-sm text-white font-black uppercase tracking-wider animate-pulse">
                  EMERGENCY
                </span>
              )}
              <div className="badge badge-success badge-sm font-bold uppercase tracking-wider">
                {appointment.status}
              </div>
            </div>
          </div>

          {/* Side-by-Side Numbers: My Serial vs. Now Serving */}
          <div className="relative z-10 grid grid-cols-2 gap-4">
            {/* My Serial */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Your Serial
              </span>
              <div className={`text-5xl font-black font-mono tracking-tight ${isEmergencyPatient ? "text-rose-400" : "text-emerald-400"}`}>
                #{appointment.serial_number}
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Assigned to You</span>
            </div>

            {/* Now In Chamber */}
            <div className={`border rounded-2xl p-4 text-center space-y-1 transition-all ${
              isSessionEnded
                ? "bg-slate-900 border-slate-700 shadow-lg"
                : isActiveEmergency
                ? "bg-rose-950/50 border-rose-500 shadow-lg"
                : isPrayerBreak
                ? "bg-indigo-950/50 border-indigo-500/50 shadow-lg"
                : isTurn
                ? "bg-emerald-950/50 border-emerald-500 shadow-lg"
                : "bg-slate-950/80 border-slate-800"
            }`}>
              {isSessionEnded ? (
                <>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                    Chamber Status
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-300 font-mono tracking-tight py-2">
                    Closed
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate font-medium">
                    Session Ended
                  </span>
                </>
              ) : hasActiveEmergency ? (
                <>
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" /> Emergency In Chamber
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-rose-400 font-mono tracking-tight py-1.5">
                    🚨 Urgent
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate font-medium">
                    {live_queue.room_number || "Chamber"}
                  </span>
                </>
              ) : isPrayerBreak ? (
                <>
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-center gap-1">
                    <Clock size={12} /> Chamber Status
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-300 font-mono tracking-tight py-2">
                    🕌 Prayer Break
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate font-medium">
                    Queue Temporarily Paused
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" /> Now Serving
                  </span>
                  <div className="text-5xl font-black text-indigo-300 font-mono tracking-tight">
                    #{live_queue.current_serving_serial || 0}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate font-medium">
                    {live_queue.room_number || "Chamber"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Remaining Wait & Estimated Time */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
              <Users size={16} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Patients Ahead:</span>
                <span className="font-extrabold text-sm text-white">
                  {isSessionEnded ? "—" : isTurn ? "0 (You're Up!)" : isPassed ? "Called" : `${patientsAhead} Patients`}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
              <Clock size={16} className="text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Estimated Wait:</span>
                <span className="font-extrabold text-sm text-white">
                  {isSessionEnded ? "Session Ended" : isPrayerBreak ? "Paused for Prayer" : isTurn ? "None" : isPassed ? "—" : `~${live_queue.estimated_wait_mins} mins`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor & Clinic Details Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-3.5 border-b border-slate-800 pb-3">
            {appointment.doctor.profile_image_url ? (
              <img
                src={appointment.doctor.profile_image_url}
                alt={appointment.doctor.full_name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">
                <Stethoscope size={20} />
              </div>
            )}
            <div className="space-y-0.5">
              <h3 className="font-black text-sm text-white">Dr. {appointment.doctor.full_name}</h3>
              <p className="text-xs text-emerald-400 font-semibold">{appointment.doctor.specialization_name}</p>
              <p className="text-[11px] text-slate-400">{appointment.doctor.qualification}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <Building2 size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">{appointment.clinic.name}</strong>
                <p className="text-slate-400 text-[11px]">{appointment.clinic.address}, {appointment.clinic.city}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Phone size={12} /> Helpline: {appointment.clinic.phone || "01700-000000"}
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                Fee: ৳{parseFloat(appointment.amount).toLocaleString()} BDT
              </span>
            </div>
          </div>
        </div>

        {/* Advice Pill */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 text-center">
          💡 <strong>Tip:</strong> Feel free to visit the pharmacy or cafeteria. Keep this page open on your phone — it auto-refreshes every 4 seconds and will chime when your turn arrives!
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 p-4 text-center text-[10px] text-slate-500 font-mono">
        Smart Clinic Digital Live Queue • Last Sync: {lastSyncTime.toLocaleTimeString()}
      </footer>
    </div>
  );
}
