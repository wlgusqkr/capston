"""
커스텀 User 모델.

학교/학년/카카오 ID 등의 추가 필드는 9단계(카카오 소셜 로그인)에서 추가한다.
지금 시점에서는 기본 AbstractUser와 동일한 형태이지만,
처음부터 커스텀 User로 시작해야 이후 마이그레이션이 안전하다.
"""

from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    # 추가 필드 없음. 9단계에서 확장.
    class Meta:
        db_table = "users"
        verbose_name = "사용자"
        verbose_name_plural = "사용자"
