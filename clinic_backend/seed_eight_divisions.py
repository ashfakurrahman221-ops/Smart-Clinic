import os
import sys
import uuid
import datetime
from decimal import Decimal
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from apps.accounts.models import UserRole
from apps.common.models import Division, District, Upazila
from apps.clinics.models import (
    Clinic, Department, ClinicDepartment, VerificationStatus, SubscriptionPlan,
    ClinicService, Announcement, AnnouncementType, ClinicStaff, StaffRole
)
from apps.doctors.models import Doctor, Specialization, DoctorClinic, DoctorClinicStatus, DoctorSchedule

User = get_user_model()
common_password = make_password("Password123!")

print("=== Starting 8-Division Open Source Healthcare Network Seeding ===")

# 1. Ensure Standard Medical Departments
standard_departments = [
    ("General Medicine", "Outpatient consultations, routine diagnosis, adult preventive medicine, and chronic disease management."),
    ("Cardiology", "Comprehensive cardiac diagnostics, ECG, echocardiography, hypertension, and preventive cardiovascular care."),
    ("Gynecology & Obstetrics", "Maternal healthcare, antenatal check-ups, normal and high-risk pregnancy management, and women's health."),
    ("Pediatrics", "Neonatal care, child immunization, developmental tracking, pediatric infectious disease treatment."),
    ("Neurology & Brain Health", "Treatment of neurological disorders, stroke care, epilepsy, nerve dysfunction, and chronic migraines."),
    ("Orthopedics & Spine", "Bone fractures, joint replacement therapy, trauma surgery, arthritis, and musculoskeletal rehabilitation."),
    ("Gastroenterology", "Digestive health, liver disease, endoscopy, acidity, colonoscopy, and abdominal disorder management."),
    ("Urology & Kidney Care", "Urinary tract treatment, kidney stone management, prostate health, and male reproductive care."),
    ("Dermatology & Skin Care", "Clinical dermatology, allergy treatment, aesthetic skin consultations, and cosmetic dermatology."),
    ("Pathology & Diagnostic Lab", "Complete diagnostic blood tests, biochemistry, hormone profiling, microbiology, and tissue biopsies."),
    ("Radiology & Imaging", "Digital X-Ray, 4D Ultrasonography, CT Scan, and non-invasive medical imaging.")
]

dept_map = {}
for name, desc in standard_departments:
    d, _ = Department.objects.get_or_create(name=name, defaults={"description": desc, "is_active": True})
    dept_map[name] = d

# 2. Ensure Specializations
specialization_names = [
    "Cardiology", "Gynecology & Obstetrics", "General Medicine", "Pediatrics",
    "General Surgery", "Neurology", "Orthopedics", "Gastroenterology",
    "Urology", "Dermatology", "Endocrinology", "Oncology"
]
spec_map = {}
for sname in specialization_names:
    s, _ = Specialization.objects.get_or_create(name=sname)
    spec_map[sname] = s

# 3. Eight Divisions Clinic Definitions
CLINICS_BY_DIVISION = [
    # DHAKA
    {
        "owner_email": "metro_dhaka@clinic.com",
        "owner_name": "Dr. Ishtiak Ahmed",
        "name": "Metro Health Hub",
        "slug": "metro-health-hub-dhaka",
        "address": "House 12, Road 4, Sector 7, Uttara, Dhaka-1230",
        "city": "Dhaka",
        "division": "Dhaka",
        "district": "Dhaka",
        "upazila": "Uttara",
        "phone": "+8801788888888",
        "email": "info@metrohealthhub.com",
        "lat": Decimal("23.875900"),
        "lon": Decimal("90.379500"),
        "logo_url": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=300&auto=format&fit=crop&q=80",
        "departments": ["General Medicine", "Cardiology", "Gynecology & Obstetrics", "Pathology & Diagnostic Lab", "Radiology & Imaging"]
    },
    {
        "owner_email": "popular_dhanmondi@clinic.com",
        "owner_name": "Popular Health Admin",
        "name": "Popular Diagnostic & Medical Center",
        "slug": "popular-diagnostic-dhanmondi",
        "address": "House 16, Road 2, Dhanmondi, Dhaka-1205",
        "city": "Dhaka",
        "division": "Dhaka",
        "district": "Dhaka",
        "upazila": "Dhanmondi",
        "phone": "+8801623892321",
        "email": "dhanmondi@populardiagnostic.com",
        "lat": Decimal("23.746500"),
        "lon": Decimal("90.386000"),
        "logo_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80",
        "departments": ["Cardiology", "Gastroenterology", "Pathology & Diagnostic Lab", "Radiology & Imaging"]
    },
    {
        "owner_email": "square_dhaka@clinic.com",
        "owner_name": "Square Healthcare Admin",
        "name": "Square Healthcare Consultation Center",
        "slug": "square-healthcare-panthapath",
        "address": "18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka-1205",
        "city": "Dhaka",
        "division": "Dhaka",
        "district": "Dhaka",
        "upazila": "Tejgaon",
        "phone": "+8801713377775",
        "email": "care@squarehospital.com",
        "lat": Decimal("23.753300"),
        "lon": Decimal("90.381700"),
        "logo_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&auto=format&fit=crop&q=80",
        "departments": ["Cardiology", "Neurology & Brain Health", "Orthopedics & Spine", "Pediatrics", "Pathology & Diagnostic Lab"]
    },

    # CHATTAGRAM (CHITTAGONG)
    {
        "owner_email": "epic_ctg@clinic.com",
        "owner_name": "Epic Health Admin",
        "name": "Epic Healthcare & Consultation Center",
        "slug": "epic-healthcare-chattogram",
        "address": "19 KB Fazlul Kader Road, Mirzarpool, Panchlaish, Chattogram-4203",
        "city": "Chattogram",
        "division": "Chattogram",
        "district": "Chattogram",
        "upazila": "Khulshi",
        "phone": "+8801984499600",
        "email": "contact@epichealthcare.com",
        "lat": Decimal("22.360100"),
        "lon": Decimal("91.822800"),
        "logo_url": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=300&auto=format&fit=crop&q=80",
        "departments": ["Cardiology", "Neurology & Brain Health", "General Medicine", "Pathology & Diagnostic Lab"]
    },
    {
        "owner_email": "chevron_ctg@clinic.com",
        "owner_name": "Chevron Clinical Admin",
        "name": "Chevron Clinical & Specialized Hospital",
        "slug": "chevron-clinical-hospital-chattogram",
        "address": "12/12 O.R. Nizam Road, Panchlaish R/A, Chattogram-4203",
        "city": "Chattogram",
        "division": "Chattogram",
        "district": "Chattogram",
        "upazila": "Khulshi",
        "phone": "+8801755666999",
        "email": "info@chevronclinical.com",
        "lat": Decimal("22.359200"),
        "lon": Decimal("91.821400"),
        "logo_url": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=300&auto=format&fit=crop&q=80",
        "departments": ["Gynecology & Obstetrics", "Pediatrics", "Orthopedics & Spine", "Radiology & Imaging"]
    },

    # RAJSHAHI
    {
        "owner_email": "popular_rajshahi@clinic.com",
        "owner_name": "Popular Rajshahi Admin",
        "name": "Popular Diagnostic Center Rajshahi",
        "slug": "popular-diagnostic-center-rajshahi",
        "address": "Laxmipur More, Rajshahi Medical College Road, Rajshahi-6000",
        "city": "Rajshahi",
        "division": "Rajshahi",
        "district": "Rajshahi",
        "upazila": "Boalia",
        "phone": "+8801755662150",
        "email": "rajshahi@populardiagnostic.com",
        "lat": Decimal("24.370700"),
        "lon": Decimal("88.583500"),
        "logo_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=300&auto=format&fit=crop&q=80",
        "departments": ["Gastroenterology", "General Medicine", "Cardiology", "Pathology & Diagnostic Lab"]
    },
    {
        "owner_email": "royal_rajshahi@clinic.com",
        "owner_name": "Royal Hospital Admin",
        "name": "Royal Hospital & Diagnostic Complex",
        "slug": "royal-hospital-rajshahi",
        "address": "Greater Road, Laxmipur, Rajshahi-6000",
        "city": "Rajshahi",
        "division": "Rajshahi",
        "district": "Rajshahi",
        "upazila": "Boalia",
        "phone": "+8801711334455",
        "email": "care@royalhospitalraj.com",
        "lat": Decimal("24.372500"),
        "lon": Decimal("88.585000"),
        "logo_url": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=300&auto=format&fit=crop&q=80",
        "departments": ["Orthopedics & Spine", "General Medicine", "Pediatrics", "Radiology & Imaging"]
    },

    # KHULNA
    {
        "owner_email": "gazi_khulna@clinic.com",
        "owner_name": "Gazi Hospital Admin",
        "name": "Gazi Medical College Hospital",
        "slug": "gazi-medical-college-hospital-khulna",
        "address": "A-19/20 Majed Sarani, Sonadanga, Khulna-9100",
        "city": "Khulna",
        "division": "Khulna",
        "district": "Khulna",
        "upazila": "Khulna Sadar",
        "phone": "+8801711298588",
        "email": "info@gazimedicalcollege.com",
        "lat": Decimal("22.825200"),
        "lon": Decimal("89.541200"),
        "logo_url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&auto=format&fit=crop&q=80",
        "departments": ["Pediatrics", "Dermatology & Skin Care", "General Medicine", "Pathology & Diagnostic Lab"]
    },
    {
        "owner_email": "city_khulna@clinic.com",
        "owner_name": "Khulna City Medical Admin",
        "name": "Khulna City Medical College & Hospital",
        "slug": "khulna-city-medical-college",
        "address": "33 KDA Avenue, Moylapota, Khulna-9100",
        "city": "Khulna",
        "division": "Khulna",
        "district": "Khulna",
        "upazila": "Khulna Sadar",
        "phone": "+8801799887766",
        "email": "care@khulnacitymedical.gov.bd",
        "lat": Decimal("22.812000"),
        "lon": Decimal("89.553000"),
        "logo_url": "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=300&auto=format&fit=crop&q=80",
        "departments": ["Cardiology", "Gynecology & Obstetrics", "Radiology & Imaging"]
    },

    # BARISHAL
    {
        "owner_email": "apollo_barishal@clinic.com",
        "owner_name": "South Apollo Admin",
        "name": "South Apollo Diagnostic & Specialized Hospital",
        "slug": "south-apollo-hospital-barishal",
        "address": "Sadar Road, Barishal Sadar, Barishal-8200",
        "city": "Barishal",
        "division": "Barishal",
        "district": "Barishal",
        "upazila": "Barishal Sadar",
        "phone": "+8801712554433",
        "email": "help@southapollobarishal.com",
        "lat": Decimal("22.701000"),
        "lon": Decimal("90.370500"),
        "logo_url": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=300&auto=format&fit=crop&q=80",
        "departments": ["Cardiology", "General Medicine", "Pathology & Diagnostic Lab"]
    },
    {
        "owner_email": "rahat_barishal@clinic.com",
        "owner_name": "Rahat Anwar Hospital Admin",
        "name": "Rahat Anwar Hospital & Diagnostic Complex",
        "slug": "rahat-anwar-hospital-barishal",
        "address": "Band Road, Chandmari, Barishal-8200",
        "city": "Barishal",
        "division": "Barishal",
        "district": "Barishal",
        "upazila": "Barishal Sadar",
        "phone": "+8801713445566",
        "email": "info@rahatanwarhospital.com",
        "lat": Decimal("22.695000"),
        "lon": Decimal("90.375000"),
        "logo_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&auto=format&fit=crop&q=80",
        "departments": ["Gynecology & Obstetrics", "Pediatrics", "Urology & Kidney Care"]
    },

    # SYLHET
    {
        "owner_email": "mountadora_sylhet@clinic.com",
        "owner_name": "Mount Adora Admin",
        "name": "Mount Adora Hospital",
        "slug": "mount-adora-hospital-sylhet",
        "address": "Akhalia, Sylhet-Sunamganj Highway, Sylhet-3100",
        "city": "Sylhet",
        "division": "Sylhet",
        "district": "Sylhet",
        "upazila": "Sylhet Sadar",
        "phone": "+8801799883311",
        "email": "appointment@mountadora.com",
        "lat": Decimal("24.908000"),
        "lon": Decimal("91.838500"),
        "logo_url": "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=300&auto=format&fit=crop&q=80",
        "departments": ["Orthopedics & Spine", "Gynecology & Obstetrics", "Cardiology", "Pathology & Diagnostic Lab"]
    },
    {
        "owner_email": "popular_sylhet@clinic.com",
        "owner_name": "Popular Sylhet Admin",
        "name": "Popular Medical Center & Hospital Sylhet",
        "slug": "popular-medical-center-sylhet",
        "address": "New Medical Road, Subhanighat, Sylhet-3100",
        "city": "Sylhet",
        "division": "Sylhet",
        "district": "Sylhet",
        "upazila": "Sylhet Sadar",
        "phone": "+8801755662160",
        "email": "sylhet@populardiagnostic.com",
        "lat": Decimal("24.890500"),
        "lon": Decimal("91.875000"),
        "logo_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80",
        "departments": ["General Medicine", "Pediatrics", "Radiology & Imaging"]
    },

    # RANGPUR
    {
        "owner_email": "prime_rangpur@clinic.com",
        "owner_name": "Prime Medical Admin",
        "name": "Prime Medical College & Hospital",
        "slug": "prime-medical-college-rangpur",
        "address": "Pirzabad, Badarganj Road, Rangpur-5400",
        "city": "Rangpur",
        "division": "Rangpur",
        "district": "Rangpur",
        "upazila": "Rangpur Sadar",
        "phone": "+8801730058866",
        "email": "info@primemedical.edu.bd",
        "lat": Decimal("25.753800"),
        "lon": Decimal("89.219500"),
        "logo_url": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=300&auto=format&fit=crop&q=80",
        "departments": ["Urology & Kidney Care", "Pediatrics", "General Medicine", "Radiology & Imaging"]
    },
    {
        "owner_email": "doctors_rangpur@clinic.com",
        "owner_name": "Community Hospital Admin",
        "name": "Doctors Community Hospital Rangpur",
        "slug": "doctors-community-hospital-rangpur",
        "address": "Medical East Gate, Dhap, Rangpur-5400",
        "city": "Rangpur",
        "division": "Rangpur",
        "district": "Rangpur",
        "upazila": "Rangpur Sadar",
        "phone": "+8801712667788",
        "email": "care@doctorscommunityrangpur.org",
        "lat": Decimal("25.760000"),
        "lon": Decimal("89.245000"),
        "logo_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=300&auto=format&fit=crop&q=80",
        "departments": ["General Medicine", "Cardiology", "Pathology & Diagnostic Lab"]
    },

    # MYMENSINGH & SHERPUR
    {
        "owner_email": "monira@gmail.com",
        "owner_name": "Monira Begum",
        "name": "Abedin Hospital & Specialized Center",
        "slug": "abedin-hospital",
        "address": "Sadar Hospital Road, Narayanpur, Sherpur-2100",
        "city": "Sherpur",
        "division": "Mymensingh",
        "district": "Sherpur",
        "upazila": "Sherpur Sadar",
        "phone": "+8801839838383",
        "email": "ahmed23105101006@diu.edu.bd",
        "lat": Decimal("25.019400"),
        "lon": Decimal("90.015200"),
        "logo_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&auto=format&fit=crop&q=80",
        "departments": ["General Medicine", "Gynecology & Obstetrics", "Pathology & Diagnostic Lab"]
    },
    {
        "owner_email": "nexus_mymensingh@clinic.com",
        "owner_name": "Nexus Hospital Admin",
        "name": "Nexus Cardiac Hospital & Diagnostic Center",
        "slug": "nexus-cardiac-hospital-mymensingh",
        "address": "147 Charpara Medical College Road, Mymensingh-2200",
        "city": "Mymensingh",
        "division": "Mymensingh",
        "district": "Mymensingh",
        "upazila": "Mymensingh Sadar",
        "phone": "+8801715443322",
        "email": "info@nexuscardiac.com",
        "lat": Decimal("24.743500"),
        "lon": Decimal("90.412000"),
        "logo_url": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=300&auto=format&fit=crop&q=80",
        "departments": ["Cardiology", "General Medicine", "Pathology & Diagnostic Lab", "Radiology & Imaging"]
    },
    {
        "owner_email": "we@gmail.com",
        "owner_name": "Sherpur District Admin",
        "name": "Sherpur District Hospital (250 Bed)",
        "slug": "sherpur-district-hospital-250-bed",
        "address": "Shaheed Bulbul Road, Sherpur Sadar, Sherpur-2100",
        "city": "Sherpur",
        "division": "Mymensingh",
        "district": "Sherpur",
        "upazila": "Sherpur Sadar",
        "phone": "+8801715536930",
        "email": "info@sherpurdistricthospital.gov.bd",
        "lat": Decimal("25.021000"),
        "lon": Decimal("90.017000"),
        "logo_url": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=300&auto=format&fit=crop&q=80",
        "departments": ["General Medicine", "Pediatrics", "Gynecology & Obstetrics"]
    }
]

# 4. Upsert Clinics and Assign Departments & Geo References
clinic_obj_map = {}

for c_info in CLINICS_BY_DIVISION:
    # Get or create clinic owner
    owner = User.objects.filter(email=c_info["owner_email"]).first()
    if not owner:
        owner = User.objects.create(
            email=c_info["owner_email"],
            password=common_password,
            first_name=c_info["owner_name"].split()[0],
            last_name=" ".join(c_info["owner_name"].split()[1:]) or "Admin",
            phone="+8801700000000",
            role=UserRole.CLINIC_ADMIN,
            is_active=True
        )
    else:
        owner.password = common_password
        owner.role = UserRole.CLINIC_ADMIN
        owner.is_active = True
        owner.save()

    div_obj = Division.objects.filter(name__iexact=c_info["division"]).first()
    dist_obj = District.objects.filter(name__iexact=c_info["district"]).first()
    upz_obj = Upazila.objects.filter(name__iexact=c_info["upazila"]).first() if c_info.get("upazila") else None

    # Get or create Clinic
    clinic = Clinic.all_objects.filter(owner=owner).first()
    if not clinic:
        clinic = Clinic.all_objects.filter(slug=c_info["slug"]).first()

    if not clinic:
        clinic = Clinic.objects.create(
            owner=owner,
            name=c_info["name"],
            slug=c_info["slug"],
            address=c_info["address"],
            city=c_info["city"],
            division=div_obj,
            district=dist_obj,
            upazila=upz_obj,
            phone=c_info["phone"],
            email=c_info["email"],
            latitude=c_info["lat"],
            longitude=c_info["lon"],
            logo_url=c_info["logo_url"],
            subscription_plan=SubscriptionPlan.PRO,
            verification_status=VerificationStatus.VERIFIED,
            is_active=True
        )
    else:
        clinic.name = c_info["name"]
        clinic.address = c_info["address"]
        clinic.city = c_info["city"]
        clinic.division = div_obj
        clinic.district = dist_obj
        clinic.upazila = upz_obj
        clinic.phone = c_info["phone"]
        clinic.email = c_info["email"]
        clinic.latitude = c_info["lat"]
        clinic.longitude = c_info["lon"]
        clinic.logo_url = c_info["logo_url"]
        clinic.verification_status = VerificationStatus.VERIFIED
        clinic.is_active = True
        clinic.is_deleted = False
        clinic.save()

    # Link departments
    for dname in c_info["departments"]:
        d_obj = dept_map.get(dname)
        if d_obj:
            ClinicDepartment.objects.get_or_create(clinic=clinic, department=d_obj)

    clinic_obj_map[c_info["name"]] = clinic
    print(f"Verified Clinic: {clinic.name} ({clinic.city}, {div_obj.name if div_obj else 'No Div'})")

# 5. Seed Diagnostic Tests & Clinical Services for Clinics
STANDARD_SERVICES = [
    ("Complete Blood Count (CBC)", "Pathology & Diagnostic Lab", Decimal("400.00"), 15, "No special preparation needed."),
    ("Fasting Blood Sugar (FBS)", "Pathology & Diagnostic Lab", Decimal("150.00"), 10, "10-12 hours overnight fasting required."),
    ("Lipid Profile", "Pathology & Diagnostic Lab", Decimal("1200.00"), 15, "12 hours fasting required."),
    ("Serum Creatinine", "Pathology & Diagnostic Lab", Decimal("350.00"), 10, "Avoid excess meat 24 hours before test."),
    ("SGPT / ALT (Liver Function)", "Pathology & Diagnostic Lab", Decimal("400.00"), 10, "Routine sample collection."),
    ("HbA1c (Glycated Hemoglobin)", "Pathology & Diagnostic Lab", Decimal("850.00"), 15, "No fasting required."),
    ("Thyroid Profile (TSH, FT3, FT4)", "Pathology & Diagnostic Lab", Decimal("1600.00"), 20, "Morning blood sample preferred."),
    ("Urine Routine Examination (R/E)", "Pathology & Diagnostic Lab", Decimal("250.00"), 10, "Mid-stream early morning sample."),
    ("12-Lead Electrocardiogram (ECG)", "Cardiology", Decimal("500.00"), 15, "Wear comfortable two-piece clothing."),
    ("Echocardiography (2D Color Doppler)", "Cardiology", Decimal("2500.00"), 30, "Non-invasive ultrasound of heart."),
    ("Exercise Tolerance Test (ETT)", "Cardiology", Decimal("3500.00"), 45, "Wear running/comfortable shoes."),
    ("Digital Chest X-Ray (P/A View)", "Radiology & Imaging", Decimal("800.00"), 15, "Remove metal jewelry before scan."),
    ("4D Ultrasonography (Whole Abdomen)", "Radiology & Imaging", Decimal("1500.00"), 20, "Full bladder and 6 hours fasting required."),
    ("CT Scan Brain (Plain)", "Radiology & Imaging", Decimal("4500.00"), 30, "Report 15 mins prior with previous films."),
    ("Antenatal Ultrasound Screening", "Gynecology & Obstetrics", Decimal("1200.00"), 20, "Drink water 1 hour prior for full bladder."),
    ("Comprehensive Health Checkup", "General Medicine", Decimal("2500.00"), 45, "Overnight fasting required for blood work."),
]

ClinicService.all_objects.all().delete()
for clinic in clinic_obj_map.values():
    clinic_depts = {cd.name: cd for cd in clinic.departments.all()}
    count_services = 0
    for s_name, d_name, fee, dur, prep in STANDARD_SERVICES:
        if d_name in clinic_depts or "General Medicine" in clinic_depts:
            dept_obj = clinic_depts.get(d_name, clinic_depts.get("General Medicine"))
            ClinicService.objects.create(
                clinic=clinic,
                department=dept_obj,
                name=s_name,
                description=f"Accredited clinical diagnostic procedure at {clinic.name}.",
                fee=fee,
                duration_minutes=dur,
                preparation_instructions=prep,
                is_available=True
            )
            count_services += 1
    print(f"Added {count_services} Diagnostic Services for {clinic.name}")

# 6. Seed Announcements
Announcement.all_objects.all().delete()
for clinic in clinic_obj_map.values():
    Announcement.objects.create(
        clinic=clinic,
        title="24/7 Emergency & Digital Diagnostic Center Active",
        message="Emergency OPD triage and pathology sample collection services operate round the clock. Live serial tracking enabled.",
        announcement_type=AnnouncementType.GENERAL,
        is_active=True
    )
    Announcement.objects.create(
        clinic=clinic,
        title="Specialist Chamber Consultations Open for Walk-ins",
        message="Patient arrival check-in and instant serial tokens are available at the front counter desk.",
        announcement_type=AnnouncementType.DOCTOR_VISIT,
        is_active=True
    )

# 7. Seed Qualified Medical Practitioners across all 8 Divisions
DOCTORS_BY_DIVISION = [
    # DHAKA
    {
        "email": "dr.taskin@smartclinic.bd",
        "name": "Taskin Ahmed",
        "qualification": "MBBS, FCPS (Medicine)",
        "experience_years": 8,
        "phone": "+8801755998877",
        "bio": "Consultant Physician specializing in internal medicine, diabetes, hypertension, and preventive healthcare.",
        "avatar_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
        "specs": ["General Medicine"],
        "clinics": [("Metro Health Hub", Decimal("700.00")), ("Abedin Hospital & Specialized Center", Decimal("700.00"))]
    },
    {
        "email": "dr.nusrat@smartclinic.bd",
        "name": "Nusrat Jahan",
        "qualification": "MBBS, FCPS (Medicine), MD (Cardiology)",
        "experience_years": 11,
        "phone": "+8801755112233",
        "bio": "Senior Consultant Cardiologist and Physician specializing in non-invasive cardiology and adult preventive health.",
        "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80",
        "specs": ["Cardiology", "General Medicine"],
        "clinics": [("Metro Health Hub", Decimal("800.00")), ("Abedin Hospital & Specialized Center", Decimal("800.00"))]
    },
    {
        "email": "mohosina@gmail.com",
        "name": "Mohosina Akter",
        "qualification": "MBBS, BCS (Health), FCPS (Medicine)",
        "experience_years": 12,
        "phone": "+8801711223344",
        "bio": "Experienced clinical specialist with over 12 years treating endocrine and complex general medical disorders at leading national tertiary hospitals.",
        "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80",
        "specs": ["Endocrinology", "General Medicine"],
        "clinics": [("Metro Health Hub", Decimal("600.00")), ("Popular Diagnostic & Medical Center", Decimal("700.00"))]
    },
    {
        "email": "ahasan@gmail.com",
        "name": "H A M Nazmul Ahasan",
        "qualification": "MBBS, FCPS (Medicine), MD (Cardiology)",
        "experience_years": 18,
        "phone": "+8801911998877",
        "bio": "Eminent Professor & Consultant Physician with 18+ years across coronary intervention and preventive cardiovascular diagnosis.",
        "avatar_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
        "specs": ["Cardiology", "General Medicine"],
        "clinics": [("Metro Health Hub", Decimal("1000.00")), ("Square Healthcare Consultation Center", Decimal("1200.00"))]
    },

    # CHATTAGRAM
    {
        "email": "tariqul_ctg@doctor.com",
        "name": "Tariqul Islam Chowdhury",
        "qualification": "MBBS, MD (Neurology)",
        "experience_years": 14,
        "phone": "+8801712998877",
        "bio": "Leading clinical neurologist in Chattogram specializing in stroke prevention, neuropathies, and migraine management.",
        "avatar_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80",
        "specs": ["Neurology"],
        "clinics": [("Epic Healthcare & Consultation Center", Decimal("1000.00")), ("Chevron Clinical & Specialized Hospital", Decimal("1000.00"))]
    },
    {
        "email": "farhana_ctg@doctor.com",
        "name": "Farhana Yasmin Chowdhury",
        "qualification": "MBBS, DCH, FCPS (Pediatrics)",
        "experience_years": 10,
        "phone": "+8801819776655",
        "bio": "Dedicated child health specialist focused on pediatric respiratory infections, newborn care, and developmental monitoring.",
        "avatar_url": "https://images.unsplash.com/photo-1594824813580-4591a7c5c24b?w=200&auto=format&fit=crop&q=80",
        "specs": ["Pediatrics"],
        "clinics": [("Chevron Clinical & Specialized Hospital", Decimal("800.00")), ("Epic Healthcare & Consultation Center", Decimal("900.00"))]
    },

    # RAJSHAHI
    {
        "email": "mahbub_rajshahi@doctor.com",
        "name": "Mahbubur Rahman Khan",
        "qualification": "MBBS, MS (Orthopedics)",
        "experience_years": 16,
        "phone": "+8801711225588",
        "bio": "Senior orthopedic surgeon specializing in joint replacement therapy, trauma reconstruction, and arthroscopic procedures.",
        "avatar_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&auto=format&fit=crop&q=80",
        "specs": ["Orthopedics"],
        "clinics": [("Royal Hospital & Diagnostic Complex", Decimal("900.00")), ("Popular Diagnostic Center Rajshahi", Decimal("900.00"))]
    },
    {
        "email": "anisur_rajshahi@doctor.com",
        "name": "Anisur Rahman",
        "qualification": "MBBS, MD (Gastroenterology)",
        "experience_years": 13,
        "phone": "+8801715449900",
        "bio": "Consultant Gastroenterologist and hepatologist with expertise in diagnostic endoscopy, colonoscopy, and acid-peptic disorders.",
        "avatar_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80",
        "specs": ["Gastroenterology", "General Medicine"],
        "clinics": [("Popular Diagnostic Center Rajshahi", Decimal("1000.00")), ("Royal Hospital & Diagnostic Complex", Decimal("1000.00"))]
    },

    # KHULNA
    {
        "email": "mostafa_khulna@doctor.com",
        "name": "S M Golam Mostafa",
        "qualification": "MBBS, FCPS (Cardiology)",
        "experience_years": 15,
        "phone": "+8801712883311",
        "bio": "Cardiology specialist with 15 years experience providing hypertension care, cardiac rehabilitation, and diagnostic ECG/Echo.",
        "avatar_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
        "specs": ["Cardiology"],
        "clinics": [("Khulna City Medical College & Hospital", Decimal("900.00")), ("Gazi Medical College Hospital", Decimal("800.00"))]
    },
    {
        "email": "nusrat_khulna@doctor.com",
        "name": "Nusrat Jahan Shimu",
        "qualification": "MBBS, DDV (Dermatology)",
        "experience_years": 7,
        "phone": "+8801711664422",
        "bio": "Clinical dermatologist specializing in chronic eczema, acne therapy, psoriasis management, and pediatric skin care.",
        "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80",
        "specs": ["Dermatology"],
        "clinics": [("Gazi Medical College Hospital", Decimal("700.00"))]
    },

    # BARISHAL
    {
        "email": "kazi_barishal@doctor.com",
        "name": "Kazi Arifur Rahman",
        "qualification": "MBBS, MS (Urology)",
        "experience_years": 11,
        "phone": "+8801713552211",
        "bio": "Urologist specializing in stone diseases, minimally invasive endoscopic surgeries, and prostate health management.",
        "avatar_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&auto=format&fit=crop&q=80",
        "specs": ["Urology"],
        "clinics": [("Rahat Anwar Hospital & Diagnostic Complex", Decimal("800.00")), ("South Apollo Diagnostic & Specialized Hospital", Decimal("800.00"))]
    },

    # SYLHET
    {
        "email": "muqueet_sylhet@doctor.com",
        "name": "M. A. Muqueet",
        "qualification": "MBBS, FCPS (Medicine)",
        "experience_years": 20,
        "phone": "+8801711884400",
        "bio": "Eminent senior physician in Sylhet division with over two decades serving acute inpatient care and outpatient adult medicine.",
        "avatar_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80",
        "specs": ["General Medicine"],
        "clinics": [("Popular Medical Center & Hospital Sylhet", Decimal("1000.00")), ("Mount Adora Hospital", Decimal("1100.00"))]
    },
    {
        "email": "rumana_sylhet@doctor.com",
        "name": "Syeda Rumana Ahmed",
        "qualification": "MBBS, FCPS (Obs & Gynae)",
        "experience_years": 12,
        "phone": "+8801712663300",
        "bio": "Consultant gynecologist dedicated to safe motherhood, antenatal management, and high-risk pregnancies.",
        "avatar_url": "https://images.unsplash.com/photo-1594824813580-4591a7c5c24b?w=200&auto=format&fit=crop&q=80",
        "specs": ["Gynecology & Obstetrics"],
        "clinics": [("Mount Adora Hospital", Decimal("900.00"))]
    },

    # RANGPUR
    {
        "email": "nurul_rangpur@doctor.com",
        "name": "Nurul Islam Sarker",
        "qualification": "MBBS, D-Card, FCPS (Cardiology)",
        "experience_years": 14,
        "phone": "+8801711993322",
        "bio": "Consultant Cardiologist serving the northern division with high-level diagnostic echo, stress testing, and coronary therapeutics.",
        "avatar_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
        "specs": ["Cardiology", "General Medicine"],
        "clinics": [("Doctors Community Hospital Rangpur", Decimal("800.00")), ("Prime Medical College & Hospital", Decimal("800.00"))]
    },

    # MYMENSINGH & SHERPUR
    {
        "email": "joarder@gmail.com",
        "name": "Md. Aminul Islam Joarder",
        "qualification": "MBBS, MS (Surgery), FACS",
        "experience_years": 22,
        "phone": "+8801722334455",
        "bio": "Renowned professor and general surgeon specializing in advanced laparoscopic, gastrointestinal, and oncological procedures.",
        "avatar_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80",
        "specs": ["General Surgery", "Gastroenterology"],
        "clinics": [("Nexus Cardiac Hospital & Diagnostic Center", Decimal("1200.00")), ("Abedin Hospital & Specialized Center", Decimal("1200.00")), ("Metro Health Hub", Decimal("1200.00"))]
    },
    {
        "email": "lubna@gmail.com",
        "name": "Naznin Jahan Lubna",
        "qualification": "MBBS, MCPS, DGO, FCPS (Obs & Gynae)",
        "experience_years": 9,
        "phone": "+8801812345678",
        "bio": "Leading obstetrician and gynecologist dedicated to maternal healthcare, high-risk pregnancy, and laparoscopic surgery.",
        "avatar_url": "https://images.unsplash.com/photo-1594824813580-4591a7c5c24b?w=200&auto=format&fit=crop&q=80",
        "specs": ["Gynecology & Obstetrics"],
        "clinics": [("Nexus Cardiac Hospital & Diagnostic Center", Decimal("900.00")), ("Abedin Hospital & Specialized Center", Decimal("800.00")), ("Metro Health Hub", Decimal("900.00"))]
    },
]

# Clean existing schedules using all_objects to prevent unique constraint collisions
DoctorSchedule.all_objects.all().delete()

# 8. Upsert Doctors & Assign Schedules
room_counters = {}

for d_info in DOCTORS_BY_DIVISION:
    u = User.objects.filter(email=d_info["email"]).first()
    if not u:
        u = User.objects.create(
            email=d_info["email"],
            password=common_password,
            first_name=d_info["name"].split()[0],
            last_name=" ".join(d_info["name"].split()[1:]) or "Specialist",
            phone=d_info["phone"],
            role=UserRole.DOCTOR,
            is_active=True
        )
    else:
        u.password = common_password
        u.phone = d_info["phone"]
        u.role = UserRole.DOCTOR
        u.is_active = True
        u.save()

    doc = Doctor.all_objects.filter(email=d_info["email"]).first()
    if not doc:
        doc = Doctor.objects.create(
            user=u,
            email=d_info["email"],
            full_name=d_info["name"],
            qualification=d_info["qualification"],
            bio=d_info["bio"],
            experience_years=d_info["experience_years"],
            phone=d_info["phone"],
            avatar_url=d_info["avatar_url"],
            verification_status=VerificationStatus.VERIFIED,
            is_active=True
        )
    else:
        doc.user = u
        doc.full_name = d_info["name"]
        doc.qualification = d_info["qualification"]
        doc.bio = d_info["bio"]
        doc.experience_years = d_info["experience_years"]
        doc.phone = d_info["phone"]
        doc.avatar_url = d_info["avatar_url"]
        doc.verification_status = VerificationStatus.VERIFIED
        doc.is_active = True
        doc.is_deleted = False
        doc.save()

    # Assign Specializations
    doc.specializations.clear()
    for s_name in d_info["specs"]:
        if s_name in spec_map:
            doc.specializations.add(spec_map[s_name])

    # Assign Clinics and Non-overlapping weekly schedules
    for c_idx, (c_name, fee) in enumerate(d_info["clinics"]):
        clinic = clinic_obj_map.get(c_name)
        if clinic:
            room_counters[clinic.name] = room_counters.get(clinic.name, 100) + 1
            assigned_room = f"Room {room_counters[clinic.name]}"

            dc, _ = DoctorClinic.objects.get_or_create(
                doctor=doc,
                clinic=clinic,
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

            if c_idx == 0:
                # Primary Clinic: Mon, Wed, Fri, Sat (09:00 - 13:00)
                assigned_days = [0, 2, 4, 5]
                s_time, e_time = datetime.time(9, 0), datetime.time(13, 0)
            elif c_idx == 1:
                # Secondary Clinic: Sun, Tue, Thu (14:00 - 18:00)
                assigned_days = [1, 3, 6]
                s_time, e_time = datetime.time(14, 0), datetime.time(18, 0)
            else:
                # Tertiary Clinic: Tue, Thu evening (19:00 - 21:00)
                assigned_days = [1, 3]
                s_time, e_time = datetime.time(19, 0), datetime.time(21, 0)

            for day in assigned_days:
                DoctorSchedule.objects.create(
                    doctor=doc,
                    clinic=clinic,
                    day_of_week=day,
                    start_time=s_time,
                    end_time=e_time,
                    slot_duration_minutes=20,
                    max_patients=30,
                    is_active=True
                )

    print(f"Configured Doctor: Dr. {doc.full_name} (VERIFIED) across {len(d_info['clinics'])} clinics.")

# 9. Link Receptionists for major regional clinics
reception_staff_list = [
    ("receptionist@clinic.com", "Tania Akter", "Metro Health Hub"),
    ("rahela_counter@clinic.test", "Rahela Begum", "Metro Health Hub"),
    ("popular_reception@clinic.test", "Nasrin Sultana", "Popular Diagnostic & Medical Center"),
    ("abedin_reception@clinic.test", "Kabir Hossain", "Abedin Hospital & Specialized Center"),
    ("chevron_reception@clinic.test", "Farid Ahmed", "Chevron Clinical & Specialized Hospital"),
    ("rajshahi_reception@clinic.test", "Salma Khatun", "Popular Diagnostic Center Rajshahi"),
]

for s_email, s_name, c_name in reception_staff_list:
    u = User.objects.filter(email=s_email).first()
    if not u:
        u = User.objects.create(
            email=s_email,
            password=common_password,
            first_name=s_name.split()[0],
            last_name=" ".join(s_name.split()[1:]) or "Staff",
            phone="+8801712000000",
            role=UserRole.RECEPTIONIST,
            is_active=True
        )
    else:
        u.password = common_password
        u.role = UserRole.RECEPTIONIST
        u.is_active = True
        u.save()

    cln = clinic_obj_map.get(c_name)
    if cln:
        ClinicStaff.objects.update_or_create(
            user=u,
            defaults={
                "clinic": cln,
                "name": s_name,
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
print("Configured Clinic Staff / Receptionists.")

print("=== 8-Division Healthcare Network Seeding Complete Successfully ===")
