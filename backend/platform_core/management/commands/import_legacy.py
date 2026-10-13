import hashlib
import json
import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from platform_core.models import Agency, User, Vehicle, Camera, Rule, Case, LegacyImport
from platform_core.domain.audit import record

class Command(BaseCommand):
    help = "Validate canonical JSON export of the four legacy tables. Dry-run unless --apply."
    def add_arguments(self, parser):
        parser.add_argument("source")
        parser.add_argument("--actor", required=True)
        parser.add_argument("--currency", required=True)
        parser.add_argument("--apply", action="store_true")
    @transaction.atomic
    def handle(self, *args, **options):
        actor = User.objects.get(username=options["actor"])
        if actor.role != "admin" or not actor.agency_id:
            raise CommandError("An agency administrator is required.")
        currency = options["currency"]
        if len(currency) != 3 or not currency.isascii() or not currency.isalpha() or not currency.isupper():
            raise CommandError("Explicit uppercase three-letter currency required.")
        raw = Path(options["source"]).read_bytes()
        if len(raw) > 20 * 1024 * 1024:
            raise CommandError("Split exports above 20MiB into validated batches.")
        digest = hashlib.sha256(raw).hexdigest()
        Agency.objects.select_for_update().get(pk=actor.agency_id)
        if LegacyImport.objects.filter(agency=actor.agency, source_hash=digest).exists():
            self.stdout.write("Already imported; no changes.")
            return
        try:
            data = json.loads(raw)
            if set(data) != {"users", "vehicles", "cameras", "violations"}:
                raise ValueError("Expected exactly four source tables.")
            for table in data.values():
                if not isinstance(table, list) or len({str(row["id"]) for row in table}) != len(table):
                    raise ValueError("Rows need unique source IDs.")
            users, vehicles, cameras = {}, {}, {}
            def uid(kind, source_id):
                return uuid.uuid5(actor.agency_id, "legacy:" + kind + ":" + str(source_id))
            for row in data["users"]:
                username = "legacy-" + str(uid("user", row["id"]))
                user, created = User.objects.get_or_create(username=username, defaults={"agency": actor.agency, "role": "citizen", "is_active": False})
                if created:
                    user.set_unusable_password()
                    user.save()
                users[str(row["id"])] = user
            for row in data["vehicles"]:
                owner = users[str(row["owner_id"])]
                obj, created = Vehicle.objects.get_or_create(id=uid("vehicle", row["id"]), defaults={
                    "agency": actor.agency, "owner": owner, "plate": str(row["plate_number"]).strip().upper(),
                    "country": "ZZ", "region": "legacy-unverified", "model": row.get("model", ""), "color": row.get("color", "")})
                if not created and obj.owner_id != owner.pk:
                    raise ValueError("Existing vehicle owner conflict.")
                vehicles[str(row["id"])] = obj
            for row in data["cameras"]:
                obj, _ = Camera.objects.get_or_create(id=uid("camera", row["id"]), defaults={"agency": actor.agency, "code": "LEGACY-" + str(row["id"]), "location": row["location"], "adapter": "unconfigured", "status": "offline"})
                cameras[str(row["id"])] = obj
            imported_cases = 0
            for row in data["violations"]:
                vehicle = vehicles[str(row["vehicle_id"])]
                if users[str(row["user_id"])].pk != vehicle.owner_id:
                    raise ValueError("Legacy violation owner differs from vehicle owner.")
                amount = Decimal(str(row["fine_amount"]))
                if not amount.is_finite() or amount <= 0 or amount > Decimal("9999999999.99") or amount != amount.quantize(Decimal("0.01")):
                    raise ValueError("Invalid financial amount.")
                rule_key = hashlib.sha256((row["violation_type"] + str(amount) + currency).encode()).hexdigest()[:20]
                rule, _ = Rule.objects.get_or_create(agency=actor.agency, code="LEGACY-" + rule_key, defaults={"title": row["violation_type"], "amount": amount, "currency": currency, "appeal_days": 0, "active": False})
                when = datetime.fromisoformat(row["violation_date"])
                if timezone.is_naive(when):
                    raise ValueError("Export dates must include verified source UTC offset.")
                obj, created = Case.objects.get_or_create(id=uid("case", row["id"]), defaults={
                    "agency": actor.agency, "reference": "LEGACY-" + uid("case", row["id"]).hex,
                    "source_ref": "legacy:" + str(row["id"]), "vehicle": vehicle, "owner": vehicle.owner, "plate": vehicle.plate,
                    "rule": rule, "rule_title": rule.title, "camera": cameras[str(row["camera_id"])],
                    "location": cameras[str(row["camera_id"])].location, "occurred_at": when,
                    "notes": "Unverified imported record; original status=" + str(row["status"]),
                    "amount": amount, "currency": currency, "appeal_days": 0, "created_by": actor, "status": "draft"})
                if not created and (obj.amount != amount or obj.vehicle_id != vehicle.pk or obj.currency != currency):
                    raise ValueError("Existing imported case conflict; reconcile explicitly.")
                imported_cases += int(created)
            summary = {name: len(rows) for name, rows in data.items()}
            summary["new_cases"] = imported_cases
            LegacyImport.objects.create(agency=actor.agency, source_hash=digest, summary=summary)
            record(actor, "legacy.import", digest, summary)
        except (KeyError, ValueError, TypeError, InvalidOperation) as exc:
            raise CommandError("Export validation failed: " + str(exc)) from exc
        if not options["apply"]:
            transaction.set_rollback(True)
        self.stdout.write(json.dumps({"applied": options["apply"], "counts": summary}))

