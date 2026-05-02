from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """기본 UserAdmin 그대로 사용. 9단계에서 확장."""

    pass
