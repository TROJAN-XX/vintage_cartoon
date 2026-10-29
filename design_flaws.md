# 🩺 Design Flaws — Vintage Cartoon

Flaws found by a full audit of the code (components, hooks, data, build config). Every entry cites **file:line** evidence, impact, and a suggested fix. Flaws marked 🔗 also exist as tracked tasks in [`pendingworks.md`](pendingworks.md) — this doc adds code-level detail and severity.

**Severity legend:** 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low
**Status:** ⬜ open · ✅ fixed (PR #)

---

## 🔴 Critical

### F1. Video player renders "Season undefined / Episode undefined / Talisman: undefined" for general-catalog entries
**Where:** `src/components/VideoModal.jsx` — `:390` (top-bar title), `:455–461` (badge container), `:484` (talisman meta), `:496` (section title "Episode Synopsis & Talisman Hunt")
**Evidence:** The info panel and top bar unconditionally read `cartoon.season`, `cartoon.episode`, `cartoon.talisman` — fields that only exist on Jackie Chan episodes. General-catalog objects (`src/data/cartoons.json`) don't have them, so any general video opens a player titled **"Dexter's Laboratory - Season undefined Episode undefined"** with a **"Talisman: undefined"** meta row and an **"Episode Synopsis & Talisman Hunt"** header. The card layer branches correctly (`isShowHubEntry`/`isEpisode` in `MovieRow.jsx:111–112`), but the player was never adapted.

**Impact:** Every general-catalog play shows broken metadata — the single most user-visible bug in the app.
**Fix:** Branch on context like the cards do: show `channel`/`year` badges and an "Overview" section title for non-episode entries (reuse `cartoon.channel`, `cartoon.year`); render the Talisman row only when `cartoon.talisman` exists.

### F2. Unguarded `JSON.parse` of localStorage can white-screen the app on load
**Where:** `src/App.jsx:29–31`
```jsx
const saved = localStorage.getItem('vintage_watchlist');
return saved ? JSON.parse(saved) : [];
```
**Impact:** A corrupted, truncated, or schema-drifted `vintage_watchlist` value throws inside the state initializer — before any error boundary could exist — producing a blank white page with no way for the user to recover (they cannot clear site data through the app).
**Fix:** Wrap in `try/catch`, validate that the result is an array of objects with an `id`, and reset to `[]` on any failure. (Related: F8.)

### F3. No Error Boundary anywhere — any render error is a blank page
**Where:** `src/main.jsx` (plain `<App />` mount), all components
**Impact:** Combined with F2 and the unguarded reads below, any runtime error during render (bad data shape, missing field, media event crash) yields an unrecoverable blank screen. There is also no crash-report path.
**Fix:** Add a top-level `ErrorBoundary` in `main.jsx` that renders a friendly "something broke — clear filters and reload" screen and logs the error.

### F4. Unthrottled mousemove handlers force reflow/re-render at 60 Hz
**Where:**
- `src/components/CustomCursor.jsx:26–29` — `setPosition({x, y})` on **every** mousemove → a React re-render of the overlay on every pointer event, all session long.
- `src/components/MovieRow.jsx:130–147` — the 3D tilt handler calls `card.getBoundingClientRect()` **on every mousemove per card** (forced layout), plus two style writes → reflow storm while hovering card lists.
- `src/hooks/useKeyboardNav.js:32–39` — zone sorting calls `getBoundingClientRect()` twice per registration (`elA`, `elB`), adding layout thrash to every mount/filter change.

**Impact:** Constant main-thread churn; visible jank on mid-range hardware during scroll/typing — directly undermines the app's "performance-first" positioning (README).
**Fix:** Cursor: write `transform` via a ref inside a `requestAnimationFrame` loop instead of React state. Tilt: `rAF`-gate the handler and cache the rect on `mouseenter` (rect only changes on resize/scroll). Zone sort: cache rects per zone and re-sort on demand, or drop the eager sort entirely.

### F5. `manualChunks` react check is overbroad — the intended 3-way vendor split never happens
**Where:** `src/vite.config.js:10–19`
```js
if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
if (id.includes('lucide-react') || id.includes('lucide')) return 'vendor-icons';
return 'vendor-libs';
```
**Evidence:** Every `lucide-react` module id contains the substring `react`, so it matches the **first** branch — the `vendor-icons` check on the next line is dead code. Build output confirms: the production bundle emits only `vendor-react` (194.90 kB) plus the app chunk; **no `vendor-icons` or `vendor-libs` chunks exist at all**.
**Impact:** Dead/misleading config; the intended icon isolation (cache-friendliness when icons change) never happens, and the react chunk silently absorbs icon code.
**Fix:** Match on path segments instead of substrings, e.g. check `/node_modules/lucide-react/` first, then `/node_modules/(react|react-dom|scheduler)/` with segment boundaries; keep the `vendor-libs` fallthrough only if any non-react lib is ever added (currently lucide is the only dependency besides react — after the fix, expect two chunks: `vendor-react` + `vendor-icons`).

---

## 🟠 High

### F6. `useKeyboardNav` initialized with hardcoded `modalOpen: false`
**Where:** `src/App.jsx:19–22`
**Impact:** The focus engine never knows the modal is open. While a video plays, global arrow-key handling in `useKeyboardNav.js:90–129` and the player's own shortcuts in `VideoModal.jsx:184–217` both fire — Escape is handled twice (`VideoModal.jsx:26–31` closes the modal; `useKeyboardNav.js:67–78` also clears focus and blurs). Today it's mostly benign because the modal captures focus, but it is incorrect state wiring that breaks zone navigation the moment focus ends up outside the player.
**Fix:** Pass real state: `useKeyboardNav({ modalOpen: !!activeCartoon, onCloseModal: () => setActiveCartoon(null) })`, and let `VideoModal` own Escape exclusively when open. 🔗 `pendingworks.md P2-4`

### F7. Hub-exit logic duplicated across three components — divergence already happened
**Where:** `src/App.jsx:132–137` (`leaveJackieChanHub` — **declared and never used**, flagged by Oxlint), `src/components/Navbar.jsx:110–122` (inline back-button re-implements it), `src/components/Hero.jsx:63–67` (`isHubEntry` branch)
**Impact:** Three sources of truth for the same navigation. The unused helper proves divergence: Navbar's inline version exists because the helper wasn't passed down. Future edits (e.g. persisting filters across context switches) will be applied to one place and not the others.
**Fix:** Single `setShowContext` action passed down; delete `leaveJackieChanHub` or wire it to Navbar's back button. 🔗 `pendingworks.md P3-7`

### F8. Watchlist stores full object copies, not ids
**Where:** `src/App.jsx:103–112` (stores the whole `cartoon` object), `:28–31`
**Impact:**
- **Stale-data flaw:** entries are snapshot copies — when metadata is later corrected in the JSON (title, rating, thumbnail), saved watchlist items keep the old version forever; watchlist rows and grids render the stale copy.
- **Duplicate data source:** the app effectively has two databases for the same content.
**Fix:** Persist `id` strings only; derive display objects by looking up the current JSON at render time (keep an "unavailable" fallback for removed items).

### F9. `jackie_chan.json` (122 KB) is bundled into the initial load though it's only needed in the hub
**Where:** `src/App.jsx:3` (eager import), build evidence: app chunk `index-*.js` = 143.12 kB
**Impact:** Every visitor — including first-time visitors who only watch the general catalog — downloads and parses the entire Jackie Chan episode database upfront.
**Fix:** Dynamic-import on hub entry: `const jackieChanData = currentShowContext === 'jackie-chan' ? await import('./data/jackie_chan.json') : ...` (or a `useData(context)` hook with `React.lazy`/suspense). 🔗 pairs with `pendingworks.md P1-1/P1-3`

### F10. No `prefers-reduced-motion` support anywhere
**Where:** `src/index.css` (zero matches for `prefers-reduced-motion`); animation sources: `.lazy-reveal` reveal transitions (`index.css:1520–1566`), card tilt (`MovieRow.jsx`), pulsing hearts/`spinner-loader`/`hero` glow (`index.css`)
**Impact:** Users with vestibular disorders get forced motion (slide/scale reveals, tilt, pulse loops) with no OS-level opt-out — WCAG 2.1 §2.3.3 / common a11y checklist item.
**Fix:** Add `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }` plus skip reveal animation classes. 🔗 `pendingworks.md P3-9`

---

## 🟡 Medium

### F11. Global `cursor: none !important` leaves users cursor-less if JS fails, and hides the text caret
**Where:** `src/index.css:1569–1573` — `html, body, a, button, select, input, textarea, [role="button"], .cartoon-card { cursor: none !important; }` inside `@media (min-width: 1025px)`
**Impact:**
- If the custom-cursor script errors or the component unmounts (e.g. `isMobile` flip during a window resize), `cursor: none` persists → **no visible pointer at all**.
- The search input loses the I-beam text cursor affordance; the caret still blinks but users get no pointing feedback, which is disorienting in form fields.
**Fix:** Apply `cursor: none` only while `.custom-cursor` is actually mounted (e.g. a `.cursor-active` class on `<html>` set by the component), and exempt `input`/`textarea` (keep the I-beam).

### F12. Silent playback failures — optimistic state with no error UI
**Where:** `src/components/VideoModal.jsx` — `:16` (`isPlaying` initialized `true` assuming autoplay succeeds), `:245/:247/:135` (`video.play().catch(() => {})` — silent), `:223` (keydown effect re-bound with optimistic deps)
**Impact:** If `video.play()` rejects (autoplay policy in single-element mode, or a dead/404 archive.org source), the UI keeps showing a **Pause icon and running time UI for media that isn't playing**, and there is no user-facing "can't reach the archive" card. Optimistic `setIsPlaying(true)` also fires before `play()` resolves.
**Fix:** Mirror `isPlaying` from actual media events (`onPlay`/`onPause`/`onPlaying` already fire — derive state there; remove optimistic sets), catch play rejection and set an error state rendered as a retry card. 🔗 `pendingworks.md P2-6`

### F13. Row arrows always enabled — no disabled state at scroll extremes
**Where:** `src/components/MovieRow.jsx:82, 99`
**Impact:** Arrows render and respond even when the row fits the viewport or is fully scrolled, misleading users (and screenshotting as dead UI).
**Fix:** Track `scrollLeft`/`scrollWidth` (on `scroll` + resize) and disable/dim arrows at the edges; hide both when `scrollWidth <= clientWidth`.

### F14. `MutationObserver` on the whole body re-registers every clickable listener on each DOM change
**Where:** `src/components/CustomCursor.jsx:58–61`
```js
const observer = new MutationObserver(handleLinkHover);
observer.observe(document.body, { childList: true, subtree: true });
```
**Impact:** Every DOM mutation (row re-renders, filter typing, reveal class swaps) re-queries **all** clickables and adds another `mouseenter`/`mouseleave` listener to each — listener duplication, memory pressure, and O(n) work per mutation, exactly while the user is typing.
**Fix:** Use event delegation instead: a single document-level `mouseover`/`mouseout` listener that calls `e.target.closest('a, button, .cartoon-card, ...')` — O(1), no listeners per element, no observer.

### F15. Stale inline styles from direct DOM mutation can persist across React re-renders
**Where:** `src/components/MovieRow.jsx:140–145` — `card.style.transition/transform` and `glareRef.current.style.*` set outside React's tree
**Impact:** Because the mutations bypass React, a card DOM node reused after a filter change (same key) can keep a leftover tilt/`transform` or glare opacity from the previous hover, rendering cards stuck mid-animation until the next `mouseleave`.
**Fix:** Keep tilt in CSS (`:hover` transform transition) or reset inline styles in the effect cleanup on `cartoons` changes; prefer `onMouseEnter`-cached rect + `onMouseLeave` reset already present, verified on every re-render path.

### F16. No captions or transcripts for dub audio (media accessibility)
**Where:** `src/components/VideoModal.jsx:360–370` (`<video>` with no `<track kind="captions">`), `:351–357` (`<audio>` dub, no transcript UI)
**Impact:** Deaf/hard-of-hearing users get no access to episode audio content; WCAG 1.2.2 (captions) miss.
**Fix:** Add caption tracks where archive items provide subtitles; at minimum surface a transcript/summary (the synopsis already exists — label it clearly as content description).

### F17. Direct `video`/`audio` src on large archive.org derivatives — no bandwidth strategy
**Where:** `src/data/jackie_chan.json:8` etc. — 1080p x265 WEB-DL files streamed directly; `src/components/VideoModal.jsx:355` — audio `preload="auto"`
**Impact:** First frame of a multi-hundred-MB file before playback starts in some browsers; mobile users on metered connections pay full bandwidth. Archive items usually also contain smaller derivatives (e.g. 512kb mp4) that would stream instantly.
**Fix:** Prefer the smallest derivative for preview/playback, or add a data-saver toggle; use `preload="metadata"` for audio and load fully only on play. 🔗 related to `pendingworks.md P1-1`

---

## 🟢 Low

### F18. Seek bar `max={duration || 100}` before metadata loads
**Where:** `src/components/VideoModal.jsx:404`
**Impact:** Until `durationchange` fires, the slider spans 0–100 while the episode may be 1200+ s; dragging before load lands at the wrong position. Cosmetic on fast connections.
**Fix:** Disable the slider until `duration > 0`.

### F19. Dead `startAt` feature
**Where:** `src/components/VideoModal.jsx:322–324` (`cartoon.startAt` → `#t=` fragment); no data entry defines `startAt`
**Impact:** Unreachable code path; misleading for maintainers/agents.
**Fix:** Remove or implement (e.g. resume-from-time once F8-style progress tracking lands — `pendingworks.md P2-2`).

### F20. Stale comment in `App.jsx`
**Where:** `src/App.jsx:24–25` — "Note: activeCartoon referenced below is declared at line ~23" — the declaration is actually at line `:34`, and the comment sits inside a `no-use-before-define` disable block that a reorder would delete.
**Fix:** Covered by 🔗 `pendingworks.md P3-7`.

### F21. Invalid ARIA nesting — button inside `role="button"` card
**Where:** `src/components/MovieRow.jsx:160–214` — the card has `role="button"` and contains a favorite `<button>`
**Impact:** Interactive-inside-interactive violates ARIA; screen readers announce a confusing button-in-button structure.
**Fix:** Make the card a `<article>`/`<li>` with the thumbnail a real `<button>` (play) and the heart a sibling `<button>` — or lift the favorite out of the card.

### F22. Misleading `aria-label` on hub-entry cards
**Where:** `src/components/MovieRow.jsx:165` — `Play ${cartoon.title}` for a card that opens the hub (`MovieRow.jsx:114–120`)
**Fix:** Branch the label: `Explore ${title} selections` when `isShowHubEntry`.

### F23. No `<noscript>` fallback and no canonical URL / structured data
**Where:** `index.html` — no `<noscript>` message for the JS-only SPA; no `rel="canonical"`, no JSON-LD
**Impact:** SEO completeness (title/description/OG exist and are good; these are hygiene gaps).
**Fix:** Add `<noscript>`, `<link rel="canonical">`, and a `VideoObject`/`WebSite` JSON-LD block. 🔗 `pendingworks.md P3-3`

### F24. Volume/mute not persisted across sessions
**Where:** `src/components/VideoModal.jsx:19–20` — resets to `0.8`/unmuted on every open
**Impact:** Minor annoyance; users who prefer quiet playback re-adjust every episode.
**Fix:** Persist to `localStorage` (e.g. `vintage_player_prefs`) — trivial alongside F12's state mirroring.

---

## Summary matrix

| # | Flaw | Severity | Files | Related task | Status |
|---|------|----------|-------|--------------|--------|
| F1 | `undefined` season/episode/talisman for general catalog | 🔴 | VideoModal.jsx:390,455,484,496 | new (P1-adjacent) | ✅ fixed |
| F2 | Unguarded localStorage parse | 🔴 | App.jsx:29–31 | new | ✅ fixed (safe loader in `src/utils/storage.js`) |
| F3 | No Error Boundary | 🔴 | main.jsx | P2-5 (partial) | ✅ fixed (`src/components/ErrorBoundary.jsx`) |
| F4 | Unthrottled mousemove (cursor/tilt/zone-sort) | 🔴 | CustomCursor, MovieRow, useKeyboardNav | P2-3 (partial) | ✅ fixed (rAF gates) |
| F5 | Overbroad react check — dead vendor chunks | 🔴 | vite.config.js:12–19 | new | ✅ fixed (`vendor-icons` chunk verified) |
| F6 | `modalOpen: false` hardcoded | 🟠 | App.jsx:19–22 | P2-4 | ✅ fixed |
| F7 | Triplicated hub-exit logic, dead helper | 🟠 | App.jsx:132, Navbar.jsx:110, Hero.jsx:63 | P3-7 | ✅ fixed (single `onExitHub` prop) |
| F8 | Watchlist stores full copies (stale data) | 🟠 | App.jsx:28–31,103–112 | new | ✅ fixed (id strings + legacy migration) |
| F9 | 122 KB hub JSON in initial bundle | 🟠 | App.jsx:3 | P1-adjacent | ✅ fixed (lazy chunk 108.81 kB verified) |
| F10 | No `prefers-reduced-motion` | 🟠 | index.css | P3-9 | ✅ fixed |
| F11 | Global `cursor: none` fragility | 🟡 | index.css:1569–1573 | new | ✅ fixed (scoped `html.cursor-active`) |
| F12 | Silent playback failures, optimistic UI | 🟡 | VideoModal.jsx:16,245 | P2-6 | ✅ fixed (error card + retry, event-driven `isPlaying`) |
| F13 | Arrows never disabled at extremes | 🟡 | MovieRow.jsx:82,99 | new | ✅ fixed |
| F14 | MutationObserver listener churn | 🟡 | CustomCursor.jsx:58–61 | new | ✅ fixed (event delegation) |
| F15 | Stale inline styles across re-renders | 🟡 | MovieRow.jsx:140–145 | new | ✅ fixed |
| F16 | No captions/transcripts | 🟡 | VideoModal.jsx:360 | P3-9 (partial) | ✅ fixed (optional `captionsUrl` track) |
| F17 | Heavy archive derivatives, `preload=auto` | 🟡 | jackie_chan.json, VideoModal.jsx:355 | P1-1 (partial) | ✅ fixed (audio `preload="metadata"`) |
| F18 | Slider max=100 pre-metadata | 🟢 | VideoModal.jsx:404 | new | ✅ fixed (disabled until duration) |
| F19 | Dead `startAt` path | 🟢 | VideoModal.jsx:322–324 | new | ✅ fixed (real resume via `vintage_progress`) |
| F20 | Stale comment | 🟢 | App.jsx:24–25 | P3-7 | ✅ fixed |
| F21 | Button-in-button ARIA nesting | 🟢 | MovieRow.jsx:160–214 | P3-9 (partial) | ✅ fixed (card = `listitem`, poster = real `<button>`) |
| F22 | "Play" label on explore card | 🟢 | MovieRow.jsx:165 | new | ✅ fixed (label lives on the thumbnail button) |
| F23 | No noscript/canonical/JSON-LD | 🟢 | index.html | P3-3 | ✅ fixed |
| F24 | Volume/mute not persisted | 🟢 | VideoModal.jsx:19–20 | new | ✅ fixed (`vintage_player_prefs`) |

**All 24 flaws fixed.** The F21/F22 close came last: the card is now an `<article role="listitem">`, the poster is a real `<button class="card-thumbnail-btn">` carrying the play/explore label, and the keyboard-nav zone selector was updated to `.cartoon-card .card-thumbnail-btn` so focus zones keep working.

---

## Suggested fix order (for agents — pair with tracks in `AGENTS.md §6`)

1. **F1 + F2 + F3** (one session: player context branching + safe hydration + ErrorBoundary) — highest user impact, touches `VideoModal.jsx` + `App.jsx` + `main.jsx` (Track T3 + light T5).
2. **F5** (vite config fix + verify build emits expected chunks) — isolated, zero conflict (Track T6-adjacent).
3. **F4 + F14** (rAF cursor + delegation, tilt rAF-gate) — perf (Track T5).
4. **F6 + F7** (wire modal state + single context action) — `App.jsx` coordination required (Track T4).
5. **F8** (id-based watchlist with migration from legacy full objects) — `App.jsx` (Track T5, after F6/F7 land).
6. **F10 + F11 + media/UX lows** (reduced-motion, cursor fallback, slider/labels) — CSS + small touches (Track T7).

---

*Update this file in the same PR that fixes a flaw (mark ✅ with the PR #). New findings go here, backlog items stay in [`pendingworks.md`](pendingworks.md).*
