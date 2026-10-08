import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./App";
import HomePage from "./pages/home/HomePage";
import { AuthProvider } from "./Provider/AuthProvider";
import { LanguageProvider } from "./context/LanguageContext";
import { PrivateRoute, RoleRoute } from "./components/shared/PrivateRoute";
import "./App.css";

// Lazy-loaded route components for optimal bundle splitting
const Login = lazy(() => import("./pages/login/Login"));
const Register = lazy(() => import("./pages/register/Register"));
const ClinicList = lazy(() => import("./pages/clinics/ClinicList"));
const ClinicDetail = lazy(() => import("./pages/clinics/ClinicDetail"));
const DoctorList = lazy(() => import("./pages/doctors/DoctorList"));
const DoctorDetail = lazy(() => import("./pages/doctors/DoctorDetail"));
const BookAppointment = lazy(() => import("./pages/appointments/BookAppointment"));
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout"));
const CheckoutGateway = lazy(() => import("./pages/checkout/CheckoutGateway"));
const WaitingRoomDisplay = lazy(() => import("./pages/queue/WaitingRoomDisplay"));
const PatientQueueTracker = lazy(() => import("./pages/queue/PatientQueueTracker"));
const PrescriptionVerify = lazy(() => import("./pages/prescriptions/PrescriptionVerify"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

const RouteLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    <span className="mt-3 text-xs font-semibold tracking-wider text-slate-400">Loading module...</span>
  </div>
);

const root = document.getElementById("root");


ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/track-queue/:appointmentId" element={<PatientQueueTracker />} />
            <Route path="/queue-token/:appointmentId" element={<PatientQueueTracker />} />
            <Route path="/queue-display/:clinicId/:doctorId" element={<WaitingRoomDisplay />} />
            <Route path="/queue-display" element={<WaitingRoomDisplay />} />
            <Route path="/verify-prescription/:qrToken" element={<PrescriptionVerify />} />
            <Route path="/verify-prescription" element={<PrescriptionVerify />} />
            <Route path="/verify/:qrToken" element={<PrescriptionVerify />} />
            <Route path="/verify" element={<PrescriptionVerify />} />
            <Route path="/" element={<App />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<Login />} />
              <Route path="reception/login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password/:uid/:token" element={<ResetPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="clinics" element={<ClinicList />} />
              <Route path="clinics/:id" element={<ClinicDetail />} />
              <Route path="doctors" element={<DoctorList />} />
              <Route path="doctors/:id" element={<DoctorDetail />} />
              <Route
                path="book"
                element={
                  <RoleRoute allowedRoles={["PATIENT"]}>
                    <BookAppointment />
                  </RoleRoute>
                }
              />
              <Route
                path="dashboard"
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              />
              <Route path="checkout/:paymentId" element={<CheckoutGateway />} />
              <Route path="privacy" element={<PrivacyPolicy initialTab="privacy" />} />
              <Route path="terms" element={<PrivacyPolicy initialTab="terms" />} />
              <Route path="security" element={<PrivacyPolicy initialTab="security" />} />
              <Route path="legal" element={<PrivacyPolicy initialTab="privacy" />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
);

