from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class UserProduct(models.Model):
    product_id = models.AutoField(primary_key=True, db_column='product_id')
    product_user = models.ForeignKey(User, db_column='product_user', on_delete=models.CASCADE)
    product_price = models.DecimalField(max_digits=10, decimal_places=2, db_column='product_price')
    product_image = models.BinaryField(db_column='product_image')
    product_name = models.CharField(max_length=255, db_column='product_name')

    class Meta:
        db_table = 'user_products'
        managed = True

    def __str__(self):
        return f'Product {self.product_id} (user={self.product_user_id})'


class UserCart(models.Model):

    cart_id = models.AutoField(primary_key=True, db_column='cart_id')
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)
    product_id = models.ForeignKey(UserProduct, db_column='product_id', on_delete=models.CASCADE)
    qty = models.IntegerField(db_column='product_qty', default=1)

    class Meta:
        db_table = 'user_cart'
        managed = True

    def __str__(self):
        return f'Cart row {self.cart_id}: product {self.product_id}: quantity {self.qty} (user={self.user_id})'   
    

class UserOrder(models.Model):

    order_id = models.AutoField(primary_key=True, db_column='order_id')
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)
    customer_name = models.CharField(db_column='customer_name', max_length=255)
    customer_email = models.EmailField(db_column='customer_email', null=True, blank=True)
    customer_phone = models.CharField(db_column='customer_phone', null=True, blank=True, max_length=20)
    customer_address = models.CharField(db_column='customer_address', max_length=255)
    customer_cart = models.ForeignKey(UserCart, db_column='order_cart', on_delete=models.CASCADE)
    total = models.DecimalField(max_digits=10, decimal_places=2, db_column='total', default=0.00)
    created_at = models.DateTimeField(db_column='created_at', auto_now_add=True)

    class Meta:
        db_table = 'user_orders'
        managed = True

    def __str__(self):
        return f'Order {self.order_id} (user={self.user_id})'
    