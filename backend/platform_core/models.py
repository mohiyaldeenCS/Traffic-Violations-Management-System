import uuid
from decimal import Decimal
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Q

class Agency(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=30, unique=True)
    audit_sequence = models.PositiveBigIntegerField(default=0)
    audit_digest = models.CharField(max_length=64, default="0" * 64)

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        REGISTRAR = "registrar", "Registrar"
        REVIEWER = "reviewer", "Reviewer"
        APPROVER = "approver", "Approver"
        FINANCE = "finance", "Finance"
        APPEALS = "appeals", "Appeals"
        AUDITOR = "auditor", "Auditor"
        CITIZEN = "citizen", "Citizen"
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.CITIZEN)
    mfa_secret = models.TextField(blank=True)
    mfa_last_step = models.BigIntegerField(default=-1)

class TenantRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        abstract = True

class Vehicle(TenantRecord):
    owner = models.ForeignKey(User, on_delete=models.PROTECT)
    plate = models.CharField(max_length=32)
    country = models.CharField(max_length=3)
    region = models.CharField(max_length=60, blank=True)
    model = models.CharField(max_length=80, blank=True)
    color = models.CharField(max_length=40, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["agency", "country", "region", "plate"], name="unique_plate_jurisdiction")]

class Camera(TenantRecord):
    code = models.CharField(max_length=50)
    location = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, validators=[MinValueValidator(-90), MaxValueValidator(90)])
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, validators=[MinValueValidator(-180), MaxValueValidator(180)])
    status = models.CharField(max_length=12, choices=[("online", "Online"), ("offline", "Offline"), ("maintenance", "Maintenance")], default="offline")
    adapter = models.CharField(max_length=30, default="simulator")
    last_seen = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["agency", "code"], name="unique_camera_code")]

class Rule(TenantRecord):
    code = models.CharField(max_length=40)
    title = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    currency = models.CharField(max_length=3)
    appeal_days = models.PositiveIntegerField(default=30, validators=[MaxValueValidator(365)])
    active = models.BooleanField(default=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["agency", "code"], name="unique_rule_code"), models.CheckConstraint(condition=Q(amount__gt=0), name="rule_positive_amount")]

class Case(TenantRecord):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEW = "review", "Review"
        APPROVAL = "approval", "Approval"
        APPROVED = "approved", "Approved"
        ISSUED = "issued", "Issued"
        APPEALED = "appealed", "Appealed"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"
        CLOSED = "closed", "Closed"
    reference = models.CharField(max_length=40, unique=True)
    source_ref = models.CharField(max_length=120)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT)
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name="owned_cases")
    plate = models.CharField(max_length=32)
    rule = models.ForeignKey(Rule, on_delete=models.PROTECT)
    rule_title = models.CharField(max_length=150)
    camera = models.ForeignKey(Camera, on_delete=models.PROTECT, null=True, blank=True)
    location = models.CharField(max_length=200)
    occurred_at = models.DateTimeField()
    notes = models.TextField(blank=True, max_length=4000)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    appeal_days = models.PositiveIntegerField()
    appeal_deadline = models.DateTimeField(null=True)
    issued_at = models.DateTimeField(null=True)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_cases")
    reviewed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="reviewed_cases", null=True)
    approved_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="approved_cases", null=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["agency", "source_ref"], name="unique_source_event"), models.CheckConstraint(condition=Q(amount__gt=0), name="case_positive_amount")]
        indexes = [models.Index(fields=["agency", "status", "-created_at"]), models.Index(fields=["agency", "owner", "-created_at"])]

class CaseHistory(TenantRecord):
    case = models.ForeignKey(Case, on_delete=models.PROTECT, related_name="history")
    actor = models.ForeignKey(User, on_delete=models.PROTECT)
    from_status = models.CharField(max_length=12)
    to_status = models.CharField(max_length=12)
    reason = models.CharField(max_length=2000)

class Evidence(TenantRecord):
    case = models.ForeignKey(Case, on_delete=models.PROTECT, related_name="evidence", null=True, blank=True)
    appeal = models.ForeignKey("Appeal", on_delete=models.PROTECT, related_name="evidence", null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    original_name = models.CharField(max_length=200)
    content_type = models.CharField(max_length=80)
    storage_key = models.CharField(max_length=200, unique=True)
    sha256 = models.CharField(max_length=64)
    size = models.PositiveIntegerField()
    source = models.CharField(max_length=200)
    captured_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.CheckConstraint(condition=(Q(case__isnull=False, appeal__isnull=True) | Q(case__isnull=True, appeal__isnull=False)), name="evidence_single_parent")]

class CustodyEvent(TenantRecord):
    evidence = models.ForeignKey(Evidence, on_delete=models.PROTECT, related_name="custody")
    actor = models.ForeignKey(User, on_delete=models.PROTECT)
    action = models.CharField(max_length=40)
    digest = models.CharField(max_length=64)

class Appeal(TenantRecord):
    case = models.OneToOneField(Case, on_delete=models.PROTECT, related_name="appeal")
    submitted_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="submitted_appeals")
    reason = models.CharField(max_length=4000)
    status = models.CharField(max_length=12, choices=[("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected")], default="pending")
    decision_reason = models.CharField(max_length=4000, blank=True)
    decided_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, related_name="decided_appeals")
    decided_at = models.DateTimeField(null=True)

class Payment(TenantRecord):
    case = models.OneToOneField(Case, on_delete=models.PROTECT, related_name="payment")
    recorded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    reference = models.CharField(max_length=120)
    idempotency_key = models.UUIDField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    simulated = models.BooleanField(default=False)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["agency", "reference"], name="unique_payment_reference"), models.UniqueConstraint(fields=["agency", "idempotency_key"], name="unique_payment_key"), models.CheckConstraint(condition=Q(amount__gt=0), name="payment_positive_amount")]

class AuditEvent(TenantRecord):
    sequence = models.PositiveBigIntegerField()
    actor = models.ForeignKey(User, on_delete=models.PROTECT, null=True)
    action = models.CharField(max_length=80)
    target = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    previous_digest = models.CharField(max_length=64)
    digest = models.CharField(max_length=64)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["agency", "sequence"], name="unique_audit_sequence")]
        indexes = [models.Index(fields=["agency", "-sequence"])]

class Outbox(TenantRecord):
    recipient = models.ForeignKey(User, on_delete=models.PROTECT)
    topic = models.CharField(max_length=80)
    payload = models.JSONField(default=dict)
    delivered_at = models.DateTimeField(null=True)
    attempts = models.PositiveIntegerField(default=0)

class DeviceEvent(TenantRecord):
    camera = models.ForeignKey(Camera, on_delete=models.PROTECT)
    event_ref = models.CharField(max_length=120)
    plate_candidate = models.CharField(max_length=32)
    confidence = models.DecimalField(max_digits=5, decimal_places=4, validators=[MinValueValidator(0), MaxValueValidator(1)])
    observed_at = models.DateTimeField()
    simulated = models.BooleanField(default=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["camera", "event_ref"], name="unique_device_event")]

class LegacyImport(TenantRecord):
    source_hash = models.CharField(max_length=64)
    summary = models.JSONField(default=dict)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["agency", "source_hash"], name="unique_import_source")]

