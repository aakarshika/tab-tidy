// Pure URL helpers. No `chrome.*` calls in here, so everything in this file
// can be unit tested with plain Node (see test/matching.test.js).

/**
 * Does `url` match an anchor pattern like 'youtube.com' or 'claude.ai/design'?
 * The part before the first '/' is matched against the host, the rest (if
 * any) must be a prefix of the path.
 */
export function matchesAnchor(url, match) {
  if (!url) return false;
  const slash    = match.indexOf('/');
  const hostPart = slash === -1 ? match : match.slice(0, slash);
  const pathPart = slash === -1 ? ''    : match.slice(slash);
  try {
    const { hostname, host, pathname } = new URL(url);
    const hostOk = hostname.includes(hostPart) || host.includes(hostPart);
    if (!hostOk) return false;
    return pathPart === '' || pathname.startsWith(pathPart);
  } catch {
    return url.includes(match);
  }
}

/**
 * Index of the most specific (longest match) anchor for `url`, or -1.
 * Ensures e.g. claude.ai/design maps to its own anchor, not the bare
 * claude.ai one.
 */
export function anchorIndexFor(url, anchors) {
  let best = -1, bestLen = -1;
  for (let i = 0; i < anchors.length; i++) {
    const { match } = anchors[i];
    if (matchesAnchor(url, match) && match.length > bestLen) {
      best = i;
      bestLen = match.length;
    }
  }
  return best;
}

/** 'https://www.docs.github.com/x' → 'github.com'. Used as the group title. */
export function getRootDomain(url) {
  try {
    const { hostname } = new URL(url);
    if (hostname === 'localhost') return 'localhost';
    const parts = hostname.replace(/^www\./, '').split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
  } catch {
    return url;
  }
}

/** Browser-internal pages (chrome://, about:blank, …) are never grouped. */
export function isInternalUrl(url) {
  return !url || url.startsWith('chrome') || url.startsWith('about');
}
