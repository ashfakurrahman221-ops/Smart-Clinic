from django.urls import path
from .views import (
    DepartmentListCreateView,
    ClinicListCreateView,
    ClinicDetailView,
    ClinicAddDepartmentView,
    NearbyClinicListView,
    ClinicVerifyView,
    MyClinicView,
    ClinicServiceListCreateView,
    ClinicServiceDetailView,
    ClinicFinancialAnalyticsView,
    ClinicOverviewStatsView,
    ClinicAnnouncementListCreateView,
    ClinicAnnouncementDetailView,
)
from .staff_views import (
    ClinicStaffListCreateView,
    ClinicStaffDetailView,
    CreateReceptionistLoginView,
    StaffAttendanceListCreateView,
    StaffAttendanceDetailView,
    ReceptionMyClinicView,
    ReceptionPatientCheckInView,
    ReceptionWalkInCreateView,
    ReceptionCashPaymentView,
    ReceptionDailyCashSummaryView,
    ReceptionShiftClosingView,
    StaffMonthlyAttendanceSummaryView,
    ReceptionPatientLookupView,
)

app_name = 'clinics'

urlpatterns = [
    path('departments/', DepartmentListCreateView.as_view(), name='department_list_create'),
    path('nearby/', NearbyClinicListView.as_view(), name='clinic_nearby'),
    path('my-clinic/', MyClinicView.as_view(), name='my_clinic'),
    path('', ClinicListCreateView.as_view(), name='clinic_list_create'),
    path('<uuid:pk>/', ClinicDetailView.as_view(), name='clinic_detail'),
    path('<uuid:pk>/departments/', ClinicAddDepartmentView.as_view(), name='clinic_add_department'),
    path('<uuid:pk>/verify/', ClinicVerifyView.as_view(), name='clinic_verify'),
    path('<uuid:clinic_id>/services/', ClinicServiceListCreateView.as_view(), name='clinic_services'),
    path('<uuid:clinic_id>/services/<uuid:pk>/', ClinicServiceDetailView.as_view(), name='clinic_service_detail'),
    path('<uuid:clinic_id>/analytics/', ClinicFinancialAnalyticsView.as_view(), name='clinic_analytics'),
    path('<uuid:clinic_id>/overview-stats/', ClinicOverviewStatsView.as_view(), name='clinic_overview_stats'),
    path('<uuid:clinic_id>/announcements/', ClinicAnnouncementListCreateView.as_view(), name='clinic_announcements'),
    path('<uuid:clinic_id>/announcements/<uuid:pk>/', ClinicAnnouncementDetailView.as_view(), name='clinic_announcement_detail'),

    # Staff Management (Admin only)
    path('staff/', ClinicStaffListCreateView.as_view(), name='staff_list_create'),
    path('staff/<uuid:pk>/', ClinicStaffDetailView.as_view(), name='staff_detail'),
    path('staff/create-login/', CreateReceptionistLoginView.as_view(), name='staff_create_login'),
    path('staff/attendance/', StaffAttendanceListCreateView.as_view(), name='staff_attendance'),
    path('staff/attendance/<uuid:pk>/', StaffAttendanceDetailView.as_view(), name='staff_attendance_detail'),
    path('staff/monthly-summary/', StaffMonthlyAttendanceSummaryView.as_view(), name='staff_monthly_summary'),

    # Reception Desk Operations
    path('reception/my-clinic/', ReceptionMyClinicView.as_view(), name='reception_my_clinic'),
    path('reception/check-in/', ReceptionPatientCheckInView.as_view(), name='reception_check_in'),
    path('reception/walk-in/', ReceptionWalkInCreateView.as_view(), name='reception_walk_in'),
    path('reception/patient-lookup/', ReceptionPatientLookupView.as_view(), name='reception_patient_lookup'),
    path('reception/cash-payment/', ReceptionCashPaymentView.as_view(), name='reception_cash_payment'),
    path('reception/cash-summary/', ReceptionDailyCashSummaryView.as_view(), name='reception_cash_summary'),
    path('reception/shift-closing/', ReceptionShiftClosingView.as_view(), name='reception_shift_closing'),
]


