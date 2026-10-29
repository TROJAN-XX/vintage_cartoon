import React, { useState, useEffect, useRef, useMemo } from 'react';
import cartoonsData from './data/cartoons.json';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SearchFilter from './components/SearchFilter';
import MovieRow from './components/MovieRow';
import CustomCursor from './components/CustomCursor';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { readWatchlistIds, writeWatchlistIds, readProgressMap, writeProgress } from './utils/storage';

const VideoModal = React.lazy(() => import('./components/VideoModal'));

export default function App() {
  // Watchlist persisted state (id strings only — flaw fix F8)
  const [watchlistIds, setWatchlistIds] = useState(() => {
    try {
      return readWatchlistIds();
    } catch {
      return [];
    }
  });

  // Streaming modal state
  const [activeCartoon, setActiveCartoon] = useState(null);

  // Search & Filter state (input updates instantly; filtering uses the debounced value — P2-3)
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);

  // General view sub-filters
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedEra, setSelectedEra] = useState('all');

  // Jackie Chan view sub-filters
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedTalisman, setSelectedTalisman] = useState('all');

  // Navbar navigation category filter
  const [activeCategory, setActiveCategory] = useState('all');

  // Navigation context state: null (general catalog) or 'jackie-chan' (dedicated hub)
  const [currentShowContext, setCurrentShowContext] = useState(null);

  // Keyboard navigation, wired to real modal state (flaw fix F6)
  const { registerZone, unregisterZone } = useKeyboardNav({
    modalOpen: !!activeCartoon,
    onCloseModal: () => setActiveCartoon(null),
  });

  // Hub episode database — lazy-loaded on first entry (flaw fix F9)
  const [jackieChanData, setJackieChanData] = useState(null);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  useEffect(() => {
    if (currentShowContext !== 'jackie-chan' || jackieChanData) return;
    let cancelled = false;
    setEpisodesLoading(true);
    import('./data/jackie_chan.json')
      .then((mod) => {
        if (!cancelled) setJackieChanData(mod.default);
      })
      .catch((err) => console.error('Failed to load episode database:', err))
      .finally(() => {
        if (!cancelled) setEpisodesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentShowContext, jackieChanData]);

  // Persist watchlist (ids) to localStorage
  useEffect(() => {
    writeWatchlistIds(watchlistIds);
  }, [watchlistIds]);

  // Toggle watchlist
  const handleToggleWatchlist = (cartoon) => {
    if (!cartoon?.id) return;
    setWatchlistIds((prev) => {
      const exists = prev.some((id) => id === cartoon.id);
      return exists ? prev.filter((id) => id !== cartoon.id) : [...prev, cartoon.id];
    });
  };

  // Watchlist display objects derived from the CURRENT database (fixes stale copies — F8)
  const watchlist = useMemo(() => {
    const byId = new Map(cartoonsData.map((c) => [c.id, c]));
    (jackieChanData || []).forEach((c) => byId.set(c.id, c));
    return watchlistIds.map((id) => byId.get(id)).filter(Boolean);
  }, [watchlistIds, jackieChanData]);

  // "Continue watching" progress map (flaw fix F19 → real resume support, P2-2)
  const progressMapRef = useRef(readProgressMap());
  const handleSaveProgress = (cartoon, seconds) => {
    if (!cartoon?.id) return;
    writeProgress(cartoon.id, seconds);
    progressMapRef.current = readProgressMap();
  };

  // Handle "play" from anywhere — never opens the player without media (P0-3 guard)
  const handlePlay = (cartoon) => {
    if (!cartoon?.videoUrl && !cartoon?.audioUrl) return;
    setActiveCartoon(cartoon);
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

  // Single source of truth for hub navigation (flaw fix F7)
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const enterJackieChanHub = () => {
    setCurrentShowContext('jackie-chan');
    setTimeout(() => scrollToSection('hero'), 50);
  };

  const leaveJackieChanHub = () => {
    setCurrentShowContext(null);
    setTimeout(() => scrollToSection('hero'), 50);
  };

  // Reset category when switching show contexts
  useEffect(() => {
    resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShowContext]);

  // Persistent scroll-reveal observer (created once; only unrevealed nodes are observed).
  // On-screen elements are revealed immediately so repeated filter changes feel instant.
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px',
      }
    );
    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const observer = observerRef.current;
      if (!observer) return;
      document.querySelectorAll('.lazy-reveal:not(.revealed)').forEach((el) => {
        // Elements already in the viewport reveal instantly (no artificial delay)
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('revealed');
        } else {
          observer.observe(el);
        }
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [
    currentShowContext,
    activeCategory,
    debouncedSearch,
    selectedSeason,
    selectedTalisman,
    selectedChannel,
    selectedEra,
    jackieChanData,
    episodesLoading,
  ]);

  // Determine active database based on context
  const activeData = currentShowContext === 'jackie-chan' ? jackieChanData || [] : cartoonsData;

  // Featured Hero Item
  const featuredCartoon = activeData.find((c) => c.isFeatured) || activeData[0];

  // Helper lists extracted dynamically
  const channels = Array.from(new Set(cartoonsData.map((c) => c.channel)));
  const eras = ['1990s', '2000s'];
  const seasons = useMemo(
    () => Array.from(new Set((jackieChanData || []).map((c) => c.season))).sort((a, b) => a - b),
    [jackieChanData]
  );
  const talismans = useMemo(
    () =>
      Array.from(new Set((jackieChanData || []).map((c) => c.talisman)))
        .filter((t) => t !== 'None (Demon Wards)' && t !== 'None (Demon Portals)')
        .sort(),
    [jackieChanData]
  );

  // Advanced Combined Filtering Logic
  const filteredData = activeData.filter((item) => {
    // 1. Category Pill / Navbar Filter
    if (activeCategory !== 'all') {
      if (activeCategory === 'watchlist') {
        const isFav = watchlistIds.some((id) => id === item.id);
        if (!isFav) return false;
      } else {
        if (currentShowContext === 'jackie-chan') {
          let seasonNum = null;
          if (activeCategory === 'season1') seasonNum = 1;
          else if (activeCategory === 'season2') seasonNum = 2;
          else if (activeCategory === 'season3') seasonNum = 3;
          else if (activeCategory === 'season4') seasonNum = 4;
          else if (activeCategory === 'season5') seasonNum = 5;
          if (seasonNum !== null && item.season !== seasonNum) return false;
        } else {
          if (item.category !== activeCategory) return false;
        }
      }
    }

    // 2. Search Query Filter (debounced — P2-3)
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
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
  const isFilteringActive = debouncedSearch ||
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
      {/* Sleek, Context-Aware Navbar */}
      <Navbar
        currentShowContext={currentShowContext}
        setCurrentShowContext={setCurrentShowContext}
        onExitHub={leaveJackieChanHub}
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
        onPlay={handlePlay}
        onExplore={enterJackieChanHub}
        isInWatchlist={featuredCartoon ? watchlist.some((item) => item.id === featuredCartoon.id) : false}
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
        {currentShowContext === 'jackie-chan' && episodesLoading && (
          <div className="episodes-loading lazy-reveal" role="status">
            <div className="spinner-loader"></div>
            <p>Opening the archive…</p>
          </div>
        )}

        {displayGridView ? (
          <MovieRow
            title={gridTitle}
            cartoons={filteredData}
            onPlay={handlePlay}
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
                onPlay={handlePlay}
                onExplore={enterJackieChanHub}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
                zoneId="row-watchlist"
                registerZone={registerZone}
                unregisterZone={unregisterZone}
              />
            )}

            {currentShowContext === 'jackie-chan' && !episodesLoading ? (
              /* Dedicated Jackie Chan Adventures Hub Sections */
              <>
                <MovieRow
                  title="Season 1: The Twelve Talismans (சீசன் 1: 12 தாயத்துக்கள்)"
                  cartoons={season1Episodes}
                  onPlay={handlePlay}
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
                  onPlay={handlePlay}
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
                  onPlay={handlePlay}
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
                  onPlay={handlePlay}
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
                  onPlay={handlePlay}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-s5"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
              </>
            ) : !currentShowContext ? (
              /* General Retro Tamil Cartoon Catalog Sections */
              <>
                <MovieRow
                  title="90s Classics (90ஸ் கிளாசிக்ஸ்)"
                  cartoons={classics90s}
                  onPlay={handlePlay}
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
                  onPlay={handlePlay}
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
                  onPlay={handlePlay}
                  onExplore={enterJackieChanHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId="row-action"
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
              </>
            ) : null}
          </>
        )}
      </main>

      {/* Streaming Player Modal */}
      {activeCartoon && (
        <React.Suspense fallback={null}>
          <VideoModal
            cartoon={activeCartoon}
            onClose={() => setActiveCartoon(null)}
            isFav={watchlist.some((item) => item.id === activeCartoon.id)}
            onToggleFav={handleToggleWatchlist}
            resumeAt={progressMapRef.current[activeCartoon.id] || 0}
            onProgressSave={(seconds) => handleSaveProgress(activeCartoon, seconds)}
          />
        </React.Suspense>
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
