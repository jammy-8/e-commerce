from django.contrib import admin
from .models import UserProduct, UserCart , UserOrder

admin.site.register(UserProduct)
admin.site.register(UserCart)
admin.site.register(UserOrder)
