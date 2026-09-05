"""Render one generated GLB for a quick local art QA pass.

Usage:
    blender --background --python scripts/render_glb_preview.py -- public/models/player_pyromancer.glb C:/Temp/hero.png
"""

import math
import os
import sys

import bpy
from mathutils import Vector


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(args) < 2:
        raise SystemExit('expected input.glb output.png')
    source = os.path.abspath(args[0])
    output = os.path.abspath(args[1])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        raise SystemExit('GLB contained no mesh objects')
    min_v = Vector((float('inf'), float('inf'), float('inf')))
    max_v = Vector((float('-inf'), float('-inf'), float('-inf')))
    for obj in meshes:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, point.x); min_v.y = min(min_v.y, point.y); min_v.z = min(min_v.z, point.z)
            max_v.x = max(max_v.x, point.x); max_v.y = max(max_v.y, point.y); max_v.z = max(max_v.z, point.z)
    center = (min_v + max_v) * 0.5
    size = max(max_v.x - min_v.x, max_v.y - min_v.y, max_v.z - min_v.z, 1.0)
    bpy.ops.object.camera_add(location=(size * 2.0, -size * 3.1, center.z + size * 0.8))
    camera = bpy.context.object
    camera.data.lens = 54
    look_at(camera, center)
    bpy.context.scene.camera = camera
    for location, color, energy, size_value in [
        ((size * 2.0, -size * 2.5, center.z + size * 2.2), (1.0, 0.55, 0.28), 1300, size),
        ((-size * 2.0, -size * 1.4, center.z + size * 0.8), (0.24, 0.48, 1.0), 1100, size),
        ((0, size * 1.5, center.z + size * 1.1), (1.0, 0.20, 0.08), 900, size),
    ]:
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.color = color
        light.data.shape = 'DISK'
        light.data.size = size_value
        look_at(light, center)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [item.identifier for item in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = output
    if scene.world is None:
        scene.world = bpy.data.worlds.new('PreviewWorld')
    scene.world.color = (0.008, 0.006, 0.012)
    bpy.ops.render.render(write_still=True)
    print(f'[Blender] Preview rendered -> {output}')


main()
