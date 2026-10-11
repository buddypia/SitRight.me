import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { IDEAL_RIG, type RigParams } from '@/core/rig';
import { AVATAR_ASSETS, type Avatar } from '../models';
import { loadAvatar, type LoadedAvatar } from './avatarLoader';
import type { HumanBone, HumanoidPoser, PoseTargets } from './humanoidPose';
import { buildProps, DESK, LAPTOP, SEAT_TOP, type Props } from './props';
import { SpineXray } from './spine';

export interface OrbitCamera {
  yaw: number;
  pitch: number;
  distance: number;
  target: [number, number, number];
  fovDeg: number;
}

/** yaw 0 で人物の右側面（+z）から見る。単位は m */
/** ゴーストで描かないマテリアル（口の中・眼球・まつ毛など） */
const GHOST_HIDDEN =
  /teeth|tongue|low-poly|high-poly|eyelash|eyebrow|highlight|blush/i;

export const DEFAULT_CAMERA: OrbitCamera = {
  yaw: 0.2,
  pitch: 0.08,
  distance: 2.7,
  target: [0.24, 0.8, 0],
  fovDeg: 30,
};

export interface RenderState {
  rig: RigParams;
  camera: OrbitCamera;
  /** forward, down, slump, overall（0..1） */
  severity: [number, number, number, number];
  leanSeverity: number;
  xray: number;
  ghostOpacity: number;
  breath: number;
  time: number;
  dt: number;
}

/** オーバーレイ（耳-肩の線など）に使うワールド座標 */
export interface OverlayPoints {
  ear: THREE.Vector3;
  acromion: THREE.Vector3;
  idealHeadTop: THREE.Vector3;
}

/** 輪郭ほど濃くなる半透明の発光（理想姿勢のゴーストと負担の発光に使う） */
function fresnelMaterial(color: THREE.ColorRepresentation) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: 0 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <skinning_pars_vertex>
      #include <clipping_planes_pars_vertex>
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vW;
      void main() {
        #include <beginnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        #include <project_vertex>
        #include <clipping_planes_vertex>
        vN = normalize(transformedNormal);
        vV = normalize(-mvPosition.xyz);
        vW = (modelMatrix * vec4(transformed, 1.0)).xyz;
      }
    `,
    fragmentShader: /* glsl */ `
      #include <clipping_planes_pars_fragment>
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform vec3 uCenter;
      uniform float uRadius;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vW;
      void main() {
        #include <clipping_planes_fragment>
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float a = uOpacity * (0.08 + 0.92 * f);
        // uRadius > 0 のときは中心からの距離で弱める（首・背中など負担の部位だけ光らせる）
        if (uRadius > 0.0) a *= 1.0 - smoothstep(uRadius * 0.4, uRadius, distance(vW, uCenter));
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    clipping: true,
  });
}

interface AvatarInstance {
  id: Avatar;
  model: LoadedAvatar;
  ghost: LoadedAvatar;
  auraNeck: THREE.ShaderMaterial;
  auraBack: THREE.ShaderMaterial;
  targets: PoseTargets;
}

export class ThreeSceneRenderer {
  readonly software: boolean;
  gpuMs: number | null = null;
  lost = false;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
  private props: Props;
  private spine = new SpineXray();
  private ghostMat = fresnelMaterial(0x4deac4);
  private ghostClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private ghostDepthMat = new THREE.MeshBasicMaterial({
    colorWrite: false,
    transparent: true,
    clippingPlanes: [this.ghostClip],
    // 体と重なる所では体を優先する（ゴーストが肌に浮いてちらつかないように）
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 8,
  });
  private current: AvatarInstance | null = null;
  private loading: Avatar | null = null;
  private wanted: Avatar | null = null;
  private disposed = false;
  private envTex: THREE.Texture;
  private key: THREE.DirectionalLight;
  /** モデルを読み込み中・失敗したとき */
  onStatus?: (status: 'loading' | 'ready' | 'error') => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    const gl = this.renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : '';
    this.software = /swiftshader|llvmpipe|software|basic render/i.test(name);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !this.software;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.setClearColor(0x000000, 0);
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);

    // 室内の映り込み（PBR の金属・木の反射に使う）
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.55;

    // 主光源（左前上の窓明かり）・補助光・背中の輪郭を出す逆光
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2622, 0.9));
    const key = new THREE.DirectionalLight(0xfff1e2, 2.6);
    key.position.set(1.6, 2.8, 1.9);
    key.target.position.set(0.2, 0.7, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -1.2;
    key.shadow.camera.right = 1.2;
    key.shadow.camera.top = 1.4;
    key.shadow.camera.bottom = -1.0;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 6;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    this.key = key;
    this.scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xbcd2ff, 0.55);
    fill.position.set(-0.4, 1.2, 2.5);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xcfe3ff, 1.6);
    rim.position.set(-2.2, 1.9, -1.2);
    this.scene.add(rim);

    // 床: 中心から周囲へ背景色に溶ける、影を受ける面
    const floorAlpha = document.createElement('canvas');
    floorAlpha.width = 256;
    floorAlpha.height = 256;
    const fc = floorAlpha.getContext('2d')!;
    const g = fc.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#9a9a9a');
    g.addColorStop(1, '#000000');
    fc.fillStyle = g;
    fc.fillRect(0, 0, 256, 256);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 64),
      new THREE.MeshStandardMaterial({
        color: 0x272b31,
        roughness: 0.85,
        transparent: true,
        alphaMap: new THREE.CanvasTexture(floorAlpha),
        depthWrite: false,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0.3, 0, 0);
    floor.receiveShadow = true;
    floor.renderOrder = -1;
    this.scene.add(floor);

    this.props = buildProps();
    this.scene.add(this.props.group);
    this.scene.add(this.spine.group);
    this.ghostMat.clippingPlanes = [this.ghostClip];
    Object.assign(this.ghostMat, {
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 8,
    });
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
  };
  private onRestored = () => {
    this.lost = false;
  };

  /** 表示するモデルを切り替える。読み込みが終わるまで今のモデルを描き続ける */
  setAvatar(id: Avatar) {
    this.wanted = id;
    if (this.current?.id === id || this.loading === id) return;
    this.loading = id;
    this.onStatus?.('loading');
    void this.load(id);
  }

  private async load(id: Avatar) {
    const asset = AVATAR_ASSETS[id];
    try {
      const [model, ghostSrc] = await Promise.all([
        loadAvatar(asset),
        loadAvatar(asset),
      ]);
      if (this.disposed || this.wanted !== id) {
        model.dispose();
        ghostSrc.dispose();
        return;
      }
      const inst = this.setupInstance(id, model, ghostSrc);
      if (this.current) this.removeInstance(this.current);
      this.current = inst;
      this.loading = null;
      this.onStatus?.('ready');
    } catch (error) {
      console.error('[scene] avatar load failed', error);
      this.loading = null;
      this.onStatus?.('error');
    }
  }

  private setupInstance(
    id: Avatar,
    model: LoadedAvatar,
    ghostSrc: LoadedAvatar
  ): AvatarInstance {
    const asset = AVATAR_ASSETS[id];
    const p = model.poser;
    const s = asset.scale ?? 1;
    // 立ち姿（原点）での骨の位置から、座ったときの配置を決める
    const thighY = p.worldPos('rightUpperLeg').y;
    const foot = p.worldPos('rightFoot');
    const hips = p.worldPos('hips');
    const seatClear = (asset.seatClear ?? 0.085) * s;
    const booster = asset.booster ?? 0;
    this.props.setBooster(booster);
    const lift = SEAT_TOP + booster + seatClear - thighY;
    const reach = p.lengths.rightArm1 + p.lengths.rightArm2;
    const wristY = DESK.top + 0.035;
    const wristX = LAPTOP.x - 0.075;
    let hipX = DESK.front - 0.3;

    const makeTargets = (): PoseTargets => {
      const ankleX = hipX + p.lengths.rightLeg1 * 0.92;
      const wz = 0.12 * s;
      const fz = Math.max(Math.abs(foot.z), 0.09 * s);
      return {
        wrist: {
          left: new THREE.Vector3(wristX, wristY, -wz),
          right: new THREE.Vector3(wristX, wristY, wz),
        },
        ankle: {
          left: new THREE.Vector3(ankleX, foot.y, -fz),
          right: new THREE.Vector3(ankleX, foot.y, fz),
        },
        breath: 0,
      };
    };
    // 肘が軽く曲がる（肩から手首まで腕の長さの 72%）位置まで椅子ごと前後させる。
    // 机の縁に体が当たらない範囲に収める
    const place = () => model.root.position.set(hipX - hips.x, lift, -hips.z);
    for (let i = 0; i < 4; i += 1) {
      place();
      p.apply(IDEAL_RIG, makeTargets());
      const d = p
        .worldPos('rightUpperArm')
        .distanceTo(makeTargets().wrist.right);
      hipX = THREE.MathUtils.clamp(
        hipX + (d - reach * 0.72),
        -0.4,
        DESK.front - (asset.deskGap ?? 0.17)
      );
    }
    place();
    const offset = model.root.position.clone();
    this.props.stool.position.x = hipX + 0.02;

    // 理想姿勢のゴースト: 同じモデルを輪郭の光だけで描く
    const ghostRoot = ghostSrc.root;
    ghostRoot.position.copy(offset);
    const ghostMeshes: THREE.Mesh[] = [];
    ghostRoot.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) ghostMeshes.push(o as THREE.Mesh);
    });
    ghostMeshes.forEach((mesh) => {
      // 口の中や眼球は輪郭の光が透けて見えてしまうので描かない
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      if (mats.some((m) => GHOST_HIDDEN.test(m.name))) mesh.visible = false;
      mesh.material = this.ghostMat;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 20;
      // 先に奥行きだけを書き、いちばん手前の面の輪郭だけが光るようにする（耳や口の中が透けない）
      const skinned = mesh as THREE.SkinnedMesh;
      if (mesh.visible && skinned.isSkinnedMesh) {
        const depth = new THREE.SkinnedMesh(
          skinned.geometry,
          this.ghostDepthMat
        );
        depth.bind(skinned.skeleton, skinned.bindMatrix);
        depth.position.copy(mesh.position);
        depth.quaternion.copy(mesh.quaternion);
        depth.scale.copy(mesh.scale);
        depth.frustumCulled = false;
        depth.renderOrder = 19;
        (mesh.parent ?? ghostRoot).add(depth);
      }
    });
    ghostSrc.vrm?.springBoneManager?.reset();
    ghostSrc.poser.apply(IDEAL_RIG, makeTargets());
    // 首の付け根より下は描かない（体と重なって読みにくくなるため）
    const neck = ghostSrc.poser.worldPos('neck');
    this.ghostClip.set(new THREE.Vector3(0, 1, 0), -(neck.y - 0.01 * s));

    // 負担の発光: 体と同じ骨で動く、輪郭が光るだけの複製メッシュ
    const auraNeck = fresnelMaterial(0xff5a4a);
    const auraBack = fresnelMaterial(0xff5a4a);
    model.root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      for (const mat of [auraNeck, auraBack]) {
        const aura = new THREE.SkinnedMesh(mesh.geometry, mat);
        aura.bind(mesh.skeleton, mesh.bindMatrix);
        aura.position.copy(mesh.position);
        aura.quaternion.copy(mesh.quaternion);
        aura.scale.copy(mesh.scale);
        aura.frustumCulled = false;
        aura.renderOrder = 15;
        (mesh.parent ?? model.root).add(aura);
      }
    });

    this.scene.add(model.root, ghostRoot);
    return {
      id,
      model,
      ghost: ghostSrc,
      auraNeck,
      auraBack,
      targets: makeTargets(),
    };
  }

  private removeInstance(inst: AvatarInstance) {
    this.scene.remove(inst.model.root, inst.ghost.root);
    inst.model.dispose();
    inst.ghost.dispose();
    inst.auraNeck.dispose();
    inst.auraBack.dispose();
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /** ワールド座標 → CSS ピクセル */
  project(p: THREE.Vector3, cssW: number, cssH: number) {
    const v = p.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * cssW, y: ((1 - v.y) / 2) * cssH };
  }

  render(s: RenderState): OverlayPoints | null {
    if (this.lost) return null;
    const c = s.camera;
    // 縦長の表示枠では人物と机が切れないよう引きで撮る
    const aspect = this.camera.aspect;
    const dist = c.distance * Math.max(1, 1.25 / aspect);
    this.camera.fov = c.fovDeg;
    this.camera.position.set(
      c.target[0] + dist * Math.sin(c.yaw) * Math.cos(c.pitch),
      c.target[1] + dist * Math.sin(c.pitch),
      c.target[2] + dist * Math.cos(c.yaw) * Math.cos(c.pitch)
    );
    this.camera.lookAt(c.target[0], c.target[1], c.target[2]);
    this.camera.updateProjectionMatrix();

    const inst = this.current;
    let overlay: OverlayPoints | null = null;
    if (inst) {
      const { model } = inst;
      inst.targets.breath = s.breath;
      model.poser.apply(s.rig, inst.targets);
      if (model.vrm) {
        model.vrm.springBoneManager?.update(Math.min(s.dt, 1 / 20));
        model.vrm.expressionManager?.update();
        model.vrm.lookAt?.update(s.dt);
      }
      const poser = model.poser;
      const scale = AVATAR_ASSETS[inst.id].scale ?? 1;

      // 背骨の通り道: 骨盤〜頭の骨を背中側へずらした点列
      const back = new THREE.Vector3(-1, 0, 0);
      const lateral = new THREE.Vector3(0, 0, 1);
      const h = model.height;
      const upper = poser.bones.upperChest ? 'upperChest' : 'chest';
      // 骨の回転に合わせて背中側へずらす（前屈しても背中の中に収まる）
      const pts = [
        this.bonePoint(poser, 'hips', [-0.014 * h, -0.03 * h, 0]),
        this.bonePoint(poser, 'spine', [-0.013 * h, 0, 0]),
        this.bonePoint(poser, 'chest', [-0.015 * h, 0, 0]),
        this.bonePoint(poser, upper, [-0.018 * h, 0.01 * h, 0]),
        this.bonePoint(poser, 'neck', [-0.016 * h, -0.005 * h, 0]),
        this.bonePoint(poser, 'head', [-0.01 * h, 0, 0]),
      ];
      const sev = s.severity;
      this.spine.update(pts, back, lateral, 0.5 * scale, s.xray, [
        Math.max(sev[0], sev[1]),
        sev[2],
        sev[2] * 0.5,
      ]);

      // 負担の発光: 首（頭の前方突出・うつむき）と背中（丸まり）
      const pulse = 0.75 + 0.25 * Math.sin(s.time * 4.2);
      inst.auraNeck.uniforms.uCenter.value.copy(poser.worldPos('neck'));
      inst.auraNeck.uniforms.uRadius.value = 0.16 * h;
      inst.auraNeck.uniforms.uOpacity.value =
        Math.max(0, Math.max(sev[0], sev[1]) - 0.35) *
        1.1 *
        pulse *
        (1 - s.xray * 0.6);
      inst.auraBack.uniforms.uCenter.value.copy(
        poser.worldPos(poser.bones.upperChest ? 'upperChest' : 'chest')
      );
      inst.auraBack.uniforms.uRadius.value = 0.22 * h;
      inst.auraBack.uniforms.uOpacity.value =
        Math.max(0, Math.max(sev[2], s.leanSeverity * 0.8) - 0.35) *
        1.1 *
        pulse *
        (1 - s.xray * 0.6);

      // 理想姿勢のゴースト（現在の姿勢と重なるときは消す）
      this.ghostMat.uniforms.uOpacity.value = s.ghostOpacity * 0.85;
      inst.ghost.root.visible = s.ghostOpacity > 0.01;

      // オーバーレイ用の点: 右耳と右肩峰
      const ear = this.earPoint(poser, model.earOffset);
      const acromion = poser
        .worldPos('rightUpperArm')
        .add(new THREE.Vector3(0, 0.025 * h, 0.01 * h));
      const idealHeadTop = this.earPoint(inst.ghost.poser, model.earOffset).add(
        new THREE.Vector3(-0.04 * h, 0.12 * h, 0)
      );
      overlay = { ear, acromion, idealHeadTop };
    } else {
      this.spine.group.visible = false;
    }
    this.renderer.render(this.scene, this.camera);
    return overlay;
  }

  /** 頭の骨の回転に合わせた耳の位置 */
  private earPoint(poser: HumanoidPoser, offset: THREE.Vector3) {
    return this.bonePoint(poser, 'head', [offset.x, offset.y, offset.z]);
  }

  /** 初期姿勢でのずれ（ワールド軸）を、骨の初期姿勢からの回転に合わせて回した点 */
  private bonePoint(
    poser: HumanoidPoser,
    bone: HumanBone,
    offset: [number, number, number]
  ) {
    const node = poser.bones[bone]!;
    const delta = node
      .getWorldQuaternion(new THREE.Quaternion())
      .multiply(poser.restWorld(node).clone().invert());
    return node
      .getWorldPosition(new THREE.Vector3())
      .add(new THREE.Vector3(...offset).applyQuaternion(delta));
  }

  finish() {
    this.renderer.getContext().finish();
  }

  dispose() {
    this.disposed = true;
    if (this.current) this.removeInstance(this.current);
    this.current = null;
    this.props.dispose();
    this.spine.dispose();
    this.ghostMat.dispose();
    this.ghostDepthMat.dispose();
    this.envTex.dispose();
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    this.renderer.dispose();
  }
}
