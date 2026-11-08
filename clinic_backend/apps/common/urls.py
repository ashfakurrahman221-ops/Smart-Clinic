from django.urls import path
from .views import DivisionListView, DistrictListView, UpazilaListView

app_name = 'common'

urlpatterns = [
    path('divisions/', DivisionListView.as_view(), name='division-list'),
    path('districts/', DistrictListView.as_view(), name='district-list'),
    path('upazilas/', UpazilaListView.as_view(), name='upazila-list'),
]
