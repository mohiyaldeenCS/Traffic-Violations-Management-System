from decimal import Decimal
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from platform_core.models import User, Vehicle, Camera, Rule, Case, CaseHistory, Evidence, Appeal, Payment, AuditEvent, Outbox
from platform_core.domain.policy import allowed_actions

class TenantSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            for field in self.fields.values():
                if isinstance(field, serializers.PrimaryKeyRelatedField) and field.queryset is not None:
                    field.queryset = field.queryset.filter(agency_id=request.user.agency_id)
        # Uniqueness is enforced using tenant-aware constraints and atomic DB writes.
        self.validators = []

class VehicleSerializer(TenantSerializer):
    class Meta:
        model = Vehicle
        fields = ["id", "plate", "country", "region", "model", "color", "owner", "created_at"]
        read_only_fields = ["id", "created_at"]
    def validate_owner(self, value):
        if value.role != "citizen" or not value.is_active:
            raise serializers.ValidationError("اختر حساب مواطن نشطًا من الجهة.")
        return value
    def validate_plate(self, value):
        return " ".join(value.strip().upper().split())
    def validate_country(self, value):
        if len(value) not in (2, 3) or not value.isascii() or not value.isalpha():
            raise serializers.ValidationError("رمز دولة حرفي من حرفين أو ثلاثة.")
        return value.upper()

class CameraSerializer(TenantSerializer):
    class Meta:
        model = Camera
        fields = ["id", "code", "location", "latitude", "longitude", "status", "adapter", "last_seen", "created_at"]
        read_only_fields = ["id", "last_seen", "created_at"]
    def validate_adapter(self, value):
        if value != "simulator":
            raise serializers.ValidationError("الموصل المتاح حاليًا محاكي فقط.")
        return value
    def validate_status(self, value):
        if value == "online":
            raise serializers.ValidationError("حالة الاتصال تُحدث من نبض الجهاز فقط.")
        return value

class RuleSerializer(TenantSerializer):
    class Meta:
        model = Rule
        fields = ["id", "code", "title", "amount", "currency", "appeal_days", "active", "created_at"]
        read_only_fields = ["id", "created_at"]
    def validate_currency(self, value):
        if len(value) != 3 or not value.isascii() or not value.isalpha():
            raise serializers.ValidationError("رمز عملة من ثلاثة أحرف مطلوب.")
        return value.upper()

class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ["id", "sha256", "original_name", "size", "created_at", "content_type", "source", "captured_at"]
        read_only_fields = fields

class HistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseHistory
        fields = ["id", "from_status", "to_status", "reason", "created_at", "actor"]

class CaseSerializer(TenantSerializer):
    evidence = EvidenceSerializer(many=True, read_only=True)
    history = HistorySerializer(many=True, read_only=True)
    allowed_actions = serializers.SerializerMethodField()
    class Meta:
        model = Case
        fields = ["id", "reference", "source_ref", "vehicle", "plate", "rule", "rule_title", "camera", "location", "occurred_at", "notes", "status", "amount", "currency", "version", "created_at", "created_by", "reviewed_by", "approved_by", "issued_at", "appeal_deadline", "evidence", "history", "allowed_actions"]
        read_only_fields = ["id", "reference", "plate", "rule_title", "status", "amount", "currency", "version", "created_at", "created_by", "reviewed_by", "approved_by", "issued_at", "appeal_deadline"]
    def get_allowed_actions(self, obj) -> list[str]:
        return allowed_actions(self.context["request"].user, obj)
    def validate_occurred_at(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("وقت الواقعة لا يمكن أن يكون في المستقبل.")
        return value
    def to_representation(self, instance):
        result = super().to_representation(instance)
        if self.context["request"].user.role == "citizen":
            result.pop("notes", None)
            result.pop("source_ref", None)
            for item in result["history"]:
                item.pop("actor", None)
                item.pop("reason", None)
            for item in result["evidence"]:
                item.pop("source", None)
        return result

class AppealSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(source="case.reference", read_only=True)
    class Meta:
        model = Appeal
        fields = ["id", "case", "reference", "reason", "status", "decision_reason", "created_at"]

class PaymentSerializer(serializers.ModelSerializer):
    case_reference = serializers.CharField(source="case.reference", read_only=True)
    class Meta:
        model = Payment
        fields = ["id", "case", "case_reference", "reference", "amount", "currency", "created_at", "simulated"]

class AuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = ["id", "sequence", "action", "target", "actor", "created_at", "digest"]

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Outbox
        fields = ["id", "topic", "payload", "created_at", "delivered_at"]

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=12, max_length=128)
    class Meta:
        model = User
        fields = ["id", "username", "password", "role", "is_active"]
        read_only_fields = ["id", "is_active"]
    def validate_password(self, value):
        validate_password(value)
        return value

class TransitionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["submit", "review", "approve", "issue", "cancel", "close"])
    version = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(min_length=3, max_length=2000)

class EvidenceUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    source = serializers.CharField(max_length=200)
    captured_at = serializers.DateTimeField()
    def validate_captured_at(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("وقت الالتقاط لا يمكن أن يكون في المستقبل.")
        return value

class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=4000)

class DecisionSerializer(ReasonSerializer):
    decision = serializers.ChoiceField(choices=["accepted", "rejected"])

class PaymentInputSerializer(serializers.Serializer):
    reference = serializers.CharField(min_length=3, max_length=120)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    currency = serializers.RegexField(r"^[A-Z]{3}$")
    idempotency_key = serializers.UUIDField()

class SimulationPaymentSerializer(serializers.Serializer):
    idempotency_key = serializers.UUIDField()

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)
    otp = serializers.CharField(max_length=6, required=False, allow_blank=True, write_only=True)

class SessionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    role = serializers.CharField()
    agency = serializers.UUIDField()
    agency_name = serializers.CharField()
    simulation = serializers.BooleanField()

class CsrfSerializer(serializers.Serializer):
    csrfToken = serializers.CharField()

class EmptySerializer(serializers.Serializer):
    pass

