import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Heart, Star, Shield, Compass } from 'lucide-react';

export default function MovieRow({ 
  title, 
  cartoons, 
  onPlay, 
  onExplore,
  watchlist, 
  onToggleWatchlist, 
  isGrid = false,
  zoneId,
  registerZone,
  unregisterZone,
}) {
  const rowRef = useRef(null);
  const containerRef = useRef(null);

  // Flaw fix F13: disable arrow buttons when there's nothing to scroll
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrowState = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrowState();
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrowState, { passive: true });
    window.addEventListener('resize', updateArrowState);
    return () => {
      el.removeEventListener('scroll', updateArrowState);
      window.removeEventListener('resize', updateArrowState);
    };
  }, [updateArrowState, cartoons]);

  // Register this row's cards as a keyboard navigation zone
  useEffect(() => {
    if (!registerZone || !zoneId) return;
    registerZone(zoneId, () => {
      if (!containerRef.current) return [];
      return Array.from(containerRef.current.querySelectorAll('.cartoon-card .card-thumbnail-btn'));
    });
    return () => {
      if (unregisterZone) unregisterZone(zoneId);
    };
  }, [zoneId, registerZone, unregisterZone, cartoons]);

  const scroll = (direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const isFavorited = (id) => watchlist.some((item) => item.id === id);

  if (cartoons.length === 0) {
    if (isGrid) {
      return (
        <div className="no-results-card">
          <p className="no-results-text">No nostalgic items found matching your filters.</p>
          <span className="no-results-sub">Try searching another title or clearing filters!</span>
        </div>
      );
    }
    return null;
  }

  // Grid layout for search results
  if (isGrid) {
    return (
      <div className="movie-grid-container" ref={containerRef}>
        <h2 className="row-title-neon lazy-reveal reveal-right">{title}</h2>
        <div className="movie-grid lazy-reveal reveal-up" role="list">
          {cartoons.map((cartoon) => (
            <CartoonCard
              key={cartoon.id}
              cartoon={cartoon}
              onPlay={onPlay}
              onExplore={onExplore}
              isFav={isFavorited(cartoon.id)}
              onToggleFav={onToggleWatchlist}
            />
          ))}
        </div>
      </div>
    );
  }

  // Row layout with sliding controls
  return (
    <div className="movie-row-container lazy-reveal reveal-up" ref={containerRef}>
      <h2 className="row-title-neon lazy-reveal reveal-right delay-100">{title}</h2>
      <div className="movie-row-wrapper lazy-reveal reveal-scale delay-200">
        <button
          className={`row-arrow arrow-left ${!canScrollLeft ? 'arrow-disabled' : ''}`}
          onClick={() => canScrollLeft && scroll('left')}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
        >
          <ChevronLeft />
        </button>
        
        <div className="movie-row-scroll" ref={rowRef} role="list">
          {cartoons.map((cartoon) => (
            <CartoonCard
              key={cartoon.id}
              cartoon={cartoon}
              onPlay={onPlay}
              onExplore={onExplore}
              isFav={isFavorited(cartoon.id)}
              onToggleFav={onToggleWatchlist}
            />
          ))}
        </div>

        <button
          className={`row-arrow arrow-right ${!canScrollRight ? 'arrow-disabled' : ''}`}
          onClick={() => canScrollRight && scroll('right')}
          disabled={!canScrollRight}
          aria-label="Scroll right"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}

// Flaw fix F4/F11: tilt effect is throttled — the card's bounding rect is
// cached on mouseenter (a rect is stable while hovering), and updates are
// gated through requestAnimationFrame instead of running per mousemove.
function CartoonCard({ cartoon, onPlay, onExplore, isFav, onToggleFav }) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  const rectRef = useRef(null);
  const frameRef = useRef(0);
  const targetRef = useRef({ x: 0, y: 0 });

  const isHubEntry = cartoon.isShowHubEntry;
  const isEpisode = cartoon.season !== undefined && cartoon.episode !== undefined;

  const handleCardClick = () => {
    if (isHubEntry && onExplore) {
      onExplore();
    } else {
      onPlay(cartoon);
    }
  };

  const applyTilt = () => {
    frameRef.current = 0;
    const card = cardRef.current;
    const rect = rectRef.current;
    if (!card || !rect) return;
    const x = targetRef.current.x;
    const y = targetRef.current.y;
    const rotateX = -((y - rect.top - rect.height / 2) / (rect.height / 2)) * 10;
    const rotateY = ((x - rect.left - rect.width / 2) / (rect.width / 2)) * 10;
    card.style.transition = 'transform 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)';
    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px) scale(1.02)`;
    if (glareRef.current) {
      glareRef.current.style.opacity = '0.12';
      glareRef.current.style.background = `radial-gradient(circle at ${x - rect.left}px ${y - rect.top}px, rgba(255, 255, 255, 0.4) 0%, transparent 60%)`;
    }
  };

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    targetRef.current = { x: e.clientX, y: e.clientY };
    if (frameRef.current) return; // one pending update is enough
    frameRef.current = requestAnimationFrame(applyTilt);
  };

  const handleMouseEnter = () => {
    const card = cardRef.current;
    if (card) rectRef.current = card.getBoundingClientRect();
  };

  const handleMouseLeave = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    if (!cardRef.current) return;
    const card = cardRef.current;
    card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  };

  // Clear leftover tilt when the list changes (stale inline styles — flaw fix F15)
  useEffect(() => {
    const card = cardRef.current;
    if (card && card.style.transform) {
      card.style.transform = '';
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [cartoon.id]);

  return (
    <article
      className={`cartoon-card ${isHubEntry ? 'hub-entry-card' : ''}`}
      ref={cardRef}
      role="listitem"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Glare Overlay */}
      <div className="card-glare" ref={glareRef} />

      {/* Thumbnail with overlay gradient.
          Flaw fix F21/F22: the play affordance is now a real <button> layered
          over the poster (the card itself is no longer a fake role="button"
          wrapping the heart button), and its label matches the action —
          Play for titles, Explore for hub entries. */}
      <div className="card-thumbnail-wrapper">
        <button
          type="button"
          className="card-thumbnail-btn"
          onClick={handleCardClick}
          aria-label={isHubEntry ? `Explore ${cartoon.title} selections` : `Play ${cartoon.title}`}
        >
          <img
            src={cartoon.thumbnail}
            alt=""
            className="card-image"
            loading="lazy"
            decoding="async"
            // P3-10: broken thumbnails fall back to the shared placeholder
            // instead of the browser's default broken-image icon.
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallback) return;
              img.dataset.fallback = '1';
              img.src = '/thumb-placeholder.svg';
            }}
          />
        </button>
        <div className="card-overlay" aria-hidden="true">
          <div className="card-play-circle">
            {isHubEntry ? (
              <Compass size={24} className="card-play-icon" />
            ) : (
              <Play size={24} className="card-play-icon" style={{ marginLeft: '2px' }} />
            )}
          </div>
        </div>
        
        {/* Badge Overlay */}
        <span className={`card-channel-badge ${isHubEntry ? 'neon-purple-badge' : ''}`}>
          {isHubEntry ? (
            'SPECIAL HUB'
          ) : isEpisode ? (
            `S${cartoon.season} E${cartoon.episode}`
          ) : (
            cartoon.channel
          )}
        </span>

        {/* P1-1: honest label when the card streams a stand-in reel rather than
            the advertised show (no genuine full episode exists on archive.org). */}
        {cartoon.isPlaceholder && (
          <span
            className="card-placeholder-badge"
            title="This card streams a public-domain placeholder reel, not the advertised show."
          >
            PLACEHOLDER REEL
          </span>
        )}
      </div>

      {/* Card Info details */}
      <div className="card-details">
        <div className="card-header-row">
          <h3 className="card-title">{cartoon.title}</h3>
          {!isHubEntry && (
            <button 
              className={`card-fav-btn ${isFav ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFav(cartoon);
              }}
              aria-label={isFav ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Heart size={16} className={`heart-icon ${isFav ? 'heart-filled' : ''}`} />
            </button>
          )}
        </div>
        
        <p className="card-tamil-title">{cartoon.tamilTitle}</p>

        <div className="card-meta">
          <span className="card-meta-item text-yellow-glow">
            <Star size={12} className="star-icon" />
            {cartoon.rating}
          </span>
          <span className="card-meta-divider">•</span>
          <span className="card-meta-item">
            {isHubEntry ? 'Explore Selections' : isEpisode ? `Season ${cartoon.season}` : cartoon.year}
          </span>
          <span className="card-meta-divider">•</span>
          <span className="card-meta-item">{cartoon.duration}</span>
        </div>

        {/* Custom Talisman or Channel Line */}
        {isEpisode ? (
          <div className="card-talisman-line">
            <Shield size={12} className="talisman-icon-small" />
            <span className="talisman-text-small">{cartoon.talisman}</span>
          </div>
        ) : (
          !isHubEntry && (
            <div className="card-channel-line" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
              Broadcaster: {cartoon.channel}
            </div>
          )
        )}

        <div className="card-tags">
          {cartoon.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="card-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
