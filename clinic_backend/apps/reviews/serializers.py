from rest_framework import serializers
from .models import Review
from apps.accounts.serializers import UserSerializer


class ReviewSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)

    class Meta:
        model = Review
        fields = (
            'id', 'appointment', 'patient', 'patient_name', 'doctor', 'doctor_name',
            'clinic', 'clinic_name', 'rating', 'comment', 'created_at'
        )
        read_only_fields = ('id', 'patient', 'doctor', 'clinic', 'created_at')

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip() or obj.patient.email


class ReviewCreateSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField(required=True)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=True)
    comment = serializers.CharField(required=False, allow_blank=True, default='')
