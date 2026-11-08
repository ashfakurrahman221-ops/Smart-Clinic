from typing import Optional
from django.db.models import QuerySet, Avg, Count
from .models import Specialization, Doctor, DoctorClinic

def list_specializations() -> QuerySet:
    return Specialization.objects.all()

def _doctor_base_qs() -> QuerySet:
    return Doctor.objects.filter(is_active=True).annotate(
        annotated_avg_rating=Avg('reviews__rating'),
        annotated_review_count=Count('reviews')
    ).prefetch_related(
        'specializations',
        'doctor_clinics__clinic',
        'doctor_clinics__department'
    ).order_by('-created_at')

def list_doctors(
    *,
    clinic_id: Optional[str] = None,
    specialization_id: Optional[str] = None,
    department_id: Optional[str] = None,
    only_verified: bool = True
) -> QuerySet:
    qs = _doctor_base_qs()
    if only_verified:
        qs = qs.filter(verification_status='VERIFIED')
    if clinic_id:
        qs = qs.filter(doctor_clinics__clinic_id=clinic_id, doctor_clinics__status='ACCEPTED', doctor_clinics__is_active=True)
    if specialization_id:
        qs = qs.filter(specializations__id=specialization_id)
    if department_id:
        qs = qs.filter(doctor_clinics__department_id=department_id, doctor_clinics__status='ACCEPTED', doctor_clinics__is_active=True)
    return qs.distinct()

def get_doctor_by_id(doctor_id: str) -> Optional[Doctor]:
    return _doctor_base_qs().filter(id=doctor_id).first()
