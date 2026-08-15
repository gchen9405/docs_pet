// Wires signals -> state machine -> view. Keystrokes re-evaluate immediately
// so the cat starts running on the first key; winding down (sit, sleep) rides
// the slower tick.

import { TIMING } from './config.js';
import { Signals } from './signals.js';
import { PetStateMachine } from './state-machine.js';
import { PetView } from './pet.js';

if (!window.__docsPetStarted) {
  window.__docsPetStarted = true;

  const machine = new PetStateMachine();
  const view = new PetView();
  const signals = new Signals();

  const sync = () => view.setState(machine.current());

  signals.addEventListener('keystroke', () => {
    machine.noteKeystroke();
    sync();
  });
  signals.addEventListener('activity', () => {
    machine.noteActivity();
  });
  signals.addEventListener('focuschange', (e) => {
    machine.setFocused(e.detail);
    sync();
  });

  view.mount();
  signals.start();
  machine.setFocused(signals.focused);
  sync();
  setInterval(sync, TIMING.tickMs);
}
