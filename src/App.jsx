import React, { useState, useEffect } from 'react';
import cartoonsData from './data/cartoons.json';
import jackieChanData from './data/jackie_chan.json';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SearchFilter from './components/SearchFilter';
import MovieRow from './components/MovieRow';
import VideoModal from './components/VideoModal';
import CustomCursor from './components/CustomCursor';
import { useKeyboardNav } from './hooks/useKeyboardNav';

export default function App() {
  // Navigation context state: null (general catalog) or 'jackie-chan' (dedicated hub)
  const [currentShowContext, setCurrentShowContext] = useState(null);

  // Keyboard navigation
  const { registerZone, unregisterZone } = useKeyboardNav({
    modalOpen: false,
    onCloseModal: () => setActiveCartoon(null),
  });

  /* eslint-disable no-use-before-define */
  // Note: activeCartoon referenced below is declared at line ~23

  // Watchlist persisted state
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('vintage_watchlist');
    return saved ? JSON.parse(saved) : [];
  });

  // Streaming modal state
  const [activeCartoon, setActiveCartoon] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  
  // General view sub-filters
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedEra, setSelectedEra] = useState('all');

  // Jackie Chan view sub-filters
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedTalisman, setSelectedTalisman] = useState('all');
  
  // Navbar navigation category filter
  const [activeCategory, setActiveCategory] = useState('all');

  // Sync watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('vintage_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Reset category when switching show contexts
  useEffect(() => {
    resetFilters();
  }, [currentShowContext]);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px'
      }
    );

    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.lazy-reveal');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      const elements = document.querySelectorAll('.lazy-reveal');
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [currentShowContext, activeCategory, searchQuery, selectedSeason, selectedTalisman, selectedChannel, selectedEra]);

  // Determine active database based on context
  const activeData = currentShowContext === 'jackie-chan' ? jackieChanData : cartoonsData;

  // Featured Hero Item
  const featuredCartoon = activeData.find((c) => c.isFeatured) || activeData[0];

  // Helper lists extracted dynamically
  const channels = Array.from(new Set(cartoonsData.map((c) => c.channel)));
  const eras = ['1990s', '2000s'];
  const seasons = Array.from(new Set(jackieChanData.map((c) => c.season))).sort((a, b) => a - b);
  const talismans = Array.from(new Set(jackieChanData.map((c) => c.talisman)))
    .filter((t) => t !== 'None (Demon Wards)' && t !== 'None (Demon Portals)')
    .sort();

  // Toggle watchlist
  const handleToggleWatchlist = (cartoon) => {
    setWatchlist((prev) => {
      const exists = prev.some((item) => item.id === cartoon.id);
      if (exists) {
        return prev.filter((item) => item.id !== cartoon.id);
      } else {
        return [...prev, cartoon];
      }
    });
  };

  // Clear filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedChannel('all');
    setSelectedEra('all');
    setSelectedSeason('all');
    setSelectedTalisman('all');
    setActiveCategory('all');
  };

  // Switch context actions
  const enterJackieChanHub = () => {
    setCurrentShowContext('jackie-chan');
    setTimeout(() => {
      scrollToSection('hero');
    }, 50);
  };

  const leaveJackieChanHub = () => {
    setCurrentShowContext(null);
    setTimeout(() => {
      scrollToSection('hero');
    }, 50);
  };

  // Smooth scroll helper
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Advanced Combined Filtering Logic
  const filteredData = activeData.filter((item) => {
    // 1. Category Pill / Navbar Filter
    if (activeCategory !== 'all') {
      if (activeCategory === 'watchlist') {
        const isFav = watchlist.some((w) => w.id === item.id);
        if (!isFav) return false;
      } else {
        if (currentShowContext === 'jackie-chan') {
          // activeCategory is 'season1', 'season2', 'season3', 'season4', or 'season5'
          let seasonNum = null;
          if (activeCategory === 'season1') seasonNum = 1;
          else if (activeCategory === 'season2') seasonNum = 2;
          else if (activeCategory === 'season3') seasonNum = 3;
          else if (activeCategory === 'season4') seasonNum = 4;
          else if (activeCategory === 'season5') seasonNum = 5;
          if (seasonNum !== null && item.season !== seasonNum) return false;
        } else {
          // activeCategory is '90s Classics', 'Early 2000s Hits', etc.
          if (item.category !== activeCategory) return false;
        }
      }
    }

    // 2. Search Query Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(query);
      const matchesTamil = item.tamilTitle.toLowerCase().includes(query);
      const matchesDesc = item.description.toLowerCase().includes(query);
      const matchesTags = item.tags.some((tag) => tag.toLowerCase().includes(query));

      if (currentShowContext === 'jackie-chan') {
        const matchesTalisman = item.talisman.toLowerCase().includes(query);
        const matchesEpNum = `episode ${item.episode}`.includes(query) || `ep ${item.episode}`.includes(query);
        if (!matchesTitle && !matchesTamil && !matchesDesc && !matchesTalisman && !matchesTags && !matchesEpNum) {
          return false;
        }
      } else {
        const matchesChannel = item.channel.toLowerCase().includes(query);
        const matchesYear = item.year.toString().includes(query);
        if (!matchesTitle && !matchesTamil && !matchesDesc && !matchesChannel && !matchesTags && !matchesYear) {
          return false;
        }
      }
    }

    // 3. Sub-Filters
    if (currentShowContext === 'jackie-chan') {
      if (selectedSeason !== 'all' && item.season !== parseInt(selectedSeason)) return false;
      if (selectedTalisman !== 'all' && item.talisman !== selectedTalisman) return false;
    } else {
      if (selectedChannel !== 'all' && item.channel !== selectedChannel) return false;
      if (selectedEra !== 'all') {
        if (selectedEra === '1990s' && item.year >= 2000) return false;
        if (selectedEra === '2000s' && item.year < 2000) return false;
      }
    }

    return true;
  });

  // Segmenting cartoons for horizontal scroll rows
  const classics90s = filteredData.filter((c) => c.category === '90s Classics');
  const hits2000s = filteredData.filter((c) => c.category === 'Early 2000s Hits');
  const actionAdventure = filteredData.filter((c) => c.category === 'Action & Adventure');

  const season1Episodes = filteredData.filter((c) => c.season === 1);
  const season2Episodes = filteredData.filter((c) => c.season === 2);
  const season3Episodes = filteredData.filter((c) => c.season === 3);
  const season4Episodes = filteredData.filter((c) => c.season === 4);
  const season5Episodes = filteredData.filter((c) => c.season === 5);

  // Grid display conditions
  const isFilteringActive = searchQuery || 
    (currentShowContext === 'jackie-chan' 
      ? (selectedSeason !== 'all' || selectedTalisman !== 'all')
      : (selectedChannel !== 'all' || selectedEra !== 'all'));
  
  const displayGridView = isFilteringActive || activeCategory !== 'all';

  // Dynamic grid title
  let gridTitle = 'Browsing Catalog';
  if (activeCategory === 'watchlist') {
    gridTitle = `My Personal Watchlist (${watchlist.length})`;
  } else if (currentShowContext === 'jackie-chan') {
    if (activeCategory === 'season1') gridTitle = 'Season 1: The Twelve Talismans';
    else if (activeCategory === 'season2') gridTitle = 'Season 2: The Demon Portals';
    else if (activeCategory === 'season3') gridTitle = 'Season 3: The Noble Animals';
    else if (activeCategory === 'season4') gridTitle = 'Season 4: The Oni Masks';
    else if (activeCategory === 'season5') gridTitle = 'Season 5: Relics of Demons Past';
    else if (isFilteringActive) gridTitle = `Search Results (${filteredData.length})`;
    else gridTitle = 'All Episodes';
  } else {
    if (activeCategory !== 'all') gridTitle = `${activeCategory} Collection`;
    else if (isFilteringActive) gridTitle = `Search Results (${filteredData.length})`;
  }

  return (
    <div className="app-container">
      <CustomCursor />
      {/* Keyboard Navigation Hint Toast */}
      <div className="kb-hint" aria-hidden="true">
        <span>⌨️ <kbd>↑↓</kbd> rows &nbsp; <kbd>←→</kbd> cards &nbsp; <kbd>Enter</kbd> play &nbsp; <kbd>Esc</kbd> back</span>
      </div>
      {/* Sleek, Context-Aware Navbar */}
      <Navbar
        currentShowContext={currentShowContext}
        setCurrentShowContext={setCurrentShowContext}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        watchlistCount={watchlist.length}
        scrollToSection={scrollToSection}
        registerZone={registerZone}
        unregisterZone={unregisterZone}
      />

      {/* Hero Banner Section */}
      <Hero
        key={`hero-${currentShowContext || 'general'}`}
        featuredCartoon={featuredCartoon}
        onPlay={setActiveCartoon}
        onExplore={enterJackieChanHub}
        isInWatchlist={watchlist.some((item) => item.id === featuredCartoon.id)}
        onToggleWatchlist={handleToggleWatchlist}
        registerZone={registerZone}
        unregisterZone={unregisterZone}
      />

      {/* Advanced Search & Filter Section */}
      <SearchFilter
        key={`filter-${currentShowContext || 'general'}`}
        currentShowContext={currentShowContext}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        selectedEra={selectedEra}
        setSelectedEra={setSelectedEra}
        selectedSeason={selectedSeason}
        setSelectedSeason={setSelectedSeason}
        selectedTalisman={selectedTalisman}
        setSelectedTalisman={setSelectedTalisman}
        channels={channels}
        eras={eras}
        seasons={seasons}
        talismans={talismans}
        resetFilters={resetFilters}
      />

      {/* Dynamic Content Grid vs Netflix rows */}
      <main key={currentShowContext || 'general'} className="main-content-area" id="categories">
        {displayGridView ? (
          <MovieRow
            title={gridTitle}
            cartoons={filteredData}
            onPlay={setActiveCartoon}
            onExplore={enterJackieChanHub}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            isGrid={true}
            zoneId="grid-main"
            registerZone={registerZone}
            unregisterZone={unregisterZone}
          />
        ) : (
          <>
            {/* Custom Watchlist Row (Only shows if favorites are bookmarked) */}
            {watchlist.length > 0 && (
              <MovieRow
                title="My Personal Watchlist"
                cartoons={watchlist}
                onPlay={setActiveCartoon}
                onExplore={enterJackieChanHub}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
                zoneId="row-watchlist"
                registerZone={registerZone}
                unregisterZone={unregisterZone}
              />
            )}

            {currentShowContext === 'jackie-chan' ? (
              /* Dedicated Jackie Chan Adventures Hub Sections */
              <>
                <MovieRow
                  title="Season 1: The Twelve Talismans (சீசன் 1: 12 தாயத்துக்கள்)"
                  cartoons={season1Episodes}
                  onPlay={setActiveCartoon}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-s1"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
                <MovieRow
                  title="Season 2: The Demon Portals (சீசன் 2: நரகத்தின் கதவுகள்)"
                  cartoons={season2Episodes}
                  onPlay={setActiveCartoon}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-s2"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
                <MovieRow
                  title="Season 3: The Noble Animals (சீசன் 3: உன்னத விலங்குகள்)"
                  cartoons={season3Episodes}
                  onPlay={setActiveCartoon}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-s3"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
                <MovieRow
                  title="Season 4: The Oni Masks (சீசன் 4: ஓனி முகமூடிகள்)"
                  cartoons={season4Episodes}
                  onPlay={setActiveCartoon}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-s4"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
                <MovieRow
                  title="Season 5: Relics of Demons Past (சீசன் 5: அரக்கர்களின் நினைவுச்சின்னங்கள்)"
                  cartoons={season5Episodes}
                  onPlay={setActiveCartoon}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-s5"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
              </>
            ) : (
              /* General Retro Tamil Cartoon Catalog Sections */
              <>
                <MovieRow
                  title="90s Classics (90ஸ் கிளாசிக்ஸ்)"
                  cartoons={classics90s}
                  onPlay={setActiveCartoon}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-90s"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
                <MovieRow
                  title="Early 2000s Hits (2000ஸ் ஹிட்ஸ்)"
                  cartoons={hits2000s}
                  onPlay={setActiveCartoon}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-2000s"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
                <MovieRow
                  title="Action & Adventure (சண்டை & சாகசம்)"
                  cartoons={actionAdventure}
                  onPlay={setActiveCartoon}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-action"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* Streaming Player Modal */}
      {activeCartoon && (
        <VideoModal
          cartoon={activeCartoon}
          onClose={() => setActiveCartoon(null)}
          isFav={watchlist.some((item) => item.id === activeCartoon.id)}
          onToggleFav={handleToggleWatchlist}
        />
      )}

      {/* Sleek Dark Footer */}
      <footer className="footer-container">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="footer-highlight">VINTAGE</span>
            <span className="footer-neon">CARTOON</span>
          </div>
          <p className="footer-text">
            © {new Date().getFullYear()} Vintage Cartoon. All rights reserved. 
            Stream forgotten Tamil cartoons from your childhood entirely for free.
          </p>
          <p className="footer-text">
            Made with <span className="heart-pulsing">♥</span> for 90s kids nostalgia.
          </p>
        </div>
      </footer>
    </div>
  );
}
