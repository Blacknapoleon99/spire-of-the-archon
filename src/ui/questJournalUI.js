import { soundEngine } from '../engine/audio.js';
import { voiceEngine } from '../engine/voiceNarration.js';
import { QUEST_ACTS } from '../systems/questSystem.js';
import { storyLoreManager } from '../systems/storyLore.js';

export class QuestJournalUI {
  constructor(questManager) {
    this.questManager = questManager;
    this.isVisible = false;
    this.selectedQuestId = null;
    
    this.sideQuests = [
      { 
        id: 'sq1', 
        title: "Bibliomancer's Bounty", 
        desc: "Find 3 hidden tomes scattered across Floor 1.", 
        objectives: [{text: "Find hidden tomes (0/3)", completed: false}], 
        rewards: [{type: 'item', value: 'Bracers of Arcane Acceleration', label: 'Bracers of Arcane Acceleration'}, {type: 'xp', value: 50, label: '50 XP'}] 
      },
      { 
        id: 'sq2', 
        title: "Elemental Mastery", 
        desc: "Cast each element (Fire, Frost, Light, Chrono) at least once.", 
        objectives: [{text: "Cast all elements", completed: false}], 
        rewards: [{type: 'stat', value: '+2 Mastery', label: '+2 Mastery'}, {type: 'xp', value: 40, label: '40 XP'}] 
      },
      { 
        id: 'sq3', 
        title: "No Wizard Left Behind", 
        desc: "Complete Floor 2 with all party members alive.", 
        objectives: [{text: "Complete Floor 2 without casualties", completed: false}], 
        rewards: [{type: 'item', value: 'Elixir of Vitality x3', label: 'Elixir of Vitality x3'}, {type: 'xp', value: 60, label: '60 XP'}] 
      },
      {
        id: 'malakor_quest_cores',
        title: "The Shackle-Breaker's Retribution",
        desc: "Retrieve 3 Volatile Crucible Cores from Floor 2 crucibles. Malakor will purge their containment and forge the Legendary Chrono-Breaker's Band.",
        objectives: [{text: "Collect Volatile Crucible Cores from Floor 2 (0/3)", completed: false}],
        rewards: [
          {type: 'item', value: "Chrono-Breaker's Band", label: "Chrono-Breaker's Band (Legendary)" },
          {type: 'gold', value: 200, label: "200 Gold" },
          {type: 'xp', value: 150, label: "150 XP" }
        ]
      }
    ];

    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    this.container = document.createElement('div');
    this.container.id = 'quest-journal-modal';
    this.container.style.cssText = `
      display: none;
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 1000;
      color: #e0d0b0;
      font-family: 'Courier New', Courier, monospace;
      padding: 5%;
      box-sizing: border-box;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
      display: flex;
      width: 100%; height: 100%;
      border: 2px solid #b89947;
      background: #1a1510;
    `;

    this.sidebar = document.createElement('div');
    this.sidebar.style.cssText = `
      width: 35%;
      border-right: 2px solid #b89947;
      padding: 20px;
      overflow-y: auto;
    `;

    this.content = document.createElement('div');
    this.content.style.cssText = `
      width: 65%;
      padding: 30px;
      position: relative;
    `;

    this.closeBtn = document.createElement('button');
    this.closeBtn.id = 'btn-close-journal';
    this.closeBtn.textContent = 'X';
    this.closeBtn.style.cssText = `
      position: absolute;
      top: 15px; right: 15px;
      background: transparent;
      color: #b89947;
      border: 1px solid #b89947;
      font-size: 20px;
      cursor: pointer;
      width: 40px; height: 40px;
    `;

    this.content.appendChild(this.closeBtn);
    inner.appendChild(this.sidebar);
    inner.appendChild(this.content);
    this.container.appendChild(inner);
    document.body.appendChild(this.container);
  }

  bindEvents() {
    this.closeBtn.addEventListener('click', () => this.toggle(false));
    
    document.addEventListener('keydown', (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key && e.key.toLowerCase() === 'j') {
        this.toggle();
      }
    });
  }

  toggle(force = null) {
    this.isVisible = force !== null ? force : !this.isVisible;
    if (this.isVisible) {
      this.container.style.display = 'block';
      soundEngine.playMenuOpen();
      this.render();
    } else {
      this.container.style.display = 'none';
      soundEngine.playMenuClose();
    }
  }

  render() {
    this.sidebar.innerHTML = '<h2 style="color: #f0e6d2; margin-top: 0;">Quest Log</h2>';
    
    // Render Main Quests
    const mainSection = document.createElement('div');
    mainSection.innerHTML = '<h3 style="color: #c4a962; border-bottom: 1px solid #c4a962;">Main Quests</h3>';
    
    let currentActIndex = this.questManager.currentActIndex;
    let currentStepIndex = this.questManager.currentStepIndex;

    QUEST_ACTS.forEach((act, aIdx) => {
      act.steps.forEach((step, sIdx) => {
        // Only show up to current step
        if (aIdx > currentActIndex || (aIdx === currentActIndex && sIdx > currentStepIndex)) return;
        
        const isCompleted = aIdx < currentActIndex || (aIdx === currentActIndex && sIdx < currentStepIndex);
        
        const qItem = document.createElement('div');
        qItem.style.cssText = `
          padding: 10px; cursor: pointer; margin-bottom: 5px;
          background: ${this.selectedQuestId === step.id ? '#2a2218' : 'transparent'};
          border-left: 3px solid ${this.selectedQuestId === step.id ? '#c4a962' : 'transparent'};
        `;
        qItem.innerHTML = `<span>${isCompleted ? '☑' : '☐'}</span> ${step.title}`;
        qItem.onclick = () => this.selectQuest(step.id);
        mainSection.appendChild(qItem);

        // Auto-select current active quest if none selected
        if (!this.selectedQuestId && !isCompleted && aIdx === currentActIndex && sIdx === currentStepIndex) {
          this.selectedQuestId = step.id;
        }
      });
    });

    // Sync Malakor quest state
    const mq = this.sideQuests.find(q => q.id === 'malakor_quest_cores');
    if (mq) {
      const qState = storyLoreManager.questState;
      mq.objectives[0].completed = qState.completed;
      mq.objectives[0].text = qState.completed 
        ? "Volatile Crucible Cores Purged (3/3) - Reward Claimed"
        : `Collect Volatile Crucible Cores from Floor 2 (${qState.coresCollected}/3)`;
    }

    // Render Side Quests
    const sideSection = document.createElement('div');
    sideSection.innerHTML = '<h3 style="color: #c4a962; border-bottom: 1px solid #c4a962; margin-top: 20px;">Side Quests</h3>';
    
    this.sideQuests.forEach(sq => {
      const allCompleted = sq.objectives.every(o => o.completed);
      const qItem = document.createElement('div');
      qItem.style.cssText = `
        padding: 10px; cursor: pointer; margin-bottom: 5px;
        background: ${this.selectedQuestId === sq.id ? '#2a2218' : 'transparent'};
        border-left: 3px solid ${this.selectedQuestId === sq.id ? '#c4a962' : 'transparent'};
      `;
      qItem.innerHTML = `<span>${allCompleted ? '☑' : '☐'}</span> ${sq.title}`;
      qItem.onclick = () => this.selectQuest(sq.id);
      sideSection.appendChild(qItem);
    });

    this.sidebar.appendChild(mainSection);
    this.sidebar.appendChild(sideSection);

    this.renderSelected();
  }

  selectQuest(questId) {
    this.selectedQuestId = questId;
    this.render(); // Re-render to update sidebar highlights and details
  }

  renderSelected() {
    // Clear content but keep close button
    Array.from(this.content.childNodes).forEach(node => {
      if (node !== this.closeBtn) this.content.removeChild(node);
    });

    if (!this.selectedQuestId) return;

    // Find quest
    let quest = null;
    let isMain = false;
    for (const act of QUEST_ACTS) {
      const step = act.steps.find(s => s.id === this.selectedQuestId);
      if (step) { quest = step; isMain = true; break; }
    }
    if (!quest) {
      quest = this.sideQuests.find(sq => sq.id === this.selectedQuestId);
    }

    if (!quest) return;

    const details = document.createElement('div');
    
    let objectivesHTML = '';
    if (isMain) {
      // Find completion status
      let currentActIndex = this.questManager.currentActIndex;
      let currentStepIndex = this.questManager.currentStepIndex;
      let isCompleted = false;
      QUEST_ACTS.forEach((act, aIdx) => {
        act.steps.forEach((step, sIdx) => {
          if (step.id === quest.id) {
            isCompleted = aIdx < currentActIndex || (aIdx === currentActIndex && sIdx < currentStepIndex);
          }
        });
      });
      objectivesHTML = `<div style="margin: 10px 0;">${isCompleted ? '☑' : '☐'} ${quest.desc}</div>`;
    } else {
      objectivesHTML = quest.objectives.map(o => `<div style="margin: 10px 0;">${o.completed ? '☑' : '☐'} ${o.text}</div>`).join('');
    }

    let rewardsHTML = '';
    if (!isMain && quest.rewards) {
      rewardsHTML = `
        <div style="margin-top: 30px; border-top: 1px solid #4a3c26; padding-top: 20px;">
          <h4 style="color: #c4a962; margin-top: 0;">Rewards</h4>
          <ul>
            ${quest.rewards.map(r => `<li>${r.label}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    details.innerHTML = `
      <h1 style="color: #f0e6d2; margin-top: 0;">${quest.title}</h1>
      <p style="color: #a09080; font-size: 1.1em; line-height: 1.5;">
        ${isMain ? quest.desc : quest.desc}
      </p>
      
      <button id="btn-replay-quest-voice" style="margin: 12px 0; background: rgba(196,169,98,0.2); border: 1px solid #c4a962; color: #ffd700; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold;">
        🔊 Replay Voice Briefing
      </button>

      <div style="margin-top: 20px;">
        <h4 style="color: #c4a962; border-bottom: 1px solid #4a3c26; padding-bottom: 5px;">Objectives</h4>
        ${objectivesHTML}
      </div>
      
      ${rewardsHTML}
    `;

    details.querySelector('#btn-replay-quest-voice')?.addEventListener('click', () => {
      const actIdx = this.questManager.currentActIndex;
      const vKey = actIdx === 0 ? 'alistair_act1_intro' : actIdx === 1 ? 'ignatius_act2_intro' : 'valerius_boss_intro';
      voiceEngine.speak(vKey, null, null, true);
    });

    this.content.appendChild(details);
  }
}
