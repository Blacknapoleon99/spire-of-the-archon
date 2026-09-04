import { io } from 'socket.io-client';

/**
 * Socket.io Multiplayer Networking Client
 */
export class NetworkClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.roomId = null;
    this.localPlayerId = null;
    this.isHost = false;

    // Callbacks
    this.callbacks = {};
  }

  connect() {
    if (this.socket) return;

    // Connect to current host origin or default port 3000
    const serverUrl = window.location.port === '5173'
      ? 'http://localhost:3000'
      : window.location.origin;

    this.socket = io(serverUrl);

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.localPlayerId = this.socket.id;
      console.log(`[Network] Connected to Spire Host with ID: ${this.localPlayerId}`);
      this.trigger('connect', { id: this.socket.id });
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('[Network] Disconnected from Spire Host');
      this.trigger('disconnect');
    });

    // Room events
    this.socket.on('room_created', (data) => {
      this.roomId = data.roomId;
      this.isHost = true;
      this.trigger('room_created', data);
    });

    this.socket.on('room_joined', (data) => {
      this.roomId = data.roomId;
      this.isHost = data.isHost;
      this.trigger('room_joined', data);
    });

    this.socket.on('player_joined', (data) => this.trigger('player_joined', data));
    this.socket.on('player_left', (data) => this.trigger('player_left', data));
    this.socket.on('promoted_to_host', () => {
      this.isHost = true;
      this.trigger('promoted_to_host');
    });
    this.socket.on('error_message', (data) => this.trigger('error_message', data));
    this.socket.on('game_started', (data) => this.trigger('game_started', data));

    // Gameplay sync
    this.socket.on('state_snapshot', (data) => this.trigger('state_snapshot', data));
    this.socket.on('spell_cast', (data) => this.trigger('spell_cast', data));
    this.socket.on('floating_text', (data) => this.trigger('floating_text', data));
    this.socket.on('enemy_attack', (data) => this.trigger('enemy_attack', data));
    this.socket.on('player_died', (data) => this.trigger('player_died', data));
    this.socket.on('player_respawned', (data) => this.trigger('player_respawned', data));
    this.socket.on('enemy_defeated', (data) => this.trigger('enemy_defeated', data));
    this.socket.on('boss_special', (data) => this.trigger('boss_special', data));

    // Puzzles & Quizzes
    this.socket.on('puzzle_update', (data) => this.trigger('puzzle_update', data));
    this.socket.on('quiz_start', (data) => this.trigger('quiz_start', data));
    this.socket.on('quiz_votes_update', (data) => this.trigger('quiz_votes_update', data));
    this.socket.on('quiz_result', (data) => this.trigger('quiz_result', data));

    // Progression & Chat
    this.socket.on('talent_updated', (data) => this.trigger('talent_updated', data));
    this.socket.on('floor_changed', (data) => this.trigger('floor_changed', data));
    this.socket.on('story_message', (data) => this.trigger('story_message', data));
    this.socket.on('chat_message', (data) => this.trigger('chat_message', data));
    this.socket.on('game_victory', (data) => this.trigger('game_victory', data));
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

  // Emits
  createRoom(playerName, wizardClass, roomCode) {
    this.socket.emit('create_room', { playerName, wizardClass, roomCode });
  }

  joinRoom(playerName, wizardClass, roomCode) {
    this.socket.emit('join_room', { playerName, wizardClass, roomCode });
  }

  startGame() {
    this.socket.emit('start_game');
  }

  sendInput(data) {
    if (this.isConnected) {
      this.socket.emit('player_input', data);
    }
  }

  castSpell(spellData) {
    if (this.isConnected) {
      this.socket.emit('cast_spell', spellData);
    }
  }

  hitEnemy(enemyId, damage, element) {
    if (this.isConnected) {
      this.socket.emit('hit_enemy', { enemyId, damage, element });
    }
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

  sendChat(message) {
    this.socket.emit('send_chat', { message });
  }

  takeHazardDamage(damage) {
    this.socket.emit('hazard_damage', { damage });
  }
}

export const networkClient = new NetworkClient();
