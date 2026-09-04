"""
Blender recipe for the local Astraea hero asset.

Run with:
    blender --background --python scripts/generate_boss_astraea.py

The exported GLB deliberately keeps the animation names consumed by the
runtime. A local 3D generator can replace the primitive body meshes while the
same armature/NLA contract remains intact.
"""

import bpy
import math
import os


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.environ.get(
    "ASTRAEA_OUTPUT",
    os.path.join(ROOT, "public", "models", "boss_astraea.glb"),
)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def make_material(name, color, emission=None, metallic=0.5, roughness=0.4):
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        emission_input = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        strength_input = shader.inputs.get("Emission Strength")
        if emission_input:
            emission_input.default_value = (*emission, 1.0)
        if strength_input:
            strength_input.default_value = 3.5
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def add_ico(name, location, scale, material, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def add_wing(name, location, rotation, scale, material):
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=1.0, radius2=0.08, depth=2.4, location=location)
    wing = bpy.context.object
    wing.name = name
    wing.rotation_euler = rotation
    wing.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    wing.data.materials.append(material)
    return wing


def build_body():
    obsidian = make_material("astraea_obsidian", (0.025, 0.012, 0.04), metallic=0.75, roughness=0.28)
    ivory = make_material("astraea_angel_steel", (0.58, 0.48, 0.30), metallic=0.82, roughness=0.23)
    holy = make_material("astraea_holy_fire", (1.0, 0.30, 0.025), emission=(1.0, 0.12, 0.01), metallic=0.2, roughness=0.2)
    ward = make_material("astraea_prismatic_ward", (0.08, 0.40, 0.80), emission=(0.02, 0.30, 1.0), metallic=0.7, roughness=0.12)

    parts = []
    parts.append(add_ico("astraea_torso", (0, 0, 2.8), (1.25, 0.78, 1.55), obsidian, 3))
    parts.append(add_ico("astraea_head", (0, 0.05, 4.55), (0.60, 0.52, 0.70), ivory, 2))
    parts.append(add_ico("astraea_core", (0, 0.60, 2.8), (0.48, 0.18, 0.58), holy, 2))

    # Angel wing and demon wing silhouettes; the local generator may replace
    # these parts with higher-detail feather and membrane meshes.
    parts.append(add_wing("astraea_angel_wing", (-1.55, 0, 3.8), (0.15, 0.25, -0.45), (1.0, 0.18, 2.2), ivory))
    parts.append(add_wing("astraea_demon_wing", (1.55, 0, 3.6), (-0.20, -0.25, 0.45), (1.15, 0.12, 2.4), obsidian))

    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.10, major_segments=32, minor_segments=8, location=(0, 0.1, 5.25))
    halo = bpy.context.object
    halo.name = "astraea_fire_halo"
    halo.rotation_euler.x = math.pi / 2
    halo.data.materials.append(holy)
    parts.append(halo)

    bpy.ops.mesh.primitive_torus_add(major_radius=1.9, minor_radius=0.06, major_segments=32, minor_segments=6, location=(0, 0, 2.8))
    ward_ring = bpy.context.object
    ward_ring.name = "astraea_prismatic_ring"
    ward_ring.rotation_euler.x = math.pi / 2
    ward_ring.data.materials.append(ward)
    parts.append(ward_ring)

    # Crown/horns and a simple staff silhouette complete the readable boss
    # profile when the high-detail local model is unavailable.
    for x in (-0.42, 0.42):
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.18, radius2=0.02, depth=0.75, location=(x, 0, 5.15))
        horn = bpy.context.object
        horn.name = "astraea_horn"
        horn.rotation_euler.y = -0.25 if x < 0 else 0.25
        horn.data.materials.append(obsidian)
        parts.append(horn)

    return parts


def build_armature():
    bpy.ops.object.armature_add( location=(0, 0, 0))
    armature = bpy.context.object
    armature.name = "Astraea_Armature"
    armature.data.name = "Astraea_Armature"
    edit = armature.data.edit_bones
    root = edit[0]
    root.name = "root"
    root.head = (0, 0, 0)
    root.tail = (0, 0, 1)
    for name, head, tail, parent in (
        ("spine", (0, 0, 1), (0, 0, 3), root),
        ("head", (0, 0, 3), (0, 0, 5), None),
        ("wing_l", (-0.5, 0, 3), (-2.2, 0, 4.5), None),
        ("wing_r", (0.5, 0, 3), (2.2, 0, 4.5), None),
    ):
        bone = edit.new(name)
        bone.head = head
        bone.tail = tail
        bone.parent = parent
    bpy.ops.object.mode_set(mode="OBJECT")
    return armature


def keyframe_action(armature, name, start, end, pose):
    action = bpy.data.actions.new(name)
    armature.animation_data_create()
    armature.animation_data.action = action
    pose_bones = armature.pose.bones
    armature.frame_set(start)
    for bone_name, rotation in pose.items():
        bone = pose_bones.get(bone_name)
        if bone:
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = rotation
            bone.keyframe_insert("rotation_euler", frame=start)
    armature.frame_set(end)
    for bone_name, rotation in pose.items():
        bone = pose_bones.get(bone_name)
        if bone:
            bone.rotation_euler = tuple(-value for value in rotation)
            bone.keyframe_insert("rotation_euler", frame=end)
    return action


def push_to_nla(armature, actions):
    armature.animation_data_create()
    armature.animation_data.action = None
    for action, start in actions:
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, start=start, action=action)
        strip.use_auto_blend = False


def export_glb(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_animations=True,
        export_nla_strips=True,
        export_force_sampling=True,
        export_skins=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    print(f"[Blender] Exported Astraea GLB -> {path}")


def main():
    clear_scene()
    parts = build_body()
    armature = build_armature()
    for part in parts:
        part.parent = armature
    actions = [
        (keyframe_action(armature, "DemonAngelIdle_60f_60", 0, 60, {"wing_l": (0.04, 0, -0.08), "wing_r": (-0.04, 0, 0.08)}), 0),
        (keyframe_action(armature, "AngelWalk90_90f_90", 0, 90, {"wing_l": (0.18, 0, -0.25), "wing_r": (-0.18, 0, 0.25)}), 100),
        (keyframe_action(armature, "QUEEN_SpellCast", 0, 48, {"wing_l": (0.5, 0, -0.4), "wing_r": (-0.5, 0, 0.4)}), 200),
        (keyframe_action(armature, "QUEEN_Dance", 0, 72, {"spine": (0, 0.35, 0), "wing_l": (0.7, 0, -0.8), "wing_r": (-0.7, 0, 0.8)}), 300),
        (keyframe_action(armature, "sellsword_run_90f_90", 0, 90, {"spine": (0.2, 0, 0)}), 400),
        (keyframe_action(armature, "QUEEN_Catwalk_End", 0, 60, {"spine": (0.4, 0, 0), "wing_l": (1.0, 0, -1.0), "wing_r": (-1.0, 0, 1.0)}), 500),
    ]
    push_to_nla(armature, actions)
    export_glb(OUTPUT_PATH)


if __name__ == "__main__":
    main()
