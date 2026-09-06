"""Preserve the local Trellis source; normalize and optimize its textured mesh."""
import json
import os
import sys
import bpy
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
SOURCE='D:/ComfyUI/output/3DGenStudio_00012_.glb'
OUT=os.path.join(ROOT,'public','models','player_sunsteel_vanguard.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)
meshes=[obj for obj in bpy.context.scene.objects if obj.type=='MESH']
points=[obj.matrix_world @ Vector(p) for obj in meshes for p in obj.bound_box]
low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
print('SOURCE_BOUNDS',list(low),list(high),flush=True)
scale=2.0/(high.z-low.z)
center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z+1/scale))
for obj in meshes:
    matrix=obj.matrix_world.copy()
    obj.parent=None
    for vertex in obj.data.vertices:
        vertex.co=(matrix @ vertex.co-center)*scale
    obj.matrix_world.identity()
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    triangles=sum(len(p.vertices)-2 for p in obj.data.polygons)
    if triangles>45000:
        modifier=obj.modifiers.new('Runtime triangle budget','DECIMATE')
        modifier.ratio=45000/triangles
        modifier.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons: polygon.use_smooth=True
    for material in obj.data.materials:
        if not material or not material.use_nodes: continue
        for node in material.node_tree.nodes:
            if node.type=='BSDF_PRINCIPLED':
                node.inputs['Roughness'].default_value=0.38
                node.inputs['Metallic'].default_value=0.75
            if node.type=='TEX_IMAGE' and node.image:
                # Retain 2K albedo for plate engravings. Data maps remain PNG.
                if node.image.colorspace_settings.name=='sRGB': node.image.file_format='JPEG'
    obj.select_set(False)
root=bpy.data.objects.new('SunsteelVanguardRoot',None)
bpy.context.scene.collection.objects.link(root)
for obj in meshes: obj.parent=root
sys.path.insert(0,os.path.dirname(__file__))
for obj in bpy.context.scene.objects: obj.select_set(obj in meshes or obj==root)
export_args=dict(filepath=OUT,export_format='GLB',use_selection=True,export_animations=False,
                 export_yup=True,export_apply=True,export_image_format='JPEG',
                 export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
properties=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
for quality_key in ['export_image_quality','export_jpeg_quality']:
    if quality_key in properties: export_args[quality_key]=92
bpy.ops.export_scene.gltf(**export_args)
print('RUNTIME_BYTES',os.path.getsize(OUT),flush=True)

# Neutral studio inspection; never bake these lights into the runtime mesh.
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.render.resolution_x=900
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(0.12,0.14,0.18,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=0.45
for position,power,size in [((2,-3,4),600,4),((-3,-1,2),350,3),((1,3,3),750,3)]:
    bpy.ops.object.light_add(type='AREA',location=position)
    lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size
    lamp.rotation_euler=(Vector((0,0,0))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.5,-4.3,1.7))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=2.7;scene.camera=camera
os.makedirs('C:/Temp/spire-mastery-audit',exist_ok=True)
scene.render.filepath='C:/Temp/spire-mastery-audit/sunsteel-studio.png'
bpy.ops.render.render(write_still=True)
