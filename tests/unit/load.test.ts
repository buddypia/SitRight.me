import { describe, expect, it } from 'vitest';
import { HEAD_KG, neckFlexionDeg, neckLoadKg } from '@/core/load';
import { IDEAL_RIG } from '@/core/rig';

describe('neck load', () => {
  it('ideal posture carries zero load on the neck', () => {
    expect(neckFlexionDeg(IDEAL_RIG)).toBeCloseTo(0, 5);
    expect(neckLoadKg(IDEAL_RIG)).toBe(0);
  });

  it('HEAD_KG is 5 kg as adult head weight constant', () => {
    expect(HEAD_KG).toBe(5);
  });

  it('follows Hansraj (2014) for a pure head tilt', () => {
    const at = (deg: number) => neckLoadKg({ ...IDEAL_RIG, headPitchDeg: deg });
    expect(at(15)).toBeCloseTo(12.2, 0);
    expect(at(30)).toBeCloseTo(18.1, 0);
    expect(at(60)).toBeCloseTo(27.2, 0);
    expect(at(90)).toBeCloseTo(27.2, 5);
  });

  it('grows as the head moves forward and down', () => {
    let prev = neckLoadKg(IDEAL_RIG);
    for (const f of [2, 4, 6, 8]) {
      const kg = neckLoadKg({ ...IDEAL_RIG, headForwardCm: f });
      expect(kg).toBeGreaterThan(prev);
      prev = kg;
    }
  });

  it('never drops below 0 when the head tilts back', () => {
    expect(neckLoadKg({ ...IDEAL_RIG, headPitchDeg: -20 })).toBe(0);
  });
});

describe('posture collapsed detection for neck weights', () => {
  it('shows weights only when posture collapses during measurement', async () => {
    const { isPostureCollapsed } = await import(
      '@/components/Monitor/StatusCard'
    );
    expect(isPostureCollapsed('good')).toBe(false);
    expect(isPostureCollapsed('fair')).toBe(true);
    expect(isPostureCollapsed('poor')).toBe(true);
    expect(isPostureCollapsed('paused')).toBe(false);
    expect(isPostureCollapsed('away')).toBe(false);
    expect(isPostureCollapsed('checking')).toBe(false);
  });
});

