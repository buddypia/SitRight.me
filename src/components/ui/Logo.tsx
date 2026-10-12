'use client';

import { useId } from 'react';

export type LogoVariant = 'default' | 'alert' | 'recovered' | 'break';

export interface LogoProps {
  /** Size in pixels (both width and height). Defaults to 28 */
  size?: number;
  /** Visual status variant. Defaults to 'default' */
  variant?: LogoVariant;
  /** Additional CSS class names */
  className?: string;
  /** Accessible label or decorative flag */
  'aria-hidden'?: boolean;
}

/**
 * SitRight 10C Architectural Monolith Brand Logo
 *
 * Designed with precision titanium vertebrae, acoustic snap cone, and dynamic soundwave arcs.
 * Supports semantic variants for posture states:
 * - 'default': Standard brand logo with tilted cervical vertebra and amber/red acoustic snap
 * - 'alert': High-contrast warning mode with acoustic snap shockwave
 * - 'recovered': Harmonious posture alignment with upright vertebrae and serene emerald/cyan resonance
 * - 'break': Rest mode with calm violet/amber resonance arcs
 */
export function Logo({
  size = 28,
  variant = 'default',
  className = '',
  'aria-hidden': ariaHidden = true,
}: LogoProps) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');

  const isAlert = variant === 'alert';
  const isRecovered = variant === 'recovered';
  const isBreak = variant === 'break';

  // Base background & rim
  const bgGradId = `logo_bg_${id}`;
  const rimGradId = `logo_rim_${id}`;
  const blockGradId = `logo_block_${id}`;
  const tiltedGradId = `logo_tilted_${id}`;
  const hornGradId = `logo_horn_${id}`;

  const dropShadowClass = isAlert
    ? 'drop-shadow-[0_2px_12px_rgba(255,107,91,0.4)]'
    : isRecovered
      ? 'drop-shadow-[0_2px_12px_rgba(77,234,196,0.35)]'
      : isBreak
        ? 'drop-shadow-[0_2px_10px_rgba(129,140,248,0.3)]'
        : 'drop-shadow-[0_2px_10px_rgba(255,149,0,0.35)]';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden={ariaHidden}
      className={`shrink-0 ${dropShadowClass} ${className}`.trim()}
    >
      <defs>
        {/* Dark titanium obsidian background */}
        <linearGradient
          id={bgGradId}
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={isRecovered ? '#101718' : '#181c24'} />
          <stop offset="1" stopColor={isRecovered ? '#080d0e' : '#090b0e'} />
        </linearGradient>

        <linearGradient
          id={rimGradId}
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            stopColor={
              isAlert
                ? '#5a2d2a'
                : isRecovered
                  ? '#1f4842'
                  : isBreak
                    ? '#353358'
                    : '#363f52'
            }
          />
          <stop offset="1" stopColor="#141820" />
        </linearGradient>

        {/* Vertebrae Block Metal Shading */}
        <linearGradient id={blockGradId} x1="0" y1="0" x2="1" y2="0">
          <stop
            offset="0%"
            stopColor={
              isRecovered
                ? '#2a4440'
                : isBreak
                  ? '#2d3248'
                  : '#384356'
            }
          />
          <stop
            offset="50%"
            stopColor={
              isRecovered
                ? '#192b28'
                : isBreak
                  ? '#1c2030'
                  : '#222a38'
            }
          />
          <stop offset="100%" stopColor="#12161f" />
        </linearGradient>

        <linearGradient id={tiltedGradId} x1="0" y1="0" x2="1" y2="0">
          <stop
            offset="0%"
            stopColor={
              isAlert
                ? '#54363a'
                : isRecovered
                  ? '#2f524c'
                  : isBreak
                    ? '#383b58'
                    : '#445268'
            }
          />
          <stop
            offset="50%"
            stopColor={
              isAlert
                ? '#352427'
                : isRecovered
                  ? '#1e3531'
                  : isBreak
                    ? '#22263a'
                    : '#2a3446'
            }
          />
          <stop offset="100%" stopColor="#141a24" />
        </linearGradient>

        {/* Acoustic Cone Horn Wedge */}
        <linearGradient id={hornGradId} x1="0" y1="0.5" x2="1" y2="0.5">
          <stop
            offset="0%"
            stopColor={
              isAlert
                ? '#ff3b30'
                : isRecovered
                  ? '#34d399'
                  : isBreak
                    ? '#818cf8'
                    : '#ff7a00'
            }
          />
          <stop
            offset="100%"
            stopColor={
              isAlert
                ? '#ff9500'
                : isRecovered
                  ? '#4deac4'
                  : isBreak
                    ? '#c084fc'
                    : '#ff9500'
            }
          />
        </linearGradient>
      </defs>

      {/* Squircle Base with Subtle Beveled Rim */}
      <rect width="64" height="64" rx="16" fill={`url(#${bgGradId})`} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="15.25"
        stroke={`url(#${rimGradId})`}
        strokeWidth="1.5"
      />

      {/* Dynamic Soundwave / Resonance Arcs */}
      {isRecovered ? (
        <>
          {/* Serene Aligned Resonance Arcs (Emerald & Cyan) */}
          <path
            d="M 45,18 A 20 20 0 0 1 45,46"
            stroke="#38bdf8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 40,22 A 14 14 0 0 1 40,42"
            stroke="#4deac4"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : isBreak ? (
        <>
          {/* Gentle Rest Wave Arcs (Violet & Indigo) */}
          <path
            d="M 45,18 A 20 20 0 0 1 45,46"
            stroke="#818cf8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 40,22 A 14 14 0 0 1 40,42"
            stroke="#c084fc"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Signature Snap Acoustic Arcs (Crimson & Amber) */}
          <path
            d="M 45,18 A 20 20 0 0 1 45,46"
            stroke="#ff3b30"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 40,22 A 14 14 0 0 1 40,42"
            stroke="#ff9500"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Lower 2 Upright Lumbar Vertebrae */}
      <g>
        <rect
          x="23"
          y="41"
          width="14"
          height="11"
          rx="2.5"
          fill={`url(#${blockGradId})`}
          stroke={isRecovered ? '#2d4d46' : '#475569'}
          strokeWidth="0.8"
        />
        <rect
          x="17"
          y="44"
          width="7"
          height="5.5"
          rx="1.5"
          fill={`url(#${blockGradId})`}
          stroke={isRecovered ? '#2d4d46' : '#475569'}
          strokeWidth="0.8"
        />
      </g>

      <g>
        <rect
          x="23"
          y="27"
          width="14"
          height="11"
          rx="2.5"
          fill={`url(#${blockGradId})`}
          stroke={isRecovered ? '#2d4d46' : '#475569'}
          strokeWidth="0.8"
        />
        <rect
          x="17"
          y="30"
          width="7"
          height="5.5"
          rx="1.5"
          fill={`url(#${blockGradId})`}
          stroke={isRecovered ? '#2d4d46' : '#475569'}
          strokeWidth="0.8"
        />
      </g>

      {/* Upper Cervical Vertebra: Straight in recovered/break; tilted -18deg on alert/default */}
      {isRecovered ? (
        /* Perfectly aligned straight spine */
        <g>
          <rect
            x="23"
            y="13"
            width="14"
            height="11"
            rx="2.5"
            fill={`url(#${tiltedGradId})`}
            stroke="#34d399"
            strokeWidth="0.9"
          />
          <rect
            x="17"
            y="16"
            width="7"
            height="5.5"
            rx="1.5"
            fill={`url(#${tiltedGradId})`}
            stroke="#34d399"
            strokeWidth="0.9"
          />
        </g>
      ) : (
        /* Forward-Tilted Deflected Spine */
        <g transform="rotate(-18 28 26)">
          <rect
            x="22"
            y="13"
            width="14"
            height="11"
            rx="2.5"
            fill={`url(#${tiltedGradId})`}
            stroke={isAlert ? '#991b1b' : '#475569'}
            strokeWidth="0.8"
          />
          <rect
            x="16"
            y="16"
            width="7"
            height="5.5"
            rx="1.5"
            fill={`url(#${tiltedGradId})`}
            stroke={isAlert ? '#991b1b' : '#475569'}
            strokeWidth="0.8"
          />
        </g>
      )}

      {/* Acoustic Cone Horn Wedge */}
      {isRecovered ? (
        <>
          <polygon
            points="26,27 39,21 39,33"
            fill={`url(#${hornGradId})`}
          />
          <polygon points="26,27 39,21 34,26" fill="#a7f3d0" />
        </>
      ) : (
        <>
          <polygon
            points="26,27 40,20 40,34"
            fill={`url(#${hornGradId})`}
          />
          <polygon points="26,27 40,20 34,26" fill={isAlert ? '#ffe066' : '#ffcc00'} />
        </>
      )}

      {/* Core Acoustic Spark */}
      <circle cx="26" cy="27" r="2.2" fill="#ffffff" />
      <circle
        cx="26"
        cy="27"
        r="1.2"
        fill={isRecovered ? '#34d399' : isBreak ? '#818cf8' : '#ff9500'}
      />
    </svg>
  );
}
