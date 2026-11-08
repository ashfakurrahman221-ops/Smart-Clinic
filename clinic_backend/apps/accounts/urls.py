from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserRegistrationView,
    UserProfileView,
    ChangePasswordView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    FamilyMemberViewSet,
    ForgotPasswordView,
    ResetPasswordView,
)

app_name = 'accounts'

router = DefaultRouter()
router.register(r'family-members', FamilyMemberViewSet, basename='family-member')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('', include(router.urls)),
]
