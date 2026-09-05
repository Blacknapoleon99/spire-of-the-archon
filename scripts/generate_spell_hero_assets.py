"""Generate the optional authored hero meshes for the four spell families.

The procedural Three.js VFX remains responsible for animation and pooling. The
GLBs below give each family a solid, lit 3D anchor instead of a flat fallback:
an ember vortex, faceted frost cluster, radiant halo, and clockwork astrolabe.

Run:
    blender --background --python scripts/generate_spell_hero_assets.py
"""

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
OUT_DIR = os.path.join(ROOT, 'public', 'models')
MANIFEST = os.path.join(OUT_DIR, 'spell-vfx-assets.json')


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


def cone(name, radius1, radius2, depth, location, material, vertices=32, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def torus(name, major, minor, location, material, rotation=(0, 0, 0), segments=64):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=segments, minor_segments=16, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def cube(name, location, scale, material, bevel=0.03, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(material)
    apply_bevel(obj, bevel, 3)
    return obj


def vortex_ribbon(name, phase, material, hot_material):
    segments = 36
    width = 0.20
    verts = []
    faces = []
    for i in range(segments + 1):
        t = i / segments
        z = -1.42 + t * 2.84
        radius = 0.34 + 0.96 * t + 0.12 * math.sin(t * math.pi * 2.0)
        angle = phase + t * math.tau * 1.9
        center = (math.cos(angle) * radius, math.sin(angle) * radius, z)
        tangent = (-math.sin(angle), math.cos(angle), 0.0)
        for side in (-1, 1):
            verts.append((center[0] + tangent[0] * width * side, center[1] + tangent[1] * width * side, center[2]))
    for i in range(segments):
        a = i * 2
        faces.append((a, a + 1, a + 3, a + 2))
    mesh = bpy.data.meshes.new(f'{name}_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(hot_material if int(phase * 10) % 2 else material)
    # Give the authored ribbon actual volume so it catches light from the side
    # instead of reading as a single flat web line in a dark room.
    solidify = obj.modifiers.new('FlameRibbonThickness', 'SOLIDIFY')
    solidify.thickness = 0.075
    solidify.offset = 0.0
    bevel = obj.modifiers.new('FlameRibbonEdgeSoftening', 'BEVEL')
    bevel.width = 0.018
    bevel.segments = 2
    return obj


def gear(name, location, radius, material, teeth=12):
    pieces = [torus(f'{name}_Rim', radius, 0.026, location, material, rotation=(0, 0, 0), segments=64)]
    for index in range(teeth):
        angle = index * math.tau / teeth
        pieces.append(cube(
            f'{name}_Tooth_{index}',
            (location[0] + math.cos(angle) * radius, location[1] + math.sin(angle) * radius, location[2]),
            (0.025, 0.07, 0.045), material, bevel=0.012,
            rotation=(0, 0, angle)
        ))
    return pieces


def save_manifest(asset_id):
    try:
        with open(MANIFEST, 'r', encoding='utf-8') as handle:
            manifest = json.load(handle)
    except (OSError, ValueError):
        manifest = {'assets': []}
    assets = manifest.setdefault('assets', [])
    if asset_id not in assets:
        assets.append(asset_id)
    manifest['generator'] = 'scripts/generate_spell_hero_assets.py'
    manifest['version'] = 'spire-spell-v3-authored'
    with open(MANIFEST, 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)
        handle.write('\n')


def export_asset(asset_id, root, scene):
    socket = add_socket(scene, 'SpellSocket', (0, 0, 0), 0.08, f'{asset_id}_runtime_socket')
    socket.parent = root
    out = os.path.join(OUT_DIR, {
        'fire': 'spell_fire_tornado_core.glb',
        'frost': 'spell_frost_crystal.glb',
        'light': 'spell_luminary_halo.glb',
        'chrono': 'spell_chrono_astrolabe.glb',
    }[asset_id])
    export_selected(out, root=root)
    save_manifest(asset_id)
    print(f'[Blender] Exported authored {asset_id} spell hero -> {out}')


def build_fire():
    clear_scene()
    scene = bpy.context.scene
    scene['asset_contract'] = 'spire-fire-vfx-v3-authored'
    root = bpy.data.objects.new('FireTornadoHeroRoot', None)
    scene.collection.objects.link(root)
    root['asset_contract'] = 'spire-fire-vfx-v3-authored'
    flame = pbr_material('FireTornado_Flame', (0.78, 0.025, 0.003), 'ember', metallic=0.12, roughness=0.22,
                         emission=(1.0, 0.08, 0.002), emission_strength=6, texture_size=256, seed=30)
    hot = pbr_material('FireTornado_Hot', (1.0, 0.23, 0.006), 'ember', metallic=0.08, roughness=0.17,
                       emission=(1.0, 0.18, 0.004), emission_strength=9, texture_size=256, seed=31)
    rune = pbr_material('FireTornado_Rune', (1.0, 0.10, 0.002), 'crystal', emission=(1.0, 0.05, 0.001), emission_strength=12, texture_size=128, seed=32)
    pieces = [
        sphere('VortexCore', (0, 0, 0), (0.34, 0.34, 1.15), flame),
        cone('VortexFlameBody', 0.76, 0.16, 2.72, (0, 0, 0), flame, vertices=56, scale=(1.0, 0.92, 1.0)),
    ]
    pieces += [vortex_ribbon(f'VortexRibbon_{i}', i * math.tau / 3, flame, hot) for i in range(3)]
    for index, z in enumerate((-1.2, -0.45, 0.35, 1.1)):
        pieces.append(torus(f'WindRune_{index}', 0.45 + index * 0.20, 0.018, (0, 0, z), rune, rotation=(0, 0, 0), segments=72))
    for piece in pieces:
        piece.parent = root
    export_asset('fire', root, scene)


def build_frost():
    clear_scene()
    scene = bpy.context.scene
    root = bpy.data.objects.new('FrostCrystalHeroRoot', None)
    scene.collection.objects.link(root)
    ice = pbr_material('Frost_Crystal', (0.10, 0.55, 0.95), 'crystal', metallic=0.08, roughness=0.08,
                       emission=(0.18, 0.75, 1.0), emission_strength=8.0, texture_size=256, seed=40)
    ice_hot = pbr_material('Frost_EdgeGlow', (0.52, 0.92, 1.0), 'crystal', metallic=0.05, roughness=0.06,
                           emission=(0.35, 0.9, 1.0), emission_strength=14.0, texture_size=128, seed=41)
    rune = pbr_material('Frost_Rune', (0.03, 0.50, 0.90), 'crystal', emission=(0.1, 0.8, 1.0), emission_strength=16, texture_size=128, seed=42)
    pieces = [torus('FrostRuneBase', 0.56, 0.025, (0, 0, -0.58), rune, rotation=(0, 0, 0), segments=72)]
    for index in range(7):
        angle = index * math.tau / 7
        radius = 0.14 + (index % 3) * 0.10
        pieces.append(cone(f'IceShard_{index}', 0.18, 0.008, 1.2 + (index % 3) * 0.3,
                           (math.cos(angle) * radius, math.sin(angle) * radius, 0.05 + (index % 2) * 0.10),
                           ice_hot if index % 3 == 0 else ice, vertices=6,
                           rotation=(math.sin(angle) * 0.32, -math.cos(angle) * 0.24, angle)))
    pieces.append(sphere('FrostCore', (0, 0, 0.02), (0.26, 0.26, 0.38), ice_hot))
    for piece in pieces:
        piece.parent = root
    export_asset('frost', root, scene)


def build_light():
    clear_scene()
    scene = bpy.context.scene
    root = bpy.data.objects.new('LuminaryHaloHeroRoot', None)
    scene.collection.objects.link(root)
    gold = pbr_material('Luminary_Gold', (0.82, 0.44, 0.06), 'metal', metallic=0.92, roughness=0.17, texture_size=256, seed=50)
    light = pbr_material('Luminary_Core', (1.0, 0.66, 0.10), 'crystal', metallic=0.1, roughness=0.10,
                         emission=(1.0, 0.72, 0.22), emission_strength=15, texture_size=256, seed=51)
    ivory = pbr_material('Luminary_Rays', (1.0, 0.92, 0.52), 'crystal', emission=(1.0, 0.84, 0.34), emission_strength=12, texture_size=128, seed=52)
    pieces = [sphere('SolarCore', (0, 0, 0), (0.32, 0.32, 0.32), light)]
    pieces += [
        torus('Halo_Outer', 0.62, 0.024, (0, 0, 0), gold, rotation=(math.pi / 2, 0, 0), segments=80),
        torus('Halo_Mid', 0.48, 0.018, (0, 0, 0), ivory, rotation=(0, math.pi / 2, 0), segments=72),
        torus('Halo_Inner', 0.37, 0.012, (0, 0, 0), gold, rotation=(math.pi / 4, math.pi / 4, 0), segments=64),
    ]
    for index in range(12):
        angle = index * math.tau / 12
        pieces.append(cone(f'RadiantRay_{index}', 0.05, 0.004, 0.54,
                           (math.cos(angle) * 0.58, math.sin(angle) * 0.58, 0), ivory, vertices=12,
                           rotation=(0, math.pi / 2, angle)))
    for piece in pieces:
        piece.parent = root
    export_asset('light', root, scene)


def build_chrono():
    clear_scene()
    scene = bpy.context.scene
    root = bpy.data.objects.new('ChronoAstrolabeHeroRoot', None)
    scene.collection.objects.link(root)
    brass = pbr_material('Chrono_Brass', (0.48, 0.24, 0.06), 'metal', metallic=0.96, roughness=0.19, texture_size=256, seed=60)
    violet = pbr_material('Chrono_Violet', (0.34, 0.035, 0.72), 'crystal', metallic=0.18, roughness=0.12,
                          emission=(0.62, 0.08, 1.0), emission_strength=12, texture_size=256, seed=61)
    cyan = pbr_material('Chrono_Cyan', (0.12, 0.62, 0.95), 'crystal', emission=(0.18, 0.76, 1.0), emission_strength=10, texture_size=128, seed=62)
    pieces = [sphere('ChronoCore', (0, 0, 0), (0.24, 0.24, 0.24), violet)]
    pieces += [
        torus('Astrolabe_Ring_X', 0.58, 0.024, (0, 0, 0), brass, rotation=(math.pi / 2, 0, 0), segments=80),
        torus('Astrolabe_Ring_Y', 0.48, 0.020, (0, 0, 0), violet, rotation=(0, math.pi / 2, 0), segments=72),
        torus('Astrolabe_Ring_Z', 0.38, 0.015, (0, 0, 0), brass, rotation=(math.pi / 4, math.pi / 4, 0), segments=64),
    ]
    for index in range(3):
        pieces.extend(gear(f'ClockGear_{index}', (0, 0, 0.03 * index), 0.29 + index * 0.08, brass if index != 1 else cyan, teeth=10 + index * 2))
    pieces.append(cube('ClockHand_Long', (0, -0.03, 0.01), (0.025, 0.30, 0.018), cyan, bevel=0.008, rotation=(0, 0, math.radians(22))))
    pieces.append(cube('ClockHand_Short', (0, 0.02, 0.04), (0.025, 0.18, 0.018), violet, bevel=0.008, rotation=(0, 0, math.radians(-56))))
    for piece in pieces:
        piece.parent = root
    export_asset('chrono', root, scene)


build_fire()
build_frost()
build_light()
build_chrono()
