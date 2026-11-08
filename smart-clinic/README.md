# 🎨 Smart Clinic Frontend — Modern Healthcare Single Page Application

High-performance, modern React 19 single page application (SPA) powering the **Smart Clinic** multi-clinic healthcare ecosystem.

---

## 💻 Tech Stack & Design System

- **Core Framework**: [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- **Styling & Theme**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/)
- **Iconography**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/) with automated JWT bearer interceptors and refresh flow
- **QR Code Engine**: `qrcode.react` for mobile queue tracking and prescription verification
- **Internationalization**: Pure dual-engine localization for English and Bengali (বাংলা)

---

## 📱 Portals & Key Interfaces

### 1. Patient Portal & Mobile Tracker
- **Discovery**: Real-time clinic and specialist doctor directory with dynamic department and fee filters.
- **Booking Flow**: Multi-step slot booking with cash or online payment gateway checkout.
- **Mobile Live Queue Tracker (`/track/:uuid`)**:
  - Live serving serial with pulse animation.
  - Real-time "patients ahead" calculation.
  - Contextual status banners (`Turn Now`, `Consultation Paused (Emergency in Chamber)`, `Turn Passed`).
  - Emergency reassurance notices and preparation tips.

### 2. Specialist Doctor Chamber Console (`/dashboard/doctor`)
- **Real-Time Queue Management**: Call Next, Skip & Recall serial controls.
- **Doctor Chamber Session**: Status switches (`IN_CHAMBER`, `PRAYER_BREAK`, `IN_TRANSIT`, `EMERGENCY`, `COMPLETED`).
- **Emergency Priority Waiting Tray**: Visual counter badges and 1-click priority admission.
- **Active Emergency & Held Patient Controls**: Complete emergency with 1-click return to held patient consultation.
- **Broadcast Announcements**: Send custom delay notifications directly to waiting room screens.

### 3. Front-Desk Receptionist Panel (`/dashboard/receptionist`)
- **Multi-Doctor Chamber Console**: Real-time chamber selector with live doctor status indicators.
- **Unified Walk-In Counter**: Patient registration with optional emergency priority flag and reason.
- **Thermal Token Slip Generation**: Automated 80mm thermal token print dialog with instant reprint support.
- **Arrival Check-in & Cashiering**: 1-click arrival check-in and cash payment recording.

### 4. Clinic Admin Operations Dashboard (`/dashboard/clinic-admin`)
- **Chamber Reception Tab**: Full front-desk queue coordination with emergency tray and token printing.
- **Staff Directory Tab**: Receptionist onboarding, monthly salary assignment, and attendance tracking.
- **Facilities & Virtual Tour**: Gallery decorator, room manager, and diagnostic catalog pricing.
- **Appointments & Analytics**: Historical logs, revenue charts, and doctor invitation management.

### 5. Public Waiting Room TV Display (`/waiting-room?clinic=:id&doctor=:id`)
- Designed specifically for wall-mounted 1080p / 4K waiting lounge monitors.
- Fullscreen mode support with large high-visibility serial numbers.
- Privacy-safe priority medical attention indicators (strictly zero medical details or complaints disclosed).
- Real-time upcoming patient sequence.

---

## 📁 Source Directory Structure

```
smart-clinic/src/
├── assets/                  # Static media, icons, and logos
├── components/              # Shared reusable UI elements
│   ├── Navbar.jsx           # Global navigation with role-aware profile & language toggle
│   ├── Footer.jsx           # Enterprise footer with quick links
│   └── ProtectedRoute.jsx   # Role-based access control route guard
├── context/                 # Application context providers (AuthContext, LanguageContext)
├── pages/
│   ├── auth/                # Login, Register, Password Reset
│   ├── dashboard/           # Role-specific portals
│   │   ├── clinic-admin/    # Sub-tabs: ChamberReception, Staff, Services, Appointments, etc.
│   │   │   └── TokenPrintModal.jsx  # Thermal token generation & reprint modal
│   │   ├── ClinicAdminDashboard.jsx
│   │   ├── DoctorDashboard.jsx
│   │   ├── ReceptionistPanel.jsx
│   │   ├── PatientDashboard.jsx
│   │   └── SuperAdminDashboard.jsx
│   ├── queue/               # Real-time queue views
│   │   ├── PatientQueueTracker.jsx  # Mobile live queue tracker
│   │   └── WaitingRoomDisplay.jsx   # Public lounge TV display screen
│   └── public/              # Home, ClinicList, ClinicDetail, DoctorList, DoctorDetail
├── services/                # Axios API service endpoints
└── main.jsx                 # Application root with router configuration
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` in the root of `smart-clinic/`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. Start Development Server
```bash
npm run dev
```
Client URL: `http://localhost:5173/`

### 4. Production Build
```bash
npm run build
```
Generates optimized static assets in `dist/`.
