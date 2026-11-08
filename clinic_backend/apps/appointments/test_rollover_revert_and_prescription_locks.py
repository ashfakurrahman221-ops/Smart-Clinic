from datetime import date, time, timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from apps.clinics.models import Clinic
from apps.doctors.models import Doctor, DoctorClinic, DoctorSchedule, ChamberSession, ChamberSessionStatus
from apps.appointments.models import Appointment, AppointmentStatus
from apps.prescriptions.models import Prescription

User = get_user_model()


class ChamberPrescriptionAndRolloverRevertTests(APITestCase):
    def setUp(self):
        # Create users
        self.doc_user = User.objects.create_user(
            email="dr.rahman@test.com",
            phone="+8801711000001",
            password="testpassword123",
            role="DOCTOR",
            first_name="Rahman",
            last_name="Doctor"
        )
        self.patient_user1 = User.objects.create_user(
            email="p1@test.com",
            phone="+8801711000002",
            password="testpassword123",
            role="PATIENT",
            first_name="Patient",
            last_name="One"
        )
        self.patient_user2 = User.objects.create_user(
            email="p2@test.com",
            phone="+8801711000003",
            password="testpassword123",
            role="PATIENT",
            first_name="Patient",
            last_name="Two"
        )
        self.patient_user3 = User.objects.create_user(
            email="p3@test.com",
            phone="+8801711000004",
            password="testpassword123",
            role="PATIENT",
            first_name="Patient",
            last_name="Three"
        )
        self.clinic_owner = User.objects.create_user(
            email="owner@test.com",
            phone="+8801711000005",
            password="testpassword123",
            role="CLINIC_ADMIN"
        )

        self.clinic = Clinic.objects.create(
            name="Apex Specialty Clinic",
            address="Mirpur 10, Dhaka",
            owner=self.clinic_owner,
            phone="+8801711000009"
        )

        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Rahman Doctor",
            email="dr.rahman@test.com"
        )

        DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=Decimal('800.00'),
            is_active=True
        )

        # Schedules for all 7 days: 00:00 to 23:59 so slot-start restriction passes
        for d in range(7):
            DoctorSchedule.objects.create(
                doctor=self.doctor,
                clinic=self.clinic,
                day_of_week=d,
                start_time=time(0, 0),
                end_time=time(23, 59),
                slot_duration_minutes=15,
                max_patients=50,
                is_active=True
            )

        self.today = timezone.localdate()
        self.client.force_authenticate(user=self.doc_user)

    def test_cannot_advance_or_complete_without_prescription(self):
        """Doctor cannot call NEXT_SERIAL or COMPLETE_CURRENT if current patient is not prescribed."""
        apt1 = Appointment.objects.create(
            patient=self.patient_user1,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.CONFIRMED,
            amount=Decimal('800.00')
        )
        apt2 = Appointment.objects.create(
            patient=self.patient_user2,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 15),
            serial_number=2,
            status=AppointmentStatus.CONFIRMED,
            amount=Decimal('800.00')
        )

        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            current_serial=1,
            status=ChamberSessionStatus.IN_CHAMBER
        )

        # 1. Attempt NEXT_SERIAL without prescription -> Should fail (400)
        res = self.client.post('/api/v1/doctors/chamber-session/', {
            'doctor_id': str(self.doctor.id),
            'clinic_id': str(self.clinic.id),
            'session_date': str(self.today),
            'action': 'NEXT_SERIAL'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('prescription', res.data['detail'].lower())

        # 2. Attempt COMPLETE_CURRENT without prescription -> Should fail (400)
        res = self.client.post('/api/v1/doctors/chamber-session/', {
            'doctor_id': str(self.doctor.id),
            'clinic_id': str(self.clinic.id),
            'session_date': str(self.today),
            'action': 'COMPLETE_CURRENT'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('prescription', res.data['detail'].lower())

        # 3. Create digital prescription for apt1
        Prescription.objects.create(
            appointment=apt1,
            doctor=self.doctor,
            patient=self.patient_user1,
            diagnosis="Acute Bronchitis"
        )

        # 4. Now NEXT_SERIAL should succeed!
        res = self.client.post('/api/v1/doctors/chamber-session/', {
            'doctor_id': str(self.doctor.id),
            'clinic_id': str(self.clinic.id),
            'session_date': str(self.today),
            'action': 'NEXT_SERIAL'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.current_serial, 2)
        apt1.refresh_from_db()
        self.assertEqual(apt1.status, AppointmentStatus.COMPLETED)

        # 5. For apt2 (last patient): COMPLETE_CURRENT without prescription should fail
        res = self.client.post('/api/v1/doctors/chamber-session/', {
            'doctor_id': str(self.doctor.id),
            'clinic_id': str(self.clinic.id),
            'session_date': str(self.today),
            'action': 'COMPLETE_CURRENT'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Prescribe apt2
        Prescription.objects.create(
            appointment=apt2,
            doctor=self.doctor,
            patient=self.patient_user2,
            diagnosis="Healthy checkup"
        )
        apt2.status = AppointmentStatus.COMPLETED
        apt2.save(update_fields=['status'])

        # Now complete current succeeds
        res = self.client.post('/api/v1/doctors/chamber-session/', {
            'doctor_id': str(self.doctor.id),
            'clinic_id': str(self.clinic.id),
            'session_date': str(self.today),
            'action': 'COMPLETE_CURRENT'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_session_end_auto_rollover_and_reopen_revert(self):
        """
        When session ends early, unserved appointments are rolled over to next available date.
        When session is reopened to IN_CHAMBER, only rolled-over appointments return to today,
        and serial numbers on the target date are neatly re-aligned for remaining appointments.
        """
        # Served patient
        apt1 = Appointment.objects.create(
            patient=self.patient_user1,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.COMPLETED,
            amount=Decimal('800.00')
        )
        # Unserved patients
        apt2 = Appointment.objects.create(
            patient=self.patient_user2,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 15),
            serial_number=2,
            status=AppointmentStatus.CONFIRMED,
            amount=Decimal('800.00')
        )
        apt3 = Appointment.objects.create(
            patient=self.patient_user3,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            appointment_time=time(10, 30),
            serial_number=3,
            status=AppointmentStatus.CONFIRMED,
            amount=Decimal('800.00')
        )

        session = ChamberSession.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            session_date=self.today,
            current_serial=1,
            status=ChamberSessionStatus.IN_CHAMBER
        )

        # End session early
        res = self.client.post('/api/v1/doctors/chamber-session/', {
            'doctor_id': str(self.doctor.id),
            'clinic_id': str(self.clinic.id),
            'session_date': str(self.today),
            'action': 'UPDATE_STATUS',
            'status': ChamberSessionStatus.ENDED
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.ENDED)

        # apt2 and apt3 should have rolled over to next day
        apt2.refresh_from_db()
        apt3.refresh_from_db()
        tomorrow = self.today + timedelta(days=1)
        self.assertEqual(apt2.appointment_date, tomorrow)
        self.assertEqual(apt3.appointment_date, tomorrow)
        self.assertEqual(apt2.rolled_over_from_date, self.today)
        self.assertEqual(apt2.original_serial_number, 2)
        self.assertEqual(apt3.rolled_over_from_date, self.today)
        self.assertEqual(apt3.original_serial_number, 3)

        # In the meantime, simulate a new patient booking on tomorrow
        new_patient = User.objects.create_user(
            email="p4@test.com",
            phone="+8801711000006",
            password="testpassword123",
            role="PATIENT"
        )
        apt_new = Appointment.objects.create(
            patient=new_patient,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=tomorrow,
            appointment_time=time(11, 0),
            serial_number=10,  # arbitrarily booked higher
            status=AppointmentStatus.CONFIRMED,
            amount=Decimal('800.00')
        )

        # Now Doctor REOPENS session to IN_CHAMBER
        res = self.client.post('/api/v1/doctors/chamber-session/', {
            'doctor_id': str(self.doctor.id),
            'clinic_id': str(self.clinic.id),
            'session_date': str(self.today),
            'action': 'UPDATE_STATUS',
            'status': ChamberSessionStatus.IN_CHAMBER
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, ChamberSessionStatus.IN_CHAMBER)

        # apt2 and apt3 should now be reverted to today with their original serials!
        apt2.refresh_from_db()
        apt3.refresh_from_db()
        self.assertEqual(apt2.appointment_date, self.today)
        self.assertEqual(apt2.serial_number, 2)
        self.assertIsNone(apt2.rolled_over_from_date)

        self.assertEqual(apt3.appointment_date, self.today)
        self.assertEqual(apt3.serial_number, 3)
        self.assertIsNone(apt3.rolled_over_from_date)

        # apt_new on tomorrow should remain on tomorrow and have its serial re-aligned to 1
        apt_new.refresh_from_db()
        self.assertEqual(apt_new.appointment_date, tomorrow)
        self.assertEqual(apt_new.serial_number, 1)
