// MatchModeBadge -- Legend 좌측에 인라인으로 붙는 작은 mono 배지.
//
// match 모드일 때만 렌더 (score 모드는 null). Coral 텍스트로 모드 시각 차이
// 를 보강 (eng-review #15: 색/위치/라벨 3중 신호의 한 축).

export default function MatchModeBadge() {
  return (
    <span
      className="mono-label inline-flex items-center gap-1 pr-2 border-r border-divider text-mono-label tracking-[0.26px] text-accent uppercase whitespace-nowrap"
      role="status"
    >
      거래량 분포 보기 중
    </span>
  );
}
