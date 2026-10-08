from django.urls import path
from .views import (
    SpecializationListCreateView,
    DoctorListView,
    DoctorDetailView,
    DoctorProfileSetupView,
    DoctorVerifyView,
    DoctorClinicRequestCreateView,
    DoctorClinicRequestListView,
    DoctorClinicRequestRespondView,
    DoctorAssignClinicView,
    DoctorAssignClinicByPkView,
    ChamberSessionView,
    DoctorScheduleView,
    DoctorAvailabilityView,
)

app_name = 'doctors'

urlpatterns = [
    # Public: Browse doctors
    path('', DoctorListView.as_view(), name='doctor_list'),

    # Chamber Session (Live Queue Tracking)
    path('chamber-session/', ChamberSessionView.as_view(), name='chamber_session'),

    # Doctor Schedule Management
    path('schedule/', DoctorScheduleView.as_view(), name='doctor_schedule'),
    path('schedule/<uuid:pk>/', DoctorScheduleView.as_view(), name='doctor_schedule_delete'),

    # Availability Slots API (used by booking flow)
    path('availability/', DoctorAvailabilityView.as_view(), name='doctor_availability'),

    # Specializations catalog
    path('specializations/', SpecializationListCreateView.as_view(), name='specialization_list_create'),

    # Doctor self-registers profile
    path('setup-profile/', DoctorProfileSetupView.as_view(), name='doctor_setup_profile'),

    # Requests & Service Agreements (Bidirectional)
    path('requests/', DoctorClinicRequestListView.as_view(), name='doctor_request_list'),
    path('requests/create/', DoctorClinicRequestCreateView.as_view(), name='doctor_request_create'),
    path('requests/<uuid:pk>/respond/', DoctorClinicRequestRespondView.as_view(), name='doctor_request_respond'),

    # Direct detail & Admin endpoints
    path('<uuid:pk>/', DoctorDetailView.as_view(), name='doctor_detail'),
    path('<uuid:pk>/verify/', DoctorVerifyView.as_view(), name='doctor_verify'),
    path('assign-to-clinic/', DoctorAssignClinicView.as_view(), name='doctor_assign_clinic'),
    path('<uuid:pk>/assign-clinic/', DoctorAssignClinicByPkView.as_view(), name='doctor_assign_clinic_by_pk'),
]
