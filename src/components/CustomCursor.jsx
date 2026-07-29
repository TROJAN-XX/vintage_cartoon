import React, { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(true);
  const [clicked, setClicked] = useState(false);
  const [linkHovered, setLinkHovered] = useState(false);

  useEffect(() => {
    const addEventListeners = () => {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseenter", onMouseEnter);
      document.addEventListener("mouseleave", onMouseLeave);
      document.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mouseup", onMouseUp);
    };

    const removeEventListeners = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setHidden(false);
    };

    const onMouseEnter = () => {
      setHidden(false);
    };

    const onMouseLeave = () => {
      setHidden(true);
    };

    const onMouseDown = () => {
      setClicked(true);
    };

    const onMouseUp = () => {
      setClicked(false);
    };

    addEventListeners();

    // Check for interactive elements hover
    const handleLinkHover = () => {
      const clickables = document.querySelectorAll('a, button, select, input, textarea, [role="button"], .cartoon-card, .navbar-logo, .nav-link, .watchlist-button-pill, .watchlist-button-glowing, .play-button-glowing');
      clickables.forEach((el) => {
        el.addEventListener('mouseenter', () => setLinkHovered(true));
        el.addEventListener('mouseleave', () => setLinkHovered(false));
      });
    };

    // Run check on DOM mutations (since items filter and re-render)
    const observer = new MutationObserver(handleLinkHover);
    observer.observe(document.body, { childList: true, subtree: true });
    handleLinkHover();

    return () => {
      removeEventListeners();
      observer.disconnect();
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

  if (isMobile || (hidden && !clicked)) return null;

  return (
    <div
      className={`custom-cursor ${clicked ? 'cursor-clicked' : ''} ${linkHovered ? 'cursor-hovered' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    />
  );
}
