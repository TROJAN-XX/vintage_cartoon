import React, { useState, useEffect, useRef, useMemo } from 'react';
import cartoonsData from './data/cartoons.json';
import { HUBS } from './data/hubs';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SearchFilter from './components/SearchFilter';
import MovieRow from './components/MovieRow';
import CustomCursor from './components/CustomCursor';
import Loader from './components/Loader';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { readWatchlistIds, writeWatchlistIds, readProgressMap, writeProgress } from './utils/storage';

const VideoModal = React.lazy(() => import('./components/VideoModal'));

// ---------------------------------------------------------------------------
// P2-1 deep linking (hash routes — no router dependency; the server always
// serves index.html, and the hash never reaches it, so refresh + share work
// on any static host).  Formats:
//   #/                          → general catalog, no modal
//   #/watch/<id>                → catalog + open modal for <id>
//   #/show/<hub>                → dedicated show hub (see src/data/hubs.js)
//   #/show/<hub>/<id>           → hub + open episode <id>
// ---------------------------------------------------------------------------
function parseRoute(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'show' && HUBS[parts[1]]) {
    return { context: parts[1], watchId: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  if (parts[0] === 'watch' && parts[1]) {
    return { context: null, watchId: decodeURIComponent(parts[1]) };
  }
  if (parts.length === 1 && parts[0]) {
    // Bare id (e.g. #/s1e05) — resolve against whichever catalog is active.
    return { context: null, watchId: decodeURIComponent(parts[0]) };
  }
  return { context: null, watchId: null };
}

function serializeRoute(context, watchId) {
  const enc = watchId ? encodeURIComponent(watchId) : null;
  if (context && HUBS[context]) {
    return enc ? `#/show/${context}/${enc}` : `#/show/${context}`;
  }
  return enc ? `#/watch/${enc}` : '#/';
}

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

  // Navigation context state: null (general catalog) or a hub id from src/data/hubs.js
  // Seeded from the URL so a shared deep link lands in the right context on refresh (P2-1).
  const [currentShowContext, setCurrentShowContext] = useState(
    () => parseRoute(typeof window !== 'undefined' ? window.location.hash : '').context
  );

  // Id requested by the current hash — resolved to a catalog object (and opened)
  // once its data is available (hub episodes wait for the lazy JSON load).
  const [routeWatchId, setRouteWatchId] = useState(
    () => parseRoute(typeof window !== 'undefined' ? window.location.hash : '').watchId
  );

  // Helper: write the current route to the URL without adding a history entry.
  const replaceRoute = (context, watchId) => {
    const target = serializeRoute(context, watchId);
    const current = window.location.hash || '#/';
    if (current === target) return;
    window.history.replaceState(null, '', target);
  };

  // Helper: user-driven context switch (keeps the URL shareable, replaces history).
  const changeContext = (nextContext) => {
    setCurrentShowContext(nextContext);
    replaceRoute(nextContext, activeCartoon?.id ?? routeWatchId ?? null);
  };

  // Helper: close the modal and normalize the URL (replace, so back-button
  // history isn't polluted with open/close churn).
  const closeModal = () => {
    setActiveCartoon(null);
    setRouteWatchId(null);
    replaceRoute(currentShowContext, null);
  };

  // Keyboard navigation, wired to real modal state (flaw fix F6)
  const { registerZone, unregisterZone } = useKeyboardNav({
    modalOpen: !!activeCartoon,
    onCloseModal: () => closeModal(),
  });

  // P4-3: fade out + remove the first-paint brand loader once React has
  // actually mounted (this effect runs after the first commit). The double
  // rAF ensures the app has painted underneath before the fade starts.
  useEffect(() => {
    const loader = document.getElementById('page-loader');
    if (!loader) return;
    const raf2 = requestAnimationFrame(() => {
      loader.classList.add('page-loader--hidden');
      loader.addEventListener(
        'transitionend',
        () => loader.remove(),
        { once: true }
      );
      // Fallback removal in case transitionend never fires (e.g. reduced motion).
      setTimeout(() => loader.remove(), 900);
    });
    return () => cancelAnimationFrame(raf2);
  }, []);

  // Hub episode databases — lazily loaded per hub on first entry (flaw fix F9).
  // Keyed by hub id (see src/data/hubs.js): { 'jackie-chan': [...], 'tom-jerry': [...] }
  const [hubData, setHubData] = useState({});
  const [episodesLoading, setEpisodesLoading] = useState(false);

  useEffect(() => {
    const ctx = currentShowContext;
    if (!ctx || !HUBS[ctx] || hubData[ctx]) return;
    let cancelled = false;
    setEpisodesLoading(true);
    HUBS[ctx].load()
      .then((mod) => {
        if (!cancelled) setHubData((prev) => ({ ...prev, [ctx]: mod.default }));
      })
      .catch((err) => console.error('Failed to load episode database:', err))
      .finally(() => {
        if (!cancelled) setEpisodesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentShowContext, hubData]);

  // P2-1: reconcile state whenever the URL hash changes (back/forward, manual
  // edit, or a hash pushed by an open action). Reads only — never writes back.
  useEffect(() => {
    const reconcile = () => {
      const route = parseRoute(window.location.hash);
      setCurrentShowContext(route.context);
      if (route.watchId) {
        setRouteWatchId(route.watchId);
      } else {
        setRouteWatchId(null);
        // No modal target in the URL → close any open modal (browser back).
        setActiveCartoon((current) => (current ? null : current));
      }
    };
    window.addEventListener('hashchange', reconcile);
    return () => window.removeEventListener('hashchange', reconcile);
  }, []);

  // P2-1: resolve the requested watch id into a catalog object and open it.
  // Hub episodes wait for the lazily-loaded JSON; general entries resolve immediately.
  useEffect(() => {
    if (!routeWatchId) return;
    if (currentShowContext) {
      const episodes = hubData[currentShowContext];
      if (!episodes) return; // wait for the lazy load to finish
      const episode = episodes.find((c) => c.id === routeWatchId);
      if (episode) setActiveCartoon(episode);
      setRouteWatchId(null);
    } else {
      const entry = cartoonsData.find((c) => c.id === routeWatchId);
      if (entry) setActiveCartoon(entry);
      setRouteWatchId(null);
    }
  }, [routeWatchId, currentShowContext, hubData]);

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
    Object.values(hubData).forEach((episodes) => episodes.forEach((c) => byId.set(c.id, c)));
    return watchlistIds.map((id) => byId.get(id)).filter(Boolean);
  }, [watchlistIds, hubData]);

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
    // Push a shareable deep link so the browser back button closes the modal (P2-1).
    const target = serializeRoute(currentShowContext, cartoon.id);
    if ((window.location.hash || '#/') !== target) window.location.hash = target;
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

  // Enter a dedicated show hub (id = hub id = hub-entry card id in cartoons.json)
  const enterHub = (hubId) => {
    if (!HUBS[hubId]) return;
    changeContext(hubId);
    setTimeout(() => scrollToSection('hero'), 50);
  };

  const leaveHub = () => {
    changeContext(null);
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
    hubData,
    episodesLoading,
  ]);

  // Active hub (dedicated show context) config + episodes, if any
  const activeHub = currentShowContext && HUBS[currentShowContext] ? HUBS[currentShowContext] : null;
  const activeHubEpisodes = activeHub ? hubData[currentShowContext] || null : null;

  // Determine active database based on context
  const activeData = activeHub ? activeHubEpisodes || [] : cartoonsData;

  // Featured Hero Item
  const featuredCartoon = activeData.find((c) => c.isFeatured) || activeData[0];

  // Helper lists extracted dynamically
  const channels = Array.from(new Set(cartoonsData.map((c) => c.channel)));
  const eras = ['1990s', '2000s'];
  // Season/era pills for the active hub (labels come from the hub config)
  const seasons = useMemo(() => {
    if (!activeHub || !activeHubEpisodes) return [];
    return Array.from(new Set(activeHubEpisodes.map((c) => c.season)))
      .sort((a, b) => a - b)
      .map((num) => ({
        num,
        label: (activeHub.seasons.find((s) => s.num === num) || {}).label || `Season ${num}`,
      }));
  }, [activeHub, activeHubEpisodes]);
  // Secondary hub filter — only hubs that declare one (Jackie Chan: talisman)
  const talismans = useMemo(() => {
    if (activeHub?.secondFilter !== 'talisman' || !activeHubEpisodes) return [];
    return Array.from(new Set(activeHubEpisodes.map((c) => c.talisman)))
      .filter((t) => t !== 'None (Demon Wards)' && t !== 'None (Demon Portals)')
      .sort();
  }, [activeHub, activeHubEpisodes]);

  // Advanced Combined Filtering Logic
  const filteredData = activeData.filter((item) => {
    // 1. Category Pill / Navbar Filter
    if (activeCategory !== 'all') {
      if (activeCategory === 'watchlist') {
        const isFav = watchlistIds.some((id) => id === item.id);
        if (!isFav) return false;
      } else {
        if (activeHub) {
          // Hub season/era pills: "season1".."seasonN" (any hub — see hubs.js)
          if (activeCategory.startsWith('season')) {
            const seasonNum = parseInt(activeCategory.slice('season'.length), 10);
            if (!Number.isNaN(seasonNum) && item.season !== seasonNum) return false;
          }
        } else {
          if (item.category !== activeCategory) return false;
        }
      }
    }

    // 2. Search Query Filter (debounced — P2-3)
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(query);
      const matchesTamil = (item.tamilTitle || '').toLowerCase().includes(query);
      const matchesDesc = (item.description || '').toLowerCase().includes(query);
      const matchesTags = item.tags.some((tag) => tag.toLowerCase().includes(query));

      if (activeHub) {
        const matchesTalisman = item.talisman
          ? item.talisman.toLowerCase().includes(query)
          : false;
        const matchesYear = item.year ? item.year.toString().includes(query) : false;
        const matchesEpNum = `episode ${item.episode}`.includes(query) || `ep ${item.episode}`.includes(query);
        if (!matchesTitle && !matchesTamil && !matchesDesc && !matchesTalisman && !matchesTags && !matchesYear && !matchesEpNum) {
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
    if (activeHub) {
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

  // One row per hub season/era that has episodes (config-driven — hubs.js)
  const hubSeasonRows = (activeHub?.seasons || [])
    .map((s) => ({ ...s, episodes: filteredData.filter((c) => c.season === s.num) }))
    .filter((s) => s.episodes.length > 0);

  // Grid display conditions
  const isFilteringActive = debouncedSearch ||
    (activeHub
      ? (selectedSeason !== 'all' || selectedTalisman !== 'all')
      : (selectedChannel !== 'all' || selectedEra !== 'all'));

  const displayGridView = isFilteringActive || activeCategory !== 'all';

  // Dynamic grid title
  let gridTitle = 'Browsing Catalog';
  if (activeCategory === 'watchlist') {
    gridTitle = `My Personal Watchlist (${watchlist.length})`;
  } else if (activeHub) {
    if (activeCategory.startsWith('season')) {
      const seasonNum = parseInt(activeCategory.slice('season'.length), 10);
      const seasonCfg = (activeHub.seasons || []).find((s) => s.num === seasonNum);
      if (seasonCfg) gridTitle = seasonCfg.gridTitle;
    }
    if (gridTitle === 'Browsing Catalog') {
      if (isFilteringActive) gridTitle = `Search Results (${filteredData.length})`;
      else gridTitle = 'All Episodes';
    }
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
        setCurrentShowContext={changeContext}
        hub={activeHub}
        onExitHub={leaveHub}
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
        onExplore={enterHub}
        isInWatchlist={featuredCartoon ? watchlist.some((item) => item.id === featuredCartoon.id) : false}
        onToggleWatchlist={handleToggleWatchlist}
        registerZone={registerZone}
        unregisterZone={unregisterZone}
      />

      {/* Advanced Search & Filter Section */}
      <SearchFilter
        key={`filter-${currentShowContext || 'general'}`}
        hub={activeHub}
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
        {activeHub && episodesLoading && (
          <div className="episodes-loading lazy-reveal" role="status">
            <Loader label="Opening the archive…" />
          </div>
        )}

        {displayGridView ? (
          <MovieRow
            title={gridTitle}
            cartoons={filteredData}
            onPlay={handlePlay}
            onExplore={enterHub}
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
                onExplore={enterHub}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
                zoneId="row-watchlist"
                registerZone={registerZone}
                unregisterZone={unregisterZone}
              />
            )}

            {activeHub && !episodesLoading ? (
              /* Dedicated Show Hub Sections — one row per configured season/era */
              hubSeasonRows.map((s) => (
                <MovieRow
                  key={`hub-row-${s.num}`}
                  title={s.rowTitle}
                  cartoons={s.episodes}
                  onPlay={handlePlay}
                  onExplore={enterHub}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  zoneId={`row-s${s.num}`}
                  registerZone={registerZone}
                  unregisterZone={unregisterZone}
                />
              ))
            ) : !currentShowContext ? (
              /* General Retro Tamil Cartoon Catalog Sections */
              <>
                <MovieRow
                  title="90s Classics (90ஸ் கிளாசிக்ஸ்)"
                  cartoons={classics90s}
                  onPlay={handlePlay}
                  onExplore={enterHub}
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
                  onExplore={enterHub}
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
                  onExplore={enterHub}
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
        <React.Suspense fallback={<Loader label="Waking up the player…" />}>
          <VideoModal
            cartoon={activeCartoon}
            onClose={() => closeModal()}
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
