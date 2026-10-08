from typing import Optional
from django.contrib.auth import get_user_model
from django.db.models import QuerySet

User = get_user_model()

def get_user_by_id(user_id: str) -> Optional[User]:
    return User.objects.filter(id=user_id).first()

def get_users_by_role(role: str) -> QuerySet:
    return User.objects.filter(role=role)
