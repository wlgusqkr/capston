import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

type SlideTone = 'light' | 'dark' | 'stone';
type SlideLayout =
  | 'cover'
  | 'split'
  | 'photoLeft'
  | 'wide'
  | 'statement'
  | 'board'
  | 'closing';

interface Slide {
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: SlideTone;
  layout: SlideLayout;
  points?: string[];
  aside?: string;
  visual?: ReactNode;
  photo?: {
    label: string;
    hint?: string;
  };
}

const slides: Slide[] = [
  {
    eyebrow: 'Final Presentation',
    title: '슬기로운 자취생활',
    lead: '매물을 보기 전에, 나에게 맞는 동네를 먼저 찾는 서비스',
    layout: 'cover',
    visual: <CoverVisual />,
    photo: { label: '서비스 대표 화면', hint: '메인 지도 또는 발표용 합성 이미지' },
  },
  {
    eyebrow: 'Problem',
    title: '동네 선택이 먼저입니다',
    lead: '자취 초보자는 좋은 매물을 찾기 전에 어느 동네부터 봐야 하는지에서 막힙니다.',
    layout: 'photoLeft',
    points: [
      '월세, 통학, 생활시설 정보가 서로 흩어져 있음',
      '실거래는 법정동, 사용자는 행정동, 시설은 좌표 기준',
      '평균 월세만으로는 실제 자취 조건을 판단하기 어려움',
      '사용자는 자신의 기준을 숫자로 설명하기 어렵다',
    ],
    photo: { label: '사용자 상황 이미지', hint: '부동산 앱/지도/자취방 탐색 장면' },
  },
  {
    eyebrow: 'Service Thesis',
    title: '동네 후보를 압축합니다',
    lead: '우리는 매물 추천 이전 단계에서 사용자의 예산과 생활 기준에 맞는 후보 동네를 줄이는 문제를 풀었습니다.',
    layout: 'statement',
    visual: <ThesisVisual />,
    aside: '발표 핵심 문장: 데이터 목록이 아니라 자취 결정을 위한 판단 단위로 재구성했다.',
  },
  {
    eyebrow: 'Data Research',
    title: '흩어진 데이터를 묶다',
    lead: '공공데이터를 가져오는 것보다 어려웠던 일은 서로 다른 기준의 데이터를 비교 가능한 동네 단위로 맞추는 것이었습니다.',
    layout: 'board',
    points: [
      '전월세 실거래, 행정구역 경계, 생활시설, 교통, 인구 지표 통합',
      '코드, 좌표, 경계, 시간 단위가 다른 데이터를 하나의 분석 흐름으로 정리',
      '누락과 API 제한을 고려한 자동 갱신 구조 구성',
    ],
    visual: <DataBoardVisual />,
    photo: { label: '데이터 출처 이미지', hint: '공공데이터 포털/원천 데이터 캡처' },
  },
  {
    eyebrow: 'Research 01',
    title: '비용 기준',
    lead: '보증금과 월세를 하나의 환산월세로 바꿔 동네별 비용 부담을 비교했습니다.',
    layout: 'wide',
    points: [
      '환산월세 = 월세 + 보증금 × 0.005',
      '최근 실거래를 기준으로 비용 부담을 계산',
      '저렴할수록 높은 전월세 점수로 변환',
    ],
    visual: <RentVisual />,
  },
  {
    eyebrow: 'Research 02',
    title: '공간 매핑',
    lead: '법정동, 행정동, 좌표가 서로 다른 언어로 말하던 데이터를 하나의 지도 위에 맞췄습니다.',
    layout: 'split',
    points: [
      '실거래 데이터의 법정동 기준을 서비스의 행정동 기준과 연결',
      '좌표가 있는 시설 데이터는 경계 기반으로 동네에 매핑',
      '동네 평균 분석과 특정 위치 분석을 동시에 지원',
    ],
    visual: <SpatialVisual />,
    photo: { label: '지도/경계 캡처', hint: '행정동 경계가 보이는 화면' },
  },
  {
    eyebrow: 'Research 03',
    title: '자취 적합도',
    lead: '좋은 동네는 하나로 고정되지 않습니다. 사용자가 무엇을 중요하게 보는지에 따라 결과가 달라집니다.',
    layout: 'board',
    points: [
      '전월세: 환산월세 기반 비용 점수',
      '생활시설: 카페, 편의점, 병원, 약국, 마트, 공원 등',
      '교통: 지하철 접근성과 버스 정류장 밀도',
    ],
    visual: <ScoreVisual />,
  },
  {
    eyebrow: 'Service 01',
    title: '조건 매칭 지도',
    lead: '내 예산과 주거 조건에 맞는 실제 거래가 어느 동네에 있었는지 지도에서 바로 확인합니다.',
    layout: 'photoLeft',
    points: [
      '보증금, 월세, 면적, 주거유형, 기간 필터',
      '조건을 만족한 실거래 수를 행정동별로 집계',
      '거래량 쏠림은 log scale로 완화',
    ],
    photo: { label: '매칭 지도 스크린샷', hint: '실제 서비스 화면을 넣기 좋은 자리' },
  },
  {
    eyebrow: 'Service 02',
    title: '위치 점수',
    lead: '같은 행정동 안에서도 위치가 다르면 체감 생활환경은 달라집니다.',
    layout: 'wide',
    points: [
      '특정 좌표 주변 1km 생활시설 분석',
      '가까운 시설일수록 더 크게 반영하는 커널 방식',
      '학교 기준 통학 가능성과 주변 편의 신호 제공',
    ],
    visual: <KernelVisual />,
    photo: { label: '매물 위치 예시', hint: '좌표 선택 화면 또는 지도 캡처' },
  },
  {
    eyebrow: 'Personalization',
    title: '선택으로 배우는 선호',
    lead: '사용자가 복잡한 숫자를 입력하지 않아도, 몇 번의 선택만으로 월세·시설·교통 선호를 추정합니다.',
    layout: 'split',
    points: [
      '두 동네 중 더 끌리는 쪽을 선택',
      '선택 결과로 개인 가중치 추정',
      '지도 색상, 추천, 비교 결과에 즉시 반영',
    ],
    visual: <PreferenceVisual />,
    photo: { label: '온보딩 화면 캡처', hint: '5번 비교 모달 스크린샷' },
  },
  {
    eyebrow: 'AI Experience',
    title: '질문하면 조회합니다',
    lead: '자연어 질문을 데이터 조회, 추천 근거, 시각화 답변으로 연결했습니다.',
    tone: 'dark',
    layout: 'board',
    points: [
      '질문 분류 후 필요한 데이터 테이블 선택',
      '읽기 전용 SQL 생성과 검증',
      '추천, 정보 조회, 표/막대/선 시각화 응답',
    ],
    visual: <AgentVisual />,
    photo: { label: 'AI 패널 캡처', hint: '실제 채팅 결과 화면' },
  },
  {
    eyebrow: 'Demo Flow',
    title: '탐색에서 비교까지',
    lead: '발표 데모는 사용자가 실제로 동네 후보를 좁히는 순서를 그대로 따라갑니다.',
    layout: 'wide',
    visual: <JourneyVisual />,
    points: [
      '지도에서 전체 후보 확인',
      '예산 조건으로 거래 매칭 확인',
      '상세 페이지와 비교 페이지로 후보 압축',
      '마지막 궁금증은 AI에게 질문',
    ],
  },
  {
    eyebrow: 'Differentiation',
    title: '우리만의 차별점',
    lead: '핵심은 데이터를 보여주는 것이 아니라, 자취 결정을 위한 판단 기준으로 다시 구성한 것입니다.',
    tone: 'stone',
    layout: 'statement',
    visual: <DifferenceVisual />,
    points: [
      '자취생 관점의 동네 적합도 모델',
      '법정동·행정동·좌표 데이터의 공간 결합',
      '실거래 조건 매칭과 개인 선호 학습 결합',
      '동네 평균과 위치 기반 분석의 동시 제공',
    ],
  },
  {
    eyebrow: 'Operation',
    title: '갱신 가능한 구조',
    lead: '일회성 데모가 아니라 최신 공공데이터를 다시 계산해 서비스에 반영할 수 있는 구조로 만들었습니다.',
    layout: 'split',
    points: [
      '공공데이터 수집 후 생활시설과 current score 재계산',
      'GitHub Actions로 매일 데이터 업데이트 실행',
      'lock, 상태 JSON, rate limit 감지로 운영 안정성 확보',
    ],
    visual: <OperationVisual />,
    photo: { label: '업데이트 로그', hint: 'GitHub Actions 또는 JSON 상태 화면' },
  },
  {
    eyebrow: 'Conclusion',
    title: '동네를 먼저 찾는다',
    lead: '슬기로운 자취생활은 흩어진 공공데이터를 자취 의사결정 기준으로 바꿔 사용자의 후보 동네를 줄여주는 서비스입니다.',
    tone: 'dark',
    layout: 'closing',
    visual: <ClosingVisual />,
  },
];

function toneClasses(tone: SlideTone = 'light') {
  if (tone === 'dark') return 'bg-[#003c33] text-white';
  if (tone === 'stone') return 'bg-[#eeece7] text-[#17171c]';
  return 'bg-white text-[#17171c]';
}

function mutedClass(tone: SlideTone = 'light') {
  return tone === 'dark' ? 'text-white/70' : 'text-[#75758a]';
}

function ruleClass(tone: SlideTone = 'light') {
  return tone === 'dark' ? 'border-white/18' : 'border-[#d9d9dd]';
}

function accentClass(tone: SlideTone = 'light') {
  return tone === 'dark' ? 'text-[#ffad9b]' : 'text-[#ff7759]';
}

export default function Presentation() {
  const [index, setIndex] = useState(() => initialSlideIndex());

  const goTo = useCallback((nextIndex: number) => {
    setIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
  }, []);

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

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
        void document.documentElement.requestFullscreen();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const progress = useMemo(() => ((index + 1) / slides.length) * 100, [index]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('slide', String(index + 1));
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [index]);

  return (
    <main className="h-screen w-screen overflow-hidden bg-white font-sans" aria-label="최종 발표 슬라이드">
      <div className="absolute left-0 top-0 z-20 h-1 bg-[#ff7759] transition-[width] duration-300" style={{ width: `${progress}%` }} />

      <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}vw)` }}>
        {slides.map((slide, slideIndex) => (
          <section
            key={`${slide.eyebrow}-${slide.title}`}
            className={`h-screen w-screen min-w-full overflow-hidden px-7 py-8 md:px-14 md:py-11 lg:px-20 ${toneClasses(slide.tone)}`}
            aria-hidden={slideIndex !== index}
          >
            <div className="mx-auto flex h-full max-w-[1480px] flex-col pb-24">
              <SlideHeader current={slideIndex + 1} total={slides.length} tone={slide.tone} />
              <SlideBody slide={slide} />
            </div>
          </section>
        ))}
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
        <button
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-[#d9d9dd] bg-white text-[#17171c] transition-colors hover:border-[#17171c] disabled:opacity-30"
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="이전 슬라이드"
        >
          ←
        </button>
        <div className="pointer-events-auto rounded-full border border-[#d9d9dd] bg-white px-4 py-2 text-[13px] leading-none text-[#212121]">
          {index + 1} / {slides.length}
        </div>
        <button
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-[#d9d9dd] bg-[#17171c] text-white transition-colors hover:bg-black disabled:opacity-30"
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

function initialSlideIndex() {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get('slide');
  const slideNumber = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(slideNumber)) return 0;
  return Math.max(0, Math.min(slides.length - 1, slideNumber - 1));
}

function SlideBody({ slide }: { slide: Slide }) {
  if (slide.layout === 'cover') {
    return (
      <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.78fr)]">
        <HeroCopy slide={slide} size="hero" />
        <div className="hidden lg:grid lg:gap-5">
          {slide.visual}
          {slide.photo && <PhotoSlot {...slide.photo} />}
        </div>
      </div>
    );
  }

  if (slide.layout === 'photoLeft') {
    return (
      <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(420px,0.86fr)_minmax(0,0.94fr)]">
        <div className="hidden lg:flex lg:flex-col lg:gap-5">
          {slide.photo && <PhotoSlot {...slide.photo} tall />}
          {slide.visual}
        </div>
        <div>
          <HeroCopy slide={slide} />
          <PointList points={slide.points} tone={slide.tone} />
        </div>
      </div>
    );
  }

  if (slide.layout === 'wide') {
    return (
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.56fr)]">
          <HeroCopy slide={slide} compact />
          <PointList points={slide.points} tone={slide.tone} compact />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {slide.visual}
          {slide.photo && <PhotoSlot {...slide.photo} />}
        </div>
      </div>
    );
  }

  if (slide.layout === 'statement') {
    return (
      <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,0.78fr)]">
        <div>
          <HeroCopy slide={slide} size="statement" />
          {slide.aside && (
            <div className={`mt-10 border-l-2 pl-6 text-[18px] leading-[1.55] ${slide.tone === 'dark' ? 'border-[#ffad9b] text-white/78' : 'border-[#ff7759] text-[#555461]'}`}>
              {slide.aside}
            </div>
          )}
          <PointList points={slide.points} tone={slide.tone} compact />
        </div>
        <div className="hidden lg:block">{slide.visual}</div>
      </div>
    );
  }

  if (slide.layout === 'board') {
    return (
      <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(480px,0.9fr)]">
        <div>
          <HeroCopy slide={slide} />
          <PointList points={slide.points} tone={slide.tone} />
        </div>
        <div className="hidden lg:grid lg:gap-5">
          {slide.visual}
          {slide.photo && <PhotoSlot {...slide.photo} />}
        </div>
      </div>
    );
  }

  if (slide.layout === 'split') {
    return (
      <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,0.86fr)]">
        <div>
          <HeroCopy slide={slide} />
          <PointList points={slide.points} tone={slide.tone} />
        </div>
        <div className="hidden lg:grid lg:grid-cols-1 lg:gap-5">
          {slide.visual}
          {slide.photo && <PhotoSlot {...slide.photo} />}
        </div>
      </div>
    );
  }

  return (
    <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.72fr)]">
      <HeroCopy slide={slide} size="hero" />
      <div className="hidden lg:block">{slide.visual}</div>
    </div>
  );
}

function HeroCopy({
  slide,
  size = 'default',
  compact = false,
}: {
  slide: Slide;
  size?: 'default' | 'hero' | 'statement';
  compact?: boolean;
}) {
  const titleSize =
    size === 'hero'
      ? 'text-[56px] md:text-[82px] lg:text-[104px]'
      : size === 'statement'
        ? 'text-[48px] md:text-[72px] lg:text-[88px]'
        : 'text-[44px] md:text-[62px] lg:text-[74px]';

  return (
    <div className={compact ? 'max-w-[920px]' : 'max-w-[980px]'}>
      <p className={`mb-5 font-mono text-[13px] uppercase leading-[1.4] tracking-normal ${accentClass(slide.tone)}`}>
        {slide.eyebrow}
      </p>
      <h1 className={`${titleSize} text-balance font-normal leading-[1.02] tracking-normal [word-break:keep-all]`}>
        {slide.title}
      </h1>
      {slide.lead && (
        <p className={`mt-7 max-w-[760px] text-[18px] font-normal leading-[1.5] [word-break:keep-all] md:text-[22px] ${mutedClass(slide.tone)}`}>
          {slide.lead}
        </p>
      )}
    </div>
  );
}

function PointList({
  points,
  tone,
  compact = false,
}: {
  points?: string[];
  tone?: SlideTone;
  compact?: boolean;
}) {
  if (!points?.length) return null;

  return (
    <div className={`mt-9 border-t ${compact ? 'max-w-[620px]' : 'max-w-[820px]'} ${ruleClass(tone)}`}>
      {points.map((point) => (
        <div
          key={point}
          className={`grid grid-cols-[24px_1fr] gap-4 border-b py-3.5 text-[16px] leading-[1.55] md:text-[18px] ${ruleClass(tone)}`}
        >
          <span className={accentClass(tone)} aria-hidden="true">/</span>
          <span className={tone === 'dark' ? 'text-white/86' : 'text-[#212121]'}>{point}</span>
        </div>
      ))}
    </div>
  );
}

function SlideHeader({ current, total, tone }: { current: number; total: number; tone?: SlideTone }) {
  return (
    <div className={`flex items-center justify-between border-b pb-5 ${ruleClass(tone)}`}>
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${tone === 'dark' ? 'bg-[#ff7759]' : 'bg-[#003c33]'}`} />
        <span className={`text-[14px] font-semibold tracking-normal ${tone === 'dark' ? 'text-white' : 'text-[#17171c]'}`}>
          자취맵
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-mono text-[13px] tracking-normal ${mutedClass(tone)}`}>
          {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <button
          className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
            tone === 'dark'
              ? 'border-white/22 bg-white text-[#17171c] hover:border-white'
              : 'border-[#d9d9dd] bg-white text-[#17171c] hover:border-[#17171c]'
          }`}
          type="button"
          onClick={() => {
            if (document.fullscreenElement) {
              void document.exitFullscreen();
            } else if (document.fullscreenEnabled) {
              void document.documentElement.requestFullscreen();
            }
          }}
        >
          전체화면
        </button>
      </div>
    </div>
  );
}

function PhotoSlot({ label, hint, tall = false }: { label: string; hint?: string; tall?: boolean }) {
  return (
    <div
      className={`group relative flex ${tall ? 'min-h-[420px]' : 'min-h-[180px]'} items-center justify-center overflow-hidden rounded-[22px] border border-dashed border-[#b9b9c2] bg-white/70 text-center`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,60,51,0.05)_25%,transparent_25%,transparent_50%,rgba(0,60,51,0.05)_50%,rgba(0,60,51,0.05)_75%,transparent_75%,transparent)] bg-[length:28px_28px]" />
      <div className="relative px-8">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-[#d9d9dd] bg-white text-[28px] text-[#93939f]">
          +
        </div>
        <div className="text-[22px] leading-[1.2] text-[#17171c]">{label}</div>
        {hint && <div className="mt-3 text-[14px] leading-[1.45] text-[#75758a]">{hint}</div>}
      </div>
    </div>
  );
}

function Panel({
  children,
  dark = false,
  className = '',
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-[22px] border p-7 ${dark ? 'border-white/14 bg-[#071829] text-white' : 'border-[#d9d9dd] bg-[#f7f6f2] text-[#17171c]'} ${className}`}>
      {children}
    </div>
  );
}

function CoverVisual() {
  return (
    <Panel dark className="min-h-[330px]">
      <div className="flex h-full flex-col justify-between gap-8">
        <div>
          <p className="font-mono text-[13px] uppercase tracking-normal text-[#ffad9b]">Decision Engine</p>
          <h2 className="mt-4 text-[34px] font-normal leading-[1.12] tracking-normal">
            서울 동네를 자취 기준으로 다시 읽다
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['비용', '생활', '교통'].map((label, i) => (
            <div key={label} className="rounded-[16px] border border-white/12 bg-white/7 p-5">
              <div className="text-[13px] text-white/60">{label}</div>
              <div className="mt-5 h-2 rounded-full bg-white/12">
                <div className="h-full rounded-full bg-[#ff7759]" style={{ width: `${[72, 58, 84][i]}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ThesisVisual() {
  const inputs = [
    ['실거래', '비용 신호'],
    ['생활시설', '생활 신호'],
    ['교통', '이동 신호'],
  ];
  const outputs = [
    ['지도', '후보 발견'],
    ['비교', '선택 압축'],
    ['AI', '근거 설명'],
  ];

  return (
    <Panel className="h-[460px] bg-white">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[13px] uppercase tracking-normal text-[#ff7759]">Research Pipeline</p>
          <span className="font-mono text-[12px] text-[#93939f]">INPUT → DECISION → OUTPUT</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {inputs.map(([label, desc]) => (
            <div key={label} className="rounded-[16px] border border-[#d9d9dd] bg-[#f7f6f2] px-4 py-3.5">
              <div className="text-[18px] leading-none">{label}</div>
              <div className="mt-3 text-[13px] leading-[1.35] text-[#75758a] [word-break:keep-all]">{desc}</div>
            </div>
          ))}
        </div>

        <div className="grid flex-1 place-items-center rounded-[22px] bg-[#003c33] px-7 text-center text-white">
          <div>
            <div className="font-mono text-[12px] uppercase tracking-normal text-[#ffad9b]">Service Thesis</div>
            <div className="mt-3 text-[36px] leading-[1.05] tracking-normal [word-break:keep-all]">
              동네 후보 압축
            </div>
            <div className="mt-4 text-[15px] leading-[1.45] text-white/68 [word-break:keep-all]">
              흩어진 데이터를 자취 판단 단위로 바꾼다
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {outputs.map(([label, desc]) => (
            <div key={label} className="rounded-[16px] border border-[#ffad9b] bg-[#fff0eb] px-4 py-3.5">
              <div className="text-[18px] leading-none text-[#17171c]">{label}</div>
              <div className="mt-3 text-[13px] leading-[1.35] text-[#75758a] [word-break:keep-all]">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function DataBoardVisual() {
  const groups = ['전월세 실거래', '행정구역 경계', '상권/생활시설', '지하철/버스', '공원/도서관', '인구/지역 지표'];
  return (
    <Panel className="min-h-[430px]">
      <div className="grid h-full grid-cols-2 gap-3">
        {groups.map((group, index) => (
          <div key={group} className="flex items-center justify-between rounded-[16px] border border-[#d9d9dd] bg-white px-5 py-4">
            <span className="text-[17px]">{group}</span>
            <span className="font-mono text-[13px] text-[#93939f]">{String(index + 1).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RentVisual() {
  return (
    <Panel className="min-h-[350px] bg-[#eeece7]">
      <div className="grid h-full items-center gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[22px] bg-white p-8">
          <div className="font-mono text-[13px] uppercase tracking-normal text-[#ff7759]">Converted Rent</div>
          <div className="mt-5 text-[52px] leading-[1.02] tracking-normal">
            월세 + 보증금 × 0.005
          </div>
        </div>
        <div className="grid gap-3">
          <InfoBlank label="발표용 수치" hint="대표 동네 2~3개 환산월세 비교" />
          <InfoBlank label="그래프 자리" hint="환산 전/후 비교 차트" />
        </div>
      </div>
    </Panel>
  );
}

function InfoBlank({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-[#b9b9c2] bg-white px-5 py-6">
      <div className="text-[18px] text-[#17171c]">{label}</div>
      <div className="mt-2 text-[13px] text-[#75758a]">{hint}</div>
    </div>
  );
}

function SpatialVisual() {
  return (
    <Panel className="min-h-[330px]">
      <div className="flex h-full items-center justify-center">
        <div className="grid w-full grid-cols-[1fr_56px_1fr_56px_1fr] items-center gap-2">
          <MappingNode title="법정동" body="실거래" />
          <Connector />
          <MappingNode title="행정동" body="서비스" />
          <Connector />
          <MappingNode title="좌표" body="시설/위치" />
        </div>
      </div>
    </Panel>
  );
}

function MappingNode({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[22px] border border-[#d9d9dd] bg-white p-6 text-center">
      <div className="text-[28px] leading-none">{title}</div>
      <div className="mt-4 text-[14px] text-[#75758a]">{body}</div>
    </div>
  );
}

function Connector() {
  return <div className="h-px bg-[#003c33]" aria-hidden="true" />;
}

function ScoreVisual() {
  return (
    <Panel className="min-h-[430px]">
      <div className="grid h-full gap-4">
        <ScoreCard label="전월세" value={78} color="#ff7759" desc="낮을수록 좋음" />
        <ScoreCard label="생활시설" value={64} color="#003c33" desc="밀도와 접근성" />
        <ScoreCard label="교통" value={86} color="#1863dc" desc="지하철 + 버스" />
        <div className="rounded-full bg-[#17171c] px-6 py-4 text-center text-[20px] text-white">
          종합점수 = 세 점수 × 사용자 가중치
        </div>
      </div>
    </Panel>
  );
}

function ScoreCard({ label, value, color, desc }: { label: string; value: number; color: string; desc: string }) {
  return (
    <div className="rounded-[16px] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[20px]">{label}</div>
          <div className="mt-1 text-[13px] text-[#75758a]">{desc}</div>
        </div>
        <div className="text-[24px]">{value}</div>
      </div>
      <div className="h-3 rounded-full bg-[#eeece7]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function KernelVisual() {
  return (
    <Panel className="min-h-[350px] bg-white">
      <div className="relative h-[330px] overflow-hidden rounded-[22px] bg-[#f7f6f2]">
        <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff7759]" />
        {[110, 210, 330].map((size) => (
          <div
            key={size}
            className="absolute left-1/2 top-1/2 rounded-full border border-[#003c33]/20"
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
          />
        ))}
        {[
          ['카페', 'left-[62%] top-[28%]'],
          ['약국', 'left-[31%] top-[42%]'],
          ['편의점', 'left-[58%] top-[65%]'],
          ['병원', 'left-[40%] top-[23%]'],
          ['마트', 'left-[70%] top-[49%]'],
        ].map(([label, pos]) => (
          <div key={label} className={`absolute ${pos} rounded-full bg-[#edfce9] px-4 py-2 text-[13px] text-[#003c33]`}>
            {label}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PreferenceVisual() {
  return (
    <Panel className="min-h-[330px]">
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="grid grid-cols-2 gap-4">
          <ChoiceCard title="A 동네" desc="월세 낮음 · 교통 보통" />
          <ChoiceCard title="B 동네" desc="월세 보통 · 교통 좋음" active />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MiniWeight label="월세" value={34} />
          <MiniWeight label="시설" value={22} />
          <MiniWeight label="교통" value={44} />
        </div>
      </div>
    </Panel>
  );
}

function ChoiceCard({ title, desc, active = false }: { title: string; desc: string; active?: boolean }) {
  return (
    <div className={`rounded-[22px] border p-6 ${active ? 'border-[#ffad9b] bg-[#fff0eb]' : 'border-[#d9d9dd] bg-white'}`}>
      <div className="text-[26px]">{title}</div>
      <div className="mt-4 text-[14px] text-[#75758a]">{desc}</div>
    </div>
  );
}

function MiniWeight({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[16px] bg-white p-4">
      <div className="text-[13px] text-[#75758a]">{label}</div>
      <div className="mt-2 text-[26px]">{value}%</div>
    </div>
  );
}

function AgentVisual() {
  return (
    <Panel dark className="min-h-[420px]">
      <div className="flex h-full flex-col gap-4">
        <div className="rounded-[16px] border border-white/12 bg-white/7 p-5">
          <div className="text-[13px] text-white/56">User</div>
          <div className="mt-2 text-[20px] leading-[1.35]">월세 60 이하에 카페랑 약국 많은 동네 추천해줘</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['분류', '조회', '답변'].map((label) => (
            <div key={label} className="rounded-[14px] border border-white/12 bg-white/7 p-4 text-center text-[14px] text-white/80">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-[16px] bg-white p-5 text-[#17171c]">
          <div className="text-[13px] text-[#75758a]">Answer</div>
          <div className="mt-2 text-[20px]">후보 동네 2곳과 비교 근거를 반환</div>
        </div>
      </div>
    </Panel>
  );
}

function JourneyVisual() {
  const steps = ['지도', '조건', '상세', '비교', 'AI'];
  return (
    <Panel className="min-h-[360px] bg-white">
      <div className="grid h-full grid-cols-5 gap-3">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col justify-between rounded-[22px] border border-[#d9d9dd] bg-[#f7f6f2] p-5">
            <div className="font-mono text-[13px] text-[#93939f]">{String(index + 1).padStart(2, '0')}</div>
            <div className="text-[28px] leading-none">{step}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DifferenceVisual() {
  const items = [
    ['공간 결합', '법정동 · 행정동 · 좌표'],
    ['비용 해석', '보증금과 월세를 통합'],
    ['조건 매칭', '실제 거래 이력 기반'],
    ['개인화', '선택으로 선호 추정'],
  ];
  return (
    <Panel className="min-h-[520px] bg-white">
      <div className="grid h-full grid-cols-2 gap-4">
        {items.map(([title, desc]) => (
          <div key={title} className="flex flex-col justify-between rounded-[22px] border border-[#d9d9dd] p-6">
            <div className="text-[28px] leading-[1.1]">{title}</div>
            <div className="mt-8 text-[15px] text-[#75758a]">{desc}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OperationVisual() {
  return (
    <Panel className="min-h-[330px]">
      <div className="grid h-full gap-3">
        {['public data update', 'amenity rebuild', 'current score recompute', 'state / lock / rate limit'].map((label) => (
          <div key={label} className="rounded-[16px] border border-[#d9d9dd] bg-white px-6 py-5 font-mono text-[16px] tracking-normal">
            {label}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ClosingVisual() {
  const tracks = [
    ['01', '연구', '비용, 공간, 생활 기준을 동네 단위로 재구성'],
    ['02', '서비스', '지도, 비교, AI 질문으로 후보를 좁히는 흐름'],
    ['03', '운영', '공공데이터 갱신과 재계산까지 이어지는 구조'],
  ];

  return (
    <Panel dark className="h-[500px]">
      <div className="flex h-full flex-col">
        <div>
          <p className="font-mono text-[13px] uppercase tracking-normal text-[#ffad9b]">Core Message</p>
          <div className="mt-4 text-[34px] leading-[1.08] tracking-normal [word-break:keep-all]">
            동네를 먼저 찾는다
          </div>
        </div>

        <div className="mt-6 grid gap-3.5">
          {tracks.map(([number, title, desc]) => (
            <div key={title} className="grid grid-cols-[44px_1fr] gap-4 rounded-[16px] border border-white/14 bg-white/7 px-5 py-3.5">
              <span className="font-mono text-[13px] text-[#ffad9b]">{number}</span>
              <div>
                <div className="text-[19px] leading-none">{title}</div>
                <div className="mt-2 text-[14px] leading-[1.45] text-white/62 [word-break:keep-all]">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3.5 rounded-[16px] border border-[#ffad9b]/40 bg-[#ff7759] px-5 py-4 text-[#17171c]">
          <div className="font-mono text-[12px] uppercase tracking-normal text-[#17171c]/70">Outcome</div>
          <div className="mt-2 text-[22px] leading-[1.18] [word-break:keep-all]">
            후보 동네를 줄이고, 선택 이유를 설명한다
          </div>
        </div>
      </div>
    </Panel>
  );
}
