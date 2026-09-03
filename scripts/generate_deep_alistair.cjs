const fs = require('fs');
const https = require('https');
const path = require('path');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ERROR: ELEVENLABS_API_KEY environment variable is not set!');
  process.exit(1);
}

const VOICES_DIR = path.join(__dirname, '../public/audio/voices');
const DIST_VOICES_DIR = path.join(__dirname, '../dist/audio/voices');

// Brian - Deep, Resonant and Comforting (Narrative Sage)
const VOICE_ID = 'nPczCjzI2devNBz1zQrb';

const ALISTAIR_LINES = [
  {
    id: 'alistair_act1_intro',
    text: "Apprentice wizards, hear my plea! Archon Valerius has locked the Spire in a fractured temporal loop. Brute force cannot shatter the seals. You must rotate the three Astrolabe Prisms until their celestial beams focus upon the northern gate seal!"
  },
  {
    id: 'alistair_prism_aligned',
    text: "The celestial light connects! The northern gate seal fractures! Press forward, apprentices!"
  },
  {
    id: 'alistair_quiz_prompt',
    text: "Before you lies the Riddle Monolith of Aethelgard. Confer with your covenant and choose wisely!"
  },
  {
    id: 'alistair_quiz_correct',
    text: "Splendid! Wisdom is the sharpest blade in this tower. Take your reward!"
  },
  {
    id: 'alistair_act1_complete',
    text: "The Archives are unlocked! Climb the spiral stairs into the Alchemical Crucible!"
  }
];

function generateVoice(line) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: line.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.85,
        style: 0.15,
        use_speaker_boost: true
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/text-to-speech/' + VOICE_ID,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, res => {
      if (res.statusCode !== 200) {
        let err = '';
        res.on('data', d => err += d);
        res.on('end', () => reject(new Error(`Failed [${res.statusCode}]: ${err}`)));
        return;
      }

      const filePath = path.join(VOICES_DIR, `${line.id}.mp3`);
      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const distFilePath = path.join(DIST_VOICES_DIR, `${line.id}.mp3`);
        if (fs.existsSync(DIST_VOICES_DIR)) {
          fs.copyFileSync(filePath, distFilePath);
        }
        console.log(`[DEEP VOICE GENERATED] ${line.id}.mp3 (${fs.statSync(filePath).size} bytes)`);
        resolve();
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Generating Deep Resonant Narrative Voices for Grand Scribe Alistair...');
  for (const line of ALISTAIR_LINES) {
    try {
      await generateVoice(line);
      await new Promise(r => setTimeout(r, 600)); // Respect rate limits
    } catch (e) {
      console.error(`Error on ${line.id}:`, e.message);
    }
  }
  console.log('All deep narrative voice lines generated successfully!');
}

run();
