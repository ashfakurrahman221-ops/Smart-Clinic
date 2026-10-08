import os
import uuid
from django.conf import settings
from django.core import mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import UserRole

User = get_user_model()

class AccountsModelTestCase(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            email="patient@example.com",
            password="Password123!",
            first_name="Jane",
            last_name="Doe",
            role=UserRole.PATIENT
        )
        self.assertEqual(user.email, "patient@example.com")
        self.assertTrue(user.check_password("Password123!"))
        self.assertEqual(user.role, UserRole.PATIENT)
        self.assertFalse(user.is_staff)

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email="admin@example.com",
            password="AdminPassword123!",
            first_name="Super",
            last_name="Admin"
        )
        self.assertEqual(admin.role, UserRole.ADMIN)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

class AccountsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = "/api/v1/accounts/register/"
        self.login_url = "/api/v1/accounts/login/"
        self.me_url = "/api/v1/accounts/me/"

    def test_user_registration_and_login(self):
        reg_payload = {
            "email": "john@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "first_name": "John",
            "last_name": "Smith",
            "role": "PATIENT"
        }
        res = self.client.post(self.register_url, reg_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        login_payload = {
            "email": "john@example.com",
            "password": "SecurePassword123!"
        }
        res = self.client.post(self.login_url, login_payload, format="json")
        self.assertIn("access", res.data)
        
        access_token = res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        
        res = self.client.get(self.me_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["email"], "john@example.com")

    def test_login_with_phone_number(self):
        User.objects.create_user(
            email="phoneuser@example.com",
            password="Password123!",
            first_name="Phone",
            last_name="User",
            phone="01799887766",
            role=UserRole.PATIENT
        )
        # Login using mobile phone number
        login_res = self.client.post(self.login_url, {
            "email": "01799887766",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_res.data)
        self.assertEqual(login_res.data["user"]["email"], "phoneuser@example.com")


class FamilyMemberCRUDTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.patient1 = User.objects.create_user(
            email="patient1@example.com",
            password="Password123!",
            first_name="Patient",
            last_name="One",
            role=UserRole.PATIENT
        )
        self.patient2 = User.objects.create_user(
            email="patient2@example.com",
            password="Password123!",
            first_name="Patient",
            last_name="Two",
            role=UserRole.PATIENT
        )
        self.url = "/api/v1/accounts/family-members/"

    def test_family_member_create_and_read(self):
        self.client.force_authenticate(user=self.patient1)
        payload = {
            "full_name": "Md. Rafiqul Islam",
            "relationship": "FATHER",
            "phone": "01711223344",
            "date_of_birth": "1960-05-15",
            "gender": "MALE",
            "blood_group": "A+",
            "medical_notes": "Hypertension"
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["full_name"], "Md. Rafiqul Islam")
        self.assertEqual(res.data["relationship"], "FATHER")
        self.assertEqual(res.data["date_of_birth"], "1960-05-15")
        self.assertTrue(res.data["age"] is not None)
        member_id = res.data["id"]

        # View single
        detail_res = self.client.get(f"{self.url}{member_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["id"], member_id)

        # List
        list_res = self.client.get(self.url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["results"] if "results" in list_res.data else list_res.data), 1)

    def test_family_member_update_and_relationship_change(self):
        self.client.force_authenticate(user=self.patient1)
        # Create initial member
        create_res = self.client.post(self.url, {
            "full_name": "Fatema Begum",
            "relationship": "MOTHER",
            "gender": "FEMALE",
            "age": 55
        }, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        member_id = create_res.data["id"]

        # Update name, date of birth, gender
        update_payload = {
            "full_name": "Begum Fatema Khatun",
            "date_of_birth": "1968-08-20",
            "gender": "FEMALE"
        }
        patch_res = self.client.patch(f"{self.url}{member_id}/", update_payload, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["full_name"], "Begum Fatema Khatun")
        self.assertEqual(patch_res.data["date_of_birth"], "1968-08-20")

        # Update relationship field
        rel_payload = {
            "relationship": "SPOUSE"
        }
        rel_res = self.client.patch(f"{self.url}{member_id}/", rel_payload, format="json")
        self.assertEqual(rel_res.status_code, status.HTTP_200_OK)
        self.assertEqual(rel_res.data["relationship"], "SPOUSE")
        self.assertEqual(rel_res.data["relationship_display"], "Spouse")

    def test_family_member_delete(self):
        self.client.force_authenticate(user=self.patient1)
        create_res = self.client.post(self.url, {
            "full_name": "Child Member",
            "relationship": "CHILD",
            "gender": "MALE",
            "age": 10
        }, format="json")
        member_id = create_res.data["id"]

        delete_res = self.client.delete(f"{self.url}{member_id}/")
        self.assertEqual(delete_res.status_code, status.HTTP_204_NO_CONTENT)

        # Confirm deleted
        get_res = self.client.get(f"{self.url}{member_id}/")
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthorized_access_protection(self):
        # 1. Unauthenticated request
        anon_client = APIClient()
        res = anon_client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Patient 1 creates a family member
        self.client.force_authenticate(user=self.patient1)
        create_res = self.client.post(self.url, {
            "full_name": "Patient 1 Father",
            "relationship": "FATHER",
            "gender": "MALE"
        }, format="json")
        p1_member_id = create_res.data["id"]

        # 3. Patient 2 attempts to retrieve Patient 1's family member
        self.client.force_authenticate(user=self.patient2)
        get_other = self.client.get(f"{self.url}{p1_member_id}/")
        self.assertEqual(get_other.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Patient 2 attempts to update Patient 1's family member
        patch_other = self.client.patch(f"{self.url}{p1_member_id}/", {"full_name": "Hacked Name"}, format="json")
        self.assertEqual(patch_other.status_code, status.HTTP_403_FORBIDDEN)

        # 5. Patient 2 attempts to delete Patient 1's family member
        delete_other = self.client.delete(f"{self.url}{p1_member_id}/")
        self.assertEqual(delete_other.status_code, status.HTTP_403_FORBIDDEN)


class AuthenticationSecurityHardeningTestCase(TestCase):
    """
    Focused tests proving Task 1 Authentication Serializer Security Hardening:
    1. Correct password authenticates successfully.
    2. Incorrect password is rejected (401).
    3. Incorrect password does NOT create or append login_debug.log.
    4. Password casing is respected exactly.
    5. password123! receives NO special fallback treatment.
    6. Inactive users remain unable to authenticate.
    7. Successful JWT response retains the existing frontend-required structure.
    """

    def setUp(self):
        self.client = APIClient()
        self.login_url = "/api/v1/accounts/login/"
        self.debug_log_path = os.path.join(settings.BASE_DIR, "login_debug.log")
        # Ensure debug log does not exist prior to test
        if os.path.exists(self.debug_log_path):
            os.remove(self.debug_log_path)

        self.user = User.objects.create_user(
            email="secure.user@example.com",
            password="ExactPassword123!",
            first_name="Secure",
            last_name="Tester",
            role=UserRole.DOCTOR,
            phone="01711223344"
        )

    def tearDown(self):
        if os.path.exists(self.debug_log_path):
            os.remove(self.debug_log_path)

    def test_correct_password_authenticates_successfully(self):
        res = self.client.post(self.login_url, {
            "email": "secure.user@example.com",
            "password": "ExactPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_incorrect_password_is_rejected_and_does_not_log(self):
        res = self.client.post(self.login_url, {
            "email": "secure.user@example.com",
            "password": "WrongPassword999!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(
            os.path.exists(self.debug_log_path),
            "login_debug.log must NOT be created on failed authentication."
        )

    def test_password_casing_is_respected_exactly(self):
        # Upper/lower case mismatch must be strictly rejected
        res = self.client.post(self.login_url, {
            "email": "secure.user@example.com",
            "password": "exactpassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(os.path.exists(self.debug_log_path))

    def test_password123_receives_no_special_fallback(self):
        # 1. User created with 'Password123!' (capital P)
        user_cap = User.objects.create_user(
            email="cap.pwd@example.com",
            password="Password123!",
            first_name="Cap",
            last_name="Pwd",
            role=UserRole.PATIENT
        )
        # Attempt login with 'password123!' (lowercase p) - MUST FAIL with 401
        res = self.client.post(self.login_url, {
            "email": "cap.pwd@example.com",
            "password": "password123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(os.path.exists(self.debug_log_path))

        # 2. User created with 'password123!' (lowercase p)
        user_low = User.objects.create_user(
            email="low.pwd@example.com",
            password="password123!",
            first_name="Low",
            last_name="Pwd",
            role=UserRole.PATIENT
        )
        # Attempt login with 'Password123!' (capital P) - MUST FAIL with 401
        res2 = self.client.post(self.login_url, {
            "email": "low.pwd@example.com",
            "password": "Password123!"
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(os.path.exists(self.debug_log_path))

    def test_inactive_users_remain_unable_to_authenticate(self):
        inactive_user = User.objects.create_user(
            email="inactive@example.com",
            password="SecretPassword123!",
            first_name="Inactive",
            last_name="User",
            role=UserRole.RECEPTIONIST,
            is_active=False
        )
        res = self.client.post(self.login_url, {
            "email": "inactive@example.com",
            "password": "SecretPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", res.data)
        self.assertFalse(os.path.exists(self.debug_log_path))

    def test_successful_jwt_response_retains_frontend_required_structure(self):
        res = self.client.post(self.login_url, {
            "email": "secure.user@example.com",
            "password": "ExactPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertIn("user", res.data)

        user_data = res.data["user"]
        self.assertEqual(user_data["id"], str(self.user.id))
        self.assertEqual(user_data["email"], "secure.user@example.com")
        self.assertEqual(user_data["first_name"], "Secure")
        self.assertEqual(user_data["last_name"], "Tester")
        self.assertEqual(user_data["phone"], "01711223344")
        self.assertEqual(user_data["role"], UserRole.DOCTOR)


class PasswordResetWorkflowTestCase(TestCase):
    """
    Comprehensive test suite for Task 2: Forgot Password & Reset Password Workflow:
    Verifies all 25 required security and functional assertions.
    """

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.forgot_url = "/api/v1/accounts/forgot-password/"
        self.reset_url = "/api/v1/accounts/reset-password/"
        self.login_url = "/api/v1/accounts/login/"
        self.refresh_url = "/api/v1/accounts/token/refresh/"
        mail.outbox = []

        self.debug_log_path = os.path.join(settings.BASE_DIR, "login_debug.log")
        if os.path.exists(self.debug_log_path):
            os.remove(self.debug_log_path)

        self.user = User.objects.create_user(
            email="doctor.tarek@example.com",
            password="OldStrongPassword123!",
            first_name="Tarek",
            last_name="Rahman",
            role=UserRole.DOCTOR,
            phone="01712345678"
        )
        self.inactive_user = User.objects.create_user(
            email="inactive.staff@example.com",
            password="OldStrongPassword123!",
            first_name="Inactive",
            last_name="Staff",
            role=UserRole.RECEPTIONIST,
            is_active=False
        )
        self.walkin_user = User.objects.create_user(
            email="walkin.01799999999@smartclinic.local",
            password="OldStrongPassword123!",
            first_name="Walkin",
            last_name="Patient",
            role=UserRole.PATIENT
        )

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()
        if os.path.exists(self.debug_log_path):
            os.remove(self.debug_log_path)

    def test_01_and_02_and_08_and_09_existing_active_email_forgot_password(self):
        # 1. Active existing email -> generic 200
        res = self.client.post(self.forgot_url, {"email": "doctor.tarek@example.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res.data["detail"],
            "If an account exists for this email, password reset instructions have been sent."
        )

        # 2. Existing email -> exactly one reset email
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, ["doctor.tarek@example.com"])
        self.assertEqual(sent_email.subject, "Reset Your Smart Clinic Password")

        # 8. Reset email contains reset URL
        self.assertIn("/reset-password/", sent_email.body)
        self.assertIn("1 hour", sent_email.body)

        # 9. Reset email contains no password
        self.assertNotIn("OldStrongPassword123!", sent_email.body)

    def test_03_and_04_unknown_email_receives_identical_generic_200_and_zero_emails(self):
        # 3. Unknown email -> identical generic 200
        res = self.client.post(self.forgot_url, {"email": "ghost.unknown@example.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res.data["detail"],
            "If an account exists for this email, password reset instructions have been sent."
        )

        # 4. Unknown email -> zero emails
        self.assertEqual(len(mail.outbox), 0)

    def test_05_and_06_inactive_email_receives_generic_200_and_zero_emails(self):
        # 5. Inactive email -> identical generic 200
        res = self.client.post(self.forgot_url, {"email": "inactive.staff@example.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res.data["detail"],
            "If an account exists for this email, password reset instructions have been sent."
        )

        # 6. Inactive account -> zero emails
        self.assertEqual(len(mail.outbox), 0)

    def test_07_synthetic_walkin_email_receives_generic_200_and_zero_emails(self):
        # 7. Synthetic @smartclinic.local walk-in -> generic 200 + zero emails
        res = self.client.post(self.forgot_url, {"email": "walkin.01799999999@smartclinic.local"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res.data["detail"],
            "If an account exists for this email, password reset instructions have been sent."
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_10_and_18_and_19_and_20_and_21_valid_uid_token_resets_password_cleanly(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        # 10. Valid UID/token resets password
        res = self.client.post(self.reset_url, {
            "uid": uid,
            "token": token,
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res.data["detail"],
            "Password has been reset successfully. You can now log in with your new password."
        )

        # 18. Old password fails after reset
        old_login = self.client.post(self.login_url, {
            "email": self.user.email,
            "password": "OldStrongPassword123!"
        }, format="json")
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # 19. New password successfully authenticates
        new_login = self.client.post(self.login_url, {
            "email": self.user.email,
            "password": "NewStrongPassword123!"
        }, format="json")
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
        self.assertIn("access", new_login.data)
        self.assertIn("refresh", new_login.data)

        # 20. User role remains unchanged
        # 21. User profile/clinic relationships remain unchanged
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, UserRole.DOCTOR)
        self.assertEqual(self.user.first_name, "Tarek")
        self.assertEqual(self.user.last_name, "Rahman")
        self.assertEqual(self.user.phone, "01712345678")
        self.assertEqual(self.user.email, "doctor.tarek@example.com")
        self.assertTrue(self.user.is_active)

    def test_11_invalid_and_forged_token_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        res = self.client.post(self.reset_url, {
            "uid": uid,
            "token": "fake-forged-token-xyz-1234",
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", res.data)

    def test_12_malformed_uid_rejected(self):
        res = self.client.post(self.reset_url, {
            "uid": "invalid---base64$$$",
            "token": "some-token",
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", res.data)

    def test_13_nonexistent_uid_rejected_safely(self):
        fake_uuid = uuid.uuid4()
        fake_uid = urlsafe_base64_encode(force_bytes(fake_uuid))
        res = self.client.post(self.reset_url, {
            "uid": fake_uid,
            "token": "some-token",
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", res.data)

    def test_14_expired_or_invalidated_token_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        # Alter password beforehand to simulate token invalidation/expiry
        self.user.set_password("IntermediatePassword123!")
        self.user.save()

        res = self.client.post(self.reset_url, {
            "uid": uid,
            "token": token,
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", res.data)

    def test_15_password_mismatch_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        res = self.client.post(self.reset_url, {
            "uid": uid,
            "token": token,
            "new_password": "PasswordAlpha123!",
            "confirm_password": "PasswordBeta456!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", res.data)

    def test_16_weak_password_rejected_by_django_validators(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        # Too short (< 8 chars)
        res_short = self.client.post(self.reset_url, {
            "uid": uid,
            "token": token,
            "new_password": "short",
            "confirm_password": "short"
        }, format="json")
        self.assertEqual(res_short.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", res_short.data)

        # Numeric only
        res_num = self.client.post(self.reset_url, {
            "uid": uid,
            "token": token,
            "new_password": "12345678",
            "confirm_password": "12345678"
        }, format="json")
        self.assertEqual(res_num.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", res_num.data)

    def test_17_used_token_cannot_be_reused(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        # First use: succeeds
        res1 = self.client.post(self.reset_url, {
            "uid": uid,
            "token": token,
            "new_password": "FirstNewPassword123!",
            "confirm_password": "FirstNewPassword123!"
        }, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second use with same token: MUST BE REJECTED
        res2 = self.client.post(self.reset_url, {
            "uid": uid,
            "token": token,
            "new_password": "SecondNewPassword123!",
            "confirm_password": "SecondNewPassword123!"
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", res2.data)

    def test_22_existing_refresh_token_becomes_unusable_after_reset(self):
        # 1. Obtain JWT session before reset
        login_res = self.client.post(self.login_url, {
            "email": self.user.email,
            "password": "OldStrongPassword123!"
        }, format="json")
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        refresh_token = login_res.data["refresh"]

        # 2. Reset password (refresh user state to include last_login updated by login)
        self.user.refresh_from_db()
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        res = self.client.post(self.reset_url, {
            "uid": uid,
            "token": token,
            "new_password": "NewStrongPassword123!",
            "confirm_password": "NewStrongPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 3. Old refresh token must be blacklisted and rejected
        refresh_res = self.client.post(self.refresh_url, {
            "refresh": refresh_token
        }, format="json")
        self.assertEqual(refresh_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_23_and_24_and_25_task1_hardening_and_jwt_contract_intact(self):
        # 23. Task 1 exact-password casing verification
        bad_case = self.client.post(self.login_url, {
            "email": self.user.email,
            "password": "oldstrongpassword123!"
        }, format="json")
        self.assertEqual(bad_case.status_code, status.HTTP_401_UNAUTHORIZED)

        # 24. No login_debug.log created
        self.assertFalse(os.path.exists(self.debug_log_path))

        # 25. Successful login contract preserved
        good_login = self.client.post(self.login_url, {
            "email": self.user.email,
            "password": "OldStrongPassword123!"
        }, format="json")
        self.assertEqual(good_login.status_code, status.HTTP_200_OK)
        self.assertIn("access", good_login.data)
        self.assertIn("refresh", good_login.data)
        self.assertIn("user", good_login.data)
        self.assertEqual(good_login.data["user"]["email"], "doctor.tarek@example.com")
        self.assertEqual(good_login.data["user"]["role"], UserRole.DOCTOR)




