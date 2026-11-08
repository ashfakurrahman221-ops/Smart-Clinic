from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer
from .services import create_review


@extend_schema(tags=['Reviews'])
class ReviewListView(generics.ListAPIView):
    """
    GET /api/v1/reviews/?doctor_id=X&clinic_id=Y
    Public — anyone can view verified reviews for a doctor or clinic.
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Review.objects.select_related('patient', 'doctor', 'clinic').all()
        doctor_id = self.request.query_params.get('doctor_id')
        clinic_id = self.request.query_params.get('clinic_id')
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)
        return qs


@extend_schema(tags=['Reviews'])
class ReviewCreateView(APIView):
    """
    POST /api/v1/reviews/
    Authenticated patient submits review for their COMPLETED appointment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = create_review(
            appointment_id=str(serializer.validated_data['appointment_id']),
            patient=request.user,
            rating=serializer.validated_data['rating'],
            comment=serializer.validated_data.get('comment', '')
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Reviews'])
class MyReviewsView(generics.ListAPIView):
    """
    GET /api/v1/reviews/my/
    Returns all reviews submitted by the authenticated patient.
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.select_related('patient', 'doctor', 'clinic').filter(
            patient=self.request.user
        )


@extend_schema(tags=['Reviews'])
class ReviewCheckView(APIView):
    """
    GET /api/v1/reviews/check/?appointment_id=<uuid>
    Returns whether a review exists for a given appointment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        appointment_id = request.query_params.get('appointment_id')
        if not appointment_id:
            return Response({'has_review': False, 'review': None})
        try:
            review = Review.objects.get(appointment_id=appointment_id, patient=request.user)
            return Response({'has_review': True, 'review': ReviewSerializer(review).data})
        except Review.DoesNotExist:
            return Response({'has_review': False, 'review': None})
