from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm


def index(request):
    return render(request, 'index.html')


import base64

def shop(request):
    # Load products from the existing user_products table and prepare them for the template
    prods = UserProduct.objects.all()
    products = []
    for p in prods:
        img = None
        if p.product_image:
            try:
                img = 'data:image/png;base64,' + base64.b64encode(p.product_image).decode('ascii')
            except Exception:
                img = None
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


from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model, update_session_auth_hash
from django import forms
from .models import UserProduct

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


