"""Generate the optional high-detail first-person wand and hands GLB."""

import math
import os
import json

import bpy


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "public", "models", "fp_wand_hero.glb")
HERO_MANIFEST = os.path.join(ROOT, "public", "models", "hero-assets.json")


def mat(name, color, metallic=0.0, roughness=0.4, emission=None, strength=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        socket = bsdf.inputs.get('Emission Color') or bsdf.inputs.get('Emission')
        if socket:
            socket.default_value = (*emission, 1.0)
        strength_socket = bsdf.inputs.get('Emission Strength')
        if strength_socket:
            strength_socket.default_value = strength
    return material


def smooth(obj):
    if obj.type == 'MESH':
        for poly in obj.data.polygons:
            poly.use_smooth = True


def sphere(name, location, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def cylinder(name, radius, depth, location, rotation, material, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    return obj


def torus(name, major, minor, location, rotation, material):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=48, minor_segments=12, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    return obj


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
root = bpy.data.objects.new('FP_WandHeroRoot', None)
scene.collection.objects.link(root)
root['asset_contract'] = 'spire-fp-wand-v2'

cloth = mat('FP_Robe', (0.12, 0.018, 0.03, 1), roughness=0.62)
leather = mat('FP_Leather', (0.028, 0.014, 0.018, 1), roughness=0.42)
brass = mat('FP_Brass', (0.72, 0.38, 0.08, 1), metallic=0.9, roughness=0.2)
wood = mat('FP_Elderwood', (0.16, 0.045, 0.018, 1), roughness=0.38)
skin = mat('FP_Glove', (0.18, 0.03, 0.025, 1), roughness=0.46)
crystal = mat('FP_Crystal', (0.9, 0.06, 0.01, 1), metallic=0.18, roughness=0.05, emission=(1.0, 0.12, 0.01, 1), strength=8.0)

parts = []
for side in (-1, 1):
    parts.append(cylinder(f'Sleeve_{"L" if side < 0 else "R"}', 0.105, 0.42, (side * 0.34, -0.38, -0.48), (math.radians(55), 0, side * math.radians(8)), cloth))
    parts.append(cylinder(f'Bracer_{"L" if side < 0 else "R"}', 0.11, 0.16, (side * 0.34, -0.18, -0.62), (math.radians(55), 0, side * math.radians(8)), brass))
    parts.append(sphere(f'Hand_{"L" if side < 0 else "R"}', (side * 0.34, -0.04, -0.78), (0.11, 0.095, 0.13), skin))
    for finger in range(4):
        parts.append(cylinder(
            f'Finger_{"L" if side < 0 else "R"}_{finger}',
            0.018,
            0.09,
            (side * (0.31 + finger * 0.018), -0.01, -0.87),
            (math.radians(70), 0, side * math.radians(8)),
            brass if finger == 1 else skin,
            vertices=16,
        ))

# Wand axis follows the authored hand pose toward the upper-right of the
# camera. The crystal/socket names are consumed by FPViewmodel at runtime.
wand = cylinder('WandShaft', 0.034, 1.75, (0.37, 0.30, -1.02), (math.radians(48), 0, math.radians(-8)), wood, vertices=32)
grip = cylinder('WandGrip', 0.055, 0.34, (0.33, -0.10, -0.72), (math.radians(48), 0, math.radians(-8)), leather)
ring_a = torus('WandRing_A', 0.06, 0.012, (0.34, 0.02, -0.84), (math.radians(48), 0, math.radians(-8)), brass)
ring_b = torus('WandRing_B', 0.06, 0.012, (0.36, 0.20, -0.96), (math.radians(48), 0, math.radians(-8)), brass)
mount = cylinder('WandCrownMount', 0.085, 0.18, (0.40, 1.06, -1.35), (math.radians(48), 0, math.radians(-8)), brass)
tip = sphere('WandTip', (0.41, 1.20, -1.45), (0.14, 0.14, 0.18), crystal)
core = sphere('WandCore', (0.41, 1.20, -1.45), (0.075, 0.075, 0.10), crystal)
for obj in (wand, grip, ring_a, ring_b, mount, tip, core):
    parts.append(obj)

for index in range(4):
    angle = index * math.pi / 2
    claw = cylinder(
        f'WandClaw_{index}', 0.012, 0.15,
        (0.41 + math.cos(angle) * 0.095, 1.20 + math.sin(angle) * 0.095, -1.45),
        (math.radians(48), 0, angle), brass, vertices=16,
    )
    parts.append(claw)

for index, rotation in enumerate((0, math.pi / 2)):
    ring = torus(f'WandAstrolabe_{index}', 0.19 - index * 0.035, 0.012, (0.41, 1.20, -1.45), (rotation, math.radians(28), 0), brass)
    parts.append(ring)

tip_socket = bpy.data.objects.new('WandTipSocket', None)
tip_socket.empty_display_type = 'SPHERE'
tip_socket.empty_display_size = 0.06
tip_socket.location = (0.41, 1.20, -1.45)
scene.collection.objects.link(tip_socket)
parts.append(tip_socket)

for obj in parts:
    obj.parent = root

for obj in scene.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_materials='EXPORT', export_animations=False)
try:
    with open(HERO_MANIFEST, 'r', encoding='utf-8') as handle:
        manifest = json.load(handle)
except (OSError, ValueError):
    manifest = {'players': [], 'fpWand': False}
manifest['fpWand'] = True
with open(HERO_MANIFEST, 'w', encoding='utf-8') as handle:
    json.dump(manifest, handle, indent=2)
    handle.write('\n')
print(f'[Blender] Exported first-person wand hero GLB -> {OUT}')
