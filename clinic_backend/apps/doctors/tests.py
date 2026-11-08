from datetime import date, time
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole
from apps.clinics.models import Clinic, Department
from .models import Doctor, Specialization, DoctorClinic, DoctorSchedule, DoctorLeave, DayOfWeek
from .services import (
    create_specialization,
    assign_doctor_to_clinic,
    create_doctor_schedule,
    create_doctor_leave,
    generate_doctor_available_slots,
)

User = get_user_model()

class DoctorsTestCase(TestCase):
    def setUp(self):
        self.clinic_admin = User.objects.create_user(
            email="docadmin@clinic.com", password="Pass123!Owner", first_name="Doc", last_name="Admin", role=UserRole.CLINIC_ADMIN
        )
        self.clinic = Clinic.objects.create(
            owner=self.clinic_admin,
            name="General Hospital",
            slug="general-hospital",
            address="789 Care St",
            city="Boston",
            phone="+1555000111",
            email="info@generalhospital.com",
            verification_status="VERIFIED"
        )
        self.spec = create_specialization(name="Neurology")
        self.doctor = Doctor.objects.create(
            full_name="Gregory House",
            qualification="MD - Diagnostic Medicine",
            experience_years=15,
            verification_status="VERIFIED"
        )
        self.doctor.specializations.add(self.spec)

    def test_doctor_clinic_assignment(self):
        mapping = assign_doctor_to_clinic(
            doctor=self.doctor,
            clinic_id=self.clinic.id,
            consultation_fee=150.00,
            room_number="Room 304"
        )
        self.assertEqual(mapping.consultation_fee, 150.00)
        self.assertEqual(mapping.room_number, "Room 304")

    def test_dynamic_slot_generation(self):
        assign_doctor_to_clinic(
            doctor=self.doctor,
            clinic_id=self.clinic.id,
            consultation_fee=150.00
        )
        # Create schedule for Mondays 09:00 - 12:00 (3 x 1-hour slots)
        create_doctor_schedule(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            day_of_week=DayOfWeek.MONDAY,
            start_time=time(9, 0),
            end_time=time(12, 0)
        )

        # 2026-08-03 is a Monday
        target_date = date(2026, 8, 3)
        slots = generate_doctor_available_slots(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            target_date=target_date
        )
        self.assertEqual(len(slots), 3)
        self.assertEqual(slots[0]['start_time'], '09:00:00')
        self.assertEqual(slots[0]['end_time'], '10:00:00')
        self.assertTrue(slots[0]['is_available'])

    def test_leave_blocks_slots(self):
        assign_doctor_to_clinic(
            doctor=self.doctor,
            clinic_id=self.clinic.id,
            consultation_fee=150.00
        )
        create_doctor_schedule(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            day_of_week=DayOfWeek.MONDAY,
            start_time=time(9, 0),
            end_time=time(12, 0)
        )

        target_date = date(2026, 8, 3)
        create_doctor_leave(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            start_date=target_date,
            end_date=target_date,
            reason="Medical Conference"
        )

        slots = generate_doctor_available_slots(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            target_date=target_date
        )
        self.assertEqual(len(slots), 0)


    def test_schedule_time_clash_detection_on_same_day(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        owner_b = User.objects.create_user(
            email="ownerb@clinic.com", password="Pass123!Owner", first_name="DocB", last_name="Admin", role=UserRole.CLINIC_ADMIN
        )
        clinic_b = Clinic.objects.create(
            owner=owner_b,
            name="City Specialized Center",
            slug="city-specialized-center",
            address="456 Park Ave",
            city="Boston",
            phone="+1555000222",
            email="info@cityspecialized.com",
            verification_status="VERIFIED"
        )
        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=DayOfWeek.MONDAY,
            start_time=time(9, 0),
            end_time=time(13, 0),
            is_active=True
        )

        client = APIClient()
        client.force_authenticate(user=self.clinic_admin)
        payload = {
            'doctor': str(self.doctor.id),
            'clinic': str(clinic_b.id),
            'day_of_week': DayOfWeek.MONDAY,
            'start_time': '10:00',
            'end_time': '14:00',
            'slot_duration_minutes': 15,
            'max_patients': 20,
        }
        res = client.post('/api/v1/doctors/schedule/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('clash', str(res.data).lower())

        invalid_time_payload = {
            'doctor': str(self.doctor.id),
            'clinic': str(clinic_b.id),
            'day_of_week': DayOfWeek.TUESDAY,
            'start_time': '15:00',
            'end_time': '11:00',
            'slot_duration_minutes': 15,
            'max_patients': 20,
        }
        res_invalid = client.post('/api/v1/doctors/schedule/', invalid_time_payload, format='json')
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('after start time', str(res_invalid.data).lower())

        valid_payload = {
            'doctor': str(self.doctor.id),
            'clinic': str(clinic_b.id),
            'day_of_week': DayOfWeek.MONDAY,
            'start_time': '16:00',
            'end_time': '20:00',
            'slot_duration_minutes': 15,
            'max_patients': 20,
        }
        res_valid = client.post('/api/v1/doctors/schedule/', valid_payload, format='json')
        self.assertIn(res_valid.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_room_number_conflict_raises_validation_error(self):
        from rest_framework.exceptions import ValidationError
        # Doctor 1 assigned to Room 204
        assign_doctor_to_clinic(
            doctor=self.doctor,
            clinic_id=self.clinic.id,
            consultation_fee=150.00,
            room_number="Room 204"
        )

        doctor2 = Doctor.objects.create(
            full_name="John Watson",
            qualification="MBBS, MD",
            experience_years=8,
            verification_status="VERIFIED"
        )

        # Doctor 2 attempting "204" -> conflict!
        with self.assertRaises(ValidationError) as ctx:
            assign_doctor_to_clinic(
                doctor=doctor2,
                clinic_id=self.clinic.id,
                consultation_fee=120.00,
                room_number="204"
            )
        self.assertIn("already allocated to Dr. Gregory House", str(ctx.exception))

        # Doctor 2 attempting "Chamber 204" -> conflict!
        with self.assertRaises(ValidationError) as ctx2:
            assign_doctor_to_clinic(
                doctor=doctor2,
                clinic_id=self.clinic.id,
                consultation_fee=120.00,
                room_number="Chamber 204"
            )
        self.assertIn("already allocated to Dr. Gregory House", str(ctx2.exception))

        # Doctor 2 assigning "Room 205" -> succeeds!
        mapping2 = assign_doctor_to_clinic(
            doctor=doctor2,
            clinic_id=self.clinic.id,
            consultation_fee=120.00,
            room_number="Room 205"
        )
        self.assertEqual(mapping2.room_number, "Room 205")

        # Doctor 1 updating own assignment with "204" -> succeeds (no self-conflict)!
        mapping1_update = assign_doctor_to_clinic(
            doctor=self.doctor,
            clinic_id=self.clinic.id,
            consultation_fee=175.00,
            room_number="204"
        )
        self.assertEqual(mapping1_update.consultation_fee, 175.00)

    def test_request_doctor_clinic_service_room_conflict(self):
        from rest_framework.exceptions import ValidationError
        from .services import request_doctor_clinic_service
        assign_doctor_to_clinic(
            doctor=self.doctor,
            clinic_id=self.clinic.id,
            consultation_fee=150.00,
            room_number="Room 301"
        )
        doctor3 = Doctor.objects.create(
            full_name="Allison Cameron",
            qualification="MBBS",
            experience_years=5,
            verification_status="VERIFIED"
        )
        with self.assertRaises(ValidationError) as ctx:
            request_doctor_clinic_service(
                doctor=doctor3,
                clinic=self.clinic,
                requested_by_user=self.clinic_admin,
                consultation_fee=100.00,
                room_number="301"
            )
        self.assertIn("already allocated", str(ctx.exception))
