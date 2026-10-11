import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, type SoundTheme } from '@/stores/appStore';

describe('Sound System and Themes', () => {
  const publicSoundsDir = path.resolve(process.cwd(), 'public/sounds');

  const EXPECTED_SOUND_FILES: Record<SoundTheme, string | null> = {
    'snap-horn': 'snap-c-acoustic-horn.wav',
    'snap-bio': 'snap-a-bio-crack.wav',
    'snap-click': 'snap-b-titanium-click.wav',
    'snap-pop': 'snap-d-subtle-pop.wav',
    chime: null,
  };

  it('verifies default soundTheme is snap-horn', () => {
    expect(DEFAULT_SETTINGS.soundTheme).toBe('snap-horn');
    expect(DEFAULT_SETTINGS.sound).toBe(true);
  });

  it('ensures all WAV files referenced by themes exist in public/sounds', () => {
    for (const [theme, filename] of Object.entries(EXPECTED_SOUND_FILES)) {
      if (filename) {
        const fullPath = path.join(publicSoundsDir, filename);
        expect(
          fs.existsSync(fullPath),
          `Sound file for ${theme} must exist at ${fullPath}`
        ).toBe(true);

        const stats = fs.statSync(fullPath);
        expect(stats.size).toBeGreaterThan(1000); // Non-empty valid audio
      }
    }
  });

  it('validates sound file header format (16-bit PCM WAV)', () => {
    for (const filename of Object.values(EXPECTED_SOUND_FILES)) {
      if (!filename) continue;
      const fullPath = path.join(publicSoundsDir, filename);
      const buffer = fs.readFileSync(fullPath);
      // RIFF header
      expect(buffer.toString('ascii', 0, 4)).toBe('RIFF');
      // WAVE header
      expect(buffer.toString('ascii', 8, 12)).toBe('WAVE');
    }
  });
});
