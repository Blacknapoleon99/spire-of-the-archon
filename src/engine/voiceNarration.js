import { soundEngine } from './audio.js';

/**
 * Voiced NPC Dialogue & Quest Narration Engine.
 * Supports:
 * 1. Web Speech API synthesis (Zero dependencies, offline-ready, pitch/rate modulated per NPC character).
 * 2. ElevenLabs API Integration (Fetches studio voice audio when an API key is provided).
 * 3. In-game dynamic dialogue subtitles with animated typing and speaker portraits.
 */

export const NPC_PROFILES = {
  alistair: {
    id: 'alistair',
    name: 'Grand Scribe Alistair',
    title: 'Guardian of the Archives',
    avatar: '🧙‍♂️',
    color: '#00e5ff',
    pitch: 0.85,
    rate: 0.92,
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam / Wise elder
  },
  ignatius: {
    id: 'ignatius',
    name: 'Alchemist Ignatius',
    title: 'Forge Master of the Crucible',
    avatar: '⚒️',
    color: '#ff9800',
    pitch: 1.12,
    rate: 1.05,
    elevenLabsVoiceId: 'ErXwobaYiN019PkySvjV', // Antoni / Energetic craftsman
  },
  valerius: {
    id: 'valerius',
    name: 'Archon Valerius',
    title: 'The Fractured Chronomancer',
    avatar: '⏳',
    color: '#bf5af2',
    pitch: 0.65,
    rate: 0.82,
    elevenLabsVoiceId: 'VR6AewLTigWG4xSOukaG', // Arnold / Ominous tyrant
  },
  lyra: {
    id: 'lyra',
    name: 'Bibliomancer Lyra',
    title: 'Keeper of Forbidden Tomes',
    avatar: '📖',
    color: '#ffd700',
    pitch: 1.25,
    rate: 0.95,
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel / Mysterious scholar
  },
  pytheas: {
    id: 'pytheas',
    name: 'Elemental Sage Pytheas',
    title: 'Master of the Four Harmonies',
    avatar: '🌟',
    color: '#4caf50',
    pitch: 0.92,
    rate: 0.96,
    elevenLabsVoiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh / Resonant teacher
  },
  malakor: {
    id: 'malakor',
    name: 'Malakor the Shackle-Breaker',
    title: 'Escaped Convict & Contraband Smuggler',
    avatar: '⛓️',
    color: '#ff9800',
    pitch: 0.88,
    rate: 0.95,
    elevenLabsVoiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum / Husky rogue
  }
};

export const DIALOGUE_LINES = {
  // Floor 1 Main Quest lines
  'alistair_act1_intro': {
    npc: 'alistair',
    text: "Apprentice wizards, hear my plea! Archon Valerius has locked the Spire in a fractured temporal loop. Brute force cannot shatter the seals. You must rotate the three Astrolabe Prisms until their celestial beams focus upon the northern gate seal!"
  },
  'alistair_prism_aligned': {
    npc: 'alistair',
    text: "The celestial light connects! The northern gate seal fractures! Press forward, apprentices!"
  },
  'alistair_quiz_prompt': {
    npc: 'alistair',
    text: "Before you lies the Riddle Monolith of Aethelgard. Confer with your covenant and choose wisely!"
  },
  'alistair_quiz_correct': {
    npc: 'alistair',
    text: "Splendid! Wisdom is the sharpest blade in this tower. Take your reward!"
  },
  'alistair_act1_complete': {
    npc: 'alistair',
    text: "The gateway unseals! Ascend through the portal to the Alchemical Crucible!"
  },

  // Floor 2 Main Quest lines
  'ignatius_act2_intro': {
    npc: 'ignatius',
    text: "Hah! Fresh blood from the archives! I am Ignatius, master of the Crucible! The gate ahead requires pure elemental transmutation! You must ignite the three cauldrons: Fire, Frost, and Lightning in harmonic sequence!"
  },
  'ignatius_crucible_charge': {
    npc: 'ignatius',
    text: "The elemental conduits surge with raw power! Keep the flame burning!"
  },
  'ignatius_crucible_reset': {
    npc: 'ignatius',
    text: "Blast it! That's the wrong sequence! The conduits have purged! Start over with Fire!"
  },
  'ignatius_act2_complete': {
    npc: 'ignatius',
    text: "By the forge, you did it! The pathway to the Archon's Observatory is open! Make that tyrant pay!"
  },

  // Floor 3 Boss lines
  'valerius_encounter': {
    npc: 'valerius',
    text: "You dare challenge eternity itself? I am Valerius, master of the chronometer! The Spire is my eternal monument, and you shall wander its halls forever!"
  },
  'valerius_keystone_down': {
    npc: 'valerius',
    text: "Impertinent insects! What have you done to my astral keystones?!"
  },
  'valerius_shield_down': {
    npc: 'valerius',
    text: "My temporal shield! It matters not—time itself will erase you from existence!"
  },
  'valerius_phase2': {
    npc: 'valerius',
    text: "Behold the ticking of the void! Faster, slower, your heartbeat belongs to me!"
  },
  'valerius_defeat': {
    npc: 'valerius',
    text: "No... impossible... the continuum... unravels... the Spire... is yours..."
  },

  // Side Quests
  'lyra_sidequest_intro': {
    npc: 'lyra',
    text: "Lost apprentice, seek out the three Chrono Tomes hidden within the archways. Great power awaits those who recover the academy's lost knowledge."
  },
  'lyra_sidequest_complete': {
    npc: 'lyra',
    text: "You have recovered all three tomes! Accept these Bracers of Arcane Acceleration!"
  },
  'pytheas_sidequest_intro': {
    npc: 'pytheas',
    text: "Show me you are a true master of the elements. Channel all four disciplines: Fire, Frost, Light, and Chrono!"
  },
  'pytheas_sidequest_complete': {
    npc: 'pytheas',
    text: "All four harmonies resonate within you! Your mastery is undeniable!"
  },

  // Escaped Convict & Contraband Smuggler
  'malakor_greeting': {
    npc: 'malakor',
    text: "Shh! Keep your voice down, wizard... The Archon's sentinels have ears in the cold stone. Looking for contraband the sentinels missed?"
  },
  'malakor_purchase': {
    npc: 'malakor',
    text: "A fine choice. Put it to good use and break the Archon's tyranny."
  },
  'malakor_lore': {
    npc: 'malakor',
    text: "I was once the chief warden down in the penitentiary vaults. When I saw what Valerius was doing to the prisoners—siphoning their souls into the Temporal Orrery—I smashed my shackles and hid here in the dark."
  }
};

export class VoiceNarrationEngine {
  constructor() {
    this.apiKey = localStorage.getItem('spire_elevenlabs_key') || '';
    this.audioCache = new Map();
    this.currentAudio = null;
    this.isSpeaking = false;
    this.dialogueBox = null;
    this.typewriterInterval = null;
    this.volume = 1.0;
    this.spokenDialogueKeys = new Set();

    this.createDialogueUI();
  }

  setVolume(vol) {
    this.volume = (typeof vol === 'number' && !isNaN(vol)) ? Math.max(0, Math.min(1, vol)) : 1.0;
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
    if (this.apiKey) {
      localStorage.setItem('spire_elevenlabs_key', this.apiKey);
    } else {
      localStorage.removeItem('spire_elevenlabs_key');
    }
  }

  createDialogueUI() {
    this.dialogueBox = document.createElement('div');
    this.dialogueBox.id = 'voiced-dialogue-overlay';
    this.dialogueBox.className = 'voiced-dialogue-overlay hidden';
    this.dialogueBox.innerHTML = `
      <div class="voiced-dialogue-card">
        <div class="voiced-speaker-avatar" id="dialogue-avatar">🧙‍♂️</div>
        <div class="voiced-speaker-content">
          <div class="voiced-speaker-header">
            <span class="voiced-speaker-name" id="dialogue-name">Grand Scribe Alistair</span>
            <span class="voiced-speaker-title" id="dialogue-title">Guardian of the Archives</span>
            <span class="voiced-audio-wave">🔊 Voiced</span>
            <button id="btn-replay-dialogue" class="voiced-replay-btn" title="Replay Speech">🔁 Replay</button>
          </div>
          <p class="voiced-subtitle-text" id="dialogue-text"></p>
        </div>
      </div>
    `;
    document.body.appendChild(this.dialogueBox);

    document.getElementById('btn-replay-dialogue')?.addEventListener('click', () => {
      if (this.lastSpokenKey) {
        this.speak(this.lastSpokenKey, null, null, true);
      }
    });
  }

  /**
   * Speak a dialogue line by key or custom text.
   * Plays each line exactly once unless forceRepeat is true.
   */
  async speak(dialogueKey, customNpc = null, customText = null, forceRepeat = false) {
    if (!forceRepeat && dialogueKey && this.spokenDialogueKeys?.has(dialogueKey)) {
      // Line already spoken once — do not annoy player with repetition unless requested
      return;
    }

    if (dialogueKey) {
      if (!this.spokenDialogueKeys) this.spokenDialogueKeys = new Set();
      this.spokenDialogueKeys.add(dialogueKey);
      this.lastSpokenKey = dialogueKey;
    }

    const entry = DIALOGUE_LINES[dialogueKey];
    const npcId = customNpc || (entry ? entry.npc : 'alistair');
    const text = customText || (entry ? entry.text : dialogueKey);
    const npc = NPC_PROFILES[npcId] || NPC_PROFILES.alistair;

    this.showDialogueSubtitle(npc, text);

    // Stop previous voice playback
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
    }

    // 1. Play Pre-generated ElevenLabs Studio Audio MP3 (Guaranteed Studio Voice)
    if (dialogueKey && (entry || dialogueKey.startsWith('alistair_') || dialogueKey.startsWith('ignatius_') || dialogueKey.startsWith('valerius_') || dialogueKey.startsWith('malakor_') || dialogueKey.startsWith('lyra_') || dialogueKey.startsWith('pytheas_'))) {
      const audioUrl = `/audio/voices/${dialogueKey}.mp3`;
      try {
        const audio = new Audio(audioUrl);
        const safeVol = (typeof this.volume === 'number' && !isNaN(this.volume)) ? Math.max(0, Math.min(1, this.volume)) : 1.0;
        audio.volume = safeVol;
        this.currentAudio = audio;
        audio.play().then(() => {
          console.log(`[VoiceEngine] 🎙️ Playing ElevenLabs studio voice: ${dialogueKey}`);
        }).catch((err) => {
          console.warn(`[VoiceEngine] Audio playback note for ${audioUrl}:`, err);
        });
        return; // Always use studio file, NEVER fallback to robotic browser TTS!
      } catch (e) {
        console.warn(`[VoiceEngine] Studio audio init error:`, e);
      }
    }

    // 2. Try live ElevenLabs API if custom text and key present
    if (this.apiKey) {
      const played = await this.playElevenLabsTTS(npc, text);
      if (played) return;
    }

    // 3. Fallback to Web Speech API only for uncached runtime dynamic text
    this.playWebSpeechTTS(npc, text);
  }

  showDialogueSubtitle(npc, fullText) {
    if (!this.dialogueBox) return;
    this.dialogueBox.classList.remove('hidden');

    const avatarEl = document.getElementById('dialogue-avatar');
    const nameEl = document.getElementById('dialogue-name');
    const titleEl = document.getElementById('dialogue-title');
    const textEl = document.getElementById('dialogue-text');

    if (avatarEl) avatarEl.textContent = npc.avatar;
    if (nameEl) {
      nameEl.textContent = npc.name;
      nameEl.style.color = npc.color;
    }
    if (titleEl) titleEl.textContent = npc.title;

    // Typewriter effect
    if (this.typewriterInterval) clearInterval(this.typewriterInterval);
    if (textEl) {
      textEl.textContent = '';
      let charIdx = 0;
      this.typewriterInterval = setInterval(() => {
        charIdx += 2;
        if (charIdx >= fullText.length) {
          textEl.textContent = fullText;
          clearInterval(this.typewriterInterval);
        } else {
          textEl.textContent = fullText.substring(0, charIdx);
        }
      }, 25);
    }

    // Auto-hide subtitle after duration proportional to text length
    const displayDuration = Math.max(4500, fullText.length * 75);
    clearTimeout(this._hideTimeout);
    this._hideTimeout = setTimeout(() => {
      this.dialogueBox.classList.add('hidden');
    }, displayDuration);
  }

  /**
   * Intelligently selects the highest-fidelity natural/neural voice available
   */
  selectBestVoice(npc) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    if (npc.id === 'alistair') {
      const pref = voices.find(v => (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')) && (v.lang.includes('GB') || v.name.includes('UK') || v.name.includes('George') || v.name.includes('Ryan')));
      if (pref) return pref;
      const ukMale = voices.find(v => v.lang.includes('GB') && (v.name.includes('Male') || v.name.includes('George') || v.name.includes('Daniel') || v.name.includes('Oliver')));
      if (ukMale) return ukMale;
    } else if (npc.id === 'valerius') {
      const deepMale = voices.find(v => (v.name.includes('Natural') || v.name.includes('Neural')) && (v.name.includes('Guy') || v.name.includes('David') || v.name.includes('Mark')));
      if (deepMale) return deepMale;
    } else if (npc.id === 'lyra') {
      const female = voices.find(v => (v.name.includes('Natural') || v.name.includes('Neural')) && (v.name.includes('Sonia') || v.name.includes('Jenny') || v.name.includes('Zira')));
      if (female) return female;
    }

    const natural = voices.find(v => (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')) && v.lang.startsWith('en'));
    if (natural) return natural;

    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  /**
   * Synthesizes an ambient arcane resonance chord behind the speaker
   */
  playArcaneResonance(npc) {
    if (!soundEngine.ctx || soundEngine.isMuted) return;
    soundEngine.ensureContext();
    const ctx = soundEngine.ctx;

    if (npc.id === 'alistair') {
      [523.25, 783.99, 1046.50].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(soundEngine.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      });
    } else if (npc.id === 'valerius') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 1.8);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      osc.connect(gain);
      gain.connect(soundEngine.sfxGain);
      osc.start();
      osc.stop(ctx.currentTime + 1.8);
    } else if (npc.id === 'ignatius') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(soundEngine.sfxGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    }
  }

  /**
   * Browser-native Web Speech API TTS with Natural Voices & Arcane Resonance
   */
  playWebSpeechTTS(npc, text) {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = npc.pitch || 1.0;
    utterance.rate = npc.rate || 1.0;

    const chosenVoice = this.selectBestVoice(npc);
    if (chosenVoice) utterance.voice = chosenVoice;

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };

    this.playArcaneResonance(npc);
    window.speechSynthesis.speak(utterance);
  }

  /**
   * ElevenLabs API Voice Generation & Streamer
   */
  async playElevenLabsTTS(npc, text) {
    const cacheKey = `${npc.id}_${text}`;
    if (this.audioCache.has(cacheKey)) {
      const audioUrl = this.audioCache.get(cacheKey);
      this.playAudioBlobUrl(audioUrl);
      return true;
    }

    try {
      const voiceId = npc.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB';
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8
          }
        })
      });

      if (!response.ok) {
        console.warn('[ElevenLabs] API response error:', response.status, response.statusText);
        return false;
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      this.audioCache.set(cacheKey, audioUrl);
      this.playAudioBlobUrl(audioUrl);
      return true;
    } catch (err) {
      console.warn('[ElevenLabs] TTS generation failed, falling back to Web Speech:', err);
      return false;
    }
  }

  playAudioBlobUrl(url) {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    this.currentAudio = new Audio(url);
    this.currentAudio.play();
  }

  stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (this.dialogueBox) {
      this.dialogueBox.classList.add('hidden');
    }
  }
}

export const voiceEngine = new VoiceNarrationEngine();
