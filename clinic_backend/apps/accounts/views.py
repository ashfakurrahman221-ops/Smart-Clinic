from rest_framework import generics, status, permissions, viewsets
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import FamilyMember
from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    FamilyMemberSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)
from .services import change_user_password

@extend_schema(tags=['Auth'])
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'auth_login'

@extend_schema(tags=['Auth'])
class CustomTokenRefreshView(TokenRefreshView):
    pass

@extend_schema(tags=['Auth'])
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_login'

@extend_schema(tags=['Users'])
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

@extend_schema(tags=['Users'])
class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        change_user_password(
            user=request.user,
            old_password=serializer.validated_data['old_password'],
            new_password=serializer.validated_data['new_password']
        )
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)


@extend_schema(tags=['Auth'])
class ForgotPasswordView(generics.GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_reset'

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        from django.contrib.auth import get_user_model
        from django.conf import settings
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.contrib.auth.tokens import default_token_generator
        from apps.notifications.email_service import send_password_reset_email

        User = get_user_model()
        user = User.objects.filter(email=email, is_active=True).first()

        # Send reset email ONLY if account exists, is active, and is not a synthetic walk-in email
        if user and not user.email.endswith('@smartclinic.local'):
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5173').rstrip('/')
            reset_url = f"{frontend_url}/reset-password/{uid}/{token}"
            send_password_reset_email(user.email, reset_url)

        return Response(
            {'detail': 'If an account exists for this email, password reset instructions have been sent.'},
            status=status.HTTP_200_OK
        )


@extend_schema(tags=['Auth'])
class ResetPasswordView(generics.GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_reset_confirm'

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        new_password = serializer.validated_data['new_password']

        user.set_password(new_password)
        user.save(update_fields=['password', 'updated_at'])

        # Invalidate all outstanding SimpleJWT refresh tokens for this user
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            for t in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=t)
        except Exception:
            pass

        return Response(
            {'detail': 'Password has been reset successfully. You can now log in with your new password.'},
            status=status.HTTP_200_OK
        )


from .permissions import IsFamilyMemberOwner

@extend_schema(tags=['Family Members'])
class FamilyMemberViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsFamilyMemberOwner]

    def get_queryset(self):
        if self.action == 'list':
            return FamilyMember.objects.filter(patient=self.request.user)
        return FamilyMember.objects.all()

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    def perform_update(self, serializer):
        serializer.save(patient=self.request.user)

