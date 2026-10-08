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
