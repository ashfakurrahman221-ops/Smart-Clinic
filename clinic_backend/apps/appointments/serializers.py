from rest_framework import serializers
from .models import Appointment
from apps.clinics.serializers import ClinicSerializer, DepartmentSerializer
from apps.doctors.serializers import DoctorSerializer
from apps.accounts.serializers import UserSerializer, FamilyMemberSerializer

class AppointmentSerializer(serializers.ModelSerializer):
    patient = UserSerializer(read_only=True)
    family_member = FamilyMemberSerializer(read_only=True)
    clinic = ClinicSerializer(read_only=True)
    doctor = DoctorSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = (
            'id', 'patient', 'family_member', 'clinic', 'doctor', 'department',
            'appointment_date', 'appointment_time', 'serial_number', 'status',
            'problem_description', 'amount', 'is_arrived', 'arrived_at',
            'is_emergency', 'emergency_reason', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'serial_number', 'status', 'amount', 'created_at', 'updated_at')

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

