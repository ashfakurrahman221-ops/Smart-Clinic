from django.urls import path
from .views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationDeleteView,
    NotificationClearAllView,
)

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('clear-all/', NotificationClearAllView.as_view(), name='notification_clear_all'),
    path('<uuid:pk>/read/', NotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('<uuid:pk>/', NotificationDeleteView.as_view(), name='notification_delete'),
]
