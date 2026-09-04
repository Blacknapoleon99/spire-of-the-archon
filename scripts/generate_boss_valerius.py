"""
Blender Python Script: Generate Archon Valerius Ascendant
Run via: blender --background --python generate_boss_valerius.py

Generates a rigged, animated time-wizard boss: robed with chrono rings.
Animations: Idle (robes flowing, rings spinning), Time_Slash, Chrono_Wave, Paradox_Burst, Death.
"""

import bpy
import math
import os

OUTPUT_PATH = r"D:\AZCoreHasse\Projects\gemmini 3.8 flash game\public\models\boss_valerius.glb"

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def make_material(name, color, emissive=(0,0,0), roughness=0.6, metallic=0.1, alpha=1.0):
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
        bsdf.inputs['Emission Strength'].default_value = 3.5
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        bsdf.inputs['Alpha'].default_value = alpha
    out = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def build_valerius_body():
    robe_mat = make_material('val_robe', (0.08, 0.04, 0.15), roughness=0.85)
    gold_mat = make_material('val_gold', (0.85, 0.65, 0.05), metallic=0.95, roughness=0.15)
    arcane_mat = make_material('val_arcane', (0.6, 0.2, 1.0), emissive=(0.6, 0.2, 1.0))
    skin_mat = make_material('val_skin', (0.9, 0.75, 0.6), roughness=0.9)
    beard_mat = make_material('val_beard', (0.9, 0.88, 0.82), roughness=0.95)

    parts = []

    # ---- ROBE BODY (tall tapered cylinder) ----
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.75, depth=3.0, location=(0,0,1.5))
    robe = bpy.context.object
    robe.name = 'val_robe_body'
    robe.scale = (1.0,0.8,1.0)
    bpy.ops.object.transform_apply(scale=True)
    robe.data.materials.append(robe_mat)
    parts.append(robe)

    # Robe trim (gold band)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.78, depth=0.15, location=(0,0,0.08))
    trim_bot = bpy.context.object
    trim_bot.name = 'val_trim_bottom'
    trim_bot.data.materials.append(gold_mat)
    parts.append(trim_bot)

    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.78, depth=0.12, location=(0,0,2.92))
    trim_top = bpy.context.object
    trim_top.name = 'val_trim_top'
    trim_top.data.materials.append(gold_mat)
    parts.append(trim_top)

    # Gold belt buckle
    bpy.ops.mesh.primitive_cube_add(size=0.28, location=(0,0.7,1.5))
    buckle = bpy.context.object
    buckle.name = 'val_buckle'
    buckle.scale = (1.5,0.2,0.8)
    bpy.ops.object.transform_apply(scale=True)
    buckle.data.materials.append(gold_mat)
    parts.append(buckle)

    # ---- TORSO UPPER ----
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.48, depth=0.8, location=(0,0,3.4))
    chest = bpy.context.object
    chest.name = 'val_chest'
    chest.data.materials.append(robe_mat)
    parts.append(chest)

    # Gold pauldrons
    for side, sx in [('L', -0.7), ('R', 0.7)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.35, location=(sx, 0, 3.55))
        paul = bpy.context.object
        paul.name = f'val_pauldron_{side}'
        paul.scale = (1.2, 0.9, 0.8)
        bpy.ops.object.transform_apply(scale=True)
        paul.data.materials.append(gold_mat)
        parts.append(paul)

    # ---- HEAD ----
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.42, location=(0,0,4.2))
    head = bpy.context.object
    head.name = 'val_head'
    head.scale = (1.0, 0.9, 1.1)
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials.append(skin_mat)
    parts.append(head)

    # Long beard
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.35, depth=0.8, location=(0, 0.15, 3.65))
    beard = bpy.context.object
    beard.name = 'val_beard'
    beard.rotation_euler = (0.3,0,0)
    bpy.ops.object.transform_apply(rotation=True)
    beard.data.materials.append(beard_mat)
    parts.append(beard)

    # Glowing eyes
    for side, ex in [('L', -0.14), ('R', 0.14)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.08, location=(ex, 0.36, 4.25))
        eye = bpy.context.object
        eye.name = f'val_eye_{side}'
        eye.data.materials.append(arcane_mat)
        parts.append(eye)

    # Tall wizard hat
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.46, depth=1.1, location=(0,0,4.95))
    hat_cone = bpy.context.object
    hat_cone.name = 'val_hat_cone'
    hat_cone.data.materials.append(robe_mat)
    parts.append(hat_cone)

    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.62, depth=0.12, location=(0,0,4.38))
    hat_brim = bpy.context.object
    hat_brim.name = 'val_hat_brim'
    hat_brim.data.materials.append(robe_mat)
    parts.append(hat_brim)

    # Hat gold band
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.48, depth=0.08, location=(0,0,4.44))
    hat_band = bpy.context.object
    hat_band.name = 'val_hat_band'
    hat_band.data.materials.append(gold_mat)
    parts.append(hat_band)

    # ---- ARMS ----
    for side, ax in [('L', -0.95), ('R', 0.95)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.18, depth=1.4, location=(ax, 0, 3.0))
        arm = bpy.context.object
        arm.name = f'val_arm_{side}'
        arm.rotation_euler = (0, 0, 0.25 * (1 if side == 'L' else -1))
        bpy.ops.object.transform_apply(rotation=True)
        arm.data.materials.append(robe_mat)
        parts.append(arm)

        # Hand
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.2, location=(ax * 1.12, 0, 2.35))
        hand = bpy.context.object
        hand.name = f'val_hand_{side}'
        hand.data.materials.append(skin_mat)
        parts.append(hand)

    # ---- CHRONO STAFF ----
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.07, depth=3.2, location=(1.18, 0, 3.1))
    staff = bpy.context.object
    staff.name = 'val_staff'
    staff.rotation_euler = (0.2, 0, 0.15)
    bpy.ops.object.transform_apply(rotation=True)
    staff.data.materials.append(gold_mat)
    parts.append(staff)

    # Staff orb
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.28, location=(1.48, 0.18, 4.7))
    orb = bpy.context.object
    orb.name = 'val_staff_orb'
    orb.data.materials.append(arcane_mat)
    parts.append(orb)

    # ---- 3 CHRONO RINGS orbiting at torso ----
    ring_radii = [1.1, 1.5, 1.9]
    for i, r in enumerate(ring_radii):
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.07,
                                          major_segments=36, minor_segments=6,
                                          location=(0,0,2.5))
        ring = bpy.context.object
        ring.name = f'val_ring_{i}'
        ring.rotation_euler = (math.pi / 4 * (i+1), 0, i * math.pi / 6)
        bpy.ops.object.transform_apply(rotation=True)
        ring.data.materials.append(arcane_mat)
        parts.append(ring)

    return parts


def build_armature():
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.object
    arm_obj.name = 'valerius_armature'
    arm = arm_obj.data
    arm.name = 'valerius_rig'

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

    add_bone('root',       (0,0,0),     (0,0,0.3))
    add_bone('pelvis',     (0,0,0.8),   (0,0,1.5),   'root')
    add_bone('spine_low',  (0,0,1.5),   (0,0,2.2),   'pelvis')
    add_bone('spine_mid',  (0,0,2.2),   (0,0,2.9),   'spine_low')
    add_bone('chest',      (0,0,2.9),   (0,0,3.6),   'spine_mid')
    add_bone('neck',       (0,0,3.6),   (0,0,4.0),   'chest')
    add_bone('head',       (0,0,4.0),   (0,0,4.7),   'neck')

    # Arms
    add_bone('clavicle_L', (-0.4,0,3.5), (-0.7,0,3.5), 'chest')
    add_bone('upper_arm_L',(-0.7,0,3.5), (-1.1,0,2.8), 'clavicle_L')
    add_bone('lower_arm_L',(-1.1,0,2.8), (-1.25,0,2.2),'upper_arm_L')
    add_bone('hand_L',     (-1.25,0,2.2),(-1.3,0,1.9), 'lower_arm_L')

    add_bone('clavicle_R', (0.4,0,3.5), (0.7,0,3.5),  'chest')
    add_bone('upper_arm_R',(0.7,0,3.5), (1.1,0,2.8),  'clavicle_R')
    add_bone('lower_arm_R',(1.1,0,2.8), (1.25,0,2.2), 'upper_arm_R')
    add_bone('hand_R',     (1.25,0,2.2),(1.3,0,1.9),  'lower_arm_R')

    # Robe/staff helpers
    add_bone('staff',      (1.18,0,2.3),(1.4,0,4.7),  'hand_R')
    add_bone('ring_0',     (0,0,2.5),   (1.1,0,2.5),  'chest')
    add_bone('ring_1',     (0,0,2.5),   (1.5,0,2.5),  'chest')
    add_bone('ring_2',     (0,0,2.5),   (1.9,0,2.5),  'chest')

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def join_and_parent(parts, armature):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    combined = bpy.context.object
    combined.name = 'valerius_mesh'

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

    arm_obj.animation_data_create()

    # ---- IDLE: robes flow, rings spin (0–100) ----
    idle = bpy.data.actions.new('Idle')
    arm_obj.animation_data.action = idle
    reset_pose()
    insert_all(0)

    spine = pose.bones.get('spine_mid')
    if spine:
        spine.rotation_euler = (0.03,0,0)
        spine.keyframe_insert("rotation_euler", frame=50)
        spine.rotation_euler = (-0.02,0,0)
        spine.keyframe_insert("rotation_euler", frame=100)

    for i in range(3):
        ring = pose.bones.get(f'ring_{i}')
        if ring:
            ring.rotation_euler = (0,0,0)
            ring.keyframe_insert("rotation_euler", frame=0)
            ring.rotation_euler = (0,0,math.pi * 2)
            ring.keyframe_insert("rotation_euler", frame=100)

    # Staff bob
    staff = pose.bones.get('staff')
    if staff:
        staff.location = (0,0,0)
        staff.keyframe_insert("location", frame=0)
        staff.location = (0,0,0.08)
        staff.keyframe_insert("location", frame=50)
        staff.location = (0,0,0)
        staff.keyframe_insert("location", frame=100)

    insert_all(100)

    # ---- TIME SLASH (120–175) ----
    slash = bpy.data.actions.new('Time_Slash')
    arm_obj.animation_data.action = slash
    reset_pose()
    insert_all(120)

    # Wind up
    uarm_r = pose.bones.get('upper_arm_R')
    if uarm_r:
        uarm_r.rotation_euler = (-1.8, 0, 0)
        uarm_r.keyframe_insert("rotation_euler", frame=132)

    # Slash across
    if uarm_r:
        uarm_r.rotation_euler = (0.5, 0, -1.2)
        uarm_r.keyframe_insert("rotation_euler", frame=145)
        uarm_r.rotation_euler = (0,0,0)
        uarm_r.keyframe_insert("rotation_euler", frame=175)

    insert_all(175)

    # ---- CHRONO WAVE (200–260): spreading time pulse ----
    wave = bpy.data.actions.new('Chrono_Wave')
    arm_obj.animation_data.action = wave
    reset_pose()
    insert_all(200)

    # Both hands forward (casting)
    for side in ['L','R']:
        larm = pose.bones.get(f'lower_arm_{side}')
        if larm:
            larm.rotation_euler = (0,0,0)
            larm.keyframe_insert("rotation_euler", frame=200)
            larm.rotation_euler = (1.0,0,0)
            larm.keyframe_insert("rotation_euler", frame=225)
            larm.rotation_euler = (0,0,0)
            larm.keyframe_insert("rotation_euler", frame=260)

    # Chest pulses forward
    chest = pose.bones.get('chest')
    if chest:
        chest.rotation_euler = (0,0,0)
        chest.keyframe_insert("rotation_euler", frame=200)
        chest.rotation_euler = (0.3,0,0)
        chest.keyframe_insert("rotation_euler", frame=222)
        chest.rotation_euler = (0,0,0)
        chest.keyframe_insert("rotation_euler", frame=260)

    insert_all(260)

    # ---- PARADOX BURST (300–380): ultimate time stop + explosion ----
    paradox = bpy.data.actions.new('Paradox_Burst')
    arm_obj.animation_data.action = paradox
    reset_pose()
    insert_all(300)

    root = pose.bones.get('root')
    # Levitate up
    if root:
        root.location = (0,0,0)
        root.keyframe_insert("location", frame=300)
        root.location = (0,0,1.0)
        root.keyframe_insert("location", frame=330)

    # Arms spread wide
    for side, sign in [('L',-1),('R',1)]:
        uarm = pose.bones.get(f'upper_arm_{side}')
        if uarm:
            uarm.rotation_euler = (0, 0, sign * 1.8)
            uarm.keyframe_insert("rotation_euler", frame=328)

    # Rings go wild
    for i in range(3):
        ring = pose.bones.get(f'ring_{i}')
        if ring:
            ring.scale = (1,1,1)
            ring.keyframe_insert("scale", frame=300)
            ring.scale = (3,3,3)
            ring.keyframe_insert("scale", frame=355)
            ring.scale = (0.01,0.01,0.01)
            ring.keyframe_insert("scale", frame=370)
            ring.scale = (1,1,1)
            ring.keyframe_insert("scale", frame=380)

    if root:
        root.location = (0,0,0)
        root.keyframe_insert("location", frame=380)

    insert_all(380)

    # ---- DEATH (400–500) ----
    death = bpy.data.actions.new('Death')
    arm_obj.animation_data.action = death
    reset_pose()
    insert_all(400)

    spine = pose.bones.get('spine_low')
    if spine:
        spine.rotation_euler = (0,0,0)
        spine.keyframe_insert("rotation_euler", frame=400)
        spine.rotation_euler = (1.2,0,0.3)
        spine.keyframe_insert("rotation_euler", frame=450)

    if root:
        root.location = (0,0,0)
        root.keyframe_insert("location", frame=400)
        root.location = (0,0,-1.8)
        root.keyframe_insert("location", frame=460)

    insert_all(500)

    bpy.ops.object.mode_set(mode='OBJECT')
    return [idle, slash, wave, paradox, death]


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
    print(f"[Blender] Exported Valerius GLB → {path}")


def main():
    print("[Blender] Generating Archon Valerius Ascendant...")
    clear_scene()
    parts = build_valerius_body()
    armature = build_armature()
    mesh = join_and_parent(parts, armature)
    actions = create_animations(armature)
    push_to_nla(armature, [
        (actions[0], 0),
        (actions[1], 120),
        (actions[2], 200),
        (actions[3], 300),
        (actions[4], 400),
    ])
    export_glb(OUTPUT_PATH)
    print("[Blender] Valerius generation complete!")

if __name__ == '__main__':
    main()
