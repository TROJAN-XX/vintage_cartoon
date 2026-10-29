import React, { useEffect, useState, useRef } from 'react';

const CLICKABLE_SELECTOR = 'a, button, select, input, textarea, [role="button"], .cartoon-card, .navbar-logo, .nav-link, .watchlist-button-pill, .watchlist-button-glowing, .play-button-glowing';

export default function CustomCursor() {
  // Flaw fix F4: the pointer dot is positioned imperatively via transform in a
  // requestAnimationFrame loop — no React state per mousemove (previously the
  // cursor re-rendered the whole component on every pointer event).
  const cursorRef = useRef(null);
  const pointerRef = useRef({ x: -100, y: -100, moved: false });

  // Click/ring feedback is rare (down/up) — React state is fine for these.
  const [clicked, setClicked] = useState(false);

  // Flaw fix F14 (replaces the per-element MutationObserver): a single
  // delegated mouseover/mouseout listener decides "hovering an interactive".
  const [linkHovered, setLinkHovered] = useState(false);

  useEffect(() => {
    const el = cursorRef.current;

    const onFrame = () => {
      const { x, y } = pointerRef.current;
      if (el) {
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(onFrame);
    };
    let rafId = requestAnimationFrame(onFrame);

    const onMouseMove = (e) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
    };
    const onDocumentLeave = () => {
      // Cursor leaves the window → park the dot off-screen
      pointerRef.current.x = -100;
      pointerRef.current.y = -100;
    };
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onDocumentLeave);

    const onDown = () => setClicked(true);
    const onUp = () => setClicked(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onDocumentLeave);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    // Delegated hover detection — O(1) per event, no listeners per node
    const onOver = (e) => {
      if (e.target.closest?.(CLICKABLE_SELECTOR)) setLinkHovered(true);
    };
    const onOut = (e) => {
      if (e.target.closest?.(CLICKABLE_SELECTOR)) setLinkHovered(false);
    };
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);

  // Hide custom cursor on touch devices / mobile screen sizes
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show the custom cursor only while it's actually mounted and moving —
  // CSS only hides the native pointer under `html.cursor-active` (flaw fix F11)
  useEffect(() => {
    const rootEl = document.documentElement;
    if (isMobile) {
      rootEl.classList.remove('cursor-active');
      return;
    }
    rootEl.classList.add('cursor-active');
    return () => rootEl.classList.remove('cursor-active');
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div
      ref={cursorRef}
      className={`custom-cursor ${clicked ? 'cursor-clicked' : ''} ${linkHovered ? 'cursor-hovered' : ''}`}
      style={{
        left: 0,
        top: 0
      }}
    />
  );
}
