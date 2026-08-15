// Turns raw page events into four pet-relevant signals, and nothing more:
//   "keystroke"     detail: none        (a key went down in the editor)
//   "newline"       detail: none        (that key was Enter)
//   "focuschange"   detail: boolean     (does this window have the user?)
//   "activity"      detail: none        (non-typing activity, e.g. scrolling)
//
// Privacy note: the keydown handler necessarily receives full key events, but
// it only checks whether the key is a bare modifier or Enter and then
// discards the event. No key values are stored, logged, or transmitted; only
// "a keystroke (or newline) happened at this time" leaves this module.

import { TEXT_EVENT_TARGET_IFRAME } from './docs-selectors.js';
import { TIMING } from './config.js';

const MODIFIER_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock',
]);

export class Signals extends EventTarget {
  #boundIframeDoc = null;
  #boundIframeWin = null;
  #pollTimer = 0;
  #blurTimer = 0;
  #focused = true;

  start() {
    this.#bindEditorIframe();
    // The poll also re-samples focus. Not every focus transition fires an
    // event this module can see: closing the extension popup by clicking
    // into the editor moves focus popup -> hidden iframe, and the top window
    // never fires "focus". The iframe listeners below catch that case
    // immediately; this resample is the safety net for anything else.
    this.#pollTimer = setInterval(() => {
      this.#bindEditorIframe();
      this.#resampleFocus();
    }, TIMING.iframePollMs);

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
    this.#unbindIframeWin();
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
    if (!doc || (doc === this.#boundIframeDoc && this.#boundIframeWin)) return;

    // Docs replaced the iframe (or this is the first sighting). The old
    // document is gone with its listeners; just track the new one.
    // (Re-adding an identical listener is a no-op, so the rebind is safe
    // even when only the window binding was missing.)
    this.#boundIframeDoc?.removeEventListener('keydown', this.#onKeydown, true);
    this.#boundIframeDoc = doc;
    doc.addEventListener('keydown', this.#onKeydown, true);

    // Focus events land on the window that holds the focused element, which
    // in Docs is this iframe's window, not the top one: Chrome can deliver
    // the blur/focus for an OS-level window switch to the focused frame
    // only, and focus moving directly between another document and the
    // iframe (e.g. closing the extension popup by clicking into the editor)
    // is equally invisible to the top window. Without listeners here, coming
    // back to the window can go unnoticed and the cat sticks in "away".
    this.#unbindIframeWin();
    const win = doc.defaultView;
    if (win) {
      win.addEventListener('blur', this.#onFocusEvent);
      win.addEventListener('focus', this.#onFocusEvent);
      this.#boundIframeWin = win;
    }
  }

  #unbindIframeWin() {
    this.#boundIframeWin?.removeEventListener('blur', this.#onFocusEvent);
    this.#boundIframeWin?.removeEventListener('focus', this.#onFocusEvent);
    this.#boundIframeWin = null;
  }

  // Backstop for focus events that were delivered nowhere we listen (or not
  // delivered at all): if the sampled truth disagrees with what we believe,
  // run the normal settled sample. Real transients (focus handing off between
  // frames) still get the settle delay before anything is dispatched.
  #resampleFocus() {
    const focused = document.hasFocus() && !document.hidden;
    if (focused !== this.#focused) this.#onFocusEvent();
  }

  #onKeydown = (event) => {
    if (MODIFIER_KEYS.has(event.key)) return;
    // keystroke first, so listeners see the newline against updated state.
    this.dispatchEvent(new Event('keystroke'));
    if (event.key === 'Enter') this.dispatchEvent(new Event('newline'));
  };

  #onScroll = () => {
    this.dispatchEvent(new Event('activity'));
  };

  #onFocusEvent = () => {
    clearTimeout(this.#blurTimer);
    this.#blurTimer = setTimeout(this.#sampleFocus, TIMING.blurSettleMs);
  };

  #sampleFocus = () => {
    const focused = document.hasFocus() && !document.hidden;
    if (focused !== this.#focused) {
      this.#focused = focused;
      this.dispatchEvent(new CustomEvent('focuschange', { detail: focused }));
    }
  };
}
