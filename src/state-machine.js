// Pure timing logic, no DOM. Decides what the cat is doing from three inputs:
// when the last keystroke happened, when the last activity of any kind
// happened, and whether the window has the user.

import { TIMING } from './config.js';

export const State = {
  RUNNING: 'running',   // typing
  SITTING: 'sitting',   // paused typing, or scrolling/reading
  SLEEPING: 'sleeping', // idle long enough
  AWAY: 'away',         // window unfocused or tab hidden
};

export class PetStateMachine {
  #lastKeystroke = 0;
  #lastActivity = 0;
  #focused = true;

  constructor(now = Date.now()) {
    // Start already past the sleep threshold so the cat loads asleep and
    // wakes on the first real activity.
    this.#lastActivity = now - TIMING.idleSleepMs - 1;
  }

  noteKeystroke(now = Date.now()) {
    this.#lastKeystroke = now;
    this.#lastActivity = now;
  }

  noteActivity(now = Date.now()) {
    this.#lastActivity = now;
  }

  setFocused(focused, now = Date.now()) {
    // Coming back counts as activity: the cat was waiting, so it greets you
    // sitting rather than snapping straight to sleep off a stale timer. Only
    // a real unfocused -> focused transition counts, so the startup sync
    // doesn't wake the cat from its initial sleep.
    if (focused && !this.#focused) this.#lastActivity = now;
    this.#focused = focused;
  }

  current(now = Date.now()) {
    if (!this.#focused) return State.AWAY;
    if (now - this.#lastKeystroke < TIMING.typingPauseMs) return State.RUNNING;
    if (now - this.#lastActivity > TIMING.idleSleepMs) return State.SLEEPING;
    return State.SITTING;
  }
}
