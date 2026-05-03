from django.apps import AppConfig


class TransitConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.transit"
    label = "transit"
    verbose_name = "교통"
