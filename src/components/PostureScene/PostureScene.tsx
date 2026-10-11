'use client';

import { useEffect, useRef, useState } from 'react';
import { IDEAL_RIG, solveSkeleton, type RigParams } from '@/core/rig';
import type { Severities } from '@/core/types';
import type { Messages } from '@/i18n/messages';
import { DEFAULT_AVATAR, type Avatar } from './models';
import {
  DEFAULT_CAMERA,
  ThreeSceneRenderer,
  type OrbitCamera,
  type OverlayPoints,
} from './three/ThreeSceneRenderer';

export interface PostureSceneProps {
  rig: RigParams;
  severity: Severities | null;
  xray: boolean;
  t: Messages;
  /** 表示するモデル */
  avatar?: Avatar;
  /** 理想姿勢のゴーストと耳-肩ラインを表示する */
  guides?: boolean;
  /** 姿勢を自動で切り替えるデモ表示 */
  demo?: boolean;
  /** 低フレームレートで描画（省電力） */
  lowPower?: boolean;
  /** 初期の視点（確認用ページで近景を見るときなど） */
  initialCamera?: Partial<OrbitCamera>;
  /** デモ表示で姿勢が切り替わったとき */
  onDemoPattern?: (pattern: DemoPattern) => void;
  className?: string;
}

const RIG_KEYS: (keyof RigParams)[] = [
  'thoracicFlexDeg',
  'headForwardCm',
  'headPitchDeg',
  'shoulderProtractCm',
  'leanDeg',
  'headRollDeg',
];

export type DemoPattern =
  'ideal' | 'straight_neck' | 'text_neck' | 'slouch' | 'lean';

const IDEAL_SEV: Severities = { forward: 0, down: 0, slump: 0, lean: 0 };
const DEMO_FRAMES: { pattern: DemoPattern; rig: RigParams; sev: Severities }[] =
  [
    { pattern: 'ideal', rig: IDEAL_RIG, sev: IDEAL_SEV },
    {
      pattern: 'straight_neck',
      rig: {
        thoracicFlexDeg: 6,
        headForwardCm: 6.5,
        headPitchDeg: -6,
        shoulderProtractCm: 0.6,
        leanDeg: 0,
        headRollDeg: 0,
      },
      sev: { forward: 0.9, down: 0, slump: 0.1, lean: 0 },
    },
    { pattern: 'ideal', rig: IDEAL_RIG, sev: IDEAL_SEV },
    {
      pattern: 'text_neck',
      rig: {
        thoracicFlexDeg: 10,
        headForwardCm: 3.5,
        headPitchDeg: 32,
        shoulderProtractCm: 1,
        leanDeg: 0,
        headRollDeg: 0,
      },
      sev: { forward: 0.4, down: 0.95, slump: 0.2, lean: 0 },
    },
    { pattern: 'ideal', rig: IDEAL_RIG, sev: IDEAL_SEV },
    {
      pattern: 'slouch',
      rig: {
        thoracicFlexDeg: 30,
        headForwardCm: 4.5,
        headPitchDeg: 8,
        shoulderProtractCm: 3.2,
        leanDeg: 0,
        headRollDeg: 0,
      },
      sev: { forward: 0.5, down: 0.1, slump: 0.95, lean: 0 },
    },
    { pattern: 'ideal', rig: IDEAL_RIG, sev: IDEAL_SEV },
    {
      pattern: 'lean',
      rig: {
        ...IDEAL_RIG,
        leanDeg: -11,
        headRollDeg: -6,
      },
      sev: { forward: 0, down: 0, slump: 0, lean: 0.85 },
    },
  ];
const DEMO_HOLD_MS = 2600;
const PIXEL_BUDGET = 700_000;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function PostureScene({
  rig,
  severity,
  xray,
  t,
  avatar = DEFAULT_AVATAR,
  guides = true,
  demo = false,
  lowPower = false,
  onDemoPattern,
  initialCamera,
  className,
}: PostureSceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const offsetLabelRef = useRef<HTMLDivElement>(null);
  const idealLabelRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<SVGSVGElement>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [dragging, setDragging] = useState(false);

  // 毎フレーム参照する値は ref に入れて、React の再描画と描画ループを切り離す
  const target = useRef({ rig, severity, xray, guides, lowPower, avatar });
  const homeCamera = { ...DEFAULT_CAMERA, ...initialCamera };
  const cam = useRef<OrbitCamera>(homeCamera);
  const camTarget = useRef<OrbitCamera>({ ...homeCamera });
  const homeRef = useRef(homeCamera);
  const resetViewRef = useRef<() => void>(() => undefined);
  const tRef = useRef(t);
  const demoCallback = useRef(onDemoPattern);
  // 描画ループより先に実行されるよう、ループを作る effect より前に置く
  useEffect(() => {
    target.current = { rig, severity, xray, guides, lowPower, avatar };
    tRef.current = t;
    demoCallback.current = onDemoPattern;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    // 小窓（Document PiP）に描画するときは、そちらの window の rAF と表示状態に従う
    const doc = wrap.ownerDocument;
    const win = (doc.defaultView ?? window) as typeof window;
    // モデルの切り替えは描画ループ内で行い、姿勢や視点の状態は保つ
    let shownAvatar = target.current.avatar;
    let renderer: ThreeSceneRenderer;
    try {
      renderer = new ThreeSceneRenderer(canvas);
    } catch (error) {
      console.error('[scene] WebGL init failed', error);
      // WebGL（外部システム）の初期化に失敗したことを画面に反映する
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    renderer.onStatus = setStatus;
    renderer.setAvatar(shownAvatar);

    const cur: RigParams = { ...IDEAL_RIG };
    const sev = [0, 0, 0, 0] as [number, number, number, number];
    let sevLean = 0;
    let xrayCur = target.current.xray ? 1 : 0;
    let ghostCur = target.current.guides ? 1 : 0;
    let raf = 0;
    // rAF の時刻は描画先 window の時間軸なので、基準もそちらの performance から取る
    let last = win.performance.now();
    let lastRender = 0;
    let visible = true;
    // ソフトウェア描画の環境では解像度とフレームレートを大きく下げる
    const software = renderer.software;
    const quality = software ? 0.5 : 1;
    let cssW = 0;
    let cssH = 0;
    let demoIdx = -1;
    const start = win.performance.now();

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      // 画素数の上限を設けて、高解像度ディスプレイでも負荷を一定に保つ
      const budget = Math.sqrt(PIXEL_BUDGET / Math.max(1, cssW * cssH));
      const scale = Math.min(win.devicePixelRatio || 1, 1.5, budget) * quality;
      renderer.resize(
        Math.max(1, Math.round(cssW * scale)),
        Math.max(1, Math.round(cssH * scale))
      );
    };
    const ro = new win.ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    const io = new win.IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(wrap);

    resetViewRef.current = () => {
      camTarget.current = { ...homeRef.current };
    };

    const updateOverlay = (pts: OverlayPoints | null) => {
      const svg = overlayRef.current;
      if (!svg) return;
      const show = ghostCur > 0.5 && pts ? '1' : '0';
      svg.style.opacity = show;
      updateGauge();
      if (!pts) return;
      const p = (v: OverlayPoints['ear']) => renderer.project(v, cssW, cssH);
      const ear = p(pts.ear);
      const acr = p(pts.acromion);
      // 鉛直線は肩峰から耳の高さの少し上まで
      const plumbTop = p(
        pts.acromion
          .clone()
          .setY(pts.ear.y + (pts.ear.y - pts.acromion.y) * 0.45)
      );
      const plumbAtEar = p(pts.acromion.clone().setY(pts.ear.y));
      const set = (id: string, attrs: Record<string, number | string>) => {
        const el = svg.querySelector(`[data-id="${id}"]`);
        if (el)
          for (const [k, v] of Object.entries(attrs))
            el.setAttribute(k, String(v));
      };
      set('plumb', { x1: acr.x, y1: acr.y, x2: plumbTop.x, y2: plumbTop.y });
      set('offset', {
        x1: plumbAtEar.x,
        y1: plumbAtEar.y,
        x2: ear.x,
        y2: ear.y,
      });
      set('ear', { cx: ear.x, cy: ear.y });
      set('acromion', { cx: acr.x, cy: acr.y });
      // 表示する前方へのずれは、計測値から解いた骨格の値（cm）
      const sk = solveSkeleton(cur);
      const offsetCm = sk.ear.x - sk.acromion.x - 0.4;
      const label = offsetLabelRef.current;
      if (label) {
        label.style.transform = `translate(${(ear.x + plumbAtEar.x) / 2}px, ${Math.min(ear.y, plumbAtEar.y) - 14}px) translate(-50%, -100%)`;
        label.textContent = `${offsetCm >= 0 ? '+' : '−'}${Math.abs(offsetCm).toFixed(1)} cm`;
        label.style.opacity =
          Math.abs(offsetCm) >= 0.8 && ghostCur > 0.5 ? '1' : '0';
      }
      const idealLabel = idealLabelRef.current;
      if (idealLabel) {
        const top = p(pts.idealHeadTop);
        idealLabel.style.transform = `translate(${top.x}px, ${top.y}px) translate(-100%, -50%)`;
        idealLabel.style.opacity = ghostCur > 0.5 ? '1' : '0';
      }
    };

    // 横からの3Dでは見えにくい左右の傾きを、後ろから見た模式図で示す
    const updateGauge = () => {
      const g = gaugeRef.current;
      if (!g) return;
      g.style.opacity = ghostCur > 0.5 ? '1' : '0';
      const leanDeg = cur.leanDeg;
      const rollDeg = cur.headRollDeg;
      const headDeg = leanDeg + rollDeg;
      // 後ろから見るので、本人の右（正）は画面でも右（時計回り）
      g.querySelector('[data-id="trunk"]')?.setAttribute(
        'transform',
        `rotate(${leanDeg.toFixed(2)} 48 72)`
      );
      g.querySelector('[data-id="head"]')?.setAttribute(
        'transform',
        `rotate(${rollDeg.toFixed(2)} 48 42)`
      );
      g.style.setProperty(
        '--gauge',
        sevLean >= 0.6
          ? 'var(--poor)'
          : sevLean >= 0.3
            ? 'var(--fair)'
            : 'var(--good)'
      );
      const label = g.querySelector('[data-id="value"]');
      const main = Math.abs(leanDeg) >= Math.abs(headDeg) ? leanDeg : headDeg;
      const deg = Math.round(Math.abs(main));
      const text =
        deg === 0
          ? '0°'
          : `${main > 0 ? tRef.current.sideRight : tRef.current.sideLeft} ${deg}°`;
      if (label && label.textContent !== text) label.textContent = text;
    };

    const loop = (now: number) => {
      raf = win.requestAnimationFrame(loop);
      const dt = clamp((now - last) / 1000, 0, 0.1);
      last = now;
      if (!visible || doc.hidden) return;

      const tgt = target.current;
      if (tgt.avatar !== shownAvatar) {
        shownAvatar = tgt.avatar;
        renderer.setAvatar(shownAvatar);
        lastRender = 0;
      }
      let goalRig = tgt.rig;
      let goalSev = tgt.severity ?? { forward: 0, down: 0, slump: 0, lean: 0 };
      if (demo) {
        const idx =
          Math.floor(Math.max(0, now - start) / DEMO_HOLD_MS) %
          DEMO_FRAMES.length;
        goalRig = DEMO_FRAMES[idx].rig;
        goalSev = DEMO_FRAMES[idx].sev;
        if (idx !== demoIdx) {
          demoIdx = idx;
          demoCallback.current?.(DEMO_FRAMES[idx].pattern);
        }
      }

      // 臨界減衰に近い指数補間で、計測のノイズを有機的な動きに変える
      const k = 1 - Math.exp(-dt * (demo ? 3.2 : 5));
      let moving = false;
      for (const key of RIG_KEYS) {
        const d = goalRig[key] - cur[key];
        if (Math.abs(d) > 0.01) moving = true;
        cur[key] += d * k;
      }
      const sevGoal = [
        goalSev.forward,
        goalSev.down,
        goalSev.slump,
        Math.max(goalSev.forward, goalSev.down, goalSev.slump),
      ];
      sevGoal.forEach((g, i) => {
        sev[i] += (g - sev[i]) * k;
      });
      sevLean += (goalSev.lean - sevLean) * k;
      // 発光（警告の脈動）は左右の傾きでも出す。総合評価と同じく重みを下げる
      sev[3] = Math.max(sev[3], sevLean * 0.6);
      xrayCur += ((tgt.xray ? 1 : 0) - xrayCur) * (1 - Math.exp(-dt * 6));
      ghostCur += ((tgt.guides ? 1 : 0) - ghostCur) * (1 - Math.exp(-dt * 6));

      const c = cam.current;
      const ct = camTarget.current;
      const ck = 1 - Math.exp(-dt * 8);
      c.yaw += (ct.yaw - c.yaw) * ck;
      c.pitch += (ct.pitch - c.pitch) * ck;
      const camMoving =
        Math.abs(ct.yaw - c.yaw) > 1e-3 || Math.abs(ct.pitch - c.pitch) > 1e-3;

      // 動きが落ち着いたら呼吸だけなので低めのフレームレートで十分
      const fpsCap = software
        ? 4
        : tgt.lowPower
          ? 12
          : camMoving || moving
            ? 60
            : 20;
      if (now - lastRender < 1000 / fpsCap - 1) return;

      const frameDt = lastRender ? (now - lastRender) / 1000 : 0;
      lastRender = now;

      const time = Math.max(0, now - start) / 1000;
      const perf = (window as unknown as { __scenePerf?: number[] })
        .__scenePerf;
      const t0 = perf ? performance.now() : 0;
      const pts = renderer.render({
        rig: cur,
        camera: c,
        severity: sev,
        leanSeverity: sevLean,
        xray: xrayCur,
        ghostOpacity: ghostCur,
        breath: Math.sin((time * Math.PI * 2) / 4.6),
        time,
        dt: frameDt,
      });
      if (perf) {
        renderer.finish();
        perf.push(performance.now() - t0);
      }
      updateOverlay(pts);
    };
    raf = win.requestAnimationFrame(loop);

    return () => {
      win.cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      renderer.dispose();
    };
  }, [demo]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const ct = camTarget.current;
    // 机の下や正面（机が体を隠す）に回り込まない範囲に制限する
    ct.yaw = clamp(ct.yaw - e.movementX * 0.008, -1.3, 0.75);
    ct.pitch = clamp(ct.pitch + e.movementY * 0.006, 0.0, 0.5);
  };
  const onPointerUp = () => setDragging(false);

  if (failed) {
    return (
      <div
        className={`grid place-items-center text-sm text-ink-3 ${className ?? ''}`}
      >
        WebGL2 is not available on this device.
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`posture-scene relative touch-pan-y select-none overflow-hidden bg-[#14171c] ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => resetViewRef.current()}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={t.sideView}
        aria-busy={status === 'loading'}
      />
      {status !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
          ) : (
            <span className="text-sm text-ink-3">3D model failed to load.</span>
          )}
        </div>
      )}
      <svg
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500"
        aria-hidden
      >
        <line
          data-id="plumb"
          stroke="rgba(77,234,196,0.75)"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <line
          data-id="offset"
          stroke="rgba(255,190,92,0.95)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          data-id="acromion"
          r="4"
          fill="#0d1014"
          stroke="rgba(77,234,196,0.95)"
          strokeWidth="2"
        />
        <circle
          data-id="ear"
          r="4.5"
          fill="#ffbe5c"
          stroke="#0d1014"
          strokeWidth="1.5"
        />
      </svg>
      <div
        ref={offsetLabelRef}
        className="pointer-events-none absolute left-0 top-0 rounded-md bg-[#ffbe5c] px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#1a1306] shadow-sm transition-opacity duration-300"
      />
      <div
        ref={idealLabelRef}
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[11px] font-medium tracking-wide text-[#4deac4] transition-opacity duration-300"
      >
        {t.ideal}
      </div>
      <svg
        ref={gaugeRef}
        viewBox="0 0 96 96"
        className="pointer-events-none absolute bottom-12 right-3 h-24 w-24 rounded-2xl border border-white/10 bg-black/35 backdrop-blur-sm transition-opacity duration-500"
        style={{ '--gauge': 'var(--good)' } as React.CSSProperties}
        role="img"
        aria-label={t.backView}
      >
        <text
          x="8"
          y="14"
          fontSize="9"
          fill="rgba(255,255,255,0.55)"
          className="tracking-wide"
        >
          {t.backView}
        </text>
        <text
          data-id="value"
          x="88"
          y="14"
          fontSize="9"
          textAnchor="end"
          fill="var(--gauge)"
          className="font-mono font-semibold"
        >
          0°
        </text>
        {/* 理想の正中線 */}
        <line
          x1="48"
          y1="20"
          x2="48"
          y2="82"
          stroke="rgba(77,234,196,0.6)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {/* 骨盤（座面） */}
        <path
          d="M30 78 Q48 70 66 78"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g data-id="trunk">
          <line
            x1="48"
            y1="72"
            x2="48"
            y2="42"
            stroke="var(--gauge)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="30"
            y1="44"
            x2="66"
            y2="44"
            stroke="var(--gauge)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <g data-id="head">
            <line
              x1="48"
              y1="42"
              x2="48"
              y2="36"
              stroke="var(--gauge)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle
              cx="48"
              cy="28"
              r="7"
              fill="none"
              stroke="var(--gauge)"
              strokeWidth="2"
            />
          </g>
        </g>
      </svg>
      <button
        type="button"
        onClick={() => resetViewRef.current()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm transition hover:text-white"
      >
        {t.resetView}
      </button>
    </div>
  );
}
