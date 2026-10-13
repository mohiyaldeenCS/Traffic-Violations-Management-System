import os
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from platform_core.models import Agency, User, Vehicle, Camera, Rule

class Command(BaseCommand):
    help = "Create explicit synthetic evaluation accounts; never run in production."
    @transaction.atomic
    def handle(self, *args, **options):
        if settings.PRODUCTION or not settings.SIMULATION_MODE:
            raise CommandError("Set SIMULATION_MODE=1 outside production.")
        password = os.getenv("DEMO_PASSWORD", "")
        if not password:
            raise CommandError("Supply DEMO_PASSWORD through the environment.")
        validate_password(password)
        agency, _ = Agency.objects.get_or_create(code="DEMO", defaults={"name": "جهة التقييم الصناعي"})
        for role, _ in User.Role.choices:
            username = "demo." + role
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(username=username, password=password, agency=agency, role=role)
        owner = User.objects.get(username="demo.citizen")
        Vehicle.objects.get_or_create(agency=agency, plate="TEST 1001", country="ZZ", region="اختبار", defaults={"owner": owner, "model": "مركبة صناعية", "color": "أبيض"})
        Camera.objects.get_or_create(agency=agency, code="SIM-01", defaults={"location": "موقع اختبار غير حقيقي", "adapter": "simulator"})
        Rule.objects.get_or_create(agency=agency, code="DEMO-01", defaults={"title": "قاعدة تقييم — ليست تشريعًا", "amount": "100.00", "currency": "XXX", "appeal_days": 30})
        self.stdout.write("Synthetic accounts ready; no existing passwords or cases modified.")

