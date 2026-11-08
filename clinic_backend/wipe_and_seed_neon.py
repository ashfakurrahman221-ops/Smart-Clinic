import os
import sys
import datetime
from decimal import Decimal
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from apps.accounts.models import User, UserRole, FamilyMember
from apps.clinics.models import Clinic, ClinicStaff, StaffRole, VerificationStatus, Department, ClinicDepartment, Announcement, ShiftClosingLog, StaffAttendance, ClinicService
from apps.doctors.models import Doctor, DoctorClinic, Specialization, DoctorSchedule, ChamberSession, DoctorLeave, DoctorClinicStatus
from apps.appointments.models import Appointment
from apps.prescriptions.models import Prescription, PrescribedMedication, MedicalReport, PatientVitalLog
from apps.notifications.models import Notification
from apps.payments.models import Payment
from apps.reviews.models import Review

print("=== Starting Neon Database Wipe & Minimal Clean Seed ===")

DEFAULT_PASSWORD = "Password123!"

with transaction.atomic():
    print("1. Deleting all transactional and operational data...")
    if hasattr(Review, 'all_objects'):
        Review.all_objects.all().delete()
    else:
        Review.objects.all().delete()

    if hasattr(Payment, 'all_objects'):
        Payment.all_objects.all().delete()
    else:
        Payment.objects.all().delete()

    if hasattr(PrescribedMedication, 'all_objects'):
        PrescribedMedication.all_objects.all().delete()
    else:
        PrescribedMedication.objects.all().delete()

    if hasattr(Prescription, 'all_objects'):
        Prescription.all_objects.all().delete()
    else:
        Prescription.objects.all().delete()

    if hasattr(MedicalReport, 'all_objects'):
        MedicalReport.all_objects.all().delete()
    else:
        MedicalReport.objects.all().delete()

    if hasattr(PatientVitalLog, 'all_objects'):
        PatientVitalLog.all_objects.all().delete()
    else:
        PatientVitalLog.objects.all().delete()

    if hasattr(Appointment, 'all_objects'):
        Appointment.all_objects.all().delete()
    else:
        Appointment.objects.all().delete()

    if hasattr(Notification, 'all_objects'):
        Notification.all_objects.all().delete()
    else:
        Notification.objects.all().delete()

    if hasattr(StaffAttendance, 'all_objects'):
        StaffAttendance.all_objects.all().delete()
    else:
        StaffAttendance.objects.all().delete()

    if hasattr(ShiftClosingLog, 'all_objects'):
        ShiftClosingLog.all_objects.all().delete()
    else:
        ShiftClosingLog.objects.all().delete()

    if hasattr(Announcement, 'all_objects'):
        Announcement.all_objects.all().delete()
    else:
        Announcement.objects.all().delete()

    if hasattr(ChamberSession, 'all_objects'):
        ChamberSession.all_objects.all().delete()
    else:
        ChamberSession.objects.all().delete()

    if hasattr(DoctorSchedule, 'all_objects'):
        DoctorSchedule.all_objects.all().delete()
    else:
        DoctorSchedule.objects.all().delete()

    if hasattr(DoctorLeave, 'all_objects'):
        DoctorLeave.all_objects.all().delete()
    else:
        DoctorLeave.objects.all().delete()

    if hasattr(DoctorClinic, 'all_objects'):
        DoctorClinic.all_objects.all().delete()
    else:
        DoctorClinic.objects.all().delete()

    if hasattr(ClinicStaff, 'all_objects'):
        ClinicStaff.all_objects.all().delete()
    else:
        ClinicStaff.objects.all().delete()

    if hasattr(ClinicDepartment, 'all_objects'):
        ClinicDepartment.all_objects.all().delete()
    else:
        ClinicDepartment.objects.all().delete()

    if hasattr(ClinicService, 'all_objects'):
        ClinicService.all_objects.all().delete()
    else:
        ClinicService.objects.all().delete()

    if hasattr(FamilyMember, 'all_objects'):
        FamilyMember.all_objects.all().delete()
    else:
        FamilyMember.objects.all().delete()

    print("2. Deleting old doctors and clinics...")
    Doctor.all_objects.all().delete()
    Clinic.all_objects.all().delete()

    print("3. Cleaning up old users...")
    target_emails = [
        "admin@clinic.com",
        "alia12bhhatt122@gmail.com",
        "clinicadmin@clinic.com",
        "dr.taskin@smartclinic.bd",
        "dr.taskin@clinic.com",
        "rahela_counter@clinic.test",
        "receptionist@clinic.com",
        "rahim@patient.com",
        "patient@clinic.com"
    ]
    User.objects.exclude(email__in=target_emails).delete()
    User.objects.filter(email__in=target_emails).delete()

    print("4. Creating Master Specializations...")
    specs = [
        "General Medicine",
        "Cardiology",
        "Pediatrics",
        "Gynecology & Obstetrics",
        "General Surgery",
        "Dermatology",
        "Orthopedics",
        "Neurology",
        "Endocrinology",
        "ENT (Ear, Nose, Throat)"
    ]
    spec_objs = {}
    for s_name in specs:
        s, _ = Specialization.objects.get_or_create(name=s_name)
        spec_objs[s_name] = s

    print("5. Seeding Core Role Users...")
    
    # 5.1 Super Admin
    super_admin = User.objects.create(
        email="admin@clinic.com",
        first_name="Super",
        last_name="Admin",
        role=UserRole.ADMIN,
        phone="+8801700000001",
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    super_admin.set_password(DEFAULT_PASSWORD)
    super_admin.save()
    print(f"Created Super Admin: {super_admin.email}")

    # 5.2 Clinic Admins (Both UI Quick Button & standard alias)
    clinic_admins = []
    for c_email, f_name, l_name in [
        ("alia12bhhatt122@gmail.com", "Alia", "Bhatt"),
        ("clinicadmin@clinic.com", "Clinic", "Admin"),
    ]:
        ca = User.objects.create(
            email=c_email,
            first_name=f_name,
            last_name=l_name,
            role=UserRole.CLINIC_ADMIN,
            phone="+8801700000002",
            is_active=True
        )
        ca.set_password(DEFAULT_PASSWORD)
        ca.save()
        clinic_admins.append(ca)
        print(f"Created Clinic Admin: {ca.email}")

    # 5.3 Doctor Taskin Users (Both UI Quick Button & standard alias)
    doc_users = []
    for d_email in ["dr.taskin@smartclinic.bd", "dr.taskin@clinic.com"]:
        du = User.objects.create(
            email=d_email,
            first_name="Taskin",
            last_name="Ahmed",
            role=UserRole.DOCTOR,
            phone="+8801700000003",
            is_active=True
        )
        du.set_password(DEFAULT_PASSWORD)
        du.save()
        doc_users.append(du)
        print(f"Created Doctor User: {du.email}")

    # 5.4 Receptionist Users (Both UI Quick Button & standard alias)
    rec_users = []
    for r_email, f_name, l_name in [
        ("rahela_counter@clinic.test", "Rahela", "Begum"),
        ("receptionist@clinic.com", "Receptionist", "Staff"),
    ]:
        ru = User.objects.create(
            email=r_email,
            first_name=f_name,
            last_name=l_name,
            role=UserRole.RECEPTIONIST,
            phone="+8801700000004",
            is_active=True
        )
        ru.set_password(DEFAULT_PASSWORD)
        ru.save()
        rec_users.append(ru)
        print(f"Created Receptionist User: {ru.email}")

    # 5.5 Patient Users (Both UI Quick Button & standard alias)
    patient_users = []
    for p_email, f_name, l_name in [
        ("rahim@patient.com", "Rahim", "Khan"),
        ("patient@clinic.com", "John", "Patient"),
    ]:
        pu = User.objects.create(
            email=p_email,
            first_name=f_name,
            last_name=l_name,
            role=UserRole.PATIENT,
            phone="+8801700000005",
            is_active=True
        )
        pu.set_password(DEFAULT_PASSWORD)
        pu.save()
        patient_users.append(pu)
        print(f"Created Patient User: {pu.email}")

    print("6. Creating Base Clinic (Metro Health Care)...")
    base_clinic = Clinic.objects.create(
        owner=clinic_admins[0],  # Owned by alia12bhhatt122@gmail.com
        name="Metro Health Care",
        city="Dhaka",
        address="House 12, Road 4, Sector 7, Uttara, Dhaka-1230",
        phone="+8801788888888",
        email="info@metrohealthcare.bd",
        verification_status=VerificationStatus.VERIFIED,
        is_active=True,
        latitude=Decimal("23.8759"),
        longitude=Decimal("90.3795"),
        logo_url="https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=150&auto=format&fit=crop&q=80"
    )
    print(f"Created Clinic: {base_clinic.name} (Owned by {clinic_admins[0].email})")

    print("7. Linking Receptionists to Clinic...")
    for ru in rec_users:
        ClinicStaff.objects.create(
            clinic=base_clinic,
            user=ru,
            name=f"{ru.first_name} {ru.last_name}",
            phone="+8801700000004",
            role=StaffRole.RECEPTIONIST,
            is_active=True,
            monthly_salary=Decimal("25000.00"),
            permissions={
                "can_call_next": True,
                "can_add_walkin": True,
                "can_receive_cash": True,
                "can_mark_attendance": True
            }
        )
        print(f"Linked Receptionist {ru.email} -> {base_clinic.name}")

    print("8. Creating Doctor Taskin Profile & Affiliation...")
    # Create doctor profile for primary Dr. Taskin user (dr.taskin@smartclinic.bd)
    doctor_taskin = Doctor.objects.create(
        user=doc_users[0],
        email=doc_users[0].email,
        full_name="Taskin Ahmed",
        qualification="MBBS, FCPS (Medicine)",
        bio="Senior Consultant Physician specializing in Internal Medicine and outpatient care.",
        experience_years=10,
        phone="+8801700000003",
        avatar_url="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
        verification_status=VerificationStatus.VERIFIED,
        is_active=True
    )
    doctor_taskin.specializations.add(spec_objs["General Medicine"], spec_objs["Cardiology"])

    DoctorClinic.objects.create(
        doctor=doctor_taskin,
        clinic=base_clinic,
        consultation_fee=Decimal("800.00"),
        room_number="Room 101",
        status=DoctorClinicStatus.ACCEPTED,
        is_active=True
    )

    # 7-day recurring schedule for Dr. Taskin (09:00 - 17:00, 15-min slots)
    for day in range(7):
        DoctorSchedule.objects.create(
            doctor=doctor_taskin,
            clinic=base_clinic,
            day_of_week=day,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(17, 0),
            slot_duration_minutes=15,
            max_patients=30,
            is_active=True
        )

    # Also link the second user alias (dr.taskin@clinic.com) if desired
    doctor_taskin_alias = Doctor.objects.create(
        user=doc_users[1],
        email=doc_users[1].email,
        full_name="Taskin Ahmed (Alias)",
        qualification="MBBS, FCPS (Medicine)",
        bio="Senior Consultant Physician specializing in Internal Medicine and outpatient care.",
        experience_years=10,
        phone="+8801700000003",
        avatar_url="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
        verification_status=VerificationStatus.VERIFIED,
        is_active=True
    )
    doctor_taskin_alias.specializations.add(spec_objs["General Medicine"])
    DoctorClinic.objects.create(
        doctor=doctor_taskin_alias,
        clinic=base_clinic,
        consultation_fee=Decimal("800.00"),
        room_number="Room 102",
        status=DoctorClinicStatus.ACCEPTED,
        is_active=True
    )

    print(f"Configured Dr. Taskin Ahmed ({doc_users[0].email}) at {base_clinic.name} with 7-day schedule.")

print("\n=== Minimal Clean Database State Summary ===")
print(f"Clinics: {Clinic.objects.count()} (Metro Health Care)")
print(f"Doctors: {Doctor.objects.count()} (Dr. Taskin Ahmed)")
print(f"Users: {User.objects.count()}")
for u in User.objects.all():
    print(f"  * {u.email:<30} | Role: {u.role:<15} | Password: {DEFAULT_PASSWORD}")
print(f"Appointments: {Appointment.objects.count()} (Clean slate - zero records)")
print(f"Payments: {Payment.objects.count()} (Clean slate - zero records)")
print(f"Prescriptions: {Prescription.objects.count()} (Clean slate - zero records)")
print(f"Chamber Sessions: {ChamberSession.objects.count()} (Clean slate - zero records)")
print("=== WIPE & MINIMAL SEED COMPLETED SUCCESSFULLY ===")
