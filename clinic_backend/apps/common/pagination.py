from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class StandardPageNumberPagination(PageNumberPagination):
    page_size = 200
    page_size_query_param = 'page_size'
    max_page_size = 500

    def paginate_queryset(self, queryset, request, view=None):
        qp = getattr(request, 'query_params', None)
        if qp is None:
            qp = getattr(request, 'GET', {})
        if qp.get('all') == 'true' or qp.get('pagination') == 'false':
            return None
        return super().paginate_queryset(queryset, request, view=view)

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })
