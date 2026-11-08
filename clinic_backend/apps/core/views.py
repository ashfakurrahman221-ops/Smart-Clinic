from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework import status


class HealthCheckView(APIView):
    """
    Unauthenticated system health check endpoint for monitoring tools and load balancers.
    Verifies database connectivity with minimal overhead.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    renderer_classes = [JSONRenderer]

    def get(self, request, *args, **kwargs):
        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
            return Response(
                {
                    "status": "ok",
                    "database": "connected",
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "status": "unhealthy",
                    "database": "disconnected",
                    "detail": "Database check failed",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
