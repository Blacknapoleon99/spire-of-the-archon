import Peer from 'peerjs';
import { io } from 'socket.io-client';

/**
 * Hybrid Live Online WebRTC (PeerJS) & Socket.io Networking Engine.
 * Allows any player to host a live online game from their PC and have friends
 * across the world join directly via WebRTC DataChannels with zero port forwarding.
 */
export class WebRTCNetwork {
  constructor() {
    this.peer = null;
    this.peerId = null;
    this.isHost = false;
    this.connections = new Map(); // peerId -> DataConnection
    this.hostConnection = null;

    // Fallback socket
    this.socket = null;
    this.useWebRTC = true;

    this.callbacks = {};
    this.localPlayerId = null;
    this.localPlayerName = null;
  }

  init(onReady = null) {
    // Generate unique online Peer ID for P2P connection signaling
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.peerId = `SPIRE-${randomCode}`;

    // Connect to public PeerJS STUN cloud for NAT traversal
    try {
      this.peer = new Peer(this.peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        },
        debug: 1
      });

      this.peer.on('open', (id) => {
        this.peerId = id;
        console.log(`[Online WebRTC] Connected to Global STUN Cloud with Peer ID: ${id}`);
        if (onReady) onReady(id);
      });

      // Host receives incoming player connections
      this.peer.on('connection', (conn) => {
        this.setupIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('[Online WebRTC] Peer error, falling back to server relay:', err);
      });
    } catch (e) {
      console.warn('[Online WebRTC] PeerJS initialization failed, using Socket.io:', e);
    }

    // Connect Socket.io relay fallback
    const serverUrl = window.location.port === '5173' ? 'http://localhost:3000' : window.location.origin;
    this.socket = io(serverUrl);

    this.socket.on('connect', () => {
      this.localPlayerId = this.socket.id;
      console.log(`[Socket Relay] Connected to Spire host server with ID: ${this.socket.id}`);
    });

    this.setupSocketEvents();
  }

  setupSocketEvents() {
    this.socket.on('room_created', (d) => {
      if (d.player && d.player.id) {
        this.localPlayerId = d.player.id;
      }
      this.trigger('room_created', d);
    });
    this.socket.on('room_joined', (d) => {
      if (d.player && d.player.id) {
        this.localPlayerId = d.player.id;
      }
      this.trigger('room_joined', d);
    });
    this.socket.on('player_joined', (d) => this.trigger('player_joined', d));
    this.socket.on('player_left', (d) => this.trigger('player_left', d));
    this.socket.on('game_started', (d) => this.trigger('game_started', d));
    this.socket.on('state_snapshot', (d) => this.trigger('state_snapshot', d));
    this.socket.on('spell_cast', (d) => this.trigger('spell_cast', d));
    this.socket.on('floating_text', (d) => this.trigger('floating_text', d));
    this.socket.on('puzzle_update', (d) => this.trigger('puzzle_update', d));
    this.socket.on('quiz_start', (d) => this.trigger('quiz_start', d));
    this.socket.on('quiz_votes_update', (d) => this.trigger('quiz_votes_update', d));
    this.socket.on('quiz_result', (d) => this.trigger('quiz_result', d));
    this.socket.on('floor_changed', (d) => this.trigger('floor_changed', d));
    this.socket.on('story_message', (d) => this.trigger('story_message', d));
    this.socket.on('chat_message', (d) => this.trigger('chat_message', d));
    this.socket.on('game_victory', (d) => this.trigger('game_victory', d));
  }

  // Host: setup connection from remote player
  setupIncomingConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      console.log(`[Online WebRTC] Remote peer ${conn.peer} connected directly via P2P!`);
    });

    conn.on('data', (packet) => {
      this.handleIncomingData(conn.peer, packet);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.trigger('player_left', { socketId: conn.peer });
    });
  }

  // Client: connect to host's online peer ID
  joinOnlineHost(hostPeerId, playerData) {
    if (!this.peer) return;

    console.log(`[Online WebRTC] Connecting to online host peer: ${hostPeerId}...`);
    const conn = this.peer.connect(hostPeerId, {
      reliable: true
    });

    conn.on('open', () => {
      this.hostConnection = conn;
      console.log('[Online WebRTC] Direct P2P connection to Host established!');
      conn.send({
        type: 'join_request',
        player: playerData
      });
    });

    conn.on('data', (packet) => {
      this.handleIncomingData('host', packet);
    });
  }

  handleIncomingData(senderId, packet) {
    if (packet.type === 'transform_sync') {
      this.trigger('state_snapshot', packet.data);
    } else if (packet.type === 'spell_cast') {
      this.trigger('spell_cast', packet.data);
      // Host broadcasts to all other peers
      if (this.isHost) {
        this.broadcastP2P({ type: 'spell_cast', data: packet.data }, senderId);
      }
    } else if (packet.type === 'chat_message') {
      this.trigger('chat_message', packet.data);
      if (this.isHost) {
        this.broadcastP2P({ type: 'chat_message', data: packet.data }, senderId);
      }
    } else {
      this.trigger(packet.type, packet.data);
    }
  }

  broadcastP2P(packet, excludeId = null) {
    for (const [peerId, conn] of this.connections) {
      if (peerId !== excludeId && conn.open) {
        conn.send(packet);
      }
    }
  }

  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  // Unified Emitters (Socket + WebRTC)
  createRoom(playerName, wizardClass, roomCode) {
    this.isHost = true;
    this.localPlayerName = playerName;
    this.socket.emit('create_room', { playerName, wizardClass, roomCode: roomCode || this.peerId });
  }

  joinRoom(playerName, wizardClass, roomCode) {
    this.isHost = false;
    this.localPlayerName = playerName;
    // Check if room code looks like a PeerJS ID
    if (roomCode.startsWith('SPIRE-') && this.peer) {
      this.joinOnlineHost(roomCode, { name: playerName, wizardClass });
    }
    this.socket.emit('join_room', { playerName, wizardClass, roomCode });
  }

  startGame() {
    this.socket.emit('start_game');
    this.broadcastP2P({ type: 'game_started', data: {} });
  }

  sendInput(data) {
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({ type: 'player_input', data });
    }
    this.socket.emit('player_input', data);
  }

  castSpell(spellData) {
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({ type: 'spell_cast', data: spellData });
    }
    this.socket.emit('cast_spell', spellData);
  }

  hitEnemy(enemyId, damage, element) {
    this.socket.emit('hit_enemy', { enemyId, damage, element });
  }

  rotatePrism(prismId) {
    this.socket.emit('rotate_prism', { prismId });
  }

  interactCrucible(index, element) {
    this.socket.emit('interact_crucible', { index, element });
  }

  activateKeystone(keystoneId) {
    this.socket.emit('activate_keystone', { keystoneId });
  }

  triggerQuiz(quizId) {
    this.socket.emit('trigger_quiz', { quizId });
  }

  voteQuiz(optionIndex) {
    this.socket.emit('vote_quiz', { optionIndex });
  }

  upgradeTalent(talentKey) {
    this.socket.emit('upgrade_talent', { talentKey });
  }

  advanceFloor() {
    this.socket.emit('advance_floor');
  }

  ascendNewGamePlus() {
    this.socket.emit('ascend_ng_plus');
  }

  sendChat(message, coords = null, channel = 'proximity') {
    this.socket.emit('send_chat', {
      message,
      x: coords?.x,
      y: coords?.y,
      z: coords?.z,
      channel
    });
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({ type: 'chat_message', data: { message, sender: 'Apprentice', ...coords, channel } });
    }
  }
}

export const onlineNetwork = new WebRTCNetwork();
