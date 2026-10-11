"""MakeHuman（MPFB2, CC0）の人物を Blender で組み立て、リグ付き GLB に書き出す。

blender -b --factory-startup --python scripts/avatars/build_mpfb.py -- <preset> <出力.glb>

前提: Blender に MPFB 拡張を入れ、MakeHuman の CC0 アセットパック
（makehuman_system_assets, skins01, skins02, eyebrows01, eyelashes01）を MPFB のユーザーデータへ展開しておく。
preset は下の PRESETS のキー。使うアセットはすべて CC0（パックの JSON の license で確認）。
"""

import os
import sys

import bpy

from bl_ext.user_default.mpfb.services.humanservice import HumanService

PRESETS = {
    'woman': {
        'phenotype': {
            'gender': 0.0,
            'age': 0.42,
            'muscle': 0.5,
            'weight': 0.42,
            'proportions': 0.75,
            'height': 0.45,
            'cupsize': 0.5,
            'firmness': 0.55,
            'race': {'asian': 0.8, 'caucasian': 0.2, 'african': 0.0},
        },
        'skin_mhmat': 'young_asian_female/young_asian_female.mhmat',
        'hair': 'ponytail01/ponytail01.mhclo',
        'eyebrows': 'mindfront_eyebrows_03/mindfront_eyebrows_03.mhclo',
        'eyelashes': 'mindfront_eyelashes_02/mindfront_eyelashes_02.mhclo',
        'eyes_material': 'brown',
        'clothes': [
            'female_elegantsuit01/female_elegantsuit01.mhclo',
            'shoes04/shoes04.mhclo',
        ],
    },
    'man': {
        'phenotype': {
            'gender': 1.0,
            'age': 0.45,
            'muscle': 0.58,
            'weight': 0.5,
            'proportions': 0.7,
            'height': 0.55,
            'cupsize': 0.5,
            'firmness': 0.5,
            'race': {'asian': 0.8, 'caucasian': 0.2, 'african': 0.0},
        },
        'skin_mhmat': 'young_asian_male/young_asian_male.mhmat',
        'hair': 'short02/short02.mhclo',
        'eyebrows': 'mindfront_eyebrows_09/mindfront_eyebrows_09.mhclo',
        'eyelashes': 'mindfront_eyelashes_01/mindfront_eyelashes_01.mhclo',
        'eyes_material': 'brown',
        'clothes': [
            'male_casualsuit06/male_casualsuit06.mhclo',
            'shoes05/shoes05.mhclo',
        ],
    },
    'senior': {
        'phenotype': {
            'gender': 1.0,
            'age': 0.9,
            'muscle': 0.42,
            'weight': 0.62,
            'proportions': 0.55,
            'height': 0.5,
            'cupsize': 0.5,
            'firmness': 0.4,
            'race': {'asian': 0.1, 'caucasian': 0.9, 'african': 0.0},
        },
        'skin_mhmat': 'old_caucasian_male/old_caucasian_male.mhmat',
        'hair': 'short04/short04.mhclo',
        'eyebrows': 'mindfront_eyebrows_01/mindfront_eyebrows_01.mhclo',
        'eyelashes': 'mindfront_eyelashes_01/mindfront_eyelashes_01.mhclo',
        'eyes_material': 'bluegreen',
        'clothes': [
            'male_casualsuit05/male_casualsuit05.mhclo',
            'shoes01/shoes01.mhclo',
        ],
    },
    'womanSporty': {
        'phenotype': {
            'gender': 0.0,
            'age': 0.4,
            'muscle': 0.55,
            'weight': 0.5,
            'proportions': 0.7,
            'height': 0.6,
            'cupsize': 0.55,
            'firmness': 0.6,
            'race': {'asian': 0.0, 'caucasian': 0.1, 'african': 0.9},
        },
        'skin_mhmat': 'young_african_female/young_african_female.mhmat',
        'hair': 'afro01/afro01.mhclo',
        'eyebrows': 'mindfront_eyebrows_03/mindfront_eyebrows_03.mhclo',
        'eyelashes': 'mindfront_eyelashes_02/mindfront_eyelashes_02.mhclo',
        'eyes_material': 'brown',
        'clothes': [
            'female_sportsuit01/female_sportsuit01.mhclo',
            'shoes06/shoes06.mhclo',
        ],
    },
}

# 書き出すテクスチャの最大辺（肌は顔の細部のため大きめ）
MAX_TEXTURE = {'skin': 2048, 'default': 1024}


def build(preset):
    p = PRESETS[preset]
    info = HumanService._create_default_human_info_dict()
    info['name'] = preset
    info['phenotype'] = p['phenotype']
    info['rig'] = 'game_engine'
    info['eyes'] = 'low-poly/low-poly.mhclo'
    info['eyebrows'] = p['eyebrows']
    info['eyelashes'] = p['eyelashes']
    info['teeth'] = 'teeth_base/teeth_base.mhclo'
    info['hair'] = p['hair']
    info['clothes'] = p['clothes']
    info['skin_mhmat'] = p['skin_mhmat']
    info['skin_material_type'] = 'GAMEENGINE'
    info['eyes_material_type'] = 'MAKESKIN'
    info['eyes_material_settings'] = {}
    settings = HumanService.get_default_deserialization_settings()
    settings['subdiv_levels'] = 0
    settings['override_clothes_model'] = 'MAKESKIN'
    return HumanService.deserialize_from_dict(info, settings)


def set_eye_color(color):
    """MakeSkin の目は青い虹彩の画像を使うので、指定色の画像に差し替える"""
    from bl_ext.user_default.mpfb.services.locationservice import LocationService

    path = LocationService.get_user_data(f'eyes/materials/{color}_eye.png')
    for img in bpy.data.images:
        if img.filepath and img.filepath.endswith('_eye.png'):
            img.filepath = path
            img.reload()


def bake_meshes():
    """シェイプキーを焼き込み、骨以外のモディファイア（衣服の下の体を隠すマスクなど）を適用する"""
    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        if obj.data.shape_keys:
            bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        for mod in list(obj.modifiers):
            if mod.type == 'ARMATURE':
                continue
            if not mod.show_viewport:
                obj.modifiers.remove(mod)
                continue
            bpy.ops.object.modifier_apply(modifier=mod.name)
        for poly in obj.data.polygons:
            poly.use_smooth = True


def shrink_textures():
    for img in bpy.data.images:
        if img.size[0] == 0:
            continue
        name = img.name.lower()
        limit = MAX_TEXTURE['skin'] if 'skin' in name or 'female' in name or 'male' in name else MAX_TEXTURE['default']
        w, h = img.size
        if max(w, h) > limit:
            s = limit / max(w, h)
            img.scale(max(1, round(w * s)), max(1, round(h * s)))


def main():
    argv = sys.argv[sys.argv.index('--') + 1 :]
    preset, out = argv[0], os.path.abspath(argv[1])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build(preset)
    set_eye_color(PRESETS[preset]['eyes_material'])
    bake_meshes()
    shrink_textures()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format='GLB',
        use_selection=True,
        export_apply=False,
        export_skins=True,
        export_morph=False,
        export_animations=False,
        export_image_format='WEBP',
        export_image_quality=88,
        export_yup=True,
    )
    print('EXPORTED', out)


main()
