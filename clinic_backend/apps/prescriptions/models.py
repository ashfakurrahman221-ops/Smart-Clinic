import uuid
from django.db import models
from django.conf import settings
from apps.core.models import BaseModel
from apps.appointments.models import Appointment
from apps.doctors.models import Doctor
from apps.accounts.models import FamilyMember

class MedicationForm(models.TextChoices):
    TABLET = 'TABLET', 'Tablet'
    CAPSULE = 'CAPSULE', 'Capsule'
    SYRUP = 'SYRUP', 'Syrup'
    INJECTION = 'INJECTION', 'Injection'
    DROP = 'DROP', 'Eye/Ear Drop'
    CREAM = 'CREAM', 'Ointment/Cream'
    INHALER = 'INHALER', 'Inhaler'
    OTHER = 'OTHER', 'Other'

class Medication(BaseModel):
    """
    DGDA Bangladesh Drug Master Catalog (Brand & Generic names).
    """
    brand_name = models.CharField(max_length=150, db_index=True)
    generic_name = models.CharField(max_length=150, db_index=True)
    form = models.CharField(max_length=20, choices=MedicationForm.choices, default=MedicationForm.TABLET)
    strength = models.CharField(max_length=50, blank=True, default='')
    manufacturer = models.CharField(max_length=150, blank=True, default='')

    class Meta:
        ordering = ['brand_name']
        verbose_name = 'Medication'
        verbose_name_plural = 'Medications'
        unique_together = ('brand_name', 'strength')

    def __str__(self):
        return f"{self.brand_name} {self.strength} ({self.generic_name}) - {self.manufacturer}"

class Prescription(BaseModel):
    """
    Digital E-Prescription generated for an Appointment.
    """
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name='prescription'
    )
    doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name='prescriptions')
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='prescriptions'
    )
    family_member = models.ForeignKey(
        FamilyMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prescriptions'
    )
    diagnosis = models.TextField(blank=True, default='')
    vitals = models.JSONField(default=dict, blank=True, help_text="e.g. {'bp': '120/80', 'pulse': '72', 'weight': '70', 'temp': '98.6', 'blood_sugar': '6.2'}")
    diagnostic_tests = models.TextField(blank=True, default='', help_text="e.g. CBC, Lipid Profile, USG of Whole Abdomen")
    advice = models.TextField(blank=True, default='', help_text="General lifestyle & dietary instructions")
    follow_up_date = models.DateField(null=True, blank=True, help_text="Recommended next consultation date")
    follow_up_notes = models.CharField(max_length=255, blank=True, default='', help_text="e.g. Come with CBC report after 7 days")
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Prescription'
        verbose_name_plural = 'Prescriptions'

    def __str__(self):
        return f"Rx {self.id.hex[:8]} - Appointment {self.appointment_id.hex[:8]} (Dr. {self.doctor.full_name})"

class PrescribedMedication(BaseModel):
    """
    Individual medication line item in an E-Prescription.
    """
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name='medications'
    )
    medication_name = models.CharField(max_length=200, help_text="e.g. Tab. Napa 500mg (Paracetamol)")
    dosage = models.CharField(max_length=50, default='1 + 0 + 1', help_text="e.g. 1 + 0 + 1 or 1 + 1 + 1")
    timing = models.CharField(max_length=50, default='After Meal', help_text="e.g. After Meal, Before Meal")
    duration = models.CharField(max_length=50, default='7 Days', help_text="e.g. 7 Days, 1 Month, Continue")
    instructions = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Prescribed Medication'
        verbose_name_plural = 'Prescribed Medications'

    def __str__(self):
        return f"{self.medication_name} ({self.dosage} for {self.duration})"


class ReportCategory(models.TextChoices):
    BLOOD_TEST = 'BLOOD_TEST', 'Blood Test (CBC, HbA1c, Lipid)'
    IMAGING = 'IMAGING', 'Imaging (X-Ray, USG, MRI, CT)'
    CARDIOLOGY = 'CARDIOLOGY', 'Cardiology (ECG, Echo, ETT)'
    PATHOLOGY = 'PATHOLOGY', 'Pathology & Biopsy'
    PRESCRIPTION_SCAN = 'PRESCRIPTION_SCAN', 'Previous Prescription Scan'
    OTHER = 'OTHER', 'Other Diagnostic Report'


class MedicalReport(BaseModel):
    """
    Patient Diagnostic Lab Report Vault.
    Allows storing and organizing lab test reports from Popular, Ibn Sina, Labaid, etc.
    Tagged by patient or family member (parent care).
    """
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medical_reports'
    )
    family_member = models.ForeignKey(
        FamilyMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='medical_reports'
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='medical_reports'
    )
    title = models.CharField(max_length=200, help_text="e.g. Complete Blood Count (CBC) with ESR")
    report_type = models.CharField(
        max_length=30,
        choices=ReportCategory.choices,
        default=ReportCategory.BLOOD_TEST,
        db_index=True
    )
    diagnostic_center = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text="e.g. Popular Diagnostic, Ibn Sina, Labaid, Square"
    )
    test_date = models.DateField(db_index=True)
    file_url = models.URLField(max_length=500, help_text="Document or Cloudinary scan URL")
    summary_notes = models.TextField(
        blank=True,
        default='',
        help_text="Key values, e.g. HbA1c: 7.4%, Total Cholesterol: 220 mg/dL"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_reports'
    )

    # AI Medical Report Analyzer Fields
    ai_analysis_status = models.CharField(
        max_length=20,
        default='PENDING',
        choices=[
            ('PENDING', 'Pending Analysis'),
            ('PROCESSING', 'Analyzing via AI'),
            ('COMPLETED', 'Analysis Complete'),
            ('FAILED', 'Analysis Failed')
        ],
        db_index=True
    )
    ai_summary_en = models.TextField(blank=True, default='', help_text="AI generated clinical summary in English")
    ai_summary_bn = models.TextField(blank=True, default='', help_text="সহজ বাংলায় রোগীর জন্য ফলাফল ব্যাখ্যা")
    ai_extracted_parameters = models.JSONField(
        default=list,
        blank=True,
        help_text="Structured array of extracted lab parameters with units, normal reference ranges, and flags"
    )
    ai_risk_level = models.CharField(
        max_length=20,
        default='NORMAL',
        choices=[
            ('NORMAL', 'Normal'),
            ('ATTENTION_NEEDED', 'Attention Needed'),
            ('HIGH_RISK', 'High Risk')
        ]
    )
    ai_doctor_questions = models.JSONField(
        default=list,
        blank=True,
        help_text="Recommended questions for patient to discuss with their doctor"
    )
    ai_analyzed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-test_date', '-created_at']
        verbose_name = 'Medical Report'
        verbose_name_plural = 'Medical Reports'

    def __str__(self):
        target = self.family_member.full_name if self.family_member else self.patient.full_name
        return f"{self.title} - {target} ({self.test_date})"


class PatientVitalLog(BaseModel):
    """
    Patient Clinical Vitals & Indicator Time-Series Record.
    Tracks Blood Pressure, Pulse, Blood Glucose, Weight, Height, BMI over time.
    """
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vital_logs'
    )
    family_member = models.ForeignKey(
        FamilyMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vital_logs'
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vital_logs'
    )
    prescription = models.ForeignKey(
        'prescriptions.Prescription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vital_logs'
    )

    # Blood Pressure (e.g. 120 / 80 mmHg)
    systolic_bp = models.PositiveIntegerField(null=True, blank=True, help_text="Systolic BP (mmHg)")
    diastolic_bp = models.PositiveIntegerField(null=True, blank=True, help_text="Diastolic BP (mmHg)")

    # Pulse / Heart Rate
    pulse_rate = models.PositiveIntegerField(null=True, blank=True, help_text="Pulse Rate (bpm)")

    # Blood Sugar / Glucose
    blood_glucose = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="mmol/L")
    glucose_type = models.CharField(
        max_length=20,
        default='RBS',
        choices=[
            ('RBS', 'Random Blood Sugar'),
            ('FBS', 'Fasting Blood Sugar'),
            ('2HABF', '2 Hours After Breakfast')
        ]
    )

    # Anthropometrics
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Weight (kg)")
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Height (cm)")
    temperature_f = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Temperature (°F)")
    spo2 = models.PositiveIntegerField(null=True, blank=True, help_text="Blood Oxygen SpO2 (%)")

    recorded_at = models.DateTimeField(db_index=True)
    notes = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-recorded_at']
        verbose_name = 'Patient Vital Log'
        verbose_name_plural = 'Patient Vital Logs'

    def __str__(self):
        target = self.family_member.full_name if self.family_member else self.patient.full_name
        date_str = self.recorded_at.strftime('%Y-%m-%d') if self.recorded_at else 'Unknown Date'
        return f"Vitals {target} on {date_str}"

    @property
    def bmi(self):
        if self.weight_kg and self.height_cm and self.height_cm > 0:
            height_m = float(self.height_cm) / 100.0
            return round(float(self.weight_kg) / (height_m * height_m), 1)
        return None

