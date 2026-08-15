// All tunable numbers live here. Times are milliseconds.

export const TIMING = {
  // No keystrokes for this long -> the cat stops running and sits.
  typingPauseMs: 1500,

  // No activity at all (keys or scrolling) for this long -> the cat sleeps.
  idleSleepMs: 7_000,

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
  // It is created late and may be replaced by Docs at any time.
  iframePollMs: 1000,
};

export const MOTION = {
  // Horizontal speed while running, CSS pixels per second.
  runSpeedPxPerSec: 130,

  // Keep this much space between the cat and the viewport edges.
  edgeMarginPx: 24,
};

export const APPEARANCE = {
  // Integer scale factor for the 16px sprite (4 -> 64px cat).
  scale: 4,

  // Distance from the bottom of the viewport.
  bottomPx: 6,

  // The cat is pointer-events: none, so a huge z-index is harmless; it just
  // keeps the cat visible above Docs dialogs and toolbars.
  zIndex: 2147483646,

  // Opacity while the window is unfocused (the cat waiting by the door).
  awayOpacity: 0.45,
};
