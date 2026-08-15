// Wires signals -> state machine -> view. Keystrokes re-evaluate immediately
// so the cat starts running on the first key; winding down (sit, sleep) rides
// the slower tick. The chosen cat comes from chrome.storage.sync (set by the
// toolbar popup) and swaps live when changed.

import { TIMING } from './config.js';
import { SPRITES, DEFAULT_SPRITE_ID, SPRITE_STORAGE_KEY } from './sprites.js';
import { Signals } from './signals.js';
import { PetStateMachine } from './state-machine.js';
import { PetView } from './pet.js';

if (!window.__docsPetStarted) {
  window.__docsPetStarted = true;

  const stored = await chrome.storage.sync.get(SPRITE_STORAGE_KEY);
  const spriteId = stored[SPRITE_STORAGE_KEY];
  const sprite = SPRITES[spriteId] ?? SPRITES[DEFAULT_SPRITE_ID];

  const machine = new PetStateMachine();
  const view = new PetView(sprite);
  const signals = new Signals();

  const sync = () => view.setState(machine.current());

  signals.addEventListener('keystroke', () => {
    machine.noteKeystroke();
    sync();
  });
  // Fires after the same key's "keystroke" above, so the state (and thus the
  // pose the jump interrupts and returns to) is already up to date.
  signals.addEventListener('newline', () => {
    view.jump();
  });
  signals.addEventListener('activity', () => {
    machine.noteActivity();
  });
  signals.addEventListener('focuschange', (e) => {
    machine.setFocused(e.detail);
    sync();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !(SPRITE_STORAGE_KEY in changes)) return;
    const next = SPRITES[changes[SPRITE_STORAGE_KEY].newValue];
    if (next) view.setSprite(next);
  });

  view.mount();
  signals.start();
  machine.setFocused(signals.focused);
  sync();
  setInterval(sync, TIMING.tickMs);
}
