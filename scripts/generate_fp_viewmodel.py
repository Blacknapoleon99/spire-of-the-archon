import bpy
import math
import os

# Clean slate
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ==========================================
# 1. CREATE PBR MATERIALS
# ==========================================
def create_pbr_material(name, base_color, metallic=0.0, roughness=0.5, emissive=(0,0,0,1), emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = emissive
        bsdf.inputs['Emission Strength'].default_value = emissive_strength
    elif 'Emission' in bsdf.inputs:
        bsdf.inputs['Emission'].default_value = emissive
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat

mat_leather = create_pbr_material('Mat_Leather', (0.07, 0.05, 0.08, 1.0), metallic=0.15, roughness=0.38)
mat_gold = create_pbr_material('Mat_Gold', (0.85, 0.65, 0.18, 1.0), metallic=0.88, roughness=0.22)
mat_wood = create_pbr_material('Mat_Elderwood', (0.12, 0.06, 0.03, 1.0), metallic=0.1, roughness=0.45)
mat_cloth = create_pbr_material('Mat_Velvet', (0.18, 0.04, 0.05, 1.0), metallic=0.0, roughness=0.65)
mat_crystal = create_pbr_material('Mat_ArcaneCrystal', (0.9, 0.2, 0.1, 1.0), metallic=0.25, roughness=0.05, emissive=(1.0, 0.35, 0.1, 1.0), emissive_strength=4.5)
mat_rune = create_pbr_material('Mat_GlowingRune', (1.0, 0.45, 0.15, 1.0), metallic=0.1, roughness=0.1, emissive=(1.0, 0.45, 0.15, 1.0), emissive_strength=5.0)

# ==========================================
# 2. CREATE SKELETON ARMATURE
# ==========================================
amt = bpy.data.armatures.new('FP_RigData')
rig = bpy.data.objects.new('FP_Rig', amt)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')

# Right Arm & Hand Hierarchy
b_root = amt.edit_bones.new('Root')
b_root.head = (0, 0, 0)
b_root.tail = (0, 0.1, 0)

# Right Arm
b_up_r = amt.edit_bones.new('UpperArm_R')
b_up_r.head = (0.34, -0.22, -0.20)
b_up_r.tail = (0.30, 0.05, -0.15)
b_up_r.parent = b_root

b_fore_r = amt.edit_bones.new('ForeArm_R')
b_fore_r.head = b_up_r.tail
b_fore_r.tail = (0.24, 0.30, -0.08)
b_fore_r.parent = b_up_r

b_hand_r = amt.edit_bones.new('Hand_R')
b_hand_r.head = b_fore_r.tail
b_hand_r.tail = (0.20, 0.42, -0.04)
b_hand_r.parent = b_fore_r

b_wand = amt.edit_bones.new('Wand_R')
b_wand.head = (0.20, 0.42, -0.04)
b_wand.tail = (0.16, 0.98, 0.22)
b_wand.parent = b_hand_r

# Fingers Right
b_thumb_r1 = amt.edit_bones.new('Thumb_R_01')
b_thumb_r1.head = (0.18, 0.40, -0.02)
b_thumb_r1.tail = (0.16, 0.44, 0.01)
b_thumb_r1.parent = b_hand_r

b_index_r1 = amt.edit_bones.new('Index_R_01')
b_index_r1.head = (0.21, 0.43, -0.03)
b_index_r1.tail = (0.21, 0.47, -0.06)
b_index_r1.parent = b_hand_r

# Left Arm & Somatic Hand Hierarchy
b_up_l = amt.edit_bones.new('UpperArm_L')
b_up_l.head = (-0.34, -0.22, -0.20)
b_up_l.tail = (-0.28, 0.04, -0.15)
b_up_l.parent = b_root

b_fore_l = amt.edit_bones.new('ForeArm_L')
b_fore_l.head = b_up_l.tail
b_fore_l.tail = (-0.22, 0.28, -0.06)
b_fore_l.parent = b_up_l

b_hand_l = amt.edit_bones.new('Hand_L')
b_hand_l.head = b_fore_l.tail
b_hand_l.tail = (-0.18, 0.42, 0.02)
b_hand_l.parent = b_fore_l

b_index_l1 = amt.edit_bones.new('Index_L_01')
b_index_l1.head = (-0.18, 0.42, 0.02)
b_index_l1.tail = (-0.17, 0.47, 0.04)
b_index_l1.parent = b_hand_l

b_thumb_l1 = amt.edit_bones.new('Thumb_L_01')
b_thumb_l1.head = (-0.20, 0.40, 0.00)
b_thumb_l1.tail = (-0.23, 0.44, 0.02)
b_thumb_l1.parent = b_hand_l

bpy.ops.object.mode_set(mode='OBJECT')

# ==========================================
# 3. BUILD 3D HIGH-DETAIL GEOMETRIES
# ==========================================
def create_mesh_cylinder(name, radius_top, radius_bottom, depth, location, rotation=(0,0,0), material=None):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius_top,
        depth=depth,
        location=location,
        rotation=rotation,
        vertices=16
    )
    obj = bpy.context.active_object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj

def create_mesh_sphere(name, radius, location, scale=(1,1,1), material=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius,
        location=location,
        segments=16,
        ring_count=12
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    if material:
        obj.data.materials.append(material)
    return obj

def create_mesh_torus(name, major_r, minor_r, location, rotation=(0,0,0), material=None):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_r,
        minor_radius=minor_r,
        location=location,
        rotation=rotation,
        major_segments=24,
        minor_segments=8
    )
    obj = bpy.context.active_object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj

def create_mesh_crystal(name, size, location, rotation=(0,0,0), material=None):
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=size, depth=size*1.8, location=location, rotation=rotation)
    top = bpy.context.active_object
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=size, depth=size*1.8, location=location, rotation=(rotation[0]+math.pi, rotation[1], rotation[2]))
    bottom = bpy.context.active_object
    
    bpy.context.view_layer.objects.active = top
    top.select_set(True)
    bottom.select_set(True)
    bpy.ops.object.join()
    top.name = name
    if material:
        top.data.materials.append(material)
    return top

# A. Forearm Sleeves & Gilded Bracers
sleeve_r = create_mesh_cylinder('Sleeve_R', 0.058, 0.072, 0.30, (0.28, 0.15, -0.12), (1.1, 0.2, -0.3), mat_cloth)
bracer_r = create_mesh_cylinder('Bracer_R', 0.062, 0.066, 0.12, (0.26, 0.22, -0.10), (1.1, 0.2, -0.3), mat_leather)
ring_r1 = create_mesh_torus('BracerRing_R1', 0.067, 0.006, (0.27, 0.18, -0.11), (1.1, 0.2, -0.3), mat_gold)
ring_r2 = create_mesh_torus('BracerRing_R2', 0.065, 0.006, (0.25, 0.26, -0.09), (1.1, 0.2, -0.3), mat_gold)

sleeve_l = create_mesh_cylinder('Sleeve_L', 0.058, 0.072, 0.30, (-0.26, 0.14, -0.11), (1.1, -0.2, 0.3), mat_cloth)
bracer_l = create_mesh_cylinder('Bracer_L', 0.062, 0.066, 0.12, (-0.24, 0.21, -0.09), (1.1, -0.2, 0.3), mat_leather)
ring_l1 = create_mesh_torus('BracerRing_L1', 0.067, 0.006, (-0.25, 0.17, -0.10), (1.1, -0.2, 0.3), mat_gold)
ring_l2 = create_mesh_torus('BracerRing_L2', 0.065, 0.006, (-0.23, 0.25, -0.08), (1.1, -0.2, 0.3), mat_gold)

# B. Hands
hand_r_mesh = create_mesh_sphere('HandMesh_R', 0.044, (0.21, 0.36, -0.06), (0.9, 1.2, 0.7), mat_leather)
hand_l_mesh = create_mesh_sphere('HandMesh_L', 0.044, (-0.19, 0.35, -0.04), (0.9, 1.2, 0.7), mat_leather)

# Hand Knuckle Guards & Plates
plate_r = create_mesh_cylinder('Plate_R', 0.038, 0.038, 0.012, (0.21, 0.38, -0.03), (0.3, 0.2, 0), mat_gold)
plate_l = create_mesh_cylinder('Plate_L', 0.038, 0.038, 0.012, (-0.19, 0.37, -0.01), (0.3, -0.2, 0), mat_gold)

# Fingers wrapped around wand (Right Hand)
f_index_r = create_mesh_cylinder('FingerIndex_R', 0.011, 0.012, 0.075, (0.19, 0.44, -0.05), (0.2, 1.4, 0.2), mat_leather)
f_thumb_r = create_mesh_cylinder('FingerThumb_R', 0.012, 0.013, 0.065, (0.17, 0.42, 0.01), (-0.8, 0.6, 0.4), mat_leather)

# Somatic Fingers (Left Hand)
f_index_l = create_mesh_cylinder('FingerIndex_L', 0.010, 0.011, 0.075, (-0.17, 0.43, 0.01), (-0.4, 0.2, -0.3), mat_leather)
f_thumb_l = create_mesh_cylinder('FingerThumb_L', 0.011, 0.012, 0.065, (-0.21, 0.40, 0.02), (-0.6, -0.5, 0.3), mat_leather)

# Left Somatic Rune Ring
left_rune_ring = create_mesh_torus('LeftRuneRing', 0.065, 0.005, (-0.18, 0.45, 0.04), (0, 0, 0), mat_rune)

# C. The 3D Archon Wand
wand_shaft = create_mesh_cylinder('WandShaft', 0.013, 0.022, 0.65, (0.18, 0.62, 0.07), (1.1, 0.1, -0.2), mat_wood)
wand_grip = create_mesh_cylinder('WandGrip', 0.024, 0.024, 0.18, (0.19, 0.42, -0.03), (1.1, 0.1, -0.2), mat_leather)
grip_ring1 = create_mesh_torus('GripRing1', 0.026, 0.004, (0.20, 0.34, -0.08), (1.1, 0.1, -0.2), mat_gold)
grip_ring2 = create_mesh_torus('GripRing2', 0.026, 0.004, (0.18, 0.50, 0.01), (1.1, 0.1, -0.2), mat_gold)

wand_pommel = create_mesh_sphere('WandPommel', 0.022, (0.21, 0.31, -0.10), (1, 1, 1), mat_gold)
pommel_gem = create_mesh_sphere('PommelGem', 0.014, (0.22, 0.28, -0.12), (1, 1, 1), mat_crystal)

crown_mount = create_mesh_cylinder('CrownMount', 0.032, 0.016, 0.08, (0.16, 0.88, 0.22), (1.1, 0.1, -0.2), mat_gold)

claws = []
for i in range(4):
    angle = i * (math.pi / 2)
    cx = 0.16 + math.cos(angle) * 0.026
    cy = 0.90 + math.sin(angle) * 0.01
    cz = 0.23 + math.sin(angle) * 0.026
    claw = create_mesh_cylinder(f'Claw_{i}', 0.005, 0.010, 0.07, (cx, cy, cz), (1.1, 0.1, angle), mat_gold)
    claws.append(claw)

astrolabe1 = create_mesh_torus('Astrolabe1', 0.055, 0.004, (0.15, 0.94, 0.26), (1.1, 0.1, -0.2), mat_gold)
astrolabe2 = create_mesh_torus('Astrolabe2', 0.042, 0.003, (0.15, 0.94, 0.26), (0.4, 1.2, 0.5), mat_gold)

focus_crystal = create_mesh_crystal('FocusCrystal', 0.048, (0.15, 0.94, 0.26), (1.1, 0.1, -0.2), mat_crystal)

shards = []
for s in range(4):
    sa = s * (math.pi / 2)
    sx = 0.15 + math.cos(sa) * 0.08
    sz = 0.26 + math.sin(sa) * 0.08
    shard = create_mesh_crystal(f'WandShard_{s}', 0.015, (sx, 0.94, sz), (0.5, s, 0.8), mat_rune)
    shards.append(shard)

# ==========================================
# 4. PARENT OBJECTS TO ARMATURE BONES
# ==========================================
def bind_to_bone(obj, bone_name):
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name

bind_to_bone(sleeve_r, 'UpperArm_R')
bind_to_bone(bracer_r, 'ForeArm_R')
bind_to_bone(ring_r1, 'ForeArm_R')
bind_to_bone(ring_r2, 'ForeArm_R')

bind_to_bone(hand_r_mesh, 'Hand_R')
bind_to_bone(plate_r, 'Hand_R')
bind_to_bone(f_index_r, 'Index_R_01')
bind_to_bone(f_thumb_r, 'Thumb_R_01')

for w_obj in [wand_shaft, wand_grip, grip_ring1, grip_ring2, wand_pommel, pommel_gem, crown_mount, astrolabe1, astrolabe2, focus_crystal] + claws + shards:
    bind_to_bone(w_obj, 'Wand_R')

bind_to_bone(sleeve_l, 'UpperArm_L')
bind_to_bone(bracer_l, 'ForeArm_L')
bind_to_bone(ring_l1, 'ForeArm_L')
bind_to_bone(ring_l2, 'ForeArm_L')

bind_to_bone(hand_l_mesh, 'Hand_L')
bind_to_bone(plate_l, 'Hand_L')
bind_to_bone(f_index_l, 'Index_L_01')
bind_to_bone(f_thumb_l, 'Thumb_L_01')
bind_to_bone(left_rune_ring, 'Hand_L')

# ==========================================
# 5. CREATE ANIMATIONS
# ==========================================
rig.animation_data_create()

def set_bone_keyframe(bone_name, frame, loc=None, rot_euler=None):
    pb = rig.pose.bones.get(bone_name)
    if not pb:
        return
    pb.rotation_mode = 'XYZ'
    if loc:
        pb.location = loc
        pb.keyframe_insert(data_path='location', frame=frame)
    if rot_euler:
        pb.rotation_euler = rot_euler
        pb.keyframe_insert(data_path='rotation_euler', frame=frame)

# A. IDLE ANIMATION (60 frames)
action_idle = bpy.data.actions.new(name='Idle')
rig.animation_data.action = action_idle

for f, wave in [(1, 0.0), (30, 1.0), (60, 0.0)]:
    set_bone_keyframe('ForeArm_R', f, rot_euler=(0, wave * 0.03, wave * 0.02))
    set_bone_keyframe('Hand_R', f, rot_euler=(wave * 0.04, 0, -wave * 0.03))
    set_bone_keyframe('Wand_R', f, rot_euler=(wave * 0.06, wave * 0.04, wave * 0.05))
    set_bone_keyframe('ForeArm_L', f, rot_euler=(0, -wave * 0.04, wave * 0.03))
    set_bone_keyframe('Hand_L', f, rot_euler=(-wave * 0.05, 0, wave * 0.04))

# B. CAST_BASIC ANIMATION (24 frames)
action_cast = bpy.data.actions.new(name='Cast_Basic')
rig.animation_data.action = action_cast

set_bone_keyframe('Hand_R', 1, rot_euler=(0, 0, 0), loc=(0, 0, 0))
set_bone_keyframe('Wand_R', 1, rot_euler=(0, 0, 0), loc=(0, 0, 0))

set_bone_keyframe('Hand_R', 4, rot_euler=(-0.15, -0.05, 0.1), loc=(0, -0.03, -0.02))
set_bone_keyframe('Wand_R', 4, rot_euler=(-0.25, 0, 0.15), loc=(0, -0.04, -0.03))

set_bone_keyframe('Hand_R', 8, rot_euler=(0.28, 0.08, -0.15), loc=(0, 0.08, 0.04))
set_bone_keyframe('Wand_R', 8, rot_euler=(0.42, 0.12, -0.22), loc=(0, 0.12, 0.06))

set_bone_keyframe('Hand_R', 14, rot_euler=(0.10, 0.02, -0.05), loc=(0, 0.03, 0.01))
set_bone_keyframe('Wand_R', 14, rot_euler=(0.14, 0.04, -0.08), loc=(0, 0.04, 0.02))

set_bone_keyframe('Hand_R', 24, rot_euler=(0, 0, 0), loc=(0, 0, 0))
set_bone_keyframe('Wand_R', 24, rot_euler=(0, 0, 0), loc=(0, 0, 0))

# C. WALK ANIMATION (32 frames)
action_walk = bpy.data.actions.new(name='Walk')
rig.animation_data.action = action_walk

for f, sw_x, sw_y in [(1, 0, 0), (9, 0.04, -0.03), (17, 0, 0.02), (25, -0.04, -0.03), (32, 0, 0)]:
    set_bone_keyframe('ForeArm_R', f, rot_euler=(sw_y * 0.5, sw_x * 0.8, 0))
    set_bone_keyframe('Wand_R', f, rot_euler=(sw_y * 1.2, sw_x * 1.5, 0))
    set_bone_keyframe('ForeArm_L', f, rot_euler=(-sw_y * 0.5, -sw_x * 0.8, 0))

rig.animation_data.action = action_idle

# ==========================================
# 6. EXPORT OPTIMIZED GLB TO PUBLIC/MODELS
# ==========================================
out_dir = r'D:\AZCoreHasse\Projects\gemmini 3.8 flash game\public\models'
os.makedirs(out_dir, exist_ok=True)
out_file = os.path.join(out_dir, 'fp_viewmodel_wand.glb')

for obj in scene.objects:
    obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=out_file,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_skins=True,
    export_materials='EXPORT'
)

print(f'=== EXPORT COMPLETED: {out_file} (Size: {os.path.getsize(out_file)} bytes) ===')
