// Tile notation: # wall, _ floor, T target, B box, P player,
// X box-on-target, Q player-on-target. See docs/superpowers/specs/
// 2026-09-02-sokoban-moving-boxes-design.md for the full design.
//
// A 2-wide ring maze with a shared target room attached, matching the
// reference screenshots (targets clustered together, not paired with
// boxes). Each box sits in its own walled vertical pocket ("tooth") off
// a shared bottom corridor — a real chamber, not just a spot in an open
// room — so pushing a box out means walking to below its own pocket and
// pushing straight up into the ring's inner lane. Verified solvable by
// literally simulating a correct 2D solve — with BFS-pathfound player
// movement between push segments, so turns/loops are handled, not just
// straight corridors — against the real engine.

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
      '####################',
      '#_P______________###',
      '#________________###',
      '#__#B#_#_#B#_#___TT#',
      '#__#_#B#_#_#B#___TT#',
      '#_______B_____B__TT#',
      '#________________###',
      '####################',
    ].join('\n'),
  },
  {
    floor: 2,
    name: 'The Long Column',
    text: [
      '#######################',
      '##__________________P_#',
      '##____________________#',
      '#T___#_#_#B#_#_#_#B#__#',
      '#T___#B#_#_#_#B#_#_#__#',
      '#T___#_#B#_#_#_#B#_#__#',
      '#T__B#_#_#_#B#_#_#_#__#',
      '#T___#_#_#_#_#_#_#_#__#',
      '#T___#_#_#_#_#_#_#_#__#',
      '#T____________________#',
      '#T____________________#',
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
      '#TTT___#_#B#_#_#B#_#_#B#__#',
      '#TTT___#B#_#_#B#_#_#B#_#__#',
      '#TTT__B_____B_____B_______#',
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
      '#__#B#_#_#_#B#_#_#_#B#___TT#',
      '#__#_#_#B#_#_#_#B#_#_#___TT#',
      '#__#_#B#_#_#_#B#_#_#_#B__TT#',
      '#__#_#_#_#B#_#_#_#B#_#___TT#',
      '#________________________TT#',
      '#________________________###',
      '############################',
    ].join('\n'),
  },
];

  return { LEVELS };
});
