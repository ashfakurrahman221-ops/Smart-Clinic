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

class EmergencyQueueComprehensiveTestCase(TestCase):
    def setUp(self):
        self.today = timezone.now().date()
        self.today_str = str(self.today)

        # Clinic Admin & Clinic
        self.clinic_owner = User.objects.create_user(
            email="owner_emerg@clinic.internal",
            password="OwnerPass123!",
            first_name="Farhan",
            last_name="Chowdhury",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic = Clinic.objects.create(
            name="Emergency Care Clinic",
            slug="emergency-care-clinic",
            owner=self.clinic_owner,
            address="Dhanmondi 27",
            city="Dhaka",
            phone="01711223344",
            verification_status="VERIFIED",
            is_active=True,
        )

        # Doctor
        self.doc_user = User.objects.create_user(
            email="doc_emerg@clinic.internal",
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
            email="recep_emerg@clinic.internal",
            password="RecepPass123!",
            first_name="Nasreen",
            last_name="Sultana",
            role=UserRole.RECEPTIONIST,
        )
        self.staff = ClinicStaff.objects.create(
            clinic=self.clinic,
            name="Nasreen Sultana",
            role=StaffRole.RECEPTIONIST,
            phone="01811223344",
            is_active=True,
            user=self.reception_user,
        )

        # Patient
        self.patient = User.objects.create_user(
            email="patient_emerg@clinic.internal",
            password="PatPass123!",
            first_name="Tanvir",
            last_name="Hasan",
            phone="01511223344",
            role=UserRole.PATIENT,
        )

        # Other Clinic & Doctor for cross-clinic testing
        self.other_owner = User.objects.create_user(
            email="other_owner@clinic.internal",
            password="OtherPass123!",
            role=UserRole.CLINIC_ADMIN,
        )
        self.other_clinic = Clinic.objects.create(
            name="Other Clinic",
            slug="other-clinic",
            owner=self.other_owner,
            address="Gulshan",
            city="Dhaka",
            phone="01799887766",
            verification_status="VERIFIED",
            is_active=True,
        )

        # Clients
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.clinic_owner)

        self.doc_client = APIClient()
        self.doc_client.force_authenticate(user=self.doc_user)

        self.reception_client = APIClient()
        self.reception_client.force_authenticate(user=self.reception_user)

        self.patient_client = APIClient()
        self.patient_client.force_authenticate(user=self.patient)

    # -------------------------------------------------------------------------
    # 1. emergency walk-in gets sequential physical token
    # -------------------------------------------------------------------------
    def test_01_emergency_walk_in_gets_sequential_physical_token(self):
        # Create normal appointment with serial 1
        Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=1, status=AppointmentStatus.CONFIRMED, amount=1200
        )
        # Issue emergency walk-in
        res = self.reception_client.post(
            "/api/v1/clinics/reception/walk-in/",
            {
                "doctor_id": str(self.doctor.id),
                "patient_name": "Emergency Patient A",
                "patient_phone": "01755667788",
                "is_emergency": True,
                "emergency_reason": "Severe Breathing Difficulty",
            },
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["serial_number"], 2)
        self.assertTrue(res.data["is_emergency"])
        self.assertEqual(res.data["emergency_reason"], "Severe Breathing Difficulty")

    # -------------------------------------------------------------------------
    # 2. emergency admission does not change current_serial
    # -------------------------------------------------------------------------
    def test_02_emergency_admission_does_not_change_current_serial(self):
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=24, status=ChamberSessionStatus.IN_CHAMBER
        )
        emerg_apt = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 30),
            serial_number=25, status=AppointmentStatus.CONFIRMED, amount=1200,
            is_emergency=True, emergency_reason="Acute trauma"
        )
        res = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": self.today_str,
                "action": "ADMIT_EMERGENCY",
                "appointment_id": str(emerg_apt.id),
            },
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 24)
        self.assertEqual(session.active_emergency_id, emerg_apt.id)

    # -------------------------------------------------------------------------
    # 3. emergency completion does not change current_serial
    # -------------------------------------------------------------------------
    def test_03_emergency_completion_does_not_change_current_serial(self):
        emerg_apt = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 30),
            serial_number=25, status=AppointmentStatus.CONFIRMED, amount=1200,
            is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=24, active_emergency=emerg_apt, status=ChamberSessionStatus.IN_CHAMBER
        )
        res = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": self.today_str,
                "action": "COMPLETE_EMERGENCY",
                "appointment_id": str(emerg_apt.id),
            },
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        emerg_apt.refresh_from_db()
        self.assertEqual(session.current_serial, 24)
        self.assertIsNone(session.active_emergency)
        self.assertEqual(emerg_apt.status, AppointmentStatus.COMPLETED)

    # -------------------------------------------------------------------------
    # 4 & 5. emergency completed serial is never recalled; NEXT selects #26
    # -------------------------------------------------------------------------
    def test_04_and_05_next_selects_next_eligible_normal_appointment(self):
        # #24 normal, #25 emergency completed, #26 normal
        apt24 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=24, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        apt25 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 15),
            serial_number=25, status=AppointmentStatus.COMPLETED, amount=1200, is_emergency=True
        )
        apt26 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 30),
            serial_number=26, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=24, status=ChamberSessionStatus.IN_CHAMBER
        )
        res = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": self.today_str,
                "action": "NEXT_SERIAL",
            },
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        # MUST advance directly from 24 to 26, completely bypassing completed #25!
        self.assertEqual(session.current_serial, 26)

    # -------------------------------------------------------------------------
    # 6. no eligible normal appointment does not fall back into emergency serial
    # -------------------------------------------------------------------------
    def test_06_no_eligible_normal_appointment_does_not_fall_back_into_emergency(self):
        # #24 normal, #25 emergency completed, no #26
        apt24 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=24, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        apt25 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 15),
            serial_number=25, status=AppointmentStatus.COMPLETED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=24, status=ChamberSessionStatus.IN_CHAMBER
        )
        res = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": self.today_str,
                "action": "NEXT_SERIAL",
            },
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        # MUST remain at 24. MUST NOT advance to 25.
        self.assertEqual(session.current_serial, 24)

    # -------------------------------------------------------------------------
    # 7. multiple emergencies FIFO
    # -------------------------------------------------------------------------
    def test_07_multiple_emergencies_fifo(self):
        emerg1 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 0),
            serial_number=10, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        emerg2 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 15),
            serial_number=11, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Admit emerg1
        res1 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg1.id)},
            format="json"
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.active_emergency_id, emerg1.id)

        # Attempting to admit emerg2 while emerg1 is active is blocked
        res_blocked = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg2.id)},
            format="json"
        )
        self.assertEqual(res_blocked.status_code, status.HTTP_400_BAD_REQUEST)

        # Complete emerg1
        self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "COMPLETE_EMERGENCY"},
            format="json"
        )

        # Now admit emerg2 (FIFO)
        res2 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg2.id)},
            format="json"
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.active_emergency_id, emerg2.id)

    # -------------------------------------------------------------------------
    # 8. duplicate emergency admission safe
    # -------------------------------------------------------------------------
    def test_08_duplicate_emergency_admission_safe(self):
        emerg = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 0),
            serial_number=10, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, status=ChamberSessionStatus.IN_CHAMBER
        )
        # First admission
        res1 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg.id)},
            format="json"
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Duplicate admission call
        res2 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg.id)},
            format="json"
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.active_emergency_id, emerg.id)

    # -------------------------------------------------------------------------
    # 9. duplicate emergency completion safe
    # -------------------------------------------------------------------------
    def test_09_duplicate_emergency_completion_safe(self):
        emerg = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 0),
            serial_number=10, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, active_emergency=emerg, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Complete
        res1 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "COMPLETE_EMERGENCY", "appointment_id": str(emerg.id)},
            format="json"
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Duplicate complete call
        res2 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "COMPLETE_EMERGENCY", "appointment_id": str(emerg.id)},
            format="json"
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

    # -------------------------------------------------------------------------
    # 10, 11, 12. interrupted patient held, resumed, never enters skipped_serials
    # -------------------------------------------------------------------------
    def test_10_to_12_interrupted_patient_held_and_resumed(self):
        norm21 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 0),
            serial_number=21, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        emerg25 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 15),
            serial_number=25, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=21, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Admit #25 with hold_current=True
        res_admit = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "action": "ADMIT_EMERGENCY",
                "appointment_id": str(emerg25.id),
                "hold_current": True
            },
            format="json"
        )
        self.assertEqual(res_admit.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 21)
        self.assertEqual(session.held_patient_id, norm21.id)
        self.assertEqual(session.active_emergency_id, emerg25.id)
        self.assertEqual(session.skipped_serials, [])  # Never added to skipped_serials!

        # Complete #25
        self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "COMPLETE_EMERGENCY"},
            format="json"
        )
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 21)
        self.assertEqual(session.held_patient_id, norm21.id)

        # Resume held patient
        res_resume = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "RESUME_HELD"},
            format="json"
        )
        self.assertEqual(res_resume.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertIsNone(session.held_patient)
        self.assertEqual(session.current_serial, 21)
        self.assertEqual(session.skipped_serials, [])

    # -------------------------------------------------------------------------
    # 13. TV excludes active/completed emergency from normal next list
    # -------------------------------------------------------------------------
    def test_13_tv_excludes_emergency_from_next_list(self):
        norm21 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 0),
            serial_number=21, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        emerg22 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 15),
            serial_number=22, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        norm23 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 30),
            serial_number=23, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=21, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Fetch ChamberSession
        res = self.admin_client.get(
            f"/api/v1/doctors/chamber-session/?doctor_id={self.doctor.id}&clinic_id={self.clinic.id}&date={self.today_str}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # next_serials should only include normal appointments (#23), excluding emergency #22!
        self.assertIn(23, res.data["next_serials"])
        self.assertNotIn(22, res.data["next_serials"])

    # -------------------------------------------------------------------------
    # 14 & 15. tracker excludes completed emergency & does not falsely mark passed
    # -------------------------------------------------------------------------
    def test_14_and_15_tracker_metrics_during_emergency(self):
        norm24 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 0),
            serial_number=24, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        emerg25 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 15),
            serial_number=25, status=AppointmentStatus.COMPLETED, amount=1200, is_emergency=True
        )
        norm26 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 30),
            serial_number=26, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=24, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Tracker for #26
        res = self.client.get(f"/api/v1/appointments/{norm26.id}/track/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        live_queue = res.data["live_queue"]
        self.assertFalse(live_queue["is_passed"])
        self.assertFalse(live_queue["is_turn_now"])
        # Only #24 is currently active; #25 is completed emergency; so only 1 patient ahead!
        self.assertEqual(live_queue["patients_ahead"], 1)

    # -------------------------------------------------------------------------
    # 16 & 17. SMS proximity uses eligible normal queue & prevents duplicates
    # -------------------------------------------------------------------------
    def test_16_and_17_sms_proximity_uses_eligible_queue_and_prevents_duplicates(self):
        # Current is 10. Next normal: 11, 12, 14. Serial 13 is an emergency.
        for sn in [10, 11, 12]:
            Appointment.objects.create(
                patient=self.patient, clinic=self.clinic, doctor=self.doctor,
                appointment_date=self.today, appointment_time=time(10, sn),
                serial_number=sn, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
            )
        Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 30),
            serial_number=13, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        apt14 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 45),
            serial_number=14, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=10, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Call NEXT_SERIAL -> advances to 11.
        # Waiting normal serials ahead of 11: 12, 14 (only 2, not 3 yet).
        res1 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "session_date": self.today_str, "action": "NEXT_SERIAL"},
            format="json"
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Add serial 15 so there are 3 normal patients ahead of 11: 12, 14, 15
        apt15 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(11, 0),
            serial_number=15, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=False
        )
        # SET_SERIAL to 11 again to trigger proximity alert
        res_set = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "session_date": self.today_str, "action": "SET_SERIAL", "current_serial": 11},
            format="json"
        )
        self.assertEqual(res_set.status_code, status.HTTP_200_OK)
        # Notification created for #15 (the 3rd eligible normal patient, skipping #13 emergency)
        notif_count_before = Notification.objects.filter(
            recipient=self.patient,
            notification_type=NotificationType.SERIAL_PROXIMITY_ALERT,
            message__contains="#15"
        ).count()
        self.assertEqual(notif_count_before, 1)

        # Trigger SET_SERIAL again: duplicate check prevents second notification!
        self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "session_date": self.today_str, "action": "SET_SERIAL", "current_serial": 11},
            format="json"
        )
        notif_count_after = Notification.objects.filter(
            recipient=self.patient,
            notification_type=NotificationType.SERIAL_PROXIMITY_ALERT,
            message__contains="#15"
        ).count()
        self.assertEqual(notif_count_after, 1)

    # -------------------------------------------------------------------------
    # 18. cross-clinic emergency admission blocked
    # -------------------------------------------------------------------------
    def test_18_cross_clinic_emergency_admission_blocked(self):
        other_doctor = Doctor.objects.create(
            full_name="Dr. External", qualification="MBBS", experience_years=5
        )
        DoctorClinic.objects.create(
            doctor=other_doctor, clinic=self.other_clinic, consultation_fee=500, is_active=True
        )
        foreign_emerg = Appointment.objects.create(
            patient=self.patient, clinic=self.other_clinic, doctor=other_doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=1, status=AppointmentStatus.CONFIRMED, amount=500, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Admin of self.clinic attempts to admit foreign emergency
        res = self.admin_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "action": "ADMIT_EMERGENCY",
                "appointment_id": str(foreign_emerg.id)
            },
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # 19. unauthorized patient blocked
    # -------------------------------------------------------------------------
    def test_19_unauthorized_patient_blocked(self):
        apt = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=1, status=AppointmentStatus.CONFIRMED, amount=1200
        )
        # Patient attempts to flag emergency
        res_flag = self.patient_client.post(
            f"/api/v1/appointments/{apt.id}/emergency/",
            {"is_emergency": True},
            format="json"
        )
        self.assertEqual(res_flag.status_code, status.HTTP_403_FORBIDDEN)

        # Patient attempts to control chamber
        res_chamber = self.patient_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "NEXT_SERIAL"},
            format="json"
        )
        self.assertEqual(res_chamber.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------------------
    # 20 & 21. RESET blocked with active emergency or held patient
    # -------------------------------------------------------------------------
    def test_20_and_21_reset_blocked_with_active_or_held(self):
        emerg = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=1, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, active_emergency=emerg, status=ChamberSessionStatus.IN_CHAMBER
        )
        res_reset1 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "RESET"},
            format="json"
        )
        self.assertEqual(res_reset1.status_code, status.HTTP_400_BAD_REQUEST)

        # Clear emergency, set held
        session.active_emergency = None
        session.held_patient = emerg
        session.save()

        res_reset2 = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "RESET"},
            format="json"
        )
        self.assertEqual(res_reset2.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # 22 & 23. PRAYER_BREAK and PAUSED transitions
    # -------------------------------------------------------------------------
    def test_22_and_23_prayer_and_paused_transitions(self):
        emerg = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=1, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, status=ChamberSessionStatus.PRAYER_BREAK
        )
        # Emergency admission transitions session to IN_CHAMBER
        res = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg.id)},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)

        # Attempting to switch to PAUSED while emergency is active is blocked
        res_pause = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "UPDATE_STATUS", "status": "PAUSED"},
            format="json"
        )
        self.assertEqual(res_pause.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # 24, 25, 26. Browser, TV, Tracker state persistence across refreshes
    # -------------------------------------------------------------------------
    def test_24_to_26_state_persistence_across_refreshes(self):
        emerg = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=10, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, active_emergency=emerg, status=ChamberSessionStatus.IN_CHAMBER
        )
        # 1. Chamber session view GET
        sess_res = self.doc_client.get(
            f"/api/v1/doctors/chamber-session/?doctor_id={self.doctor.id}&clinic_id={self.clinic.id}&date={self.today_str}"
        )
        self.assertEqual(sess_res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(sess_res.data["active_emergency_details"])
        self.assertEqual(sess_res.data["active_emergency_details"]["serial_number"], 10)

        # 2. Public TV display GET
        tv_res = self.client.get(
            f"/api/v1/appointments/queue/public/?doctor_id={self.doctor.id}&clinic_id={self.clinic.id}&date={self.today_str}"
        )
        self.assertEqual(tv_res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["is_emergency"] for item in tv_res.data))

        # 3. Patient tracker GET
        track_res = self.client.get(f"/api/v1/appointments/{emerg.id}/track/")
        self.assertEqual(track_res.status_code, status.HTTP_200_OK)
        self.assertTrue(track_res.data["live_queue"]["is_turn_now"])
        self.assertTrue(track_res.data["live_queue"]["is_active_emergency"])

    # -------------------------------------------------------------------------
    # 27, 28, 29. Cancellation edge cases
    # -------------------------------------------------------------------------
    def test_27_to_29_cancellation_rules(self):
        emerg = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=10, status=AppointmentStatus.CANCELLED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Cannot admit cancelled appointment as emergency
        res = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg.id)},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # 30. Concurrent / double admission transaction safety
    # -------------------------------------------------------------------------
    def test_30_concurrent_double_admission_transaction_safety(self):
        emerg = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=self.today, appointment_time=time(10, 0),
            serial_number=10, status=AppointmentStatus.CONFIRMED, amount=1200, is_emergency=True
        )
        session = ChamberSession.objects.create(
            doctor=self.doctor, clinic=self.clinic, session_date=self.today,
            current_serial=5, status=ChamberSessionStatus.IN_CHAMBER
        )
        # Repeated calls succeed idempotently without crashing or altering state
        res_a = self.doc_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg.id)},
            format="json"
        )
        res_b = self.admin_client.post(
            "/api/v1/doctors/chamber-session/",
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id), "action": "ADMIT_EMERGENCY", "appointment_id": str(emerg.id)},
            format="json"
        )
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.active_emergency_id, emerg.id)
        self.assertEqual(session.current_serial, 5)
