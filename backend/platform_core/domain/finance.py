from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError
from platform_core.models import Case, Payment, Outbox
from .policy import require_role
from .enforcement import change_status, Conflict

@transaction.atomic
def settle(actor, case_id, data, simulated=False):
    require_role(actor, "citizen" if simulated else "finance")
    if simulated and (not settings.SIMULATION_MODE or settings.PRODUCTION):
        raise ValidationError("محاكاة الدفع معطلة.")
    case = Case.objects.select_for_update().get(pk=case_id, agency_id=actor.agency_id)
    if simulated and case.owner_id != actor.pk:
        raise ValidationError("المالك غير مطابق.")
    prior = Payment.objects.filter(agency_id=actor.agency_id, idempotency_key=data["idempotency_key"]).first()
    if prior:
        if prior.case_id != case.pk or prior.simulated != simulated or (not simulated and (prior.amount != data["amount"] or prior.currency != data["currency"] or prior.reference != data["reference"])):
            raise Conflict("مفتاح العملية مستخدم بطلب مختلف.")
        return prior
    if case.status != "issued":
        raise Conflict("التحصيل متاح للمخالفة الصادرة غير المعترض عليها فقط.")
    amount = case.amount if simulated else data["amount"]
    currency = case.currency if simulated else data["currency"]
    reference = "SIM-" + str(data["idempotency_key"]) if simulated else data["reference"]
    if amount != case.amount or currency != case.currency:
        raise ValidationError("المبلغ أو العملة لا يطابقان المخالفة.")
    payment = Payment.objects.create(agency_id=actor.agency_id, case=case, recorded_by=actor, reference=reference, idempotency_key=data["idempotency_key"], amount=amount, currency=currency, simulated=simulated)
    change_status(actor, case, "paid", "Simulated settlement" if simulated else "External settlement: " + reference)
    Outbox.objects.create(agency_id=actor.agency_id, recipient=case.owner, topic="payment.recorded", payload={"case": str(case.pk), "payment": str(payment.pk), "simulated": simulated})
    return payment

