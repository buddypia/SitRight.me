import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AvatarAsset } from '../models';
import { HumanoidPoser, type BoneMap, type HumanBone } from './humanoidPose';

export interface LoadedAvatar {
  /** 向きと位置を合わせるための外枠（x 前向きに回してある） */
  root: THREE.Group;
  poser: HumanoidPoser;
  /** 頭の骨から右耳（外耳孔）までのずれ（初期姿勢のワールド向き, m） */
  earOffset: THREE.Vector3;
  /** モデルの身長（m） */
  height: number;
  /** この体の骨だけを解放する（形状などは AvatarTemplate が持つ） */
  dispose: () => void;
}

const BONES: HumanBone[] = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
];
for (const s of ['left', 'right'] as const) {
  for (const b of [
    'Shoulder',
    'UpperArm',
    'LowerArm',
    'Hand',
    'UpperLeg',
    'LowerLeg',
    'Foot',
  ] as const)
    BONES.push(`${s}${b}`);
  for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Little'] as const)
    for (const seg of ['Proximal', 'Intermediate', 'Distal'] as const)
      BONES.push(`${s}${f}${seg}`);
}

/** MakeHuman / MPFB の game_engine リグの骨名 */
function mpfbBoneName(b: HumanBone): string | null {
  const side = b.startsWith('left') ? 'l' : b.startsWith('right') ? 'r' : '';
  const part = side ? b.replace(/^(left|right)/, '') : b;
  const fixed: Record<string, string> = {
    hips: 'pelvis',
    spine: 'spine_01',
    chest: 'spine_02',
    upperChest: 'spine_03',
    neck: 'neck_01',
    head: 'head',
    Shoulder: 'clavicle',
    UpperArm: 'upperarm',
    LowerArm: 'lowerarm',
    Hand: 'hand',
    UpperLeg: 'thigh',
    LowerLeg: 'calf',
    Foot: 'foot',
  };
  if (fixed[part]) return side ? `${fixed[part]}_${side}` : fixed[part];
  const m = part.match(
    /^(Thumb|Index|Middle|Ring|Little)(Proximal|Intermediate|Distal)$/
  );
  if (!m) return null;
  const finger = {
    Thumb: 'thumb',
    Index: 'index',
    Middle: 'middle',
    Ring: 'ring',
    Little: 'pinky',
  }[m[1]]!;
  const seg = { Proximal: '01', Intermediate: '02', Distal: '03' }[m[2]]!;
  return `${finger}_${seg}_${side}`;
}

/**
 * MakeHuman から書き出した glTF は全マテリアルが半透明扱いになるため、
 * 体・服は不透明に、髪などは切り抜き（alpha to coverage）に直す。肌には産毛の光沢を足す。
 */
function fixGltfMaterials(model: THREE.Object3D, asset: AvatarAsset) {
  const { cutout, tint = [], blend } = asset;
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = mats.map((m) => {
      const src = m as THREE.MeshStandardMaterial;
      const isCut = cutout?.test(src.name) ?? false;
      const isSkin = /\.body$/i.test(src.name);
      const mat = isSkin
        ? new THREE.MeshPhysicalMaterial({
            name: src.name,
            map: src.map,
            normalMap: src.normalMap,
            roughness: 0.56,
            metalness: 0,
            sheen: 0.35,
            sheenRoughness: 0.5,
            sheenColor: new THREE.Color(0xffd9c7),
            specularIntensity: 0.55,
          })
        : src;
      if (mat !== src) src.dispose();
      for (const [re, color, gain = 1] of tint)
        if (re.test(mat.name))
          (mat as THREE.MeshStandardMaterial).color
            .setHex(color)
            .multiplyScalar(gain);
      // 目は透明な角膜の層を切り抜き、眼球に濡れた光沢を足す
      const isEye = /high-poly|low-poly/i.test(src.name);
      if (isEye && mat instanceof THREE.MeshPhysicalMaterial) {
        mat.roughness = 0.25;
        mat.clearcoat = 1;
        mat.clearcoatRoughness = 0.05;
      }
      const isBlend = blend?.test(src.name) ?? false;
      mat.transparent = isBlend;
      mat.depthWrite = !isBlend;
      mat.alphaTest = isCut ? 0.35 : isEye ? 0.5 : 0;
      mat.alphaToCoverage = isCut;
      mat.side = isCut ? THREE.DoubleSide : THREE.FrontSide;
      mat.needsUpdate = true;
      return mat;
    }) as THREE.Material[];
    if (mats.length === 1)
      mesh.material = (mesh.material as THREE.Material[])[0];
  });
}

/**
 * 髪は切り抜きだけだと生え際や毛先がギザギザになる。
 * 濃い部分は切り抜きのまま奥行きを書き、残りの薄い縁だけを半透明で重ねて肌になじませる。
 */
function addSoftHairPass(model: THREE.Object3D) {
  const hair: THREE.SkinnedMesh[] = [];
  model.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (
      mesh.isSkinnedMesh &&
      !Array.isArray(mat) &&
      mat.alphaToCoverage &&
      !/eyebrow|eyelash/i.test(mat.name)
    )
      hair.push(mesh);
  });
  for (const mesh of hair) {
    const core = mesh.material as THREE.MeshStandardMaterial;
    core.alphaTest = 0.6;
    const edge = core.clone();
    edge.alphaTest = 0.2;
    edge.alphaToCoverage = false;
    edge.transparent = true;
    edge.depthWrite = false;
    const soft = mesh.clone();
    soft.material = edge;
    soft.userData.softHair = true;
    // 影は本体の切り抜きで足りる
    soft.castShadow = false;
    // 不透明の物より後、ゴーストより前に描く
    soft.renderOrder = 1;
    mesh.parent?.add(soft);
  }
}

export interface AvatarTemplate {
  /** 骨と姿勢を別々に持つ1体を作る（形状・マテリアル・テクスチャは共有） */
  instantiate: () => LoadedAvatar;
  /** 共有している形状・マテリアル・テクスチャを解放する。作った体をすべて外してから呼ぶ */
  dispose: () => void;
}

/**
 * モデルを1回だけ読み込んで解析する。体とゴーストのように同じモデルを何体も出すときは
 * instantiate で複製し、GLB の展開と GPU への転送を1回で済ませる
 */
export async function loadAvatarTemplate(
  asset: AvatarAsset
): Promise<AvatarTemplate> {
  const loader = new GLTFLoader();
  // GLB は gltf-transform の meshopt 圧縮で軽くしてある
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(asset.url);
  const source = gltf.scene;
  fixGltfMaterials(source, asset);
  source.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      // 眉・まつ毛の細い毛束は影の解像度では顔一面のまだらな影になるので、影を落とさない
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      o.castShadow = !mats.some((m) => /eyebrow|eyelash/i.test(m.name));
      o.receiveShadow = true;
      // 骨で大きく動かすので、視錐台カリングで体の一部が消えないようにする
      o.frustumCulled = false;
    }
  });
  addSoftHairPass(source);
  return {
    instantiate: () => instantiate(asset, cloneSkinned(source)),
    dispose: () => disposeShared(source),
  };
}

function instantiate(asset: AvatarAsset, model: THREE.Object3D): LoadedAvatar {
  const bones: BoneMap = {};
  const byName = new Map<string, THREE.Object3D>();
  model.traverse((o) => byName.set(o.name, o));
  for (const b of BONES) {
    // VRM と同じ骨名（自作キャラ）ならそのまま、なければ MakeHuman の名前で探す
    const name = mpfbBoneName(b);
    const node = byName.get(b) ?? (name ? byName.get(name) : undefined);
    if (node) bones[b] = node;
  }

  // +z 向きのモデルを、x 前（机の方向）に向ける
  const root = new THREE.Group();
  const facing = new THREE.Group();
  facing.rotation.y = Math.PI / 2 + (asset.yaw ?? 0);
  facing.add(model);
  root.add(facing);
  root.scale.setScalar(asset.scale ?? 1);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const height = box.max.y - box.min.y;
  const poser = new HumanoidPoser(root, bones);
  const earOffset = new THREE.Vector3(...asset.ear).multiplyScalar(
    asset.scale ?? 1
  );

  return {
    root,
    poser,
    earOffset,
    height,
    // 体ごとに持つのは骨だけ（骨の行列テクスチャを解放する）。共有分は AvatarTemplate.dispose で解放する
    dispose: () => {
      const skeletons = new Set<THREE.Skeleton>();
      root.traverse((o) => {
        const mesh = o as THREE.SkinnedMesh;
        if (mesh.isSkinnedMesh) skeletons.add(mesh.skeleton);
      });
      skeletons.forEach((s) => s.dispose());
    },
  };
}

function disposeShared(source: THREE.Object3D) {
  const resources = new Set<{ dispose: () => void }>();
  source.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    resources.add(mesh.geometry);
    for (const mat of [mesh.material].flat()) {
      resources.add(mat);
      // マテリアルを解放してもテクスチャは GPU に残るので、別に解放する
      for (const value of Object.values(mat))
        if (value instanceof THREE.Texture) resources.add(value);
    }
  });
  resources.forEach((r) => r.dispose());
}
