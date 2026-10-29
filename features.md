# ✨ Features — Vintage Cartoon

Complete reference for every feature, user-facing control, and data schema in the app.
For dev environment setup see [`developement.md`](developement.md); for deployment see [`deployment.md`](deployment.md).

---

## 1. Content catalog

### 1.1 General retro catalog (`src/data/cartoons.json`)

The home view presents the catalog in **Netflix-style horizontal rows**, each row scrollable with arrow buttons (75% viewport per click):

| Row                  | Source filter                              |
| -------------------- | ------------------------------------------ |
| 90s Classics (90ஸ் கிளாசிக்ஸ்)       | `category === '90s Classics'`              |
| Early 2000s Hits (2000ஸ் ஹிட்ஸ்)     | `category === 'Early 2000s Hits'`          |
| Action & Adventure (சண்டை & சாகசம்) | `category === 'Action & Adventure'`        |

- A **"My Personal Watchlist" row** is prepended automatically whenever the user has favorites saved.
- The catalog contains full series (Dexter's Laboratory, Spider-Man TAS, Ben 10, Tom & Jerry, He-Man, Jackie Chan…) each with Tamil metadata and broadcast channel.
- Channel names (Chutti TV, Cartoon Network, Sun TV, …) are **derived dynamically** from the JSON — add a new channel value and the filter dropdown updates automatically.

### 1.2 Jackie Chan Adventures hub (`src/data/jackie_chan.json`)

A dedicated "Special Features Hub" context, entered via the featured Hero card (or `Explore` buttons):

- **5 season rows**, each with bilingual titles:
  - Season 1: The Twelve Talismans (12 தாயத்துக்கள்)
  - Season 2: The Demon Portals (நரகத்தின் கதவுகள்)
  - Season 3: The Noble Animals (உன்னத விலங்குகள்)
  - Season 4: The Oni Masks (ஓனி முகமூடிகள்)
  - Season 5: Relics of Demons Past (அரக்கர்களின் நினைவுச்சின்னங்கள்)
- **95 episodes currently indexed** (S1: 13, S2: 39, S3: 17, S4: 14, S5: 12).
- Navbar switches to **season pills** (`S1`–`S5`, All Episodes, Watchlist).
- The **Talisman filter** lets users find episodes featuring a specific talisman (Rooster, Ox, Pig, Snake, …). Demon Ward/Demon Portal entries are excluded from the dropdown.
- Every episode lists its talisman power, synopsis, rating, duration and descriptive tags.

### 1.3 View modes: rows vs grid

- **Default:** horizontal rows.
- **Grid mode** (search results card grid) activates automatically when *any* filter is active:
  - search query, or
  - channel/era filters (general view), or
  - season/talisman filters (hub view), or
  - a navbar category selection.
- Empty state: "No nostalgic items found matching your filters."

---

## 2. Search & filtering (`src/components/SearchFilter.jsx`, `src/App.jsx`)

Search is **case-insensitive and bilingual**. Each catalog type has its own match set:

| Catalog        | Matched fields                                                                |
| -------------- | ----------------------------------------------------------------------------- |
| General        | `title`, `tamilTitle`, `description`, `tags[]`, `channel`, `year`             |
| Jackie Chan    | `title`, `tamilTitle`, `description`, `talisman`, `tags[]`, `episode N` / `ep N` |

Filters combine with search (AND logic):

| Context       | Filters                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------- |
| General       | Channel dropdown (derived), Era (`1990s` = year < 2000, `2000s` = year ≥ 2000)                 |
| Jackie Chan   | Season number (parsed int), Talisman dropdown                                                  |

- `Reset` button clears everything (`resetFilters`).
- Filters reset automatically when switching catalog ↔ hub contexts.
- Grid titles are contextual: e.g. `Season 1: The Twelve Talismans`, `Search Results (14)`, `My Personal Watchlist (5)`, `90s Classics Collection`.

---

## 3. Watchlist (favorites)

- Toggle via the **heart button** on cards or in the video modal.
- Stored in **`localStorage` under the key `vintage_watchlist`** as an array of **cartoon id strings** (resolved against the catalog at render time; a legacy full-object list is migrated automatically on first load, so existing users keep their list).
- Every read/write goes through `src/utils/storage.js` (safe `JSON.parse`, shape validation, reset-to-empty on corruption) so a corrupted value can never white-screen the app.
- Syncs to storage on every change; hydrates on first load.
- Navbar shows a **live count badge** on the Watchlist link.
- Watchlist filter is available from both contexts and renders as a grid titled `My Personal Watchlist (N)`.

---

## 4. Video player (`src/components/VideoModal.jsx`)

A fully custom streaming player (no external player library), **lazy-loaded** via `React.lazy` so it is not part of the initial bundle.

### 4.1 Streaming sources

- `videoUrl` → `https://archive.org/download/...mp4` — streamed on demand, never downloaded.
- `audioUrl` (optional) → Tamil dub `.m4a`, streamed in parallel (`preload="metadata"`; fully loads only on play).
- `captionsUrl` (optional) → WebVTT captions, mounted as `<track kind="captions">` on the video element.

### 4.2 Dual-audio sync engine

Some episodes only have the Tamil dub as a **separate audio file** (the video carries its original/other track). The player runs in **dual-element mode**:

- Video element: `muted = true`, `volume = 0`.
- Audio element: drives real volume and mute state (default `volume = 0.8`).
- **Drift correction:** on every `timeupdate`, if `|video.currentTime - audio.currentTime| > 0.15s`, audio is re-aligned to video.
- On **seeking**, audio seeks to video position; play/pause and buffering are mirrored across both elements.
- Single-element mode (no `audioUrl`): the video element plays sound directly.

### 4.3 Controls

| Control                          | Behavior                                                        |
| -------------------------------- | --------------------------------------------------------------- |
| Play / Pause                     | Mirrored across video + audio elements                          |
| Volume slider + Mute toggle      | Applies to the active audio source                              |
| Seek bar                         | Click/drag; syncs both elements; disabled until `duration > 0`  |
| ⏪ / ⏩ (±10s)                    | Relative seek with clamping                                     |
| Fullscreen                       | Fullscreen API on the modal wrapper; Escape exits fullscreen without closing the modal |
| Buffering spinner                | Shown while `waiting`/`stalled`, hidden on `playing`/`canplay`  |
| Streaming failure                | Media/network errors render a friendly "can't reach the archive" card with a **Retry** button — never a silent failure |
| Auto-hide controls               | Fade out after 3s during playback; reappear on mouse movement   |
| Escape                           | Closes the modal (unless in native fullscreen)                  |
| Background scroll lock           | `document.body.style.overflow = 'hidden'` while open            |
| Time display                     | `currentTime / duration` updated live                           |

### 4.4 Info panel

Each modal also shows the episode/show meta strip: **rating (star), talisman/age badge (shield), duration (clock), info** — plus title, Tamil title, synopsis, tags and a favorite toggle.

### 4.4 Progress, preferences & failures

- **Resume ("continue watching"):** the last position per `id` is saved to `localStorage` key **`vintage_progress`** during playback; reopening the same title auto-seeks back to it. Another win from flaw fix F19 (the dead `startAt` path was replaced with real resume).
- **Player preferences:** volume + mute persist to **`vintage_player_prefs`** and are restored on the next open (flaw fix F24).
- **Playback state is event-driven:** the play button reflects real media events (`playing` / `waiting` / `error`), not optimistic UI (flaw fix F12).

---

## 5. Keyboard navigation (`src/hooks/useKeyboardNav.js`)

Global, zone-based focus engine — the entire site is operable without a mouse.

**Focus zones** (registered top-down, sorted by document position):

| Zone          | Registered by      | Elements                          |
| ------------- | ------------------ | --------------------------------- |
| `navbar`      | `Navbar.jsx`       | Category buttons                  |
| `hero`        | `Hero.jsx`         | Play / Explore / Watchlist buttons|
| `grid-main`   | `App.jsx`          | Grid cards (grid mode)            |
| `row-*`       | each `MovieRow`    | Card poster buttons (`.card-thumbnail-btn`) |
| `footer` etc. | as wired           |                                   |

**Controls:**

| Key               | Action                                        |
| ----------------- | --------------------------------------------- |
| `←` / `→`         | Move focus within the current row/nav         |
| `↑` / `↓`         | Jump between zones                            |
| `Enter` / `Space` | Activate the focused element                  |
| `Escape`          | Close modal, else clear focus and blur        |

- Typing in `input`/`textarea` is never intercepted.
- Focused cards scroll into view (`block: 'nearest'`).

---

## 6. Visual design & interactions

- **Neon retro theme** (`src/index.css`, ~38KB design system): dark cinematic background, neon glows, pulsing hearts, film-grain vibes.
- **Scroll reveal:** every element with `.lazy-reveal` gains `.revealed` when ≥5% visible via `IntersectionObserver` (re-initialized per context/filter change). Variant classes: `reveal-down`, `reveal-up`, `reveal-right`, `reveal-scale`, `delay-100`–`delay-500`.
- **Custom cursor** (`CustomCursor.jsx`): neon dot follows the pointer; scales up on interactive hover (a/button/select/input/cards/nav); click pulse; **disabled on touch devices / viewports ≤1024px**.
- Responsive: mobile layout switches to touch-friendly controls with native cursor.

---

## 7. SEO & metadata (`index.html`)

- Title: *Vintage Cartoon | Stream Free Nostalgic Tamil Cartoons (90s & 2000s)*.
- Description + keywords targeting Tamil cartoon nostalgia searches.
- **Open Graph** and **Twitter card** tags (summary_large_image).
- `theme-color` matching the app background (#07070a).
- **Performance pre-warming:** `preconnect` to `fonts.googleapis.com`, `fonts.gstatic.com`, and `archive.org`; `preload` of the featured hero image.

---

## 8. Performance & build (`vite.config.js`)

| Technique                    | Detail                                                            |
| ---------------------------- | ----------------------------------------------------------------- |
| Manual vendor chunks         | `vendor-react` (react/scheduler), `vendor-icons` (lucide), `vendor-libs` |
| Lazy route-level chunk       | `VideoModal.jsx` split into its own chunk (`React.lazy`)           |
| CSS code splitting           | `cssCodeSplit: true`                                               |
| Chunk size warning limit     | 800 kB                                                             |
| Scroll-reveal observer       | Single shared `IntersectionObserver`                                |

Resulting production bundle (verified build): initial JS ≈ 338 kB uncompressed / ≈ 88 kB gzip across three chunks, VideoModal chunk ≈ 8.9 kB.

---

## 9. Data schemas

### 9.1 `cartoons.json` (general catalog)

```jsonc
{
  "id": "dexter-lab",                    // unique slug
  "title": "Dexter's Laboratory",
  "tamilTitle": "டெக்ஸ்டரின் பரிசோதனைக்கூடம்",
  "description": "…",
  "thumbnail": "https://…",              // archive.org .thumbs/ or placeholder
  "videoUrl": "https://archive.org/download/<item>/<file>.mp4",
  "audioUrl": "https://…m4a",            // OPTIONAL Tamil dub track
  "captionsUrl": "https://…vtt",         // OPTIONAL WebVTT captions track
  "category": "90s Classics",            // '90s Classics' | 'Early 2000s Hits' | 'Action & Adventure'
  "year": 1996,
  "channel": "Cartoon Network",          // dropdown options derive from values here
  "duration": "24 min",
  "rating": "9.2",
  "tags": ["Sci-Fi", "Comedy"],
  "isFeatured": false,
  "isShowHubEntry": false                // true ONLY for the hub-entry card
}
```

**Hub entry card:** the first object (`id: "jackie-chan"`) has `isShowHubEntry: true` and an **empty `videoUrl`** — clicking it enters the hub instead of playing media. Keep exactly one such card.

### 9.2 `jackie_chan.json` (hub episodes)

```jsonc
{
  "id": "s1e01",                         // s<season>e<episode>
  "title": "The Dark Hand",
  "tamilTitle": "தி டார்க் ஹேண்ட்",
  "description": "…",
  "thumbnail": "https://archive.org/…/.thumbs/…jpg",
  "videoUrl": "https://archive.org/download/<item>/<file>.mp4",
  "audioUrl": "https://archive.org/download/<tamil-dub-item>/Season_1/S01E01_…_Tamil.m4a",
  "captionsUrl": "https://…vtt",         // OPTIONAL WebVTT captions track
  "season": 1,                           // integer 1–5
  "episode": 1,                          // integer within season
  "talisman": "Rooster (Levitation)",    // or 'None (Demon Wards)' etc.
  "duration": "21 min",
  "rating": "9.5",
  "tags": ["Rooster Talisman", "Section 13"],
  "isFeatured": false
}
```

See [`developement.md § Adding a new cartoon`](developement.md) for the step-by-step recipe and archive.org URL rules.

---

## 10. Roadmap highlights

Open work is tracked in [`pendingworks.md`](pendingworks.md). **Recently done:** all 24 documented design flaws (see [`design_flaws.md`](design_flaws.md)), resume/progress ("continue watching"), debounced search, hub-data verification (Season 1 and Tamil-dub coverage were already complete). **Near-term:** show-accurate video/thumbnail mapping for the remaining placeholder entries (several cards still play generic archive shorts until mapped), URL deep links, CI lint gate, and PWA basics. The catalog also gained 10 genuine public-domain **Classic Reels** entries (Superman, Popeye, Mighty Mouse, Betty Boop, Gulliver's Travels) with archive-verified stream URLs.
