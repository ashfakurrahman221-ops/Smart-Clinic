import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User, UserRole
from apps.clinics.models import Clinic, ClinicStaff, StaffRole

DEMO_PASSWORD = "Password123!"

# 1. Create or get Receptionist
receptionist_user, created = User.objects.get_or_create(
    email="receptionist@clinic.com",
    defaults={
        "first_name": "Tania",
        "last_name": "Akter",
        "phone": "+8801712345678",
        "role": UserRole.RECEPTIONIST,
        "is_active": True,
    }
)
receptionist_user.set_password(DEMO_PASSWORD)
receptionist_user.role = UserRole.RECEPTIONIST
receptionist_user.first_name = "Tania"
receptionist_user.last_name = "Akter"
receptionist_user.is_active = True
receptionist_user.save()

# 2. Link Receptionist to Metro Health Hub
metro_clinic = Clinic.objects.filter(name__icontains="Metro Health").first()
if not metro_clinic:
    metro_clinic = Clinic.objects.first()

staff_profile, s_created = ClinicStaff.objects.get_or_create(
    user=receptionist_user,
    defaults={
        "clinic": metro_clinic,
        "name": "Tania Akter",
        "phone": "+8801712345678",
        "role": StaffRole.RECEPTIONIST,
        "is_active": True,
        "monthly_salary": 25000.00,
        "permissions": {
            "can_call_next": True,
            "can_add_walkin": True,
            "can_receive_cash": True,
            "can_mark_attendance": True
        }
    }
)
if not s_created:
    staff_profile.clinic = metro_clinic
    staff_profile.is_active = True
    staff_profile.save()

print(f"Receptionist: {receptionist_user.email} -> Clinic: {metro_clinic.name}")

# List accounts by role
print("\n=== SYSTEM CREDENTIALS SUMMARY ===")
roles = [UserRole.ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.PATIENT]
for r in roles:
    users = User.objects.filter(role=r)
    print(f"\n[{r.name} / {r.value}] ({users.count()} users):")
    for u in users[:4]:
        print(f"  - {u.email} ({u.first_name} {u.last_name}) | Active: {u.is_active}")

