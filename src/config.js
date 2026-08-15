// All tunable numbers live here. Times are milliseconds.

export const TIMING = {
  // No keystrokes for this long -> the cat stops running and sits.
  typingPauseMs: 800,

  // No activity at all (keys or scrolling) for this long -> the cat sleeps.
  idleSleepMs: 4_000,

  // How often the state machine re-evaluates. Keystrokes also trigger an
  // immediate re-evaluation, so this only bounds how quickly the cat winds
  // down, not how quickly it wakes up.
  tickMs: 500,

  // After a window blur/focus/visibility event, wait this long before
  // trusting document.hasFocus(). Clicking into the editor briefly blurs the
  // top window while focus hands off to Docs' hidden iframe; sampling
  // immediately would misread that as leaving the window.
  blurSettleMs: 150,

  // How often to look for (and re-verify) Docs' hidden keystroke iframe.
  // It is created late and may be replaced by Docs at any time. The same
  // poll re-samples focus as a backstop against missed blur/focus events.
  iframePollMs: 1000,
};

// Once-in-a-while one-shot animations, keyed by the state they play in. At a
// random point in [minMs, maxMs] after the state begins (and again after each
// play), the named pose from sprites.js plays through once, then the state's
// normal loop resumes. States without an entry never flourish.
export const FLOURISH = {
  // Stand up, have a look around, sit back down. Sitting usually ends in
  // sleep before this can fire; it only lands during long sits, when
  // scrolling/reading keeps the cat awake. Short sits get the same pose
  // via PRE_SLEEP_POSE below instead.
  sitting: { pose: 'standing', minMs: 5_000, maxMs: 15_000 },

  // Lift the head, then settle back to sleep.
  sleeping: { pose: 'stirring', minMs: 10_000, maxMs: 20_000 },

  // A burst of zoomies: the gait switches and the cat bolts across the page
  // at zoomiesSpeedMult for a few loops.
  running: { pose: 'prancing', minMs: 6_150, maxMs: 15_400 },
};

// Played through once on the sitting -> sleeping transition: the cat stands
// up for one last look around, sits back down, and only then curls up. The
// timed sitting flourish above only lands during long sits; this guarantees
// the moment before every nap regardless.
export const PRE_SLEEP_POSE = 'standing';

// Played through once every time the user presses Enter: the named pose from
// sprites.js plays while the view arcs the sprite through a small vertical
// hop. Hop height is a fraction of the sprite's cell height so every cat
// jumps in proportion; duration follows the pose (frames / fps) so the arc
// and the frames stay in sync. Cats without the pose never jump.
export const NEWLINE_JUMP = {
  pose: 'jumping',
  hopHeightFrac: 0.52,
};

export const MOTION = {
  // Horizontal speed while running, CSS pixels per second.
  runSpeedPxPerSec: 130,

  // Multiplier on runSpeedPxPerSec while the zoomies flourish plays, so the
  // burst is a real dash and not just a change of gait.
  zoomiesSpeedMult: 2.2,

  // Keep this much space between the cat and the viewport edges.
  edgeMarginPx: 24,
};

export const APPEARANCE = {
  // Pixel-art zoom lives per-sprite in sprites.js, not here.

  // Distance from the bottom of the viewport.
  bottomPx: 6,

  // The cat is pointer-events: none, so a huge z-index is harmless; it just
  // keeps the cat visible above Docs dialogs and toolbars.
  zIndex: 2147483646,

  // Opacity while the window is unfocused (the cat waiting by the door).
  awayOpacity: 0.45,
};
