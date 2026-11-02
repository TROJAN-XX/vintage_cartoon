import React from 'react';
import { Search, RefreshCw, Calendar, Tv, Shield } from 'lucide-react';

export default function SearchFilter({ 
  hub,
  searchQuery, 
  setSearchQuery, 
  selectedChannel, 
  setSelectedChannel, 
  selectedEra, 
  setSelectedEra,
  selectedSeason,
  setSelectedSeason,
  selectedTalisman,
  setSelectedTalisman,
  channels,
  eras,
  seasons,
  talismans,
  resetFilters
}) {
  const isFilterActive = searchQuery || 
    (hub 
      ? (selectedSeason !== 'all' || selectedTalisman !== 'all')
      : (selectedChannel !== 'all' || selectedEra !== 'all'));

  return (
    <section className="search-filter-section" id="search-section">
      <div className="search-filter-container">
        
        {/* Search Bar Input */}
        <div className="search-bar-wrapper lazy-reveal reveal-down">
          <Search className="search-bar-icon" />
          <input
            type="text"
            className="search-bar-input"
            placeholder={
              hub
                ? hub.searchHint
                : "Search cartoons by title, characters, tags, or memory..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              &times;
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="filter-controls-row lazy-reveal reveal-up delay-100">
          
          {hub ? (
            /* Dedicated Hub Episode Controls (generic — see src/data/hubs.js) */
            <>
              {/* Season / Era Filters */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={14} className="filter-label-icon" />
                  <span>{hub.seasonGroupName}</span>
                </label>
                <div className="filter-pills">
                  <button
                    onClick={() => setSelectedSeason('all')}
                    className={`filter-pill ${selectedSeason === 'all' ? 'active' : ''}`}
                  >
                    {hub.allSeasonsLabel}
                  </button>
                  {seasons.map((season) => (
                    <button
                      key={season.num}
                      onClick={() => setSelectedSeason(String(season.num))}
                      className={`filter-pill ${selectedSeason === String(season.num) ? 'active' : ''}`}
                    >
                      {season.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Filter Dropdown — only for hubs that declare one */}
              {talismans.length > 0 && (
                <div className="filter-group">
                  <label className="filter-label">
                    <Shield size={14} className="filter-label-icon" />
                    <span>Talisman Power</span>
                  </label>
                  <div className="custom-select-wrapper">
                    <select
                      value={selectedTalisman}
                      onChange={(e) => setSelectedTalisman(e.target.value)}
                      className="talisman-select-neon"
                    >
                      <option value="all">All Talismans</option>
                      {talismans.map((talisman) => (
                        <option key={talisman} value={talisman}>
                          {talisman}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* General Cartoon Catalog Controls */
            <>
              {/* Channel Filters */}
              <div className="filter-group">
                <label className="filter-label">
                  <Tv size={14} className="filter-label-icon" />
                  <span>Channel</span>
                </label>
                <div className="filter-pills">
                  <button
                    onClick={() => setSelectedChannel('all')}
                    className={`filter-pill ${selectedChannel === 'all' ? 'active' : ''}`}
                  >
                    All
                  </button>
                  {channels.map((chan) => (
                    <button
                      key={chan}
                      onClick={() => setSelectedChannel(chan)}
                      className={`filter-pill ${selectedChannel === chan ? 'active' : ''}`}
                    >
                      {chan}
                    </button>
                  ))}
                </div>
              </div>

              {/* Era Filters */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={14} className="filter-label-icon" />
                  <span>Era</span>
                </label>
                <div className="filter-pills">
                  <button
                    onClick={() => setSelectedEra('all')}
                    className={`filter-pill ${selectedEra === 'all' ? 'active' : ''}`}
                  >
                    All Eras
                  </button>
                  {eras.map((era) => (
                    <button
                      key={era}
                      onClick={() => setSelectedEra(era)}
                      className={`filter-pill ${selectedEra === era ? 'active' : ''}`}
                    >
                      {era}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reset Filters CTA */}
          {isFilterActive && (
            <button className="reset-filters-btn-glowing" onClick={resetFilters}>
              <RefreshCw size={14} className="reset-icon" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

      </div>
    </section>
  );
}
