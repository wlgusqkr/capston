// MapModeToggle 회귀 가드 — Phase 5 cleanup.
//
// 사용자 지적: LAYERS 라디오 + WEIGHTS 슬라이더 의미 겹침. MapModeToggle 은
// 이 충돌을 단순 2-mode 토글로 해소한다. 클릭 → onModeChange 호출 + 시각 active.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MapModeToggle from './MapModeToggle';

/** 라디오 input 두 개를 value 로 분리해 가져오기. label text 가 두 줄
 *  (라벨 + 부속) 이라 getByLabelText 로는 매칭 안 됨 → role+name 조합 사용. */
function getMatchRadio(): HTMLInputElement {
  // role=radio, value=match 인 input (radiogroup 안에서 유일).
  return screen
    .getAllByRole('radio')
    .find((el) => (el as HTMLInputElement).value === 'match') as HTMLInputElement;
}

function getScoreRadio(): HTMLInputElement {
  return screen
    .getAllByRole('radio')
    .find((el) => (el as HTMLInputElement).value === 'score') as HTMLInputElement;
}

describe('MapModeToggle', () => {
  it('renders 매칭 / 종합 점수 두 옵션 (radio role × 2)', () => {
    render(<MapModeToggle mode="match" onModeChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(getMatchRadio()).toBeInTheDocument();
    expect(getScoreRadio()).toBeInTheDocument();
    // 라벨 텍스트도 노출되어야 (시각 가드).
    expect(screen.getByText('매칭')).toBeInTheDocument();
    expect(screen.getByText('종합 점수')).toBeInTheDocument();
  });

  it('mode="match" 일 때 매칭 라디오가 checked', () => {
    render(<MapModeToggle mode="match" onModeChange={() => {}} />);
    expect(getMatchRadio()).toBeChecked();
    expect(getScoreRadio()).not.toBeChecked();
  });

  it('mode="score" 일 때 종합 점수 라디오가 checked', () => {
    render(<MapModeToggle mode="score" onModeChange={() => {}} />);
    expect(getScoreRadio()).toBeChecked();
    expect(getMatchRadio()).not.toBeChecked();
  });

  it('다른 모드 클릭 시 onModeChange(next) 호출', async () => {
    const onChange = vi.fn();
    render(<MapModeToggle mode="match" onModeChange={onChange} />);

    await userEvent.click(getScoreRadio());
    expect(onChange).toHaveBeenCalledWith('score');
  });

  it('현재 모드 다시 클릭해도 onChange 발화 안 함 (HTML radio 기본 동작)', async () => {
    const onChange = vi.fn();
    render(<MapModeToggle mode="match" onModeChange={onChange} />);

    await userEvent.click(getMatchRadio());
    expect(onChange).not.toHaveBeenCalled();
  });
});
