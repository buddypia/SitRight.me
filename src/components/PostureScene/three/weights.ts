import * as THREE from 'three';

/**
 * 首にかかる負荷を、頭の上に積んだ鋳鉄プレート（1 枚 = 頭の重さ 5 kg）で表す。
 * 枚数が変わるときは 1 枚ずつ上から落ちて重なる。
 */

export const PLATE_KG = 5;
const MAX_PLATES = 6;
/** 実寸より小さく、頭の幅に合わせた半径と厚み（m） */
const RADIUS = 0.1;
const THICK = 0.026;
const GAP = 0.0015;
const DROP = 0.12;

/** 断面（中心穴・ハブ・くぼんだ面・縁）を回転させたプレート。y が厚み方向 */
function plateGeometry() {
  const r = RADIUS;
  const t = THICK / 2;
  // [半径, 高さ]。下面の内側から外周を回って上面の内側へ
  const half: [number, number][] = [
    [0.15 * r, 0.62 * t],
    [0.17 * r, t * 0.96],
    [0.19 * r, t],
    [0.3 * r, t],
    [0.33 * r, 0.97 * t],
    [0.36 * r, 0.72 * t],
    [0.8 * r, 0.72 * t],
    [0.83 * r, 0.82 * t],
    [0.86 * r, 0.97 * t],
    [0.89 * r, t],
    [0.95 * r, t],
    [0.985 * r, 0.9 * t],
    [r, 0.62 * t],
    [r, 0],
  ];
  // 下面を内→外、上面を外→内とたどり、中心穴の内壁で閉じる（外周が外を向く順）
  const prof = [
    ...half.map(([x, y]) => new THREE.Vector2(x, -y)),
    ...half
      .slice(0, -1)
      .reverse()
      .map(([x, y]) => new THREE.Vector2(x, y)),
  ];
  prof.push(prof[0].clone());
  return new THREE.LatheGeometry(prof, 72);
}

export class NeckWeights {
  readonly group = new THREE.Group();
  private plates: THREE.Mesh[] = [];
  private mats: THREE.MeshPhysicalMaterial[] = [];
  private presence = new Array<number>(MAX_PLATES).fill(0);
  private geo = plateGeometry();
  private pinGeo = new THREE.CylinderGeometry(0.011, 0.011, 1, 32);
  private pinMat = new THREE.MeshPhysicalMaterial({
    color: 0xd6dade,
    metalness: 1,
    roughness: 0.22,
    transparent: true,
  });
  private pin = new THREE.Mesh(this.pinGeo, this.pinMat);

  constructor() {
    for (let i = 0; i < MAX_PLATES; i += 1) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x5d636b,
        metalness: 0.6,
        roughness: 0.36,
        clearcoat: 0.25,
        clearcoatRoughness: 0.55,
        transparent: true,
      });
      const m = new THREE.Mesh(this.geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      // 1 枚ごとに少し回して、映り込みが揃いすぎないようにする
      m.rotation.y = i * 1.7;
      this.mats.push(mat);
      this.plates.push(m);
      this.group.add(m);
    }
    this.pin.castShadow = true;
    this.group.add(this.pin);
    this.group.visible = false;
  }

  /**
   * base: 頭のてっぺん（ワールド座標）。プレートは常に水平に積む。
   * 戻り値は積んだプレートの上端（ラベルの位置に使う）
   */
  update(
    base: THREE.Vector3,
    scale: number,
    loadKg: number,
    opacity: number,
    dt: number
  ) {
    this.group.visible = opacity > 0.01;
    const count = Math.min(MAX_PLATES, Math.round(loadKg / PLATE_KG));
    // 下の 1 枚から順に、前の 1 枚がほぼ載ってから次が落ちる
    const k = 1 - Math.exp(-dt * 9);
    let top = 0;
    let pitch = 0;
    this.plates.forEach((plate, i) => {
      const goal = i < count ? 1 : 0;
      const below = i === 0 ? 1 : this.presence[i - 1];
      const p = this.presence[i];
      this.presence[i] =
        goal > p
          ? p + (Math.min(goal, below * 1.15) - p) * k
          : p + (goal - p) * k;
      const v = THREE.MathUtils.clamp(this.presence[i], 0, 1);
      const fall = (1 - v) * (1 - v) * DROP * scale;
      pitch = (THICK + GAP) * scale;
      const y = base.y + (THICK / 2) * scale + i * pitch + fall;
      plate.position.set(base.x, y, base.z);
      plate.scale.setScalar(scale);
      plate.visible = v > 0.01;
      this.mats[i].opacity = opacity * Math.min(1, v * 1.6);
      this.mats[i].depthWrite = v > 0.98;
      if (v > 0.5) top = Math.max(top, i + 1);
    });
    const h = top * pitch;
    this.pin.position.set(base.x, base.y + h / 2 + 0.006 * scale, base.z);
    this.pin.scale.set(scale, Math.max(0.001, h + 0.012 * scale), scale);
    this.pinMat.opacity = opacity;
    this.pin.visible = top > 0;
    return new THREE.Vector3(base.x, base.y + h, base.z);
  }

  dispose() {
    this.geo.dispose();
    this.pinGeo.dispose();
    this.pinMat.dispose();
    this.mats.forEach((m) => m.dispose());
  }
}
