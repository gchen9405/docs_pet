// The overlay: owns the cat's DOM, sprite frames, and horizontal movement.
// Everything here is presentation; state decisions come from state-machine.js.

import { SHEET, POSES } from './sprites.js';
import { MOTION, APPEARANCE, FLOURISH } from './config.js';
import { State } from './state-machine.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

export class PetView {
  #root;
  #sprite;
  #state = null; // set by the first setState call; null so it never matches
  #pose = POSES.sitting;
  #frameIdx = 0;
  #frameClock = 0;
  #oneShot = null; // pose of a flourish currently playing, else null
  #flourishTimer = 0;
  #x;
  #dir = -1; // -1 = facing left (the art's native direction)
  #lastTs = 0;
  #raf = 0;
  #cellPx = SHEET.cell * APPEARANCE.scale;

  mount() {
    this.#root = document.createElement('div');
    this.#root.id = 'docs-pet-root';
    this.#root.style.bottom = `${APPEARANCE.bottomPx}px`;
    this.#root.style.zIndex = String(APPEARANCE.zIndex);

    this.#sprite = document.createElement('div');
    this.#sprite.className = 'docs-pet-sprite';
    this.#sprite.style.width = `${this.#cellPx}px`;
    this.#sprite.style.height = `${this.#cellPx}px`;
    this.#sprite.style.backgroundImage = `url("${chrome.runtime.getURL(SHEET.path)}")`;
    this.#sprite.style.backgroundSize =
      `${SHEET.cols * this.#cellPx}px ${SHEET.rows * this.#cellPx}px`;

    this.#root.appendChild(this.#sprite);
    document.documentElement.appendChild(this.#root);

    this.#x = Math.max(this.#minX(), Math.min(window.innerWidth * 0.7, this.#maxX()));
    this.#applyFrame();
    this.#applyPosition();

    this.#lastTs = performance.now();
    this.#raf = requestAnimationFrame(this.#tick);
  }

  destroy() {
    cancelAnimationFrame(this.#raf);
    clearTimeout(this.#flourishTimer);
    this.#root?.remove();
  }

  setState(state) {
    if (state === this.#state) return;
    this.#state = state;
    this.#cancelFlourish();
    this.#pose = POSES[state] ?? POSES.sitting;
    this.#frameIdx = 0;
    this.#frameClock = 0;
    this.#root.style.opacity = state === State.AWAY ? String(APPEARANCE.awayOpacity) : '';
    this.#applyFrame();
    this.#scheduleFlourish();
  }

  // Flourishes are purely presentational one-shots (stand up for a look
  // around, stir in sleep) played on a random timer while a state persists.
  // The tick reverts to the state's own pose after the last frame has shown.
  #scheduleFlourish() {
    const spec = FLOURISH[this.#state];
    if (!spec) return;
    const delayMs = spec.minMs + Math.random() * (spec.maxMs - spec.minMs);
    this.#flourishTimer = setTimeout(() => {
      if (REDUCED_MOTION.matches) return;
      this.#oneShot = POSES[spec.pose];
      this.#pose = this.#oneShot;
      this.#frameIdx = 0;
      this.#frameClock = 0;
      this.#applyFrame();
    }, delayMs);
  }

  #cancelFlourish() {
    clearTimeout(this.#flourishTimer);
    this.#oneShot = null;
  }

  #minX() {
    return MOTION.edgeMarginPx;
  }

  #maxX() {
    return window.innerWidth - MOTION.edgeMarginPx - this.#cellPx;
  }

  #tick = (ts) => {
    // Clamp dt so a backgrounded tab (rAF suspended) doesn't teleport the cat.
    const dt = Math.min(ts - this.#lastTs, 100);
    this.#lastTs = ts;

    const fps = REDUCED_MOTION.matches ? Math.min(this.#pose.fps, 2) : this.#pose.fps;
    this.#frameClock += dt;
    const frameMs = 1000 / fps;
    if (this.#frameClock >= frameMs) {
      this.#frameClock %= frameMs;
      if (this.#oneShot && this.#frameIdx + 1 >= this.#pose.frames.length) {
        // Flourish finished: settle back into the state's own pose.
        this.#oneShot = null;
        this.#pose = POSES[this.#state] ?? POSES.sitting;
        this.#frameIdx = 0;
        this.#scheduleFlourish();
      } else {
        this.#frameIdx = (this.#frameIdx + 1) % this.#pose.frames.length;
      }
      this.#applyFrame();
    }

    if (this.#state === State.RUNNING && !REDUCED_MOTION.matches) {
      this.#x += this.#dir * MOTION.runSpeedPxPerSec * (dt / 1000);
      if (this.#x <= this.#minX()) {
        this.#x = this.#minX();
        this.#dir = 1;
        this.#applyFrame();
      } else if (this.#x >= this.#maxX()) {
        this.#x = this.#maxX();
        this.#dir = -1;
        this.#applyFrame();
      }
      this.#applyPosition();
    } else if (this.#x > this.#maxX()) {
      // Window shrank while the cat was parked out of bounds.
      this.#x = this.#maxX();
      this.#applyPosition();
    }

    this.#raf = requestAnimationFrame(this.#tick);
  };

  #applyFrame() {
    const col = this.#pose.frames[this.#frameIdx];
    this.#sprite.style.backgroundPosition =
      `-${col * this.#cellPx}px -${this.#pose.row * this.#cellPx}px`;
    // Art faces left; flip to face right when moving right.
    this.#sprite.style.transform = this.#dir === 1 ? 'scaleX(-1)' : '';
  }

  #applyPosition() {
    this.#root.style.transform = `translateX(${this.#x}px)`;
  }
}
