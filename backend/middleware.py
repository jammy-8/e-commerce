from django.shortcuts import render


class Force404ToTemplateMiddleware:
    """Middleware that forces all 404 responses to render the project's `404.html` template,
    even when DEBUG=True. This runs on each response and replaces 404 responses with
    the rendered template having status 404.

    Note: This will render HTML for any 404, so if you have JSON API endpoints that
    should return JSON 404 responses you may want to add a content-type check.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return self.process_response(request, response)

    def process_response(self, request, response):
        # Safely get status_code (response may be unusual in some cases)
        status = getattr(response, 'status_code', None)
        if status == 404:
            # Only replace the response when the client accepts HTML. This
            # avoids turning JSON API 404s into HTML pages.
            accept = request.META.get('HTTP_ACCEPT', '')
            if 'html' in accept or '*/*' in accept or not accept:
                # Render the project's 404.html using Django's template system so
                # context processors are applied. Return with status 404.
                return render(request, '404.html', status=404)
            # Otherwise keep the original response (e.g., JSON APIs)
        return response
