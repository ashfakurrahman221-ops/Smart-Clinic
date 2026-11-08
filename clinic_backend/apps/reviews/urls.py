from django.urls import path
from .views import ReviewListView, ReviewCreateView, MyReviewsView, ReviewCheckView

app_name = 'reviews'

urlpatterns = [
    path('', ReviewListView.as_view(), name='review_list'),
    path('create/', ReviewCreateView.as_view(), name='review_create'),
    path('my/', MyReviewsView.as_view(), name='my_reviews'),
    path('check/', ReviewCheckView.as_view(), name='review_check'),
]
