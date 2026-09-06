// Display names are cosmetic and need not be unique. Only the relay identity
// may select the invisible first-person avatar.
export function resolveLocalPlayerId(players, socketId, acknowledgedId) {
  if (socketId && players.some(player => player.id === socketId)) return socketId;
  if (acknowledgedId && players.some(player => player.id === acknowledgedId)) return acknowledgedId;
  return null;
}
