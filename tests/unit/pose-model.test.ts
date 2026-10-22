import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_POSE_MODEL,
  isPoseModel,
  POSE_MODELS,
  poseModelPath,
} from '@/core/poseModel';
import { MESSAGES, SUPPORTED_LOCALES } from '@/i18n/messages';
import { DEFAULT_SETTINGS, useAppStore } from '@/stores/appStore';

describe('pose model selection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to the lite model', () => {
    expect(DEFAULT_POSE_MODEL).toBe('lite');
    expect(DEFAULT_SETTINGS.poseModel).toBe('lite');
  });

  it('ships a model file for every selectable model', () => {
    for (const model of POSE_MODELS) {
      const file = path.join(process.cwd(), 'public', poseModelPath(model));
      expect(fs.existsSync(file), file).toBe(true);
    }
  });

  it('rejects unknown model names', () => {
    expect(isPoseModel('lite')).toBe(true);
    expect(isPoseModel('full')).toBe(true);
    expect(isPoseModel('heavy')).toBe(false);
    expect(isPoseModel(undefined)).toBe(false);
  });

  it('falls back to the default when a saved value is unknown', async () => {
    const saved = JSON.stringify({
      state: { settings: { poseModel: 'heavy' } },
      version: 1,
    });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'sitright.v2' ? saved : null),
      setItem: () => {},
      removeItem: () => {},
    });
    await useAppStore.persist.rehydrate();
    expect(useAppStore.getState().settings.poseModel).toBe('lite');
  });

  it('labels every option in all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const t = MESSAGES[locale];
      for (const model of POSE_MODELS) {
        expect(t[`poseModel_${model}`]).toBeTruthy();
      }
    }
  });
});
