from django.urls import path
from .views import (
    AppointmentListCreateView,
    AppointmentDetailView,
    AppointmentCancelView,
    AppointmentCompleteView,
    AppointmentCheckInView,
    AppointmentEmergencyFlagView,
    PublicLiveQueueTrackView,
    PublicWaitingRoomQueueView,
)

app_name = 'appointments'

urlpatterns = [
    path('', AppointmentListCreateView.as_view(), name='appointment_list_create'),
    path('queue/public/', PublicWaitingRoomQueueView.as_view(), name='appointment_public_queue'),
    path('<uuid:pk>/', AppointmentDetailView.as_view(), name='appointment_detail'),
    path('<uuid:pk>/track/', PublicLiveQueueTrackView.as_view(), name='appointment_track_queue'),
    path('<uuid:pk>/cancel/', AppointmentCancelView.as_view(), name='appointment_cancel'),
    path('<uuid:pk>/complete/', AppointmentCompleteView.as_view(), name='appointment_complete'),
    path('<uuid:pk>/checkin/', AppointmentCheckInView.as_view(), name='appointment_checkin'),
    path('<uuid:pk>/emergency/', AppointmentEmergencyFlagView.as_view(), name='appointment_emergency'),
]


