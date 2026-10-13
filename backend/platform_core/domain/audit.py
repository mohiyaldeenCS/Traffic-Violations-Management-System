import hashlib
import json
from django.db import transaction
from platform_core.models import Agency, AuditEvent

def digest_event(previous, sequence, actor_id, action, target, payload):
    canonical = json.dumps([previous, sequence, actor_id, action, str(target), payload], sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()

@transaction.atomic
def record(actor, action, target, payload=None):
    agency = Agency.objects.select_for_update().get(pk=actor.agency_id)
    sequence = agency.audit_sequence + 1
    payload = payload or {}
    digest = digest_event(agency.audit_digest, sequence, actor.pk, action, str(target), payload)
    event = AuditEvent.objects.create(agency=agency, sequence=sequence, actor=actor, action=action, target=str(target), payload=payload, previous_digest=agency.audit_digest, digest=digest)
    agency.audit_sequence = sequence
    agency.audit_digest = digest
    agency.save(update_fields=["audit_sequence", "audit_digest"])
    return event

def verify(agency):
    previous = "0" * 64
    count = 0
    for event in AuditEvent.objects.filter(agency=agency).order_by("sequence"):
        count += 1
        expected = digest_event(previous, count, event.actor_id, event.action, event.target, event.payload)
        if event.sequence != count or event.previous_digest != previous or event.digest != expected:
            return False
        previous = event.digest
    agency.refresh_from_db()
    return count == agency.audit_sequence and previous == agency.audit_digest

