import csv
import hashlib
import io
import time
import zipfile
import json
from cryptography.fernet import Fernet, InvalidToken
import pyotp
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.db import IntegrityError, transaction, connection
from django.db.models import Count, Sum
from django.http import FileResponse, HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from rest_framework import mixins, viewsets, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, Throttled
from rest_framework.filters import SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiTypes
from .models import User, Vehicle, Camera, Rule, Case, Evidence, CustodyEvent, Appeal, Payment, AuditEvent, Outbox
from .serializers import *
from .domain import audit, evidence, enforcement, finance, appeals
from .domain.policy import require_role, cases_for

def session_data(user):
    return {"id": user.pk, "username": user.username, "role": user.role, "agency": user.agency_id, "agency_name": user.agency.name, "simulation": settings.SIMULATION_MODE}

class LoginThrottle(AnonRateThrottle):
    scope = "login"

class CsrfView(APIView):
    permission_classes = [AllowAny]
    @extend_schema(responses=CsrfSerializer)
    def get(self, request):
        return Response({"csrfToken": get_token(request)})

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]
    @extend_schema(request=LoginSerializer, responses=SessionSerializer)
    def post(self, request):
        SessionAuthentication().enforce_csrf(request)
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        username = data.validated_data["username"]
        key = "login:" + hashlib.sha256(username.casefold().encode()).hexdigest()
        if cache.get(key, 0) >= 10:
            raise Throttled(wait=300)
        cache.add(key, 0, 300)
        cache.incr(key)
        user = authenticate(request, username=username, password=data.validated_data["password"])
        if not user or not user.agency_id:
            raise PermissionDenied("بيانات الدخول غير صحيحة.")
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            if settings.MFA_REQUIRED or user.mfa_secret:
                if not user.mfa_secret or not settings.MFA_ENCRYPTION_KEY:
                    raise PermissionDenied("يلزم تفعيل المصادقة متعددة العوامل بواسطة مسؤول الهوية.")
                try:
                    secret = Fernet(settings.MFA_ENCRYPTION_KEY.encode()).decrypt(user.mfa_secret.encode()).decode()
                except (ValueError, InvalidToken):
                    raise PermissionDenied("تعذر التحقق من المصادقة.")
                step = int(time.time()) // 30
                if step <= user.mfa_last_step or not pyotp.TOTP(secret).verify(data.validated_data.get("otp", ""), valid_window=0):
                    raise PermissionDenied("رمز المصادقة غير صالح أو مستخدم.")
                user.mfa_last_step = step
                user.save(update_fields=["mfa_last_step"])
            login(request, user)
            audit.record(user, "session.login", user.pk)
        cache.delete(key)
        return Response(session_data(user))

class SessionView(APIView):
    @extend_schema(responses=SessionSerializer)
    def get(self, request):
        if not request.user.agency_id:
            raise PermissionDenied()
        return Response(session_data(request.user))

class LogoutView(APIView):
    @extend_schema(request=EmptySerializer, responses=EmptySerializer)
    def post(self, request):
        audit.record(request.user, "session.logout", request.user.pk)
        logout(request)
        return Response({})

class TenantViewSet(viewsets.GenericViewSet):
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset.none()
        if not self.request.user.agency_id:
            raise PermissionDenied()
        return self.queryset.filter(agency_id=self.request.user.agency_id).order_by("-created_at")

    def handle_exception(self, exc):
        if isinstance(exc, IntegrityError):
            return Response({"detail": "تعارض سجل أو مرجع مكرر؛ حدّث البيانات."}, status=409)
        return super().handle_exception(exc)

class RegistryViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, TenantViewSet):
    write_roles = ("admin",)
    def get_queryset(self):
        require_role(self.request.user, "admin", "registrar", "reviewer", "approver", "finance", "appeals", "auditor")
        return super().get_queryset()
    @transaction.atomic
    def perform_create(self, serializer):
        require_role(self.request.user, *self.write_roles)
        obj = serializer.save(agency_id=self.request.user.agency_id)
        audit.record(self.request.user, type(obj).__name__.lower() + ".created", obj.pk)

class VehicleViewSet(RegistryViewSet):
    queryset = Vehicle.objects.select_related("owner").all()
    serializer_class = VehicleSerializer
    write_roles = ("admin", "registrar")
    def get_queryset(self):
        query = TenantViewSet.get_queryset(self)
        return query.filter(owner=self.request.user) if self.request.user.role == "citizen" else query

class CameraViewSet(RegistryViewSet):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer

class RuleViewSet(RegistryViewSet):
    queryset = Rule.objects.all()
    serializer_class = RuleSerializer

class CaseViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, TenantViewSet):
    queryset = Case.objects.all()
    serializer_class = CaseSerializer
    filter_backends = [SearchFilter]
    search_fields = ["plate", "reference", "location", "rule_title"]
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Case.objects.none()
        query = cases_for(self.request.user).select_related("vehicle", "rule", "owner").prefetch_related("evidence", "history").order_by("-created_at")
        if self.request.query_params.get("status"):
            query = query.filter(status=self.request.query_params["status"])
        return query
    def perform_create(self, serializer):
        serializer.instance = enforcement.create_case(self.request.user, serializer.validated_data)

    @extend_schema(request=TransitionSerializer, responses=CaseSerializer)
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        obj = self.get_object()
        data = TransitionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        result = enforcement.transition(request.user, obj.pk, **data.validated_data)
        return Response(self.get_serializer(result).data)

    @extend_schema(request=EvidenceUploadSerializer, responses=EvidenceSerializer)
    @action(detail=True, methods=["post"])
    def evidence(self, request, pk=None):
        obj = self.get_object()
        data = EvidenceUploadSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            obj = Case.objects.select_for_update().get(pk=obj.pk)
            result = evidence.add_evidence(request.user, obj, data.validated_data["file"], data.validated_data["source"], data.validated_data["captured_at"])
        return Response(EvidenceSerializer(result).data, status=201)

    @extend_schema(request=AppealSubmissionSerializer, responses=AppealSerializer)
    @action(detail=True, methods=["post"])
    def appeals(self, request, pk=None):
        obj = self.get_object()
        data = AppealSubmissionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        result = appeals.submit_appeal(
            request.user, obj.pk, data.validated_data["reason"],
            attachments=data.validated_data.get("attachments", []))
        return Response(AppealSerializer(result, context={"request": request}).data, status=201)

    @extend_schema(request=PaymentInputSerializer, responses=PaymentSerializer)
    @action(detail=True, methods=["post"])
    def payments(self, request, pk=None):
        obj = self.get_object()
        data = PaymentInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        result = finance.settle(request.user, obj.pk, data.validated_data)
        return Response(PaymentSerializer(result).data, status=201)

    @extend_schema(request=SimulationPaymentSerializer, responses=PaymentSerializer)
    @action(detail=True, methods=["post"], url_path="simulate-payment")
    def simulate_payment(self, request, pk=None):
        obj = self.get_object()
        data = SimulationPaymentSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        result = finance.settle(request.user, obj.pk, data.validated_data, simulated=True)
        return Response(PaymentSerializer(result).data, status=201)

    @extend_schema(responses=PaymentSerializer)
    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        obj = self.get_object()
        require_role(request.user, "citizen", "finance", "auditor", "admin")
        result = Payment.objects.filter(case=obj).first()
        if not result:
            raise ValidationError("لا يوجد إيصال تحصيل.")
        audit.record(request.user, "receipt.read", result.pk)
        return Response(PaymentSerializer(result).data)

    @extend_schema(responses=OpenApiTypes.BINARY)
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        require_role(request.user, "admin", "auditor", "finance")
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="cases.csv"'
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(["reference", "plate", "status", "amount", "currency", "occurred_at"])
        query = self.filter_queryset(self.get_queryset())[:10000]
        def safe(value):
            text = str(value)
            return "'" + text if text.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")) else text
        for obj in query:
            writer.writerow([safe(v) for v in [obj.reference, obj.plate, obj.status, obj.amount, obj.currency, obj.occurred_at.isoformat()]])
        audit.record(request.user, "cases.export", "csv", {"limit": 10000})
        return response

    @extend_schema(responses=OpenApiTypes.BINARY)
    @action(detail=True, methods=["get"], url_path="evidence-package")
    def evidence_package(self, request, pk=None):
        obj = self.get_object()
        require_role(request.user, "auditor", "reviewer", "approver")
        stream = io.BytesIO()
        manifest = []
        with transaction.atomic(), zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as archive:
            assets = list(obj.evidence.all())
            if sum(item.size for item in assets) > 50 * 1024 * 1024:
                raise ValidationError("الحزمة تتجاوز 50MiB؛ يلزم تصدير غير متزامن.")
            for asset in assets:
                data = evidence.read_verified(asset)
                name = str(asset.pk) + ".bin"
                archive.writestr(name, data)
                manifest.append({"file": name, "sha256": asset.sha256, "size": asset.size, "source": asset.source, "captured_at": asset.captured_at.isoformat()})
                CustodyEvent.objects.create(agency_id=obj.agency_id, evidence=asset, actor=request.user, action="exported", digest=asset.sha256)
            archive.writestr("manifest.json", json.dumps({"reference": obj.reference, "evidence": manifest}, ensure_ascii=False, indent=2))
            audit.record(request.user, "evidence.package", obj.pk)
        stream.seek(0)
        return FileResponse(stream, as_attachment=True, filename=obj.reference + ".zip")

class EvidenceViewSet(mixins.RetrieveModelMixin, TenantViewSet):
    queryset = Evidence.objects.all()
    serializer_class = EvidenceSerializer
    def get_queryset(self):
        actor = self.request.user
        query = super().get_queryset()
        case_assets = query.filter(appeal__isnull=True, case__in=cases_for(actor))
        if actor.role == "citizen":
            appeal_scope = Appeal.objects.filter(agency_id=actor.agency_id, submitted_by=actor)
        elif actor.role in ("admin", "appeals", "auditor"):
            appeal_scope = Appeal.objects.filter(agency_id=actor.agency_id)
        else:
            appeal_scope = Appeal.objects.none()
        return (case_assets | query.filter(appeal__in=appeal_scope)).distinct()
    @extend_schema(responses=OpenApiTypes.BINARY)
    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        obj = self.get_object()
        data = evidence.read_verified(obj)
        with transaction.atomic():
            CustodyEvent.objects.create(agency_id=obj.agency_id, evidence=obj, actor=request.user, action="downloaded", digest=obj.sha256)
            audit.record(request.user, "evidence.download", obj.pk, {"sha256": obj.sha256})
        return FileResponse(io.BytesIO(data), as_attachment=True, filename=obj.original_name, content_type="application/octet-stream")

class AppealViewSet(mixins.ListModelMixin, TenantViewSet):
    queryset = Appeal.objects.select_related("case").prefetch_related("evidence").all()
    serializer_class = AppealSerializer
    def get_queryset(self):
        actor = self.request.user
        query = super().get_queryset()
        if actor.role == "citizen":
            return query.filter(submitted_by=actor)
        require_role(actor, "admin", "appeals", "auditor")
        return query
    @extend_schema(request=DecisionSerializer, responses=AppealSerializer)
    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        obj = self.get_object()
        data = DecisionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(AppealSerializer(appeals.decide_appeal(request.user, obj, **data.validated_data)).data)

class PaymentViewSet(mixins.ListModelMixin, TenantViewSet):
    queryset = Payment.objects.select_related("case").all()
    serializer_class = PaymentSerializer
    def get_queryset(self):
        require_role(self.request.user, "finance", "auditor", "admin", "citizen")
        return super().get_queryset().filter(case__in=cases_for(self.request.user))

class AuditViewSet(mixins.ListModelMixin, TenantViewSet):
    queryset = AuditEvent.objects.select_related("actor").all()
    serializer_class = AuditSerializer
    def get_queryset(self):
        require_role(self.request.user, "admin", "auditor")
        return super().get_queryset().order_by("-sequence")

class NotificationViewSet(mixins.ListModelMixin, TenantViewSet):
    queryset = Outbox.objects.all()
    serializer_class = NotificationSerializer
    def get_queryset(self):
        return super().get_queryset().filter(recipient=self.request.user)

class UserViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = UserSerializer
    queryset = User.objects.none()
    def get_queryset(self):
        require_role(self.request.user, "admin", "registrar")
        query = User.objects.filter(agency_id=self.request.user.agency_id).order_by("username")
        return query.filter(role="citizen", is_active=True) if self.request.user.role == "registrar" else query
    @transaction.atomic
    def perform_create(self, serializer):
        require_role(self.request.user, "admin")
        user = User.objects.create_user(agency_id=self.request.user.agency_id, **serializer.validated_data)
        serializer.instance = user
        audit.record(self.request.user, "user.created", user.pk, {"role": user.role})

class DashboardView(APIView):
    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        query = cases_for(request.user)
        citizen = request.user.role == "citizen"
        devices = Camera.objects.filter(agency_id=request.user.agency_id) if not citizen else Camera.objects.none()
        payments = Payment.objects.filter(case__in=query)
        return Response({"total": query.count(), "by_status": list(query.values("status").annotate(total=Count("id")).order_by("status")), "collected": list(payments.values("currency").annotate(total=Sum("amount")).order_by("currency")), "cameras_online": devices.filter(status="online").count(), "cameras_total": devices.count(), "pending_outbox": Outbox.objects.filter(recipient=request.user, delivered_at=None).count()})

def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return JsonResponse({"status": "ok", "release": "0.1.0"})
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)

