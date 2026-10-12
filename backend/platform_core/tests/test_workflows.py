import io
import tempfile
import uuid
from decimal import Decimal
from datetime import timedelta
from pathlib import Path
from unittest import skipUnless
from PIL import Image
from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection, transaction, DatabaseError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from platform_core.models import *
from platform_core.domain.audit import verify
from platform_core.domain import enforcement, evidence
from platform_core.adapters import *

class WorkflowFixture(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.agency = Agency.objects.create(code="T1", name="Test One")
        cls.other = Agency.objects.create(code="T2", name="Test Two")
        cls.users = {}
        for role in User.Role.values:
            cls.users[role] = User.objects.create_user(username=role, password="Unique-test-password-489!", agency=cls.agency, role=role)
        cls.stranger = User.objects.create_user(username="outsider", password="Unique-test-password-489!", agency=cls.other, role="registrar")
        cls.other_owner = User.objects.create_user(username="otherowner", agency=cls.agency, role="citizen")
        cls.vehicle = Vehicle.objects.create(agency=cls.agency, owner=cls.users["citizen"], plate="TEST 01", country="ZZ")
        cls.rule = Rule.objects.create(agency=cls.agency, code="T", title="Synthetic", amount=Decimal("100.00"), currency="XXX", appeal_days=30)
        cls.camera = Camera.objects.create(agency=cls.agency, code="CAM", location="Synthetic site")

    def setUp(self):
        cache.clear()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.override = override_settings(EVIDENCE_ROOT=Path(self.temp.name), SIMULATION_MODE=True)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.client = APIClient()

    def as_role(self, role):
        self.client.force_authenticate(self.users[role])

    def create_case(self, ref=None):
        self.as_role("registrar")
        response = self.client.post("/api/v1/cases/", {"vehicle": str(self.vehicle.pk), "rule": str(self.rule.pk), "location": "Synthetic", "occurred_at": timezone.now().isoformat(), "source_ref": ref or str(uuid.uuid4())})
        self.assertEqual(response.status_code, 201, response.data)
        return Case.objects.get(pk=response.data["id"])

    def attach(self, case):
        self.as_role("registrar")
        stream = io.BytesIO()
        Image.new("RGB", (8, 8), "white").save(stream, format="PNG")
        result = self.client.post(f"/api/v1/cases/{case.pk}/evidence/", {"file": SimpleUploadedFile("original.png", stream.getvalue(), content_type="image/png"), "source": "Synthetic camera", "captured_at": timezone.now().isoformat()}, format="multipart")
        self.assertEqual(result.status_code, 201, result.data)
        return Evidence.objects.get(pk=result.data["id"])

    def transition(self, case, role, action):
        case.refresh_from_db()
        self.as_role(role)
        response = self.client.post(f"/api/v1/cases/{case.pk}/transition/", {"action": action, "version": case.version, "reason": "Verified synthetic decision"})
        self.assertEqual(response.status_code, 200, response.data)
        case.refresh_from_db()

    def issued_case(self):
        case = self.create_case()
        self.attach(case)
        for role, action in [("registrar", "submit"), ("reviewer", "review"), ("approver", "approve"), ("approver", "issue")]:
            self.transition(case, role, action)
        return case

class WorkflowTests(WorkflowFixture):
    def test_full_review_payment_and_close(self):
        case = self.issued_case()
        self.as_role("finance")
        payload = {"reference": "BANK-TEST-1", "amount": "100.00", "currency": "XXX", "idempotency_key": str(uuid.uuid4())}
        result = self.client.post(f"/api/v1/cases/{case.pk}/payments/", payload)
        self.assertEqual(result.status_code, 201, result.data)
        again = self.client.post(f"/api/v1/cases/{case.pk}/payments/", payload)
        self.assertEqual(again.data["id"], result.data["id"])
        self.assertEqual(Payment.objects.count(), 1)
        self.transition(case, "finance", "close")
        self.assertTrue(verify(self.agency))
        self.assertEqual(case.status, "closed")

    def test_cross_tenant_case_is_not_found(self):
        case = self.create_case()
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(f"/api/v1/cases/{case.pk}/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/cases/").data["count"], 0)

    def test_cross_tenant_foreign_key_rejected(self):
        self.client.force_authenticate(self.stranger)
        result = self.client.post("/api/v1/cases/", {"vehicle": str(self.vehicle.pk), "rule": str(self.rule.pk), "source_ref": "bad", "location": "x", "occurred_at": timezone.now().isoformat()})
        self.assertEqual(result.status_code, 400)

    def test_citizen_cannot_see_draft_or_other_owner(self):
        case = self.create_case()
        self.as_role("citizen")
        self.assertEqual(self.client.get(f"/api/v1/cases/{case.pk}/").status_code, 404)
        case = self.issued_case()
        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.client.get(f"/api/v1/cases/{case.pk}/").status_code, 404)

    def test_citizen_cannot_create_or_choose_fine(self):
        self.as_role("citizen")
        result = self.client.post("/api/v1/cases/", {"vehicle": str(self.vehicle.pk), "rule": str(self.rule.pk), "source_ref": "denied", "location": "x", "occurred_at": timezone.now().isoformat(), "amount": "0.01"})
        self.assertEqual(result.status_code, 403)

    def test_source_deduplication(self):
        self.create_case("one")
        self.as_role("registrar")
        response = self.client.post("/api/v1/cases/", {"vehicle": str(self.vehicle.pk), "rule": str(self.rule.pk), "source_ref": "one", "location": "x", "occurred_at": timezone.now().isoformat()})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(Case.objects.count(), 1)

    def test_snapshot_not_mutated_by_registry(self):
        case = self.create_case()
        self.rule.amount = Decimal("200.00")
        self.rule.save()
        self.vehicle.plate = "NEW"
        self.vehicle.save()
        case.refresh_from_db()
        self.assertEqual(case.amount, Decimal("100.00"))
        self.assertEqual(case.plate, "TEST 01")

    def test_stale_version_and_missing_evidence(self):
        case = self.create_case()
        url = f"/api/v1/cases/{case.pk}/transition/"
        self.assertEqual(self.client.post(url, {"action": "submit", "version": 0, "reason": "testing"}).status_code, 400)
        self.assertEqual(self.client.post(url, {"action": "submit", "version": 2, "reason": "testing"}).status_code, 409)
        self.assertEqual(self.client.post(url, {"action": "submit", "version": 1, "reason": "testing"}).status_code, 400)

    def test_separation_of_duties_survives_role_change(self):
        case = self.create_case()
        self.attach(case)
        self.transition(case, "registrar", "submit")
        actor = self.users["registrar"]
        actor.role = "reviewer"
        actor.save()
        self.client.force_authenticate(actor)
        response = self.client.post(f"/api/v1/cases/{case.pk}/transition/", {"action": "review", "version": case.version, "reason": "not independent"})
        self.assertEqual(response.status_code, 400)

    def test_evidence_integrity_and_download_custody(self):
        case = self.create_case()
        asset = self.attach(case)
        response = self.client.get(f"/api/v1/evidence/{asset.pk}/download/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertEqual(CustodyEvent.objects.filter(evidence=asset).count(), 2)
        evidence.evidence_path(asset.storage_key).write_bytes(b"tampered")
        self.assertEqual(self.client.get(f"/api/v1/evidence/{asset.pk}/download/").status_code, 400)
        self.assertEqual(self.client.post(f"/api/v1/cases/{case.pk}/transition/", {"action": "submit", "version": case.version, "reason": "testing"}).status_code, 400)

    def test_executable_upload_rejected(self):
        case = self.create_case()
        response = self.client.post(f"/api/v1/cases/{case.pk}/evidence/", {"file": SimpleUploadedFile("x.png", b"<script>alert(1)</script>"), "source": "synthetic", "captured_at": timezone.now().isoformat()}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Evidence.objects.count(), 0)

    def test_evidence_cross_tenant_and_citizen_protection(self):
        case = self.issued_case()
        asset = case.evidence.first()
        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.client.get(f"/api/v1/evidence/{asset.pk}/download/").status_code, 404)
        self.as_role("citizen")
        self.assertEqual(self.client.get(f"/api/v1/evidence/{asset.pk}/download/").status_code, 200)
        detail = self.client.get(f"/api/v1/cases/{case.pk}/").data
        self.assertNotIn("notes", detail)
        self.assertNotIn("actor", detail["history"][0])

    def test_appeal_acceptance_and_no_payment(self):
        case = self.issued_case()
        self.as_role("citizen")
        result = self.client.post(f"/api/v1/cases/{case.pk}/appeals/", {"reason": "Synthetic appeal evidence"})
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(self.client.post(f"/api/v1/cases/{case.pk}/simulate-payment/", {"idempotency_key": str(uuid.uuid4())}).status_code, 409)
        self.as_role("appeals")
        result = self.client.post(f"/api/v1/appeals/{result.data['id']}/decide/", {"decision": "accepted", "reason": "Review supports appeal"})
        self.assertEqual(result.status_code, 200, result.data)
        case.refresh_from_db()
        self.assertEqual(case.status, "cancelled")

    def test_rejected_appeal_allows_settlement(self):
        case = self.issued_case()
        self.as_role("citizen")
        result = self.client.post(f"/api/v1/cases/{case.pk}/appeals/", {"reason": "Synthetic appeal reason"})
        self.as_role("appeals")
        self.assertEqual(self.client.post(f"/api/v1/appeals/{result.data['id']}/decide/", {"decision": "rejected", "reason": "Evidence is consistent"}).status_code, 200)
        case.refresh_from_db()
        self.assertEqual(case.status, "issued")

    def test_expired_appeal(self):
        case = self.issued_case()
        case.appeal_deadline = timezone.now() - timedelta(days=1)
        case.save()
        self.as_role("citizen")
        self.assertEqual(self.client.post(f"/api/v1/cases/{case.pk}/appeals/", {"reason": "late submission"}).status_code, 400)

    def test_payment_amount_and_currency_must_match(self):
        case = self.issued_case()
        self.as_role("finance")
        for amount, currency in [("1.00", "XXX"), ("100.00", "USD")]:
            result = self.client.post(f"/api/v1/cases/{case.pk}/payments/", {"reference": "test", "amount": amount, "currency": currency, "idempotency_key": str(uuid.uuid4())})
            self.assertEqual(result.status_code, 400)
        self.assertEqual(Payment.objects.count(), 0)

    def test_simulation_disabled_by_default(self):
        case = self.issued_case()
        self.as_role("citizen")
        with override_settings(SIMULATION_MODE=False):
            self.assertEqual(self.client.post(f"/api/v1/cases/{case.pk}/simulate-payment/", {"idempotency_key": str(uuid.uuid4())}).status_code, 400)

    def test_registry_roles_and_no_delete_routes(self):
        self.as_role("reviewer")
        self.assertEqual(self.client.post("/api/v1/rules/", {"code": "x", "title": "x", "amount": "1.00", "currency": "XXX"}).status_code, 403)
        self.as_role("admin")
        self.assertEqual(self.client.delete(f"/api/v1/vehicles/{self.vehicle.pk}/").status_code, 405)

    def test_export_and_formula_injection(self):
        self.vehicle.plate = "=1+1"
        self.vehicle.save()
        self.create_case()
        self.as_role("citizen")
        self.assertEqual(self.client.get("/api/v1/cases/export/").status_code, 403)
        self.as_role("auditor")
        response = self.client.get("/api/v1/cases/export/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("'=1+1", response.content.decode())

    def test_device_simulator_contract_and_replay(self):
        adapter = SimulatedRecognition()
        observation = adapter.recognize(b"synthetic")
        first = ingest_simulated(self.users["admin"], self.camera, observation)
        second = ingest_simulated(self.users["admin"], self.camera, observation)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(DeviceEvent.objects.count(), 1)
        self.assertEqual(Case.objects.count(), 0)
        self.assertTrue(verify(self.agency))

    def test_outbox_delivery_and_retry(self):
        self.issued_case()
        class FailingAdapter:
            def deliver(self, message):
                raise ConnectionError("offline")
        self.assertEqual(dispatch_batch(FailingAdapter()), 0)
        self.assertEqual(Outbox.objects.first().attempts, 1)
        self.assertEqual(dispatch_batch(InboxAdapter()), 1)
        self.assertEqual(dispatch_batch(InboxAdapter()), 0)

    def test_unauthenticated_and_csrf(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/v1/cases/").status_code, 403)
        client = APIClient(enforce_csrf_checks=True)
        payload = {"username": "registrar", "password": "Unique-test-password-489!"}
        self.assertEqual(client.post("/api/v1/auth/login/", payload).status_code, 403)
        token = client.get("/api/v1/auth/csrf/").data["csrfToken"]
        self.assertEqual(client.post("/api/v1/auth/login/", payload, HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.get("/api/v1/auth/session/").status_code, 200)
        self.assertEqual(client.post("/api/v1/auth/logout/", {}).status_code, 403)
        token = client.get("/api/v1/auth/csrf/").data["csrfToken"]
        self.assertEqual(client.post("/api/v1/auth/logout/", {}, HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.get("/api/v1/auth/session/").status_code, 403)

    def test_mfa_required_and_replay(self):
        import pyotp
        from cryptography.fernet import Fernet
        key = Fernet.generate_key()
        secret = pyotp.random_base32()
        actor = self.users["registrar"]
        actor.mfa_secret = Fernet(key).encrypt(secret.encode()).decode()
        actor.save()
        self.client.force_authenticate(None)
        token = self.client.get("/api/v1/auth/csrf/").data["csrfToken"]
        data = {"username": actor.username, "password": "Unique-test-password-489!", "otp": pyotp.TOTP(secret).now()}
        with override_settings(MFA_REQUIRED=True, MFA_ENCRYPTION_KEY=key.decode()):
            self.assertEqual(self.client.post("/api/v1/auth/login/", data, HTTP_X_CSRFTOKEN=token).status_code, 200)
            self.client.logout()
            token = self.client.get("/api/v1/auth/csrf/").data["csrfToken"]
            self.assertEqual(self.client.post("/api/v1/auth/login/", data, HTTP_X_CSRFTOKEN=token).status_code, 403)

    @skipUnless(connection.vendor == "postgresql", "PostgreSQL append-only triggers")
    def test_database_blocks_history_rewrite(self):
        case = self.create_case()
        with self.assertRaises(DatabaseError), transaction.atomic():
            CaseHistory.objects.filter(case=case).update(reason="tampered")
        with self.assertRaises(DatabaseError), transaction.atomic():
            AuditEvent.objects.all().delete()

