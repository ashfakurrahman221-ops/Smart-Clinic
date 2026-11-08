from django.urls import path
from .views import (
    PaymentListCreateView,
    PaymentDetailView,
    ProcessPaymentView,
    SSLCommerzInitiateView,
    SSLCommerzSuccessCallbackView,
    SSLCommerzFailCallbackView,
    SSLCommerzCancelCallbackView,
    SSLCommerzIPNView,
)

app_name = 'payments'

urlpatterns = [
    path('', PaymentListCreateView.as_view(), name='payment_list_create'),
    path('<uuid:pk>/', PaymentDetailView.as_view(), name='payment_detail'),
    path('<uuid:pk>/process/', ProcessPaymentView.as_view(), name='process_payment'),

    path('initiate-sslcommerz/', SSLCommerzInitiateView.as_view(), name='initiate_sslcommerz'),
    path('sslcommerz/success/', SSLCommerzSuccessCallbackView.as_view(), name='sslcommerz_success'),
    path('sslcommerz/fail/', SSLCommerzFailCallbackView.as_view(), name='sslcommerz_fail'),
    path('sslcommerz/cancel/', SSLCommerzCancelCallbackView.as_view(), name='sslcommerz_cancel'),
    path('sslcommerz/ipn/', SSLCommerzIPNView.as_view(), name='sslcommerz_ipn'),
]
