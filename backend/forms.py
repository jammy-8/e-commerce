from django import forms
from backend.models import UserProduct

class ProductForm(forms.ModelForm):
    product_image = forms.ImageField(required=False)

    class Meta:
        model = UserProduct
        fields = ['product_name', 'product_price']
    