import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import aiArchitectureImage from '@/assets/presentation/ai-architecture.svg';
import mapCurrentImage from '@/assets/presentation/map-current.png';
import serviceQrImage from '@/assets/presentation/service-qr.png';

type SlideKind =
  | 'cover'
  | 'qr'
  | 'toc'
  | 'problem'
  | 'thesis'
  | 'pipeline'
  | 'formula'
  | 'mapping'
  | 'score'
  | 'map'
  | 'dashboard'
  | 'preference'
  | 'ai'
  | 'demo'
  | 'difference'
  | 'ip'
  | 'operation'
  | 'closing';

interface SlideRow {
  code: string;
  title: string;
  body: string;
  tag?: string;
}

interface SlideImage {
  src: string;
  alt: string;
  label: string;
  scroll?: boolean;
  scrollDuration?: number;
  scrollFrameHeight?: string;
}

type DiagramVariant = 'architecture' | 'spatial-mapping' | 'data-pipeline';

interface DiagramSlot {
  label: string;
  title: string;
  guide: string;
  variant?: DiagramVariant;
  items?: string[];
}

interface Slide {
  eyebrow: string;
  title: string;
  lead: string;
  kind: SlideKind;
  rows?: SlideRow[];
  bullets?: string[];
  image?: SlideImage;
  diagramSlot?: DiagramSlot;
  videoCue?: string;
  note?: string;
  summary?: {
    label: string;
    text: string;
  };
}

const SERVICE_URL = 'https://slgi-life.duckdns.org/';
const MAP_URL = 'https://slgi-life.duckdns.org/map';

const slides: Slide[] = [
  {
    eyebrow: 'INTRO',
    title: '자취맵',
    lead: '서울로 상경한 대학생을 위한 공공데이터 기반 동네 큐레이션 서비스',
    kind: 'cover',
    rows: [
      {
        code: 'team',
        title: '10조',
        body: '박세황 · 박지현 · 백수민 · 하승연',
      },
      {
        code: 'class',
        title: '분반 · 담당 교수',
        body: '분반명 · 담당 교수님 성함',
      },
      {
        code: 'url',
        title: 'URL',
        body: 'slgi-life.duckdns.org',
      },
    ],
  },
  {
    eyebrow: 'LIVE ACCESS',
    title: '서비스 접속 경로',
    lead: '서비스와 대표 화면에 바로 접속할 수 있는 주소입니다.',
    kind: 'qr',
    rows: [
      {
        code: '01',
        title: '서비스 URL',
        body: SERVICE_URL,
      },
      {
        code: '02',
        title: '지도 화면',
        body: MAP_URL,
      },
      {
        code: '03',
        title: '대시보드 화면',
        body: '.../dashboard/adong/용산구-용산2가동',
      },
    ],
  },
  {
    eyebrow: 'PROBLEM',
    title: '자취방 선택은 동네 선택에서 먼저 어려워집니다',
    lead: '저렴한 매물을 찾는 문제를 넘어, 예산 안에서 통학, 생활, 의료, 안전이 가능한 동네를 고르는 문제입니다.',
    kind: 'problem',
    rows: [
      {
        code: '01',
        title: '의사결정 기준이 다름',
        body: '학교 앞을 원하는 사람은 통학이 중요하고, 월세를 낮추려는 사람은 주변 동네 탐색이 필요합니다.',
      },
      {
        code: '02',
        title: '정보가 여러 곳에 흩어짐',
        body: '전월세, 이동시간, 편의시설, 병원, 안전 정보가 부동산 앱과 지도 서비스에 나뉘어 있습니다.',
      },
      {
        code: '03',
        title: '서울을 모르면 시작점이 없음',
        body: '지방 출신 대학생은 어느 구와 어느 동네부터 봐야 할지 판단 기준을 만들기 어렵습니다.',
      },
      {
        code: '04',
        title: '기존 앱은 매물 확인에 집중',
        body: '직방, 다방, 네이버 부동산은 매물 확인에는 강하지만, 동네 후보를 먼저 좁히는 흐름은 제한적입니다.',
      },
    ],
  },
  {
    eyebrow: 'SERVICE THESIS',
    title: '매물 검색 이전 단계에서 후보 동네를 압축합니다',
    lead: '자취맵은 행정동·법정동 단위 점수로 동네 자체의 적합성을 먼저 판단하도록 돕는 서비스입니다.',
    kind: 'thesis',
    bullets: [
      '추천: 보증금, 월세, 면적, 시설, 통학시간을 입력해 후보를 정렬',
      '탐색: 지도에서 히트맵, 생활시설, 의료시설, 경계를 직접 확인',
      '연결: 대시보드 검증 후 실제 매물 보기와 계약 전 체크리스트까지 이어짐',
    ],
  },
  {
    eyebrow: 'POSITIONING',
    title: '기존 앱은 매물을 보여주고, 자취맵은 동네를 먼저 좁힙니다',
    lead: '자취맵은 부동산 앱을 대체하는 서비스가 아니라, 매물을 보기 전에 살펴볼 동네 후보를 정리하는 서비스입니다.',
    kind: 'difference',
    summary: {
      label: 'Core Difference',
      text: '직방·다방·네이버 부동산은 매물 확인에 강하고, 자취맵은 예산·통학·생활·안전 기준으로 후보 동네를 먼저 압축합니다.',
    },
    rows: [
      {
        code: '직방 · 다방',
        title: '매물 탐색 중심',
        body: '원룸, 오피스텔 등 실제 매물 목록과 조건 검색에 강점이 있습니다.',
        tag: '차이: 어느 동네부터 볼지는 사용자가 직접 판단',
      },
      {
        code: '네이버 부동산',
        title: '시세·매물 정보 중심',
        body: '매물, 시세, 단지·지역 정보를 폭넓게 확인하는 데 강점이 있습니다.',
        tag: '차이: 자취 조건별 후보 동네 압축 흐름은 제한적',
      },
      {
        code: '지도 서비스',
        title: '위치·시설 확인 중심',
        body: '주변 시설과 이동 경로를 확인할 수 있지만 비용, 안전, 시설 판단이 분리됩니다.',
        tag: '차이: 자취 적합도를 한 번에 비교하기 어려움',
      },
      {
        code: '자취맵',
        title: '동네 후보 압축 중심',
        body: '예산, 통학, 생활시설, 의료시설, 안전 정보를 동네 단위로 묶어 먼저 비교합니다.',
        tag: '조건 추천 → 지도 탐색 → 대시보드 → 매물/도우미',
      },
    ],
  },
  {
    eyebrow: 'DEMO PLAN',
    title: '서비스 흐름은 후보 탐색과 검증으로 이어집니다',
    lead: '지도 탐색, 후보 담기, 대시보드 확인, 계약 전 점검까지 실제 화면 전환으로 연결됩니다.',
    kind: 'demo',
    videoCue: '30초 영상: 홈 진입 → 지도 필터 → 후보 담기 → 대시보드 이동',
    rows: [
      {
        code: '01',
        title: '홈 / 지도',
        body: '서울 지도에서 점수 히트맵, 행정동·법정동 전환, 시설 필터를 켭니다.',
      },
      {
        code: '02',
        title: '후보 담기',
        body: '관심 동네를 담고 최대 10개 후보를 비교하는 흐름을 보여줍니다.',
      },
      {
        code: '03',
        title: '대시보드',
        body: '임대료, 교통, 편의시설, 안전 지표와 시세 차트를 한 화면에서 확인합니다.',
      },
      {
        code: '04',
        title: '매물 / 계약 점검',
        body: '실제 매물 보기로 넘어가고, 부동산 도우미에서 계약 전 체크리스트를 확인합니다.',
      },
    ],
  },
  {
    eyebrow: 'RECOMMENDATION',
    title: '조건을 입력하면 살펴볼 동네 후보를 찾아줍니다',
    lead: '예산, 면적, 시설, 목적지, 통학 시간을 입력하면 비용과 생활 조건을 반영해 후보 동네를 정렬합니다.',
    kind: 'formula',
    bullets: [
      '환산월세 = 월세 + 보증금 × 0.005',
      '희망 면적, 필요 시설, 학교·목적지, 최대 통학 시간을 필터로 적용',
      '추천 결과에서 동네 대시보드, 실제 매물 보기, 계약 전 체크리스트로 이동',
    ],
  },
  {
    eyebrow: 'MAP EXPLORATION',
    title: '지도에서는 동네의 공간 맥락을 직접 검증합니다',
    lead: '점수 히트맵과 시설 필터를 켜고 끄며 후보 동네의 생활 조건을 시각적으로 확인합니다.',
    kind: 'map',
    image: {
      src: mapCurrentImage,
      alt: '현재 자취맵 지도 화면. 행정동과 법정동 히트맵, 생활시설과 의료시설 필터가 보인다.',
      label: 'LIVE MAP / CURRENT SERVICE',
    },
    videoCue: '20초 영상: 행정동·법정동 전환, 히트맵 항목 변경, 시설 필터 켜기',
    bullets: [
      '행정동·법정동 전환으로 비교 단위를 바꿔 볼 수 있음',
      '종합, 부동산, 교통, 편의시설, 안전 지수를 히트맵으로 비교',
      '지하철역, 버스정류장, 병원, 약국, 편의점 등 생활시설 필터 제공',
    ],
  },
  {
    eyebrow: 'DETAIL VIEW',
    title: '대시보드는 후보 동네를 계약 전 점검 기준으로 정리합니다',
    lead: '지도에서 고른 동네를 임대료, 교통, 편의시설, 안전 지표와 실거래 차트로 다시 검증합니다.',
    kind: 'dashboard',
    videoCue: '25초 영상: 대시보드 스크롤로 시세, 교통, 편의시설, 안전 지표 훑기',
    bullets: [
      '실거래 기반 평균 환산월세, 평균 보증금, 최근 거래 건수 요약',
      '월별 추이, 주택 유형 분포, 면적별 산점도, 보증금 구간별 월세 제공',
      '교통 접근성, 편의시설 밀도, 의료시설, 안전 지수를 같은 화면에서 검토',
    ],
    rows: [
      {
        code: '01',
        title: '시세',
        body: '평균 환산월세, 평균 보증금, 최근 거래 건수와 가격 흐름을 요약합니다.',
      },
      {
        code: '02',
        title: '교통',
        body: '지하철역, 버스정류장, 통학 가능성 등 이동 조건을 확인합니다.',
      },
      {
        code: '03',
        title: '생활',
        body: '편의시설, 의료시설, 공원 등 실제 생활 인프라를 동네 단위로 봅니다.',
      },
      {
        code: '04',
        title: '안전',
        body: '안전 지표를 함께 보여줘 계약 전 판단 누락을 줄입니다.',
      },
    ],
  },
  {
    eyebrow: 'AI + HELPER',
    title: 'AI와 부동산 도우미는 계약 전 확인을 보조합니다',
    lead: '동네를 고른 뒤에는 자연어 질문, 후보 비교, 실제 매물 확인, 계약 전 체크리스트로 판단을 이어갑니다.',
    kind: 'ai',
    image: {
      src: aiArchitectureImage,
      alt: '사용자 질문을 질문 분류, Text-to-SQL, SQL 안전 검증, 읽기 전용 DB 조회, 답변 반환으로 연결하는 AI Agent 구조도',
      label: 'AI AGENT / READ-ONLY DB FLOW',
    },
    videoCue: '20초 영상: 자연어 질문 → SQL 조회 기반 답변 → 후보 비교 또는 체크리스트 확인',
    bullets: [
      'AI Agent 전용 read-only DB URL을 사용해 쓰기 가능한 DB 권한과 분리',
      '질문 의도, 테이블 선택, SQL 검증을 거쳐 표·그래프·후보 비교로 응답',
      '부동산 도우미는 실제 매물 보기, 가격 적정성, 계약 체크리스트, 외부 확인 링크로 연결',
    ],
  },
  {
    eyebrow: 'TECH STACK',
    title: '빠른 화면, 미리 계산한 데이터',
    lead: '사용자 화면, 서비스 API, 데이터·캐시 계층을 나눠 지도와 대시보드가 짧은 시간 안에 응답하도록 구성했습니다.',
    kind: 'operation',
    diagramSlot: {
      label: '구현 구조',
      title: '서비스 아키텍처',
      guide: '사용자 화면, 서비스 API, 데이터·캐시 계층을 분리해 기능 흐름과 데이터 조회 책임을 나눴습니다.',
      variant: 'architecture',
      items: ['React/Vite/TS', 'Django REST/GeoDjango', 'PostgreSQL/PostGIS', 'Redis', 'Docker Compose'],
    },
    bullets: [
      '화면: 추천, 지도, 대시보드, 부동산 도우미를 하나의 SPA 흐름으로 제공',
      'API: 지도, 추천, 대시보드, AI, 매물 분석 기능을 도메인별로 분리',
      '데이터: PostGIS 공간 연산과 캐시 테이블로 반복 계산을 줄임',
    ],
  },
  {
    eyebrow: 'TROUBLESHOOTING',
    title: '대용량 공간데이터는 미리 계산하고 짧게 조회합니다',
    lead: '대용량 조회, 공간 기준 차이, AI SQL 실행 안전성은 서비스 완성도에 직접 영향을 준 기술 과제입니다.',
    kind: 'ip',
    rows: [
      {
        code: '01',
        title: '700만 건 조회 성능',
        body: '원본 실거래와 시설 데이터를 요청마다 계산하면 지도와 대시보드 응답이 느려집니다.',
        tag: 'current score cache table, iterator, 사전 집계로 해결',
      },
      {
        code: '02',
        title: '공간 매핑 비용',
        body: '법정동 실거래, 행정동 경계, 좌표 시설 데이터의 기준이 서로 달라 공간 결합이 필요했습니다.',
        tag: 'PostGIS ST_Intersection, GIST index, 행정동/법정동 매핑 테이블',
      },
      {
        code: '03',
        title: 'AI 응답 안전성',
        body: 'LLM이 만든 SQL을 쓰기 가능한 DB에서 실행하면 위험하고, 응답 시간도 길어질 수 있습니다.',
        tag: 'AI_AGENT_DATABASE_URL, read-only SQL guard, timeout/retry 설정',
      },
    ],
  },
  {
    eyebrow: 'OUTCOME',
    title: '동네를 먼저 정하면 매물 선택이 쉬워집니다',
    lead: '자취맵은 흩어진 공공데이터를 자취 의사결정 기준으로 바꿔, 사용자가 살펴볼 후보 동네를 줄입니다.',
    kind: 'closing',
    bullets: [
      '탐색 부담 감소: 여러 사이트를 오가던 가격, 시설, 교통, 안전 확인을 하나의 흐름으로 연결',
      '확장성: 데이터와 지표가 API 단위로 분리되어 지역 확대와 지표 추가가 가능',
      '향후: 동네 리뷰, 자취 팁 게시판으로 공공데이터가 담지 못하는 생활 정보를 보완',
    ],
  },
  {
    eyebrow: 'APPENDIX 01',
    title: '공간 기준이 다른 데이터를 하나의 동네로 맞춥니다',
    lead: '실거래는 법정동, 서비스 탐색은 행정동, 시설은 좌표 기준이기 때문에 공간 매핑이 핵심입니다.',
    kind: 'mapping',
    diagramSlot: {
      label: '구현 구조',
      title: '공간 데이터 매핑 다이어그램',
      guide: '기준이 다른 원천 데이터를 하나의 동네 단위로 맞춘 과정을 세 단계로 설명합니다.',
      variant: 'spatial-mapping',
      items: ['rent_deal', 'adong/ldong boundary', 'amenity/medical points', 'PostGIS spatial join'],
    },
  },
  {
    eyebrow: 'APPENDIX 02',
    title: '공공데이터 갱신과 점수 재계산 흐름',
    lead: '공공데이터는 업데이트 스크립트와 캐시 재계산을 거쳐 지도, 추천, 대시보드에 다시 반영됩니다.',
    kind: 'operation',
    diagramSlot: {
      label: '구현 구조',
      title: '데이터 파이프라인 다이어그램',
      guide: '공공데이터가 서비스 화면에 반영되는 과정을 업데이트, 계산, 캐시, API 응답 순서로 보여줍니다.',
      variant: 'data-pipeline',
      items: ['update_all.py', 'current_adong/current_ldong', 'recommend_rent_region_cache', 'dashboard_*_cache'],
    },
    bullets: [
      '전월세, 시설, 의료, 교통, 안전 데이터를 public_data 앱과 update scripts로 적재',
      '행정동·법정동 점수, 추천용 임대료, 대시보드 JSON을 캐시 테이블로 제공',
      '데이터 출처와 공공데이터의 한계는 별도 데이터 출처 화면에서 관리',
    ],
  },
];

export default function CartesianPresentation() {
  const [index, setIndex] = useState(() => initialSlideIndex(slides.length));
  const stageRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const lastWheelAt = useRef(0);

  const goTo = useCallback((nextIndex: number) => {
    setIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
  }, []);

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    const scaleStage = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const factor = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      const x = (window.innerWidth - 1920 * factor) / 2;
      const y = (window.innerHeight - 1080 * factor) / 2;
      stage.style.transform = `translate(${x}px, ${y}px) scale(${factor})`;
    };

    scaleStage();
    window.addEventListener('resize', scaleStage);
    return () => window.removeEventListener('resize', scaleStage);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        setIndex((value) => Math.min(slides.length - 1, value + 1));
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      }
      if (event.key.toLowerCase() === 'home') setIndex(0);
      if (event.key.toLowerCase() === 'end') setIndex(slides.length - 1);
      if (event.key.toLowerCase() === 'f' && document.fullscreenEnabled) {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          void document.documentElement.requestFullscreen();
        }
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 36) return;
      const now = Date.now();
      if (now - lastWheelAt.current < 620) return;
      lastWheelAt.current = now;
      setIndex((value) =>
        event.deltaY > 0
          ? Math.min(slides.length - 1, value + 1)
          : Math.max(0, value - 1),
      );
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartX.current = event.touches[0]?.clientX ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const startX = touchStartX.current;
      const endX = event.changedTouches[0]?.clientX;
      touchStartX.current = null;
      if (startX == null || endX == null) return;
      const delta = startX - endX;
      if (Math.abs(delta) < 64) return;
      setIndex((value) =>
        delta > 0 ? Math.min(slides.length - 1, value + 1) : Math.max(0, value - 1),
      );
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('slide', String(index + 1));
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [index]);

  const progress = useMemo(() => ((index + 1) / slides.length) * 100, [index]);

  return (
    <main className="cartesian-deck-root" aria-label="자취맵 Cartesian 슬라이드">
      <CartesianStyles />
      <div className="cartesian-progress" style={{ width: `${progress}%` }} />
      <div className="cartesian-deck-viewport">
        <div ref={stageRef} id="cartesianDeckStage" className="cartesian-deck-stage">
          {slides.map((slide, slideIndex) => (
            <section
              key={`${slide.eyebrow}-${slide.title}`}
              className={`cartesian-slide cartesian-${slide.kind} ${
                slideIndex === index ? 'active visible' : ''
              }`}
              aria-hidden={slideIndex !== index}
            >
              <SlideChrome slide={slide} current={slideIndex + 1} total={slides.length} />
              <SlideBody slide={slide} />
            </section>
          ))}
        </div>
      </div>
      <div className="cartesian-controls" aria-label="슬라이드 조작">
        <button type="button" onClick={goPrev} disabled={index === 0} aria-label="이전 슬라이드">
          ←
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={index === slides.length - 1}
          aria-label="다음 슬라이드"
        >
          →
        </button>
      </div>
    </main>
  );
}

function initialSlideIndex(total: number) {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get('slide');
  const slideNumber = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(slideNumber)) return 0;
  return Math.max(0, Math.min(total - 1, slideNumber - 1));
}

function SlideChrome({
  slide,
  current,
  total,
}: {
  slide: Slide;
  current: number;
  total: number;
}) {
  return (
    <>
      <span className="cartesian-axis-v" aria-hidden="true" />
      <span className="cartesian-axis-h" aria-hidden="true" />
      <header className="cartesian-topbar">
        <span>{slide.eyebrow}</span>
        <span>Cartesian</span>
      </header>
      <nav className="cartesian-nav-dots" aria-label="슬라이드 위치">
        {slides.map((item, index) => (
          <span
            key={`${item.kind}-${index}`}
            className={index + 1 === current ? 'active' : undefined}
          />
        ))}
      </nav>
      <footer className="cartesian-footer">
        <span>SELF-LIVING DECISION SERVICE</span>
        <span>
          {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </footer>
      {slide.videoCue ? (
        <aside className="cartesian-video-cue" aria-label="시연 영상 삽입 위치">
          <span>VIDEO SLOT</span>
          <strong>{slide.videoCue}</strong>
        </aside>
      ) : null}
    </>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  if (slide.kind === 'cover') return <CoverSlide slide={slide} />;
  if (slide.kind === 'qr') return <QrSlide slide={slide} />;
  if (slide.kind === 'toc') return <TocSlide slide={slide} />;
  if (slide.kind === 'problem') return <ProblemSlide slide={slide} />;
  if (slide.kind === 'thesis') return <ThesisSlide slide={slide} />;
  if (slide.kind === 'pipeline') return <ImageResearchSlide slide={slide} stats={['5+ 데이터 범주', '3 공간 기준', '1 판단 흐름']} />;
  if (slide.kind === 'formula') return <FormulaSlide slide={slide} />;
  if (slide.kind === 'mapping') return <MappingSlide slide={slide} />;
  if (slide.kind === 'score') return <ScoreSlide slide={slide} />;
  if (slide.kind === 'map') return <ScreenSlide slide={slide} />;
  if (slide.kind === 'dashboard') return <DashboardSlide slide={slide} />;
  if (slide.kind === 'preference') return <PreferenceSlide slide={slide} />;
  if (slide.kind === 'ai') return <ImageResearchSlide slide={slide} />;
  if (slide.kind === 'demo') return <DemoSlide slide={slide} />;
  if (slide.kind === 'difference') return <DifferenceSlide slide={slide} />;
  if (slide.kind === 'ip') return <IpSlide slide={slide} />;
  if (slide.kind === 'operation') return <ImageResearchSlide slide={slide} />;
  return <ClosingSlide slide={slide} />;
}

function SlideTitle({ children, className = '' }: { children: string; className?: string }) {
  return <h1 className={`cartesian-title ${className}`}>{children}</h1>;
}

function Lead({ children, className = '' }: { children: string; className?: string }) {
  return <p className={`cartesian-lead ${className}`}>{children}</p>;
}

function CoverSlide({ slide }: { slide: Slide }) {
  const stats = slide.rows ?? [
    { code: 'team', title: '10조', body: '박세황 · 박지현 · 백수민 · 하승연' },
    { code: 'data', title: '서울', body: '공공데이터 기반 동네 탐색' },
    { code: 'flow', title: '후보', body: '추천 · 탐색 · 검증 흐름' },
  ];

  return (
    <div className="cartesian-content cartesian-cover-layout">
      <div className="cartesian-cover-copy">
        <span className="cartesian-label">Neighborhood first</span>
        <SlideTitle className="cartesian-cover-title">{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
      </div>
      {slide.image ? (
        <ImagePanel image={slide.image} className="cartesian-cover-image" fit="contain" />
      ) : (
        <CoverFlowVisual />
      )}
      <div className="cartesian-cover-stats">
        {stats.map((row, index) => (
          <StatCell key={row.code} number={row.title} label={row.body} index={index} />
        ))}
      </div>
    </div>
  );
}

function QrSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-qr-layout">
      <div className="cartesian-qr-copy">
        <span className="cartesian-label">Try it now</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        <div className="cartesian-qr-list">
          {(slide.rows ?? []).map((row) => (
            <article key={row.code}>
              <span>{row.code}</span>
              <h2>{row.title}</h2>
              <p>{row.body}</p>
            </article>
          ))}
        </div>
      </div>
      <figure className="cartesian-qr-card" aria-label="자취맵 서비스 접속 QR 코드">
        <img src={serviceQrImage} alt="자취맵 서비스 URL QR 코드" />
        <figcaption>{SERVICE_URL}</figcaption>
      </figure>
    </div>
  );
}

function TocSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-toc-layout">
      <div className="cartesian-heading-block">
        <span className="cartesian-label">Agenda</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
      </div>
      <div className="cartesian-toc-list">
        {(slide.rows ?? []).map((row) => (
          <article key={row.code} className="cartesian-toc-item">
            <span>{row.code}</span>
            <h2>{row.title}</h2>
            <p>{row.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProblemSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-problem-layout">
      <div className="cartesian-heading-block">
        <span className="cartesian-label">Question</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        <ProblemSignalVisual />
      </div>
      <div className="cartesian-row-list">
        {(slide.rows ?? []).map((row) => (
          <ArticleRow key={row.code} row={row} />
        ))}
      </div>
    </div>
  );
}

function ThesisSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-thesis-layout">
      <span className="cartesian-geo-ring centered" aria-hidden="true" />
      <div className="cartesian-thesis-statement">
        <span className="cartesian-label">Service thesis</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
      </div>
      <div className="cartesian-thesis-right">
        <DecisionPipelineVisual />
        <NumberedList bullets={slide.bullets ?? []} />
      </div>
    </div>
  );
}

function ImageResearchSlide({
  slide,
  stats,
}: {
  slide: Slide;
  stats?: string[];
}) {
  return (
    <div className="cartesian-content cartesian-two-column">
      <div className="cartesian-copy-column">
        <span className="cartesian-label">System view</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        {slide.bullets ? <NumberedList bullets={slide.bullets} compact /> : null}
        {stats ? (
          <div className="cartesian-mini-stats">
            {stats.map((stat, index) => {
              const [number, ...labelParts] = stat.split(' ');
              return <StatCell key={stat} number={number} label={labelParts.join(' ')} index={index} />;
            })}
          </div>
        ) : null}
      </div>
      {slide.image ? (
        <ImagePanel image={slide.image} className="cartesian-diagram-panel" />
      ) : slide.diagramSlot ? (
        <DiagramSlotPanel slot={slide.diagramSlot} className="cartesian-diagram-panel" />
      ) : null}
    </div>
  );
}

function FormulaSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-formula-layout">
      <div className="cartesian-formula-header">
        <span className="cartesian-label">Cost normalization</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
      </div>
      <div className="cartesian-formula-box" aria-label="환산월세 공식">
        <span>Converted rent</span>
        <strong>월세 + 보증금 × 0.005</strong>
      </div>
      <RecommendationFlowVisual />
      <NumberedList bullets={slide.bullets ?? []} />
    </div>
  );
}

function MappingSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-two-column cartesian-mapping-layout">
      <div className="cartesian-copy-column">
        <span className="cartesian-label">Spatial alignment</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        <div className="cartesian-layer-list">
          <span>법정동</span>
          <span>행정동</span>
          <span>좌표</span>
        </div>
      </div>
      {slide.image ? (
        <ImagePanel image={slide.image} className="cartesian-diagram-panel" />
      ) : slide.diagramSlot ? (
        <DiagramSlotPanel slot={slide.diagramSlot} className="cartesian-diagram-panel" />
      ) : null}
    </div>
  );
}

function ScoreSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-score-layout">
      <div className="cartesian-score-heading">
        <span className="cartesian-label">Adaptive score</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
      </div>
      <div className="cartesian-score-grid">
        {(slide.rows ?? []).map((row) => (
          <div key={row.code} className="cartesian-score-card">
            <span>{row.code}</span>
            <h2>{row.title}</h2>
            <p>{row.body}</p>
            <small>{row.tag}</small>
          </div>
        ))}
      </div>
      <div className="cartesian-equation">
        {slide.note ?? '종합점수 = 전월세×w1 + 생활시설×w2 + 교통×w3'}
      </div>
    </div>
  );
}

function ScreenSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-screen-layout">
      <div className="cartesian-copy-column">
        <span className="cartesian-label">Map exploration</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        <NumberedList bullets={slide.bullets ?? []} compact />
      </div>
      {slide.image ? (
        <ImagePanel image={slide.image} className="cartesian-screen-panel" fit="contain" />
      ) : (
        <ConceptPanel rows={slide.rows ?? []} />
      )}
    </div>
  );
}

function DashboardSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-dashboard-layout">
      <div className="cartesian-copy-column">
        <span className="cartesian-label">Detail view</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        <NumberedList bullets={slide.bullets ?? []} compact />
      </div>
      {slide.image ? (
        <ImagePanel image={slide.image} className="cartesian-dashboard-panel" />
      ) : (
        <ConceptPanel rows={slide.rows ?? []} />
      )}
    </div>
  );
}

function PreferenceSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-preference-layout">
      <div className="cartesian-heading-block">
        <span className="cartesian-label">Personalization</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
      </div>
      <div className="cartesian-preference-grid">
        <div className="cartesian-row-list">
          {(slide.rows ?? []).map((row) => (
            <ArticleRow key={row.code} row={row} />
          ))}
        </div>
        <div className="cartesian-weight-panel">
          {[
            ['월세', 72],
            ['생활시설', 58],
            ['교통', 81],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}%</strong>
              <i>
                <b style={{ width: `${value}%` }} />
              </i>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-demo-layout">
      <span className="cartesian-label">Demo sequence</span>
      <SlideTitle>{slide.title}</SlideTitle>
      <Lead>{slide.lead}</Lead>
      <div className="cartesian-timeline">
        {(slide.rows ?? []).map((row) => (
          <div key={row.code}>
            <span>{row.code}</span>
            <h2>{row.title}</h2>
            <p>{row.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DifferenceSlide({ slide }: { slide: Slide }) {
  const summary = slide.summary ?? {
    label: 'Market gap',
    text: '검증할 정보는 많지만, 자취생이 처음 봐야 할 동네를 줄여주는 흐름은 비어 있습니다.',
  };
  const sectionLabel = slide.eyebrow === 'REAL ESTATE HELPER' ? 'Support flow' : 'Positioning';

  return (
    <div className="cartesian-content cartesian-difference-layout">
      <div className="cartesian-heading-block">
        <span className="cartesian-label">{sectionLabel}</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        <div className="cartesian-position-summary">
          <span>{summary.label}</span>
          <strong>{summary.text}</strong>
        </div>
      </div>
      <DifferenceMatrix rows={slide.rows ?? []} />
    </div>
  );
}

function IpSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-ip-layout">
      <div className="cartesian-heading-block">
        <span className="cartesian-label">Technical differentiation</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
      </div>
      <div className="cartesian-ip-table">
        <div className="cartesian-ip-head">
          <span>No.</span>
          <span>문제</span>
          <span>원인</span>
          <span>해결</span>
        </div>
        {(slide.rows ?? []).map((row) => (
          <div key={row.code} className="cartesian-ip-row">
            <span>{row.code}</span>
            <strong>{row.title}</strong>
            <p>{row.body}</p>
            <em>{row.tag}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosingSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-closing-layout">
      <span className="cartesian-geo-ring soft" aria-hidden="true" />
      <span className="cartesian-label">Conclusion</span>
      <SlideTitle>{slide.title}</SlideTitle>
      <Lead>{slide.lead}</Lead>
      <div className="cartesian-closing-list">
        {(slide.bullets ?? []).map((bullet, index) => (
          <div key={bullet}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{bullet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticleRow({ row }: { row: SlideRow }) {
  return (
    <article className="cartesian-article-row">
      <span>{row.code}</span>
      <h2>{row.title}</h2>
      <p>{row.body}</p>
      {row.tag ? <em>{row.tag}</em> : null}
    </article>
  );
}

function CoverFlowVisual() {
  const steps = [
    ['Input', '조건', '예산 · 면적 · 목적지 · 시설'],
    ['Explore', '동네', '추천 · 지도 · 히트맵'],
    ['Decide', '검토', '대시보드 · AI · 도우미'],
  ];

  return (
    <div className="cartesian-cover-flow" aria-label="조건 입력에서 동네 탐색과 매물 검토로 이어지는 서비스 흐름">
      {steps.map(([label, title, body]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{title}</strong>
          <p>{body}</p>
        </article>
      ))}
    </div>
  );
}

function ConceptPanel({ rows }: { rows: SlideRow[] }) {
  return (
    <div className="cartesian-concept-panel" aria-label="기능 개념 요약">
      {rows.map((row) => (
        <article key={row.code}>
          <span>{row.code}</span>
          <h2>{row.title}</h2>
          <p>{row.body}</p>
          {row.tag ? <em>{row.tag}</em> : null}
        </article>
      ))}
    </div>
  );
}

function ProblemSignalVisual() {
  const items = [
    ['월세', '실거래'],
    ['통학', '교통'],
    ['시설', '좌표'],
    ['동네', '행정동'],
  ];

  return (
    <div className="cartesian-problem-visual" aria-label="분산된 정보를 동네 판단으로 모으는 구조">
      <div className="cartesian-problem-center">
        <span>Decision</span>
        <strong>동네 선택</strong>
      </div>
      {items.map(([label, meta], index) => (
        <div key={label} className={`cartesian-problem-node node-${index}`}>
          <span>{meta}</span>
          <strong>{label}</strong>
        </div>
      ))}
    </div>
  );
}

function DecisionPipelineVisual() {
  const inputs = ['실거래', '생활시설', '교통'];
  const outputs = ['지도', '비교', 'AI'];

  return (
    <div className="cartesian-pipeline-visual" aria-label="입력 데이터를 판단 단위와 서비스 출력으로 바꾸는 흐름">
      <div className="cartesian-pipeline-row">
        {inputs.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="cartesian-pipeline-core">
        <small>Decision unit</small>
        <strong>동네 후보 압축</strong>
      </div>
      <div className="cartesian-pipeline-row">
        {outputs.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function RecommendationFlowVisual() {
  const steps = [
    ['01', '내 조건 입력', '예산 · 면적 · 시설 · 학교', '내가 감당할 수 있는 생활 조건을 먼저 정리합니다.'],
    ['02', '데이터로 계산', '환산월세 · 시설 충족 · 통학시간', '월세 조건과 생활 인프라, 학교 접근성을 같은 기준으로 맞춥니다.'],
    ['03', '후보 동네 추천', '예산 우선 / 교통 우선', '법정동과 행정동 후보를 우선순위에 맞게 정렬합니다.'],
    ['04', '검증 후 행동', '대시보드 · 실제 매물 · 체크리스트', '동네를 확인한 뒤 실제 매물 보기와 계약 전 점검으로 이어집니다.'],
  ];

  return (
    <div className="cartesian-recommendation-flow" aria-label="조건 입력 기반 동네 추천 흐름">
      {steps.map(([code, title, meta, body]) => (
        <article key={code}>
          <span>{code}</span>
          <strong>{title}</strong>
          <em>{meta}</em>
          <p>{body}</p>
        </article>
      ))}
    </div>
  );
}

function ArchitectureDiagram({
  slot,
  className = '',
}: {
  slot: DiagramSlot;
  className?: string;
}) {
  const layers = [
    {
      code: '01',
      title: '사용자 화면',
      meta: 'React · Vite · Leaflet',
      items: ['조건 입력과 추천 결과', '지도 기반 탐색', '동네 대시보드와 부동산 도우미'],
    },
    {
      code: '02',
      title: '서비스 API',
      meta: 'Django REST · GeoDjango',
      items: ['추천 API', '지도/히트맵 API', '대시보드·매물 분석·AI API'],
    },
    {
      code: '03',
      title: '데이터와 캐시',
      meta: 'PostgreSQL/PostGIS · Redis',
      items: ['동네 점수 캐시', '추천 임대료 캐시', '대시보드 JSON 캐시'],
    },
  ];

  return (
    <figure className={`cartesian-repo-diagram cartesian-architecture-diagram ${className}`}>
      <RepoDiagramHeader slot={slot} />
      <div className="cartesian-repo-flow three">
        {layers.map((layer) => (
          <article key={layer.code}>
            <span>{layer.code}</span>
            <strong>{layer.title}</strong>
            <small>{layer.meta}</small>
            <ul>
              {layer.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="cartesian-diagram-note">
        구현 근거: /api/recommend/regions, /api/heatmap/*, /api/dashboard/cache, recommend_rent_region_cache
      </p>
    </figure>
  );
}

function SpatialMappingDiagram({
  slot,
  className = '',
}: {
  slot: DiagramSlot;
  className?: string;
}) {
  const groups = [
    {
      code: '01',
      title: '원천 데이터',
      meta: '실거래 · 경계 · 시설',
      items: ['실거래는 법정동 기준', '서비스 탐색은 행정동/법정동 기준', '시설과 의료기관은 좌표 기준'],
    },
    {
      code: '02',
      title: '동네 단위로 정렬',
      meta: 'PostGIS spatial join',
      items: ['좌표가 어느 동에 속하는지 판정', '법정동과 행정동 관계 연결', '시설·공원·의료를 동별 집계'],
    },
    {
      code: '03',
      title: '서비스에서 재사용',
      meta: '추천 · 지도 · 대시보드',
      items: ['히트맵 점수', '조건 기반 추천', '동네 대시보드와 후보 비교'],
    },
  ];

  return (
    <figure className={`cartesian-repo-diagram cartesian-spatial-diagram ${className}`}>
      <RepoDiagramHeader slot={slot} />
      <div className="cartesian-repo-flow three">
        {groups.map((group) => (
          <article key={group.code}>
            <span>{group.code}</span>
            <strong>{group.title}</strong>
            <small>{group.meta}</small>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="cartesian-diagram-note">
        구현 근거: boundary__contains(point), rent_deal_ldong_adong_map, region_amenity_category_cache
      </p>
    </figure>
  );
}

function DataPipelineDiagram({
  slot,
  className = '',
}: {
  slot: DiagramSlot;
  className?: string;
}) {
  const steps = [
    ['01', '공공데이터 적재', '전월세, 시설, 의료, 교통, 안전 원천 데이터를 모읍니다.'],
    ['02', '업데이트 실행', '업데이트 스크립트가 원천 테이블과 운영 데이터를 갱신합니다.'],
    ['03', '공간 결합/점수 계산', '동네별 시설, 시세, 교통, 안전 지표를 다시 계산합니다.'],
    ['04', '운영 캐시 생성', '지도, 추천, 대시보드에서 바로 읽을 캐시를 만듭니다.'],
    ['05', '서비스 API 응답', '화면은 캐시된 점수와 요약을 짧게 조회해 보여줍니다.'],
  ];

  return (
    <figure className={`cartesian-repo-diagram cartesian-data-pipeline-diagram ${className}`}>
      <RepoDiagramHeader slot={slot} />
      <div className="cartesian-repo-steps">
        {steps.map(([code, title, body]) => (
          <article key={code}>
            <span>{code}</span>
            <strong>{title}</strong>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <p className="cartesian-diagram-note">
        구현 근거: update_all.py, current_adong/current_ldong, dashboard_*_cache, recommend_rent_region_cache
      </p>
    </figure>
  );
}

function RepoDiagramHeader({ slot }: { slot: DiagramSlot }) {
  return (
    <header className="cartesian-repo-diagram-header">
      <span>{slot.label}</span>
      <h2>{slot.title}</h2>
      <p>{slot.guide}</p>
    </header>
  );
}

function DifferenceMatrix({ rows }: { rows: SlideRow[] }) {
  return (
    <div className="cartesian-difference-matrix" aria-label="유사 서비스와 슬기로운 자취생활의 포지셔닝 비교">
      {rows.map((row) => (
        <article key={row.code}>
          <span>{row.code}</span>
          <h2>{row.title}</h2>
          <p>{row.body}</p>
          {row.tag ? <em>{row.tag}</em> : null}
        </article>
      ))}
    </div>
  );
}

function NumberedList({ bullets, compact = false }: { bullets: string[]; compact?: boolean }) {
  return (
    <div className={`cartesian-numbered-list ${compact ? 'compact' : ''}`}>
      {bullets.map((bullet, index) => (
        <div key={bullet}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <p>{bullet}</p>
        </div>
      ))}
    </div>
  );
}

function StatCell({
  number,
  label,
  index = 0,
}: {
  number: string;
  label: string;
  index?: number;
}) {
  return (
    <div className="cartesian-stat-cell">
      <strong>{number}</strong>
      <span>{label}</span>
      <i style={{ width: `${42 + index * 18}%` }} />
    </div>
  );
}

function ImagePanel({
  image,
  className = '',
  fit = 'cover',
}: {
  image: SlideImage;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  const imageStyle =
    image.scroll === true
      ? ({
          '--cartesian-scroll-frame-height': image.scrollFrameHeight ?? '610px',
          animationDuration: `${image.scrollDuration ?? 24}s`,
        } as CSSProperties)
      : undefined;

  return (
    <figure className={`cartesian-image-panel ${className}`}>
      <div className={image.scroll ? 'cartesian-scroll-window' : 'cartesian-image-window'}>
        <img
          src={image.src}
          alt={image.alt}
          className={fit === 'contain' ? 'cartesian-img-contain' : undefined}
          style={imageStyle}
        />
      </div>
      <figcaption>{image.label}</figcaption>
    </figure>
  );
}

function DiagramSlotPanel({ slot, className = '' }: { slot: DiagramSlot; className?: string }) {
  if (slot.variant === 'architecture') {
    return <ArchitectureDiagram slot={slot} className={className} />;
  }

  if (slot.variant === 'spatial-mapping') {
    return <SpatialMappingDiagram slot={slot} className={className} />;
  }

  if (slot.variant === 'data-pipeline') {
    return <DataPipelineDiagram slot={slot} className={className} />;
  }

  return (
    <figure className={`cartesian-diagram-slot ${className}`}>
      <span>{slot.label}</span>
      <h2>{slot.title}</h2>
      <p>{slot.guide}</p>
      {slot.items ? (
        <div>
          {slot.items.map((item) => (
            <em key={item}>{item}</em>
          ))}
        </div>
      ) : null}
    </figure>
  );
}

function CartesianStyles() {
  return (
    <style>
      {`
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css');

.cartesian-deck-root {
  --cartesian-bg: #F2FBF6;
  --cartesian-bg-2: #E3F7EC;
  --cartesian-ink: #18211E;
  --cartesian-text: #42514C;
  --cartesian-muted: #71847B;
  --cartesian-accent: #047857;
  --cartesian-highlight: #10B981;
  --cartesian-teal: #0D9488;
  --cartesian-blue: #1863DC;
  --cartesian-coral: #FF7759;
  --cartesian-line: #AED8C7;
  --cartesian-paper: rgba(255, 255, 255, 0.52);
  --cartesian-panel: rgba(236, 253, 245, 0.92);
  --cartesian-panel-soft: rgba(237, 252, 233, 0.72);
  --cartesian-serif: "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif;
  --cartesian-sans: "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif;
  --stage-bg: #06251F;
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--stage-bg);
  color: var(--cartesian-ink);
}

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--stage-bg, #06251F);
}

.cartesian-deck-viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--stage-bg);
}

.cartesian-deck-stage {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  transform-origin: 0 0;
  background:
    linear-gradient(180deg, rgba(240, 251, 245, 0.98) 0%, rgba(236, 253, 245, 0.92) 100%),
    var(--cartesian-bg);
}

.cartesian-slide {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.28), rgba(237, 252, 233, 0.38)),
    var(--cartesian-bg);
  color: var(--cartesian-ink);
  font-family: var(--cartesian-sans);
  transition: opacity 260ms ease;
}

.cartesian-slide.active,
.cartesian-slide.visible {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}

.cartesian-slide *,
.cartesian-slide *::before,
.cartesian-slide *::after {
  box-sizing: border-box;
}

.cartesian-slide h1,
.cartesian-slide h2,
.cartesian-slide p,
.cartesian-slide figure {
  margin: 0;
  word-break: keep-all;
}

.cartesian-progress {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1200;
  height: 3px;
  background: var(--cartesian-highlight);
  transition: width 220ms ease;
}

.cartesian-controls {
  position: fixed;
  left: 24px;
  bottom: 22px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
}

.cartesian-controls button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--cartesian-line);
  border-radius: 0;
  background: rgba(236, 253, 245, 0.88);
  color: var(--cartesian-ink);
  font-family: var(--cartesian-sans);
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0;
  cursor: pointer;
}

.cartesian-controls button:hover {
  background: var(--cartesian-ink);
  color: var(--cartesian-bg);
}

.cartesian-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.36;
}

.cartesian-topbar,
.cartesian-footer {
  position: absolute;
  right: 72px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--cartesian-accent);
  font-family: var(--cartesian-sans);
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-topbar {
  left: 72px;
  top: 56px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--cartesian-line);
}

.cartesian-footer {
  left: 210px;
  bottom: 50px;
  padding-top: 18px;
  border-top: 1px solid var(--cartesian-line);
}

.cartesian-video-cue {
  position: absolute;
  left: 210px;
  bottom: 96px;
  z-index: 14;
  display: grid;
  gap: 9px;
  width: 560px;
  padding: 16px 18px;
  border: 1px solid var(--cartesian-accent);
  background: rgba(236, 253, 245, 0.94);
}

.cartesian-video-cue span {
  color: var(--cartesian-accent);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-video-cue strong {
  color: var(--cartesian-ink);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.36;
  letter-spacing: 0;
}

.cartesian-nav-dots {
  position: absolute;
  right: 38px;
  top: 50%;
  z-index: 12;
  display: grid;
  gap: 13px;
  transform: translateY(-50%);
}

.cartesian-nav-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cartesian-line);
}

.cartesian-nav-dots span.active {
  background: var(--cartesian-highlight);
  transform: scale(1.3);
}

.cartesian-axis-v,
.cartesian-axis-h {
  position: absolute;
  z-index: 0;
  display: block;
  background: var(--cartesian-line);
  opacity: 0.42;
}

.cartesian-axis-v {
  left: 154px;
  top: 0;
  width: 1px;
  height: 1080px;
}

.cartesian-axis-h {
  left: 0;
  top: 924px;
  width: 1920px;
  height: 1px;
}

.cartesian-geo-ring {
  position: absolute;
  display: block;
  border: 1px solid var(--cartesian-line);
  border-radius: 50%;
  pointer-events: none;
}

.cartesian-geo-ring::before {
  position: absolute;
  inset: 16%;
  border: 1px dashed var(--cartesian-line);
  border-radius: 50%;
  content: "";
}

.cartesian-geo-ring.centered {
  right: 190px;
  top: 154px;
  width: 620px;
  height: 620px;
  opacity: 0.3;
}

.cartesian-geo-ring.soft {
  left: 50%;
  top: 50%;
  width: 780px;
  height: 780px;
  opacity: 0.16;
  transform: translate(-50%, -50%);
}

.cartesian-content {
  position: absolute;
  inset: 134px 132px 154px;
  z-index: 2;
}

.cartesian-title {
  max-width: 1040px;
  padding-bottom: 18px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 88px;
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: 0;
}

.cartesian-lead {
  max-width: 900px;
  color: var(--cartesian-text);
  font-family: var(--cartesian-sans);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.58;
  letter-spacing: 0;
}

.cartesian-label {
  display: block;
  color: var(--cartesian-accent);
  font-family: var(--cartesian-sans);
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-heading-block {
  display: grid;
  gap: 28px;
}

.cartesian-problem-visual {
  position: relative;
  height: 190px;
  margin-top: 6px;
  border: 1px solid var(--cartesian-line);
  background:
    linear-gradient(var(--cartesian-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--cartesian-line) 1px, transparent 1px);
  background-size: 92px 92px;
  background-position: -1px -1px;
}

.cartesian-problem-visual::before,
.cartesian-problem-visual::after {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1px;
  height: 154px;
  background: var(--cartesian-line);
  content: "";
  transform: translate(-50%, -50%) rotate(52deg);
}

.cartesian-problem-visual::after {
  transform: translate(-50%, -50%) rotate(-52deg);
}

.cartesian-problem-center,
.cartesian-problem-node {
  position: absolute;
  z-index: 2;
  display: grid;
  align-content: center;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-panel);
}

.cartesian-problem-center {
  left: 50%;
  top: 50%;
  width: 168px;
  height: 96px;
  justify-items: center;
  transform: translate(-50%, -50%);
}

.cartesian-problem-center span,
.cartesian-problem-node span,
.cartesian-pipeline-core small {
  color: var(--cartesian-accent);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-problem-center strong {
  margin-top: 12px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: 0;
}

.cartesian-problem-node {
  width: 128px;
  height: 64px;
  padding: 12px 16px;
}

.cartesian-problem-node strong {
  margin-top: 9px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 24px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-problem-node.node-0 {
  left: 38px;
  top: 22px;
}

.cartesian-problem-node.node-1 {
  right: 38px;
  top: 22px;
}

.cartesian-problem-node.node-2 {
  left: 38px;
  bottom: 22px;
}

.cartesian-problem-node.node-3 {
  right: 38px;
  bottom: 22px;
}

.cartesian-image-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-bg-2);
}

.cartesian-image-window,
.cartesian-scroll-window {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.cartesian-image-panel img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cartesian-image-panel img.cartesian-img-contain {
  object-fit: contain;
}

.cartesian-scroll-window img {
  height: auto;
  max-height: none;
  object-fit: initial;
  animation-name: cartesianAutoScroll;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

.cartesian-image-panel figcaption {
  position: absolute;
  left: 22px;
  bottom: 20px;
  padding: 9px 12px;
  border: 1px solid var(--cartesian-line);
  background: rgba(236, 253, 245, 0.92);
  color: var(--cartesian-accent);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-diagram-slot {
  display: grid;
  align-content: center;
  gap: 28px;
  padding: 58px;
  border: 1px dashed var(--cartesian-accent);
  background:
    linear-gradient(var(--cartesian-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--cartesian-line) 1px, transparent 1px),
    rgba(236, 253, 245, 0.54);
  background-size: 72px 72px;
}

.cartesian-diagram-slot > span {
  color: var(--cartesian-accent);
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-diagram-slot h2 {
  max-width: 760px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 54px;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: 0;
}

.cartesian-diagram-slot p {
  max-width: 760px;
  color: var(--cartesian-text);
  font-size: 24px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0;
}

.cartesian-diagram-slot div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.cartesian-diagram-slot em {
  display: block;
  padding: 10px 13px;
  border: 1px solid var(--cartesian-line);
  background: rgba(255, 255, 255, 0.58);
  color: var(--cartesian-muted);
  font-size: 15px;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-repo-diagram {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 22px;
  padding: 30px;
  border: 1px solid var(--cartesian-line);
  background:
    linear-gradient(var(--cartesian-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--cartesian-line) 1px, transparent 1px),
    var(--cartesian-paper);
  background-size: 72px 72px;
  background-position: -1px -1px;
}

.cartesian-repo-diagram-header {
  display: grid;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--cartesian-line);
}

.cartesian-repo-diagram-header span {
  color: var(--cartesian-accent);
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-repo-diagram-header h2 {
  margin: 0;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 42px;
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: 0;
}

.cartesian-repo-diagram-header p {
  max-width: 760px;
  margin: 0;
  color: var(--cartesian-text);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.42;
  letter-spacing: 0;
}

.cartesian-repo-flow {
  display: grid;
  align-items: stretch;
  gap: 22px;
}

.cartesian-repo-flow.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cartesian-repo-flow article {
  position: relative;
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 304px;
  padding: 22px 20px;
  border: 1px solid var(--cartesian-line);
  background: rgba(255, 255, 255, 0.82);
}

.cartesian-repo-flow article:not(:last-child)::after {
  position: absolute;
  right: -20px;
  top: 50%;
  z-index: 2;
  color: var(--cartesian-accent);
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  content: "→";
  transform: translateY(-50%);
}

.cartesian-repo-flow article > span,
.cartesian-repo-steps article > span {
  color: var(--cartesian-teal);
  font-family: var(--cartesian-serif);
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-repo-flow strong,
.cartesian-repo-steps strong {
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 28px;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: 0;
}

.cartesian-repo-flow small {
  display: block;
  color: var(--cartesian-accent);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0;
}

.cartesian-repo-flow ul {
  display: grid;
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.cartesian-repo-flow li {
  display: block;
  padding: 9px 10px;
  border: 1px solid rgba(4, 120, 87, 0.14);
  background: rgba(221, 246, 233, 0.34);
  color: var(--cartesian-text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
}

.cartesian-repo-steps {
  display: grid;
  gap: 12px;
}

.cartesian-repo-steps article {
  display: grid;
  grid-template-columns: 56px 190px 1fr;
  align-items: center;
  gap: 18px;
  min-height: 68px;
  padding: 14px 16px;
  border: 1px solid var(--cartesian-line);
  background: rgba(255, 255, 255, 0.82);
}

.cartesian-repo-steps p {
  margin: 0;
  color: var(--cartesian-text);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: 0;
}

.cartesian-diagram-note {
  margin: 0;
  padding: 15px 16px;
  border-top: 1px solid var(--cartesian-line);
  color: var(--cartesian-text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.36;
  letter-spacing: 0;
}

.cartesian-numbered-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 36px;
}

.cartesian-numbered-list.compact {
  grid-template-columns: 1fr;
  gap: 22px;
}

.cartesian-numbered-list > div {
  min-height: 162px;
  padding: 28px 30px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-numbered-list.compact > div {
  min-height: 0;
  padding: 22px 0 24px;
  border-width: 0 0 1px;
  background: transparent;
}

.cartesian-numbered-list span,
.cartesian-article-row > span,
.cartesian-score-card > span,
.cartesian-timeline span,
.cartesian-closing-list span,
.cartesian-ip-row > span {
  display: block;
  color: var(--cartesian-accent);
  font-family: var(--cartesian-serif);
  font-size: 32px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-numbered-list p {
  margin-top: 26px;
  color: var(--cartesian-text);
  font-size: 24px;
  line-height: 1.48;
  letter-spacing: 0;
}

.cartesian-article-row {
  display: grid;
  grid-template-columns: 86px 320px 1fr;
  column-gap: 36px;
  align-items: start;
  padding: 30px 0 32px;
  border-bottom: 1px solid var(--cartesian-line);
}

.cartesian-article-row h2,
.cartesian-score-card h2,
.cartesian-timeline h2 {
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 35px;
  font-weight: 400;
  line-height: 1.14;
  letter-spacing: 0;
}

.cartesian-article-row p,
.cartesian-score-card p,
.cartesian-timeline p,
.cartesian-ip-row p,
.cartesian-closing-list p {
  color: var(--cartesian-text);
  font-size: 23px;
  font-weight: 400;
  line-height: 1.52;
  letter-spacing: 0;
}

.cartesian-article-row em {
  margin-top: 12px;
  color: var(--cartesian-accent);
  font-size: 15px;
  font-style: normal;
  text-transform: uppercase;
}

.cartesian-stat-cell {
  position: relative;
  min-height: 154px;
  padding: 28px 30px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-stat-cell strong {
  display: block;
  padding-bottom: 10px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 52px;
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: 0;
}

.cartesian-stat-cell span {
  display: block;
  margin-top: 20px;
  color: var(--cartesian-text);
  font-size: 21px;
  line-height: 1.35;
  letter-spacing: 0;
}

.cartesian-stat-cell i {
  position: absolute;
  left: 30px;
  bottom: 24px;
  display: block;
  height: 1px;
  background: var(--cartesian-highlight);
}

.cartesian-cover-layout {
  inset: 136px 96px 154px 132px;
}

.cartesian-cover-copy {
  position: absolute;
  left: 0;
  top: 100px;
  width: 760px;
  display: grid;
  gap: 34px;
}

.cartesian-cover-title {
  max-width: 740px;
  font-size: 126px;
  line-height: 1.04;
}

.cartesian-cover-image {
  position: absolute;
  right: 44px;
  top: 92px;
  width: 760px;
  height: 430px;
}

.cartesian-cover-flow {
  position: absolute;
  right: 44px;
  top: 92px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 760px;
  height: 430px;
  border: 1px solid var(--cartesian-line);
  background:
    linear-gradient(var(--cartesian-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--cartesian-line) 1px, transparent 1px),
    var(--cartesian-panel-soft);
  background-size: 76px 76px;
}

.cartesian-cover-flow article {
  position: relative;
  display: grid;
  align-content: end;
  gap: 24px;
  padding: 42px 36px;
  border-right: 1px solid var(--cartesian-line);
}

.cartesian-cover-flow article:last-child {
  border-right: 0;
}

.cartesian-cover-flow article::before {
  position: absolute;
  left: 36px;
  top: 42px;
  width: 78px;
  height: 78px;
  border: 1px solid var(--cartesian-highlight);
  border-radius: 50%;
  content: "";
}

.cartesian-cover-flow span,
.cartesian-toc-item span,
.cartesian-concept-panel span {
  display: block;
  color: var(--cartesian-accent);
  font-family: var(--cartesian-serif);
  font-size: 31px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-cover-flow strong {
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 52px;
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: 0;
}

.cartesian-cover-flow p {
  color: var(--cartesian-text);
  font-size: 22px;
  line-height: 1.42;
  letter-spacing: 0;
}

.cartesian-cover-stats {
  position: absolute;
  left: 0;
  right: 44px;
  bottom: 46px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 34px;
}

.cartesian-qr-layout {
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: 92px;
  align-items: center;
}

.cartesian-qr-copy {
  display: grid;
  gap: 30px;
}

.cartesian-qr-copy .cartesian-title {
  max-width: 940px;
  font-size: 86px;
  line-height: 1.08;
}

.cartesian-qr-copy .cartesian-lead {
  max-width: 820px;
}

.cartesian-qr-list {
  display: grid;
  gap: 18px;
  max-width: 940px;
  margin-top: 16px;
  border-top: 1px solid var(--cartesian-ink);
}

.cartesian-qr-list article {
  display: grid;
  grid-template-columns: 82px 210px 1fr;
  gap: 28px;
  align-items: start;
  padding: 22px 0;
  border-bottom: 1px solid var(--cartesian-line);
}

.cartesian-qr-list span {
  color: var(--cartesian-teal);
  font-family: var(--cartesian-serif);
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-qr-list h2 {
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.14;
  letter-spacing: 0;
}

.cartesian-qr-list p {
  color: var(--cartesian-text);
  font-size: 21px;
  font-weight: 500;
  line-height: 1.34;
  letter-spacing: 0;
  word-break: break-all;
}

.cartesian-qr-card {
  display: grid;
  justify-items: center;
  gap: 24px;
  margin: 0;
  padding: 42px;
  border: 1px solid var(--cartesian-line);
  background: rgba(255, 255, 255, 0.62);
}

.cartesian-qr-card img {
  display: block;
  width: 390px;
  height: 390px;
  border: 1px solid var(--cartesian-line);
  background: #fff;
}

.cartesian-qr-card figcaption {
  color: var(--cartesian-accent);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
}

.cartesian-toc-layout {
  display: grid;
  grid-template-columns: 560px 1fr;
  gap: 92px;
  align-items: center;
}

.cartesian-toc-layout .cartesian-title {
  font-size: 94px;
}

.cartesian-toc-list {
  border-top: 1px solid var(--cartesian-ink);
}

.cartesian-toc-item {
  display: grid;
  grid-template-columns: 96px 260px 1fr;
  gap: 34px;
  align-items: start;
  padding: 32px 0;
  border-bottom: 1px solid var(--cartesian-line);
}

.cartesian-toc-item h2 {
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 34px;
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: 0;
}

.cartesian-toc-item p {
  color: var(--cartesian-text);
  font-size: 22px;
  line-height: 1.46;
  letter-spacing: 0;
}

.cartesian-problem-layout,
.cartesian-difference-layout,
.cartesian-ip-layout,
.cartesian-preference-layout {
  display: grid;
  grid-template-columns: 570px 1fr;
  gap: 92px;
  align-items: start;
}

.cartesian-problem-layout .cartesian-row-list {
  padding-top: 16px;
}

.cartesian-thesis-layout {
  display: grid;
  grid-template-columns: 840px 1fr;
  gap: 104px;
  align-items: center;
}

.cartesian-thesis-statement {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 30px;
}

.cartesian-thesis-layout .cartesian-numbered-list {
  position: relative;
  z-index: 2;
  grid-template-columns: 1fr;
  gap: 18px;
}

.cartesian-thesis-right {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 24px;
}

.cartesian-thesis-layout .cartesian-numbered-list > div {
  min-height: 112px;
  padding: 18px 22px;
}

.cartesian-thesis-layout .cartesian-numbered-list p {
  margin-top: 14px;
  font-size: 20px;
  line-height: 1.38;
}

.cartesian-pipeline-visual {
  display: grid;
  gap: 16px;
  padding: 22px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-pipeline-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.cartesian-pipeline-row span {
  display: grid;
  height: 58px;
  place-items: center;
  border: 1px solid var(--cartesian-line);
  color: var(--cartesian-text);
  font-size: 19px;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-pipeline-core {
  display: grid;
  height: 92px;
  place-items: center;
  border-top: 1px solid var(--cartesian-ink);
  border-bottom: 1px solid var(--cartesian-ink);
  background: rgba(221, 246, 233, 0.42);
}

.cartesian-pipeline-core strong {
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 36px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-two-column,
.cartesian-screen-layout,
.cartesian-dashboard-layout {
  display: grid;
  grid-template-columns: 590px 1fr;
  gap: 78px;
  align-items: center;
}

.cartesian-copy-column {
  display: grid;
  gap: 30px;
}

.cartesian-copy-column .cartesian-title {
  font-size: 82px;
}

.cartesian-copy-column .cartesian-lead {
  max-width: 560px;
}

.cartesian-diagram-panel {
  height: 646px;
}

.cartesian-ai .cartesian-copy-column,
.cartesian-operation .cartesian-copy-column {
  gap: 20px;
}

.cartesian-ai .cartesian-copy-column .cartesian-title,
.cartesian-operation .cartesian-copy-column .cartesian-title {
  max-width: 540px;
  padding-bottom: 10px;
  font-size: 70px;
  line-height: 1.08;
}

.cartesian-operation .cartesian-copy-column .cartesian-title {
  font-size: 62px;
}

.cartesian-ai .cartesian-copy-column .cartesian-lead,
.cartesian-operation .cartesian-copy-column .cartesian-lead {
  max-width: 520px;
  font-size: 24px;
  line-height: 1.46;
}

.cartesian-operation .cartesian-copy-column .cartesian-lead {
  font-size: 22px;
  line-height: 1.38;
}

.cartesian-ai .cartesian-numbered-list.compact,
.cartesian-operation .cartesian-numbered-list.compact {
  gap: 10px;
}

.cartesian-ai .cartesian-numbered-list.compact > div,
.cartesian-operation .cartesian-numbered-list.compact > div {
  padding: 14px 0 15px;
}

.cartesian-operation .cartesian-numbered-list.compact > div {
  padding: 10px 0 11px;
}

.cartesian-ai .cartesian-numbered-list.compact p,
.cartesian-operation .cartesian-numbered-list.compact p {
  margin-top: 14px;
  font-size: 20px;
  line-height: 1.4;
}

.cartesian-operation .cartesian-numbered-list.compact p {
  margin-top: 10px;
  font-size: 18px;
  line-height: 1.32;
}

.cartesian-mini-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 18px;
}

.cartesian-mini-stats .cartesian-stat-cell {
  min-height: 126px;
  padding: 22px;
}

.cartesian-mini-stats .cartesian-stat-cell strong {
  font-size: 42px;
}

.cartesian-mini-stats .cartesian-stat-cell span {
  font-size: 17px;
  margin-top: 14px;
}

.cartesian-formula-layout {
  display: grid;
  grid-template-columns: 650px 1fr;
  grid-template-rows: auto 176px 1fr;
  column-gap: 86px;
  row-gap: 28px;
  align-items: start;
}

.cartesian-formula-header {
  display: grid;
  grid-column: 1;
  grid-row: 1;
  gap: 20px;
}

.cartesian-formula-header .cartesian-title {
  padding-bottom: 6px;
  font-size: 68px;
  line-height: 1.1;
}

.cartesian-formula-box {
  display: grid;
  grid-column: 1;
  grid-row: 2;
  align-content: center;
  justify-items: center;
  gap: 24px;
  border-top: 1px solid var(--cartesian-ink);
  border-bottom: 1px solid var(--cartesian-ink);
}

.cartesian-formula-layout > .cartesian-numbered-list {
  grid-column: 2;
  grid-row: 1 / span 2;
  grid-template-columns: 1fr;
  gap: 18px;
  align-self: center;
}

.cartesian-formula-layout > .cartesian-numbered-list > div {
  min-height: 122px;
  padding: 20px 24px;
}

.cartesian-formula-layout > .cartesian-numbered-list p {
  margin-top: 14px;
  font-size: 20px;
  line-height: 1.36;
}

.cartesian-formula-box span {
  color: var(--cartesian-accent);
  font-size: 16px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-formula-box strong {
  padding-bottom: 14px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 58px;
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: 0;
}

.cartesian-recommendation-flow {
  display: grid;
  grid-column: 1 / -1;
  grid-row: 3;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  align-self: stretch;
}

.cartesian-recommendation-flow article {
  position: relative;
  min-height: 180px;
  padding: 24px 24px 22px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-recommendation-flow article:not(:last-child)::after {
  position: absolute;
  right: -17px;
  top: 50%;
  z-index: 2;
  color: var(--cartesian-accent);
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  content: "→";
  transform: translateY(-50%);
}

.cartesian-recommendation-flow span {
  display: block;
  color: var(--cartesian-teal);
  font-family: var(--cartesian-serif);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-recommendation-flow strong {
  display: block;
  margin-top: 18px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 0;
}

.cartesian-recommendation-flow em {
  display: block;
  margin-top: 12px;
  color: var(--cartesian-accent);
  font-size: 13px;
  font-style: normal;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0;
}

.cartesian-recommendation-flow p {
  margin-top: 12px;
  color: var(--cartesian-text);
  font-size: 17px;
  font-weight: 500;
  line-height: 1.38;
  letter-spacing: 0;
}

.cartesian-mapping-layout .cartesian-layer-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.cartesian-layer-list span {
  display: grid;
  height: 92px;
  place-items: center;
  border: 1px solid var(--cartesian-line);
  color: var(--cartesian-text);
  font-size: 22px;
}

.cartesian-score-layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 36px;
}

.cartesian-score-heading {
  display: grid;
  max-width: 1200px;
  gap: 24px;
}

.cartesian-score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.cartesian-score-card {
  min-height: 248px;
  padding: 26px 28px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-score-card h2 {
  margin-top: 24px;
}

.cartesian-score-card p {
  margin-top: 17px;
}

.cartesian-score-card small {
  display: block;
  margin-top: 20px;
  color: var(--cartesian-accent);
  font-size: 15px;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-equation {
  padding: 18px 28px;
  border-top: 1px solid var(--cartesian-ink);
  border-bottom: 1px solid var(--cartesian-ink);
  color: var(--cartesian-ink);
  background: rgba(236, 253, 245, 0.56);
  font-family: var(--cartesian-serif);
  font-size: 32px;
  line-height: 1.2;
  letter-spacing: 0;
  text-align: center;
}

.cartesian-screen-layout,
.cartesian-dashboard-layout {
  grid-template-columns: 520px 1fr;
  gap: 70px;
}

.cartesian-screen-layout .cartesian-copy-column,
.cartesian-dashboard-layout .cartesian-copy-column {
  gap: 22px;
}

.cartesian-screen-layout .cartesian-copy-column .cartesian-title,
.cartesian-dashboard-layout .cartesian-copy-column .cartesian-title {
  padding-bottom: 8px;
  font-size: 66px;
  line-height: 1.08;
}

.cartesian-screen-layout .cartesian-copy-column .cartesian-lead,
.cartesian-dashboard-layout .cartesian-copy-column .cartesian-lead {
  max-width: 510px;
  font-size: 24px;
  line-height: 1.42;
}

.cartesian-screen-layout .cartesian-numbered-list.compact,
.cartesian-dashboard-layout .cartesian-numbered-list.compact {
  gap: 8px;
}

.cartesian-screen-layout .cartesian-numbered-list.compact > div,
.cartesian-dashboard-layout .cartesian-numbered-list.compact > div {
  padding: 14px 0 15px;
}

.cartesian-screen-layout .cartesian-numbered-list.compact p,
.cartesian-dashboard-layout .cartesian-numbered-list.compact p {
  margin-top: 12px;
  font-size: 19px;
  line-height: 1.34;
}

.cartesian-screen-panel {
  height: 646px;
}

.cartesian-dashboard-panel {
  height: var(--cartesian-scroll-frame-height, 610px);
}

.cartesian-concept-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
  height: 646px;
}

.cartesian-concept-panel article {
  display: grid;
  align-content: start;
  min-height: 0;
  padding: 32px 34px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-concept-panel h2 {
  margin-top: 34px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 35px;
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: 0;
}

.cartesian-concept-panel p {
  margin-top: 20px;
  color: var(--cartesian-text);
  font-size: 21px;
  line-height: 1.46;
  letter-spacing: 0;
}

.cartesian-concept-panel em {
  display: block;
  margin-top: 20px;
  color: var(--cartesian-accent);
  font-size: 14px;
  font-style: normal;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-preference-grid {
  display: grid;
  grid-template-columns: 1fr 390px;
  gap: 54px;
}

.cartesian-preference-grid .cartesian-article-row {
  grid-template-columns: 76px 220px 1fr;
  column-gap: 28px;
}

.cartesian-preference-grid .cartesian-article-row h2 {
  font-size: 32px;
}

.cartesian-preference-grid .cartesian-article-row p {
  font-size: 21px;
}

.cartesian-weight-panel {
  display: grid;
  align-content: center;
  gap: 42px;
  padding: 36px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-weight-panel > div {
  display: grid;
  grid-template-columns: 1fr 74px;
  gap: 18px;
  align-items: center;
}

.cartesian-weight-panel span {
  color: var(--cartesian-text);
  font-size: 22px;
}

.cartesian-weight-panel strong {
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 32px;
  font-weight: 400;
}

.cartesian-weight-panel i {
  grid-column: 1 / -1;
  display: block;
  height: 1px;
  background: var(--cartesian-line);
}

.cartesian-weight-panel b {
  display: block;
  height: 1px;
  background: var(--cartesian-ink);
}

.cartesian-demo-layout {
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 28px;
  align-content: start;
}

.cartesian-demo-layout .cartesian-lead {
  margin-bottom: 62px;
}

.cartesian-timeline {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 44px;
}

.cartesian-timeline::before {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: var(--cartesian-line);
  content: "";
}

.cartesian-timeline > div {
  padding-top: 44px;
}

.cartesian-timeline h2 {
  margin-top: 32px;
}

.cartesian-timeline p {
  margin-top: 22px;
  max-width: 310px;
}

.cartesian-difference-layout .cartesian-article-row {
  grid-template-columns: 84px 300px 1fr;
}

.cartesian-difference-layout .cartesian-heading-block {
  gap: 22px;
}

.cartesian-difference-layout .cartesian-title {
  padding-bottom: 8px;
  font-size: 76px;
  line-height: 1.08;
}

.cartesian-difference-layout .cartesian-lead {
  font-size: 24px;
  line-height: 1.42;
}

.cartesian-position-summary {
  margin-top: 6px;
  padding: 17px 22px;
  border-top: 1px solid var(--cartesian-ink);
  border-bottom: 1px solid var(--cartesian-ink);
  background: rgba(236, 253, 245, 0.48);
}

.cartesian-position-summary span {
  display: block;
  color: var(--cartesian-accent);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-position-summary strong {
  display: block;
  margin-top: 12px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 26px;
  font-weight: 400;
  line-height: 1.28;
  letter-spacing: 0;
}

.cartesian-difference-matrix {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-self: stretch;
}

.cartesian-difference-matrix article {
  min-height: 236px;
  padding: 24px 28px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-difference-matrix article:last-child {
  border-color: var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-difference-matrix span {
  display: block;
  color: var(--cartesian-accent);
  font-family: var(--cartesian-serif);
  font-size: 28px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-difference-matrix h2 {
  margin-top: 20px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 30px;
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: 0;
}

.cartesian-difference-matrix p {
  margin-top: 14px;
  color: var(--cartesian-text);
  font-size: 19px;
  line-height: 1.46;
  letter-spacing: 0;
}

.cartesian-difference-matrix em {
  display: block;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--cartesian-line);
  color: var(--cartesian-accent);
  font-size: 15px;
  font-style: normal;
  line-height: 1.42;
  letter-spacing: 0;
}

.cartesian-ip-layout {
  grid-template-columns: 520px 1fr;
  gap: 72px;
}

.cartesian-ip-layout .cartesian-title {
  font-size: 74px;
}

.cartesian-ip-layout .cartesian-lead {
  font-size: 25px;
}

.cartesian-ip-table {
  border-top: 1px solid var(--cartesian-ink);
}

.cartesian-ip-head,
.cartesian-ip-row {
  display: grid;
  grid-template-columns: 80px 260px 1fr 270px;
  gap: 20px;
  align-items: start;
  border-bottom: 1px solid var(--cartesian-line);
}

.cartesian-ip-head {
  padding: 18px 0;
  color: var(--cartesian-accent);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-ip-row {
  min-height: 125px;
  padding: 26px 0;
}

.cartesian-ip-row strong {
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.18;
  letter-spacing: 0;
}

.cartesian-ip-row p {
  font-size: 20px;
  line-height: 1.48;
}

.cartesian-ip-row em {
  color: var(--cartesian-accent);
  font-size: 14px;
  font-style: normal;
  line-height: 1.35;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-closing-layout {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 34px;
  text-align: center;
}

.cartesian-closing-layout .cartesian-title {
  max-width: 1040px;
  font-size: 104px;
}

.cartesian-closing-layout .cartesian-lead {
  max-width: 1080px;
}

.cartesian-closing-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 34px;
  width: 100%;
  max-width: 1180px;
  margin-top: 34px;
  text-align: left;
}

.cartesian-closing-list > div {
  min-height: 138px;
  padding: 26px 28px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-closing-list p {
  margin-top: 22px;
}

.cartesian-slide {
  font-weight: 500;
  letter-spacing: 0;
}

.cartesian-title,
.cartesian-cover-title,
.cartesian-formula-box strong,
.cartesian-closing-layout .cartesian-title {
  font-weight: 800;
  letter-spacing: 0px;
}

.cartesian-article-row h2,
.cartesian-score-card h2,
.cartesian-timeline h2,
.cartesian-toc-item h2,
.cartesian-concept-panel h2,
.cartesian-difference-matrix h2,
.cartesian-ip-row strong,
.cartesian-cover-flow strong,
.cartesian-pipeline-core strong,
.cartesian-problem-center strong,
.cartesian-problem-node strong,
.cartesian-position-summary strong,
.cartesian-weight-panel strong,
.cartesian-stat-cell strong {
  font-weight: 700;
  letter-spacing: 0px;
}

.cartesian-lead,
.cartesian-numbered-list p,
.cartesian-article-row p,
.cartesian-score-card p,
.cartesian-timeline p,
.cartesian-ip-row p,
.cartesian-closing-list p,
.cartesian-toc-item p,
.cartesian-concept-panel p,
.cartesian-difference-matrix p,
.cartesian-cover-flow p,
.cartesian-stat-cell span,
.cartesian-weight-panel span {
  font-weight: 500;
  letter-spacing: 0px;
}

.cartesian-label,
.cartesian-topbar,
.cartesian-footer,
.cartesian-numbered-list span,
.cartesian-article-row > span,
.cartesian-score-card > span,
.cartesian-timeline span,
.cartesian-closing-list span,
.cartesian-ip-row > span,
.cartesian-cover-flow span,
.cartesian-toc-item span,
.cartesian-concept-panel span,
.cartesian-position-summary span,
.cartesian-difference-matrix span,
.cartesian-formula-box span,
.cartesian-difference-matrix em,
.cartesian-concept-panel em,
.cartesian-ip-row em,
.cartesian-score-card small {
  font-weight: 700;
  letter-spacing: 0px;
}

.cartesian-title,
.cartesian-cover-title,
.cartesian-formula-box strong,
.cartesian-closing-layout .cartesian-title,
.cartesian-article-row h2,
.cartesian-score-card h2,
.cartesian-timeline h2,
.cartesian-toc-item h2,
.cartesian-concept-panel h2,
.cartesian-difference-matrix h2,
.cartesian-ip-row strong,
.cartesian-cover-flow strong,
.cartesian-pipeline-core strong,
.cartesian-problem-center strong,
.cartesian-problem-node strong,
.cartesian-position-summary strong,
.cartesian-weight-panel strong,
.cartesian-stat-cell strong {
  color: var(--cartesian-ink);
}

.cartesian-lead,
.cartesian-numbered-list p,
.cartesian-article-row p,
.cartesian-score-card p,
.cartesian-timeline p,
.cartesian-ip-row p,
.cartesian-closing-list p,
.cartesian-toc-item p,
.cartesian-concept-panel p,
.cartesian-difference-matrix p,
.cartesian-cover-flow p,
.cartesian-stat-cell span,
.cartesian-weight-panel span {
  color: var(--cartesian-text);
}

.cartesian-label,
.cartesian-topbar,
.cartesian-footer,
.cartesian-formula-box span,
.cartesian-image-panel figcaption,
.cartesian-problem-center span,
.cartesian-problem-node span,
.cartesian-pipeline-core small {
  color: var(--cartesian-accent);
}

.cartesian-numbered-list span,
.cartesian-article-row > span,
.cartesian-score-card > span,
.cartesian-timeline span,
.cartesian-closing-list span,
.cartesian-ip-row > span,
.cartesian-cover-flow span,
.cartesian-toc-item span,
.cartesian-concept-panel span,
.cartesian-difference-matrix span {
  color: var(--cartesian-teal);
}

.cartesian-difference-matrix em,
.cartesian-concept-panel em,
.cartesian-ip-row em,
.cartesian-score-card small,
.cartesian-article-row em {
  color: var(--cartesian-muted);
}

@keyframes cartesianAutoScroll {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(calc(var(--cartesian-scroll-frame-height, 610px) - 100%));
  }
}

@media print {
  html,
  body {
    width: 1920px;
    height: auto;
    overflow: visible;
    background: #fff;
  }

  .cartesian-deck-viewport {
    position: static;
    overflow: visible;
    background: #fff;
  }

  .cartesian-deck-stage {
    position: static;
    width: auto;
    height: auto;
    transform: none !important;
  }

  .cartesian-slide {
    position: relative;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    width: 1920px;
    height: 1080px;
    break-after: page;
    page-break-after: always;
  }

  .cartesian-slide:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .cartesian-controls,
  .cartesian-progress {
    display: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.2s !important;
  }
}
      `}
    </style>
  );
}
