from django.apps import AppConfig


class MetricsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.metrics"
    label = "metrics"
    verbose_name = "지표 (Metric / GuMetric / SeoulMetric)"
