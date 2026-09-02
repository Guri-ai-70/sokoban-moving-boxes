// Tile notation: # wall, _ floor, T target, B box, P player,
// X box-on-target, Q player-on-target. See docs/superpowers/specs/
// 2026-09-02-sokoban-moving-boxes-design.md for the full design.
//
// Levels 1-3: a 2-wide ring maze (rooms/pockets connected by an open
// bypass lane so the player can always get behind a box to push it)
// with a shared target room attached, matching the reference
// screenshots (targets clustered together, not paired with boxes).
// Verified solvable by literally simulating a correct 2D solve — with
// BFS-pathfound player movement between push segments, so turns/loops
// are handled, not just straight corridors — against the real engine.

(function (global, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanLevels = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {

const LEVELS = [
  {
    floor: 1,
    name: 'The Ring',
    text: [
      '###################',
      '#_P_____________###',
      '#_______________###',
      '#_______________TT#',
      '#__B_B_B_B_B_B__TT#',
      '#_______________TT#',
      '#___#########___###',
      '#__###########__###',
      '#_______________###',
      '#_______________###',
      '###################',
    ].join('\n'),
  },
  {
    floor: 2,
    name: 'The Long Column',
    text: [
      '#######################',
      '##__________________P_#',
      '##____________________#',
      '#T____________________#',
      '#T___B_B_B_B_B_B_B_B__#',
      '#T____________________#',
      '#T____________________#',
      '#T____________________#',
      '#T____________________#',
      '#T____________________#',
      '#T____________________#',
      '##____________________#',
      '##____________________#',
      '#######################',
    ].join('\n'),
  },
  {
    floor: 3,
    name: 'The Nine Vault',
    text: [
      '###########################',
      '####____________________P_#',
      '####______________________#',
      '#TTT______________________#',
      '#TTT___B_B_B_B_B_B_B_B_B__#',
      '#TTT______________________#',
      '####______________________#',
      '####__##################__#',
      '####______________________#',
      '####______________________#',
      '###########################',
    ].join('\n'),
  },
  {
    floor: 4,
    name: 'The Ten Vault',
    text: [
      '############################',
      '#_P______________________###',
      '#________________________###',
      '#________________________TT#',
      '#__B_B_B_B_B_B_B_B_B_B___TT#',
      '#________________________TT#',
      '#________________________TT#',
      '#________________________TT#',
      '#________________________###',
      '#________________________###',
      '############################',
    ].join('\n'),
  },
];

  return { LEVELS };
});
