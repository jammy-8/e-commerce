from django.shortcuts import render


class Force404ToTemplateMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/static/'):
            return self.get_response(request)
        
        response = self.get_response(request)
        
        if response.status_code == 404:
            from django.shortcuts import render
            return render(request, '404.html', status=404)

        return response
