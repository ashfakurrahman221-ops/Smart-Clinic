from django.db import models
from django.conf import settings
from apps.core.models import BaseModel

class VerificationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    VERIFIED = 'VERIFIED', 'Verified'
    REJECTED = 'REJECTED', 'Rejected'

class SubscriptionPlan(models.TextChoices):
    FREE = 'FREE', 'Free'
    PRO = 'PRO', 'Pro'
    ENTERPRISE = 'ENTERPRISE', 'Enterprise'

class Department(BaseModel):
    """
    Global Department catalog (e.g. Cardiology, ENT, Neurology).
    Prevents duplicating department names across the system.
    """
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, default='')
    icon_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'

    def __str__(self):
        return self.name

class Clinic(BaseModel):
    """
    Clinic entity owned by exactly one ClinicAdmin user.
    """
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_clinic',
        limit_choices_to={'role': 'CLINIC_ADMIN'}
    )
    name = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    address = models.TextField()
    city = models.CharField(max_length=100, db_index=True)
    division = models.ForeignKey(
        'common.Division',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinics'
    )
    district = models.ForeignKey(
        'common.District',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinics'
    )
    upazila = models.ForeignKey(
        'common.Upazila',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinics'
    )
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    logo_url = models.URLField(blank=True, null=True)
    certificate_url = models.URLField(blank=True, null=True, help_text="Cloudinary URL of clinic registration certificate")
    description = models.TextField(blank=True, default='', help_text="About the clinic, overview and patient care mission")
    opening_hours = models.CharField(max_length=255, blank=True, default='Open 24/7', help_text="Operating hours display")
    facilities = models.JSONField(default=list, blank=True, help_text="List of amenities/facilities e.g. 24/7 Emergency, Pharmacy, Parking")
    gallery = models.JSONField(default=list, blank=True, help_text="List of clinic photos with id, image_url, title, category, description, is_featured")
    emergency_contact = models.CharField(max_length=50, blank=True, default='', help_text="Emergency hotline number")
    website = models.URLField(blank=True, null=True, help_text="Official website URL")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    subscription_plan = models.CharField(
        max_length=20,
        choices=SubscriptionPlan.choices,
        default=SubscriptionPlan.FREE
    )
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    is_active = models.BooleanField(default=True)

    # Junction M2M relationship through ClinicDepartment
    departments = models.ManyToManyField(
        Department,
        through='ClinicDepartment',
        related_name='clinics'
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Clinic'
        verbose_name_plural = 'Clinics'

    def __str__(self):
        return f"{self.name} ({self.city})"

class ClinicDepartment(BaseModel):
    """
    Junction table mapping Clinic to offered Departments.
    """
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='clinic_departments')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='clinic_departments')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('clinic', 'department')
        verbose_name = 'Clinic Department'
        verbose_name_plural = 'Clinic Departments'

    def __str__(self):
        return f"{self.clinic.name} - {self.department.name}"

class ClinicService(BaseModel):
    """
    Clinical service / diagnostic test / treatment offered by a specific clinic.
    """
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='services')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='clinic_services')
    name = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True, default='')
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Fee / price in BDT")
    duration_minutes = models.PositiveIntegerField(default=15, help_text="Estimated duration in minutes")
    preparation_instructions = models.TextField(blank=True, default='', help_text="e.g. Overnight fasting required")
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Clinic Service'
        verbose_name_plural = 'Clinic Services'

    def __str__(self):
        return f"{self.name} - {self.clinic.name} (৳{self.fee})"


class AnnouncementType(models.TextChoices):
    DOCTOR_VISIT = 'DOCTOR_VISIT', 'Doctor Visit / Special Chamber'
    SCHEDULE_CHANGE = 'SCHEDULE_CHANGE', 'Schedule Change'
    NEW_SERVICE = 'NEW_SERVICE', 'New Service'
    CLINIC_NOTICE = 'CLINIC_NOTICE', 'Clinic Notice'
    HOLIDAY = 'HOLIDAY', 'Holiday / Closure'
    GENERAL = 'GENERAL', 'General Announcement'


class Announcement(BaseModel):
    """
    Clinic announcement for communicating important information to patients/public.
    e.g. 'Dr. Rahman will see patients Friday 5-8 PM'
    """
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='announcements')
    title = models.CharField(max_length=200)
    message = models.TextField()
    announcement_type = models.CharField(
        max_length=30,
        choices=AnnouncementType.choices,
        default=AnnouncementType.GENERAL,
        db_index=True,
    )
    doctor = models.ForeignKey(
        'doctors.Doctor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinic_announcements',
    )
    scheduled_date = models.DateField(null=True, blank=True, help_text="Date the event/visit is scheduled")
    scheduled_time = models.TimeField(null=True, blank=True, help_text="Time the event/visit starts")
    is_active = models.BooleanField(default=True, db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True, help_text="When to start showing this announcement")
    ends_at = models.DateTimeField(null=True, blank=True, help_text="When to stop showing this announcement")

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Announcement'
        verbose_name_plural = 'Announcements'

    def __str__(self):
        return f"[{self.clinic.name}] {self.title} ({self.announcement_type})"


class StaffRole(models.TextChoices):
    RECEPTIONIST = 'RECEPTIONIST', 'Receptionist'
    COMPOUNDER   = 'COMPOUNDER',   'Compounder'
    HELPER       = 'HELPER',       'Helper'
    CLEANER      = 'CLEANER',      'Cleaner'
    SECURITY     = 'SECURITY',     'Security'
    MANAGER      = 'MANAGER',      'Manager'


class ClinicStaff(BaseModel):
    """
    Staff members linked to a clinic.
    RECEPTIONIST has a User account (can login).
    Others (CLEANER, HELPER etc.) have no login — tracked by attendance only.
    """
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='staff_members'
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_profile'
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, default='')
    role = models.CharField(max_length=20, choices=StaffRole.choices)
    is_active = models.BooleanField(default=True)
    monthly_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        default=0.00
    )
    joined_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dict of permissions e.g. {can_call_next: true, can_add_walkin: true, can_receive_cash: true, can_mark_attendance: true}"
    )

    class Meta:
        ordering = ['role', 'name']
        verbose_name = 'Clinic Staff'
        verbose_name_plural = 'Clinic Staff'

    def __str__(self):
        return f"{self.name} ({self.role}) - {self.clinic.name}"


class AttendanceStatus(models.TextChoices):
    PRESENT = 'PRESENT', 'Present'
    ABSENT  = 'ABSENT',  'Absent'
    LATE    = 'LATE',    'Late'
    LEAVE   = 'LEAVE',   'On Leave'


class StaffAttendance(BaseModel):
    """
    Daily attendance record for each staff member.
    Marked by Receptionist or Admin.
    """
    staff = models.ForeignKey(
        ClinicStaff,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT
    )
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_attendances'
    )
    note = models.TextField(blank=True, default='')

    class Meta:
        unique_together = ('staff', 'date')
        ordering = ['-date']
        verbose_name = 'Staff Attendance'
        verbose_name_plural = 'Staff Attendances'

    def __str__(self):
        return f"{self.staff.name} - {self.date} ({self.status})"


class ShiftClosingLog(BaseModel):
    """
    Counter Shift Closing and Drawer Cash Reconciliation Log.
    Tracks physical vs system collections, notes denominations, and handover signatures.
    """
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='shift_closings'
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='closed_shifts'
    )
    shift_date = models.DateField()
    shift_end_time = models.TimeField()
    system_cash_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    physical_cash_counted = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discrepancy = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    digital_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_tokens_handled = models.IntegerField(default=0)
    total_transactions_count = models.IntegerField(default=0)
    denominations = models.JSONField(
        default=dict,
        blank=True,
        help_text="Breakdown of currency counts: {'1000': 10, '500': 5, ...}"
    )
    handed_over_to = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text="Name of supervisor or next duty receptionist"
    )
    notes = models.TextField(blank=True, default='')
    is_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-shift_date', '-shift_end_time']
        verbose_name = 'Shift Closing Log'
        verbose_name_plural = 'Shift Closing Logs'

    def __str__(self):
        return f"Shift Closing {self.clinic.name} - {self.shift_date} by {self.closed_by.full_name}"
