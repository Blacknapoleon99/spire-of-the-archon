import { io } from 'socket.io-client';

console.log('Testing updated multiplayer RPG simulation (Luminary Healer + Pyromancer DPS)...');

const serverUrl = 'http://localhost:3000';

const hostSocket = io(serverUrl);
const client2Socket = io(serverUrl);

let roomCode = null;

hostSocket.on('connect', () => {
  console.log('✓ Host connected to server with ID:', hostSocket.id);
  hostSocket.emit('create_room', {
    playerName: 'Archmage Robin',
    wizardClass: 'luminary', // Holy Trinity Healer!
    roomCode: 'ARCHONRPG'
  });
});

hostSocket.on('room_created', (data) => {
  roomCode = data.roomId;
  console.log(`✓ Room created successfully: ${roomCode} with class: ${data.player.wizardClass}`);

  client2Socket.emit('join_room', {
    playerName: 'Pyromancer Ignis',
    wizardClass: 'pyromancer', // Holy Trinity DPS!
    roomCode: roomCode
  });
});

client2Socket.on('room_joined', (data) => {
  console.log(`✓ Client 2 joined room ${data.roomId}! Party size: ${data.players.length}`);
  hostSocket.emit('start_game');
});

hostSocket.on('game_started', (data) => {
  console.log(`✓ Game started on Floor ${data.floor}! Total wizards: ${data.players.length}`);

  // Test Luminary Healer skill
  hostSocket.emit('cast_spell', {
    spellId: 'radiant_heal',
    spellType: 'skill1',
    origin: { x: 0, y: 1, z: 15 },
    direction: { x: 0, y: 0, z: -1 },
    damage: 0,
    heal: 90,
    element: 'light',
    manaCost: 30
  });

  // Test Pyromancer DPS skill
  client2Socket.emit('cast_spell', {
    spellId: 'fireball',
    spellType: 'skill1',
    origin: { x: 2, y: 1, z: 15 },
    direction: { x: 0, y: 0, z: -1 },
    damage: 75,
    element: 'fire',
    manaCost: 25
  });

  // Test quiz trigger
  hostSocket.emit('trigger_quiz', { quizId: 'f1_riddle_1' });
});

client2Socket.on('spell_cast', (data) => {
  console.log(`✓ Client 2 received spell_cast broadcast: ${data.spellId} (${data.element})`);
});

client2Socket.on('quiz_start', (data) => {
  console.log(`✓ Quiz started: "${data.quiz.title}"`);
  hostSocket.emit('vote_quiz', { optionIndex: 0 });
  client2Socket.emit('vote_quiz', { optionIndex: 0 });
});

hostSocket.on('quiz_result', (data) => {
  console.log(`✓ Quiz Result evaluated! isCorrect: ${data.isCorrect}, Reward:`, data.reward);
  client2Socket.emit('send_chat', { message: 'Holy healing received! The path is clear.' });
});

hostSocket.on('chat_message', (data) => {
  console.log(`✓ In-game chat received: [${data.sender}]: "${data.message}"`);
  console.log('\n🌟 ALL FULL-SCALE RPG MULTIPLAYER SIMULATION CHECKS PASSED! 🌟\n');

  hostSocket.disconnect();
  client2Socket.disconnect();
  process.exit(0);
});

setTimeout(() => {
  console.error('Test timed out after 10 seconds');
  process.exit(1);
}, 10000);
