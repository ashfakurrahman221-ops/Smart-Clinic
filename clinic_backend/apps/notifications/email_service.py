import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

def send_approval_email(recipient_email, recipient_name, subject, message):
    """
    Sends an approval email via Django mail backend (Gmail SMTP).
    Catches errors gracefully so lack of SMTP credentials in local dev does not break the API.
    """
    if not recipient_email:
        return False

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@smartclinic.com')

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Approval email sent to {recipient_email}")
        return True
    except Exception as e:
        logger.warning(f"Email dispatch to {recipient_email} skipped or failed: {str(e)}")
        return False


def send_password_reset_email(recipient_email: str, reset_url: str) -> bool:
    """
    Sends a secure password reset email via Django mail backend.
    Catches errors gracefully so lack of SMTP credentials in local dev does not break the API.
    """
    if not recipient_email:
        return False

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@smartclinic.com')
    subject = "Reset Your Smart Clinic Password"
    message = (
        f"Hello,\n\n"
        f"We received a request to reset the password for your Smart Clinic account.\n\n"
        f"You can reset your password by opening the following link:\n"
        f"{reset_url}\n\n"
        f"This password reset link is valid for 1 hour.\n\n"
        f"If you did not request a password reset, please ignore this email. "
        f"Your account remains completely secure.\n\n"
        f"Best regards,\n"
        f"The Smart Clinic Team\n"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Password reset email sent to {recipient_email}")
        return True
    except Exception as e:
        logger.warning(f"Password reset email dispatch to {recipient_email} skipped or failed: {str(e)}")
        return False

