// Every Google-internal, undocumented DOM detail lives in this file and
// nowhere else. Google can (and eventually will) rename these; when the cat
// stops reacting to typing, start debugging here.

// Google Docs does not deliver keystrokes to the top-level window. It focuses
// this hidden same-origin iframe and handles keydown inside it, so typing
// signals must be read from the iframe's contentDocument (capture phase).
// The iframe is created late, after the page itself has loaded, and Docs may
// replace it, so callers must poll and rebind rather than bind once.
export const TEXT_EVENT_TARGET_IFRAME = 'iframe.docs-texteventtarget-iframe';
