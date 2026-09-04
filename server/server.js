import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager.js';
import { getLocalIPAddresses, getPrimaryLANIP, printHostBanner } from './networkUtils.js';
import { AccountStore } from './accountStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'https://spire-of-the-archon.onrender.com,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(value => value.trim()).filter(Boolean);
const isAllowedOrigin = origin => !origin || configuredOrigins.includes(origin);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.path === '/healthz') res.setHeader('Cache-Control', 'no-store');
  next();
});
const httpRate = new Map();
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) return res.status(403).json({ message: 'Origin is not allowed.' });
  const address = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (httpRate.get(address) || []).filter(timestamp => now - timestamp < 60_000);
  if (recent.length >= 180) return res.status(429).json({ message: 'Too many requests. Try again shortly.' });
  recent.push(now); httpRate.set(address, recent);
  next();
});
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager(io);
const localAccountStore = new AccountStore();
let accountStore = localAccountStore;
if (localAccountStore.oracleConfigured) {
  try {
    const { OracleAccountStore } = await import('./oracleAccountStore.js');
    const oracleStore = new OracleAccountStore();
    await oracleStore.ready;
    accountStore = oracleStore;
    console.info('[AccountStore] Oracle persistence enabled.');
  } catch (error) {
    console.error('[AccountStore] Oracle persistence could not initialize; refusing to start with a file fallback.', error);
    throw error;
  }
}
const COOKIE = 'spire_session';
const parseCookies = (header = '') => Object.fromEntries(header.split(';').map(v => {
  const index = v.indexOf('=');
  if (index < 0) return [v.trim(), ''];
  const rawValue = v.slice(index + 1).trim();
  let value = rawValue;
  try { value = decodeURIComponent(rawValue); } catch { value = ''; }
  return [v.slice(0, index).trim(), value];
}).filter(([key]) => key));
const authUser = async req => accountStore.getBySession(parseCookies(req.headers.cookie || '')[COOKIE]);

app.get('/healthz', (req, res) => res.json({
  ok: true,
  service: 'spire-relay',
  persistence: accountStore.persistenceMode,
  oracleConfigured: accountStore.oracleConfigured,
  rooms: roomManager.rooms.size
}));

app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await accountStore.register(req.body?.username, req.body?.password);
    res.cookie(COOKIE, result.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 30 });
    res.status(201).json({ user: result.user, recoveryCodes: result.recoveryCodes });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await accountStore.login(req.body?.username, req.body?.password);
    res.cookie(COOKIE, result.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 30 });
    res.json({ user: result.user });
  } catch (error) { res.status(401).json({ message: error.message }); }
});

app.post('/api/auth/recovery', async (req, res) => {
  try {
    const result = await accountStore.resetWithRecovery(req.body?.username, req.body?.recoveryCode, req.body?.password);
    res.cookie(COOKIE, result.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 30 });
    res.json({ user: result.user });
  } catch (error) { res.status(401).json({ message: error.message }); }
});

app.post('/api/auth/logout', async (req, res) => {
  const cookies = parseCookies(req.headers.cookie || '');
  await accountStore.destroySession(cookies[COOKIE]);
  res.clearCookie(COOKIE);
  res.status(204).end();
});

app.delete('/api/auth/account', async (req, res) => {
  try {
    const user = await authUser(req);
    if (!user) return res.status(401).json({ message: 'Not signed in.' });
    await accountStore.deleteAccount(user.username, req.body?.password);
    const cookies = parseCookies(req.headers.cookie || '');
    await accountStore.destroySession(cookies[COOKIE]);
    res.clearCookie(COOKIE);
    res.status(204).end();
  } catch (error) { res.status(401).json({ message: error.message }); }
});

app.get('/api/auth/me', async (req, res) => {
  const user = await authUser(req);
  if (!user) return res.status(401).json({ message: 'Not signed in.' });
  res.json({ user: accountStore.publicUser(user) });
});

app.get('/api/campaign', async (req, res) => {
  const user = await authUser(req);
  if (!user) return res.status(401).json({ message: 'Sign in to load a campaign.' });
  res.json(await accountStore.getCampaign(user));
});

app.put('/api/campaign', async (req, res) => {
  try {
    const user = await authUser(req);
    if (!user) return res.status(401).json({ message: 'Sign in to save a campaign.' });
    res.json(await accountStore.saveCampaign(user, req.body?.payload, req.body?.revision || 0));
  } catch (error) { res.status(409).json({ message: error.message }); }
});

// Provide LAN information endpoint
app.get('/api/lan-info', (req, res) => {
  res.json({
    localIP: getPrimaryLANIP(),
    port: PORT,
    allInterfaces: getLocalIPAddresses()
  });
});

const setStaticCacheHeaders = (res, filePath) => {
  const normalized = String(filePath).replace(/\\/g, '/');
  if (normalized.includes('/dist/assets/')) {
    // Vite fingerprints these files; immutable caching removes repeat downloads.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (normalized.includes('/public/')) {
    // Runtime GLBs/audio/images are not fingerprinted, so keep a short safe TTL.
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else if (normalized.endsWith('/index.html')) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
};

// Serve public assets (audio, textures, etc.)
app.use(express.static(path.join(rootDir, 'public'), { setHeaders: setStaticCacheHeaders }));

// Serve production build if available
const distPath = path.join(rootDir, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { setHeaders: setStaticCacheHeaders }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // If dist doesn't exist yet, serve root for direct dev viewing
  app.use(express.static(rootDir));
}

// Socket.io Connection & Routing
io.on('connection', (socket) => {
  socket.data.rate = new Map();
  const allow = (key, limit, windowMs = 1000) => {
    const now = Date.now();
    const values = (socket.data.rate.get(key) || []).filter(t => now - t < windowMs);
    if (values.length >= limit) return false;
    values.push(now); socket.data.rate.set(key, values); return true;
  };
  // Room Creation & Joining
  socket.on('create_room', (data) => {
    roomManager.createRoom(socket, data);
  });

  socket.on('join_room', (data) => {
    roomManager.joinRoom(socket, data);
  });

  socket.on('resume_room', ({ token, peerId } = {}) => {
    roomManager.resumeRoom(socket, typeof token === 'string' ? token : '', peerId);
  });

  socket.on('start_game', (options = {}) => {
    roomManager.startGame(socket, options);
  });

  // Gameplay actions
  socket.on('player_input', (data) => {
    if (!allow('input', 30)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.handlePlayerInput(socket.id, data);
    }
  });

  socket.on('cast_spell', (spellData) => {
    if (!allow('spell', 12)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.handleSpellCast(socket.id, spellData);
    }
  });

  socket.on('hit_enemy', ({ enemyId, damage, element } = {}) => {
    if (!allow('hit', 20)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.handleDamageToEnemy(enemyId, damage, element, socket.id);
    }
  });

  socket.on('hazard_damage', ({ damage }) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.handleHazardDamage(socket.id, damage);
    }
  });

  socket.on('player_profile', (profile = {}) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room?.gameState) room.gameState.applyPlayerProfile(socket.id, profile);
  });

  // Puzzles (Floors 1, 2, 3, and Boss Floors 5, 10, 15)
  socket.on('rotate_prism', ({ prismId } = {}) => {
    if (!allow('puzzle', 12)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.rotatePrism(prismId, socket.id);
    }
  });

  socket.on('interact_crucible', ({ index, element } = {}) => {
    if (!allow('puzzle', 12)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.handleCrucibleInteraction(index, element, socket.id);
    }
  });

  socket.on('activate_keystone', ({ keystoneId } = {}) => {
    if (!allow('puzzle', 12)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.activateKeystone(keystoneId, socket.id);
    }
  });

  socket.on('puzzle_leyline_charge', ({ pedestalKey } = {}) => {
    if (!allow('puzzle', 12)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.chargeLeylinePedestal(pedestalKey, socket.id);
    }
  });

  socket.on('puzzle_leyline_align', ({ pedestalKey } = {}) => {
    if (!allow('puzzle', 12)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.alignLeylinePedestal(pedestalKey, socket.id);
    }
  });

  // Quizzes
  socket.on('trigger_quiz', ({ quizId } = {}) => {
    if (!allow('quiz', 4)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.startQuiz(quizId, socket.id);
    }
  });

  socket.on('vote_quiz', ({ optionIndex } = {}) => {
    if (!allow('quiz', 8)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.voteQuiz(socket.id, optionIndex);
    }
  });

  // Talents
  socket.on('upgrade_talent', ({ talentKey } = {}) => {
    if (!allow('talent', 8)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.upgradeTalent(socket.id, talentKey);
    }
  });

  // Floor Progression
  socket.on('advance_floor', () => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.advanceFloor(socket.id);
    }
  });

  socket.on('retry_floor', () => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) room.gameState.retryFloor(socket.id);
  });

  // New Game+ Ascension
  socket.on('ascend_ng_plus', () => {
    if (!allow('ascend', 2, 5000)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.ascendNewGamePlus(socket.id);
    }
  });

  // In-Game Spatial Proximity Chat
  socket.on('send_chat', (payload) => {
    if (!allow('chat', 4, 5000)) return;
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      const player = room.gameState.players.get(socket.id);
      if (!player || player.connected === false) return;
      const safePayload = payload && typeof payload === 'object' ? payload : {};
      const msg = typeof payload === 'string' ? payload : String(safePayload.message || '');
      // Position is always authoritative; clients cannot spoof proximity chat
      // from another room location.
      const px = player ? player.x : 0;
      const py = player ? player.y : 0;
      const pz = player ? player.z : 0;
      const channel = safePayload.channel === 'party' ? 'party' : 'proximity';

      io.to(room.id).emit('chat_message', {
        senderId: socket.id,
        sender: player ? player.name : 'Unknown',
        class: player ? player.wizardClass : 'pyromancer',
        message: msg.replace(/[<>]/g, '').slice(0, 150),
        x: px,
        y: py,
        z: pz,
        channel
      });
    }
  });

  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  printHostBanner(PORT);
});
