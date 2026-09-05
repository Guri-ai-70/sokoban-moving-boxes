// Tile notation: # wall, _ floor, T target, B box, P player,
// X box-on-target, Q player-on-target. See docs/superpowers/specs/
// 2026-09-02-sokoban-moving-boxes-design.md for the full design.
//
// Every level below is an exact, cell-for-cell transcription of the
// original game's own level-design spreadsheets (level 0N.xlsx): wall/
// box/target/player cells were read directly from the spreadsheet's cell
// fills and text, one xlsx per level, interior walls included exactly as
// drawn (the box "pockets" and dividers are real, not simplified away).
// The renderer (js/render.js) is what decides which '#' cells actually
// look like brick -- see the note there.

(function (global, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') global.SokobanLevels = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {

const LEVELS = [
  {
    floor: 1,
    name: 'Floor 1',
    text: [
      '###################',
      '#####___###########',
      '#####B__###########',
      '#####__B###########',
      '###__B_B_##########',
      '###_#_##_#___######',
      '#___#_##_#####__TT#',
      '#_B__B__________TT#',
      '#####_###_#P##__TT#',
      '#####_____#########',
      '###################',
    ].join('\n'),
  },
  {
    floor: 2,
    name: 'Floor 2',
    text: [
      '##############',
      '#TT__#_____###',
      '#TT__#_B__B__#',
      '#TT__#B####__#',
      '#TT______##__#',
      '#TT__#_#_PB_##',
      '######_##B_B_#',
      '###_B__B_B_B_#',
      '###____#_____#',
      '##############',
    ].join('\n'),
  },
  {
    floor: 3,
    name: 'Floor 3',
    text: [
      '#################',
      '#########____P_##',
      '#########_B#B_###',
      '#########_B__B###',
      '##########B_B_###',
      '#########_B_#_###',
      '#TTTT__##_B__B__#',
      '##TTT____B__B___#',
      '#TTTT__##########',
      '#################',
    ].join('\n'),
  },
  {
    floor: 4,
    name: 'Floor 4',
    text: [
      '###################',
      '############__TTTT#',
      '############__TTTT#',
      '#____#__B_B___TTTT#',
      '#_BBB#B__B_#__TTTT#',
      '#__B_____B_#__TTTT#',
      '#_BB_#B_B_B########',
      '#__B_#_____########',
      '##_################',
      '#____#____#########',
      '#_____B___#########',
      '#__BB#BB_P_########',
      '#____#____#########',
      '###################',
    ].join('\n'),
  },
  {
    floor: 5,
    name: 'Floor 5',
    text: [
      '#################',
      '#########___#####',
      '#########_#B##__#',
      '#########_____B_#',
      '#########_###___#',
      '#TTTT__##_B__B###',
      '#TTTT____B_BB_###',
      '#TTTT__##B__B_P##',
      '#########__B__###',
      '#########_B_B__##',
      '###########_##_##',
      '###########____##',
      '#################',
    ].join('\n'),
  },
  {
    floor: 6,
    name: 'Floor 6',
    // Exact transcription of the user's own level 06.xlsx (replacing an
    // earlier procedurally-generated floor 6) -- same spreadsheet legend
    // as floors 1-5: wall/box/target/player read from cell fills/text.
    // One correction confirmed by the user: (6,0),(7,0),(6,1) were floor
    // in the raw transcription but fully walled off from the rest of the
    // level (the player can never reach them) -- a disconnected cyan
    // pocket floating above-left of the player with no gameplay purpose,
    // so it's sealed as wall instead.
    text: [
      '############',
      '#TT__####P##',
      '#TT__###___#',
      '#TT_____BB_#',
      '#TT__#_#_B_#',
      '#TT###_#_B_#',
      '####_B_#B__#',
      '####__B#_B_#',
      '####_B__B__#',
      '####__##___#',
      '############',
    ].join('\n'),
  },
  {
    floor: 7,
    name: 'Floor 7',
    // Exact transcription of the user's own level 07.xlsx, with one
    // correction confirmed by the user: the spreadsheet marked 12 cells
    // as targets (a full 4x3 rectangle) but only placed 11 boxes, which
    // is unsolvable -- one cell in that rectangle (the one directly
    // below-left of the lone box sitting above the block) was a stray
    // target that shouldn't have been there, not a missing box.
    text: [
      '#############',
      '########___##',
      '##_#_P##_BB_#',
      '#____B______#',
      '#__B__###___#',
      '###_#####B###',
      '#_B__###_TT##',
      '#_B_B_B_TTT##',
      '#____###TTT##',
      '#_BB_#_#TTT##',
      '#__###_######',
      '#############',
    ].join('\n'),
  },
  {
    floor: 8,
    name: 'Floor 8',
    // Exact transcription of the user's own level 08.xlsx -- same
    // spreadsheet legend as floors 1-7.
    text: [
      '################',
      '###__###########',
      '###____B___B_B_#',
      '###_B#_B_#__B__#',
      '###__B_B__#____#',
      '#_#_B#_#__####_#',
      '#_#B_B_B__##___#',
      '#___PB_#B#___#_#',
      '#___B____B_B_B_#',
      '#####__#########',
      '###______#######',
      '###______#######',
      '###TTTTTT#######',
      '###TTTTTT#######',
      '###TTTTTT#######',
      '################',
    ].join('\n'),
  },
  {
    floor: 9,
    name: 'Floor 9',
    // Exact transcription of the user's own level 09.xlsx, with one
    // correction confirmed by the user: the spreadsheet marked 15 cells
    // as targets (a full 5x3 rectangle, P4:R8) but only placed 14 boxes,
    // intentionally (per the user). The 15th cell (the middle column of
    // the block's middle row, Q6) is plain floor, not a wall -- every
    // other row/column in the block is a real target.
    text: [
      '#################',
      '###########__TTT#',
      '###########__TTT#',
      '#######______T_T#',
      '#######__##__TTT#',
      '########_##__TTT#',
      '########_########',
      '######_BBB_######',
      '######__B_B_#####',
      '##___#B_B___#___#',
      '#P_B__B____B__B_#',
      '######_BB_B_#####',
      '######______#####',
      '#################',
    ].join('\n'),
  },
  {
    floor: 10,
    name: 'Floor 10',
    // Exact transcription of the user's own level 10.xlsx -- 32 boxes
    // and 32 targets split across two separate target areas (a tall
    // 3-wide column on the right, and a small 2-wide block on the lower
    // left), unlike every earlier floor's single target cluster. Box
    // and target counts matched exactly this time, no correction needed.
    text: [
      '####___############',
      '##_#####______#___#',
      '#_PB___BB__B_B_TTT#',
      '#_BBBB#____B__#TTT#',
      '#_B___#_BB_BB_#TTT#',
      '###___#__B____#TTT#',
      '#_____#_B_B_B_#TTT#',
      '#____######_###TTT#',
      '##_#__#__B_B__#TTT#',
      '#__##_#_BB_B_B##TT#',
      '#_TT#_#__B______#T#',
      '#_TT#_#_BBB_BBB_#T#',
      '#####_#_______#_#T#',
      '#####_#########_#T#',
      '#####___________#T#',
      '###################',
    ].join('\n'),
  },
];

  return { LEVELS };
});
