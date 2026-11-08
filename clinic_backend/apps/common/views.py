from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Division, District, Upazila
from .serializers import DivisionSerializer, DistrictSerializer, UpazilaSerializer

class DivisionListView(generics.ListAPIView):
    """
    Public API: List all 8 administrative divisions of Bangladesh.
    """
    queryset = Division.objects.all().order_by('order', 'name')
    serializer_class = DivisionSerializer
    permission_classes = [AllowAny]
    pagination_class = None


class DistrictListView(generics.ListAPIView):
    """
    Public API: List districts of Bangladesh, optionally filtered by division_id.
    """
    serializer_class = DistrictSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        queryset = District.objects.select_related('division').all().order_by('name')
        division_id = self.request.query_params.get('division_id')
        division_name = self.request.query_params.get('division_name')

        if division_id:
            queryset = queryset.filter(division_id=division_id)
        elif division_name:
            queryset = queryset.filter(division__name__iexact=division_name)

        return queryset


class UpazilaListView(generics.ListAPIView):
    """
    Public API: List upazilas/thanas of Bangladesh, optionally filtered by district_id.
    """
    serializer_class = UpazilaSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        queryset = Upazila.objects.select_related('district').all().order_by('name')
        district_id = self.request.query_params.get('district_id')
        district_name = self.request.query_params.get('district_name')

        if district_id:
            queryset = queryset.filter(district_id=district_id)
        elif district_name:
            queryset = queryset.filter(district__name__iexact=district_name)

        return queryset
