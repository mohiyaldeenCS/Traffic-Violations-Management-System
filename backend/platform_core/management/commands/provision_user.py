import getpass
from cryptography.fernet import Fernet
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError
from platform_core.models import Agency, User
import pyotp

class Command(BaseCommand):
    help = "Privileged offline identity provisioning after documented identity verification."
    def add_arguments(self, parser):
        parser.add_argument("--agency-code", required=True)
        parser.add_argument("--agency-name", required=True)
        parser.add_argument("--username", required=True)
        parser.add_argument("--role", required=True, choices=User.Role.values)
        parser.add_argument("--mfa", action="store_true")
    def handle(self, *args, **options):
        if User.objects.filter(username=options["username"]).exists():
            raise CommandError("Username exists; provisioning never overwrites identities.")
        password = getpass.getpass("Password: ")
        validate_password(password)
        if getpass.getpass("Confirm password: ") != password:
            raise CommandError("Passwords do not match.")
        if settings.MFA_REQUIRED and not options["mfa"]:
            raise CommandError("MFA required.")
        encrypted = ""
        if options["mfa"]:
            if not settings.MFA_ENCRYPTION_KEY:
                raise CommandError("Configure MFA_ENCRYPTION_KEY.")
            secret = pyotp.random_base32()
            encrypted = Fernet(settings.MFA_ENCRYPTION_KEY.encode()).encrypt(secret.encode()).decode()
            self.stdout.write(pyotp.TOTP(secret).provisioning_uri(options["username"], issuer_name="Rasd"))
            if not pyotp.TOTP(secret).verify(getpass.getpass("Confirm OTP from authenticator: ")):
                raise CommandError("OTP confirmation failed.")
        agency, _ = Agency.objects.get_or_create(code=options["agency_code"], defaults={"name": options["agency_name"]})
        User.objects.create_user(username=options["username"], password=password, agency=agency, role=options["role"], mfa_secret=encrypted)
        self.stdout.write("Account provisioned.")

