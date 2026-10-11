#!/usr/bin/env python3
"""
Physical acoustic synthesis of "Spine Snap" / "Bone Crack" sound effects.
Generates 5 distinct, high-fidelity sound variants for SitRight:
- Variant A: Bio Bone Crack (Realistic cavitation & joint pop)
- Variant B: Titanium Mechanical Click (Crisp metallic snap matching 10C blocks)
- Variant C: Acoustic Horn Bloom (Sharp snap followed by warm resonant chord)
- Variant D: Subtle Organic Pop (Gentle, low-fatigue joint reset)
- Variant E: Dual Vertebral Shear (Two-stage micro-crack sequence)
"""

import math
import numpy as np
import wave
import struct
import os

SAMPLE_RATE = 44100

def write_wav(filename, samples):
    """Write float numpy array (-1.0 to 1.0) to 16-bit mono WAV."""
    samples = np.clip(samples, -0.98, 0.98)
    int_samples = (samples * 32767).astype(np.int16)
    
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(int_samples.tobytes())
    print(f"Generated: {filename} ({len(samples)/SAMPLE_RATE:.3f}s)")

def generate_bio_crack():
    """Variant A: Bio Bone Crack (Joint Cavitation).
    Combines high-speed cavitation pressure wave collapse with vertebral body thump.
    """
    duration = 0.22
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    
    # 1. Cavitation Collapse (Fast exponential burst 0-15ms)
    # Pitch drops rapidly from 3200Hz to 1200Hz in 8ms
    f_cav = 1200 + 2000 * np.exp(-t / 0.003)
    phase_cav = np.cumsum(f_cav) * (2 * np.pi / SAMPLE_RATE)
    env_cav = np.exp(-t / 0.006)
    cavitation = np.sin(phase_cav) * env_cav
    
    # 2. High-frequency crack noise (bone surface friction / bubble rupture)
    np.random.seed(42)
    noise = np.random.uniform(-1, 1, len(t))
    # Simple highpass/bandpass weighting
    noise_env = np.exp(-t / 0.004) * 0.8
    # modulated noise
    crack_noise = noise * noise_env * np.sin(2 * np.pi * 4200 * t)
    
    # 3. Bone Body Resonance (Vertebral column thump 180Hz -> 80Hz)
    f_body = 80 + 120 * np.exp(-t / 0.015)
    phase_body = np.cumsum(f_body) * (2 * np.pi / SAMPLE_RATE)
    env_body = np.exp(-t / 0.025)
    body = np.sin(phase_body) * env_body * 0.7
    
    # 4. Joint ring (1850Hz & 2700Hz short ring)
    ring = (np.sin(2 * np.pi * 1850 * t) * 0.4 + np.sin(2 * np.pi * 2700 * t) * 0.3) * np.exp(-t / 0.018)
    
    out = (cavitation * 0.8 + crack_noise * 0.6 + body * 0.5 + ring * 0.3)
    # subtle initial 0.5ms ramp to prevent click at t=0
    attack_samples = int(SAMPLE_RATE * 0.0005)
    out[:attack_samples] *= np.linspace(0, 1, attack_samples)
    
    # Normalize
    out = out / np.max(np.abs(out)) * 0.92
    return out

def generate_titanium_click():
    """Variant B: Titanium Mechanical Click (Crisp metallic snap matching 10C blocks)."""
    duration = 0.16
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    
    # 1. Ultra-fast metallic impact transient (0-3ms)
    f_imp = 8500 + 4000 * np.exp(-t / 0.001)
    phase_imp = np.cumsum(f_imp) * (2 * np.pi / SAMPLE_RATE)
    impulse = np.sin(phase_imp) * np.exp(-t / 0.002)
    
    # 2. Titanium Block Modes (harmonic metallic ring: 3400Hz, 5100Hz, 7600Hz)
    ring1 = np.sin(2 * np.pi * 3420 * t) * np.exp(-t / 0.012)
    ring2 = np.sin(2 * np.pi * 5140 * t) * np.exp(-t / 0.008) * 0.6
    ring3 = np.sin(2 * np.pi * 7680 * t) * np.exp(-t / 0.005) * 0.4
    
    # 3. Micro acoustic burst (air displacement)
    f_disp = 450 * np.exp(-t / 0.008)
    disp = np.sin(2 * np.pi * f_disp * t) * np.exp(-t / 0.015) * 0.4
    
    out = impulse * 0.9 + (ring1 + ring2 + ring3) * 0.5 + disp * 0.3
    attack_samples = int(SAMPLE_RATE * 0.0003)
    out[:attack_samples] *= np.linspace(0, 1, attack_samples)
    
    out = out / np.max(np.abs(out)) * 0.92
    return out

def generate_acoustic_horn():
    """Variant C: Acoustic Horn Bloom (Sharp snap followed by warm resonant chime/horn).
    Directly reflects the 10C icon: sharp wedge opening + orange acoustic cone radiation.
    """
    duration = 0.45
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    
    # 1. Initial sharp snap (0-15ms)
    f_snap = 1600 + 2400 * np.exp(-t / 0.004)
    snap = np.sin(np.cumsum(f_snap) * (2 * np.pi / SAMPLE_RATE)) * np.exp(-t / 0.008)
    
    # High crisp click
    np.random.seed(101)
    click = np.random.uniform(-1, 1, len(t)) * np.exp(-t / 0.003) * 0.6
    
    # 2. Resonant Acoustic Horn Bloom (Harmonic chord: D5 587Hz + A5 880Hz + E6 1318Hz)
    # Starts right as the crack triggers and smoothly radiates outward
    bloom_env = np.exp(-t / 0.12) * (1 - np.exp(-t / 0.008))
    horn1 = np.sin(2 * np.pi * 587.33 * t) * bloom_env * 0.6
    horn2 = np.sin(2 * np.pi * 880.00 * t) * bloom_env * 0.4
    horn3 = np.sin(2 * np.pi * 1318.51 * t) * bloom_env * 0.25
    
    # 3. Soft sub-bass warmth (160Hz)
    sub = np.sin(2 * np.pi * 160 * t) * np.exp(-t / 0.04) * 0.4
    
    out = snap * 0.8 + click * 0.5 + (horn1 + horn2 + horn3) * 0.7 + sub * 0.3
    attack_samples = int(SAMPLE_RATE * 0.0004)
    out[:attack_samples] *= np.linspace(0, 1, attack_samples)
    
    out = out / np.max(np.abs(out)) * 0.92
    return out

def generate_subtle_pop():
    """Variant D: Subtle Organic Pop (Gentle, low-fatigue joint reset).
    Gentle bubble pop / wooden block click that is not jarring.
    """
    duration = 0.18
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    
    # Frequency sweep 1800Hz down to 600Hz
    f_pop = 600 + 1400 * np.exp(-t / 0.008)
    phase_pop = np.cumsum(f_pop) * (2 * np.pi / SAMPLE_RATE)
    env_pop = np.exp(-t / 0.016)
    
    # Second harmonic for body richness
    pop1 = np.sin(phase_pop) * env_pop
    pop2 = np.sin(phase_pop * 1.8) * np.exp(-t / 0.010) * 0.35
    
    # Low thud
    thud = np.sin(2 * np.pi * 220 * t) * np.exp(-t / 0.030) * 0.5
    
    out = pop1 * 0.8 + pop2 * 0.4 + thud * 0.5
    # Smooth 1ms fade in for zero harshness
    attack_samples = int(SAMPLE_RATE * 0.001)
    out[:attack_samples] *= np.linspace(0, 1, attack_samples)
    
    out = out / np.max(np.abs(out)) * 0.90
    return out

def generate_dual_shear():
    """Variant E: Dual Vertebral Shear (Two-stage micro-crack sequence).
    Micro crack at t=0ms, main joint crack at t=32ms.
    """
    duration = 0.32
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    
    # Stage 1: Micro pre-crack (t=0 to 20ms)
    t1 = t
    f1 = 2800 * np.exp(-t1 / 0.003) + 1800
    micro = np.sin(np.cumsum(f1) * (2 * np.pi / SAMPLE_RATE)) * np.exp(-t1 / 0.005) * 0.5
    
    # Stage 2: Main crack (delayed by 32ms)
    delay = 0.032
    t2 = np.maximum(0, t - delay)
    mask2 = (t >= delay).astype(float)
    
    f2 = 1400 + 2200 * np.exp(-t2 / 0.005)
    main_crack = np.sin(np.cumsum(f2) * (2 * np.pi / SAMPLE_RATE)) * np.exp(-t2 / 0.012) * mask2
    
    # Body thump for main crack
    thump = np.sin(2 * np.pi * 140 * t2) * np.exp(-t2 / 0.035) * mask2 * 0.6
    
    # Resonant tail
    tail = np.sin(2 * np.pi * 920 * t2) * np.exp(-t2 / 0.060) * mask2 * 0.3
    
    out = micro * 0.6 + main_crack * 0.9 + thump * 0.6 + tail * 0.4
    attack_samples = int(SAMPLE_RATE * 0.0005)
    out[:attack_samples] *= np.linspace(0, 1, attack_samples)
    
    out = out / np.max(np.abs(out)) * 0.92
    return out

def main():
    sounds = {
        'snap-a-bio-crack': generate_bio_crack(),
        'snap-b-titanium-click': generate_titanium_click(),
        'snap-c-acoustic-horn': generate_acoustic_horn(),
        'snap-d-subtle-pop': generate_subtle_pop(),
        'snap-e-dual-shear': generate_dual_shear(),
    }
    
    for name, samples in sounds.items():
        # Save to .tmp/sound-proposals/
        tmp_path = os.path.join('.tmp/sound-proposals', f'{name}.wav')
        write_wav(tmp_path, samples)
        
        # Save to public/sounds/
        pub_path = os.path.join('public/sounds', f'{name}.wav')
        write_wav(pub_path, samples)
        
        # Also copy to artifacts dir for easy viewing/referencing
        art_dir = '/Users/a13973/.gemini/antigravity-cli/brain/5b9ef652-0223-4651-82d1-20293e3c7cbc/sounds'
        os.makedirs(art_dir, exist_ok=True)
        art_path = os.path.join(art_dir, f'{name}.wav')
        write_wav(art_path, samples)

    print("\nAll 5 sound variants generated successfully!")

if __name__ == '__main__':
    main()
