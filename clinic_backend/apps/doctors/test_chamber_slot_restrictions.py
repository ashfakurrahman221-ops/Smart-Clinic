import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.clinics.models import Clinic, ClinicStaff, StaffRole
from apps.doctors.models import Doctor, DoctorClinic, DoctorSchedule, ChamberSession, ChamberSessionStatus
from apps.appointments.models import Appointment, AppointmentStatus

User = get_user_model()


class ChamberSlotRestrictionsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.bd_tz = ZoneInfo("Asia/Dhaka")

        # Create Clinic & Clinic Admin
        self.admin_user = User.objects.create_user(
            email="clinic_admin@test.internal",
            password="Password123!",
            first_name="Admin",
            last_name="Owner",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic = Clinic.objects.create(
            name="Apex Test Hospital",
            slug="apex-test-hospital",
            owner=self.admin_user,
            address="Dhanmondi, Dhaka",
            city="Dhaka",
            phone="01711223344",
            verification_status="VERIFIED",
            is_active=True,
        )

        # Create Doctor
        self.doc_user = User.objects.create_user(
            email="doctor@test.internal",
            password="DocPassword123!",
            first_name="Dr. Test",
            last_name="Doctor",
            role=UserRole.DOCTOR,
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Test Doctor",
            qualification="MBBS, FCPS",
            experience_years=8,
        )
        self.doc_clinic = DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=800.00,
            is_active=True,
            room_number="Room 101",
        )

        # Create Receptionist
        self.rec_user = User.objects.create_user(
            email="reception@test.internal",
            password="RecPassword123!",
            first_name="Reception",
            last_name="Staff",
            role=UserRole.RECEPTIONIST,
        )
        self.staff_profile = ClinicStaff.objects.create(
            user=self.rec_user,
            clinic=self.clinic,
            role=StaffRole.RECEPTIONIST,
            is_active=True,
        )

        # Create Patient & Appointments for today
        self.patient_user = User.objects.create_user(
            email="patient@test.internal",
            password="PatientPassword123!",
            first_name="Kuddus",
            last_name="Ali",
            role=UserRole.PATIENT,
        )

    def test_restricted_before_chamber_slot_starts(self):
        """Doctor and Receptionist cannot call patient if current time is before chamber start time."""
        # Simulated fixed time: 2026-11-04 08:30:00 BD time (Wednesday)
        simulated_now = datetime.datetime(2026, 11, 4, 8, 30, 0, tzinfo=self.bd_tz)
        today = simulated_now.date()
        today_weekday = today.weekday()

        # Doctor has schedule 10:00 AM - 02:00 PM today
        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=today_weekday,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(14, 0),
            slot_duration_minutes=15,
            max_patients=20,
            is_active=True,
        )

        # Create waiting appointment
        Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=today,
            appointment_time=datetime.time(10, 0),
            serial_number=1,
            amount=800.00,
            status=AppointmentStatus.CONFIRMED,
        )

        with patch("django.utils.timezone.now", return_value=simulated_now.astimezone(datetime.timezone.utc)):
            # 1. Doctor attempts NEXT_SERIAL before 10:00 AM
            self.client.force_authenticate(user=self.doc_user)
            res_doc = self.client.post("/api/v1/doctors/chamber-session/", {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": str(today),
                "action": "NEXT_SERIAL",
            })
            self.assertEqual(res_doc.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("not started yet", res_doc.data["detail"].lower())
            self.assertIn("10:00 am", res_doc.data["detail"].lower())

            # 2. Receptionist attempts NEXT_SERIAL before 10:00 AM
            self.client.force_authenticate(user=self.rec_user)
            res_rec = self.client.post("/api/v1/doctors/chamber-session/", {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": str(today),
                "action": "NEXT_SERIAL",
            })
            self.assertEqual(res_rec.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("not started yet", res_rec.data["detail"].lower())

            # 3. GET chamber-session reflects slot is not started
            res_get = self.client.get(f"/api/v1/doctors/chamber-session/?doctor_id={self.doctor.id}&clinic_id={self.clinic.id}&date={today}")
            self.assertEqual(res_get.status_code, status.HTTP_200_OK)
            self.assertFalse(res_get.data["is_slot_started"])
            self.assertFalse(res_get.data["can_call_patient"])
            self.assertEqual(res_get.data["schedule_start_time"], "10:00 AM")
            self.assertIn("10:00 AM", res_get.data["slot_lock_reason"])

    def test_allowed_during_chamber_hours(self):
        """Doctor can call patient once chamber start time has arrived."""
        # Simulated time: 2026-11-04 10:15:00 BD time (during 10:00 AM - 02:00 PM slot)
        simulated_now = datetime.datetime(2026, 11, 4, 10, 15, 0, tzinfo=self.bd_tz)
        today = simulated_now.date()
        today_weekday = today.weekday()

        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=today_weekday,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(14, 0),
            slot_duration_minutes=15,
            max_patients=20,
            is_active=True,
        )

        Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=today,
            appointment_time=datetime.time(10, 0),
            serial_number=1,
            amount=800.00,
            status=AppointmentStatus.CONFIRMED,
        )

        with patch("django.utils.timezone.now", return_value=simulated_now.astimezone(datetime.timezone.utc)):
            self.client.force_authenticate(user=self.doc_user)
            res = self.client.post("/api/v1/doctors/chamber-session/", {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": str(today),
                "action": "NEXT_SERIAL",
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["current_serial"], 1)
            self.assertTrue(res.data["is_slot_started"])
            self.assertTrue(res.data["can_call_patient"])

    def test_allowed_after_slot_ends_due_to_delays(self):
        """Calling patients is NOT restricted after slot end time because sessions can be delayed."""
        # Simulated time: 2026-11-04 15:30:00 BD time (after 02:00 PM end time)
        simulated_now = datetime.datetime(2026, 11, 4, 15, 30, 0, tzinfo=self.bd_tz)
        today = simulated_now.date()
        today_weekday = today.weekday()

        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=today_weekday,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(14, 0),
            slot_duration_minutes=15,
            max_patients=20,
            is_active=True,
        )

        Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=today,
            appointment_time=datetime.time(10, 0),
            serial_number=1,
            amount=800.00,
            status=AppointmentStatus.CONFIRMED,
        )

        with patch("django.utils.timezone.now", return_value=simulated_now.astimezone(datetime.timezone.utc)):
            self.client.force_authenticate(user=self.rec_user)
            res = self.client.post("/api/v1/doctors/chamber-session/", {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": str(today),
                "action": "NEXT_SERIAL",
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["current_serial"], 1)
            self.assertTrue(res.data["is_slot_started"])

    def test_restricted_when_no_schedule_on_current_day(self):
        """If doctor has schedules on other days but none today, calling patient is restricted."""
        simulated_now = datetime.datetime(2026, 11, 4, 11, 0, 0, tzinfo=self.bd_tz)
        today = simulated_now.date()
        today_weekday = today.weekday()
        other_day = (today_weekday + 1) % 7

        # Doctor is only scheduled on another day
        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=other_day,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(14, 0),
            slot_duration_minutes=15,
            max_patients=20,
            is_active=True,
        )

        with patch("django.utils.timezone.now", return_value=simulated_now.astimezone(datetime.timezone.utc)):
            self.client.force_authenticate(user=self.doc_user)
            res = self.client.post("/api/v1/doctors/chamber-session/", {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": str(today),
                "action": "NEXT_SERIAL",
            })
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("no scheduled chamber", res.data["detail"].lower())

    def test_skip_serial_disabled_when_no_patients_left(self):
        """When no patients are left in queue, SKIP_SERIAL is rejected."""
        simulated_now = datetime.datetime(2026, 11, 4, 11, 0, 0, tzinfo=self.bd_tz)
        today = simulated_now.date()
        today_weekday = today.weekday()

        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=today_weekday,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(14, 0),
            slot_duration_minutes=15,
            max_patients=20,
            is_active=True,
        )

        with patch("django.utils.timezone.now", return_value=simulated_now.astimezone(datetime.timezone.utc)):
            self.client.force_authenticate(user=self.doc_user)
            # No appointments exist in queue
            res = self.client.post("/api/v1/doctors/chamber-session/", {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": str(today),
                "action": "SKIP_SERIAL",
            })
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("no waiting patients left", res.data["detail"].lower())
