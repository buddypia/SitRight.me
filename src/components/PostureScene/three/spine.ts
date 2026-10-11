import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * X線表示の背骨。体の中の骨の位置に沿って椎骨を並べ、体を透かして重ねて描く。
 * 椎骨は「椎体（くびれた円柱）+ 棘突起 + 横突起」を合成した形。
 */

const COUNTS = { lumbar: 5, thoracic: 12, cervical: 7 } as const;
export const VERTEBRA_COUNT = COUNTS.lumbar + COUNTS.thoracic + COUNTS.cervical;

/** 椎骨1つ（局所座標: y が背骨の上方向, -x が背中側, 単位は椎体の高さ 1） */
function vertebraGeometry(region: 0 | 1 | 2) {
  // 椎体: 上下の縁が張り出し、中央がくびれた円柱
  const w = [1.55, 1.3, 1.05][region];
  const prof: THREE.Vector2[] = [new THREE.Vector2(0, -0.5)];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    const y = -0.5 + t;
    const waist = 1 - 0.12 * Math.sin(t * Math.PI);
    const rim = Math.min(1, Math.min(t, 1 - t) * 14);
    prof.push(
      new THREE.Vector2(w * 0.5 * waist * (0.86 + 0.14 * rim), y * 0.92)
    );
  }
  prof.push(new THREE.Vector2(0, 0.46));
  const body = new THREE.LatheGeometry(prof, 28);
  body.scale(1, 1, 0.82);
  body.translate(w * 0.12, 0, 0);
  const parts: THREE.BufferGeometry[] = [body];
  // 椎弓と棘突起（後ろ下がりに伸びる）
  const spLen = [0.8, 0.95, 0.65][region];
  const spinous = new THREE.CapsuleGeometry(0.14, spLen, 6, 12);
  spinous.rotateZ(Math.PI / 2 + [0.35, 0.75, 0.25][region]);
  spinous.translate(-w * 0.5 - spLen * 0.42, -[0.18, 0.42, 0.12][region], 0);
  parts.push(spinous);
  const arch = new THREE.TorusGeometry(w * 0.32, 0.11, 8, 20, Math.PI);
  arch.rotateX(Math.PI / 2);
  arch.rotateY(Math.PI / 2);
  arch.translate(-w * 0.42, 0.05, 0);
  parts.push(arch);
  // 横突起（左右）
  for (const s of [-1, 1]) {
    const tp = new THREE.CapsuleGeometry(0.11, [0.6, 0.45, 0.4][region], 6, 10);
    tp.rotateX(Math.PI / 2);
    tp.rotateY(s * 0.35);
    tp.translate(-w * 0.45, 0.08, s * w * 0.55);
    parts.push(tp);
  }
  const merged = mergeGeometries(
    parts.map((g) => (g.index ? g.toNonIndexed() : g)),
    false
  );
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

export class SpineXray {
  readonly group = new THREE.Group();
  private vertebrae: THREE.Mesh[] = [];
  private discs: THREE.Mesh[] = [];
  private geos: THREE.BufferGeometry[];
  private discGeo: THREE.BufferGeometry;
  private materials: THREE.MeshPhysicalMaterial[];
  private discMat: THREE.MeshPhysicalMaterial;
  private curve = new THREE.CatmullRomCurve3(
    [new THREE.Vector3(), new THREE.Vector3(0, 1, 0)],
    false,
    'centripetal'
  );

  constructor() {
    this.geos = [0, 1, 2].map((r) => vertebraGeometry(r as 0 | 1 | 2));
    this.discGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.22, 24);
    this.materials = [0, 1, 2].map(
      () =>
        new THREE.MeshPhysicalMaterial({
          color: 0xf1e8d6,
          roughness: 0.48,
          clearcoat: 0.35,
          clearcoatRoughness: 0.5,
          sheen: 0.4,
          sheenColor: new THREE.Color(0xfff4e0),
          transparent: true,
          depthTest: false,
        })
    );
    this.discMat = new THREE.MeshPhysicalMaterial({
      color: 0x8fc7d8,
      roughness: 0.3,
      transmission: 0,
      transparent: true,
      depthTest: false,
    });
    for (let i = 0; i < VERTEBRA_COUNT; i += 1) {
      const region =
        i < COUNTS.lumbar ? 2 : i < COUNTS.lumbar + COUNTS.thoracic ? 1 : 0;
      const m = new THREE.Mesh(this.geos[region], this.materials[region]);
      m.renderOrder = 10;
      this.vertebrae.push(m);
      this.group.add(m);
      if (i > 0) {
        const d = new THREE.Mesh(this.discGeo, this.discMat);
        d.renderOrder = 9;
        this.discs.push(d);
        this.group.add(d);
      }
    }
  }

  /**
   * 背骨の通り道（仙骨 → 後頭部）に沿って椎骨を並べる。
   * points は下から上へ。back は各点での背中方向（単位ベクトル）。
   */
  update(
    points: THREE.Vector3[],
    back: THREE.Vector3,
    lateral: THREE.Vector3,
    scale: number,
    opacity: number,
    severity: [number, number, number]
  ) {
    this.group.visible = opacity > 0.01;
    if (!this.group.visible) return;
    this.curve.points = points;
    const total = this.curve.getLength();
    // 腰椎 30%, 胸椎 50%, 頸椎 20%（成人の長さの比）
    const share = [0.3, 0.5, 0.2];
    const bounds = [0, share[0], share[0] + share[1], 1];
    const regionOf = (i: number) =>
      i < COUNTS.lumbar ? 2 : i < COUNTS.lumbar + COUNTS.thoracic ? 1 : 0;
    const tAt = (i: number) => {
      const r = regionOf(i);
      const idx =
        r === 2
          ? i
          : r === 1
            ? i - COUNTS.lumbar
            : i - COUNTS.lumbar - COUNTS.thoracic;
      const n =
        r === 2 ? COUNTS.lumbar : r === 1 ? COUNTS.thoracic : COUNTS.cervical;
      const seg = r === 2 ? 0 : r === 1 ? 1 : 2;
      return bounds[seg] + ((idx + 0.5) / n) * (bounds[seg + 1] - bounds[seg]);
    };
    const pos = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const m = new THREE.Matrix4();
    const xAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const prev = new THREE.Vector3();
    const prevTan = new THREE.Vector3();
    this.vertebrae.forEach((v, i) => {
      const t = tAt(i);
      const u = this.curve.getUtoTmapping(t, 0);
      this.curve.getPoint(u, pos);
      this.curve.getTangent(u, tan).normalize();
      const r = regionOf(i);
      const segLen =
        (total * share[2 - r]) /
        [COUNTS.cervical, COUNTS.thoracic, COUNTS.lumbar][r];
      const h = segLen * 0.74;
      // 局所 -x を背中方向に合わせる
      zAxis.copy(lateral).addScaledVector(tan, -lateral.dot(tan)).normalize();
      xAxis.crossVectors(tan, zAxis).normalize();
      if (xAxis.dot(back) > 0) xAxis.negate();
      m.makeBasis(xAxis, tan, zAxis);
      v.quaternion.setFromRotationMatrix(m);
      v.position.copy(pos);
      const width = scale * [0.95, 1.05, 1.25][r];
      v.scale.set(h * width * 2.2, h, h * width * 2.2);
      if (i > 0) {
        const d = this.discs[i - 1];
        d.position.copy(prev).add(pos).multiplyScalar(0.5);
        const dt = prevTan.add(tan).normalize();
        d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dt);
        d.scale.set(h * width * 1.35, h * 0.7, h * width * 1.15);
      }
      prev.copy(pos);
      prevTan.copy(tan);
    });
    // 負担がかかっている区間を赤みで示す（頸椎: 前方/うつむき, 胸椎: 丸まり）
    const warn = new THREE.Color(0xff5a4a);
    const base = new THREE.Color(0xf1e8d6);
    this.materials.forEach((mat, r) => {
      mat.opacity = opacity;
      const s = THREE.MathUtils.clamp(severity[r], 0, 1);
      mat.color.copy(base).lerp(warn, s * 0.75);
      mat.emissive.copy(warn).multiplyScalar(s * 0.35);
    });
    this.discMat.opacity = opacity * 0.85;
  }

  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.discGeo.dispose();
    this.materials.forEach((m) => m.dispose());
    this.discMat.dispose();
  }
}
