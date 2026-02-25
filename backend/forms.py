from django import forms
from backend.models import UserProduct

class ProductForm(forms.ModelForm):

    class Meta:
        model = UserProduct
        fields = ['product_name', 'product_price', 'product_image']
    