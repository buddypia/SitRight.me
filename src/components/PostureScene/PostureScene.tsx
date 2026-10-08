'use client';

import { useEffect, useRef, useState } from 'react';
import { IDEAL_RIG, type RigParams } from '@/core/rig';
import type { Severities } from '@/core/types';
import type { Messages } from '@/i18n/messages';
import { SceneRenderer } from './renderer';
import {
  DEFAULT_CAMERA,
  IDEAL_ANCHORS,
  buildAnchors,
  cameraBasis,
  projectPoint,
  type OrbitCamera,
} from './sceneMath';

export interface PostureSceneProps {
  rig: RigParams;
  severity: Severities | null;
  xray: boolean;
  t: Messages;
  /** 理想姿勢のゴーストと耳-肩ラインを表示する */
  guides?: boolean;
  /** 姿勢を自動で切り替えるデモ表示 */
  demo?: boolean;
  /** 低フレームレートで描画（省電力） */
  lowPower?: boolean;
  /** デモ表示で姿勢が切り替わったとき */
  onDemoPattern?: (pattern: DemoPattern) => void;
  className?: string;
}

const RIG_KEYS: (keyof RigParams)[] = [
  'thoracicFlexDeg',
  'headForwardCm',
  'headPitchDeg',
  'shoulderProtractCm',
];

export type DemoPattern = 'ideal' | 'straight_neck' | 'text_neck' | 'slouch';

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
      },
      sev: { forward: 0.5, down: 0.1, slump: 0.95, lean: 0 },
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
  guides = true,
  demo = false,
  lowPower = false,
  onDemoPattern,
  className,
}: PostureSceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const offsetLabelRef = useRef<HTMLDivElement>(null);
  const idealLabelRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);

  // 毎フレーム参照する値は ref に入れて、React の再描画と描画ループを切り離す
  const target = useRef({ rig, severity, xray, guides, lowPower });
  target.current = { rig, severity, xray, guides, lowPower };
  const cam = useRef<OrbitCamera>({ ...DEFAULT_CAMERA });
  const camTarget = useRef<OrbitCamera>({ ...DEFAULT_CAMERA });
  const resetViewRef = useRef<() => void>(() => undefined);
  const demoCallback = useRef(onDemoPattern);
  demoCallback.current = onDemoPattern;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    // 小窓（Document PiP）に描画するときは、そちらの window の rAF と表示状態に従う
    const doc = wrap.ownerDocument;
    const win = (doc.defaultView ?? window) as typeof window;
    let renderer: SceneRenderer;
    try {
      const strip = new URLSearchParams(win.location.search).get('strip');
      renderer = new SceneRenderer(
        canvas,
        strip ? strip.split(',').map((d) => `NO_${d.toUpperCase()}`) : []
      );
    } catch (error) {
      console.error('[scene] WebGL init failed', error);
      setFailed(true);
      return;
    }

    const cur: RigParams = { ...IDEAL_RIG };
    const sev = [0, 0, 0, 0] as [number, number, number, number];
    let xrayCur = target.current.xray ? 1 : 0;
    let ghostCur = target.current.guides ? 1 : 0;
    let raf = 0;
    // rAF の時刻は描画先 window の時間軸なので、基準もそちらの performance から取る
    let last = win.performance.now();
    let lastRender = 0;
    let visible = true;
    // ソフトウェア描画の環境では解像度とフレームレートを大きく下げる
    const software = renderer.software;
    let quality = software ? 0.5 : 1;
    let slowFrames = 0;
    let fastFrames = 0;
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
      camTarget.current = { ...DEFAULT_CAMERA };
    };

    const updateOverlay = (
      anchors: ReturnType<typeof buildAnchors>,
      basis: ReturnType<typeof cameraBasis>
    ) => {
      const svg = overlayRef.current;
      if (!svg) return;
      const sk = anchors.skeleton;
      const show = ghostCur > 0.5 ? '1' : '0';
      svg.style.opacity = show;
      const p = (x: number, y: number, z: number) =>
        projectPoint(basis, [x, y, z], cssW, cssH);
      const ear = p(sk.ear.x, sk.ear.y, 7.8);
      const acr = p(sk.acromion.x, sk.acromion.y, 17);
      const plumbTop = p(sk.acromion.x, sk.ear.y + 9, 7.8);
      const plumbBottom = p(sk.acromion.x, sk.acromion.y, 17);
      const plumbAtEar = p(sk.acromion.x, sk.ear.y, 7.8);
      const set = (id: string, attrs: Record<string, number | string>) => {
        const el = svg.querySelector(`[data-id="${id}"]`);
        if (el)
          for (const [k, v] of Object.entries(attrs))
            el.setAttribute(k, String(v));
      };
      set('plumb', {
        x1: plumbBottom.x,
        y1: plumbBottom.y,
        x2: plumbTop.x,
        y2: plumbTop.y,
      });
      set('offset', {
        x1: plumbAtEar.x,
        y1: plumbAtEar.y,
        x2: ear.x,
        y2: ear.y,
      });
      set('ear', { cx: ear.x, cy: ear.y });
      set('acromion', { cx: acr.x, cy: acr.y });
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
        const g = IDEAL_ANCHORS.skeleton.skullPivot;
        const top = p(g.x - 6, g.y + 17, 0);
        idealLabel.style.transform = `translate(${top.x}px, ${top.y}px) translate(-100%, -50%)`;
        idealLabel.style.opacity = ghostCur > 0.5 ? '1' : '0';
      }
    };

    const loop = (now: number) => {
      raf = win.requestAnimationFrame(loop);
      const dt = clamp((now - last) / 1000, 0, 0.1);
      last = now;
      if (!visible || doc.hidden) return;

      const tgt = target.current;
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

      // 描画が重い端末では解像度を自動で調整する（GPU 時間を計測できる場合のみ）
      const gpu = renderer.gpuMs;
      if (!software && gpu !== null) {
        if (gpu > 12) slowFrames += 1;
        else if (gpu < 5) fastFrames += 1;
        if (slowFrames > 30 && quality > 0.6) {
          quality = Math.max(0.6, quality - 0.1);
          slowFrames = 0;
          fastFrames = 0;
          resize();
        } else if (fastFrames > 120 && quality < 1) {
          quality = Math.min(1, quality + 0.1);
          slowFrames = 0;
          fastFrames = 0;
          resize();
        }
      }
      lastRender = now;

      const anchors = buildAnchors(cur);
      // 縦長の表示枠では人物と机が切れないよう引きで撮る
      const aspect = cssW / Math.max(1, cssH);
      const basis = cameraBasis({
        ...c,
        distance: c.distance * Math.max(1, 1.2 / aspect),
      });
      const time = Math.max(0, now - start) / 1000;
      const perf = (window as unknown as { __scenePerf?: number[] })
        .__scenePerf;
      const t0 = perf ? performance.now() : 0;
      renderer.render({
        anchors,
        ghost: IDEAL_ANCHORS,
        camera: basis,
        severity: sev,
        xray: xrayCur,
        ghostOpacity: ghostCur,
        breath: Math.sin((time * Math.PI * 2) / 4.6),
        time,
      });
      if (perf) {
        renderer.finish();
        perf.push(performance.now() - t0);
      }
      updateOverlay(anchors, basis);
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
      />
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
        className="pointer-events-none absolute left-0 top-0 rounded-md bg-[#ffbe5c] px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#1a1306] shadow transition-opacity duration-300"
      />
      <div
        ref={idealLabelRef}
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[11px] font-medium tracking-wide text-[#4deac4] transition-opacity duration-300"
      >
        {t.ideal}
      </div>
      <button
        type="button"
        onClick={() => resetViewRef.current()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/70 backdrop-blur transition hover:text-white"
      >
        {t.resetView}
      </button>
    </div>
  );
}
