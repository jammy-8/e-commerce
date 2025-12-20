"""Template context processors for the project."""

from typing import Dict


def cart_count(request) -> Dict[str, int]:
    """Return cart_count from the session so templates can show it.

    Expects request.session['cart'] to be a list of item dicts with optional 'qty' keys,
    e.g. [{'id':1, 'qty':2}, ...]. If the key is absent or malformed, returns 0.
    """
    try:
        cart = request.session.get('cart', []) or []
        total = sum(int(item.get('qty', 1)) for item in cart if isinstance(item, dict))
    except Exception:
        total = 0
    return {'cart_count': total}
