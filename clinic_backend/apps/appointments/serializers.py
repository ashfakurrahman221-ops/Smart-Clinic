from rest_framework import serializers
from .models import Appointment
from apps.clinics.serializers import DepartmentSerializer
from apps.accounts.serializers import FamilyMemberSerializer


class LightweightDoctorSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    qualification = serializers.CharField(read_only=True)
    avatar_url = serializers.URLField(read_only=True, default=None)


class LightweightClinicSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    city = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)
    logo_url = serializers.URLField(read_only=True, default=None)


class LightweightPatientSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.email


class AppointmentSerializer(serializers.ModelSerializer):
    """
    Appointment read serializer.
    Provides both flat convenience fields (used by list/card views)
    and nested objects (doctor, clinic, patient) so all frontend components work reliably.
    """

    # ── Flat convenience fields ──────────────────────────────────────────────
    doctor_name         = serializers.CharField(source='doctor.full_name',         read_only=True, default='')
    doctor_qualification= serializers.CharField(source='doctor.qualification',     read_only=True, default='')
    doctor_avatar_url   = serializers.URLField (source='doctor.avatar_url',        read_only=True, default=None)
    doctor_id           = serializers.UUIDField (source='doctor.id',               read_only=True)

    clinic_name         = serializers.CharField(source='clinic.name',              read_only=True, default='')
    clinic_city         = serializers.CharField(source='clinic.city',              read_only=True, default='')
    clinic_phone        = serializers.CharField(source='clinic.phone',             read_only=True, default='')
    clinic_logo_url     = serializers.URLField (source='clinic.logo_url',          read_only=True, default=None)
    clinic_id           = serializers.UUIDField (source='clinic.id',               read_only=True)

    patient_name        = serializers.SerializerMethodField()
    patient_phone       = serializers.CharField(source='patient.phone',            read_only=True, default='')
    patient_email       = serializers.EmailField(source='patient.email',           read_only=True, default='')

    department_name     = serializers.CharField(source='department.name',          read_only=True, default=None)
    has_prescription    = serializers.SerializerMethodField()

    # ── Nested objects (used by waiting room / live trackers) ────────────────
    doctor              = LightweightDoctorSerializer(read_only=True)
    clinic              = LightweightClinicSerializer(read_only=True)
    patient             = LightweightPatientSerializer(read_only=True)

    # ── Family member flat fields ─────────────────────────────────────────────
    family_member_name  = serializers.CharField(source='family_member.full_name',  read_only=True, default=None)
    family_member       = FamilyMemberSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = (
            'id',
            # Nested objects
            'doctor', 'clinic', 'patient',
            # Flat fields — used by frontend list/card views
            'doctor_id', 'doctor_name', 'doctor_qualification', 'doctor_avatar_url',
            'clinic_id', 'clinic_name', 'clinic_city', 'clinic_phone', 'clinic_logo_url',
            'patient_name', 'patient_phone', 'patient_email',
            'department_name',
            'family_member_name', 'family_member',
            # Core appointment fields
            'appointment_date', 'appointment_time', 'serial_number', 'status',
            'problem_description', 'amount', 'is_arrived', 'arrived_at',
            'is_emergency', 'emergency_reason', 'has_prescription',
            'rolled_over_from_date', 'original_serial_number',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'serial_number', 'status', 'amount', 'created_at', 'updated_at')

    def get_has_prescription(self, obj):
        return hasattr(obj, 'prescription') and obj.prescription is not None

    def get_patient_name(self, obj):
        """Return family member name if booked for family, else patient full name."""
        if obj.family_member:
            return obj.family_member.full_name
        if obj.patient:
            name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
            return name or obj.patient.email
        return 'Walk-in Patient'


class AppointmentCreateSerializer(serializers.Serializer):
    clinic_id = serializers.UUIDField(required=True)
    doctor_id = serializers.UUIDField(required=True)
    family_member_id = serializers.UUIDField(required=False, allow_null=True)
    appointment_date = serializers.DateField(required=True)
    appointment_time = serializers.TimeField(required=True)
    problem_description = serializers.CharField(required=False, allow_blank=True, default='')
    is_walk_in = serializers.BooleanField(required=False, default=False)
    walk_in_name = serializers.CharField(required=False, allow_blank=True, default='')
    walk_in_phone = serializers.CharField(required=False, allow_blank=True, default='')
    is_emergency = serializers.BooleanField(required=False, default=False)
    emergency_reason = serializers.CharField(required=False, allow_blank=True, default='')


