const fs = require('fs');
const https = require('https');
const path = require('path');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ERROR: ELEVENLABS_API_KEY not found');
  process.exit(1);
}

const SPELLS_DIR = path.join(__dirname, '../public/audio/voices/spells');
if (!fs.existsSync(SPELLS_DIR)) fs.mkdirSync(SPELLS_DIR, { recursive: true });

const SPELL_VOICELINES = [
  // Pyromancer (Harry - Fierce Warrior SOYHLrjzK2X1ezoPC6cr)
  { id: 'pyro_basic', voiceId: 'SOYHLrjzK2X1ezoPC6cr', text: "Ignis! Burn to ash!" },
  { id: 'pyro_skill1', voiceId: 'SOYHLrjzK2X1ezoPC6cr', text: "Incinerate!" },
  { id: 'pyro_skill2', voiceId: 'SOYHLrjzK2X1ezoPC6cr', text: "Feel the raging inferno!" },
  { id: 'pyro_ult', voiceId: 'SOYHLrjzK2X1ezoPC6cr', text: "From the heavens fall, total cataclysm!" },

  // Cryomancer (Charlie - Deep Confident IKne3meq5aSn9XLyUdCD)
  { id: 'cryo_basic', voiceId: 'IKne3meq5aSn9XLyUdCD', text: "Glacies! Freeze to the core!" },
  { id: 'cryo_skill1', voiceId: 'IKne3meq5aSn9XLyUdCD', text: "Frost nova shatter!" },
  { id: 'cryo_skill2', voiceId: 'IKne3meq5aSn9XLyUdCD', text: "Glacial aegis, hold fast!" },
  { id: 'cryo_ult', voiceId: 'IKne3meq5aSn9XLyUdCD', text: "Absolute zero, an eternal winter claims you!" },

  // Luminary (Alice - British Female Scholar Xb7hH8MSUJpSbSDYk0k2)
  { id: 'lumi_basic', voiceId: 'Xb7hH8MSUJpSbSDYk0k2', text: "Lux! Divine illumination!" },
  { id: 'lumi_skill1', voiceId: 'Xb7hH8MSUJpSbSDYk0k2', text: "By the sacred light, be restored!" },
  { id: 'lumi_skill2', voiceId: 'Xb7hH8MSUJpSbSDYk0k2', text: "Holy grace protect my allies!" },
  { id: 'lumi_ult', voiceId: 'Xb7hH8MSUJpSbSDYk0k2', text: "Divine sanctuary, none shall perish!" },

  // Chronomancer (Callum - Husky Trickster N2lVS1w4EtoT3dr4eOWO)
  { id: 'chrono_basic', voiceId: 'N2lVS1w4EtoT3dr4eOWO', text: "Tempus! Unravel!" },
  { id: 'chrono_skill1', voiceId: 'N2lVS1w4EtoT3dr4eOWO', text: "Halt in the flow of time!" },
  { id: 'chrono_skill2', voiceId: 'N2lVS1w4EtoT3dr4eOWO', text: "Temporal shift, displace!" },
  { id: 'chrono_ult', voiceId: 'N2lVS1w4EtoT3dr4eOWO', text: "The clock shatters! Time bends to my will!" }
];

function generate(item) {
  return new Promise((resolve, reject) => {
    const outPath = path.join(SPELLS_DIR, `${item.id}.mp3`);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      console.log(`Already exists: ${item.id}.mp3`);
      return resolve();
    }

    const postData = JSON.stringify({
      text: item.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.8 }
    });

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${item.voiceId}`,
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
      const file = fs.createWriteStream(outPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✓ Generated ${item.id}.mp3: "${item.text}"`);
        resolve();
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('⚡ Generating Spell Casting Incantations...');
  for (const item of SPELL_VOICELINES) {
    try {
      await generate(item);
      await new Promise(r => setTimeout(r, 350));
    } catch (e) {
      console.error(`Error generating ${item.id}:`, e.message);
    }
  }
  console.log('🎉 ALL SPELL INCANTATIONS GENERATED!');
}

main();
