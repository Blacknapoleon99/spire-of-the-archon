import { ITEMS } from './itemDatabase.js';

export const LOOT_TABLES = {
  sentinel: [
    { weight: 60, drop: 'nothing' },
    { weight: 25, drop: 'random_common' },
    { weight: 12, drop: 'random_rare' },
    { weight: 3, drop: 'healing_potion' }
  ],
  golem: [
    { weight: 40, drop: 'nothing' },
    { weight: 30, drop: 'random_rare' },
    { weight: 20, drop: 'random_epic' },
    { weight: 10, drop: 'mana_potion' }
  ],
  boss: [
    { weight: 50, drop: 'random_epic' },
    { weight: 40, drop: 'random_legendary' },
    { weight: 10, drop: 'legendary_plus' }
  ],
  chest: [
    { weight: 100, drop: 'chest_guaranteed' }
  ]
};

function getRandomItemByRarity(rarity) {
  const itemsOfRarity = Object.values(ITEMS).filter(item => item.rarity === rarity && item.type !== 'consumable');
  if (itemsOfRarity.length === 0) return null;
  return itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
}

function getRandomConsumable() {
  const consumables = Object.values(ITEMS).filter(item => item.type === 'consumable');
  if (consumables.length === 0) return null;
  return consumables[Math.floor(Math.random() * consumables.length)];
}

export function rollLoot(enemyType) {
  const table = LOOT_TABLES[enemyType];
  if (!table) return null;

  const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  
  let selectedDrop = null;
  for (const entry of table) {
    if (roll < entry.weight) {
      selectedDrop = entry.drop;
      break;
    }
    roll -= entry.weight;
  }
  
  if (!selectedDrop || selectedDrop === 'nothing') return null;
  
  if (selectedDrop === 'healing_potion') return [ITEMS.healing_potion];
  if (selectedDrop === 'mana_potion') return [ITEMS.mana_potion];
  if (selectedDrop === 'random_common') return [getRandomItemByRarity('common')].filter(Boolean);
  if (selectedDrop === 'random_rare') return [getRandomItemByRarity('rare')].filter(Boolean);
  if (selectedDrop === 'random_epic') return [getRandomItemByRarity('epic')].filter(Boolean);
  if (selectedDrop === 'random_legendary') return [getRandomItemByRarity('legendary')].filter(Boolean);
  
  if (selectedDrop === 'legendary_plus') {
    return [getRandomItemByRarity('legendary'), ITEMS.singularity_ring].filter(Boolean);
  }
  
  if (selectedDrop === 'chest_guaranteed') {
    return [getRandomItemByRarity('rare'), getRandomConsumable()].filter(Boolean);
  }
  
  return null;
}
