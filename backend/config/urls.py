from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView
from platform_core import api

router = DefaultRouter()
for prefix, view, name in [
    ("vehicles", api.VehicleViewSet, "vehicle"), ("cameras", api.CameraViewSet, "camera"),
    ("rules", api.RuleViewSet, "rule"), ("cases", api.CaseViewSet, "case"),
    ("evidence", api.EvidenceViewSet, "evidence"), ("appeals", api.AppealViewSet, "appeal"),
    ("payments", api.PaymentViewSet, "payment"), ("audit", api.AuditViewSet, "audit"),
    ("notifications", api.NotificationViewSet, "notification"), ("users", api.UserViewSet, "user")]:
    router.register(prefix, view, basename=name)
urlpatterns = [
    path("health/", api.health),
    path("api/v1/auth/csrf/", api.CsrfView.as_view()), path("api/v1/auth/login/", api.LoginView.as_view()),
    path("api/v1/auth/session/", api.SessionView.as_view()), path("api/v1/auth/logout/", api.LogoutView.as_view()),
    path("api/v1/dashboard/", api.DashboardView.as_view()), path("api/v1/schema/", SpectacularAPIView.as_view()),
    path("api/v1/", include(router.urls)),
]

