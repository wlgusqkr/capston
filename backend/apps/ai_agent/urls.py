from django.urls import path

from .views import agent_query, clear_conversation

app_name = "ai_agent"

urlpatterns = [
    path("agent/query", agent_query, name="agent-query"),
    path("agent/conversation/<str:conversation_id>", clear_conversation, name="clear-conversation"),
]
