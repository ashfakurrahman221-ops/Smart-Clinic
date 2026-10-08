from typing import List, Dict, Any
from django.db import transaction
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import Medication, Prescription, PrescribedMedication, MedicationForm
from apps.appointments.models import Appointment, AppointmentStatus

COMMON_BD_MEDICATIONS = [
    # Paracetamol & Pain Relief
    {"brand_name": "Napa", "generic_name": "Paracetamol", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Napa Extra", "generic_name": "Paracetamol + Caffeine", "form": MedicationForm.TABLET, "strength": "500mg+65mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Napa Extend", "generic_name": "Paracetamol", "form": MedicationForm.TABLET, "strength": "665mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Napa Rapid", "generic_name": "Paracetamol", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Ace", "generic_name": "Paracetamol", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Ace Plus", "generic_name": "Paracetamol + Caffeine", "form": MedicationForm.TABLET, "strength": "500mg+65mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Fast", "generic_name": "Paracetamol", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Acme Laboratories"},
    {"brand_name": "Dolo", "generic_name": "Paracetamol", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Torax", "generic_name": "Ketorolac Tromethamine", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Rolac", "generic_name": "Ketorolac Tromethamine", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Voveran", "generic_name": "Diclofenac Sodium", "form": MedicationForm.TABLET, "strength": "50mg", "manufacturer": "Novartis Bangladesh"},
    {"brand_name": "Clofenac", "generic_name": "Diclofenac Sodium", "form": MedicationForm.TABLET, "strength": "50mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Tufnil", "generic_name": "Tolfenamic Acid", "form": MedicationForm.TABLET, "strength": "200mg", "manufacturer": "Eskayef Pharmaceuticals"},

    # Gastric & PPI
    {"brand_name": "Seclo", "generic_name": "Omeprazole", "form": MedicationForm.CAPSULE, "strength": "20mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Seclo", "generic_name": "Omeprazole", "form": MedicationForm.CAPSULE, "strength": "40mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Maxpro", "generic_name": "Esomeprazole", "form": MedicationForm.TABLET, "strength": "20mg", "manufacturer": "Renata Limited"},
    {"brand_name": "Maxpro", "generic_name": "Esomeprazole", "form": MedicationForm.TABLET, "strength": "40mg", "manufacturer": "Renata Limited"},
    {"brand_name": "Sergel", "generic_name": "Esomeprazole", "form": MedicationForm.TABLET, "strength": "20mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Sergel", "generic_name": "Esomeprazole", "form": MedicationForm.TABLET, "strength": "40mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Nexum", "generic_name": "Esomeprazole", "form": MedicationForm.TABLET, "strength": "20mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Pantonix", "generic_name": "Pantoprazole", "form": MedicationForm.TABLET, "strength": "20mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Finix", "generic_name": "Rabeprazole", "form": MedicationForm.TABLET, "strength": "20mg", "manufacturer": "Opsonin Pharma"},
    {"brand_name": "Losectil", "generic_name": "Omeprazole", "form": MedicationForm.CAPSULE, "strength": "20mg", "manufacturer": "Eskayef Pharmaceuticals"},
    {"brand_name": "Entacyd Plus", "generic_name": "Magaldrate + Simethicone", "form": MedicationForm.SYRUP, "strength": "200ml", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Gaviscon", "generic_name": "Sodium Alginate + Potassium Bicarbonate", "form": MedicationForm.SYRUP, "strength": "200ml", "manufacturer": "Reckitt Benckiser BD"},
    {"brand_name": "Flatuna", "generic_name": "Simethicone", "form": MedicationForm.TABLET, "strength": "40mg", "manufacturer": "Square Pharmaceuticals"},

    # Antibiotics
    {"brand_name": "Cef-3", "generic_name": "Cefixime", "form": MedicationForm.CAPSULE, "strength": "200mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Cef-3", "generic_name": "Cefixime", "form": MedicationForm.CAPSULE, "strength": "400mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Azithrocin", "generic_name": "Azithromycin", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Zithrox", "generic_name": "Azithromycin", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Moxaclav", "generic_name": "Amoxicillin + Clavulanic Acid", "form": MedicationForm.TABLET, "strength": "625mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Ciprocin", "generic_name": "Ciprofloxacin", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Levoking", "generic_name": "Levofloxacin", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Fixolin", "generic_name": "Cefuroxime Axetil", "form": MedicationForm.TABLET, "strength": "250mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Lucent", "generic_name": "Cefpodoxime Proxetil", "form": MedicationForm.TABLET, "strength": "200mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Bactron", "generic_name": "Co-trimoxazole", "form": MedicationForm.TABLET, "strength": "480mg", "manufacturer": "Square Pharmaceuticals"},

    # Antihistamines & Allergy
    {"brand_name": "Fexo", "generic_name": "Fexofenadine", "form": MedicationForm.TABLET, "strength": "120mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Fexo", "generic_name": "Fexofenadine", "form": MedicationForm.TABLET, "strength": "180mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Alatrex", "generic_name": "Cetirizine Hydrochloride", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Bilash", "generic_name": "Bilastine", "form": MedicationForm.TABLET, "strength": "20mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Rupafin", "generic_name": "Rupatadine", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Deslor", "generic_name": "Desloratadine", "form": MedicationForm.TABLET, "strength": "5mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Ebatin", "generic_name": "Ebastine", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Alastall", "generic_name": "Loratadine", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Beximco Pharmaceuticals"},

    # Respiratory & Cough
    {"brand_name": "Monas 10", "generic_name": "Montelukast", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "The Acme Laboratories"},
    {"brand_name": "Montene 10", "generic_name": "Montelukast", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Ventolin", "generic_name": "Salbutamol", "form": MedicationForm.INHALER, "strength": "100mcg", "manufacturer": "GlaxoSmithKline BD"},
    {"brand_name": "Miracof", "generic_name": "Butamirate Citrate", "form": MedicationForm.SYRUP, "strength": "100ml", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Pulmocoff", "generic_name": "Levodropropizine", "form": MedicationForm.SYRUP, "strength": "100ml", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Adryll", "generic_name": "Diphenhydramine Hydrochloride", "form": MedicationForm.SYRUP, "strength": "100ml", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Tofen", "generic_name": "Ketotifen", "form": MedicationForm.SYRUP, "strength": "1mg/5ml", "manufacturer": "Beximco Pharmaceuticals"},

    # Cardiovascular & Blood Pressure
    {"brand_name": "Bislol", "generic_name": "Bisoprolol Fumarate", "form": MedicationForm.TABLET, "strength": "2.5mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Bislol", "generic_name": "Bisoprolol Fumarate", "form": MedicationForm.TABLET, "strength": "5mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Angilock", "generic_name": "Losartan Potassium", "form": MedicationForm.TABLET, "strength": "50mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Cardipin", "generic_name": "Amlodipine Besylate", "form": MedicationForm.TABLET, "strength": "5mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Olmecar", "generic_name": "Olmesartan Medoxomil", "form": MedicationForm.TABLET, "strength": "20mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Losar", "generic_name": "Losartan Potassium", "form": MedicationForm.TABLET, "strength": "50mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Camlodin", "generic_name": "Amlodipine Besylate", "form": MedicationForm.TABLET, "strength": "5mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "A-Card", "generic_name": "Aspirin", "form": MedicationForm.TABLET, "strength": "75mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Rosuva", "generic_name": "Rosuvastatin", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Lipicon", "generic_name": "Atorvastatin Calcium", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Square Pharmaceuticals"},

    # Diabetes
    {"brand_name": "Comprid", "generic_name": "Glimepiride", "form": MedicationForm.TABLET, "strength": "2mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Diapro", "generic_name": "Gliclazide", "form": MedicationForm.TABLET, "strength": "80mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Janumet", "generic_name": "Sitagliptin + Metformin", "form": MedicationForm.TABLET, "strength": "50mg/500mg", "manufacturer": "Beximco Pharmaceuticals"},
    {"brand_name": "Galvus Met", "generic_name": "Vildagliptin + Metformin", "form": MedicationForm.TABLET, "strength": "50mg/500mg", "manufacturer": "Novartis Bangladesh"},
    {"brand_name": "Trajenta", "generic_name": "Linagliptin", "form": MedicationForm.TABLET, "strength": "5mg", "manufacturer": "Incepta Pharmaceuticals"},
    {"brand_name": "Jardiance", "generic_name": "Empagliflozin", "form": MedicationForm.TABLET, "strength": "10mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Metfo", "generic_name": "Metformin Hydrochloride", "form": MedicationForm.TABLET, "strength": "500mg", "manufacturer": "Beximco Pharmaceuticals"},

    # Vitamins, Minerals & Supplements
    {"brand_name": "Coralcal-D", "generic_name": "Calcium Carbonate (Coral) + Vitamin D3", "form": MedicationForm.TABLET, "strength": "500mg+200IU", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Calbo-D", "generic_name": "Calcium Carbonate + Vitamin D3", "form": MedicationForm.TABLET, "strength": "500mg+200IU", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "B-50 Forte", "generic_name": "Vitamin B Complex", "form": MedicationForm.TABLET, "strength": "Standard", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Aristovit B", "generic_name": "Vitamin B Complex", "form": MedicationForm.TABLET, "strength": "Standard", "manufacturer": "Aristopharma Limited"},
    {"brand_name": "Neuro-B", "generic_name": "Vitamin B1 + B6 + B12", "form": MedicationForm.TABLET, "strength": "Standard", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "D-Rise", "generic_name": "Cholecalciferol (Vitamin D3)", "form": MedicationForm.CAPSULE, "strength": "20000 IU", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Folison", "generic_name": "Folic Acid", "form": MedicationForm.TABLET, "strength": "5mg", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Filwel Gold", "generic_name": "Multivitamin & Multimineral (A to Z)", "form": MedicationForm.TABLET, "strength": "Standard", "manufacturer": "Square Pharmaceuticals"},

    # Pediatric & Topical
    {"brand_name": "Napa Suspension", "generic_name": "Paracetamol", "form": MedicationForm.SYRUP, "strength": "120mg/5ml", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Moxiflox", "generic_name": "Moxifloxacin", "form": MedicationForm.DROP, "strength": "0.5%", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Bactrocin", "generic_name": "Mupirocin", "form": MedicationForm.CREAM, "strength": "2%", "manufacturer": "Square Pharmaceuticals"},
    {"brand_name": "Fucicort", "generic_name": "Fusidic Acid + Betamethasone", "form": MedicationForm.CREAM, "strength": "15g", "manufacturer": "Square Pharmaceuticals"},
]

def seed_dgda_medications_if_empty():
    for med in COMMON_BD_MEDICATIONS:
        Medication.objects.get_or_create(
            brand_name=med["brand_name"],
            strength=med["strength"],
            defaults=med
        )


def create_or_update_prescription(
    *,
    appointment: Appointment,
    doctor_user,
    diagnosis: str = "",
    vitals: Dict[str, Any] = None,
    diagnostic_tests: str = "",
    advice: str = "",
    follow_up_date: Any = None,
    follow_up_notes: str = "",
    medications_data: List[Dict[str, Any]] = None
) -> Prescription:
    """
    Creates or updates an E-Prescription for an appointment.
    """
    if vitals is None:
        vitals = {}
    if medications_data is None:
        medications_data = []

    # Check authorization:
    # 1. Assigned Doctor: must have role DOCTOR and be the doctor assigned to the appointment
    # 2. Clinic Admin: must have role CLINIC_ADMIN and be the owner of the appointment's clinic
    # 3. Super Admin / Staff: role ADMIN, is_staff, or is_superuser
    # Patients and Receptionists are strictly forbidden.
    assigned_doctor = appointment.doctor
    user_role = getattr(doctor_user, 'role', None)

    is_assigned_doctor = (
        user_role == 'DOCTOR'
        and (
            (hasattr(doctor_user, 'doctor_profile') and doctor_user.doctor_profile == assigned_doctor)
            or (assigned_doctor.email and assigned_doctor.email == doctor_user.email)
        )
    )

    is_clinic_owner = (
        user_role == 'CLINIC_ADMIN'
        and appointment.clinic is not None
        and appointment.clinic.owner == doctor_user
    )

    is_admin = (
        user_role == 'ADMIN'
        or getattr(doctor_user, 'is_staff', False)
        or getattr(doctor_user, 'is_superuser', False)
    )

    if not (is_assigned_doctor or is_clinic_owner or is_admin):
        raise PermissionDenied("Only the assigned doctor, the clinic owner, or an authorized admin can issue a prescription for this appointment.")

    with transaction.atomic():
        prescription, created = Prescription.objects.update_or_create(
            appointment=appointment,
            defaults={
                'doctor': assigned_doctor,
                'patient': appointment.patient,
                'family_member': appointment.family_member,
                'diagnosis': diagnosis,
                'vitals': vitals,
                'diagnostic_tests': diagnostic_tests,
                'advice': advice,
                'follow_up_date': follow_up_date,
                'follow_up_notes': follow_up_notes,
            }
        )

        # Clear existing prescribed medications and re-create
        prescription.medications.all().delete()
        for item in medications_data:
            PrescribedMedication.objects.create(
                prescription=prescription,
                medication_name=item.get('medication_name', ''),
                dosage=item.get('dosage', '1 + 0 + 1'),
                timing=item.get('timing', 'After Meal'),
                duration=item.get('duration', '7 Days'),
                instructions=item.get('instructions', '')
            )

        # If appointment is confirmed, mark as COMPLETED upon issuing Rx
        if appointment.status == AppointmentStatus.CONFIRMED:
            appointment.status = AppointmentStatus.COMPLETED
            appointment.save(update_fields=['status', 'updated_at'])

        # Dispatch SMS notification to patient that prescription is ready
        try:
            from apps.notifications.sms_service import send_sms_notification
            from apps.notifications.models import NotificationType
            patient = appointment.patient
            patient_name = appointment.family_member.full_name if appointment.family_member else f"{patient.first_name} {patient.last_name}".strip()
            meds_count = len(medications_data)
            send_sms_notification(
                recipient=patient,
                title="E-Prescription Ready 📋",
                message=(
                    f"Dear {patient_name}, Dr. {assigned_doctor.full_name} has issued your digital prescription "
                    f"({meds_count} medicine(s), Diagnosis: {diagnosis}). "
                    f"Log in to Smart Clinic to view & download your E-Rx (QR: {str(prescription.qr_token)[:8]}...)."
                ),
                notification_type=NotificationType.PRESCRIPTION_ISSUED
            )
        except Exception:
            pass  # Never let notification failure break core prescription flow

        # Synchronize structured vitals log for longitudinal health charts
        try:
            sync_prescription_vitals(prescription)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Failed to sync prescription vitals: %s", e)

        return prescription


def sync_prescription_vitals(prescription):
    """
    Parses and synchronizes raw vitals dictionary from Prescription into a structured
    PatientVitalLog record for longitudinal health tracking and charting.
    """
    if not prescription or not prescription.vitals:
        return None

    vitals_dict = prescription.vitals
    if not isinstance(vitals_dict, dict):
        return None

    from .models import PatientVitalLog
    import re
    from decimal import Decimal
    from django.utils import timezone
    import datetime

    systolic_bp = None
    diastolic_bp = None
    pulse_rate = None
    blood_glucose = None
    weight_kg = None
    height_cm = None
    temperature_f = None
    spo2 = None

    # Parse Blood Pressure, e.g. "120/80" or "125 / 85 mmHg"
    bp_raw = str(vitals_dict.get('bp', '')).strip()
    bp_match = re.search(r'(\d{2,3})\s*[\/\-]\s*(\d{2,3})', bp_raw)
    if bp_match:
        try:
            systolic_bp = int(bp_match.group(1))
            diastolic_bp = int(bp_match.group(2))
        except (ValueError, TypeError):
            pass

    # Parse Pulse, e.g. "72 bpm" or "78"
    pulse_raw = str(vitals_dict.get('pulse', '')).strip()
    pulse_match = re.search(r'(\d{2,3})', pulse_raw)
    if pulse_match:
        try:
            pulse_rate = int(pulse_match.group(1))
        except (ValueError, TypeError):
            pass

    # Parse Blood Sugar, e.g. "6.2 mmol/L" or "7.4" or "110 mg/dL"
    sugar_raw = str(vitals_dict.get('blood_sugar', vitals_dict.get('rbs', vitals_dict.get('fbs', '')))).strip()
    sugar_match = re.search(r'(\d+(?:\.\d+)?)', sugar_raw)
    if sugar_match:
        try:
            val = float(sugar_match.group(1))
            # If value > 30, it might be in mg/dL -> convert to mmol/L (divide by 18.0)
            if val > 30:
                val = round(val / 18.0, 2)
            blood_glucose = Decimal(str(round(val, 2)))
        except (ValueError, TypeError):
            pass

    # Parse Weight, e.g. "68kg" or "70.5"
    weight_raw = str(vitals_dict.get('weight', '')).strip()
    weight_match = re.search(r'(\d+(?:\.\d+)?)', weight_raw)
    if weight_match:
        try:
            weight_kg = Decimal(str(round(float(weight_match.group(1)), 2)))
        except (ValueError, TypeError):
            pass

    # Parse Temp, e.g. "101.4F" or "98.6"
    temp_raw = str(vitals_dict.get('temp', vitals_dict.get('temperature', ''))).strip()
    temp_match = re.search(r'(\d+(?:\.\d+)?)', temp_raw)
    if temp_match:
        try:
            temperature_f = Decimal(str(round(float(temp_match.group(1)), 2)))
        except (ValueError, TypeError):
            pass

    # Determine recorded date
    recorded_at = None
    if prescription.appointment and prescription.appointment.appointment_date:
        app_date = prescription.appointment.appointment_date
        app_time = prescription.appointment.appointment_time or datetime.time(9, 0)
        naive_dt = datetime.datetime.combine(app_date, app_time)
        recorded_at = timezone.make_aware(naive_dt) if timezone.is_naive(naive_dt) else naive_dt
    else:
        recorded_at = prescription.created_at or timezone.now()

    # Create or update PatientVitalLog
    vital_log, _ = PatientVitalLog.objects.update_or_create(
        prescription=prescription,
        defaults={
            'patient': prescription.patient,
            'family_member': prescription.family_member,
            'appointment': prescription.appointment,
            'systolic_bp': systolic_bp,
            'diastolic_bp': diastolic_bp,
            'pulse_rate': pulse_rate,
            'blood_glucose': blood_glucose,
            'weight_kg': weight_kg,
            'temperature_f': temperature_f,
            'recorded_at': recorded_at,
            'notes': f"Recorded via Prescription Rx {prescription.id.hex[:8]}"
        }
    )
    return vital_log

