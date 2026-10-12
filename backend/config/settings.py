import os
from pathlib import Path
from urllib.parse import urlparse, unquote
from django.core.exceptions import ImproperlyConfigured
BASE_DIR = Path(__file__).resolve().parent.parent
PRODUCTION = os.getenv("APP_ENV") == "production"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "local-development-only-not-for-deployment")
DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
INSTALLED_APPS = ["django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "rest_framework", "drf_spectacular", "platform_core"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware", "whitenoise.middleware.WhiteNoiseMiddleware", "django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware", "django.middleware.csrf.CsrfViewMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware", "platform_core.middleware.SecurityHeadersMiddleware"]
AUTH_USER_MODEL = "platform_core.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE = "ar"
TIME_ZONE = "UTC"
USE_TZ = True
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "development.sqlite3"}}
if os.getenv("DATABASE_URL"):
    url = urlparse(os.environ["DATABASE_URL"])
    if url.scheme not in ("postgres", "postgresql"):
        raise ImproperlyConfigured("Only PostgreSQL DATABASE_URL is supported.")
    DATABASES["default"] = {"ENGINE": "django.db.backends.postgresql", "NAME": unquote(url.path.lstrip("/")), "USER": unquote(url.username or ""), "PASSWORD": unquote(url.password or ""), "HOST": url.hostname, "PORT": url.port or 5432, "CONN_MAX_AGE": 60}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
if os.getenv("REDIS_URL"):
    CACHES["default"] = {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": os.environ["REDIS_URL"]}
SIMULATION_MODE = os.getenv("SIMULATION_MODE", "0") == "1"
MFA_REQUIRED = PRODUCTION or os.getenv("MFA_REQUIRED", "0") == "1"
MFA_ENCRYPTION_KEY = os.getenv("MFA_ENCRYPTION_KEY", "")
EVIDENCE_ROOT = Path(os.getenv("EVIDENCE_ROOT") or str(BASE_DIR / "private-evidence")).resolve()
EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = PRODUCTION
CSRF_COOKIE_SECURE = PRODUCTION
SESSION_COOKIE_AGE = 1800
SECURE_SSL_REDIRECT = PRODUCTION
if os.getenv("TRUST_PROXY_HTTPS") == "1":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31536000 if PRODUCTION else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = PRODUCTION
SECURE_HSTS_PRELOAD = PRODUCTION
SECURE_CONTENT_TYPE_NOSNIFF = True
CSRF_TRUSTED_ORIGINS = [v for v in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if v]
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"}]
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "platform_core.pagination.StandardPagination",
    "PAGE_SIZE": 20, "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.UserRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"user": "300/min", "login": "10/min"}, "TEST_REQUEST_DEFAULT_FORMAT": "json"}
SPECTACULAR_SETTINGS = {"TITLE": "Rasd Traffic Platform API", "VERSION": "0.1.0", "DESCRIPTION": "Tenant-isolated evaluation release.", "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAuthenticated"], "COMPONENT_SPLIT_REQUEST": True}
if PRODUCTION:
    if len(SECRET_KEY) < 50 or SECRET_KEY.startswith("local-"):
        raise ImproperlyConfigured("Production requires a strong DJANGO_SECRET_KEY.")
    if DEBUG or SIMULATION_MODE or not os.getenv("DATABASE_URL") or not os.getenv("REDIS_URL") or not MFA_ENCRYPTION_KEY:
        raise ImproperlyConfigured("Production requires PostgreSQL, Redis, MFA key; debug and simulation must be disabled.")

