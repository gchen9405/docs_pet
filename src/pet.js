// The overlay: owns the cat's DOM, sprite frames, and horizontal movement.
// Everything here is presentation; state decisions come from state-machine.js
// and which cat to draw comes from the sprite library (sprites.js).

import { MOTION, APPEARANCE, FLOURISH, PRE_SLEEP_POSE, NEWLINE_JUMP } from './config.js';
import { State } from './state-machine.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

export class PetView {
  #def;
  #root;
  #hop; // wrapper between root and sprite; carries the jump's vertical arc
  #sprite;
  #state = null; // set by the first setState call; null so it never matches
  #restState = State.SITTING; // last non-away state; away shows this pose dimmed
  #pose; // set by #applySprite during mount
  #frameIdx = 0;
  #frameClock = 0;
  #oneShot = null; // pose of a flourish currently playing, else null
  #flourishTimer = 0;
  #x;
  #dir = -1; // -1 = facing left (every vendored sheet's native direction)
  #lastTs = 0;
  #raf = 0;
  #cellPx = 0;

  constructor(def) {
    this.#def = def;
  }

  mount() {
    this.#root = document.createElement('div');
    this.#root.id = 'docs-pet-root';
    this.#root.style.bottom = `${APPEARANCE.bottomPx}px`;
    this.#root.style.zIndex = String(APPEARANCE.zIndex);

    this.#sprite = document.createElement('div');
    this.#sprite.className = 'docs-pet-sprite';

    // root moves horizontally, hop moves vertically, sprite holds the frame
    // transform (baseline drop + flip) — three layers so none clobbers
    // another's transform.
    this.#hop = document.createElement('div');
    this.#hop.className = 'docs-pet-hop';
    this.#hop.appendChild(this.#sprite);
    this.#root.appendChild(this.#hop);
    document.documentElement.appendChild(this.#root);

    this.#applySprite();
    this.#x = Math.max(this.#minX(), Math.min(window.innerWidth * 0.7, this.#maxX()));
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
    // Nodding off is announced: sit -> sleep first plays the pre-sleep pose
    // through once as a one-shot, and the tick settles into the sleeping loop
    // when it ends (scheduling the sleep flourish as with any one-shot).
    const preSleep =
      state === State.SLEEPING && this.#state === State.SITTING && !REDUCED_MOTION.matches
        ? this.#def.poses[PRE_SLEEP_POSE]
        : undefined;
    this.#state = state;
    if (state !== State.AWAY) this.#restState = state;
    // Going away mid-loop freezes on the frame currently showing; a flourish
    // in flight belongs to another pose, so then restart the rest pose instead.
    // A timed sitting flourish caught mid-play by the sleep transition keeps
    // its frame and simply becomes the pre-sleep one-shot, not a restart.
    const keepFrame =
      (state === State.AWAY && !this.#oneShot) ||
      (preSleep !== undefined && this.#oneShot === preSleep);
    this.#cancelFlourish();
    this.#oneShot = preSleep ?? null;
    this.#pose = preSleep ?? this.#poseFor();
    if (!keepFrame) {
      this.#frameIdx = 0;
      this.#frameClock = 0;
    }
    this.#root.style.opacity = state === State.AWAY ? String(APPEARANCE.awayOpacity) : '';
    this.#applyFrame();
    if (!preSleep) this.#scheduleFlourish();
  }

  // The pose for the current state. Away has none of its own: the cat keeps
  // the pose of whatever it was last doing, dimmed and frozen by the view.
  #poseFor() {
    return this.#def.poses[this.#restState] ?? this.#def.poses.sitting;
  }

  // Flourishes are purely presentational one-shots (stir in sleep, zoomies
  // mid-run) played on a random timer while a state persists. The tick
  // reverts to the state's own pose after the last frame has shown.
  #scheduleFlourish() {
    const spec = FLOURISH[this.#state];
    if (!spec || !this.#def.poses[spec.pose]) return;
    const delayMs = spec.minMs + Math.random() * (spec.maxMs - spec.minMs);
    this.#flourishTimer = setTimeout(() => {
      if (REDUCED_MOTION.matches) return;
      this.#oneShot = this.#def.poses[spec.pose];
      this.#pose = this.#oneShot;
      this.#frameIdx = 0;
      this.#frameClock = 0;
      this.#applyFrame();
    }, delayMs);
  }

  #cancelFlourish() {
    clearTimeout(this.#flourishTimer);
    this.#oneShot = null;
    // A dropped jump must not keep arcing under whatever pose replaced it.
    this.#hop.style.animation = '';
  }

  // Triggered one-shot (the user pressed Enter): play the jumping pose while
  // the hop wrapper arcs the sprite through the air, both sized to end
  // together. Skipped while away (the frame loop is frozen), under reduced
  // motion, mid-jump (mashing Enter doesn't stutter the arc), and for cats
  // without the pose.
  jump() {
    const pose = this.#def.poses[NEWLINE_JUMP.pose];
    if (!pose || this.#oneShot === pose) return;
    if (this.#state === State.AWAY || REDUCED_MOTION.matches) return;
    this.#cancelFlourish();
    this.#oneShot = pose;
    this.#pose = pose;
    this.#frameIdx = 0;
    this.#frameClock = 0;
    this.#applyFrame();
    const durationMs = (pose.frames.length / pose.fps) * 1000;
    // Force a restart in case the previous jump's arc is still finishing.
    void this.#hop.offsetWidth;
    this.#hop.style.animation = `docs-pet-hop ${durationMs}ms both`;
  }

  // Swap to a different cat mid-run; keeps position, direction, and state.
  // Any flourish in flight belongs to the old sheet, so it is dropped and a
  // fresh one scheduled against the new cat's poses.
  setSprite(def) {
    if (def === this.#def) return;
    this.#def = def;
    if (!this.#root) return;
    this.#cancelFlourish();
    this.#applySprite();
    this.#applyPosition();
    this.#scheduleFlourish();
  }

  // (Re)derive everything that depends on the current sprite definition.
  #applySprite() {
    const { sheet } = this.#def;
    this.#cellPx = sheet.cell * this.#def.scale;
    this.#sprite.style.width = `${this.#cellPx}px`;
    this.#sprite.style.height = `${this.#cellPx}px`;
    this.#sprite.style.backgroundImage = `url("${chrome.runtime.getURL(sheet.path)}")`;
    this.#sprite.style.backgroundSize =
      `${sheet.cols * this.#cellPx}px ${sheet.rows * this.#cellPx}px`;
    this.#hop.style.setProperty(
      '--docs-pet-hop-px',
      `${Math.round(this.#cellPx * NEWLINE_JUMP.hopHeightFrac)}px`,
    );

    this.#pose = this.#poseFor();
    this.#frameIdx = 0;
    this.#frameClock = 0;
    if (this.#x !== undefined) {
      this.#x = Math.max(this.#minX(), Math.min(this.#x, this.#maxX()));
    }
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
    // Away holds still: the loop is frozen on whichever frame it dimmed at.
    if (this.#state !== State.AWAY && this.#frameClock >= frameMs) {
      this.#frameClock %= frameMs;
      if (this.#oneShot && this.#frameIdx + 1 >= this.#pose.frames.length) {
        // Flourish finished: settle back into the state's own pose.
        this.#oneShot = null;
        this.#pose = this.#poseFor();
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
    const [col, row] = this.#pose.frames[this.#frameIdx];
    this.#sprite.style.backgroundPosition =
      `-${col * this.#cellPx}px -${row * this.#cellPx}px`;
    // Drop the sprite by the sheet's built-in under-feet padding so every
    // cat stands on the same line, and flip when facing away from the art's
    // native direction.
    const dropPx = this.#def.baselineGap * this.#def.scale;
    const flip = (this.#dir === 1) === !!this.#def.facesLeft;
    this.#sprite.style.transform =
      `translateY(${dropPx}px)${flip ? ' scaleX(-1)' : ''}`;
  }

  #applyPosition() {
    this.#root.style.transform = `translateX(${this.#x}px)`;
  }
}
