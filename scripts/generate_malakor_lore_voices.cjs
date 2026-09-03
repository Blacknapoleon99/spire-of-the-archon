const fs = require('fs');
const https = require('https');
const path = require('path');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ERROR: ELEVENLABS_API_KEY not found in environment');
  process.exit(1);
}

const VOICES_DIR = path.join(__dirname, '../public/audio/voices');
const DIST_VOICES_DIR = path.join(__dirname, '../dist/audio/voices');
if (!fs.existsSync(VOICES_DIR)) fs.mkdirSync(VOICES_DIR, { recursive: true });
if (!fs.existsSync(DIST_VOICES_DIR)) fs.mkdirSync(DIST_VOICES_DIR, { recursive: true });

const VOICE_ID = 'N2lVS1w4EtoT3dr4eOWO'; // Callum - Husky Trickster / Escaped Rogue

const LINES = [
  {
    id: 'malakor_lore_souls',
    text: "The Archon doesn't just execute prisoners, wizard. He built the Aetheric Siphon beneath the floor. It drains their memories, their magical affinity, and their life force, distilling them into pure chronomantic fuel."
  },
  {
    id: 'malakor_lore_orrery',
    text: "Look up at the ceiling ribs! Those brass conduits channel the harvested soul essence directly to the Floor 3 Orrery, giving Valerius the power to rewind every second of his mistakes."
  },
  {
    id: 'malakor_lore_crucibles',
    text: "In the Floor 2 crucibles, they smelted what was left of the archmages into Volatile Crucible Cores. If you bring me three of those cores, I will forge a legendary band to pierce the Archon's shield."
  },
  {
    id: 'malakor_lore_escape',
    text: "I used a rusted iron pin to pick the warden's seal on my cell while the sentinels were recalibrating during a temporal reset. Slipped past the shadow vents and made camp in this alcove."
  },
  {
    id: 'malakor_lore_valerius',
    text: "Valerius wasn't always a monster. He tried to save his daughter from an incurable magical plague. When mortal medicine failed, he sought to freeze time itself... and drove himself mad in the process."
  }
];

function generate(item) {
  return new Promise((resolve, reject) => {
    const outPath = path.join(VOICES_DIR, `${item.id}.mp3`);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      console.log(`Already exists: ${item.id}.mp3`);
      const distPath = path.join(DIST_VOICES_DIR, `${item.id}.mp3`);
      fs.copyFileSync(outPath, distPath);
      return resolve();
    }

    const postData = JSON.stringify({
      text: item.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.50,
        similarity_boost: 0.85,
        style: 0.20,
        use_speaker_boost: true
      }
    });

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${VOICE_ID}`,
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
      const stream = fs.createWriteStream(outPath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        const distPath = path.join(DIST_VOICES_DIR, `${item.id}.mp3`);
        fs.copyFileSync(outPath, distPath);
        console.log(`[GENERATED] ${item.id}.mp3 (${fs.statSync(outPath).size} bytes)`);
        resolve();
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Generating 5 Extended Lore Voice Lines for Malakor...');
  for (const item of LINES) {
    try {
      await generate(item);
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error(`Error generating ${item.id}:`, e.message);
    }
  }
  console.log('Malakor lore lines generation completed!');
}

run();
