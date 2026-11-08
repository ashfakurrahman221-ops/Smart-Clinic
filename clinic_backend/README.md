# ⚙️ Smart Clinic Backend — API & Digital Queue Orchestration Engine

Production-ready Django REST Framework backend powering the **Smart Clinic** multi-clinic healthcare ecosystem.

---

## 🏗️ Architecture & Apps Overview

| App | Namespace | Description | Key Models |
| :--- | :--- | :--- | :--- |
| **Accounts** | `apps.accounts` | User authentication, JWT tokens, RBAC roles | `User` (`ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT`) |
| **Clinics** | `apps.clinics` | Clinic registry, facilities matrix, staff directory | `Clinic`, `ClinicStaff`, `StaffAttendance`, `DiagnosticService` |
| **Doctors** | `apps.doctors` | Doctor profiles, multi-clinic affiliations, chamber sessions | `Doctor`, `DoctorClinicAffiliation`, `ChamberSession` |
| **Appointments**| `apps.appointments`| Booking lifecycle, counter check-in, live queue engine | `Appointment`, `LiveQueueStatus` |
| **Payments** | `apps.payments` | Walk-in counter cash payments, gateway billing | `Payment` (`OneToOneField` with `Appointment`) |
| **Prescriptions**| `apps.prescriptions`| Digital prescriptions, medicines, cryptographic verification | `Prescription`, `PrescriptionItem` |
| **Notifications**| `apps.notifications`| SMS delivery, queue proximity alerts | `Notification` |
| **Core** | `apps.core` | BaseModel timestamps, common validators, utilities | `TimeStampedModel` |

---

## 🛡️ Core Engineering Invariants

1. **Transactional Queue Safety**:
   - Queue mutations in `ChamberSessionView` utilize `select_for_update()` inside `transaction.atomic()` blocks to eliminate race conditions between Doctor and Reception actions.
2. **Zero-Disruption Emergency Priority Queue**:
   - `ChamberSession.current_serial` is strictly preserved during priority admissions (`ADMIT_EMERGENCY`) and completions (`COMPLETE_EMERGENCY`).
   - Normal physical token identities are immutable; no serial renumbering or queue corruption.
   - Held normal patients are placed in `session.held_patient` (never placed in `skipped_serials`).
   - Completed emergency appointments are permanently excluded from normal `NEXT_SERIAL` candidate progression.
3. **Payment Integrity**:
   - Reception cash payments enforce database-level `OneToOneField` constraints on `Payment.appointment` and idempotency checks to prevent duplicate records.
4. **Multi-Tenancy & RBAC Enforcement**:
   - Role-based permissions strictly reject cross-clinic staff actions, cross-doctor appointment mutations, and unauthorized patient privilege escalation.

---

## 🚀 Setup & Installation

### 1. Environment & Dependencies
```bash
# Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Migrations
```bash
python manage.py migrate
```

### 3. Seed Comprehensive Regional Data
Populate realistic clinics, doctors, diagnostic services, chamber schedules, and staff across all 8 administrative divisions of Bangladesh:
```bash
python seed_eight_divisions.py
```

### 4. Start Development Server
```bash
python manage.py runserver
```
API Root: `http://127.0.0.1:8000/api/v1/`

---

## 📖 API Discovery & Documentation

Interactive API explorers are automatically served at:
- **Swagger UI**: [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- **Redoc UI**: [http://127.0.0.1:8000/api/redoc/](http://127.0.0.1:8000/api/redoc/)
- **OpenAPI 3.0 Schema**: [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/)

---

## 🧪 Running Automated Tests

Run the full suite of unit and integration tests (38 tests covering clinic workflows, permissions, and emergency queue mathematics):
```bash
python manage.py test apps.clinics apps.appointments
```

Run specific test modules:
```bash
# Emergency Queue State-Machine & Permission Tests (19 tests)
python manage.py test apps.appointments.test_emergency_queue

# Clinic Staff & Attendance Tests (19 tests)
python manage.py test apps.clinics.tests
```

Run Django System Check:
```bash
python manage.py check
```
