import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle,
  Eye, Server, Smartphone, CreditCard, Users, Printer,
  ArrowLeft, HelpCircle, ChevronRight, Scale, HeartPulse,
  Clock, ShieldAlert
} from "lucide-react";

export default function PrivacyPolicy({ initialTab = "privacy", embedded = false }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (location.hash === "#terms") {
      setActiveTab("terms");
    } else if (location.hash === "#security") {
      setActiveTab("security");
    } else if (location.hash === "#consent") {
      setActiveTab("consent");
    } else if (location.hash === "#privacy" || location.pathname.includes("privacy")) {
      setActiveTab("privacy");
    }
  }, [location]);

  return (
    <div className={`w-full ${embedded ? "" : "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"} space-y-8`}>
      {/* Top Header Card */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="btn btn-ghost btn-sm gap-2 font-bold text-slate-600 hover:bg-base-200"
          >
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="badge badge-success badge-soft font-bold text-xs gap-1 py-3 px-3">
              <ShieldCheck size={14} /> Healthcare Privacy & Confidentiality
            </span>
            <button
              onClick={() => window.print()}
              className="btn btn-outline btn-sm gap-1.5 font-bold print:hidden"
            >
              <Printer size={15} /> Print Policy
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold backdrop-blur-xs">
            <ShieldCheck size={14} className="text-emerald-400" />
            Smart Clinic Trust & Compliance Center
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Privacy Policy & Legal Framework
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Your medical records, consultation notes, and private health information are protected under strict medical confidentiality, AES-256 encryption, and the Bangladesh Digital Security Act 2018.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
            <span>Last Updated: <strong>September 2026</strong></span>
            <span>•</span>
            <span>Version: <strong>2.4 Enterprise</strong></span>
            <span>•</span>
            <span>Governing Law: <strong>People's Republic of Bangladesh</strong></span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap border-b border-base-300 gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("privacy")}
          className={`pb-3 px-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "privacy"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          <Lock size={16} /> Privacy Policy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("terms")}
          className={`pb-3 px-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "terms"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          <Scale size={16} /> Terms of Service
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`pb-3 px-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "security"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          <Server size={16} /> Security & Infrastructure
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("consent")}
          className={`pb-3 px-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "consent"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          <FileText size={16} /> Patient Consent & Rights
        </button>
      </div>

      {/* ==================== TAB 1: PRIVACY POLICY ==================== */}
      {activeTab === "privacy" && (
        <div className="space-y-6">
          {/* Key Commitments Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <HeartPulse size={20} />
              </div>
              <h3 className="font-extrabold text-sm text-base-content">Confidential EMR</h3>
              <p className="text-xs text-base-content/70">
                Medical history and diagnostic reports are strictly restricted to you and your licensed consulting doctor.
              </p>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                <Smartphone size={20} />
              </div>
              <h3 className="font-extrabold text-sm text-base-content">SMS & Queue Privacy</h3>
              <p className="text-xs text-base-content/70">
                Public waiting room TV screens display only token serial numbers without revealing your diagnosis or full name.
              </p>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <CreditCard size={20} />
              </div>
              <h3 className="font-extrabold text-sm text-base-content">Payment Security</h3>
              <p className="text-xs text-base-content/70">
                bKash, Nagad, and Card transactions are processed via PCI-DSS compliant gateways without storing PINs or CVVs.
              </p>
            </div>
          </div>

          {/* Section 1: Information Collected */}
          <div className="bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-base-content flex items-center gap-2">
              <FileText className="text-primary" size={20} /> 1. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-base-content/80 leading-relaxed">
              When using Smart Clinic services, we collect and process information necessary to coordinate clinical appointments, diagnostic testing, queue serialization, and digital prescriptions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-base-content/70">
              <li>
                <strong>Identity Information:</strong> Full name, date of birth, biological sex, blood group, and emergency contact details.
              </li>
              <li>
                <strong>Bangladeshi Contact Coordinates:</strong> Mobile phone numbers normalized to standard <code className="font-mono bg-base-200 px-1.5 py-0.5 rounded text-primary font-bold">+8801XXXXXXXXX</code> format for dispatching queue proximity warnings, chamber delay broadcasts, and thermal token slips.
              </li>
              <li>
                <strong>Electronic Medical Records (EMR):</strong> Self-reported symptoms, visit complaints, uploaded laboratory blood test results, ultrasound PDFs, and doctor-authored prescriptions.
              </li>
              <li>
                <strong>Family Member Profiles:</strong> Profiles added under the "Parents & Dependents Care" module for booking appointments on behalf of elderly parents or minor children.
              </li>
              <li>
                <strong>Geolocation Coordinates:</strong> Real-time browser geolocation (when authorized) to locate clinics within a 50 km radius.
              </li>
            </ul>
          </div>

          {/* Section 2: Healthcare Professional Access */}
          <div className="bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-base-content flex items-center gap-2">
              <Users className="text-primary" size={20} /> 2. Doctor-Patient Confidentiality & EMR Access
            </h2>
            <p className="text-xs sm:text-sm text-base-content/80 leading-relaxed">
              In strict accordance with the Bangladesh Medical and Dental Council (BMDC) Code of Ethics and international healthcare data regulations:
            </p>
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 text-xs sm:text-sm text-base-content/80 space-y-2">
              <p>
                🔒 <strong>Zero Third-Party Advertising:</strong> Smart Clinic never sells, leases, or monetizes patient health records or search inquiries to pharmaceutical companies, insurance brokers, or advertisers.
              </p>
              <p>
                👩‍⚕️ <strong>Need-to-Know Clinical Access:</strong> A registered doctor can view your historical consultations and diagnostic files only when you have an active or past appointment scheduled with that physician.
              </p>
              <p>
                🏥 <strong>Clinic Receptionist Bounds:</strong> Front-desk clinic receptionists can verify your serial token number, cash payment status, and arrival status, but cannot view your private clinical consultation notes or diagnostic summaries.
              </p>
            </div>
          </div>

          {/* Section 3: SMS Gateway & Public TV Anonymity */}
          <div className="bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-base-content flex items-center gap-2">
              <Smartphone className="text-primary" size={20} /> 3. SMS Gateway & Waiting Room Privacy
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-base-content/70">
              <p>
                Our real-time SMS alert engine communicates with licensed Bangladeshi telecommunication gateways (GreenwebBD / BulkSMSBD):
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Serial Confirmation:</strong> Token serial number, doctor name, and chamber room number sent upon appointment confirmation.</li>
                <li><strong>Proximity Warning:</strong> Automated SMS triggered when you are 3 patients away from entering the doctor's room.</li>
                <li><strong>Chamber Delay Broadcast:</strong> Immediate notification if a doctor announces a delay due to traffic or surgical emergencies.</li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs">
                <strong>🛡️ Public Queue Screen Anonymity:</strong> Clinic waiting room TV monitors (<code className="font-mono text-amber-800">/queue-display</code>) only broadcast the numerical Serial Token (e.g. <em>#12</em>) and the assigned Chamber Room. Patient full names, contact numbers, and illness details are never broadcasted on public screens.
              </div>
            </div>
          </div>

          {/* Section 4: Payments & Transactions */}
          <div className="bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-base-content flex items-center gap-2">
              <CreditCard className="text-primary" size={20} /> 4. Payment Gateway & Financial Data
            </h2>
            <p className="text-xs sm:text-sm text-base-content/80 leading-relaxed">
              All digital payment transactions (bKash, Nagad, Rocket, DBBL Nexus, Visa, and Mastercard) are processed through SSLCommerz and authorized MFS infrastructure:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-base-content/70">
              <li>Smart Clinic does not store your bKash/Nagad account PINs or card CVV numbers on any server.</li>
              <li>Transaction records retain only the transaction reference ID, masked account number, timestamp, and payable BDT amount for digital money receipts and doctor fee settlements.</li>
              <li>Counter cash payments are logged by authorized clinic receptionists with instant receipt generation.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: TERMS OF SERVICE ==================== */}
      {activeTab === "terms" && (
        <div className="space-y-6">
          <div className="bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-base-content flex items-center gap-2">
              <Scale className="text-primary" size={20} /> 1. Platform Terms & Medical Disclaimer
            </h2>
            <div className="text-xs sm:text-sm text-base-content/70 space-y-3 leading-relaxed">
              <div className="alert alert-warning text-slate-900 font-bold rounded-2xl text-xs">
                <AlertCircle size={16} /> Emergency Notice: Smart Clinic is a queue management and scheduling platform. For life-threatening emergencies, dial 999 or proceed immediately to the nearest hospital casualty emergency ward.
              </div>
              <p>
                By creating an account or booking an appointment through Smart Clinic, you acknowledge and agree that:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Authorized Medical Practitioners:</strong> Medical advice, diagnosis, and prescription authoring are provided solely by independent BMDC-licensed doctors registered on our platform.
                </li>
                <li>
                  <strong>Token Serial Honor:</strong> Serial numbers are assigned sequentially based on time slot availability. While clinics endeavor to maintain exact schedules, doctor emergency surgeries or complex consultations may adjust waiting times.
                </li>
                <li>
                  <strong>Cancellation & Rescheduling:</strong> Patients may cancel or reschedule their appointment up to 2 hours before the scheduled chamber session without penalty.
                </li>
                <li>
                  <strong>Accurate Patient Profiles:</strong> Patients are responsible for providing truthful information regarding age, biological sex, and known drug allergies to assist accurate prescribing.
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-base-content flex items-center gap-2">
              <CreditCard className="text-primary" size={20} /> 2. Fee Schedules & Refund Policy
            </h2>
            <div className="text-xs sm:text-sm text-base-content/70 space-y-3">
              <p>
                Consultation fees and diagnostic test charges are set directly by clinics and practicing physicians:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>If a doctor cancels their chamber session, any digital advance payment or token deposit is refunded back to the originating MFS/card wallet within 3 business days.</li>
                <li>Cash payments made at clinic reception are settled directly with the clinic accounting desk under their receipt.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: SECURITY & INFRASTRUCTURE ==================== */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-base-content flex items-center gap-2">
              <Server className="text-primary" size={20} /> Technical Security Measures
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-base-200/60 border border-base-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-base-content">
                  <Lock size={16} className="text-emerald-600" /> AES-256 Data Encryption
                </div>
                <p className="text-xs text-base-content/70">
                  All stored medical reports, database backups, and patient identities are encrypted at rest using AES-256 standard encryption keys.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-base-200/60 border border-base-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-base-content">
                  <ShieldCheck size={16} className="text-primary" /> TLS 1.3 in Transit
                </div>
                <p className="text-xs text-base-content/70">
                  Every API request between your browser, mobile phone, and the clinic servers is encrypted with modern TLS 1.3 cryptographic protocols.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-base-200/60 border border-base-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-base-content">
                  <CheckCircle2 size={16} className="text-indigo-600" /> Role-Based Access Control (RBAC)
                </div>
                <p className="text-xs text-base-content/70">
                  Strict perimeter segregation guarantees patients, doctors, clinic receptionists, and system super-admins access only their authorized views.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-base-200/60 border border-base-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-base-content">
                  <Server size={16} className="text-amber-600" /> Automated Daily Backups
                </div>
                <p className="text-xs text-base-content/70">
                  Off-site redundant snapshot backups protect patient consultation records from hardware failure or unforeseen localized outages.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: PATIENT CONSENT & RIGHTS ==================== */}
      {activeTab === "consent" && (
        <div className="space-y-6">
          <div className="bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-base-content flex items-center gap-2">
              <FileText className="text-primary" size={20} /> Your Rights Under Bangladesh Digital Laws
            </h2>
            <div className="text-xs sm:text-sm text-base-content/70 space-y-3 leading-relaxed">
              <p>
                As a patient registered on Smart Clinic, you retain full ownership of your personal health data:
              </p>
              <div className="space-y-2.5">
                <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-base-content">Right to Access & Download:</strong> You can download all prescriptions, medical receipts, and diagnostic files directly from your dashboard in PDF or thermal printable formats.
                  </div>
                </div>

                <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-base-content">Right to Rectification:</strong> You may update your profile, phone number, and dependent details at any time under Profile Settings.
                  </div>
                </div>

                <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-base-content">Right to Deletion:</strong> You can submit an account and data removal request, subject to mandatory medical record retention periods governed by national health guidelines.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Data Protection Officer */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-3">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <HelpCircle className="text-primary" size={18} /> Data Protection & Privacy Office
            </h3>
            <p className="text-xs text-slate-300">
              For inquiries regarding personal data privacy, hospital records compliance, or regulatory queries:
            </p>
            <div className="text-xs space-y-1 text-indigo-300 font-mono">
              <div>Email: compliance@smartclinic.com.bd</div>
              <div>Helpline: +880 9612-000000 (Sunday to Thursday, 9 AM - 6 PM BST)</div>
              <div>Address: Level 7, HealthTech Tower, Karwan Bazar, Dhaka-1215, Bangladesh</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
