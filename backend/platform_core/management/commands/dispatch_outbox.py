from django.core.management.base import BaseCommand
from platform_core.adapters import InboxAdapter, dispatch_batch
class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write(str(dispatch_batch(InboxAdapter())) + " inbox notifications delivered")

