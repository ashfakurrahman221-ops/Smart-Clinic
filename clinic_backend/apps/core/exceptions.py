from rest_framework.exceptions import APIException
from rest_framework import status

class ApplicationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An error occurred processing your request.'
    default_code = 'bad_request'

    def __init__(self, detail=None, code=None, status_code=None):
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail, code)

class BusinessLogicError(ApplicationError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Business logic rule violation.'
    default_code = 'unprocessable_entity'
