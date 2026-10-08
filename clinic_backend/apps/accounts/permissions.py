from rest_framework.permissions import BasePermission
from .models import UserRole

class IsAdmin(BasePermission):
    """Allows access only to Admin users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == UserRole.ADMIN or request.user.is_superuser))

class IsClinicAdmin(BasePermission):
    """Allows access only to ClinicAdmin users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.CLINIC_ADMIN)

class IsPatient(BasePermission):
    """Allows access only to Patient users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.PATIENT)

class IsDoctor(BasePermission):
    """Allows access only to Doctor users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.DOCTOR)

class IsClinicAdminOrAdmin(BasePermission):
    """Allows access to ClinicAdmin or Admin users."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            (request.user.role in [UserRole.ADMIN, UserRole.CLINIC_ADMIN] or request.user.is_superuser)
        )


class IsFamilyMemberOwner(BasePermission):
    """
    Object-level permission allowing only the owning patient to view, update, or delete their family member.
    """
    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj.patient_id == request.user.id)


class IsReceptionist(BasePermission):
    """Allows access only to Receptionist users with active staff profile."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.RECEPTIONIST and
            hasattr(request.user, 'staff_profile') and
            request.user.staff_profile.is_active
        )


class IsClinicAdminOrReceptionist(BasePermission):
    """Allows access to ClinicAdmin or Receptionist users."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST]
        )
