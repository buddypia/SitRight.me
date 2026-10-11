import * as THREE from 'three';
import { IDEAL_RIG, solveSkeleton, type RigParams } from '@/core/rig';

/**
 * リグ付きモデル（glTF）を、姿勢パラメータから「座ってノートPCを打つ姿」に組む。
 *
 * ワールド座標は m。x: 前（机の方向）, y: 上, z: 本人の右（カメラ側）。
 * モデルの初期姿勢（T/A ポーズ）からの回転をワールド空間で与えるので、
 * 骨のローカル軸の向きがモデルごとに違っても同じ計算で動かせる。
 */

export type HumanBone =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'upperChest'
  | 'neck'
  | 'head'
  | `${'left' | 'right'}${
      | 'Shoulder'
      | 'UpperArm'
      | 'LowerArm'
      | 'Hand'
      | 'UpperLeg'
      | 'LowerLeg'
      | 'Foot'}`
  | `${'left' | 'right'}${'Thumb' | 'Index' | 'Middle' | 'Ring' | 'Little'}${
      'Proximal' | 'Intermediate' | 'Distal'}`;

export type BoneMap = Partial<Record<HumanBone, THREE.Object3D>>;

const SIDES = ['left', 'right'] as const;
const FINGERS = ['Index', 'Middle', 'Ring', 'Little'] as const;
const SEGMENTS = ['Proximal', 'Intermediate', 'Distal'] as const;

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const DOWN = new THREE.Vector3(0, -1, 0);
const DEG = Math.PI / 180;

/** 直交する2軸（x: fwd, z: across）から回転を作る */
function frameQuat(fwd: THREE.Vector3, across: THREE.Vector3) {
  const y = new THREE.Vector3().crossVectors(across, fwd);
  return new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(fwd, y, across)
  );
}

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/** 2関節 IK: 根元 a から先端の目標 t へ、長さ l1, l2 の腕（脚）を pole の側へ曲げたときの中間関節の位置 */
export function solveTwoBone(
  a: THREE.Vector3,
  t: THREE.Vector3,
  l1: number,
  l2: number,
  pole: THREE.Vector3,
  outMid: THREE.Vector3,
  outEnd: THREE.Vector3
) {
  const dir = _v.subVectors(t, a);
  const dist = THREE.MathUtils.clamp(
    dir.length(),
    Math.abs(l1 - l2) + 1e-4,
    (l1 + l2) * 0.999
  );
  dir.normalize();
  const cosA = THREE.MathUtils.clamp(
    (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist),
    -1,
    1
  );
  const sinA = Math.sqrt(1 - cosA * cosA);
  const p = _v2.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (p.lengthSq() < 1e-8) p.set(0, -1, 0);
  p.normalize();
  outMid
    .copy(a)
    .addScaledVector(dir, l1 * cosA)
    .addScaledVector(p, l1 * sinA);
  outEnd.copy(a).addScaledVector(dir, dist);
}

interface RestInfo {
  local: THREE.Quaternion;
  world: THREE.Quaternion;
}

export interface PoseTargets {
  /** 左右の手首の目標（ワールド） */
  wrist: { left: THREE.Vector3; right: THREE.Vector3 };
  /** 左右の足首の目標（ワールド） */
  ankle: { left: THREE.Vector3; right: THREE.Vector3 };
  /** 呼吸（-1..1） */
  breath: number;
}

/** 理想姿勢からの、背骨の各区間の前傾（ラジアン, 前が正） */
function spineDeltas(rig: RigParams) {
  const cur = solveSkeleton(rig).vertebrae;
  const ideal = IDEAL_SKELETON.vertebrae;
  const mean = (from: number, to: number) => {
    let s = 0;
    for (let i = from; i < to; i += 1) s += cur[i].angle - ideal[i].angle;
    return s / (to - from);
  };
  return {
    // 腰椎 0-4, 胸椎 5-16, 頸椎 17-23
    lumbar: mean(0, 5),
    lowerThoracic: mean(5, 11),
    upperThoracic: mean(11, 17),
    cervical: mean(17, 24),
  };
}
const IDEAL_SKELETON = solveSkeleton(IDEAL_RIG);

export class HumanoidPoser {
  readonly bones: BoneMap;
  private rest = new Map<THREE.Object3D, RestInfo>();
  private restPos = new Map<THREE.Object3D, THREE.Vector3>();
  /** 上腕・前腕・大腿・下腿の長さ（m） */
  readonly lengths: Record<string, number> = {};

  constructor(
    private root: THREE.Object3D,
    bones: BoneMap
  ) {
    this.bones = bones;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      this.rest.set(o, {
        local: o.quaternion.clone(),
        world: o.getWorldQuaternion(new THREE.Quaternion()),
      });
      this.restPos.set(o, o.getWorldPosition(new THREE.Vector3()));
    });
    for (const s of SIDES) {
      this.lengths[`${s}Arm1`] = this.dist(`${s}UpperArm`, `${s}LowerArm`);
      this.lengths[`${s}Arm2`] = this.dist(`${s}LowerArm`, `${s}Hand`);
      this.lengths[`${s}Leg1`] = this.dist(`${s}UpperLeg`, `${s}LowerLeg`);
      this.lengths[`${s}Leg2`] = this.dist(`${s}LowerLeg`, `${s}Foot`);
    }
  }

  private dist(a: HumanBone, b: HumanBone) {
    const A = this.bones[a];
    const B = this.bones[b];
    if (!A || !B) return 0;
    return A.getWorldPosition(new THREE.Vector3()).distanceTo(
      B.getWorldPosition(new THREE.Vector3())
    );
  }

  /** 全身を初期姿勢に戻す */
  resetPose() {
    this.root.traverse((o) => {
      const r = this.rest.get(o);
      if (r) o.quaternion.copy(r.local);
    });
    this.root.updateMatrixWorld(true);
  }

  /** 初期姿勢での手の向き（指先方向と親指側の方向から作る回転） */
  private restFrame(
    hand: THREE.Object3D,
    middle: THREE.Object3D,
    index: THREE.Object3D,
    little: THREE.Object3D
  ) {
    const p = (o: THREE.Object3D) => this.restPos.get(o) ?? new THREE.Vector3();
    const fwd = p(middle).clone().sub(p(hand)).normalize();
    const across = p(index).clone().sub(p(little));
    across.addScaledVector(fwd, -across.dot(fwd)).normalize();
    return frameQuat(fwd, across);
  }

  /** 骨のワールド回転を設定する（親は更新済みであること） */
  private setWorld(bone: THREE.Object3D, world: THREE.Quaternion) {
    const parent = bone.parent;
    if (parent) {
      parent.getWorldQuaternion(_q2);
      bone.quaternion.copy(_q2.invert().multiply(world));
    } else bone.quaternion.copy(world);
    bone.updateMatrixWorld(true);
  }

  /** 初期姿勢のワールド回転に、ワールド空間の回転 delta を前から掛ける */
  private rotateFromRest(bone: HumanBone, delta: THREE.Quaternion) {
    const b = this.bones[bone];
    const r = b && this.rest.get(b);
    if (!b || !r) return;
    this.setWorld(b, _q.copy(delta).multiply(r.world));
  }

  /** 骨 bone を、子 child の位置が target へ向くよう最短回転で向ける */
  private aim(bone: HumanBone, child: HumanBone, target: THREE.Vector3) {
    const b = this.bones[bone];
    const c = this.bones[child];
    if (!b || !c) return;
    const p = b.getWorldPosition(new THREE.Vector3());
    const from = c.getWorldPosition(new THREE.Vector3()).sub(p).normalize();
    const to = target.clone().sub(p).normalize();
    const delta = new THREE.Quaternion().setFromUnitVectors(from, to);
    const world = b.getWorldQuaternion(new THREE.Quaternion());
    this.setWorld(b, delta.multiply(world));
  }

  /** 初期姿勢でのワールド回転 */
  restWorld(o: THREE.Object3D) {
    return this.rest.get(o)?.world ?? new THREE.Quaternion();
  }

  worldPos(bone: HumanBone, out = new THREE.Vector3()) {
    const b = this.bones[bone];
    return b ? b.getWorldPosition(out) : out.set(0, 0, 0);
  }

  /** 腰掛けて手をキーボードに置いた姿勢を、姿勢パラメータに合わせて組む */
  apply(rig: RigParams, targets: PoseTargets) {
    this.resetPose();
    const d = spineDeltas(rig);
    const lean = rig.leanDeg * DEG;
    const roll = rig.headRollDeg * DEG;
    const breath = targets.breath * 0.6 * DEG;

    // 背骨: 前屈は体の横軸（z）回り、側屈は前後軸（x）回り。上へ行くほど側屈を大きくする
    const spine = (
      bone: HumanBone,
      flex: number,
      leanShare: number,
      extraRoll = 0
    ) => {
      const q = new THREE.Quaternion()
        .setFromAxisAngle(X, lean * leanShare + extraRoll)
        .multiply(new THREE.Quaternion().setFromAxisAngle(Z, -flex));
      this.rotateFromRest(bone, q);
    };
    const hasUpper = Boolean(this.bones.upperChest);
    spine('hips', d.lumbar * 0.5, 0.05);
    spine('spine', d.lumbar, 0.35);
    spine(
      'chest',
      hasUpper
        ? d.lowerThoracic - breath
        : (d.lowerThoracic + d.upperThoracic) / 2,
      0.75
    );
    if (hasUpper) spine('upperChest', d.upperThoracic + breath, 1);
    spine('neck', d.cervical, 1, roll * 0.4);
    spine('head', rig.headPitchDeg * DEG, 1, roll);

    // 肩の巻き込み: 鎖骨を前へ回す
    const protract = THREE.MathUtils.clamp(rig.shoulderProtractCm / 12, 0, 0.4);
    for (const s of SIDES) {
      const sign = s === 'right' ? 1 : -1;
      this.rotateFromRest(
        `${s}Shoulder`,
        new THREE.Quaternion()
          .setFromAxisAngle(Y, sign * protract)
          .multiply(
            new THREE.Quaternion().setFromAxisAngle(X, sign * -protract * 0.25)
          )
      );
    }

    // 脚: 膝を前に出して足裏を床に置く
    const mid = new THREE.Vector3();
    const end = new THREE.Vector3();
    for (const s of SIDES) {
      const sign = s === 'right' ? 1 : -1;
      const hip = this.worldPos(`${s}UpperLeg`);
      solveTwoBone(
        hip,
        targets.ankle[s],
        this.lengths[`${s}Leg1`],
        this.lengths[`${s}Leg2`],
        new THREE.Vector3(1, 0.2, sign * 0.15),
        mid,
        end
      );
      this.aim(`${s}UpperLeg`, `${s}LowerLeg`, mid);
      this.aim(`${s}LowerLeg`, `${s}Foot`, end);
      // 足は初期姿勢のまま床と平行に保つ
      this.rotateFromRest(`${s}Foot`, new THREE.Quaternion());
    }

    // 腕: 肘を体の横・やや後ろへ逃がして手首をキーボードへ
    for (const s of SIDES) {
      const sign = s === 'right' ? 1 : -1;
      const shoulder = this.worldPos(`${s}UpperArm`);
      solveTwoBone(
        shoulder,
        targets.wrist[s],
        this.lengths[`${s}Arm1`],
        this.lengths[`${s}Arm2`],
        new THREE.Vector3(-0.35, -1, sign * 0.55),
        mid,
        end
      );
      this.aim(`${s}UpperArm`, `${s}LowerArm`, mid);
      this.aim(`${s}LowerArm`, `${s}Hand`, end);
      // 手のひらを下、指先を前へ（わずかに内向き・下向き）。初期姿勢の手の向きは骨の位置から求める
      const hand = this.bones[`${s}Hand`];
      const middle = this.bones[`${s}MiddleProximal`];
      const index = this.bones[`${s}IndexProximal`];
      const little = this.bones[`${s}LittleProximal`];
      if (!hand || !middle || !index || !little) continue;
      const rest = this.restFrame(hand, middle, index, little);
      const fwd = new THREE.Vector3(1, -0.1, -sign * 0.14).normalize();
      // 親指側は体の中心（右手なら -z）
      const across = new THREE.Vector3(0, 0, -sign)
        .addScaledVector(fwd, sign * fwd.z)
        .normalize();
      const target = frameQuat(fwd, across);
      const handDelta = target.multiply(rest.invert());
      this.rotateFromRest(`${s}Hand`, handDelta);
      // 指を軽く曲げる（根元から先へ大きく）。指先が下がる向きに回す
      const curlAxis = new THREE.Vector3().crossVectors(fwd, DOWN).normalize();
      FINGERS.forEach((f, fi) => {
        let curl = 0;
        SEGMENTS.forEach((seg, si) => {
          curl += [14, 26, 18][si] + fi * 3;
          this.rotateFromRest(
            `${s}${f}${seg}`,
            new THREE.Quaternion()
              .setFromAxisAngle(curlAxis, curl * DEG)
              .multiply(handDelta)
          );
        });
      });
      SEGMENTS.forEach((seg, si) => {
        this.rotateFromRest(
          `${s}Thumb${seg}`,
          new THREE.Quaternion()
            .setFromAxisAngle(curlAxis, (6 + si * 10) * DEG)
            .multiply(handDelta)
        );
      });
    }
    this.root.updateMatrixWorld(true);
  }
}
