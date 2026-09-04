import { GAME_VERSION, SAVE_VERSION } from './gameData.js';

export const SOCKET_EVENTS = Object.freeze({
  roomCreate: 'create_room',
  roomJoin: 'join_room',
  gameStart: 'start_game',
  playerInput: 'player_input',
  castSpell: 'cast_spell',
  hitEnemy: 'hit_enemy',
  interaction: 'interaction',
  snapshot: 'state_snapshot',
  actionResult: 'action_result',
  reconnect: 'reconnect_session'
});

export function createSaveEnvelope(payload, revision = 0) {
  return {
    schemaVersion: SAVE_VERSION,
    contentVersion: GAME_VERSION,
    revision,
    updatedAt: new Date().toISOString(),
    payload
  };
}

export function clampPlayerName(name, fallback = 'Apprentice') {
  const clean = String(name ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  return (clean || fallback).slice(0, 24);
}

