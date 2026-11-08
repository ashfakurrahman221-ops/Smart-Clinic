import math
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from apps.accounts.permissions import IsAdmin, IsClinicAdminOrAdmin
from .models import Department, Clinic, VerificationStatus, ClinicService, Announcement
from .serializers import (
    DepartmentSerializer,
    ClinicSerializer,
    ClinicCreateUpdateSerializer,
    ClinicDepartmentSerializer,
    ClinicServiceSerializer,
    AnnouncementSerializer,
)
from .selectors import list_departments, list_clinics, get_clinic_by_id
from .services import create_department, create_clinic, add_department_to_clinic


def haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """Return the great-circle distance in km between two lat/lon points."""
    R = 6371  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@extend_schema(tags=['Departments'])
class DepartmentListCreateView(generics.ListCreateAPIView):
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return list_departments()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        dept = create_department(**serializer.validated_data)
        serializer.instance = dept


@extend_schema(tags=['Clinics'])
class ClinicListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ClinicCreateUpdateSerializer
        return ClinicSerializer

    def get_queryset(self):
        city = self.request.query_params.get('city')
        search = self.request.query_params.get('search')
        department_id = self.request.query_params.get('department_id')
        division_id = self.request.query_params.get('division_id')
        district_id = self.request.query_params.get('district_id')
        upazila_id = self.request.query_params.get('upazila_id')
        verification_status = self.request.query_params.get('verification_status')
        user = self.request.user

        # STRICT: Only system ADMIN can see all unverified clinics!
        # ClinicAdmin can see verified clinics PLUS their own clinic.
        # Patients, doctors, and public ONLY see verified clinics!
        only_verified = True
        if user and user.is_authenticated and user.role == 'ADMIN':
            only_verified = False

        if user and user.is_authenticated and user.role == 'CLINIC_ADMIN':
            from django.db.models import Q
            qs = Clinic.objects.filter(is_active=True).filter(
                Q(verification_status=VerificationStatus.VERIFIED) | Q(owner=user)
            ).select_related('owner').prefetch_related('departments')
            if search:
                import difflib
                words = [w for w in search.strip().split() if len(w) >= 2]
                if words:
                    strict_qs = qs
                    for w in words:
                        strict_qs = strict_qs.filter(
                            Q(name__icontains=w) | Q(city__icontains=w) | Q(address__icontains=w)
                        )
                    if strict_qs.exists():
                        qs = strict_qs
                    else:
                        flex_q = Q()
                        for w in words:
                            flex_q |= Q(name__icontains=w) | Q(city__icontains=w) | Q(address__icontains=w)
                        flex_qs = qs.filter(flex_q)
                        if flex_qs.exists():
                            qs = flex_qs
            if city:
                if city.strip().lower() == 'mymensingh':
                    qs = qs.filter(city__in=['Mymensingh', 'Sherpur', 'mymensingh', 'sherpur'])
                else:
                    qs = qs.filter(city__iexact=city)
            if department_id:
                qs = qs.filter(departments__id=department_id)
            if division_id:
                qs = qs.filter(division_id=division_id)
            if district_id:
                qs = qs.filter(district_id=district_id)
            if upazila_id:
                qs = qs.filter(upazila_id=upazila_id)
            return qs

        qs = list_clinics(
            city=city,
            department_id=department_id,
            division_id=division_id,
            district_id=district_id,
            upazila_id=upazila_id,
            search=search,
            only_verified=only_verified
        )

        if user and user.is_authenticated and user.role == 'ADMIN' and verification_status:
            qs = qs.filter(verification_status=verification_status)

        return qs

    def create(self, request, *args, **kwargs):
        if not (request.user and request.user.is_authenticated and request.user.role in ['CLINIC_ADMIN', 'ADMIN']):
            return Response({'detail': 'Only ClinicAdmin or Admin can create a clinic.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        clinic = create_clinic(owner=request.user, **serializer.validated_data)
        output_serializer = ClinicSerializer(clinic)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Clinics'])
class ClinicDetailView(generics.RetrieveUpdateAPIView):
    queryset = Clinic.objects.all()
    serializer_class = ClinicSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsClinicAdminOrAdmin()]
        return [permissions.AllowAny()]

    def update(self, request, *args, **kwargs):
        clinic = self.get_object()
        if request.user.role == 'CLINIC_ADMIN' and clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        # If clinic was REJECTED and owner updates it, reset to PENDING for admin review
        if request.user.role == 'CLINIC_ADMIN' and clinic.verification_status == VerificationStatus.REJECTED:
            clinic.verification_status = VerificationStatus.PENDING
            clinic.save(update_fields=['verification_status', 'updated_at'])

        return super().update(request, *args, **kwargs)


@extend_schema(tags=['Clinics'])
class MyClinicView(APIView):
    """
    GET /api/v1/clinics/my-clinic/
    Returns the owned clinic for the authenticated Clinic Admin.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CLINIC_ADMIN':
            return Response({'detail': 'Only Clinic Admin can access this endpoint.'}, status=status.HTTP_403_FORBIDDEN)

        clinic = Clinic.objects.filter(owner=request.user).first()
        if not clinic:
            return Response(None, status=status.HTTP_200_OK)

        return Response(ClinicSerializer(clinic).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Clinics'])
class ClinicAddDepartmentView(generics.GenericAPIView):
    serializer_class = ClinicDepartmentSerializer
    permission_classes = [IsClinicAdminOrAdmin]

    def post(self, request, pk, *args, **kwargs):
        clinic = get_clinic_by_id(pk)
        if not clinic:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        if request.user.role == 'CLINIC_ADMIN' and clinic.verification_status != VerificationStatus.VERIFIED:
            return Response({'detail': 'Your clinic has not been approved by Admin yet.'}, status=status.HTTP_403_FORBIDDEN)

        department_id = request.data.get('department_id')
        if not department_id:
            return Response({'detail': 'department_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        clinic_dept = add_department_to_clinic(clinic=clinic, department_id=department_id)
        serializer = ClinicDepartmentSerializer(clinic_dept)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Clinics'])
class ClinicVerifyView(APIView):
    """
    PATCH /api/v1/clinics/<id>/verify/
    Admin approves (VERIFIED) or rejects (REJECTED) a clinic registration.
    """
    permission_classes = [IsAdmin]

    def patch(self, request, pk, *args, **kwargs):
        clinic = get_clinic_by_id(pk)
        if not clinic:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('verification_status')
        if new_status not in [VerificationStatus.VERIFIED, VerificationStatus.REJECTED, VerificationStatus.PENDING]:
            return Response({'detail': 'Invalid verification_status.'}, status=status.HTTP_400_BAD_REQUEST)

        clinic.verification_status = new_status
        clinic.save()

        if new_status == VerificationStatus.VERIFIED:
            try:
                from apps.notifications.models import Notification, NotificationType
                from apps.notifications.email_service import send_approval_email

                if clinic.owner:
                    Notification.objects.create(
                        recipient=clinic.owner,
                        title="Congratulations! Your Clinic Has Been Approved 🎉",
                        message=f"Your clinic '{clinic.name}' ({clinic.city}) has been approved by the Administration! You can now link departments, approve doctor affiliations, and receive appointments.",
                        notification_type=NotificationType.CLINIC_APPROVED
                    )

                    send_approval_email(
                        recipient_email=clinic.owner.email or clinic.email,
                        recipient_name=f"{clinic.owner.first_name} {clinic.owner.last_name}".strip() or clinic.name,
                        subject=f"🎉 Congratulations! {clinic.name} is Approved - Smart Clinic",
                        message=(
                            f"Dear {clinic.owner.first_name or 'Clinic Administrator'},\n\n"
                            f"We are delighted to inform you that your clinic registration for '{clinic.name}' ({clinic.city}) "
                            f"has been reviewed and officially APPROVED by the Smart Clinic Administration.\n\n"
                            f"Your clinic is now visible to patients in the Clinics Directory. You can now:\n"
                            f"• Configure medical departments\n"
                            f"• Link verified doctors to your clinic\n"
                            f"• Manage patient appointment queues and chamber schedules\n\n"
                            f"Log in to your Clinic Admin Dashboard to get started.\n\n"
                            f"Warm regards,\n"
                            f"The Smart Clinic Team"
                        )
                    )
            except Exception:
                pass
        elif new_status == VerificationStatus.REJECTED:
            try:
                from apps.notifications.models import Notification, NotificationType
                if clinic.owner:
                    rejection_reason = request.data.get('reason', 'Certificate or details require updates.')
                    Notification.objects.create(
                        recipient=clinic.owner,
                        title="Clinic Registration Needs Attention",
                        message=f"Your clinic registration for '{clinic.name}' requires updates. Note: {rejection_reason}. Please update your clinic registration details.",
                        notification_type=NotificationType.SYSTEM
                    )
            except Exception:
                pass

        return Response(ClinicSerializer(clinic).data, status=status.HTTP_200_OK)


@extend_schema(tags=['Clinics'])
class NearbyClinicListView(APIView):
    """
    GET /api/v1/clinics/nearby/?lat=<latitude>&lng=<longitude>&radius=<km>
    Returns VERIFIED clinics within the given radius sorted by distance (default 50km).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        try:
            user_lat = float(request.query_params.get('lat', ''))
            user_lng = float(request.query_params.get('lng', ''))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'lat and lng query parameters are required and must be valid numbers.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        radius_km = float(request.query_params.get('radius', 50))

        # Filter only clinics that are VERIFIED and have coordinates set
        clinics = Clinic.objects.filter(
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            latitude__isnull=False,
            longitude__isnull=False
        ).prefetch_related('departments')

        results = []
        for clinic in clinics:
            distance = haversine_distance(
                user_lat, user_lng,
                float(clinic.latitude), float(clinic.longitude)
            )
            if distance <= radius_km:
                data = ClinicSerializer(clinic).data
                data['distance_km'] = round(distance, 2)
                results.append(data)

        # Sort by closest first
        results.sort(key=lambda c: c['distance_km'])

        return Response(results)


@extend_schema(tags=['Clinic Services'])
class ClinicServiceListCreateView(APIView):
    """
    GET  /api/v1/clinics/<clinic_id>/services/ -> List services
    POST /api/v1/clinics/<clinic_id>/services/ -> Create service (ClinicAdmin / Admin)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsClinicAdminOrAdmin()]
        return [permissions.AllowAny()]

    def get(self, request, clinic_id):
        clinic = get_clinic_by_id(clinic_id)
        if not clinic:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        # ClinicAdmin/Admin see all; patients/public see only available
        user = request.user
        if user and user.is_authenticated and (user == clinic.owner or user.role == 'ADMIN' or user.is_superuser):
            services = clinic.services.all()
        else:
            services = clinic.services.filter(is_available=True)

        serializer = ClinicServiceSerializer(services, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, clinic_id):
        clinic = get_clinic_by_id(clinic_id)
        if not clinic:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClinicServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = serializer.save(clinic=clinic)
        return Response(ClinicServiceSerializer(service).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Clinic Services'])
class ClinicServiceDetailView(APIView):
    """
    GET, PATCH, DELETE /api/v1/clinics/<clinic_id>/services/<pk>/
    """
    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsClinicAdminOrAdmin()]
        return [permissions.AllowAny()]

    def get_object(self, clinic_id, pk):
        try:
            return ClinicService.objects.select_related('clinic', 'department').get(clinic_id=clinic_id, pk=pk)
        except ClinicService.DoesNotExist:
            return None

    def get(self, request, clinic_id, pk):
        service = self.get_object(clinic_id, pk)
        if not service:
            return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClinicServiceSerializer(service).data, status=status.HTTP_200_OK)

    def patch(self, request, clinic_id, pk):
        service = self.get_object(clinic_id, pk)
        if not service:
            return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and service.clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClinicServiceSerializer(service, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, clinic_id, pk):
        service = self.get_object(clinic_id, pk)
        if not service:
            return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and service.clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        service.delete()
        return Response({'detail': 'Service deleted successfully.'}, status=status.HTTP_200_OK)


@extend_schema(tags=['Clinics'])
class ClinicFinancialAnalyticsView(APIView):
    """
    GET /api/v1/clinics/<clinic_id>/analytics/
    Daily Counter Cash Register, Revenue Breakdown, and Doctor Fee Payout Settlements.
    Strictly authorized to the clinic owner or platform super admin.
    """
    permission_classes = [permissions.IsAuthenticated, IsClinicAdminOrAdmin]

    def get(self, request, clinic_id, *args, **kwargs):
        from apps.appointments.models import Appointment, AppointmentStatus
        from apps.payments.models import Payment, PaymentStatus, PaymentMethod
        from apps.doctors.models import DoctorClinic
        from django.db.models import Sum, Count, Q
        from datetime import date, datetime, timedelta

        try:
            clinic = Clinic.objects.get(pk=clinic_id)
        except Clinic.DoesNotExist:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        today = date.today()
        range_param = (request.query_params.get('range') or '').lower().strip()
        query_date_str = request.query_params.get('date')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if range_param == '7d':
            start_date = today - timedelta(days=6)
            end_date = today
            range_label = 'Last 7 Days'
        elif range_param == '30d':
            start_date = today - timedelta(days=29)
            end_date = today
            range_label = 'Last 30 Days'
        elif range_param == 'custom' and start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                range_label = f"{start_date} to {end_date}"
            except ValueError:
                start_date = today
                end_date = today
                range_label = 'Today'
        elif query_date_str:
            try:
                single_date = datetime.strptime(query_date_str, '%Y-%m-%d').date()
                start_date = single_date
                end_date = single_date
                range_label = str(single_date)
            except ValueError:
                start_date = today
                end_date = today
                range_label = 'Today'
        else:
            start_date = today
            end_date = today
            range_label = 'Today'

        # Filter appointments for this clinic within the resolved date range
        all_clinic_apts = Appointment.objects.filter(clinic=clinic)
        period_apts = all_clinic_apts.filter(
            appointment_date__gte=start_date,
            appointment_date__lte=end_date
        )

        # Revenue computations
        confirmed_or_completed = period_apts.filter(
            status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]
        )
        pending_apts = period_apts.filter(status=AppointmentStatus.PENDING)
        unpaid_pending_count = pending_apts.count()
        unpaid_pending_amount = float(pending_apts.aggregate(total=Sum('amount'))['total'] or 0)

        cash_revenue = float(Payment.objects.filter(
            appointment__in=confirmed_or_completed,
            payment_method=PaymentMethod.CASH,
            payment_status=PaymentStatus.COMPLETED
        ).aggregate(total=Sum('amount'))['total'] or 0)

        digital_revenue = float(Payment.objects.filter(
            appointment__in=confirmed_or_completed,
            payment_status=PaymentStatus.COMPLETED
        ).exclude(payment_method=PaymentMethod.CASH).aggregate(total=Sum('amount'))['total'] or 0)

        gross_revenue = cash_revenue + digital_revenue
        clinic_net_share = round(gross_revenue * 0.20, 2)
        doctors_total_payout = round(gross_revenue * 0.80, 2)

        # Lifetime metrics
        lifetime_total_revenue = Payment.objects.filter(
            appointment__in=all_clinic_apts.filter(status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]),
            payment_status=PaymentStatus.COMPLETED
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Doctor payout calculation breakdown: Standard 80% Doctor / 20% Clinic facility fee
        doctor_mappings = DoctorClinic.objects.filter(clinic=clinic, is_active=True).select_related('doctor')
        doctor_settlements = []

        for mapping in doctor_mappings:
            doc = mapping.doctor
            doc_paid_apts = confirmed_or_completed.filter(doctor=doc)
            doc_all_apts = period_apts.filter(doctor=doc)
            count = doc_paid_apts.count()
            gross_fees = float(Payment.objects.filter(
                appointment__in=doc_paid_apts,
                payment_status=PaymentStatus.COMPLETED
            ).aggregate(total=Sum('amount'))['total'] or 0)

            clinic_commission = round(gross_fees * 0.20, 2)
            doctor_payable = round(gross_fees * 0.80, 2)

            doctor_settlements.append({
                'doctor_id': str(doc.id),
                'doctor_name': doc.full_name,
                'specialization': doc.specializations.first().name if doc.specializations.exists() else 'Specialist',
                'consultation_fee': float(mapping.consultation_fee),
                'total_appointments': doc_all_apts.count(),
                'patients_seen_today': count,
                'patients_seen': count,
                'gross_collected': gross_fees,
                'clinic_facility_cut': clinic_commission,
                'doctor_net_payout': doctor_payable,
            })

        # Rank doctor settlements by gross revenue generated (leaderboard)
        doctor_settlements.sort(key=lambda x: x['gross_collected'], reverse=True)

        return Response({
            'date': str(end_date),
            'start_date': str(start_date),
            'end_date': str(end_date),
            'range_label': range_label,
            'summary': {
                'today_total_appointments': period_apts.count(),
                'today_confirmed_appointments': confirmed_or_completed.count(),
                'today_cash_collected': cash_revenue,
                'today_digital_collected': digital_revenue,
                'today_gross_revenue': gross_revenue,
                'today_clinic_net_share': clinic_net_share,
                'today_doctors_total_payout': doctors_total_payout,
                'period_total_appointments': period_apts.count(),
                'period_confirmed_appointments': confirmed_or_completed.count(),
                'period_cash_collected': cash_revenue,
                'period_digital_collected': digital_revenue,
                'period_gross_revenue': gross_revenue,
                'period_clinic_net_share': clinic_net_share,
                'period_doctors_total_payout': doctors_total_payout,
                'unpaid_pending_count': unpaid_pending_count,
                'unpaid_pending_amount': unpaid_pending_amount,
                'lifetime_total_revenue': float(lifetime_total_revenue),
                'total_services_offered': clinic.services.filter(is_available=True).count(),
            },
            'doctor_settlements': doctor_settlements,
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Clinics'])
class ClinicOverviewStatsView(APIView):
    """
    GET /api/v1/clinics/<clinic_id>/overview-stats/
    Returns all data needed for the Clinic Admin Overview command center.
    Scoped strictly to the clinic owner or platform admin.
    """
    permission_classes = [permissions.IsAuthenticated, IsClinicAdminOrAdmin]

    def get(self, request, clinic_id, *args, **kwargs):
        from apps.appointments.models import Appointment, AppointmentStatus
        from apps.doctors.models import DoctorClinic, ChamberSession, DoctorClinicStatus
        from django.db.models import Count, Q, Sum
        from django.db.models.functions import TruncDate
        from datetime import date, timedelta

        try:
            clinic = Clinic.objects.get(pk=clinic_id)
        except Clinic.DoesNotExist:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        today = date.today()

        # ── Doctors ──────────────────────────────────────────────────────────
        all_mappings = DoctorClinic.objects.filter(clinic=clinic).select_related('doctor')
        active_doctors = all_mappings.filter(status=DoctorClinicStatus.ACCEPTED, is_active=True)
        inactive_doctors = all_mappings.filter(
            Q(is_active=False) | Q(status=DoctorClinicStatus.REJECTED)
        )
        pending_requests = all_mappings.filter(
            status__in=[DoctorClinicStatus.PENDING_DOCTOR_APPROVAL, DoctorClinicStatus.PENDING_CLINIC_APPROVAL]
        )

        active_doctor_ids = list(active_doctors.values_list('doctor_id', flat=True))

        # Doctors working today = have an active ChamberSession for today
        working_today_ids = ChamberSession.objects.filter(
            clinic=clinic,
            session_date=today,
            doctor_id__in=active_doctor_ids,
        ).exclude(status='ENDED').values_list('doctor_id', flat=True)

        # ── Today's Appointments ─────────────────────────────────────────────
        today_apts = Appointment.objects.filter(clinic=clinic, appointment_date=today)
        apt_total = today_apts.count()
        apt_completed = today_apts.filter(status=AppointmentStatus.COMPLETED).count()
        apt_cancelled = today_apts.filter(status=AppointmentStatus.CANCELLED).count()
        apt_confirmed = today_apts.filter(status=AppointmentStatus.CONFIRMED).count()
        apt_pending = today_apts.filter(status=AppointmentStatus.PENDING).count()

        # ── Live Chambers ────────────────────────────────────────────────────
        today_sessions = ChamberSession.objects.filter(
            clinic=clinic,
            session_date=today,
        ).select_related('doctor').prefetch_related('doctor__specializations')

        live_chambers = []
        for session in today_sessions:
            # Count how many appointments are still confirmed/pending after current serial
            waiting_count = Appointment.objects.filter(
                clinic=clinic,
                doctor=session.doctor,
                appointment_date=today,
                status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING],
                serial_number__gt=session.current_serial,
            ).count()
            total_serials = Appointment.objects.filter(
                clinic=clinic,
                doctor=session.doctor,
                appointment_date=today,
            ).exclude(status=AppointmentStatus.CANCELLED).count()
            spec = session.doctor.specializations.first()
            live_chambers.append({
                'doctor_id': str(session.doctor.id),
                'doctor_name': session.doctor.full_name,
                'avatar_url': session.doctor.avatar_url,
                'specialization': spec.name if spec else None,
                'session_status': session.status,
                'current_serial': session.current_serial,
                'total_serials': total_serials,
                'waiting': waiting_count,
                'room_number': session.room_number,
                'delay_minutes': session.delay_minutes,
            })

        # ── Appointment Trend (last 30 days) ─────────────────────────────────
        thirty_days_ago = today - timedelta(days=29)
        trend_qs = (
            Appointment.objects.filter(
                clinic=clinic,
                appointment_date__gte=thirty_days_ago,
                appointment_date__lte=today,
            )
            .values('appointment_date', 'status')
            .annotate(count=Count('id'))
        )
        # Build dict keyed by date
        trend_dict = {}
        for row in trend_qs:
            d_str = str(row['appointment_date'])
            if d_str not in trend_dict:
                trend_dict[d_str] = {'date': d_str, 'total': 0, 'completed': 0, 'cancelled': 0, 'confirmed': 0}
            trend_dict[d_str]['total'] += row['count']
            if row['status'] == AppointmentStatus.COMPLETED:
                trend_dict[d_str]['completed'] += row['count']
            elif row['status'] == AppointmentStatus.CANCELLED:
                trend_dict[d_str]['cancelled'] += row['count']
            elif row['status'] == AppointmentStatus.CONFIRMED:
                trend_dict[d_str]['confirmed'] += row['count']

        # Fill in missing dates with zeros
        appointment_trend = []
        for i in range(30):
            d = thirty_days_ago + timedelta(days=i)
            d_str = str(d)
            appointment_trend.append(trend_dict.get(d_str, {
                'date': d_str, 'total': 0, 'completed': 0, 'cancelled': 0, 'confirmed': 0
            }))

        # ── Specialization Activity (all-time for this clinic) ───────────────
        from apps.doctors.models import Doctor
        spec_activity = (
            Appointment.objects.filter(clinic=clinic)
            .exclude(department=None)
            .values('department__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )
        specialization_activity = [
            {'name': row['department__name'], 'count': row['count']}
            for row in spec_activity
        ]

        # ── Doctor Activity (today) ──────────────────────────────────────────
        doctor_activity_qs = (
            Appointment.objects.filter(clinic=clinic, appointment_date=today)
            .values('doctor__full_name', 'doctor__id')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        doctor_activity = [
            {'doctor_id': str(row['doctor__id']), 'doctor_name': row['doctor__full_name'], 'count': row['count']}
            for row in doctor_activity_qs
        ]

        # ── Financial Snapshot (today) ───────────────────────────────────────
        from apps.payments.models import Payment, PaymentStatus, PaymentMethod
        today_payments = Payment.objects.filter(
            appointment__clinic=clinic,
            appointment__appointment_date=today,
            payment_status=PaymentStatus.COMPLETED,
        )
        today_cash = today_payments.filter(
            payment_method=PaymentMethod.CASH
        ).aggregate(total=Sum('amount'))['total'] or 0
        today_digital = today_payments.exclude(
            payment_method=PaymentMethod.CASH
        ).aggregate(total=Sum('amount'))['total'] or 0

        # ── Active Announcements Count ───────────────────────────────────────
        active_announcements_count = clinic.announcements.filter(is_active=True).count()

        return Response({
            'doctors': {
                'active': active_doctors.count(),
                'inactive': inactive_doctors.count(),
                'working_today': len(working_today_ids),
                'pending_requests': pending_requests.count(),
            },
            'appointments': {
                'total_today': apt_total,
                'completed': apt_completed,
                'cancelled': apt_cancelled,
                'confirmed_upcoming': apt_confirmed,
                'pending': apt_pending,
            },
            'live_chambers': live_chambers,
            'appointment_trend': appointment_trend,
            'specialization_activity': specialization_activity,
            'doctor_activity': doctor_activity,
            'financial_snapshot': {
                'today_total': float(today_cash) + float(today_digital),
                'today_cash': float(today_cash),
                'today_digital': float(today_digital),
            },
            'active_announcements_count': active_announcements_count,
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Announcements'])
class ClinicAnnouncementListCreateView(APIView):
    """
    GET  /api/v1/clinics/<clinic_id>/announcements/  -> List announcements
    POST /api/v1/clinics/<clinic_id>/announcements/  -> Create announcement (ClinicAdmin / Admin)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsClinicAdminOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get(self, request, clinic_id):
        try:
            clinic = Clinic.objects.get(pk=clinic_id)
        except Clinic.DoesNotExist:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        announcements = clinic.announcements.select_related('doctor').all()
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, clinic_id):
        try:
            clinic = Clinic.objects.get(pk=clinic_id)
        except Clinic.DoesNotExist:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AnnouncementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(clinic=clinic)
        return Response(AnnouncementSerializer(announcement).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Announcements'])
class ClinicAnnouncementDetailView(APIView):
    """
    GET, PATCH, DELETE /api/v1/clinics/<clinic_id>/announcements/<pk>/
    """
    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsClinicAdminOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_object(self, clinic_id, pk):
        try:
            return Announcement.objects.select_related('clinic', 'doctor').get(clinic_id=clinic_id, pk=pk)
        except Announcement.DoesNotExist:
            return None

    def get(self, request, clinic_id, pk):
        obj = self.get_object(clinic_id, pk)
        if not obj:
            return Response({'detail': 'Announcement not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AnnouncementSerializer(obj).data)

    def patch(self, request, clinic_id, pk):
        obj = self.get_object(clinic_id, pk)
        if not obj:
            return Response({'detail': 'Announcement not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and obj.clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AnnouncementSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, clinic_id, pk):
        obj = self.get_object(clinic_id, pk)
        if not obj:
            return Response({'detail': 'Announcement not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CLINIC_ADMIN' and obj.clinic.owner != request.user:
            return Response({'detail': 'You do not own this clinic.'}, status=status.HTTP_403_FORBIDDEN)

        obj.delete()
        return Response({'detail': 'Announcement deleted.'}, status=status.HTTP_200_OK)
