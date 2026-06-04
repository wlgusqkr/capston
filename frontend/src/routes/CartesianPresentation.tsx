import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import aiArchitectureImage from '@/assets/presentation/ai-architecture.svg';
import operationPipelineImage from '@/assets/presentation/operation-pipeline.svg';
import spatialMappingImage from '@/assets/presentation/spatial-mapping.svg';

type SlideKind =
  | 'cover'
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

interface Slide {
  eyebrow: string;
  title: string;
  lead: string;
  kind: SlideKind;
  rows?: SlideRow[];
  bullets?: string[];
  image?: SlideImage;
  note?: string;
  summary?: {
    label: string;
    text: string;
  };
}

const slides: Slide[] = [
  {
    eyebrow: 'TEAM 10 PRESENTATION',
    title: '자취맵',
    lead: '서울 자취 입문자가 매물을 보기 전에 예산, 이동, 생활 인프라, 안전 기준으로 후보 동네를 먼저 압축하는 공공데이터 기반 동네 탐색 서비스',
    kind: 'cover',
  },
  {
    eyebrow: 'AGENDA',
    title: '발표 목차',
    lead: '최종 보고서의 과제 목표, 주요 기능, 기술 구조, 기대성과 순서로 발표 흐름을 다시 구성했습니다.',
    kind: 'toc',
    rows: [
      {
        code: '01',
        title: '문제와 목표',
        body: '자취생이 왜 매물보다 동네 선택에서 먼저 막히는지 설명',
      },
      {
        code: '02',
        title: '서비스 흐름',
        body: '조건 추천과 지도 탐색으로 후보 동네를 압축하는 과정',
      },
      {
        code: '03',
        title: '핵심 기능',
        body: '대시보드, AI 대화, 부동산 도우미로 판단을 보조하는 방식',
      },
      {
        code: '04',
        title: '관련 서비스 비교',
        body: '직방, 다방, 네이버 부동산과 자취맵의 차이',
      },
      {
        code: '05',
        title: '기대성과와 확장',
        body: '탐색 부담 감소, 데이터 기반 확장성, 향후 고도화 방향',
      },
    ],
  },
  {
    eyebrow: 'PROBLEM',
    title: '자취는 동네 선택에서 먼저 막힙니다',
    lead: '좋은 방을 찾는 일은 단순히 낮은 월세를 고르는 문제가 아니라, 예산 안에서 통학, 생활시설, 의료시설, 안전을 함께 만족하는 지역을 찾는 문제입니다.',
    kind: 'problem',
    rows: [
      {
        code: '01',
        title: '정보가 흩어져 있음',
        body: '전월세 비용, 이동 시간, 편의시설, 병원·약국, 안전 정보가 여러 사이트와 지도 서비스에 나뉘어 있습니다.',
      },
      {
        code: '02',
        title: '동네 단위 비교가 어려움',
        body: '매물, 시설, 교통, 안전 데이터를 사용자가 직접 해석해야 해서 후보 지역을 빠르게 좁히기 어렵습니다.',
      },
      {
        code: '03',
        title: '생활 조건이 복합적임',
        body: '예산, 희망 면적, 통학·통근 시간, 필요한 생활시설, 의료 접근성까지 동시에 고려해야 합니다.',
      },
      {
        code: '04',
        title: '기존 서비스의 초점 차이',
        body: '부동산 서비스는 매물 확인에 강하지만, 매물 검색 이전의 거주 후보지 정리에는 한계가 있습니다.',
      },
    ],
  },
  {
    eyebrow: 'PROJECT GOAL',
    title: '방을 고르기 전에 후보 동네를 좁힙니다',
    lead: '자취맵의 목표는 여러 생활 조건을 기준으로 사용자가 살펴볼 동네 범위를 합리적으로 줄여주는 것입니다.',
    kind: 'thesis',
    bullets: [
      '조건을 입력해 추천받거나 지도에서 직접 탐색',
      '행정동·법정동 단위 후보를 담아두고 상세 정보로 검증',
      'AI 대화와 부동산 도우미로 후보 비교와 계약 전 확인까지 보조',
    ],
  },
  {
    eyebrow: 'SERVICE FLOW',
    title: '추천과 탐색을 하나의 흐름으로 연결합니다',
    lead: '서비스 진입은 두 가지지만 목표는 같습니다. 사용자가 후보 동네를 찾고, 검증하고, 실제 매물 검토 단계로 넘어가게 하는 것입니다.',
    kind: 'demo',
    rows: [
      {
        code: '01',
        title: '조건 추천',
        body: '보증금, 월세, 면적, 시설, 목적지, 이동 시간, 우선순위를 입력',
      },
      {
        code: '02',
        title: '지도 탐색',
        body: '지역 검색, 위치 이동, 동네 클릭, 히트맵과 시설 필터로 직접 확인',
      },
      {
        code: '03',
        title: '후보 검증',
        body: '담아둔 후보의 시세, 교통, 생활 인프라, 안전 지표를 대시보드에서 검토',
      },
      {
        code: '04',
        title: '매물 검토 보조',
        body: 'AI 대화와 부동산 도우미로 후보 비교, 가격 적정성, 계약 체크리스트 확인',
      },
    ],
  },
  {
    eyebrow: 'RECOMMENDATION',
    title: '조건 추천은 후보 동네를 빠르게 걸러냅니다',
    lead: '사용자 조건을 구조화해 추천 API로 전달하고, 예산과 이동 가능성, 시설 충족 여부를 기준으로 후보를 정렬합니다.',
    kind: 'formula',
    bullets: [
      '보증금과 월세를 환산월세로 바꿔 비용 지표를 통합',
      '희망 면적, 필요 시설, 학교·목적지, 최대 통학·통근 시간을 필터로 반영',
      '예산 우선 또는 교통 우선 기준에 따라 행정동·법정동 후보를 정렬',
    ],
  },
  {
    eyebrow: 'MAP EXPLORATION',
    title: '지도에서는 공간 맥락을 직접 검증합니다',
    lead: '추천 결과를 그대로 믿는 대신, 사용자가 지도 위에서 생활시설, 의료시설, 경계, 히트맵을 직접 확인할 수 있게 했습니다.',
    kind: 'map',
    bullets: [
      '지역 검색, 현재 위치, 집·학교 위치 이동',
      '지도 클릭으로 동네 선택, 후보 담기, 상세 보기',
      '행정동·법정동 경계와 점수 히트맵으로 지역 특성 비교',
    ],
    rows: [
      {
        code: '01',
        title: '공간 탐색',
        body: '검색과 위치 이동으로 관심 지역을 빠르게 찾습니다.',
      },
      {
        code: '02',
        title: '점수 히트맵',
        body: '동네별 특성을 색상으로 비교해 후보를 좁힙니다.',
      },
      {
        code: '03',
        title: '시설 필터',
        body: '편의점, 공원, 세탁, 도서관, 병원, 약국 등을 지도에서 확인합니다.',
      },
      {
        code: '04',
        title: '후보 저장',
        body: '관심 동네를 담아두고 상세 대시보드로 이어갑니다.',
      },
    ],
  },
  {
    eyebrow: 'DETAIL VIEW',
    title: '대시보드는 후보 동네를 짧게 읽게 합니다',
    lead: '추천받거나 지도에서 선택한 동네는 시세, 교통, 생활 인프라, 안전 지표로 다시 검증합니다.',
    kind: 'dashboard',
    bullets: [
      '부동산 거래 내역 기반 시세 요약',
      '교통 접근성과 생활 인프라를 한 화면에서 비교',
      '안전 지표를 함께 보여줘 실제 거주 가능성을 판단',
    ],
    rows: [
      {
        code: '01',
        title: '시세',
        body: '임대료 지표와 거래 기반 가격 흐름을 요약합니다.',
      },
      {
        code: '02',
        title: '교통',
        body: '통학·통근 가능성과 대중교통 접근성을 확인합니다.',
      },
      {
        code: '03',
        title: '생활',
        body: '생활시설과 의료시설 접근성을 동네 단위로 정리합니다.',
      },
      {
        code: '04',
        title: '안전',
        body: '안전 관련 공공 지표를 함께 제공해 판단 누락을 줄입니다.',
      },
    ],
  },
  {
    eyebrow: 'SCORING',
    title: '동네 점수는 생활 기준별로 나눕니다',
    lead: '추천 결과는 단일 평균값이 아니라 사용자가 실제로 비교하는 생활 기준의 조합으로 보여줍니다.',
    kind: 'score',
    rows: [
      {
        code: 'R',
        title: '임대료',
        body: '환산월세와 실거래 기반 비용 부담을 비교합니다.',
        tag: 'rent',
      },
      {
        code: 'T',
        title: '교통',
        body: '학교·목적지까지의 이동 가능성과 대중교통 접근성을 반영합니다.',
        tag: 'transit',
      },
      {
        code: 'L',
        title: '생활시설',
        body: '편의점, 공원, 세탁, 도서관 등 자취 생활 신호를 묶습니다.',
        tag: 'life',
      },
      {
        code: 'S',
        title: '안전',
        body: '지역 안전 관련 공공 지표를 후보 검증 정보로 제공합니다.',
        tag: 'safety',
      },
    ],
    note: '추천 결과 = 임대료 · 교통 · 시설 · 안전 점수 + 사용자 우선순위',
  },
  {
    eyebrow: 'AI EXPERIENCE',
    title: 'AI는 서비스 데이터로 다시 질문하게 합니다',
    lead: '사용자가 자연어로 질문하면 공공데이터 기반 DB 조회와 후보 비교 답변으로 탐색 흐름을 이어갑니다.',
    kind: 'ai',
    image: {
      src: aiArchitectureImage,
      alt: '사용자 질문을 의도 분류, 읽기 전용 SQL, 검증, 답변으로 연결하는 AI 구조도',
      label: 'AI QUERY FLOW',
    },
    bullets: [
      '질문 의도에 맞는 데이터 테이블 선택',
      '읽기 전용 SQL 생성과 검증으로 안전하게 조회',
      '후보별 장단점, 추천 순서, 표와 그래프 형태의 응답 제공',
    ],
  },
  {
    eyebrow: 'REAL ESTATE HELPER',
    title: '동네 선택 이후의 매물 검토까지 보조합니다',
    lead: '후보 동네를 정한 뒤에는 실제 매물의 가격 적정성과 계약 전 확인 사항을 점검할 수 있게 연결합니다.',
    kind: 'difference',
    summary: {
      label: 'Decision support',
      text: '추천은 동네를 압축하고, 도우미는 실제 계약 전 확인해야 할 정보를 놓치지 않게 합니다.',
    },
    rows: [
      {
        code: '01',
        title: '계약 체크리스트',
        body: '자취 초보자가 계약 전 확인해야 할 항목을 단계별로 정리합니다.',
      },
      {
        code: '02',
        title: '가격 분석',
        body: '입력한 매물을 실거래 기반 가격 정보와 비교해 검토합니다.',
      },
      {
        code: '03',
        title: '외부 정보 연결',
        body: '등기, 시세, 보증, 공공정보 확인 링크로 후속 확인을 돕습니다.',
      },
      {
        code: '04',
        title: '후보 비교',
        body: '담아둔 동네의 장단점과 추천 순서를 다시 확인합니다.',
      },
    ],
  },
  {
    eyebrow: 'DATA FOUNDATION',
    title: '흩어진 공공데이터를 동네 기준으로 맞춥니다',
    lead: '법정동 실거래, 행정동 탐색 단위, 좌표 기반 시설 데이터를 하나의 판단 단위로 연결했습니다.',
    kind: 'mapping',
    image: {
      src: spatialMappingImage,
      alt: '법정동, 행정동, 좌표 데이터를 행정동 기준으로 정렬하는 공간 매핑 구조',
      label: 'SPATIAL MAPPING',
    },
  },
  {
    eyebrow: 'RELATED SERVICES',
    title: '관련 서비스와의 차이',
    lead: '기존 부동산 서비스가 매물 확인에 강하다면, 자취맵은 매물 검색 이전에 어떤 동네부터 볼지 정리하는 데 초점을 둡니다.',
    kind: 'difference',
    summary: {
      label: 'Positioning',
      text: '자취맵은 매물을 바로 고르는 서비스가 아니라, 예산과 생활 조건으로 후보 동네를 먼저 압축하는 탐색 보조 서비스입니다.',
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
        tag: '차이: 자취 조건별 후보 동네 압축 흐름은 약함',
      },
      {
        code: '지도 서비스',
        title: '위치·시설 확인 중심',
        body: '주변 시설과 이동 경로를 확인할 수 있지만, 자취 적합도를 한 번에 비교하기는 어렵습니다.',
        tag: '차이: 비용·안전·시설·교통 판단이 분리됨',
      },
      {
        code: '자취맵',
        title: '동네 후보 압축 중심',
        body: '예산, 통학·통근, 생활시설, 의료시설, 안전 정보를 동네 단위로 묶어 먼저 비교합니다.',
        tag: '차별점: 추천 → 지도 탐색 → 대시보드 → AI/도우미',
      },
    ],
  },
  {
    eyebrow: 'OPERATION',
    title: '데이터가 바뀌어도 다시 계산할 수 있습니다',
    lead: '공공데이터를 수집, 정제, 공간 결합, 사전 집계하는 흐름을 분리해 향후 지표 추가와 지역 확장이 가능하도록 했습니다.',
    kind: 'operation',
    image: {
      src: operationPipelineImage,
      alt: '공공데이터 수집, 재계산, 저장, 관찰 파이프라인',
      label: 'OPERATION PIPELINE',
    },
    bullets: [
      '전월세, 시설, 의료, 교통, 안전 데이터를 API 단위로 분리',
      '행정동·법정동 점수와 실거래 데이터를 다시 계산 가능한 구조',
      '추천 설명 가능성, AI 답변 범위 고지, 공공데이터 한계 안내를 향후 보완',
    ],
  },
  {
    eyebrow: 'SERVICE OUTCOME',
    title: '탐색 부담을 줄이고 판단 흐름을 연결합니다',
    lead: '자취맵은 매물 검색 이전의 동네 선택 문제를 데이터 기반으로 구조화해 초보 사용자의 의사결정을 돕습니다.',
    kind: 'score',
    rows: [
      {
        code: '01',
        title: '탐색 부담 감소',
        body: '여러 사이트를 오가며 가격, 위치, 시설, 교통, 병원 정보를 따로 확인하는 부담을 줄입니다.',
        tag: 'user value',
      },
      {
        code: '02',
        title: '후보 압축',
        body: '조건 추천과 지도 탐색으로 실제 생활 조건에 맞는 거주 가능 지역의 범위를 먼저 정합니다.',
        tag: 'decision flow',
      },
      {
        code: '03',
        title: '확장 가능성',
        body: '데이터 갱신, 생활 지표 추가, 서비스 지역 확대가 API와 데이터 구조 단위로 가능합니다.',
        tag: 'scalability',
      },
    ],
    note: '추천, 탐색, 검증, 계약 전 점검을 하나의 느슨한 흐름으로 연결합니다.',
  },
  {
    eyebrow: 'CONCLUSION',
    title: '동네를 먼저 정하면 매물 선택이 쉬워집니다',
    lead: '자취맵은 흩어진 공공데이터를 자취 의사결정 기준으로 바꿔, 사용자가 볼 후보 동네를 먼저 줄여주는 서비스입니다.',
    kind: 'closing',
    bullets: ['목표: 매물 검색 전 후보 동네 압축', '기능: 추천, 지도, 대시보드, AI, 도우미 연결', '성과: 생활 조건 중심의 자취 의사결정 보조'],
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
    <main className="cartesian-deck-root" aria-label="슬기로운 자취생활 Cartesian 발표자료">
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
    </>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  if (slide.kind === 'cover') return <CoverSlide slide={slide} />;
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
        <StatCell number="10조" label="박세황 · 박지현 · 백수민 · 하승연" />
        <StatCell number="서울" label="공공데이터 기반 동네 탐색" />
        <StatCell number="후보" label="추천 · 탐색 · 검증 흐름" />
      </div>
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
      {slide.image && <ImagePanel image={slide.image} className="cartesian-diagram-panel" />}
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
      {slide.image && <ImagePanel image={slide.image} className="cartesian-diagram-panel" />}
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
          <span>구성</span>
          <span>처리 방식</span>
          <span>서비스 효과</span>
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

function CartesianStyles() {
  return (
    <style>
      {`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+KR:wght@400;500;600&family=Noto+Serif+KR:wght@400;600&family=Playfair+Display:wght@400&display=swap');

.cartesian-deck-root {
  --cartesian-bg: #EDE8E0;
  --cartesian-bg-2: #E2DBD1;
  --cartesian-ink: #1A1A1A;
  --cartesian-text: #5A5A5A;
  --cartesian-accent: #8A8178;
  --cartesian-line: #B8B0A4;
  --cartesian-paper: rgba(255, 255, 255, 0.34);
  --cartesian-serif: "Playfair Display", "Noto Serif KR", serif;
  --cartesian-sans: "Inter", "Noto Sans KR", sans-serif;
  --stage-bg: #1A1A1A;
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
  background: var(--stage-bg, #1A1A1A);
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
  background: var(--cartesian-bg);
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
  background: var(--cartesian-bg);
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
  background: var(--cartesian-line);
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
  background: rgba(237, 232, 224, 0.84);
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
  background: var(--cartesian-ink);
  transform: scale(1.3);
}

.cartesian-axis-v,
.cartesian-axis-h {
  position: absolute;
  z-index: 0;
  display: block;
  background: var(--cartesian-line);
  opacity: 0.34;
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
  background: rgba(237, 232, 224, 0.9);
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
  background: rgba(237, 232, 224, 0.88);
  color: var(--cartesian-accent);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
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
  background: rgba(255, 255, 255, 0.22);
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
  background: var(--cartesian-ink);
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
    rgba(255, 255, 255, 0.16);
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
  border: 1px solid var(--cartesian-line);
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
  background: rgba(255, 255, 255, 0.2);
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
  grid-template-rows: auto 238px;
  column-gap: 86px;
  row-gap: 44px;
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
  gap: 26px;
  align-self: center;
}

.cartesian-formula-layout > .cartesian-numbered-list > div {
  min-height: 142px;
  padding: 24px 28px;
}

.cartesian-formula-layout > .cartesian-numbered-list p {
  margin-top: 18px;
  font-size: 22px;
  line-height: 1.42;
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
  background: rgba(255, 255, 255, 0.22);
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
  background: rgba(255, 255, 255, 0.22);
}

.cartesian-difference-matrix article:last-child {
  border-color: var(--cartesian-ink);
  background: rgba(255, 255, 255, 0.36);
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
  grid-template-columns: 80px 270px 1fr 150px;
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
  background: rgba(255, 255, 255, 0.22);
}

.cartesian-closing-list p {
  margin-top: 22px;
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
