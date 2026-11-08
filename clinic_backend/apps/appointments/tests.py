from datetime import date, time, timedelta
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
        booking_date = date.today() + timedelta(days=2)
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
        booking_date = date.today() + timedelta(days=3)
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

        target_date = date.today()
        response = client.post('/api/v1/appointments/', {
            'clinic_id': str(self.clinic.id),
            'doctor_id': str(self.doctor.id),
            'appointment_date': str(target_date),
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

        target_date = date.today() + timedelta(days=4)
        apt = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=target_date,
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

        target_date = date.today() + timedelta(days=5)
        apt = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=target_date,
            appointment_time=time(15, 0)
        )

        response = client.get(
            f'/api/v1/appointments/queue/public/?doctor_id={self.doctor.id}&clinic_id={self.clinic.id}&date={target_date}'
        )
        self.assertEqual(response.status_code, 200)
        data = response.data.get('data', response.data) if isinstance(response.data, dict) else response.data
        self.assertTrue(len(data) >= 1)
        # Verify masked name format: starts with initial
        first_item = data[0]
        self.assertEqual(first_item['serial_number'], 1)
        self.assertTrue(first_item['patient_name'].startswith('J***'))

    def test_monotonic_serial_number_on_cancellation_and_rebooking(self):
        """
        Upgrade #1: When Serial #2 cancels, the next patient gets Serial #4 (Max + 1)
        instead of duplicate Serial #3, while active capacity still respects max_patients.
        """
        target_date = date.today() + timedelta(days=6)
        p2 = User.objects.create_user(email="p2@test.com", password="Pass123!Patient", first_name="P2", last_name="Test", role=UserRole.PATIENT)
        p3 = User.objects.create_user(email="p3@test.com", password="Pass123!Patient", first_name="P3", last_name="Test", role=UserRole.PATIENT)
        p4 = User.objects.create_user(email="p4@test.com", password="Pass123!Patient", first_name="P4", last_name="Test", role=UserRole.PATIENT)

        apt1 = book_appointment(patient=self.patient, clinic_id=self.clinic.id, doctor_id=self.doctor.id, appointment_date=target_date, appointment_time=time(10, 0))
        apt2 = book_appointment(patient=p2, clinic_id=self.clinic.id, doctor_id=self.doctor.id, appointment_date=target_date, appointment_time=time(10, 15))
        apt3 = book_appointment(patient=p3, clinic_id=self.clinic.id, doctor_id=self.doctor.id, appointment_date=target_date, appointment_time=time(10, 30))

        self.assertEqual([apt1.serial_number, apt2.serial_number, apt3.serial_number], [1, 2, 3])

        # Cancel Serial #2
        cancel_appointment(appointment=apt2, cancelled_by_user=p2)

        # Book a new patient into the freed 10:15 slot -> must receive Serial #4 (not duplicate #3)
        apt4 = book_appointment(patient=p4, clinic_id=self.clinic.id, doctor_id=self.doctor.id, appointment_date=target_date, appointment_time=time(10, 15))
        self.assertEqual(apt4.serial_number, 4)

    def test_lazy_expiration_of_abandoned_online_payment_holds(self):
        """
        Upgrade #4: Abandoned PENDING online payment appointments older than 20 mins
        are automatically expired when another patient attempts to book the same slot.
        """
        from django.utils import timezone
        from apps.payments.models import Payment, PaymentMethod, PaymentStatus

        target_date = date.today() + timedelta(days=7)
        slot_time = time(11, 30)

        apt1 = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=target_date,
            appointment_time=slot_time
        )
        # Attach an unpaid online BKASH payment and backdate created_at by 25 minutes
        Payment.objects.create(
            appointment=apt1,
            amount=200.00,
            payment_method=PaymentMethod.BKASH,
            payment_status=PaymentStatus.PENDING,
        )
        Appointment.objects.filter(pk=apt1.pk).update(created_at=timezone.now() - timedelta(minutes=25))

        # Second patient tries to book the exact same slot -> stale hold is released automatically!
        p2 = User.objects.create_user(email="p2_hold@test.com", password="Pass123!Patient", first_name="Sarah", last_name="Connor", role=UserRole.PATIENT)
        apt2 = book_appointment(
            patient=p2,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=target_date,
            appointment_time=slot_time
        )
        apt1.refresh_from_db()
        self.assertEqual(apt1.status, AppointmentStatus.CANCELLED)
        self.assertEqual(apt2.status, AppointmentStatus.PENDING)

    def test_two_hour_patient_self_cancellation_cutoff(self):
        """
        Upgrade #5: Patient cannot self-cancel a CONFIRMED appointment within 2 hours of chamber time
        or after checking in (is_arrived=True), whereas Clinic Admin / Staff can still cancel.
        """
        target_date = date.today() + timedelta(days=1)
        apt = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=target_date,
            appointment_time=time(16, 0)
        )
        apt.status = AppointmentStatus.CONFIRMED
        apt.is_arrived = True
        apt.save(update_fields=['status', 'is_arrived'])

        # Patient cannot cancel after check-in
        with self.assertRaises(ValidationError):
            cancel_appointment(appointment=apt, cancelled_by_user=self.patient)

        # Clinic Admin can still cancel if needed
        cancelled = cancel_appointment(appointment=apt, cancelled_by_user=self.clinic_admin)
        self.assertEqual(cancelled.status, AppointmentStatus.CANCELLED)

    def test_doctor_emergency_leave_notifies_and_cancels_prebooked_patients(self):
        """
        Upgrade #2: Creating a DoctorLeave alerts existing booked patients and returns affected_appointments_count.
        """
        from rest_framework.test import APIClient
        doctor_user = User.objects.create_user(
            email="dr.grey@clinic.com", password="Pass123!Doctor", first_name="Meredith", last_name="Grey", role=UserRole.DOCTOR
        )
        self.doctor.user = doctor_user
        self.doctor.save(update_fields=['user'])

        leave_date = date.today() + timedelta(days=8)
        apt = book_appointment(
            patient=self.patient,
            clinic_id=self.clinic.id,
            doctor_id=self.doctor.id,
            appointment_date=leave_date,
            appointment_time=time(10, 0)
        )

        client = APIClient()
        client.force_authenticate(user=doctor_user)
        response = client.post('/api/v1/doctors/leaves/', {
            'clinic': str(self.clinic.id),
            'start_date': str(leave_date),
            'end_date': str(leave_date),
            'reason': 'Emergency surgery duty',
            'cancel_existing': True
        }, format='json')

        self.assertEqual(response.status_code, 201)
        data = response.data.get('data', response.data)
        self.assertEqual(data['affected_appointments_count'], 1)
        apt.refresh_from_db()
        self.assertEqual(apt.status, AppointmentStatus.CANCELLED)

    def test_doctor_delay_broadcast_and_availability_estimated_time(self):
        """
        Upgrade #3: Updating delay_minutes on ChamberSession shifts estimated_time on availability slots.
        """
        from rest_framework.test import APIClient
        target_date = date.today() + timedelta(days=9)

        DoctorSchedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=target_date.weekday(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            slot_duration_minutes=30,
            max_patients=10,
            is_active=True
        )

        client = APIClient()
        client.force_authenticate(user=self.clinic_admin)

        # Report a 30-minute doctor delay for target_date
        resp_session = client.post('/api/v1/doctors/chamber-session/', {
            'doctor_id': str(self.doctor.id),
            'clinic_id': str(self.clinic.id),
            'date': str(target_date),
            'delay_minutes': 30,
            'status_note': 'Stuck in traffic'
        }, format='json')
        self.assertEqual(resp_session.status_code, 200)

        # Check availability endpoint for shifted estimated_time
        resp_avail = client.get(
            f'/api/v1/doctors/availability/?doctor_id={self.doctor.id}&clinic_id={self.clinic.id}&date={target_date}'
        )
        self.assertEqual(resp_avail.status_code, 200)
        avail_data = resp_avail.data.get('data', resp_avail.data)
        self.assertEqual(avail_data['delay_minutes'], 30)
        self.assertEqual(len(avail_data['upcoming_days']), 30)
        self.assertEqual(len(avail_data['weekly_schedules']), 1)
        self.assertIsNotNone(avail_data['next_available_date'])
        first_slot = avail_data['slots'][0]
        self.assertEqual(first_slot['time'], '10:00')
        self.assertEqual(first_slot['estimated_time'], '10:30')

