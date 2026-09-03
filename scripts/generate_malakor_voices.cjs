const fs = require('fs');
const https = require('https');
const path = require('path');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ERROR: ELEVENLABS_API_KEY not found in environment');
  process.exit(1);
}

const VOICES_DIR = path.join(__dirname, '../public/audio/voices');
if (!fs.existsSync(VOICES_DIR)) fs.mkdirSync(VOICES_DIR, { recursive: true });

const LINES = [
  {
    id: 'malakor_greeting',
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum (Husky Rogue)
    text: "Shh! Keep your voice down, wizard... The Archon's sentinels have ears in the cold stone. Looking for contraband the sentinels missed?"
  },
  {
    id: 'malakor_purchase',
    voiceId: 'N2lVS1w4EtoT3dr4eOWO',
    text: "A fine choice. Put it to good use and break the Archon's tyranny."
  },
  {
    id: 'malakor_lore',
    voiceId: 'N2lVS1w4EtoT3dr4eOWO',
    text: "I was once the chief warden down in the penitentiary vaults. When I saw what Valerius was doing to the prisoners—siphoning their souls into the Temporal Orrery—I smashed my shackles and hid here in the dark."
  }
];

function generate(item) {
  return new Promise((resolve, reject) => {
    const outPath = path.join(VOICES_DIR, `${item.id}.mp3`);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      console.log(`Already exists: ${item.id}.mp3`);
      return resolve();
    }

    const postData = JSON.stringify({
      text: item.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.85 }
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

async function run() {
  console.log('⚡ Generating Malakor the Escaped Convict voice lines...');
  for (const line of LINES) {
    try {
      await generate(line);
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error(`Error generating ${line.id}:`, e.message);
    }
  }
  console.log('🎉 Malakor voice lines complete!');
}

run();
