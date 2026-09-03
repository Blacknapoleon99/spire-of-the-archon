export class TutorialSystem {
  constructor() {
    this.completedTips = JSON.parse(localStorage.getItem('spire_completed_tips') || '{}');
    this.activeTipId = null;
    this.tipTimer = 0;
    this.tipElement = null;
    
    // Metrics to track for triggering tips
    this.stats = {
      enemiesSpawned: 0,
      basicAttacks: 0,
      interactablesNear: 0,
      lootPickups: 0,
      skillPointsEarned: 0,
      timePlayed: 0
    };

    this.tips = {
      movement: "Click to lock your mouse. Move with W, A, S, D.",
      combat: "Press LMB to cast your basic spell at enemies.",
      abilities: "Press Q for your first ability. Watch your mana!",
      interact: "Press F near glowing objects to interact.",
      inventory: "Press I to open your inventory and equip gear.",
      grimoire: "Press K to open your Spell Grimoire.",
      journal: "Press J to open your Quest Journal."
    };

    this.createDOM();
  }

  createDOM() {
    this.tipElement = document.createElement('div');
    this.tipElement.className = 'tutorial-tip';
    this.tipElement.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10, 10, 10, 0.85);
      border: 2px solid #b89947;
      color: white;
      padding: 15px 40px 15px 20px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 16px;
      border-radius: 4px;
      pointer-events: auto;
      z-index: 2000;
      display: none;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    `;

    this.closeBtn = document.createElement('button');
    this.closeBtn.textContent = 'X';
    this.closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: transparent;
      border: none;
      color: #b89947;
      font-size: 16px;
      cursor: pointer;
      font-weight: bold;
    `;
    this.closeBtn.onclick = () => this.dismissTip();

    this.textElement = document.createElement('span');
    
    this.tipElement.appendChild(this.textElement);
    this.tipElement.appendChild(this.closeBtn);
    document.body.appendChild(this.tipElement);
  }

  tryShowTip(tipId) {
    if (this.completedTips[tipId] || this.activeTipId) return false;

    const text = this.tips[tipId];
    if (!text) return false;

    this.activeTipId = tipId;
    this.textElement.textContent = text;
    this.tipElement.style.display = 'block';
    
    // Trigger reflow for transition
    void this.tipElement.offsetWidth;
    this.tipElement.style.opacity = '1';
    
    this.tipTimer = 8.0; // Auto-dismiss after 8 seconds
    return true;
  }

  dismissTip() {
    if (!this.activeTipId) return;
    
    this.completedTips[this.activeTipId] = true;
    localStorage.setItem('spire_completed_tips', JSON.stringify(this.completedTips));
    
    this.tipElement.style.opacity = '0';
    setTimeout(() => {
      this.tipElement.style.display = 'none';
      this.activeTipId = null;
    }, 500); // match transition duration
  }

  update(deltaTime, gameState) {
    // Update active tip timer
    if (this.activeTipId) {
      this.tipTimer -= deltaTime;
      if (this.tipTimer <= 0) {
        this.dismissTip();
      }
    }

    // Update stats from gameState if provided
    if (gameState) {
      this.stats.timePlayed += deltaTime;
      
      if (gameState.enemiesSpawned > this.stats.enemiesSpawned) {
        this.stats.enemiesSpawned = gameState.enemiesSpawned;
      }
      if (gameState.basicAttacks > this.stats.basicAttacks) {
        this.stats.basicAttacks = gameState.basicAttacks;
      }
      if (gameState.interactablesNear > this.stats.interactablesNear) {
        this.stats.interactablesNear = gameState.interactablesNear;
      }
      if (gameState.lootPickups > this.stats.lootPickups) {
        this.stats.lootPickups = gameState.lootPickups;
      }
      if (gameState.skillPointsEarned > this.stats.skillPointsEarned) {
        this.stats.skillPointsEarned = gameState.skillPointsEarned;
      }
    } else {
      // Just track time internally if no gameState passed
      this.stats.timePlayed += deltaTime;
    }

    // Check conditions
    this.tryShowTip('movement'); // Will trigger immediately since conditions are met
    
    if (this.stats.enemiesSpawned > 0) {
      this.tryShowTip('combat');
    }
    if (this.stats.basicAttacks >= 3) {
      this.tryShowTip('abilities');
    }
    if (this.stats.interactablesNear > 0) {
      this.tryShowTip('interact');
    }
    if (this.stats.lootPickups > 0) {
      this.tryShowTip('inventory');
    }
    if (this.stats.skillPointsEarned > 0) {
      this.tryShowTip('grimoire');
    }
    if (this.stats.timePlayed >= 30) {
      this.tryShowTip('journal');
    }
  }
}
