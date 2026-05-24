# API 내부 로그 작성 가이드

## 목적

백엔드에는 Prometheus 메트릭과 OpenTelemetry trace export 의존성이 이미 들어가 있다. 메트릭은 "어떤 API가 얼마나 느린지/많이 호출되는지"를 보기에 좋고, API 내부 로그는 "그 요청이 어느 분기와 데이터 상태를 지나갔는지"를 빠르게 따라가기 위해 남긴다.

이 문서는 Django/DRF API 코드 안에 `logger.info(...)`를 직접 넣을 때의 기준이다.

## 기본 형태

각 API 모듈 상단에 모듈 logger를 선언한다.

```python
import logging
from time import perf_counter

logger = logging.getLogger(__name__)
```

로그 메시지는 이벤트 이름과 key=value 필드를 함께 남긴다.

```python
logger.info(
    "api.adongs.scores.finish status=200 count=%s elapsed_ms=%.1f",
    len(serialized),
    (perf_counter() - started_at) * 1000,
)
```

권장 이벤트 이름 형식:

```text
api.<domain>.<action>.<phase>
```

예시:

```text
api.adongs.scores.start
api.adongs.scores.finish
api.adongs.summary.not_found
api.adongs.gu_metrics.cache_hit
api.preference.pairs.finish
api.agent.query.failed
```

## 로그 레벨 기준

`info`: 정상 흐름을 trace하기 위한 주요 지점. 요청 시작, 파라미터 파싱 완료, 캐시 hit/miss, DB 조회 결과 수, 응답 완료.

`warning`: 서비스는 계속 동작하지만 확인이 필요한 상황. 존재하지 않는 slug, 잘못된 쿼리 파라미터, fallback 사용, 외부 데이터 일부 누락.

`exception`: 예상하지 못한 예외. stack trace가 필요할 때만 사용한다. `except Exception` 안에서는 `logger.exception(...)`을 쓴다.

`debug`: 로컬 개발에서만 볼 상세 정보. 반복문 내부, 큰 쿼리 결과, 계산 중간값은 운영 로그로 남기지 않는다.

## 공통 필드

가능하면 아래 이름을 통일해서 쓴다.

| 필드 | 의미 |
| --- | --- |
| `status` | 응답 HTTP status |
| `elapsed_ms` | API 내부 처리 시간 |
| `slug` | 행정동 slug |
| `gu_code` | 자치구 코드 |
| `user_id` | 인증 사용자 id, 없으면 `anonymous` |
| `count` | 반환 row/item 수 |
| `cache` | `hit` 또는 `miss` |
| `cache_key` | 디버깅에 필요한 경우만 |
| `weights` | 점수 가중치 |
| `codes` | metric_code 목록 |
| `years` | 시계열 조회 연수 |
| `question` | AI Agent 사용자 질문 원문 |

요청 body 전체, 비밀번호, 세션 쿠키, Authorization 헤더, CSRF 토큰, OpenAI/API 키, DB URL은 절대 로그로 남기지 않는다.

## API에 넣는 위치

하나의 API에는 보통 아래 지점만 남긴다.

1. 파라미터 검증이 끝난 직후
2. 캐시를 확인한 직후
3. DB 조회 또는 핵심 계산이 끝난 직후
4. 응답을 반환하기 직전
5. 예상 가능한 실패 분기 직전
6. 예상하지 못한 예외 처리 지점

너무 촘촘하게 넣으면 trace가 쉬워지는 것이 아니라 로그가 노이즈가 된다. 한 API당 `info` 2~4개 정도를 기본값으로 본다.

## 예시: 목록 API

`GET /api/adongs/scores`

```python
class AdongScoresView(APIView):
    pagination_class = None

    def get(self, request: Request) -> Response:
        started_at = perf_counter()
        weights = _parse_and_validate_weights(request)

        logger.info(
            "api.adongs.scores.start weights=%s",
            weights,
        )

        adongs = build_adong_qs()
        wrapped = [wrap(a) for a in adongs]
        serialized = AdongScoreSerializer(
            wrapped,
            many=True,
            context={"weights": weights},
        ).data
        serialized.sort(key=lambda d: d["score"], reverse=True)

        logger.info(
            "api.adongs.scores.finish status=200 count=%s elapsed_ms=%.1f",
            len(serialized),
            (perf_counter() - started_at) * 1000,
        )

        return Response(serialized, status=status.HTTP_200_OK)
```

## 예시: slug 조회 API

`GET /api/adongs/<slug>/summary`

```python
class AdongSummaryView(APIView):
    def get(self, request: Request, slug: str) -> Response:
        started_at = perf_counter()
        weights = _parse_and_validate_weights(request)

        logger.info(
            "api.adongs.summary.start slug=%s weights=%s",
            slug,
            weights,
        )

        from apps.public_data.regions.models import Adong

        try:
            adong = build_adong_qs().get(slug=slug)
        except Adong.DoesNotExist as exc:
            logger.warning("api.adongs.summary.not_found slug=%s", slug)
            raise NotFound({"detail": "동을 찾을 수 없습니다."}) from exc

        adong = wrap(adong)
        data = AdongSummarySerializer(adong, context={"weights": weights}).data

        logger.info(
            "api.adongs.summary.finish slug=%s status=200 elapsed_ms=%.1f",
            slug,
            (perf_counter() - started_at) * 1000,
        )

        return Response(data, status=status.HTTP_200_OK)
```

## 예시: 캐시가 있는 API

`GET /api/adongs/<slug>/gu-metrics`

```python
class AdongGuMetricsView(APIView):
    def get(self, request: Request, slug: str) -> Response:
        started_at = perf_counter()
        adong = _get_dong_or_404(slug)

        gu = Gu.objects.filter(name=adong.gu).first()
        if gu is None:
            logger.warning(
                "api.adongs.gu_metrics.gu_not_found slug=%s gu=%s",
                slug,
                adong.gu,
            )
            raise NotFound({"detail": f"구를 찾을 수 없습니다: {adong.gu}"})

        cache_key = f"dong_gu_metrics:v2:{gu.gu_code}"
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(
                "api.adongs.gu_metrics.cache_hit slug=%s gu_code=%s elapsed_ms=%.1f",
                slug,
                gu.gu_code,
                (perf_counter() - started_at) * 1000,
            )
            result = {**cached, "adong": _dong_header(adong)}
            return Response(result, status=status.HTTP_200_OK)

        logger.info(
            "api.adongs.gu_metrics.cache_miss slug=%s gu_code=%s",
            slug,
            gu.gu_code,
        )

        # DB 조회 및 metrics_dict/seoul_avg 생성...

        logger.info(
            "api.adongs.gu_metrics.finish slug=%s gu_code=%s status=200 metric_count=%s elapsed_ms=%.1f",
            slug,
            gu.gu_code,
            len(metrics_dict),
            (perf_counter() - started_at) * 1000,
        )

        return Response(data, status=status.HTTP_200_OK)
```

## 예시: 인증 API

로그인/회원가입에서는 비밀번호와 요청 body를 절대 남기지 않는다.

```python
class LoginView(APIView):
    def post(self, request: Request) -> Response:
        started_at = perf_counter()
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("api.auth.login.invalid_payload status=400")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_active:
            logger.warning(
                "api.auth.login.failed status=401 username_present=%s elapsed_ms=%.1f",
                bool(username),
                (perf_counter() - started_at) * 1000,
            )
            return Response(
                {"detail": "아이디 또는 비밀번호가 올바르지 않습니다."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        login(request, user)
        logger.info(
            "api.auth.login.success status=200 user_id=%s elapsed_ms=%.1f",
            user.id,
            (perf_counter() - started_at) * 1000,
        )
        return Response(MeSerializer(user).data, status=status.HTTP_200_OK)
```

## 예시: AI Agent API

AI Agent는 trace를 위해 사용자 질문 원문을 남긴다. 단, `request.data` 전체를 찍지 말고 `question` 필드만 명시적으로 남긴다.

```python
@api_view(["POST"])
@permission_classes([AllowAny])
def agent_query(request):
    started_at = perf_counter()
    question = request.data.get("question", "").strip()

    logger.info(
        "api.agent.query.start question=%r question_len=%s",
        question,
        len(question),
    )

    if not question:
        logger.warning("api.agent.query.empty_question status=400")
        return Response(
            {"error": "질문을 입력해주세요."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(question) > 500:
        logger.warning(
            "api.agent.query.too_long status=400 question=%r question_len=%s",
            question,
            len(question),
        )
        return Response(
            {"error": "질문이 너무 깁니다. 500자 이하로 입력해주세요."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = run_agent(question)
        logger.info(
            "api.agent.query.finish status=200 route=%s query_type=%s question=%r elapsed_ms=%.1f",
            result.get("route", "direct"),
            result.get("query_type", "none"),
            question,
            (perf_counter() - started_at) * 1000,
        )
        return Response(...)
    except Exception:
        logger.exception(
            "api.agent.query.failed status=500 question=%r question_len=%s elapsed_ms=%.1f",
            question,
            len(question),
            (perf_counter() - started_at) * 1000,
        )
        return Response(
            {"error": "Agent 실행 중 오류가 발생했습니다."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
```

## 하지 말 것

```python
# 요청 body 전체가 찍힐 수 있음
logger.info("login request=%s", request.data)

# 비밀번호가 찍힘
logger.info("password=%s", password)

# 매 요청마다 너무 큰 응답이 찍힘
logger.info("response=%s", serialized)

# f-string은 로그 레벨에서 버려질 때도 문자열을 먼저 만든다
logger.info(f"api.adongs.scores.finish count={len(serialized)}")
```

대신 아래처럼 쓴다.

```python
logger.info(
    "api.adongs.scores.finish status=200 count=%s elapsed_ms=%.1f",
    len(serialized),
    elapsed_ms,
)
```

## 새 API 로그 체크리스트

- [ ] 모듈 상단에 `logger = logging.getLogger(__name__)`를 추가했다.
- [ ] `perf_counter()`로 `elapsed_ms`를 남긴다.
- [ ] 요청 시작 또는 파라미터 검증 완료 지점에 `info`를 남긴다.
- [ ] 캐시가 있으면 hit/miss를 남긴다.
- [ ] 응답 직전에 `status`, `count`, `elapsed_ms`를 남긴다.
- [ ] 예상 가능한 실패는 `warning`으로 남긴다.
- [ ] 예상하지 못한 예외는 `logger.exception(...)`으로 남긴다.
- [ ] 비밀번호, 쿠키, 토큰, API 키, 요청 body 전체를 남기지 않는다.
