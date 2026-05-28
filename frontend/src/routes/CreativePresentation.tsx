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
      scrollDuration: 22,
      scrollFrameHeight: '560px',
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
    lead: '핵심은 데이터를 보여주는 것이 아니라, 자취 결정을 위한 판단 기준으로 다시 구성한 것입니다.',
    kind: 'difference',
    rows: [
      {
        code: 'D1',
        title: '자취생 관점 모델',
        body: '비용, 생활, 교통을 매물 이전 단계의 동네 판단 기준으로 재구성',
      },
      {
        code: 'D2',
        title: '공간 결합',
        body: '법정동, 행정동, 좌표 기준 데이터를 하나의 분석 단위로 연결',
      },
      {
        code: 'D3',
        title: '개인 선호 학습',
        body: '선택을 점수 가중치로 바꿔 추천 결과에 반영',
      },
      {
        code: 'D4',
        title: '운영 구조',
        body: '데이터 업데이트와 점수 재계산을 반복 가능한 구조로 구성',
      },
    ],
  },
  {
    eyebrow: 'IP LENS',
    title: '권리화 검토 포인트',
    lead: '변리사 참석 상황을 고려해 구현 결과뿐 아니라 차별화 자산이 될 수 있는 기술 구성도 함께 보여줍니다.',
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

export default function CreativePresentation() {
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
    <main className="creative-deck-root" aria-label="슬기로운 자취생활 Creative Mode 발표자료">
      <CreativeStyles />
      <div className="creative-progress" style={{ width: `${progress}%` }} />
      <div className="deck-viewport creative-deck-viewport">
        <div ref={stageRef} id="creativeDeckStage" className="deck-stage creative-deck-stage">
          {slides.map((slide, slideIndex) => (
            <section
              key={`${slide.eyebrow}-${slide.title}`}
              className={`slide creative-slide creative-${slide.kind} ${
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
      <div className="deck-controls creative-controls" aria-label="슬라이드 조작">
        <button type="button" onClick={goPrev} disabled={index === 0} aria-label="이전 슬라이드">
          ←
        </button>
        <span>{`${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`}</span>
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
      <header className="creative-topbar">
        <span>{slide.eyebrow}</span>
        <span className="creative-pill">CREATIVE MODE</span>
      </header>
      <footer className="creative-meta">
        <span>SELF-LIVING DECISION SERVICE</span>
        <span>
          {String(current).padStart(2, '0')}
          <i />
          {String(total).padStart(2, '0')}
        </span>
      </footer>
    </>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  if (slide.kind === 'cover') return <CoverSlide slide={slide} />;
  if (slide.kind === 'problem') return <ProblemSlide slide={slide} />;
  if (slide.kind === 'thesis') return <ThesisSlide slide={slide} />;
  if (slide.kind === 'pipeline') return <PipelineSlide slide={slide} />;
  if (slide.kind === 'formula') return <FormulaSlide slide={slide} />;
  if (slide.kind === 'mapping') return <MappingSlide slide={slide} />;
  if (slide.kind === 'score') return <ScoreSlide slide={slide} />;
  if (slide.kind === 'map') return <MapSlide slide={slide} />;
  if (slide.kind === 'dashboard') return <DashboardSlide slide={slide} />;
  if (slide.kind === 'preference') return <PreferenceSlide slide={slide} />;
  if (slide.kind === 'ai') return <AiSlide slide={slide} />;
  if (slide.kind === 'demo') return <DemoSlide slide={slide} />;
  if (slide.kind === 'difference') return <DifferenceSlide slide={slide} />;
  if (slide.kind === 'ip') return <IpSlide slide={slide} />;
  if (slide.kind === 'operation') return <OperationSlide slide={slide} />;
  return <ClosingSlide slide={slide} />;
}

function DisplayTitle({ children, className = '' }: { children: string; className?: string }) {
  return <h1 className={`creative-display ${className}`}>{children}</h1>;
}

function Lead({ children, className = '' }: { children: string; className?: string }) {
  return <p className={`creative-lead ${className}`}>{children}</p>;
}

function CoverSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-cover-layout">
      <div className="creative-cover-copy">
        <div className="creative-kicker">NEIGHBORHOOD FIRST</div>
        <DisplayTitle>{slide.title}</DisplayTitle>
        <Lead>{slide.lead}</Lead>
      </div>
      <div className="creative-switch" aria-hidden="true">
        <span />
      </div>
      {slide.image && <ImagePanel image={slide.image} className="creative-cover-image" fit="contain" />}
      <div className="creative-stats-strip">
        <StatTile value="01" label="공공데이터 재구성" color="pink" />
        <StatTile value="02" label="동네 후보 압축" color="yellow" />
        <StatTile value="03" label="개인 선호 반영" color="green" />
      </div>
    </div>
  );
}

function ProblemSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-problem-layout">
      <DisplayTitle>{slide.title}</DisplayTitle>
      <Lead>{slide.lead}</Lead>
      <div className="creative-problem-grid">
        {(slide.rows ?? []).map((row, index) => (
          <div key={row.code} className={`creative-problem-card color-${index}`}>
            <span>{row.code}</span>
            <h2>{row.title}</h2>
            <p>{row.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThesisSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-thesis-layout">
      <div className="creative-marker">THESIS</div>
      <DisplayTitle>{slide.title}</DisplayTitle>
      <Lead>{slide.lead}</Lead>
      <BulletBlocks bullets={slide.bullets ?? []} />
    </div>
  );
}

function PipelineSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-two-col">
      <div>
        <DisplayTitle>{slide.title}</DisplayTitle>
        <Lead>{slide.lead}</Lead>
        <div className="creative-mini-grid">
          <StatTile value="5+" label="데이터 범주" color="pink" />
          <StatTile value="3" label="공간 기준" color="orange" />
          <StatTile value="1" label="판단 흐름" color="green" />
        </div>
      </div>
      {slide.image && <ImagePanel image={slide.image} className="creative-diagram" />}
    </div>
  );
}

function FormulaSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-formula-layout">
      <DisplayTitle>{slide.title}</DisplayTitle>
      <div className="creative-formula-box">
        <span>CONVERTED RENT</span>
        <strong>월세 + 보증금 × 0.005</strong>
      </div>
      <BulletBlocks bullets={slide.bullets ?? []} />
      <BarChart />
    </div>
  );
}

function MappingSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-two-col creative-mapping-layout">
      <div>
        <DisplayTitle>{slide.title}</DisplayTitle>
        <Lead>{slide.lead}</Lead>
        <div className="creative-layer-tags">
          <span>법정동</span>
          <span>행정동</span>
          <span>좌표</span>
        </div>
      </div>
      {slide.image && <ImagePanel image={slide.image} className="creative-diagram" />}
    </div>
  );
}

function ScoreSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-score-layout">
      <DisplayTitle>{slide.title}</DisplayTitle>
      <Lead>{slide.lead}</Lead>
      <div className="creative-score-grid">
        {(slide.rows ?? []).map((row, index) => (
          <div key={row.code} className={`creative-score-card color-${index}`}>
            <span>{row.code}</span>
            <h2>{row.title}</h2>
            <p>{row.body}</p>
            <small>{row.tag}</small>
          </div>
        ))}
      </div>
      <div className="creative-equation">종합점수 = 전월세×w1 + 생활시설×w2 + 교통×w3</div>
    </div>
  );
}

function MapSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-screen-layout">
      <div>
        <DisplayTitle>{slide.title}</DisplayTitle>
        <Lead>{slide.lead}</Lead>
        <BulletBlocks bullets={slide.bullets ?? []} compact />
      </div>
      {slide.image && <ImagePanel image={slide.image} className="creative-screen" fit="contain" />}
    </div>
  );
}

function DashboardSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-screen-layout">
      <div>
        <DisplayTitle>{slide.title}</DisplayTitle>
        <Lead>{slide.lead}</Lead>
        <BulletBlocks bullets={slide.bullets ?? []} compact />
      </div>
      {slide.image && <ImagePanel image={slide.image} className="creative-dashboard-panel" />}
    </div>
  );
}

function PreferenceSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-preference-layout">
      <DisplayTitle>{slide.title}</DisplayTitle>
      <Lead>{slide.lead}</Lead>
      <StepCards rows={slide.rows ?? []} />
      <div className="creative-weight-bars">
        {[
          ['월세', 72],
          ['생활', 58],
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
  );
}

function AiSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-two-col">
      <div>
        <DisplayTitle>{slide.title}</DisplayTitle>
        <Lead>{slide.lead}</Lead>
        <BulletBlocks bullets={slide.bullets ?? []} />
      </div>
      {slide.image && <ImagePanel image={slide.image} className="creative-diagram" />}
    </div>
  );
}

function DemoSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-demo-layout">
      <DisplayTitle>{slide.title}</DisplayTitle>
      <Lead>{slide.lead}</Lead>
      <StepCards rows={slide.rows ?? []} />
    </div>
  );
}

function DifferenceSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-difference-layout">
      <DisplayTitle>{slide.title}</DisplayTitle>
      <Lead>{slide.lead}</Lead>
      <div className="creative-diff-grid">
        {(slide.rows ?? []).map((row, index) => (
          <div key={row.code} className={`creative-diff-cell color-${index}`}>
            <span>{row.code}</span>
            <h2>{row.title}</h2>
            <p>{row.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IpSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-ip-layout">
      <DisplayTitle>{slide.title}</DisplayTitle>
      <Lead>{slide.lead}</Lead>
      <div className="creative-ip-table">
        <div className="creative-ip-head">
          <span>No.</span>
          <span>검토 축</span>
          <span>구현 내용</span>
          <span>효과</span>
        </div>
        {(slide.rows ?? []).map((row) => (
          <div key={row.code} className="creative-ip-row">
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

function OperationSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-two-col">
      <div>
        <DisplayTitle>{slide.title}</DisplayTitle>
        <Lead>{slide.lead}</Lead>
        <BulletBlocks bullets={slide.bullets ?? []} />
      </div>
      {slide.image && <ImagePanel image={slide.image} className="creative-diagram" />}
    </div>
  );
}

function ClosingSlide({ slide }: { slide: Slide }) {
  return (
    <div className="creative-content creative-closing-layout">
      <div className="creative-stamp" aria-hidden="true">
        <span>16</span>
      </div>
      <DisplayTitle>{slide.title}</DisplayTitle>
      <Lead>{slide.lead}</Lead>
      <div className="creative-closing-grid">
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

function BulletBlocks({ bullets, compact = false }: { bullets: string[]; compact?: boolean }) {
  return (
    <div className={`creative-bullet-blocks ${compact ? 'is-compact' : ''}`}>
      {bullets.map((bullet, index) => (
        <div key={bullet}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <p>{bullet}</p>
        </div>
      ))}
    </div>
  );
}

function StepCards({ rows }: { rows: SlideRow[] }) {
  return (
    <div className="creative-step-cards">
      {rows.map((row, index) => (
        <div key={row.code} className={`creative-step-card color-${index}`}>
          <span>{row.code}</span>
          <h2>{row.title}</h2>
          <p>{row.body}</p>
        </div>
      ))}
    </div>
  );
}

function StatTile({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: 'pink' | 'yellow' | 'green' | 'orange';
}) {
  return (
    <div className={`creative-stat-tile is-${color}`}>
      <strong>{value}</strong>
      <span>{label}</span>
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
          '--creative-scroll-frame-height': image.scrollFrameHeight ?? '560px',
          animationDuration: `${image.scrollDuration ?? 20}s`,
        } as CSSProperties)
      : undefined;

  return (
    <figure className={`creative-image-panel ${className}`}>
      <div className={image.scroll ? 'creative-scroll-window' : 'creative-image-window'}>
        <img
          src={image.src}
          alt={image.alt}
          className={fit === 'contain' ? 'creative-img-contain' : undefined}
          style={imageStyle}
        />
      </div>
      <figcaption>{image.label}</figcaption>
    </figure>
  );
}

function BarChart() {
  const bars = [
    ['A', 38, 'pink'],
    ['B', 64, 'yellow'],
    ['C', 46, 'green'],
    ['D', 82, 'orange'],
    ['E', 55, 'pink'],
  ];

  return (
    <div className="creative-bar-chart">
      <span>COST SIGNAL</span>
      <div>
        {bars.map(([label, height, color]) => (
          <i key={label} className={`is-${color}`} style={{ height: `${height}%` }}>
            <b>{label}</b>
          </i>
        ))}
      </div>
    </div>
  );
}

function CreativeStyles() {
  return (
    <style>
      {`
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+KR:wght@400;600;700&family=Noto+Serif+KR:wght@400;700;900&family=Space+Grotesk:wght@400;500;700&display=swap');

/* ===========================================
   CREATIVE MODE THEME
   =========================================== */
.creative-deck-root {
  --creative-cream: #EFE9D9;
  --creative-cream-2: #E4DCC4;
  --creative-ink: #0F0F0F;
  --creative-ink-2: #2A2A2A;
  --creative-green: #1F8A4C;
  --creative-green-dark: #136636;
  --creative-pink: #F06CA8;
  --creative-pink-dark: #D14E8B;
  --creative-orange: #E85A1F;
  --creative-yellow: #F5C518;
  --creative-display: "Archivo Black", "Noto Serif KR", sans-serif;
  --creative-body: "Space Grotesk", "Noto Sans KR", sans-serif;
  --creative-mono: "JetBrains Mono", ui-monospace, monospace;
  --stage-bg: #111111;
  --slide-bg: var(--creative-cream);
  position: fixed;
  inset: 0;
  overflow: hidden;
  color: var(--creative-ink);
  background: #111111;
}

/* ===========================================
   FIXED 16:9 STAGE: MANDATORY BASE STYLES
   Slides are authored at 1920x1080 and scaled as a whole.
   =========================================== */
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--stage-bg, #000);
}

.deck-viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--stage-bg, #000);
}

.deck-stage {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  transform-origin: 0 0;
  background: var(--slide-bg, #fff);
}

.slide {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  display: block;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  background: var(--slide-bg, #fff);
}

.slide.active,
.slide.visible {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}

img,
video,
canvas,
svg {
  max-width: 100%;
  max-height: 100%;
}

.deck-controls {
  position: fixed;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  z-index: 1000;
}

@media print {
  html,
  body {
    width: 1920px;
    height: auto;
    overflow: visible;
    background: #fff;
  }

  .deck-viewport {
    position: static;
    overflow: visible;
    background: #fff;
  }

  .deck-stage {
    position: static;
    width: auto;
    height: auto;
    transform: none !important;
    background: none;
  }

  .slide {
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

  .slide:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .deck-controls {
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

/* ===========================================
   STAGE CHROME
   =========================================== */
.creative-deck-stage {
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.28);
}

.creative-slide {
  font-family: var(--creative-body);
  background: var(--creative-cream);
  color: var(--creative-ink);
  transition: opacity 220ms linear;
}

.creative-topbar,
.creative-meta {
  position: absolute;
  left: 64px;
  right: 64px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--creative-mono);
  font-size: 22px;
  line-height: 1;
  letter-spacing: 0.08em;
  color: var(--creative-ink);
}

.creative-topbar {
  top: 48px;
}

.creative-meta {
  bottom: 40px;
}

.creative-pill {
  border: 2px solid var(--creative-ink);
  border-radius: 999px;
  padding: 8px 16px 7px;
}

.creative-meta > span:last-child {
  display: flex;
  align-items: center;
  gap: 14px;
}

.creative-meta i {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--creative-ink);
}

.creative-progress {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1200;
  height: 5px;
  background: var(--creative-pink);
  transition: width 240ms ease;
}

.creative-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 4px solid var(--creative-cream);
  background: var(--creative-ink);
}

.creative-controls button,
.creative-controls span {
  height: 38px;
  min-width: 46px;
  border: 2px solid var(--creative-cream);
  border-radius: 0;
  background: transparent;
  color: var(--creative-cream);
  font-family: var(--creative-mono);
  font-size: 14px;
  letter-spacing: 0.06em;
}

.creative-controls button {
  cursor: pointer;
}

.creative-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.creative-controls span {
  display: grid;
  min-width: 92px;
  place-items: center;
}

/* ===========================================
   TYPE AND COMMON LAYOUT
   =========================================== */
.creative-slide * {
  box-sizing: border-box;
}

.creative-slide h1,
.creative-slide h2,
.creative-slide p {
  margin: 0;
  word-break: keep-all;
}

.creative-content {
  position: absolute;
  inset: 116px 96px 160px;
  z-index: 2;
}

.creative-display {
  font-family: var(--creative-display);
  font-size: 108px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
  color: var(--creative-ink);
}

.creative-lead {
  max-width: 850px;
  font-family: var(--creative-body);
  font-size: 29px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--creative-ink-2);
}

.creative-kicker {
  display: inline-block;
  margin-bottom: 24px;
  background: var(--creative-ink);
  color: var(--creative-cream);
  padding: 10px 18px;
  font-family: var(--creative-mono);
  font-size: 22px;
  letter-spacing: 0.14em;
}

.creative-image-panel {
  position: relative;
  margin: 0;
  overflow: hidden;
  border: 4px solid var(--creative-ink);
  background: var(--creative-cream-2);
  box-shadow: 18px 18px 0 var(--creative-ink);
}

.creative-image-window,
.creative-scroll-window {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.creative-image-panel img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.creative-image-panel img.creative-img-contain {
  object-fit: contain;
}

.creative-scroll-window img {
  height: auto;
  max-height: none;
  object-fit: initial;
  animation-name: creativeAutoScroll;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

.creative-image-panel figcaption {
  position: absolute;
  left: 18px;
  bottom: 18px;
  padding: 9px 12px;
  border: 3px solid var(--creative-ink);
  background: var(--creative-yellow);
  font-family: var(--creative-mono);
  font-size: 14px;
  letter-spacing: 0.08em;
}

.creative-bullet-blocks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.creative-bullet-blocks.is-compact {
  grid-template-columns: 1fr;
}

.creative-bullet-blocks > div {
  min-height: 155px;
  border: 4px solid var(--creative-ink);
  background: var(--creative-yellow);
  padding: 24px;
  box-shadow: 12px 12px 0 var(--creative-ink);
}

.creative-bullet-blocks > div:nth-child(2) {
  background: var(--creative-pink);
}

.creative-bullet-blocks > div:nth-child(3) {
  background: var(--creative-green);
  color: var(--creative-cream);
}

.creative-bullet-blocks span,
.creative-step-card span,
.creative-problem-card span,
.creative-score-card span,
.creative-diff-cell span,
.creative-closing-grid span {
  font-family: var(--creative-mono);
  font-size: 22px;
  letter-spacing: 0.08em;
}

.creative-bullet-blocks p {
  margin-top: 18px;
  font-size: 25px;
  font-weight: 600;
  line-height: 1.35;
}

.creative-stat-tile {
  border: 4px solid var(--creative-ink);
  padding: 24px;
  min-height: 142px;
}

.creative-stat-tile strong {
  display: block;
  font-family: var(--creative-display);
  font-size: 72px;
  line-height: 0.9;
}

.creative-stat-tile span {
  display: block;
  margin-top: 12px;
  font-size: 22px;
  font-weight: 700;
}

.creative-stat-tile.is-pink {
  background: var(--creative-pink);
}

.creative-stat-tile.is-yellow {
  background: var(--creative-yellow);
}

.creative-stat-tile.is-green {
  background: var(--creative-green);
  color: var(--creative-cream);
}

.creative-stat-tile.is-orange {
  background: var(--creative-orange);
  color: var(--creative-cream);
}

/* ===========================================
   COVER
   =========================================== */
.creative-cover-layout {
  inset: 116px 80px 160px 96px;
}

.creative-cover-copy {
  position: absolute;
  left: 0;
  top: 38px;
  width: 760px;
  z-index: 2;
}

.creative-cover-copy .creative-display {
  font-size: 132px;
}

.creative-cover-copy .creative-lead {
  margin-top: 32px;
}

.creative-switch {
  position: absolute;
  right: 80px;
  top: -4px;
  width: 320px;
  height: 170px;
  border: 4px solid var(--creative-ink);
  background: var(--creative-pink);
  box-shadow: 24px 24px 0 var(--creative-orange), 24px 24px 0 4px var(--creative-ink);
}

.creative-switch span {
  position: absolute;
  left: 46px;
  top: 54px;
  width: 220px;
  height: 58px;
  border: 4px solid var(--creative-ink);
  background: var(--creative-yellow);
  transform: skewX(-16deg);
}

.creative-cover-image {
  position: absolute;
  right: 72px;
  bottom: 235px;
  width: 760px;
  height: 360px;
}

.creative-stats-strip {
  position: absolute;
  left: 0;
  right: 72px;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

/* ===========================================
   CONTENT LAYOUTS
   =========================================== */
.creative-problem-layout .creative-display,
.creative-thesis-layout .creative-display,
.creative-formula-layout .creative-display,
.creative-score-layout .creative-display,
.creative-demo-layout .creative-display,
.creative-difference-layout .creative-display,
.creative-ip-layout .creative-display,
.creative-preference-layout .creative-display {
  max-width: 980px;
}

.creative-problem-layout .creative-lead,
.creative-score-layout .creative-lead,
.creative-demo-layout .creative-lead,
.creative-difference-layout .creative-lead,
.creative-ip-layout .creative-lead,
.creative-preference-layout .creative-lead {
  margin-top: 28px;
}

.creative-problem-grid {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.creative-problem-card,
.creative-score-card,
.creative-step-card,
.creative-diff-cell {
  border: 4px solid var(--creative-ink);
  padding: 26px;
  box-shadow: 12px 12px 0 var(--creative-ink);
}

.creative-problem-card {
  min-height: 306px;
}

.creative-problem-card.color-0,
.creative-score-card.color-0,
.creative-step-card.color-0,
.creative-diff-cell.color-0 {
  background: var(--creative-yellow);
}

.creative-problem-card.color-1,
.creative-score-card.color-1,
.creative-step-card.color-1,
.creative-diff-cell.color-1 {
  background: var(--creative-pink);
}

.creative-problem-card.color-2,
.creative-score-card.color-2,
.creative-step-card.color-2,
.creative-diff-cell.color-2 {
  background: var(--creative-orange);
  color: var(--creative-cream);
}

.creative-problem-card.color-3,
.creative-step-card.color-3,
.creative-diff-cell.color-3 {
  background: var(--creative-green);
  color: var(--creative-cream);
}

.creative-problem-card h2,
.creative-score-card h2,
.creative-step-card h2,
.creative-diff-cell h2 {
  margin-top: 22px;
  font-family: var(--creative-display);
  font-size: 38px;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: 0;
}

.creative-problem-card p,
.creative-score-card p,
.creative-step-card p,
.creative-diff-cell p {
  margin-top: 18px;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.42;
}

.creative-thesis-layout .creative-display {
  margin-top: 88px;
  font-size: 124px;
}

.creative-thesis-layout .creative-lead {
  margin-top: 30px;
  max-width: 980px;
}

.creative-marker {
  position: absolute;
  right: 84px;
  top: 48px;
  width: 330px;
  height: 160px;
  display: grid;
  place-items: center;
  border: 4px solid var(--creative-ink);
  background: var(--creative-pink);
  box-shadow: 24px 24px 0 var(--creative-orange), 24px 24px 0 4px var(--creative-ink);
  font-family: var(--creative-display);
  font-size: 46px;
  transform: rotate(-4deg);
}

.creative-thesis-layout .creative-bullet-blocks {
  position: absolute;
  left: 0;
  right: 84px;
  bottom: 0;
}

.creative-two-col {
  display: grid;
  grid-template-columns: 0.74fr 1fr;
  gap: 48px;
  align-items: stretch;
}

.creative-two-col .creative-display {
  font-size: 100px;
}

.creative-two-col .creative-lead,
.creative-screen-layout .creative-lead {
  margin-top: 30px;
}

.creative-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 54px;
}

.creative-diagram {
  min-height: 700px;
}

.creative-diagram img {
  object-fit: contain;
  padding: 28px;
}

.creative-formula-layout {
  display: grid;
  grid-template-columns: 1fr 0.82fr;
  grid-template-rows: 112px 330px 220px;
  row-gap: 56px;
  column-gap: 44px;
}

.creative-formula-layout .creative-display {
  grid-column: 1 / -1;
}

.creative-formula-box {
  border: 4px solid var(--creative-ink);
  background: var(--creative-pink);
  padding: 30px 34px;
  box-shadow: 24px 24px 0 var(--creative-orange), 24px 24px 0 4px var(--creative-ink);
}

.creative-formula-box span {
  font-family: var(--creative-mono);
  font-size: 22px;
  letter-spacing: 0.12em;
}

.creative-formula-box strong {
  display: block;
  margin-top: 24px;
  font-family: var(--creative-display);
  font-size: 58px;
  font-weight: 900;
  line-height: 1.05;
}

.creative-formula-layout .creative-bullet-blocks {
  grid-template-columns: 1fr;
  gap: 24px;
}

.creative-formula-layout .creative-bullet-blocks > div {
  min-height: 94px;
  padding: 16px 20px;
  box-shadow: 8px 8px 0 var(--creative-ink);
}

.creative-formula-layout .creative-bullet-blocks p {
  margin-top: 10px;
  font-size: 18px;
  line-height: 1.2;
}

.creative-bar-chart {
  grid-column: 1 / -1;
  border: 4px solid var(--creative-ink);
  background: var(--creative-cream-2);
  padding: 18px 28px 28px;
}

.creative-bar-chart > span {
  font-family: var(--creative-mono);
  font-size: 22px;
  letter-spacing: 0.12em;
}

.creative-bar-chart > div {
  display: flex;
  height: 128px;
  align-items: flex-end;
  gap: 30px;
  margin-top: 18px;
  border-left: 3px solid var(--creative-ink);
  border-bottom: 3px solid var(--creative-ink);
  padding-left: 26px;
}

.creative-bar-chart i {
  position: relative;
  display: block;
  width: 110px;
  border: 3px solid var(--creative-ink);
  background: var(--creative-yellow);
}

.creative-bar-chart i.is-pink {
  background: var(--creative-pink);
}

.creative-bar-chart i.is-green {
  background: var(--creative-green);
}

.creative-bar-chart i.is-orange {
  background: var(--creative-orange);
}

.creative-bar-chart b {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--creative-mono);
  font-size: 18px;
  font-style: normal;
}

.creative-layer-tags {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  margin-top: 50px;
}

.creative-layer-tags span {
  display: block;
  border: 4px solid var(--creative-ink);
  background: var(--creative-yellow);
  padding: 20px 24px;
  font-family: var(--creative-display);
  font-size: 42px;
}

.creative-layer-tags span:nth-child(2) {
  background: var(--creative-pink);
}

.creative-layer-tags span:nth-child(3) {
  background: var(--creative-green);
  color: var(--creative-cream);
}

.creative-score-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 36px;
}

.creative-score-card {
  min-height: 270px;
}

.creative-score-card small {
  display: block;
  margin-top: 22px;
  font-family: var(--creative-mono);
  font-size: 18px;
  letter-spacing: 0.08em;
}

.creative-equation {
  margin-top: 42px;
  border: 4px solid var(--creative-ink);
  background: var(--creative-yellow);
  padding: 28px 32px;
  font-family: var(--creative-display);
  font-size: 42px;
  line-height: 1.12;
}

.creative-screen-layout {
  display: grid;
  grid-template-columns: 0.58fr 1fr;
  gap: 46px;
  align-items: stretch;
}

.creative-screen-layout .creative-display {
  font-size: 96px;
}

.creative-screen-layout .creative-bullet-blocks {
  margin-top: 40px;
}

.creative-screen {
  min-height: 690px;
}

.creative-dashboard-panel {
  height: 560px;
  align-self: start;
}

.creative-preference-layout .creative-display,
.creative-demo-layout .creative-display,
.creative-difference-layout .creative-display {
  font-size: 96px;
}

.creative-step-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
  margin-top: 42px;
}

.creative-preference-layout .creative-step-cards {
  grid-template-columns: repeat(3, 1fr);
}

.creative-step-card {
  min-height: 260px;
}

.creative-step-card h2 {
  font-size: 40px;
}

.creative-weight-bars {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 34px;
}

.creative-weight-bars div {
  border: 4px solid var(--creative-ink);
  background: var(--creative-cream-2);
  padding: 22px;
}

.creative-weight-bars span {
  font-family: var(--creative-mono);
  font-size: 20px;
  letter-spacing: 0.06em;
}

.creative-weight-bars strong {
  display: block;
  margin-top: 12px;
  font-family: var(--creative-display);
  font-size: 54px;
}

.creative-weight-bars i {
  display: block;
  height: 18px;
  margin-top: 16px;
  border: 3px solid var(--creative-ink);
  background: var(--creative-cream);
}

.creative-weight-bars b {
  display: block;
  height: 100%;
  background: var(--creative-green);
}

.creative-diff-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
  margin-top: 36px;
}

.creative-diff-cell {
  min-height: 216px;
}

.creative-ip-layout .creative-display {
  font-size: 86px;
}

.creative-ip-layout .creative-lead {
  max-width: 1080px;
}

.creative-ip-table {
  margin-top: 28px;
  border: 4px solid var(--creative-ink);
  background: var(--creative-cream-2);
}

.creative-ip-head,
.creative-ip-row {
  display: grid;
  grid-template-columns: 80px 0.6fr 1.2fr 0.48fr;
  gap: 0;
}

.creative-ip-head {
  background: var(--creative-ink);
  color: var(--creative-cream);
  font-family: var(--creative-display);
  font-size: 24px;
}

.creative-ip-head span,
.creative-ip-row > span,
.creative-ip-row strong,
.creative-ip-row p,
.creative-ip-row em {
  min-height: 54px;
  border-right: 3px solid var(--creative-ink);
  padding: 15px 18px;
}

.creative-ip-head span {
  border-right-color: var(--creative-cream);
}

.creative-ip-head span:last-child,
.creative-ip-row em {
  border-right: 0;
}

.creative-ip-row {
  border-top: 3px solid var(--creative-ink);
}

.creative-ip-row > span,
.creative-ip-row em {
  font-family: var(--creative-mono);
  font-size: 16px;
  letter-spacing: 0.06em;
  font-style: normal;
}

.creative-ip-row strong {
  font-family: var(--creative-display);
  font-size: 24px;
  line-height: 1.12;
}

.creative-ip-row p {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
}

.creative-closing {
  background: var(--creative-green);
  color: var(--creative-cream);
}

.creative-closing .creative-topbar,
.creative-closing .creative-meta,
.creative-closing .creative-lead,
.creative-closing .creative-display {
  color: var(--creative-cream);
}

.creative-closing .creative-pill {
  border-color: var(--creative-cream);
}

.creative-closing .creative-meta i {
  background: var(--creative-cream);
}

.creative-closing-layout .creative-display {
  margin-top: 86px;
  max-width: 1360px;
  font-size: 128px;
}

.creative-closing-layout .creative-lead {
  margin-top: 34px;
  max-width: 1120px;
  color: var(--creative-cream);
}

.creative-stamp {
  position: absolute;
  right: 78px;
  top: 74px;
  width: 220px;
  height: 220px;
  display: grid;
  place-items: center;
  border: 4px solid var(--creative-cream);
  background: var(--creative-pink);
  transform: rotate(-6deg);
}

.creative-stamp::after {
  content: '';
  position: absolute;
  inset: 24px;
  border: 4px solid var(--creative-cream);
  border-radius: 50%;
}

.creative-stamp span {
  position: relative;
  z-index: 1;
  font-family: var(--creative-display);
  font-size: 64px;
}

.creative-closing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 74px;
}

.creative-closing-grid div {
  min-height: 160px;
  border: 4px solid var(--creative-cream);
  background: var(--creative-yellow);
  color: var(--creative-ink);
  padding: 24px;
}

.creative-closing-grid div:nth-child(2) {
  background: var(--creative-pink);
}

.creative-closing-grid div:nth-child(3) {
  background: var(--creative-cream);
}

.creative-closing-grid p {
  margin-top: 16px;
  font-size: 27px;
  font-weight: 700;
  line-height: 1.25;
}

@keyframes creativeAutoScroll {
  0%,
  14% {
    transform: translateY(0);
  }

  86%,
  100% {
    transform: translateY(calc(-100% + var(--creative-scroll-frame-height, 560px)));
  }
}
      `}
    </style>
  );
}
