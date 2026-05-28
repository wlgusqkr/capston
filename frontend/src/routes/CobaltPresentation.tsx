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
  | 'manifesto'
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
  num: string;
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
    eyebrow: 'FINAL PRESENTATION / TEAM PROJECT',
    title: '슬기로운 자취생활',
    lead: '매물을 보기 전에, 예산과 생활 기준에 맞는 동네 후보를 먼저 압축하는 자취 의사결정 서비스',
    kind: 'cover',
    image: {
      src: mainMapRealImage,
      alt: '조건 필터와 행정동별 거래량 분포를 보여주는 자취맵 메인 지도',
      label: 'MAIN MAP / REAL DATA',
    },
  },
  {
    eyebrow: 'PROBLEM',
    title: '매물보다 먼저 막히는 질문',
    lead: '자취 초보자는 좋은 방을 찾기 전에 어느 동네부터 봐야 하는지에서 막힙니다.',
    kind: 'problem',
    rows: [
      {
        num: '01',
        title: '정보가 흩어져 있음',
        body: '월세, 통학, 생활시설, 교통 정보가 서로 다른 서비스와 데이터셋에 분산됩니다.',
        tag: 'fragmented',
      },
      {
        num: '02',
        title: '공간 기준이 다름',
        body: '실거래는 법정동, 탐색은 행정동, 생활시설은 좌표 기준이라 바로 비교하기 어렵습니다.',
        tag: 'spatial mismatch',
      },
      {
        num: '03',
        title: '평균만으로 부족함',
        body: '평균 월세 하나로는 실제 예산, 면적, 주거 유형, 위치 체감 차이를 설명하기 어렵습니다.',
        tag: 'weak signal',
      },
      {
        num: '04',
        title: '선호를 숫자로 말하기 어려움',
        body: '사용자는 교통과 시설 중 무엇을 더 중요하게 보는지 명확한 가중치로 표현하기 어렵습니다.',
        tag: 'implicit preference',
      },
    ],
  },
  {
    eyebrow: 'SERVICE THESIS',
    title: '데이터 목록이 아니라, 판단 단위',
    lead: '우리는 매물 추천 이전 단계에서 사용자가 볼 동네 후보를 줄이는 문제를 풀었습니다.',
    kind: 'manifesto',
    bullets: [
      '흩어진 공공데이터를 자취생이 이해할 수 있는 기준으로 재구성',
      '법정동, 행정동, 좌표 데이터를 하나의 지도 위에서 연결',
      '동네 평균과 특정 위치 주변 생활환경을 함께 분석',
    ],
  },
  {
    eyebrow: 'DATA RESEARCH',
    title: '흩어진 공공데이터를 하나의 흐름으로',
    lead: '가져오는 것보다 중요한 일은 서로 다른 기준의 데이터를 비교 가능한 동네 단위로 맞추는 것이었습니다.',
    kind: 'pipeline',
    image: {
      src: dataPipelineImage,
      alt: '공공데이터 수집, 정제, 공간 결합, 사전 집계 파이프라인',
      label: 'DATA PIPELINE',
    },
  },
  {
    eyebrow: 'RESEARCH 01',
    title: '비용 기준: 환산월세',
    lead: '보증금과 월세가 분리되어 있으면 동네별 비용 부담을 바로 비교하기 어렵습니다.',
    kind: 'formula',
    bullets: [
      '보증금을 월세 부담으로 환산해 하나의 비용 지표로 통합',
      '최근 실거래를 기준으로 행정동별 비용 부담 계산',
      '비용이 낮을수록 전월세 점수가 높아지도록 변환',
    ],
  },
  {
    eyebrow: 'RESEARCH 02',
    title: '공간 매핑: 다른 좌표계를 하나로',
    lead: '법정동, 행정동, 좌표가 서로 다른 언어로 말하던 데이터를 하나의 지도 기준으로 맞췄습니다.',
    kind: 'mapping',
    image: {
      src: spatialMappingImage,
      alt: '법정동, 행정동, 좌표 데이터를 행정동 기준으로 정렬하는 공간 매핑 구조',
      label: 'SPATIAL JOIN',
    },
  },
  {
    eyebrow: 'RESEARCH 03',
    title: '자취 적합도: 고정 답이 아닌 조합',
    lead: '좋은 동네는 하나로 고정되지 않습니다. 사용자마다 중요하게 보는 기준이 다르기 때문입니다.',
    kind: 'score',
    rows: [
      {
        num: 'R',
        title: '전월세 점수',
        body: '환산월세 기반 비용 부담을 점수화합니다.',
        tag: 'rent',
      },
      {
        num: 'L',
        title: '생활시설 점수',
        body: '카페, 편의점, 병원, 약국, 마트, 공원 등 주변 생활 신호를 반영합니다.',
        tag: 'life',
      },
      {
        num: 'T',
        title: '교통 점수',
        body: '지하철 접근성과 버스 정류장 밀도를 이동 편의 신호로 사용합니다.',
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
      alt: '원격 DB 데이터를 기반으로 조건 필터와 거래량 분포를 보여주는 지도 화면',
      label: 'MATCH MAP / FILTERED DEALS',
    },
    bullets: [
      '보증금, 월세, 면적, 주거유형, 기간 필터',
      '조건을 만족한 실거래 수를 행정동별로 집계',
      '거래량 쏠림은 log scale로 완화',
    ],
  },
  {
    eyebrow: 'SERVICE 02',
    title: '위치 점수와 동네 대시보드',
    lead: '같은 행정동 안에서도 위치가 다르면 체감 생활환경은 달라집니다.',
    kind: 'dashboard',
    image: {
      src: dashboardScrollImage,
      alt: '오류2동의 월세, 거래, 자취초 지수, 차트, 편의시설 지표를 보여주는 대시보드',
      label: 'NEIGHBORHOOD DASHBOARD / O-ryu 2-dong',
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
        num: 'A/B',
        title: '두 동네 중 더 끌리는 쪽 선택',
        body: '직접 가중치를 입력하지 않고 비교 선택으로 선호 신호를 수집합니다.',
        tag: 'pairwise',
      },
      {
        num: 'W',
        title: '개인 가중치 추정',
        body: '선택 결과를 월세, 생활시설, 교통 중요도의 조합으로 변환합니다.',
        tag: 'weights',
      },
      {
        num: 'MAP',
        title: '추천 결과에 즉시 반영',
        body: '지도 색상, 비교 결과, 추천 근거가 개인 기준에 맞게 바뀝니다.',
        tag: 'feedback',
      },
    ],
  },
  {
    eyebrow: 'AI EXPERIENCE',
    title: '질문하면 조회합니다',
    lead: 'AI는 단순 채팅이 아니라 서비스 데이터 조회 흐름과 연결됩니다.',
    kind: 'ai',
    image: {
      src: aiArchitectureImage,
      alt: '사용자 질문을 의도 분류, 읽기 전용 SQL, 검증, 답변으로 연결하는 AI 구조도',
      label: 'AI QUERY ARCHITECTURE',
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
    lead: '발표 데모는 사용자가 실제로 동네 후보를 좁히는 순서를 그대로 따라갑니다.',
    kind: 'demo',
    rows: [
      {
        num: '01',
        title: '지도에서 전체 후보 확인',
        body: '서울 행정동 단위로 자취 신호와 조건 매칭 분포를 봅니다.',
      },
      {
        num: '02',
        title: '예산 조건 적용',
        body: '보증금, 월세, 면적, 주거 유형으로 실제 거래 후보를 압축합니다.',
      },
      {
        num: '03',
        title: '상세와 비교',
        body: '대시보드, 차트, 시설 표를 보고 후보 동네를 비교합니다.',
      },
      {
        num: '04',
        title: 'AI로 근거 확인',
        body: '마지막 궁금증은 자연어로 묻고 데이터 기반 답변을 받습니다.',
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
        num: 'D1',
        title: '자취생 관점의 적합도 모델',
        body: '비용, 생활, 교통을 매물 이전 단계의 동네 판단 기준으로 재구성했습니다.',
      },
      {
        num: 'D2',
        title: '공간 결합',
        body: '법정동, 행정동, 좌표 기준 데이터를 하나의 분석 단위로 연결했습니다.',
      },
      {
        num: 'D3',
        title: '개인 선호 학습',
        body: '사용자의 선택을 점수 가중치로 바꿔 지도와 추천 결과에 반영합니다.',
      },
      {
        num: 'D4',
        title: '운영 가능한 갱신 구조',
        body: '공공데이터 업데이트와 점수 재계산을 반복할 수 있는 구조를 갖췄습니다.',
      },
    ],
  },
  {
    eyebrow: 'IP LENS / PATENT ATTORNEY AUDIENCE',
    title: '권리화 검토 포인트',
    lead: '최종 발표에서는 구현 결과뿐 아니라 어떤 기술 구성이 차별화 자산이 될 수 있는지도 함께 보여줍니다.',
    kind: 'ip',
    rows: [
      {
        num: '01',
        title: '이종 공간 기준 결합',
        body: '법정동 실거래, 행정동 서비스 단위, 좌표 시설 데이터를 하나의 판단 단위로 변환합니다.',
        tag: 'data normalization',
      },
      {
        num: '02',
        title: '개인 선호 기반 점수 조정',
        body: '비교 선택에서 추정한 가중치를 비용, 생활, 교통 점수 조합에 반영합니다.',
        tag: 'preference model',
      },
      {
        num: '03',
        title: '안전한 자연어 데이터 조회',
        body: '질문 의도, 테이블 선택, 읽기 전용 SQL 생성, 검증을 거쳐 답변합니다.',
        tag: 'guarded query',
      },
      {
        num: '04',
        title: '갱신 가능한 점수 산출 파이프라인',
        body: '공공데이터 수집, 상태 관리, 재계산, 관찰 가능성을 운영 구조로 연결했습니다.',
        tag: 'recalculation loop',
      },
    ],
  },
  {
    eyebrow: 'OPERATION',
    title: '일회성 데모가 아닌 갱신 구조',
    lead: '최신 공공데이터를 다시 수집하고 점수를 재계산해 서비스에 반영할 수 있습니다.',
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

export default function CobaltPresentation() {
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
    <main className="cobalt-deck-root" aria-label="슬기로운 자취생활 cobalt-grid 최종 발표자료">
      <CobaltStyles />
      <div className="cobalt-progress" style={{ width: `${progress}%` }} />

      <div className="deck-viewport cobalt-deck-viewport">
        <div ref={stageRef} id="cobaltDeckStage" className="deck-stage cobalt-deck-stage">
          {slides.map((slide, slideIndex) => (
            <section
              key={`${slide.eyebrow}-${slide.title}`}
              className={`slide cobalt-slide ${slideIndex === index ? 'active visible' : ''}`}
              aria-hidden={slideIndex !== index}
            >
              <SlideChrome current={slideIndex + 1} total={slides.length} />
              <SlideContent slide={slide} />
            </section>
          ))}
        </div>
      </div>

      <div className="deck-controls cobalt-controls" aria-label="슬라이드 조작">
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

function SlideChrome({ current, total }: { current: number; total: number }) {
  return (
    <>
      <span className="cobalt-hairline cobalt-hairline-top" aria-hidden="true" />
      <span className="cobalt-hairline cobalt-hairline-bottom" aria-hidden="true" />
      <span className="cobalt-nav-hint">ARROWS / SPACE / F</span>
      <span className="cobalt-page-num">
        {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </>
  );
}

function SlideContent({ slide }: { slide: Slide }) {
  if (slide.kind === 'cover') return <CoverSlide slide={slide} />;
  if (slide.kind === 'problem') return <ProblemSlide slide={slide} />;
  if (slide.kind === 'manifesto') return <ManifestoSlide slide={slide} />;
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

function Topbar({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) {
  return (
    <header className="cobalt-topbar reveal">
      <div>
        <p className="cobalt-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span>{meta}</span>
    </header>
  );
}

function CoverSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-cover">
      <QrBlock className="cobalt-cover-qr" />
      <div className="cobalt-cover-copy">
        <p className="cobalt-eyebrow reveal">{slide.eyebrow}</p>
        <h1 className="reveal">{slide.title}</h1>
        <p className="cobalt-cover-lead reveal">{slide.lead}</p>
        <div className="cobalt-cover-meta reveal">
          <span>PUBLIC DATA</span>
          <span>SPATIAL JOIN</span>
          <span>PREFERENCE MODEL</span>
        </div>
      </div>
      {slide.image && (
        <ImageFrame className="cobalt-cover-image reveal" image={slide.image} fit="contain" />
      )}
    </div>
  );
}

function ProblemSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="USER DECISION BOTTLENECK" />
      <div className="cobalt-problem-grid">
        <p className="cobalt-lead reveal">{slide.lead}</p>
        <IndexRows rows={slide.rows ?? []} />
      </div>
    </div>
  );
}

function ManifestoSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-manifesto">
      <PixelGlitch id="manifesto-glitch" className="cobalt-glitch-side" />
      <QrBlock className="cobalt-manifesto-qr" />
      <p className="cobalt-eyebrow reveal">{slide.eyebrow}</p>
      <h2 className="reveal">
        데이터 목록이 아니라
        <br />
        <em>자취 결정을 위한</em>
        <br />
        판단 단위로 재구성
      </h2>
      <p className="cobalt-manifesto-lead reveal">{slide.lead}</p>
      <BulletLedger bullets={slide.bullets ?? []} />
    </div>
  );
}

function PipelineSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="COLLECT / NORMALIZE / AGGREGATE" />
      <div className="cobalt-two-col">
        <div className="cobalt-copy-block">
          <p className="cobalt-lead reveal">{slide.lead}</p>
          <MiniStats
            items={[
              ['5+', '공공데이터 범주'],
              ['3', '공간 기준 연결'],
              ['1', '동네 판단 흐름'],
            ]}
          />
        </div>
        {slide.image && <ImageFrame image={slide.image} className="cobalt-diagram-frame reveal" />}
      </div>
    </div>
  );
}

function FormulaSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="RENT NORMALIZATION" />
      <div className="cobalt-formula-layout">
        <div className="cobalt-formula-card reveal">
          <p>환산월세</p>
          <strong>= 월세 + 보증금 × 0.005</strong>
        </div>
        <BulletLedger bullets={slide.bullets ?? []} />
        <PixelStackChart
          label="COST BURDEN BY NEIGHBORHOOD"
          bars={[
            ['A', 5],
            ['B', 7],
            ['C', 4],
            ['D', 9],
            ['E', 6],
            ['F', 3],
            ['G', 8],
          ]}
        />
      </div>
    </div>
  );
}

function MappingSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="LEGAL DONG / ADMIN DONG / POINT" />
      <div className="cobalt-map-research">
        <p className="cobalt-lead reveal">{slide.lead}</p>
        {slide.image && <ImageFrame image={slide.image} className="cobalt-wide-diagram reveal" />}
        <div className="cobalt-map-tags reveal">
          <span>실거래: 법정동</span>
          <span>서비스: 행정동</span>
          <span>시설: 좌표</span>
          <span>결과: 지도 판단 단위</span>
        </div>
      </div>
    </div>
  );
}

function ScoreSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="WEIGHTED SUITABILITY SCORE" />
      <div className="cobalt-score-layout">
        <p className="cobalt-lead reveal">{slide.lead}</p>
        <div className="cobalt-score-cards">
          {(slide.rows ?? []).map((row, rowIndex) => (
            <div key={row.title} className="cobalt-score-card reveal">
              <span>{row.num}</span>
              <h3>{row.title}</h3>
              <p>{row.body}</p>
              <div className="cobalt-score-bar" aria-hidden="true">
                <i style={{ width: `${[72, 58, 66][rowIndex]}%` }} />
              </div>
              <small>{row.tag}</small>
            </div>
          ))}
        </div>
        <div className="cobalt-equation reveal">
          종합점수 = 전월세×w1 + 생활시설×w2 + 교통×w3
        </div>
      </div>
    </div>
  );
}

function MapSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="MATCH COUNT / LOG SCALE MAP" />
      <div className="cobalt-screen-layout">
        {slide.image && <ImageFrame image={slide.image} className="cobalt-screen-frame reveal" fit="contain" />}
        <div className="cobalt-screen-copy">
          <p className="cobalt-lead reveal">{slide.lead}</p>
          <BulletLedger bullets={slide.bullets ?? []} />
        </div>
      </div>
    </div>
  );
}

function DashboardSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="1KM KERNEL / DONG DASHBOARD" />
      <div className="cobalt-dashboard-layout">
        <div>
          <p className="cobalt-lead reveal">{slide.lead}</p>
          <BulletLedger bullets={slide.bullets ?? []} />
        </div>
        {slide.image && <ImageFrame image={slide.image} className="cobalt-dashboard-frame reveal" />}
      </div>
    </div>
  );
}

function PreferenceSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="PAIRWISE CHOICE / WEIGHT UPDATE" />
      <div className="cobalt-preference-layout">
        <p className="cobalt-lead reveal">{slide.lead}</p>
        <div className="cobalt-preference-flow">
          {(slide.rows ?? []).map((row) => (
            <div key={row.num} className="cobalt-preference-step reveal">
              <span>{row.num}</span>
              <h3>{row.title}</h3>
              <p>{row.body}</p>
              <small>{row.tag}</small>
            </div>
          ))}
        </div>
        <PreferenceBars />
      </div>
    </div>
  );
}

function AiSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="NL QUESTION / READ-ONLY SQL / ANSWER" />
      <div className="cobalt-ai-layout">
        <div>
          <p className="cobalt-lead reveal">{slide.lead}</p>
          <BulletLedger bullets={slide.bullets ?? []} />
        </div>
        {slide.image && <ImageFrame image={slide.image} className="cobalt-ai-frame reveal" />}
      </div>
    </div>
  );
}

function DemoSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="LIVE PRESENTATION PATH" />
      <div className="cobalt-demo-layout">
        <p className="cobalt-lead reveal">{slide.lead}</p>
        <div className="cobalt-demo-steps">
          {(slide.rows ?? []).map((row) => (
            <div key={row.num} className="cobalt-demo-step reveal">
              <span>{row.num}</span>
              <h3>{row.title}</h3>
              <p>{row.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DifferenceSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="WHY THIS IS NOT JUST A MAP" />
      <div className="cobalt-difference-layout">
        <p className="cobalt-lead reveal">{slide.lead}</p>
        <div className="cobalt-difference-grid">
          {(slide.rows ?? []).map((row) => (
            <div key={row.num} className="cobalt-difference-cell reveal">
              <span>{row.num}</span>
              <h3>{row.title}</h3>
              <p>{row.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IpSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="CLAIM CANDIDATE / IMPLEMENTATION / EFFECT" />
      <div className="cobalt-ip-layout">
        <p className="cobalt-lead reveal">{slide.lead}</p>
        <div className="cobalt-ip-table reveal">
          <div className="cobalt-ip-head">
            <span>No.</span>
            <span>검토 축</span>
            <span>구현 내용</span>
            <span>기술 효과</span>
          </div>
          {(slide.rows ?? []).map((row) => (
            <div key={row.num} className="cobalt-ip-row">
              <span>{row.num}</span>
              <strong>{row.title}</strong>
              <p>{row.body}</p>
              <em>{row.tag}</em>
            </div>
          ))}
        </div>
        <p className="cobalt-ip-note reveal">
          선행기술 검토 전 단계의 후보 정리입니다. 발표에서는 구현된 문제 해결 구조와 효과를 중심으로 설명합니다.
        </p>
      </div>
    </div>
  );
}

function OperationSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-frame">
      <Topbar eyebrow={slide.eyebrow} title={slide.title} meta="UPDATE / LOCK / OBSERVABILITY" />
      <div className="cobalt-operation-layout">
        <div>
          <p className="cobalt-lead reveal">{slide.lead}</p>
          <BulletLedger bullets={slide.bullets ?? []} />
        </div>
        {slide.image && <ImageFrame image={slide.image} className="cobalt-operation-frame reveal" />}
      </div>
    </div>
  );
}

function ClosingSlide({ slide }: { slide: Slide }) {
  return (
    <div className="cobalt-closing">
      <p className="cobalt-eyebrow reveal">{slide.eyebrow}</p>
      <h2 className="reveal">{slide.title}</h2>
      <p className="cobalt-closing-lead reveal">{slide.lead}</p>
      <div className="cobalt-closing-grid reveal">
        {(slide.bullets ?? []).map((bullet, bulletIndex) => (
          <div key={bullet}>
            <span>{String(bulletIndex + 1).padStart(2, '0')}</span>
            <p>{bullet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndexRows({ rows }: { rows: SlideRow[] }) {
  return (
    <div className="cobalt-index-rows">
      {rows.map((row) => (
        <div key={row.num} className="cobalt-index-row reveal">
          <span>{row.num}</span>
          <div>
            <h3>{row.title}</h3>
            <p>{row.body}</p>
          </div>
          {row.tag && <small>{row.tag}</small>}
        </div>
      ))}
    </div>
  );
}

function BulletLedger({ bullets }: { bullets: string[] }) {
  return (
    <div className="cobalt-bullet-ledger reveal">
      {bullets.map((bullet, bulletIndex) => (
        <div key={bullet}>
          <span>{String(bulletIndex + 1).padStart(2, '0')}</span>
          <p>{bullet}</p>
        </div>
      ))}
    </div>
  );
}

function MiniStats({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="cobalt-mini-stats reveal">
      {items.map(([value, label]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ImageFrame({
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
          '--cobalt-scroll-frame-height': image.scrollFrameHeight ?? '560px',
          animationDuration: `${image.scrollDuration ?? 20}s`,
        } as CSSProperties)
      : undefined;

  return (
    <figure className={`cobalt-image-frame ${className}`}>
      <div className={image.scroll ? 'cobalt-scroll-window' : 'cobalt-image-window'}>
        <img
          src={image.src}
          alt={image.alt}
          className={fit === 'contain' ? 'cobalt-img-contain' : undefined}
          style={imageStyle}
        />
      </div>
      <figcaption>{image.label}</figcaption>
    </figure>
  );
}

function PixelStackChart({ label, bars }: { label: string; bars: Array<[string, number]> }) {
  return (
    <div className="cobalt-pixel-chart reveal">
      <p>{label}</p>
      <div className="cobalt-pixel-bars">
        {bars.map(([barLabel, count]) => (
          <div key={barLabel} className="cobalt-pixel-bar">
            <div>
              {Array.from({ length: 10 }, (_, cellIndex) => (
                <i key={cellIndex} className={cellIndex < count ? 'on' : undefined} />
              ))}
            </div>
            <span>{barLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreferenceBars() {
  return (
    <div className="cobalt-preference-bars reveal">
      {[
        ['월세 민감도', 72],
        ['생활시설 선호', 58],
        ['교통 중요도', 81],
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
  );
}

function QrBlock({ className = '' }: { className?: string }) {
  const activeCells = new Set([
    0, 1, 2, 5, 7, 8, 10, 13, 15, 16, 19, 21, 22, 24, 25, 28, 31, 33, 34, 36, 39,
    40, 43, 45, 47, 48, 50, 51, 54, 56, 57, 58, 60, 63,
  ]);

  return (
    <div className={`cobalt-qr ${className}`} aria-hidden="true">
      {Array.from({ length: 64 }, (_, cellIndex) => (
        <i key={cellIndex} className={activeCells.has(cellIndex) ? 'on' : undefined} />
      ))}
    </div>
  );
}

function PixelGlitch({ id, className }: { id: string; className: string }) {
  const steps = [
    ['0', '0', '260', '150'],
    ['42', '150', '218', '136'],
    ['84', '286', '176', '132'],
    ['22', '418', '238', '120'],
    ['116', '538', '144', '128'],
    ['66', '666', '194', '132'],
    ['144', '798', '116', '182'],
  ];

  return (
    <svg
      className={className}
      viewBox="0 0 260 980"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width="12" height="980" patternUnits="userSpaceOnUse">
          <path d="M1 0V980M7 0V980" stroke="var(--cobalt-ink)" strokeWidth="1.5" />
        </pattern>
      </defs>
      {steps.map(([x, y, width, height]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#${id})`}
          stroke="var(--cobalt-ink)"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

function CobaltStyles() {
  return (
    <style>
      {`
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Hanken+Grotesk:wght@400;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Noto+Sans+KR:wght@400;600;700&family=Noto+Serif+KR:wght@400;700&display=swap');

/* ===========================================
   COBALT GRID THEME TOKENS
   =========================================== */
.cobalt-deck-root {
  --cobalt-paper: #F0EBDE;
  --cobalt-paper-2: #E6E0CE;
  --cobalt-ink: #1F2BE0;
  --cobalt-ink-soft: #5560E5;
  --cobalt-grid: rgba(31, 43, 224, 0.10);
  --cobalt-faint: rgba(31, 43, 224, 0.18);
  --cobalt-display: "Newsreader", "Noto Serif KR", serif;
  --cobalt-body: "Hanken Grotesk", "Noto Sans KR", sans-serif;
  --cobalt-mono: "DM Mono", ui-monospace, monospace;
  --stage-bg: #111111;
  --slide-bg: var(--cobalt-paper);
  position: fixed;
  inset: 0;
  overflow: hidden;
  color: var(--cobalt-ink);
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
   STAGE AND SLIDE CHROME
   =========================================== */
.cobalt-deck-viewport {
  background: #111111;
}

.cobalt-deck-stage {
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.28);
}

.cobalt-slide {
  font-family: var(--cobalt-body);
  color: var(--cobalt-ink);
  background:
    linear-gradient(to right, var(--cobalt-grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--cobalt-grid) 1px, transparent 1px),
    var(--cobalt-paper);
  background-size: 40px 40px, 40px 40px, auto;
  transition: opacity 280ms ease;
}

.cobalt-hairline {
  position: absolute;
  left: 80px;
  right: 80px;
  z-index: 10;
  height: 1.5px;
  background: var(--cobalt-ink);
}

.cobalt-hairline-top {
  top: 28px;
}

.cobalt-hairline-bottom {
  bottom: 24px;
}

.cobalt-page-num,
.cobalt-nav-hint {
  position: absolute;
  z-index: 10;
  bottom: 52px;
  font-family: var(--cobalt-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--cobalt-ink);
}

.cobalt-page-num {
  right: 80px;
}

.cobalt-nav-hint {
  left: 80px;
  opacity: 0.42;
}

.cobalt-progress {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1200;
  height: 3px;
  background: var(--cobalt-ink);
  transition: width 260ms ease;
}

.cobalt-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid rgba(240, 235, 222, 0.35);
  background: rgba(17, 17, 17, 0.72);
  backdrop-filter: blur(14px);
}

.cobalt-controls button,
.cobalt-controls span {
  height: 34px;
  min-width: 42px;
  border: 1px solid rgba(240, 235, 222, 0.45);
  border-radius: 0;
  background: transparent;
  color: var(--cobalt-paper);
  font-family: var(--cobalt-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
}

.cobalt-controls button {
  cursor: pointer;
}

.cobalt-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.cobalt-controls span {
  display: grid;
  min-width: 84px;
  place-items: center;
}

/* ===========================================
   TYPOGRAPHY AND MOTION
   =========================================== */
.cobalt-slide * {
  box-sizing: border-box;
}

.cobalt-slide h1,
.cobalt-slide h2,
.cobalt-slide h3,
.cobalt-slide p {
  margin: 0;
  word-break: keep-all;
}

.cobalt-eyebrow {
  font-family: var(--cobalt-body);
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cobalt-ink);
}

.cobalt-lead {
  max-width: 720px;
  font-family: var(--cobalt-body);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.55;
  color: var(--cobalt-ink);
}

.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition:
    opacity 620ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 620ms cubic-bezier(0.16, 1, 0.3, 1);
}

.visible .reveal {
  opacity: 1;
  transform: translateY(0);
}

.visible .reveal:nth-child(1) {
  transition-delay: 70ms;
}

.visible .reveal:nth-child(2) {
  transition-delay: 150ms;
}

.visible .reveal:nth-child(3) {
  transition-delay: 230ms;
}

.visible .reveal:nth-child(4) {
  transition-delay: 310ms;
}

/* ===========================================
   SHARED LAYOUT COMPONENTS
   =========================================== */
.cobalt-frame {
  position: absolute;
  inset: 108px 96px 128px;
  z-index: 2;
}

.cobalt-topbar {
  display: flex;
  min-height: 136px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 48px;
  padding-bottom: 22px;
  border-bottom: 1.5px solid var(--cobalt-ink);
}

.cobalt-topbar h2 {
  margin-top: 16px;
  font-family: var(--cobalt-display);
  font-size: 76px;
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.005em;
  color: var(--cobalt-ink);
}

.cobalt-topbar > span {
  padding-bottom: 8px;
  font-family: var(--cobalt-mono);
  font-size: 15px;
  letter-spacing: 0.06em;
  color: var(--cobalt-ink);
  white-space: nowrap;
}

.cobalt-two-col,
.cobalt-screen-layout,
.cobalt-dashboard-layout,
.cobalt-ai-layout,
.cobalt-operation-layout {
  display: grid;
  gap: 46px;
  height: calc(100% - 136px);
  padding-top: 44px;
}

.cobalt-two-col {
  grid-template-columns: 0.72fr 1.08fr;
  align-items: stretch;
}

.cobalt-copy-block {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cobalt-image-frame {
  position: relative;
  margin: 0;
  overflow: hidden;
  border: 1.5px solid var(--cobalt-ink);
  background: var(--cobalt-paper);
}

.cobalt-image-window,
.cobalt-scroll-window {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--cobalt-paper);
}

.cobalt-image-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cobalt-image-frame img.cobalt-img-contain {
  object-fit: contain;
}

.cobalt-scroll-window img {
  height: auto;
  max-height: none;
  object-fit: initial;
  animation-name: cobaltAutoScroll;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

.cobalt-image-frame figcaption {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 3;
  padding: 8px 12px;
  border: 1px solid var(--cobalt-ink);
  background: var(--cobalt-paper);
  color: var(--cobalt-ink);
  font-family: var(--cobalt-mono);
  font-size: 12px;
  letter-spacing: 0.05em;
}

.cobalt-diagram-frame {
  min-height: 630px;
}

.cobalt-diagram-frame img,
.cobalt-wide-diagram img,
.cobalt-ai-frame img,
.cobalt-operation-frame img {
  object-fit: contain;
  padding: 24px;
}

.cobalt-bullet-ledger {
  border-top: 1.5px solid var(--cobalt-ink);
}

.cobalt-bullet-ledger > div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 26px;
  min-height: 70px;
  align-items: center;
  border-bottom: 1px solid var(--cobalt-faint);
}

.cobalt-bullet-ledger span,
.cobalt-index-row > span,
.cobalt-demo-step > span,
.cobalt-difference-cell > span,
.cobalt-preference-step > span,
.cobalt-score-card > span,
.cobalt-closing-grid span {
  font-family: var(--cobalt-mono);
  font-size: 17px;
  letter-spacing: 0.06em;
  color: var(--cobalt-ink);
}

.cobalt-bullet-ledger p {
  font-size: 24px;
  line-height: 1.45;
}

/* ===========================================
   DECORATIVE SYSTEM
   =========================================== */
.cobalt-qr {
  position: absolute;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: 2px;
  width: 86px;
  height: 86px;
  padding: 5px;
  background: var(--cobalt-paper);
  box-shadow: 0 0 0 1.5px var(--cobalt-paper);
}

.cobalt-qr i {
  display: block;
  background: transparent;
}

.cobalt-qr i.on {
  background: var(--cobalt-ink);
}

.cobalt-glitch-cover,
.cobalt-glitch-side,
.cobalt-glitch-left {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  color: var(--cobalt-ink);
}

.cobalt-glitch-cover {
  top: 46px;
  right: 0;
  width: 410px;
  height: 980px;
}

.cobalt-glitch-side {
  top: 70px;
  right: 0;
  width: 286px;
  height: 900px;
  opacity: 0.72;
}

.cobalt-glitch-left {
  top: 58px;
  left: 0;
  width: 320px;
  height: 940px;
  opacity: 0.82;
  transform: scaleX(-1);
}

/* ===========================================
   COVER AND MANIFESTO
   =========================================== */
.cobalt-cover {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.cobalt-cover-copy {
  position: absolute;
  left: 112px;
  top: 146px;
  z-index: 3;
  width: 780px;
}

.cobalt-cover h1 {
  margin-top: 34px;
  font-family: var(--cobalt-display);
  font-size: 176px;
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: -0.008em;
  color: var(--cobalt-ink);
}

.cobalt-cover-lead {
  margin-top: 42px;
  max-width: 690px;
  font-size: 31px;
  line-height: 1.5;
}

.cobalt-cover-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin-top: 70px;
  border-top: 1.5px solid var(--cobalt-ink);
  border-bottom: 1px solid var(--cobalt-faint);
}

.cobalt-cover-meta span {
  padding: 18px 18px 17px 0;
  font-family: var(--cobalt-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
}

.cobalt-cover-image {
  position: absolute;
  right: 122px;
  bottom: 142px;
  z-index: 3;
  width: 780px;
  height: 438px;
}

.cobalt-cover-qr {
  right: 404px;
  top: 112px;
}

.cobalt-manifesto {
  position: absolute;
  inset: 132px 170px 150px;
  z-index: 3;
}

.cobalt-manifesto h2 {
  margin-top: 36px;
  max-width: 1180px;
  font-family: var(--cobalt-display);
  font-size: 104px;
  font-weight: 400;
  line-height: 1.04;
  letter-spacing: -0.005em;
}

.cobalt-manifesto h2 em {
  font-style: italic;
}

.cobalt-manifesto-lead {
  margin-top: 36px;
  max-width: 760px;
  font-size: 28px;
  line-height: 1.55;
}

.cobalt-manifesto .cobalt-bullet-ledger {
  width: 850px;
  margin-top: 56px;
}

.cobalt-manifesto-qr {
  right: 226px;
  top: 16px;
}

/* ===========================================
   PROBLEM AND INDEX ROWS
   =========================================== */
.cobalt-problem-grid {
  display: grid;
  grid-template-columns: 0.64fr 1.08fr;
  gap: 58px;
  height: calc(100% - 136px);
  padding-top: 48px;
}

.cobalt-index-rows {
  border-top: 1.5px solid var(--cobalt-ink);
}

.cobalt-index-row {
  display: grid;
  grid-template-columns: 72px 1fr 190px;
  gap: 28px;
  min-height: 126px;
  align-items: center;
  border-bottom: 1px solid var(--cobalt-faint);
}

.cobalt-index-row h3 {
  font-family: var(--cobalt-display);
  font-size: 38px;
  font-weight: 400;
  line-height: 1.05;
}

.cobalt-index-row p {
  margin-top: 12px;
  font-size: 18px;
  line-height: 1.55;
}

.cobalt-index-row small {
  justify-self: end;
  font-family: var(--cobalt-mono);
  font-size: 12px;
  letter-spacing: 0.05em;
  text-align: right;
}

/* ===========================================
   RESEARCH SLIDES
   =========================================== */
.cobalt-mini-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1.5px solid var(--cobalt-ink);
}

.cobalt-mini-stats div {
  min-height: 138px;
  padding-top: 24px;
  border-right: 1px solid var(--cobalt-faint);
}

.cobalt-mini-stats div:last-child {
  border-right: 0;
}

.cobalt-mini-stats strong {
  display: block;
  font-family: var(--cobalt-display);
  font-size: 76px;
  font-weight: 400;
  line-height: 0.92;
}

.cobalt-mini-stats span {
  display: block;
  margin-top: 15px;
  font-size: 16px;
  line-height: 1.35;
}

.cobalt-formula-layout {
  display: grid;
  grid-template-columns: 0.86fr 0.82fr;
  grid-template-rows: 290px 1fr;
  gap: 44px;
  height: calc(100% - 136px);
  padding-top: 48px;
}

.cobalt-formula-card {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1.5px solid var(--cobalt-ink);
  padding: 42px 48px;
  background: var(--cobalt-paper);
}

.cobalt-formula-card p {
  font-family: var(--cobalt-body);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.cobalt-formula-card strong {
  display: block;
  margin-top: 22px;
  font-family: var(--cobalt-display);
  font-size: 78px;
  font-weight: 400;
  line-height: 1.05;
}

.cobalt-pixel-chart {
  border-top: 1.5px solid var(--cobalt-ink);
  padding-top: 22px;
}

.cobalt-pixel-chart > p {
  font-family: var(--cobalt-mono);
  font-size: 14px;
  letter-spacing: 0.06em;
}

.cobalt-pixel-bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 18px;
  height: 330px;
  align-items: end;
  margin-top: 28px;
  border-bottom: 1.5px solid var(--cobalt-ink);
  padding: 0 8px 14px;
}

.cobalt-pixel-bar {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: flex-end;
  gap: 12px;
}

.cobalt-pixel-bar div {
  display: flex;
  height: 260px;
  flex-direction: column-reverse;
  gap: 5px;
}

.cobalt-pixel-bar i {
  flex: 1;
  background: var(--cobalt-grid);
}

.cobalt-pixel-bar i.on {
  background: var(--cobalt-ink);
}

.cobalt-pixel-bar span {
  font-family: var(--cobalt-mono);
  font-size: 13px;
  text-align: center;
}

.cobalt-map-research {
  display: grid;
  grid-template-columns: 0.5fr 1fr;
  grid-template-rows: 1fr auto;
  gap: 36px 46px;
  height: calc(100% - 136px);
  padding-top: 44px;
}

.cobalt-wide-diagram {
  grid-row: 1 / -1;
  grid-column: 2;
}

.cobalt-map-tags {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  align-self: end;
  border-top: 1.5px solid var(--cobalt-ink);
}

.cobalt-map-tags span {
  min-height: 72px;
  padding: 18px 16px 0 0;
  border-bottom: 1px solid var(--cobalt-faint);
  font-size: 19px;
}

.cobalt-score-layout {
  height: calc(100% - 136px);
  padding-top: 46px;
}

.cobalt-score-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin-top: 44px;
  border-top: 1.5px solid var(--cobalt-ink);
  border-bottom: 1.5px solid var(--cobalt-ink);
}

.cobalt-score-card {
  min-height: 360px;
  padding: 32px 32px 28px 0;
  border-right: 1px solid var(--cobalt-faint);
}

.cobalt-score-card:last-child {
  border-right: 0;
}

.cobalt-score-card h3 {
  margin-top: 26px;
  font-family: var(--cobalt-display);
  font-size: 48px;
  font-weight: 400;
}

.cobalt-score-card p {
  margin-top: 22px;
  max-width: 430px;
  font-size: 20px;
  line-height: 1.55;
}

.cobalt-score-card small {
  display: block;
  margin-top: 26px;
  font-family: var(--cobalt-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
}

.cobalt-score-bar {
  margin-top: 32px;
  height: 14px;
  background: var(--cobalt-grid);
}

.cobalt-score-bar i {
  display: block;
  height: 100%;
  background: var(--cobalt-ink);
}

.cobalt-equation {
  margin-top: 38px;
  border-top: 1.5px solid var(--cobalt-ink);
  padding-top: 22px;
  font-family: var(--cobalt-display);
  font-size: 44px;
  line-height: 1.2;
}

/* ===========================================
   SERVICE AND AI SLIDES
   =========================================== */
.cobalt-screen-layout {
  grid-template-columns: 1.1fr 0.56fr;
}

.cobalt-screen-frame {
  min-height: 650px;
}

.cobalt-screen-copy {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cobalt-dashboard-layout,
.cobalt-ai-layout,
.cobalt-operation-layout {
  grid-template-columns: 0.62fr 1fr;
}

.cobalt-dashboard-frame {
  height: 560px;
  align-self: start;
}

.cobalt-ai-frame,
.cobalt-operation-frame {
  min-height: 650px;
}

.cobalt-preference-layout {
  height: calc(100% - 136px);
  padding-top: 46px;
}

.cobalt-preference-flow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin-top: 46px;
  border-top: 1.5px solid var(--cobalt-ink);
  border-bottom: 1.5px solid var(--cobalt-ink);
}

.cobalt-preference-step {
  min-height: 292px;
  padding: 30px 34px 28px 0;
  border-right: 1px solid var(--cobalt-faint);
}

.cobalt-preference-step:last-child {
  border-right: 0;
}

.cobalt-preference-step h3 {
  margin-top: 24px;
  font-family: var(--cobalt-display);
  font-size: 42px;
  font-weight: 400;
  line-height: 1.08;
}

.cobalt-preference-step p {
  margin-top: 20px;
  font-size: 20px;
  line-height: 1.55;
}

.cobalt-preference-step small {
  display: block;
  margin-top: 22px;
  font-family: var(--cobalt-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
}

.cobalt-preference-bars {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-top: 46px;
}

.cobalt-preference-bars div {
  border-top: 1.5px solid var(--cobalt-ink);
  padding-top: 18px;
}

.cobalt-preference-bars span,
.cobalt-preference-bars strong {
  display: block;
}

.cobalt-preference-bars span {
  font-size: 18px;
}

.cobalt-preference-bars strong {
  margin-top: 12px;
  font-family: var(--cobalt-display);
  font-size: 60px;
  font-weight: 400;
}

.cobalt-preference-bars i {
  display: block;
  margin-top: 18px;
  height: 12px;
  background: var(--cobalt-grid);
}

.cobalt-preference-bars b {
  display: block;
  height: 100%;
  background: var(--cobalt-ink);
}

/* ===========================================
   DEMO, DIFFERENTIATION, IP, CLOSING
   =========================================== */
.cobalt-demo-layout,
.cobalt-difference-layout,
.cobalt-ip-layout {
  height: calc(100% - 136px);
  padding-top: 46px;
}

.cobalt-demo-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin-top: 58px;
  border-top: 1.5px solid var(--cobalt-ink);
  border-bottom: 1.5px solid var(--cobalt-ink);
}

.cobalt-demo-step {
  min-height: 390px;
  padding: 30px 28px 28px 0;
  border-right: 1px solid var(--cobalt-faint);
}

.cobalt-demo-step:last-child {
  border-right: 0;
}

.cobalt-demo-step h3,
.cobalt-difference-cell h3 {
  margin-top: 28px;
  font-family: var(--cobalt-display);
  font-size: 42px;
  font-weight: 400;
  line-height: 1.08;
}

.cobalt-demo-step p,
.cobalt-difference-cell p {
  margin-top: 22px;
  font-size: 20px;
  line-height: 1.55;
}

.cobalt-difference-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  margin-top: 44px;
  border-top: 1.5px solid var(--cobalt-ink);
  border-bottom: 1.5px solid var(--cobalt-ink);
}

.cobalt-difference-cell {
  min-height: 232px;
  padding: 26px 34px 24px 0;
  border-right: 1px solid var(--cobalt-faint);
  border-bottom: 1px solid var(--cobalt-faint);
}

.cobalt-difference-cell:nth-child(2n) {
  border-right: 0;
}

.cobalt-difference-cell:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.cobalt-ip-table {
  margin-top: 42px;
  border-top: 1.5px solid var(--cobalt-ink);
}

.cobalt-ip-head,
.cobalt-ip-row {
  display: grid;
  grid-template-columns: 82px 0.55fr 1.15fr 0.55fr;
  gap: 26px;
  align-items: center;
  border-bottom: 1px solid var(--cobalt-faint);
}

.cobalt-ip-head {
  min-height: 56px;
  border-bottom: 1.5px solid var(--cobalt-ink);
  font-family: var(--cobalt-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
}

.cobalt-ip-row {
  min-height: 110px;
}

.cobalt-ip-row > span,
.cobalt-ip-row em {
  font-family: var(--cobalt-mono);
  font-size: 14px;
  letter-spacing: 0.05em;
  font-style: normal;
}

.cobalt-ip-row strong {
  font-family: var(--cobalt-display);
  font-size: 30px;
  font-weight: 400;
  line-height: 1.1;
}

.cobalt-ip-row p {
  font-size: 18px;
  line-height: 1.45;
}

.cobalt-ip-note {
  margin-top: 22px;
  border-top: 1px solid var(--cobalt-ink);
  padding-top: 14px;
  font-size: 17px;
  line-height: 1.45;
}

.cobalt-closing {
  position: absolute;
  inset: 130px 120px 148px;
  z-index: 3;
  text-align: right;
}

.cobalt-closing h2 {
  margin-top: 40px;
  font-family: var(--cobalt-display);
  font-size: 148px;
  font-weight: 400;
  line-height: 0.96;
  letter-spacing: -0.005em;
}

.cobalt-closing-lead {
  margin-top: 34px;
  margin-left: auto;
  max-width: 900px;
  font-size: 30px;
  line-height: 1.55;
}

.cobalt-closing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin-top: 84px;
  border-top: 1.5px solid var(--cobalt-ink);
  text-align: left;
}

.cobalt-closing-grid div {
  min-height: 130px;
  padding-top: 24px;
  border-right: 1px solid var(--cobalt-faint);
}

.cobalt-closing-grid div:last-child {
  border-right: 0;
}

.cobalt-closing-grid p {
  margin-top: 18px;
  font-size: 24px;
  line-height: 1.35;
}

.cobalt-closing-qr {
  left: 350px;
  top: 44px;
}

/* ===========================================
   ANIMATION KEYFRAMES
   =========================================== */
@keyframes cobaltAutoScroll {
  0%,
  14% {
    transform: translateY(0);
  }

  86%,
  100% {
    transform: translateY(calc(-100% + var(--cobalt-scroll-frame-height, 560px)));
  }
}
      `}
    </style>
  );
}
