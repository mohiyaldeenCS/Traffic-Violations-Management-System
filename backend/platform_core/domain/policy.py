from rest_framework.exceptions import PermissionDenied
from platform_core.models import Case

CITIZEN_STATES = ["issued", "appealed", "paid", "closed", "cancelled"]

def require_role(actor, *roles):
    if not actor.is_authenticated or not actor.is_active or not actor.agency_id or actor.role not in roles:
        raise PermissionDenied("لا تملك صلاحية هذه العملية.")

def cases_for(actor):
    query = Case.objects.filter(agency_id=actor.agency_id)
    if actor.role == "citizen":
        query = query.filter(owner=actor, status__in=CITIZEN_STATES, issued_at__isnull=False)
    return query

TRANSITIONS = {
    "submit": ("registrar", ["draft"], "review"),
    "review": ("reviewer", ["review"], "approval"),
    "approve": ("approver", ["approval"], "approved"),
    "issue": ("approver", ["approved"], "issued"),
    "cancel": ("approver", ["draft", "review", "approval", "approved", "issued"], "cancelled"),
    "close": ("finance", ["paid"], "closed"),
}

def allowed_actions(actor, case):
    result = []
    for action, (role, states, _) in TRANSITIONS.items():
        if actor.role != role or case.status not in states:
            continue
        if action in ("review", "approve", "issue", "cancel") and actor.pk == case.created_by_id:
            continue
        if action in ("approve", "issue", "cancel") and actor.pk == case.reviewed_by_id:
            continue
        result.append(action)
    return result

