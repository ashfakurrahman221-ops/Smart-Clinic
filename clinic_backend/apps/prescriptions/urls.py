from django.urls import path
from .views import (
    MedicationListView,
    PrescriptionListCreateView,
    PrescriptionDetailView,
    PrescriptionByAppointmentView,
    PrescriptionVerifyView,
    MedicalReportListCreateView,
    MedicalReportDetailView,
    MedicalReportAccessView,
    MedicalReportAIAnalysisView,
    PatientVitalLogListCreateView,
)

app_name = 'prescriptions'

urlpatterns = [
    path('', PrescriptionListCreateView.as_view(), name='prescription_list_create'),
    path('vitals/', PatientVitalLogListCreateView.as_view(), name='patient_vitals_list_create'),
    path('medications/', MedicationListView.as_view(), name='medication_list'),
    path('reports/', MedicalReportListCreateView.as_view(), name='medical_report_list_create'),
    path('reports/<uuid:pk>/', MedicalReportDetailView.as_view(), name='medical_report_detail'),
    path('reports/<uuid:pk>/access/', MedicalReportAccessView.as_view(), name='medical_report_access'),
    path('reports/<uuid:pk>/analyze-ai/', MedicalReportAIAnalysisView.as_view(), name='medical_report_analyze_ai'),
    path('<uuid:pk>/', PrescriptionDetailView.as_view(), name='prescription_detail'),
    path('appointment/<uuid:appointment_id>/', PrescriptionByAppointmentView.as_view(), name='prescription_by_appointment'),
    path('verify/<str:qr_token>/', PrescriptionVerifyView.as_view(), name='prescription_verify'),
]
