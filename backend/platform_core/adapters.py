from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from platform_core.models import Camera, DeviceEvent, Outbox
from platform_core.domain.policy import require_role
from platform_core.domain.audit import record

@dataclass(frozen=True)
class Observation:
    event_ref: str
    plate_candidate: str
    confidence: Decimal

class RecognitionAdapter(Protocol):
    def recognize(self, image: bytes) -> Observation: ...

class SimulatedRecognition:
    def recognize(self, image: bytes) -> Observation:
        if not settings.SIMULATION_MODE or settings.PRODUCTION:
            raise ValidationError("Simulator disabled.")
        import hashlib
        return Observation("SIM-" + hashlib.sha256(image).hexdigest()[:32], "TEST 1001", Decimal("0.7500"))

@transaction.atomic
def ingest_simulated(actor, camera, observation):
    require_role(actor, "admin")
    if not settings.SIMULATION_MODE or settings.PRODUCTION or camera.agency_id != actor.agency_id:
        raise ValidationError("Simulator unavailable.")
    if not Decimal(0) <= observation.confidence <= Decimal(1):
        raise ValidationError("Confidence outside [0,1].")
    camera = Camera.objects.select_for_update().get(pk=camera.pk)
    event, created = DeviceEvent.objects.get_or_create(
        agency_id=actor.agency_id, camera=camera, event_ref=observation.event_ref,
        defaults={"plate_candidate": observation.plate_candidate, "confidence": observation.confidence, "observed_at": timezone.now(), "simulated": True})
    if not created and (event.plate_candidate != observation.plate_candidate or event.confidence != observation.confidence):
        raise ValidationError("Event reference reused with different content.")
    if created:
        camera.status, camera.last_seen = "online", timezone.now()
        camera.save(update_fields=["status", "last_seen"])
        record(actor, "device.simulated_observation", event.pk)
    # Observation never creates a legally enforceable case.
    return event

class NotificationAdapter(Protocol):
    def deliver(self, message: Outbox) -> None: ...

class InboxAdapter:
    def deliver(self, message):
        # Durable in-application inbox already exists in the transactional outbox.
        if not message.recipient.is_active:
            raise ValueError("Recipient inactive.")

@transaction.atomic
def dispatch_batch(adapter, limit=100):
    count = 0
    for event in Outbox.objects.select_for_update(skip_locked=True).filter(delivered_at=None).order_by("created_at")[:limit]:
        event.attempts += 1
        try:
            adapter.deliver(event)
        except Exception:
            event.save(update_fields=["attempts"])
            continue
        event.delivered_at = timezone.now()
        event.save(update_fields=["attempts", "delivered_at"])
        count += 1
    return count

