/**
 * Flaw fixes F2 (unguarded JSON.parse) + F8 (watchlist as ids):
 * All localStorage reads/writes go through these helpers so a corrupted
 * or schema-drifted value can never crash the app at boot.
 */

const JSON_PREFIX = 'json:';

/** Read a JSON value; falls back to `fallback` on any error or wrong type.
 *  Tolerates bare JSON and our own legacy `json:` envelope. */
export function readJSON(key, { fallback = null, validate = null } = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const payload = raw.startsWith(JSON_PREFIX) ? raw.slice(JSON_PREFIX.length) : raw;
    const parsed = JSON.parse(payload);
    if (validate && !validate(parsed)) {
      console.warn(`[storage] "${key}" failed validation — using fallback`);
      return fallback;
    }
    return parsed;
  } catch (err) {
    console.warn(`[storage] "${key}" unreadable (${err.message}) — using fallback`);
    try {
      localStorage.removeItem(key); // self-heal corrupted keys
    } catch {
      /* storage may be disabled (private mode) */
    }
    return fallback;
  }
}

/** Write a JSON value (bare JSON — same format `readJSON` handles). Never throws. */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[storage] "${key}" write failed (${err.message})`);
    return false;
  }
}

/** Watchlist is persisted as id strings only (flaw fix F8). */
export function readWatchlistIds() {
  return readJSON('vintage_watchlist', {
    fallback: [],
    validate: (v) =>
      Array.isArray(v) &&
      v.every((item) => typeof item === 'string' || (item && typeof item === 'object' && typeof item.id === 'string')),
  }).map((item) => (typeof item === 'string' ? item : item.id)); // migrate legacy full-object entries
}

export function writeWatchlistIds(ids) {
  return writeJSON('vintage_watchlist', ids);
}

/** "Continue watching" progress map: { [episodeId]: secondsWatched }. */
export function readProgressMap() {
  return readJSON('vintage_progress', {
    fallback: {},
    validate: (v) =>
      v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((n) => typeof n === 'number'),
  });
}

export function writeProgress(id, seconds) {
  const map = readProgressMap();
  map[id] = Math.max(0, Math.floor(seconds));
  return writeJSON('vintage_progress', map);
}

/** Player preferences (volume/mute) — flaw fix F24. */
export function readPlayerPrefs() {
  return readJSON('vintage_player_prefs', {
    fallback: { volume: 0.8, isMuted: false },
    validate: (v) =>
      v && typeof v === 'object' && typeof v.volume === 'number' && typeof v.isMuted === 'boolean',
  });
}

export function writePlayerPrefs(prefs) {
  return writeJSON('vintage_player_prefs', prefs);
}
