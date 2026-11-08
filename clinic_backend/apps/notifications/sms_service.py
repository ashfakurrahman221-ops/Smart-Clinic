import logging
import threading
import urllib.request
import urllib.parse
from typing import Optional
from django.conf import settings
from .models import Notification, NotificationType

logger = logging.getLogger(__name__)

def normalize_bd_phone(phone: Optional[str]) -> str:
    """
    Normalizes any Bangladeshi mobile number format into 8801XXXXXXXXX.
    e.g. 01711999999 -> 8801711999999
         +8801711999999 -> 8801711999999
         8801711999999 -> 8801711999999
    """
    if not phone:
        return "8801700000000"
    cleaned = ''.join(c for c in str(phone) if c.isdigit())
    if cleaned.startswith("880") and len(cleaned) == 13:
        return cleaned
    if cleaned.startswith("01") and len(cleaned) == 11:
        return f"88{cleaned}"
    if len(cleaned) == 10 and cleaned.startswith("1"):
        return f"880{cleaned}"
    return cleaned or "8801700000000"


def _async_gateway_dispatch(full_url: str, normalized_phone: str, title: str, message: str):
    """
    Background worker thread for external SMS gateway dispatch (GAP-ASYNC-01).
    Prevents web workers from blocking during telco network latency.
    """
    try:
        req = urllib.request.Request(full_url, headers={'User-Agent': 'SmartClinic-SMS/1.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            resp_text = response.read().decode('utf-8', errors='ignore')
            logger.info(f"[BD SMS DISPATCH -> +{normalized_phone}] LIVE_SENT: {resp_text[:50]} | Title: {title}")
    except Exception as e:
        logger.warning(f"[BD SMS GATEWAY ERR -> +{normalized_phone}] {e}")


def send_sms_notification(
    *,
    recipient,
    title: str,
    message: str,
    notification_type: str = NotificationType.SYSTEM,
    phone: Optional[str] = None
) -> Notification:
    """
    Dispatches SMS notification via Bangladesh SMS Gateway (GreenwebBD / BulkSMSBD / Twilio BDT)
    and saves an in-app Notification record in the database.
    """
    raw_phone = phone or getattr(recipient, 'phone', None) or '01700000000'
    normalized_phone = normalize_bd_phone(raw_phone)

    # 1. Non-blocking HTTPS gateway dispatch if token is configured (GAP-SEC-01 & GAP-ASYNC-01)
    sms_api_key = getattr(settings, 'SMS_API_KEY', '')
    sms_endpoint = getattr(settings, 'SMS_ENDPOINT_URL', 'https://api.greenweb.com.bd/api.php')
    if sms_endpoint.startswith('http://'):
        sms_endpoint = sms_endpoint.replace('http://', 'https://', 1)

    if sms_api_key and sms_api_key != 'demo_greenweb_token':
        params = {
            'token': sms_api_key,
            'to': normalized_phone,
            'message': f"[{title}] {message}"
        }
        query_str = urllib.parse.urlencode(params)
        full_url = f"{sms_endpoint}?{query_str}"
        threading.Thread(
            target=_async_gateway_dispatch,
            args=(full_url, normalized_phone, title, message),
            daemon=True
        ).start()
    else:
        logger.info(f"[SIMULATED BD SMS -> +{normalized_phone}] Title: {title} | Body: {message}")

    # 2. Persist in database
    notification = Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        is_read=False
    )
    return notification

