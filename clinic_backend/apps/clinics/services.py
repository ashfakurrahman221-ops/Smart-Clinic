from typing import Dict, Any
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError
from .models import Clinic, Department, ClinicDepartment

def create_department(*, name: str, description: str = "", icon_url: str = None) -> Department:
    if Department.objects.filter(name__iexact=name).exists():
        raise ValidationError({"name": "A department with this name already exists."})
    return Department.objects.create(name=name, description=description, icon_url=icon_url)

def create_clinic(*, owner, name: str, address: str, city: str, phone: str, email: str, **extra_fields) -> Clinic:
    if owner.role == 'CLINIC_ADMIN' and Clinic.objects.filter(owner=owner).exists():
        raise ValidationError({"detail": "Only one clinic can be created per Clinic Admin. You already own a clinic."})
    
    slug = extra_fields.pop('slug', None) or slugify(name)
    if Clinic.objects.filter(slug=slug).exists():
        slug = f"{slug}-{owner.id.hex[:6]}"

    return Clinic.objects.create(
        owner=owner,
        name=name,
        slug=slug,
        address=address,
        city=city,
        phone=phone,
        email=email,
        **extra_fields
    )

def add_department_to_clinic(*, clinic: Clinic, department_id: str) -> ClinicDepartment:
    try:
        department = Department.objects.get(id=department_id, is_active=True)
    except Department.DoesNotExist:
        raise ValidationError({"department_id": "Valid active department not found."})

    obj, created = ClinicDepartment.objects.get_or_create(clinic=clinic, department=department)
    if not created and not obj.is_active:
        obj.is_active = True
        obj.save(update_fields=['is_active', 'updated_at'])
    return obj
