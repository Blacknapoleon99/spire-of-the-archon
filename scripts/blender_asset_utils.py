"""Small, deterministic helpers shared by the local Blender asset recipes.

The game is intentionally able to run without these optional exports, so this
module stays dependency-free and uses only Blender's built-in Python API.  The
material helper bakes a compact albedo texture into the GLB rather than
relying on Blender-only procedural nodes that a glTF viewer would discard.
"""

import math
import os

import bpy


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def _hash_noise(x, y, seed):
    # Fast repeatable value noise.  It is deliberately not random so an asset
    # can be regenerated on another machine without changing its appearance.
    return 0.5 + 0.5 * math.sin((x * 12.9898 + y * 78.233 + seed * 37.719) * 1.618)


def baked_albedo(name, color, pattern='stone', size=256, seed=0.0):
    """Create and pack a small authored albedo texture for a PBR material."""
    width = max(64, int(size))
    height = width
    image = bpy.data.images.new(f'{name}_Albedo', width=width, height=height, alpha=False)
    pixels = [0.0] * (width * height * 4)
    base = tuple(float(c) for c in color[:3])
    for py in range(height):
        v = py / max(1, height - 1)
        for px in range(width):
            u = px / max(1, width - 1)
            coarse = _hash_noise(math.floor(u * 14), math.floor(v * 14), seed)
            fine = _hash_noise(math.floor(u * 64), math.floor(v * 64), seed + 11.0)
            wave = math.sin((u * (8.0 if pattern == 'cloth' else 18.0) + v * 5.0 + seed) * math.pi)
            if pattern == 'metal':
                value = 0.78 + 0.18 * coarse + 0.04 * wave
            elif pattern == 'cloth':
                value = 0.70 + 0.18 * coarse + 0.08 * fine + 0.04 * wave
            elif pattern == 'crystal':
                value = 0.78 + 0.16 * coarse + 0.08 * math.sin((u + v + seed) * 30.0)
            elif pattern == 'ember':
                value = 0.66 + 0.28 * coarse + 0.08 * fine
            else:
                value = 0.68 + 0.22 * coarse + 0.06 * fine
            idx = (py * width + px) * 4
            pixels[idx] = clamp(base[0] * value)
            pixels[idx + 1] = clamp(base[1] * value)
            pixels[idx + 2] = clamp(base[2] * value)
            pixels[idx + 3] = 1.0
    image.pixels = pixels
    image.pack()
    image.colorspace_settings.name = 'sRGB'
    return image


def pbr_material(name, color, pattern='stone', metallic=0.0, roughness=0.45,
                 emission=None, emission_strength=0.0, texture_size=256, seed=0.0,
                 alpha=1.0):
    """Make an exportable Principled material with a baked albedo map."""
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    if alpha < 1.0:
        if hasattr(material, 'surface_render_method'):
            material.surface_render_method = 'DITHERED'
        elif hasattr(material, 'blend_method'):
            material.blend_method = 'BLEND'
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (420, 0)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (80, 0)
    image = baked_albedo(name, color, pattern, texture_size, seed)
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.interpolation = 'Linear'
    texture.location = (-220, 10)
    links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
    if emission:
        emission_socket = bsdf.inputs.get('Emission Color') or bsdf.inputs.get('Emission')
        if emission_socket:
            emission_socket.default_value = (*emission[:3], 1.0)
        strength_socket = bsdf.inputs.get('Emission Strength')
        if strength_socket:
            strength_socket.default_value = emission_strength
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return material


def smooth(obj):
    if obj and obj.type == 'MESH':
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def apply_bevel(obj, width=0.04, segments=3):
    if not obj or obj.type != 'MESH' or width <= 0:
        return obj
    modifier = obj.modifiers.new('ArtisanEdgeSoftening', 'BEVEL')
    modifier.width = width
    modifier.segments = max(1, int(segments))
    modifier.limit_method = 'ANGLE'
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def add_weighted_normals(obj):
    if not obj or obj.type != 'MESH':
        return obj
    try:
        modifier = obj.modifiers.new('WeightedHeroNormals', 'WEIGHTED_NORMAL')
        modifier.keep_sharp = True
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    except RuntimeError:
        pass
    return obj


def add_socket(scene, name, location, size=0.08, purpose='runtime_socket'):
    socket = bpy.data.objects.new(name, None)
    socket.empty_display_type = 'SPHERE'
    socket.empty_display_size = size
    socket.location = location
    socket['purpose'] = purpose
    scene.collection.objects.link(socket)
    return socket


def export_selected(path, root=None, animations=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    if root:
        def select_tree(obj):
            obj.select_set(True)
            for child in obj.children:
                select_tree(child)
        select_tree(root)
        bpy.context.view_layer.objects.active = root
    else:
        for obj in bpy.context.scene.objects:
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_materials='EXPORT',
        export_animations=animations,
        export_yup=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    for obj in bpy.context.scene.objects:
        obj.select_set(False)
