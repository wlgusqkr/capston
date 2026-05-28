import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import aiArchitectureImage from '@/assets/presentation/ai-architecture.svg';
import dashboardScrollImage from '@/assets/presentation/dashboard-scroll-1100.png';
import dataPipelineImage from '@/assets/presentation/data-pipeline.svg';
import mainMapRealImage from '@/assets/presentation/main-map-real.png';
import operationPipelineImage from '@/assets/presentation/operation-pipeline.svg';
import spatialMappingImage from '@/assets/presentation/spatial-mapping.svg';

type SlideKind =
  | 'cover'
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
}

const slides: Slide[] = [
  {
    eyebrow: 'FINAL PRESENTATION',
    title: '슬기로운 자취생활',
    lead: '매물을 보기 전에, 예산과 생활 기준에 맞는 동네 후보를 먼저 압축하는 자취 의사결정 서비스',
    kind: 'cover',
    image: {
      src: mainMapRealImage,
      alt: '조건 필터와 행정동별 거래량 분포를 보여주는 자취맵 메인 지도',
      label: 'REAL MAP SCREEN',
    },
  },
  {
    eyebrow: 'PROBLEM',
    title: '동네 선택이 먼저입니다',
    lead: '자취 초보자는 좋은 방을 찾기 전에 어느 동네부터 봐야 하는지에서 막힙니다.',
    kind: 'problem',
    rows: [
      {
        code: '01',
        title: '정보가 흩어져 있음',
        body: '월세, 통학, 생활시설, 교통 정보가 서로 다른 서비스와 데이터셋에 분산됩니다.',
      },
      {
        code: '02',
        title: '공간 기준이 다름',
        body: '실거래는 법정동, 탐색은 행정동, 생활시설은 좌표 기준이라 바로 비교하기 어렵습니다.',
      },
      {
        code: '03',
        title: '평균만으로 부족함',
        body: '평균 월세만으로는 실제 예산, 면적, 주거 유형, 위치 체감 차이를 설명하기 어렵습니다.',
      },
      {
        code: '04',
        title: '선호를 말하기 어려움',
        body: '사용자는 교통과 시설 중 무엇을 더 중요하게 보는지 명확한 가중치로 표현하기 어렵습니다.',
      },
    ],
  },
  {
    eyebrow: 'SERVICE THESIS',
    title: '동네 후보를 압축합니다',
    lead: '우리는 매물 추천 이전 단계에서 사용자가 볼 동네 후보를 줄이는 문제를 풀었습니다.',
    kind: 'thesis',
    bullets: [
      '데이터 목록이 아니라 자취 결정을 위한 판단 단위로 재구성',
      '법정동, 행정동, 좌표 데이터를 하나의 지도 위에서 연결',
      '동네 평균과 특정 위치 주변 생활환경을 동시에 분석',
    ],
  },
  {
    eyebrow: 'DATA RESEARCH',
    title: '흩어진 데이터를 묶다',
    lead: '공공데이터를 가져오는 것보다 어려웠던 일은 서로 다른 기준의 데이터를 비교 가능한 동네 단위로 맞추는 것이었습니다.',
    kind: 'pipeline',
    image: {
      src: dataPipelineImage,
      alt: '공공데이터 수집, 정제, 공간 결합, 사전 집계 파이프라인',
      label: 'DATA PIPELINE',
    },
  },
  {
    eyebrow: 'RESEARCH 01',
    title: '비용 기준',
    lead: '보증금과 월세를 하나의 환산월세로 바꿔 동네별 비용 부담을 비교했습니다.',
    kind: 'formula',
    bullets: [
      '보증금을 월세 부담으로 환산해 하나의 비용 지표로 통합',
      '최근 실거래를 기준으로 행정동별 비용 부담 계산',
      '비용이 낮을수록 전월세 점수가 높아지도록 변환',
    ],
  },
  {
    eyebrow: 'RESEARCH 02',
    title: '공간 매핑',
    lead: '법정동, 행정동, 좌표가 서로 다른 언어로 말하던 데이터를 하나의 지도 기준으로 맞췄습니다.',
    kind: 'mapping',
    image: {
      src: spatialMappingImage,
      alt: '법정동, 행정동, 좌표 데이터를 행정동 기준으로 정렬하는 공간 매핑 구조',
      label: 'SPATIAL MAPPING',
    },
  },
  {
    eyebrow: 'RESEARCH 03',
    title: '자취 적합도',
    lead: '좋은 동네는 하나로 고정되지 않습니다. 사용자마다 중요하게 보는 기준이 다르기 때문입니다.',
    kind: 'score',
    rows: [
      {
        code: 'R',
        title: '전월세',
        body: '환산월세 기반 비용 부담 점수',
        tag: 'rent',
      },
      {
        code: 'L',
        title: '생활시설',
        body: '카페, 편의점, 병원, 약국, 마트, 공원 등 주변 생활 신호',
        tag: 'life',
      },
      {
        code: 'T',
        title: '교통',
        body: '지하철 접근성과 버스 정류장 밀도',
        tag: 'transit',
      },
    ],
  },
  {
    eyebrow: 'SERVICE 01',
    title: '조건 매칭 지도',
    lead: '내 예산과 주거 조건에 맞는 실제 거래가 어느 동네에 있었는지 지도에서 바로 확인합니다.',
    kind: 'map',
    image: {
      src: mainMapRealImage,
      alt: '실제 원격 DB 데이터가 표시된 조건 매칭 지도 화면',
      label: 'MATCH MAP',
    },
    bullets: [
      '보증금, 월세, 면적, 주거유형, 기간 필터',
      '조건을 만족한 실거래 수를 행정동별로 집계',
      '거래량 쏠림은 log scale로 완화',
    ],
  },
  {
    eyebrow: 'SERVICE 02',
    title: '위치 점수',
    lead: '같은 행정동 안에서도 위치가 다르면 체감 생활환경은 달라집니다.',
    kind: 'dashboard',
    image: {
      src: dashboardScrollImage,
      alt: '오류2동의 월세, 거래, 자취초 지수, 차트, 편의시설 지표를 보여주는 대시보드',
      label: 'DASHBOARD / O-RYU 2-DONG',
      scroll: true,
      scrollDuration: 24,
      scrollFrameHeight: '610px',
    },
    bullets: [
      '특정 좌표 주변 1km 생활시설 분석',
      '가까운 시설일수록 더 크게 반영하는 커널 방식',
      '동네 평균과 위치 주변 분석을 동시에 제공',
    ],
  },
  {
    eyebrow: 'PERSONALIZATION',
    title: '선택으로 배우는 선호',
    lead: '사용자가 복잡한 숫자를 입력하지 않아도, 몇 번의 선택만으로 월세, 시설, 교통 선호를 추정합니다.',
    kind: 'preference',
    rows: [
      {
        code: 'A/B',
        title: '비교 선택',
        body: '두 동네 중 더 끌리는 쪽을 선택',
      },
      {
        code: 'W',
        title: '가중치 추정',
        body: '선택 결과를 월세, 생활시설, 교통 선호로 변환',
      },
      {
        code: 'MAP',
        title: '즉시 반영',
        body: '지도 색상, 추천, 비교 결과에 개인 기준 반영',
      },
    ],
  },
  {
    eyebrow: 'AI EXPERIENCE',
    title: '질문하면 조회합니다',
    lead: '자연어 질문을 데이터 조회, 추천 근거, 시각화 답변으로 연결했습니다.',
    kind: 'ai',
    image: {
      src: aiArchitectureImage,
      alt: '사용자 질문을 의도 분류, 읽기 전용 SQL, 검증, 답변으로 연결하는 AI 구조도',
      label: 'AI QUERY FLOW',
    },
    bullets: [
      '질문 의도 분류 후 필요한 데이터 테이블 선택',
      '읽기 전용 SQL 생성과 검증',
      '추천, 정보 조회, 표, 막대, 선 그래프로 응답',
    ],
  },
  {
    eyebrow: 'DEMO FLOW',
    title: '탐색에서 비교까지',
    lead: '실제 데모는 사용자가 동네 후보를 좁히는 순서를 그대로 따라갑니다.',
    kind: 'demo',
    rows: [
      {
        code: '01',
        title: '지도',
        body: '서울 행정동 단위 후보 확인',
      },
      {
        code: '02',
        title: '조건',
        body: '예산과 주거 조건으로 거래 압축',
      },
      {
        code: '03',
        title: '상세',
        body: '대시보드와 비교 화면에서 후보 검토',
      },
      {
        code: '04',
        title: 'AI',
        body: '마지막 질문을 데이터 기반 답변으로 확인',
      },
    ],
  },
  {
    eyebrow: 'DIFFERENTIATION',
    title: '우리만의 차별점',
    lead: '사용자 입장에서는 정보를 더 많이 보는 서비스가 아니라, 어디부터 보면 되는지 빠르게 좁혀주는 서비스입니다.',
    kind: 'difference',
    rows: [
      {
        code: 'D1',
        title: '매물보다 동네 먼저',
        body: '방을 하나씩 보기 전에 예산과 생활 기준에 맞는 후보 동네부터 압축',
      },
      {
        code: 'D2',
        title: '조건에 맞는 실제 거래',
        body: '평균 월세가 아니라 내 조건에 맞았던 실거래가 어느 동네에 있었는지 확인',
      },
      {
        code: 'D3',
        title: '동네 평균과 위치 체감',
        body: '행정동 단위 지표와 특정 위치 주변 1km 생활환경을 함께 비교',
      },
      {
        code: 'D4',
        title: '설명 가능한 선택 흐름',
        body: '지도, 상세, 비교, AI 질문으로 후보를 좁히는 이유를 계속 확인',
      },
    ],
  },
  {
    eyebrow: 'TECHNICAL DIFFERENTIATION',
    title: '차별화 기술 구성',
    lead: '서비스의 차별화는 네 가지 흐름으로 설명할 수 있습니다. 공간 기준을 맞추고, 사용자 선택을 점수에 반영하며, 자연어 조회와 데이터 갱신 구조까지 연결했습니다.',
    kind: 'ip',
    rows: [
      {
        code: '01',
        title: '이종 공간 기준 결합',
        body: '법정동 실거래, 행정동 서비스 단위, 좌표 시설 데이터를 하나의 판단 단위로 변환',
        tag: 'normalization',
      },
      {
        code: '02',
        title: '선호 기반 점수 조정',
        body: '비교 선택에서 추정한 가중치를 비용, 생활, 교통 점수 조합에 반영',
        tag: 'preference',
      },
      {
        code: '03',
        title: '안전한 자연어 조회',
        body: '의도 분류, 테이블 선택, 읽기 전용 SQL 생성, 검증을 거쳐 답변',
        tag: 'guarded query',
      },
      {
        code: '04',
        title: '갱신 가능한 산출 구조',
        body: '공공데이터 수집, 상태 관리, 재계산, 관찰 가능성을 운영 구조로 연결',
        tag: 'recalculation',
      },
    ],
  },
  {
    eyebrow: 'OPERATION',
    title: '갱신 가능한 구조',
    lead: '일회성 데모가 아니라 최신 공공데이터를 다시 계산해 서비스에 반영할 수 있는 구조로 만들었습니다.',
    kind: 'operation',
    image: {
      src: operationPipelineImage,
      alt: 'GitHub Actions 기반 데이터 수집, 재계산, 저장, 관찰 파이프라인',
      label: 'OPERATION PIPELINE',
    },
    bullets: [
      'GitHub Actions 기반 데이터 업데이트',
      '생활시설 및 current score 재계산',
      'lock, 상태 JSON, rate limit 감지',
      'Prometheus와 OpenTelemetry 기반 관찰 가능성',
    ],
  },
  {
    eyebrow: 'CONCLUSION',
    title: '동네를 먼저 찾는다',
    lead: '슬기로운 자취생활은 흩어진 공공데이터를 자취 의사결정 기준으로 바꿔 사용자의 후보 동네를 줄여주는 서비스입니다.',
    kind: 'closing',
    bullets: ['연구: 데이터 기준 재구성', '서비스: 조건 매칭과 위치 분석', '운영: 갱신 가능한 자동화 구조'],
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
      {slide.image && <ImagePanel image={slide.image} className="cartesian-cover-image" fit="contain" />}
      <div className="cartesian-cover-stats">
        <StatCell number="01" label="공공데이터 재구성" />
        <StatCell number="02" label="동네 후보 압축" />
        <StatCell number="03" label="개인 선호 반영" />
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
      <div className="cartesian-equation">종합점수 = 전월세×w1 + 생활시설×w2 + 교통×w3</div>
    </div>
  );
}

function ScreenSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-screen-layout">
      <div className="cartesian-copy-column">
        <span className="cartesian-label">Product screen</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        <NumberedList bullets={slide.bullets ?? []} compact />
      </div>
      {slide.image && <ImagePanel image={slide.image} className="cartesian-screen-panel" fit="contain" />}
    </div>
  );
}

function DashboardSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cartesian-content cartesian-dashboard-layout">
      <div className="cartesian-copy-column">
        <span className="cartesian-label">Location score</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
        <NumberedList bullets={slide.bullets ?? []} compact />
      </div>
      {slide.image && <ImagePanel image={slide.image} className="cartesian-dashboard-panel" />}
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
  return (
    <div className="cartesian-content cartesian-difference-layout">
      <div className="cartesian-heading-block">
        <span className="cartesian-label">Differentiation</span>
        <SlideTitle>{slide.title}</SlideTitle>
        <Lead>{slide.lead}</Lead>
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
    <div className="cartesian-difference-matrix" aria-label="서비스 차별점 4가지">
      {rows.map((row) => (
        <article key={row.code}>
          <span>{row.code}</span>
          <h2>{row.title}</h2>
          <p>{row.body}</p>
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
  height: 238px;
  margin-top: 18px;
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
  height: 196px;
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
  height: 72px;
  padding: 14px 16px;
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
  top: 28px;
}

.cartesian-problem-node.node-1 {
  right: 38px;
  top: 28px;
}

.cartesian-problem-node.node-2 {
  left: 38px;
  bottom: 28px;
}

.cartesian-problem-node.node-3 {
  right: 38px;
  bottom: 28px;
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

.cartesian-cover-stats {
  position: absolute;
  left: 0;
  right: 44px;
  bottom: 46px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 34px;
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

.cartesian-ai .cartesian-copy-column .cartesian-lead,
.cartesian-operation .cartesian-copy-column .cartesian-lead {
  max-width: 520px;
  font-size: 24px;
  line-height: 1.46;
}

.cartesian-ai .cartesian-numbered-list.compact,
.cartesian-operation .cartesian-numbered-list.compact {
  gap: 10px;
}

.cartesian-ai .cartesian-numbered-list.compact > div,
.cartesian-operation .cartesian-numbered-list.compact > div {
  padding: 14px 0 15px;
}

.cartesian-ai .cartesian-numbered-list.compact p,
.cartesian-operation .cartesian-numbered-list.compact p {
  margin-top: 14px;
  font-size: 20px;
  line-height: 1.4;
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
  grid-template-rows: auto 214px auto;
  gap: 62px;
}

.cartesian-formula-header {
  display: grid;
  gap: 24px;
}

.cartesian-formula-header .cartesian-title {
  font-size: 84px;
}

.cartesian-formula-box {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 24px;
  border-top: 1px solid var(--cartesian-ink);
  border-bottom: 1px solid var(--cartesian-ink);
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
  font-size: 74px;
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
  gap: 54px;
}

.cartesian-score-heading {
  display: grid;
  max-width: 1200px;
  gap: 24px;
}

.cartesian-score-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 42px;
}

.cartesian-score-card {
  min-height: 314px;
  padding: 34px 36px;
  border: 1px solid var(--cartesian-line);
  background: var(--cartesian-paper);
}

.cartesian-score-card h2 {
  margin-top: 34px;
}

.cartesian-score-card p {
  margin-top: 22px;
}

.cartesian-score-card small {
  display: block;
  margin-top: 28px;
  color: var(--cartesian-accent);
  font-size: 15px;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cartesian-equation {
  padding: 28px 32px;
  border-top: 1px solid var(--cartesian-ink);
  border-bottom: 1px solid var(--cartesian-ink);
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 38px;
  line-height: 1.2;
  letter-spacing: 0;
  text-align: center;
}

.cartesian-screen-layout,
.cartesian-dashboard-layout {
  grid-template-columns: 520px 1fr;
  gap: 70px;
}

.cartesian-screen-panel {
  height: 646px;
}

.cartesian-dashboard-panel {
  height: var(--cartesian-scroll-frame-height, 610px);
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

.cartesian-difference-matrix {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
  align-self: stretch;
}

.cartesian-difference-matrix article {
  min-height: 248px;
  padding: 28px 30px;
  border: 1px solid var(--cartesian-line);
  background: rgba(255, 255, 255, 0.22);
}

.cartesian-difference-matrix span {
  display: block;
  color: var(--cartesian-accent);
  font-family: var(--cartesian-serif);
  font-size: 30px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.cartesian-difference-matrix h2 {
  margin-top: 30px;
  color: var(--cartesian-ink);
  font-family: var(--cartesian-serif);
  font-size: 34px;
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: 0;
}

.cartesian-difference-matrix p {
  margin-top: 20px;
  color: var(--cartesian-text);
  font-size: 20px;
  line-height: 1.5;
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
