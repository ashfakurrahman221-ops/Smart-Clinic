import os
import logging
from rest_framework import serializers
from .models import Medication, Prescription, PrescribedMedication, PatientVitalLog
from apps.doctors.models import Doctor
from apps.doctors.serializers import DoctorSerializer
from apps.accounts.serializers import UserSerializer, FamilyMemberSerializer

class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ('id', 'brand_name', 'generic_name', 'form', 'strength', 'manufacturer')
        read_only_fields = ('id',)

class PrescribedMedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescribedMedication
        fields = ('id', 'medication_name', 'dosage', 'timing', 'duration', 'instructions')
        read_only_fields = ('id',)

class PrescriptionSerializer(serializers.ModelSerializer):
    doctor = DoctorSerializer(read_only=True)
    patient = UserSerializer(read_only=True)
    family_member = FamilyMemberSerializer(read_only=True)
    medications = PrescribedMedicationSerializer(many=True, read_only=True)
    clinic_name = serializers.CharField(source='appointment.clinic.name', read_only=True, default='')
    clinic_address = serializers.CharField(source='appointment.clinic.address', read_only=True, default='')
    clinic_phone = serializers.CharField(source='appointment.clinic.phone', read_only=True, default='')
    appointment_date = serializers.DateField(source='appointment.appointment_date', read_only=True, default=None)
    serial_number = serializers.IntegerField(source='appointment.serial_number', read_only=True, default=1)

    class Meta:
        model = Prescription
        fields = (
            'id', 'appointment', 'doctor', 'patient', 'family_member',
            'diagnosis', 'vitals', 'diagnostic_tests', 'advice',
            'follow_up_date', 'follow_up_notes',
            'qr_token', 'medications', 'clinic_name', 'clinic_address',
            'clinic_phone', 'appointment_date', 'serial_number',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'qr_token', 'created_at', 'updated_at')


class DoctorPublicVerifySerializer(serializers.ModelSerializer):
    """Minimized public doctor representation for QR verification (no phone/email/avatar)."""
    specializations = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field='name'
    )

    class Meta:
        model = Doctor
        fields = ('id', 'full_name', 'qualification', 'specializations')
        read_only_fields = ('id', 'full_name', 'qualification', 'specializations')


class PatientPublicVerifySerializer(serializers.Serializer):
    """Minimized public patient representation for QR verification (strictly no phone/email/id)."""
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    display_name = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        return f"{getattr(obj, 'first_name', '')} {getattr(obj, 'last_name', '')}".strip() or "Patient"


class FamilyMemberPublicVerifySerializer(serializers.Serializer):
    """Minimized public family member representation for QR verification (no phone/notes)."""
    full_name = serializers.CharField(read_only=True)
    relationship = serializers.CharField(read_only=True)
    relationship_display = serializers.CharField(source='get_relationship_display', read_only=True)
    age = serializers.IntegerField(read_only=True)
    gender = serializers.CharField(read_only=True)


class PrescriptionPublicVerifySerializer(serializers.ModelSerializer):
    """
    Dedicated public QR verification serializer.
    Exposes ONLY fields strictly necessary to verify authenticity and dispense medicines.
    Excludes all sensitive PHI: patient phone, patient email, diagnosis, vitals,
    diagnostic tests, advice, and internal account IDs.
    """
    doctor = DoctorPublicVerifySerializer(read_only=True)
    patient = PatientPublicVerifySerializer(read_only=True)
    family_member = FamilyMemberPublicVerifySerializer(read_only=True)
    medications = PrescribedMedicationSerializer(many=True, read_only=True)
    clinic_name = serializers.CharField(source='appointment.clinic.name', read_only=True, default='')
    clinic_address = serializers.CharField(source='appointment.clinic.address', read_only=True, default='')
    clinic_phone = serializers.CharField(source='appointment.clinic.phone', read_only=True, default='')
    appointment_date = serializers.DateField(source='appointment.appointment_date', read_only=True, default=None)
    serial_number = serializers.IntegerField(source='appointment.serial_number', read_only=True, default=1)
    is_valid = serializers.BooleanField(default=True, read_only=True)

    class Meta:
        model = Prescription
        fields = (
            'id', 'qr_token', 'created_at', 'appointment_date', 'serial_number',
            'clinic_name', 'clinic_address', 'clinic_phone',
            'doctor', 'patient', 'family_member', 'medications', 'is_valid'
        )
        read_only_fields = fields

class PrescribedMedicationItemSerializer(serializers.Serializer):
    medication_name = serializers.CharField(required=True)
    dosage = serializers.CharField(required=False, default='1 + 0 + 1')
    timing = serializers.CharField(required=False, default='After Meal')
    duration = serializers.CharField(required=False, default='7 Days')
    instructions = serializers.CharField(required=False, allow_blank=True, default='')

class PrescriptionCreateSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField(required=True)
    diagnosis = serializers.CharField(required=False, allow_blank=True, default='')
    vitals = serializers.JSONField(required=False, default=dict)
    diagnostic_tests = serializers.CharField(required=False, allow_blank=True, default='')
    advice = serializers.CharField(required=False, allow_blank=True, default='')
    follow_up_date = serializers.DateField(required=False, allow_null=True, default=None)
    follow_up_notes = serializers.CharField(required=False, allow_blank=True, default='')
    medications = PrescribedMedicationItemSerializer(many=True, required=False, default=list)


from .models import MedicalReport, ReportCategory

class MedicalReportSerializer(serializers.ModelSerializer):
    family_member_name = serializers.CharField(source='family_member.full_name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    file = serializers.FileField(write_only=True, required=False)
    file_url = serializers.CharField(write_only=True, required=False)
    access_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MedicalReport
        fields = (
            'id', 'patient', 'family_member', 'family_member_name', 'appointment',
            'title', 'report_type', 'report_type_display', 'diagnostic_center',
            'test_date', 'file', 'file_url', 'access_url', 'summary_notes', 'uploaded_by',
            'ai_analysis_status', 'ai_summary_en', 'ai_summary_bn', 'ai_extracted_parameters',
            'ai_risk_level', 'ai_doctor_questions', 'ai_analyzed_at',
            'created_at'
        )
        read_only_fields = (
            'id', 'created_at', 'uploaded_by', 'patient', 'access_url',
            'ai_analysis_status', 'ai_summary_en', 'ai_summary_bn', 'ai_extracted_parameters',
            'ai_risk_level', 'ai_doctor_questions', 'ai_analyzed_at'
        )

    def get_access_url(self, obj):
        return f"/api/v1/prescriptions/reports/{obj.id}/access/"

    def validate(self, attrs):
        file_obj = attrs.get('file')
        file_url = attrs.get('file_url')

        if not file_obj and not file_url and not self.instance:
            raise serializers.ValidationError({"file": "Either a file or file_url is required."})

        if file_obj:
            # 1. Size validation (max 10MB, non-zero)
            max_size = 10 * 1024 * 1024  # 10 MB
            if file_obj.size == 0:
                raise serializers.ValidationError({"file": "Uploaded file is empty (0 bytes)."})
            if file_obj.size > max_size:
                raise serializers.ValidationError({"file": "File size exceeds the 10MB limit."})

            # 2. Extension validation
            ext = os.path.splitext(file_obj.name)[1].lower()
            allowed_exts = {'.pdf', '.jpg', '.jpeg', '.png'}
            if ext not in allowed_exts:
                raise serializers.ValidationError({
                    "file": f"Unsupported file extension '{ext}'. Allowed extensions are: PDF, JPG, JPEG, PNG."
                })

            # 3. Magic bytes signature validation & cross-check
            header = file_obj.read(16)
            file_obj.seek(0)

            is_pdf = header.startswith(b'%PDF')
            is_jpeg = header.startswith(b'\xff\xd8\xff')
            is_png = header.startswith(b'\x89PNG\r\n\x1a\n')

            if not (is_pdf or is_jpeg or is_png):
                raise serializers.ValidationError({
                    "file": "Invalid file content. File does not match its expected format."
                })

            if ext == '.pdf' and not is_pdf:
                raise serializers.ValidationError({"file": "File extension is .pdf but content is not a valid PDF."})
            if ext in ('.jpg', '.jpeg') and not is_jpeg:
                raise serializers.ValidationError({"file": "File extension is JPEG but content is not a valid JPEG."})
            if ext == '.png' and not is_png:
                raise serializers.ValidationError({"file": "File extension is .png but content is not a valid PNG."})

        return attrs

    def create(self, validated_data):
        file_obj = validated_data.pop('file', None)
        if file_obj:
            from apps.common.utils import CloudinaryStorageService
            try:
                uploaded_url = CloudinaryStorageService.upload_medical_report(file_obj)
                if not uploaded_url:
                    raise ValueError("Cloudinary did not return a valid secure_url.")
                validated_data['file_url'] = uploaded_url
            except Exception as e:
                logging.getLogger(__name__).error("Failed to upload medical report: %s", e)
                raise serializers.ValidationError({"file": "Failed to upload file to cloud storage. Please try again."})

        return super().create(validated_data)


class PatientVitalLogSerializer(serializers.ModelSerializer):
    bmi = serializers.FloatField(read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    family_member_name = serializers.CharField(source='family_member.full_name', read_only=True, default=None)
    doctor_name = serializers.CharField(source='prescription.doctor.full_name', read_only=True, default=None)
    clinic_name = serializers.CharField(source='appointment.clinic.name', read_only=True, default=None)

    # Status helper calculations
    bp_category = serializers.SerializerMethodField()
    glucose_category = serializers.SerializerMethodField()
    bmi_category = serializers.SerializerMethodField()

    class Meta:
        model = PatientVitalLog
        fields = (
            'id', 'patient', 'patient_name', 'family_member', 'family_member_name',
            'appointment', 'prescription', 'doctor_name', 'clinic_name',
            'systolic_bp', 'diastolic_bp', 'pulse_rate', 'blood_glucose', 'glucose_type',
            'weight_kg', 'height_cm', 'temperature_f', 'spo2', 'bmi',
            'bp_category', 'glucose_category', 'bmi_category',
            'recorded_at', 'notes', 'created_at'
        )
        read_only_fields = ('id', 'bmi', 'created_at')

    def get_bp_category(self, obj):
        if not obj.systolic_bp or not obj.diastolic_bp:
            return None
        sys, dia = obj.systolic_bp, obj.diastolic_bp
        if sys > 180 or dia > 120:
            return {"level": "CRISIS", "label": "Hypertensive Crisis", "color": "error"}
        if sys >= 140 or dia >= 90:
            return {"level": "STAGE_2", "label": "Hypertension Stage 2", "color": "error"}
        if (130 <= sys <= 139) or (80 <= dia <= 89):
            return {"level": "STAGE_1", "label": "Hypertension Stage 1", "color": "warning"}
        if (120 <= sys <= 129) and dia < 80:
            return {"level": "ELEVATED", "label": "Elevated Blood Pressure", "color": "warning"}
        if sys < 120 and dia < 80:
            return {"level": "NORMAL", "label": "Normal Blood Pressure", "color": "success"}
        return {"level": "NORMAL", "label": "Normal Blood Pressure", "color": "success"}

    def get_glucose_category(self, obj):
        if not obj.blood_glucose:
            return None
        val = float(obj.blood_glucose)
        if obj.glucose_type == 'FBS':
            # Fasting Blood Sugar
            if val >= 7.0:
                return {"level": "HIGH", "label": "High / Diabetes (Fasting)", "color": "error"}
            if val >= 5.6:
                return {"level": "ELEVATED", "label": "Pre-diabetes (Fasting)", "color": "warning"}
            return {"level": "NORMAL", "label": "Normal (Fasting)", "color": "success"}
        else:
            # RBS / Random Blood Sugar
            if val >= 11.1:
                return {"level": "HIGH", "label": "High / Diabetes", "color": "error"}
            if val >= 7.8:
                return {"level": "ELEVATED", "label": "Pre-diabetes / Impaired Glucose", "color": "warning"}
            return {"level": "NORMAL", "label": "Normal Glucose", "color": "success"}

    def get_bmi_category(self, obj):
        bmi = obj.bmi
        if not bmi:
            return None
        if bmi >= 30.0:
            return {"level": "OBESE", "label": "Obese", "color": "error"}
        if bmi >= 25.0:
            return {"level": "OVERWEIGHT", "label": "Overweight", "color": "warning"}
        if bmi < 18.5:
            return {"level": "UNDERWEIGHT", "label": "Underweight", "color": "warning"}
        return {"level": "NORMAL", "label": "Normal Weight", "color": "success"}


