import { GameState } from './gameState.js';

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room
    this.playerRoomMap = new Map(); // socketId -> roomId
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom(socket, data) {
    let roomId = data.roomCode ? data.roomCode.toUpperCase().trim() : this.generateRoomCode();
    // Ensure uniqueness
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const gameState = new GameState(roomId, this.io);

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

    socket.emit('room_created', {
      roomId,
      player,
      isHost: true
    });

    console.log(`[Lobby] Room ${roomId} created by host ${socket.id} (${player.name})`);
    return room;
  }

  joinRoom(socket, data) {
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

    this.playerRoomMap.set(socket.id, roomId);
    socket.join(roomId);

    const player = room.gameState.addPlayer(socket.id, data.playerName || 'Apprentice', data.wizardClass || 'cryomancer');

    socket.emit('room_joined', {
      roomId,
      player,
      isHost: false,
      players: Array.from(room.gameState.players.values())
    });

    // Notify others
    socket.to(roomId).emit('player_joined', { player });

    console.log(`[Lobby] Player ${socket.id} (${player.name}) joined room ${roomId}`);
    return room;
  }

  startGame(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);

    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error_message', { message: 'Only the host can begin the ascent.' });
      return;
    }

    room.gameState.isGameStarted = true;
    room.lastTickTime = Date.now();

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
      players: Array.from(room.gameState.players.values()),
      enemies: Array.from(room.gameState.enemies.values())
    });

    console.log(`[Game] Spire ascent started for Room ${roomId}`);
  }

  handleDisconnect(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.gameState.removePlayer(socket.id);
    this.playerRoomMap.delete(socket.id);

    this.io.to(roomId).emit('player_left', { socketId: socket.id });
    console.log(`[Lobby] Player ${socket.id} left room ${roomId}`);

    if (room.gameState.players.size === 0) {
      // Clean up room
      if (room.ticker) clearInterval(room.ticker);
      this.rooms.delete(roomId);
      console.log(`[Lobby] Room ${roomId} destroyed (all players left)`);
    } else if (room.hostId === socket.id) {
      // Migrate host to first remaining player
      const nextHostId = room.gameState.players.keys().next().value;
      room.hostId = nextHostId;
      this.io.to(nextHostId).emit('promoted_to_host');
      console.log(`[Lobby] Host migrated to ${nextHostId} in room ${roomId}`);
    }
  }

  getRoomBySocket(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    return roomId ? this.rooms.get(roomId) : null;
  }
}
