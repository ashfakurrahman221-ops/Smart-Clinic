import os
import sys
import django
import datetime
import uuid
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from apps.accounts.models import User, UserRole, FamilyMember
from apps.common.models import Division, District, Upazila
from apps.clinics.models import Clinic, ClinicStaff, StaffRole, VerificationStatus, ClinicService, Announcement, AnnouncementType
from apps.doctors.models import Doctor, DoctorClinic, DoctorClinicStatus, Specialization, DoctorSchedule, ChamberSession, ChamberSessionStatus
from apps.appointments.models import Appointment, AppointmentStatus
from apps.prescriptions.models import Prescription, PrescribedMedication, Medication, MedicationForm
from apps.notifications.models import Notification, NotificationType
from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.reviews.models import Review

print("=== Starting Real-Life Data Seeding ===")

# 1. Standardize demo passwords
DEMO_PASSWORD = "Password123!"
common_hashed_password = make_password(DEMO_PASSWORD)

demo_accounts = [
    ("admin@clinic.com", UserRole.ADMIN, "Super", "Admin"),
    ("superAdmin@gmail.com", UserRole.ADMIN, "Super", "Admin"),
    ("monira@gmail.com", UserRole.CLINIC_ADMIN, "Monira", "Tanzin"),
    ("khudezababy@gmail.com", UserRole.CLINIC_ADMIN, "Khudeza", "Begum"),
    ("lubna@gmail.com", UserRole.DOCTOR, "Dr. Naznin Jahan", "Lubna"),
    ("mohosina@gmail.com", UserRole.DOCTOR, "Dr. Mohosina", "Akter"),
    ("dr.nusrat@smartclinic.bd", UserRole.DOCTOR, "Dr. Nusrat", "Jahan"),
    ("dr.taskin@smartclinic.bd", UserRole.DOCTOR, "Dr. Taskin", "Ahmed"),
    ("alia12bhhatt122@gmail.com", UserRole.CLINIC_ADMIN, "Alia", "Bhatt"),
    ("rahim@patient.com", UserRole.PATIENT, "Rahim", "Uddin"),
    ("rahela_counter@clinic.test", UserRole.RECEPTIONIST, "Rahela", "Begum"),
    ("receptionist@clinic.com", UserRole.RECEPTIONIST, "Tania", "Akter"),
    ("alif@gmail.com", UserRole.PATIENT, "Alif", "Khan"),
    ("monjurul@gmail.com", UserRole.PATIENT, "Monjurul", "Hasan"),
    ("ramin@gmail.com", UserRole.PATIENT, "Ashfakur Rahman", "Ramin"),
    ("tariq@gmail.com", UserRole.PATIENT, "Tariqul", "Islam"),
    ("sadia@gmail.com", UserRole.PATIENT, "Sadia", "Afrin"),
    ("anika@gmail.com", UserRole.PATIENT, "Anika", "Tabassum"),
    ("hasan@gmail.com", UserRole.PATIENT, "Hasan", "Mahmud"),
    ("farhana@gmail.com", UserRole.PATIENT, "Farhana", "Yasmin"),
]

for email, role, fname, lname in demo_accounts:
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "first_name": fname,
            "last_name": lname,
            "role": role,
            "phone": "01700000000",
            "password": common_hashed_password,
            "is_active": True,
        }
    )
    user.password = common_hashed_password
    user.first_name = fname
    user.last_name = lname
    user.role = role
    user.is_active = True
    if role == UserRole.ADMIN:
        user.is_staff = True
        user.is_superuser = True
    user.save()

# Also set password for all other users in DB so everything works
for user in User.objects.all():
    user.password = common_hashed_password
    user.is_active = True
    user.save()
print("Synchronized all user accounts and credentials.")

# Geo lookups
div_dhaka = Division.objects.filter(name__iexact="Dhaka").first()
dist_dhaka = District.objects.filter(name__iexact="Dhaka").first()
upz_uttara = Upazila.objects.filter(name__iexact="Uttara").first()
upz_dhanmondi = Upazila.objects.filter(name__iexact="Dhanmondi").first()

div_mym = Division.objects.filter(name__iexact="Mymensingh").first()
dist_sherpur = District.objects.filter(name__iexact="Sherpur").first()
upz_sherpur = Upazila.objects.filter(name__iexact="Sherpur Sadar").first()

# 2. Clean dummy clinics & ensure realistic clinics
Clinic.all_objects.filter(name='string').delete()

metro_clinic = Clinic.objects.filter(owner__email="ish@gmail.com").first()
if not metro_clinic:
    metro_clinic = Clinic.objects.filter(name__icontains="Metro").first()
if not metro_clinic:
    metro_clinic = Clinic.objects.filter(name__icontains="ABC").first()
if not metro_clinic:
    metro_clinic = Clinic.objects.create(
        name="Metro Health Hub",
        city="Dhaka",
        division=div_dhaka,
        district=dist_dhaka,
        upazila=upz_uttara,
        address="House 12, Road 4, Sector 7, Uttara, Dhaka-1230",
        phone="+8801788888888",
        email="metrohealth@clinic.test",
        verification_status=VerificationStatus.VERIFIED,
        is_active=True,
        latitude=23.8759,
        longitude=90.3795,
        logo_url="https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=150&auto=format&fit=crop&q=80",
    )
else:
    metro_clinic.name = "Metro Health Hub"
    metro_clinic.city = "Dhaka"
    metro_clinic.division = div_dhaka
    metro_clinic.district = dist_dhaka
    metro_clinic.upazila = upz_uttara
    metro_clinic.address = "House 12, Road 4, Sector 7, Uttara, Dhaka-1230"
    metro_clinic.phone = "+8801788888888"
    metro_clinic.verification_status = VerificationStatus.VERIFIED
    metro_clinic.is_active = True
    metro_clinic.is_deleted = False
    metro_clinic.latitude = 23.8759
    metro_clinic.longitude = 90.3795
    metro_clinic.logo_url = "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=150&auto=format&fit=crop&q=80"
    metro_clinic.save()

# Link Receptionists to Metro Health Hub
for r_email, r_name in [("rahela_counter@clinic.test", "Rahela Begum"), ("receptionist@clinic.com", "Tania Akter")]:
    r_user = User.objects.filter(email=r_email).first()
    if r_user and metro_clinic:
        ClinicStaff.objects.update_or_create(
            user=r_user,
            defaults={
                "clinic": metro_clinic,
                "name": r_name,
                "phone": "+8801712000000",
                "role": StaffRole.RECEPTIONIST,
                "is_active": True,
                "monthly_salary": Decimal("25000.00"),
                "permissions": {
                    "can_call_next": True,
                    "can_add_walkin": True,
                    "can_receive_cash": True,
                    "can_mark_attendance": True
                }
            }
        )
print("Linked Receptionists to Metro Health Hub.")

abedin_clinic = Clinic.objects.filter(owner__email="monira@gmail.com").first()
if not abedin_clinic:
    abedin_clinic = Clinic.objects.filter(name__icontains="Abedin").first()
if abedin_clinic:
    abedin_clinic.name = "Abedin Hospital & Specialized Center"
    abedin_clinic.city = "Sherpur"
    abedin_clinic.division = div_mym
    abedin_clinic.district = dist_sherpur
    abedin_clinic.upazila = upz_sherpur
    abedin_clinic.address = "Sadar Hospital Road, Narayanpur, Sherpur-2100"
    abedin_clinic.phone = "+8801839838383"
    abedin_clinic.verification_status = VerificationStatus.VERIFIED
    abedin_clinic.is_active = True
    abedin_clinic.is_deleted = False
    abedin_clinic.latitude = 25.0194
    abedin_clinic.longitude = 90.0152
    abedin_clinic.logo_url = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=150&auto=format&fit=crop&q=80"
    abedin_clinic.save()

sherpur_clinic = Clinic.objects.filter(name__icontains="Sherpur District").first()
if not sherpur_clinic:
    sherpur_clinic = Clinic.objects.filter(owner__email="we@gmail.com").first()
if sherpur_clinic:
    sherpur_clinic.name = "Sherpur District Hospital (250 Bed)"
    sherpur_clinic.city = "Sherpur"
    sherpur_clinic.division = div_mym
    sherpur_clinic.district = dist_sherpur
    sherpur_clinic.upazila = upz_sherpur
    sherpur_clinic.address = "Shaheed Bulbul Road, Sherpur Sadar, Sherpur-2100"
    sherpur_clinic.phone = "+8801715536930"
    sherpur_clinic.verification_status = VerificationStatus.VERIFIED
    sherpur_clinic.is_active = True
    sherpur_clinic.is_deleted = False
    sherpur_clinic.latitude = 25.0210
    sherpur_clinic.longitude = 90.0170
    sherpur_clinic.logo_url = "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=150&auto=format&fit=crop&q=80"
    sherpur_clinic.save()

popular_clinic = Clinic.objects.filter(owner__email="mptop@gmail.com").first()
if not popular_clinic:
    popular_clinic = Clinic.objects.filter(name__icontains="Popular Diagnostic & Medical").first()
if popular_clinic:
    popular_clinic.name = "Popular Diagnostic & Medical Center"
    popular_clinic.city = "Dhaka"
    popular_clinic.division = div_dhaka
    popular_clinic.district = dist_dhaka
    popular_clinic.upazila = upz_dhanmondi
    popular_clinic.address = "House 16, Road 2, Dhanmondi, Dhaka-1205"
    popular_clinic.phone = "+8801623892321"
    popular_clinic.verification_status = VerificationStatus.VERIFIED
    popular_clinic.is_active = True
    popular_clinic.is_deleted = False
    popular_clinic.latitude = 23.7465
    popular_clinic.longitude = 90.3860
    popular_clinic.logo_url = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80"
    popular_clinic.save()

print("Updated partner medical centers successfully with verified status and geo foreign keys.")

# 3. Specializations
specs_names = [
    "Cardiology",
    "Gynecology & Obstetrics",
    "General Surgery",
    "General Medicine",
    "Endocrinology",
    "Gastroenterology",
    "Neurology",
    "Urology",
    "Pediatrics",
    "Orthopedics",
    "Dermatology"
]

spec_map = {}
for name in specs_names:
    s, _ = Specialization.objects.get_or_create(name=name)
    spec_map[name] = s

# Clear old schedules using all_objects to bypass soft-delete unique constraint
DoctorSchedule.all_objects.all().delete()

# 4. Doctors & Specializations & Clinic Links
doc_configs = [
    {
        "email": "dr.taskin@smartclinic.bd",
        "full_name": "Taskin Ahmed",
        "qualification": "MBBS, FCPS (Medicine)",
        "bio": "Consultant Physician specializing in internal medicine, diabetes, and preventive healthcare.",
        "specs": ["General Medicine"],
        "experience_years": 8,
        "phone": "+8801755998877",
        "room_number": "Room 203",
        "avatar_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
        "clinics": [(metro_clinic, Decimal("700.00")), (abedin_clinic, Decimal("700.00"))],
    },
    {
        "email": "dr.nusrat@smartclinic.bd",
        "full_name": "Nusrat Jahan",
        "qualification": "MBBS, FCPS (Medicine), MD (Cardiology)",
        "bio": "Senior Consultant Physician specializing in general medicine, dynamic outpatient care, and hypertension management.",
        "specs": ["Cardiology", "General Medicine"],
        "experience_years": 11,
        "phone": "+8801755112233",
        "room_number": "Room 201",
        "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
        "clinics": [(metro_clinic, Decimal("800.00")), (abedin_clinic, Decimal("800.00"))],
    },
    {
        "email": "mohosina@gmail.com",
        "full_name": "Mohosina Akter",
        "qualification": "MBBS, BCS (Health), FCPS (Medicine)",
        "bio": "Experienced clinical specialist with over 10 years treating endocrine and complex general medical disorders.",
        "specs": ["Endocrinology", "General Medicine"],
        "experience_years": 12,
        "phone": "+8801711223344",
        "room_number": "Room 102",
        "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
        "clinics": [(metro_clinic, Decimal("600.00")), (abedin_clinic, Decimal("500.00"))],
    },
    {
        "email": "lubna@gmail.com",
        "full_name": "Naznin Jahan Lubna",
        "qualification": "MBBS, MCPS, DGO, FCPS (Obs & Gynae)",
        "bio": "Leading obstetrician and gynecologist dedicated to maternal healthcare, high-risk pregnancy, and laparoscopic surgery.",
        "specs": ["Gynecology & Obstetrics"],
        "experience_years": 9,
        "phone": "+8801812345678",
        "room_number": "Room 105",
        "avatar_url": "https://images.unsplash.com/photo-1594824813580-4591a7c5c24b?w=150&auto=format&fit=crop&q=80",
        "clinics": [(abedin_clinic, Decimal("800.00")), (metro_clinic, Decimal("900.00"))],
    },
    {
        "email": "ahasan@gmail.com",
        "full_name": "H A M Nazmul Ahasan",
        "qualification": "MBBS, FCPS (Medicine), MD (Cardiology)",
        "bio": "Senior Consultant Cardiologist specializing in preventive cardiology, echocardiography, and coronary care.",
        "specs": ["Cardiology", "General Medicine"],
        "experience_years": 18,
        "phone": "+8801911998877",
        "room_number": "Room 205",
        "avatar_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
        "clinics": [(metro_clinic, Decimal("1000.00")), (popular_clinic, Decimal("1000.00"))],
    },
    {
        "email": "joarder@gmail.com",
        "full_name": "Md. Aminul Islam Joarder",
        "qualification": "MBBS, MS (Surgery), FACS",
        "bio": "Renowned professor and general surgeon specializing in advanced laparoscopic and gastrointestinal procedures.",
        "specs": ["General Surgery", "Gastroenterology"],
        "experience_years": 22,
        "phone": "+8801722334455",
        "room_number": "Room 108",
        "avatar_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
        "clinics": [(sherpur_clinic, Decimal("1200.00")), (metro_clinic, Decimal("1200.00"))],
    },
    {
        "email": "shapna@gmail.com",
        "full_name": "Shamsun Nahar Shapna",
        "qualification": "MBBS, MCPS, FCPS (Obs & Gynae)",
        "bio": "Specialist in women's reproductive health, fertility management, and advanced gynecological screenings.",
        "specs": ["Gynecology & Obstetrics"],
        "experience_years": 8,
        "phone": "+8801633445566",
        "room_number": "Room 106",
        "avatar_url": "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=150&auto=format&fit=crop&q=80",
        "clinics": [(sherpur_clinic, Decimal("700.00")), (abedin_clinic, Decimal("700.00"))],
    },
    {
        "email": "rahman@gmail.com",
        "full_name": "Abdur Rahman",
        "qualification": "MBBS, CCD (BIRDEM), PGT (Urology)",
        "bio": "Compassionate general practitioner and urologist focused on prompt outpatient diagnoses and patient care.",
        "specs": ["Urology", "General Medicine"],
        "experience_years": 6,
        "phone": "+8801555667788",
        "room_number": "Room 104",
        "avatar_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80",
        "clinics": [(metro_clinic, Decimal("500.00")), (popular_clinic, Decimal("500.00"))],
    },
]

for d_conf in doc_configs:
    u = User.objects.filter(email=d_conf["email"]).first()
    if not u:
        u = User.objects.create(
            email=d_conf["email"],
            password=common_hashed_password,
            first_name=d_conf["full_name"].split()[0],
            last_name=" ".join(d_conf["full_name"].split()[1:]) or "Doctor",
            phone=d_conf.get("phone", "+8801700000000"),
            role=UserRole.DOCTOR,
            is_active=True
        )
    else:
        u.password = common_hashed_password
        u.role = UserRole.DOCTOR
        u.is_active = True
        u.save()
        u.save()

    doc = Doctor.objects.filter(email=d_conf["email"]).first()
    if not doc:
        doc = Doctor.objects.create(
            user=u,
            email=d_conf["email"],
            full_name=d_conf["full_name"],
            qualification=d_conf["qualification"],
            bio=d_conf["bio"],
            experience_years=d_conf.get("experience_years", 8),
            phone=d_conf.get("phone", "+8801700000000"),
            avatar_url=d_conf.get("avatar_url"),
            verification_status=VerificationStatus.VERIFIED,
            is_active=True,
        )
    else:
        doc.user = u
        doc.full_name = d_conf["full_name"]
        doc.qualification = d_conf["qualification"]
        doc.bio = d_conf["bio"]
        doc.experience_years = d_conf.get("experience_years", 8)
        doc.phone = d_conf.get("phone", "+8801700000000")
        doc.avatar_url = d_conf.get("avatar_url")
        doc.verification_status = VerificationStatus.VERIFIED
        doc.is_active = True
        doc.is_deleted = False
        doc.save()

    # Assign Specs
    doc.specializations.clear()
    for s_name in d_conf["specs"]:
        if s_name in spec_map:
            doc.specializations.add(spec_map[s_name])

    # Assign Clinics and Non-overlapping Schedules
    for cln_idx, (cln, fee) in enumerate(d_conf["clinics"]):
        if cln:
            assigned_room = d_conf.get("room_number", "Room 101")
            dc, _ = DoctorClinic.objects.update_or_create(
                doctor=doc,
                clinic=cln,
                defaults={
                    "consultation_fee": fee,
                    "room_number": assigned_room,
                    "status": DoctorClinicStatus.ACCEPTED,
                    "is_active": True
                }
            )
            dc.consultation_fee = fee
            dc.room_number = assigned_room
            dc.status = DoctorClinicStatus.ACCEPTED
            dc.is_active = True
            dc.save()

            if cln_idx == 0:
                # Primary Clinic: Mon, Wed, Fri, Sat (09:00 - 13:00)
                assigned_days = [0, 2, 4, 5]
                s_time, e_time = datetime.time(9, 0), datetime.time(13, 0)
            else:
                # Secondary Clinic: Sun, Tue, Thu (14:00 - 18:00)
                assigned_days = [1, 3, 6]
                s_time, e_time = datetime.time(14, 0), datetime.time(18, 0)

            for day in assigned_days:
                DoctorSchedule.objects.create(
                    doctor=doc,
                    clinic=cln,
                    day_of_week=day,
                    start_time=s_time,
                    end_time=e_time,
                    slot_duration_minutes=20,
                    max_patients=25,
                    is_active=True
                )
    print(f"Configured Doctor: Dr. {doc.full_name} (VERIFIED, {d_conf.get('room_number')}) across partner clinics.")

# 5. Live Chamber Session for Dr. Mohosina Akter
today = datetime.date.today()
active_doc = Doctor.objects.get(email="mohosina@gmail.com")
if metro_clinic:
    ChamberSession.all_objects.filter(doctor=active_doc, clinic=metro_clinic, session_date=today).delete()
    session = ChamberSession.objects.create(
        doctor=active_doc,
        clinic=metro_clinic,
        session_date=today,
        status=ChamberSessionStatus.IN_CHAMBER,
        current_serial=4,
        estimated_mins_per_patient=6,
        announcement_note="Dr. Mohosina Akter is currently seeing serial #4 in Room 102.",
        room_number="Room 102",
        started_at=datetime.datetime.now(datetime.timezone.utc)
    )
    print(f"Created active live ChamberSession for Dr. Mohosina (Current Serial: {session.current_serial})")

# 6. Seed DGDA Standard Medications
MEDICATION_CATALOG = [
    ("Napa", "Paracetamol", "500mg", MedicationForm.TABLET, "Beximco Pharmaceuticals Ltd."),
    ("Napa Extra", "Paracetamol + Caffeine", "500mg + 65mg", MedicationForm.TABLET, "Beximco Pharmaceuticals Ltd."),
    ("Ace", "Paracetamol", "500mg", MedicationForm.TABLET, "Square Pharmaceuticals Ltd."),
    ("Seclo", "Omeprazole", "20mg", MedicationForm.CAPSULE, "Square Pharmaceuticals Ltd."),
    ("Sergel", "Esomeprazole", "20mg", MedicationForm.CAPSULE, "Healthcare Pharmaceuticals Ltd."),
    ("Fexo", "Fexofenadine HCl", "120mg", MedicationForm.TABLET, "Square Pharmaceuticals Ltd."),
    ("Almex", "Albendazole", "400mg", MedicationForm.TABLET, "Square Pharmaceuticals Ltd."),
    ("Moxacil", "Amoxicillin", "500mg", MedicationForm.CAPSULE, "Square Pharmaceuticals Ltd."),
    ("Ciprocin", "Ciprofloxacin", "500mg", MedicationForm.TABLET, "Square Pharmaceuticals Ltd."),
    ("Azithrocin", "Azithromycin", "500mg", MedicationForm.TABLET, "Beximco Pharmaceuticals Ltd."),
    ("Monas", "Montelukast", "10mg", MedicationForm.TABLET, "Acme Laboratories Ltd."),
    ("Bicozin", "Zinc + Vitamin B Complex", "Syrup", MedicationForm.SYRUP, "Square Pharmaceuticals Ltd."),
]

for brand, generic, strength, form, company in MEDICATION_CATALOG:
    Medication.objects.update_or_create(
        brand_name=brand,
        strength=strength,
        form=form,
        defaults={
            "generic_name": generic,
            "manufacturer": company,
        }
    )
print(f"Seeded {len(MEDICATION_CATALOG)} certified Bangladesh DGDA medications.")

# 7. Sample Completed Consultation, Prescription & Review for Rahim
patient_rahim = User.objects.get(email="rahim@patient.com")
patient_alif = User.objects.get(email="alif@gmail.com")

if metro_clinic:
    sample_app = Appointment.objects.filter(
        patient=patient_rahim,
        doctor=active_doc,
        clinic=metro_clinic,
        appointment_date=today,
    ).first()
    if not sample_app:
        sample_app = Appointment.objects.create(
            patient=patient_rahim,
            doctor=active_doc,
            clinic=metro_clinic,
            appointment_date=today,
            appointment_time=datetime.time(9, 30),
            amount=Decimal("600.00"),
            status=AppointmentStatus.COMPLETED,
            serial_number=1,
            problem_description="Persistent high fever with chills for 3 days and severe dry cough."
        )
    else:
        sample_app.status = AppointmentStatus.COMPLETED
        sample_app.serial_number = 1
        sample_app.amount = Decimal("600.00")
        sample_app.save()

    demo_token = uuid.uuid4()
    rx = Prescription.objects.filter(appointment=sample_app).first()
    if not rx:
        rx = Prescription.objects.create(
            appointment=sample_app,
            doctor=sample_app.doctor,
            patient=sample_app.patient,
            diagnosis="Viral Upper Respiratory Tract Infection with reactive airway",
            vitals={"blood_pressure": "120/80", "pulse": "84", "weight_kg": 68.5, "temperature_f": "101.4"},
            diagnostic_tests="CBC with ESR, Serum Creatinine",
            advice="Drink warm fluids, take complete bed rest for 3 days. Return for follow up if fever persists beyond 5 days.",
            qr_token=demo_token,
        )

    PrescribedMedication.objects.filter(prescription=rx).delete()
    PrescribedMedication.objects.create(
        prescription=rx,
        medication_name="Tab. Napa Extra 500mg+65mg (Paracetamol + Caffeine)",
        dosage="1 + 0 + 1",
        timing="After Meal",
        duration="5 Days",
        instructions="Take when fever exceeds 100F."
    )
    PrescribedMedication.objects.create(
        prescription=rx,
        medication_name="Tab. Fexo 120mg (Fexofenadine)",
        dosage="0 + 0 + 1",
        timing="After Meal",
        duration="7 Days",
        instructions="Take before bedtime."
    )
    PrescribedMedication.objects.create(
        prescription=rx,
        medication_name="Cap. Seclo 20mg (Omeprazole)",
        dosage="1 + 0 + 1",
        timing="20 mins Before Meal",
        duration="7 Days",
        instructions="Take morning and evening before eating."
    )

    # Payment and Review for sample completed appointment
    Payment.objects.update_or_create(
        appointment=sample_app,
        defaults={
            "amount": sample_app.amount or Decimal("600.00"),
            "currency": "BDT",
            "payment_method": PaymentMethod.BKASH,
            "transaction_id": "TRX987216345BK",
            "val_id": "VAL987216345",
            "bank_tran_id": "BANK77665544",
            "card_type": "BKASH-BKash",
            "payment_status": PaymentStatus.COMPLETED,
        }
    )
    Review.objects.update_or_create(
        appointment=sample_app,
        defaults={
            "patient": sample_app.patient,
            "doctor": sample_app.doctor,
            "clinic": sample_app.clinic,
            "rating": 5,
            "comment": "Exceptional consultation. The doctor took time to listen attentively and explained the prescription thoroughly.",
        }
    )

    # Upcoming Confirmed Appointment for Alif today with Dr. Mohosina
    upcoming_app = Appointment.objects.filter(
        patient=patient_alif,
        doctor=active_doc,
        clinic=metro_clinic,
        appointment_date=today,
    ).first()
    if not upcoming_app:
        upcoming_app = Appointment.objects.create(
            patient=patient_alif,
            doctor=active_doc,
            clinic=metro_clinic,
            appointment_date=today,
            appointment_time=datetime.time(11, 30),
            amount=Decimal("600.00"),
            status=AppointmentStatus.CONFIRMED,
            serial_number=6,
            problem_description="Routine consultation & blood pressure checkup."
        )
    else:
        upcoming_app.status = AppointmentStatus.CONFIRMED
        upcoming_app.serial_number = 6
        upcoming_app.amount = Decimal("600.00")
        upcoming_app.save()

    Payment.objects.update_or_create(
        appointment=upcoming_app,
        defaults={
            "amount": Decimal("600.00"),
            "currency": "BDT",
            "payment_method": PaymentMethod.BKASH,
            "transaction_id": f"TRX{today.strftime('%Y%m%d')}006BK",
            "payment_status": PaymentStatus.COMPLETED,
        }
    )

# 8. Realistic Queue and Live Chamber Session for Dr. Nusrat Jahan at Metro Health Hub
doc_nusrat = Doctor.objects.filter(email="dr.nusrat@smartclinic.bd").first()
if metro_clinic and doc_nusrat:
    ChamberSession.all_objects.filter(doctor=doc_nusrat, clinic=metro_clinic, session_date=today).delete()
    session_nusrat = ChamberSession.objects.create(
        doctor=doc_nusrat,
        clinic=metro_clinic,
        session_date=today,
        status=ChamberSessionStatus.IN_CHAMBER,
        current_serial=4,
        estimated_mins_per_patient=10,
        delay_minutes=0,
        announcement_note="Dr. Nusrat Jahan is currently seeing serial #4 in Room 201.",
        room_number="Room 201",
        started_at=datetime.datetime.now(datetime.timezone.utc)
    )
    print("Created active live ChamberSession for Dr. Nusrat (Room 201, Current Serial: 4)")

    queue_data = [
        ("tariq@gmail.com", 1, datetime.time(9, 0), AppointmentStatus.COMPLETED, "Regular follow-up for hypertension management.", PaymentMethod.CASH),
        ("sadia@gmail.com", 2, datetime.time(9, 20), AppointmentStatus.COMPLETED, "Chest tightness and fatigue after morning walks.", PaymentMethod.BKASH),
        ("anika@gmail.com", 3, datetime.time(9, 40), AppointmentStatus.COMPLETED, "Palpitation and shortness of breath when climbing stairs.", PaymentMethod.NAGAD),
        ("hasan@gmail.com", 4, datetime.time(10, 0), AppointmentStatus.CONFIRMED, "Acute dizziness and fluctuating blood pressure readings.", PaymentMethod.CASH),
        ("farhana@gmail.com", 5, datetime.time(10, 20), AppointmentStatus.CONFIRMED, "Review of 24h Holter monitoring and lipid profile.", PaymentMethod.BKASH),
        ("alif@gmail.com", 6, datetime.time(10, 40), AppointmentStatus.CONFIRMED, "Routine cardiovascular evaluation and prescription renewal.", PaymentMethod.BKASH),
        ("monjurul@gmail.com", 7, datetime.time(11, 0), AppointmentStatus.CONFIRMED, "Post-workout elevated pulse and anxiety check.", PaymentMethod.CASH),
        ("ramin@gmail.com", 8, datetime.time(11, 20), AppointmentStatus.CONFIRMED, "Severe sudden chest discomfort and sweating (Emergency Triage).", PaymentMethod.BKASH),
    ]

    for p_email, serial, app_time, status, reason, pay_method in queue_data:
        p_user = User.objects.get(email=p_email)
        app = Appointment.objects.filter(
            doctor=doc_nusrat,
            clinic=metro_clinic,
            appointment_date=today,
            serial_number=serial,
        ).first()
        if not app:
            app = Appointment.objects.create(
                patient=p_user,
                doctor=doc_nusrat,
                clinic=metro_clinic,
                appointment_date=today,
                appointment_time=app_time,
                amount=Decimal("800.00"),
                status=status,
                serial_number=serial,
                problem_description=reason,
            )
        else:
            app.patient = p_user
            app.appointment_time = app_time
            app.amount = Decimal("800.00")
            app.status = status
            app.problem_description = reason
            app.save()

        # Ensure Payment record
        Payment.objects.update_or_create(
            appointment=app,
            defaults={
                "amount": Decimal("800.00"),
                "currency": "BDT",
                "payment_method": pay_method,
                "transaction_id": f"TRX{today.strftime('%Y%m%d')}{serial:03d}BD",
                "val_id": f"VAL{serial:03d}",
                "payment_status": PaymentStatus.COMPLETED,
            }
        )

        if status == AppointmentStatus.COMPLETED:
            Review.objects.update_or_create(
                appointment=app,
                defaults={
                    "patient": p_user,
                    "doctor": doc_nusrat,
                    "clinic": metro_clinic,
                    "rating": 5,
                    "comment": "Doctor took time to explain everything clearly. Highly satisfied with the consultation.",
                }
            )

    print("Seeded realistic 8-patient queue and reviews for Dr. Nusrat Jahan with full payment records.")

# 9. Realistic Queue and Live Chamber Session for Dr. Taskin Ahmed at Metro Health Hub
doc_taskin = Doctor.objects.filter(email="dr.taskin@smartclinic.bd").first()
if metro_clinic and doc_taskin:
    ChamberSession.all_objects.filter(doctor=doc_taskin, clinic=metro_clinic, session_date=today).delete()
    session_taskin = ChamberSession.objects.create(
        doctor=doc_taskin,
        clinic=metro_clinic,
        session_date=today,
        status=ChamberSessionStatus.IN_CHAMBER,
        current_serial=2,
        estimated_mins_per_patient=8,
        delay_minutes=0,
        announcement_note="Dr. Taskin Ahmed is currently seeing serial #2 in Room 203.",
        room_number="Room 203",
        started_at=datetime.datetime.now(datetime.timezone.utc)
    )
    print("Created active live ChamberSession for Dr. Taskin (Room 203, Current Serial: 2)")

    taskin_queue = [
        ("rahim@patient.com", 1, datetime.time(9, 30), AppointmentStatus.COMPLETED, "Seasonal fever and persistent body ache.", PaymentMethod.CASH),
        ("alif@gmail.com", 2, datetime.time(9, 50), AppointmentStatus.CONFIRMED, "Diabetes checkup and fasting blood glucose review.", PaymentMethod.BKASH),
        ("tariq@gmail.com", 3, datetime.time(10, 10), AppointmentStatus.CONFIRMED, "Gastric acidity and mild abdominal cramping.", PaymentMethod.CASH),
        ("sadia@gmail.com", 4, datetime.time(10, 30), AppointmentStatus.CONFIRMED, "Routine general health screening and lipid panel.", PaymentMethod.NAGAD),
        ("anika@gmail.com", 5, datetime.time(10, 50), AppointmentStatus.CONFIRMED, "Headache, low grade fever, and weakness.", PaymentMethod.BKASH),
        ("hasan@gmail.com", 6, datetime.time(11, 10), AppointmentStatus.CONFIRMED, "Follow-up consultation on post-viral fatigue.", PaymentMethod.CASH),
    ]

    for p_email, serial, app_time, status, reason, pay_method in taskin_queue:
        p_user = User.objects.get(email=p_email)
        app = Appointment.objects.filter(
            doctor=doc_taskin,
            clinic=metro_clinic,
            appointment_date=today,
            serial_number=serial,
        ).first()
        if not app:
            app = Appointment.objects.create(
                patient=p_user,
                doctor=doc_taskin,
                clinic=metro_clinic,
                appointment_date=today,
                appointment_time=app_time,
                amount=Decimal("700.00"),
                status=status,
                serial_number=serial,
                problem_description=reason,
            )
        else:
            app.patient = p_user
            app.appointment_time = app_time
            app.amount = Decimal("700.00")
            app.status = status
            app.problem_description = reason
            app.save()

        Payment.objects.update_or_create(
            appointment=app,
            defaults={
                "amount": Decimal("700.00"),
                "currency": "BDT",
                "payment_method": pay_method,
                "transaction_id": f"TRX{today.strftime('%Y%m%d')}{serial:03d}TK",
                "val_id": f"VALTK{serial:03d}",
                "payment_status": PaymentStatus.COMPLETED,
            }
        )

        if status == AppointmentStatus.COMPLETED:
            Review.objects.update_or_create(
                appointment=app,
                defaults={
                    "patient": p_user,
                    "doctor": doc_taskin,
                    "clinic": metro_clinic,
                    "rating": 5,
                    "comment": "Dr. Taskin was very thorough and gave clear explanations about medication and lifestyle.",
                }
            )
    print("Seeded realistic 6-patient queue and reviews for Dr. Taskin Ahmed.")

# Notification for Alif
Notification.objects.create(
    recipient=patient_alif,
    notification_type=NotificationType.APPOINTMENT_CONFIRMED,
    title="Appointment Confirmed!",
    message=f"Your appointment with {active_doc.full_name} at Metro Health Hub is confirmed for serial #6 today.",
    is_read=False
)

print("=== Real-Life Data Seeding Complete Successfully ===")
