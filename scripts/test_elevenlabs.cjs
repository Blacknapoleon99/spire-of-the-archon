const fs = require('fs');
const https = require('https');

const apiKey = process.env.ELEVENLABS_API_KEY;

if (!fs.existsSync('public/audio/voices')) {
  fs.mkdirSync('public/audio/voices', { recursive: true });
}

const voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // George
const postData = JSON.stringify({
  text: 'Apprentice wizards, hear my plea! Archon Valerius has locked the Spire in a fractured temporal loop.',
  model_id: 'eleven_multilingual_v2',
  voice_settings: { stability: 0.5, similarity_boost: 0.8 }
});

const options = {
  hostname: 'api.elevenlabs.io',
  path: '/v1/text-to-speech/' + voiceId,
  method: 'POST',
  headers: {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, res => {
  console.log('Response Status:', res.statusCode);
  if (res.statusCode !== 200) {
    let err = '';
    res.on('data', d => err += d);
    res.on('end', () => console.error('Error:', err));
    return;
  }
  const file = fs.createWriteStream('public/audio/voices/test_alistair.mp3');
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    const stats = fs.statSync('public/audio/voices/test_alistair.mp3');
    console.log('SUCCESS! Generated test_alistair.mp3 with size:', stats.size, 'bytes');
  });
});

req.on('error', console.error);
req.write(postData);
req.end();
