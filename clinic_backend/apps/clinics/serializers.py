from rest_framework import serializers
from .models import Department, Clinic, ClinicDepartment, ClinicService, Announcement

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ('id', 'name', 'description', 'icon_url', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')

class ClinicDepartmentSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ClinicDepartment
        fields = ('id', 'department', 'department_id', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')

class ClinicServiceSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = ClinicService
        fields = (
            'id', 'clinic', 'department', 'department_name', 'name',
            'description', 'fee', 'duration_minutes',
            'preparation_instructions', 'is_available', 'created_at'
        )
        read_only_fields = ('id', 'clinic', 'created_at')

class LightweightClinicSerializer(serializers.ModelSerializer):
    """Minimal clinic representation for nesting within doctor-clinic lists to avoid N+1 queries."""
    class Meta:
        model = Clinic
        fields = (
            'id', 'name', 'slug', 'address', 'city', 'phone', 'email',
            'logo_url', 'verification_status', 'is_active'
        )
        read_only_fields = fields


class ClinicSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)
    services = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    division_name = serializers.CharField(source='division.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    upazila_name = serializers.CharField(source='upazila.name', read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Clinic
        fields = (
            'id', 'owner', 'owner_email', 'name', 'slug', 'address', 'city',
            'division', 'division_name', 'district', 'district_name', 'upazila', 'upazila_name',
            'phone', 'email', 'logo_url', 'certificate_url', 'description',
            'opening_hours', 'facilities', 'gallery', 'emergency_contact', 'website',
            'latitude', 'longitude', 'subscription_plan', 'verification_status',
            'is_active', 'departments', 'services', 'average_rating', 'review_count', 'created_at'
        )
        read_only_fields = ('id', 'verification_status', 'created_at')

    def get_services(self, obj):
        # Return all active services for this clinic, utilizing prefetch cache if available
        if hasattr(obj, '_prefetched_objects_cache') and 'services' in obj._prefetched_objects_cache:
            active_services = [s for s in obj.services.all() if getattr(s, 'is_available', True)]
        else:
            active_services = obj.services.filter(is_available=True)
        return ClinicServiceSerializer(active_services, many=True).data

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

class ClinicCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = (
            'name', 'slug', 'address', 'city', 'division', 'district', 'upazila', 'phone', 'email',
            'logo_url', 'certificate_url', 'description', 'opening_hours',
            'facilities', 'gallery', 'emergency_contact', 'website',
            'latitude', 'longitude', 'subscription_plan'
        )
        extra_kwargs = {
            'slug': {'required': False}
        }


class AnnouncementSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = (
            'id', 'clinic', 'title', 'message', 'announcement_type',
            'doctor', 'doctor_name', 'scheduled_date', 'scheduled_time',
            'is_active', 'starts_at', 'ends_at', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'clinic', 'doctor_name', 'created_at', 'updated_at')

    def get_doctor_name(self, obj):
        return obj.doctor.full_name if obj.doctor else None


from .models import ClinicStaff, StaffAttendance, StaffRole, AttendanceStatus

class ClinicStaffSerializer(serializers.ModelSerializer):
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = ClinicStaff
        fields = (
            'id', 'clinic', 'clinic_name', 'user', 'user_email',
            'name', 'phone', 'role', 'role_display', 'monthly_salary',
            'is_active', 'joined_date', 'notes', 'permissions', 'created_at'
        )
        read_only_fields = ('id', 'clinic', 'clinic_name', 'user', 'user_email', 'created_at')


class StaffAttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    staff_role = serializers.CharField(source='staff.role', read_only=True)
    marked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffAttendance
        fields = (
            'id', 'staff', 'staff_name', 'staff_role',
            'date', 'status', 'check_in_time', 'check_out_time',
            'marked_by', 'marked_by_name', 'note', 'created_at'
        )
        read_only_fields = ('id', 'marked_by', 'created_at')

    def get_marked_by_name(self, obj):
        if obj.marked_by:
            return obj.marked_by.full_name
        return None


class CreateReceptionistAccountSerializer(serializers.Serializer):
    """Used by Clinic Admin to create a login account for a Receptionist staff member."""
    staff_id = serializers.UUIDField()
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, default='')
    password = serializers.CharField(min_length=6, write_only=True)


