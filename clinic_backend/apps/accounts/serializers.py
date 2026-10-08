from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserRole, FamilyMember

User = get_user_model()

class FamilyMemberSerializer(serializers.ModelSerializer):
    patient_email = serializers.ReadOnlyField(source='patient.email')
    relationship_display = serializers.CharField(source='get_relationship_display', read_only=True)
    name = serializers.CharField(source='full_name', required=False)

    class Meta:
        model = FamilyMember
        fields = (
            'id', 'patient', 'patient_email', 'full_name', 'name', 'relationship',
            'relationship_display', 'phone', 'age', 'date_of_birth', 'gender', 'blood_group',
            'medical_notes', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'patient', 'patient_email', 'created_at', 'updated_at', 'relationship_display')

    def validate(self, attrs):
        if 'date_of_birth' in attrs and attrs['date_of_birth'] and not attrs.get('age'):
            from datetime import date
            dob = attrs['date_of_birth']
            today = date.today()
            attrs['age'] = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        phone = attrs.get('phone', '')
        if phone:
            import re
            cleaned_phone = re.sub(r'[\s\-]', '', str(phone))
            if cleaned_phone.startswith('+880'):
                cleaned_phone = '0' + cleaned_phone[4:]
            elif cleaned_phone.startswith('880'):
                cleaned_phone = '0' + cleaned_phone[3:]

            if not re.match(r'^01[3-9]\d{8}$', cleaned_phone):
                raise serializers.ValidationError({"phone": "Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)."})
            attrs['phone'] = cleaned_phone

        return attrs

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        token['full_name'] = user.full_name
        return token

    def validate(self, attrs):
        login_id = attrs.get(self.username_field, '')
        if login_id and isinstance(login_id, str):
            cleaned = login_id.strip()
            if '@' not in cleaned:
                # User provided phone number instead of email
                digits = ''.join(c for c in cleaned if c.isdigit())
                if digits:
                    from django.db.models import Q
                    phone_11 = '0' + digits[-10:] if len(digits) >= 10 else digits
                    user_match = User.objects.filter(
                        Q(phone=cleaned) |
                        Q(phone=digits) |
                        Q(phone=phone_11) |
                        Q(phone=f"+88{phone_11}") |
                        Q(phone=f"88{phone_11}")
                    ).first()
                    if user_match:
                        attrs[self.username_field] = user_match.email
                    else:
                        attrs[self.username_field] = cleaned.lower()
            else:
                attrs[self.username_field] = cleaned.lower()

        data = super().validate(attrs)

        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'phone': self.user.phone or '',
            'role': self.user.role,
        }
        return data


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'role', 'password', 'password_confirm')
        read_only_fields = ('id',)

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({"password": "Passwords do not match."})

        if 'email' in attrs and isinstance(attrs['email'], str):
            attrs['email'] = attrs['email'].strip().lower()

        phone = attrs.get('phone', '')
        if phone:
            import re
            cleaned_phone = re.sub(r'[\s\-]', '', str(phone))
            if cleaned_phone.startswith('+880'):
                cleaned_phone = '0' + cleaned_phone[4:]
            elif cleaned_phone.startswith('880'):
                cleaned_phone = '0' + cleaned_phone[3:]

            if not re.match(r'^01[3-9]\d{8}$', cleaned_phone):
                raise serializers.ValidationError({"phone": "Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)."})
            attrs['phone'] = cleaned_phone

        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            role=validated_data.get('role', UserRole.PATIENT)
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'role', 'is_active', 'created_at')
        read_only_fields = ('id', 'email', 'role', 'is_active', 'created_at')

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})

        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        from django.contrib.auth.tokens import default_token_generator
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        uid = attrs['uid']
        token = attrs['token']

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.filter(pk=user_id, is_active=True).first()
        except (TypeError, ValueError, OverflowError):
            user = None

        if not user or not default_token_generator.check_token(user, token):
            raise serializers.ValidationError({"detail": "Reset link is invalid or has expired."})

        try:
            validate_password(attrs['new_password'], user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})

        attrs['user'] = user
        return attrs

