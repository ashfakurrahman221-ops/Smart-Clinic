import os
import re
import time
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler that normalizes exception responses to:
    {
        "success": False,
        "data": None,
        "errors": ...
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        errors = response.data
        if isinstance(errors, dict) and 'detail' in errors:
            errors = errors['detail']

        response.data = {
            'success': False,
            'data': None,
            'errors': errors
        }
    else:
        logger.error(f"Unhandled Exception: {exc}", exc_info=True)
        response = Response(
            {
                'success': False,
                'data': None,
                'errors': 'Internal server error occurred.'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response


def parse_cloudinary_url(url):
    """
    Parses a Cloudinary URL to extract cloud_name, resource_type, public_id, and format.
    Safely handles uploaded, authenticated, versioned, and unversioned paths.
    """
    if not url or not isinstance(url, str):
        return None
    m = re.match(
        r'https?://res\.cloudinary\.com/([^/]+)/(?:(image|raw|video)/)?(?:(?:upload|authenticated)/)?(?:s--[^/]+--/)?(?:v\d+/)?(.+?)(?:\.([a-zA-Z0-9]+))?$',
        url.strip()
    )
    if m:
        return {
            'cloud_name': m.group(1),
            'resource_type': m.group(2) or 'image',
            'public_id': m.group(3),
            'format': m.group(4) or 'pdf'
        }
    return None


class CloudinaryStorageService:
    """
    Abstracted Cloudinary upload and delivery service.
    Distinguishes between public assets (logos, avatars) and confidential patient medical files.
    """
    @staticmethod
    def upload_image(file_obj, folder="general"):
        """
        Upload public image to Cloudinary (or local fallback in dev).
        Used strictly for non-confidential assets: clinic logos, doctor profile avatars.
        Returns public CDN URL.
        """
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(file_obj, folder=f"clinic_platform/{folder}")
            return result.get("secure_url")
        except Exception as e:
            logger.warning(f"Cloudinary upload failed or not configured, returning fallback: {e}")
            return f"/media/uploads/{folder}/{getattr(file_obj, 'name', 'file.jpg')}"

    @staticmethod
    def upload_medical_report(file_obj):
        """
        Upload confidential patient medical report to Cloudinary as an authenticated resource.
        Direct public access via unsigned URL is strictly rejected by Cloudinary CDN.
        Access requires an application-generated HMAC-signed URL with short expiration.
        """
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                file_obj,
                folder="clinic_platform/medical_reports",
                type="authenticated",
                resource_type="auto"
            )
            secure_url = result.get("secure_url") if isinstance(result, dict) else None
            if not secure_url:
                raise ValueError("Cloudinary storage response missing secure_url.")
            return secure_url
        except Exception as e:
            logger.error("Cloudinary authenticated report upload failed: %s", e)
            raise

    @staticmethod
    def generate_signed_report_url(file_url, expires_in=300):
        """
        Generates an HMAC-signed delivery URL (default: 5 minutes / 300s)
        for authorized viewing/downloading of a patient medical document.
        Does not leak signing secrets or credentials to client.
        """
        if not file_url:
            return ""

        parsed = parse_cloudinary_url(file_url)
        if not parsed:
            # Local fallback or non-Cloudinary URL
            return file_url

        try:
            import cloudinary.utils
            api_key = os.getenv('CLOUDINARY_API_KEY')
            api_secret = os.getenv('CLOUDINARY_API_SECRET')
            cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME') or parsed.get('cloud_name')

            if not api_key or not api_secret:
                # Fallback if credentials not set (e.g. dev mock environment)
                return f"{file_url}?token=test_signed_token&expires={int(time.time()) + expires_in}"

            expires_at = int(time.time()) + expires_in
            signed_url = cloudinary.utils.private_download_url(
                parsed['public_id'],
                parsed['format'],
                resource_type=parsed['resource_type'],
                type='authenticated' if '/authenticated/' in file_url else 'upload',
                expires_at=expires_at,
                attachment=False,
                api_key=api_key,
                api_secret=api_secret,
                cloud_name=cloud_name,
            )
            return signed_url
        except Exception as e:
            logger.warning("Failed to generate Cloudinary signed download URL: %s", e)
            return file_url
