"""Template context processors for the project."""

from typing import Dict
from django.db.models import Sum
from .models import UserCart


def cart_count(request) -> Dict[str, int]:
    """Return cart_count from the session or DB so templates can show it.

    - If the user is authenticated and the `user_cart` table exists, sum the `qty`
      for that user.
    - Otherwise, fall back to the session-based cart (legacy/localStorage flow).
    """
    # Try DB-backed cart for authenticated users first
    if getattr(request, 'user', None) and request.user.is_authenticated:
        try:
            res = UserCart.objects.filter(user=request.user).aggregate(total=Sum('qty'))
            total = int(res['total'] or 0)
            return {'cart_count': total}
        except Exception:
            # If the table or model doesn't exist yet, fall back to session
            pass

    # fallback to session-based count
    try:
        cart = request.session.get('cart', []) or []
        total = sum(int(item.get('qty', 1)) for item in cart if isinstance(item, dict))
    except Exception:
        total = 0
    return {'cart_count': total}   
