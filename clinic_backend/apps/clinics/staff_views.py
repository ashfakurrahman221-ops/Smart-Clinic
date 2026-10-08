import uuid
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q
from drf_spectacular.utils import extend_schema
from apps.accounts.permissions import IsClinicAdmin, IsReceptionist, IsClinicAdminOrReceptionist
from apps.accounts.models import User, UserRole
from apps.appointments.models import Appointment, AppointmentStatus
from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.doctors.models import Doctor, DoctorClinic
from .models import Clinic, ClinicStaff, StaffAttendance, ShiftClosingLog
from .serializers import (
    ClinicStaffSerializer,
    StaffAttendanceSerializer,
    CreateReceptionistAccountSerializer,
)


def get_clinic_for_user(user):
    """Helper: get clinic for either a clinic admin or receptionist."""
    if user.role == UserRole.CLINIC_ADMIN:
        return get_object_or_404(Clinic, owner=user)
    elif hasattr(user, 'staff_profile') and user.staff_profile.clinic:
        return user.staff_profile.clinic
    return None


@extend_schema(tags=['Staff Management'])
class ClinicStaffListCreateView(generics.ListCreateAPIView):
    """
    Admin: List all staff for their clinic / add new staff member.
    GET  /api/v1/clinics/staff/
    POST /api/v1/clinics/staff/
    """
    serializer_class = ClinicStaffSerializer
    permission_classes = [IsClinicAdmin]

    def get_queryset(self):
        clinic = get_object_or_404(Clinic, owner=self.request.user)
        return ClinicStaff.objects.filter(clinic=clinic, is_active=True).order_by('role', 'name')

    def perform_create(self, serializer):
        clinic = get_object_or_404(Clinic, owner=self.request.user)
        serializer.save(clinic=clinic)


@extend_schema(tags=['Staff Management'])
class ClinicStaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin: Get / update / soft-delete a specific staff member.
    GET/PATCH/DELETE /api/v1/clinics/staff/<id>/
    """
    serializer_class = ClinicStaffSerializer
    permission_classes = [IsClinicAdmin]

    def get_queryset(self):
        clinic = get_object_or_404(Clinic, owner=self.request.user)
        return ClinicStaff.objects.filter(clinic=clinic)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
        if instance.user:
            instance.user.is_active = False
            instance.user.save(update_fields=['is_active', 'updated_at'])
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                tokens = OutstandingToken.objects.filter(user=instance.user)
                for t in tokens:
                    BlacklistedToken.objects.get_or_create(token=t)
            except Exception:
                pass

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.user and instance.user.is_active != instance.is_active:
            instance.user.is_active = instance.is_active
            instance.user.save(update_fields=['is_active', 'updated_at'])
            if not instance.is_active:
                try:
                    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                    tokens = OutstandingToken.objects.filter(user=instance.user)
                    for t in tokens:
                        BlacklistedToken.objects.get_or_create(token=t)
                except Exception:
                    pass


@extend_schema(tags=['Staff Management'])
class CreateReceptionistLoginView(APIView):
    """
    Admin: Create a User account (login credentials) for a Receptionist staff member.
    POST /api/v1/clinics/staff/create-login/
    Body: { staff_id, email, first_name, last_name, password }
    """
    permission_classes = [IsClinicAdmin]

    def post(self, request):
        serializer = CreateReceptionistAccountSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        clinic = get_object_or_404(Clinic, owner=request.user)

        staff = get_object_or_404(ClinicStaff, id=data['staff_id'], clinic=clinic)

        if staff.user is not None:
            return Response(
                {'detail': 'This staff member already has a login account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if staff.role != 'RECEPTIONIST':
            return Response(
                {'detail': 'Login accounts can only be created for Receptionist staff.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if email is already taken
        if User.objects.filter(email=data['email'].lower().strip()).exists():
            return Response(
                {'detail': 'A user with this email address already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.create_user(
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data.get('last_name', ''),
            role=UserRole.RECEPTIONIST,
        )

        staff.user = user
        staff.save()

        return Response({
            'detail': 'Receptionist login created successfully.',
            'email': user.email,
            'staff_id': str(staff.id),
            'login_url': '/reception/login',
        }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Staff Management'])
class StaffAttendanceListCreateView(generics.ListCreateAPIView):
    """
    List today's attendance / mark attendance.
    Admin or Receptionist can access.
    GET  /api/v1/clinics/staff/attendance/
    POST /api/v1/clinics/staff/attendance/
    """
    serializer_class = StaffAttendanceSerializer
    permission_classes = [IsClinicAdminOrReceptionist]

    def get_queryset(self):
        clinic = get_clinic_for_user(self.request.user)
        if not clinic:
            return StaffAttendance.objects.none()
        date_str = self.request.query_params.get('date')
        qs = StaffAttendance.objects.filter(staff__clinic=clinic).select_related('staff', 'marked_by')
        if date_str:
            qs = qs.filter(date=date_str)
        else:
            qs = qs.filter(date=timezone.now().date())
        return qs

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)


@extend_schema(tags=['Staff Management'])
class StaffAttendanceDetailView(generics.RetrieveUpdateAPIView):
    """
    Get or update an attendance record.
    PATCH /api/v1/clinics/staff/attendance/<id>/
    """
    serializer_class = StaffAttendanceSerializer
    permission_classes = [IsClinicAdminOrReceptionist]

    def get_queryset(self):
        clinic = get_clinic_for_user(self.request.user)
        if not clinic:
            return StaffAttendance.objects.none()
        return StaffAttendance.objects.filter(staff__clinic=clinic)


@extend_schema(tags=['Staff Management'])
class StaffMonthlyAttendanceSummaryView(APIView):
    """
    Get monthly attendance summary and payroll per staff member.
    GET /api/v1/clinics/staff/monthly-summary/?month=YYYY-MM
    """
    permission_classes = [IsClinicAdminOrReceptionist]

    def get(self, request):
        clinic = get_clinic_for_user(request.user)
        if not clinic:
            return Response({'detail': 'No associated clinic found.'}, status=status.HTTP_404_NOT_FOUND)

        month_str = request.query_params.get('month')
        if not month_str:
            month_str = timezone.now().strftime('%Y-%m')

        try:
            year, month = map(int, month_str.split('-'))
        except (ValueError, TypeError):
            now = timezone.now()
            year, month = now.year, now.month
            month_str = f"{year:04d}-{month:02d}"

        staff_members = ClinicStaff.objects.filter(clinic=clinic, is_active=True).order_by('role', 'name')
        attendance_records = StaffAttendance.objects.filter(
            staff__clinic=clinic,
            date__year=year,
            date__month=month
        )

        summaries = []
        total_monthly_payroll = 0.0

        for staff in staff_members:
            records = attendance_records.filter(staff=staff)
            presents = records.filter(status='PRESENT').count()
            lates = records.filter(status='LATE').count()
            leaves = records.filter(status='LEAVE').count()
            absents = records.filter(status='ABSENT').count()
            total_logged = presents + lates + leaves + absents
            
            att_rate = round(((presents + lates) / total_logged) * 100, 1) if total_logged > 0 else None
            salary = float(staff.monthly_salary or 0.0)
            total_monthly_payroll += salary

            summaries.append({
                'staff_id': str(staff.id),
                'name': staff.name,
                'role': staff.role,
                'role_display': staff.get_role_display(),
                'phone': staff.phone,
                'monthly_salary': salary,
                'presents': presents,
                'lates': lates,
                'leaves': leaves,
                'absents': absents,
                'total_logged_days': total_logged,
                'attendance_rate': att_rate,
            })

        return Response({
            'month': month_str,
            'total_staff': len(staff_members),
            'total_monthly_payroll': total_monthly_payroll,
            'staff_summaries': summaries,
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Reception'])
class ReceptionPatientLookupView(APIView):
    """
    Receptionist or Clinic Admin: Lookup existing registered patient by phone number.
    GET /api/v1/clinics/reception/patient-lookup/?phone=017...
    """
    permission_classes = [IsClinicAdminOrReceptionist]

    def get(self, request):
        phone = (request.query_params.get('phone') or '').strip()
        if not phone:
            return Response({'detail': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cleaned_phone = phone[-10:] if len(phone) >= 10 else phone
        patient_user = User.objects.filter(
            Q(phone__endswith=cleaned_phone) | Q(phone=phone),
            role=UserRole.PATIENT
        ).first()

        if not patient_user:
            return Response({'found': False, 'patient': None}, status=status.HTTP_200_OK)

        clinic = get_clinic_for_user(request.user)
        clinic_apts_count = Appointment.objects.filter(patient=patient_user, clinic=clinic).count() if clinic else 0

        return Response({
            'found': True,
            'patient': {
                'id': str(patient_user.id),
                'full_name': patient_user.full_name or f"{patient_user.first_name} {patient_user.last_name}".strip(),
                'first_name': patient_user.first_name,
                'last_name': patient_user.last_name,
                'phone': patient_user.phone,
                'email': patient_user.email,
                'clinic_visits_count': clinic_apts_count,
            }
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Reception'])
class ReceptionMyClinicView(APIView):
    """
    Receptionist: Get their own clinic info, permissions, and active doctors for today.
    GET /api/v1/clinics/reception/my-clinic/
    """
    permission_classes = [IsReceptionist]

    def get(self, request):
        clinic = get_clinic_for_user(request.user)
        if not clinic:
            return Response({'detail': 'No associated clinic found.'}, status=status.HTTP_404_NOT_FOUND)

        staff_today = ClinicStaff.objects.filter(clinic=clinic, is_active=True).values(
            'id', 'name', 'role', 'phone'
        )

        affiliations = DoctorClinic.objects.filter(clinic=clinic, is_active=True).select_related('doctor').prefetch_related('doctor__specializations')
        doctor_list = []
        for aff in affiliations:
            doc = aff.doctor
            specs = ', '.join([s.name for s in doc.specializations.all()]) or doc.qualification or 'General'
            doctor_list.append({
                'id': str(doc.id),
                'name': doc.full_name,
                'specialization': specs,
                'room_number': aff.room_number or '1',
                'consultation_fee': float(aff.consultation_fee),
            })

        return Response({
            'clinic_id': str(clinic.id),
            'clinic_name': clinic.name,
            'clinic_address': clinic.address,
            'clinic_phone': clinic.phone,
            'receptionist_name': request.user.full_name,
            'staff': list(staff_today),
            'doctors': doctor_list,
            'permissions': getattr(request.user.staff_profile, 'permissions', {}),
        })


@extend_schema(tags=['Reception'])
class ReceptionPatientCheckInView(APIView):
    """
    Receptionist or Clinic Admin: Mark patient arrived at clinic.
    POST /api/v1/clinics/reception/check-in/
    Body: { appointment_id: "uuid" }
    """
    permission_classes = [IsClinicAdminOrReceptionist]

    def post(self, request):
        appointment_id = request.data.get('appointment_id')
        if not appointment_id:
            return Response({'detail': 'appointment_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        clinic = get_clinic_for_user(request.user)
        appointment = get_object_or_404(Appointment, id=appointment_id, clinic=clinic)

        appointment.is_arrived = True
        appointment.arrived_at = timezone.now()
        appointment.save(update_fields=['is_arrived', 'arrived_at'])

        return Response({
            'detail': f'Patient marked as arrived at {appointment.arrived_at.strftime("%I:%M %p")}.',
            'appointment_id': str(appointment.id),
            'serial_number': appointment.serial_number,
            'is_arrived': True,
            'arrived_at': appointment.arrived_at.isoformat(),
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Reception'])
class ReceptionWalkInCreateView(APIView):
    """
    Receptionist or Clinic Admin: Issue a walk-in token for today.
    POST /api/v1/clinics/reception/walk-in/
    Body: { doctor_id, patient_name, patient_phone, problem_description, fee }
    """
    permission_classes = [IsClinicAdminOrReceptionist]

    def post(self, request):
        clinic = get_clinic_for_user(request.user)
        if not clinic:
            return Response({'detail': 'No associated clinic found.'}, status=status.HTTP_404_NOT_FOUND)

        doctor_id = request.data.get('doctor_id')
        patient_name = (request.data.get('patient_name') or request.data.get('walk_in_name') or '').strip()
        patient_phone = (request.data.get('patient_phone') or request.data.get('walk_in_phone') or '').strip()
        problem = request.data.get('problem_description') or 'Walk-in Consultation'
        raw_fee = request.data.get('fee') or request.data.get('amount')

        if not doctor_id or not patient_name:
            return Response({'detail': 'doctor_id and patient_name are required.'}, status=status.HTTP_400_BAD_REQUEST)

        doctor = get_object_or_404(Doctor, id=doctor_id)
        today = timezone.now().date()
        current_time = timezone.now().time()

        # Resolve fee fallback
        if raw_fee is not None and str(raw_fee).strip() != '':
            try:
                fee = float(raw_fee)
            except (ValueError, TypeError):
                fee = 0.0
        else:
            aff = DoctorClinic.objects.filter(doctor=doctor, clinic=clinic).first()
            fee = float(aff.consultation_fee) if (aff and aff.consultation_fee) else float(getattr(doctor, 'consultation_fee', 0) or 0)

        last_appt = Appointment.objects.filter(
            doctor=doctor,
            clinic=clinic,
            appointment_date=today
        ).order_by('-serial_number').first()

        next_serial = (last_appt.serial_number + 1) if last_appt else 1

        patient_user = User.objects.filter(phone=patient_phone, role=UserRole.PATIENT).first()
        if not patient_user and len(patient_phone) >= 10:
            patient_user = User.objects.filter(phone__endswith=patient_phone[-10:], role=UserRole.PATIENT).first()
        if not patient_user:
            safe_email = f"walkin_{patient_phone or uuid.uuid4().hex[:8]}@clinic.internal".lower()
            patient_user, _ = User.objects.get_or_create(
                email=safe_email,
                defaults={
                    'first_name': patient_name,
                    'phone': patient_phone,
                    'role': UserRole.PATIENT
                }
            )

        is_emergency = bool(request.data.get('is_emergency', False))
        emergency_reason = str(request.data.get('emergency_reason') or '').strip()

        with transaction.atomic():
            appointment = Appointment.objects.create(
                patient=patient_user,
                clinic=clinic,
                doctor=doctor,
                appointment_date=today,
                appointment_time=current_time,
                serial_number=next_serial,
                status=AppointmentStatus.CONFIRMED,
                problem_description=problem,
                amount=fee,
                is_arrived=True,
                arrived_at=timezone.now(),
                is_emergency=is_emergency,
                emergency_reason=emergency_reason
            )

            # Record cash collection for walk-in appointment
            if fee > 0:
                from apps.payments.models import Payment, PaymentMethod, PaymentStatus
                Payment.objects.update_or_create(
                    appointment=appointment,
                    defaults={
                        'amount': fee,
                        'currency': 'BDT',
                        'payment_method': PaymentMethod.CASH,
                        'payment_status': PaymentStatus.COMPLETED,
                        'received_by': request.user,
                        'is_walk_in': True,
                        'walk_in_patient_name': patient_name,
                        'walk_in_patient_phone': patient_phone,
                        'transaction_id': f"WALKIN_CASH_{appointment.id.hex[:8]}"
                    }
                )

        return Response({
            'detail': 'Walk-in appointment registered successfully.',
            'appointment_id': str(appointment.id),
            'id': str(appointment.id),
            'serial_number': appointment.serial_number,
            'patient_name': patient_name,
            'doctor_name': doctor.full_name,
            'amount': float(appointment.amount),
            'fee': float(appointment.amount),
            'is_arrived': True,
            'arrived_at': appointment.arrived_at.isoformat() if appointment.arrived_at else None,
            'is_emergency': appointment.is_emergency,
            'emergency_reason': appointment.emergency_reason,
        }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Reception'])
class ReceptionCashPaymentView(APIView):
    """
    Receptionist or Clinic Admin: Log a cash payment collected at reception counter.
    POST /api/v1/clinics/reception/cash-payment/
    Body: { appointment_id, amount, note }
    """
    permission_classes = [IsClinicAdminOrReceptionist]

    def post(self, request):
        clinic = get_clinic_for_user(request.user)
        appointment_id = request.data.get('appointment_id')
        amount = request.data.get('amount')

        if not appointment_id or not amount:
            return Response({'detail': 'appointment_id and amount are required.'}, status=status.HTTP_400_BAD_REQUEST)

        appointment = get_object_or_404(Appointment, id=appointment_id, clinic=clinic)

        with transaction.atomic():
            payment, created = Payment.objects.get_or_create(
                appointment=appointment,
                defaults={
                    'amount': amount,
                    'payment_method': PaymentMethod.CASH,
                    'payment_status': PaymentStatus.COMPLETED,
                    'received_by': request.user,
                    'is_walk_in': False,
                }
            )
            if not created:
                payment.amount = amount
                payment.payment_method = PaymentMethod.CASH
                payment.payment_status = PaymentStatus.COMPLETED
                payment.received_by = request.user
                payment.save()

        return Response({
            'detail': f'Cash payment of BDT {amount} recorded by {request.user.full_name}.',
            'payment_id': str(payment.id),
            'amount': float(payment.amount),
            'payment_status': payment.payment_status,
            'received_by': request.user.full_name,
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Reception'])
class ReceptionDailyCashSummaryView(APIView):
    """
    Get today's total cash collected breakdown by staff member + digital breakdown.
    GET /api/v1/clinics/reception/cash-summary/
    """
    permission_classes = [IsClinicAdminOrReceptionist]

    def get(self, request):
        clinic = get_clinic_for_user(request.user)
        if not clinic:
            return Response({'error': 'No clinic associated with user'}, status=status.HTTP_400_BAD_REQUEST)
        today = timezone.now().date()

        cash_payments = Payment.objects.filter(
            appointment__clinic=clinic,
            payment_method=PaymentMethod.CASH,
            payment_status=PaymentStatus.COMPLETED,
            created_at__date=today
        ).select_related('received_by', 'appointment__patient')

        digital_payments = Payment.objects.filter(
            appointment__clinic=clinic,
            payment_status=PaymentStatus.COMPLETED,
            created_at__date=today
        ).exclude(payment_method=PaymentMethod.CASH)

        total_cash = cash_payments.aggregate(total=Sum('amount'))['total'] or 0.0
        total_digital = digital_payments.aggregate(total=Sum('amount'))['total'] or 0.0

        today_appointments = Appointment.objects.filter(
            clinic=clinic,
            appointment_date=today
        )
        total_tokens = today_appointments.count()
        completed_tokens = today_appointments.filter(status=AppointmentStatus.COMPLETED).count()

        breakdown = []
        for p in cash_payments:
            breakdown.append({
                'id': str(p.id),
                'amount': float(p.amount),
                'received_by': p.received_by.full_name if p.received_by else 'Admin / Unknown',
                'patient': p.appointment.patient.full_name if p.appointment else 'Walk-in',
                'serial_number': p.appointment.serial_number if p.appointment else None,
                'time': p.created_at.strftime('%I:%M %p'),
            })

        return Response({
            'date': str(today),
            'total_cash_today': float(total_cash),
            'total_digital_today': float(total_digital),
            'total_collected_today': float(total_cash + total_digital),
            'total_transactions': len(cash_payments) + digital_payments.count(),
            'cash_transactions_count': len(cash_payments),
            'digital_transactions_count': digital_payments.count(),
            'total_tokens_today': total_tokens,
            'completed_tokens_today': completed_tokens,
            'transactions': breakdown,
        })


@extend_schema(tags=['Reception'])
class ReceptionShiftClosingView(APIView):
    """
    Counter Shift Closing and Cash Drawer Reconciliation.
    GET: Get latest shift closing logs for the clinic.
    POST: Submit cash drawer closing verification with denomination audit.
    """
    permission_classes = [IsClinicAdminOrReceptionist]

    def get(self, request):
        clinic = get_clinic_for_user(request.user)
        if not clinic:
            return Response({'error': 'No clinic associated with user'}, status=status.HTTP_400_BAD_REQUEST)

        closings = ShiftClosingLog.objects.filter(clinic=clinic).select_related('closed_by')[:10]
        results = []
        for c in closings:
            results.append({
                'id': str(c.id),
                'shift_date': str(c.shift_date),
                'shift_end_time': c.shift_end_time.strftime('%I:%M %p') if c.shift_end_time else '',
                'closed_by_name': c.closed_by.full_name if c.closed_by else 'Staff',
                'system_cash_total': float(c.system_cash_total),
                'physical_cash_counted': float(c.physical_cash_counted),
                'discrepancy': float(c.discrepancy),
                'digital_total': float(c.digital_total),
                'total_tokens_handled': c.total_tokens_handled,
                'total_transactions_count': c.total_transactions_count,
                'denominations': c.denominations,
                'handed_over_to': c.handed_over_to,
                'notes': c.notes,
                'created_at': c.created_at.isoformat(),
            })
        return Response({'results': results})

    def post(self, request):
        clinic = get_clinic_for_user(request.user)
        if not clinic:
            return Response({'error': 'No clinic associated with user'}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        today = timezone.now().date()
        current_time = timezone.now().time()

        system_cash = float(data.get('system_cash_total', 0.0))
        physical_cash = float(data.get('physical_cash_counted', 0.0))
        digital_total = float(data.get('digital_total', 0.0))
        discrepancy = round(physical_cash - system_cash, 2)
        total_tokens = int(data.get('total_tokens_handled', 0))
        total_tx = int(data.get('total_transactions_count', 0))
        denominations = data.get('denominations', {})
        handed_over_to = data.get('handed_over_to', '').strip()
        notes = data.get('notes', '').strip()

        closing = ShiftClosingLog.objects.create(
            clinic=clinic,
            closed_by=request.user,
            shift_date=today,
            shift_end_time=current_time,
            system_cash_total=system_cash,
            physical_cash_counted=physical_cash,
            discrepancy=discrepancy,
            digital_total=digital_total,
            total_tokens_handled=total_tokens,
            total_transactions_count=total_tx,
            denominations=denominations,
            handed_over_to=handed_over_to,
            notes=notes,
            is_verified=True,
        )

        return Response({
            'success': True,
            'id': str(closing.id),
            'message': 'Shift closing logged successfully.',
            'closing': {
                'id': str(closing.id),
                'shift_date': str(closing.shift_date),
                'shift_end_time': closing.shift_end_time.strftime('%I:%M %p'),
                'closed_by_name': request.user.full_name,
                'system_cash_total': float(closing.system_cash_total),
                'physical_cash_counted': float(closing.physical_cash_counted),
                'discrepancy': float(closing.discrepancy),
                'digital_total': float(closing.digital_total),
                'total_tokens_handled': closing.total_tokens_handled,
                'total_transactions_count': closing.total_transactions_count,
                'denominations': closing.denominations,
                'handed_over_to': closing.handed_over_to,
                'notes': closing.notes,
                'created_at': closing.created_at.isoformat(),
            }
        }, status=status.HTTP_201_CREATED)
