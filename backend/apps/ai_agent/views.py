"""
=============================================================================
Django REST Framework API ?”ë“œ?¬ì¸??(views.py)
=============================================================================
?‘ì„±??AI Agent ?Œì´?„ë¼?¸ì„ ?¸ë? ?„ë¡ ?¸ì—”??Web/App)?ì„œ HTTP ?”ì²­?¼ë¡œ 
?¸ì¶œ?????ˆë„ë¡??°ê²°??ì£¼ëŠ” ë·?ì»¨íŠ¸ë¡¤ëŸ¬?…ë‹ˆ??

[?¤ì¹˜ ë°??¤ì •]
  1. ???Œì¼?¤ì„ backend/apps/ai_agent/ ?”ë ‰? ë¦¬??ë³µì‚¬
  2. urls.py??ê²½ë¡œ ì¶”ê? (?? path("api/agent/query", agent_views.agent_query))
  3. settings.py??INSTALLED_APPS??"apps.ai_agent" ?±ë¡

[API ëª…ì„¸]
  - POST /api/agent/query
  - Request: {"question": "?™êµ­?€ ê·¼ì²˜ ?”ì„¸ ?€?´í•œ ê³?}
  - Response: Agent ë¶„ì„ ê²°ê³¼ë¥??´ì? JSON ?˜ì´ë¡œë“œ ë°˜í™˜
=============================================================================
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .agent import run_agent


@api_view(["POST"])
@permission_classes([AllowAny])
def agent_query(request):
    """
    POST /api/agent/query

    ?”ì²­:
      { "question": "?™êµ­?€ ê·¼ì²˜ ?”ì„¸ ?€?´í•œ ?™ë„¤ ì°¾ì•„ì¤? }

    ?‘ë‹µ (recommendation):
      {
        "answer": "?ì—°???µë?",
        "query_type": "recommendation",
        "route": "db",
        "neighborhoods": [
          {
            "rank": 1,
            "ldong_name": "?¥ì¶©??ê°€",
            "gu_name": "ì¤‘êµ¬",
            "one_liner": "?‰ê·  ?”ì„¸ 49ë§Œì› ???œìš¸ ?‰ê·  ?€ë¹?25% ?€??,
            "data_summary": "?‰ê· ?”ì„¸ 49ë§Œì›"
          }
        ],
        "visualizations": [
          {
            "type": "bar",
            "title": "?™ë„¤ë³??‰ê·  ?”ì„¸ ë¹„êµ",
            "unit": "ë§Œì›",
            "data": [
              {"label": "?¥ì¶©??ê°€", "value": 49.0, "is_baseline": false},
              {"label": "?œìš¸ ?‰ê· ", "value": 65.0, "is_baseline": true}
            ]
          }
        ],
        "elapsed_sec": 23.9
      }

    ?‘ë‹µ (info):
      {
        "answer": "?ì—°???µë?",
        "query_type": "info",
        "route": "db",
        "neighborhoods": [],
        "visualizations": [
          {
            "type": "table",
            "title": "?™êµ­?€ ê·¼ì²˜ ?„ì„œê´€ ?´ì˜?œê°„",
            "unit": "",
            "data": [
              {
                "label": "?„ë™?‘ì??„ì„œê´€",
                "columns": {"??: "10:00-21:00", "??: "10:00-14:00"}
              }
            ]
          }
        ],
        "elapsed_sec": 36.9
      }

    ?‘ë‹µ (direct):
      {
        "answer": "?ˆë…•?˜ì„¸?? ?œìš¸ ?ì·¨/?™ë„¤ ì¶”ì²œ ?œë¹„?¤ì…?ˆë‹¤.",
        "query_type": "none",
        "route": "direct",
        "neighborhoods": [],
        "visualizations": [],
        "elapsed_sec": 3.4
      }
    """
    question = request.data.get("question", "").strip()

    if not question:
        return Response(
            {"error": "ì§ˆë¬¸???…ë ¥?´ì£¼?¸ìš”."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(question) > 500:
        return Response(
            {"error": "ì§ˆë¬¸???ˆë¬´ ê¹ë‹ˆ?? 500???´í•˜ë¡??…ë ¥?´ì£¼?¸ìš”."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = run_agent(question)

        # info ?€?…ì? visualization ?¨ìˆ˜ë¡?ë°˜í™˜?˜ë?ë¡?visualizations ë°°ì—´ë¡??µì¼
        visualizations = result.get("visualizations", [])
        if not visualizations:
            viz = result.get("visualization", {})
            if viz and viz.get("type", "none") != "none":
                visualizations = [viz]

        return Response({
            "answer": result.get("answer", ""),
            "query_type": result.get("query_type", "none"),
            "route": result.get("route", "direct"),
            "neighborhoods": result.get("neighborhoods", []),
            "visualizations": visualizations,
            "elapsed_sec": result.get("elapsed_sec", 0),
        })

    except Exception as e:
        return Response(
            {"error": f"Agent ?¤í–‰ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
