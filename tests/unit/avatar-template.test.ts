import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

/** GLB の代わりに、骨2本と肌のメッシュ1つだけのモデルを返す */
function makeScene() {
  const hips = new THREE.Bone();
  hips.name = 'hips';
  const head = new THREE.Bone();
  head.name = 'head';
  head.position.y = 1.6;
  hips.add(head);
  const map = new THREE.Texture();
  const geometry = new THREE.BoxGeometry();
  const n = geometry.attributes.position.count;
  geometry.setAttribute(
    'skinIndex',
    new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0), 4)
  );
  geometry.setAttribute(
    'skinWeight',
    new THREE.Float32BufferAttribute(
      Array.from({ length: n * 4 }, (_, i) => (i % 4 ? 0 : 1)),
      4
    )
  );
  const mesh = new THREE.SkinnedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ name: 'skin', map })
  );
  mesh.add(hips);
  mesh.bind(new THREE.Skeleton([hips, head]));
  const scene = new THREE.Group();
  scene.add(mesh);
  return { scene, map };
}

const parsed = vi.hoisted(() => ({ count: 0 }));
let source: ReturnType<typeof makeScene>;

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder() {}
    async loadAsync() {
      parsed.count += 1;
      return { scene: source.scene };
    }
  },
}));

const { loadAvatarTemplate } = await import(
  '@/components/PostureScene/three/avatarLoader'
);

function meshOf(root: THREE.Object3D) {
  let found: THREE.SkinnedMesh | undefined;
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh)
      found ??= o as THREE.SkinnedMesh;
  });
  return found!;
}

describe('loadAvatarTemplate', () => {
  it('parses once and gives each instance its own bones over shared resources', async () => {
    source = makeScene();
    parsed.count = 0;
    const template = await loadAvatarTemplate({ url: 'x.glb', ear: [0, 0, 0] });
    const a = template.instantiate();
    const b = template.instantiate();
    expect(parsed.count).toBe(1);

    const ma = meshOf(a.root);
    const mb = meshOf(b.root);
    expect(ma.geometry).toBe(mb.geometry);
    expect(ma.skeleton.bones[0]).not.toBe(mb.skeleton.bones[0]);
    // 片方の姿勢を変えても、もう片方は動かない（体とゴーストを別々に動かせる）
    ma.skeleton.bones[1].rotation.x = 1;
    expect(mb.skeleton.bones[1].rotation.x).toBeCloseTo(0);
    expect(a.height).toBeCloseTo(b.height);
  });

  it('keeps shared resources until the template itself is disposed', async () => {
    source = makeScene();
    const template = await loadAvatarTemplate({ url: 'x.glb', ear: [0, 0, 0] });
    const a = template.instantiate();
    const geometry = meshOf(a.root).geometry;
    const onGeometry = vi.fn();
    const onTexture = vi.fn();
    geometry.addEventListener('dispose', onGeometry);
    source.map.addEventListener('dispose', onTexture);

    a.dispose();
    expect(onGeometry).not.toHaveBeenCalled();

    template.dispose();
    expect(onGeometry).toHaveBeenCalledTimes(1);
    // マテリアルの解放だけでは残るテクスチャも解放する
    expect(onTexture).toHaveBeenCalledTimes(1);
  });
});
