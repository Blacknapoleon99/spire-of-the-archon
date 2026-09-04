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
    // Socket.io is the sole gameplay authority. PeerJS remains optional for
    // proximity voice/signalling and never mutates world state.
    this.useWebRTC = false;
    this.pendingSocketActions = [];

    this.callbacks = {};
    this.localPlayerId = null;
    this.localPlayerName = null;
    this.roomId = null;
    this.resumeToken = null;
    this.voicePeerIds = new Set();
    this.pendingVoicePeerIds = new Set();
    this.hostPeerId = null;
    this.inputSeq = 0;
    this.connectionState = 'idle';
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
        for (const peerId of this.pendingVoicePeerIds) {
          this.pendingVoicePeerIds.delete(peerId);
          this.connectVoicePeer(peerId);
        }
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
    try { this.resumeToken = localStorage.getItem('spire_resume_token') || null; } catch { this.resumeToken = null; }
    this.socket = io(serverUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 8000
    });

    this.socket.on('connect', () => {
      this.localPlayerId = this.socket.id;
      this.connectionState = 'connected';
      this.trigger('network_status', { state: this.connectionState });
      console.log(`[Socket Relay] Connected to Spire host server with ID: ${this.socket.id}`);
      if (this.resumeToken) this.socket.emit('resume_room', { token: this.resumeToken, peerId: this.peerId });
      const pending = this.pendingSocketActions.splice(0);
      pending.forEach(({ event, data }) => this.socket.emit(event, data));
    });
    this.socket.on('disconnect', (reason) => {
      this.connectionState = 'reconnecting';
      this.trigger('network_status', { state: this.connectionState, reason });
    });
    this.socket.on('connect_error', (err) => this.trigger('network_error', { message: 'The covenant relay is unavailable.', detail: err?.message }));

    this.setupSocketEvents();
  }

  setupSocketEvents() {
    const rememberResumeToken = data => {
      if (!data?.resumeToken) return;
      this.resumeToken = data.resumeToken;
      try { localStorage.setItem('spire_resume_token', data.resumeToken); } catch {}
    };
    this.socket.on('room_created', (d) => {
      this.roomId = d.roomId;
      this.hostPeerId = d.player?.peerId || this.peerId;
      rememberResumeToken(d);
      if (d.player && d.player.id) {
        this.localPlayerId = d.player.id;
      }
      this.trigger('room_created', d);
    });
    this.socket.on('room_joined', (d) => {
      this.roomId = d.roomId;
      this.hostPeerId = d.hostPeerId || d.players?.find(player => player.id !== d.player?.id)?.peerId || null;
      rememberResumeToken(d);
      if (d.player && d.player.id) {
        this.localPlayerId = d.player.id;
      }
      this.trigger('room_joined', d);
      if (this.hostPeerId && this.hostPeerId !== this.peerId) this.connectVoicePeer(this.hostPeerId);
    });
    this.socket.on('room_resumed', (d) => {
      this.roomId = d.roomId;
      this.isHost = Boolean(d.isHost);
      this.hostPeerId = d.hostPeerId || null;
      rememberResumeToken(d);
      if (d.player?.id) this.localPlayerId = d.player.id;
      this.trigger('room_resumed', d);
      if (this.hostPeerId && this.hostPeerId !== this.peerId) this.connectVoicePeer(this.hostPeerId);
    });
    this.socket.on('player_joined', (d) => {
      if (d?.hostPeerId) this.hostPeerId = d.hostPeerId;
      this.trigger('player_joined', d);
    });
    this.socket.on('player_left', (d) => this.trigger('player_left', d));
    this.socket.on('player_disconnected', (d) => this.trigger('player_disconnected', d));
    this.socket.on('player_reconnected', (d) => this.trigger('player_reconnected', d));
    this.socket.on('game_started', (d) => this.trigger('game_started', d));
    this.socket.on('state_snapshot', (d) => this.trigger('state_snapshot', d));
    this.socket.on('spell_cast', (d) => this.trigger('spell_cast', d));
    this.socket.on('enemy_attack', (d) => this.trigger('enemy_attack', d));
    this.socket.on('enemy_ability', (d) => this.trigger('enemy_ability', d));
    this.socket.on('enemy_defeated', (d) => this.trigger('enemy_defeated', d));
    this.socket.on('player_died', (d) => this.trigger('player_died', d));
    this.socket.on('player_respawned', (d) => this.trigger('player_respawned', d));
    this.socket.on('boss_phase_change', (d) => this.trigger('boss_phase_change', d));
    this.socket.on('boss_special', (d) => this.trigger('boss_special', d));
    this.socket.on('boss_defeated_advancement', (d) => this.trigger('boss_defeated_advancement', d));
    this.socket.on('boss_meltdown_started', (d) => this.trigger('boss_meltdown_started', d));
    this.socket.on('meltdown_contained', (d) => this.trigger('meltdown_contained', d));
    this.socket.on('encounter_wipe', (d) => this.trigger('encounter_wipe', d));
    this.socket.on('leyline_charged', (d) => this.trigger('leyline_charged', d));
    this.socket.on('leyline_aligned', (d) => this.trigger('leyline_aligned', d));
    this.socket.on('boss_shield_broken', (d) => this.trigger('boss_shield_broken', d));
    this.socket.on('talent_updated', (d) => this.trigger('talent_updated', d));
    this.socket.on('ascension_started', (d) => this.trigger('ascension_started', d));
    this.socket.on('player_effect', (d) => this.trigger('player_effect', d));
    this.socket.on('party_effect', (d) => this.trigger('party_effect', d));
    this.socket.on('enemy_effect', (d) => this.trigger('enemy_effect', d));
    this.socket.on('objective_update', (d) => this.trigger('objective_update', d));
    this.socket.on('input_rejected', (d) => this.trigger('input_rejected', d));
    this.socket.on('action_rejected', (d) => this.trigger('action_rejected', d));
    this.socket.on('action_accepted', (d) => this.trigger('action_accepted', d));
    this.socket.on('profile_applied', (d) => this.trigger('profile_applied', d));
    this.socket.on('floating_text', (d) => this.trigger('floating_text', d));
    this.socket.on('puzzle_update', (d) => this.trigger('puzzle_update', d));
    this.socket.on('quiz_start', (d) => this.trigger('quiz_start', d));
    this.socket.on('quiz_votes_update', (d) => this.trigger('quiz_votes_update', d));
    this.socket.on('quiz_result', (d) => this.trigger('quiz_result', d));
    this.socket.on('floor_changed', (d) => this.trigger('floor_changed', d));
    this.socket.on('story_message', (d) => this.trigger('story_message', d));
    this.socket.on('chat_message', (d) => this.trigger('chat_message', d));
    this.socket.on('game_victory', (d) => this.trigger('game_victory', d));
    this.socket.on('floor_retry', (d) => this.trigger('floor_retry', d));
    this.socket.on('error_message', (d) => this.trigger('error_message', d));
    this.socket.on('promoted_to_host', (d) => {
      this.isHost = true;
      if (d?.hostPeerId) this.hostPeerId = d.hostPeerId;
      this.trigger('promoted_to_host', d);
    });
    this.socket.on('host_migrated', (d) => {
      if (d?.hostPeerId) this.hostPeerId = d.hostPeerId;
      this.trigger('host_migrated', d);
    });
  }

  // Host: setup connection from remote player
  setupIncomingConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.voicePeerIds.add(conn.peer);
      console.log(`[Online WebRTC] Remote peer ${conn.peer} connected directly via P2P!`);
      this.trigger('peer_connected', conn.peer);
    });

    conn.on('data', (packet) => {
      this.handleIncomingData(conn.peer, packet);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.voicePeerIds.delete(conn.peer);
      this.trigger('player_left', { socketId: conn.peer });
    });
  }

  // Client: connect to host's online peer ID
  joinOnlineHost(hostPeerId, playerData) {
    return this.connectVoicePeer(hostPeerId);
  }

  connectVoicePeer(peerId) {
    if (!peerId || peerId === this.peerId || !this.peer) return null;
    if (this.voicePeerIds.has(peerId)) return this.connections.get(peerId) || null;
    if (!this.peer.open) {
      this.pendingVoicePeerIds.add(peerId);
      return null;
    }
    try {
      const conn = this.peer.connect(peerId, { reliable: true, metadata: { purpose: 'voice', playerId: this.localPlayerId } });
      conn.on('open', () => {
        this.voicePeerIds.add(peerId);
        this.connections.set(peerId, conn);
        this.trigger('peer_connected', peerId);
      });
      conn.on('close', () => {
        this.voicePeerIds.delete(peerId);
        this.connections.delete(peerId);
      });
      conn.on('error', error => console.warn(`[Online WebRTC] Voice signaling connection failed for ${peerId}:`, error));
      return conn;
    } catch (error) {
      console.warn(`[Online WebRTC] Could not open voice signaling connection to ${peerId}:`, error);
      return null;
    }
  }

  handleIncomingData(senderId, packet) {
    if (!packet || typeof packet !== 'object') return;
    // PeerJS is deliberately limited to voice signaling. Gameplay state,
    // transforms, chat and damage must arrive from the Socket.io authority.
    if (packet.type === 'voice_hello') this.trigger('voice_hello', { senderId, data: packet.data });
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
  emitSocket(event, data) {
    if (this.socket?.connected) this.socket.emit(event, data);
    else if (this.pendingSocketActions.length < 100) this.pendingSocketActions.push({ event, data });
  }

  createRoom(playerName, wizardClass, roomCode, difficulty = 'standard') {
    this.isHost = true;
    this.localPlayerName = playerName;
    this.emitSocket('create_room', { playerName, wizardClass, roomCode: roomCode || undefined, difficulty, peerId: this.peerId });
  }

  joinRoom(playerName, wizardClass, roomCode) {
    this.isHost = false;
    this.localPlayerName = playerName;
    // Check if room code looks like a PeerJS ID
    this.emitSocket('join_room', { playerName, wizardClass, roomCode, peerId: this.peerId });
  }

  startGame(options = {}) {
    this.emitSocket('start_game', { resumeFloor: options.resumeFloor || 1 });
  }

  sendInput(data) {
    this.inputSeq += 1;
    this.emitSocket('player_input', { ...data, seq: this.inputSeq });
  }

  syncProfile(profile = {}) {
    this.emitSocket('player_profile', profile);
  }

  castSpell(spellData) {
    this.emitSocket('cast_spell', spellData);
  }

  hitEnemy(enemyId, damage, element) {
    this.emitSocket('hit_enemy', { enemyId, damage, element });
  }

  rotatePrism(prismId) {
    this.emitSocket('rotate_prism', { prismId });
  }

  interactCrucible(index, element) {
    this.emitSocket('interact_crucible', { index, element });
  }

  activateKeystone(keystoneId) {
    this.emitSocket('activate_keystone', { keystoneId });
  }

  chargeLeyline(pedestalKey) {
    this.emitSocket('puzzle_leyline_charge', { pedestalKey });
  }

  alignLeyline(pedestalKey) {
    this.emitSocket('puzzle_leyline_align', { pedestalKey });
  }

  triggerQuiz(quizId) {
    this.emitSocket('trigger_quiz', { quizId });
  }

  voteQuiz(optionIndex) {
    this.emitSocket('vote_quiz', { optionIndex });
  }

  upgradeTalent(talentKey) {
    this.emitSocket('upgrade_talent', { talentKey });
  }

  advanceFloor() {
    this.emitSocket('advance_floor');
  }

  retryFloor() {
    this.emitSocket('retry_floor');
  }

  ascendNewGamePlus() {
    this.emitSocket('ascend_ng_plus');
  }

  sendChat(message, coords = null, channel = 'proximity') {
    this.emitSocket('send_chat', {
      message,
      x: coords?.x,
      y: coords?.y,
      z: coords?.z,
      channel
    });
  }
}

export const onlineNetwork = new WebRTCNetwork();
