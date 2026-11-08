from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from .models import Appointment, AppointmentStatus
from .serializers import AppointmentSerializer, AppointmentCreateSerializer
from .services import book_appointment, cancel_appointment, complete_appointment

@extend_schema(tags=['Appointments'])
class AppointmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AppointmentCreateSerializer
        return AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.select_related(
            'patient', 'clinic', 'doctor', 'department', 'family_member'
        ).prefetch_related('doctor__specializations').all()

        # ── Role-based base filter ────────────────────────────────────────────
        if user.role == 'PATIENT':
            queryset = queryset.filter(patient=user)
        elif user.role == 'DOCTOR':
            doctor_profile = getattr(user, 'doctor_profile', None)
            if doctor_profile:
                queryset = queryset.filter(doctor=doctor_profile)
            else:
                queryset = queryset.filter(doctor__email=user.email)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if staff:
                queryset = queryset.filter(clinic=staff.clinic)
            else:
                return queryset.none()
        elif user.role == 'CLINIC_ADMIN':
            queryset = queryset.filter(clinic__owner=user)
        # ADMIN sees all

        # ── Query param filters ───────────────────────────────────────────────
        params = self.request.query_params

        appointment_date = params.get('appointment_date') or params.get('date')
        if appointment_date:
            queryset = queryset.filter(appointment_date=appointment_date)

        doctor_id = params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor__id=doctor_id)

        clinic_id = params.get('clinic_id')
        if clinic_id:
            queryset = queryset.filter(clinic__id=clinic_id)

        apt_status = params.get('status')
        if apt_status:
            queryset = queryset.filter(status=apt_status.upper())

        is_emergency = params.get('is_emergency')
        if is_emergency is not None:
            queryset = queryset.filter(is_emergency=is_emergency.lower() in ['true', '1'])

        ordering = params.get('ordering', '-appointment_date')
        allowed_orderings = {
            'appointment_date', '-appointment_date',
            'serial_number', '-serial_number',
            'appointment_time', '-appointment_time',
            'created_at', '-created_at',
        }
        if ordering in allowed_orderings:
            queryset = queryset.order_by(ordering, 'serial_number')

        return queryset


    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role not in ['PATIENT', 'CLINIC_ADMIN', 'RECEPTIONIST', 'ADMIN']:
            return Response({'detail': 'You do not have permission to book appointments.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if not staff or str(staff.clinic_id) != str(data['clinic_id']):
                return Response({'detail': 'You can only book appointments for your assigned clinic.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'CLINIC_ADMIN':
            from apps.clinics.models import Clinic
            if not Clinic.objects.filter(id=data['clinic_id'], owner=user).exists():
                return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        target_patient = user
        is_walk_in = data.get('is_walk_in', False)

        # Handle counter walk-in booking by Clinic Admin or Receptionist
        if user.role in ['CLINIC_ADMIN', 'RECEPTIONIST', 'ADMIN'] and is_walk_in:
            from apps.accounts.models import User, UserRole
            walk_in_phone = data.get('walk_in_phone', '').strip()
            walk_in_name = data.get('walk_in_name', '').strip() or 'Walk-in Patient'

            patient_obj = None
            if walk_in_phone:
                patient_obj = User.objects.filter(phone=walk_in_phone, role=UserRole.PATIENT).first()
                if not patient_obj and len(walk_in_phone) >= 10:
                    patient_obj = User.objects.filter(phone__endswith=walk_in_phone[-10:], role=UserRole.PATIENT).first()
            
            if not patient_obj:
                import uuid
                name_parts = walk_in_name.split(' ', 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ''
                clean_phone = walk_in_phone.replace(' ', '').replace('-', '') if walk_in_phone else ''
                synthetic_email = f"walkin.{clean_phone or uuid.uuid4().hex[:8]}@smartclinic.local"
                patient_obj = User.objects.create_user(
                    email=synthetic_email,
                    first_name=first_name,
                    last_name=last_name,
                    phone=walk_in_phone or '01700000000',
                    role=UserRole.PATIENT
                )
            target_patient = patient_obj

        initial_status = 'CONFIRMED' if (user.role in ['CLINIC_ADMIN', 'RECEPTIONIST', 'ADMIN'] and is_walk_in) else 'PENDING'

        appointment = book_appointment(
            patient=target_patient,
            clinic_id=str(data['clinic_id']),
            doctor_id=str(data['doctor_id']),
            appointment_date=data['appointment_date'],
            appointment_time=data['appointment_time'],
            problem_description=data.get('problem_description', ''),
            family_member_id=str(data['family_member_id']) if data.get('family_member_id') else None,
            initial_status=initial_status,
            is_walk_in=is_walk_in
        )
        output_serializer = AppointmentSerializer(appointment)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

@extend_schema(tags=['Appointments'])
class AppointmentCheckInView(generics.GenericAPIView):
    """
    1-Click Counter Cash Payment & Check-In by Clinic Receptionist or Admin.
    Marks appointment as CONFIRMED, arrived as True, and logs a CASH payment.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AppointmentSerializer

    def post(self, request, pk, *args, **kwargs):
        try:
            appointment = Appointment.objects.select_related('clinic', 'doctor', 'patient').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == 'CLINIC_ADMIN':
            if appointment.clinic.owner != user:
                return Response({'detail': 'You do not own the clinic for this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if not staff or str(staff.clinic_id) != str(appointment.clinic_id):
                return Response({'detail': 'You do not belong to the clinic for this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role != 'ADMIN':
            return Response({'detail': 'Only clinic receptionist or admin can mark cash check-in.'}, status=status.HTTP_403_FORBIDDEN)

        from .models import AppointmentStatus
        from apps.payments.models import Payment, PaymentMethod, PaymentStatus
        from django.utils import timezone

        appointment.status = AppointmentStatus.CONFIRMED
        appointment.is_arrived = True
        if not appointment.arrived_at:
            appointment.arrived_at = timezone.now()
        appointment.save(update_fields=['status', 'is_arrived', 'arrived_at', 'updated_at'])

        # Record or update payment record
        Payment.objects.update_or_create(
            appointment=appointment,
            defaults={
                'amount': appointment.amount,
                'currency': 'BDT',
                'payment_method': PaymentMethod.CASH,
                'payment_status': PaymentStatus.COMPLETED,
                'received_by': request.user,
                'transaction_id': f"CASH_CHECKIN_{appointment.id.hex[:8]}"
            }
        )

        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Appointments'])
class AppointmentDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.select_related(
            'patient', 'clinic', 'doctor', 'department', 'family_member'
        ).prefetch_related('doctor__specializations').all()
        if user.role == 'PATIENT':
            return queryset.filter(patient=user)
        elif user.role == 'DOCTOR':
            doctor_profile = getattr(user, 'doctor_profile', None)
            if doctor_profile:
                return queryset.filter(doctor=doctor_profile)
            return queryset.filter(doctor__email=user.email)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            return queryset.filter(clinic=staff.clinic) if staff else queryset.none()
        elif user.role == 'CLINIC_ADMIN':
            return queryset.filter(clinic__owner=user)
        return queryset


@extend_schema(tags=['Appointments'])
class AppointmentCancelView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AppointmentSerializer

    def post(self, request, pk, *args, **kwargs):
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == 'PATIENT':
            if appointment.patient != user:
                return Response({'detail': 'You can only cancel your own appointments.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'DOCTOR':
            assigned_doctor = appointment.doctor
            is_assigned = (
                (hasattr(user, 'doctor_profile') and user.doctor_profile == assigned_doctor)
                or (assigned_doctor.email and assigned_doctor.email == user.email)
            )
            if not is_assigned:
                return Response({'detail': 'You are not assigned to this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'CLINIC_ADMIN':
            if appointment.clinic.owner != user:
                return Response({'detail': 'You do not own the clinic for this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if not staff or staff.clinic_id != appointment.clinic_id:
                return Response({'detail': 'You do not belong to the clinic for this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role != 'ADMIN':
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        appointment = cancel_appointment(appointment=appointment, cancelled_by_user=request.user)
        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_200_OK)

@extend_schema(tags=['Appointments'])
class AppointmentCompleteView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AppointmentSerializer

    def post(self, request, pk, *args, **kwargs):
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user

        # Role-based authorization:
        # - DOCTOR: must be the assigned doctor (matched via user-linked doctor profile email)
        # - CLINIC_ADMIN: must own the clinic for this appointment
        # - ADMIN: can complete any appointment
        if user.role == 'DOCTOR':
            # Check via linked doctor profile or email match
            assigned_doctor = appointment.doctor
            is_assigned = (
                (hasattr(user, 'doctor_profile') and user.doctor_profile == assigned_doctor)
                or (assigned_doctor.email and assigned_doctor.email == user.email)
            )
            if not is_assigned:
                return Response(
                    {'detail': 'You are not the assigned doctor for this appointment.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role == 'CLINIC_ADMIN':
            if appointment.clinic.owner != user:
                return Response(
                    {'detail': 'You do not own the clinic for this appointment.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role != 'ADMIN':
            return Response(
                {'detail': 'Only the assigned doctor, clinic admin, or system admin can complete an appointment.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not appointment.is_emergency:
            from apps.prescriptions.models import Prescription
            if not Prescription.objects.filter(appointment=appointment).exists():
                return Response({
                    'detail': f'Cannot complete appointment. Please issue a digital prescription for Serial #{appointment.serial_number} first.'
                }, status=status.HTTP_400_BAD_REQUEST)

        appointment = complete_appointment(appointment=appointment)
        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Appointments'])
class AppointmentEmergencyFlagView(APIView):
    """
    Flag or unflag an appointment as emergency priority.
    POST /api/v1/appointments/<pk>/emergency/
    Body: { is_emergency: bool, emergency_reason: str }
    Allowed for Doctor (assigned), Clinic Admin (clinic owner), Receptionist (clinic staff).
    Patients cannot self-flag.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role == 'PATIENT':
            return Response({'detail': 'Patients cannot flag emergency priority.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            appointment = Appointment.objects.select_related('clinic', 'doctor', 'patient', 'family_member').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == 'DOCTOR':
            assigned = appointment.doctor
            is_match = (hasattr(user, 'doctor_profile') and user.doctor_profile == assigned) or (assigned.email and assigned.email == user.email)
            if not is_match:
                return Response({'detail': 'You are not the assigned doctor for this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'CLINIC_ADMIN':
            if appointment.clinic.owner != user:
                return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if not staff or staff.clinic_id != appointment.clinic_id:
                return Response({'detail': 'You do not belong to this clinic.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role != 'ADMIN':
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        is_emergency = request.data.get('is_emergency', True)
        if isinstance(is_emergency, str):
            is_emergency = is_emergency.lower() in ['true', '1', 'yes']
        else:
            is_emergency = bool(is_emergency)
        emergency_reason = str(request.data.get('emergency_reason', '') or '').strip()

        if is_emergency:
            if appointment.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
                return Response({'detail': 'Completed or cancelled appointments cannot be flagged as emergency.'}, status=status.HTTP_400_BAD_REQUEST)
            appointment.is_emergency = True
            if emergency_reason:
                appointment.emergency_reason = emergency_reason
            appointment.save(update_fields=['is_emergency', 'emergency_reason', 'updated_at'])
        else:
            from apps.doctors.models import ChamberSession
            if ChamberSession.objects.filter(active_emergency=appointment).exists():
                return Response({'detail': 'Cannot unflag an emergency appointment while it is actively in chamber.'}, status=status.HTTP_400_BAD_REQUEST)
            appointment.is_emergency = False
            appointment.save(update_fields=['is_emergency', 'updated_at'])

        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Appointments'])
class PublicLiveQueueTrackView(APIView):
    """
    Public Live Patient Queue Tracking endpoint.
    Accessible without login (via QR code scan or direct URL from token slip).
    Returns appointment token info, doctor chamber live serial, delay notes,
    and calculates estimated wait time and remaining patients ahead.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk, *args, **kwargs):
        try:
            appointment = Appointment.objects.select_related(
                'clinic', 'doctor', 'patient', 'family_member', 'department'
            ).get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Token record not found.'}, status=status.HTTP_404_NOT_FOUND)

        from apps.appointments.services import calculate_dynamic_patient_eta
        live_queue_data = calculate_dynamic_patient_eta(appointment)

        patient_serial = appointment.serial_number or 1

        patient_display_name = (
            appointment.family_member.full_name if appointment.family_member
            else f"{appointment.patient.first_name} {appointment.patient.last_name}".strip()
        )
        if not patient_display_name:
            patient_display_name = "Walk-in Patient"

        return Response({
            'appointment': {
                'id': str(appointment.id),
                'serial_number': patient_serial,
                'patient_name': patient_display_name,
                'appointment_date': str(appointment.appointment_date),
                'appointment_time': str(appointment.appointment_time)[:5],
                'status': appointment.status,
                'amount': str(appointment.amount),
                'problem_description': appointment.problem_description,
                'is_emergency': appointment.is_emergency,
                'emergency_reason': appointment.emergency_reason,
                'clinic': {
                    'id': str(appointment.clinic.id),
                    'name': appointment.clinic.name,
                    'address': appointment.clinic.address,
                    'city': appointment.clinic.city,
                    'phone': appointment.clinic.phone,
                    'emergency_contact': appointment.clinic.emergency_contact,
                    'logo_url': appointment.clinic.logo_url,
                },
                'doctor': {
                    'id': str(appointment.doctor.id),
                    'full_name': appointment.doctor.full_name,
                    'qualification': appointment.doctor.qualification,
                    'specialization_name': appointment.doctor.specializations.first().name if appointment.doctor.specializations.exists() else 'General Practitioner',
                    'profile_image_url': appointment.doctor.avatar_url,
                },
                'department_name': appointment.department.name if appointment.department else None,
            },
            'live_queue': live_queue_data
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Appointments'])
class PublicWaitingRoomQueueView(APIView):
    """
    Public Unauthenticated Waiting Room Display Queue Endpoint.
    Powers lobby kiosks and public TV screens showing real-time chamber serials,
    currently serving patient, and upcoming patient list with masked names (privacy protected).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        date_str = request.query_params.get('date') or request.query_params.get('appointment_date')

        if not doctor_id or not clinic_id:
            return Response(
                {'detail': 'doctor_id and clinic_id query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from datetime import date as dt_date
        from apps.doctors.models import ChamberSession
        session_date = date_str or str(dt_date.today())

        session = ChamberSession.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            session_date=session_date
        ).first()

        appointments = Appointment.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            appointment_date=session_date
        ).select_related('patient', 'family_member').order_by('serial_number')

        results = []
        for apt in appointments:
            if apt.family_member:
                raw_name = apt.family_member.full_name
            elif apt.patient:
                raw_name = apt.patient.full_name or apt.patient.first_name
            else:
                raw_name = "Patient"

            parts = raw_name.strip().split()
            if len(parts) >= 2:
                masked_name = f"{parts[0][:1]}*** {parts[-1][:1]}***"
            elif parts:
                masked_name = f"{parts[0][:1]}***"
            else:
                masked_name = "Patient"

            results.append({
                'id': str(apt.id),
                'serial_number': apt.serial_number,
                'patient_name': masked_name,
                'status': apt.status,
                'is_emergency': apt.is_emergency,
                'appointment_time': str(apt.appointment_time)[:5],
            })

        return Response(results, status=status.HTTP_200_OK)





class AppointmentStatsSummaryView(APIView):
    """
    Returns accurate aggregate breakdown of appointments across the platform for Admin.
    Or scoped to clinic/doctor if requested.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        from django.db.models import Count
        queryset = Appointment.objects.all()

        if user.role == 'CLINIC_ADMIN':
            queryset = queryset.filter(clinic__owner=user)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if staff:
                queryset = queryset.filter(clinic=staff.clinic)
            else:
                queryset = queryset.none()
        elif user.role == 'DOCTOR':
            doctor_profile = getattr(user, 'doctor_profile', None)
            if doctor_profile:
                queryset = queryset.filter(doctor=doctor_profile)
            else:
                queryset = queryset.filter(doctor__email=user.email)
        elif user.role == 'PATIENT':
            queryset = queryset.filter(patient=user)
        # ADMIN sees all platform appointments

        breakdown = queryset.values('status').annotate(count=Count('id'))
        status_map = {
            'PENDING': 0,
            'CONFIRMED': 0,
            'COMPLETED': 0,
            'CANCELLED': 0,
        }
        total = 0
        for b in breakdown:
            st = b['status']
            cnt = b['count']
            status_map[st] = cnt
            total += cnt

        return Response({
            'total': total,
            'breakdown': status_map,
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Appointments'])
class AppointmentRescheduleView(generics.GenericAPIView):
    """
    POST /api/v1/appointments/<id>/reschedule/
    Reschedules an individual appointment to a new date and time slot.
    Allowed for: Patient (own booking), Doctor (assigned doctor), Clinic Admin, Receptionist.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AppointmentSerializer

    def post(self, request, pk, *args, **kwargs):
        try:
            appointment = Appointment.objects.select_related('clinic', 'doctor', 'patient').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == 'PATIENT' and appointment.patient != user:
            return Response({'detail': 'You can only reschedule your own appointments.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'CLINIC_ADMIN' and appointment.clinic.owner != user:
            return Response({'detail': 'You do not own the clinic for this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if not staff or str(staff.clinic_id) != str(appointment.clinic_id):
                return Response({'detail': 'You do not belong to the clinic for this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'DOCTOR':
            doc = getattr(user, 'doctor_profile', None)
            if not doc or str(doc.id) != str(appointment.doctor_id):
                return Response({'detail': 'You are not the assigned doctor for this appointment.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role not in ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT', 'CLINIC_ADMIN', 'RECEPTIONIST']:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        new_date_str = request.data.get('new_date')
        new_time_str = request.data.get('new_time')
        if not new_date_str or not new_time_str:
            return Response({'detail': 'new_date and new_time are required.'}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import datetime
        try:
            target_date = datetime.strptime(new_date_str, '%Y-%m-%d').date()
            if len(new_time_str) == 5:
                target_time = datetime.strptime(new_time_str, '%H:%M').time()
            else:
                target_time = datetime.strptime(new_time_str, '%H:%M:%S').time()
        except ValueError:
            return Response({'detail': 'Invalid date or time format. Use YYYY-MM-DD and HH:MM.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.appointments.services import reschedule_appointment
        apt = reschedule_appointment(
            appointment=appointment,
            new_date=target_date,
            new_time=target_time,
            requested_by_user=user,
            reason=request.data.get('reason', '')
        )
        return Response(AppointmentSerializer(apt).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Appointments'])
class AppointmentRolloverView(generics.GenericAPIView):
    """
    POST /api/v1/appointments/rollover/
    Bulk rolls over remaining unserved patients from an ended session to the doctor's next available chamber session.
    Allowed for: Doctor, Clinic Admin, Receptionist.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        doctor_id = request.data.get('doctor_id')
        clinic_id = request.data.get('clinic_id')
        session_date_str = request.data.get('session_date')
        target_date_str = request.data.get('target_date')

        if not doctor_id or not clinic_id or not session_date_str:
            return Response({'detail': 'doctor_id, clinic_id, and session_date are required.'}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import datetime
        try:
            s_date = datetime.strptime(session_date_str, '%Y-%m-%d').date()
            t_date = datetime.strptime(target_date_str, '%Y-%m-%d').date() if target_date_str else None
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user.role == 'CLINIC_ADMIN':
            from apps.clinics.models import Clinic
            if not Clinic.objects.filter(id=clinic_id, owner=user).exists():
                return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if not staff or str(staff.clinic_id) != str(clinic_id):
                return Response({'detail': 'You do not belong to this clinic.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'DOCTOR':
            doc = getattr(user, 'doctor_profile', None)
            if not doc or str(doc.id) != str(doctor_id):
                return Response({'detail': 'You are not this doctor.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role != 'ADMIN':
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.appointments.services import rollover_unserved_appointments
        rescheduled = rollover_unserved_appointments(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            session_date=s_date,
            target_date=t_date,
            requested_by_user=user
        )

        return Response({
            'success': True,
            'message': f'Successfully rolled over {len(rescheduled)} unserved appointment(s) to the next chamber session.',
            'count': len(rescheduled),
            'appointments': AppointmentSerializer(rescheduled, many=True).data
        }, status=status.HTTP_200_OK)
