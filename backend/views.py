from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout, get_user_model, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm
from django import forms
from .models import UserProduct, UserCart
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.db.models import Sum, Max
import json
import time
from django.http import JsonResponse
import base64
from io import BytesIO

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
    prods = UserProduct.objects.all()[:6]
    products = []
    for p in prods:
        img = _process_image(p.product_image, max_width=640, max_height=480)
        products.append({
            'id': p.product_id,
            'name': p.product_name or f'Product {p.product_id}',
            'price': p.product_price,
            'image': img,
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
            'image': img,
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

class ProductForm(forms.ModelForm):
    # Keep image as a plain FileField (the model stores binary data and is non-editable)
    product_image = forms.FileField(required=False, label='Image')

    class Meta:
        model = UserProduct
        # Edit product_name and product_price; product_image handled separately
        fields = ['product_name', 'product_price']

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
                # Handle uploaded image file
                uploaded = request.FILES.get('product_image')
                if uploaded:
                    prod.product_image = uploaded.read()
                # Some existing tables may not have an auto-incrementing primary key; set one if needed
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


def add_to_cart(request):
    if request.method == 'POST':
        product_id = request.POST.get('product_id')
        product_price = request.POST.get('product_price')

        if request.user.is_authenticated:
            user_cart, created = UserCart.objects.get_or_create(
                user=request.user,
                product_id=product_id,
                defaults={'product_price': product_price, 'qty': 1}
            )
            if not created:
                user_cart.qty += 1
                user_cart.save()
                console.log('Updated quantity for product_id:', product_id)

            return redirect('/shop')

def checkout(request):
    if request.method == 'GET':
        return render(request, 'checkout.html')

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'ok': False, 'error': 'invalid-json'}, status=400)

    cart = payload.get('cart', [])
    customer = payload.get('customer', {})

    # Very small validation
    if not cart or not customer.get('name') or not customer.get('email'):
        return JsonResponse({'ok': False, 'error': 'missing-fields'}, status=400)

    order_id = int(time.time() * 1000)
    order = {
        'id': order_id,
        'cart': cart,
        'customer': customer,
        'total': sum((float(i.get('price', 0)) * int(i.get('qty', 1))) for i in cart)
    }

    request.session['last_order'] = order

    return JsonResponse({'ok': True, 'order_id': order_id})


def checkout_success(request):
    """Simple success page that shows the last order stored in the session."""
    order = request.session.get('last_order')
    return render(request, 'checkout_success.html', {'order': order})


@login_required
@require_POST
def sync_cart(request):
    # Expect only POST requests here — handle POST payload and sync to DB.
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            cart_data = data.get('cart', [])
            logger.info('sync_cart called for user=%s with %s items', getattr(request.user, 'id', None), len(cart_data))

            if request.user.is_authenticated:
                # Clear existing cart items for the user
                UserCart.objects.filter(user=request.user).delete()

                # Add new cart items
                for item in cart_data:
                    UserCart.objects.update_or_create(
                        user=request.user,
                        product_id=item.get('id'),
                        defaults={
                            'product_price': int(float(item.get('price', 0))),
                            'qty': item.get('qty', 1)
                        }
                    )
                return JsonResponse({'status': 'Success', 'message': 'Cart synchronized successfully.'})
            return JsonResponse({'status': 'guest', 'message': 'Saved locally only'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    # If we reach here something unexpected occurred — return method not allowed.
    return JsonResponse({'status': 'failed'}, status=405)


@login_required
def cart_get(request):
    try:
        # Group by product_id and sum qty
        qs = UserCart.objects.filter(user=request.user).values('product_id').annotate(qty=Sum('qty'), price=Max('product_price'))
        items = []
        for row in qs:
            user = request.user
            pid = row['product_id']
            qty = int(row['qty'])
            price = float(row['price'] or 0)
            title = f'Product {pid}'
            try:
                prod = UserProduct.objects.get(product_id=pid)
                title = prod.product_name or title
                price = float(prod.product_price)
            except Exception:
                pass
            items.append({'id': pid, 'user': user, 'title': title, 'price': price, 'qty': qty})
        total = sum(i['price'] * i['qty'] for i in items)
        return JsonResponse({'ok': True, 'cart': items, 'total': total})
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


