import { describe, it, expect, beforeEach } from 'vitest';
import {
  readJSON,
  writeJSON,
  readWatchlistIds,
  writeWatchlistIds,
  readProgressMap,
  writeProgress,
  readPlayerPrefs,
  writePlayerPrefs,
} from '../utils/storage';

// Every read/write must be isolated; jsdom localStorage is global but we reset it.
beforeEach(() => {
  localStorage.clear();
});

describe('readJSON / writeJSON', () => {
  it('round-trips a value', () => {
    writeJSON('k', { a: 1 });
    expect(readJSON('k')).toEqual({ a: 1 });
  });

  it('returns fallback for a missing key', () => {
    expect(readJSON('missing', { fallback: 'x' })).toBe('x');
  });

  it('returns fallback (and self-heals) on corrupted JSON', () => {
    localStorage.setItem('bad', '{not json');
    expect(readJSON('bad', { fallback: [] })).toEqual([]);
    expect(localStorage.getItem('bad')).toBeNull(); // corrupted key removed
  });

  it('returns fallback when a validator rejects the shape', () => {
    localStorage.setItem('k', JSON.stringify(42));
    expect(readJSON('k', { fallback: 'dflt', validate: Array.isArray })).toBe('dflt');
  });

  it('tolerates the legacy "json:" envelope', () => {
    localStorage.setItem('k', 'json:[1,2,3]');
    expect(readJSON('k')).toEqual([1, 2, 3]);
  });
});

describe('watchlist ids (flaw fix F8)', () => {
  it('persists and reads id strings', () => {
    writeWatchlistIds(['a', 'b']);
    expect(readWatchlistIds()).toEqual(['a', 'b']);
  });

  it('migrates legacy full-object entries to id strings', () => {
    localStorage.setItem('vintage_watchlist', JSON.stringify([{ id: 'x' }, { id: 'y' }]));
    expect(readWatchlistIds()).toEqual(['x', 'y']);
  });

  it('mixes legacy objects and plain id strings', () => {
    localStorage.setItem('vintage_watchlist', JSON.stringify(['plain', { id: 'obj' }]));
    expect(readWatchlistIds()).toEqual(['plain', 'obj']);
  });

  it('returns [] for corrupted watchlist instead of crashing (flaw fix F2)', () => {
    localStorage.setItem('vintage_watchlist', ' garbage');
    expect(readWatchlistIds()).toEqual([]);
  });

  it('returns [] when nothing is stored', () => {
    expect(readWatchlistIds()).toEqual([]);
  });
});

describe('progress map (P2-2 continue watching)', () => {
  it('stores and reads positions per id', () => {
    writeProgress('s1e01', 120.7);
    writeProgress('s1e02', 30);
    expect(readProgressMap()).toEqual({ s1e01: 120, s1e02: 30 });
  });

  it('floors and clamps negative values to 0', () => {
    writeProgress('e', -5);
    expect(readProgressMap().e).toBe(0);
  });

  it('returns {} for corrupted progress instead of crashing', () => {
    localStorage.setItem('vintage_progress', '[not-an-object');
    expect(readProgressMap()).toEqual({});
  });
});

describe('player preferences (flaw fix F24)', () => {
  it('returns defaults when nothing is stored', () => {
    expect(readPlayerPrefs()).toEqual({ volume: 0.8, isMuted: false });
  });

  it('persists and restores volume/mute', () => {
    writePlayerPrefs({ volume: 0.35, isMuted: true });
    expect(readPlayerPrefs()).toEqual({ volume: 0.35, isMuted: true });
  });

  it('falls back to defaults on a malformed prefs value', () => {
    localStorage.setItem('vintage_player_prefs', JSON.stringify({ volume: 'loud' }));
    expect(readPlayerPrefs()).toEqual({ volume: 0.8, isMuted: false });
  });
});
