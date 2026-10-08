import logging
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

    # 1. Attempt Gateway HTTP Dispatch if token is configured
    sms_api_key = getattr(settings, 'SMS_API_KEY', '')
    sms_endpoint = getattr(settings, 'SMS_ENDPOINT_URL', 'http://api.greenweb.com.bd/api.php')

    gateway_status = "SIMULATED_DISPATCH"
    if sms_api_key and sms_api_key != 'demo_greenweb_token':
        try:
            params = {
                'token': sms_api_key,
                'to': normalized_phone,
                'message': f"[{title}] {message}"
            }
            query_str = urllib.parse.urlencode(params)
            full_url = f"{sms_endpoint}?{query_str}"
            req = urllib.request.Request(full_url, headers={'User-Agent': 'SmartClinic-SMS/1.0'})
            with urllib.request.urlopen(req, timeout=4) as response:
                resp_text = response.read().decode('utf-8', errors='ignore')
                gateway_status = f"LIVE_SENT: {resp_text[:50]}"
        except Exception as e:
            gateway_status = f"GATEWAY_ERR: {str(e)[:50]}"
            logger.warning(f"Live SMS dispatch error: {e}")

    # Log clean formatted output to logger
    try:
        logger.info(f"[BD SMS DISPATCH -> +{normalized_phone}] ({gateway_status}) Title: {title} | Body: {message}")
    except Exception:
        pass

    # 2. Persist in database
    notification = Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        is_read=False
    )
    return notification

