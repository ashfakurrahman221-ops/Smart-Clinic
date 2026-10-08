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

User = get_user_model()


class SessionLifecycleTestCase(TestCase):
    def setUp(self):
        self.today = timezone.now().date()
        self.today_str = str(self.today)

        # Clinic A & Owner
        self.owner_a = User.objects.create_user(
            email="owner_a@clinic.internal",
            password="OwnerPass123!",
            first_name="Farhan",
            last_name="Chowdhury",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic_a = Clinic.objects.create(
            name="Alpha Care Clinic",
            slug="alpha-care-clinic",
            owner=self.owner_a,
            address="Dhanmondi 27",
            city="Dhaka",
            phone="01711000001",
            verification_status="VERIFIED",
            is_active=True,
        )

        # Clinic B & Owner
        self.owner_b = User.objects.create_user(
            email="owner_b@clinic.internal",
            password="OwnerPass123!",
            first_name="Bablu",
            last_name="Rahman",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic_b = Clinic.objects.create(
            name="Beta Care Clinic",
            slug="beta-care-clinic",
            owner=self.owner_b,
            address="Uttara Sector 3",
            city="Dhaka",
            phone="01711000002",
            verification_status="VERIFIED",
            is_active=True,
        )

        # Doctor 1 (Clinic A)
        self.doc_user1 = User.objects.create_user(
            email="doc1@clinic.internal",
            password="DocPass123!",
            first_name="Dr. Shams",
            last_name="Tabrez",
            role=UserRole.DOCTOR,
        )
        self.doctor1 = Doctor.objects.create(
            user=self.doc_user1,
            full_name="Dr. Shams Tabrez",
            qualification="MBBS, FCPS",
            experience_years=10,
        )
        self.doc_clinic1 = DoctorClinic.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            consultation_fee=1000.00,
            is_active=True,
            room_number="Chamber 101",
        )

        # Doctor 2 (Clinic B)
        self.doc_user2 = User.objects.create_user(
            email="doc2@clinic.internal",
            password="DocPass123!",
            first_name="Dr. Tanvir",
            last_name="Hasan",
            role=UserRole.DOCTOR,
        )
        self.doctor2 = Doctor.objects.create(
            user=self.doc_user2,
            full_name="Dr. Tanvir Hasan",
            qualification="MBBS, MD",
            experience_years=8,
        )
        self.doc_clinic2 = DoctorClinic.objects.create(
            doctor=self.doctor2,
            clinic=self.clinic_b,
            consultation_fee=1200.00,
            is_active=True,
            room_number="Chamber 201",
        )

        # Receptionist for Clinic A
        self.recep_user_a = User.objects.create_user(
            email="recep_a@clinic.internal",
            password="RecepPass123!",
            first_name="Nasreen",
            last_name="A",
            role=UserRole.RECEPTIONIST,
        )
        self.staff_a = ClinicStaff.objects.create(
            clinic=self.clinic_a,
            user=self.recep_user_a,
            role=StaffRole.RECEPTIONIST,
            monthly_salary=30000.00,
            is_active=True,
        )

        # Receptionist for Clinic B
        self.recep_user_b = User.objects.create_user(
            email="recep_b@clinic.internal",
            password="RecepPass123!",
            first_name="Bithi",
            last_name="B",
            role=UserRole.RECEPTIONIST,
        )
        self.staff_b = ClinicStaff.objects.create(
            clinic=self.clinic_b,
            user=self.recep_user_b,
            role=StaffRole.RECEPTIONIST,
            monthly_salary=28000.00,
            is_active=True,
        )

        # Patients
        self.patient1 = User.objects.create_user(
            email="patient1_lc@test.internal",
            password="PatientPass123!",
            first_name="Kabir",
            last_name="Hossain",
            role=UserRole.PATIENT,
        )
        self.patient2 = User.objects.create_user(
            email="patient2_lc@test.internal",
            password="PatientPass123!",
            first_name="Salma",
            last_name="Begum",
            role=UserRole.PATIENT,
        )
        self.patient3 = User.objects.create_user(
            email="patient3_lc@test.internal",
            password="PatientPass123!",
            first_name="Rafiq",
            last_name="Uddin",
            role=UserRole.PATIENT,
        )

        self.client = APIClient()

    def _create_appointment(self, doctor, clinic, patient, serial, is_emergency=False, status=AppointmentStatus.CONFIRMED):
        hour = 9 + ((serial * 15) // 60)
        minute = (serial * 15) % 60
        return Appointment.objects.create(
            clinic=clinic,
            doctor=doctor,
            patient=patient,
            appointment_date=self.today,
            appointment_time=time(hour, minute),
            serial_number=serial,
            status=status,
            amount=1000.00,
            is_emergency=is_emergency,
        )

    # 1. NEXT_SERIAL blocked when ENDED
    def test_01_next_serial_blocked_when_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=0,
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "NEXT_SERIAL",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Chamber session has ended", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 0)

    # 2. SKIP_SERIAL blocked when ENDED
    def test_02_skip_serial_blocked_when_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=1,
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "SKIP_SERIAL",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Chamber session has ended", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.skipped_serials, [])

    # 3. RECALL_SERIAL blocked when ENDED
    def test_03_recall_serial_blocked_when_ended(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=2,
            skipped_serials=[1],
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "RECALL_SERIAL",
            "current_serial": 1,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Chamber session has ended", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 2)
        self.assertEqual(session.skipped_serials, [1])

    # 4. ADMIT_EMERGENCY blocked when ENDED
    def test_04_admit_emergency_blocked_when_ended(self):
        emerg_apt = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1, is_emergency=True)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=0,
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "ADMIT_EMERGENCY",
            "appointment_id": str(emerg_apt.id),
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Chamber session has ended", res.data["detail"])
        session.refresh_from_db()
        self.assertIsNone(session.active_emergency)

    # 5. RESUME_HELD blocked when ENDED
    def test_05_resume_held_blocked_when_ended(self):
        held_apt = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=1,
            held_patient=held_apt,
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "RESUME_HELD",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Chamber session has ended", res.data["detail"])

    # 6. Unserved appointments remain CONFIRMED on ENDED (Option A)
    def test_06_unserved_appointments_remain_confirmed_on_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        apt2 = self._create_appointment(self.doctor1, self.clinic_a, self.patient2, serial=2)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.IN_CHAMBER,
            current_serial=1,
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.ENDED,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.ENDED)

        # Unserved apt2 remains CONFIRMED (NOT cancelled or no-show)
        apt2.refresh_from_db()
        self.assertEqual(apt2.status, AppointmentStatus.CONFIRMED)

    # 7. Appointment serial numbers are immutable on ENDED
    def test_07_appointment_serials_immutable_on_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=5)
        apt2 = self._create_appointment(self.doctor1, self.clinic_a, self.patient2, serial=6)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.IN_CHAMBER,
            current_serial=5,
        )
        self.client.force_authenticate(user=self.doc_user1)
        self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.ENDED,
        })
        apt1.refresh_from_db()
        apt2.refresh_from_db()
        self.assertEqual(apt1.serial_number, 5)
        self.assertEqual(apt2.serial_number, 6)

    # 8. Payments and refunds are unaltered on ENDED
    def test_08_payments_and_refunds_unaltered_on_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        apt1.is_paid = True
        apt1.save()

        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.IN_CHAMBER,
            current_serial=0,
        )
        self.client.force_authenticate(user=self.doc_user1)
        self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.ENDED,
        })
        apt1.refresh_from_db()
        self.assertTrue(apt1.is_paid)
        self.assertEqual(apt1.amount, 1000.00)

    # 9. Cannot end session with active emergency
    def test_09_cannot_end_session_with_active_emergency(self):
        emerg_apt = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1, is_emergency=True)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.IN_CHAMBER,
            active_emergency=emerg_apt,
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.ENDED,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot end chamber session while an emergency", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)

    # 10. Cannot end session with held patient
    def test_10_cannot_end_session_with_held_patient(self):
        held_apt = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.IN_CHAMBER,
            held_patient=held_apt,
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.ENDED,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot end chamber session while an emergency or held patient is active", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)

    # 11. Reopen session restores IN_CHAMBER and clears ended_at
    def test_11_reopen_session_restores_in_chamber(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=3,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.IN_CHAMBER,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)
        self.assertIsNone(session.ended_at)

    # 12. Reopen preserves current_serial and skipped_serials
    def test_12_reopen_preserves_current_serial_and_skipped(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=4,
            skipped_serials=[2, 3],
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.IN_CHAMBER,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 4)
        self.assertEqual(session.skipped_serials, [2, 3])

    # 13. Queue progression works after reopen
    def test_13_queue_progression_works_after_reopen(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        apt2 = self._create_appointment(self.doctor1, self.clinic_a, self.patient2, serial=2)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=1,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        # Reopen
        self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.IN_CHAMBER,
        })
        # Advance NEXT_SERIAL
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "NEXT_SERIAL",
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 2)

    # 14. Receptionist cross-clinic cancellation rejected (403 Forbidden)
    def test_14_receptionist_cross_clinic_cancellation_rejected(self):
        # Appointment belongs to Clinic B
        apt_b = self._create_appointment(self.doctor2, self.clinic_b, self.patient1, serial=1)

        # Authenticate as Receptionist from Clinic A
        self.client.force_authenticate(user=self.recep_user_a)
        res = self.client.post(f"/api/v1/appointments/{apt_b.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("You do not belong to the clinic", res.data["detail"])
        apt_b.refresh_from_db()
        self.assertEqual(apt_b.status, AppointmentStatus.CONFIRMED)

    # 15. Receptionist same-clinic cancellation allowed (200 OK)
    def test_15_receptionist_same_clinic_cancellation_allowed(self):
        # Appointment belongs to Clinic A
        apt_a = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)

        # Authenticate as Receptionist from Clinic A
        self.client.force_authenticate(user=self.recep_user_a)
        res = self.client.post(f"/api/v1/appointments/{apt_a.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        apt_a.refresh_from_db()
        self.assertEqual(apt_a.status, AppointmentStatus.CANCELLED)

    # 16. Patient cannot cancel other patient's appointment (403 Forbidden)
    def test_16_patient_cannot_cancel_other_patient_appointment(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        self.client.force_authenticate(user=self.patient2)
        res = self.client.post(f"/api/v1/appointments/{apt1.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("You can only cancel your own appointments", res.data["detail"])
        apt1.refresh_from_db()
        self.assertEqual(apt1.status, AppointmentStatus.CONFIRMED)

    # 17. Doctor cannot cancel other doctor's appointment (403 Forbidden)
    def test_17_doctor_cannot_cancel_other_doctor_appointment(self):
        apt_b = self._create_appointment(self.doctor2, self.clinic_b, self.patient1, serial=1)
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post(f"/api/v1/appointments/{apt_b.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("You are not assigned to this appointment", res.data["detail"])
        apt_b.refresh_from_db()
        self.assertEqual(apt_b.status, AppointmentStatus.CONFIRMED)

    # 18. Public track view returns is_session_ended = True and chamber_status = ENDED
    def test_18_public_track_view_returns_is_session_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=1,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=None)
        res = self.client.get(f"/api/v1/appointments/{apt1.id}/track/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        live_queue = res.data["live_queue"]
        self.assertEqual(live_queue["chamber_status"], ChamberSessionStatus.ENDED)
        self.assertTrue(live_queue["is_session_ended"])

    # 19. Public track view suppresses is_turn_now when ENDED
    def test_19_public_track_view_suppresses_is_turn_now_when_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=1,  # Matches patient's serial!
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=None)
        res = self.client.get(f"/api/v1/appointments/{apt1.id}/track/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        live_queue = res.data["live_queue"]
        self.assertFalse(live_queue["is_turn_now"])

    # 20. Public track view suppresses estimated_wait_mins when ENDED
    def test_20_public_track_view_suppresses_estimated_wait_when_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        apt2 = self._create_appointment(self.doctor1, self.clinic_a, self.patient2, serial=2)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=1,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=None)
        res = self.client.get(f"/api/v1/appointments/{apt2.id}/track/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        live_queue = res.data["live_queue"]
        self.assertIsNone(live_queue["estimated_wait_mins"])
        self.assertFalse(live_queue["is_turn_now"])

    # 21. PREV_SERIAL blocked when ENDED
    def test_21_prev_serial_blocked_when_ended(self):
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        apt2 = self._create_appointment(self.doctor1, self.clinic_a, self.patient2, serial=2)
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=2,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "PREV_SERIAL",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Chamber session has ended", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 2)
        apt1.refresh_from_db()
        apt2.refresh_from_db()
        self.assertEqual(apt1.status, AppointmentStatus.CONFIRMED)
        self.assertEqual(apt2.status, AppointmentStatus.CONFIRMED)

    # 22. SET_SERIAL blocked when ENDED
    def test_22_set_serial_blocked_when_ended(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=1,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "SET_SERIAL",
            "current_serial": 5,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Chamber session has ended", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 1)

    # 23. ENDED -> PAUSED rejected
    def test_23_ended_to_paused_rejected(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=2,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.PAUSED,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot transition from ENDED to PAUSED", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.ENDED)

    # 24. ENDED -> PRAYER_BREAK rejected
    def test_24_ended_to_prayer_break_rejected(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=2,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.PRAYER_BREAK,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot transition from ENDED to PRAYER_BREAK", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.ENDED)

    # 25. ENDED -> EMERGENCY rejected
    def test_25_ended_to_emergency_rejected(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=2,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.EMERGENCY,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot transition from ENDED to EMERGENCY", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.ENDED)

    # 26. ENDED -> NOT_STARTED rejected
    def test_26_ended_to_not_started_rejected(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=2,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.NOT_STARTED,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot transition from ENDED to NOT_STARTED", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.ENDED)

    # 27. RESET blocked when ENDED
    def test_27_reset_blocked_when_ended(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=2,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "RESET",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Chamber session has ended", res.data["detail"])
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 2)
        self.assertEqual(session.status, ChamberSessionStatus.ENDED)

    # 28. Reopen does not send proximity SMS
    def test_28_reopen_does_not_send_proximity_sms(self):
        from apps.notifications.models import Notification, NotificationType
        apt1 = self._create_appointment(self.doctor1, self.clinic_a, self.patient1, serial=1)
        apt2 = self._create_appointment(self.doctor1, self.clinic_a, self.patient2, serial=2)
        apt3 = self._create_appointment(self.doctor1, self.clinic_a, self.patient3, serial=3)
        patient4 = User.objects.create_user(
            email="patient4_lc@test.internal",
            password="PatientPass123!",
            first_name="Helal",
            last_name="Khan",
            role=UserRole.PATIENT,
        )
        apt4 = self._create_appointment(self.doctor1, self.clinic_a, patient4, serial=4)

        session = ChamberSession.objects.create(
            doctor=self.doctor1,
            clinic=self.clinic_a,
            session_date=self.today,
            status=ChamberSessionStatus.ENDED,
            current_serial=1,
            ended_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.doc_user1)

        initial_count = Notification.objects.filter(
            notification_type=NotificationType.SERIAL_PROXIMITY_ALERT
        ).count()

        res = self.client.post("/api/v1/doctors/chamber-session/", {
            "doctor_id": str(self.doctor1.id),
            "clinic_id": str(self.clinic_a.id),
            "session_date": self.today_str,
            "action": "UPDATE_STATUS",
            "status": ChamberSessionStatus.IN_CHAMBER,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)
        self.assertIsNone(session.ended_at)
        self.assertEqual(session.current_serial, 1)

        final_count = Notification.objects.filter(
            notification_type=NotificationType.SERIAL_PROXIMITY_ALERT
        ).count()
        self.assertEqual(final_count, initial_count)
