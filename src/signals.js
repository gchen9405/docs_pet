// Turns raw page events into three pet-relevant signals, and nothing more:
//   "keystroke"     detail: none        (a key went down in the editor)
//   "activity"      detail: none        (non-typing activity, e.g. scrolling)
//   "focuschange"   detail: boolean     (does this window have the user?)
//
// Privacy note: the keydown handler necessarily receives full key events, but
// it only checks whether the key is a bare modifier and then discards the
// event. No key values are stored, logged, or transmitted; only "a keystroke
// happened at this time" leaves this module.

import { TEXT_EVENT_TARGET_IFRAME } from './docs-selectors.js';
import { TIMING } from './config.js';

const MODIFIER_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock',
]);

export class Signals extends EventTarget {
  #boundIframeDoc = null;
  #pollTimer = 0;
  #blurTimer = 0;
  #focused = true;

  start() {
    this.#bindEditorIframe();
    this.#pollTimer = setInterval(() => this.#bindEditorIframe(), TIMING.iframePollMs);

    // Fallback: typing that happens outside the hidden iframe (doc title,
    // comments) reaches the top document normally. Events from the iframe's
    // document never propagate up here, so nothing fires twice.
    document.addEventListener('keydown', this.#onKeydown, true);

    // scroll doesn't bubble, but non-bubbling events still run the capture
    // phase from the window down, so this one listener sees the editor's
    // internal scroll container without us having to know its selector.
    window.addEventListener('scroll', this.#onScroll, { capture: true, passive: true });

    // Focus is sampled (via hasFocus) rather than tracked event-by-event:
    // clicking into the editor blurs the top window while focus hands off to
    // the hidden iframe, and same-origin iframe focus still counts as
    // document.hasFocus() at the top, so a settled sample gets it right.
    window.addEventListener('blur', this.#onFocusEvent);
    window.addEventListener('focus', this.#onFocusEvent);
    document.addEventListener('visibilitychange', this.#onFocusEvent);

    this.#focused = document.hasFocus() && !document.hidden;
  }

  stop() {
    clearInterval(this.#pollTimer);
    clearTimeout(this.#blurTimer);
    document.removeEventListener('keydown', this.#onKeydown, true);
    window.removeEventListener('scroll', this.#onScroll, { capture: true });
    window.removeEventListener('blur', this.#onFocusEvent);
    window.removeEventListener('focus', this.#onFocusEvent);
    document.removeEventListener('visibilitychange', this.#onFocusEvent);
    if (this.#boundIframeDoc) {
      this.#boundIframeDoc.removeEventListener('keydown', this.#onKeydown, true);
      this.#boundIframeDoc = null;
    }
  }

  get focused() {
    return this.#focused;
  }

  #bindEditorIframe() {
    const iframe = document.querySelector(TEXT_EVENT_TARGET_IFRAME);
    let doc = null;
    try {
      doc = iframe?.contentDocument ?? null;
    } catch {
      doc = null; // would only happen if Docs made it cross-origin
    }
    if (!doc || doc === this.#boundIframeDoc) return;

    // Docs replaced the iframe (or this is the first sighting). The old
    // document is gone with its listeners; just track the new one.
    this.#boundIframeDoc?.removeEventListener('keydown', this.#onKeydown, true);
    this.#boundIframeDoc = doc;
    doc.addEventListener('keydown', this.#onKeydown, true);
  }

  #onKeydown = (event) => {
    if (MODIFIER_KEYS.has(event.key)) return;
    this.dispatchEvent(new Event('keystroke'));
  };

  #onScroll = () => {
    this.dispatchEvent(new Event('activity'));
  };

  #onFocusEvent = () => {
    clearTimeout(this.#blurTimer);
    this.#blurTimer = setTimeout(() => {
      const focused = document.hasFocus() && !document.hidden;
      if (focused !== this.#focused) {
        this.#focused = focused;
        this.dispatchEvent(new CustomEvent('focuschange', { detail: focused }));
      }
    }, TIMING.blurSettleMs);
  };
}
