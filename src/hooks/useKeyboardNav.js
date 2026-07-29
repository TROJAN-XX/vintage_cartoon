import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useKeyboardNav
 * 
 * Global keyboard navigation hook for the Vintage Cartoon streaming app.
 * 
 * Focus Zones (in order top to bottom):
 *   0 = Navbar links
 *   1 = Hero buttons
 *   2+ = Each MovieRow (one zone per row)
 *
 * Controls:
 *   ArrowLeft  / ArrowRight  → move within a row or nav
 *   ArrowUp    / ArrowDown   → jump between zones
 *   Enter / Space            → activate focused element
 *   Escape                   → close modal or blur
 */
export function useKeyboardNav({ modalOpen, onCloseModal }) {
  // Which zone is keyboard focus on (null = nothing focused)
  const [focusZone, setFocusZone] = useState(null);
  // Index within the current zone
  const [focusIndex, setFocusIndex] = useState(0);

  // Keep a registry of navigable zones that components register themselves into
  const zonesRef = useRef([]); // array of { id, elements: NodeList or array of refs }

  const registerZone = useCallback((id, getElements) => {
    zonesRef.current = zonesRef.current.filter((z) => z.id !== id);
    zonesRef.current.push({ id, getElements });
    // Sort so zones appear in DOM order
    zonesRef.current.sort((a, b) => {
      const elA = a.getElements()[0];
      const elB = b.getElements()[0];
      if (!elA || !elB) return 0;
      const rectA = elA.getBoundingClientRect();
      const rectB = elB.getBoundingClientRect();
      return rectA.top - rectB.top || rectA.left - rectB.left;
    });
  }, []);

  const unregisterZone = useCallback((id) => {
    zonesRef.current = zonesRef.current.filter((z) => z.id !== id);
  }, []);

  // Blur the current native focused element
  const blurCurrent = () => {
    if (document.activeElement) document.activeElement.blur();
  };

  // Focus an element by zone and index
  const applyFocus = useCallback((zoneId, idx) => {
    const zone = zonesRef.current.find((z) => z.id === zoneId);
    if (!zone) return;
    const elements = zone.getElements();
    if (!elements || elements.length === 0) return;
    const safeIdx = Math.max(0, Math.min(idx, elements.length - 1));
    const el = elements[safeIdx];
    if (el) {
      el.focus({ preventScroll: false });
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape: close modal first, then blur
      if (e.key === 'Escape') {
        if (modalOpen) {
          onCloseModal();
        } else {
          setFocusZone(null);
          setFocusIndex(0);
          blurCurrent();
        }
        return;
      }

      // Don't intercept if user is typing in an input/textarea
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const zones = zonesRef.current;
      if (zones.length === 0) return;

      const currentZoneIdx = focusZone !== null
        ? zones.findIndex((z) => z.id === focusZone)
        : -1;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        let nextZoneIdx;
        if (currentZoneIdx === -1) {
          nextZoneIdx = 0;
        } else if (e.key === 'ArrowDown') {
          nextZoneIdx = Math.min(currentZoneIdx + 1, zones.length - 1);
        } else {
          nextZoneIdx = Math.max(currentZoneIdx - 1, 0);
        }
        const nextZone = zones[nextZoneIdx];
        setFocusZone(nextZone.id);
        setFocusIndex(0);
        applyFocus(nextZone.id, 0);
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentZoneIdx === -1) {
          // Nothing focused yet – activate first zone
          const zone = zones[0];
          setFocusZone(zone.id);
          setFocusIndex(0);
          applyFocus(zone.id, 0);
          return;
        }
        const zone = zones[currentZoneIdx];
        const elements = zone.getElements();
        const len = elements?.length ?? 0;
        let nextIdx;
        if (e.key === 'ArrowRight') {
          nextIdx = focusIndex + 1 >= len ? 0 : focusIndex + 1;
        } else {
          nextIdx = focusIndex - 1 < 0 ? len - 1 : focusIndex - 1;
        }
        setFocusIndex(nextIdx);
        applyFocus(zone.id, nextIdx);
        return;
      }

      // Tab: enter keyboard navigation mode
      if (e.key === 'Tab') {
        if (currentZoneIdx === -1) {
          e.preventDefault();
          const zone = zones[0];
          setFocusZone(zone.id);
          setFocusIndex(0);
          applyFocus(zone.id, 0);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusZone, focusIndex, modalOpen, onCloseModal, applyFocus]);

  // When a native focus event happens (e.g. Tab), sync our state
  useEffect(() => {
    const handleFocusIn = (e) => {
      const el = e.target;
      for (const zone of zonesRef.current) {
        const elements = zone.getElements();
        const idx = Array.from(elements || []).indexOf(el);
        if (idx !== -1) {
          setFocusZone(zone.id);
          setFocusIndex(idx);
          return;
        }
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  return { focusZone, focusIndex, registerZone, unregisterZone };
}
