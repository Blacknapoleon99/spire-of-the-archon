"""Build authored class hero meshes used by remote players.

Run from the repository root with:
    blender --background --python scripts/generate_player_heroes.py

The optional GLBs have readable humanoid silhouettes, layered cloth/metal/
leather pieces, visible faces and fingers, packed albedo textures, class
ornaments, and named cast sockets.  The browser still keeps its procedural
fallback if these exports are not present.
"""

import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
from blender_asset_utils import (  # noqa: E402
    add_socket,
    add_weighted_normals,
    apply_bevel,
    export_selected,
    pbr_material,
    smooth,
)


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_DIR = os.path.join(ROOT, 'public', 'models')
HERO_MANIFEST = os.path.join(OUT_DIR, 'hero-assets.json')

HEROES = {
    'pyromancer': {
        'robe': (0.19, 0.012, 0.008), 'trim': (0.82, 0.10, 0.018),
        'glow': (1.0, 0.12, 0.012), 'metal': (0.34, 0.07, 0.018),
        'accent': (0.98, 0.36, 0.02), 'seed': 3.0,
    },
    'cryomancer': {
        'robe': (0.012, 0.055, 0.16), 'trim': (0.02, 0.35, 0.74),
        'glow': (0.02, 0.74, 1.0), 'metal': (0.13, 0.30, 0.52),
        'accent': (0.42, 0.92, 1.0), 'seed': 7.0,
    },
    'luminary': {
        'robe': (0.32, 0.15, 0.025), 'trim': (0.88, 0.54, 0.06),
        'glow': (1.0, 0.72, 0.12), 'metal': (0.60, 0.34, 0.05),
        'accent': (1.0, 0.92, 0.52), 'seed': 11.0,
    },
    'chronomancer': {
        'robe': (0.075, 0.008, 0.14), 'trim': (0.52, 0.075, 0.78),
        'glow': (0.72, 0.10, 1.0), 'metal': (0.28, 0.10, 0.40),
        'accent': (0.95, 0.35, 1.0), 'seed': 17.0,
    },
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def sphere(name, location, scale, material, segments=40, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=1.0, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def cone(name, radius1, radius2, depth, location, material, vertices=48,
         scale=(1, 1, 1), rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=radius1, radius2=radius2, depth=depth,
        location=location, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def cylinder(name, radius, depth, location, material, rotation=(0, 0, 0),
             vertices=32, bevel=0.025):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location,
        rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    apply_bevel(obj, bevel, 3)
    add_weighted_normals(obj)
    return obj


def cube(name, location, scale, material, bevel=0.055, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(material)
    apply_bevel(obj, bevel, 3)
    add_weighted_normals(obj)
    return obj


def torus(name, major, minor, location, material, rotation=(0, 0, 0), segments=64):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor, major_segments=segments,
        minor_segments=16, location=location, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def parent_all(root, pieces):
    for piece in pieces:
        if piece and piece != root:
            piece.parent = root
            piece['hero_part'] = True


def class_ornaments(hero_id, colors, mats):
    """Return distinctive silhouette pieces for each school of magic."""
    glow, trim, metal = mats['glow'], mats['trim'], mats['metal']
    pieces = []
    if hero_id == 'pyromancer':
        for index in range(7):
            angle = (index / 7.0) * math.tau
            radius = 0.22 + (index % 2) * 0.025
            pieces.append(cone(
                f'EmberCrown_{index}', 0.075, 0.008, 0.34,
                (math.cos(angle) * radius, 0.0, 1.52 + (index % 3) * 0.04),
                glow, vertices=20,
                rotation=(0.0, math.radians(18) * math.cos(angle), angle)
            ))
        for side in (-1, 1):
            pieces.append(cone(
                f'FlameShoulder_{side}', 0.13, 0.012, 0.42,
                (side * 0.48, 0.02, 0.55), glow, vertices=24,
                rotation=(0.0, side * math.radians(28), side * math.radians(8))
            ))
    elif hero_id == 'cryomancer':
        for index in range(5):
            angle = (index / 5.0) * math.tau
            pieces.append(cone(
                f'IceCrown_{index}', 0.10, 0.006, 0.46 + (index % 2) * 0.12,
                (math.cos(angle) * 0.25, 0.0, 1.50), glow, vertices=6,
                rotation=(0.0, math.radians(18) * math.sin(angle), angle)
            ))
        for side in (-1, 1):
            for index in range(3):
                pieces.append(cone(
                    f'FrostPauldron_{side}_{index}', 0.08, 0.004, 0.38,
                    (side * (0.49 + index * 0.05), 0.02, 0.59 + index * 0.06),
                    glow, vertices=6, rotation=(0.0, side * math.radians(32), 0.0)
                ))
    elif hero_id == 'luminary':
        pieces.append(torus('LuminaryHalo', 0.38, 0.027, (0, 0.08, 1.15), glow, rotation=(math.pi / 2, 0, 0), segments=72))
        pieces.append(torus('LuminaryHaloInner', 0.28, 0.012, (0, 0.08, 1.15), trim, rotation=(math.pi / 2, 0, 0), segments=64))
        for index in range(8):
            angle = (index / 8.0) * math.tau
            pieces.append(cone(
                f'SolarRay_{index}', 0.045, 0.004, 0.30,
                (math.cos(angle) * 0.46, 0.06, 0.76 + math.sin(angle) * 0.26),
                glow, vertices=16, rotation=(0.0, math.radians(66), angle)
            ))
        pieces.append(sphere('LightMantle', (0, 0.16, 0.27), (0.57, 0.10, 0.72), trim, segments=32, rings=18))
    else:
        pieces.append(torus('ChronoGimbalOuter', 0.43, 0.026, (0, 0.06, 0.98), metal, rotation=(math.pi / 2, 0, 0), segments=72))
        pieces.append(torus('ChronoGimbalInner', 0.32, 0.018, (0, 0.06, 0.98), glow, rotation=(0, math.pi / 2, 0), segments=64))
        for index in range(8):
            angle = (index / 8.0) * math.tau
            pieces.append(cube(
                f'ClockMarker_{index}',
                (math.cos(angle) * 0.39, 0.06, 0.98 + math.sin(angle) * 0.39),
                (0.025, 0.045, 0.075), glow, bevel=0.012,
                rotation=(0, angle, 0)
            ))
        pieces.append(cylinder('ChronoNeedle', 0.018, 0.38, (0, -0.27, 0.47), glow,
                               rotation=(math.pi / 2, 0, 0), vertices=16, bevel=0.006))
    return pieces


def build_hero(hero_id, colors):
    clear_scene()
    scene = bpy.context.scene
    scene['asset_contract'] = 'spire-player-v3-authored'
    robe = pbr_material(f'{hero_id}_Robe', colors['robe'], 'cloth', roughness=0.66, texture_size=512, seed=colors['seed'])
    trim = pbr_material(f'{hero_id}_Trim', colors['trim'], 'cloth', metallic=0.24, roughness=0.30,
                        emission=colors['glow'], emission_strength=1.8, texture_size=512, seed=colors['seed'] + 1)
    metal = pbr_material(f'{hero_id}_Metal', colors['metal'], 'metal', metallic=0.86, roughness=0.21,
                         texture_size=256, seed=colors['seed'] + 2)
    glow = pbr_material(f'{hero_id}_Glow', colors['glow'], 'crystal', metallic=0.12, roughness=0.14,
                        emission=colors['glow'], emission_strength=7.5, texture_size=256, seed=colors['seed'] + 3)
    accent = pbr_material(f'{hero_id}_Accent', colors['accent'],
                          'ember' if hero_id == 'pyromancer' else 'crystal', metallic=0.22, roughness=0.22,
                          emission=colors['accent'], emission_strength=3.0, texture_size=256, seed=colors['seed'] + 4)
    skin = pbr_material(f'{hero_id}_Skin', (0.28, 0.065, 0.04), 'cloth', roughness=0.48,
                        texture_size=256, seed=colors['seed'] + 5)
    leather = pbr_material(f'{hero_id}_Leather', (0.012, 0.008, 0.012), 'leather', roughness=0.42,
                           texture_size=256, seed=colors['seed'] + 6)
    mats = {'robe': robe, 'trim': trim, 'metal': metal, 'glow': glow, 'accent': accent, 'skin': skin, 'leather': leather}

    root = bpy.data.objects.new(f'Player_{hero_id}_Root', None)
    scene.collection.objects.link(root)
    root['hero_class'] = hero_id
    root['asset_contract'] = 'spire-player-v3-authored'
    root['front_axis'] = '-Y_blender_to_-Z_runtime'
    pieces = []

    # Blender is Z-up. Feet are around z=-1 so the browser's existing +1m
    # avatar lift places them exactly on the shared floor plane.
    pieces += [
        cone('RobeSkirt_Layer', 0.62, 0.39, 1.15, (0, 0.04, -0.39), robe,
             vertices=64, scale=(1.0, 0.86, 1.0)),
        cone('Tunic_Layer', 0.43, 0.31, 0.82, (0, -0.005, 0.35), robe,
             vertices=56, scale=(1.0, 0.80, 1.0)),
        cube('ChestArmor', (0, -0.06, 0.48), (0.36, 0.17, 0.30), trim, bevel=0.075),
        torus('Belt', 0.43, 0.046, (0, 0.0, 0.08), metal),
        cube('BeltBuckle', (0, -0.44, 0.08), (0.11, 0.035, 0.11), glow, bevel=0.02),
        sphere('Head', (0, 0.0, 0.91), (0.27, 0.23, 0.30), skin, segments=48, rings=28),
        cone('Hood', 0.40, 0.075, 0.56, (0, 0.03, 1.23), robe,
             vertices=56, scale=(1.0, 0.86, 1.0)),
        torus('HoodRim', 0.285, 0.035, (0, -0.005, 1.08), robe, segments=64),
        sphere('FaceMask', (0, -0.205, 0.88), (0.19, 0.045, 0.18), skin, segments=32, rings=18),
        sphere('EyeGlow_L', (-0.092, -0.245, 0.96), (0.036, 0.022, 0.022), glow, segments=24, rings=12),
        sphere('EyeGlow_R', (0.092, -0.245, 0.96), (0.036, 0.022, 0.022), glow, segments=24, rings=12),
        cone('Nose', 0.032, 0.006, 0.10, (0, -0.28, 0.89), skin, vertices=16, rotation=(math.pi / 2, 0, 0)),
        sphere('CapeMantle', (0, 0.16, 0.32), (0.58, 0.12, 0.68), robe, segments=40, rings=20),
    ]

    # Legs, boots, arms and visible multi-finger hands.
    for side in (-1, 1):
        label = 'L' if side < 0 else 'R'
        pieces += [
            cylinder(f'Thigh_{label}', 0.145, 0.52, (side * 0.18, 0.02, -0.73), leather,
                     vertices=32, bevel=0.025),
            cube(f'Boot_{label}', (side * 0.18, -0.08, -1.02), (0.17, 0.25, 0.12), leather, bevel=0.045),
            sphere(f'Shoulder_{label}', (side * 0.43, 0.0, 0.54), (0.20, 0.18, 0.16), trim, segments=32, rings=20),
            cylinder(f'UpperArm_{label}', 0.105, 0.42, (side * 0.48, 0.0, 0.25), robe,
                     vertices=32, bevel=0.025, rotation=(0, side * math.radians(8), 0)),
            cylinder(f'Bracer_{label}', 0.12, 0.22, (side * 0.49, -0.015, 0.02), metal,
                     vertices=32, bevel=0.025, rotation=(0, side * math.radians(12), 0)),
            sphere(f'Hand_{label}', (side * 0.50, -0.035, -0.14), (0.12, 0.095, 0.14), skin, segments=28, rings=16),
        ]
        for finger in range(4):
            x = side * (0.45 + (finger - 1.5) * 0.034)
            pieces.append(cylinder(
                f'Finger_{label}_{finger}', 0.022, 0.105, (x, -0.10, -0.25), skin,
                vertices=16, bevel=0.008, rotation=(math.radians(16), 0, side * math.radians(4))
            ))
        pieces.append(torus(f'RuneCuff_{label}', 0.105, 0.014, (side * 0.49, -0.015, 0.14), glow,
                            rotation=(0, math.pi / 2, 0), segments=40))

    pieces += [
        sphere('ClassCrest', (0, -0.252, 0.48), (0.11, 0.035, 0.14), accent, segments=32, rings=20),
        torus('RunePlate_L', 0.085, 0.014, (-0.18, -0.245, 0.43), glow,
              rotation=(math.pi / 2, 0, 0), segments=48),
        torus('RunePlate_R', 0.085, 0.014, (0.18, -0.245, 0.43), glow,
              rotation=(math.pi / 2, 0, 0), segments=48),
    ]
    pieces += class_ornaments(hero_id, colors, mats)
    parent_all(root, pieces)

    for name, location, purpose in (
        ('Hand_L', (-0.50, -0.035, -0.14), 'left_hand_cast_socket'),
        ('Hand_R', (0.50, -0.035, -0.14), 'right_hand_cast_socket'),
        ('CastSocket', (0, -0.34, 0.48), 'center_spell_origin'),
        ('HeadSocket', (0, 0, 1.32), 'head_fx_socket'),
    ):
        socket = add_socket(scene, name, location, 0.075, purpose)
        socket.parent = root

    out = os.path.join(OUT_DIR, f'player_{hero_id}.glb')
    export_selected(out, root=root)

    try:
        with open(HERO_MANIFEST, 'r', encoding='utf-8') as handle:
            manifest = json.load(handle)
    except (OSError, ValueError):
        manifest = {'players': [], 'fpWand': False}
    players = manifest.setdefault('players', [])
    if hero_id not in players:
        players.append(hero_id)
    manifest['generator'] = 'scripts/generate_player_heroes.py'
    manifest['version'] = 'spire-player-v3-authored'
    with open(HERO_MANIFEST, 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)
        handle.write('\n')
    print(f'[Blender] Exported authored {hero_id} hero -> {out}')


for hero_id, colors in HEROES.items():
    build_hero(hero_id, colors)

