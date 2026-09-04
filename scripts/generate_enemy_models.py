"""
Blender Python Script: Generate & Rig 3D Enemy Models
Run via: blender --background --python scripts/generate_enemy_models.py

Outputs:
  - public/models/enemy_direwolf.glb (converted from 3D AI wolf FBX with walk animation)
  - public/models/enemy_knight.glb (rigged from dark fantasy knight with melee/walk/idle)
  - public/models/enemy_golem.glb (heavy stone golem with smash/stomp/idle)
  - public/models/enemy_sentinel.glb (arcane sentinel with floating core and rotating rings)
"""

import bpy
import math
import os
import shutil

MODELS_DIR = r"D:\AZCoreHasse\Projects\gemmini 3.8 flash game\public\models"

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)

def export_glb(path, objs=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if objs:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
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
    else:
        bpy.ops.object.select_all(action='SELECT')
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
    print(f"[Blender] Exported GLB -> {path}")

# =============================================================================
# 1. PROCESS DIREWOLF (from FBX with quadruped walk)
# =============================================================================
def build_direwolf():
    print("[Blender] Building Direwolf...")
    clear_scene()
    fbx_path = os.path.abspath(r"public\models\wolf_temp\tripo_convert_01024a24-a696-4821-a647-bc44b341ff57.fbx")
    if not os.path.exists(fbx_path):
        print(f"[Blender] Warning: {fbx_path} not found.")
        return

    bpy.ops.import_scene.fbx(filepath=fbx_path)
    
    # Rename primary action to 'Walk' or 'Idle'
    if bpy.data.actions:
        primary_action = bpy.data.actions[0]
        primary_action.name = 'Walk'
        print(f"[Blender] Found wolf action: {primary_action.name}, length {primary_action.frame_range}")
    
    out_path = os.path.join(MODELS_DIR, "enemy_direwolf.glb")
    export_glb(out_path)

# =============================================================================
# 2. PROCESS DARK FANTASY KNIGHT (Rig and export with combat animations)
# =============================================================================
def build_knight():
    print("[Blender] Building Dark Fantasy Knight...")
    clear_scene()
    src_path = r"D:\Downloads\dark+fantasy+knight+3d+model.glb"
    if not os.path.exists(src_path):
        print(f"[Blender] Warning: {src_path} not found.")
        return

    bpy.ops.import_scene.gltf(filepath=src_path)
    knight_mesh = bpy.context.selected_objects[0] if bpy.context.selected_objects else bpy.data.objects[0]
    knight_mesh.name = "knight_mesh"

    # Scale and center
    knight_mesh.scale = (0.015, 0.015, 0.015)
    bpy.ops.object.transform_apply(scale=True)

    # Build humanoid armature
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = "knight_armature"

    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm.data.edit_bones
    for b in list(bones):
        bones.remove(b)

    def bone(name, head, tail, parent=None):
        b = bones.new(name)
        b.head = head
        b.tail = tail
        if parent and parent in bones:
            b.parent = bones[parent]
            b.use_connect = False
        return b

    bone('root', (0,0,0), (0,0,0.15))
    bone('hips', (0,0,0.9), (0,0,1.0), 'root')
    bone('spine', (0,0,1.0), (0,0,1.3), 'hips')
    bone('chest', (0,0,1.3), (0,0,1.55), 'spine')
    bone('neck', (0,0,1.55), (0,0,1.65), 'chest')
    bone('head', (0,0,1.65), (0,0,1.9), 'neck')

    # Arms
    bone('upperarm.l', (-0.2,0,1.5), (-0.45,0,1.25), 'chest')
    bone('lowerarm.l', (-0.45,0,1.25), (-0.55,0,1.0), 'upperarm.l')
    bone('hand.l', (-0.55,0,1.0), (-0.6,0,0.88), 'lowerarm.l')

    bone('upperarm.r', (0.2,0,1.5), (0.45,0,1.25), 'chest')
    bone('lowerarm.r', (0.45,0,1.25), (0.55,0,1.0), 'upperarm.r')
    bone('hand.r', (0.55,0,1.0), (0.6,0,0.88), 'lowerarm.r')

    # Legs
    bone('upperleg.l', (-0.18,0,0.9), (-0.2,0,0.45), 'hips')
    bone('lowerleg.l', (-0.2,0,0.45), (-0.2,0,0.08), 'upperleg.l')
    bone('foot.l', (-0.2,0,0.08), (-0.2,0.18,0), 'lowerleg.l')

    bone('upperleg.r', (0.18,0,0.9), (0.2,0,0.45), 'hips')
    bone('lowerleg.r', (0.2,0,0.45), (0.2,0,0.08), 'upperleg.r')
    bone('foot.r', (0.2,0,0.08), (0.2,0.18,0), 'lowerleg.r')

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent mesh to armature with auto weights
    bpy.ops.object.select_all(action='DESELECT')
    knight_mesh.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # 1. Idle Animation
    bpy.ops.object.mode_set(mode='POSE')
    pose = arm.pose
    arm.animation_data_create()
    idle_act = bpy.data.actions.new("Idle")
    arm.animation_data.action = idle_act

    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
        b.keyframe_insert("rotation_euler", frame=60)

    # Slight breathing
    chest = pose.bones.get('chest')
    if chest:
        chest.rotation_euler = (0.05, 0, 0)
        chest.keyframe_insert("rotation_euler", frame=30)

    # 2. Attack Animation (Sword Slash)
    slash_act = bpy.data.actions.new("Attack")
    arm.animation_data.action = slash_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
        b.keyframe_insert("rotation_euler", frame=40)

    r_arm = pose.bones.get('upperarm.r')
    r_forearm = pose.bones.get('lowerarm.r')
    if r_arm and r_forearm:
        # Wind up
        r_arm.rotation_euler = (-1.2, 0.4, 0.6)
        r_arm.keyframe_insert("rotation_euler", frame=12)
        # Slash forward
        r_arm.rotation_euler = (0.8, -0.6, -0.3)
        r_arm.keyframe_insert("rotation_euler", frame=22)
        # Recover
        r_arm.rotation_euler = (0, 0, 0)
        r_arm.keyframe_insert("rotation_euler", frame=40)

    # 3. Walk Animation
    walk_act = bpy.data.actions.new("Walk")
    arm.animation_data.action = walk_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
        b.keyframe_insert("rotation_euler", frame=40)

    l_leg = pose.bones.get('upperleg.l')
    r_leg = pose.bones.get('upperleg.r')
    if l_leg and r_leg:
        l_leg.rotation_euler = (0.45, 0, 0)
        r_leg.rotation_euler = (-0.45, 0, 0)
        l_leg.keyframe_insert("rotation_euler", frame=10)
        r_leg.keyframe_insert("rotation_euler", frame=10)

        l_leg.rotation_euler = (-0.45, 0, 0)
        r_leg.rotation_euler = (0.45, 0, 0)
        l_leg.keyframe_insert("rotation_euler", frame=30)
        r_leg.keyframe_insert("rotation_euler", frame=30)

    # 4. Death Animation
    death_act = bpy.data.actions.new("Death")
    arm.animation_data.action = death_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)

    hips = pose.bones.get('hips')
    if hips:
        hips.rotation_euler = (1.4, 0, 0)
        hips.location = (0, 0, -0.7)
        hips.keyframe_insert("rotation_euler", frame=30)
        hips.keyframe_insert("location", frame=30)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Push all actions to NLA tracks
    for idx, act in enumerate([idle_act, slash_act, walk_act, death_act]):
        track = arm.animation_data.nla_tracks.new()
        track.name = act.name
        strip = track.strips.new(act.name, start=idx*100, action=act)
        strip.use_auto_blend = False

    out_path = os.path.join(MODELS_DIR, "enemy_knight.glb")
    export_glb(out_path, [knight_mesh, arm])

# =============================================================================
# 3. BUILD HEAVY STONE GOLEM
# =============================================================================
def build_golem():
    print("[Blender] Building Heavy Stone Golem...")
    clear_scene()

    rock_mat = bpy.data.materials.new(name="golem_rock")
    rock_mat.use_nodes = True
    bsdf = rock_mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.25, 0.24, 0.22, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.95

    core_mat = bpy.data.materials.new(name="golem_core")
    core_mat.use_nodes = True
    bsdf_c = core_mat.node_tree.nodes['Principled BSDF']
    bsdf_c.inputs['Base Color'].default_value = (1.0, 0.4, 0.0, 1.0)
    bsdf_c.inputs['Emission Color'].default_value = (1.0, 0.35, 0.0, 1.0)
    bsdf_c.inputs['Emission Strength'].default_value = 4.0

    parts = []

    # Big Rock Torso
    bpy.ops.mesh.primitive_cube_add(size=1.6, location=(0,0,1.8))
    torso = bpy.context.object; torso.name = "golem_torso"
    torso.scale = (1.2, 0.8, 0.9)
    bpy.ops.object.transform_apply(scale=True)
    torso.data.materials.append(rock_mat); parts.append(torso)

    # Glowing Core Eye
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.35, location=(0,0.55,1.9))
    eye = bpy.context.object; eye.name = "golem_eye"
    eye.data.materials.append(core_mat); parts.append(eye)

    # Huge Bouldery Shoulders
    for side, sx in [('L', -1.3), ('R', 1.3)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.55, location=(sx, 0, 2.0))
        sh = bpy.context.object; sh.name = f"golem_shoulder_{side}"
        sh.data.materials.append(rock_mat); parts.append(sh)

        # Arms
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.35, depth=1.3, location=(sx*1.05, 0, 1.2))
        arm_p = bpy.context.object; arm_p.name = f"golem_arm_{side}"
        arm_p.data.materials.append(rock_mat); parts.append(arm_p)

        # Huge Stone Fists
        bpy.ops.mesh.primitive_cube_add(size=0.6, location=(sx*1.1, 0, 0.4))
        fist = bpy.context.object; fist.name = f"golem_fist_{side}"
        fist.data.materials.append(rock_mat); parts.append(fist)

    # Massive Legs
    for side, lx in [('L', -0.6), ('R', 0.6)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.4, depth=1.1, location=(lx, 0, 0.6))
        leg = bpy.context.object; leg.name = f"golem_leg_{side}"
        leg.data.materials.append(rock_mat); parts.append(leg)

    # Armature
    bpy.ops.object.armature_add(location=(0,0,0))
    arm = bpy.context.object; arm.name = "golem_armature"
    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm.data.edit_bones
    for b in list(bones): bones.remove(b)

    def add_bone(name, head, tail, parent=None):
        b = bones.new(name)
        b.head = head; b.tail = tail
        if parent and parent in bones: b.parent = bones[parent]; b.use_connect = False
        return b

    add_bone('root', (0,0,0), (0,0,0.2))
    add_bone('hips', (0,0,1.2), (0,0,1.4), 'root')
    add_bone('chest', (0,0,1.4), (0,0,2.1), 'hips')
    add_bone('upperarm.l', (-1.0,0,2.0), (-1.3,0,1.3), 'chest')
    add_bone('lowerarm.l', (-1.3,0,1.3), (-1.4,0,0.4), 'upperarm.l')
    add_bone('upperarm.r', (1.0,0,2.0), (1.3,0,1.3), 'chest')
    add_bone('lowerarm.r', (1.3,0,1.3), (1.4,0,0.4), 'upperarm.r')
    add_bone('leg.l', (-0.6,0,1.2), (-0.6,0,0.1), 'hips')
    add_bone('leg.r', (0.6,0,1.2), (0.6,0,0.1), 'hips')
    bpy.ops.object.mode_set(mode='OBJECT')

    # Join and skin
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    golem_mesh = bpy.context.object; golem_mesh.name = "golem_mesh"
    bpy.ops.object.select_all(action='DESELECT')
    golem_mesh.select_set(True); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Animations
    bpy.ops.object.mode_set(mode='POSE')
    pose = arm.pose
    arm.animation_data_create()

    # Idle
    idle_act = bpy.data.actions.new("Idle")
    arm.animation_data.action = idle_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
        b.keyframe_insert("rotation_euler", frame=60)
    ch = pose.bones.get('chest')
    if ch:
        ch.rotation_euler = (0.06, 0, 0)
        ch.keyframe_insert("rotation_euler", frame=30)

    # Smash Attack (overhead 2H ground slam)
    smash_act = bpy.data.actions.new("Attack")
    arm.animation_data.action = smash_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
        b.keyframe_insert("rotation_euler", frame=50)
    ul = pose.bones.get('upperarm.l')
    ur = pose.bones.get('upperarm.r')
    if ul and ur:
        # Raise fists
        ul.rotation_euler = (-1.8, 0, 0.4)
        ur.rotation_euler = (-1.8, 0, -0.4)
        ul.keyframe_insert("rotation_euler", frame=18)
        ur.keyframe_insert("rotation_euler", frame=18)
        # Slam down
        ul.rotation_euler = (1.2, 0, -0.2)
        ur.rotation_euler = (1.2, 0, 0.2)
        ul.keyframe_insert("rotation_euler", frame=28)
        ur.keyframe_insert("rotation_euler", frame=28)
        # Return
        ul.rotation_euler = (0,0,0)
        ur.rotation_euler = (0,0,0)
        ul.keyframe_insert("rotation_euler", frame=50)
        ur.keyframe_insert("rotation_euler", frame=50)

    # Walk
    walk_act = bpy.data.actions.new("Walk")
    arm.animation_data.action = walk_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
        b.keyframe_insert("rotation_euler", frame=40)
    ll = pose.bones.get('leg.l')
    lr = pose.bones.get('leg.r')
    if ll and lr:
        ll.rotation_euler = (0.35, 0, 0)
        lr.rotation_euler = (-0.35, 0, 0)
        ll.keyframe_insert("rotation_euler", frame=10)
        lr.keyframe_insert("rotation_euler", frame=10)
        ll.rotation_euler = (-0.35, 0, 0)
        lr.rotation_euler = (0.35, 0, 0)
        ll.keyframe_insert("rotation_euler", frame=30)
        lr.keyframe_insert("rotation_euler", frame=30)

    # Death
    death_act = bpy.data.actions.new("Death")
    arm.animation_data.action = death_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
    hp = pose.bones.get('hips')
    if hp:
        hp.rotation_euler = (1.5, 0, 0)
        hp.location = (0, 0, -1.0)
        hp.keyframe_insert("rotation_euler", frame=30)
        hp.keyframe_insert("location", frame=30)

    bpy.ops.object.mode_set(mode='OBJECT')

    for idx, act in enumerate([idle_act, smash_act, walk_act, death_act]):
        tr = arm.animation_data.nla_tracks.new()
        tr.name = act.name
        st = tr.strips.new(act.name, start=idx*100, action=act)
        st.use_auto_blend = False

    out_path = os.path.join(MODELS_DIR, "enemy_golem.glb")
    export_glb(out_path, [golem_mesh, arm])

# =============================================================================
# 4. BUILD ARCANE SENTINEL (Hovering eye with spinning orbital rings)
# =============================================================================
def build_sentinel():
    print("[Blender] Building Arcane Sentinel...")
    clear_scene()

    gold_mat = bpy.data.materials.new(name="sent_gold")
    gold_mat.use_nodes = True
    bs = gold_mat.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (0.85, 0.7, 0.1, 1.0)
    bs.inputs['Metallic'].default_value = 0.95
    bs.inputs['Roughness'].default_value = 0.2

    eye_mat = bpy.data.materials.new(name="sent_eye")
    eye_mat.use_nodes = True
    bse = eye_mat.node_tree.nodes['Principled BSDF']
    bse.inputs['Base Color'].default_value = (0.0, 0.8, 1.0, 1.0)
    bse.inputs['Emission Color'].default_value = (0.0, 0.7, 1.0, 1.0)
    bse.inputs['Emission Strength'].default_value = 4.5

    parts = []

    # Central floating crystal eye
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.45, location=(0,0,1.8))
    eye = bpy.context.object; eye.name = "sent_eye"
    eye.data.materials.append(eye_mat); parts.append(eye)

    # 2 Outer Gimbal Torus Rings
    bpy.ops.mesh.primitive_torus_add(major_radius=0.75, minor_radius=0.06, location=(0,0,1.8))
    ring1 = bpy.context.object; ring1.name = "sent_ring1"
    ring1.data.materials.append(gold_mat); parts.append(ring1)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.95, minor_radius=0.05, location=(0,0,1.8))
    ring2 = bpy.context.object; ring2.name = "sent_ring2"
    ring2.rotation_euler = (math.pi/2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    ring2.data.materials.append(gold_mat); parts.append(ring2)

    # 4 Orbiting Arcane Runestones
    for i in range(4):
        angle = (i / 4) * math.pi * 2
        rx = math.cos(angle) * 1.2
        ry = math.sin(angle) * 1.2
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.18, location=(rx, ry, 1.8))
        octa = bpy.context.object; octa.name = f"sent_stone_{i}"
        octa.data.materials.append(gold_mat); parts.append(octa)

    # Armature
    bpy.ops.object.armature_add(location=(0,0,0))
    arm = bpy.context.object; arm.name = "sent_armature"
    bpy.ops.object.mode_set(mode='EDIT')
    bones = arm.data.edit_bones
    for b in list(bones): bones.remove(b)

    rb = bones.new('root')
    rb.head = (0,0,0); rb.tail = (0,0,0.5)

    cb = bones.new('core')
    cb.head = (0,0,1.5); cb.tail = (0,0,2.1); cb.parent = rb

    r1b = bones.new('ring1')
    r1b.head = (0,0,1.6); r1b.tail = (0,0,2.0); r1b.parent = cb

    r2b = bones.new('ring2')
    r2b.head = (0,0,1.6); r2b.tail = (0,0,2.0); r2b.parent = cb

    bpy.ops.object.mode_set(mode='OBJECT')

    # Join mesh and skin
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    sent_mesh = bpy.context.object; sent_mesh.name = "sent_mesh"
    bpy.ops.object.select_all(action='DESELECT')
    sent_mesh.select_set(True); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Animations
    bpy.ops.object.mode_set(mode='POSE')
    pose = arm.pose
    arm.animation_data_create()

    # Idle (Hover and spin rings)
    idle_act = bpy.data.actions.new("Idle")
    arm.animation_data.action = idle_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
        b.keyframe_insert("rotation_euler", frame=80)
    core = pose.bones.get('core')
    r1 = pose.bones.get('ring1')
    r2 = pose.bones.get('ring2')
    if core:
        core.location = (0, 0, 0.25)
        core.keyframe_insert("location", frame=40)
        core.location = (0, 0, 0)
        core.keyframe_insert("location", frame=80)
    if r1 and r2:
        r1.rotation_euler = (0, 0, math.pi * 2)
        r1.keyframe_insert("rotation_euler", frame=80)
        r2.rotation_euler = (math.pi * 2, 0, 0)
        r2.keyframe_insert("rotation_euler", frame=80)

    # Attack (Laser Charge Surge)
    atk_act = bpy.data.actions.new("Attack")
    arm.animation_data.action = atk_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
        b.keyframe_insert("rotation_euler", frame=40)
    if core:
        core.scale = (1.5, 1.5, 1.5)
        core.keyframe_insert("scale", frame=20)
        core.scale = (1.0, 1.0, 1.0)
        core.keyframe_insert("scale", frame=40)

    # Death
    death_act = bpy.data.actions.new("Death")
    arm.animation_data.action = death_act
    for b in pose.bones:
        b.rotation_euler = (0,0,0)
        b.keyframe_insert("rotation_euler", frame=0)
    if core:
        core.location = (0, 0, -1.5)
        core.scale = (0.1, 0.1, 0.1)
        core.keyframe_insert("location", frame=30)
        core.keyframe_insert("scale", frame=30)

    bpy.ops.object.mode_set(mode='OBJECT')

    for idx, act in enumerate([idle_act, atk_act, death_act]):
        tr = arm.animation_data.nla_tracks.new()
        tr.name = act.name
        st = tr.strips.new(act.name, start=idx*100, action=act)
        st.use_auto_blend = False

    out_path = os.path.join(MODELS_DIR, "enemy_sentinel.glb")
    export_glb(out_path, [sent_mesh, arm])

def main():
    print("[Blender] Starting Enemy Generation & Rigging Pipeline...")
    build_direwolf()
    build_knight()
    build_golem()
    build_sentinel()
    print("[Blender] All enemies generated and rigged successfully!")

if __name__ == '__main__':
    main()
