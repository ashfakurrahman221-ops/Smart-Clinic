import json
import logging
import urllib.request
import urllib.parse
from django.conf import settings

logger = logging.getLogger(__name__)

def get_sslcommerz_urls():
    if getattr(settings, 'SSLCOMMERZ_IS_SANDBOX', True):
        return {
            'session': 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
            'validation': 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php',
        }
    return {
        'session': 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
        'validation': 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php',
    }

def initiate_sslcommerz_session(payment, customer_name="Patient", customer_email="patient@example.com", customer_phone="01700000000"):
    """
    Initializes an SSLCommerz hosted payment session.
    Returns the GatewayPageURL to redirect the user to.
    Falls back to the frontend interactive simulator URL if sandbox connection is unavailable.
    """
    urls = get_sslcommerz_urls()
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5173')
    backend_url = getattr(settings, 'BACKEND_URL', 'http://127.0.0.1:8000')

    payload = {
        'store_id': getattr(settings, 'SSLCOMMERZ_STORE_ID', 'testbox'),
        'store_passwd': getattr(settings, 'SSLCOMMERZ_STORE_PASS', 'qwerty'),
        'total_amount': str(payment.amount),
        'currency': payment.currency or 'BDT',
        'tran_id': str(payment.id),
        'success_url': f"{backend_url}/api/v1/payments/sslcommerz/success/",
        'fail_url': f"{backend_url}/api/v1/payments/sslcommerz/fail/",
        'cancel_url': f"{backend_url}/api/v1/payments/sslcommerz/cancel/",
        'ipn_url': f"{backend_url}/api/v1/payments/sslcommerz/ipn/",
        'cus_name': customer_name or 'Patient',
        'cus_email': customer_email or 'patient@example.com',
        'cus_add1': 'Dhaka, Bangladesh',
        'cus_city': 'Dhaka',
        'cus_country': 'Bangladesh',
        'cus_phone': customer_phone or '01700000000',
        'shipping_method': 'NO',
        'product_name': f"Doctor Consultation #{str(payment.appointment_id)[:8]}",
        'product_category': 'Healthcare Service',
        'product_profile': 'non-physical-goods',
    }

    try:
        encoded_data = urllib.parse.urlencode(payload).encode('utf-8')
        req = urllib.request.Request(
            urls['session'],
            data=encoded_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)

            if res_json.get('status') == 'SUCCESS' and res_json.get('GatewayPageURL'):
                logger.info("SSLCommerz session created successfully: %s", res_json.get('sessionkey'))
                return res_json['GatewayPageURL']
            else:
                logger.warning("SSLCommerz returned non-success: %s", res_json.get('failedreason', 'Unknown'))
    except Exception as e:
        logger.warning("SSLCommerz connection exception (falling back to interactive checkout): %s", str(e))

    # Graceful fallback to Smart Clinic interactive gateway simulator
    return f"{frontend_url}/checkout/{payment.id}"

def verify_sslcommerz_payment(val_id):
    """
    Validates transaction using SSLCommerz Validation API.
    """
    if not val_id:
        return None

    val_id = str(val_id).strip()
    if not val_id:
        return None

    urls = get_sslcommerz_urls()
    params = {
        'val_id': val_id,
        'store_id': getattr(settings, 'SSLCOMMERZ_STORE_ID', 'testbox'),
        'store_passwd': getattr(settings, 'SSLCOMMERZ_STORE_PASS', 'qwerty'),
        'format': 'json',
    }
    query_str = urllib.parse.urlencode(params)
    req_url = f"{urls['validation']}?{query_str}"

    try:
        req = urllib.request.Request(req_url)
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode('utf-8')
            return json.loads(res_body)
    except Exception as e:
        logger.warning("SSLCommerz validation error: %s", str(e))
        return None
