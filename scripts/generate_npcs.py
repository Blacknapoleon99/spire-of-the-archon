"""
Blender Python Script: Generate all NPC characters
Run via: blender --background --python generate_npcs.py

Generates rigged, animated NPC characters:
  - Merchant (robed trader with scales and satchel)
  - Alchemist (scientist with vials and apron)
  - Quest Giver (wise elder with glowing rune book)

Each has: Idle, Talk, Gesture animations.
"""

import bpy
import math
import os

MODELS_DIR = r"D:\AZCoreHasse\Projects\gemmini 3.8 flash game\public\models"

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)

def make_mat(name, color, emissive=(0,0,0), roughness=0.8, metallic=0.0, alpha=1.0):
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
        bsdf.inputs['Emission Strength'].default_value = 2.5
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        bsdf.inputs['Alpha'].default_value = alpha
    out = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def make_biped_armature(name, height=1.8, torso_z=1.0):
    """Generic humanoid armature factory."""
    bpy.ops.object.armature_add(location=(0,0,0))
    arm_obj = bpy.context.object
    arm_obj.name = name + '_armature'

    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm_obj.data.edit_bones
    for b in list(bones):
        bones.remove(b)

    h = height
    tz = torso_z

    def add_bone(bname, head, tail, parent_name=None):
        bone = bones.new(bname)
        bone.head = head
        bone.tail = tail
        if parent_name and parent_name in bones:
            bone.parent = bones[parent_name]
            bone.use_connect = False
        return bone

    add_bone('root',       (0,0,0),         (0,0,0.15))
    add_bone('pelvis',     (0,0,tz*0.5),    (0,0,tz*0.7),      'root')
    add_bone('spine',      (0,0,tz*0.7),    (0,0,tz*0.9),      'pelvis')
    add_bone('chest',      (0,0,tz*0.9),    (0,0,tz*1.15),     'spine')
    add_bone('neck',       (0,0,tz*1.18),   (0,0,tz*1.3),      'chest')
    add_bone('head',       (0,0,tz*1.3),    (0,0,h),            'neck')

    add_bone('clavicle_L', (-0.15,0,tz*1.1),(-0.45,0,tz*1.1), 'chest')
    add_bone('upper_arm_L',(-0.45,0,tz*1.1),(-0.7,0,tz*0.85), 'clavicle_L')
    add_bone('lower_arm_L',(-0.7,0,tz*0.85),(-0.78,0,tz*0.65),'upper_arm_L')
    add_bone('hand_L',     (-0.78,0,tz*0.65),(-0.82,0,tz*0.55),'lower_arm_L')

    add_bone('clavicle_R', (0.15,0,tz*1.1),(0.45,0,tz*1.1),  'chest')
    add_bone('upper_arm_R',(0.45,0,tz*1.1),(0.7,0,tz*0.85),  'clavicle_R')
    add_bone('lower_arm_R',(0.7,0,tz*0.85),(0.78,0,tz*0.65), 'upper_arm_R')
    add_bone('hand_R',     (0.78,0,tz*0.65),(0.82,0,tz*0.55),'lower_arm_R')

    add_bone('thigh_L',  (-0.2,0,tz*0.5), (-0.22,0,tz*0.25), 'pelvis')
    add_bone('shin_L',   (-0.22,0,tz*0.25),(-0.22,0,0.05),   'thigh_L')
    add_bone('foot_L',   (-0.22,0,0.05),  (-0.22,0.15,0),    'shin_L')
    add_bone('thigh_R',  (0.2,0,tz*0.5),  (0.22,0,tz*0.25),  'pelvis')
    add_bone('shin_R',   (0.22,0,tz*0.25),(0.22,0,0.05),     'thigh_R')
    add_bone('foot_R',   (0.22,0,0.05),   (0.22,0.15,0),     'thigh_R')

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def add_idle_animation(arm_obj, action_name='Idle', start=0, end=80):
    """Add a gentle idle (breathing + sway) animation."""
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    pose = arm_obj.pose

    arm_obj.animation_data_create()
    action = bpy.data.actions.new(action_name)
    arm_obj.animation_data.action = action

    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.location = (0,0,0)
        b.scale = (1,1,1)
        b.keyframe_insert("rotation_euler", frame=start)
        b.keyframe_insert("location", frame=start)
        b.keyframe_insert("rotation_euler", frame=end)
        b.keyframe_insert("location", frame=end)

    # Chest breathing
    chest = pose.bones.get('chest')
    if chest:
        chest.rotation_euler = (0.04,0,0)
        chest.keyframe_insert("rotation_euler", frame=start + 40)

    # Slight head tilt
    head = pose.bones.get('head')
    if head:
        head.rotation_euler = (0,0,0.05)
        head.keyframe_insert("rotation_euler", frame=start + 25)
        head.rotation_euler = (0,0,-0.04)
        head.keyframe_insert("rotation_euler", frame=start + 65)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def add_talk_animation(arm_obj, action_name='Talk', start=100, end=160):
    """Add a talking animation (head bob + hand gestures)."""
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    pose = arm_obj.pose

    arm_obj.animation_data_create()
    action = bpy.data.actions.new(action_name)
    arm_obj.animation_data.action = action

    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.location = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=start)
        b.keyframe_insert("rotation_euler", frame=end)

    head = pose.bones.get('head')
    if head:
        for f in range(start, end, 10):
            head.rotation_euler = (0.06 * (1 if (f//10) % 2 == 0 else -1), 0, 0)
            head.keyframe_insert("rotation_euler", frame=f)

    larm = pose.bones.get('lower_arm_L')
    if larm:
        larm.rotation_euler = (0.6,0,0)
        larm.keyframe_insert("rotation_euler", frame=start + 15)
        larm.rotation_euler = (0.3,0,0.2)
        larm.keyframe_insert("rotation_euler", frame=start + 40)
        larm.rotation_euler = (0.7,0,-0.1)
        larm.keyframe_insert("rotation_euler", frame=start + 55)
        larm.rotation_euler = (0,0,0)
        larm.keyframe_insert("rotation_euler", frame=end)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def add_gesture_animation(arm_obj, action_name='Gesture', start=200, end=260):
    """Add a 'come here' or 'pointing' gesture animation."""
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    pose = arm_obj.pose

    arm_obj.animation_data_create()
    action = bpy.data.actions.new(action_name)
    arm_obj.animation_data.action = action

    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.location = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=start)
        b.keyframe_insert("rotation_euler", frame=end)

    uarm_r = pose.bones.get('upper_arm_R')
    larm_r = pose.bones.get('lower_arm_R')

    if uarm_r:
        uarm_r.rotation_euler = (-1.0,0,0)
        uarm_r.keyframe_insert("rotation_euler", frame=start + 15)
    if larm_r:
        larm_r.rotation_euler = (0.5,0,0)
        larm_r.keyframe_insert("rotation_euler", frame=start + 15)
        larm_r.rotation_euler = (0,0,0)
        larm_r.keyframe_insert("rotation_euler", frame=start + 40)
    if uarm_r:
        uarm_r.rotation_euler = (-0.8,0,0)
        uarm_r.keyframe_insert("rotation_euler", frame=start + 40)
        uarm_r.rotation_euler = (0,0,0)
        uarm_r.keyframe_insert("rotation_euler", frame=end)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def push_actions_to_nla(arm_obj, actions_with_starts):
    arm_obj.animation_data_create()
    for action, start in actions_with_starts:
        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, start=start, action=action)
        strip.use_auto_blend = False


def export_glb(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_nla_strips=True,
        export_force_sampling=True,
        export_skins=True,
        export_materials='EXPORT',
        export_yup=True,
    )
    print(f"[Blender] Exported → {path}")


# ==================== MERCHANT ====================
def build_merchant():
    print("[Blender] Building Merchant...")
    clear_scene()

    robe = make_mat('merch_robe', (0.45, 0.28, 0.1), roughness=0.9)
    gold = make_mat('merch_gold', (0.8, 0.65, 0.1), metallic=0.9, roughness=0.2)
    skin = make_mat('merch_skin', (0.85, 0.68, 0.5), roughness=0.9)
    brown = make_mat('merch_brown', (0.3, 0.18, 0.08), roughness=0.95)

    parts = []

    # Body / robe
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.45, depth=1.8, location=(0,0,0.9))
    body = bpy.context.object; body.name = 'merch_body'
    body.data.materials.append(robe); parts.append(body)

    # Chest
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.38, depth=0.55, location=(0,0,1.9))
    chest = bpy.context.object; chest.name = 'merch_chest'
    chest.data.materials.append(robe); parts.append(chest)

    # Head
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.32, location=(0,0,2.7))
    head = bpy.context.object; head.name = 'merch_head'
    head.data.materials.append(skin); parts.append(head)

    # Merchant cap
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.33, depth=0.35, location=(0,0,3.05))
    cap = bpy.context.object; cap.name = 'merch_cap'
    cap.data.materials.append(brown); parts.append(cap)

    # Brim
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.42, depth=0.06, location=(0,0,2.88))
    brim = bpy.context.object; brim.name = 'merch_brim'
    brim.data.materials.append(brown); parts.append(brim)

    # Arms
    for side, ax in [('L',-0.6),('R',0.6)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.14, depth=0.9, location=(ax,0,1.85))
        arm = bpy.context.object; arm.name = f'merch_arm_{side}'
        arm.rotation_euler = (0,0,0.22 * (1 if side == 'L' else -1))
        bpy.ops.object.transform_apply(rotation=True)
        arm.data.materials.append(robe); parts.append(arm)

        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.16, location=(ax*1.08,0,1.42))
        hand = bpy.context.object; hand.name = f'merch_hand_{side}'
        hand.data.materials.append(skin); parts.append(hand)

    # Satchel bag
    bpy.ops.mesh.primitive_cube_add(size=0.55, location=(-0.55, 0.3, 1.1))
    satchel = bpy.context.object; satchel.name = 'merch_satchel'
    satchel.scale = (1.0, 0.5, 0.85)
    bpy.ops.object.transform_apply(scale=True)
    satchel.data.materials.append(brown); parts.append(satchel)

    # Balance scales in hand
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.04, depth=0.5, location=(0.6,0,1.5))
    scale_pole = bpy.context.object; scale_pole.name = 'merch_scale_pole'
    scale_pole.rotation_euler = (0,0,math.pi/2)
    bpy.ops.object.transform_apply(rotation=True)
    scale_pole.data.materials.append(gold); parts.append(scale_pole)

    arm_obj = make_biped_armature('merchant')
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    combined = bpy.context.object; combined.name = 'merchant_mesh'
    bpy.ops.object.select_all(action='DESELECT')
    combined.select_set(True); arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    idle = add_idle_animation(arm_obj, 'Idle', 0, 80)
    talk = add_talk_animation(arm_obj, 'Talk', 100, 160)
    gesture = add_gesture_animation(arm_obj, 'Gesture', 200, 260)
    push_actions_to_nla(arm_obj, [(idle,0),(talk,100),(gesture,200)])
    export_glb(os.path.join(MODELS_DIR, 'npc_merchant.glb'), [combined, arm_obj])


# ==================== ALCHEMIST ====================
def build_alchemist():
    print("[Blender] Building Alchemist...")
    clear_scene()

    apron = make_mat('alch_apron', (0.7, 0.65, 0.45), roughness=0.95)
    shirt = make_mat('alch_shirt', (0.85, 0.82, 0.75), roughness=0.9)
    skin = make_mat('alch_skin', (0.8, 0.62, 0.45), roughness=0.9)
    vial_mat = make_mat('alch_vial', (0.1, 0.8, 0.4), emissive=(0.0, 0.8, 0.3), alpha=0.7)
    leather = make_mat('alch_leather', (0.25, 0.12, 0.05), roughness=0.95)

    parts = []

    # Body / shirt
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.38, depth=1.6, location=(0,0,0.8))
    body = bpy.context.object; body.name = 'alch_body'
    body.data.materials.append(shirt); parts.append(body)

    # Apron overlay (front)
    bpy.ops.mesh.primitive_plane_add(size=0.65, location=(0,0.32,0.8))
    ap = bpy.context.object; ap.name = 'alch_apron'
    ap.scale = (0.8, 1.0, 1.2)
    bpy.ops.object.transform_apply(scale=True)
    ap.data.materials.append(apron); parts.append(ap)

    # Head
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.3, location=(0,0,2.4))
    head = bpy.context.object; head.name = 'alch_head'
    head.data.materials.append(skin); parts.append(head)

    # Round glasses
    for ex in [-0.12, 0.12]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.09, minor_radius=0.015, location=(ex, 0.28, 2.45))
        glass = bpy.context.object; glass.name = f'alch_glass_{ex}'
        glass.rotation_euler = (math.pi/2,0,0)
        bpy.ops.object.transform_apply(rotation=True)
        glass.data.materials.append(make_mat('glass_frame', (0.1,0.1,0.1), metallic=0.8, roughness=0.2))
        parts.append(glass)

    # Hair (disheveled)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.34, location=(0,0,2.5))
    hair = bpy.context.object; hair.name = 'alch_hair'
    hair.scale = (1,0.7,0.85)
    bpy.ops.object.transform_apply(scale=True)
    hair.data.materials.append(make_mat('alch_hair', (0.7,0.6,0.2), roughness=0.98))
    parts.append(hair)

    # Arms
    for side, ax in [('L',-0.52),('R',0.52)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.12, depth=0.85, location=(ax,0,1.7))
        arm = bpy.context.object; arm.name = f'alch_arm_{side}'
        arm.rotation_euler = (0,0,0.2 * (1 if side == 'L' else -1))
        bpy.ops.object.transform_apply(rotation=True)
        arm.data.materials.append(shirt); parts.append(arm)

        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.14, location=(ax*1.1,0,1.3))
        hand = bpy.context.object; hand.name = f'alch_hand_{side}'
        hand.data.materials.append(skin); parts.append(hand)

    # Belt with vial holders
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.4, depth=0.08, location=(0,0,1.25))
    belt = bpy.context.object; belt.name = 'alch_belt'
    belt.data.materials.append(leather); parts.append(belt)

    # 3 Glowing vials on belt
    for i, angle in enumerate([0, 2.2, -2.2]):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.055, depth=0.28, location=(math.cos(angle)*0.4, math.sin(angle)*0.4, 1.15))
        vial = bpy.context.object; vial.name = f'alch_vial_{i}'
        vial.data.materials.append(vial_mat); parts.append(vial)

    arm_obj = make_biped_armature('alchemist', height=2.55, torso_z=1.55)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    combined = bpy.context.object; combined.name = 'alchemist_mesh'
    bpy.ops.object.select_all(action='DESELECT')
    combined.select_set(True); arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    idle = add_idle_animation(arm_obj, 'Idle', 0, 80)
    talk = add_talk_animation(arm_obj, 'Talk', 100, 160)
    gesture = add_gesture_animation(arm_obj, 'Gesture', 200, 260)
    push_actions_to_nla(arm_obj, [(idle,0),(talk,100),(gesture,200)])
    export_glb(os.path.join(MODELS_DIR, 'npc_alchemist.glb'), [combined, arm_obj])


# ==================== QUEST GIVER ====================
def build_quest_giver():
    print("[Blender] Building Quest Giver (Elder)...")
    clear_scene()

    robe = make_mat('qg_robe', (0.1, 0.1, 0.35), roughness=0.88)
    gold = make_mat('qg_gold', (0.85, 0.65, 0.05), metallic=0.95, roughness=0.15)
    skin = make_mat('qg_skin', (0.82, 0.68, 0.55), roughness=0.9)
    beard_mat = make_mat('qg_beard', (0.92, 0.9, 0.88), roughness=0.95)
    book_mat = make_mat('qg_book', (0.12, 0.08, 0.04), roughness=0.9)
    rune_mat = make_mat('qg_rune', (0.3, 0.6, 1.0), emissive=(0.3, 0.6, 1.0))

    parts = []

    # Long robe
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.48, depth=2.1, location=(0,0,1.05))
    body = bpy.context.object; body.name = 'qg_robe_body'
    body.data.materials.append(robe); parts.append(body)

    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.55, radius2=0, depth=0.25, location=(0,0,0.12))
    hem = bpy.context.object; hem.name = 'qg_robe_hem'
    hem.data.materials.append(robe); parts.append(hem)

    # Collar
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.38, depth=0.3, location=(0,0,2.25))
    collar = bpy.context.object; collar.name = 'qg_collar'
    collar.data.materials.append(robe); parts.append(collar)

    # Shoulders with gold epaulettes
    for side, sx in [('L',-0.58),('R',0.58)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.26, location=(sx,0,2.3))
        ep = bpy.context.object; ep.name = f'qg_epaulette_{side}'
        ep.scale = (1.2,0.85,0.7)
        bpy.ops.object.transform_apply(scale=True)
        ep.data.materials.append(gold); parts.append(ep)

    # Head (elder with wrinkles)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.33, location=(0,0,2.9))
    head = bpy.context.object; head.name = 'qg_head'
    head.scale = (1,0.88,1.05)
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials.append(skin); parts.append(head)

    # Long flowing beard
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.28, depth=1.1, location=(0, 0.12, 2.25))
    beard = bpy.context.object; beard.name = 'qg_beard'
    beard.rotation_euler = (0.2,0,0)
    bpy.ops.object.transform_apply(rotation=True)
    beard.data.materials.append(beard_mat); parts.append(beard)

    # Eyebrows (bushy elder)
    for ex in [-0.14, 0.14]:
        bpy.ops.mesh.primitive_cube_add(size=0.1, location=(ex, 0.3, 2.98))
        brow = bpy.context.object; brow.name = f'qg_brow_{ex}'
        brow.scale = (1.4,0.25,0.35)
        bpy.ops.object.transform_apply(scale=True)
        brow.data.materials.append(beard_mat); parts.append(brow)

    # Tall elder crown (diadem)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.36, depth=0.14, location=(0,0,3.26))
    crown = bpy.context.object; crown.name = 'qg_crown'
    crown.data.materials.append(gold); parts.append(crown)

    # Arms
    for side, ax in [('L',-0.65),('R',0.65)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.16, depth=1.0, location=(ax,0,2.0))
        arm = bpy.context.object; arm.name = f'qg_arm_{side}'
        arm.rotation_euler = (0,0,0.25 * (1 if side == 'L' else -1))
        bpy.ops.object.transform_apply(rotation=True)
        arm.data.materials.append(robe); parts.append(arm)

        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.17, location=(ax*1.12,0,1.55))
        hand = bpy.context.object; hand.name = f'qg_hand_{side}'
        hand.data.materials.append(skin); parts.append(hand)

    # GLOWING RUNE BOOK held in left hand
    bpy.ops.mesh.primitive_cube_add(size=0.45, location=(-0.72,0.1,1.5))
    book = bpy.context.object; book.name = 'qg_book'
    book.scale = (0.85,0.12,1.1)
    bpy.ops.object.transform_apply(scale=True)
    book.data.materials.append(book_mat); parts.append(book)

    # Rune glow on book cover
    bpy.ops.mesh.primitive_plane_add(size=0.32, location=(-0.72, 0.16, 1.5))
    rune_page = bpy.context.object; rune_page.name = 'qg_rune_page'
    rune_page.scale = (0.8,0.8,0.9)
    bpy.ops.object.transform_apply(scale=True)
    rune_page.rotation_euler = (math.pi/2,0,0)
    bpy.ops.object.transform_apply(rotation=True)
    rune_page.data.materials.append(rune_mat); parts.append(rune_page)

    arm_obj = make_biped_armature('quest_giver', height=3.22, torso_z=2.0)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    combined = bpy.context.object; combined.name = 'quest_giver_mesh'
    bpy.ops.object.select_all(action='DESELECT')
    combined.select_set(True); arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    idle = add_idle_animation(arm_obj, 'Idle', 0, 80)
    talk = add_talk_animation(arm_obj, 'Talk', 100, 160)
    gesture = add_gesture_animation(arm_obj, 'Gesture', 200, 260)
    push_actions_to_nla(arm_obj, [(idle,0),(talk,100),(gesture,200)])
    export_glb(os.path.join(MODELS_DIR, 'npc_quest_giver.glb'), [combined, arm_obj])


def main():
    print("[Blender] Starting NPC generation pipeline...")
    os.makedirs(MODELS_DIR, exist_ok=True)
    build_merchant()
    build_alchemist()
    build_quest_giver()
    print("[Blender] All NPCs generated successfully!")

if __name__ == '__main__':
    main()
