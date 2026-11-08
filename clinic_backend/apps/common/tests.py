from django.test import TestCase
from rest_framework.test import APIClient
from .models import Division, District, Upazila

class BangladeshGeoTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dhaka_div = Division.objects.create(name="Dhaka", bn_name="ঢাকা")
        self.dhaka_dist = District.objects.create(division=self.dhaka_div, name="Dhaka", bn_name="ঢাকা")
        self.dhanmondi = Upazila.objects.create(district=self.dhaka_dist, name="Dhanmondi", bn_name="ধানমন্ডি", post_code="1205")

    def test_geo_hierarchy_models(self):
        self.assertEqual(str(self.dhaka_div), "Dhaka (ঢাকা)")
        self.assertEqual(str(self.dhaka_dist), "Dhaka - Dhaka")
        self.assertEqual(str(self.dhanmondi), "Dhanmondi (Dhaka)")

    def test_divisions_endpoint(self):
        res = self.client.get("/api/v1/common/divisions/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        data = body.get("data", body)
        self.assertGreaterEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Dhaka")

    def test_districts_by_division_endpoint(self):
        res = self.client.get(f"/api/v1/common/districts/?division_id={self.dhaka_div.id}")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        data = body.get("data", body)
        self.assertGreaterEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Dhaka")

    def test_upazilas_by_district_endpoint(self):
        res = self.client.get(f"/api/v1/common/upazilas/?district_id={self.dhaka_dist.id}")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        data = body.get("data", body)
        self.assertGreaterEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Dhanmondi")
        self.assertEqual(data[0]["post_code"], "1205")
