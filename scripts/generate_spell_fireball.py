"""Generate the optional hero fireball GLB.

Run with Blender:
    blender --background --python scripts/generate_spell_fireball.py

The animated flame simulation remains in Three.js. This file creates the
high-detail hero shell, rune channels, flame fins, and named runtime socket.
"""

import math
import os
import json

import bpy


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "public", "models", "spell_fireball.glb")
SPELL_MANIFEST = os.path.join(ROOT, "public", "models", "spell-vfx-assets.json")


def material(name, color, emission=None, emission_strength=0.0, metallic=0.0, roughness=0.4, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'DITHERED'
    elif alpha < 1.0:
        mat.blend_method = 'BLEND'
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        if hasattr(mat, 'surface_render_method'):
            mat.surface_render_method = 'DITHERED'
    emission_socket = bsdf.inputs.get('Emission Color') or bsdf.inputs.get('Emission')
    if emission_socket and emission:
        emission_socket.default_value = (*emission, 1.0)
    strength_socket = bsdf.inputs.get('Emission Strength')
    if strength_socket:
        strength_socket.default_value = emission_strength
    return mat


def smooth(obj):
    if obj.type == 'MESH':
        for poly in obj.data.polygons:
            poly.use_smooth = True


def apply_bevel(obj, width=0.025, segments=3):
    modifier = obj.modifiers.new('HeroBevel', 'BEVEL')
    modifier.width = width
    modifier.segments = segments
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def add_uv(name, radius, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_torus(name, major, minor, location, rotation, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=64, minor_segments=16, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_fin(name, location, rotation, scale, mat):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.22, radius2=0.025, depth=0.9, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

mat_core = material('Fireball_Core', (0.95, 0.08, 0.015), (1.0, 0.16, 0.015), 12.0, metallic=0.12, roughness=0.16)
mat_shell = material('Fireball_MoltenShell', (0.48, 0.018, 0.004), (1.0, 0.06, 0.005), 5.0, metallic=0.35, roughness=0.22, alpha=0.9)
mat_rune = material('Fireball_Rune', (1.0, 0.18, 0.015), (1.0, 0.08, 0.005), 18.0, metallic=0.2, roughness=0.12)
mat_hot = material('Fireball_HotFins', (1.0, 0.24, 0.02), (1.0, 0.2, 0.015), 14.0, metallic=0.1, roughness=0.18)

core = add_uv('FireballCore', 0.42, (0, 0, 0), (1.0, 1.0, 1.0), mat_core)
shell = add_uv('FireballShell', 0.58, (0, 0, 0), (1.08, 1.0, 0.96), mat_shell)
apply_bevel(shell, 0.015, 2)

for index, axis in enumerate((0, math.pi / 2, math.pi, math.pi * 1.5)):
    x = math.cos(axis) * 0.24
    z = math.sin(axis) * 0.24
    fin = add_fin(
        f'FlameFin_{index}',
        (x, 0.02, z),
        (0.0, -axis, math.radians(16) * math.sin(axis)),
        (0.8, 1.0, 0.55),
        mat_hot,
    )
    fin.parent = shell

for index, rotation in enumerate(((0.0, 0.0, 0.0), (math.pi / 2, 0.2, 0.0), (0.4, math.pi / 2, 0.3))):
    ring = add_torus(f'RuneChannel_{index}', 0.5 - index * 0.08, 0.018, (0, 0, 0), rotation, mat_rune)
    ring.parent = shell

socket = bpy.data.objects.new('ImpactSocket', None)
socket.empty_display_type = 'SPHERE'
socket.empty_display_size = 0.12
socket.location = (0, 0, 0)
scene.collection.objects.link(socket)
socket['purpose'] = 'runtime_fireball_impact_and_trail_origin'

root = bpy.data.objects.new('FireballHeroRoot', None)
scene.collection.objects.link(root)
for obj in (core, shell, socket):
    obj.parent = root

for obj in scene.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    use_selection=True,
    export_materials='EXPORT',
    export_animations=False,
)
try:
    with open(SPELL_MANIFEST, 'r', encoding='utf-8') as handle:
        manifest = json.load(handle)
except (OSError, ValueError):
    manifest = {'assets': []}
assets = manifest.setdefault('assets', [])
if 'fireball' not in assets:
    assets.append('fireball')
with open(SPELL_MANIFEST, 'w', encoding='utf-8') as handle:
    json.dump(manifest, handle, indent=2)
    handle.write('\n')
print(f'[Blender] Exported fireball hero GLB -> {OUT}')
