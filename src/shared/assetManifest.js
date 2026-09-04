/**
 * Runtime floor bundles. Procedural architecture is built synchronously by
 * TowerEnvironment; these optional GLBs are streamed just-in-time and cached
 * by AssetLoader. Keeping the map data-only makes it easy to replace entries
 * with locally generated models without changing gameplay code.
 */
export const FLOOR_ASSET_BUNDLES = Object.freeze({
  1: Object.freeze(['/models/sorcerer.glb', '/models/elf_mage.glb', '/models/enemy_sentinel.glb']),
  2: Object.freeze(['/models/blacksmith.glb', '/models/guard_tower.glb', '/models/enemy_knight.glb']),
  3: Object.freeze(['/models/direwolf.glb', '/models/druid.glb']),
  4: Object.freeze(['/models/assassin.glb', '/models/rogue.glb']),
  5: Object.freeze(['/models/boss_ignis.glb', '/models/enemy_golem.glb']),
  6: Object.freeze(['/models/props.glb', '/models/heavy_warrior.glb']),
  7: Object.freeze(['/models/enemy_golem.glb', '/models/blacksmith.glb']),
  8: Object.freeze(['/models/direwolf.glb', '/models/elf_mage.glb']),
  9: Object.freeze(['/models/boss_xyris.glb', '/models/enemy_direwolf.glb']),
  10: Object.freeze(['/models/boss_astraea.glb', '/models/props.glb']),
  11: Object.freeze(['/models/druid.glb', '/models/sorcerer.glb']),
  12: Object.freeze(['/models/props.glb', '/models/guard_tower.glb']),
  13: Object.freeze(['/models/rogue.glb', '/models/assassin.glb']),
  14: Object.freeze(['/models/archon_valerius.glb', '/models/knight.glb']),
  15: Object.freeze(['/models/boss_valerius.glb', '/models/archon_valerius.glb'])
});

export function getFloorBundle(floorNumber) {
  return FLOOR_ASSET_BUNDLES[Number(floorNumber)] || [];
}

