from django.apps import AppConfig


class ParksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.parks"
    label = "parks"
    verbose_name = "공원 (Park / ParkDong / ParkLdong)"
