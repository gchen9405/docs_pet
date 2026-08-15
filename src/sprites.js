// Metadata for the vendored sprite sheet (assets/cat/cat-Sheet.png).
// "Free Pixel Animation - Cat [6 loops]" by Zeenaz, CC0 — see
// assets/cat/LICENSE.md. The sheet is a strict 16px grid, 8 columns by
// 6 rows; the cat faces left in every frame.

export const SHEET = {
  path: 'assets/cat/cat-Sheet.png',
  cell: 16,
  cols: 8,
  rows: 6,
};

// The sheet's rows: 0 sit (4f), 1 stand/idle (8f), 2 lie/sleep (8f),
// 3 walk (5f), 4 scared (3f), 5 frighten (4f). The pet uses three of them.
// `frames` are column indices within the row; `fps` is playback rate.
export const POSES = {
  // The walk cycle played fast reads as a trot/run.
  running: { row: 3, frames: [0, 1, 2, 3, 4], fps: 12 },

  // Seated with a slow tail swish.
  sitting: { row: 0, frames: [0, 1, 2, 3], fps: 2.5 },

  // Only the eyes-closed frames of the lying row (columns 4-6).
  sleeping: { row: 2, frames: [4, 5, 6], fps: 1 },

  // Away reuses the seated pose, dimmed by the view; a single still frame
  // so the cat visibly "switches off" when you leave.
  away: { row: 0, frames: [0], fps: 1 },

  // One-shot flourishes (not states — see FLOURISH in config.js). The pack
  // has no yawn/stretch loop, so these are the closest reads: standing up
  // for a look around, and stirring mid-sleep (column 7 of the lying row is
  // the raised-head frame).
  standing: { row: 1, frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 3 },
  stirring: { row: 2, frames: [7, 0, 1, 7], fps: 2 },

  // The "frighten" row is a tail-straight-up trot; two passes of it while
  // the run keeps moving reads as a burst of zoomies.
  prancing: { row: 5, frames: [0, 1, 2, 3, 0, 1, 2, 3], fps: 10 },
};

// Base art faces left; the view flips with scaleX(-1) to face right.
export const FACES_LEFT = true;
