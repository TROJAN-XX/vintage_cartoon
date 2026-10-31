import React, { useState, useEffect } from 'react';
import { Play, Heart, Star, Calendar, Clock, Tv, Compass } from 'lucide-react';

export default function Hero({ featuredCartoon, onPlay, onExplore, isInWatchlist, onToggleWatchlist }) {
  // P3-10: probe the backdrop image off-screen and swap to the shared
  // placeholder if it fails (CSS backgrounds show no broken-image icon,
  // so we detect failure manually to keep the hero looking intentional).
  const backdropSrc = featuredCartoon?.thumbnail;
  const [resolvedBackdrop, setResolvedBackdrop] = useState(backdropSrc);

  useEffect(() => {
    setResolvedBackdrop(backdropSrc);
    if (!backdropSrc) return;
    let cancelled = false;
    const probe = new Image();
    probe.onerror = () => {
      if (!cancelled) setResolvedBackdrop('/thumb-placeholder.svg');
    };
    probe.src = backdropSrc;
    return () => {
      cancelled = true;
    };
  }, [backdropSrc]);

  if (!featuredCartoon) return null;

  const isHubEntry = featuredCartoon.isShowHubEntry;

  return (
    <section className="hero-section" id="hero">
      {/* Background Cinematic Image with Gradient Overlay */}
      <div
        className="hero-backdrop"
        style={{ backgroundImage: `url(${resolvedBackdrop})` }}
      >
        <div className="hero-vignette" />
        <div className="hero-bottom-fade" />
      </div>

      {/* Hero Content Area */}
      <div className="hero-content">
        <div className="hero-badge lazy-reveal reveal-down">
          {isHubEntry ? 'SPECIAL FEATURES HUB' : 'FEATURED NOSTALGIA'}
        </div>
        
        <h1 className="hero-title lazy-reveal reveal-right delay-100">{featuredCartoon.title}</h1>
        <h2 className="hero-subtitle lazy-reveal reveal-right delay-200">{featuredCartoon.tamilTitle}</h2>

        {/* Metadata Badges */}
        <div className="hero-metadata lazy-reveal reveal-up delay-300">
          <span className="meta-badge channel-badge">
            <Tv size={14} className="meta-icon" />
            {featuredCartoon.channel}
          </span>
          <span className="meta-badge rating-badge">
            <Star size={14} className="meta-icon text-yellow" />
            {featuredCartoon.rating} / 10
          </span>
          <span className="meta-badge year-badge">
            <Calendar size={14} className="meta-icon" />
            {featuredCartoon.year}
          </span>
          <span className="meta-badge duration-badge">
            <Clock size={14} className="meta-icon" />
            {featuredCartoon.duration}
          </span>
        </div>

        {/* Description */}
        <p className="hero-description lazy-reveal reveal-up delay-400">{featuredCartoon.description}</p>

        {/* Tags */}
        <div className="hero-tags lazy-reveal reveal-scale delay-500">
          {featuredCartoon.tags.map((tag, idx) => (
            <span key={idx} className="hero-tag">
              #{tag}
            </span>
          ))}
        </div>

        {/* Interactive Action Buttons */}
        <div className="hero-actions lazy-reveal reveal-up delay-600">
          {isHubEntry ? (
            <button className="play-button-glowing" onClick={onExplore}>
              <Compass className="play-icon-fill" />
              <span>Explore Series</span>
            </button>
          ) : (
            <button className="play-button-glowing" onClick={() => onPlay(featuredCartoon)}>
              <Play className="play-icon-fill" />
              <span>Play Now</span>
            </button>
          )}
          
          <button 
            className={`watchlist-button-glowing ${isInWatchlist ? 'active' : ''}`}
            onClick={() => onToggleWatchlist(featuredCartoon)}
          >
            <Heart className={`heart-icon ${isInWatchlist ? 'heart-filled' : ''}`} />
            <span>{isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
