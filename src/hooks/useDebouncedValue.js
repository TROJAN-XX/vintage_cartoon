import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Flaw fix P2-3: debounces any fast-changing value (search input) so
 * expensive re-filtering runs at most once per `delay` window.
 */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced;
}

/**
 * Flaw fix F6: stable-callback registry so effects (e.g. the player's
 * window keydown handler) can always call the latest function without
 * re-binding listeners on every render — and without exhaustive-deps
 * warnings or stale closures.
 */
export function useEventCallback(fn) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => ref.current(...args), []);
}
