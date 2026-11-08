from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import UserRole
from .models import Department, Clinic
from .services import create_department, create_clinic, add_department_to_clinic

User = get_user_model()

class ClinicsTestCase(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@clinic.com", password="Pass123!Admin", first_name="Admin", last_name="User"
        )
        self.clinic_admin = User.objects.create_user(
            email="owner@clinic.com", password="Pass123!Owner", first_name="Clinic", last_name="Owner", role=UserRole.CLINIC_ADMIN
        )
        self.client = APIClient()

    def test_department_and_clinic_creation(self):
        dept = create_department(name="Cardiology", description="Heart Care")
        self.assertEqual(Department.objects.count(), 1)

        clinic = create_clinic(
            owner=self.clinic_admin,
            name="City Heart Hospital",
            address="123 Health Ave",
            city="New York",
            phone="+1234567890",
            email="contact@cityheart.com"
        )
        self.assertEqual(Clinic.objects.count(), 1)
        self.assertEqual(clinic.owner, self.clinic_admin)

        add_department_to_clinic(clinic=clinic, department_id=dept.id)
        self.assertEqual(clinic.departments.count(), 1)

    def test_clinic_api(self):
        self.client.force_authenticate(user=self.clinic_admin)
        payload = {
            "name": "Metro Health Clinic",
            "address": "456 Main St",
            "city": "Chicago",
            "phone": "+1987654321",
            "email": "metro@health.com"
        }
        res = self.client.post("/api/v1/clinics/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "Metro Health Clinic")

    def test_my_clinic_endpoint(self):
        # 1. No clinic yet -> returns null (200 OK)
        self.client.force_authenticate(user=self.clinic_admin)
        res = self.client.get("/api/v1/clinics/my-clinic/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data)

        # 2. Clinic created -> returns owned clinic
        clinic = create_clinic(
            owner=self.clinic_admin,
            name="Alpha Care Clinic",
            address="789 Care Blvd",
            city="Dhaka",
            phone="01711223344",
            email="alpha@care.com"
        )
        res = self.client.get("/api/v1/clinics/my-clinic/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Alpha Care Clinic")
        self.assertEqual(res.data["verification_status"], "PENDING")

    def test_rejected_clinic_resubmission(self):
        self.client.force_authenticate(user=self.clinic_admin)
        clinic = create_clinic(
            owner=self.clinic_admin,
            name="Beta Clinic",
            address="100 Road",
            city="Dhaka",
            phone="01711223344",
            email="beta@care.com"
        )
        clinic.verification_status = "REJECTED"
        clinic.save()

        # Resubmit with updated certificate
        update_payload = {"certificate_url": "https://res.cloudinary.com/demo/valid_cert.pdf"}
        res = self.client.patch(f"/api/v1/clinics/{clinic.id}/", update_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        clinic.refresh_from_db()
        self.assertEqual(clinic.verification_status, "PENDING")

    def test_clinic_decoration_and_profile_update(self):
        self.client.force_authenticate(user=self.clinic_admin)
        clinic = create_clinic(
            owner=self.clinic_admin,
            name="Apex Hospital",
            address="Dhanmondi, Dhaka",
            city="Dhaka",
            phone="01700000000",
            email="apex@hospital.com"
        )
        payload = {
            "description": "Leading multi-specialty healthcare facility with modern diagnostics.",
            "opening_hours": "Sat - Thu: 08:00 AM - 10:00 PM | Fri: 04:00 PM - 10:00 PM",
            "facilities": ["24/7 Emergency", "Wheelchair Accessible", "In-house Pharmacy", "Dedicated Parking"],
            "emergency_contact": "01799999999",
            "website": "https://apex-hospital.bd"
        }
        res = self.client.patch(f"/api/v1/clinics/{clinic.id}/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        clinic.refresh_from_db()
        self.assertEqual(clinic.description, payload["description"])
        self.assertEqual(clinic.opening_hours, payload["opening_hours"])
        self.assertIn("24/7 Emergency", clinic.facilities)
        self.assertEqual(clinic.emergency_contact, "01799999999")

    def test_clinic_services_crud(self):
        self.client.force_authenticate(user=self.clinic_admin)
        clinic = create_clinic(
            owner=self.clinic_admin,
            name="Modern Diagnostic",
            address="Mirpur 10",
            city="Dhaka",
            phone="01711111111",
            email="modern@diag.com"
        )
        # 1. Create a clinical service
        service_payload = {
            "name": "Echocardiogram (Echo)",
            "description": "2D echocardiogram with color doppler report",
            "fee": 2500.00,
            "duration_minutes": 30,
            "preparation_instructions": "Bring previous ECG reports if any",
            "is_available": True
        }
        res = self.client.post(f"/api/v1/clinics/{clinic.id}/services/", service_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        service_id = res.data["id"]
        self.assertEqual(res.data["name"], "Echocardiogram (Echo)")
        self.assertEqual(float(res.data["fee"]), 2500.00)

        # 2. List services
        res = self.client.get(f"/api/v1/clinics/{clinic.id}/services/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

        # 3. Update service (e.g. toggle availability, update fee)
        patch_payload = {"fee": 2200.00, "is_available": False}
        res = self.client.patch(f"/api/v1/clinics/{clinic.id}/services/{service_id}/", patch_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(float(res.data["fee"]), 2200.00)
        self.assertFalse(res.data["is_available"])

        # 4. Public patient list should filter out is_available=False
        patient_client = APIClient()
        res = patient_client.get(f"/api/v1/clinics/{clinic.id}/services/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)

        # 5. Delete service
        res = self.client.delete(f"/api/v1/clinics/{clinic.id}/services/{service_id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        res = self.client.get(f"/api/v1/clinics/{clinic.id}/services/")
        self.assertEqual(len(res.data), 0)

    def test_clinic_gallery_update(self):
        self.client.force_authenticate(user=self.clinic_admin)
        clinic = create_clinic(
            owner=self.clinic_admin,
            name="Apex Specialty Hospital",
            address="Gulshan 2",
            city="Dhaka",
            phone="01722222222",
            email="apex@hospital.com"
        )
        gallery_items = [
            {
                "id": "gal-1",
                "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d",
                "category": "Reception & Information Desk",
                "title": "Main Reception & Token Counter",
                "description": "Fast-track air-conditioned patient reception with digital queue display.",
                "is_featured": True
            },
            {
                "id": "gal-2",
                "image_url": "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b",
                "category": "Diagnostic & Pathology Lab",
                "title": "Automated Hematology Lab",
                "description": "Fully automated diagnostic biochemistry and clinical pathology testing suite.",
                "is_featured": False
            }
        ]
        res = self.client.patch(f"/api/v1/clinics/{clinic.id}/", {"gallery": gallery_items}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        clinic.refresh_from_db()
        self.assertEqual(len(clinic.gallery), 2)
        self.assertEqual(clinic.gallery[0]["title"], "Main Reception & Token Counter")
        self.assertTrue(clinic.gallery[0]["is_featured"])

        # Check public retrieve returns gallery
        pub_client = APIClient()
        pub_res = pub_client.get(f"/api/v1/clinics/{clinic.id}/")
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        self.assertIn("gallery", pub_res.data)
        self.assertEqual(len(pub_res.data["gallery"]), 2)


class StaffDeactivationSecurityTestCase(TestCase):
    def setUp(self):
        self.clinic_owner = User.objects.create_user(
            email="owner_sec@clinic.com",
            password="Pass123!Owner",
            first_name="Clinic",
            last_name="Owner",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic = create_clinic(
            owner=self.clinic_owner,
            name="Security Care Clinic",
            address="Banani, Dhaka",
            city="Dhaka",
            phone="01799887766",
            email="sec@care.com",
        )
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.clinic_owner)

    def test_receptionist_deactivation_cascades_to_user_and_revokes_access(self):
        from apps.clinics.models import ClinicStaff, StaffRole

        # 1. Create a receptionist staff record
        staff = ClinicStaff.objects.create(
            clinic=self.clinic,
            name="Farhana Akter",
            role=StaffRole.RECEPTIONIST,
            phone="01811223344",
            is_active=True,
        )

        # 2. Create login account for the receptionist
        login_res = self.admin_client.post(
            "/api/v1/clinics/staff/create-login/",
            {
                "staff_id": str(staff.id),
                "email": "farhana@clinic.internal",
                "first_name": "Farhana",
                "last_name": "Akter",
                "password": "ReceptionSecret123!",
            },
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_201_CREATED)
        staff.refresh_from_db()
        self.assertIsNotNone(staff.user)
        self.assertTrue(staff.user.is_active)

        # 3. Test active receptionist can log in and obtain JWT
        anon_client = APIClient()
        auth_res = anon_client.post(
            "/api/v1/accounts/login/",
            {"email": "farhana@clinic.internal", "password": "ReceptionSecret123!"},
            format="json",
        )
        self.assertEqual(auth_res.status_code, status.HTTP_200_OK)
        access_token = auth_res.data["access"]

        # 4. Test active receptionist can access reception endpoint with access token
        reception_client = APIClient()
        reception_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        desk_res = reception_client.get("/api/v1/clinics/reception/my-clinic/")
        self.assertEqual(desk_res.status_code, status.HTTP_200_OK)

        # 5. Clinic Admin deactivates the staff member via DELETE endpoint
        del_res = self.admin_client.delete(f"/api/v1/clinics/staff/{staff.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

        # 6. Verify ClinicStaff is_active is False
        staff.refresh_from_db()
        self.assertFalse(staff.is_active)

        # 7. CRITICAL SECURITY ASSERTION: Linked User must also have is_active=False
        staff.user.refresh_from_db()
        self.assertFalse(staff.user.is_active)

        # 8. Test deactivated receptionist CANNOT log in anymore
        re_login_res = anon_client.post(
            "/api/v1/accounts/login/",
            {"email": "farhana@clinic.internal", "password": "ReceptionSecret123!"},
            format="json",
        )
        self.assertNotEqual(re_login_res.status_code, status.HTTP_200_OK)

        # 9. Test previously issued access token is IMMEDIATELY REJECTED
        stale_call_res = reception_client.get("/api/v1/clinics/reception/my-clinic/")
        self.assertEqual(stale_call_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_login_staff_can_be_deactivated_safely(self):
        from apps.clinics.models import ClinicStaff, StaffRole

        cleaner = ClinicStaff.objects.create(
            clinic=self.clinic,
            name="Rafiqul Islam",
            role=StaffRole.CLEANER,
            phone="01911223344",
            is_active=True,
            user=None,
        )
        del_res = self.admin_client.delete(f"/api/v1/clinics/staff/{cleaner.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        cleaner.refresh_from_db()
        self.assertFalse(cleaner.is_active)
        self.assertIsNone(cleaner.user)

    def test_patch_is_active_false_also_cascades(self):
        from apps.clinics.models import ClinicStaff, StaffRole

        staff = ClinicStaff.objects.create(
            clinic=self.clinic,
            name="Sultana Razia",
            role=StaffRole.RECEPTIONIST,
            phone="01899887766",
            is_active=True,
        )
        self.admin_client.post(
            "/api/v1/clinics/staff/create-login/",
            {
                "staff_id": str(staff.id),
                "email": "sultana@clinic.internal",
                "first_name": "Sultana",
                "last_name": "Razia",
                "password": "ReceptionSecret123!",
            },
            format="json",
        )
        staff.refresh_from_db()
        self.assertTrue(staff.user.is_active)

        # PATCH is_active = False
        patch_res = self.admin_client.patch(
            f"/api/v1/clinics/staff/{staff.id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        staff.refresh_from_db()
        self.assertFalse(staff.is_active)
        staff.user.refresh_from_db()
        self.assertFalse(staff.user.is_active)


class ReceptionDeskIntegrationTestCase(TestCase):
    def setUp(self):
        from apps.doctors.models import Doctor, DoctorClinic
        from apps.clinics.models import ClinicStaff, StaffRole

        self.clinic_owner = User.objects.create_user(
            email="desk_owner@clinic.com",
            password="Pass123!Owner",
            first_name="Desk",
            last_name="Owner",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic = create_clinic(
            owner=self.clinic_owner,
            name="Integrated Desk Clinic",
            address="Gulshan 2, Dhaka",
            city="Dhaka",
            phone="01711002233",
            email="desk@clinic.com",
        )
        self.clinic.verification_status = "VERIFIED"
        self.clinic.save()

        # Doctor setup
        self.doc_user = User.objects.create_user(
            email="desk_doc@clinic.com",
            password="DocPass123!",
            first_name="Rafiq",
            last_name="Ahmed",
            role=UserRole.DOCTOR,
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Rafiq Ahmed",
            qualification="MBBS, FCPS",
            experience_years=10,
        )
        DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=1000.00,
            is_active=True,
            room_number="Room 101",
        )

        # Receptionist staff setup
        self.reception_user = User.objects.create_user(
            email="desk_reception@clinic.internal",
            password="RecepPass123!",
            first_name="Nasrin",
            last_name="Akter",
            role=UserRole.RECEPTIONIST,
        )
        self.staff = ClinicStaff.objects.create(
            clinic=self.clinic,
            name="Nasrin Akter",
            role=StaffRole.RECEPTIONIST,
            phone="01922334455",
            is_active=True,
            user=self.reception_user,
        )

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.clinic_owner)

        self.reception_client = APIClient()
        self.reception_client.force_authenticate(user=self.reception_user)

    def test_walk_in_creation_by_both_admin_and_receptionist(self):
        from apps.appointments.models import Appointment
        from apps.payments.models import Payment, PaymentMethod, PaymentStatus

        # 1. Admin issues walk-in token using authoritative endpoint
        admin_res = self.admin_client.post(
            "/api/v1/clinics/reception/walk-in/",
            {
                "doctor_id": str(self.doctor.id),
                "patient_name": "Admin Walkin Patient",
                "patient_phone": "01755667788",
                "problem_description": "Fever & Chills",
                "fee": 1000,
            },
            format="json",
        )
        self.assertEqual(admin_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(admin_res.data["serial_number"], 1)
        self.assertTrue(admin_res.data["is_arrived"])

        apt1 = Appointment.objects.get(id=admin_res.data["appointment_id"])
        self.assertTrue(apt1.is_arrived)
        self.assertIsNotNone(apt1.arrived_at)
        pay1 = Payment.objects.get(appointment=apt1)
        self.assertEqual(pay1.payment_method, PaymentMethod.CASH)
        self.assertEqual(pay1.payment_status, PaymentStatus.COMPLETED)
        self.assertTrue(pay1.is_walk_in)
        self.assertEqual(pay1.received_by, self.clinic_owner)

        # 2. Receptionist issues walk-in token
        rec_res = self.reception_client.post(
            "/api/v1/clinics/reception/walk-in/",
            {
                "doctor_id": str(self.doctor.id),
                "patient_name": "Reception Walkin Patient",
                "patient_phone": "01799881122",
                "problem_description": "Routine Followup",
                "fee": 1000,
            },
            format="json",
        )
        self.assertEqual(rec_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(rec_res.data["serial_number"], 2)

        apt2 = Appointment.objects.get(id=rec_res.data["appointment_id"])
        self.assertTrue(apt2.is_arrived)
        pay2 = Payment.objects.get(appointment=apt2)
        self.assertEqual(pay2.received_by, self.reception_user)

    def test_appointment_check_in_sets_arrived_and_received_by(self):
        from apps.appointments.models import Appointment, AppointmentStatus
        from apps.payments.models import Payment, PaymentMethod, PaymentStatus
        from django.utils import timezone

        # Create scheduled appointment
        patient = User.objects.create_user(
            email="scheduled@patient.com",
            password="PatientPass123!",
            first_name="Karim",
            last_name="Uddin",
            role=UserRole.PATIENT,
        )
        apt = Appointment.objects.create(
            patient=patient,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=timezone.now().date(),
            appointment_time=timezone.now().time(),
            serial_number=5,
            status=AppointmentStatus.PENDING,
            amount=1000,
            is_arrived=False,
        )

        # Cash check-in at counter
        res = self.admin_client.post(f"/api/v1/appointments/{apt.id}/checkin/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        apt.refresh_from_db()
        self.assertEqual(apt.status, AppointmentStatus.CONFIRMED)
        self.assertTrue(apt.is_arrived)
        self.assertIsNotNone(apt.arrived_at)

        pay = Payment.objects.get(appointment=apt)
        self.assertEqual(pay.payment_method, PaymentMethod.CASH)
        self.assertEqual(pay.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(pay.received_by, self.clinic_owner)

    def test_receptionist_chamber_session_actions(self):
        from apps.doctors.models import ChamberSession, ChamberSessionStatus
        from apps.appointments.models import Appointment, AppointmentStatus
        from datetime import time
        from django.utils import timezone

        today = timezone.now().date()
        today_str = str(today)

        patient = User.objects.create_user(
            email="pat_desk@clinic.internal",
            password="Pass123!",
            first_name="Test",
            last_name="Patient",
            role=UserRole.PATIENT
        )

        # Create two appointments so NEXT_SERIAL and SKIP_SERIAL have valid queue candidates
        Appointment.objects.create(
            patient=patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=today, appointment_time=time(9, 0),
            serial_number=1, status=AppointmentStatus.CONFIRMED, amount=500
        )
        Appointment.objects.create(
            patient=patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=today, appointment_time=time(9, 15),
            serial_number=2, status=AppointmentStatus.CONFIRMED, amount=500
        )

        # NEXT_SERIAL
        res = self.reception_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": today_str,
                "action": "NEXT_SERIAL",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["current_serial"], 1)

        # SKIP_SERIAL
        res_skip = self.reception_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": today_str,
                "action": "SKIP_SERIAL",
            },
            format="json",
        )
        self.assertEqual(res_skip.status_code, status.HTTP_200_OK)
        self.assertEqual(res_skip.data["current_serial"], 2)
        self.assertIn(1, res_skip.data["skipped_serials"])

        # RECALL_SERIAL
        res_recall = self.reception_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": today_str,
                "action": "RECALL_SERIAL",
                "current_serial": 1,
            },
            format="json",
        )
        self.assertEqual(res_recall.status_code, status.HTTP_200_OK)
        self.assertEqual(res_recall.data["current_serial"], 1)
        self.assertNotIn(1, res_recall.data["skipped_serials"])

        # UPDATE_STATUS to PRAYER_BREAK
        res_break = self.reception_client.post(
            "/api/v1/doctors/chamber-session/",
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "session_date": today_str,
                "action": "UPDATE_STATUS",
                "status": "PRAYER_BREAK",
            },
            format="json",
        )
        self.assertEqual(res_break.status_code, status.HTTP_200_OK)
        self.assertEqual(res_break.data["status"], ChamberSessionStatus.PRAYER_BREAK)

    def test_targeted_validation_payment_and_arrival_invariance(self):
        from apps.appointments.models import Appointment, AppointmentStatus
        from apps.payments.models import Payment, PaymentMethod, PaymentStatus
        from django.utils import timezone

        # Setup an unpaid scheduled appointment
        patient = User.objects.create_user(
            email="patient_invariance@test.com",
            password="Pass123!Patient",
            first_name="Tariq",
            last_name="Hasan",
            role=UserRole.PATIENT,
        )
        apt = Appointment.objects.create(
            patient=patient,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=timezone.now().date(),
            appointment_time=timezone.now().time(),
            serial_number=10,
            status=AppointmentStatus.PENDING,
            amount=1000,
            is_arrived=False,
        )

        # Test A: Call Admin check-in (/appointments/<id>/checkin/)
        admin_ci_res = self.admin_client.post(f"/api/v1/appointments/{apt.id}/checkin/")
        self.assertEqual(admin_ci_res.status_code, status.HTTP_200_OK)
        apt.refresh_from_db()
        self.assertTrue(apt.is_arrived)
        first_arrived_at = apt.arrived_at
        self.assertEqual(apt.status, AppointmentStatus.CONFIRMED)
        self.assertEqual(Payment.objects.filter(appointment=apt).count(), 1)
        self.assertEqual(Payment.objects.get(appointment=apt).received_by, self.clinic_owner)

        # Test A (cont): Call Reception check-in on the SAME appointment (/clinics/reception/check-in/)
        rec_ci_res = self.reception_client.post(
            "/api/v1/clinics/reception/check-in/",
            {"appointment_id": str(apt.id)},
            format="json",
        )
        self.assertEqual(rec_ci_res.status_code, status.HTTP_200_OK)
        apt.refresh_from_db()
        self.assertTrue(apt.is_arrived)
        self.assertEqual(apt.status, AppointmentStatus.CONFIRMED)
        self.assertEqual(Payment.objects.filter(appointment=apt).count(), 1)

        # Test B: Call Reception cash-payment on already checked-in appointment (/clinics/reception/cash-payment/)
        rec_pay_res = self.reception_client.post(
            "/api/v1/clinics/reception/cash-payment/",
            {"appointment_id": str(apt.id), "amount": 1000},
            format="json",
        )
        self.assertEqual(rec_pay_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Payment.objects.filter(appointment=apt).count(), 1)

        # Test C: Call Reception cash-payment AGAIN on the same appointment
        rec_pay_res_2 = self.reception_client.post(
            "/api/v1/clinics/reception/cash-payment/",
            {"appointment_id": str(apt.id), "amount": 1000},
            format="json",
        )
        self.assertEqual(rec_pay_res_2.status_code, status.HTTP_200_OK)
        self.assertEqual(Payment.objects.filter(appointment=apt).count(), 1)

        # Test D: Walk-in creation then subsequent check-in/payment
        walkin_res = self.reception_client.post(
            "/api/v1/clinics/reception/walk-in/",
            {
                "doctor_id": str(self.doctor.id),
                "patient_name": "Invariance Walk-in",
                "patient_phone": "01788990011",
                "problem_description": "Checkup",
                "fee": 1000,
            },
            format="json",
        )
        self.assertEqual(walkin_res.status_code, status.HTTP_201_CREATED)
        walkin_apt_id = walkin_res.data["appointment_id"]
        walkin_apt = Appointment.objects.get(id=walkin_apt_id)
        self.assertEqual(Payment.objects.filter(appointment=walkin_apt).count(), 1)

        # Re-checkin walk-in via admin checkin endpoint
        admin_recheck = self.admin_client.post(f"/api/v1/appointments/{walkin_apt.id}/checkin/")
        self.assertEqual(admin_recheck.status_code, status.HTTP_200_OK)
        self.assertEqual(Payment.objects.filter(appointment=walkin_apt).count(), 1)

        # Re-payment walk-in via reception cash payment endpoint
        rec_repay = self.reception_client.post(
            "/api/v1/clinics/reception/cash-payment/",
            {"appointment_id": str(walkin_apt.id), "amount": 1000},
            format="json",
        )
        self.assertEqual(rec_repay.status_code, status.HTTP_200_OK)
        self.assertEqual(Payment.objects.filter(appointment=walkin_apt).count(), 1)
        self.assertEqual(walkin_apt.serial_number, walkin_res.data["serial_number"])


class StaffAttendanceRateTestCase(TestCase):
    def setUp(self):
        self.clinic_owner = User.objects.create_user(
            email="att_owner@clinic.com",
            password="Pass123!Owner",
            first_name="Clinic",
            last_name="Owner",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic = create_clinic(
            owner=self.clinic_owner,
            name="Attendance Test Clinic",
            address="100 Test Rd",
            city="Dhaka",
            phone="+8801700000000",
            email="att@testclinic.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.clinic_owner)

    def test_attendance_rate_scenarios(self):
        from apps.clinics.models import ClinicStaff, StaffAttendance
        from datetime import date

        staff = ClinicStaff.objects.create(
            clinic=self.clinic,
            name="Karim Ullah",
            role="RECEPTIONIST",
            phone="01711223344",
            monthly_salary=15000,
        )

        month_str = "2026-09"

        # Scenario 1: 0 attendance records -> attendance_rate must be None (not 100%)
        res = self.client.get(f"/api/v1/clinics/staff/monthly-summary/?month={month_str}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        staff_data = next(s for s in res.data["staff_summaries"] if s["staff_id"] == str(staff.id))
        self.assertEqual(staff_data["total_logged_days"], 0)
        self.assertIsNone(staff_data["attendance_rate"])

        # Scenario 2: All Present (5 days present) -> 100%
        for d in range(1, 6):
            StaffAttendance.objects.create(
                staff=staff,
                date=date(2026, 9, d),
                status="PRESENT",
            )
        res = self.client.get(f"/api/v1/clinics/staff/monthly-summary/?month={month_str}")
        staff_data = next(s for s in res.data["staff_summaries"] if s["staff_id"] == str(staff.id))
        self.assertEqual(staff_data["total_logged_days"], 5)
        self.assertEqual(staff_data["attendance_rate"], 100.0)

        # Scenario 3: Add 1 Late day (5 present, 1 late = 6 logged) -> 100.0%
        StaffAttendance.objects.create(
            staff=staff,
            date=date(2026, 9, 6),
            status="LATE",
        )
        res = self.client.get(f"/api/v1/clinics/staff/monthly-summary/?month={month_str}")
        staff_data = next(s for s in res.data["staff_summaries"] if s["staff_id"] == str(staff.id))
        self.assertEqual(staff_data["total_logged_days"], 6)
        self.assertEqual(staff_data["attendance_rate"], 100.0)

        # Scenario 4: Add 4 Absent days (5 present, 1 late, 4 absent = 10 logged) -> (5+1)/10 = 60.0%
        for d in range(7, 11):
            StaffAttendance.objects.create(
                staff=staff,
                date=date(2026, 9, d),
                status="ABSENT",
            )
        res = self.client.get(f"/api/v1/clinics/staff/monthly-summary/?month={month_str}")
        staff_data = next(s for s in res.data["staff_summaries"] if s["staff_id"] == str(staff.id))
        self.assertEqual(staff_data["total_logged_days"], 10)
        self.assertEqual(staff_data["attendance_rate"], 60.0)


class ClinicFinancialAnalyticsScenariosTestCase(TestCase):
    def setUp(self):
        from apps.doctors.models import Doctor, DoctorClinic
        from apps.appointments.models import Appointment, AppointmentStatus
        from apps.payments.models import Payment, PaymentMethod, PaymentStatus

        self.clinic_owner = User.objects.create_user(
            email="fin_owner@clinic.com",
            password="Pass123!Owner",
            first_name="Clinic",
            last_name="Owner",
            role=UserRole.CLINIC_ADMIN,
        )
        self.clinic = create_clinic(
            owner=self.clinic_owner,
            name="Finance Audit Hospital",
            address="200 Revenue St",
            city="Dhaka",
            phone="+8801711111111",
            email="finance@audithospital.com",
        )
        self.doc_user = User.objects.create_user(
            email="fin_doc@clinic.com",
            password="Pass123!Doc",
            first_name="Rahim",
            last_name="Chowdhury",
            role=UserRole.DOCTOR,
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Rahim Chowdhury",
            qualification="MBBS, FCPS",
        )
        self.mapping = DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=1000,
            is_active=True,
        )
        self.patient = User.objects.create_user(
            email="fin_patient@test.com",
            password="Pass123!Patient",
            first_name="Patient",
            last_name="One",
            role=UserRole.PATIENT,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.clinic_owner)

    def test_all_six_financial_scenarios(self):
        from apps.appointments.models import Appointment, AppointmentStatus
        from apps.payments.models import Payment, PaymentMethod, PaymentStatus
        from django.utils import timezone
        from datetime import time
        today = timezone.now().date()

        # Scenario 1: Confirmed + Paid Cash (1000)
        apt1 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=today, appointment_time=time(10, 0), serial_number=1,
            status=AppointmentStatus.CONFIRMED, amount=1000,
        )
        Payment.objects.create(
            appointment=apt1, amount=1000, payment_method=PaymentMethod.CASH,
            payment_status=PaymentStatus.COMPLETED,
        )

        # Scenario 2: Confirmed + Unpaid Cash (1000)
        apt2 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=today, appointment_time=time(10, 15), serial_number=2,
            status=AppointmentStatus.CONFIRMED, amount=1000,
        )
        Payment.objects.create(
            appointment=apt2, amount=1000, payment_method=PaymentMethod.CASH,
            payment_status=PaymentStatus.PENDING,
        )

        # Scenario 3: Completed + Paid Digital (SSLCommerz) (1000)
        apt3 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=today, appointment_time=time(10, 30), serial_number=3,
            status=AppointmentStatus.COMPLETED, amount=1000,
        )
        Payment.objects.create(
            appointment=apt3, amount=1000, payment_method=PaymentMethod.SSLCOMMERZ,
            payment_status=PaymentStatus.COMPLETED,
        )

        # Scenario 4: Cancelled + with payment record (1000)
        apt4 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=today, appointment_time=time(10, 45), serial_number=4,
            status=AppointmentStatus.CANCELLED, amount=1000,
        )
        Payment.objects.create(
            appointment=apt4, amount=1000, payment_method=PaymentMethod.CASH,
            payment_status=PaymentStatus.COMPLETED,
        )

        # Scenario 5: Pending appointment (1000)
        apt5 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=today, appointment_time=time(11, 0), serial_number=5,
            status=AppointmentStatus.PENDING, amount=1000,
        )

        # Scenario 6: Payment failure (1000)
        apt6 = Appointment.objects.create(
            patient=self.patient, clinic=self.clinic, doctor=self.doctor,
            appointment_date=today, appointment_time=time(11, 15), serial_number=6,
            status=AppointmentStatus.CONFIRMED, amount=1000,
        )
        Payment.objects.create(
            appointment=apt6, amount=1000, payment_method=PaymentMethod.SSLCOMMERZ,
            payment_status=PaymentStatus.FAILED,
        )

        # Query Financial Analytics Endpoint
        res = self.client.get(f"/api/v1/clinics/{self.clinic.id}/analytics/?range=today")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        summary = res.data["summary"]

        # Expected verifications:
        self.assertEqual(summary["today_cash_collected"], 1000.0)
        self.assertEqual(summary["today_digital_collected"], 1000.0)
        self.assertEqual(summary["today_gross_revenue"], 2000.0)
        self.assertEqual(summary["today_clinic_net_share"], 400.0)
        self.assertEqual(summary["today_doctors_total_payout"], 1600.0)
        self.assertEqual(summary["unpaid_pending_count"], 1)
        self.assertEqual(summary["unpaid_pending_amount"], 1000.0)

        # Doctor settlements list check
        doc_settlement = res.data["doctor_settlements"][0]
        self.assertEqual(doc_settlement["gross_collected"], 2000.0)
        self.assertEqual(doc_settlement["clinic_facility_cut"], 400.0)
        self.assertEqual(doc_settlement["doctor_net_payout"], 1600.0)
        self.assertEqual(doc_settlement["doctor_net_payout"] + doc_settlement["clinic_facility_cut"], doc_settlement["gross_collected"])



