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

const VOICE_ID = 'SOYHLrjzK2X1ezoPC6cr'; // Harry - Fierce Warrior Tyrant

const LINES = [
  {
    id: 'valerius_phase3',
    text: "Fools! You cannot defy time itself! The Spire crumbles with you! Witness Temporal Collapse!"
  },
  {
    id: 'valerius_special_barrage',
    text: "The cosmos bends to my command! Burn under celestial fire!"
  },
  {
    id: 'valerius_special_nova',
    text: "Time stops for no mortal! Astral Nova!"
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
        stability: 0.40,
        similarity_boost: 0.85,
        style: 0.35,
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
  console.log('Generating Phase 3 and Special Attack Voices for Archon Valerius...');
  for (const item of LINES) {
    try {
      await generate(item);
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error(`Error generating ${item.id}:`, e.message);
    }
  }
  console.log('Valerius boss voice generation completed!');
}

run();
