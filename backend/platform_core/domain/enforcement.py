import uuid
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError
from platform_core.models import Case, CaseHistory, Outbox
from .audit import record
from .evidence import read_verified
from .policy import require_role, allowed_actions, TRANSITIONS

class Conflict(APIException):
    status_code = 409
    default_detail = "تعارض؛ حدّث السجل ثم أعد المحاولة."

def change_status(actor, case, status, reason):
    previous = case.status
    case.status = status
    case.version += 1
    case.save()
    CaseHistory.objects.create(agency_id=case.agency_id, case=case, actor=actor, from_status=previous, to_status=status, reason=reason)
    record(actor, "case." + status, case.pk, {"from": previous, "reason": reason, "version": case.version})

@transaction.atomic
def create_case(actor, data):
    require_role(actor, "registrar")
    vehicle, rule = data["vehicle"], data["rule"]
    if not rule.active or not vehicle.owner.is_active:
        raise ValidationError("القاعدة أو المالك غير نشط.")
    if Case.objects.filter(agency_id=actor.agency_id, source_ref=data["source_ref"]).exists():
        raise Conflict("مرجع المصدر مسجل سابقًا.")
    case = Case.objects.create(
        agency_id=actor.agency_id, created_by=actor, owner=vehicle.owner, plate=vehicle.plate,
        reference="TR-" + uuid.uuid4().hex[:20].upper(), rule_title=rule.title,
        amount=rule.amount, currency=rule.currency, appeal_days=rule.appeal_days, **data)
    CaseHistory.objects.create(agency_id=actor.agency_id, case=case, actor=actor, from_status="", to_status="draft", reason="Initial registration")
    record(actor, "case.created", case.pk, {"reference": case.reference})
    return case

@transaction.atomic
def transition(actor, case_id, action, version, reason):
    case = Case.objects.select_for_update().get(pk=case_id, agency_id=actor.agency_id)
    if case.version != version:
        raise Conflict()
    if action not in allowed_actions(actor, case):
        raise ValidationError("الانتقال غير مسموح للحالة أو الدور أو فصل المهام.")
    if action in ("submit", "review", "approve", "issue"):
        assets = list(case.evidence.all())
        if not assets:
            raise ValidationError("أرفق دليلًا أصليًا قبل المراجعة.")
        for asset in assets:
            read_verified(asset)
    if action == "review":
        case.reviewed_by = actor
    if action == "approve":
        case.approved_by = actor
    if action == "issue":
        if not case.owner.is_active:
            raise ValidationError("المالك غير نشط.")
        case.issued_at = timezone.now()
        case.appeal_deadline = case.issued_at + timedelta(days=case.appeal_days)
    change_status(actor, case, TRANSITIONS[action][2], reason)
    if action == "issue":
        Outbox.objects.create(agency_id=case.agency_id, recipient=case.owner, topic="case.issued", payload={"case": str(case.pk), "reference": case.reference})
    return case

