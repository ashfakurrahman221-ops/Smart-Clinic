from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

User = get_user_model()

def register_user(*, email: str, password: str, first_name: str, last_name: str, phone: str = "", role: str = "PATIENT") -> User:
    if User.objects.filter(email=email).exists():
        raise ValidationError({"email": "User with this email already exists."})
    return User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        role=role
    )

def change_user_password(*, user: User, old_password: str, new_password: str) -> None:
    if not user.check_password(old_password):
        raise ValidationError({"old_password": "Old password is incorrect."})
    user.set_password(new_password)
    user.save(update_fields=['password', 'updated_at'])
