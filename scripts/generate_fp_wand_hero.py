"""Generate the authored first-person hands, wand, and focus crystal."""

import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
from blender_asset_utils import (  # noqa: E402
    add_socket,
    apply_bevel,
    export_selected,
    pbr_material,
    smooth,
)


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'public', 'models', 'fp_wand_hero.glb')
HERO_MANIFEST = os.path.join(ROOT, 'public', 'models', 'hero-assets.json')


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def sphere(name, location, scale, material, segments=40, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def cylinder(name, radius, depth, location, rotation, material, vertices=40, bevel=0.018):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    apply_bevel(obj, bevel, 3)
    return obj


def torus(name, major, minor, location, rotation, material, segments=64):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=segments, minor_segments=16, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def cone(name, radius1, radius2, depth, location, rotation, material, vertices=32):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def build():
    clear_scene()
    scene = bpy.context.scene
    scene['asset_contract'] = 'spire-fp-wand-v3-authored'
    root = bpy.data.objects.new('FP_WandHeroRoot', None)
    scene.collection.objects.link(root)
    root['asset_contract'] = 'spire-fp-wand-v3-authored'

    cloth = pbr_material('FP_RobeCloth', (0.09, 0.008, 0.018), 'cloth', roughness=0.62, texture_size=512, seed=80)
    leather = pbr_material('FP_Leather', (0.016, 0.006, 0.009), 'leather', roughness=0.39, texture_size=256, seed=81)
    brass = pbr_material('FP_EngravedBrass', (0.64, 0.29, 0.045), 'metal', metallic=0.92, roughness=0.19, texture_size=512, seed=82)
    wood = pbr_material('FP_Elderwood', (0.12, 0.026, 0.008), 'stone', metallic=0.10, roughness=0.34, texture_size=512, seed=83)
    skin = pbr_material('FP_GauntletSkin', (0.16, 0.022, 0.018), 'leather', roughness=0.45, texture_size=256, seed=84)
    crystal = pbr_material('FP_FocusCrystal', (0.94, 0.045, 0.008), 'crystal', metallic=0.2, roughness=0.04,
                           emission=(1.0, 0.10, 0.003), emission_strength=14.0, texture_size=256, seed=85)
    rune = pbr_material('FP_RuneChannels', (1.0, 0.18, 0.008), 'crystal', metallic=0.1, roughness=0.10,
                        emission=(1.0, 0.12, 0.002), emission_strength=22.0, texture_size=128, seed=86)
    parts = []

    # Camera-space hands: layered cuffs, articulated palms and four visible
    # fingers per hand. Coordinates match the existing viewmodel framing.
    for side in (-1, 1):
        label = 'L' if side < 0 else 'R'
        angle = side * math.radians(8)
        parts += [
            cylinder(f'Sleeve_{label}', 0.13, 0.42, (side * 0.34, -0.38, -0.48), (math.radians(55), 0, angle), cloth, bevel=0.025),
            torus(f'SleeveTrim_{label}', 0.13, 0.018, (side * 0.34, -0.18, -0.61), (math.radians(55), 0, angle), brass, segments=48),
            cylinder(f'Bracer_{label}', 0.12, 0.18, (side * 0.34, -0.18, -0.62), (math.radians(55), 0, angle), brass, bevel=0.018),
            sphere(f'Palm_{label}', (side * 0.34, -0.035, -0.78), (0.13, 0.105, 0.15), skin, segments=32, rings=20),
        ]
        for finger in range(4):
            parts.append(cylinder(
                f'Finger_{label}_{finger}', 0.020, 0.105,
                (side * (0.30 + finger * 0.023), -0.025, -0.88),
                (math.radians(70), 0, angle), skin, vertices=20, bevel=0.007
            ))
        parts.append(torus(f'HandRune_{label}', 0.085, 0.012, (side * 0.34, -0.11, -0.76), (math.radians(55), 0, angle), rune, segments=40))

    wand_rot = (math.radians(48), 0, math.radians(-8))
    parts += [
        cylinder('WandShaft', 0.041, 1.76, (0.37, 0.30, -1.02), wand_rot, wood, vertices=48, bevel=0.012),
        cylinder('WandGrip', 0.068, 0.37, (0.33, -0.10, -0.72), wand_rot, leather, vertices=40, bevel=0.015),
        torus('WandGripRing_A', 0.075, 0.016, (0.34, 0.02, -0.84), wand_rot, brass, segments=56),
        torus('WandGripRing_B', 0.075, 0.016, (0.36, 0.20, -0.96), wand_rot, brass, segments=56),
        torus('WandGripRune', 0.060, 0.010, (0.35, 0.11, -0.90), wand_rot, rune, segments=48),
        cylinder('WandCrownMount', 0.105, 0.21, (0.40, 1.06, -1.35), wand_rot, brass, vertices=48, bevel=0.014),
        sphere('WandTip', (0.41, 1.20, -1.45), (0.15, 0.15, 0.20), crystal, segments=40, rings=24),
        sphere('WandCore', (0.41, 1.20, -1.45), (0.078, 0.078, 0.115), crystal, segments=32, rings=20),
    ]
    # Four crown claws frame the crystal; the astrolabe rings make the tip
    # read as a crafted focus rather than a glowing low-poly ball.
    for index in range(4):
        angle = index * math.tau / 4
        parts.append(cone(
            f'WandClaw_{index}', 0.022, 0.004, 0.19,
            (0.41 + math.cos(angle) * 0.105, 1.20 + math.sin(angle) * 0.105, -1.45),
            (math.radians(48), 0, angle), brass, vertices=20
        ))
    parts += [
        torus('WandAstrolabe_X', 0.21, 0.014, (0.41, 1.20, -1.45), (0, math.pi / 2, 0), brass, segments=72),
        torus('WandAstrolabe_Y', 0.17, 0.012, (0.41, 1.20, -1.45), (math.pi / 2, 0, 0), rune, segments=64),
        torus('WandAstrolabe_Diagonal', 0.13, 0.010, (0.41, 1.20, -1.45), (math.pi / 4, math.pi / 4, 0), brass, segments=56),
    ]
    for part in parts:
        part.parent = root

    socket = add_socket(scene, 'WandTipSocket', (0.41, 1.20, -1.45), 0.07, 'runtime_wand_tip_particle_origin')
    socket.parent = root
    export_selected(OUT, root=root)

    try:
        with open(HERO_MANIFEST, 'r', encoding='utf-8') as handle:
            manifest = json.load(handle)
    except (OSError, ValueError):
        manifest = {'players': [], 'fpWand': False}
    manifest['fpWand'] = True
    manifest['generator'] = 'scripts/generate_fp_wand_hero.py'
    manifest['version'] = 'spire-fp-wand-v4-pbr-rig-ready'
    with open(HERO_MANIFEST, 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)
        handle.write('\n')
    print(f'[Blender] Exported authored first-person wand hero GLB -> {OUT}')


build()
