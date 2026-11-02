import React, { useEffect, useRef } from 'react';
import { Tv, Heart, ArrowLeft } from 'lucide-react';

export default function Navbar({ 
  currentShowContext, 
  setCurrentShowContext, 
  hub,
  onExitHub,
  activeCategory, 
  setActiveCategory, 
  watchlistCount, 
  scrollToSection,
  registerZone,
  unregisterZone,
}) {
  const navLinksRef = useRef(null);

  // Register the nav link buttons as keyboard zone 'navbar'
  useEffect(() => {
    if (!registerZone) return;
    registerZone('navbar', () => {
      if (!navLinksRef.current) return [];
      return Array.from(navLinksRef.current.querySelectorAll('button.nav-link'));
    });
    return () => {
      if (unregisterZone) unregisterZone('navbar');
    };
  }, [registerZone, unregisterZone, currentShowContext]);
  
  // General view nav links
  const generalCategories = [
    { id: 'all', name: 'Home' },
    { id: '90s Classics', name: '90s Classics' },
    { id: 'Early 2000s Hits', name: 'Early 2000s Hits' },
    { id: 'Action & Adventure', name: 'Action & Adventure' },
    { id: 'watchlist', name: 'My Watchlist' }
  ];

  // Hub view nav links — derived from the active hub config (src/data/hubs.js)
  const hubCategories = hub
    ? [
        { id: 'all', name: hub.allSeasonsLabel },
        ...hub.seasons.map((s) => ({ id: `season${s.num}`, name: s.nav })),
        { id: 'watchlist', name: 'Watchlist' },
      ]
    : [];

  const handleLogoClick = () => {
    setCurrentShowContext(null);
    setActiveCategory('all');
    scrollToSection('hero');
  };

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    if (catId === 'watchlist' || catId !== 'all') {
      scrollToSection('categories');
    } else {
      scrollToSection('hero');
    }
  };

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        {/* Brand Logo */}
        <div className="navbar-logo" onClick={handleLogoClick}>
          <Tv className="logo-icon" />
          <span className="logo-text">
            VINTAGE<span className="logo-highlight">CARTOON</span>
            {hub && (
              <span className="logo-context-tag">/{hub.tag}</span>
            )}
          </span>
        </div>

        {/* Dynamic Category Navigation Links */}
        <nav className="navbar-links" ref={navLinksRef}>
          {(hub ? hubCategories : generalCategories).map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`nav-link ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.name}
              {cat.id === 'watchlist' && watchlistCount > 0 && (
                <span className="nav-watchlist-badge">{watchlistCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Action Panel */}
        <div className="navbar-actions">
          {hub ? (
            <button
              className="reset-filters-btn-glowing"
              onClick={onExitHub || (() => setCurrentShowContext(null))}
              style={{ display: 'flex', gap: '0.4rem', margin: 0 }}
            >
              <ArrowLeft size={14} />
              <span>Back to Catalog</span>
            </button>
          ) : (
            <button 
              className={`watchlist-button-pill ${activeCategory === 'watchlist' ? 'active' : ''}`}
              onClick={() => handleCategoryClick('watchlist')}
            >
              <Heart className="action-icon" />
              <span className="watchlist-count">{watchlistCount}</span>
            </button>
          )}
        </div>
      </div>
      <div className="navbar-glow-line" />
    </header>
  );
}
