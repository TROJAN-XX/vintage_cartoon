import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Heart, Star, Shield, Compass } from 'lucide-react';

export default function MovieRow({ 
  title, 
  cartoons, 
  onPlay, 
  onExplore,
  watchlist, 
  onToggleWatchlist, 
  isGrid = false 
}) {
  const rowRef = useRef(null);

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
      <div className="movie-grid-container">
        <h2 className="row-title-neon lazy-reveal reveal-right">{title}</h2>
        <div className="movie-grid lazy-reveal reveal-up delay-100">
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
    <div className="movie-row-container lazy-reveal reveal-up">
      <h2 className="row-title-neon lazy-reveal reveal-right delay-100">{title}</h2>
      <div className="movie-row-wrapper lazy-reveal reveal-scale delay-200">
        <button className="row-arrow arrow-left" onClick={() => scroll('left')} aria-label="Scroll left">
          <ChevronLeft />
        </button>
        
        <div className="movie-row-scroll" ref={rowRef}>
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

        <button className="row-arrow arrow-right" onClick={() => scroll('right')} aria-label="Scroll right">
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}

function CartoonCard({ cartoon, onPlay, onExplore, isFav, onToggleFav }) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  
  const isHubEntry = cartoon.isShowHubEntry;
  const isEpisode = cartoon.season !== undefined && cartoon.episode !== undefined;

  const handleCardClick = () => {
    if (isHubEntry && onExplore) {
      onExplore();
    } else {
      onPlay(cartoon);
    }
  };

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    
    const rotateX = -((y - box.height / 2) / (box.height / 2)) * 10;
    const rotateY = ((x - box.width / 2) / (box.width / 2)) * 10;
    
    card.style.transition = 'transform 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)';
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
    
    if (glareRef.current) {
      glareRef.current.style.opacity = '0.12';
      glareRef.current.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255, 255, 255, 0.4) 0%, transparent 60%)`;
    }
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  };

  return (
    <div 
      className={`cartoon-card ${isHubEntry ? 'hub-entry-card' : ''}`}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Glare Overlay */}
      <div className="card-glare" ref={glareRef} />

      {/* Thumbnail with overlay gradient */}
      <div className="card-thumbnail-wrapper" onClick={handleCardClick}>
        <img src={cartoon.thumbnail} alt={cartoon.title} className="card-image" loading="lazy" />
        <div className="card-overlay">
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
      </div>

      {/* Card Info details */}
      <div className="card-details">
        <div className="card-header-row">
          <h3 className="card-title" onClick={handleCardClick}>{cartoon.title}</h3>
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
    </div>
  );
}
