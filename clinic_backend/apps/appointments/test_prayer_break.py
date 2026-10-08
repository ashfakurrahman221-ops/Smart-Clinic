from datetime import date, time
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.clinics.models import Clinic, ClinicStaff, StaffRole
from apps.doctors.models import Doctor, DoctorClinic, ChamberSession, ChamberSessionStatus
from apps.appointments.models import Appointment, AppointmentStatus
from apps.notifications.models import Notification, NotificationType

User = get_user_model()

class PrayerBreakIntegrationTestCase(TestCase):
    def setUp(self):
        self.today = timezone.now().date()
        self.today_str = str(self.today)

        # Clinic Admin & Clinic
        self.clinic_owner = User.objects.create_user(
            email="owner_prayer@clinic.internal",
            password="OwnerPass123!",
            first_name="Farhan",
            last_name="Chowdhury",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic = Clinic.objects.create(
            name="Prayer Care Clinic",
            slug="prayer-care-clinic",
            owner=self.clinic_owner,
            address="Dhanmondi 27",
            city="Dhaka",
            phone="01711223344",
            verification_status="VERIFIED",
            is_active=True,
        )

        # Doctor
        self.doc_user = User.objects.create_user(
            email="doc_prayer@clinic.internal",
            password="DocPass123!",
            first_name="Dr. Shams",
            last_name="Tabrez",
            role=UserRole.DOCTOR,
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Shams Tabrez",
            qualification="MBBS, FCPS (Cardiology)",
            experience_years=12,
        )
        self.doc_clinic = DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=1200.00,
            is_active=True,
            room_number="Chamber 202",
        )

        # Receptionist
        self.reception_user = User.objects.create_user(
            email="recep_prayer@clinic.internal",
            password="RecepPass123!",
            first_name="Nasreen",
            last_name="Sultana",
            role=UserRole.RECEPTIONIST,
        )
        self.staff = ClinicStaff.objects.create(
            clinic=self.clinic,
            user=self.reception_user,
            role=StaffRole.RECEPTIONIST,
            monthly_salary=28000.00,
            is_active=True,
        )

        # Normal Patients
        self.patient1 = User.objects.create_user(
            email="patient1_prayer@test.internal",
            password="PatientPass123!",
            first_name="Rahim",
            last_name="Uddin",
            role=UserRole.PATIENT,
            phone="01700000001",
        )
        self.patient2 = User.objects.create_user(
            email="patient2_prayer@test.internal",
            password="PatientPass123!",
            first_name="Karim",
            last_name="Hasan",
            role=UserRole.PATIENT,
            phone="01700000002",
        )
        self.patient3 = User.objects.create_user(
            email="patient3_prayer@test.internal",
            password="PatientPass123!",
            first_name="Jamal",
            last_name="Bhuiyan",
            role=UserRole.PATIENT,
            phone="01700000003",
        )

        # Emergency Patient
        self.patient_em = User.objects.create_user(
            email="emergency_prayer@test.internal",
            password="PatientPass123!",
            first_name="Tarek",
            last_name="Monowar",
            role=UserRole.PATIENT,
            phone="01700000099",
        )

        # Appointments
        self.apt1 = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.CONFIRMED,
            amount=1200.00,
            is_arrived=True,
        )
        self.apt2 = Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 15),
            serial_number=2,
            status=AppointmentStatus.CONFIRMED,
            amount=1200.00,
            is_arrived=True,
        )
        self.apt3 = Appointment.objects.create(
            patient=self.patient3,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 30),
            serial_number=3,
            status=AppointmentStatus.CONFIRMED,
            amount=1200.00,
            is_arrived=True,
        )

        self.apt_emergency = Appointment.objects.create(
            patient=self.patient_em,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 45),
            serial_number=99,
            status=AppointmentStatus.CONFIRMED,
            amount=1200.00,
            is_emergency=True,
            emergency_reason="Severe acute chest pain",
            is_arrived=True,
        )

        self.client = APIClient()

    # 1. test_enter_prayer_break_blocked_if_active_emergency
    def test_enter_prayer_break_blocked_if_active_emergency(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.IN_CHAMBER,
            current_serial=1,
            active_emergency=self.apt_emergency
        )
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "UPDATE_STATUS",
            "status": "PRAYER_BREAK"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("emergency", res.data.get("detail", "").lower())
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)

    # 2. test_enter_prayer_break_success_with_normal_queue
    def test_enter_prayer_break_success_with_normal_queue(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.IN_CHAMBER,
            current_serial=1
        )
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "UPDATE_STATUS",
            "status": "PRAYER_BREAK"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.PRAYER_BREAK)
        self.assertEqual(session.current_serial, 1)  # current_serial preserved

    # 3. test_next_serial_blocked_during_prayer_break
    def test_next_serial_blocked_during_prayer_break(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.PRAYER_BREAK,
            current_serial=1
        )
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "NEXT_SERIAL"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prayer break", res.data.get("detail", "").lower())
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 1)  # Not advanced
        self.assertEqual(session.status, ChamberSessionStatus.PRAYER_BREAK)  # Not converted

    # 4. test_skip_serial_blocked_during_prayer_break
    def test_skip_serial_blocked_during_prayer_break(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.PRAYER_BREAK,
            current_serial=1
        )
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "SKIP_SERIAL"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prayer break", res.data.get("detail", "").lower())
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 1)
        self.assertEqual(session.skipped_serials, [])

    # 5. test_resume_to_in_chamber_from_prayer_break
    def test_resume_to_in_chamber_from_prayer_break(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.PRAYER_BREAK,
            current_serial=1
        )
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "UPDATE_STATUS",
            "status": "IN_CHAMBER"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)
        self.assertEqual(session.current_serial, 1)

    # 6. test_next_serial_succeeds_after_resuming
    def test_next_serial_succeeds_after_resuming(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.PRAYER_BREAK,
            current_serial=1
        )
        self.client.force_authenticate(user=self.doc_user)
        # Resume to IN_CHAMBER
        self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "UPDATE_STATUS",
            "status": "IN_CHAMBER"
        })
        # Advance NEXT_SERIAL
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "NEXT_SERIAL"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 2)
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)

    # 7. test_patient_tracker_suppresses_turn_now_during_prayer_break
    def test_patient_tracker_suppresses_turn_now_during_prayer_break(self):
        # Patient 1 has serial 1, and current_serial is 1
        ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.PRAYER_BREAK,
            current_serial=1
        )
        res = self.client.get(f"/api/v1/appointments/{self.apt1.id}/track/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        live_queue = res.data["live_queue"]
        self.assertFalse(live_queue["is_turn_now"])  # Suppressed!
        self.assertFalse(live_queue["is_passed"])
        self.assertIsNone(live_queue["estimated_wait_mins"])  # Avoid misleading numeric ETA

    # 8. test_patient_tracker_returns_prayer_break_chamber_status
    def test_patient_tracker_returns_prayer_break_chamber_status(self):
        ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.PRAYER_BREAK,
            current_serial=1
        )
        # Check patient 2 who has serial 2 (waiting)
        res = self.client.get(f"/api/v1/appointments/{self.apt2.id}/track/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        live_queue = res.data["live_queue"]
        self.assertEqual(live_queue["chamber_status"], ChamberSessionStatus.PRAYER_BREAK)
        self.assertTrue(live_queue.get("is_prayer_break"))
        self.assertFalse(live_queue["is_turn_now"])
        self.assertFalse(live_queue["is_passed"])
        self.assertIsNone(live_queue["estimated_wait_mins"])
        # patients_ahead remains mathematically correct: active normal patient 1 (1) + waiting emergency (1) = 2 ahead
        self.assertEqual(live_queue["patients_ahead"], 2)

    # 9. test_admit_emergency_during_prayer_break_allowed
    def test_admit_emergency_during_prayer_break_allowed(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.PRAYER_BREAK,
            current_serial=1
        )
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "ADMIT_EMERGENCY",
            "appointment_id": str(self.apt_emergency.id),
            "hold_current": True
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.active_emergency_id, self.apt_emergency.id)
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)  # Admitting emergency transitions to IN_CHAMBER
        self.assertEqual(session.current_serial, 1)  # Serial pointer never changes for emergency

    # 10. test_no_proximity_sms_fired_during_prayer_break
    def test_no_proximity_sms_fired_during_prayer_break(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.IN_CHAMBER,
            current_serial=0
        )
        initial_notifs_count = Notification.objects.filter(
            notification_type=NotificationType.SERIAL_PROXIMITY_ALERT
        ).count()

        # Entering Prayer Break does NOT fire SMS
        self.client.force_authenticate(user=self.doc_user)
        self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "UPDATE_STATUS",
            "status": "PRAYER_BREAK"
        })
        self.assertEqual(
            Notification.objects.filter(notification_type=NotificationType.SERIAL_PROXIMITY_ALERT).count(),
            initial_notifs_count
        )

        # Attempting NEXT_SERIAL during Prayer Break is blocked and does NOT fire SMS
        self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "action": "NEXT_SERIAL"
        })
        self.assertEqual(
            Notification.objects.filter(notification_type=NotificationType.SERIAL_PROXIMITY_ALERT).count(),
            initial_notifs_count
        )
