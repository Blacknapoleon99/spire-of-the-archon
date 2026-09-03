export class ProgressionSystem {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.freeAttributePoints = 0;
    this.talentPoints = 0;
    this.skillPoints = 0;
  }
  
  getXPToNextLevel() {
    return Math.floor(100 * Math.pow(this.level, 1.5));
  }

  addXP(amount) {
    if (this.level >= 15) return { leveledUp: false, newLevel: this.level, rewards: {} };
    
    this.xp += amount;
    let leveledUp = false;
    let rewards = { freeAttributePoints: 0, talentPoints: 0, skillPoints: 0 };
    
    while (this.level < 15 && this.xp >= this.getXPToNextLevel()) {
      this.xp -= this.getXPToNextLevel();
      this.level++;
      leveledUp = true;
      
      this.freeAttributePoints += 3;
      this.talentPoints += 1;
      this.skillPoints += 1;
      
      rewards.freeAttributePoints += 3;
      rewards.talentPoints += 1;
      rewards.skillPoints += 1;
    }
    
    if (this.level >= 15) {
      this.xp = 0;
    }
    
    return { leveledUp, newLevel: this.level, rewards };
  }
  
  getProgress() {
    if (this.level >= 15) return 1;
    return this.xp / this.getXPToNextLevel();
  }
}

export const XP_SOURCES = {
  ENEMY_KILL: 40,
  BOSS_KILL: 500,
  QUIZ_CORRECT: 50,
  PUZZLE_SOLVED: 40,
  FLOOR_CLEARED: 100
};
