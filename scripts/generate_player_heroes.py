"""Generate the optional high-detail class hero GLBs.

Run with Blender:
    blender --background --python scripts/generate_player_heroes.py

The four heroes share a scale and root convention so the browser can swap
them without changing network/player transforms.  The runtime adds locomotion
motion and spell VFX; this script focuses on readable silhouettes, layered
materials, and authored class details.
"""

import math
import os
import json

import bpy


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "public", "models")
HERO_MANIFEST = os.path.join(OUT_DIR, "hero-assets.json")

HEROES = {
    'pyromancer': {
        'robe': (0.30, 0.025, 0.018, 1), 'trim': (0.95, 0.20, 0.03, 1), 'glow': (1.0, 0.18, 0.02, 1), 'metal': (0.35, 0.08, 0.02, 1),
    },
    'cryomancer': {
        'robe': (0.02, 0.08, 0.22, 1), 'trim': (0.05, 0.62, 1.0, 1), 'glow': (0.0, 0.75, 1.0, 1), 'metal': (0.18, 0.35, 0.55, 1),
    },
    'luminary': {
        'robe': (0.45, 0.27, 0.05, 1), 'trim': (1.0, 0.76, 0.14, 1), 'glow': (1.0, 0.78, 0.25, 1), 'metal': (0.72, 0.52, 0.12, 1),
    },
    'chronomancer': {
        'robe': (0.16, 0.025, 0.26, 1), 'trim': (0.78, 0.18, 1.0, 1), 'glow': (0.78, 0.1, 1.0, 1), 'metal': (0.36, 0.16, 0.48, 1),
    },
}


def pbr(name, color, metallic=0.0, roughness=0.45, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    emission_socket = bsdf.inputs.get('Emission Color') or bsdf.inputs.get('Emission')
    if emission_socket and emission:
        emission_socket.default_value = emission
    strength_socket = bsdf.inputs.get('Emission Strength')
    if strength_socket:
        strength_socket.default_value = emission_strength
    return mat


def smooth(obj):
    if obj.type == 'MESH':
        for poly in obj.data.polygons:
            poly.use_smooth = True


def mesh_material(obj, mat):
    obj.data.materials.append(mat)
    obj.select_set(False)
    return obj


def uv(name, radius, location, scale, mat, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    mesh_material(obj, mat)
    smooth(obj)
    return obj


def cone(name, radius1, radius2, depth, location, scale, mat, vertices=32):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    mesh_material(obj, mat)
    smooth(obj)
    return obj


def cube(name, location, scale, mat, bevel=0.06):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    mesh_material(obj, mat)
    if bevel:
        mod = obj.modifiers.new('SoftEdge', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.select_set(False)
    return obj


def torus(name, major, minor, location, rotation, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=48, minor_segments=12, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    mesh_material(obj, mat)
    smooth(obj)
    return obj


def build_hero(hero_id, colors):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    robe = pbr(f'{hero_id}_Robe', colors['robe'], roughness=0.58)
    trim = pbr(f'{hero_id}_Trim', colors['trim'], metallic=0.25, roughness=0.28, emission=colors['glow'], emission_strength=1.6)
    metal = pbr(f'{hero_id}_Metal', colors['metal'], metallic=0.82, roughness=0.2)
    glow = pbr(f'{hero_id}_Glow', colors['glow'], metallic=0.1, roughness=0.16, emission=colors['glow'], emission_strength=6.0)
    skin = pbr(f'{hero_id}_Skin', (0.34, 0.12, 0.075, 1), roughness=0.48)
    dark = pbr(f'{hero_id}_Leather', (0.018, 0.012, 0.02, 1), roughness=0.38)

    root = bpy.data.objects.new(f'Player_{hero_id}_Root', None)
    scene.collection.objects.link(root)
    root['hero_class'] = hero_id
    root['asset_contract'] = 'spire-player-v2'

    # A layered 2m silhouette: boots, robe, belt, chest, shoulders, head,
    # hood/hair, and class-specific emissive ornaments.
    pieces = []
    pieces += [cone('RobeSkirt', 0.58, 0.36, 1.05, (0, 0.65, 0), (1.0, 1.0, 0.78), robe)]
    pieces += [cube('ChestArmor', (0, 1.18, 0), (0.34, 0.28, 0.20), trim, 0.08)]
    pieces += [torus('Belt', 0.39, 0.045, (0, 0.98, 0), (math.pi / 2, 0, 0), metal)]
    pieces += [uv('Head', 0.24, (0, 1.72, 0), (0.92, 1.08, 0.88), skin)]
    pieces += [cone('Hood', 0.37, 0.08, 0.58, (0, 1.98, 0), (1.0, 0.72, 0.92), robe)]
    pieces += [uv('Shoulder_L', 0.16, (-0.42, 1.28, 0), (1.0, 0.8, 1.0), trim), uv('Shoulder_R', 0.16, (0.42, 1.28, 0), (1.0, 0.8, 1.0), trim)]
    pieces += [cube('Boot_L', (-0.18, 0.14, -0.02), (0.14, 0.14, 0.26), dark, 0.04), cube('Boot_R', (0.18, 0.14, -0.02), (0.14, 0.14, 0.26), dark, 0.04)]
    pieces += [cube('Glove_L', (-0.46, 0.87, -0.02), (0.09, 0.16, 0.10), dark, 0.04), cube('Glove_R', (0.46, 0.87, -0.02), (0.09, 0.16, 0.10), dark, 0.04)]

    # Class crest, eye glow, and two small rune plates give each hero a clear
    # identity even when the remote avatar is viewed at a distance.
    crest = uv('ClassCrest', 0.11, (0, 1.23, -0.23), (1.0, 1.25, 0.34), glow, segments=24, rings=12)
    eye_l = uv('EyeGlow_L', 0.025, (-0.085, 1.75, -0.21), (1.0, 0.7, 0.45), glow, segments=16, rings=8)
    eye_r = uv('EyeGlow_R', 0.025, (0.085, 1.75, -0.21), (1.0, 0.7, 0.45), glow, segments=16, rings=8)
    rune_l = torus('RunePlate_L', 0.09, 0.012, (-0.18, 1.16, -0.24), (math.pi / 2, 0, 0), glow)
    rune_r = torus('RunePlate_R', 0.09, 0.012, (0.18, 1.16, -0.24), (math.pi / 2, 0, 0), glow)
    pieces += [crest, eye_l, eye_r, rune_l, rune_r]

    for piece in pieces:
        piece.parent = root
        piece['hero_part'] = True

    # A shared socket convention lets future cast clips bind to the same
    # locations without changing the network/player code.
    for name, location in (('Hand_L', (-0.46, 0.87, -0.02)), ('Hand_R', (0.46, 0.87, -0.02)), ('CastSocket', (0, 1.18, -0.32))):
        socket = bpy.data.objects.new(name, None)
        socket.empty_display_type = 'CUBE'
        socket.empty_display_size = 0.08
        socket.location = location
        scene.collection.objects.link(socket)
        socket.parent = root

    out = os.path.join(OUT_DIR, f'player_{hero_id}.glb')
    for obj in scene.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_materials='EXPORT', export_animations=False)
    try:
        with open(HERO_MANIFEST, 'r', encoding='utf-8') as handle:
            manifest = json.load(handle)
    except (OSError, ValueError):
        manifest = {'players': [], 'fpWand': False}
    players = manifest.setdefault('players', [])
    if hero_id not in players:
        players.append(hero_id)
    with open(HERO_MANIFEST, 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)
        handle.write('\n')
    print(f'[Blender] Exported {hero_id} -> {out}')


for hero_id, colors in HEROES.items():
    build_hero(hero_id, colors)
