from django.db import models
from django.conf import settings
from apps.core.models import BaseModel
from apps.appointments.models import Appointment

class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'
    REFUNDED = 'REFUNDED', 'Refunded'

class PaymentMethod(models.TextChoices):
    BKASH = 'BKASH', 'bKash'
    NAGAD = 'NAGAD', 'Nagad'
    ROCKET = 'ROCKET', 'Rocket'
    CASH = 'CASH', 'Cash at Chamber'
    STRIPE = 'STRIPE', 'Stripe'
    SSLCOMMERZ = 'SSLCOMMERZ', 'SSLCommerz'
    PAYPAL = 'PAYPAL', 'PayPal'

class Payment(BaseModel):
    """
    1-to-1 payment record tied strictly to an Appointment.
    """
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.PROTECT,
        related_name='payment'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='BDT')
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.BKASH
    )
    transaction_id = models.CharField(max_length=255, blank=True, default='')
    val_id = models.CharField(max_length=255, blank=True, default='', help_text='SSLCommerz validation ID')
    bank_tran_id = models.CharField(max_length=255, blank=True, default='', help_text='Bank transaction ID')
    card_type = models.CharField(max_length=100, blank=True, default='', help_text='Card or MFS type (e.g. BKASH-BKash)')
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_payments',
        help_text="Receptionist who collected cash payment"
    )
    is_walk_in = models.BooleanField(default=False)
    walk_in_patient_name = models.CharField(max_length=150, blank=True, default='')
    walk_in_patient_phone = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'

    def __str__(self):
        return f"Payment {self.id.hex[:8]} - Appointment {self.appointment_id.hex[:8]} ({self.payment_status})"
