import logging
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Payment, PaymentMethod, PaymentStatus
from .serializers import (
    PaymentSerializer,
    InitiatePaymentSerializer,
    SSLCommerzInitiateSerializer,
    ProcessPaymentSerializer
)
from .services import initiate_payment, process_payment_success
from .sslcommerz import initiate_sslcommerz_session, verify_sslcommerz_payment
from apps.appointments.models import Appointment, AppointmentStatus
from apps.accounts.models import UserRole

logger = logging.getLogger(__name__)

@extend_schema(tags=['Payments'])
class PaymentListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InitiatePaymentSerializer
        return PaymentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related('appointment', 'appointment__patient', 'appointment__doctor').all()
        if user.role == 'PATIENT':
            return queryset.filter(appointment__patient=user)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment_id = serializer.validated_data['appointment_id']

        try:
            appointment = Appointment.objects.select_related('patient', 'clinic').get(pk=appointment_id)
        except (Appointment.DoesNotExist, ValueError, DjangoValidationError):
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Role-aware ownership and tenancy checks (GAP-PAY-02)
        if user.role == UserRole.PATIENT:
            if appointment.patient != user:
                return Response(
                    {'detail': 'You cannot create or initiate payment for another patient\'s appointment.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role == UserRole.DOCTOR:
            return Response(
                {'detail': 'Doctors are not permitted to initiate patient payments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role == UserRole.CLINIC_ADMIN:
            if appointment.clinic.owner != user:
                return Response(
                    {'detail': 'You do not have permission to manage payments for this clinic.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role == UserRole.RECEPTIONIST:
            staff_clinic = getattr(user, 'staff_profile', None) and user.staff_profile.clinic
            if not staff_clinic or staff_clinic != appointment.clinic:
                return Response(
                    {'detail': 'You do not have permission to manage payments for this clinic.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif not (user.role == UserRole.ADMIN or user.is_superuser):
            return Response(
                {'detail': 'You do not have payment initiation authorization.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status == AppointmentStatus.CANCELLED:
            return Response(
                {'detail': 'Cannot initiate payment for a cancelled appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(appointment, 'payment') and appointment.payment.payment_status == PaymentStatus.COMPLETED:
            return Response(
                {'detail': 'Payment for this appointment has already been completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment = initiate_payment(
            appointment=appointment,
            payment_method=serializer.validated_data.get('payment_method', PaymentMethod.SSLCOMMERZ)
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

@extend_schema(tags=['Payments'])
class PaymentDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related(
            'appointment', 'appointment__patient', 'appointment__doctor',
            'appointment__clinic', 'appointment__family_member'
        ).all()
        if user.role == 'PATIENT':
            return queryset.filter(appointment__patient=user)
        elif user.role == 'CLINIC_ADMIN':
            return queryset.filter(appointment__clinic__owner=user)
        return queryset

@extend_schema(tags=['Payments'])
class ProcessPaymentView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProcessPaymentSerializer

    def post(self, request, pk, *args, **kwargs):
        try:
            payment = Payment.objects.select_related('appointment__clinic', 'appointment__patient').get(pk=pk)
        except (Payment.DoesNotExist, ValueError, DjangoValidationError):
            return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # GAP-PAY-01 Fix: Ordinary patients and doctors cannot manually confirm payments
        if user.role == UserRole.PATIENT:
            return Response(
                {'detail': 'Patients are not permitted to manually confirm payments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role == UserRole.DOCTOR:
            return Response(
                {'detail': 'Doctors do not have payment collection authority.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role == UserRole.CLINIC_ADMIN:
            if payment.appointment.clinic.owner != user:
                return Response(
                    {'detail': 'You do not own the clinic for this appointment.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role == UserRole.RECEPTIONIST:
            staff_clinic = getattr(user, 'staff_profile', None) and user.staff_profile.clinic
            if not staff_clinic or staff_clinic != payment.appointment.clinic:
                return Response(
                    {'detail': 'You are not authorized to collect payments for this clinic.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif not (user.role == UserRole.ADMIN or user.is_superuser):
            return Response(
                {'detail': 'You do not have payment processing authorization.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if payment.payment_status == PaymentStatus.COMPLETED:
            return Response(
                {'detail': 'Payment has already been completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if payment.appointment.status == AppointmentStatus.CANCELLED:
            return Response(
                {'detail': 'Cannot process payment for a cancelled appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        txn_id = serializer.validated_data.get('transaction_id', f"CASH_DESK_{payment.id.hex[:8]}")
        val_id = serializer.validated_data.get('val_id', '')
        bank_tran_id = serializer.validated_data.get('bank_tran_id', '')
        card_type = serializer.validated_data.get('card_type', '')
        payment_method = serializer.validated_data.get('payment_method', PaymentMethod.CASH)

        payment = process_payment_success(
            payment=payment,
            transaction_id=txn_id,
            val_id=val_id,
            bank_tran_id=bank_tran_id,
            card_type=card_type,
            payment_method=payment_method
        )
        payment.received_by = user
        payment.save(update_fields=['received_by', 'updated_at'])
        return Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Payments'])
class SSLCommerzInitiateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = SSLCommerzInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment_id = serializer.validated_data['appointment_id']

        try:
            appointment = Appointment.objects.select_related('patient', 'clinic').get(pk=appointment_id)
        except (Appointment.DoesNotExist, ValueError, DjangoValidationError):
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Role-aware ownership and tenancy checks (GAP-PAY-02)
        if user.role == UserRole.PATIENT:
            if appointment.patient != user:
                return Response(
                    {'detail': 'You cannot initiate payment for another patient\'s appointment.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role == UserRole.DOCTOR:
            return Response(
                {'detail': 'Doctors are not permitted to initiate patient payments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role == UserRole.CLINIC_ADMIN:
            if appointment.clinic.owner != user:
                return Response(
                    {'detail': 'You do not have permission to manage payments for this clinic.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role == UserRole.RECEPTIONIST:
            staff_clinic = getattr(user, 'staff_profile', None) and user.staff_profile.clinic
            if not staff_clinic or staff_clinic != appointment.clinic:
                return Response(
                    {'detail': 'You do not have permission to manage payments for this clinic.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif not (user.role == UserRole.ADMIN or user.is_superuser):
            return Response(
                {'detail': 'You do not have payment initiation authorization.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status == AppointmentStatus.CANCELLED:
            return Response(
                {'detail': 'Cannot initiate payment for a cancelled appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(appointment, 'payment') and appointment.payment.payment_status == PaymentStatus.COMPLETED:
            return Response(
                {'detail': 'Payment for this appointment has already been completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment = initiate_payment(
            appointment=appointment,
            payment_method=PaymentMethod.SSLCOMMERZ
        )

        customer_name = request.user.full_name or request.user.first_name or "Patient"
        customer_email = request.user.email
        customer_phone = request.user.phone or "01700000000"

        gateway_url = initiate_sslcommerz_session(
            payment=payment,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone
        )

        return Response({
            'payment_id': str(payment.id),
            'redirect_url': gateway_url,
            'amount': str(payment.amount),
            'currency': payment.currency
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class SSLCommerzSuccessCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        return self._handle_callback(request)

    def get(self, request, *args, **kwargs):
        return self._handle_callback(request)

    def _handle_callback(self, request):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5173')
        data = request.POST if request.method == 'POST' else request.GET

        tran_id = data.get('tran_id')
        val_id = data.get('val_id')

        # 1. Parse tran_id and val_id
        # 2. Reject missing/invalid identifiers safely
        if not tran_id or not val_id:
            logger.warning("SSLCommerz callback missing tran_id or val_id: tran_id=%s, val_id=%s", tran_id, val_id)
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

        tran_id = str(tran_id).strip()
        val_id = str(val_id).strip()

        # 3. Fetch local Payment for preliminary validation
        try:
            payment = Payment.objects.select_related('appointment').get(pk=tran_id)
        except (Payment.DoesNotExist, ValueError, DjangoValidationError):
            logger.warning("SSLCommerz callback payment not found: tran_id=%s", tran_id)
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

        # 4. If already COMPLETED: return existing idempotent success response
        if payment.payment_status == PaymentStatus.COMPLETED:
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=success&apt_id={payment.appointment_id}")

        # 5. Call verify_sslcommerz_payment(val_id) OUTSIDE the database row lock
        verification_data = verify_sslcommerz_payment(val_id)
        if not verification_data or not isinstance(verification_data, dict):
            logger.error("SSLCommerz verification failed or gateway unreachable for val_id=%s, tran_id=%s", val_id, tran_id)
            # Fail closed: DO NOT mark payment FAILED if gateway is unreachable (preserve recoverability)
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

        # 6. Validate the authoritative gateway response
        gateway_status = str(verification_data.get('status') or '').strip().upper()
        if gateway_status not in ['VALID', 'VALIDATED']:
            logger.warning("SSLCommerz verification status invalid: %s for tran_id=%s", gateway_status, tran_id)
            if gateway_status in ['FAILED', 'CANCELLED']:
                Payment.objects.filter(pk=tran_id).update(payment_status=PaymentStatus.FAILED)
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

        gateway_tran_id = str(verification_data.get('tran_id') or '').strip()
        if gateway_tran_id != str(payment.id).strip():
            logger.error("SSLCommerz verification tran_id mismatch: gateway=%s, local=%s", gateway_tran_id, payment.id)
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

        try:
            gateway_amount = Decimal(str(verification_data.get('amount', '')))
        except (InvalidOperation, TypeError, ValueError):
            logger.error("SSLCommerz verification invalid amount format: %s", verification_data.get('amount'))
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

        if gateway_amount != Decimal(str(payment.amount)):
            logger.error("SSLCommerz verification amount mismatch: gateway=%s, local=%s", gateway_amount, payment.amount)
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

        gateway_currency = str(verification_data.get('currency_type') or verification_data.get('currency') or '').strip().upper()
        local_currency = str(payment.currency or 'BDT').strip().upper()
        if gateway_currency != local_currency or gateway_currency != 'BDT':
            logger.error("SSLCommerz verification currency mismatch: gateway=%s, local=%s", gateway_currency, local_currency)
            return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

        # 7. Only after gateway validation succeeds:
        with transaction.atomic():
            payment = (
                Payment.objects
                .select_for_update()
                .select_related('appointment')
                .get(pk=tran_id)
            )

            # Re-check payment state
            if payment.payment_status == PaymentStatus.COMPLETED:
                return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=success&apt_id={payment.appointment_id}")

            bank_tran_id = verification_data.get('bank_tran_id') or data.get('bank_tran_id', '')
            card_type = verification_data.get('card_type') or data.get('card_type', '')
            txn_ref = bank_tran_id or val_id or f"SSL_{str(tran_id)[:8]}"

            # Map MFS payment method if card_type indicates it
            mfs_method = PaymentMethod.SSLCOMMERZ
            if card_type:
                ct_upper = card_type.upper()
                if 'BKASH' in ct_upper:
                    mfs_method = PaymentMethod.BKASH
                elif 'NAGAD' in ct_upper:
                    mfs_method = PaymentMethod.NAGAD
                elif 'ROCKET' in ct_upper:
                    mfs_method = PaymentMethod.ROCKET

            # Re-check appointment lifecycle safety
            appointment = payment.appointment
            if appointment.status == AppointmentStatus.CANCELLED:
                payment.payment_status = PaymentStatus.COMPLETED
                payment.transaction_id = txn_ref
                payment.val_id = val_id
                payment.bank_tran_id = bank_tran_id
                payment.card_type = card_type
                payment.payment_method = mfs_method
                payment.save(update_fields=['payment_status', 'transaction_id', 'val_id', 'bank_tran_id', 'card_type', 'payment_method', 'updated_at'])
                logger.warning(
                    "Payment %s verified for CANCELLED appointment %s. Recorded payment as COMPLETED without reviving appointment.",
                    payment.id, appointment.id
                )
            else:
                process_payment_success(
                    payment=payment,
                    transaction_id=txn_ref,
                    val_id=val_id,
                    bank_tran_id=bank_tran_id,
                    card_type=card_type,
                    payment_method=mfs_method
                )

        return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=success&apt_id={payment.appointment_id}")

@method_decorator(csrf_exempt, name='dispatch')
class SSLCommerzFailCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        return self._handle_fail(request)

    def get(self, request, *args, **kwargs):
        return self._handle_fail(request)

    def _handle_fail(self, request):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5173')
        data = request.POST if request.method == 'POST' else request.GET
        tran_id = data.get('tran_id')
        if tran_id:
            try:
                Payment.objects.filter(pk=tran_id).update(payment_status=PaymentStatus.FAILED)
            except Exception:
                pass
        return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=fail")

@method_decorator(csrf_exempt, name='dispatch')
class SSLCommerzCancelCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        return self._handle_cancel(request)

    def get(self, request, *args, **kwargs):
        return self._handle_cancel(request)

    def _handle_cancel(self, request):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5173')
        return HttpResponseRedirect(f"{frontend_url}/dashboard?payment=cancel")

@method_decorator(csrf_exempt, name='dispatch')
class SSLCommerzIPNView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data or request.POST
        tran_id = data.get('tran_id')
        val_id = data.get('val_id')

        # 1. Parse tran_id and val_id
        # 2. Reject missing/invalid identifiers safely
        if not tran_id or not val_id:
            logger.warning("SSLCommerz IPN missing tran_id or val_id: tran_id=%s, val_id=%s", tran_id, val_id)
            return Response({'status': 'Missing tran_id or val_id'}, status=status.HTTP_400_BAD_REQUEST)

        tran_id = str(tran_id).strip()
        val_id = str(val_id).strip()

        # 3. Fetch local Payment for preliminary validation
        try:
            payment = Payment.objects.select_related('appointment').get(pk=tran_id)
        except (Payment.DoesNotExist, ValueError, DjangoValidationError):
            logger.warning("SSLCommerz IPN payment not found: tran_id=%s", tran_id)
            return Response({'status': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        # 4. If already COMPLETED: return existing idempotent success response
        if payment.payment_status == PaymentStatus.COMPLETED:
            return Response({'status': 'already_processed', 'payment_status': payment.payment_status}, status=status.HTTP_200_OK)

        # 5. Call verify_sslcommerz_payment(val_id) OUTSIDE the database row lock
        verification_data = verify_sslcommerz_payment(val_id)
        if not verification_data or not isinstance(verification_data, dict):
            logger.error("SSLCommerz IPN verification failed or gateway unreachable for val_id=%s, tran_id=%s", val_id, tran_id)
            # GAP-PAY-03 Fix: Fail closed with retryable 503 Service Unavailable ONLY for genuine gateway unavailability
            return Response({'status': 'Gateway verification unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # 6. Validate the authoritative gateway response
        gateway_status = str(verification_data.get('status') or '').strip().upper()
        if gateway_status not in ['VALID', 'VALIDATED']:
            logger.warning("SSLCommerz IPN verification status invalid: %s for tran_id=%s", gateway_status, tran_id)
            if gateway_status in ['FAILED', 'CANCELLED']:
                Payment.objects.filter(pk=tran_id).update(payment_status=PaymentStatus.FAILED)
            return Response({'status': 'Invalid gateway status', 'gateway_status': gateway_status}, status=status.HTTP_400_BAD_REQUEST)

        gateway_tran_id = str(verification_data.get('tran_id') or '').strip()
        if gateway_tran_id != str(payment.id).strip():
            logger.error("SSLCommerz IPN verification tran_id mismatch: gateway=%s, local=%s", gateway_tran_id, payment.id)
            return Response({'status': 'tran_id mismatch'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            gateway_amount = Decimal(str(verification_data.get('amount', '')))
        except (InvalidOperation, TypeError, ValueError):
            logger.error("SSLCommerz IPN verification invalid amount format: %s", verification_data.get('amount'))
            return Response({'status': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

        if gateway_amount != Decimal(str(payment.amount)):
            logger.error("SSLCommerz IPN verification amount mismatch: gateway=%s, local=%s", gateway_amount, payment.amount)
            return Response({'status': 'amount mismatch'}, status=status.HTTP_400_BAD_REQUEST)

        gateway_currency = str(verification_data.get('currency_type') or verification_data.get('currency') or '').strip().upper()
        local_currency = str(payment.currency or 'BDT').strip().upper()
        if gateway_currency != local_currency or gateway_currency != 'BDT':
            logger.error("SSLCommerz IPN verification currency mismatch: gateway=%s, local=%s", gateway_currency, local_currency)
            return Response({'status': 'currency mismatch'}, status=status.HTTP_400_BAD_REQUEST)

        # 7. Only after gateway validation succeeds:
        with transaction.atomic():
            payment = (
                Payment.objects
                .select_for_update()
                .select_related('appointment')
                .get(pk=tran_id)
            )

            # Re-check payment state
            if payment.payment_status == PaymentStatus.COMPLETED:
                return Response({'status': 'already_processed', 'payment_status': payment.payment_status}, status=status.HTTP_200_OK)

            bank_tran_id = verification_data.get('bank_tran_id') or data.get('bank_tran_id', '')
            card_type = verification_data.get('card_type') or data.get('card_type', '')
            txn_ref = bank_tran_id or val_id or f"SSL_IPN_{str(tran_id)[:8]}"

            # Map MFS payment method if card_type indicates it
            mfs_method = PaymentMethod.SSLCOMMERZ
            if card_type:
                ct_upper = card_type.upper()
                if 'BKASH' in ct_upper:
                    mfs_method = PaymentMethod.BKASH
                elif 'NAGAD' in ct_upper:
                    mfs_method = PaymentMethod.NAGAD
                elif 'ROCKET' in ct_upper:
                    mfs_method = PaymentMethod.ROCKET

            # Re-check appointment lifecycle safety
            appointment = payment.appointment
            if appointment.status == AppointmentStatus.CANCELLED:
                payment.payment_status = PaymentStatus.COMPLETED
                payment.transaction_id = txn_ref
                payment.val_id = val_id
                payment.bank_tran_id = bank_tran_id
                payment.card_type = card_type
                payment.payment_method = mfs_method
                payment.save(update_fields=['payment_status', 'transaction_id', 'val_id', 'bank_tran_id', 'card_type', 'payment_method', 'updated_at'])
                logger.warning(
                    "Payment %s verified for CANCELLED appointment %s via IPN. Recorded payment as COMPLETED without reviving appointment.",
                    payment.id, appointment.id
                )
            else:
                process_payment_success(
                    payment=payment,
                    transaction_id=txn_ref,
                    val_id=val_id,
                    bank_tran_id=bank_tran_id,
                    card_type=card_type,
                    payment_method=mfs_method
                )

        return Response({'status': 'IPN verified and payment updated'}, status=status.HTTP_200_OK)
