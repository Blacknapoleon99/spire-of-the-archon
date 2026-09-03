const fs = require('fs');
const https = require('https');
const path = require('path');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ERROR: ELEVENLABS_API_KEY environment variable is not set!');
  process.exit(1);
}

const VOICES_DIR = path.join(__dirname, '../public/audio/voices');
const SFX_DIR = path.join(__dirname, '../public/audio/sfx');

if (!fs.existsSync(VOICES_DIR)) fs.mkdirSync(VOICES_DIR, { recursive: true });
if (!fs.existsSync(SFX_DIR)) fs.mkdirSync(SFX_DIR, { recursive: true });

// Voice character assignment
const CHARACTER_VOICES = {
  alistair: 'JBFqnCBsd6RMkjVDRZzb', // George - British Male Storyteller
  ignatius: 'N2lVS1w4EtoT3dr4eOWO', // Callum - Husky Trickster Craftsman
  valerius: 'SOYHLrjzK2X1ezoPC6cr', // Harry - Fierce Warrior Tyrant
  lyra: 'Xb7hH8MSUJpSbSDYk0k2',     // Alice - Clear Engaging British Female Scholar
  pytheas: 'CwhRBWXzGAHq8TQ4Fs17'   // Roger - Resonant Male Sage
};

// All Game Dialogue Lines
const DIALOGUE_LINES = [
  // Floor 1 Main Quest
  {
    id: 'alistair_act1_intro',
    char: 'alistair',
    text: "Apprentice wizards, hear my plea! Archon Valerius has locked the Spire in a fractured temporal loop. Brute force cannot shatter the seals. You must rotate the three Astrolabe Prisms until their celestial beams focus upon the northern gate seal!"
  },
  {
    id: 'alistair_prism_aligned',
    char: 'alistair',
    text: "The celestial light connects! The northern gate seal fractures! Press forward, apprentices!"
  },
  {
    id: 'alistair_quiz_prompt',
    char: 'alistair',
    text: "Before you lies the Riddle Monolith of Aethelgard. Confer with your covenant and choose wisely!"
  },
  {
    id: 'alistair_quiz_correct',
    char: 'alistair',
    text: "Splendid! Wisdom is the sharpest blade in this tower. Take your reward!"
  },
  {
    id: 'alistair_act1_complete',
    char: 'alistair',
    text: "The gateway unseals! Ascend through the portal to the Alchemical Crucible!"
  },

  // Floor 2 Main Quest
  {
    id: 'ignatius_act2_intro',
    char: 'ignatius',
    text: "Hah! Fresh blood from the archives! I am Ignatius, master of the Crucible! The gate ahead requires pure elemental transmutation! You must ignite the three cauldrons: Fire, Frost, and Lightning in harmonic sequence!"
  },
  {
    id: 'ignatius_crucible_charge',
    char: 'ignatius',
    text: "The elemental conduits surge with raw power! Keep the flame burning!"
  },
  {
    id: 'ignatius_crucible_reset',
    char: 'ignatius',
    text: "Blast it! That's the wrong sequence! The conduits have purged! Start over with Fire!"
  },
  {
    id: 'ignatius_act2_complete',
    char: 'ignatius',
    text: "By the forge, you did it! The pathway to the Archon's Observatory is open! Make that tyrant pay!"
  },

  // Floor 3 Boss
  {
    id: 'valerius_encounter',
    char: 'valerius',
    text: "You dare challenge eternity itself? I am Valerius, master of the chronometer! The Spire is my eternal monument, and you shall wander its halls forever!"
  },
  {
    id: 'valerius_keystone_down',
    char: 'valerius',
    text: "Impertinent insects! What have you done to my astral keystones?!"
  },
  {
    id: 'valerius_shield_down',
    char: 'valerius',
    text: "My temporal shield! It matters not—time itself will erase you from existence!"
  },
  {
    id: 'valerius_phase2',
    char: 'valerius',
    text: "Behold the ticking of the void! Faster, slower, your heartbeat belongs to me!"
  },
  {
    id: 'valerius_defeat',
    char: 'valerius',
    text: "No... impossible... the continuum unravels... the Spire is yours..."
  },

  // Side Quests
  {
    id: 'lyra_sidequest_intro',
    char: 'lyra',
    text: "Lost apprentice, seek out the three Chrono Tomes hidden within the archways. Great power awaits those who recover the academy's lost knowledge."
  },
  {
    id: 'lyra_sidequest_complete',
    char: 'lyra',
    text: "You have recovered all three tomes! Accept these Bracers of Arcane Acceleration!"
  },
  {
    id: 'pytheas_sidequest_intro',
    char: 'pytheas',
    text: "Show me you are a true master of the elements. Channel all four disciplines: Fire, Frost, Light, and Chrono!"
  },
  {
    id: 'pytheas_sidequest_complete',
    char: 'pytheas',
    text: "All four harmonies resonate within you! Your mastery is undeniable!"
  }
];

// Sound Effects
const SFX_ITEMS = [
  {
    id: 'sfx_fireball',
    prompt: 'Blazing fireball projectile whooshing through the air and combusting',
    duration: 1.5
  },
  {
    id: 'sfx_flame_explosion',
    prompt: 'Massive magical fire explosion shockwave with roaring embers and sub bass rumble',
    duration: 2.2
  },
  {
    id: 'sfx_ice_lance',
    prompt: 'Sharp crystalline ice spear flying fast with frozen whistling sound',
    duration: 1.2
  },
  {
    id: 'sfx_frost_nova',
    prompt: 'Sub-zero frost blast shattering like ice crystals across stone floor',
    duration: 2.0
  },
  {
    id: 'sfx_radiant_heal',
    prompt: 'Angelic celestial sparkle chime with holy shimmer and warm resonant blessing',
    duration: 2.0
  },
  {
    id: 'sfx_divine_sanctuary',
    prompt: 'Sacred golden cathedral temple bell gong with deep divine echo',
    duration: 2.8
  },
  {
    id: 'sfx_chrono_tick',
    prompt: 'Antique mechanical pocket watch ticking with magical time distortion warp',
    duration: 1.8
  },
  {
    id: 'sfx_door_open',
    prompt: 'Heavy ancient cathedral stone portcullis grinding open with iron chains',
    duration: 2.5
  },
  {
    id: 'sfx_puzzle_solve',
    prompt: 'Triumphant magical chime revealing ancient mystical secret',
    duration: 1.8
  }
];

function generateTTS(voiceId, text, outputPath) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8
      }
    });

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      if (res.statusCode !== 200) {
        let err = '';
        res.on('data', d => err += d);
        res.on('end', () => reject(new Error(`Status ${res.statusCode}: ${err}`)));
        return;
      }
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function generateSFX(prompt, duration, outputPath) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: prompt,
      duration_seconds: duration
    });

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: '/v1/sound-generation',
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      if (res.statusCode !== 200) {
        let err = '';
        res.on('data', d => err += d);
        res.on('end', () => reject(new Error(`Status ${res.statusCode}: ${err}`)));
        return;
      }
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🔮 Generating ElevenLabs Studio Voice Lines...');

  for (let i = 0; i < DIALOGUE_LINES.length; i++) {
    const item = DIALOGUE_LINES[i];
    const voiceId = CHARACTER_VOICES[item.char];
    const outPath = path.join(VOICES_DIR, `${item.id}.mp3`);

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      console.log(`[${i + 1}/${DIALOGUE_LINES.length}] Already exists: ${item.id}.mp3`);
      continue;
    }

    try {
      console.log(`[${i + 1}/${DIALOGUE_LINES.length}] Generating (${item.char}): "${item.text.slice(0, 40)}..."`);
      await generateTTS(voiceId, item.text, outPath);
      const size = fs.statSync(outPath).size;
      console.log(`   ✓ Saved ${item.id}.mp3 (${Math.round(size / 1024)} KB)`);
      await sleep(350); // slight pause to respect rate limits
    } catch (e) {
      console.error(`   ✗ Error on ${item.id}:`, e.message);
    }
  }

  console.log('\n🔊 Generating ElevenLabs Sound Effects...');
  for (let i = 0; i < SFX_ITEMS.length; i++) {
    const sfx = SFX_ITEMS[i];
    const outPath = path.join(SFX_DIR, `${sfx.id}.mp3`);

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      console.log(`[${i + 1}/${SFX_ITEMS.length}] Already exists: ${sfx.id}.mp3`);
      continue;
    }

    try {
      console.log(`[${i + 1}/${SFX_ITEMS.length}] Generating SFX: "${sfx.prompt}"`);
      await generateSFX(sfx.prompt, sfx.duration, outPath);
      const size = fs.statSync(outPath).size;
      console.log(`   ✓ Saved ${sfx.id}.mp3 (${Math.round(size / 1024)} KB)`);
      await sleep(350);
    } catch (e) {
      console.error(`   ✗ Error on ${sfx.id}:`, e.message);
    }
  }

  console.log('\n🎉 ALL ELEVENLABS AUDIO ASSETS SUCCESSFULLY GENERATED!');
}

main();
