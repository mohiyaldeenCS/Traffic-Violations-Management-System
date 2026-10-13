import io
import json
import tempfile
from pathlib import Path
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection, connections
from django.test import override_settings, TransactionTestCase
from django.utils import timezone
from unittest import skipUnless
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
import uuid
from platform_core.models import *
from platform_core.domain import finance
from platform_core.tests.test_workflows import WorkflowFixture

class MigrationTests(WorkflowFixture):
    def source(self):
        data = {
            "users": [{"id": 1}],
            "vehicles": [{"id": 2, "owner_id": 1, "plate_number": "LEGACY 2"}],
            "cameras": [{"id": 3, "location": "Old site"}],
            "violations": [{"id": 4, "user_id": 1, "vehicle_id": 2, "camera_id": 3, "violation_type": "Old rule", "fine_amount": "125.50", "violation_date": "2024-01-01T12:00:00+03:00", "status": "Paid"}]}
        path = Path(self.temp.name) / "export.json"
        path.write_text(json.dumps(data), encoding="utf-8")
        return path
    def test_import_dry_run_and_repeat_safety(self):
        source = self.source()
        options = {"actor": "admin", "currency": "XXX", "stdout": io.StringIO()}
        call_command("import_legacy", str(source), **options)
        self.assertEqual(LegacyImport.objects.count(), 0)
        self.assertEqual(Case.objects.count(), 0)
        call_command("import_legacy", str(source), apply=True, **options)
        call_command("import_legacy", str(source), apply=True, **options)
        self.assertEqual(LegacyImport.objects.count(), 1)
        obj = Case.objects.get()
        self.assertEqual(obj.status, "draft")
        self.assertEqual(obj.amount, Decimal("125.50"))
        self.assertIn("Paid", obj.notes)
        self.assertFalse(obj.owner.is_active)
        self.assertFalse(obj.owner.has_usable_password())
        self.assertEqual(Payment.objects.count(), 0)
    def test_import_bad_owner_rolls_back(self):
        source = self.source()
        data = json.loads(source.read_text())
        data["violations"][0]["user_id"] = 999
        source.write_text(json.dumps(data))
        with self.assertRaises(CommandError):
            call_command("import_legacy", str(source), actor="admin", currency="XXX", apply=True, stdout=io.StringIO())
        self.assertEqual(LegacyImport.objects.count(), 0)
        self.assertFalse(User.objects.filter(username__startswith="legacy-").exists())
    def test_seed_does_not_reset_passwords(self):
        with override_settings(SIMULATION_MODE=True):
            import os
            from unittest.mock import patch
            with patch.dict(os.environ, {"DEMO_PASSWORD": "Synthetic-password-294!"}):
                call_command("seed_demo", stdout=io.StringIO())
                call_command("seed_demo", stdout=io.StringIO())
            self.assertEqual(User.objects.filter(username__startswith="demo.").count(), 8)
    def test_schema_generation_valid(self):
        with tempfile.TemporaryDirectory() as target:
            call_command("spectacular", file=str(Path(target) / "openapi.yml"), validate=True, stdout=io.StringIO())

@skipUnless(connection.vendor == "postgresql", "PostgreSQL concurrency")
class ConcurrencyTests(TransactionTestCase):
    def test_simultaneous_payment_replay_has_one_ledger_entry(self):
        agency = Agency.objects.create(code="CONC", name="Concurrency")
        actor = User.objects.create(username="finance", agency=agency, role="finance")
        owner = User.objects.create(username="owner", agency=agency, role="citizen")
        vehicle = Vehicle.objects.create(agency=agency, owner=owner, plate="TEST", country="ZZ")
        rule = Rule.objects.create(agency=agency, code="T", title="Test", amount="100.00", currency="XXX")
        case = Case.objects.create(agency=agency, created_by=actor, owner=owner, vehicle=vehicle, plate="TEST", rule=rule, rule_title="Test", amount="100.00", currency="XXX", appeal_days=30, reference="CONC-1", source_ref="1", location="Test", occurred_at=timezone.now(), issued_at=timezone.now(), status="issued")
        payload = {"reference": "BANK-1", "amount": Decimal("100.00"), "currency": "XXX", "idempotency_key": uuid.uuid4()}
        def pay():
            try:
                return str(finance.settle(User.objects.get(pk=actor.pk), case.pk, payload).pk)
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(lambda _: pay(), range(2)))
        self.assertEqual(outcomes[0], outcomes[1])
        self.assertEqual(Payment.objects.count(), 1)

