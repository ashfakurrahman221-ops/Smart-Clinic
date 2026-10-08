from django.db import models
from apps.core.models import BaseModel

class Division(BaseModel):
    """
    Administrative division of Bangladesh (8 divisions).
    """
    name = models.CharField(max_length=100, unique=True, db_index=True)
    bn_name = models.CharField(max_length=100, blank=True, default='')
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Division'
        verbose_name_plural = 'Divisions'

    def __str__(self):
        return f"{self.name} ({self.bn_name})" if self.bn_name else self.name


class District(BaseModel):
    """
    District of Bangladesh (64 districts) linked to Division.
    """
    division = models.ForeignKey(Division, on_delete=models.CASCADE, related_name='districts')
    name = models.CharField(max_length=100, db_index=True)
    bn_name = models.CharField(max_length=100, blank=True, default='')
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ['name']
        unique_together = ('division', 'name')
        verbose_name = 'District'
        verbose_name_plural = 'Districts'

    def __str__(self):
        return f"{self.name} - {self.division.name}"


class Upazila(BaseModel):
    """
    Upazila / Thana of Bangladesh linked to District.
    """
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='upazilas')
    name = models.CharField(max_length=100, db_index=True)
    bn_name = models.CharField(max_length=100, blank=True, default='')
    post_code = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        ordering = ['name']
        unique_together = ('district', 'name')
        verbose_name = 'Upazila'
        verbose_name_plural = 'Upazilas'

    def __str__(self):
        return f"{self.name} ({self.district.name})"
