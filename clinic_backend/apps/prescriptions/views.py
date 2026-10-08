import re
import logging
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.common.utils import CloudinaryStorageService
from .models import Medication, Prescription, MedicalReport, ReportCategory, PatientVitalLog

logger = logging.getLogger(__name__)
from .serializers import (
    MedicationSerializer,
    PrescriptionSerializer,
    PrescriptionCreateSerializer,
    PrescriptionPublicVerifySerializer,
    MedicalReportSerializer,
    PatientVitalLogSerializer,
)
from .services import seed_dgda_medications_if_empty, create_or_update_prescription
from apps.appointments.models import Appointment

@extend_schema(tags=['Prescriptions'])
class MedicationListView(generics.ListAPIView):
    """
    GET /api/v1/prescriptions/medications/
    Search DGDA Bangladesh drug master catalog by brand or generic name.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = MedicationSerializer

    def get_queryset(self):
        seed_dgda_medications_if_empty()
        queryset = Medication.objects.all()
        search = self.request.query_params.get('search') or self.request.query_params.get('q')
        if search:
            queryset = queryset.filter(
                models.Q(brand_name__icontains=search) | models.Q(generic_name__icontains=search)
            )
        return queryset

from django.db import models
from django.db.models import Q
from rest_framework import exceptions

def user_has_patient_relationship(user, patient_id):
    """
    Checks if a doctor or clinic admin has a legitimate clinical relationship
    with a patient via existing appointment records.
    """
    if not patient_id:
        return False
    if user.role == 'DOCTOR':
        return Appointment.objects.filter(
            Q(doctor__user=user) | Q(doctor__email=user.email),
            patient_id=patient_id
        ).exists()
    elif user.role == 'CLINIC_ADMIN':
        return Appointment.objects.filter(
            clinic__owner=user,
            patient_id=patient_id
        ).exists()
    elif user.role == 'ADMIN':
        return True
    return False

@extend_schema(tags=['Prescriptions'])
class PrescriptionListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/prescriptions/ -> List user prescriptions
    POST /api/v1/prescriptions/ -> Doctor issues E-Prescription
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PrescriptionCreateSerializer
        return PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Prescription.objects.select_related('appointment', 'doctor', 'patient', 'family_member').prefetch_related('medications').all()

        if user.role == 'PATIENT':
            return queryset.filter(patient=user)
        elif user.role == 'DOCTOR':
            return queryset.filter(Q(doctor__user=user) | Q(doctor__email=user.email))
        elif user.role == 'CLINIC_ADMIN':
            return queryset.filter(appointment__clinic__owner=user)
        elif user.role == 'ADMIN':
            return queryset
        return queryset.none()

    def create(self, request, *args, **kwargs):
        # Server-side guard: Patients and Receptionists cannot create prescriptions
        if request.user.role not in ['DOCTOR', 'CLINIC_ADMIN', 'ADMIN'] and not (request.user.is_staff or request.user.is_superuser):
            raise exceptions.PermissionDenied('You do not have permission to issue prescriptions.')

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            appointment = Appointment.objects.get(pk=data['appointment_id'])
        except Appointment.DoesNotExist:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        prescription = create_or_update_prescription(
            appointment=appointment,
            doctor_user=request.user,
            diagnosis=data.get('diagnosis', ''),
            vitals=data.get('vitals', {}),
            diagnostic_tests=data.get('diagnostic_tests', ''),
            advice=data.get('advice', ''),
            follow_up_date=data.get('follow_up_date', None),
            follow_up_notes=data.get('follow_up_notes', ''),
            medications_data=data.get('medications', [])
        )
        return Response(PrescriptionSerializer(prescription).data, status=status.HTTP_201_CREATED)

@extend_schema(tags=['Prescriptions'])
class PrescriptionDetailView(generics.RetrieveAPIView):
    """
    Strictly scoped Prescription Detail endpoint.
    Only the owning patient, legitimately associated doctor, or clinic admin of the
    prescribing clinic can view the prescription. Unrelated users receive 404.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Prescription.objects.select_related(
            'appointment', 'appointment__clinic', 'doctor', 'patient', 'family_member'
        ).prefetch_related('medications')

        if user.role == 'PATIENT':
            return queryset.filter(patient=user)
        elif user.role == 'DOCTOR':
            return queryset.filter(Q(doctor__user=user) | Q(doctor__email=user.email))
        elif user.role == 'CLINIC_ADMIN':
            return queryset.filter(appointment__clinic__owner=user)
        elif user.role == 'ADMIN':
            return queryset
        return queryset.none()

@extend_schema(tags=['Prescriptions'])
class PrescriptionByAppointmentView(APIView):
    """
    Strictly scoped Prescription by Appointment lookup.
    Enforces identical authorization rules as PrescriptionDetailView.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, appointment_id, *args, **kwargs):
        user = request.user
        queryset = Prescription.objects.select_related(
            'appointment', 'appointment__clinic', 'doctor', 'patient', 'family_member'
        ).prefetch_related('medications')

        if user.role == 'PATIENT':
            queryset = queryset.filter(patient=user)
        elif user.role == 'DOCTOR':
            queryset = queryset.filter(Q(doctor__user=user) | Q(doctor__email=user.email))
        elif user.role == 'CLINIC_ADMIN':
            queryset = queryset.filter(appointment__clinic__owner=user)
        elif user.role == 'ADMIN':
            pass
        else:
            return Response({'detail': 'Prescription not found for this appointment.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            prescription = queryset.get(appointment_id=appointment_id)
            return Response(PrescriptionSerializer(prescription).data, status=status.HTTP_200_OK)
        except Prescription.DoesNotExist:
            return Response({'detail': 'Prescription not found for this appointment.'}, status=status.HTTP_404_NOT_FOUND)

@extend_schema(tags=['Prescriptions'])
class PrescriptionVerifyView(APIView):
    """
    Public verification endpoint for pharmacies / diagnostic labs via QR Code token.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, qr_token, *args, **kwargs):
        import uuid
        try:
            val_uuid = uuid.UUID(str(qr_token).strip())
            prescription = Prescription.objects.select_related(
                'appointment', 'appointment__clinic', 'doctor', 'patient', 'family_member'
            ).prefetch_related('medications').get(qr_token=val_uuid)
            return Response({
                'is_valid': True,
                'verification_message': 'Official Digital E-Prescription Verified',
                'prescription': PrescriptionPublicVerifySerializer(prescription).data
            }, status=status.HTTP_200_OK)
        except (ValueError, AttributeError, Prescription.DoesNotExist):
            return Response({
                'is_valid': False,
                'verification_message': 'Prescription not found or invalid QR token.'
            }, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=['Medical Reports'])
class MedicalReportListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/prescriptions/reports/?patient_id=X&family_member_id=Y&report_type=Z
    POST /api/v1/prescriptions/reports/
    Strictly scoped: Doctors/Clinic Admins can only query reports of patients they have
    an appointment relationship with. Query without patient_id never returns global data.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    serializer_class = MedicalReportSerializer

    def get_queryset(self):
        user = self.request.user
        patient_id = self.request.query_params.get('patient_id')
        family_member_id = self.request.query_params.get('family_member_id')
        report_type = self.request.query_params.get('report_type')

        qs = MedicalReport.objects.select_related('patient', 'family_member', 'appointment')

        if user.role == 'PATIENT':
            # Patient can only list their own reports
            qs = qs.filter(patient=user)
        elif user.role in ['DOCTOR', 'CLINIC_ADMIN']:
            # Non-patients MUST supply patient_id; query without patient_id never returns global data
            if not patient_id:
                return MedicalReport.objects.none()

            # Verify legitimate relationship between requesting provider and patient
            if not user_has_patient_relationship(user, patient_id):
                return MedicalReport.objects.none()

            qs = qs.filter(patient_id=patient_id)
        elif user.role == 'ADMIN':
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            else:
                return MedicalReport.objects.none()
        else:
            return MedicalReport.objects.none()

        if family_member_id:
            qs = qs.filter(family_member_id=family_member_id)
        if report_type:
            qs = qs.filter(report_type=report_type)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        patient = user
        patient_id = self.request.data.get('patient_id')

        if user.role in ['DOCTOR', 'CLINIC_ADMIN']:
            if not patient_id:
                raise exceptions.ValidationError({'patient_id': 'patient_id is required to upload a report for a patient.'})
            if not user_has_patient_relationship(user, patient_id):
                raise exceptions.PermissionDenied('You do not have an active medical relationship with this patient.')
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                patient = User.objects.get(pk=patient_id)
            except User.DoesNotExist:
                raise exceptions.ValidationError({'patient_id': 'Patient not found.'})
        elif user.role == 'ADMIN':
            if patient_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    patient = User.objects.get(pk=patient_id)
                except User.DoesNotExist:
                    raise exceptions.ValidationError({'patient_id': 'Patient not found.'})
        else:
            # PATIENT: always upload to own profile
            patient = user

        # If family_member_id is supplied, verify it belongs to this patient
        family_member_id = self.request.data.get('family_member_id')
        family_member = None
        if family_member_id:
            from apps.accounts.models import FamilyMember
            try:
                family_member = FamilyMember.objects.get(pk=family_member_id, patient=patient)
            except FamilyMember.DoesNotExist:
                raise exceptions.ValidationError({'family_member_id': 'Invalid family member for this patient.'})

        serializer.save(patient=patient, family_member=family_member, uploaded_by=user)


@extend_schema(tags=['Medical Reports'])
class MedicalReportDetailView(generics.RetrieveDestroyAPIView):
    """
    Strictly authorized Medical Report Detail & Delete endpoint.
    READ: Only the owning patient or an associated doctor/clinic admin can retrieve.
    DELETE: Only the owning patient or platform super admin can delete. Doctors and clinic admins cannot delete.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MedicalReportSerializer

    def get_queryset(self):
        user = self.request.user
        qs = MedicalReport.objects.select_related('patient', 'family_member', 'appointment')

        if user.role == 'PATIENT':
            return qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            doctor_patient_ids = Appointment.objects.filter(
                Q(doctor__user=user) | Q(doctor__email=user.email)
            ).values_list('patient_id', flat=True)
            return qs.filter(patient_id__in=doctor_patient_ids)
        elif user.role == 'CLINIC_ADMIN':
            clinic_patient_ids = Appointment.objects.filter(
                clinic__owner=user
            ).values_list('patient_id', flat=True)
            return qs.filter(patient_id__in=clinic_patient_ids)
        elif user.role == 'ADMIN':
            return qs
        return qs.none()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        # Strict least-privilege DELETE authorization:
        # A doctor or clinic admin must NOT gain deletion permission merely because they can legitimately view a report.
        if user.role == 'PATIENT':
            if instance.patient != user and instance.uploaded_by != user:
                return Response(
                    {'detail': 'You can only delete your own medical reports.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role in ['DOCTOR', 'CLINIC_ADMIN']:
            return Response(
                {'detail': 'Doctors and clinic administrators cannot delete patient medical reports.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role != 'ADMIN':
            return Response(
                {'detail': 'Permission denied.'},
                status=status.HTTP_403_FORBIDDEN
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Medical Reports'])
class MedicalReportAccessView(APIView):
    """
    Authorized Patient Medical Document Access Endpoint.
    Enforces strict object-level permission before generating a short-lived signed delivery URL.
    Returns:
    {
        "access_url": "<short-lived-signed-url>",
        "expires_in": 300,
        "filename": "lipid_profile.pdf",
        "title": "Lipid Profile Report"
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        user = request.user
        try:
            report = MedicalReport.objects.select_related('patient', 'family_member').get(pk=pk)
        except (MedicalReport.DoesNotExist, ValueError):
            return Response(
                {'detail': 'Medical report not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 1. Object-Level Authorization Matrix:
        if user.role == 'PATIENT':
            # Patient can ONLY access their own reports
            if report.patient_id != user.id:
                logger.warning(
                    "Medical report access denied: user_id=%s (PATIENT) attempted cross-patient access to report_id=%s",
                    user.id, report.id
                )
                return Response(
                    {'detail': 'You do not have permission to access this medical report.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        elif user.role == 'DOCTOR':
            # Doctor must have an active/past appointment clinical relationship with this patient
            has_relationship = Appointment.objects.filter(
                Q(doctor__user=user) | Q(doctor__email=user.email),
                patient=report.patient
            ).exists()
            if not has_relationship:
                logger.warning(
                    "Medical report access denied: doctor_id=%s attempted to access unrelated patient report_id=%s",
                    user.id, report.id
                )
                return Response(
                    {'detail': 'You do not have an active clinical relationship with this patient.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        elif user.role == 'RECEPTIONIST':
            logger.warning(
                "Medical report access denied: receptionist_id=%s attempted clinical document access to report_id=%s",
                user.id, report.id
            )
            return Response(
                {'detail': 'Receptionist staff do not have authorization to access confidential medical documents.'},
                status=status.HTTP_403_FORBIDDEN
            )

        elif user.role == 'CLINIC_ADMIN':
            logger.warning(
                "Medical report access denied: clinic_admin_id=%s attempted clinical document access to report_id=%s",
                user.id, report.id
            )
            return Response(
                {'detail': 'Administrative authority does not grant access to confidential patient medical records.'},
                status=status.HTTP_403_FORBIDDEN
            )

        elif user.role == 'ADMIN':
            logger.warning(
                "Medical report access denied: platform_admin_id=%s denied direct clinical document access to report_id=%s",
                user.id, report.id
            )
            return Response(
                {'detail': 'Platform administrators cannot view patient clinical files directly through patient APIs.'},
                status=status.HTTP_403_FORBIDDEN
            )

        else:
            return Response(
                {'detail': 'Permission denied.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Generate short-lived signed delivery URL (300 seconds / 5 mins)
        expires_in = 300
        signed_delivery_url = CloudinaryStorageService.generate_signed_report_url(
            report.file_url,
            expires_in=expires_in
        )

        logger.info(
            "Medical report access granted: report_id=%s, user_id=%s, role=%s",
            report.id, user.id, user.role
        )

        clean_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', report.title).strip().replace(' ', '_')
        filename = f"{clean_title or 'medical_report'}.pdf"

        if request.query_params.get('action') == 'redirect':
            from django.http import HttpResponseRedirect
            response = HttpResponseRedirect(signed_delivery_url)
        else:
            response = Response(
                {
                    'access_url': signed_delivery_url,
                    'expires_in': expires_in,
                    'filename': filename,
                    'title': report.title,
                },
                status=status.HTTP_200_OK
            )

        # 3. Cache-Control Security Headers to prevent intermediate proxy/browser caching
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'

        return response


@extend_schema(tags=['Vitals & Health Indicators'])
class PatientVitalLogListCreateView(APIView):
    """
    GET  /api/v1/prescriptions/vitals/?patient_id=X&family_member_id=Y
    POST /api/v1/prescriptions/vitals/
    Chronological time-series health vitals for charting and trends.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        patient_id = request.query_params.get('patient_id')
        family_member_id = request.query_params.get('family_member_id')

        qs = PatientVitalLog.objects.select_related('patient', 'family_member', 'appointment', 'prescription')

        if user.role == 'PATIENT':
            qs = qs.filter(patient=user)
            if family_member_id:
                qs = qs.filter(family_member_id=family_member_id)
            else:
                qs = qs.filter(family_member__isnull=True)
        elif user.role in ['DOCTOR', 'CLINIC_ADMIN']:
            if not patient_id:
                return Response({'detail': 'patient_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            if not user_has_patient_relationship(user, patient_id):
                return Response({'detail': 'No active clinical relationship with this patient.'}, status=status.HTTP_403_FORBIDDEN)
            qs = qs.filter(patient_id=patient_id)
            if family_member_id:
                qs = qs.filter(family_member_id=family_member_id)
        elif user.role == 'ADMIN':
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
                if family_member_id:
                    qs = qs.filter(family_member_id=family_member_id)
        else:
            return Response({'summary': None, 'results': []}, status=status.HTTP_200_OK)

        # Order chronologically for charts (oldest to newest)
        vital_logs = list(qs.order_by('recorded_at'))
        serializer = PatientVitalLogSerializer(vital_logs, many=True)

        # Compute summary stats from latest log
        latest_log = vital_logs[-1] if vital_logs else None
        summary = {
            'total_readings': len(vital_logs),
            'latest_bp': f"{latest_log.systolic_bp}/{latest_log.diastolic_bp}" if latest_log and latest_log.systolic_bp and latest_log.diastolic_bp else None,
            'latest_pulse': latest_log.pulse_rate if latest_log else None,
            'latest_sugar': float(latest_log.blood_glucose) if latest_log and latest_log.blood_glucose else None,
            'latest_weight': float(latest_log.weight_kg) if latest_log and latest_log.weight_kg else None,
            'latest_bmi': latest_log.bmi if latest_log else None,
            'latest_recorded_at': latest_log.recorded_at.isoformat() if latest_log and latest_log.recorded_at else None,
        }

        return Response({
            'summary': summary,
            'results': serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        user = request.user
        data = request.data.copy()

        # If patient, enforce self
        if user.role == 'PATIENT':
            data['patient'] = user.id
        elif user.role in ['DOCTOR', 'CLINIC_ADMIN']:
            patient_id = data.get('patient')
            if not patient_id:
                return Response({'patient': 'patient is required.'}, status=status.HTTP_400_BAD_REQUEST)
            if not user_has_patient_relationship(user, patient_id):
                return Response({'detail': 'No active clinical relationship with this patient.'}, status=status.HTTP_403_FORBIDDEN)

        if not data.get('recorded_at'):
            from django.utils import timezone
            data['recorded_at'] = timezone.now().isoformat()

        serializer = PatientVitalLogSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        vital_log = serializer.save()

        return Response(PatientVitalLogSerializer(vital_log).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Medical Reports'])
class MedicalReportAIAnalysisView(APIView):
    """
    POST /api/v1/prescriptions/reports/<uuid:pk>/analyze-ai/
    Trigger Multimodal AI Diagnostic Analysis for a specific medical report.
    Returns extracted parameters, normal range comparison, Bengali & English summary, and doctor discussion tips.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            report = MedicalReport.objects.select_related('patient', 'family_member').get(pk=pk)
        except MedicalReport.DoesNotExist:
            return Response({'detail': 'Medical report not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Access control
        if user.role == 'PATIENT':
            if report.patient != user:
                return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role in ['DOCTOR', 'CLINIC_ADMIN']:
            if not user_has_patient_relationship(user, report.patient_id):
                return Response({'detail': 'No active clinical relationship with this patient.'}, status=status.HTTP_403_FORBIDDEN)

        from .ai_analyzer import analyze_medical_report
        try:
            updated_report = analyze_medical_report(report)
            return Response(MedicalReportSerializer(updated_report).data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("AI Analysis failed for report %s: %s", pk, e)
            report.ai_analysis_status = 'FAILED'
            report.save(update_fields=['ai_analysis_status', 'updated_at'])
            return Response({'detail': 'Failed to complete AI report analysis. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



