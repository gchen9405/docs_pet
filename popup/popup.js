// The picker: one card per library cat, each previewed with its live sitting
// animation. Clicking a card saves the choice to chrome.storage.sync; every
// open Docs tab swaps its cat immediately (see src/main.js).

import { SPRITES, DEFAULT_SPRITE_ID, SPRITE_STORAGE_KEY } from '../src/sprites.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const grid = document.getElementById('grid');

// One entry per card: everything #tick needs to step a preview's animation.
const previews = [];

function makeCard(id, def) {
  const { sheet } = def;
  const cellPx = sheet.cell * def.previewScale;

  const card = document.createElement('button');
  card.className = 'card';
  card.dataset.id = id;
  card.title = `Be ${def.name}`;

  const stage = document.createElement('div');
  stage.className = 'stage';

  const cat = document.createElement('div');
  cat.className = 'cat';
  cat.style.width = `${cellPx}px`;
  cat.style.height = `${cellPx}px`;
  cat.style.backgroundImage = `url("${chrome.runtime.getURL(sheet.path)}")`;
  cat.style.backgroundSize = `${sheet.cols * cellPx}px ${sheet.rows * cellPx}px`;
  // Drop the sprite by the sheet's under-feet padding so all cats stand on
  // the stage floor; the stage clips the (transparent) overhang.
  cat.style.transform = `translateY(${def.baselineGap * def.previewScale}px)`;

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = def.name;

  stage.appendChild(cat);
  card.appendChild(stage);
  card.appendChild(name);
  card.addEventListener('click', () => select(id));

  const preview = { el: cat, def, pose: def.poses.sitting, cellPx, idx: 0, clock: 0 };
  applyFrame(preview);
  previews.push(preview);
  return card;
}

function applyFrame(p) {
  const [col, row] = p.pose.frames[p.idx];
  p.el.style.backgroundPosition = `-${col * p.cellPx}px -${row * p.cellPx}px`;
}

async function select(id) {
  await chrome.storage.sync.set({ [SPRITE_STORAGE_KEY]: id });
  markSelected(id);
}

function markSelected(id) {
  for (const card of grid.children) {
    card.classList.toggle('selected', card.dataset.id === id);
  }
}

for (const [id, def] of Object.entries(SPRITES)) {
  grid.appendChild(makeCard(id, def));
}

chrome.storage.sync.get(SPRITE_STORAGE_KEY).then((stored) => {
  const id = stored[SPRITE_STORAGE_KEY];
  markSelected(SPRITES[id] ? id : DEFAULT_SPRITE_ID);
});

// A single rAF loop steps every preview's sitting animation.
if (!REDUCED_MOTION.matches) {
  let last = performance.now();
  const tick = (ts) => {
    const dt = Math.min(ts - last, 100);
    last = ts;
    for (const p of previews) {
      p.clock += dt;
      const frameMs = 1000 / p.pose.fps;
      if (p.clock >= frameMs) {
        p.clock %= frameMs;
        p.idx = (p.idx + 1) % p.pose.frames.length;
        applyFrame(p);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
