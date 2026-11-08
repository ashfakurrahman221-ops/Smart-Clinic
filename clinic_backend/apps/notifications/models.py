from django.db import models
from django.conf import settings
from apps.core.models import BaseModel

class NotificationType(models.TextChoices):
    APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED', 'Appointment Booked'
    APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED', 'Appointment Confirmed'
    APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED', 'Appointment Cancelled'
    SERIAL_PROXIMITY_ALERT = 'SERIAL_PROXIMITY_ALERT', 'Serial Proximity Alert'
    PRESCRIPTION_ISSUED = 'PRESCRIPTION_ISSUED', 'Prescription Issued'
    CLINIC_APPROVED = 'CLINIC_APPROVED', 'Clinic Approved'
    DOCTOR_APPROVED = 'DOCTOR_APPROVED', 'Doctor Approved'
    SYSTEM = 'SYSTEM', 'System'

class Notification(BaseModel):
    """
    In-app database notification record extensible for email/push dispatchers.
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM
    )
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        return f"Notification to {self.recipient.email}: {self.title}"
