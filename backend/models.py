from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class UserProduct(models.Model):
    product_id = models.AutoField(primary_key=True, db_column='product_id')
    product_user = models.ForeignKey(User, db_column='product_user', on_delete=models.CASCADE)
    product_price = models.CharField(max_length=255, db_column='product_price')
    product_image = models.BinaryField(null=True, db_column='product_image')
    product_name = models.CharField(max_length=255, null=True, db_column='product_name')

    class Meta:
        db_table = 'user_products'
        managed = False

    def __str__(self):
        return f'Product {self.product_id} (user={self.product_user_id})'