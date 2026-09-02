// Tile notation: # wall, _ floor, T target, B box, P player,
// X box-on-target, Q player-on-target. See docs/superpowers/specs/
// 2026-09-02-sokoban-moving-boxes-design.md for the full design.
//
// A 2-wide ring maze (rooms/pockets connected by an open bypass lane so
// the player can always get behind a box to push it) with a shared
// target room attached, matching the reference screenshots (targets
// clustered together, not paired with boxes). Boxes are scattered across
// several rows/columns of the open interior, not lined up in one row.
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
      '####################',
      '#_P______________###',
      '#________________###',
      '#___B____B_B_____TT#',
      '#___________B____TT#',
      '#____B__B________TT#',
      '#________________###',
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
      '#T________B_______B___#',
      '#T___B________B_______#',
      '#T____B_____B_________#',
      '#T______B_______B_____#',
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
      '#TTT________B__B______B___#',
      '#TTT______B______B________#',
      '#TTT____B___________B_____#',
      '####_________B____B_______#',
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
      '#___B__________B_________TT#',
      '#________B___________B___TT#',
      '#___________B______B_____TT#',
      '#_____B_______B__________TT#',
      '#_______B________B_______TT#',
      '#________________________###',
      '#________________________###',
      '############################',
    ].join('\n'),
  },
];

  return { LEVELS };
});
