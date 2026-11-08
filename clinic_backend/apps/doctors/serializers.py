from rest_framework import serializers
from django.utils import timezone
from .models import Specialization, Doctor, DoctorClinic, DoctorSchedule, DayOfWeek
from apps.clinics.serializers import ClinicSerializer, DepartmentSerializer, LightweightClinicSerializer


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ('id', 'name', 'description', 'created_at')
        read_only_fields = ('id', 'created_at')


class DoctorClinicSerializer(serializers.ModelSerializer):
    clinic = LightweightClinicSerializer(read_only=True)
    clinic_id = serializers.UUIDField(write_only=True)
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = DoctorClinic
        fields = (
            'id', 'doctor', 'clinic', 'clinic_id', 'department', 'department_id',
            'consultation_fee', 'room_number', 'joining_date', 'leaving_date',
            'status', 'requested_by_role', 'is_active', 'created_at'
        )
        read_only_fields = ('id', 'status', 'requested_by_role', 'created_at')


class DoctorSerializer(serializers.ModelSerializer):
    specializations = SpecializationSerializer(many=True, read_only=True)
    specialization_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )
    doctor_clinics = DoctorClinicSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = (
            'id', 'full_name', 'email', 'phone', 'experience_years',
            'qualification', 'bio', 'avatar_url', 'certificate_url',
            'verification_status', 'is_active',
            'specializations', 'specialization_ids', 'doctor_clinics',
            'average_rating', 'review_count', 'created_at'
        )
        read_only_fields = ('id', 'created_at')

    def get_average_rating(self, obj):
        if hasattr(obj, 'annotated_avg_rating'):
            return round(float(obj.annotated_avg_rating), 1) if obj.annotated_avg_rating is not None else None
        from django.db.models import Avg
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(float(avg), 1) if avg is not None else None

    def get_review_count(self, obj):
        if hasattr(obj, 'annotated_review_count'):
            return obj.annotated_review_count or 0
        return obj.reviews.count()


class DoctorClinicAssignmentSerializer(serializers.Serializer):
    """Used by Admin to assign an existing doctor directly to a clinic."""
    doctor_id = serializers.UUIDField(required=False)
    clinic_id = serializers.UUIDField(required=False)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    room_number = serializers.CharField(required=False, allow_blank=True, default='')
    joining_date = serializers.DateField(required=False, allow_null=True)



class DoctorProfileSetupSerializer(serializers.ModelSerializer):
    """
    Used by a DOCTOR user to create or update their own Doctor profile
    after registering via accounts/register/.
    """
    specialization_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )
    specializations = SpecializationSerializer(many=True, read_only=True)
    doctor_clinics = DoctorClinicSerializer(many=True, read_only=True)

    class Meta:
        model = Doctor
        fields = (
            'id', 'full_name', 'email', 'phone', 'experience_years',
            'qualification', 'bio', 'avatar_url', 'certificate_url',
            'verification_status', 'is_active',
            'specializations', 'specialization_ids', 'doctor_clinics', 'created_at'
        )
        read_only_fields = ('id', 'verification_status', 'is_active', 'created_at', 'doctor_clinics')


class DoctorClinicRequestCreateSerializer(serializers.Serializer):
    """
    Used by ClinicAdmin to invite a Doctor OR by Doctor to request joining a Clinic.
    """
    doctor_id = serializers.UUIDField(required=False)
    clinic_id = serializers.UUIDField(required=False)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    room_number = serializers.CharField(required=False, allow_blank=True, default='')


class DoctorClinicRequestResponseSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['ACCEPT', 'REJECT'])


from .models import ChamberSession, ChamberSessionStatus

class ChamberSessionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    doctor_qualification = serializers.CharField(source='doctor.qualification', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    clinic_address = serializers.CharField(source='clinic.address', read_only=True)
    active_emergency_details = serializers.SerializerMethodField()
    held_patient_details = serializers.SerializerMethodField()
    next_serials = serializers.SerializerMethodField()
    is_queue_exhausted = serializers.SerializerMethodField()
    is_slot_started = serializers.SerializerMethodField()
    can_call_patient = serializers.SerializerMethodField()
    schedule_start_time = serializers.SerializerMethodField()
    schedule_end_time = serializers.SerializerMethodField()
    slot_lock_reason = serializers.SerializerMethodField()

    class Meta:
        model = ChamberSession
        fields = (
            'id', 'doctor', 'doctor_name', 'doctor_qualification', 'clinic', 'clinic_name', 'clinic_address',
            'session_date', 'status', 'current_serial',
            'estimated_mins_per_patient', 'delay_minutes', 'announcement_note', 'room_number', 'skipped_serials',
            'active_emergency', 'active_emergency_details', 'held_patient', 'held_patient_details', 'next_serials',
            'is_queue_exhausted',
            'is_slot_started', 'can_call_patient', 'schedule_start_time', 'schedule_end_time', 'slot_lock_reason',
            'started_at', 'ended_at', 'created_at'
        )
        read_only_fields = ('id', 'created_at')

    def get_active_emergency_details(self, obj):
        if not obj.active_emergency:
            return None
        apt = obj.active_emergency
        name = apt.family_member.full_name if apt.family_member else (f"{apt.patient.first_name} {apt.patient.last_name}".strip() if apt.patient else 'Emergency Patient')
        return {
            'id': str(apt.id),
            'serial_number': apt.serial_number,
            'patient_name': name,
            'problem_description': apt.problem_description,
            'emergency_reason': apt.emergency_reason,
            'status': apt.status,
            'is_arrived': apt.is_arrived,
        }

    def get_held_patient_details(self, obj):
        if not obj.held_patient:
            return None
        apt = obj.held_patient
        name = apt.family_member.full_name if apt.family_member else (f"{apt.patient.first_name} {apt.patient.last_name}".strip() if apt.patient else 'Held Patient')
        return {
            'id': str(apt.id),
            'serial_number': apt.serial_number,
            'patient_name': name,
            'problem_description': apt.problem_description,
            'status': apt.status,
            'is_arrived': apt.is_arrived,
        }

    def get_next_serials(self, obj):
        from apps.appointments.models import Appointment, AppointmentStatus
        skipped = obj.skipped_serials or []
        qs = Appointment.objects.filter(
            doctor_id=obj.doctor_id,
            clinic_id=obj.clinic_id,
            appointment_date=obj.session_date,
            serial_number__gt=obj.current_serial,
            is_emergency=False,
            status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]
        ).exclude(serial_number__in=skipped).order_by('serial_number').values_list('serial_number', flat=True)[:3]
        return list(qs)

    def get_is_queue_exhausted(self, obj):
        return len(self.get_next_serials(obj)) == 0

    def _get_slot_status(self, obj):
        if hasattr(obj, '_slot_status_cache'):
            return obj._slot_status_cache

        try:
            from zoneinfo import ZoneInfo
            bd_now = timezone.now().astimezone(ZoneInfo('Asia/Dhaka'))
        except Exception:
            bd_now = timezone.localtime()

        bd_today = bd_now.date()
        bd_time = bd_now.time()

        if obj.session_date < bd_today:
            res = {
                'is_slot_started': True,
                'can_call_patient': False,
                'schedule_start_time': None,
                'schedule_end_time': None,
                'slot_lock_reason': 'Chamber date has passed.'
            }
            obj._slot_status_cache = res
            return res

        if obj.session_date > bd_today:
            res = {
                'is_slot_started': False,
                'can_call_patient': False,
                'schedule_start_time': None,
                'schedule_end_time': None,
                'slot_lock_reason': f'Chamber date is {obj.session_date}.'
            }
            obj._slot_status_cache = res
            return res

        from .models import DoctorSchedule
        doc_scheds = DoctorSchedule.objects.filter(
            doctor_id=obj.doctor_id,
            clinic_id=obj.clinic_id,
            is_active=True
        )
        if not doc_scheds.exists():
            res = {
                'is_slot_started': True,
                'can_call_patient': True,
                'schedule_start_time': None,
                'schedule_end_time': None,
                'slot_lock_reason': None
            }
            obj._slot_status_cache = res
            return res

        today_scheds = doc_scheds.filter(day_of_week=bd_today.weekday()).order_by('start_time')
        if not today_scheds.exists():
            res = {
                'is_slot_started': False,
                'can_call_patient': False,
                'schedule_start_time': None,
                'schedule_end_time': None,
                'slot_lock_reason': f'No chamber scheduled for today ({bd_now.strftime("%A")}).'
            }
            obj._slot_status_cache = res
            return res

        earliest_start = today_scheds.first().start_time
        latest_end = today_scheds.last().end_time
        start_str = earliest_start.strftime('%I:%M %p')
        end_str = latest_end.strftime('%I:%M %p')

        if bd_time < earliest_start:
            res = {
                'is_slot_started': False,
                'can_call_patient': False,
                'schedule_start_time': start_str,
                'schedule_end_time': end_str,
                'slot_lock_reason': f'Chamber slot starts at {start_str}.'
            }
            obj._slot_status_cache = res
            return res

        # Once earliest start has passed, chamber is open even if delayed past end_time
        res = {
            'is_slot_started': True,
            'can_call_patient': True,
            'schedule_start_time': start_str,
            'schedule_end_time': end_str,
            'slot_lock_reason': None
        }
        obj._slot_status_cache = res
        return res

    def get_is_slot_started(self, obj):
        return self._get_slot_status(obj)['is_slot_started']

    def get_can_call_patient(self, obj):
        return self._get_slot_status(obj)['can_call_patient']

    def get_schedule_start_time(self, obj):
        return self._get_slot_status(obj)['schedule_start_time']

    def get_schedule_end_time(self, obj):
        return self._get_slot_status(obj)['schedule_end_time']

    def get_slot_lock_reason(self, obj):
        return self._get_slot_status(obj)['slot_lock_reason']

class ChamberSessionUpdateSerializer(serializers.Serializer):
    doctor_id = serializers.UUIDField(required=True)
    clinic_id = serializers.UUIDField(required=True)
    session_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=ChamberSessionStatus.choices, required=False)
    current_serial = serializers.IntegerField(required=False, min_value=0)
    delay_minutes = serializers.IntegerField(required=False, min_value=0)
    announcement_note = serializers.CharField(required=False, allow_blank=True)
    room_number = serializers.CharField(required=False, allow_blank=True)
    estimated_mins_per_patient = serializers.IntegerField(required=False, min_value=1)
    appointment_id = serializers.UUIDField(required=False, allow_null=True)
    hold_current = serializers.BooleanField(required=False, default=True)
    emergency_reason = serializers.CharField(required=False, allow_blank=True, default='')
    action = serializers.ChoiceField(
        choices=[
            'NEXT_SERIAL', 'PREV_SERIAL', 'SET_SERIAL',
            'SKIP_SERIAL', 'RECALL_SERIAL',
            'UPDATE_STATUS', 'UPDATE_DELAY', 'RESET',
            'ADMIT_EMERGENCY', 'COMPLETE_EMERGENCY', 'RESUME_HELD',
            'COMPLETE_CURRENT'
        ],
        required=False
    )



class DoctorScheduleSerializer(serializers.ModelSerializer):
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)

    class Meta:
        model = DoctorSchedule
        fields = (
            'id', 'doctor', 'clinic', 'clinic_name', 'day_of_week', 'day_of_week_display',
            'start_time', 'end_time', 'slot_duration_minutes', 'max_patients',
            'is_active', 'created_at'
        )
        read_only_fields = ('id', 'created_at', 'day_of_week_display', 'clinic_name')
        validators = []

    def validate(self, attrs):
        start_time = attrs.get('start_time') or (self.instance.start_time if self.instance else None)
        end_time = attrs.get('end_time') or (self.instance.end_time if self.instance else None)
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                "detail": "End time must be strictly after start time."
            })

        doctor = attrs.get('doctor') or (self.instance.doctor if self.instance else None)
        clinic = attrs.get('clinic') or (self.instance.clinic if self.instance else None)
        day_of_week = attrs.get('day_of_week') if 'day_of_week' in attrs else (self.instance.day_of_week if self.instance else None)

        if doctor and day_of_week is not None and start_time and end_time:
            clash_qs = DoctorSchedule.objects.filter(
                doctor=doctor,
                day_of_week=day_of_week,
                is_active=True,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            if self.instance:
                clash_qs = clash_qs.exclude(pk=self.instance.pk)
            if clinic:
                same_clinic_sched = DoctorSchedule.objects.filter(
                    doctor=doctor,
                    clinic=clinic,
                    day_of_week=day_of_week,
                    is_active=True,
                ).first()
                if same_clinic_sched:
                    clash_qs = clash_qs.exclude(pk=same_clinic_sched.pk)

            conflict = clash_qs.select_related('clinic').first()
            if conflict:
                day_name = conflict.get_day_of_week_display()
                c_start = conflict.start_time.strftime('%I:%M %p')
                c_end = conflict.end_time.strftime('%I:%M %p')
                c_clinic = conflict.clinic.name if conflict.clinic else 'another clinic'
                raise serializers.ValidationError({
                    "detail": f"Schedule time clash! You already have an active chamber on {day_name} at {c_clinic} ({c_start} - {c_end}). Please select a non-overlapping time slot."
                })

        return attrs


from .models import DoctorLeave


class DoctorLeaveSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True, default='All Clinics')
    affected_appointments_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = DoctorLeave
        fields = (
            'id', 'doctor', 'doctor_name', 'clinic', 'clinic_name',
            'start_date', 'end_date', 'reason', 'is_approved',
            'affected_appointments_count', 'created_at'
        )
        read_only_fields = ('id', 'created_at', 'doctor_name', 'clinic_name', 'affected_appointments_count')


