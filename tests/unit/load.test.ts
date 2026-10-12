import { describe, expect, it } from 'vitest';
import { HEAD_KG, neckFlexionDeg, neckLoadKg } from '@/core/load';
import { IDEAL_RIG } from '@/core/rig';

describe('neck load', () => {
  it('ideal posture carries only the weight of the head', () => {
    expect(neckFlexionDeg(IDEAL_RIG)).toBeCloseTo(0, 5);
    expect(neckLoadKg(IDEAL_RIG)).toBeCloseTo(HEAD_KG, 5);
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

  it('never drops below the head weight when the head tilts back', () => {
    expect(neckLoadKg({ ...IDEAL_RIG, headPitchDeg: -20 })).toBe(HEAD_KG);
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

