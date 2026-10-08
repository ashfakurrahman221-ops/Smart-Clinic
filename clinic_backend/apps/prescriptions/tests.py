from datetime import date, time
from unittest.mock import patch
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole
from apps.clinics.models import Clinic
from apps.doctors.models import Doctor, DoctorClinic
from apps.appointments.models import Appointment
from .models import Medication, Prescription, PrescribedMedication, MedicalReport, ReportCategory
from .services import seed_dgda_medications_if_empty, create_or_update_prescription

User = get_user_model()

class PrescriptionsTestCase(TestCase):
    def setUp(self):
        self.doctor_user = User.objects.create_user(
            email="doctor@test.com", password="Pass123!Doctor", first_name="Gregory", last_name="House", role=UserRole.DOCTOR
        )
        self.patient_user = User.objects.create_user(
            email="patient@test.com", password="Pass123!Patient", first_name="John", last_name="Doe", role=UserRole.PATIENT
        )
        self.clinic_admin = User.objects.create_user(
            email="admin@clinic.com", password="Pass123!Admin", first_name="Clinic", last_name="Admin", role=UserRole.CLINIC_ADMIN
        )
        self.clinic = Clinic.objects.create(
            owner=self.clinic_admin, name="Popular Diagnostic", slug="popular-diagnostic", city="Dhaka", verification_status="VERIFIED"
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user, full_name="Gregory House", email="doctor@test.com", verification_status="VERIFIED"
        )
        self.doctor_clinic = DoctorClinic.objects.create(
            doctor=self.doctor, clinic=self.clinic, consultation_fee=1000, status="ACCEPTED", is_active=True
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=date.today(),
            appointment_time=time(10, 0),
            amount=1000
        )

    def test_dgda_medication_seeding(self):
        seed_dgda_medications_if_empty()
        self.assertTrue(Medication.objects.filter(brand_name="Napa").exists())

    def test_create_prescription(self):
        rx = create_or_update_prescription(
            appointment=self.appointment,
            doctor_user=self.doctor_user,
            diagnosis="Acute Viral Fever",
            vitals={"bp": "120/80", "temp": "101.2F"},
            diagnostic_tests="CBC, Blood Routine",
            advice="Rest and plenty of water",
            medications_data=[
                {"medication_name": "Tab. Napa 500mg", "dosage": "1 + 0 + 1", "timing": "After Meal", "duration": "5 Days"}
            ]
        )
        self.assertEqual(rx.diagnosis, "Acute Viral Fever")
        self.assertEqual(rx.medications.count(), 1)
        self.assertIsNotNone(rx.qr_token)

    def test_create_medical_report(self):
        from .models import MedicalReport, ReportCategory
        report = MedicalReport.objects.create(
            patient=self.patient_user,
            title="Complete Blood Count (CBC)",
            report_type=ReportCategory.BLOOD_TEST,
            diagnostic_center="Popular Diagnostic Center",
            test_date=date.today(),
            file_url="https://res.cloudinary.com/test/image/upload/sample_cbc.pdf",
            summary_notes="Hemoglobin 13.5 g/dL, WBC Normal"
        )
        self.assertEqual(report.title, "Complete Blood Count (CBC)")
        self.assertEqual(report.report_type, ReportCategory.BLOOD_TEST)
        self.assertEqual(MedicalReport.objects.filter(patient=self.patient_user).count(), 1)

    def test_medications_list_unauthenticated(self):
        """Public users can query the DGDA drug catalog without credentials."""
        from rest_framework.test import APIClient
        client = APIClient()  # Unauthenticated
        response = client.get('/api/v1/prescriptions/medications/')
        self.assertEqual(response.status_code, 200)
        data = response.data.get('data', response.data)
        self.assertTrue(len(data) > 0)


class PrescriptionSecurityTestCase(TestCase):
    """
    Phase 9A: Medical Data Access Control & IDOR Remediation Tests.
    Tests all 16 security assertions covering Prescription IDOR,
    Medical Report Cross-Tenant Isolation, Unauthorized Deletion, and QR Verification.
    """
    def setUp(self):
        from rest_framework.test import APIClient
        from .models import MedicalReport, ReportCategory

        self.client = APIClient()

        # Clinic A & Admin A
        self.clinic_admin_a = User.objects.create_user(
            email="admin_a@clinic.com", password="Pass123!Admin", first_name="Admin", last_name="A", role=UserRole.CLINIC_ADMIN
        )
        self.clinic_a = Clinic.objects.create(
            owner=self.clinic_admin_a, name="Clinic Alpha", slug="clinic-alpha", city="Dhaka", verification_status="VERIFIED"
        )

        # Clinic B & Admin B (Unrelated clinic)
        self.clinic_admin_b = User.objects.create_user(
            email="admin_b@clinic.com", password="Pass123!Admin", first_name="Admin", last_name="B", role=UserRole.CLINIC_ADMIN
        )
        self.clinic_b = Clinic.objects.create(
            owner=self.clinic_admin_b, name="Clinic Beta", slug="clinic-beta", city="Chittagong", verification_status="VERIFIED"
        )

        # Doctor A at Clinic A
        self.doctor_user_a = User.objects.create_user(
            email="doctor_a@clinic.com", password="Pass123!Doctor", first_name="Gregory", last_name="House", role=UserRole.DOCTOR
        )
        self.doctor_a = Doctor.objects.create(
            user=self.doctor_user_a, full_name="Gregory House", email="doctor_a@clinic.com", verification_status="VERIFIED"
        )
        DoctorClinic.objects.create(
            doctor=self.doctor_a, clinic=self.clinic_a, consultation_fee=1200, status="ACCEPTED", is_active=True
        )

        # Doctor B at Clinic B (Unrelated Doctor)
        self.doctor_user_b = User.objects.create_user(
            email="doctor_b@clinic.com", password="Pass123!Doctor", first_name="James", last_name="Wilson", role=UserRole.DOCTOR
        )
        self.doctor_b = Doctor.objects.create(
            user=self.doctor_user_b, full_name="James Wilson", email="doctor_b@clinic.com", verification_status="VERIFIED"
        )
        DoctorClinic.objects.create(
            doctor=self.doctor_b, clinic=self.clinic_b, consultation_fee=1500, status="ACCEPTED", is_active=True
        )

        # Receptionist at Clinic A
        self.receptionist_user = User.objects.create_user(
            email="reception@clinica.com", password="Pass123!Reception", first_name="Rita", last_name="FrontDesk", role=UserRole.RECEPTIONIST
        )

        # Patient 1 (Legitimate owner)
        self.patient_user_1 = User.objects.create_user(
            email="patient1@smartclinic.test", password="Pass123!Patient", first_name="Alice", last_name="Rahman", role=UserRole.PATIENT
        )

        # Patient 2 (Unrelated Patient)
        self.patient_user_2 = User.objects.create_user(
            email="patient2@smartclinic.test", password="Pass123!Patient", first_name="Bob", last_name="Karim", role=UserRole.PATIENT
        )

        # Appointment 1: Patient 1 with Doctor A at Clinic A
        self.appointment_1 = Appointment.objects.create(
            patient=self.patient_user_1,
            doctor=self.doctor_a,
            clinic=self.clinic_a,
            appointment_date=date.today(),
            appointment_time=time(10, 0),
            amount=1200
        )

        # Prescription 1 for Appointment 1
        self.rx_1 = create_or_update_prescription(
            appointment=self.appointment_1,
            doctor_user=self.doctor_user_a,
            diagnosis="Essential Hypertension",
            vitals={"bp": "140/90"},
            medications_data=[{"medication_name": "Tab. Bislol 5mg", "dosage": "1 + 0 + 0", "duration": "30 Days"}]
        )

        # Medical Report 1 (uploaded by Patient 1)
        self.report_1 = MedicalReport.objects.create(
            patient=self.patient_user_1,
            title="Lipid Profile Report",
            report_type=ReportCategory.BLOOD_TEST,
            diagnostic_center="Popular Diagnostic",
            test_date=date.today(),
            file_url="https://res.cloudinary.com/test/lipid.pdf",
            summary_notes="Cholesterol 220 mg/dL"
        )

        # Medical Report 2 (uploaded by Patient 2)
        self.report_2 = MedicalReport.objects.create(
            patient=self.patient_user_2,
            title="Chest X-Ray",
            report_type=ReportCategory.IMAGING,
            diagnostic_center="Ibn Sina",
            test_date=date.today(),
            file_url="https://res.cloudinary.com/test/xray.pdf",
            summary_notes="Clear lung fields"
        )

    # 1. Patient can read own prescription
    def test_patient_can_read_own_prescription(self):
        self.client.force_authenticate(user=self.patient_user_1)
        res = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertEqual(str(data['id']), str(self.rx_1.id))
        self.assertEqual(data['diagnosis'], "Essential Hypertension")

    # 2. Patient cannot read another patient's prescription (404)
    def test_patient_cannot_read_another_patient_prescription(self):
        self.client.force_authenticate(user=self.patient_user_2)
        res = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res.status_code, 404)

    # 3. Legitimate prescribing doctor can read prescription
    def test_prescribing_doctor_can_read_prescription(self):
        self.client.force_authenticate(user=self.doctor_user_a)
        res = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertEqual(str(data['id']), str(self.rx_1.id))

    # 4. Unrelated doctor cannot read prescription (404)
    def test_unrelated_doctor_cannot_read_prescription(self):
        self.client.force_authenticate(user=self.doctor_user_b)
        res = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res.status_code, 404)

    # 5. Cross-clinic access is rejected (Clinic B admin cannot read Clinic A's prescription)
    def test_cross_clinic_access_is_rejected(self):
        # Clinic Admin A (prescribing clinic) can view
        self.client.force_authenticate(user=self.clinic_admin_a)
        res_a = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res_a.status_code, 200)

        # Clinic Admin B (unrelated clinic) is rejected (404)
        self.client.force_authenticate(user=self.clinic_admin_b)
        res_b = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res_b.status_code, 404)

    # 6. Anonymous authenticated-detail access is rejected (401)
    def test_anonymous_authenticated_detail_access_is_rejected(self):
        self.client.logout()
        res = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res.status_code, 401)

    # Receptionist cannot read prescription detail
    def test_receptionist_cannot_read_prescription_detail(self):
        self.client.force_authenticate(user=self.receptionist_user)
        res = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res.status_code, 404)

    # 7. Patient can list own reports
    def test_patient_can_list_own_reports(self):
        self.client.force_authenticate(user=self.patient_user_1)
        res = self.client.get('/api/v1/prescriptions/reports/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        results = data.get('results', data) if isinstance(data, dict) else data
        report_ids = [str(r['id']) for r in results]
        self.assertIn(str(self.report_1.id), report_ids)
        self.assertNotIn(str(self.report_2.id), report_ids)

    # 8. Patient cannot list another patient's reports
    def test_patient_cannot_list_another_patient_reports(self):
        self.client.force_authenticate(user=self.patient_user_2)
        res = self.client.get('/api/v1/prescriptions/reports/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        results = data.get('results', data) if isinstance(data, dict) else data
        report_ids = [str(r['id']) for r in results]
        self.assertIn(str(self.report_2.id), report_ids)
        self.assertNotIn(str(self.report_1.id), report_ids)

    # 9. Doctor sees only legitimately related reports
    def test_doctor_sees_only_legitimately_related_reports(self):
        # Doctor A has treated Patient 1 -> can query Patient 1's reports
        self.client.force_authenticate(user=self.doctor_user_a)
        res = self.client.get(f'/api/v1/prescriptions/reports/?patient_id={self.patient_user_1.id}')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        results = data.get('results', data) if isinstance(data, dict) else data
        report_ids = [str(r['id']) for r in results]
        self.assertIn(str(self.report_1.id), report_ids)

    # 10. Unrelated doctor cannot read report
    def test_unrelated_doctor_cannot_read_report(self):
        # Doctor B has never treated Patient 1 -> list returns empty
        self.client.force_authenticate(user=self.doctor_user_b)
        res_list = self.client.get(f'/api/v1/prescriptions/reports/?patient_id={self.patient_user_1.id}')
        self.assertEqual(res_list.status_code, 200)
        data = res_list.data.get('data', res_list.data)
        results = data.get('results', data) if isinstance(data, dict) else data
        self.assertEqual(len(results), 0)

        # Doctor B cannot retrieve detail (404)
        res_detail = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/')
        self.assertEqual(res_detail.status_code, 404)

    # 11. Clinic-A admin cannot read Clinic-B protected data
    def test_cross_clinic_admin_cannot_read_protected_data(self):
        # Clinic Admin B (no appointment with Patient 1) cannot list Patient 1's reports
        self.client.force_authenticate(user=self.clinic_admin_b)
        res_list = self.client.get(f'/api/v1/prescriptions/reports/?patient_id={self.patient_user_1.id}')
        self.assertEqual(res_list.status_code, 200)
        data = res_list.data.get('data', res_list.data)
        results = data.get('results', data) if isinstance(data, dict) else data
        self.assertEqual(len(results), 0)

        # Clinic Admin B cannot retrieve detail (404)
        res_detail = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/')
        self.assertEqual(res_detail.status_code, 404)

    # 12. Unauthorized doctor cannot delete report
    def test_unauthorized_doctor_cannot_delete_report(self):
        # Unrelated Doctor B cannot delete (404)
        self.client.force_authenticate(user=self.doctor_user_b)
        res_b = self.client.delete(f'/api/v1/prescriptions/reports/{self.report_1.id}/')
        self.assertEqual(res_b.status_code, 404)
        self.assertTrue(MedicalReport.objects.filter(id=self.report_1.id).exists())

        # Legitimate Doctor A (can read, but cannot delete -> 403)
        self.client.force_authenticate(user=self.doctor_user_a)
        res_a = self.client.delete(f'/api/v1/prescriptions/reports/{self.report_1.id}/')
        self.assertEqual(res_a.status_code, 403)
        self.assertTrue(MedicalReport.objects.filter(id=self.report_1.id).exists())

    # 13. Unauthorized clinic admin cannot delete report
    def test_unauthorized_clinic_admin_cannot_delete_report(self):
        # Unrelated Clinic Admin B cannot delete (404)
        self.client.force_authenticate(user=self.clinic_admin_b)
        res_b = self.client.delete(f'/api/v1/prescriptions/reports/{self.report_1.id}/')
        self.assertEqual(res_b.status_code, 404)
        self.assertTrue(MedicalReport.objects.filter(id=self.report_1.id).exists())

        # Associated Clinic Admin A (can read, but cannot delete -> 403)
        self.client.force_authenticate(user=self.clinic_admin_a)
        res_a = self.client.delete(f'/api/v1/prescriptions/reports/{self.report_1.id}/')
        self.assertEqual(res_a.status_code, 403)
        self.assertTrue(MedicalReport.objects.filter(id=self.report_1.id).exists())

    # 14. Legitimate owner deletion behavior remains correct
    def test_legitimate_owner_deletion_behavior_remains_correct(self):
        self.client.force_authenticate(user=self.patient_user_1)
        res = self.client.delete(f'/api/v1/prescriptions/reports/{self.report_1.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(MedicalReport.objects.filter(id=self.report_1.id).exists())

    # 15. Query without patient_id never returns global data
    def test_query_without_patient_id_never_returns_global_data(self):
        # Doctor querying without patient_id gets empty list
        self.client.force_authenticate(user=self.doctor_user_a)
        res_doc = self.client.get('/api/v1/prescriptions/reports/')
        self.assertEqual(res_doc.status_code, 200)
        data_doc = res_doc.data.get('data', res_doc.data)
        results_doc = data_doc.get('results', data_doc) if isinstance(data_doc, dict) else data_doc
        self.assertEqual(len(results_doc), 0)

        # Clinic Admin querying without patient_id gets empty list
        self.client.force_authenticate(user=self.clinic_admin_a)
        res_adm = self.client.get('/api/v1/prescriptions/reports/')
        self.assertEqual(res_adm.status_code, 200)
        data_adm = res_adm.data.get('data', res_adm.data)
        results_adm = data_adm.get('results', data_adm) if isinstance(data_adm, dict) else data_adm
        self.assertEqual(len(results_adm), 0)

    # 16. Existing public prescription QR verification still works
    def test_public_prescription_qr_verification_still_works(self):
        self.client.logout()  # Unauthenticated
        res = self.client.get(f'/api/v1/prescriptions/verify/{self.rx_1.qr_token}/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertTrue(data['is_valid'])
        self.assertEqual(data['verification_message'], "Official Digital E-Prescription Verified")
        self.assertEqual(str(data['prescription']['id']), str(self.rx_1.id))

    # ====================================================
    # PHASE 9A.1: CLINIC ADMIN & QR SECURITY CLOSURE TESTS
    # ====================================================

    # 1. Same-clinic Clinic Admin can create/update prescription
    def test_same_clinic_admin_can_issue_prescription(self):
        apt = Appointment.objects.create(
            patient=self.patient_user_1,
            doctor=self.doctor_a,
            clinic=self.clinic_a,
            appointment_date=date.today(),
            appointment_time=time(11, 0),
            amount=1200
        )
        self.client.force_authenticate(user=self.clinic_admin_a)
        payload = {
            "appointment_id": str(apt.id),
            "diagnosis": "Seasonal Influenza",
            "vitals": {"bp": "115/75"},
            "medications": [
                {"medication_name": "Napa 500mg", "dosage": "1+0+1", "duration": "3 days"}
            ]
        }
        res = self.client.post('/api/v1/prescriptions/', data=payload, format='json')
        self.assertEqual(res.status_code, 201)
        data = res.data.get('data', res.data)
        self.assertEqual(data['diagnosis'], "Seasonal Influenza")
        self.assertTrue(Prescription.objects.filter(appointment=apt).exists())

    # 2. Cross-clinic Clinic Admin receives 403 and prescription is unchanged
    def test_cross_clinic_admin_cannot_create_or_modify_prescription(self):
        self.client.force_authenticate(user=self.clinic_admin_b)
        original_diagnosis = self.rx_1.diagnosis
        payload = {
            "appointment_id": str(self.appointment_1.id),
            "diagnosis": "Tampered By Malicious Cross Clinic Admin",
            "medications": [{"medication_name": "Wrong Med", "dosage": "3 times"}]
        }
        res = self.client.post('/api/v1/prescriptions/', data=payload, format='json')
        self.assertEqual(res.status_code, 403)
        self.rx_1.refresh_from_db()
        self.assertEqual(self.rx_1.diagnosis, original_diagnosis)

    # 3. Unrelated doctor cannot create/update prescription (receives 403)
    def test_unrelated_doctor_cannot_issue_prescription(self):
        self.client.force_authenticate(user=self.doctor_user_b)
        original_diagnosis = self.rx_1.diagnosis
        payload = {
            "appointment_id": str(self.appointment_1.id),
            "diagnosis": "Tampered By Unrelated Doctor",
            "medications": []
        }
        res = self.client.post('/api/v1/prescriptions/', data=payload, format='json')
        self.assertEqual(res.status_code, 403)
        self.rx_1.refresh_from_db()
        self.assertEqual(self.rx_1.diagnosis, original_diagnosis)

    # 4. Patient cannot create/update prescription (receives 403)
    def test_patient_cannot_issue_prescription(self):
        self.client.force_authenticate(user=self.patient_user_1)
        payload = {
            "appointment_id": str(self.appointment_1.id),
            "diagnosis": "Self-diagnosed prescription",
            "medications": [{"medication_name": "Controlled Med", "dosage": "Daily"}]
        }
        res = self.client.post('/api/v1/prescriptions/', data=payload, format='json')
        self.assertEqual(res.status_code, 403)

    # 5. Receptionist cannot create/update prescription (receives 403)
    def test_receptionist_cannot_issue_prescription(self):
        self.client.force_authenticate(user=self.receptionist_user)
        payload = {
            "appointment_id": str(self.appointment_1.id),
            "diagnosis": "Receptionist note",
            "medications": []
        }
        res = self.client.post('/api/v1/prescriptions/', data=payload, format='json')
        self.assertEqual(res.status_code, 403)

    # 6. Direct forged appointment ID cannot bypass tenant isolation
    def test_forged_appointment_id_cannot_bypass_isolation(self):
        import uuid
        self.client.force_authenticate(user=self.clinic_admin_a)
        # Non-existent forged appointment ID -> 404
        payload_nonexistent = {
            "appointment_id": str(uuid.uuid4()),
            "diagnosis": "Forged Nonexistent",
            "medications": []
        }
        res_nonexistent = self.client.post('/api/v1/prescriptions/', data=payload_nonexistent, format='json')
        self.assertEqual(res_nonexistent.status_code, 404)

        # Forged appointment ID belonging to Clinic B attempted by Clinic Admin A -> 403
        apt_b = Appointment.objects.create(
            patient=self.patient_user_2,
            doctor=self.doctor_b,
            clinic=self.clinic_b,
            appointment_date=date.today(),
            appointment_time=time(14, 0),
            amount=1500
        )
        payload_foreign = {
            "appointment_id": str(apt_b.id),
            "diagnosis": "Admin A tampering Clinic B appointment",
            "medications": []
        }
        res_foreign = self.client.post('/api/v1/prescriptions/', data=payload_foreign, format='json')
        self.assertEqual(res_foreign.status_code, 403)

    # 7. Anonymous user with valid QR token receives 200, verifies authenticity & dispensing info
    def test_qr_verification_anonymous_success_and_required_data(self):
        self.client.logout()  # Anonymous
        res = self.client.get(f'/api/v1/prescriptions/verify/{self.rx_1.qr_token}/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertTrue(data['is_valid'])
        self.assertEqual(data['verification_message'], "Official Digital E-Prescription Verified")

        rx_data = data['prescription']
        self.assertEqual(str(rx_data['id']), str(self.rx_1.id))
        self.assertEqual(str(rx_data['qr_token']), str(self.rx_1.qr_token))
        self.assertEqual(rx_data['clinic_name'], self.clinic_a.name)

        # Doctor verification fields
        self.assertEqual(rx_data['doctor']['full_name'], self.doctor_a.full_name)
        self.assertIn('qualification', rx_data['doctor'])

        # Medication dispensing fields
        self.assertTrue(len(rx_data['medications']) > 0)
        med = rx_data['medications'][0]
        self.assertEqual(med['medication_name'], "Tab. Bislol 5mg")
        self.assertEqual(med['dosage'], "1 + 0 + 0")
        self.assertEqual(med['duration'], "30 Days")

    # 8. Anonymous QR verification does NOT leak patient phone, email, or UserSerializer
    def test_qr_verification_does_not_leak_patient_contact_or_user_object(self):
        self.client.logout()  # Anonymous
        res = self.client.get(f'/api/v1/prescriptions/verify/{self.rx_1.qr_token}/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        rx_data = data['prescription']

        # Patient object must be minimized
        patient_obj = rx_data.get('patient')
        self.assertIsNotNone(patient_obj)
        self.assertNotIn('phone', patient_obj)
        self.assertNotIn('email', patient_obj)
        self.assertNotIn('password', patient_obj)
        self.assertNotIn('id', patient_obj)
        self.assertNotIn('role', patient_obj)
        self.assertNotIn('is_staff', patient_obj)
        self.assertNotIn('is_superuser', patient_obj)

        # Raw response text must not contain patient phone or email anywhere
        res_str = str(res.content)
        self.assertNotIn(self.patient_user_1.email, res_str)
        if self.patient_user_1.phone:
            self.assertNotIn(self.patient_user_1.phone, res_str)

    # 9. Anonymous QR verification does NOT leak sensitive clinical or internal fields
    def test_qr_verification_does_not_leak_sensitive_clinical_or_internal_fields(self):
        self.client.logout()  # Anonymous
        res = self.client.get(f'/api/v1/prescriptions/verify/{self.rx_1.qr_token}/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        rx_data = data['prescription']

        # Sensitive clinical fields must be excluded
        self.assertNotIn('diagnosis', rx_data)
        self.assertNotIn('vitals', rx_data)
        self.assertNotIn('diagnostic_tests', rx_data)
        self.assertNotIn('advice', rx_data)
        self.assertNotIn('problem_description', rx_data)
        self.assertNotIn('emergency_reason', rx_data)
        self.assertNotIn('updated_at', rx_data)

        # Doctor private contact info must be excluded
        doctor_obj = rx_data.get('doctor')
        self.assertNotIn('email', doctor_obj)
        self.assertNotIn('phone', doctor_obj)
        self.assertNotIn('avatar_url', doctor_obj)
        self.assertNotIn('certificate_url', doctor_obj)

    # 10. Invalid or random QR token returns 404
    def test_qr_verification_invalid_or_random_token_returns_404(self):
        self.client.logout()
        # Random valid UUID that does not exist
        res_random_uuid = self.client.get('/api/v1/prescriptions/verify/99999999-9999-9999-9999-999999999999/')
        self.assertEqual(res_random_uuid.status_code, 404)
        data_random = res_random_uuid.data.get('data', res_random_uuid.data)
        self.assertFalse(data_random['is_valid'])

        # Arbitrary non-UUID string
        res_invalid_str = self.client.get('/api/v1/prescriptions/verify/not-a-valid-token-string/')
        self.assertEqual(res_invalid_str.status_code, 404)
        data_invalid = res_invalid_str.data.get('data', res_invalid_str.data)
        self.assertFalse(data_invalid['is_valid'])

    # 11. Existing authenticated prescription views remain unchanged
    def test_authenticated_prescription_detail_preserves_full_clinical_data(self):
        # Authenticated patient receives full clinical details
        self.client.force_authenticate(user=self.patient_user_1)
        res = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertEqual(data['diagnosis'], "Essential Hypertension")
        self.assertEqual(data['vitals'], {"bp": "140/90"})
        self.assertIn('doctor', data)
        self.assertIn('patient', data)
        self.assertEqual(data['patient']['email'], self.patient_user_1.email)

        # Authenticated treating doctor receives full clinical details
        self.client.force_authenticate(user=self.doctor_user_a)
        res_doc = self.client.get(f'/api/v1/prescriptions/{self.rx_1.id}/')
        self.assertEqual(res_doc.status_code, 200)
        data_doc = res_doc.data.get('data', res_doc.data)
        self.assertEqual(data_doc['diagnosis'], "Essential Hypertension")
        self.assertEqual(data_doc['vitals'], {"bp": "140/90"})


class MedicalReportAccessSecurityTestCase(PrescriptionSecurityTestCase):
    """
    TASK 5: Private Medical File Access Hardening Verification.
    Tests all 16 required security invariants covering object authorization,
    serializer sanitization, Cloudinary signed URLs, and public boundary isolation.
    """

    # 1. Patient can access own report
    def test_1_patient_can_access_own_report(self):
        self.client.force_authenticate(user=self.patient_user_1)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertIn('access_url', data)
        self.assertIn('expires_in', data)
        self.assertEqual(data['title'], self.report_1.title)
        self.assertEqual(res.headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate, private')

    # 2. Patient cannot access another patient's report
    def test_2_patient_cannot_access_another_patient_report(self):
        self.client.force_authenticate(user=self.patient_user_2)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 403)
        data = res.data.get('data', res.data)
        self.assertIsNone(data.get('access_url'))

    # 3. Cross-clinic patient access rejected
    def test_3_cross_clinic_patient_access_rejected(self):
        self.client.force_authenticate(user=self.patient_user_2)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 403)

    # 4. Authorized treating doctor can access when legitimate relationship exists
    def test_4_authorized_treating_doctor_can_access_report(self):
        # Doctor A has an appointment with Patient 1 -> permitted
        self.client.force_authenticate(user=self.doctor_user_a)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertIn('access_url', data)
        self.assertEqual(data['expires_in'], 300)

    # 5. Unrelated doctor cannot access report
    def test_5_unrelated_doctor_cannot_access_report(self):
        # Doctor B has no appointment relationship with Patient 1 -> 403
        self.client.force_authenticate(user=self.doctor_user_b)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 403)
        data = res.data.get('data', res.data)
        self.assertIsNone(data.get('access_url'))

    # 6. Cross-clinic doctor access rejected
    def test_6_cross_clinic_doctor_access_rejected(self):
        # Doctor B belongs to Clinic B -> rejected from Clinic A patient report
        self.client.force_authenticate(user=self.doctor_user_b)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 403)

    # 7. Receptionist denied unless an existing explicit requirement proves otherwise
    def test_7_receptionist_denied_document_access(self):
        self.client.force_authenticate(user=self.receptionist_user)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 403)

    # 8. Clinic admin denied unless existing policy explicitly permits it
    def test_8_clinic_admin_denied_document_access(self):
        # Clinic Admin A (same clinic) -> Denied clinical file access
        self.client.force_authenticate(user=self.clinic_admin_a)
        res_a = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res_a.status_code, 403)

        # Clinic Admin B (other clinic) -> Denied
        self.client.force_authenticate(user=self.clinic_admin_b)
        res_b = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res_b.status_code, 403)

    # 9. Anonymous user denied
    def test_9_anonymous_user_denied_access(self):
        self.client.logout()
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 401)

    # 10. Invalid/nonexistent report does not leak sensitive information
    def test_10_invalid_or_nonexistent_report_does_not_leak_sensitive_info(self):
        self.client.force_authenticate(user=self.patient_user_1)
        res = self.client.get('/api/v1/prescriptions/reports/00000000-0000-0000-0000-000000000000/access/')
        self.assertEqual(res.status_code, 404)

    # 11. Serializer no longer exposes permanent confidential public URL
    def test_11_serializer_no_longer_exposes_permanent_confidential_public_url(self):
        self.client.force_authenticate(user=self.patient_user_1)
        # Detail endpoint
        res_detail = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/')
        self.assertEqual(res_detail.status_code, 200)
        detail_data = res_detail.data.get('data', res_detail.data)
        self.assertNotIn('file_url', detail_data)
        self.assertIn('access_url', detail_data)
        self.assertEqual(detail_data['access_url'], f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')

        # List endpoint
        res_list = self.client.get('/api/v1/prescriptions/reports/')
        self.assertEqual(res_list.status_code, 200)
        list_data = res_list.data.get('data', res_list.data)
        results = list_data.get('results', list_data) if isinstance(list_data, dict) else list_data
        for r in results:
            self.assertNotIn('file_url', r)
            self.assertIn('access_url', r)

    # 12. Authorized access mechanism returns expected contract
    def test_12_authorized_access_mechanism_returns_expected_contract(self):
        self.client.force_authenticate(user=self.patient_user_1)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertIn('access_url', data)
        self.assertEqual(data['expires_in'], 300)
        self.assertEqual(data['filename'], 'Lipid_Profile_Report.pdf')
        self.assertEqual(data['title'], 'Lipid Profile Report')

    # 13. Unauthorized request cannot obtain signed/protected URL
    def test_13_unauthorized_request_cannot_obtain_signed_url(self):
        self.client.force_authenticate(user=self.patient_user_2)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 403)
        self.assertNotIn('access_url', str(res.data))

    # 14. Expiry behavior works if signed URLs are used
    def test_14_expiry_behavior_in_signed_url(self):
        self.client.force_authenticate(user=self.patient_user_1)
        res = self.client.get(f'/api/v1/prescriptions/reports/{self.report_1.id}/access/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertEqual(data['expires_in'], 300)
        # Verify access URL includes signature or expiration query
        self.assertTrue('signature=' in data['access_url'] or 'expires' in data['access_url'])

    # 15. Public prescription verification still works
    def test_15_public_prescription_verification_still_works(self):
        self.client.logout()
        res = self.client.get(f'/api/v1/prescriptions/verify/{self.rx_1.qr_token}/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        self.assertTrue(data['is_valid'])
        self.assertNotIn('medical_reports', data['prescription'])
        self.assertNotIn('file_url', str(data))

    # 16. Clinic logo/doctor photo behavior remains unaffected
    def test_16_clinic_logo_and_doctor_photo_behavior_remains_unaffected(self):
        from apps.common.utils import CloudinaryStorageService
        url = CloudinaryStorageService.upload_image(None, folder="logos")
        self.assertTrue("/logos/" in url or "clinic_platform/logos" in url)


class MedicalReportMigrationCommandTestCase(TestCase):
    """
    TASK 5B: Historical Medical Asset Migration Safety Tests.
    Verifies that the management command defaults to dry-run, never mutates
    without --execute, is strictly idempotent, handles failures per-report,
    redacts all sensitive identifiers/secrets from stdout, and skips already-secure assets.
    """
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient.migration@smartclinic.test",
            password="Pass123!Patient",
            first_name="Rahim",
            last_name="Uddin",
            role=UserRole.PATIENT
        )

    # 1. Default execution is dry-run
    def test_1_default_execution_is_dry_run(self):
        import io
        from django.core.management import call_command
        from unittest.mock import patch

        out = io.StringIO()
        with patch('cloudinary.uploader.rename') as mock_rename:
            call_command('migrate_legacy_medical_reports', stdout=out)
            mock_rename.assert_not_called()

        output = out.getvalue()
        self.assertIn("MODE: DRY-RUN (AUDIT ONLY - NO MUTATIONS)", output)
        self.assertIn("[DRY RUN COMPLETED]", output)

    # 2. Dry-run performs zero Cloudinary mutation
    def test_2_dry_run_performs_zero_cloudinary_mutation(self):
        from django.core.management import call_command
        from unittest.mock import patch

        orig_url = "https://res.cloudinary.com/test/image/upload/sample_legacy.pdf"
        report = MedicalReport.objects.create(
            patient=self.patient,
            title="Old Blood Report",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url=orig_url
        )

        with patch('cloudinary.uploader.rename') as mock_rename:
            call_command('migrate_legacy_medical_reports')
            mock_rename.assert_not_called()

        report.refresh_from_db()
        self.assertEqual(report.file_url, orig_url)

    # 3. Legacy public report is detected
    def test_3_legacy_public_report_is_detected(self):
        import io
        from django.core.management import call_command

        MedicalReport.objects.create(
            patient=self.patient,
            title="Public CBC",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url="https://res.cloudinary.com/test/image/upload/cbc_legacy.pdf"
        )

        out = io.StringIO()
        call_command('migrate_legacy_medical_reports', stdout=out)
        output = out.getvalue()
        self.assertIn("Legacy Public:  1", output)

    # 4. Authenticated report is skipped
    def test_4_authenticated_report_is_skipped(self):
        import io
        from django.core.management import call_command

        MedicalReport.objects.create(
            patient=self.patient,
            title="Secure CBC",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url="https://res.cloudinary.com/test/image/authenticated/s--xyz--/cbc_secure.pdf"
        )

        out = io.StringIO()
        call_command('migrate_legacy_medical_reports', stdout=out)
        output = out.getvalue()
        self.assertIn("Already Secure: 1", output)
        self.assertIn("Legacy Public:  0", output)

    # 5. Non-Cloudinary URL is handled safely
    def test_5_non_cloudinary_url_is_handled_safely(self):
        import io
        from django.core.management import call_command

        MedicalReport.objects.create(
            patient=self.patient,
            title="Local File",
            report_type=ReportCategory.OTHER,
            test_date=date.today(),
            file_url="/media/uploads/medical_reports/local.pdf"
        )

        out = io.StringIO()
        call_command('migrate_legacy_medical_reports', stdout=out)
        output = out.getvalue()
        self.assertIn("Unrecognized:   1", output)
        self.assertIn("Failed:         0", output)

    # 6. Malformed URL does not crash migration
    def test_6_malformed_url_does_not_crash_migration(self):
        import io
        from django.core.management import call_command

        MedicalReport.objects.create(
            patient=self.patient,
            title="Malformed",
            report_type=ReportCategory.OTHER,
            test_date=date.today(),
            file_url="broken://@@@@invalid-url"
        )

        out = io.StringIO()
        call_command('migrate_legacy_medical_reports', stdout=out)
        output = out.getvalue()
        self.assertIn("Unrecognized:   1", output)

    # 7. Successful migration updates DB only after remote success
    def test_7_successful_migration_updates_db_only_after_remote_success(self):
        from django.core.management import call_command
        from unittest.mock import patch

        report = MedicalReport.objects.create(
            patient=self.patient,
            title="Migrate Me",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url="https://res.cloudinary.com/test/image/upload/sample_legacy.pdf"
        )

        new_url = "https://res.cloudinary.com/test/image/authenticated/s--new--/sample_legacy.pdf"
        with patch('cloudinary.uploader.rename') as mock_rename:
            mock_rename.return_value = {
                'type': 'authenticated',
                'secure_url': new_url,
                'public_id': 'sample_legacy'
            }
            call_command('migrate_legacy_medical_reports', execute=True)
            mock_rename.assert_called_once()

        report.refresh_from_db()
        self.assertEqual(report.file_url, new_url)

    # 8. Remote failure preserves original DB value
    def test_8_remote_failure_preserves_original_db_value(self):
        from django.core.management import call_command
        from unittest.mock import patch

        orig_url = "https://res.cloudinary.com/test/image/upload/sample_legacy.pdf"
        report = MedicalReport.objects.create(
            patient=self.patient,
            title="Fail Me",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url=orig_url
        )

        with patch('cloudinary.uploader.rename') as mock_rename:
            mock_rename.side_effect = Exception("Cloudinary remote connection error")
            call_command('migrate_legacy_medical_reports', execute=True)

        report.refresh_from_db()
        self.assertEqual(report.file_url, orig_url)

    # 9. Re-running successful migration is idempotent
    def test_9_rerunning_successful_migration_is_idempotent(self):
        from django.core.management import call_command
        from unittest.mock import patch

        report = MedicalReport.objects.create(
            patient=self.patient,
            title="Idempotent Test",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url="https://res.cloudinary.com/test/image/upload/sample_legacy.pdf"
        )

        new_url = "https://res.cloudinary.com/test/image/authenticated/s--new--/sample_legacy.pdf"
        with patch('cloudinary.uploader.rename') as mock_rename:
            mock_rename.return_value = {
                'type': 'authenticated',
                'secure_url': new_url
            }
            # First pass: migrates
            call_command('migrate_legacy_medical_reports', execute=True)
            self.assertEqual(mock_rename.call_count, 1)

            # Second pass: already secure, must skip
            mock_rename.reset_mock()
            call_command('migrate_legacy_medical_reports', execute=True)
            mock_rename.assert_not_called()

        report.refresh_from_db()
        self.assertEqual(report.file_url, new_url)

    # 10. Unrelated clinic logos and doctor avatars are never processed
    def test_10_unrelated_clinic_logos_and_doctor_avatars_never_processed(self):
        import io
        from django.core.management import call_command

        # Clinic with public logo
        Clinic.objects.create(
            owner=self.patient,
            name="Clinic Gamma",
            slug="clinic-gamma",
            city="Dhaka",
            verification_status="VERIFIED",
            logo_url="https://res.cloudinary.com/test/image/upload/clinic_logo.png"
        )
        # Doctor with public avatar
        Doctor.objects.create(
            user=self.patient,
            full_name="Dr. Gamma",
            email="gamma@test.com",
            verification_status="VERIFIED",
            avatar_url="https://res.cloudinary.com/test/image/upload/doctor_avatar.png"
        )

        out = io.StringIO()
        call_command('migrate_legacy_medical_reports', execute=True, stdout=out)
        output = out.getvalue()
        # No medical reports exist, so scanned is 0
        self.assertIn("Scanned:        0", output)

    # 11. No secrets or full sensitive URLs appear in command output
    def test_11_no_secrets_or_full_sensitive_urls_in_command_output(self):
        import io
        from django.core.management import call_command

        full_url = "https://res.cloudinary.com/test/image/upload/confidential_patient_file.pdf"
        MedicalReport.objects.create(
            patient=self.patient,
            title="Confidential Lab",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url=full_url
        )

        out = io.StringIO()
        call_command('migrate_legacy_medical_reports', stdout=out)
        output = out.getvalue()

        self.assertNotIn(full_url, output)
        self.assertNotIn("CLOUDINARY_API_SECRET", output)
        self.assertNotIn("secret", output.lower())

    # 12. Partial batch failure does not corrupt other records
    def test_12_partial_batch_failure_does_not_corrupt_other_records(self):
        from django.core.management import call_command
        from unittest.mock import patch

        rep1_orig = "https://res.cloudinary.com/test/image/upload/fail_me.pdf"
        rep2_orig = "https://res.cloudinary.com/test/image/upload/success_me.pdf"

        rep1 = MedicalReport.objects.create(
            patient=self.patient,
            title="Failing Report",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url=rep1_orig
        )
        rep2 = MedicalReport.objects.create(
            patient=self.patient,
            title="Succeeding Report",
            report_type=ReportCategory.BLOOD_TEST,
            test_date=date.today(),
            file_url=rep2_orig
        )

        def rename_side_effect(from_public_id, **kwargs):
            if "fail_me" in from_public_id:
                raise ValueError("Simulated Cloudinary connection timeout")
            return {
                'type': 'authenticated',
                'secure_url': f"https://res.cloudinary.com/test/image/authenticated/s--ok--/{from_public_id}.pdf"
            }

        with patch('cloudinary.uploader.rename', side_effect=rename_side_effect):
            call_command('migrate_legacy_medical_reports', execute=True)

        rep1.refresh_from_db()
        rep2.refresh_from_db()

        self.assertEqual(rep1.file_url, rep1_orig)
        self.assertIn("/authenticated/", rep2.file_url)


class MedicalReportDeviceUploadTestCase(PrescriptionSecurityTestCase):
    """
    TASK 7 (DEF-01): Physical Medical Report Upload Tests.
    Covers all 12 assertions required by Requirement 16:
    1. Valid PDF file upload succeeds with 201 Created and saves report.
    2. Valid JPEG/PNG file upload succeeds with 201 Created.
    3. Unauthenticated upload request rejected with 401 Unauthorized.
    4. Invalid file extension (.exe, .js, .html, .svg) rejected with 400 Bad Request.
    5. Oversized file (>10MB) rejected with 400 Bad Request.
    6. Empty file (0 bytes) rejected with 400 Bad Request.
    7. Cloudinary upload failure does not create a database record (0 rows created, 400 returned).
    8. Upload uses Cloudinary authenticated upload helper (type="authenticated").
    9. Serializer response does NOT expose raw file_url, only access_url.
    10. access_url endpoint generates signed delivery URL for the newly uploaded file.
    11. Cross-patient isolation: another patient cannot access the uploaded report via /access/.
    12. Treating doctor with appointment can access the uploaded report via /access/.
    """

    def setUp(self):
        super().setUp()
        self.valid_pdf_content = b"%PDF-1.4\n%test\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        self.valid_jpeg_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"
        self.valid_png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"

    # 1. Valid PDF file upload succeeds with 201 Created and saves report
    @patch('cloudinary.uploader.upload')
    def test_01_valid_pdf_file_upload_succeeds(self, mock_upload):
        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/image/authenticated/s--signed--/v1/clinic_platform/medical_reports/report1.pdf'
        }
        self.client.force_authenticate(user=self.patient_user_1)
        pdf_file = SimpleUploadedFile("cbc_test.pdf", self.valid_pdf_content, content_type="application/pdf")
        data = {
            'title': 'Complete Blood Count',
            'report_type': ReportCategory.BLOOD_TEST,
            'diagnostic_center': 'Popular Diagnostic Center',
            'test_date': date.today(),
            'file': pdf_file,
            'summary_notes': 'Normal range hemoglobin'
        }
        res = self.client.post('/api/v1/prescriptions/reports/', data, format='multipart')
        self.assertEqual(res.status_code, 201)
        res_data = res.data.get('data', res.data)
        self.assertIn('access_url', res_data)
        self.assertEqual(res_data['title'], 'Complete Blood Count')
        self.assertTrue(MedicalReport.objects.filter(title='Complete Blood Count', patient=self.patient_user_1).exists())

    # 2. Valid JPEG/PNG file upload succeeds with 201 Created
    @patch('cloudinary.uploader.upload')
    def test_02_valid_jpeg_and_png_file_upload_succeeds(self, mock_upload):
        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/image/authenticated/s--signed--/v1/clinic_platform/medical_reports/scan.jpg'
        }
        self.client.force_authenticate(user=self.patient_user_1)
        jpg_file = SimpleUploadedFile("scan.jpg", self.valid_jpeg_content, content_type="image/jpeg")
        res_jpg = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Chest Ultrasound Scan',
            'report_type': ReportCategory.IMAGING,
            'diagnostic_center': 'Ibn Sina',
            'test_date': date.today(),
            'file': jpg_file
        }, format='multipart')
        self.assertEqual(res_jpg.status_code, 201)

        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/image/authenticated/s--signed--/v1/clinic_platform/medical_reports/xray.png'
        }
        png_file = SimpleUploadedFile("xray.png", self.valid_png_content, content_type="image/png")
        res_png = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Knee X-Ray',
            'report_type': ReportCategory.IMAGING,
            'diagnostic_center': 'Labaid',
            'test_date': date.today(),
            'file': png_file
        }, format='multipart')
        self.assertEqual(res_png.status_code, 201)

    # 3. Unauthenticated upload request rejected with 401 Unauthorized
    def test_03_unauthenticated_upload_request_rejected(self):
        pdf_file = SimpleUploadedFile("cbc.pdf", self.valid_pdf_content, content_type="application/pdf")
        res = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Unauthenticated Report',
            'report_type': ReportCategory.BLOOD_TEST,
            'test_date': date.today(),
            'file': pdf_file
        }, format='multipart')
        self.assertEqual(res.status_code, 401)

    # 4. Invalid file extension (.exe, .js, .html, .svg) rejected with 400 Bad Request
    def test_04_invalid_file_extension_rejected(self):
        self.client.force_authenticate(user=self.patient_user_1)
        for bad_name, bad_content, bad_type in [
            ("script.js", b"console.log('exploit')", "text/javascript"),
            ("malware.exe", b"\x4d\x5a\x90\x00binary", "application/x-msdownload"),
            ("page.html", b"<html><body>xss</body></html>", "text/html"),
            ("vector.svg", b"<svg></svg>", "image/svg+xml"),
        ]:
            bad_file = SimpleUploadedFile(bad_name, bad_content, content_type=bad_type)
            res = self.client.post('/api/v1/prescriptions/reports/', {
                'title': f'Bad File {bad_name}',
                'report_type': ReportCategory.OTHER,
                'test_date': date.today(),
                'file': bad_file
            }, format='multipart')
            self.assertEqual(res.status_code, 400, f"Expected 400 for {bad_name}, got {res.status_code}")

    # 5. Oversized file (>10MB) rejected with 400 Bad Request
    def test_05_oversized_file_rejected(self):
        self.client.force_authenticate(user=self.patient_user_1)
        large_content = b"%PDF-1.4\n" + (b"0" * (10 * 1024 * 1024 + 1024))
        large_file = SimpleUploadedFile("oversized.pdf", large_content, content_type="application/pdf")
        res = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Oversized Report',
            'report_type': ReportCategory.BLOOD_TEST,
            'test_date': date.today(),
            'file': large_file
        }, format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertIn('file', str(res.data).lower())

    # 6. Empty file (0 bytes) rejected with 400 Bad Request
    def test_06_empty_file_rejected(self):
        self.client.force_authenticate(user=self.patient_user_1)
        empty_file = SimpleUploadedFile("empty.pdf", b"", content_type="application/pdf")
        res = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Empty Report',
            'report_type': ReportCategory.BLOOD_TEST,
            'test_date': date.today(),
            'file': empty_file
        }, format='multipart')
        self.assertEqual(res.status_code, 400)

    # 7. Cloudinary upload failure does not create a database record (0 rows created, 400 returned)
    @patch('cloudinary.uploader.upload')
    def test_07_cloudinary_upload_failure_does_not_create_db_record(self, mock_upload):
        mock_upload.side_effect = RuntimeError("Cloudinary connection failed")
        self.client.force_authenticate(user=self.patient_user_1)
        pdf_file = SimpleUploadedFile("failure_test.pdf", self.valid_pdf_content, content_type="application/pdf")
        initial_count = MedicalReport.objects.count()
        res = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Failed Upload Report',
            'report_type': ReportCategory.BLOOD_TEST,
            'diagnostic_center': 'Popular',
            'test_date': date.today(),
            'file': pdf_file
        }, format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(MedicalReport.objects.count(), initial_count)

    # 8. Upload uses Cloudinary authenticated upload helper (type="authenticated")
    @patch('cloudinary.uploader.upload')
    def test_08_upload_uses_authenticated_type(self, mock_upload):
        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/image/authenticated/s--abc--/v1/clinic_platform/medical_reports/report.pdf'
        }
        self.client.force_authenticate(user=self.patient_user_1)
        pdf_file = SimpleUploadedFile("auth_test.pdf", self.valid_pdf_content, content_type="application/pdf")
        res = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Auth Helper Test Report',
            'report_type': ReportCategory.BLOOD_TEST,
            'test_date': date.today(),
            'file': pdf_file
        }, format='multipart')
        self.assertEqual(res.status_code, 201)
        mock_upload.assert_called_once()
        _, kwargs = mock_upload.call_args
        self.assertEqual(kwargs.get('type'), 'authenticated')
        self.assertEqual(kwargs.get('folder'), 'clinic_platform/medical_reports')
        self.assertEqual(kwargs.get('resource_type'), 'auto')

    # 9. Serializer response does NOT expose raw file_url, only access_url
    @patch('cloudinary.uploader.upload')
    def test_09_serializer_response_does_not_expose_file_url(self, mock_upload):
        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/image/authenticated/s--priv--/v1/clinic_platform/medical_reports/priv.pdf'
        }
        self.client.force_authenticate(user=self.patient_user_1)
        pdf_file = SimpleUploadedFile("no_leak.pdf", self.valid_pdf_content, content_type="application/pdf")
        res = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'No Leak Report',
            'report_type': ReportCategory.BLOOD_TEST,
            'test_date': date.today(),
            'file': pdf_file
        }, format='multipart')
        self.assertEqual(res.status_code, 201)
        res_data = res.data.get('data', res.data)
        self.assertNotIn('file_url', res_data)
        self.assertIn('access_url', res_data)

    # 10. access_url endpoint generates signed delivery URL for the newly uploaded file
    @patch('cloudinary.uploader.upload')
    def test_10_access_url_endpoint_generates_signed_delivery_url(self, mock_upload):
        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/image/authenticated/s--sec--/v1/clinic_platform/medical_reports/doc.pdf'
        }
        self.client.force_authenticate(user=self.patient_user_1)
        pdf_file = SimpleUploadedFile("doc.pdf", self.valid_pdf_content, content_type="application/pdf")
        res_create = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Doc with Signed Access',
            'report_type': ReportCategory.BLOOD_TEST,
            'test_date': date.today(),
            'file': pdf_file
        }, format='multipart')
        self.assertEqual(res_create.status_code, 201)
        res_create_data = res_create.data.get('data', res_create.data)
        access_url = res_create_data['access_url']

        res_access = self.client.get(access_url)
        self.assertEqual(res_access.status_code, 200)
        access_data = res_access.data.get('data', res_access.data)
        self.assertIn('access_url', access_data)
        self.assertEqual(access_data['expires_in'], 300)

    # 11. Cross-patient isolation: another patient cannot access the uploaded report via /access/
    @patch('cloudinary.uploader.upload')
    def test_11_cross_patient_isolation_rejects_access(self, mock_upload):
        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/image/authenticated/s--iso--/v1/clinic_platform/medical_reports/iso.pdf'
        }
        self.client.force_authenticate(user=self.patient_user_1)
        pdf_file = SimpleUploadedFile("iso.pdf", self.valid_pdf_content, content_type="application/pdf")
        res_create = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Isolated Report',
            'report_type': ReportCategory.BLOOD_TEST,
            'test_date': date.today(),
            'file': pdf_file
        }, format='multipart')
        self.assertEqual(res_create.status_code, 201)
        report_id = res_create.data.get('data', res_create.data)['id']

        # Patient 2 attempts to access Patient 1's report
        self.client.force_authenticate(user=self.patient_user_2)
        res_cross = self.client.get(f'/api/v1/prescriptions/reports/{report_id}/access/')
        self.assertEqual(res_cross.status_code, 403)

    # 12. Treating doctor with appointment can access the uploaded report via /access/
    @patch('cloudinary.uploader.upload')
    def test_12_treating_doctor_with_appointment_can_access(self, mock_upload):
        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/image/authenticated/s--doc--/v1/clinic_platform/medical_reports/doc_access.pdf'
        }
        self.client.force_authenticate(user=self.patient_user_1)
        pdf_file = SimpleUploadedFile("doc_access.pdf", self.valid_pdf_content, content_type="application/pdf")
        res_create = self.client.post('/api/v1/prescriptions/reports/', {
            'title': 'Treating Doctor Accessible Report',
            'report_type': ReportCategory.BLOOD_TEST,
            'test_date': date.today(),
            'file': pdf_file
        }, format='multipart')
        self.assertEqual(res_create.status_code, 201)
        report_id = res_create.data.get('data', res_create.data)['id']

        # Doctor A has an active appointment with Patient 1
        self.client.force_authenticate(user=self.doctor_user_a)
        res_doctor = self.client.get(f'/api/v1/prescriptions/reports/{report_id}/access/')
        self.assertEqual(res_doctor.status_code, 200)
        access_data = res_doctor.data.get('data', res_doctor.data)
        self.assertIn('access_url', access_data)
        self.assertEqual(access_data['expires_in'], 300)





