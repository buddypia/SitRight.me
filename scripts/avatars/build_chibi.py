"""オリジナルのゆるかわマスコット（2頭身）を Blender で作り、リグ付き GLB に書き出す。

blender -b --factory-startup --python scripts/avatars/build_chibi.py -- <preset> <出力.glb>

体はメタボールで一体の柔らかい形にし、色は頂点カラーで塗り分ける。
骨は VRM と同じ名前（hips, spine, ..., rightUpperArm）にして、アプリ側でそのまま使う。
向きは Blender の -Y が正面（glTF では +Z）。
"""

import os
import sys

import bmesh
import bpy
from mathutils import Vector

PRESETS = {
    # クリーム色の顔とお腹、背中と頭が淡い茶色のハムスター
    'hamu': {
        'base': (1.0, 0.95, 0.86),
        'accent': (0.86, 0.6, 0.38),
        'ears': 'round',
        'tail': 0.028,
    },
    # 淡いミント色の小さな恐竜。背中に丸いとげ
    'dino': {
        'base': (0.7, 0.9, 0.78),
        'accent': (0.98, 0.95, 0.84),
        'ears': 'none',
        'tail': 0.0,
        'spikes': True,
    },
}

PINK = (1.0, 0.62, 0.66)


def srgb_to_linear(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def ellipsoid_mesh(co, semi, segments=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2, radius=1, location=co)
    o = bpy.context.active_object
    o.scale = semi
    return o


def capsule_mesh(a, b, r):
    """a から b へのカプセル（球を並べて、後でボクセルで一体化する）"""
    a, b = Vector(a), Vector(b)
    n = max(2, int((b - a).length / (r * 0.35)))
    return [ellipsoid_mesh(a.lerp(b, i / n), (r, r, r), 32) for i in range(n + 1)]


def build_body(p):
    """寸法どおりのプリミティブを重ね、ボクセルリメッシュで継ぎ目のない一体の形にする"""
    objs = []
    # 頭（横に広い大福形）・ほっぺ・首の肉
    objs.append(ellipsoid_mesh((0, 0, 0.55), (0.2, 0.18, 0.17)))
    for s in (-1, 1):
        objs.append(ellipsoid_mesh((s * 0.095, -0.06, 0.5), (0.085, 0.075, 0.065)))
    objs.append(ellipsoid_mesh((0, 0, 0.385), (0.135, 0.115, 0.085)))
    # 胴（洋梨形）
    objs.append(ellipsoid_mesh((0, 0, 0.25), (0.135, 0.115, 0.14)))
    objs.append(ellipsoid_mesh((0, -0.005, 0.17), (0.145, 0.125, 0.09)))
    # 腕（T ポーズ）・丸い手・脚・足
    for s in (-1, 1):
        objs += capsule_mesh((s * 0.09, 0, 0.33), (s * 0.25, 0, 0.33), 0.042)
        objs.append(ellipsoid_mesh((s * 0.265, -0.003, 0.33), (0.05, 0.048, 0.046)))
        objs += capsule_mesh((s * 0.075, 0, 0.14), (s * 0.08, -0.005, 0.05), 0.055)
        objs.append(ellipsoid_mesh((s * 0.08, -0.03, 0.035), (0.058, 0.075, 0.036)))
    if p['ears'] == 'round':
        for s in (-1, 1):
            objs.append(ellipsoid_mesh((s * 0.13, 0.0, 0.67), (0.06, 0.028, 0.058)))
    if p['tail']:
        objs.append(ellipsoid_mesh((0, 0.1, 0.13), (p['tail'],) * 3))
    if p.get('spikes'):
        # 背中のとげ: 頭頂から腰へ、体の表面から外へ向けた丸みのある円錐
        for i, (z, y) in enumerate([(0.7, 0.08), (0.6, 0.15), (0.47, 0.15), (0.33, 0.11), (0.22, 0.12)]):
            out = Vector((0, y, z - (0.55 if z > 0.42 else 0.25))).normalized()
            size = 0.058 - i * 0.005
            bpy.ops.mesh.primitive_cone_add(
                vertices=32, radius1=size * 0.95, radius2=size * 0.3, depth=size * 1.15,
                location=Vector((0, y, z)) + out * size * 0.35)
            cone = bpy.context.active_object
            cone.rotation_mode = 'QUATERNION'
            cone.rotation_quaternion = out.to_track_quat('Z', 'Y')
            cone.scale = (0.45, 1, 1)
            objs.append(cone)
        objs += capsule_mesh((0, 0.09, 0.14), (0, 0.24, 0.06), 0.045)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    mesh_obj = bpy.context.active_object
    mesh_obj.name = 'body'
    rem = mesh_obj.modifiers.new('remesh', 'REMESH')
    rem.mode = 'VOXEL'
    rem.voxel_size = 0.0045
    bpy.ops.object.modifier_apply(modifier='remesh')
    # 重なりの谷をなだらかにする
    sm = mesh_obj.modifiers.new('smooth', 'LAPLACIANSMOOTH')
    sm.iterations = 30
    sm.lambda_factor = 1.0
    sm.use_volume_preserve = True
    bpy.ops.object.modifier_apply(modifier='smooth')
    # ボクセルの段差が陰影に出ないよう、形を保ったまま面をならす
    sm2 = mesh_obj.modifiers.new('smooth2', 'SMOOTH')
    sm2.iterations = 20
    sm2.factor = 0.5
    bpy.ops.object.modifier_apply(modifier='smooth2')
    dec = mesh_obj.modifiers.new('decimate', 'DECIMATE')
    dec.ratio = min(1.0, 60000 / max(1, len(mesh_obj.data.polygons)))
    bpy.ops.object.modifier_apply(modifier='decimate')
    for poly in mesh_obj.data.polygons:
        poly.use_smooth = True
    paint(mesh_obj, p)
    return mesh_obj


def paint(obj, p):
    """頂点カラー: 顔・お腹・手足はベース色、頭頂と背中はアクセント色、耳の内側は桃色"""
    me = obj.data
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    base = srgb_to_linear(p['base'])
    acc = srgb_to_linear(p['accent'])
    pink = srgb_to_linear(PINK)
    for v in me.vertices:
        x, y, z = v.co
        if p['ears'] == 'round':
            # 頭頂から背中へ続く模様。顔の前面と胴の前は塗らない
            head = smoothstep(0.58, 0.63, z + 0.6 * max(0.0, y + 0.06)) if z > 0.42 else 0.0
            back = smoothstep(0.02, 0.07, y) * smoothstep(0.1, 0.18, z) if z <= 0.46 else 0.0
            arm = smoothstep(0.17, 0.2, abs(x)) * smoothstep(0.24, 0.42, z)
            t = max(head, back) * (1.0 - arm)
        else:
            # 体はベース色、お腹と口元だけアクセント色（明るい色）
            belly = smoothstep(-0.06, -0.12, y) * smoothstep(0.42, 0.3, z) * smoothstep(0.08, 0.12, z)
            muzzle = smoothstep(-0.13, -0.18, y) * smoothstep(0.58, 0.5, z) * smoothstep(0.42, 0.47, z)
            t = max(belly, muzzle)
        c = [base[i] + (acc[i] - base[i]) * t for i in range(3)]
        if p['ears'] == 'round' and z > 0.66 and abs(x) > 0.1 and y < 0.0:
            k = smoothstep(0.0, -0.025, y) * smoothstep(0.68, 0.72, z)
            c = [c[i] + (pink[i] - c[i]) * k * 0.85 for i in range(3)]
        attr.data[v.index].color = (*c, 1.0)


def material(name, color, rough=0.6, sheen=0.0, coat=0.0, use_vcol=False, alpha=1.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*srgb_to_linear(color), 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Sheen Weight'].default_value = sheen
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Alpha'].default_value = alpha
    if use_vcol:
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    if alpha < 1.0:
        mat.surface_render_method = 'BLENDED'
    return mat


def ellipsoid(name, co, scale, mat, segments=32, normal=None):
    """楕円体を作り、位置・向き・大きさを頂点へ焼き込む（normal があれば薄い軸 y をその向きへ）"""
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2, radius=1, location=co)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    if normal is not None:
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = Vector(normal).to_track_quat('-Y', 'Z')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


def surface_point(body, origin, direction):
    """体の表面上の点（顔のパーツを貼り付ける位置）"""
    deps = bpy.context.evaluated_depsgraph_get()
    hit, loc, normal, *_ = body.ray_cast(Vector(origin), Vector(direction).normalized(), depsgraph=deps)
    if not hit:
        raise RuntimeError(f'no surface hit from {origin}')
    return loc, normal


def face_parts(body, p):
    parts = []
    black = material('eye', (0.03, 0.025, 0.03), rough=0.08, coat=1.0)
    white = material('highlight', (1, 1, 1), rough=0.3)
    blush = material('blush', PINK, rough=0.8, alpha=0.55)
    nose_mat = material('nose', (0.95, 0.55, 0.58), rough=0.35, coat=0.6)
    mouth_mat = material('mouth', (0.35, 0.18, 0.16), rough=0.6)
    for s in (-1, 1):
        loc, n = surface_point(body, (s * 0.07, -0.5, 0.565), (0, 1, 0))
        parts.append(ellipsoid(f'eye_{s}', loc - n * 0.003, (0.021, 0.009, 0.028), black, normal=n))
        hl_loc, hl_n = surface_point(body, (s * 0.07 + 0.006, -0.5, 0.577), (0, 1, 0))
        parts.append(ellipsoid(f'hl_{s}', hl_loc + hl_n * 0.0075, (0.0075, 0.0025, 0.0085), white, 16, normal=hl_n))
        loc, n = surface_point(body, (s * 0.12, -0.5, 0.49), (0, 1, 0))
        parts.append(ellipsoid(f'blush_{s}', loc + n * 0.002, (0.03, 0.004, 0.018), blush, 24, normal=n))
    loc, n = surface_point(body, (0, -0.5, 0.52), (0, 1, 0))
    parts.append(ellipsoid('nose', loc + n * 0.002, (0.011, 0.007, 0.008), nose_mat, 16))
    # 口（小さな ω 形をカーブで描いて肉付けする）
    curve = bpy.data.curves.new('mouth', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.0032
    curve.bevel_resolution = 4
    spl = curve.splines.new('BEZIER')
    pts = [(-0.022, 0.0), (-0.011, -0.011), (0.0, -0.002), (0.011, -0.011), (0.022, 0.0)]
    spl.bezier_points.add(len(pts) - 1)
    for bp, (x, dz) in zip(spl.bezier_points, pts):
        l2, n2 = surface_point(body, (x, -0.5, 0.505 + dz), (0, 1, 0))
        bp.co = l2 + n2 * 0.001
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    mo = bpy.data.objects.new('mouth', curve)
    bpy.context.collection.objects.link(mo)
    mo.data.materials.append(mouth_mat)
    bpy.context.view_layer.objects.active = mo
    bpy.ops.object.select_all(action='DESELECT')
    mo.select_set(True)
    bpy.ops.object.convert(target='MESH')
    parts.append(bpy.context.active_object)
    return parts


BONES = [
    # name, head, tail, parent
    ('hips', (0, 0, 0.12), (0, 0, 0.2), None),
    ('spine', (0, 0, 0.2), (0, 0, 0.27), 'hips'),
    ('chest', (0, 0, 0.27), (0, 0, 0.34), 'spine'),
    ('neck', (0, 0, 0.34), (0, 0, 0.4), 'chest'),
    ('head', (0, 0, 0.4), (0, 0, 0.72), 'neck'),
]
for side, s in (('right', -1), ('left', 1)):
    BONES += [
        (f'{side}Shoulder', (s * 0.03, 0, 0.33), (s * 0.1, 0, 0.33), 'chest'),
        (f'{side}UpperArm', (s * 0.1, 0, 0.33), (s * 0.18, 0, 0.33), f'{side}Shoulder'),
        (f'{side}LowerArm', (s * 0.18, 0, 0.33), (s * 0.25, 0, 0.33), f'{side}UpperArm'),
        (f'{side}Hand', (s * 0.25, 0, 0.33), (s * 0.3, 0, 0.33), f'{side}LowerArm'),
        (f'{side}UpperLeg', (s * 0.075, 0, 0.13), (s * 0.078, 0, 0.075), 'hips'),
        (f'{side}LowerLeg', (s * 0.078, 0, 0.075), (s * 0.08, 0, 0.035), f'{side}UpperLeg'),
        (f'{side}Foot', (s * 0.08, 0, 0.035), (s * 0.08, -0.07, 0.025), f'{side}LowerLeg'),
    ]


def build_rig(body, parts):
    arm = bpy.data.armatures.new('rig')
    rig = bpy.data.objects.new('rig', arm)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for name, h, t, parent in BONES:
        b = arm.edit_bones.new(name)
        b.head, b.tail = h, t
        if parent:
            b.parent = arm.edit_bones[parent]
            b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    # 体は自動ウェイト、顔のパーツは頭に固定
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    # 自動ウェイトの境目をならして、首や肩の曲げでしわが寄らないようにする
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.6, repeat=12, expand=0.2)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in parts:
        g = o.vertex_groups.new(name='head')
        g.add([v.index for v in o.data.vertices], 1.0, 'REPLACE')
        mod = o.modifiers.new('rig', 'ARMATURE')
        mod.object = rig
        o.parent = rig
    return rig


def main():
    argv = sys.argv[sys.argv.index('--') + 1 :]
    preset, out = argv[0], os.path.abspath(argv[1])
    p = PRESETS[preset]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    body = build_body(p)
    body.data.materials.append(material('fur', (1, 1, 1), rough=0.72, sheen=0.6, use_vcol=True))
    parts = face_parts(body, p)
    build_rig(body, parts)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format='GLB',
        use_selection=True,
        export_skins=True,
        export_morph=False,
        export_animations=False,
        export_vertex_color='ACTIVE',
        export_yup=True,
    )
    print('EXPORTED', out, len(body.data.polygons))


main()
