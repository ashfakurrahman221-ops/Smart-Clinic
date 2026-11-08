from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from apps.accounts.permissions import IsAdmin, IsClinicAdminOrAdmin, IsDoctor
from apps.clinics.models import Clinic, VerificationStatus
from .models import Specialization, Doctor, DoctorClinic, DoctorClinicStatus, DoctorSchedule, DayOfWeek
from .serializers import (
    SpecializationSerializer,
    DoctorSerializer,
    DoctorClinicSerializer,
    DoctorClinicAssignmentSerializer,
    DoctorProfileSetupSerializer,
    DoctorClinicRequestCreateSerializer,
    DoctorClinicRequestResponseSerializer,
    DoctorScheduleSerializer,
)
from .selectors import list_specializations, list_doctors, get_doctor_by_id
from .services import (
    create_specialization, setup_doctor_profile, assign_doctor_to_clinic,
    request_doctor_clinic_service
)



@extend_schema(tags=['Specializations'])
class SpecializationListCreateView(generics.ListCreateAPIView):
    serializer_class = SpecializationSerializer

    def get_queryset(self):
        return list_specializations()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsClinicAdminOrAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        spec = create_specialization(**serializer.validated_data)
        serializer.instance = spec


@extend_schema(tags=['Doctors'])
class DoctorListView(generics.ListAPIView):
    """Public read-only list of doctors. Strictly verified only, unless queried by system ADMIN."""
    serializer_class = DoctorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        clinic_id = self.request.query_params.get('clinic_id')
        specialization_id = self.request.query_params.get('specialization_id')
        department_id = self.request.query_params.get('department_id')
        division_id = self.request.query_params.get('division_id')
        district_id = self.request.query_params.get('district_id')
        search = self.request.query_params.get('search')
        verification_status = self.request.query_params.get('verification_status')
        user = self.request.user

        # STRICT: Public, Patients, Doctors, and Clinic Admins ONLY see VERIFIED doctors!
        only_verified = True
        if user and user.is_authenticated and user.role == 'ADMIN':
            only_verified = False

        qs = list_doctors(
            clinic_id=clinic_id,
            specialization_id=specialization_id,
            department_id=department_id,
            only_verified=only_verified
        )

        from django.db.models import Q
        if division_id:
            qs = qs.filter(
                doctor_clinics__clinic__division_id=division_id,
                doctor_clinics__status='ACCEPTED',
                doctor_clinics__is_active=True
            ).distinct()
        if district_id:
            qs = qs.filter(
                doctor_clinics__clinic__district_id=district_id,
                doctor_clinics__status='ACCEPTED',
                doctor_clinics__is_active=True
            ).distinct()
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) | Q(qualification__icontains=search)
            ).distinct()

        if user and user.is_authenticated and user.role == 'ADMIN' and verification_status:
            qs = qs.filter(verification_status=verification_status)

        return qs


@extend_schema(tags=['Doctors'])
class DoctorDetailView(generics.RetrieveAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [permissions.AllowAny]


@extend_schema(tags=['Doctors'])
class DoctorProfileSetupView(generics.GenericAPIView):
    """
    POST: A logged-in DOCTOR user creates or updates their own Doctor profile.
    GET: Returns the current user's Doctor profile.
    """
    serializer_class = DoctorProfileSetupSerializer
    permission_classes = [IsDoctor]

    def get(self, request, *args, **kwargs):
        if request.user.role != 'DOCTOR':
            return Response({'detail': 'Only Doctor accounts can access this endpoint.'}, status=status.HTTP_403_FORBIDDEN)

        if not hasattr(request.user, 'doctor_profile') or request.user.doctor_profile is None:
            return Response({'detail': 'Doctor profile not set up yet. Please POST to this endpoint to create it.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(request.user.doctor_profile)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        if request.user.role != 'DOCTOR':
            return Response({'detail': 'Only Doctor accounts can set up a doctor profile.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        specialization_ids = validated.pop('specialization_ids', None)

        doctor = setup_doctor_profile(
            user=request.user,
            specialization_ids=specialization_ids,
            **validated
        )
        output_serializer = DoctorProfileSetupSerializer(doctor)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Doctors'])
class DoctorVerifyView(APIView):
    """
    PATCH /api/v1/doctors/<id>/verify/
    Admin approves (VERIFIED) or rejects (REJECTED) a doctor registration.
    """
    permission_classes = [IsAdmin]

    def patch(self, request, pk, *args, **kwargs):
        doctor = get_doctor_by_id(pk)
        if not doctor:
            return Response({'detail': 'Doctor not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('verification_status')
        if new_status not in [VerificationStatus.VERIFIED, VerificationStatus.REJECTED, VerificationStatus.PENDING]:
            return Response({'detail': 'Invalid verification_status.'}, status=status.HTTP_400_BAD_REQUEST)

        doctor.verification_status = new_status
        doctor.save()

        if new_status == VerificationStatus.VERIFIED:
            try:
                from apps.notifications.models import Notification, NotificationType
                from apps.notifications.email_service import send_approval_email

                recipient_user = doctor.user
                if recipient_user:
                    Notification.objects.create(
                        recipient=recipient_user,
                        title="Congratulations! Your Doctor Profile Has Been Approved 🎉",
                        message=f"Dr. {doctor.full_name}, your medical credentials and profile have been verified and approved by the Administration! You can now accept clinic chamber invitations and receive patient appointments.",
                        notification_type=NotificationType.DOCTOR_APPROVED
                    )

                send_approval_email(
                    recipient_email=(recipient_user.email if recipient_user else '') or doctor.email,
                    recipient_name=f"Dr. {doctor.full_name}",
                    subject=f"🎉 Congratulations! Dr. {doctor.full_name}, Your Profile is Approved - Smart Clinic",
                    message=(
                        f"Dear Dr. {doctor.full_name},\n\n"
                        f"Congratulations! We are delighted to inform you that your doctor profile and medical credentials "
                        f"have been verified and officially APPROVED by the Smart Clinic Administration.\n\n"
                        f"Your profile is now visible in the Doctors Directory for patients across Bangladesh. You can now:\n"
                        f"• Join partnered clinics and define your consultation fees\n"
                        f"• Configure smart chamber schedules and patient slots\n"
                        f"• Manage your digital consultation chamber and issue DGDA-compliant E-Prescriptions\n\n"
                        f"Log in to your Doctor Dashboard to begin consultations.\n\n"
                        f"Warm regards,\n"
                        f"The Smart Clinic Team"
                    )
                )
            except Exception:
                pass

        return Response(DoctorSerializer(doctor).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Doctors'])
class DoctorClinicRequestCreateView(generics.GenericAPIView):
    """
    POST /api/v1/doctors/requests/
    ClinicAdmin invites a Doctor OR Doctor requests to join a Clinic.
    """
    serializer_class = DoctorClinicRequestCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        if user.role not in ['CLINIC_ADMIN', 'DOCTOR', 'ADMIN']:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if user.role == 'CLINIC_ADMIN':
            owned_clinic = Clinic.objects.filter(owner=user).first()
            if not owned_clinic:
                return Response({'detail': 'You must register a clinic first.'}, status=status.HTTP_400_BAD_REQUEST)
            if owned_clinic.verification_status != VerificationStatus.VERIFIED:
                return Response({'detail': 'Your clinic has not been approved by Admin yet.'}, status=status.HTTP_403_FORBIDDEN)

            clinic = owned_clinic
            doctor = get_doctor_by_id(data.get('doctor_id'))
            if not doctor:
                return Response({'detail': 'Doctor not found.'}, status=status.HTTP_404_NOT_FOUND)
            if doctor.verification_status != VerificationStatus.VERIFIED:
                return Response({'detail': 'This doctor profile is not approved by Admin yet.'}, status=status.HTTP_400_BAD_REQUEST)

        elif user.role == 'DOCTOR':
            if not hasattr(user, 'doctor_profile') or not user.doctor_profile:
                return Response({'detail': 'Setup your doctor profile first.'}, status=status.HTTP_400_BAD_REQUEST)
            doctor = user.doctor_profile
            if doctor.verification_status != VerificationStatus.VERIFIED:
                return Response({'detail': 'Your doctor profile has not been approved by Admin yet.'}, status=status.HTTP_403_FORBIDDEN)

            clinic_id = data.get('clinic_id')
            clinic = Clinic.objects.filter(id=clinic_id).first()
            if not clinic:
                return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)
            if clinic.verification_status != VerificationStatus.VERIFIED:
                return Response({'detail': 'This clinic is not approved by Admin yet.'}, status=status.HTTP_400_BAD_REQUEST)

        else: # ADMIN
            doctor = get_doctor_by_id(data.get('doctor_id'))
            clinic = Clinic.objects.filter(id=data.get('clinic_id')).first()
            if not doctor or not clinic:
                return Response({'detail': 'Doctor or Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        mapping = request_doctor_clinic_service(
            doctor=doctor,
            clinic=clinic,
            requested_by_user=user,
            consultation_fee=data['consultation_fee'],
            department_id=str(data['department_id']) if data.get('department_id') else None,
            room_number=data.get('room_number', '')
        )
        return Response(DoctorClinicSerializer(mapping).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Doctors'])
class DoctorClinicRequestListView(generics.ListAPIView):
    """
    GET /api/v1/doctors/requests/
    List requests for current user (Doctor or ClinicAdmin).
    """
    serializer_class = DoctorClinicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'DOCTOR' and hasattr(user, 'doctor_profile') and user.doctor_profile:
            return DoctorClinic.objects.filter(doctor=user.doctor_profile).select_related('clinic', 'doctor', 'department')
        elif user.role == 'CLINIC_ADMIN':
            owned_clinic = Clinic.objects.filter(owner=user).first()
            if owned_clinic:
                return DoctorClinic.objects.filter(clinic=owned_clinic).select_related('clinic', 'doctor', 'department')
        elif user.role == 'ADMIN':
            return DoctorClinic.objects.all().select_related('clinic', 'doctor', 'department')
        return DoctorClinic.objects.none()


@extend_schema(tags=['Doctors'])
class DoctorClinicRequestRespondView(APIView):
    """
    PATCH /api/v1/doctors/requests/<id>/respond/
    Accept or Reject a Doctor-Clinic request.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk, *args, **kwargs):
        try:
            mapping = DoctorClinic.objects.select_related('clinic', 'doctor').get(id=pk)
        except DoctorClinic.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        action = request.data.get('action')
        if action not in ['ACCEPT', 'REJECT']:
            return Response({'detail': 'Action must be ACCEPT or REJECT.'}, status=status.HTTP_400_BAD_REQUEST)

        # Authorization: Doctor accepts/rejects requests sent by ClinicAdmin
        # ClinicAdmin accepts/rejects requests sent by Doctor
        if user.role == 'DOCTOR':
            if not (hasattr(user, 'doctor_profile') and user.doctor_profile == mapping.doctor):
                return Response({'detail': 'You are not authorized for this request.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'CLINIC_ADMIN':
            if mapping.clinic.owner != user:
                return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)
            if mapping.clinic.verification_status != VerificationStatus.VERIFIED:
                return Response({'detail': 'Your clinic has not been approved by Admin yet.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role != 'ADMIN':
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if action == 'ACCEPT':
            cleaned_room = (mapping.room_number or "").strip()
            if cleaned_room:
                from .services import check_room_number_conflict
                conflict = check_room_number_conflict(
                    clinic_id=mapping.clinic_id,
                    room_number=cleaned_room,
                    exclude_doctor_id=mapping.doctor_id,
                    exclude_mapping_id=mapping.id
                )
                if conflict:
                    doc_name = getattr(conflict.doctor, 'full_name', None) or "another doctor"
                    return Response({
                        'room_number': [f"Room '{cleaned_room}' is already allocated to Dr. {doc_name} at this clinic. Please allocate a different room."]
                    }, status=status.HTTP_400_BAD_REQUEST)
            mapping.status = DoctorClinicStatus.ACCEPTED
        else:
            mapping.status = DoctorClinicStatus.REJECTED

        mapping.save()
        return Response(DoctorClinicSerializer(mapping).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Doctors'])
class DoctorAssignClinicView(generics.GenericAPIView):
    """
    Legacy / Direct Assign for Admin.
    """
    serializer_class = DoctorClinicAssignmentSerializer
    permission_classes = [IsAdmin]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        doctor = get_doctor_by_id(data.get('doctor_id'))
        clinic_id = data.get('clinic_id')
        if not doctor:
            return Response({'detail': 'Doctor not found.'}, status=status.HTTP_404_NOT_FOUND)

        mapping = assign_doctor_to_clinic(
            doctor=doctor,
            clinic_id=clinic_id,
            consultation_fee=data['consultation_fee'],
            department_id=str(data['department_id']) if data.get('department_id') else None,
            room_number=data.get('room_number', ''),
            joining_date=data.get('joining_date'),
            initial_status=DoctorClinicStatus.ACCEPTED
        )
        return Response(DoctorClinicSerializer(mapping).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Doctors'])
class DoctorAssignClinicByPkView(generics.GenericAPIView):
    serializer_class = DoctorClinicAssignmentSerializer
    permission_classes = [IsAdmin]

    def post(self, request, pk, *args, **kwargs):
        doctor = get_doctor_by_id(pk)
        if not doctor:
            return Response({'detail': 'Doctor not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        clinic_id_param = request.data.get('clinic_id')
        mapping = assign_doctor_to_clinic(
            doctor=doctor,
            clinic_id=str(clinic_id_param),
            consultation_fee=data['consultation_fee'],
            department_id=str(data['department_id']) if data.get('department_id') else None,
            room_number=data.get('room_number', ''),
            joining_date=data.get('joining_date'),
            initial_status=DoctorClinicStatus.ACCEPTED
        )
        return Response(DoctorClinicSerializer(mapping).data, status=status.HTTP_200_OK)


from datetime import date
from .models import ChamberSession, ChamberSessionStatus
from .serializers import ChamberSessionSerializer, ChamberSessionUpdateSerializer

@extend_schema(tags=['Chamber Sessions'])
class ChamberSessionView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, *args, **kwargs):
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        session_date_str = request.query_params.get('date') or str(timezone.now().date())

        if not doctor_id or not clinic_id:
            return Response({'detail': 'doctor_id and clinic_id query parameters are required.'}, status=status.HTTP_400_BAD_REQUEST)

        session, created = ChamberSession.objects.get_or_create(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            session_date=session_date_str,
            defaults={'status': ChamberSessionStatus.NOT_STARTED, 'current_serial': 0}
        )
        return Response(ChamberSessionSerializer(session).data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        serializer = ChamberSessionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        action = data.get('action')

        if not user or not user.is_authenticated:
            return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)

        if user.role == 'PATIENT':
            return Response({'detail': 'Patients cannot control chamber session actions.'}, status=status.HTTP_403_FORBIDDEN)

        if user.role == 'CLINIC_ADMIN':
            clinic = Clinic.objects.filter(id=data['clinic_id'], owner=user).first()
            if not clinic:
                return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)
            if clinic.verification_status != VerificationStatus.VERIFIED:
                return Response({'detail': 'Your clinic has not been approved by Admin yet.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if not staff or str(staff.clinic_id) != str(data['clinic_id']):
                return Response({'detail': 'You do not belong to this clinic.'}, status=status.HTTP_403_FORBIDDEN)
            if action == 'COMPLETE_EMERGENCY':
                return Response({'detail': 'Receptionist cannot complete doctor consultations.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'DOCTOR':
            doc_prof = getattr(user, 'doctor_profile', None)
            is_match = (doc_prof and str(doc_prof.id) == str(data['doctor_id'])) or (user.email and Doctor.objects.filter(id=data['doctor_id'], email=user.email).exists())
            if not is_match:
                return Response({'detail': 'You are not authorized for this doctor chamber session.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role != 'ADMIN':
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        from django.db import transaction
        from django.utils import timezone
        from apps.appointments.models import Appointment, AppointmentStatus

        from datetime import datetime
        raw_date = data.get('session_date') or request.data.get('date')
        if isinstance(raw_date, str):
            try:
                session_date = datetime.strptime(raw_date, '%Y-%m-%d').date()
            except ValueError:
                session_date = timezone.now().date()
        else:
            session_date = raw_date or timezone.now().date()

        with transaction.atomic():
            session, created = ChamberSession.objects.select_for_update().get_or_create(
                doctor_id=data['doctor_id'],
                clinic_id=data['clinic_id'],
                session_date=session_date,
                defaults={'status': ChamberSessionStatus.NOT_STARTED, 'current_serial': 0}
            )
            initial_status = session.status
            initial_delay = session.delay_minutes or 0

            # Guard against calling patients before chamber slot has started today
            RESTRICTED_CALL_ACTIONS = [
                'NEXT_SERIAL',
                'COMPLETE_CURRENT',
                'SKIP_SERIAL',
                'RECALL_SERIAL',
                'SET_SERIAL',
            ]
            req_status = data.get('status')
            is_calling_or_starting = (
                action in RESTRICTED_CALL_ACTIONS or
                (req_status == ChamberSessionStatus.IN_CHAMBER and session.status == ChamberSessionStatus.NOT_STARTED)
            )

            if is_calling_or_starting:
                try:
                    from zoneinfo import ZoneInfo
                    bd_now = timezone.now().astimezone(ZoneInfo('Asia/Dhaka'))
                except Exception:
                    bd_now = timezone.localtime()

                bd_today = bd_now.date()
                bd_current_time = bd_now.time()

                if session.session_date < bd_today:
                    return Response({
                        'detail': 'Cannot conduct chamber session for a past date.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                if session.session_date > bd_today:
                    return Response({
                        'detail': f'Chamber session is scheduled for {session.session_date}. Patient calling is not permitted before that date.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                from .models import DoctorSchedule
                doc_schedules = DoctorSchedule.objects.filter(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    is_active=True
                )
                if doc_schedules.exists():
                    today_schedules = doc_schedules.filter(day_of_week=session.session_date.weekday()).order_by('start_time')
                    if not today_schedules.exists():
                        day_name = session.session_date.strftime("%A")
                        return Response({
                            'detail': f'Doctor has no scheduled chamber at this clinic on {day_name}.'
                        }, status=status.HTTP_400_BAD_REQUEST)

                    earliest_start = today_schedules.first().start_time
                    if bd_current_time < earliest_start:
                        formatted_start = earliest_start.strftime("%I:%M %p")
                        return Response({
                            'detail': f"Chamber hours have not started yet. Doctor's schedule starts at {formatted_start}."
                        }, status=status.HTTP_400_BAD_REQUEST)

            if action == 'ADMIT_EMERGENCY':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session or redirect to Emergency Room / OT.'}, status=status.HTTP_400_BAD_REQUEST)
                apt_id = data.get('appointment_id')
                if not apt_id:
                    return Response({'detail': 'appointment_id is required for ADMIT_EMERGENCY.'}, status=status.HTTP_400_BAD_REQUEST)
                apt = Appointment.objects.select_for_update().filter(id=apt_id).first()
                if not apt:
                    return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)
                if str(apt.clinic_id) != str(session.clinic_id) or str(apt.doctor_id) != str(session.doctor_id) or apt.appointment_date != session.session_date:
                    return Response({'detail': 'Emergency appointment does not match this chamber doctor, clinic, or date.'}, status=status.HTTP_400_BAD_REQUEST)
                if not apt.is_emergency:
                    return Response({'detail': 'Appointment is not marked as emergency.'}, status=status.HTTP_400_BAD_REQUEST)
                if apt.status == AppointmentStatus.CANCELLED:
                    return Response({'detail': 'Cancelled appointment cannot be admitted as emergency.'}, status=status.HTTP_400_BAD_REQUEST)
                if apt.status == AppointmentStatus.COMPLETED:
                    return Response({'detail': 'Completed appointment cannot be re-admitted.'}, status=status.HTTP_400_BAD_REQUEST)

                # Idempotent if already the active emergency
                if session.active_emergency_id == apt.id:
                    return Response(ChamberSessionSerializer(session).data, status=status.HTTP_200_OK)

                if session.active_emergency_id and session.active_emergency_id != apt.id:
                    return Response({'detail': f'Another emergency patient (Serial #{session.active_emergency.serial_number}) is already active in chamber.'}, status=status.HTTP_400_BAD_REQUEST)

                # Hold current normal patient if requested and exists
                hold_current = data.get('hold_current', True)
                if hold_current and session.current_serial > 0 and not session.held_patient_id:
                    curr_apt = Appointment.objects.filter(
                        doctor_id=session.doctor_id,
                        clinic_id=session.clinic_id,
                        appointment_date=session.session_date,
                        serial_number=session.current_serial,
                        status=AppointmentStatus.CONFIRMED,
                        is_emergency=False
                    ).first()
                    if curr_apt:
                        session.held_patient = curr_apt

                if not apt.is_arrived:
                    apt.is_arrived = True
                    apt.arrived_at = timezone.now()
                    apt.save(update_fields=['is_arrived', 'arrived_at'])

                session.active_emergency = apt
                # CORE INVARIANT: Do NOT modify session.current_serial
                if session.status in [ChamberSessionStatus.NOT_STARTED, ChamberSessionStatus.PAUSED, ChamberSessionStatus.PRAYER_BREAK]:
                    session.status = ChamberSessionStatus.IN_CHAMBER
                if not session.started_at:
                    session.started_at = timezone.now()

            elif action == 'COMPLETE_EMERGENCY':
                target_apt_id = data.get('appointment_id')
                active_apt = session.active_emergency
                if not active_apt:
                    if target_apt_id:
                        target_apt = Appointment.objects.filter(id=target_apt_id).first()
                        if target_apt and target_apt.status == AppointmentStatus.COMPLETED:
                            return Response(ChamberSessionSerializer(session).data, status=status.HTTP_200_OK)
                    return Response({'detail': 'No active emergency in chamber to complete.'}, status=status.HTTP_400_BAD_REQUEST)
                if target_apt_id and str(active_apt.id) != str(target_apt_id):
                    return Response({'detail': 'Specified appointment does not match the active emergency in chamber.'}, status=status.HTTP_400_BAD_REQUEST)

                from apps.appointments.services import complete_appointment
                complete_appointment(appointment=active_apt)
                session.active_emergency = None
                # CORE INVARIANT: Do NOT modify session.current_serial
                # Preserve held_patient until explicitly resumed

            elif action == 'RESUME_HELD':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session before resuming held patients.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.active_emergency_id:
                    return Response({'detail': 'Cannot resume held patient while emergency is actively in chamber.'}, status=status.HTTP_400_BAD_REQUEST)
                if not session.held_patient_id:
                    return Response({'detail': 'No held patient to resume.'}, status=status.HTTP_400_BAD_REQUEST)
                session.held_patient = None
                if session.status in [ChamberSessionStatus.NOT_STARTED, ChamberSessionStatus.PAUSED, ChamberSessionStatus.PRAYER_BREAK]:
                    session.status = ChamberSessionStatus.IN_CHAMBER

            elif action == 'NEXT_SERIAL':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session before performing queue actions.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.status == ChamberSessionStatus.PRAYER_BREAK:
                    return Response({'detail': 'Chamber is on Prayer Break. Please resume session to In Chamber before advancing queue.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.active_emergency_id:
                    return Response({'detail': 'Cannot advance queue while emergency consultation is active.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.held_patient_id:
                    return Response({'detail': f'Patient #{session.held_patient.serial_number} is currently held. Please resume held patient before advancing.'}, status=status.HTTP_400_BAD_REQUEST)

                # Clinical safety: Current serving patient must have a digital prescription before advancing
                if session.current_serial > 0:
                    curr_serving_apt = Appointment.objects.filter(
                        doctor_id=session.doctor_id,
                        clinic_id=session.clinic_id,
                        appointment_date=session.session_date,
                        serial_number=session.current_serial,
                        is_emergency=False,
                    ).first()
                    if curr_serving_apt and curr_serving_apt.status not in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
                        from apps.prescriptions.models import Prescription
                        if not Prescription.objects.filter(appointment=curr_serving_apt).exists():
                            p_name = getattr(curr_serving_apt.patient, "full_name", None) or f"{curr_serving_apt.patient.first_name} {curr_serving_apt.patient.last_name}".strip() or f"Patient #{curr_serving_apt.serial_number}"
                            return Response({
                                'detail': f"Please issue a digital prescription for Serial #{session.current_serial} ({p_name}) before calling the next patient."
                            }, status=status.HTTP_400_BAD_REQUEST)

                skipped = list(session.skipped_serials or [])
                next_apt = Appointment.objects.filter(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    appointment_date=session.session_date,
                    serial_number__gt=session.current_serial,
                    is_emergency=False,
                    status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]
                ).exclude(
                    serial_number__in=skipped
                ).order_by('serial_number').first()

                if next_apt:
                    # Auto-complete previous normal appointment if it was in chamber and confirmed
                    if session.current_serial > 0 and session.current_serial != next_apt.serial_number:
                        from apps.appointments.services import complete_appointment
                        prev_serving_apt = Appointment.objects.filter(
                            doctor_id=session.doctor_id,
                            clinic_id=session.clinic_id,
                            appointment_date=session.session_date,
                            serial_number=session.current_serial,
                            is_emergency=False,
                        ).exclude(status__in=[AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]).first()
                        if prev_serving_apt:
                            try:
                                complete_appointment(appointment=prev_serving_apt)
                            except Exception:
                                prev_serving_apt.status = AppointmentStatus.COMPLETED
                                prev_serving_apt.save(update_fields=['status'])

                    session.current_serial = next_apt.serial_number
                    if session.status in [ChamberSessionStatus.NOT_STARTED, ChamberSessionStatus.PAUSED]:
                        session.status = ChamberSessionStatus.IN_CHAMBER
                    if not session.started_at:
                        session.started_at = timezone.now()
                else:
                    # Do NOT use current_serial += 1
                    # No eligible normal next patient
                    pass

            elif action == 'COMPLETE_CURRENT':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session before performing queue actions.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.active_emergency_id:
                    return Response({'detail': 'Cannot complete normal patient while emergency consultation is active. Use COMPLETE_EMERGENCY.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.held_patient_id:
                    return Response({'detail': 'A patient is currently held. Please resume held patient before completing.'}, status=status.HTTP_400_BAD_REQUEST)

                if session.current_serial > 0:
                    curr_apt = Appointment.objects.filter(
                        doctor_id=session.doctor_id,
                        clinic_id=session.clinic_id,
                        appointment_date=session.session_date,
                        serial_number=session.current_serial,
                        is_emergency=False,
                    ).first()
                    if curr_apt and curr_apt.status not in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
                        from apps.prescriptions.models import Prescription
                        if not Prescription.objects.filter(appointment=curr_apt).exists():
                            p_name = getattr(curr_apt.patient, "full_name", None) or f"{curr_apt.patient.first_name} {curr_apt.patient.last_name}".strip() or f"Patient #{curr_apt.serial_number}"
                            return Response({
                                'detail': f"Please issue a digital prescription for Serial #{session.current_serial} ({p_name}) before completing consultation."
                            }, status=status.HTTP_400_BAD_REQUEST)

                    from apps.appointments.services import complete_appointment
                    if curr_apt and curr_apt.status not in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
                        try:
                            complete_appointment(appointment=curr_apt)
                        except Exception:
                            curr_apt.status = AppointmentStatus.COMPLETED
                            curr_apt.save(update_fields=['status'])

                skipped = list(session.skipped_serials or [])
                next_apt = Appointment.objects.filter(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    appointment_date=session.session_date,
                    serial_number__gt=session.current_serial,
                    is_emergency=False,
                    status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]
                ).exclude(
                    serial_number__in=skipped
                ).order_by('serial_number').first()

                if next_apt:
                    session.current_serial = next_apt.serial_number
                    if session.status in [ChamberSessionStatus.NOT_STARTED, ChamberSessionStatus.PAUSED]:
                        session.status = ChamberSessionStatus.IN_CHAMBER
                    if not session.started_at:
                        session.started_at = timezone.now()

            elif action == 'PREV_SERIAL':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session before performing queue actions.'}, status=status.HTTP_400_BAD_REQUEST)
                prev_apt = Appointment.objects.filter(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    appointment_date=session.session_date,
                    serial_number__lt=session.current_serial,
                    is_emergency=False
                ).order_by('-serial_number').first()
                if prev_apt:
                    session.current_serial = prev_apt.serial_number
                elif session.current_serial > 0:
                    session.current_serial = 0

            elif action == 'SET_SERIAL':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session before setting serial.'}, status=status.HTTP_400_BAD_REQUEST)
                if 'current_serial' in data:
                    session.current_serial = data['current_serial']

            elif action == 'SKIP_SERIAL':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session before skipping serials.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.status == ChamberSessionStatus.PRAYER_BREAK:
                    return Response({'detail': 'Chamber is on Prayer Break. Please resume session to In Chamber before skipping serials.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.active_emergency_id:
                    return Response({'detail': 'Cannot skip serial while emergency consultation is active.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.held_patient_id:
                    return Response({'detail': 'Cannot skip serial while a patient is currently held.'}, status=status.HTTP_400_BAD_REQUEST)

                skipped = list(session.skipped_serials or [])
                next_apt = Appointment.objects.filter(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    appointment_date=session.session_date,
                    serial_number__gt=session.current_serial,
                    is_emergency=False,
                    status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]
                ).exclude(
                    serial_number__in=skipped
                ).order_by('serial_number').first()

                if not next_apt:
                    return Response({'detail': 'No waiting patients left in queue to skip to.'}, status=status.HTTP_400_BAD_REQUEST)

                if session.current_serial > 0 and session.current_serial not in skipped:
                    skipped.append(session.current_serial)
                session.skipped_serials = skipped
                session.current_serial = next_apt.serial_number

            elif action == 'RECALL_SERIAL':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session before recalling serials.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.active_emergency_id:
                    return Response({'detail': 'Cannot recall serial while emergency consultation is active.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.held_patient_id:
                    return Response({'detail': 'A patient is currently held. Please resume held patient before recalling.'}, status=status.HTTP_400_BAD_REQUEST)

                # Clinical safety: Ensure active patient is completed, prescribed, or skipped before recalling
                if session.current_serial > 0:
                    curr_apt = Appointment.objects.filter(
                        doctor_id=session.doctor_id,
                        clinic_id=session.clinic_id,
                        appointment_date=session.session_date,
                        serial_number=session.current_serial,
                        is_emergency=False,
                    ).first()
                    if curr_apt and curr_apt.status not in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED] and curr_apt.serial_number not in (session.skipped_serials or []):
                        from apps.prescriptions.models import Prescription
                        if not Prescription.objects.filter(appointment=curr_apt).exists():
                            p_name = getattr(curr_apt.patient, 'full_name', None) or f"{curr_apt.patient.first_name} {curr_apt.patient.last_name}".strip() or f"Patient #{curr_apt.serial_number}"
                            return Response({
                                'detail': f"Serial #{session.current_serial} ({p_name}) is currently in chamber. Please prescribe or skip them before recalling another serial."
                            }, status=status.HTTP_400_BAD_REQUEST)
                        else:
                            from apps.appointments.services import complete_appointment
                            try:
                                complete_appointment(appointment=curr_apt)
                            except Exception:
                                curr_apt.status = AppointmentStatus.COMPLETED
                                curr_apt.save(update_fields=['status'])

                target = data.get('current_serial')
                if target is not None:
                    session.current_serial = target
                    skipped = [s for s in (session.skipped_serials or []) if s != target]
                    session.skipped_serials = skipped
                    if session.status in [ChamberSessionStatus.NOT_STARTED, ChamberSessionStatus.PAUSED]:
                        session.status = ChamberSessionStatus.IN_CHAMBER
                    if not session.started_at:
                        session.started_at = timezone.now()

            elif action == 'RESET':
                if session.status == ChamberSessionStatus.ENDED:
                    return Response({'detail': 'Chamber session has ended. Reopen the session before resetting queue.'}, status=status.HTTP_400_BAD_REQUEST)
                if session.active_emergency_id or session.held_patient_id:
                    return Response({'detail': 'Cannot reset chamber session while an emergency or held patient is active.'}, status=status.HTTP_400_BAD_REQUEST)
                session.current_serial = 0
                session.status = ChamberSessionStatus.NOT_STARTED
                session.skipped_serials = []
                session.delay_minutes = 0
                session.announcement_note = ''

            # Apply specific fields
            if 'status' in data and data['status']:
                new_status = data['status']
                if session.status == ChamberSessionStatus.ENDED and new_status != ChamberSessionStatus.ENDED:
                    if new_status != ChamberSessionStatus.IN_CHAMBER:
                        return Response({
                            'detail': f'Cannot transition from ENDED to {new_status}. Reopen the session to IN_CHAMBER first.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                if new_status in [ChamberSessionStatus.PAUSED, ChamberSessionStatus.PRAYER_BREAK] and session.active_emergency_id:
                    return Response({'detail': 'Cannot pause chamber or take prayer break while an emergency patient is actively inside the chamber.'}, status=status.HTTP_400_BAD_REQUEST)
                if new_status == ChamberSessionStatus.ENDED and (session.active_emergency_id or session.held_patient_id):
                    return Response({'detail': 'Cannot end chamber session while an emergency or held patient is active.'}, status=status.HTTP_400_BAD_REQUEST)
                if new_status == ChamberSessionStatus.IN_CHAMBER and session.status == ChamberSessionStatus.ENDED:
                    session.ended_at = None
                session.status = new_status
                if session.status == ChamberSessionStatus.IN_CHAMBER and not session.started_at:
                    session.started_at = timezone.now()
                elif session.status == ChamberSessionStatus.ENDED:
                    session.ended_at = timezone.now()

            old_delay = session.delay_minutes or 0
            if 'delay_minutes' in data:
                session.delay_minutes = data['delay_minutes']

            if 'announcement_note' in data:
                session.announcement_note = data['announcement_note']

            if 'room_number' in data and data['room_number']:
                cleaned_room = str(data['room_number']).strip()
                if cleaned_room:
                    from .services import normalize_room_number
                    norm_room = normalize_room_number(cleaned_room)
                    clashing_sess = ChamberSession.objects.filter(
                        clinic_id=session.clinic_id,
                        session_date=session.session_date,
                        is_active=True
                    ).exclude(id=session.id).exclude(status=ChamberSessionStatus.ENDED).select_related('doctor')
                    for cs in clashing_sess:
                        if normalize_room_number(cs.room_number) == norm_room:
                            doc_name = getattr(cs.doctor, 'full_name', None) or "another doctor"
                            raise ValidationError({
                                'room_number': f"Room '{cleaned_room}' is currently occupied by Dr. {doc_name} today."
                            })
                session.room_number = cleaned_room

            if 'estimated_mins_per_patient' in data:
                session.estimated_mins_per_patient = data['estimated_mins_per_patient']

            session.save()

        # Proximity Alert Trigger: When serial advances or is set, alert patients who are 3 eligible normal serials ahead
        if action in ['NEXT_SERIAL', 'SET_SERIAL', 'SKIP_SERIAL'] and session.current_serial > 0:
            try:
                from apps.notifications.sms_service import send_sms_notification
                from apps.notifications.models import Notification, NotificationType
                from apps.appointments.services import format_doctor_display_name

                waiting_normal_apts = list(Appointment.objects.filter(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    appointment_date=session.session_date,
                    serial_number__gt=session.current_serial,
                    is_emergency=False,
                    status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]
                ).exclude(
                    serial_number__in=(session.skipped_serials or [])
                ).select_related('patient', 'family_member', 'doctor', 'clinic').order_by('serial_number')[:3])

                if len(waiting_normal_apts) >= 3:
                    target_apt = waiting_normal_apts[2]  # The 3rd patient ahead
                    already_sent = Notification.objects.filter(
                        recipient=target_apt.patient,
                        notification_type=NotificationType.SERIAL_PROXIMITY_ALERT,
                        created_at__date=session.session_date,
                        message__contains=f"#{target_apt.serial_number}"
                    ).exists()
                    if not already_sent:
                        patient_name = target_apt.family_member.full_name if target_apt.family_member else f"{target_apt.patient.first_name} {target_apt.patient.last_name}".strip()
                        doc_display = format_doctor_display_name(target_apt.doctor)
                        msg = (
                            f"Dear {patient_name}, Serial #{session.current_serial} is now in chamber with {doc_display}. "
                            f"Your Serial is #{target_apt.serial_number} (3 patients away). "
                            f"Please be near {session.room_number or 'the chamber door'}."
                        )
                        send_sms_notification(
                            recipient=target_apt.patient,
                            title="Your Serial is Approaching ⏳",
                            message=msg,
                            notification_type=NotificationType.SERIAL_PROXIMITY_ALERT,
                            phone=target_apt.patient.phone
                        )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Proximity SMS dispatch error: {e}")

        # Delay Broadcast Trigger: Only when delay_minutes is newly increased (> 0 and changed from initial_delay)
        new_delay = session.delay_minutes or 0
        if new_delay > 0 and new_delay != initial_delay and ('delay_minutes' in data or action in ['UPDATE_STATUS', 'UPDATE_DELAY']):
            try:
                from apps.appointments.models import Appointment, AppointmentStatus
                from apps.appointments.services import format_doctor_display_name
                from apps.notifications.sms_service import send_sms_notification
                from apps.notifications.models import NotificationType

                pending_apts = Appointment.objects.filter(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    appointment_date=session.session_date,
                    serial_number__gt=session.current_serial,
                    status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]
                ).select_related('patient', 'family_member', 'doctor', 'clinic')

                note = data.get('announcement_note') or session.announcement_note or 'Traffic/Clinical Emergency'

                for apt in pending_apts:
                    patient_name = apt.family_member.full_name if apt.family_member else f"{apt.patient.first_name} {apt.patient.last_name}".strip()
                    doc_display = format_doctor_display_name(apt.doctor)
                    send_sms_notification(
                        recipient=apt.patient,
                        title=f"Chamber Delay Notice ({new_delay}m) ⚠️",
                        message=(
                            f"Dear {patient_name}, {doc_display} at {apt.clinic.name} is running {new_delay}m delayed ({note}). "
                            f"Your serial is #{apt.serial_number}. You can track live queue on your phone."
                        ),
                        notification_type=NotificationType.SYSTEM,
                        phone=apt.patient.phone
                    )
            except Exception:
                pass  # Non-blocking SMS dispatch

        # Early Chamber End: Auto-rollover unserved patients to next chamber day
        if session.status == ChamberSessionStatus.ENDED and initial_status != ChamberSessionStatus.ENDED:
            try:
                from apps.appointments.services import rollover_unserved_appointments
                rollover_unserved_appointments(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    session_date=session.session_date,
                    requested_by_user=request.user
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Chamber end auto-rollover: {e}")

        # Chamber Reopen: Revert rolled over patients back to today and re-align target day serials
        if initial_status == ChamberSessionStatus.ENDED and session.status == ChamberSessionStatus.IN_CHAMBER:
            try:
                from apps.appointments.services import revert_session_rollover
                revert_session_rollover(
                    doctor_id=session.doctor_id,
                    clinic_id=session.clinic_id,
                    session_date=session.session_date
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Chamber reopen auto-revert: {e}")

        return Response(ChamberSessionSerializer(session).data, status=status.HTTP_200_OK)




@extend_schema(tags=['Doctors'])
class DoctorScheduleView(APIView):
    """
    GET  /api/v1/doctors/schedule/?doctor_id=X&clinic_id=Y  -> List schedules
    POST /api/v1/doctors/schedule/                           -> Create/Update schedule entry
    DELETE /api/v1/doctors/schedule/<id>/                   -> Remove a schedule entry
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        qs = DoctorSchedule.objects.filter(is_active=True)
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)

        # Doctor can also fetch own schedule
        if not doctor_id and hasattr(request.user, 'doctor_profile') and request.user.doctor_profile:
            qs = qs.filter(doctor=request.user.doctor_profile)

        return Response(DoctorScheduleSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        # Upsert: create or update schedule for doctor/clinic/day_of_week
        serializer = DoctorScheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        schedule = DoctorSchedule.all_objects.filter(
            doctor=data['doctor'],
            clinic=data['clinic'],
            day_of_week=data['day_of_week']
        ).first()

        if schedule:
            schedule.start_time = data['start_time']
            schedule.end_time = data['end_time']
            schedule.slot_duration_minutes = data.get('slot_duration_minutes', 15)
            schedule.max_patients = data.get('max_patients', 20)
            schedule.is_active = data.get('is_active', True)
            schedule.is_deleted = False
            schedule.save()
            created = False
        else:
            schedule = DoctorSchedule.objects.create(
                doctor=data['doctor'],
                clinic=data['clinic'],
                day_of_week=data['day_of_week'],
                start_time=data['start_time'],
                end_time=data['end_time'],
                slot_duration_minutes=data.get('slot_duration_minutes', 15),
                max_patients=data.get('max_patients', 20),
                is_active=data.get('is_active', True),
            )
            created = True

        return Response(
            DoctorScheduleSerializer(schedule).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    def delete(self, request, pk=None, *args, **kwargs):
        try:
            schedule = DoctorSchedule.objects.get(pk=pk)
            schedule.is_active = False
            schedule.save(update_fields=['is_active', 'updated_at'])
            return Response({'detail': 'Schedule entry deactivated.'}, status=status.HTTP_200_OK)
        except DoctorSchedule.DoesNotExist:
            return Response({'detail': 'Schedule not found.'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=['Doctors'])
class DoctorAvailabilityView(APIView):
    """
    GET /api/v1/doctors/availability/?doctor_id=X&clinic_id=Y&date=YYYY-MM-DD
    Returns available time slots for a doctor at a clinic on a given date.
    Also returns available_days (weekday numbers), leave status, schedule, and live chamber session.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        from datetime import datetime, date as dt_date, timedelta
        from django.utils import timezone
        from django.db.models import Q
        from apps.appointments.models import Appointment, AppointmentStatus
        from apps.doctors.models import DoctorClinic, DoctorLeave, ChamberSession

        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        date_str = request.query_params.get('date')

        # Auto-detect doctor_id for authenticated doctor user
        if not doctor_id and request.user.is_authenticated:
            if hasattr(request.user, 'doctor_profile'):
                doctor_id = str(request.user.doctor_profile.id)
            elif request.user.role == 'DOCTOR':
                doc = Doctor.objects.filter(email=request.user.email).first()
                if doc:
                    doctor_id = str(doc.id)

        # Auto-detect clinic_id if doctor has only one active clinic
        if doctor_id and not clinic_id:
            active_clinics = DoctorClinic.objects.filter(doctor_id=doctor_id, is_active=True)
            if active_clinics.count() == 1:
                clinic_id = str(active_clinics.first().clinic_id)

        if not (doctor_id and clinic_id):
            return Response({'detail': 'doctor_id and clinic_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Return list of active scheduled days (weekday numbers: 0=Mon, 6=Sun)
        schedules = list(
            DoctorSchedule.objects.filter(
                doctor_id=doctor_id, clinic_id=clinic_id, is_active=True
            ).order_by('day_of_week')
        )
        available_days = [s.day_of_week for s in schedules]
        schedules_by_day = {s.day_of_week: s for s in schedules}
        weekly_schedules = DoctorScheduleSerializer(schedules, many=True).data

        today = timezone.localdate()
        now_time_str_today = timezone.localtime().strftime('%H:%M')

        # Auto-release any abandoned online payment holds before computing slot availability
        from apps.appointments.services import release_expired_online_holds
        release_expired_online_holds(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
        )

        # Build 30-day upcoming_days summary in 2 bulk queries (zero N+1)
        window_end = today + timedelta(days=29)
        window_leaves = list(
            DoctorLeave.objects.filter(
                doctor_id=doctor_id,
                start_date__lte=window_end,
                end_date__gte=today,
                is_approved=True
            ).filter(Q(clinic_id=clinic_id) | Q(clinic__isnull=True))
        )
        window_apts = Appointment.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            appointment_date__range=(today, window_end),
            status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]
        ).values_list('appointment_date', 'appointment_time')

        booked_by_date = {}
        for apt_date, apt_time in window_apts:
            t_str = apt_time.strftime('%H:%M') if hasattr(apt_time, 'strftime') else str(apt_time)[:5]
            booked_by_date.setdefault(apt_date, set()).add(t_str)

        upcoming_days = []
        next_available_date = None

        for offset in range(30):
            d = today + timedelta(days=offset)
            d_str = d.strftime('%Y-%m-%d')
            day_leave = next((lv for lv in window_leaves if lv.start_date <= d <= lv.end_date), None)
            day_sched = schedules_by_day.get(d.weekday())

            if day_leave:
                upcoming_days.append({
                    'date': d_str,
                    'day_of_week': d.weekday(),
                    'status': 'ON_LEAVE',
                    'available_count': 0,
                    'total_slots': 0,
                    'leave_reason': day_leave.reason or 'Scheduled Leave',
                    'start_time': None,
                    'end_time': None,
                })
            elif not day_sched:
                upcoming_days.append({
                    'date': d_str,
                    'day_of_week': d.weekday(),
                    'status': 'OFF',
                    'available_count': 0,
                    'total_slots': 0,
                    'leave_reason': None,
                    'start_time': None,
                    'end_time': None,
                })
            else:
                s_mins = day_sched.slot_duration_minutes or 15
                d_slots = []
                cur_dt = datetime.combine(d, day_sched.start_time)
                end_dt = datetime.combine(d, day_sched.end_time)
                while cur_dt < end_dt:
                    d_slots.append(cur_dt.strftime('%H:%M'))
                    cur_dt += timedelta(minutes=s_mins)

                d_booked = booked_by_date.get(d, set())
                d_max = day_sched.max_patients or len(d_slots)
                if len(d_booked) >= d_max:
                    open_cnt = 0
                else:
                    open_cnt = sum(
                        1 for sl in d_slots
                        if (sl not in d_booked) and not (d == today and sl <= now_time_str_today)
                    )
                    # Also cap open_cnt by remaining max_patients capacity
                    open_cnt = min(open_cnt, max(0, d_max - len(d_booked)))

                d_status = 'AVAILABLE' if open_cnt > 0 else 'FULL'
                if d_status == 'AVAILABLE' and not next_available_date:
                    next_available_date = d_str

                upcoming_days.append({
                    'date': d_str,
                    'day_of_week': d.weekday(),
                    'status': d_status,
                    'available_count': open_cnt,
                    'total_slots': len(d_slots),
                    'leave_reason': None,
                    'start_time': day_sched.start_time.strftime('%H:%M'),
                    'end_time': day_sched.end_time.strftime('%H:%M'),
                })

        if not date_str:
            return Response({
                'available_days': available_days,
                'weekly_schedules': weekly_schedules,
                'upcoming_days': upcoming_days,
                'next_available_date': next_available_date,
                'slots': [],
                'schedule': None,
                'is_on_leave': False,
                'message': 'Please select a date to view available time slots.'
            })

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Past date check
        if target_date < today:
            return Response({
                'available_days': available_days,
                'weekly_schedules': weekly_schedules,
                'upcoming_days': upcoming_days,
                'next_available_date': next_available_date,
                'slots': [],
                'schedule': None,
                'is_on_leave': False,
                'message': 'Cannot view or book appointments for past dates.'
            })

        # 2. Advance booking window check (30 days)
        if target_date > today + timedelta(days=30):
            return Response({
                'available_days': available_days,
                'weekly_schedules': weekly_schedules,
                'upcoming_days': upcoming_days,
                'next_available_date': next_available_date,
                'slots': [],
                'schedule': None,
                'is_on_leave': False,
                'message': 'Appointments can only be booked up to 30 days in advance.'
            })

        # 3. Doctor Leave check
        on_leave = DoctorLeave.objects.filter(
            doctor_id=doctor_id,
            start_date__lte=target_date,
            end_date__gte=target_date,
            is_approved=True
        ).filter(Q(clinic_id=clinic_id) | Q(clinic__isnull=True)).first()

        if on_leave:
            return Response({
                'available_days': available_days,
                'weekly_schedules': weekly_schedules,
                'upcoming_days': upcoming_days,
                'next_available_date': next_available_date,
                'schedule': None,
                'slots': [],
                'is_on_leave': True,
                'leave_reason': on_leave.reason or 'Scheduled Leave',
                'total_slots': 0,
                'booked_count': 0,
                'available_count': 0,
                'message': f"Doctor is on scheduled leave on {target_date} ({on_leave.reason or 'Leave'})."
            })

        # 4. Schedule lookup
        day_num = target_date.weekday()
        schedule = schedules_by_day.get(day_num)
        if not schedule:
            return Response({
                'available_days': available_days,
                'weekly_schedules': weekly_schedules,
                'upcoming_days': upcoming_days,
                'next_available_date': next_available_date,
                'slots': [],
                'schedule': None,
                'is_on_leave': False,
                'message': f"Doctor has no scheduled chamber at this clinic on {target_date.strftime('%A')}."
            })

        # Generate all time slots from schedule
        slot_minutes = schedule.slot_duration_minutes or 15
        slots = []
        current = datetime.combine(target_date, schedule.start_time)
        end = datetime.combine(target_date, schedule.end_time)
        while current < end:
            slots.append(current.strftime('%H:%M'))
            current += timedelta(minutes=slot_minutes)

        # Get already-booked times for this doctor/clinic/date
        booked_time_strs = booked_by_date.get(target_date, set())

        # Check max capacity
        max_patients = schedule.max_patients or len(slots)
        is_capacity_full = len(booked_time_strs) >= max_patients

        # Chamber session info (if any on target_date)
        chamber_info = None
        delay_mins = 0
        session = ChamberSession.objects.filter(
            doctor_id=doctor_id, clinic_id=clinic_id, session_date=target_date
        ).first()
        if session:
            delay_mins = session.delay_minutes or 0
            chamber_info = {
                'status': session.status,
                'current_serial': session.current_serial,
                'delay_minutes': delay_mins,
                'announcement_note': session.announcement_note,
                'room_number': session.room_number,
                'estimated_wait_minutes': max(0, (session.current_serial * (session.estimated_mins_per_patient or 10)) + delay_mins)
            }

        # Current time cutoff for today
        now_time_str = now_time_str_today if target_date == today else None

        slot_data = []
        for slot in slots:
            is_booked = slot in booked_time_strs
            is_past = (target_date == today and slot <= now_time_str) if now_time_str else False
            is_available = (not is_booked) and (not is_past) and (not is_capacity_full)

            unavail_reason = None
            if is_booked:
                unavail_reason = "Booked"
            elif is_past:
                unavail_reason = "Time elapsed"
            elif is_capacity_full:
                unavail_reason = "Capacity full"

            estimated_time = slot
            if delay_mins > 0:
                slot_dt = datetime.strptime(slot, '%H:%M') + timedelta(minutes=delay_mins)
                estimated_time = slot_dt.strftime('%H:%M')

            slot_data.append({
                'time': slot,
                'estimated_time': estimated_time,
                'available': is_available,
                'reason': unavail_reason
            })

        # Next serial preview
        from django.db.models import Max
        max_serial = Appointment.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            appointment_date=target_date
        ).exclude(status=AppointmentStatus.CANCELLED).aggregate(m=Max('serial_number'))['m'] or 0
        next_serial = max_serial + 1

        # Build session ranges (Morning < 12:00, Afternoon 12:00-17:00, Evening >= 17:00)
        morning_slots = [s for s in slot_data if int(s['time'].split(':')[0]) < 12]
        afternoon_slots = [s for s in slot_data if 12 <= int(s['time'].split(':')[0]) < 17]
        evening_slots = [s for s in slot_data if int(s['time'].split(':')[0]) >= 17]

        sessions_data = []
        if morning_slots:
            sessions_data.append({
                'id': 'morning',
                'name': 'Morning Shift',
                'name_bn': 'সকালের শিফট',
                'start_time': morning_slots[0]['time'],
                'end_time': morning_slots[-1]['time'],
                'total_slots': len(morning_slots),
                'available_count': sum(1 for s in morning_slots if s['available']),
                'first_available_time': next((s['time'] for s in morning_slots if s['available']), None),
            })
        if afternoon_slots:
            sessions_data.append({
                'id': 'afternoon',
                'name': 'Afternoon Shift',
                'name_bn': 'দুপুরের শিফট',
                'start_time': afternoon_slots[0]['time'],
                'end_time': afternoon_slots[-1]['time'],
                'total_slots': len(afternoon_slots),
                'available_count': sum(1 for s in afternoon_slots if s['available']),
                'first_available_time': next((s['time'] for s in afternoon_slots if s['available']), None),
            })
        if evening_slots:
            sessions_data.append({
                'id': 'evening',
                'name': 'Evening Shift',
                'name_bn': 'সন্ধ্যার শিফট',
                'start_time': evening_slots[0]['time'],
                'end_time': evening_slots[-1]['time'],
                'total_slots': len(evening_slots),
                'available_count': sum(1 for s in evening_slots if s['available']),
                'first_available_time': next((s['time'] for s in evening_slots if s['available']), None),
            })

        return Response({
            'available_days': available_days,
            'weekly_schedules': weekly_schedules,
            'upcoming_days': upcoming_days,
            'next_available_date': next_available_date,
            'schedule': DoctorScheduleSerializer(schedule).data,
            'slots': slot_data,
            'sessions': sessions_data,
            'next_serial': next_serial,
            'total_slots': len(slots),
            'booked_count': len(booked_time_strs),
            'available_count': sum(1 for s in slot_data if s['available']),
            'max_patients': max_patients,
            'is_capacity_full': is_capacity_full,
            'is_on_leave': False,
            'delay_minutes': delay_mins,
            'chamber_session': chamber_info,
            'message': f"Maximum capacity reached ({max_patients} patients)." if is_capacity_full else ""
        })


@extend_schema(tags=['Doctors'])
class DoctorLeaveView(APIView):
    """
    GET    /api/v1/doctors/leaves/?doctor_id=X&clinic_id=Y -> List doctor leaves
    POST   /api/v1/doctors/leaves/                         -> Create doctor leave & auto-alert pre-booked patients
    DELETE /api/v1/doctors/leaves/<pk>/                    -> Delete/cancel a doctor leave
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from .models import DoctorLeave
        from .serializers import DoctorLeaveSerializer

        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')

        qs = DoctorLeave.objects.select_related('doctor', 'clinic').all()
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        elif hasattr(request.user, 'doctor_profile'):
            qs = qs.filter(doctor=request.user.doctor_profile)

        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)

        return Response(DoctorLeaveSerializer(qs, many=True).data)

    def post(self, request, *args, **kwargs):
        from datetime import datetime
        from .services import create_doctor_leave
        from .serializers import DoctorLeaveSerializer

        user = request.user
        doctor_id = request.data.get('doctor_id') or request.data.get('doctor')
        clinic_id = request.data.get('clinic_id') or request.data.get('clinic')
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date') or start_date_str
        reason = request.data.get('reason', '')
        cancel_existing = bool(request.data.get('cancel_existing', False))

        if user.role == 'DOCTOR':
            doc_prof = getattr(user, 'doctor_profile', None)
            if not doc_prof:
                doc_prof = Doctor.objects.filter(email=user.email).first()
            if not doc_prof:
                return Response({'detail': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)
            doctor_id = str(doc_prof.id)
        elif user.role == 'CLINIC_ADMIN':
            if clinic_id and not Clinic.objects.filter(id=clinic_id, owner=user).exists():
                return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'RECEPTIONIST':
            staff = getattr(user, 'staff_profile', None)
            if not staff or (clinic_id and str(staff.clinic_id) != str(clinic_id)):
                return Response({'detail': 'You do not belong to this clinic.'}, status=status.HTTP_403_FORBIDDEN)
            clinic_id = str(staff.clinic_id)
        elif user.role != 'ADMIN':
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if not doctor_id or not start_date_str:
            return Response({'detail': 'doctor_id and start_date are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_dt = datetime.strptime(str(start_date_str), '%Y-%m-%d').date()
            end_dt = datetime.strptime(str(end_date_str), '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        leave = create_doctor_leave(
            doctor_id=str(doctor_id),
            clinic_id=str(clinic_id) if clinic_id else None,
            start_date=start_dt,
            end_date=end_dt,
            reason=reason,
            is_approved=True,
            cancel_existing=cancel_existing
        )
        return Response(DoctorLeaveSerializer(leave).data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk=None, *args, **kwargs):
        from .models import DoctorLeave
        if not pk:
            return Response({'detail': 'Leave ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            leave = DoctorLeave.objects.get(pk=pk)
            leave.delete()
            return Response({'detail': 'Leave deleted.'}, status=status.HTTP_200_OK)
        except DoctorLeave.DoesNotExist:
            return Response({'detail': 'Leave not found.'}, status=status.HTTP_404_NOT_FOUND)


