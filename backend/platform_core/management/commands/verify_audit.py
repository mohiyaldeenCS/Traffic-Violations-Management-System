from django.core.management.base import BaseCommand, CommandError
from platform_core.models import Agency
from platform_core.domain.audit import verify

class Command(BaseCommand):
    def handle(self, *args, **options):
        for agency in Agency.objects.all():
            if not verify(agency):
                raise CommandError("Audit integrity failure: " + agency.code)
        self.stdout.write("All agency audit chains verified.")

