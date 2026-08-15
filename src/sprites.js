// The sprite library: every cat the pet can be. Each entry is self-contained
// (sheet geometry, pose frames, display scaling) so the view can swap cats
// without knowing anything about a particular sheet's layout.
//
// A pose's `frames` are [col, row] cell coordinates into the sheet; `fps` is
// playback rate. Every entry must define the three state poses: running,
// sitting, sleeping — plus the one-shot poses named by FLOURISH,
// PRE_SLEEP_POSE, and NEWLINE_JUMP in config.js (standing, stirring,
// prancing, jumping); a cat missing one simply never plays that one-shot.
// The away state needs no pose of its own: the view dims the cat and freezes
// whatever pose it was last in. `scale` is the integer
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

    // One-shot flourishes (not states — see FLOURISH / PRE_SLEEP_POSE in config.js). The pack
    // has no yawn/stretch loop, so these are the closest reads. Standing up
    // for a look around gets a theatrical beat from the "scared" row: mid
    // look-around the tail shoots straight up, holds, and settles.
    standing: {
      frames: [[0, 1], [1, 1], [2, 1], [3, 1],
               [0, 4], [1, 4], [2, 4], [2, 4], [1, 4], [0, 4],
               [4, 1], [5, 1], [6, 1], [7, 1]],
      fps: 4,
    },

    // Stirring mid-sleep (column 7 of the lying row is the raised-head
    // frame): head comes up, a slow look around the eyes-open lying frames,
    // then back down.
    stirring: {
      frames: [[7, 2], [0, 2], [1, 2], [2, 2], [3, 2], [2, 2], [1, 2], [7, 2]],
      fps: 2.5,
    },

    // The "frighten" row is a tail-straight-up trot; four fast passes while
    // the run bolts at zoomiesSpeedMult reads as a burst of zoomies.
    prancing: {
      frames: [[0, 5], [1, 5], [2, 5], [3, 5], [0, 5], [1, 5], [2, 5], [3, 5],
               [0, 5], [1, 5], [2, 5], [3, 5], [0, 5], [1, 5], [2, 5], [3, 5]],
      fps: 12,
    },

    // Enter's jump (NEWLINE_JUMP in config.js): the pack has no jump loop, so
    // the "scared" row's stiff-legged, tail-bolt-upright startle plays while
    // the view hops the sprite — a surprised boing. Frame 1 repeats on the
    // way down to round the arc out to four frames.
    jumping: { frames: [[0, 4], [1, 4], [2, 4], [1, 4]], fps: 10 },
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

  // One-shot flourishes (not states — see FLOURISH / PRE_SLEEP_POSE in config.js).
  // Stand up (the sitting-down transition played in reverse), hold upright
  // for a beat, sit back down, then sweep the head around with the
  // looking-around frames before settling.
  standing: {
    frames: [[3, 13], [2, 13], [1, 13], [0, 13], [0, 13], [1, 13], [2, 13], [3, 13],
             [4, 13], [5, 13], [6, 13], [7, 13], [4, 14]],
    fps: 3.5,
  },

  // Rise off the ground back up the laying-down block — head up, then propped
  // on the front paws ([11, 13], held for a beat) — before flopping back flat.
  stirring: {
    frames: [[10, 14], [9, 14], [8, 14], [11, 13], [11, 13], [8, 14], [9, 14], [10, 14]],
    fps: 2,
  },

  // Zoomies: four fast passes of the plain "running" gait while the run bolts
  // at zoomiesSpeedMult — long leaping strides against the usual gallop.
  prancing: {
    frames: [[16, 13], [17, 13], [18, 13], [19, 13], [16, 14],
             [16, 13], [17, 13], [18, 13], [19, 13], [16, 14],
             [16, 13], [17, 13], [18, 13], [19, 13], [16, 14],
             [16, 13], [17, 13], [18, 13], [19, 13], [16, 14]],
    fps: 14,
  },

  // Enter's jump (NEWLINE_JUMP in config.js): no jump loop in the pack
  // either, so borrow a crouch from the sitting-down transition, spring
  // through the gallop's two airborne tuck frames while the view hops the
  // sprite, and land back in the crouch.
  jumping: { frames: [[3, 13], [20, 14], [21, 14], [3, 13]], fps: 10 },
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
