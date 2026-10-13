from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from platform_core.models import Case, Appeal, Outbox
from . import evidence as evidence_domain
from .policy import require_role
from .enforcement import change_status, Conflict

@transaction.atomic
def submit_appeal(actor, case_id, reason, attachments=None):
    require_role(actor, "citizen")
    case = Case.objects.select_for_update().get(pk=case_id, agency_id=actor.agency_id, owner=actor)
    if case.status != "issued" or not case.appeal_deadline or timezone.now() > case.appeal_deadline:
        raise ValidationError("الاعتراض غير متاح في الحالة أو المدة الحالية.")
    if Appeal.objects.filter(case=case).exists():
        raise Conflict("يوجد اعتراض سابق؛ التصعيد الإضافي يحتاج مسارًا معتمدًا.")
    prepared = [(upload, evidence_domain.validate_file(upload)) for upload in (attachments or [])]
    appeal = Appeal.objects.create(agency_id=actor.agency_id, case=case, submitted_by=actor, reason=reason)
    for upload, validated in prepared:
        evidence_domain.add_appeal_evidence(actor, appeal, upload, validated)
    change_status(actor, case, "appealed", reason)
    return appeal

@transaction.atomic
def decide_appeal(actor, appeal, decision, reason):
    require_role(actor, "appeals")
    case = Case.objects.select_for_update().get(pk=appeal.case_id, agency_id=actor.agency_id)
    appeal = Appeal.objects.select_for_update().get(pk=appeal.pk)
    if actor.pk in (case.created_by_id, case.reviewed_by_id, case.approved_by_id, appeal.submitted_by_id):
        raise ValidationError("تعارض مصالح في قرار الاعتراض.")
    if appeal.status != "pending" or case.status != "appealed":
        raise Conflict("حُسم الاعتراض سابقًا.")
    appeal.status, appeal.decision_reason, appeal.decided_by, appeal.decided_at = decision, reason, actor, timezone.now()
    appeal.save()
    change_status(actor, case, "cancelled" if decision == "accepted" else "issued", reason)
    Outbox.objects.create(agency_id=actor.agency_id, recipient=case.owner, topic="appeal.decided", payload={"case": str(case.pk), "decision": decision})
    return appeal

