// WeightSliders 회귀 가드 — Phase 5 cleanup.
//
// 새로 추가된 4개 프리셋 칩 (균등 / 전월세 / 시설 / 교통) 의 동작 검증:
//   - 칩 클릭 → onWeightsChange(정확한 프리셋 값) 호출
//   - 현재 weights 가 프리셋과 일치하면 칩 active (Soft Stone fill)
//   - disabled prop → 칩도 같이 disabled
//
// 슬라이더 동작은 rebalanceWeights 단위 테스트로 충분 (별도 파일 — 기존).

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WeightSliders from './WeightSliders';

const NOOP = () => {};

describe('WeightSliders 프리셋 칩', () => {
  it('4개 프리셋 칩 렌더 (균등/전월세/시설/교통)', () => {
    render(
      <WeightSliders
        weights={{ rent: 33, amenity: 33, transit: 34 }}
        onWeightsChange={NOOP}
        onOpenPreference={NOOP}
      />,
    );
    expect(screen.getByRole('button', { name: '균등' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전월세' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시설' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '교통' })).toBeInTheDocument();
  });

  it('균등 칩 클릭 → onWeightsChange({33,33,34})', async () => {
    const onChange = vi.fn();
    render(
      <WeightSliders
        weights={{ rent: 100, amenity: 0, transit: 0 }}
        onWeightsChange={onChange}
        onOpenPreference={NOOP}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '균등' }));
    expect(onChange).toHaveBeenCalledWith({ rent: 33, amenity: 33, transit: 34 });
  });

  it('전월세 칩 클릭 → onWeightsChange({100,0,0})', async () => {
    const onChange = vi.fn();
    render(
      <WeightSliders
        weights={{ rent: 33, amenity: 33, transit: 34 }}
        onWeightsChange={onChange}
        onOpenPreference={NOOP}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '전월세' }));
    expect(onChange).toHaveBeenCalledWith({ rent: 100, amenity: 0, transit: 0 });
  });

  it('시설 칩 클릭 → onWeightsChange({0,100,0})', async () => {
    const onChange = vi.fn();
    render(
      <WeightSliders
        weights={{ rent: 33, amenity: 33, transit: 34 }}
        onWeightsChange={onChange}
        onOpenPreference={NOOP}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '시설' }));
    expect(onChange).toHaveBeenCalledWith({ rent: 0, amenity: 100, transit: 0 });
  });

  it('교통 칩 클릭 → onWeightsChange({0,0,100})', async () => {
    const onChange = vi.fn();
    render(
      <WeightSliders
        weights={{ rent: 33, amenity: 33, transit: 34 }}
        onWeightsChange={onChange}
        onOpenPreference={NOOP}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '교통' }));
    expect(onChange).toHaveBeenCalledWith({ rent: 0, amenity: 0, transit: 100 });
  });

  it('현재 weights 와 일치하는 칩만 aria-pressed=true', () => {
    render(
      <WeightSliders
        weights={{ rent: 100, amenity: 0, transit: 0 }}
        onWeightsChange={NOOP}
        onOpenPreference={NOOP}
      />,
    );
    expect(screen.getByRole('button', { name: '전월세' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '균등' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: '시설' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('weights 가 어떤 프리셋과도 안 맞으면 모든 칩 aria-pressed=false', () => {
    // 슬라이더로 직접 조절한 상태 — 어떤 프리셋과도 정확 일치 X.
    render(
      <WeightSliders
        weights={{ rent: 50, amenity: 30, transit: 20 }}
        onWeightsChange={NOOP}
        onOpenPreference={NOOP}
      />,
    );
    for (const label of ['균등', '전월세', '시설', '교통']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    }
  });

  it('disabled=true 일 때 칩 클릭해도 onWeightsChange 호출 안 됨', async () => {
    const onChange = vi.fn();
    render(
      <WeightSliders
        weights={{ rent: 33, amenity: 33, transit: 34 }}
        onWeightsChange={onChange}
        onOpenPreference={NOOP}
        disabled
      />,
    );
    // disabled 칩은 native 동작상 클릭 자체가 안 발화. userEvent 도 무시.
    await userEvent.click(screen.getByRole('button', { name: '전월세' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
