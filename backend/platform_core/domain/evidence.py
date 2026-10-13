import hashlib
import io
from pathlib import Path
import uuid
from PIL import Image, UnidentifiedImageError
from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError
from platform_core.models import Evidence, CustodyEvent
from .audit import record
from .policy import require_role

def evidence_path(key):
    root = settings.EVIDENCE_ROOT.resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        raise ValidationError("Invalid storage key.")
    return path

def read_verified(evidence):
    try:
        data = evidence_path(evidence.storage_key).read_bytes()
    except OSError:
        raise ValidationError("الأصل غير متاح؛ أوقف الإجراء وافتح حادث سلامة أدلة.")
    if len(data) != evidence.size or hashlib.sha256(data).hexdigest() != evidence.sha256:
        raise ValidationError("فشل التحقق من سلامة الدليل.")
    return data

def validate_file(upload):
    data = upload.read(settings.EVIDENCE_MAX_BYTES + 1)
    if not data or len(data) > settings.EVIDENCE_MAX_BYTES:
        raise ValidationError("حجم الدليل يجب أن يكون بين بايت واحد و10MiB.")
    if data.startswith(b"%PDF-") and b"%%EOF" in data[-1024:]:
        content_type = "application/pdf"
    else:
        try:
            with Image.open(io.BytesIO(data)) as img:
                if img.format not in ("JPEG", "PNG") or img.width * img.height > 25000000:
                    raise ValidationError("صور JPEG/PNG حتى 25 مليون بكسل فقط.")
                content_type = "image/jpeg" if img.format == "JPEG" else "image/png"
                img.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise ValidationError("نوع الملف غير مدعوم أو الملف تالف.")
    return data, content_type

def _persist_evidence(actor, upload, source, captured_at, prepared, case=None, appeal=None):
    if (case is None) == (appeal is None):
        raise ValidationError("يجب ربط الدليل بملف مخالفة أو اعتراض واحد فقط.")
    data, content_type = prepared
    key = f"{actor.agency_id}/{uuid.uuid4().hex}"
    path = evidence_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as stream:
        stream.write(data)
    # Files left behind after a database rollback are retained for reconciliation, never reassigned.
    asset = Evidence.objects.create(
        agency_id=actor.agency_id, case=case, appeal=appeal, uploaded_by=actor,
        original_name=Path(upload.name).name[:200], content_type=content_type,
        storage_key=key, sha256=hashlib.sha256(data).hexdigest(), size=len(data),
        source=source, captured_at=captured_at)
    CustodyEvent.objects.create(agency_id=actor.agency_id, evidence=asset, actor=actor, action="ingested", digest=asset.sha256)
    target_type, target_id = ("case", case.pk) if case else ("appeal", appeal.pk)
    action = "evidence.ingested" if case else "appeal.evidence.ingested"
    record(actor, action, asset.pk, {target_type: str(target_id), "sha256": asset.sha256})
    return asset

@transaction.atomic
def add_evidence(actor, case, upload, source, captured_at):
    require_role(actor, "registrar", "reviewer")
    if case.status not in ("draft", "review"):
        raise ValidationError("أغلقت إضافة الأدلة بعد الاعتماد.")
    return _persist_evidence(actor, upload, source, captured_at, validate_file(upload), case=case)

@transaction.atomic
def add_appeal_evidence(actor, appeal, upload, prepared):
    require_role(actor, "citizen")
    if appeal.submitted_by_id != actor.pk or appeal.case.owner_id != actor.pk or appeal.status != "pending":
        raise ValidationError("لا تملك صلاحية إرفاق مستند بهذا الاعتراض.")
    return _persist_evidence(actor, upload, "citizen appeal submission", None, prepared, appeal=appeal)

