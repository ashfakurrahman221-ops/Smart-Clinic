import os
import sys
import django
from decimal import Decimal

# Setup django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.common.models import Division, District, Upazila
from apps.clinics.models import Clinic, Department, ClinicDepartment
from apps.doctors.models import Doctor, Specialization, DoctorClinic, DoctorSchedule, ChamberSession
from apps.accounts.models import User, FamilyMember
from apps.appointments.models import Appointment, AppointmentStatus
from apps.prescriptions.models import Prescription, PrescribedMedication, Medication
from apps.notifications.models import Notification
from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.reviews.models import Review

# Seed a payment and review for completed appointment if missing
completed_app = Appointment.objects.filter(status=AppointmentStatus.COMPLETED).first()
if completed_app:
    Payment.objects.get_or_create(
        appointment=completed_app,
        defaults={
            "amount": completed_app.amount or Decimal("600.00"),
            "currency": "BDT",
            "payment_method": PaymentMethod.BKASH,
            "transaction_id": "TRX987216345BK",
            "val_id": "VAL987216345",
            "bank_tran_id": "BANK77665544",
            "card_type": "BKASH-BKash",
            "payment_status": PaymentStatus.COMPLETED,
        }
    )
    Review.objects.get_or_create(
        appointment=completed_app,
        defaults={
            "patient": completed_app.patient,
            "doctor": completed_app.doctor,
            "clinic": completed_app.clinic,
            "rating": 5,
            "comment": "Exceptional consultation. The doctor took time to listen attentively and explained the prescription thoroughly.",
        }
    )

print("=== NEON POSTGRESQL ROW COUNT VERIFICATION ===")
models = [
    ("Divisions (Geo)", Division),
    ("Districts (Geo)", District),
    ("Upazilas/Thanas (Geo)", Upazila),
    ("Clinics", Clinic),
    ("Departments", Department),
    ("Clinic Departments", ClinicDepartment),
    ("Specializations", Specialization),
    ("Doctors", Doctor),
    ("Doctor Clinics (Affiliations)", DoctorClinic),
    ("Doctor Schedules", DoctorSchedule),
    ("Live Chamber Sessions", ChamberSession),
    ("Users (Accounts)", User),
    ("Family Members", FamilyMember),
    ("Appointments", Appointment),
    ("Prescriptions", Prescription),
    ("Prescribed Medications", PrescribedMedication),
    ("DGDA Medications Catalog", Medication),
    ("Payments", Payment),
    ("Patient Reviews", Review),
    ("Notifications", Notification),
]

total_rows = 0
for name, model in models:
    count = model.objects.count()
    total_rows += count
    print(f"  * {name:<30}: {count:>6} rows")

print(f"\nTotal Records in Neon Database: {total_rows}")
print("=== VERIFICATION COMPLETE ===")
