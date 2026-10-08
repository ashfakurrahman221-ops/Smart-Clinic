from datetime import date, time
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from apps.accounts.models import UserRole
from apps.clinics.models import Clinic
from apps.doctors.models import Doctor, DoctorClinic, DoctorSchedule, DayOfWeek
from .models import Appointment, AppointmentStatus
from .services import book_appointment, cancel_appointment, complete_appointment
from apps.payments.services import initiate_payment, process_payment_success
from apps.reviews.services import create_review

User = get_user_model()

class AppointmentsTestCase(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient@test.com", password="Pass123!Patient", first_name="John", last_name="Patient", role=UserRole.PATIENT
        )
        self.clinic_admin = User.objects.create_user(
            email="admin@clinic.com", password="Pass123!Admin", first_name="Clinic", last_name="Admin", role=UserRole.CLINIC_ADMIN
        )
        self.clinic = Clinic.objects.create(
            owner=self.clinic_admin,
            name="Apex Clinic",
            slug="apex-clinic",
            address="100 Health Way",
            city="San Francisco",
            phone="+14155551234",
            email="info@apexclinic.com",
            verification_status="VERIFIED"
        )
        self.doctor = Doctor.objects.create(
            full_name="Meredith Grey",
            qualification="MD - General Surgery",
            experience_years=10,
            verification_status="VERIFIED"
        )
        DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=200.00,
            status="ACCEPTED",
            is_active=True
        )

    def test_appointment_booking_flow_and_double_booking_prevention(self):
        booking_date = date(2026, 8, 10)
        booking_time = time(10, 0)

        # 1. Book initial appointment (Status = PENDING)
        apt = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=booking_date,
            appointment_time=booking_time,
            problem_description="Routine checkup"
        )
        self.assertEqual(apt.status, AppointmentStatus.PENDING)

        # 2. Attempt double booking (Should raise ValidationError)
        another_patient = User.objects.create_user(
            email="patient2@test.com", password="Pass123!Patient", first_name="Jane", last_name="Smith", role=UserRole.PATIENT
        )
        with self.assertRaises(ValidationError):
            book_appointment(
                patient=another_patient,
                clinic_id=self.clinic.id,
                doctor_id=self.doctor.id,
                appointment_date=booking_date,
                appointment_time=booking_time
            )

        # 3. Process Payment (Status changes to CONFIRMED)
        payment = initiate_payment(appointment=apt)
        self.assertEqual(payment.payment_status, 'PENDING')
        
        processed_payment = process_payment_success(payment=payment, transaction_id="TXN12345678")
        apt.refresh_from_db()
        self.assertEqual(processed_payment.payment_status, 'COMPLETED')
        self.assertEqual(apt.status, AppointmentStatus.CONFIRMED)

        # 4. Complete Appointment
        completed_apt = complete_appointment(appointment=apt)
        self.assertEqual(completed_apt.status, AppointmentStatus.COMPLETED)

        # 5. Submit Review after completion
        review = create_review(
            appointment_id=str(completed_apt.id),
            patient=self.patient,
            rating=5,
            comment="Outstanding care and professional service!"
        )
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.doctor, self.doctor)

    def test_review_prevented_on_uncompleted_appointment(self):
        booking_date = date(2026, 8, 11)
        booking_time = time(11, 0)

        apt = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=booking_date,
            appointment_time=booking_time
        )
        with self.assertRaises(ValidationError):
            create_review(
                appointment_id=str(apt.id),
                patient=self.patient,
                rating=4,
                comment="Good service"
            )

    def test_walk_in_counter_booking_flow(self):
        """Clinic Admin can book walk-in counter appointment with instant CONFIRMED status."""
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.clinic_admin)

        response = client.post('/api/v1/appointments/', {
            'clinic_id': str(self.clinic.id),
            'doctor_id': str(self.doctor.id),
            'appointment_date': str(date(2026, 8, 15)),
            'appointment_time': '12:00:00',
            'is_walk_in': True,
            'walk_in_name': 'Walk-in Patient Karim',
            'walk_in_phone': '01899999999',
            'problem_description': 'Chest congestion'
        }, format='json')

        self.assertEqual(response.status_code, 201)
        data = response.data.get('data', response.data)
        self.assertEqual(data['status'], AppointmentStatus.CONFIRMED)
        self.assertEqual(data['serial_number'], 1)

    def test_counter_cash_check_in_endpoint(self):
        """Clinic reception can mark PENDING appointment as paid in cash and confirmed."""
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.clinic_admin)

        apt = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=date(2026, 8, 16),
            appointment_time=time(14, 0)
        )
        self.assertEqual(apt.status, AppointmentStatus.PENDING)

        response = client.post(f'/api/v1/appointments/{apt.id}/checkin/')
        self.assertEqual(response.status_code, 200)
        apt.refresh_from_db()
        self.assertEqual(apt.status, AppointmentStatus.CONFIRMED)

    def test_public_waiting_room_queue_endpoint_unauthenticated(self):
        """Public lobby TV screen can fetch live upcoming queue without login, with masked patient initials."""
        from rest_framework.test import APIClient
        client = APIClient()  # Unauthenticated

        apt = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=date(2026, 8, 17),
            appointment_time=time(15, 0)
        )

        response = client.get(
            f'/api/v1/appointments/queue/public/?doctor_id={self.doctor.id}&clinic_id={self.clinic.id}&date=2026-08-17'
        )
        self.assertEqual(response.status_code, 200)
        data = response.data.get('data', response.data) if isinstance(response.data, dict) else response.data
        self.assertTrue(len(data) >= 1)
        # Verify masked name format: starts with initial
        first_item = data[0]
        self.assertEqual(first_item['serial_number'], 1)
        self.assertTrue(first_item['patient_name'].startswith('J***'))

