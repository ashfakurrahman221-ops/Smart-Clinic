from rest_framework import serializers
from .models import Division, District, Upazila

class DivisionSerializer(serializers.ModelSerializer):
    districts_count = serializers.IntegerField(source='districts.count', read_only=True)

    class Meta:
        model = Division
        fields = ['id', 'name', 'bn_name', 'order', 'districts_count']


class DistrictSerializer(serializers.ModelSerializer):
    division_name = serializers.CharField(source='division.name', read_only=True)
    upazilas_count = serializers.IntegerField(source='upazilas.count', read_only=True)

    class Meta:
        model = District
        fields = ['id', 'division', 'division_name', 'name', 'bn_name', 'lat', 'lon', 'upazilas_count']


class UpazilaSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)

    class Meta:
        model = Upazila
        fields = ['id', 'district', 'district_name', 'name', 'bn_name', 'post_code']
