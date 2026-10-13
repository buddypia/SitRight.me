import { describe, expect, it, vi } from 'vitest';
import { ThreeSceneRenderer } from '@/components/PostureScene/three/ThreeSceneRenderer';

/** WebGL を作らずに、モデル切り替えの状態遷移だけを確かめる */
function makeRenderer() {
  const r = Object.create(ThreeSceneRenderer.prototype) as ThreeSceneRenderer;
  const statuses: string[] = [];
  Object.assign(r, {
    current: { id: 'man' },
    loading: null,
    wanted: 'man',
    disposed: false,
    onStatus: (s: string) => statuses.push(s),
    // 読み込みは終わらせない（切り替えの途中を再現する）
    load: vi.fn(() => new Promise(() => undefined)),
  });
  return { r, statuses };
}

describe('ThreeSceneRenderer.setAvatar', () => {
  it('returns to ready when switched back to the shown model mid-load', () => {
    const { r, statuses } = makeRenderer();
    r.setAvatar('woman');
    r.setAvatar('man');
    expect(statuses).toEqual(['loading', 'ready']);
  });

  it('does not reload or emit when the shown model is requested again', () => {
    const { r, statuses } = makeRenderer();
    r.setAvatar('man');
    expect(statuses).toEqual([]);
  });
});
