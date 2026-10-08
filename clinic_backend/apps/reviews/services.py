from rest_framework.exceptions import ValidationError
from .models import Review
from apps.appointments.models import Appointment, AppointmentStatus

def create_review(*, appointment_id: str, patient, rating: int, comment: str = "") -> Review:
    try:
        appointment = Appointment.objects.select_related('doctor', 'clinic').get(id=appointment_id)
    except Appointment.DoesNotExist:
        raise ValidationError({"appointment_id": "Appointment not found."})

    if appointment.patient != patient:
        raise ValidationError({"detail": "You can only review your own appointments."})

    if appointment.status != AppointmentStatus.COMPLETED:
        raise ValidationError({"detail": "Reviews can only be submitted for COMPLETED appointments."})

    if hasattr(appointment, 'review'):
        raise ValidationError({"detail": "A review has already been submitted for this appointment."})

    review = Review.objects.create(
        appointment=appointment,
        patient=patient,
        doctor=appointment.doctor,
        clinic=appointment.clinic,
        rating=rating,
        comment=comment
    )
    return review
