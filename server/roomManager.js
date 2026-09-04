import { GameState } from './gameState.js';
import crypto from 'node:crypto';

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room
    this.playerRoomMap = new Map(); // socketId -> roomId
    this.resumeTokens = new Map(); // token -> { roomId, playerId, expiresAt }
    this.disconnectTimers = new Map();
    this.reconnectGraceMs = Math.max(10000, Number(process.env.RECONNECT_GRACE_MS) || 30000);
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createResumeToken(roomId, playerId) {
    const token = crypto.randomBytes(24).toString('base64url');
    this.resumeTokens.set(token, { roomId, playerId, expiresAt: Date.now() + this.reconnectGraceMs });
    return token;
  }

  sanitizePeerId(peerId) {
    const value = String(peerId || '').trim();
    return value.length > 0 && value.length <= 100 ? value : null;
  }

  getResumeToken(token) {
    const record = this.resumeTokens.get(token);
    if (!record || record.expiresAt < Date.now()) {
      if (token) this.resumeTokens.delete(token);
      return null;
    }
    return record;
  }

  createRoom(socket, data = {}) {
    let roomId = data.roomCode ? data.roomCode.toUpperCase().trim() : this.generateRoomCode();
    // Ensure uniqueness
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const gameState = new GameState(roomId, this.io, { difficulty: data.difficulty || 'standard' });

    const room = {
      id: roomId,
      hostId: socket.id,
      gameState,
      ticker: null,
      lastTickTime: Date.now()
    };

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(socket.id, roomId);

    socket.join(roomId);

    // Add host as player
    const player = gameState.addPlayer(socket.id, data.playerName || 'Archmage Host', data.wizardClass || 'pyromancer');
    player.peerId = this.sanitizePeerId(data.peerId);
    const resumeToken = this.createResumeToken(roomId, socket.id);
    room.resumeTokens = new Set([resumeToken]);

    socket.emit('room_created', {
      roomId,
      player,
      difficulty: gameState.difficultyId,
      isHost: true,
      resumeToken
    });

    console.log(`[Lobby] Room ${roomId} created by host ${socket.id} (${player.name})`);
    return room;
  }

  joinRoom(socket, data = {}) {
    const roomId = data.roomCode ? data.roomCode.toUpperCase().trim() : null;
    const room = this.rooms.get(roomId);

    if (!room) {
      socket.emit('error_message', { message: `Room "${roomId}" not found. Please check the code.` });
      return null;
    }

    if (room.gameState.players.size >= 4) {
      socket.emit('error_message', { message: `Room "${roomId}" is already full (max 4 wizards).` });
      return null;
    }

    if (room.gameState.isGameStarted) {
      socket.emit('error_message', { message: 'This ascent is already underway. Reconnect from the campaign screen.' });
      return null;
    }

    this.playerRoomMap.set(socket.id, roomId);
    socket.join(roomId);

    const player = room.gameState.addPlayer(socket.id, data.playerName || 'Apprentice', data.wizardClass || 'cryomancer');
    player.peerId = this.sanitizePeerId(data.peerId);
    const resumeToken = this.createResumeToken(roomId, socket.id);
    room.resumeTokens ||= new Set();
    room.resumeTokens.add(resumeToken);

    socket.emit('room_joined', {
      roomId,
      player,
      difficulty: room.gameState.difficultyId,
      isHost: false,
      hostPeerId: room.gameState.players.get(room.hostId)?.peerId || null,
      players: Array.from(room.gameState.players.values()),
      resumeToken
    });

    // Notify others
    socket.to(roomId).emit('player_joined', {
      player,
      hostPeerId: room.gameState.players.get(room.hostId)?.peerId || null
    });

    console.log(`[Lobby] Player ${socket.id} (${player.name}) joined room ${roomId}`);
    return room;
  }

  startGame(socket, options = {}) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);

    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error_message', { message: 'Only the host can begin the ascent.' });
      return;
    }

    if (room.gameState.isGameStarted) {
      socket.emit('game_started', {
        floor: room.gameState.floor,
        difficulty: room.gameState.difficultyId,
        players: Array.from(room.gameState.players.values()),
        enemies: Array.from(room.gameState.enemies.values()).filter(enemy => enemy.isAlive),
        objective: room.gameState.objective,
        puzzles: room.gameState.puzzles,
        serverTick: room.gameState.serverTick,
        resumed: true
      });
      return;
    }
    const resumeFloor = Math.max(1, Math.min(room.gameState.maxFloors, Math.floor(Number(options.resumeFloor) || 1)));
    if (resumeFloor > 1) room.gameState.initFloor(resumeFloor);
    room.gameState.isGameStarted = true;
    room.lastTickTime = Date.now();
    room.gameState.startedAt = new Date().toISOString();

    // Start 20 Hz loop
    if (!room.ticker) {
      room.ticker = setInterval(() => {
        const now = Date.now();
        const deltaTime = (now - room.lastTickTime) / 1000;
        room.lastTickTime = now;
        room.gameState.tick(deltaTime);
      }, 50);
    }

    this.io.to(roomId).emit('game_started', {
      floor: room.gameState.floor,
      difficulty: room.gameState.difficultyId,
      players: Array.from(room.gameState.players.values()),
      enemies: Array.from(room.gameState.enemies.values()).filter(enemy => enemy.isAlive),
      objective: room.gameState.objective,
      puzzles: room.gameState.puzzles,
      serverTick: room.gameState.serverTick,
      resumed: resumeFloor > 1
    });

    console.log(`[Game] Spire ascent started for Room ${roomId}`);
  }

  handleDisconnect(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    this.playerRoomMap.delete(socket.id);
    const player = room.gameState.players.get(socket.id);
    if (!player) return;
    player.disconnectedAt = Date.now();
    player.connected = false;
    this.io.to(roomId).emit('player_disconnected', { socketId: socket.id, graceMs: this.reconnectGraceMs });
    console.log(`[Lobby] Player ${socket.id} disconnected from ${roomId}; holding state for reconnect.`);

    // Keep the disconnected slot for reconnect, but promote a connected
    // covenant member immediately so the lobby and post-victory controls do
    // not depend on a vanished browser tab.
    if (room.hostId === socket.id) {
      const nextHost = Array.from(room.gameState.players.values()).find(p => p.id !== socket.id && p.connected !== false);
      if (nextHost) {
        room.hostId = nextHost.id;
        const hostPeerId = nextHost.peerId || null;
        const players = Array.from(room.gameState.players.values());
        this.io.to(roomId).emit('host_migrated', { hostId: nextHost.id, hostPeerId, players });
        this.io.to(nextHost.id).emit('promoted_to_host', { hostId: nextHost.id, hostPeerId, players });
      }
    }

    const timer = setTimeout(() => this.expireDisconnectedPlayer(roomId, socket.id), this.reconnectGraceMs);
    this.disconnectTimers.set(socket.id, timer);
  }

  expireDisconnectedPlayer(roomId, socketId) {
    this.disconnectTimers.delete(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.gameState.players.get(socketId);
    if (!player || !player.disconnectedAt) return;
    room.gameState.removePlayer(socketId);
    this.io.to(roomId).emit('player_left', { socketId, expired: true });
    for (const [token, record] of this.resumeTokens) {
      if (record.roomId === roomId && record.playerId === socketId) this.resumeTokens.delete(token);
    }
    if (room.hostId === socketId) {
      const nextHost = Array.from(room.gameState.players.values()).find(p => !p.disconnectedAt);
      room.hostId = nextHost?.id || null;
      if (room.hostId) {
        const hostPeerId = nextHost.peerId || null;
        const players = Array.from(room.gameState.players.values());
        this.io.to(roomId).emit('host_migrated', { hostId: room.hostId, hostPeerId, players });
        this.io.to(room.hostId).emit('promoted_to_host', { hostId: room.hostId, hostPeerId, players });
      }
    }
    if (room.gameState.players.size === 0) {
      if (room.ticker) clearInterval(room.ticker);
      this.rooms.delete(roomId);
    }
  }

  resumeRoom(socket, token, peerId = null) {
    const record = this.getResumeToken(token);
    const room = record ? this.rooms.get(record.roomId) : null;
    const oldPlayer = room?.gameState.players.get(record.playerId);
    if (!room || !oldPlayer || !oldPlayer.disconnectedAt) {
      socket.emit('error_message', { message: 'That reconnect window has expired. Start or join the room again.' });
      return null;
    }

    const oldId = oldPlayer.id;
    const pendingTimer = this.disconnectTimers.get(oldId);
    if (pendingTimer) clearTimeout(pendingTimer);
    this.disconnectTimers.delete(oldId);
    room.gameState.players.delete(oldId);
    const cooldowns = room.gameState.playerCooldowns.get(oldId);
    room.gameState.playerCooldowns.delete(oldId);
    oldPlayer.id = socket.id;
    oldPlayer.disconnectedAt = null;
    oldPlayer.connected = true;
    const safePeerId = this.sanitizePeerId(peerId);
    if (safePeerId) oldPlayer.peerId = safePeerId;
    oldPlayer.lastInputAt = Date.now();
    room.gameState.players.set(socket.id, oldPlayer);
    if (cooldowns) room.gameState.playerCooldowns.set(socket.id, cooldowns);
    this.playerRoomMap.set(socket.id, room.id);
    if (room.hostId === oldId) room.hostId = socket.id;
    for (const [resumeToken, item] of this.resumeTokens) {
      if (item.roomId === room.id && item.playerId === oldId) {
        item.playerId = socket.id;
        item.expiresAt = Date.now() + this.reconnectGraceMs;
      }
    }
    socket.join(room.id);
    socket.emit('room_resumed', {
      roomId: room.id,
      player: oldPlayer,
      isHost: room.hostId === socket.id,
      difficulty: room.gameState.difficultyId,
      hostPeerId: room.gameState.players.get(room.hostId)?.peerId || null,
      gameStarted: room.gameState.isGameStarted,
      snapshot: room.gameState.getSnapshot()
    });
    socket.to(room.id).emit('player_reconnected', { oldSocketId: oldId, player: oldPlayer });
    if (room.gameState.isGameStarted) {
      socket.emit('game_started', {
        floor: room.gameState.floor,
        difficulty: room.gameState.difficultyId,
        players: Array.from(room.gameState.players.values()),
        enemies: Array.from(room.gameState.enemies.values()).filter(enemy => enemy.isAlive),
        objective: room.gameState.objective,
        puzzles: room.gameState.puzzles,
        serverTick: room.gameState.serverTick,
        resumed: true
      });
    }
    return room;
  }

  getRoomBySocket(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    return roomId ? this.rooms.get(roomId) : null;
  }
}
