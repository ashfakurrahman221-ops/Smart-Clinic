import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from apps.core.models import BaseModel

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    CLINIC_ADMIN = 'CLINIC_ADMIN', 'ClinicAdmin'
    DOCTOR = 'DOCTOR', 'Doctor'
    PATIENT = 'PATIENT', 'Patient'
    RECEPTIONIST = 'RECEPTIONIST', 'Receptionist'

class RelationshipType(models.TextChoices):
    FATHER = 'FATHER', 'Father'
    MOTHER = 'MOTHER', 'Mother'
    SPOUSE = 'SPOUSE', 'Spouse'
    CHILD = 'CHILD', 'Child'
    OTHER = 'OTHER', 'Other'

class Gender(models.TextChoices):
    MALE = 'MALE', 'Male'
    FEMALE = 'FEMALE', 'Female'
    OTHER = 'OTHER', 'Other'

class BloodGroup(models.TextChoices):
    A_POSITIVE = 'A+', 'A+'
    A_NEGATIVE = 'A-', 'A-'
    B_POSITIVE = 'B+', 'B+'
    B_NEGATIVE = 'B-', 'B-'
    AB_POSITIVE = 'AB+', 'AB+'
    AB_NEGATIVE = 'AB-', 'AB-'
    O_POSITIVE = 'O+', 'O+'
    O_NEGATIVE = 'O-', 'O-'

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email).strip().lower()
        extra_fields.setdefault('role', UserRole.PATIENT)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)

        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email).strip().lower()

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    Custom User model using Email as unique identifier and UUID primary key.
    Roles: ADMIN, CLINIC_ADMIN, PATIENT.
    """
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PATIENT,
        db_index=True
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.email} ({self.role})"

class FamilyMember(BaseModel):
    """
    Family member linked to a PATIENT account (e.g. Parents, Spouse, Child).
    """
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='family_members',
        limit_choices_to={'role': 'PATIENT'}
    )
    full_name = models.CharField(max_length=150)
    relationship = models.CharField(
        max_length=20,
        choices=RelationshipType.choices,
        default=RelationshipType.OTHER
    )
    phone = models.CharField(max_length=20, blank=True, null=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        default=Gender.MALE
    )
    blood_group = models.CharField(
        max_length=10,
        choices=BloodGroup.choices,
        blank=True,
        default=''
    )
    medical_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Family Member'
        verbose_name_plural = 'Family Members'

    def __str__(self):
        return f"{self.full_name} ({self.get_relationship_display()}) - Patient: {self.patient.email}"

