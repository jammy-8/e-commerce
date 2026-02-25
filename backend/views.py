from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout, get_user_model, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm
from django import forms
from .models import UserOrder, UserProduct, UserCart
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.db.models import Sum, Max
from django.http import JsonResponse
import base64
from io import BytesIO
from decimal import Decimal
from .forms import ProductForm 

# Image processing for product images (resize larger images server-side)
try:
    from PIL import Image
    _PIL_AVAILABLE = True
except Exception:
    Image = None
    _PIL_AVAILABLE = False


def _process_image(binary, max_width=640, max_height=480):
    """Return a data URL for the image, resizing it if larger than the provided dimensions.
    If Pillow is not available, returns the original image as base64 if possible."""
    if not binary:
        return None
    try:
        if not _PIL_AVAILABLE:
            return 'data:image/png;base64,' + base64.b64encode(binary).decode('ascii')
        img = Image.open(BytesIO(binary))
        # Convert to RGB/RGBA to avoid mode issues when saving
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
        w, h = img.size
        if w > max_width or h > max_height:
            try:
                resample = Image.Resampling.LANCZOS
            except AttributeError:
                resample = Image.ANTIALIAS
            img.thumbnail((max_width, max_height), resample)
        out = BytesIO()
        img.save(out, format='PNG')
        out.seek(0)
        return 'data:image/png;base64,' + base64.b64encode(out.read()).decode('ascii')
    except Exception:
        # Fallback to returning the raw image if something goes wrong
        try:
            return 'data:image/png;base64,' + base64.b64encode(binary).decode('ascii')
        except Exception:
            return None


def index(request):
    # Load up to 6 products for the home page (preview / featured)
    prods = UserProduct.objects.order_by('-product_id')[:6]
    products = []
    for p in prods:
        img = _process_image(p.product_image, max_width=640, max_height=480)

        print("----------------------------------------------")
        print("RAW IMAGE:" , p.product_image)
        print("PROCESSED IMAGE:", img)
        print("----------------------------------------------")

        products.append({
            'id': p.product_id,
            'name': p.product_name or f'Product {p.product_id}',
            'price': p.product_price,
            'image': p.product_image,
        })

    return render(request, 'index.html', {'products': products})




def shop(request):
    # Load products from the existing user_products table and prepare them for the template
    prods = UserProduct.objects.all()
    products = []
    for p in prods:
        img = _process_image(p.product_image, max_width=640, max_height=480)
        products.append({
            'id': p.product_id,
            'name': p.product_name or f'Product {p.product_id}',
            'price': p.product_price,
            'image': p.product_image,
        })
    return render(request, 'shop.html', {'products': products})


def login_view(request):
    if request.user.is_authenticated:
        return redirect('index')

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            messages.success(request, f'Welcome back, {user.username}!')
            next_url = request.POST.get('next') or request.GET.get('next') or 'index'
            return redirect(next_url)
        else:
            messages.error(request, 'Invalid username or password')

    return render(request, 'login.html')


def logout_view(request):
    logout(request)
    messages.info(request, 'You have been logged out.')
    return redirect('index')


def signup_view(request):
    if request.user.is_authenticated:
        return redirect('index')

    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user)
            messages.success(request, 'Account created successfully. Welcome!')
            return redirect('index')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserCreationForm()

    return render(request, 'signup.html', {'form': form})

# def 

User = get_user_model()

class ProfileForm(forms.ModelForm):
    password1 = forms.CharField(widget=forms.PasswordInput, required=False, label='New password')
    password2 = forms.CharField(widget=forms.PasswordInput, required=False, label='Confirm new password')

    class Meta:
        model = User
        fields = ['username', 'email']

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get('password1')
        p2 = cleaned.get('password2')
        if p1 or p2:
            if p1 != p2:
                raise forms.ValidationError('Passwords do not match')
        return cleaned

@login_required
def edit_profile(request):
    """Allow a logged-in user to update their username, email and password, and add products."""
    user = request.user
    product_form = ProductForm()
    if request.method == 'POST':
        # Which form was submitted?
        if 'save_profile' in request.POST:
            form = ProfileForm(request.POST, instance=user)
            if form.is_valid():
                user = form.save(commit=False)
                new_password = form.cleaned_data.get('password1')
                if new_password:
                    user.set_password(new_password)
                user.save()
                if new_password:
                    update_session_auth_hash(request, user)
                messages.success(request, 'Profile updated successfully.')
                return redirect('index')
            else:
                messages.error(request, 'Please correct the errors below.')
        elif 'add_product' in request.POST:
            product_form = ProductForm(request.POST, request.FILES)
            if product_form.is_valid():
                prod = product_form.save(commit=False)
                prod.product_user = user

                from django.db.models import Max
                max_id = UserProduct.objects.aggregate(Max('product_id'))['product_id__max'] or 0
                prod.product_id = max_id + 1
                prod.save()
                messages.success(request, 'Product added successfully.')
                return redirect('edit_profile')
            else:
                messages.error(request, 'Please correct the product errors below.')
        elif 'delete_product' in request.POST:
            pid = request.POST.get('delete_product')
            try:
                prod = UserProduct.objects.get(product_id=pid, product_user=user)
                prod.delete()
                messages.success(request, 'Product deleted successfully.')
            except UserProduct.DoesNotExist:
                messages.error(request, 'Product not found or you do not have permission to delete it.')
            return redirect('edit_profile')
    else:
        form = ProfileForm(instance=user)
    # List the current user's products
    products = UserProduct.objects.filter(product_user=user)
    return render(request, 'edit_profile.html', {'form': form, 'product_form': product_form, 'products': products})

# Update shop view product mapping to include name


def custom_404_view(request, exception):
    """Custom 404 page handler."""
    # Keep this simple — render the existing 404 template with a 404 status.
    return render(request, '404.html', status=404)

@login_required
def add_to_cart(request):
    if request.method == 'POST':
        product_id = request.POST.get('product_id')

        if not request.user.is_authenticated:
            # For AJAX requests return JSON, otherwise redirect to login
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'ok': False, 'error': 'auth-required'}, status=403)
            return redirect('login')

        # Ensure product exists
        try:
            product = UserProduct.objects.get(product_id=product_id)
        except UserProduct.DoesNotExist:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'ok': False, 'error': 'product-not-found'}, status=404)
            messages.error(request, 'Product not found.')
            return redirect('/shop')

        user_cart, created = UserCart.objects.get_or_create(
            user=request.user,
            product_id=product,
            defaults={'qty': 1}
        )
        if not created:
            user_cart.qty = (user_cart.qty or 0) + 1
            user_cart.save()

        # Return JSON for AJAX, otherwise redirect
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'ok': True, 'created': created, 'product_id': str(product_id), 'qty': user_cart.qty})
        return redirect('/shop')

@login_required
def checkout(request):
        
    cart_items = (
    UserCart.objects
       .filter(user=request.user)
        .select_related('product_id')
    )

    if not cart_items.exists():
        if request.method == 'POST':
            return JsonResponse({'ok': False, 'error': 'empty-cart'}, status=400)
        return render(request, 'checkout.html', {'cart_items': [], 'total': Decimal('0.00')})

    cart = []
    total = Decimal('0.00')

    for item in cart_items:
        product = item.product_id
        price = Decimal(product.product_price)
        line_total = price * item.qty

        cart.append({
            'id': (product.product_id),
            'name': product.product_name,
            'price': float(product.product_price),
            'qty': item.qty,
            'line_total': (line_total),
        })

        total += line_total

    if request.method == 'GET':
        return render(request, 'checkout.html', {
            'cart_items': cart,
            'total': total,
        })

    user_order, created = UserOrder.objects.get_or_create(
    user=request.user,
    defaults={
        'customer_name': request.POST.get('name'),
        'customer_email': request.POST.get('email') or None,
        'customer_phone': request.POST.get('phone') or None,
        'customer_address': request.POST.get('address'),
        'total': total, 
        'customer_cart': cart_items.first() if cart_items.exists() else None,
        }
    )

    if not created:
        user_order.customer_name = request.POST.get('name')
        user_order.customer_email = request.POST.get('email') or None
        user_order.customer_phone = request.POST.get('phone') or None
        user_order.customer_address = request.POST.get('address')
        user_order.total = total
        user_order.save()

    order_id = user_order.order_id

    order = {
        'id': order_id,
        'customer_name': request.POST.get('name'),
        'customer_email': request.POST.get('email') or None,
        'customer_phone': request.POST.get('phone') or None,
        'customer_address': request.POST.get('address'),
        'cart': cart,
        'total': str(total),
    }

    request.session['last_order'] = user_order.order_id

    return redirect('checkout_success')


def checkout_success(request):
    order = request.session.get('last_order')

    if not order:
        messages.error(request, 'No recent order found in session.')
        return redirect('index')

    order = UserOrder.objects.get(order_id=order)
    return render(request, 'checkout_success.html', {'order': order})

def clear_cart(request):
    if request.method == 'POST':
        if request.user.is_authenticated:
            UserCart.objects.filter(user=request.user).delete()
            return redirect('checkout')
        else:
            return JsonResponse({'ok': False, 'error': 'auth-required'}, status=403)
    return redirect('checkout')
