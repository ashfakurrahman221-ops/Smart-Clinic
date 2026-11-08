from rest_framework.renderers import JSONRenderer

class StandardJSONRenderer(JSONRenderer):
    """
    Custom DRF renderer that standardizes response format across all endpoints.
    Format:
    {
        "success": bool,
        "data": dict | list | null,
        "errors": dict | list | str | null
    }
    """
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None
        status_code = response.status_code if response else 200

        is_success = 200 <= status_code < 300

        if is_success:
            formatted_response = {
                'success': True,
                'data': data,
                'errors': None
            }
        else:
            # If error data is already formatted by custom exception handler
            if isinstance(data, dict) and 'errors' in data and 'success' in data:
                formatted_response = data
            else:
                formatted_response = {
                    'success': False,
                    'data': None,
                    'errors': data
                }

        return super().render(formatted_response, accepted_media_type, renderer_context)
