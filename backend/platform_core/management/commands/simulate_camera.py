from django.core.management.base import BaseCommand, CommandError
from platform_core.models import User, Camera
from platform_core.adapters import SimulatedRecognition, ingest_simulated
class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--camera", required=True)
        parser.add_argument("--event", required=True)
    def handle(self, *args, **options):
        actor = User.objects.get(username=options["username"])
        camera = Camera.objects.get(agency=actor.agency, code=options["camera"])
        result = ingest_simulated(actor, camera, SimulatedRecognition().recognize(options["event"].encode()))
        self.stdout.write("SIMULATED observation stored; no violation issued: " + str(result.pk))

