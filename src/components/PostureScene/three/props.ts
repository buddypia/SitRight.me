import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * デスク・スツール・ノートPC。寸法は実物（m）に合わせる。
 * x: 前, y: 上, z: 人物の右。床は y = 0。
 */
export const DESK = {
  /** 天板の手前の辺 */
  front: 0.34,
  depth: 0.72,
  width: 1.4,
  top: 0.735,
  thickness: 0.03,
};
export const SEAT_TOP = 0.47;
export const LAPTOP = { x: DESK.front + 0.16, width: 0.31, depth: 0.215 };

/** 乱数の種を固定したノイズ（同じ木目を毎回描く） */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** オーク突板の木目（色・粗さ）を Canvas で描く */
function woodTextures(size = 1024) {
  const color = document.createElement('canvas');
  color.width = size;
  color.height = size;
  const c = color.getContext('2d')!;
  const rough = document.createElement('canvas');
  rough.width = size;
  rough.height = size;
  const r = rough.getContext('2d')!;
  const rand = rng(7);
  const grad = c.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#a77a4f');
  grad.addColorStop(0.5, '#b4875a');
  grad.addColorStop(1, '#9c7148');
  c.fillStyle = grad;
  c.fillRect(0, 0, size, size);
  r.fillStyle = '#8c8c8c';
  r.fillRect(0, 0, size, size);
  // 板目: 横に流れる年輪を、ゆらぎのある細い線の束で描く
  for (let i = 0; i < 260; i += 1) {
    const y0 = rand() * size;
    const amp = 4 + rand() * 18;
    const freq = 0.002 + rand() * 0.006;
    const phase = rand() * 10;
    const dark = rand() < 0.35;
    c.strokeStyle = dark
      ? `rgba(70,42,20,${0.12 + rand() * 0.22})`
      : `rgba(205,160,110,${0.06 + rand() * 0.12})`;
    c.lineWidth = 0.6 + rand() * (dark ? 2.6 : 1.4);
    r.strokeStyle = dark ? 'rgba(170,170,170,0.35)' : 'rgba(110,110,110,0.25)';
    r.lineWidth = c.lineWidth;
    c.beginPath();
    r.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y =
        y0 +
        Math.sin(x * freq + phase) * amp +
        Math.sin(x * freq * 3.1) * amp * 0.2;
      if (x === 0) {
        c.moveTo(x, y);
        r.moveTo(x, y);
      } else {
        c.lineTo(x, y);
        r.lineTo(x, y);
      }
    }
    c.stroke();
    r.stroke();
  }
  // 導管（細かな点）
  for (let i = 0; i < 9000; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    c.fillStyle = `rgba(60,36,18,${0.08 + rand() * 0.12})`;
    c.fillRect(x, y, 2 + rand() * 5, 0.8);
  }
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const roughnessMap = new THREE.CanvasTexture(rough);
  roughnessMap.anisotropy = 8;
  return { map, roughnessMap };
}

/** 布（ファブリック）の織り目の凹凸 */
function fabricBump(size = 256) {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d')!;
  const img = c.createImageData(size, size);
  const rand = rng(3);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const weave =
        (Math.sin((x / size) * Math.PI * 2 * 48) *
          Math.sin((y / size) * Math.PI * 2 * 48) +
          1) /
        2;
      const v = Math.round(110 + weave * 90 + (rand() - 0.5) * 40);
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** ノートPCの画面（エディタ風の淡い表示） */
function screenTexture() {
  const w = 512;
  const h = 320;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1d2733');
  g.addColorStop(1, '#141a22');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#232e3b';
  c.fillRect(0, 0, 92, h);
  const rand = rng(11);
  const palette = ['#7fb4ff', '#9be2c8', '#e8c37a', '#c9d1db', '#d79be8'];
  for (let line = 0; line < 18; line += 1) {
    let x = 110 + Math.floor(rand() * 3) * 18;
    const y = 22 + line * 16;
    const words = 1 + Math.floor(rand() * 5);
    for (let k = 0; k < words; k += 1) {
      const len = 20 + rand() * 70;
      c.fillStyle = palette[Math.floor(rand() * palette.length)];
      c.globalAlpha = 0.75;
      c.fillRect(x, y, len, 6);
      x += len + 10;
    }
  }
  c.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface Props {
  group: THREE.Group;
  /** 人物の位置に合わせてスツールを動かす */
  stool: THREE.Group;
  /** 座面に重ねるクッションの厚み（0 で外す） */
  setBooster: (height: number) => void;
  dispose: () => void;
}

export function buildProps(): Props {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T) => {
    disposables.push(o);
    return o;
  };

  // ---------- desk ----------
  const wood = woodTextures();
  track(wood.map);
  track(wood.roughnessMap);
  const woodMat = track(
    new THREE.MeshPhysicalMaterial({
      map: wood.map,
      roughnessMap: wood.roughnessMap,
      roughness: 0.62,
      clearcoat: 0.25,
      clearcoatRoughness: 0.45,
    })
  );
  const top = new THREE.Mesh(
    track(
      new RoundedBoxGeometry(DESK.depth, DESK.thickness, DESK.width, 4, 0.006)
    ),
    woodMat
  );
  top.position.set(
    DESK.front + DESK.depth / 2,
    DESK.top - DESK.thickness / 2,
    0
  );
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 粉体塗装のスチール脚（逆 T 字のフレーム）
  const steel = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x24272c,
      metalness: 0.6,
      roughness: 0.42,
      clearcoat: 0.3,
      clearcoatRoughness: 0.5,
    })
  );
  for (const z of [-DESK.width / 2 + 0.07, DESK.width / 2 - 0.07]) {
    const leg = new THREE.Mesh(
      track(
        new RoundedBoxGeometry(0.06, DESK.top - DESK.thickness, 0.04, 3, 0.008)
      ),
      steel
    );
    leg.position.set(
      DESK.front + DESK.depth / 2,
      (DESK.top - DESK.thickness) / 2,
      z
    );
    const foot = new THREE.Mesh(
      track(new RoundedBoxGeometry(DESK.depth - 0.06, 0.03, 0.05, 3, 0.01)),
      steel
    );
    foot.position.set(DESK.front + DESK.depth / 2, 0.015, z);
    const rail = new THREE.Mesh(
      track(new RoundedBoxGeometry(DESK.depth - 0.1, 0.03, 0.03, 3, 0.008)),
      steel
    );
    rail.position.set(
      DESK.front + DESK.depth / 2,
      DESK.top - DESK.thickness - 0.015,
      z
    );
    for (const m of [leg, foot, rail]) {
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
  }

  // ---------- laptop ----------
  const alu = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xb9bdc4,
      metalness: 1,
      roughness: 0.32,
    })
  );
  const keyMat = track(
    new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.7 })
  );
  const laptop = new THREE.Group();
  const base = new THREE.Mesh(
    track(new RoundedBoxGeometry(LAPTOP.depth, 0.014, LAPTOP.width, 4, 0.005)),
    alu
  );
  base.position.y = 0.007;
  laptop.add(base);
  // キーボード（キーを並べた凹凸）
  const keyGeo = track(
    new RoundedBoxGeometry(0.0155, 0.0022, 0.0155, 2, 0.002)
  );
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, 6 * 14);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let row = 0; row < 6; row += 1)
    for (let col = 0; col < 14; col += 1) {
      m4.makeTranslation(-0.012 + row * 0.0185, 0.0145, -0.121 + col * 0.0186);
      keys.setMatrixAt(k, m4);
      k += 1;
    }
  keys.position.x = 0;
  laptop.add(keys);
  const pad = new THREE.Mesh(
    track(new RoundedBoxGeometry(0.07, 0.0008, 0.11, 2, 0.0004)),
    track(
      new THREE.MeshPhysicalMaterial({
        color: 0xa9adb3,
        metalness: 0.9,
        roughness: 0.18,
      })
    )
  );
  pad.position.set(-0.062, 0.0142, 0);
  laptop.add(pad);
  // 蓋（ヒンジで 110° 開く）
  const lid = new THREE.Group();
  lid.position.set(LAPTOP.depth / 2 - 0.004, 0.014, 0);
  lid.rotation.z = (-18 * Math.PI) / 180;
  const shell = new THREE.Mesh(
    track(new RoundedBoxGeometry(0.008, LAPTOP.depth, LAPTOP.width, 4, 0.003)),
    alu
  );
  shell.position.set(0.004, LAPTOP.depth / 2, 0);
  lid.add(shell);
  const screenTex = track(screenTexture());
  const screen = new THREE.Mesh(
    track(new THREE.PlaneGeometry(LAPTOP.width * 0.92, LAPTOP.depth * 0.86)),
    track(
      new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: screenTex,
        emissiveIntensity: 0.9,
        roughness: 0.08,
        clearcoat: 1,
      })
    )
  );
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(-0.0005, LAPTOP.depth / 2 + 0.004, 0);
  lid.add(screen);
  laptop.add(lid);
  laptop.position.set(LAPTOP.x, DESK.top, 0);
  laptop.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  group.add(laptop);

  // ---------- stool ----------
  const stool = new THREE.Group();
  const fabric = track(fabricBump());
  const cushionMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x3c4552,
      roughness: 0.92,
      bumpMap: fabric,
      bumpScale: 0.6,
      sheen: 0.8,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color(0x8794a8),
    })
  );
  // 側面がふくらんだクッション（回転体）
  const R = 0.2;
  const H = 0.07;
  const prof: THREE.Vector2[] = [];
  prof.push(new THREE.Vector2(0, 0));
  for (let i = 0; i <= 16; i += 1) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI;
    prof.push(
      new THREE.Vector2(
        R - 0.025 + Math.cos(a) * 0.025,
        H / 2 + Math.sin(a) * (H / 2)
      )
    );
  }
  prof.push(new THREE.Vector2(0, H));
  const cushion = new THREE.Mesh(
    track(new THREE.LatheGeometry(prof, 64)),
    cushionMat
  );
  cushion.position.y = SEAT_TOP - H;
  stool.add(cushion);
  const chrome = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xd8dce2,
      metalness: 1,
      roughness: 0.12,
    })
  );
  const blackPlastic = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x1b1d21,
      roughness: 0.45,
      clearcoat: 0.4,
    })
  );
  const pan = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 48)),
    blackPlastic
  );
  pan.position.y = SEAT_TOP - H - 0.015;
  stool.add(pan);
  const column = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.025, 0.025, SEAT_TOP - H - 0.12, 32)),
    chrome
  );
  column.position.y = (SEAT_TOP - H - 0.12) / 2 + 0.1;
  stool.add(column);
  const sleeve = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.032, 0.036, 0.16, 32)),
    blackPlastic
  );
  sleeve.position.y = 0.17;
  stool.add(sleeve);
  // 5本脚とキャスター
  const legGeo = track(new RoundedBoxGeometry(0.3, 0.035, 0.05, 3, 0.012));
  const casterGeo = track(new THREE.SphereGeometry(0.025, 24, 16));
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const leg = new THREE.Mesh(legGeo, chrome);
    leg.position.set(Math.cos(a) * 0.15, 0.075, Math.sin(a) * 0.15);
    leg.rotation.y = -a;
    stool.add(leg);
    const caster = new THREE.Mesh(casterGeo, blackPlastic);
    caster.position.set(Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29);
    caster.scale.set(1, 1, 0.8);
    stool.add(caster);
  }
  // 小柄なキャラクター用の厚いクッション（座面の上に載せる）
  const booster = new THREE.Mesh(new THREE.BufferGeometry(), cushionMat);
  booster.visible = false;
  booster.castShadow = true;
  booster.receiveShadow = true;
  stool.add(booster);
  disposables.push({ dispose: () => booster.geometry.dispose() });
  const setBooster = (h: number) => {
    booster.visible = h > 0;
    if (!booster.visible) return;
    booster.geometry.dispose();
    booster.geometry = new RoundedBoxGeometry(
      0.32,
      h,
      0.32,
      5,
      Math.min(0.04, h / 3)
    );
    booster.position.y = SEAT_TOP + h / 2 - 0.005;
  };
  stool.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  group.add(stool);

  return {
    group,
    stool,
    setBooster,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
