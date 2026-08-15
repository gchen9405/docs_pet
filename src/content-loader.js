// Content scripts can't be declared as ES modules in the manifest, but a
// classic script may dynamic-import extension files as long as they are
// web-accessible. This is the only non-module file in src/.
import(chrome.runtime.getURL('src/main.js')).catch((err) => {
  console.error('[docs-pet] failed to start:', err);
});
