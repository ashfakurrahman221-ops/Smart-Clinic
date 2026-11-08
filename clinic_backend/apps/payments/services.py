from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import Payment, PaymentStatus, PaymentMethod
from apps.appointments.models import Appointment, AppointmentStatus

def initiate_payment(*, appointment: Appointment, payment_method: str = PaymentMethod.STRIPE) -> Payment:
    if hasattr(appointment, 'payment'):
        return appointment.payment

    payment = Payment.objects.create(
        appointment=appointment,
        amount=appointment.amount,
        payment_method=payment_method,
        payment_status=PaymentStatus.PENDING
    )
    return payment

def process_payment_success(*, payment: Payment, transaction_id: str, val_id: str = '', bank_tran_id: str = '', card_type: str = '', payment_method: str = '') -> Payment:
    if payment.payment_status == PaymentStatus.COMPLETED:
        return payment

    with transaction.atomic():
        payment.payment_status = PaymentStatus.COMPLETED
        payment.transaction_id = transaction_id
        if val_id:
            payment.val_id = val_id
        if bank_tran_id:
            payment.bank_tran_id = bank_tran_id
        if card_type:
            payment.card_type = card_type
        if payment_method and payment_method.upper() in PaymentMethod.values:
            payment.payment_method = payment_method.upper()

        payment.save(update_fields=['payment_status', 'transaction_id', 'val_id', 'bank_tran_id', 'card_type', 'payment_method', 'updated_at'])

        # Update appointment status to CONFIRMED
        appointment = payment.appointment
        appointment.status = AppointmentStatus.CONFIRMED
        appointment.save(update_fields=['status', 'updated_at'])

        # Dispatch confirmation SMS to patient with serial number and tracking link
        try:
            from apps.notifications.sms_service import send_sms_notification
            from apps.notifications.models import NotificationType

            patient_name = (
                appointment.family_member.full_name
                if appointment.family_member
                else f"{appointment.patient.first_name} {appointment.patient.last_name}".strip()
            ) or "Patient"

            method_label = dict(PaymentMethod.choices).get(payment.payment_method, payment.payment_method)
            send_sms_notification(
                recipient=appointment.patient,
                title=f"Payment Confirmed - Serial #{appointment.serial_number}",
                message=(
                    f"Dear {patient_name}, payment of BDT {payment.amount} via {method_label} is CONFIRMED! "
                    f"Your appointment with Dr. {appointment.doctor.full_name} at {appointment.clinic.name} is on {appointment.appointment_date}. "
                    f"Serial #{appointment.serial_number}. TrxID: {transaction_id}. Live queue tracker: /track-queue/{appointment.id}"
                ),
                notification_type=NotificationType.APPOINTMENT_CONFIRMATION,
                phone=appointment.patient.phone
            )
        except Exception:
            pass  # Non-blocking SMS dispatch

    return payment

