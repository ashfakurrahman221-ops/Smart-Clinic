import datetime
from unittest import mock
import django.template.context
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import UserRole
from apps.clinics.models import Clinic, ClinicStaff, VerificationStatus as ClinicVerificationStatus
from apps.doctors.models import Doctor, DoctorClinic, VerificationStatus as DoctorVerificationStatus
from apps.appointments.models import Appointment, AppointmentStatus
from apps.payments.models import Payment, PaymentMethod, PaymentStatus

# Python 3.14 compatibility hook for Django test client template context copy
def _safe_basecontext_copy(self):
    duplicate = object.__new__(self.__class__)
    duplicate.dicts = self.dicts[:]
    return duplicate
django.template.context.BaseContext.__copy__ = _safe_basecontext_copy

User = get_user_model()

class PaymentSSLCommerzTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            email="patient.payment@example.com",
            password="Password123!",
            first_name="Rahim",
            last_name="Uddin",
            phone="01711223344",
            role=UserRole.PATIENT
        )
        self.doc_user = User.objects.create_user(
            email="doc.payment@example.com",
            password="Password123!",
            first_name="Dr. Karim",
            last_name="Chowdhury",
            role=UserRole.DOCTOR
        )
        self.clinic_owner = User.objects.create_user(
            email="owner.payment@example.com",
            password="Password123!",
            role=UserRole.CLINIC_ADMIN
        )
        self.clinic = Clinic.objects.create(
            name="Square Hospital Dhaka",
            owner=self.clinic_owner,
            address="Panthapath, Dhaka",
            phone="01700000001",
            email="square@example.com",
            verification_status=ClinicVerificationStatus.VERIFIED
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Karim Chowdhury",
            qualification="MBBS, FCPS",
            verification_status=DoctorVerificationStatus.VERIFIED
        )
        self.doctor_clinic = DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=1000.00,
            status="ACCEPTED"
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=1),
            appointment_time=datetime.time(11, 0),
            amount=1000.00,
            status=AppointmentStatus.PENDING,
            serial_number=1
        )

    def test_initiate_sslcommerz_payment(self):
        self.client.force_authenticate(user=self.patient)
        url = "/api/v1/payments/initiate-sslcommerz/"
        res = self.client.post(url, {"appointment_id": str(self.appointment.id)}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("redirect_url", res.data)
        self.assertIn("payment_id", res.data)

        # Check Payment model created
        payment = Payment.objects.get(pk=res.data["payment_id"])
        self.assertEqual(payment.payment_method, PaymentMethod.SSLCOMMERZ)
        self.assertEqual(payment.payment_status, PaymentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_sslcommerz_success_callback(self, mock_verify):
        payment = Payment.objects.create(
            appointment=self.appointment,
            amount=1000.00,
            payment_method=PaymentMethod.SSLCOMMERZ,
            payment_status=PaymentStatus.PENDING
        )
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(payment.id),
            'amount': '1000.00',
            'currency_type': 'BDT',
            'val_id': 'VALID_MOCK_123456',
            'bank_tran_id': 'BKASH_TRX_998877',
            'card_type': 'BKASH-BKash',
        }
        success_url = "/api/v1/payments/sslcommerz/success/"
        res = self.client.post(success_url, {
            "tran_id": str(payment.id),
            "val_id": "VALID_MOCK_123456",
            "bank_tran_id": "BKASH_TRX_998877",
            "card_type": "BKASH-BKash",
            "status": "VALID"
        })
        # Should redirect to frontend dashboard with success
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=success", res.url)

        # Confirm payment and appointment are marked completed / confirmed
        payment.refresh_from_db()
        self.appointment.refresh_from_db()
        self.assertEqual(payment.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(payment.val_id, "VALID_MOCK_123456")
        self.assertEqual(self.appointment.status, AppointmentStatus.CONFIRMED)

    def test_cash_at_chamber_processing(self):
        payment = Payment.objects.create(
            appointment=self.appointment,
            amount=1000.00,
            payment_method=PaymentMethod.CASH,
            payment_status=PaymentStatus.PENDING
        )
        process_url = f"/api/v1/payments/{payment.id}/process/"

        # 1. Patient caller is rejected with 403 Forbidden (GAP-PAY-01)
        self.client.force_authenticate(user=self.patient)
        res_pat = self.client.post(process_url, {"transaction_id": "CASH_CHAMBER_DESK_01"}, format="json")
        self.assertEqual(res_pat.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Authorized clinic owner processes cash payment successfully
        self.client.force_authenticate(user=self.clinic_owner)
        res = self.client.post(process_url, {
            "transaction_id": "CASH_CHAMBER_DESK_01"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        payment.refresh_from_db()
        self.appointment.refresh_from_db()
        self.assertEqual(payment.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(self.appointment.status, AppointmentStatus.CONFIRMED)

    def test_payment_detail_view(self):
        self.client.force_authenticate(user=self.patient)
        payment = Payment.objects.create(
            appointment=self.appointment,
            amount=1000.00,
            payment_method=PaymentMethod.BKASH,
            payment_status=PaymentStatus.PENDING
        )
        url = f"/api/v1/payments/{payment.id}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], str(payment.id))
        self.assertEqual(res.data["payment_method"], "BKASH")
        self.assertEqual(res.data["appointment"]["doctor"]["full_name"], "Dr. Karim Chowdhury")

    def test_bkash_mfs_processing_with_method(self):
        payment = Payment.objects.create(
            appointment=self.appointment,
            amount=1000.00,
            payment_method=PaymentMethod.SSLCOMMERZ,
            payment_status=PaymentStatus.PENDING
        )
        process_url = f"/api/v1/payments/{payment.id}/process/"

        # Patient caller is rejected with 403 Forbidden
        self.client.force_authenticate(user=self.patient)
        res_pat = self.client.post(process_url, {
            "transaction_id": "BKASH_SIM_987654321",
            "payment_method": "BKASH",
            "card_type": "bKash-App-Transfer"
        }, format="json")
        self.assertEqual(res_pat.status_code, status.HTTP_403_FORBIDDEN)

        # Clinic owner processes successfully
        self.client.force_authenticate(user=self.clinic_owner)
        res = self.client.post(process_url, {
            "transaction_id": "BKASH_SIM_987654321",
            "payment_method": "BKASH",
            "card_type": "bKash-App-Transfer"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(payment.payment_method, PaymentMethod.BKASH)
        self.assertEqual(payment.transaction_id, "BKASH_SIM_987654321")


class SSLCommerzSecurityRemediationTestCase(TestCase):
    """
    Dedicated test suite for Phase 9B.1 SSLCommerz server-to-server validation,
    anti-tampering, idempotency, cancelled appointment safety, and fail-closed rules.
    """
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            email="patient.sec@example.com",
            password="Password123!",
            first_name="Sec",
            last_name="Patient",
            phone="01711998877",
            role=UserRole.PATIENT
        )
        self.doc_user = User.objects.create_user(
            email="doc.sec@example.com",
            password="Password123!",
            first_name="Dr. Sec",
            last_name="Physician",
            role=UserRole.DOCTOR
        )
        self.clinic_owner = User.objects.create_user(
            email="owner.sec@example.com",
            password="Password123!",
            role=UserRole.CLINIC_ADMIN
        )
        self.clinic = Clinic.objects.create(
            name="Security Medical Center",
            owner=self.clinic_owner,
            address="Dhanmondi, Dhaka",
            phone="01700000002",
            email="secmed@example.com",
            verification_status=ClinicVerificationStatus.VERIFIED
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Sec Physician",
            qualification="MBBS, MD",
            verification_status=DoctorVerificationStatus.VERIFIED
        )
        self.doctor_clinic = DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            consultation_fee=1200.00,
            status="ACCEPTED"
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=2),
            appointment_time=datetime.time(14, 0),
            amount=1200.00,
            status=AppointmentStatus.PENDING,
            serial_number=5
        )
        self.payment = Payment.objects.create(
            appointment=self.appointment,
            amount=1200.00,
            currency="BDT",
            payment_method=PaymentMethod.SSLCOMMERZ,
            payment_status=PaymentStatus.PENDING
        )
        self.success_url = "/api/v1/payments/sslcommerz/success/"
        self.ipn_url = "/api/v1/payments/sslcommerz/ipn/"

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_1_forged_success_callback_cannot_complete_payment(self, mock_verify):
        # Attacker posts fabricated val_id and status='VALID', but gateway verification returns None
        mock_verify.return_value = None

        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "FORGED_VAL_ID_999",
            "status": "VALID",
            "amount": "1200.00"
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        self.payment.refresh_from_db()
        self.appointment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.PENDING)
        self.assertEqual(self.appointment.status, AppointmentStatus.PENDING)

    def test_2_missing_val_id_rejected(self):
        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "",
            "status": "VALID"
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.PENDING)

    def test_3_missing_tran_id_handled_safely(self):
        res = self.client.post(self.success_url, {
            "val_id": "SOME_VAL_ID"
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

    def test_4_unknown_tran_id_handled_safely(self):
        res = self.client.post(self.success_url, {
            "tran_id": "00000000-0000-0000-0000-000000000000",
            "val_id": "SOME_VAL_ID"
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        # Also non-UUID tran_id string
        res2 = self.client.post(self.success_url, {
            "tran_id": "not-a-valid-uuid-string",
            "val_id": "SOME_VAL_ID"
        })
        self.assertEqual(res2.status_code, 302)
        self.assertIn("payment=fail", res2.url)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_5_valid_verified_callback_completes_payment(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'VALID_GATEWAY_VAL_123',
            'bank_tran_id': 'BANK_TRX_5544',
            'card_type': 'VISA-City Bank',
        }
        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "VALID_GATEWAY_VAL_123",
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn(f"payment=success&apt_id={self.appointment.id}", res.url)

        self.payment.refresh_from_db()
        self.appointment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(self.payment.val_id, "VALID_GATEWAY_VAL_123")
        self.assertEqual(self.payment.transaction_id, "BANK_TRX_5544")
        self.assertEqual(self.appointment.status, AppointmentStatus.CONFIRMED)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_6_invalid_gateway_status_cannot_complete_payment(self, mock_verify):
        mock_verify.return_value = {
            'status': 'FAILED',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'GATEWAY_VAL_FAILED',
        }
        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "GATEWAY_VAL_FAILED",
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        self.payment.refresh_from_db()
        self.appointment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.FAILED)
        self.assertEqual(self.appointment.status, AppointmentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_7_amount_mismatch_cannot_complete_payment(self, mock_verify):
        # Gateway reports 600.00 instead of 1200.00
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '600.00',
            'currency_type': 'BDT',
            'val_id': 'GATEWAY_VAL_TAMPER',
        }
        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "GATEWAY_VAL_TAMPER",
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        self.payment.refresh_from_db()
        self.appointment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.PENDING)
        self.assertEqual(self.appointment.status, AppointmentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_8_currency_mismatch_cannot_complete_payment(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'USD',  # Mismatched currency
            'val_id': 'GATEWAY_VAL_CURR',
        }
        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "GATEWAY_VAL_CURR",
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_9_gateway_tran_id_mismatch_cannot_complete_payment(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': "11111111-2222-3333-4444-555555555555",  # Foreign tran_id
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'GATEWAY_VAL_MISMATCH',
        }
        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "GATEWAY_VAL_MISMATCH",
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_10_gateway_timeout_leaves_payment_uncompleted_recoverable(self, mock_verify):
        # Network timeout returns None
        mock_verify.return_value = None

        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "TIMEOUT_VAL_ID",
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        self.payment.refresh_from_db()
        # Must preserve recoverability: PENDING (not marked FAILED)
        self.assertEqual(self.payment.payment_status, PaymentStatus.PENDING)
        self.assertEqual(self.appointment.status, AppointmentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_11_malformed_validator_response_fails_closed(self, mock_verify):
        # Malformed non-decimal amount
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': 'not_a_valid_number',
            'currency_type': 'BDT',
            'val_id': 'MALFORMED_VAL_ID',
        }
        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "MALFORMED_VAL_ID",
        })
        self.assertEqual(res.status_code, 302)
        self.assertIn("payment=fail", res.url)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_12_duplicate_success_callback_is_idempotent(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'VAL_ID_IDEMP_1',
            'bank_tran_id': 'BANK_IDEMP_1',
        }
        # First callback
        res1 = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "VAL_ID_IDEMP_1",
        })
        self.assertEqual(res1.status_code, 302)
        self.assertIn("payment=success", res1.url)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.COMPLETED)
        initial_updated_at = self.payment.updated_at

        # Second callback (duplicate)
        res2 = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "VAL_ID_IDEMP_1",
        })
        self.assertEqual(res2.status_code, 302)
        self.assertIn("payment=success", res2.url)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.updated_at, initial_updated_at)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_13_valid_ipn_completes_payment(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'IPN_VAL_ID_VALID',
            'bank_tran_id': 'IPN_BANK_TRX_99',
            'card_type': 'NAGAD-Nagad',
        }
        res = self.client.post(self.ipn_url, {
            "tran_id": str(self.payment.id),
            "val_id": "IPN_VAL_ID_VALID",
            "status": "VALID",
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get('status'), 'IPN verified and payment updated')

        self.payment.refresh_from_db()
        self.appointment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(self.payment.payment_method, PaymentMethod.NAGAD)
        self.assertEqual(self.appointment.status, AppointmentStatus.CONFIRMED)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_14_forged_ipn_cannot_complete_payment(self, mock_verify):
        mock_verify.return_value = None

        res = self.client.post(self.ipn_url, {
            "tran_id": str(self.payment.id),
            "val_id": "IPN_FORGED_VAL",
            "status": "VALID",
        })
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.PENDING)
        self.assertEqual(self.appointment.status, AppointmentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_15_duplicate_ipn_is_idempotent(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'IPN_IDEMP_VAL',
        }
        # IPN 1
        res1 = self.client.post(self.ipn_url, {
            "tran_id": str(self.payment.id),
            "val_id": "IPN_IDEMP_VAL",
        })
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # IPN 2 (duplicate)
        res2 = self.client.post(self.ipn_url, {
            "tran_id": str(self.payment.id),
            "val_id": "IPN_IDEMP_VAL",
        })
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data.get('status'), 'already_processed')

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_16_success_then_ipn_causes_one_completion_only(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'CROSS_ORDER_VAL_1',
            'bank_tran_id': 'BANK_TRX_1',
        }
        # First: Success callback
        res_cb = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "CROSS_ORDER_VAL_1",
        })
        self.assertEqual(res_cb.status_code, 302)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.COMPLETED)
        initial_updated_at = self.payment.updated_at

        # Second: IPN
        res_ipn = self.client.post(self.ipn_url, {
            "tran_id": str(self.payment.id),
            "val_id": "CROSS_ORDER_VAL_1",
        })
        self.assertEqual(res_ipn.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ipn.data.get('status'), 'already_processed')

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.updated_at, initial_updated_at)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_17_ipn_then_success_causes_one_completion_only(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'CROSS_ORDER_VAL_2',
            'bank_tran_id': 'BANK_TRX_2',
        }
        # First: IPN
        res_ipn = self.client.post(self.ipn_url, {
            "tran_id": str(self.payment.id),
            "val_id": "CROSS_ORDER_VAL_2",
        })
        self.assertEqual(res_ipn.status_code, status.HTTP_200_OK)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.COMPLETED)
        initial_updated_at = self.payment.updated_at

        # Second: Success callback
        res_cb = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "CROSS_ORDER_VAL_2",
        })
        self.assertEqual(res_cb.status_code, 302)
        self.assertIn("payment=success", res_cb.url)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.updated_at, initial_updated_at)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_18_cancelled_appointment_is_not_silently_revived(self, mock_verify):
        # Explicitly cancel the appointment beforehand
        self.appointment.status = AppointmentStatus.CANCELLED
        self.appointment.save(update_fields=['status'])

        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'CANCELLED_APT_VAL',
            'bank_tran_id': 'BANK_TRX_CANC',
        }
        res = self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "CANCELLED_APT_VAL",
        })
        self.assertEqual(res.status_code, 302)

        self.payment.refresh_from_db()
        self.appointment.refresh_from_db()

        # Payment records payment evidence as COMPLETED
        self.assertEqual(self.payment.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(self.payment.val_id, "CANCELLED_APT_VAL")

        # Crucial rule: Appointment MUST NOT be silently revived to CONFIRMED!
        self.assertEqual(self.appointment.status, AppointmentStatus.CANCELLED)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_19_paid_at_and_timestamps_not_changed_by_duplicate_callbacks(self, mock_verify):
        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'TIMESTAMP_VAL_1',
            'bank_tran_id': 'BANK_TIME_1',
        }
        self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "TIMESTAMP_VAL_1",
        })
        self.payment.refresh_from_db()
        saved_updated_at = self.payment.updated_at

        # Subsequent duplicate callback
        self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "TIMESTAMP_VAL_1",
        })
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.updated_at, saved_updated_at)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_20_appointment_serial_number_is_unchanged(self, mock_verify):
        initial_serial = self.appointment.serial_number

        mock_verify.return_value = {
            'status': 'VALID',
            'tran_id': str(self.payment.id),
            'amount': '1200.00',
            'currency_type': 'BDT',
            'val_id': 'SERIAL_VAL_1',
            'bank_tran_id': 'BANK_SERIAL_1',
        }
        self.client.post(self.success_url, {
            "tran_id": str(self.payment.id),
            "val_id": "SERIAL_VAL_1",
        })
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.serial_number, initial_serial)

    def test_21_cash_payment_flow_remains_unaffected(self):
        self.client.force_authenticate(user=self.clinic_owner)
        appointment_cash = Appointment.objects.create(
            patient=self.patient,
            clinic=self.clinic,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=3),
            appointment_time=datetime.time(15, 0),
            amount=1200.00,
            status=AppointmentStatus.PENDING,
            serial_number=6
        )
        cash_payment = Payment.objects.create(
            appointment=appointment_cash,
            amount=1200.00,
            payment_method=PaymentMethod.CASH,
            payment_status=PaymentStatus.PENDING
        )
        process_url = f"/api/v1/payments/{cash_payment.id}/process/"
        res = self.client.post(process_url, {
            "transaction_id": "MANUAL_DESK_RECEIPT_101",
            "payment_method": "CASH"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        cash_payment.refresh_from_db()
        appointment_cash.refresh_from_db()
        self.assertEqual(cash_payment.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(cash_payment.transaction_id, "MANUAL_DESK_RECEIPT_101")
        self.assertEqual(appointment_cash.status, AppointmentStatus.CONFIRMED)


class PaymentTargetedSecurityRemediationTestCase(TestCase):
    """
    Dedicated test suite for Phase 9B.1 Targeted Security Remediation:
    GAP-PAY-01 (ProcessPaymentView authorization & bypass prevention)
    GAP-PAY-02 (Payment initiation patient ownership & lifecycle checks)
    GAP-PAY-03 (IPN retryable 503 vs 400 failure status codes)
    """
    def setUp(self):
        self.client = APIClient()
        self.patient_1 = User.objects.create_user(
            email="patient1.rem@example.com",
            password="Password123!",
            first_name="Patient",
            last_name="One",
            phone="01711000001",
            role=UserRole.PATIENT
        )
        self.patient_2 = User.objects.create_user(
            email="patient2.rem@example.com",
            password="Password123!",
            first_name="Patient",
            last_name="Two",
            phone="01711000002",
            role=UserRole.PATIENT
        )
        self.doc_user = User.objects.create_user(
            email="doc.rem@example.com",
            password="Password123!",
            first_name="Dr. Rem",
            last_name="Surgeon",
            role=UserRole.DOCTOR
        )
        self.clinic_owner_1 = User.objects.create_user(
            email="owner1.rem@example.com",
            password="Password123!",
            role=UserRole.CLINIC_ADMIN
        )
        self.clinic_owner_2 = User.objects.create_user(
            email="owner2.rem@example.com",
            password="Password123!",
            role=UserRole.CLINIC_ADMIN
        )
        self.clinic_1 = Clinic.objects.create(
            name="Clinic Alpha Dhaka",
            slug="clinic-alpha-dhaka",
            owner=self.clinic_owner_1,
            address="Mirpur, Dhaka",
            phone="01700000011",
            email="alpha@example.com",
            verification_status=ClinicVerificationStatus.VERIFIED
        )
        self.clinic_2 = Clinic.objects.create(
            name="Clinic Beta Chittagong",
            slug="clinic-beta-chittagong",
            owner=self.clinic_owner_2,
            address="Agrabad, Chittagong",
            phone="01700000012",
            email="beta@example.com",
            verification_status=ClinicVerificationStatus.VERIFIED
        )
        self.receptionist_user_1 = User.objects.create_user(
            email="reception1.rem@example.com",
            password="Password123!",
            role=UserRole.RECEPTIONIST
        )
        self.staff_1 = ClinicStaff.objects.create(
            clinic=self.clinic_1,
            user=self.receptionist_user_1,
            name="Recept Alpha",
            role="RECEPTIONIST",
            is_active=True
        )
        self.receptionist_user_2 = User.objects.create_user(
            email="reception2.rem@example.com",
            password="Password123!",
            role=UserRole.RECEPTIONIST
        )
        self.staff_2 = ClinicStaff.objects.create(
            clinic=self.clinic_2,
            user=self.receptionist_user_2,
            name="Recept Beta",
            role="RECEPTIONIST",
            is_active=True
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            full_name="Dr. Rem Surgeon",
            qualification="MBBS, MS",
            verification_status=DoctorVerificationStatus.VERIFIED
        )
        self.doctor_clinic_1 = DoctorClinic.objects.create(
            doctor=self.doctor,
            clinic=self.clinic_1,
            consultation_fee=1500.00,
            status="ACCEPTED"
        )
        self.appointment_1 = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic_1,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=1),
            appointment_time=datetime.time(10, 0),
            amount=1500.00,
            status=AppointmentStatus.PENDING,
            serial_number=1
        )
        self.payment_1 = Payment.objects.create(
            appointment=self.appointment_1,
            amount=1500.00,
            currency="BDT",
            payment_method=PaymentMethod.CASH,
            payment_status=PaymentStatus.PENDING
        )
        self.ipn_url = "/api/v1/payments/sslcommerz/ipn/"

    # --- P1: ProcessPaymentView Tests ---

    def test_p1_1_unauthenticated_caller_cannot_process_manual_payment(self):
        process_url = f"/api/v1/payments/{self.payment_1.id}/process/"
        res = self.client.post(process_url, {"transaction_id": "FAKE_TXN_001"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.payment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.PENDING)

    def test_p1_2_patient_cannot_call_process_payment_to_self_confirm(self):
        # Patient 1 attempts to self-confirm their own appointment payment
        self.client.force_authenticate(user=self.patient_1)
        process_url = f"/api/v1/payments/{self.payment_1.id}/process/"
        res = self.client.post(process_url, {"transaction_id": "PATIENT_FAKE_TXN"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Patients are not permitted", res.data.get("detail", ""))
        self.payment_1.refresh_from_db()
        self.appointment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.PENDING)
        self.assertEqual(self.appointment_1.status, AppointmentStatus.PENDING)

    def test_p1_3_patient_cannot_process_another_patients_payment(self):
        # Patient 2 attempts to process Patient 1's payment
        self.client.force_authenticate(user=self.patient_2)
        process_url = f"/api/v1/payments/{self.payment_1.id}/process/"
        res = self.client.post(process_url, {"transaction_id": "CROSS_PATIENT_TXN"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.payment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.PENDING)

    def test_p1_4_receptionist_cannot_process_another_clinics_payment(self):
        # Receptionist of Clinic 2 attempts to process payment for Clinic 1
        self.client.force_authenticate(user=self.receptionist_user_2)
        process_url = f"/api/v1/payments/{self.payment_1.id}/process/"
        res = self.client.post(process_url, {"transaction_id": "CROSS_CLINIC_TXN"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("not authorized to collect payments for this clinic", res.data.get("detail", ""))
        self.payment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.PENDING)

    def test_p1_5_authorized_same_clinic_cash_staff_workflow_works(self):
        # Receptionist of Clinic 1 processes payment for Clinic 1
        self.client.force_authenticate(user=self.receptionist_user_1)
        process_url = f"/api/v1/payments/{self.payment_1.id}/process/"
        res = self.client.post(process_url, {
            "transaction_id": "RECEPTION_CASH_RECEIPT_101",
            "payment_method": "CASH"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.payment_1.refresh_from_db()
        self.appointment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(self.payment_1.received_by, self.receptionist_user_1)
        self.assertEqual(self.appointment_1.status, AppointmentStatus.CONFIRMED)

    def test_p1_6_arbitrary_fake_transaction_id_cannot_bypass_authorization(self):
        # Doctor user attempts to process payment
        self.client.force_authenticate(user=self.doc_user)
        process_url = f"/api/v1/payments/{self.payment_1.id}/process/"
        res = self.client.post(process_url, {"transaction_id": "DOC_BYPASS_TXN"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.payment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.PENDING)

    # --- P2: Payment Initiation Ownership & Lifecycle Tests ---

    def test_p2_7_patient_can_initiate_payment_for_own_appointment(self):
        self.client.force_authenticate(user=self.patient_1)
        apt = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic_1,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=2),
            appointment_time=datetime.time(11, 0),
            amount=1500.00,
            status=AppointmentStatus.PENDING,
            serial_number=2
        )
        url = "/api/v1/payments/initiate-sslcommerz/"
        res = self.client.post(url, {"appointment_id": str(apt.id)}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("redirect_url", res.data)
        self.assertEqual(res.data["amount"], "1500.00")

    def test_p2_8_patient_cannot_initiate_another_patients_appointment(self):
        # Patient 2 attempts to initiate SSLCommerz checkout for Patient 1's appointment
        self.client.force_authenticate(user=self.patient_2)
        url = "/api/v1/payments/initiate-sslcommerz/"
        res = self.client.post(url, {"appointment_id": str(self.appointment_1.id)}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("cannot initiate payment for another patient", res.data.get("detail", ""))

    def test_p2_9_patient_cannot_create_payment_for_another_patients_appointment(self):
        # Patient 2 attempts to create Payment via /api/v1/payments/ for Patient 1's appointment
        self.client.force_authenticate(user=self.patient_2)
        apt = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic_1,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=3),
            appointment_time=datetime.time(12, 0),
            amount=1500.00,
            status=AppointmentStatus.PENDING,
            serial_number=3
        )
        url = "/api/v1/payments/"
        res = self.client.post(url, {"appointment_id": str(apt.id), "payment_method": "SSLCOMMERZ"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("cannot create or initiate payment for another patient", res.data.get("detail", ""))

    def test_p2_10_server_side_appointment_amount_remains_authoritative(self):
        self.client.force_authenticate(user=self.patient_1)
        apt = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic_1,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=4),
            appointment_time=datetime.time(14, 0),
            amount=1500.00,
            status=AppointmentStatus.PENDING,
            serial_number=4
        )
        url = "/api/v1/payments/"
        res = self.client.post(url, {
            "appointment_id": str(apt.id),
            "amount": "10.00",  # Attacker attempts 10 BDT fee
            "payment_method": "SSLCOMMERZ"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Server must enforce 1500.00
        pay = Payment.objects.get(pk=res.data["id"])
        self.assertEqual(pay.amount, 1500.00)

    def test_p2_11_cancelled_appointment_initiation_rejected(self):
        self.client.force_authenticate(user=self.patient_1)
        apt_cancelled = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic_1,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=5),
            appointment_time=datetime.time(15, 0),
            amount=1500.00,
            status=AppointmentStatus.CANCELLED,
            serial_number=5
        )
        url = "/api/v1/payments/initiate-sslcommerz/"
        res = self.client.post(url, {"appointment_id": str(apt_cancelled.id)}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cancelled appointment", res.data.get("detail", ""))

    def test_p2_12_already_completed_payment_cannot_create_duplicate(self):
        self.client.force_authenticate(user=self.patient_1)
        self.payment_1.payment_status = PaymentStatus.COMPLETED
        self.payment_1.save(update_fields=["payment_status"])

        url = "/api/v1/payments/initiate-sslcommerz/"
        res = self.client.post(url, {"appointment_id": str(self.appointment_1.id)}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been completed", res.data.get("detail", ""))

    # --- P3: IPN Retryable 503 vs 400 Tests ---

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_p3_13_gateway_timeout_ipn_returns_503_retryable(self, mock_verify):
        mock_verify.return_value = None  # Simulates network timeout or gateway downtime
        res = self.client.post(self.ipn_url, {
            "tran_id": str(self.payment_1.id),
            "val_id": "TIMEOUT_VAL_001",
        })
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(res.data.get("status"), "Gateway verification unavailable")

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_p3_14_payment_remains_pending_on_gateway_timeout(self, mock_verify):
        mock_verify.return_value = None
        self.client.post(self.ipn_url, {
            "tran_id": str(self.payment_1.id),
            "val_id": "TIMEOUT_VAL_002",
        })
        self.payment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_p3_15_appointment_remains_pending_on_gateway_timeout(self, mock_verify):
        mock_verify.return_value = None
        self.client.post(self.ipn_url, {
            "tran_id": str(self.payment_1.id),
            "val_id": "TIMEOUT_VAL_003",
        })
        self.appointment_1.refresh_from_db()
        self.assertEqual(self.appointment_1.status, AppointmentStatus.PENDING)

    @mock.patch('apps.payments.views.verify_sslcommerz_payment')
    def test_p3_16_invalid_gateway_status_fails_normally_as_400(self, mock_verify):
        # Gateway explicitly returned status='FAILED' (not a temporary outage)
        mock_verify.return_value = {
            'status': 'FAILED',
            'tran_id': str(self.payment_1.id),
            'amount': '1500.00',
            'currency_type': 'BDT',
            'val_id': 'VAL_FAILED_001',
        }
        res = self.client.post(self.ipn_url, {
            "tran_id": str(self.payment_1.id),
            "val_id": "VAL_FAILED_001",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data.get("status"), "Invalid gateway status")
        self.payment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.FAILED)

    # --- Phase 9B.2: Doctor Authorization & Cash-at-Counter Lifecycle Tests ---

    def test_9b2_doctor_cannot_post_payments_list_create(self):
        # Doctor role is forbidden from initiating/creating patient payments
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/v1/payments/", {
            "appointment_id": str(self.appointment_1.id),
            "payment_method": "SSLCOMMERZ"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Doctors are not permitted", res.data.get("detail", ""))

    def test_9b2_doctor_cannot_initiate_sslcommerz(self):
        # Doctor role is forbidden from generating SSLCommerz sessions for patients
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/v1/payments/initiate-sslcommerz/", {
            "appointment_id": str(self.appointment_1.id)
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Doctors are not permitted", res.data.get("detail", ""))

    def test_9b2_patient_own_sslcommerz_initiation_still_works(self):
        # Patient can initiate SSLCommerz session for their own appointment
        self.client.force_authenticate(user=self.patient_1)
        res = self.client.post("/api/v1/payments/initiate-sslcommerz/", {
            "appointment_id": str(self.appointment_1.id)
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("redirect_url", res.data)

    def test_9b2_patient_cannot_initiate_another_patients_payment(self):
        # Patient 2 cannot initiate payment for Patient 1
        self.client.force_authenticate(user=self.patient_2)
        res = self.client.post("/api/v1/payments/initiate-sslcommerz/", {
            "appointment_id": str(self.appointment_1.id)
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_9b2_staff_cash_payment_still_works(self):
        # Authorized receptionist collects cash at desk; payment marks COMPLETED
        self.client.force_authenticate(user=self.receptionist_user_1)
        res = self.client.post(f"/api/v1/payments/{self.payment_1.id}/process/", {
            "transaction_id": "RECEPTION_CASH_RECEIPT_9B2",
            "payment_method": "CASH"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.payment_1.refresh_from_db()
        self.assertEqual(self.payment_1.payment_status, PaymentStatus.COMPLETED)
        self.assertEqual(self.payment_1.received_by, self.receptionist_user_1)

    def test_9b2_cash_at_counter_booking_remains_unpaid_pending(self):
        # Patient selects Cash at Counter: appointment remains PENDING and payment remains PENDING
        self.client.force_authenticate(user=self.patient_1)
        apt_counter = Appointment.objects.create(
            patient=self.patient_1,
            clinic=self.clinic_1,
            doctor=self.doctor,
            appointment_date=datetime.date.today() + datetime.timedelta(days=7),
            appointment_time=datetime.time(16, 0),
            amount=1500.00,
            status=AppointmentStatus.PENDING,
            serial_number=7
        )
        res = self.client.post("/api/v1/payments/", {
            "appointment_id": str(apt_counter.id),
            "payment_method": "CASH"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Verify Payment and Appointment both stay PENDING (unpaid until reception collects)
        pay = Payment.objects.get(pk=res.data["id"])
        self.assertEqual(pay.payment_status, PaymentStatus.PENDING)
        self.assertEqual(pay.payment_method, PaymentMethod.CASH)
        apt_counter.refresh_from_db()
        self.assertEqual(apt_counter.status, AppointmentStatus.PENDING)



