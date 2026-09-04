import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager.js';
import { getLocalIPAddresses, getPrimaryLANIP, printHostBanner } from './networkUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager(io);

// Provide LAN information endpoint
app.get('/api/lan-info', (req, res) => {
  res.json({
    localIP: getPrimaryLANIP(),
    port: PORT,
    allInterfaces: getLocalIPAddresses()
  });
});

// Serve public assets (audio, textures, etc.)
app.use(express.static(path.join(rootDir, 'public')));

// Serve production build if available
const distPath = path.join(rootDir, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // If dist doesn't exist yet, serve root for direct dev viewing
  app.use(express.static(rootDir));
}

// Socket.io Connection & Routing
io.on('connection', (socket) => {
  // Room Creation & Joining
  socket.on('create_room', (data) => {
    roomManager.createRoom(socket, data);
  });

  socket.on('join_room', (data) => {
    roomManager.joinRoom(socket, data);
  });

  socket.on('start_game', () => {
    roomManager.startGame(socket);
  });

  // Gameplay actions
  socket.on('player_input', (data) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.handlePlayerInput(socket.id, data);
    }
  });

  socket.on('cast_spell', (spellData) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.handleSpellCast(socket.id, spellData);
    }
  });

  socket.on('hit_enemy', ({ enemyId, damage, element }) => {
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

  // Puzzles (Floors 1, 2, 3, and Boss Floors 5, 10, 15)
  socket.on('rotate_prism', ({ prismId }) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.rotatePrism(prismId);
    }
  });

  socket.on('interact_crucible', ({ index, element }) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.handleCrucibleInteraction(index, element);
    }
  });

  socket.on('activate_keystone', ({ keystoneId }) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room && room.gameState) {
      room.gameState.activateKeystone(keystoneId);
    }
  });

  // Quizzes
  socket.on('trigger_quiz', ({ quizId }) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.startQuiz(quizId);
    }
  });

  socket.on('vote_quiz', ({ optionIndex }) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.voteQuiz(socket.id, optionIndex);
    }
  });

  // Talents
  socket.on('upgrade_talent', ({ talentKey }) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.upgradeTalent(socket.id, talentKey);
    }
  });

  // Floor Progression
  socket.on('advance_floor', () => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.advanceFloor();
    }
  });

  // New Game+ Ascension
  socket.on('ascend_ng_plus', () => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      room.gameState.ascendNewGamePlus();
    }
  });

  // In-Game Spatial Proximity Chat
  socket.on('send_chat', (payload) => {
    const room = roomManager.getRoomBySocket(socket);
    if (room) {
      const player = room.gameState.players.get(socket.id);
      const msg = typeof payload === 'string' ? payload : (payload.message || '');
      const px = payload.x !== undefined ? payload.x : (player ? player.x : 0);
      const py = payload.y !== undefined ? payload.y : (player ? player.y : 0);
      const pz = payload.z !== undefined ? payload.z : (player ? player.z : 0);
      const channel = payload.channel || 'proximity';

      io.to(room.id).emit('chat_message', {
        senderId: socket.id,
        sender: player ? player.name : 'Unknown',
        class: player ? player.wizardClass : 'pyromancer',
        message: msg.slice(0, 150),
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
