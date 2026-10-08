from rest_framework import generics, permissions, status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Notification
from .serializers import NotificationSerializer

@extend_schema(tags=['Notifications'])
class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

@extend_schema(tags=['Notifications'])
class NotificationMarkReadView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def post(self, request, pk, *args, **kwargs):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
            notification.is_read = True
            notification.save(update_fields=['is_read', 'updated_at'])
            return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)

@extend_schema(tags=['Notifications'])
class NotificationDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/v1/notifications/<pk>/
    Allows authenticated users to delete their own notification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

@extend_schema(tags=['Notifications'])
class NotificationClearAllView(generics.GenericAPIView):
    """
    DELETE /api/v1/notifications/clear-all/
    Deletes all notifications for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        count, _ = Notification.objects.filter(recipient=request.user).delete()
        return Response({'detail': f'{count} notifications deleted.'}, status=status.HTTP_200_OK)
