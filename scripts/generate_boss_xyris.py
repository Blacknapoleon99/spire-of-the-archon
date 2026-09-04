"""
Blender Python Script: Generate Xyris the Void Sovereign
Run via: blender --background --python generate_boss_xyris.py

Generates a rigged, animated void-entity boss: floating, multi-winged, with void eye.
Animations: Idle (levitating), Void Surge, Wing Assault, Singularity Collapse, Death.
"""

import bpy
import math
import os

OUTPUT_PATH = r"D:\AZCoreHasse\Projects\gemmini 3.8 flash game\public\models\boss_xyris.glb"

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def make_material(name, color, emissive=(0,0,0), roughness=0.4, metallic=0.5, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if any(e > 0 for e in emissive):
        bsdf.inputs['Emission Color'].default_value = (*emissive, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 4.0
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        bsdf.inputs['Alpha'].default_value = alpha
    out = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def build_xyris_body():
    void_mat = make_material('xyris_void', (0.04, 0.0, 0.08), metallic=0.6)
    eye_mat = make_material('xyris_eye', (0.5, 0.0, 1.0), emissive=(0.6, 0.0, 1.0))
    wing_mat = make_material('xyris_wings', (0.06, 0.0, 0.1), emissive=(0.3, 0.0, 0.6), alpha=0.8)
    energy_mat = make_material('xyris_energy', (0.8, 0.1, 1.0), emissive=(0.8, 0.1, 1.0), alpha=0.85)

    parts = []

    # ---- BODY (octahedron-like) ----
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.9, location=(0, 0, 2.5))
    body = bpy.context.object
    body.name = 'xyris_body'
    body.scale = (1.0, 0.75, 1.2)
    bpy.ops.object.transform_apply(scale=True)
    body.data.materials.append(void_mat)
    parts.append(body)

    # ---- VOID EYE (central) ----
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.35, location=(0, 0.7, 2.7))
    eye = bpy.context.object
    eye.name = 'xyris_eye'
    eye.data.materials.append(eye_mat)
    parts.append(eye)

    # Iris
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.22, depth=0.05, location=(0, 0.84, 2.7))
    iris = bpy.context.object
    iris.name = 'xyris_iris'
    iris.data.materials.append(make_material('iris_black', (0,0,0), roughness=0.0))
    parts.append(iris)

    # ---- 4 VOID WINGS ----
    wing_angles = [45, 135, 225, 315]
    for i, angle in enumerate(wing_angles):
        rad = math.radians(angle)
        wx = math.cos(rad) * 2.2
        wz = math.sin(rad) * 0.8 + 2.5

        bpy.ops.mesh.primitive_plane_add(size=1.0, location=(wx, 0, wz))
        wing = bpy.context.object
        wing.name = f'xyris_wing_{i}'
        # Scale into large curved wing shape
        scale_x = 2.2 if i % 2 == 0 else 1.8
        scale_z = 1.4 if i < 2 else 1.1
        wing.scale = (scale_x, 0.05, scale_z)
        wing.rotation_euler = (0, math.radians(angle * 0.5), rad)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        wing.data.materials.append(wing_mat)
        parts.append(wing)

        # Wing tip energy node
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.18, location=(wx * 1.6, 0, wz))
        tip = bpy.context.object
        tip.name = f'xyris_wing_tip_{i}'
        tip.data.materials.append(energy_mat)
        parts.append(tip)

    # ---- ORBITING SINGULARITY RINGS ----
    for ring_idx in range(2):
        ring_radius = 1.4 + ring_idx * 0.4
        bpy.ops.mesh.primitive_torus_add(major_radius=ring_radius, minor_radius=0.08,
                                          major_segments=32, minor_segments=6,
                                          location=(0, 0, 2.5))
        ring = bpy.context.object
        ring.name = f'xyris_ring_{ring_idx}'
        ring.rotation_euler = (math.pi / 3 * (ring_idx + 1), 0, ring_idx * math.pi / 5)
        bpy.ops.object.transform_apply(rotation=True)
        ring.data.materials.append(energy_mat)
        parts.append(ring)

    # ---- VOID TENDRILS (tentacle-like appendages) ----
    for t in range(6):
        angle = (t / 6) * math.pi * 2
        tx = math.cos(angle) * 0.7
        tz = math.sin(angle) * 0.5 + 2.0
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.08, depth=1.5,
                                             location=(tx, 0, tz))
        tendril = bpy.context.object
        tendril.name = f'xyris_tendril_{t}'
        tendril.rotation_euler = (0, angle, 0)
        bpy.ops.object.transform_apply(rotation=True)
        tendril.data.materials.append(void_mat)
        parts.append(tendril)

    return parts


def build_armature():
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.object
    arm_obj.name = 'xyris_armature'
    arm = arm_obj.data
    arm.name = 'xyris_rig'

    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm.edit_bones
    for b in list(bones):
        bones.remove(b)

    def add_bone(name, head, tail, parent_name=None):
        bone = bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent_name:
            bone.parent = bones[parent_name]
            bone.use_connect = False
        return bone

    add_bone('root',   (0,0,0),   (0,0,0.3))
    add_bone('body',   (0,0,2.2), (0,0,2.8), 'root')
    add_bone('eye',    (0,0,2.7), (0,0,3.0), 'body')
    
    # Wings
    add_bone('wing_FL', (-0.5,0,2.8), (-2.0,0,3.2), 'body')
    add_bone('wing_FR', (0.5,0,2.8),  (2.0,0,3.2),  'body')
    add_bone('wing_BL', (-0.5,0,2.5), (-2.0,0,2.0), 'body')
    add_bone('wing_BR', (0.5,0,2.5),  (2.0,0,2.0),  'body')
    
    # Rings (for spinning)
    add_bone('ring_0', (0,0,2.5), (1.4,0,2.5), 'body')
    add_bone('ring_1', (0,0,2.5), (1.8,0,2.5), 'body')

    # Tendrils
    for t in range(6):
        angle = (t / 6) * math.pi * 2
        tx = math.cos(angle) * 0.7
        add_bone(f'tendril_{t}', (tx,0,2.0), (tx*1.8,0,1.2), 'body')

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def join_and_parent(parts, armature):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    combined = bpy.context.object
    combined.name = 'xyris_mesh'

    bpy.ops.object.select_all(action='DESELECT')
    combined.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    return combined


def create_animations(arm_obj):
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    pose = arm_obj.pose

    def reset_pose():
        for b in pose.bones:
            b.location = (0,0,0)
            b.rotation_euler = (0,0,0)
            b.scale = (1,1,1)

    def insert_all(frame):
        for b in pose.bones:
            b.keyframe_insert("location", frame=frame)
            b.keyframe_insert("rotation_euler", frame=frame)
            b.keyframe_insert("scale", frame=frame)

    arm_obj.animation_data_create()

    # ---- IDLE: Levitating drift (0–80) ----
    idle = bpy.data.actions.new('Idle')
    arm_obj.animation_data.action = idle
    reset_pose()
    insert_all(0)

    root = pose.bones.get('root')
    if root:
        root.location = (0,0,0)
        root.keyframe_insert("location", frame=0)
        root.location = (0,0,0.3)
        root.keyframe_insert("location", frame=40)
        root.location = (0,0,0)
        root.keyframe_insert("location", frame=80)

    # Wings gently flap
    for side in ['FL','FR','BL','BR']:
        wing = pose.bones.get(f'wing_{side}')
        if wing:
            wing.rotation_euler = (0.15,0,0)
            wing.keyframe_insert("rotation_euler", frame=20)
            wing.rotation_euler = (-0.1,0,0)
            wing.keyframe_insert("rotation_euler", frame=60)
            wing.rotation_euler = (0.15,0,0)
            wing.keyframe_insert("rotation_euler", frame=80)

    # Rings spin continuously
    for ring_idx in range(2):
        ring = pose.bones.get(f'ring_{ring_idx}')
        if ring:
            ring.rotation_euler = (0,0,0)
            ring.keyframe_insert("rotation_euler", frame=0)
            ring.rotation_euler = (0,0,math.pi * 2)
            ring.keyframe_insert("rotation_euler", frame=80)

    insert_all(80)

    # ---- VOID SURGE (100–155): charge then blast ----
    surge = bpy.data.actions.new('Void_Surge')
    arm_obj.animation_data.action = surge
    reset_pose()
    insert_all(100)

    body = pose.bones.get('body')
    if body:
        body.scale = (1,1,1)
        body.keyframe_insert("scale", frame=100)
        body.scale = (1.4,1.4,1.4)  # Swell
        body.keyframe_insert("scale", frame=125)
        body.scale = (0.7,0.7,0.7)  # Contract blast
        body.keyframe_insert("scale", frame=135)
        body.scale = (1,1,1)
        body.keyframe_insert("scale", frame=155)

    # Wings blast open
    for side in ['FL','FR','BL','BR']:
        wing = pose.bones.get(f'wing_{side}')
        if wing:
            wing.rotation_euler = (0,0,0)
            wing.keyframe_insert("rotation_euler", frame=100)
            wing.rotation_euler = (0.8,0,0)
            wing.keyframe_insert("rotation_euler", frame=130)
            wing.rotation_euler = (0.15,0,0)
            wing.keyframe_insert("rotation_euler", frame=155)

    insert_all(155)

    # ---- WING ASSAULT (200–260) ----
    wing_att = bpy.data.actions.new('Wing_Assault')
    arm_obj.animation_data.action = wing_att
    reset_pose()
    insert_all(200)

    for side, sign in [('FL',1),('FR',-1),('BL',1),('BR',-1)]:
        wing = pose.bones.get(f'wing_{side}')
        if wing:
            wing.rotation_euler = (0,0,0)
            wing.keyframe_insert("rotation_euler", frame=200)
            wing.rotation_euler = (sign * 1.2, 0, sign * 0.4)
            wing.keyframe_insert("rotation_euler", frame=225)
            wing.rotation_euler = (0,0,0)
            wing.keyframe_insert("rotation_euler", frame=260)

    # Swoop dive
    if root:
        root.location = (0,0,0)
        root.keyframe_insert("location", frame=200)
        root.location = (0,0,-1.0)
        root.keyframe_insert("location", frame=230)
        root.location = (0,0,0)
        root.keyframe_insert("location", frame=260)

    insert_all(260)

    # ---- SINGULARITY COLLAPSE (300–380) ----
    singularity = bpy.data.actions.new('Singularity_Collapse')
    arm_obj.animation_data.action = singularity
    reset_pose()
    insert_all(300)

    if body:
        body.scale = (1,1,1)
        body.keyframe_insert("scale", frame=300)
        body.scale = (0.1,0.1,0.1)  # Collapse inward
        body.keyframe_insert("scale", frame=340)
        body.scale = (2.5,2.5,2.5)  # EXPAND explosion
        body.keyframe_insert("scale", frame=355)
        body.scale = (1,1,1)
        body.keyframe_insert("scale", frame=380)

    insert_all(380)

    # ---- DEATH (400–480) ----
    death = bpy.data.actions.new('Death')
    arm_obj.animation_data.action = death
    reset_pose()
    insert_all(400)

    if root:
        root.location = (0,0,0.5)
        root.keyframe_insert("location", frame=410)
        root.location = (0,0,2.0)
        root.keyframe_insert("location", frame=440)
        # Disintegrate - scale to 0
        root.scale = (1,1,1)
        root.keyframe_insert("scale", frame=440)
        root.scale = (0.01,0.01,0.01)
        root.keyframe_insert("scale", frame=480)

    insert_all(480)

    bpy.ops.object.mode_set(mode='OBJECT')
    return [idle, surge, wing_att, singularity, death]


def push_to_nla(arm_obj, actions_with_starts):
    arm_obj.animation_data_create()
    for action, start in actions_with_starts:
        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, start=start, action=action)
        strip.use_auto_blend = False


def export_glb(path):
    bpy.ops.object.select_all(action='SELECT')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        export_animations=True,
        export_nla_strips=True,
        export_force_sampling=True,
        export_skins=True,
        export_materials='EXPORT',
        export_yup=True,
    )
    print(f"[Blender] Exported Xyris GLB → {path}")


def main():
    print("[Blender] Generating Xyris the Void Sovereign...")
    clear_scene()
    parts = build_xyris_body()
    armature = build_armature()
    mesh = join_and_parent(parts, armature)
    actions = create_animations(armature)
    push_to_nla(armature, [
        (actions[0], 0),
        (actions[1], 100),
        (actions[2], 200),
        (actions[3], 300),
        (actions[4], 400),
    ])
    export_glb(OUTPUT_PATH)
    print("[Blender] Xyris generation complete!")

if __name__ == '__main__':
    main()
