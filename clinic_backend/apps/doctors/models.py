from django.db import models
from apps.core.models import BaseModel
from apps.clinics.models import Clinic, Department, VerificationStatus

class DoctorClinicStatus(models.TextChoices):
    PENDING_DOCTOR_APPROVAL = 'PENDING_DOCTOR_APPROVAL', 'Pending Doctor Approval'
    PENDING_CLINIC_APPROVAL = 'PENDING_CLINIC_APPROVAL', 'Pending Clinic Approval'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    REJECTED = 'REJECTED', 'Rejected'


class Specialization(BaseModel):
    """
    Doctor Specialization catalog (e.g. Cardiologist, Dermatologist, Pediatrician).
    """
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['name']
        verbose_name = 'Specialization'
        verbose_name_plural = 'Specializations'

    def __str__(self):
        return self.name

class Doctor(BaseModel):
    """
    Doctor profile. Linked to a User account (role=DOCTOR) via the `user` field.
    A doctor can work in multiple clinics through DoctorClinic.
    """
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctor_profile',
        limit_choices_to={'role': 'DOCTOR'}
    )
    full_name = models.CharField(max_length=150, db_index=True)
    email = models.EmailField(blank=True, default='', db_index=True)
    phone = models.CharField(max_length=20, blank=True, default='')
    experience_years = models.PositiveIntegerField(default=0)
    qualification = models.CharField(max_length=255, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    avatar_url = models.URLField(blank=True, null=True)
    certificate_url = models.URLField(blank=True, null=True, help_text="Cloudinary URL of medical license/certificate")
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True
    )
    is_active = models.BooleanField(default=True)

    specializations = models.ManyToManyField(
        Specialization,
        related_name='doctors',
        blank=True
    )

    class Meta:
        ordering = ['full_name']
        verbose_name = 'Doctor'
        verbose_name_plural = 'Doctors'

    def __str__(self):
        return f"Dr. {self.full_name}"

class DoctorClinic(BaseModel):
    """
    Junction model mapping Doctor to Clinic with clinic-specific meta:
    consultation fee, room number, joining date, leaving date, active status.
    """
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='doctor_clinics')
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='doctor_clinics')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='doctor_clinics')
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    room_number = models.CharField(max_length=50, blank=True, default='')
    joining_date = models.DateField(null=True, blank=True)
    leaving_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=DoctorClinicStatus.choices,
        default=DoctorClinicStatus.ACCEPTED,
        db_index=True
    )
    requested_by_role = models.CharField(max_length=20, blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('doctor', 'clinic')
        verbose_name = 'Doctor Clinic Mapping'
        verbose_name_plural = 'Doctor Clinic Mappings'

    def __str__(self):
        return f"Dr. {self.doctor.full_name} at {self.clinic.name} (${self.consultation_fee})"

class DayOfWeek(models.IntegerChoices):
    MONDAY = 0, 'Monday'
    TUESDAY = 1, 'Tuesday'
    WEDNESDAY = 2, 'Wednesday'
    THURSDAY = 3, 'Thursday'
    FRIDAY = 4, 'Friday'
    SATURDAY = 5, 'Saturday'
    SUNDAY = 6, 'Sunday'

class DoctorSchedule(BaseModel):
    """
    Weekly recurring availability schedule for a doctor at a specific clinic.
    e.g. Dr. Karim: Sunday + Tuesday, 10:00–14:00, 15-min slots, max 20 patients.
    """
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='schedules')
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='doctor_schedules')
    day_of_week = models.IntegerField(choices=DayOfWeek.choices, db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration_minutes = models.PositiveIntegerField(default=15, help_text="Duration of each consultation slot in minutes")
    max_patients = models.PositiveIntegerField(default=20, help_text="Maximum patients per session")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']
        unique_together = ('doctor', 'clinic', 'day_of_week')
        verbose_name = 'Doctor Schedule'
        verbose_name_plural = 'Doctor Schedules'

    def __str__(self):
        return f"Dr. {self.doctor.full_name} - {self.get_day_of_week_display()} ({self.start_time}–{self.end_time}, {self.slot_duration_minutes}min slots)"

class DoctorLeave(BaseModel):
    """
    Leave/Blocked dates for a doctor.
    """
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='leaves')
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, null=True, blank=True, related_name='doctor_leaves')
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    reason = models.CharField(max_length=255, blank=True, default='')
    is_approved = models.BooleanField(default=True)

    class Meta:
        ordering = ['-start_date']
        verbose_name = 'Doctor Leave'
        verbose_name_plural = 'Doctor Leaves'

    def __str__(self):
        return f"Dr. {self.doctor.full_name} Leave ({self.start_date} to {self.end_date})"

class ChamberSessionStatus(models.TextChoices):
    NOT_STARTED = 'NOT_STARTED', 'Not Started'
    IN_TRANSIT = 'IN_TRANSIT', 'In Transit'
    IN_CHAMBER = 'IN_CHAMBER', 'In Chamber'
    PRAYER_BREAK = 'PRAYER_BREAK', 'Prayer / Namaz Break'
    EMERGENCY = 'EMERGENCY', 'Emergency Round'
    PAUSED = 'PAUSED', 'Paused'
    ENDED = 'ENDED', 'Ended'

class ChamberSession(BaseModel):
    """
    Live real-time Chamber session for tracking serials, delays, and doctor status on a given date.
    """
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='chamber_sessions')
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='chamber_sessions')
    session_date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=ChamberSessionStatus.choices,
        default=ChamberSessionStatus.NOT_STARTED,
        db_index=True
    )
    current_serial = models.PositiveIntegerField(default=0)
    estimated_mins_per_patient = models.PositiveIntegerField(default=12)
    delay_minutes = models.PositiveIntegerField(default=0, help_text="Broadcasted delay e.g. 20 mins due to traffic/OT")
    announcement_note = models.CharField(max_length=255, blank=True, default='', help_text="e.g. Stuck in Mohakhali traffic, arriving at 6:30 PM")
    room_number = models.CharField(max_length=50, blank=True, default='', help_text="e.g. Room 304, 3rd Floor")
    skipped_serials = models.JSONField(default=list, blank=True, help_text="List of skipped/held patient serial numbers")
    active_emergency = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_emergency_sessions'
    )
    held_patient = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='held_patient_sessions'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-session_date']
        unique_together = ('doctor', 'clinic', 'session_date')
        verbose_name = 'Chamber Session'
        verbose_name_plural = 'Chamber Sessions'

    def __str__(self):
        return f"Dr. {self.doctor.full_name} at {self.clinic.name} on {self.session_date} ({self.status} - Serial #{self.current_serial})"


