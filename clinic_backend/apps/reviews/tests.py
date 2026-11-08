import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, time
from apps.accounts.models import UserRole
from apps.clinics.models import Clinic
from apps.doctors.models import Doctor
from apps.appointments.models import Appointment, AppointmentStatus
from apps.reviews.models import Review

User = get_user_model()

class ReviewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Clinic Admin User
        self.clinic_admin = User.objects.create_user(
            email='clinic_admin@smartclinic.bd',
            password='TestPassword123!',
            first_name='Admin',
            last_name='User',
            phone='01711111111',
            role=UserRole.CLINIC_ADMIN
        )

        # Clinic
        self.clinic = Clinic.objects.create(
            owner=self.clinic_admin,
            name='Popular Diagnostic Center',
            slug='popular-diagnostic-center',
            address='Dhanmondi, Dhaka',
            city='Dhaka',
            phone='01722222222',
            email='info@popular.bd'
        )

        # Doctor User & Doctor Profile
        self.doctor_user = User.objects.create_user(
            email='doctor@smartclinic.bd',
            password='TestPassword123!',
            first_name='Rashid',
            last_name='Karim',
            phone='01733333333',
            role=UserRole.DOCTOR
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            full_name='Dr. Rashid Karim',
            email='doctor@smartclinic.bd',
            phone='01733333333',
            qualification='MBBS, FCPS',
            experience_years=10
        )

        # Patient User
        self.patient = User.objects.create_user(
            email='patient@smartclinic.bd',
            password='TestPassword123!',
            first_name='Rahim',
            last_name='Uddin',
            phone='01744444444',
            role=UserRole.PATIENT
        )

        # Another Patient
        self.other_patient = User.objects.create_user(
            email='other_patient@smartclinic.bd',
            password='TestPassword123!',
            first_name='Karim',
            last_name='Bhuiyan',
            phone='01755555555',
            role=UserRole.PATIENT
        )

        # Completed Appointment
        self.completed_appointment = Appointment.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=date.today(),
            appointment_time=time(10, 0),
            serial_number=1,
            status=AppointmentStatus.COMPLETED,
            amount=500.00
        )

        # Pending Appointment
        self.pending_appointment = Appointment.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=date.today(),
            appointment_time=time(10, 30),
            serial_number=2,
            status=AppointmentStatus.PENDING,
            amount=500.00
        )

    def test_submit_review_success(self):
        """Verified patient can successfully review a COMPLETED appointment."""
        self.client.force_authenticate(user=self.patient)
        response = self.client.post('/api/v1/reviews/create/', {
            'appointment_id': str(self.completed_appointment.id),
            'rating': 5,
            'comment': 'Excellent doctor, highly recommended!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Review.objects.filter(appointment=self.completed_appointment).exists())
        review = Review.objects.get(appointment=self.completed_appointment)
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.comment, 'Excellent doctor, highly recommended!')

    def test_cannot_review_pending_appointment(self):
        """Patients cannot submit a review before the visit is COMPLETED."""
        self.client.force_authenticate(user=self.patient)
        response = self.client.post('/api/v1/reviews/create/', {
            'appointment_id': str(self.pending_appointment.id),
            'rating': 4,
            'comment': 'Good visit'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_review_other_patients_appointment(self):
        """Patients cannot submit a review for someone else's appointment."""
        self.client.force_authenticate(user=self.other_patient)
        response = self.client.post('/api/v1/reviews/create/', {
            'appointment_id': str(self.completed_appointment.id),
            'rating': 3,
            'comment': 'Not my appointment'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_submit_duplicate_review(self):
        """An appointment cannot be reviewed more than once."""
        Review.objects.create(
            appointment=self.completed_appointment,
            patient=self.patient,
            doctor=self.doctor,
            clinic=self.clinic,
            rating=5,
            comment='First review'
        )

        self.client.force_authenticate(user=self.patient)
        response = self.client.post('/api/v1/reviews/create/', {
            'appointment_id': str(self.completed_appointment.id),
            'rating': 4,
            'comment': 'Duplicate attempt'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_review_list(self):
        """Anyone can view verified doctor and clinic reviews."""
        Review.objects.create(
            appointment=self.completed_appointment,
            patient=self.patient,
            doctor=self.doctor,
            clinic=self.clinic,
            rating=5,
            comment='Great clinic'
        )

        response = self.client.get(f'/api/v1/reviews/?doctor_id={self.doctor.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('data', response.data)
        if isinstance(results, dict) and 'results' in results:
            results = results['results']
        self.assertGreaterEqual(len(results), 1)
