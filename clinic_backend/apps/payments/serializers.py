from rest_framework import serializers
from .models import Payment, PaymentMethod
from apps.appointments.serializers import AppointmentSerializer

class PaymentSerializer(serializers.ModelSerializer):
    appointment = AppointmentSerializer(read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id', 'appointment', 'amount', 'currency',
            'payment_method', 'transaction_id', 'val_id', 'bank_tran_id', 'card_type',
            'payment_status', 'created_at'
        )
        read_only_fields = ('id', 'created_at')

class InitiatePaymentSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField(required=True)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.SSLCOMMERZ)

class SSLCommerzInitiateSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField(required=True)

class ProcessPaymentSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(required=False, default='BKASH_TRX_MOCK_12345')
    val_id = serializers.CharField(required=False, default='')
    bank_tran_id = serializers.CharField(required=False, default='')
    card_type = serializers.CharField(required=False, default='')
    payment_method = serializers.CharField(required=False, default='')

