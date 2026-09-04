"""
Blender Python Script: Generate Ignis the Molten Behemoth
Run via: blender --background --python generate_boss_ignis.py

Generates a rigged, animated volcanic colossus boss character.
Animations: Idle (breathing lava), Stomp Attack, Magma Slam, Molten Roar, Death.
"""

import bpy
import math
import os

OUTPUT_PATH = r"D:\AZCoreHasse\Projects\gemmini 3.8 flash game\public\models\boss_ignis.glb"

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)

def make_material(name, color, emissive=(0,0,0), roughness=0.8, metallic=0.1, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    
    if any(e > 0 for e in emissive):
        bsdf.inputs['Emission Color'].default_value = (*emissive, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 3.5
    
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        bsdf.inputs['Alpha'].default_value = alpha
    
    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (300, 0)
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def create_mesh_part(name, vertices, faces, material):
    """Create a mesh object from raw vertex/face data."""
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj

def build_ignis_body():
    """Build Ignis - Towering volcanic colossus."""
    obsidian = make_material('ignis_obsidian', (0.04, 0.04, 0.03), roughness=0.85, metallic=0.05)
    magma_mat = make_material('ignis_magma', (1.0, 0.2, 0.0), emissive=(1.0, 0.3, 0.0), roughness=0.3, metallic=0.3)
    
    parts = []

    # ---- BODY ----
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.2, location=(0, 0, 2.8))
    torso = bpy.context.object
    torso.name = 'ignis_torso'
    torso.scale = (1.3, 1.0, 1.6)
    bpy.ops.object.transform_apply(scale=True)
    torso.data.materials.append(obsidian)
    parts.append(torso)

    # Magma chest crack
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.65, location=(0, 0.7, 2.8))
    core = bpy.context.object
    core.name = 'ignis_core'
    core.data.materials.append(magma_mat)
    parts.append(core)

    # ---- HEAD ----
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.65, location=(0, 0, 4.5))
    head = bpy.context.object
    head.name = 'ignis_head'
    head.scale = (1.0, 0.85, 1.1)
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials.append(obsidian)
    parts.append(head)

    # Eye slits
    for side in [-0.25, 0.25]:
        bpy.ops.mesh.primitive_cube_add(size=0.18, location=(side, 0.55, 4.5))
        eye = bpy.context.object
        eye.name = f'ignis_eye_{side}'
        eye.scale = (1.5, 0.2, 0.35)
        bpy.ops.object.transform_apply(scale=True)
        eye.data.materials.append(magma_mat)
        parts.append(eye)

    # ---- HORNS ----
    for side, hx in [('L', -0.4), ('R', 0.4)]:
        bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=0.18, depth=0.9, location=(hx, 0, 5.1))
        horn = bpy.context.object
        horn.name = f'ignis_horn_{side}'
        horn.rotation_euler = (0.4 * (-1 if side == 'L' else 1), 0, 0.3 * (-1 if side == 'L' else 1))
        bpy.ops.object.transform_apply(rotation=True)
        horn.data.materials.append(obsidian)
        parts.append(horn)

    # ---- SHOULDERS ----
    for side, sx in [('L', -1.7), ('R', 1.7)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.9, location=(sx, 0, 3.6))
        shoulder = bpy.context.object
        shoulder.name = f'ignis_shoulder_{side}'
        shoulder.scale = (1.0, 0.85, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        shoulder.data.materials.append(obsidian)
        parts.append(shoulder)

    # ---- ARMS ----
    for side, ax in [('L', -2.0), ('R', 2.0)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.42, depth=1.8, location=(ax, 0, 2.4))
        arm = bpy.context.object
        arm.name = f'ignis_arm_{side}'
        arm.rotation_euler = (0, 0, 0.35 * (1 if side == 'L' else -1))
        bpy.ops.object.transform_apply(rotation=True)
        arm.data.materials.append(obsidian)
        parts.append(arm)

        # Fist/club hand
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.52, location=(ax * 1.15, 0, 1.55))
        fist = bpy.context.object
        fist.name = f'ignis_fist_{side}'
        fist.data.materials.append(obsidian)
        parts.append(fist)

    # ---- LEGS ----
    for side, lx in [('L', -0.7), ('R', 0.7)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.55, depth=1.8, location=(lx, 0, 1.0))
        leg = bpy.context.object
        leg.name = f'ignis_leg_{side}'
        leg.data.materials.append(obsidian)
        parts.append(leg)

        # Foot
        bpy.ops.mesh.primitive_cube_add(size=0.9, location=(lx, 0.2, 0.1))
        foot = bpy.context.object
        foot.name = f'ignis_foot_{side}'
        foot.scale = (1.0, 1.4, 0.5)
        bpy.ops.object.transform_apply(scale=True)
        foot.data.materials.append(obsidian)
        parts.append(foot)

    # ---- Lava cracks on torso ----
    for i in range(4):
        angle = (i / 4) * math.pi * 2
        bpy.ops.mesh.primitive_cube_add(size=0.08, location=(
            math.cos(angle) * 1.1, math.sin(angle) * 0.7, 2.5 + i * 0.3
        ))
        crack = bpy.context.object
        crack.name = f'ignis_crack_{i}'
        crack.scale = (0.1, 2.0, 0.1)
        bpy.ops.object.transform_apply(scale=True)
        crack.data.materials.append(magma_mat)
        parts.append(crack)

    return parts

def build_armature():
    """Create a skeletal armature for Ignis."""
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.object
    arm_obj.name = 'ignis_armature'
    arm = arm_obj.data
    arm.name = 'ignis_rig'

    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm.edit_bones

    # Clear default bone
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

    # Spine hierarchy
    add_bone('root',       (0,0,0),     (0,0,0.5))
    add_bone('pelvis',     (0,0,1.5),   (0,0,2.0),  'root')
    add_bone('spine',      (0,0,2.0),   (0,0,2.8),  'pelvis')
    add_bone('chest',      (0,0,2.8),   (0,0,3.6),  'spine')
    add_bone('neck',       (0,0,3.8),   (0,0,4.3),  'chest')
    add_bone('head',       (0,0,4.3),   (0,0,5.1),  'neck')

    # Arms
    add_bone('shoulder_L', (-1.0,0,3.5), (-1.5,0,3.5), 'chest')
    add_bone('upper_arm_L',(-1.5,0,3.5),(-2.0,0,2.8),  'shoulder_L')
    add_bone('lower_arm_L',(-2.0,0,2.8),(-2.2,0,2.0),  'upper_arm_L')
    add_bone('hand_L',     (-2.2,0,2.0),(-2.35,0,1.6), 'lower_arm_L')

    add_bone('shoulder_R', (1.0,0,3.5), (1.5,0,3.5),  'chest')
    add_bone('upper_arm_R',(1.5,0,3.5), (2.0,0,2.8),  'shoulder_R')
    add_bone('lower_arm_R',(2.0,0,2.8), (2.2,0,2.0),  'upper_arm_R')
    add_bone('hand_R',     (2.2,0,2.0), (2.35,0,1.6), 'lower_arm_R')

    # Legs
    add_bone('thigh_L',  (-0.6,0,1.8), (-0.7,0,1.0), 'pelvis')
    add_bone('shin_L',   (-0.7,0,1.0), (-0.7,0,0.2), 'thigh_L')
    add_bone('foot_L',   (-0.7,0,0.2), (-0.7,0.4,0), 'shin_L')

    add_bone('thigh_R',  (0.6,0,1.8),  (0.7,0,1.0),  'pelvis')
    add_bone('shin_R',   (0.7,0,1.0),  (0.7,0,0.2),  'thigh_R')
    add_bone('foot_R',   (0.7,0,0.2),  (0.7,0.4,0),  'thigh_R')

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def join_and_parent(parts, armature):
    """Join all mesh parts and parent to armature with automatic weights."""
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    combined = bpy.context.object
    combined.name = 'ignis_mesh'

    # Parent to armature with automatic weights
    bpy.ops.object.select_all(action='DESELECT')
    combined.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    return combined


def create_animations(arm_obj):
    """Create NLA-style keyframe animations for Ignis."""
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    pose = arm_obj.pose

    def reset_pose():
        for bone in pose.bones:
            bone.location = (0, 0, 0)
            bone.rotation_euler = (0, 0, 0)
            bone.rotation_quaternion = (1, 0, 0, 0)
            bone.scale = (1, 1, 1)

    def insert_pose_keys(frame):
        for bone in pose.bones:
            bone.keyframe_insert(data_path="location", frame=frame)
            bone.keyframe_insert(data_path="rotation_euler", frame=frame)
            bone.keyframe_insert(data_path="scale", frame=frame)

    arm_obj.animation_data_create()

    # ---- IDLE (frames 0–80): gentle lava breathing ----
    idle_action = bpy.data.actions.new('Idle')
    arm_obj.animation_data.action = idle_action

    reset_pose()
    insert_pose_keys(0)
    insert_pose_keys(80)

    # Torso breathes in/out
    chest = pose.bones.get('chest')
    if chest:
        pose.bones['chest'].rotation_euler = (0.04, 0, 0)
        insert_pose_keys(40)
        pose.bones['chest'].rotation_euler = (0.0, 0, 0)
        insert_pose_keys(80)

    # Arms sway slowly
    for side in ['L', 'R']:
        uarm = pose.bones.get(f'upper_arm_{side}')
        if uarm:
            sign = 1 if side == 'L' else -1
            uarm.rotation_euler = (0, 0, sign * 0.08)
            pose.bones[f'upper_arm_{side}'].keyframe_insert(data_path="rotation_euler", frame=20)
            uarm.rotation_euler = (0, 0, 0)
            pose.bones[f'upper_arm_{side}'].keyframe_insert(data_path="rotation_euler", frame=60)

    # ---- STOMP ATTACK (frames 100–150) ----
    stomp_action = bpy.data.actions.new('Stomp_Attack')
    arm_obj.animation_data.action = stomp_action

    reset_pose()
    insert_pose_keys(100)

    # Wind up - lean back
    spine = pose.bones.get('spine')
    if spine:
        spine.rotation_euler = (-0.3, 0, 0)
        spine.keyframe_insert(data_path="rotation_euler", frame=110)

    # Stomp - smash arms down
    for side in ['L', 'R']:
        uarm = pose.bones.get(f'upper_arm_{side}')
        if uarm:
            uarm.rotation_euler = (1.8, 0, 0)
            uarm.keyframe_insert(data_path="rotation_euler", frame=125)

    # Ground impact - screen shake keyframe
    root = pose.bones.get('root')
    if root:
        root.location = (0, 0, -0.3)
        root.keyframe_insert(data_path="location", frame=126)
        root.location = (0, 0, 0)
        root.keyframe_insert(data_path="location", frame=135)

    insert_pose_keys(150)

    # ---- MAGMA SLAM (frames 200–260) ----
    slam_action = bpy.data.actions.new('Magma_Slam')
    arm_obj.animation_data.action = slam_action

    reset_pose()
    insert_pose_keys(200)

    # Both arms raise overhead
    for side in ['L', 'R']:
        uarm = pose.bones.get(f'upper_arm_{side}')
        if uarm:
            uarm.rotation_euler = (-2.0, 0, 0)
            uarm.keyframe_insert(data_path="rotation_euler", frame=215)

    # Slam down with full force
    for side in ['L', 'R']:
        uarm = pose.bones.get(f'upper_arm_{side}')
        if uarm:
            uarm.rotation_euler = (1.5, 0, 0)
            uarm.keyframe_insert(data_path="rotation_euler", frame=228)

    # Recover
    reset_pose()
    insert_pose_keys(260)

    # ---- ROAR (frames 300–360) ----
    roar_action = bpy.data.actions.new('Molten_Roar')
    arm_obj.animation_data.action = roar_action

    reset_pose()
    insert_pose_keys(300)

    head = pose.bones.get('head')
    if head:
        head.rotation_euler = (-0.5, 0, 0)  # Head back
        head.keyframe_insert(data_path="rotation_euler", frame=310)
        head.rotation_euler = (0.2, 0, 0)   # Head forward roar
        head.keyframe_insert(data_path="rotation_euler", frame=325)
        head.rotation_euler = (0, 0, 0)
        head.keyframe_insert(data_path="rotation_euler", frame=360)

    # Chest expands
    if chest:
        chest.scale = (1.0, 1.0, 1.0)
        chest.keyframe_insert(data_path="scale", frame=300)
        chest.scale = (1.25, 1.25, 1.25)
        chest.keyframe_insert(data_path="scale", frame=320)
        chest.scale = (1.0, 1.0, 1.0)
        chest.keyframe_insert(data_path="scale", frame=360)

    # ---- DEATH (frames 400–500) ----
    death_action = bpy.data.actions.new('Death')
    arm_obj.animation_data.action = death_action

    reset_pose()
    insert_pose_keys(400)

    # Stagger
    root = pose.bones.get('root')
    if root:
        root.rotation_euler = (0, 0, 0.2)
        root.keyframe_insert(data_path="rotation_euler", frame=420)
        root.rotation_euler = (0, 0, -0.15)
        root.keyframe_insert(data_path="rotation_euler", frame=435)

    # Fall forward
    if root:
        root.rotation_euler = (1.57, 0, 0)
        root.location = (0, 0, -2.5)
        root.keyframe_insert(data_path="rotation_euler", frame=480)
        root.keyframe_insert(data_path="location", frame=480)

    insert_pose_keys(500)

    bpy.ops.object.mode_set(mode='OBJECT')
    return [idle_action, stomp_action, slam_action, roar_action, death_action]


def push_to_nla(arm_obj, actions_with_offsets):
    """Push each action to NLA strips for export."""
    arm_obj.animation_data_create()
    for action, start_frame in actions_with_offsets:
        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, start=start_frame, action=action)
        strip.use_auto_blend = False


def export_glb(output_path):
    bpy.ops.object.select_all(action='SELECT')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_animations=True,
        export_nla_strips=True,
        export_force_sampling=True,
        export_skins=True,
        export_morph=True,
        export_materials='EXPORT',
        export_yup=True,
    )
    print(f"[Blender] Exported Ignis GLB → {output_path}")


def main():
    print("[Blender] Generating Ignis the Molten Behemoth...")
    clear_scene()
    parts = build_ignis_body()
    armature = build_armature()
    mesh = join_and_parent(parts, armature)
    actions = create_animations(armature)
    push_to_nla(armature, [
        (actions[0], 0),    # Idle: 0–80
        (actions[1], 100),  # Stomp: 100–150
        (actions[2], 200),  # Slam: 200–260
        (actions[3], 300),  # Roar: 300–360
        (actions[4], 400),  # Death: 400–500
    ])
    export_glb(OUTPUT_PATH)
    print("[Blender] Ignis generation complete!")

if __name__ == '__main__':
    main()
