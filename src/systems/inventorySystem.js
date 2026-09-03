import * as THREE from 'three';
import { ITEMS, RARITY_CONFIG } from './itemDatabase.js';
import { ModelFactory } from '../graphics/modelFactory.js';

/**
 * Inventory, Equipment Paperdoll, and 7-Attribute RPG Progression System
 */
export class InventorySystem {
  constructor(scene) {
    this.scene = scene;

    // Base attributes before equipment
    this.baseAttributes = {
      vigor: 15,
      arcana: 20,
      intellect: 18,
      wisdom: 15,
      haste: 10,
      resilience: 10,
      mastery: 10
    };

    // 8 Complete Equipment Paperdoll Slots
    this.equipment = {
      helm: ITEMS.novice_hood,
      amulet: ITEMS.apprentice_amulet,
      chest: ITEMS.initiate_robe,
      mainHand: ITEMS.starter_wand,
      offHand: ITEMS.apprentice_tome,
      hands: ITEMS.cloth_wraps,
      boots: ITEMS.apprentice_boots,
      ring: ITEMS.copper_band
    };

    // 16 Bag Slots
    this.bag = new Array(16).fill(null);
    this.bag[0] = ITEMS.healing_potion;
    this.bag[1] = ITEMS.healing_potion;
    this.bag[2] = ITEMS.mana_potion;

    // In-world 3D dropped loot entities
    this.worldDrops = [];
  }

  /**
   * Recalculates all 7 attributes combining base + equipment
   */
  getAttributes() {
    const total = { ...this.baseAttributes };

    for (const slot of Object.keys(this.equipment)) {
      const item = this.equipment[slot];
      if (item && item.stats) {
        for (const [attr, val] of Object.entries(item.stats)) {
          total[attr] = (total[attr] || 0) + val;
        }
      }
    }

    return total;
  }

  /**
   * Derives combat stats from the 7 attributes
   */
  getDerivedStats() {
    const attrs = this.getAttributes();

    const maxHealth = 150 + (attrs.vigor * 6);
    const maxMana = 100 + (attrs.intellect * 5);
    const spellPowerMultiplier = 1.0 + (attrs.arcana * 0.015);
    const healingMultiplier = 1.0 + (attrs.wisdom * 0.02);
    const cdr = Math.min(0.40, attrs.haste * 0.005);
    const moveSpeed = 6.0 + (attrs.haste * 0.035);
    const damageMitigation = Math.min(0.55, attrs.resilience * 0.0055);
    const critChance = Math.min(0.50, 0.05 + attrs.intellect * 0.004);

    return {
      attributes: attrs,
      maxHealth,
      maxMana,
      spellPowerMultiplier,
      healingMultiplier,
      cdr,
      moveSpeed,
      damageMitigation,
      critChance
    };
  }

  /**
   * Equips an item from the bag into its designated slot
   */
  equipItem(bagIndex) {
    const item = this.bag[bagIndex];
    if (!item) return false;

    if (item.type === 'consumable') {
      return this.useConsumable(bagIndex);
    }

    const slot = item.type;
    const previous = this.equipment[slot];
    this.equipment[slot] = item;
    this.bag[bagIndex] = previous;
    return true;
  }

  /**
   * Unequips an equipped item back into bag
   */
  unequipItem(slot) {
    const item = this.equipment[slot];
    if (!item) return false;

    // Find first empty bag slot
    const emptyIndex = this.bag.findIndex(s => s === null);
    if (emptyIndex === -1) return false; // Bag is full

    this.bag[emptyIndex] = item;
    this.equipment[slot] = null;
    return true;
  }

  useConsumable(bagIndex) {
    const item = this.bag[bagIndex];
    if (!item || item.type !== 'consumable') return null;

    this.bag[bagIndex] = null; // consume item
    return item.effect;
  }

  addItemToBag(item) {
    const emptyIdx = this.bag.findIndex(s => s === null);
    if (emptyIdx !== -1) {
      this.bag[emptyIdx] = item;
      return true;
    }
    return false; // Bag full
  }

  /**
   * Spawns an in-world 3D dropped loot item with rarity light beam and orbiting relic astrolabe
   */
  spawnWorldDrop(pos, item) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.position.y = 0.5;

    const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

    // High-Detail Item-Specific 3D Mesh (Staff, Tome, Shield, Crown, Cuirass, Potion)
    const lootMesh = ModelFactory.createLootDropMesh(item, rarity.color);
    group.add(lootMesh);

    // Ground Summoning Decal Ring
    const decalGeo = new THREE.RingGeometry(0.3, 0.7, 16);
    const decalMat = new THREE.MeshBasicMaterial({
      color: rarity.color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const decal = new THREE.Mesh(decalGeo, decalMat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.y = -0.45;
    group.add(decal);

    // Vertical Celestial Light Column
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.35, 14, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: rarity.color,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 7;
    group.add(beam);

    // Dynamic PointLight
    const light = new THREE.PointLight(rarity.color, 2.4, 8);
    light.position.y = 0.2;
    group.add(light);

    this.scene.add(group);

    const drop = {
      group,
      mesh,
      ring1,
      ring2,
      decal,
      item,
      pos: group.position,
      radius: 2.2
    };

    this.worldDrops.push(drop);
    return drop;
  }

  updateWorldDrops(playerPos, deltaTime) {
    for (let i = this.worldDrops.length - 1; i >= 0; i--) {
      const drop = this.worldDrops[i];

      // Animate spin, ring orbits & bob
      drop.mesh.rotation.y += deltaTime * 2.5;
      drop.mesh.rotation.x += deltaTime * 1.2;
      drop.mesh.position.y = Math.sin(performance.now() * 0.005) * 0.15;

      if (drop.ring1) {
        drop.ring1.rotation.z += deltaTime * 3.2;
        drop.ring1.rotation.y += deltaTime * 1.5;
      }
      if (drop.ring2) {
        drop.ring2.rotation.x -= deltaTime * 2.8;
        drop.ring2.rotation.z += deltaTime * 1.8;
      }
      if (drop.decal) {
        drop.decal.rotation.z += deltaTime * 1.0;
      }

      // Check distance for pickup
      const dist = drop.pos.distanceTo(playerPos);
      if (dist <= drop.radius) {
        if (this.addItemToBag(drop.item)) {
          this.scene.remove(drop.group);
          this.worldDrops.splice(i, 1);
          return drop.item; // Picked up!
        }
      }
    }
    return null;
  }
}
