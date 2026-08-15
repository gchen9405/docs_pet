// The sprite library: every cat the pet can be. Each entry is self-contained
// (sheet geometry, pose frames, display scaling) so the view can swap cats
// without knowing anything about a particular sheet's layout.
//
// A pose's `frames` are [col, row] cell coordinates into the sheet; `fps` is
// playback rate. Every entry must define all four state poses: running,
// sitting, sleeping, away — plus the one-shot flourish poses named by
// FLOURISH in config.js (standing, stirring, prancing); a cat missing a
// flourish pose simply never plays that flourish. `scale` is the integer
// pixel-art zoom in the page, `previewScale` the smaller zoom used by the
// popup picker. `baselineGap` is how many transparent sheet pixels sit
// between the cat's feet and the bottom edge of its cell; the view shifts
// the sprite down by that much so every cat stands on the same line.

// --- "Free Pixel Animation - Cat [6 loops]" by Zeenaz, CC0 — see
// assets/cat/LICENSE.md. Strict 16px grid, 8 cols by 6 rows, cat faces left.
// Rows: 0 sit (4f), 1 stand/idle (8f), 2 lie/sleep (8f), 3 walk (5f),
// 4 scared (3f), 5 frighten (4f).
const PIXEL = {
  name: 'Pixel',
  sheet: { path: 'assets/cat/cat-Sheet.png', cell: 16, cols: 8, rows: 6 },
  scale: 4,
  previewScale: 3,
  baselineGap: 0,
  facesLeft: true,
  poses: {
    // The walk cycle played fast reads as a trot/run.
    running: { frames: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]], fps: 12 },

    // Seated with a slow tail swish.
    sitting: { frames: [[0, 0], [1, 0], [2, 0], [3, 0]], fps: 2.5 },

    // Only the eyes-closed frames of the lying row (columns 4-6).
    sleeping: { frames: [[4, 2], [5, 2], [6, 2]], fps: 1 },

    // Away reuses the seated pose, dimmed by the view; a single still frame
    // so the cat visibly "switches off" when you leave.
    away: { frames: [[0, 0]], fps: 1 },

    // One-shot flourishes (not states — see FLOURISH in config.js). The pack
    // has no yawn/stretch loop, so these are the closest reads: standing up
    // for a look around, and stirring mid-sleep (column 7 of the lying row
    // is the raised-head frame).
    standing: {
      frames: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]],
      fps: 3,
    },
    stirring: { frames: [[7, 2], [0, 2], [1, 2], [7, 2]], fps: 2 },

    // The "frighten" row is a tail-straight-up trot; two passes of it while
    // the run keeps moving reads as a burst of zoomies.
    prancing: {
      frames: [[0, 5], [1, 5], [2, 5], [3, 5], [0, 5], [1, 5], [2, 5], [3, 5]],
      fps: 10,
    },
  },
};

// --- "Cats || Pixel Asset Pack" by Pop Shop Packs — see
// assets/popshop-cats/LICENSE.md. All color sheets share one layout:
// 1024x544 on a 32px grid, row 0 is header labels, then eight viewing
// directions of two rows each (main row + spillover row beneath). Rows
// 13/14 are the left-facing side view. Each animation is a 4-column block:
// sitting-down 0-3, looking-around 4-7, laying-down 8-11, walking 12-15,
// running 16-19, running 2.0 (8f gallop) 20-23.
const POPSHOP_POSES = {
  // The 8-frame "running 2.0" gallop: main row, then its spillover row.
  running: {
    frames: [[20, 13], [21, 13], [22, 13], [23, 13],
             [20, 14], [21, 14], [22, 14], [23, 14]],
    fps: 14,
  },

  // "Looking around": seated, idly turning its head.
  sitting: { frames: [[4, 13], [5, 13], [6, 13], [7, 13], [4, 14]], fps: 2 },

  // The last two "laying down" frames: flat on the ground, slow breathing.
  sleeping: { frames: [[10, 14], [11, 14]], fps: 0.8 },

  // Single neutral seated frame, dimmed by the view.
  away: { frames: [[4, 13]], fps: 1 },

  // One-shot flourishes (not states — see FLOURISH in config.js).
  // Stand up (the sitting-down transition played in reverse), pause upright,
  // then sit back down.
  standing: {
    frames: [[3, 13], [2, 13], [1, 13], [0, 13], [1, 13], [2, 13], [3, 13], [0, 14]],
    fps: 3,
  },

  // Lift the head off the ground (the laying-down block's head-up frames),
  // then settle back flat.
  stirring: { frames: [[9, 14], [8, 14], [9, 14], [10, 14]], fps: 2 },

  // Zoomies: two passes of the plain "running" gait, a visible burst against
  // the gallop the running state normally plays.
  prancing: {
    frames: [[16, 13], [17, 13], [18, 13], [19, 13], [16, 14],
             [16, 13], [17, 13], [18, 13], [19, 13], [16, 14]],
    fps: 10,
  },
};

function popshopCat(name, file) {
  return {
    name,
    sheet: { path: `assets/popshop-cats/${file}`, cell: 32, cols: 32, rows: 17 },
    scale: 3,
    previewScale: 2,
    baselineGap: 8,
    facesLeft: true,
    poses: POPSHOP_POSES,
  };
}

export const SPRITES = {
  pixel: PIXEL,
  tabby: popshopCat('Tabby', 'orange_0.png'),
  calico: popshopCat('Calico', 'calico_0.png'),
  siamese: popshopCat('Siamese', 'seal_point_0.png'),
  smokey: popshopCat('Smokey', 'grey_0.png'),
  snowball: popshopCat('Snowball', 'white_0.png'),
  latte: popshopCat('Latte', 'creme_0.png'),
  ghost: popshopCat('Ghost', 'ghost_0.png'),
};

export const DEFAULT_SPRITE_ID = 'pixel';

// The chrome.storage.sync key holding the chosen sprite id.
export const SPRITE_STORAGE_KEY = 'spriteId';
