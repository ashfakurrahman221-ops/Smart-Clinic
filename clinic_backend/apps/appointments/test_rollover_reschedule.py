from datetime import date, time, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.clinics.models import Clinic, ClinicStaff, StaffRole
from apps.doctors.models import Doctor, DoctorClinic, DoctorSchedule, DoctorLeave, DayOfWeek, ChamberSession, ChamberSessionStatus
from apps.appointments.models import Appointment, AppointmentStatus
from apps.appointments.services import rollover_unserved_appointments, reschedule_appointment

User = get_user_model()


class RolloverAndRescheduleTestCase(TestCase):
    def setUp(self):
        self.today = timezone.localdate() if timezone.is_aware(timezone.now()) else date.today()

        # Clinic Admin & Clinic
        self.admin = User.objects.create_user(
            email="admin@alpha.test",
            password="AdminPass123!",
            first_name="Admin",
            last_name="Alpha",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic = Clinic.objects.create(
            name="Alpha Apex Clinic",
            slug="alpha-apex-clinic",
            owner=self.admin,
            address="Dhanmondi, Dhaka",
            phone="01711223344",
            verification_status="VERIFIED",
            is_active=True,
        )

        # Receptionist
        self.reception_user = User.objects.create_user(
            email="reception@alpha.test",
            password="RecepPass123!",
            first_name="Farhana",
            last_name="Akter",
            role=UserRole.RECEPTIONIST,
        )
        self.staff_profile = ClinicStaff.objects.create(
            user=self.reception_user,
            clinic=self.clinic,
            role=StaffRole.RECEPTIONIST,
            is_active=True,
        )

        # Doctor User & Doctor
        self.doc_user = User.objects.create_user(
            email="doctor@alpha.test",
            password="DocPass123!",
            first_name="Rashid",
            last_name="Khan",
            role=UserRole.DOCTOR,
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Rashid Khan",
            verification_status="VERIFIED",
        )
        DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=1000.0,
            is_active=True,
        )

        # Configure weekly schedule: Doctor sits on Tuesday (dow=1) and Thursday (dow=3)
        # 10:00 AM - 02:00 PM, 15-min slots
        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=DayOfWeek.TUESDAY,
            start_time=time(10, 0),
            end_time=time(14, 0),
            slot_duration_minutes=15,
            max_patients=20,
            is_active=True,
        )
        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=DayOfWeek.THURSDAY,
            start_time=time(14, 0),
            end_time=time(18, 0),
            slot_duration_minutes=15,
            max_patients=20,
            is_active=True,
        )

        # Patients
        self.patient_1 = User.objects.create_user(
            email="p1@test.com", password="Pass123!", first_name="Rahim", last_name="Uddin", role=UserRole.PATIENT, phone="+8801700000001"
        )
        self.patient_2 = User.objects.create_user(
            email="p2@test.com", password="Pass123!", first_name="Karim", last_name="Ali", role=UserRole.PATIENT, phone="+8801700000002"
        )
        self.patient_3 = User.objects.create_user(
            email="p3@test.com", password="Pass123!", first_name="Salma", last_name="Khatun", role=UserRole.PATIENT, phone="+8801700000003"
        )

        # API Client
        self.client = APIClient()

    def test_rollover_service_auto_detects_next_chamber_day_and_preserves_payment(self):
        # Create unserved appointments for today
        apt1 = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.CONFIRMED,
            amount=1000.00,
        )
        apt2 = Appointment.objects.create(
            patient=self.patient_2,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 15),
            serial_number=2,
            status=AppointmentStatus.CONFIRMED,
            amount=1000.00,
        )

        # Chamber session ended at serial 0
        ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=0,
        )

        # Execute Rollover
        rescheduled = rollover_unserved_appointments(
            doctor_id=str(self.doctor.id),
            clinic_id=str(self.clinic.id),
            session_date=self.today,
            requested_by_user=self.admin,
        )

        self.assertEqual(len(rescheduled), 2)
        apt1.refresh_from_db()
        apt2.refresh_from_db()

        # Both appointments must be moved to an upcoming date in the schedule
        self.assertGreater(apt1.appointment_date, self.today)
        self.assertEqual(apt1.appointment_date, apt2.appointment_date)
        # Must be either Tuesday or Thursday
        self.assertIn(apt1.appointment_date.weekday(), [DayOfWeek.TUESDAY, DayOfWeek.THURSDAY])

        # Serial numbers must be monotonic starting at 1
        self.assertEqual(apt1.serial_number, 1)
        self.assertEqual(apt2.serial_number, 2)

        # Payment amount must be preserved
        self.assertEqual(apt1.amount, 1000.00)
        self.assertEqual(apt2.amount, 1000.00)

    def test_individual_reschedule_service_updates_slot_and_monotonic_serial(self):
        future_date = self.today + timedelta(days=2)
        apt = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.CONFIRMED,
            amount=1000.00,
        )

        rescheduled = reschedule_appointment(
            appointment=apt,
            new_date=future_date,
            new_time=time(11, 30),
            requested_by_user=self.reception_user,
            reason="Patient requested rescheduling",
        )

        self.assertEqual(rescheduled.appointment_date, future_date)
        self.assertEqual(rescheduled.appointment_time, time(11, 30))
        self.assertEqual(rescheduled.serial_number, 1)
        self.assertEqual(rescheduled.amount, 1000.00)

    def test_rollover_api_view_success_for_receptionist(self):
        Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.CONFIRMED,
            amount=1000.00,
        )

        self.client.force_authenticate(user=self.reception_user)
        response = self.client.post("/api/v1/appointments/rollover/", {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "session_date": str(self.today),
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["count"], 1)

    def test_reschedule_api_view_success_for_patient(self):
        apt = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.CONFIRMED,
            amount=1000.00,
        )

        future_date = self.today + timedelta(days=3)
        self.client.force_authenticate(user=self.patient_1)
        response = self.client.post(f"/api/v1/appointments/{apt.id}/reschedule/", {
            "new_date": str(future_date),
            "new_time": "15:30",
            "reason": "Family emergency",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        apt.refresh_from_db()
        self.assertEqual(apt.appointment_date, future_date)
        self.assertEqual(apt.appointment_time, time(15, 30))

    def test_reschedule_api_view_forbidden_for_other_patient(self):
        apt = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.CONFIRMED,
            amount=1000.00,
        )

        future_date = self.today + timedelta(days=3)
        # Authenticate as patient_2 (not the owner of appointment)
        self.client.force_authenticate(user=self.patient_2)
        response = self.client.post(f"/api/v1/appointments/{apt.id}/reschedule/", {
            "new_date": str(future_date),
            "new_time": "15:30",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reschedule_to_past_date_rejected(self):
        apt = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.CONFIRMED,
            amount=1000.00,
        )

        past_date = self.today - timedelta(days=1)
        self.client.force_authenticate(user=self.patient_1)
        response = self.client.post(f"/api/v1/appointments/{apt.id}/reschedule/", {
            "new_date": str(past_date),
            "new_time": "10:00",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_date", response.data)

    def test_rollover_skips_leave_dates(self):
        from apps.appointments.services import find_next_chamber_date
        # Check normal next chamber date
        normal_next = find_next_chamber_date(str(self.doctor.id), str(self.clinic.id), self.today)
        self.assertIsNotNone(normal_next)
        target_date, _, _ = normal_next

        # Create approved leave for doctor on target_date
        DoctorLeave.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            start_date=target_date,
            end_date=target_date,
            reason="Medical conference",
            is_approved=True,
        )

        # find_next_chamber_date should now skip target_date and pick the one after it
        next_after_leave = find_next_chamber_date(str(self.doctor.id), str(self.clinic.id), self.today)
        self.assertIsNotNone(next_after_leave)
        new_target_date, _, _ = next_after_leave
        self.assertGreater(new_target_date, target_date)

