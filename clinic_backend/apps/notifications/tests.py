from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import UserRole
from apps.notifications.models import Notification, NotificationType

User = get_user_model()

class NotificationAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="notif.user@example.com",
            password="Password123!",
            role=UserRole.PATIENT
        )
        self.other_user = User.objects.create_user(
            email="other.notif@example.com",
            password="Password123!",
            role=UserRole.PATIENT
        )
        self.notification = Notification.objects.create(
            recipient=self.user,
            title="Appointment Confirmed",
            message="Your appointment is confirmed.",
            notification_type=NotificationType.APPOINTMENT_CONFIRMED
        )

    def test_notification_list_and_read(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"] if "results" in res.data else res.data), 1)

        read_res = self.client.post(f"/api/v1/notifications/{self.notification.id}/read/")
        self.assertEqual(read_res.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_notification_delete(self):
        self.client.force_authenticate(user=self.user)
        del_res = self.client.delete(f"/api/v1/notifications/{self.notification.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Notification.objects.filter(id=self.notification.id).exists())

    def test_cannot_delete_other_user_notification(self):
        self.client.force_authenticate(user=self.other_user)
        del_res = self.client.delete(f"/api/v1/notifications/{self.notification.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Notification.objects.filter(id=self.notification.id).exists())
