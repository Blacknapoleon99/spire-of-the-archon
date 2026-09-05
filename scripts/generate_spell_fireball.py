"""Generate the authored 3D fireball hero asset.

The browser keeps its animated shader/particle layers around this mesh.  This
GLB supplies the solid hero silhouette: a textured molten shell, hot inner
core, carved energy channels, volumetric-looking 3D flame lobes, and loose
ember shards.  It is intentionally compact and safe to clone per projectile.
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
OUT = os.path.join(ROOT, 'public', 'models', 'spell_fireball.glb')
SPELL_MANIFEST = os.path.join(ROOT, 'public', 'models', 'spell-vfx-assets.json')


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def sphere(name, radius, location, scale, material, segments=48, rings=28):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def torus(name, major, minor, material, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor, major_segments=72, minor_segments=18,
        location=(0, 0, 0), rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def flame_lobe(name, angle, material, hot_material, height=1.0, width=0.34):
    """Make a twisted, closed 3D flame tongue instead of a flat cone/card."""
    segments = 18
    rings = 9
    vertices = []
    faces = []
    for ring in range(rings):
        t = ring / (rings - 1)
        z = -0.18 + t * height
        # Fullest in the middle, pointed at the top, with a wind curl.
        profile = max(0.035, math.sin(math.pi * (0.16 + 0.74 * t)) * (1.0 - 0.72 * t))
        drift = 0.20 * math.sin(t * math.pi * 1.7 + angle)
        center_r = 0.37 + 0.12 * t
        cx = math.cos(angle) * (center_r + drift * 0.20)
        cy = math.sin(angle) * (center_r + drift * 0.20)
        for seg in range(segments):
            theta = (seg / segments) * math.tau + t * 1.25 + angle
            radial = width * profile * (0.86 + 0.14 * math.sin(theta * 3.0 + angle))
            vertices.append((
                cx + math.cos(theta) * radial,
                cy + math.sin(theta) * radial,
                z,
            ))
    for ring in range(rings - 1):
        for seg in range(segments):
            nxt = (seg + 1) % segments
            a = ring * segments + seg
            b = ring * segments + nxt
            c = (ring + 1) * segments + nxt
            d = (ring + 1) * segments + seg
            faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(f'{name}_Mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material if int(angle * 10) % 2 else hot_material)
    smooth(obj)
    return obj


def ember_shard(name, angle, radius, material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.065, location=(
        math.cos(angle) * radius,
        math.sin(angle) * radius,
        0.15 * math.sin(angle * 2.0),
    ))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (1.0, 0.65, 1.8)
    obj.rotation_euler = (angle * 0.7, angle * 0.4, angle)
    apply_transform(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def build():
    clear_scene()
    scene = bpy.context.scene
    scene['asset_contract'] = 'spire-fireball-v3-authored'
    core_mat = pbr_material('Fireball_Core', (0.98, 0.09, 0.008), 'ember', metallic=0.12,
                            roughness=0.16, emission=(1.0, 0.12, 0.006), emission_strength=8.0,
                            texture_size=256, seed=2.0)
    shell_mat = pbr_material('Fireball_MoltenShell', (0.34, 0.012, 0.002), 'stone', metallic=0.42,
                             roughness=0.24, emission=(0.95, 0.035, 0.002), emission_strength=3.2,
                             texture_size=512, seed=4.0, alpha=0.94)
    rune_mat = pbr_material('Fireball_RuneChannels', (1.0, 0.14, 0.006), 'crystal', metallic=0.2,
                            roughness=0.12, emission=(1.0, 0.06, 0.002), emission_strength=12.0,
                            texture_size=256, seed=9.0)
    hot_mat = pbr_material('Fireball_HotFlame', (1.0, 0.25, 0.012), 'ember', metallic=0.08,
                           roughness=0.18, emission=(1.0, 0.20, 0.008), emission_strength=9.0,
                           texture_size=256, seed=13.0)
    ember_mat = pbr_material('Fireball_EmberShards', (0.7, 0.025, 0.002), 'ember', metallic=0.16,
                             roughness=0.25, emission=(1.0, 0.08, 0.004), emission_strength=6.0,
                             texture_size=128, seed=21.0)

    root = bpy.data.objects.new('FireballHeroRoot', None)
    scene.collection.objects.link(root)
    root['asset_contract'] = 'spire-fireball-v3-authored'
    root['runtime_scale'] = 1.0
    parts = []
    parts.append(sphere('FireballCore', 0.39, (0, 0, 0), (1.0, 1.0, 1.0), core_mat))
    parts.append(sphere('FireballMoltenShell', 0.58, (0, 0, 0), (1.08, 0.96, 1.02), shell_mat))
    # Three gimbal-like rune channels create a readable 3D magic construction.
    parts += [
        torus('RuneChannel_Equator', 0.51, 0.018, rune_mat, rotation=(0, 0, 0)),
        torus('RuneChannel_Pitch', 0.51, 0.015, rune_mat, rotation=(math.pi / 2, 0.24, 0.0), scale=(1.0, 0.92, 1.0)),
        torus('RuneChannel_Yaw', 0.47, 0.014, rune_mat, rotation=(0.34, math.pi / 2, 0.22), scale=(0.92, 1.0, 1.0)),
    ]
    # Eight closed flame tongues catch light from every angle and still leave
    # the runtime shader cards free to animate around them.
    for index in range(8):
        parts.append(flame_lobe(
            f'FlameLobe_{index}', index * math.tau / 8.0, hot_mat, rune_mat,
            height=0.92 + (index % 3) * 0.12, width=0.34 + (index % 2) * 0.035
        ))
    for index in range(12):
        parts.append(ember_shard(f'EmberShard_{index}', index * math.tau / 12.0, 0.66 + (index % 3) * 0.05, ember_mat))
    for part in parts:
        part.parent = root
        part['hero_part'] = True
    socket = add_socket(scene, 'ImpactSocket', (0, 0, 0), 0.11, 'runtime_fireball_impact_and_trail_origin')
    socket.parent = root
    export_selected(OUT, root=root)

    try:
        with open(SPELL_MANIFEST, 'r', encoding='utf-8') as handle:
            manifest = json.load(handle)
    except (OSError, ValueError):
        manifest = {'assets': []}
    assets = manifest.setdefault('assets', [])
    if 'fireball' not in assets:
        assets.append('fireball')
    manifest['generator'] = 'scripts/generate_spell_fireball.py'
    manifest['version'] = 'spire-spell-v4-volumetric'
    with open(SPELL_MANIFEST, 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)
        handle.write('\n')
    print(f'[Blender] Exported authored fireball hero GLB -> {OUT}')


build()
