// The overlay: owns the cat's DOM, sprite frames, and horizontal movement.
// Everything here is presentation; state decisions come from state-machine.js.

import { SHEET, POSES } from './sprites.js';
import { MOTION, APPEARANCE } from './config.js';
import { State } from './state-machine.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

export class PetView {
  #root;
  #sprite;
  #state = State.SITTING;
  #pose = POSES.sitting;
  #frameIdx = 0;
  #frameClock = 0;
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
    this.#root?.remove();
  }

  setState(state) {
    if (state === this.#state) return;
    this.#state = state;
    this.#pose = POSES[state] ?? POSES.sitting;
    this.#frameIdx = 0;
    this.#frameClock = 0;
    this.#root.style.opacity = state === State.AWAY ? String(APPEARANCE.awayOpacity) : '';
    this.#applyFrame();
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
      this.#frameIdx = (this.#frameIdx + 1) % this.#pose.frames.length;
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
