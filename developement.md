# 🛠️ Development Guide — Vintage Cartoon

Everything an engineer (human or AI agent) needs to develop in this repo.
**AI agents: read [`AGENTS.md`](AGENTS.md) first** — it defines collaboration guardrails and handoff rules.

---

## 1. Prerequisites

| Tool       | Version                     | Notes                                   |
| ---------- | --------------------------- | --------------------------------------- |
| Node.js    | ≥ 20 (CI uses 22)           | `node -v`                               |
| npm        | ≥ 10                        | ships with Node                         |
| Git        | any recent                  | repo: `TROJAN-XX/vintage_cartoon`       |

**Stack summary:** React 19 + Vite 8, lucide-react icons, Oxlint linter, plain CSS. No router, no backend, no state library — do not add heavyweight dependencies without discussion (see `AGENTS.md` guardrails).

---

## 2. Setup

```bash
git clone https://github.com/TROJAN-XX/vintage_cartoon.git
cd vintage_cartoon

npm ci          # deterministic install (uses package-lock.json)
npm run dev     # → http://localhost:5173
```

## 3. Scripts

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR (port 5173)            |
| `npm run build`     | Production build → `dist/` (≈1.6s, verified)    |
| `npm run preview`   | Serve the production build locally              |
| `npm run lint`      | Oxlint over the repo                            |

**Before every commit/PR (Definition of Done):**

```bash
npm run lint      # must pass clean
npm run build     # must complete without errors
```

Optionally smoke-test the built app with `npm run preview` and check: rows render, search works, a video plays from archive.org, Escape closes the modal.

---

## 4. Architecture

```
App.jsx (state owner)
  ├── Navbar        receives context + category setters
  ├── Hero          featured item; Play → opens modal; Explore → enters hub
  ├── SearchFilter  search query + context-specific filter dropdowns
  ├── MovieRow(s)   rows (default) or grid (when filtering)
  └── VideoModal    lazy-loaded player; owns playback only
```

### 4.1 State ownership (all in `App.jsx`)

| State                 | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `currentShowContext`  | `null` (general catalog) \| `'jackie-chan'` (hub)        |
| `activeCartoon`       | object shown in the video modal                          |
| `watchlist`           | favorites array, synced to `localStorage` key `vintage_watchlist` |
| `searchQuery`         | free-text search                                         |
| `selectedChannel`, `selectedEra` | general-view filters                           |
| `selectedSeason`, `selectedTalisman` | hub-view filters                          |
| `activeCategory`      | navbar selection (`all`, `watchlist`, `seasonN`, or category) |

### 4.2 Data flow

1. `activeData` = context picks `cartoons.json` or `jackie_chan.json`.
2. `filteredData` = single combined filter pass: category → search → sub-filters (see `App.jsx` "Advanced Combined Filtering Logic").
3. If any filter is active → **grid mode**; else rows.
4. Playing a card sets `activeCartoon` → `VideoModal` mounts lazily.

### 4.3 Key components

| File                    | Responsibility                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| `components/Navbar.jsx` | Context-aware categories; watchlist count badge; registers `navbar` focus zone |
| `components/Hero.jsx`   | Featured banner; adapts between "FEATURED NOSTALGIA" and "SPECIAL FEATURES HUB" |
| `components/SearchFilter.jsx` | Search bar; channel/era or season/talisman filters; reset                |
| `components/MovieRow.jsx` | Horizontal row or card grid; arrow scroll buttons; registers a focus zone    |
| `components/VideoModal.jsx` | Custom player incl. dual-audio sync + drift correction; info panel        |
| `components/CustomCursor.jsx` | Neon cursor; hover/click states; hidden on touch/mobile                  |
| `hooks/useKeyboardNav.js` | Zone registry + global key handling                                          |

---

## 5. Code style & conventions

- **JSX:** function components, `export default`, props destructured in signature, hooks at top, `useEffect` cleanup returned.
- **JS:** ES modules, semicolons, single quotes in JSX files; keep `console.warn` for recoverable media errors only.
- **CSS:** hand-written in `src/index.css`; BEM-ish descriptive class names (`.hero-metadata`, `.nav-watchlist-badge`); reuse reveal utility classes (`.lazy-reveal`, `reveal-up`, `delay-*`) instead of new animation systems.
- **Data:** JSON only for content; keep fields exactly as the schemas in [`features.md §9`](features.md) — components match on these literal names (`tamilTitle`, `audioUrl`, `isShowHubEntry`, …).
- **Lint:** `npm run lint` (Oxlint). If you must silence a rule locally, use a narrow `/* eslint-disable <rule> */` comment with a short reason — e.g. the existing `no-use-before-define` block in `App.jsx` (candidates for cleanup, see `pendingworks.md`).
- **Commits:** short lowercase summaries (`implemented audio`, `keyboard navigation implementation`). Branches: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`.
- **Do not** reformat whole files or switch quote styles globally — keep diffs minimal so parallel agents don't conflict.

---

## 6. How-to guides

### 6.1 Add a cartoon to the general catalog

1. Find a public-domain short on archive.org (see §7). Copy the **direct file URL** (`https://archive.org/download/<item>/<file>.mp4`).
2. Verify it streams: open in a browser or `curl -I` (expect `200`/`302`, `content-type: video/mp4`).
3. Append an object to `src/data/cartoons.json` following the schema in [`features.md §9.1`](features.md):
   - unique `id` slug, real `title`, **Tamil** `tamilTitle` + description,
   - `category` from the three valid values,
   - `channel` — any new value is picked up automatically by the channel filter,
   - honest `year`, `duration`, `rating`, `tags`.
4. Thumbnail: prefer the archive `.thumbs/` preview (`…/<item>.thumbs/<file>_<n>.jpg`); Unsplash placeholders are being phased out.
5. `npm run lint && npm run build` → commit.

### 6.2 Add an episode to the Jackie Chan hub

1. Locate the archive item for that episode (direct `.mp4`) and, if available, the Tamil dub `.m4a` (e.g. items named `s-01-e-…-tamil` with a `Season_N/` folder).
2. Append to `src/data/jackie_chan.json` per [`features.md §9.2`](features.md):
   - `id: "s<season>e<episode>"` (e.g. `s2e14`),
   - `season` and `episode` as integers, `talisman` as listed in existing entries (use `None (Demon Wards)` / `None (Demon Portals)` for ward/portal episodes — the dropdown filters these out automatically).
3. Season 1 is incomplete in the dataset (13 of 39 episodes) — filling it is a tracked task in `pendingworks.md`.
4. `npm run lint && npm run build` → commit.

### 6.3 Attach a Tamil audio dub to an existing entry

1. Find/confirm the dub item on archive.org; copy the exact `.m4a` path (mind URL encoding: spaces → `%20`, brackets → `%28`/`%29`).
2. Add only the `audioUrl` field to that entry — the player switches to dual-element mode automatically (muted video + synced audio, 0.15s drift correction).
3. Test playback: audio and video should start together and stay synced after a seek.

### 6.4 Add a new show hub (advanced)

The hub pattern is generalizable:

1. Create `src/data/<show>.json` with episode objects (season/episode/extra-filter fields).
2. In `App.jsx`: add a context id (e.g. `'tom-jerry'`) next to `'jackie-chan'`; extend the `currentShowContext` conditional in `activeData` and filtering.
3. In `Navbar.jsx`: add the show's category pills; in `Hero.jsx` the hub-entry badge already renders via `isShowHubEntry`.
4. Add the show's data JSON to `src/data/` and a hub-entry card in `cartoons.json` (`isShowHubEntry: true`, empty `videoUrl`, `isFeatured: true`).
5. Keep each show's logic isolated — avoid duplicating filter code; parameterize it.

### 6.5 Tune the build

- Vendor chunks live in `vite.config.js` → `build.rollupOptions.output.manualChunks`. New vendor deps should be mapped into an existing chunk (react/scheduler → `vendor-react`; icons → `vendor-icons`; other libs → `vendor-libs`) rather than inlined into the app chunk.
- `chunkSizeWarningLimit: 800` and `cssCodeSplit: true` — keep as-is unless a build regression is documented.

---

## 7. Working with the Internet Archive

**Everything streams from archive.org. There is no media in this repo and none should ever be committed.**

### 7.1 URL patterns

| Purpose        | Pattern                                                              |
| -------------- | -------------------------------------------------------------------- |
| Direct video   | `https://archive.org/download/<identifier>/<file>.mp4`                |
| Thumbnails     | `https://archive.org/download/<identifier>/<identifier>.thumbs/<file>_<n>.jpg` |
| Item page      | `https://archive.org/details/<identifier>`                            |
| Metadata API   | `https://archive.org/metadata/<identifier>` (JSON; lists all files)   |

- The `metadata` endpoint is the easiest way to get exact filenames for `<file>.mp4`.
- **URL-encode** special characters in filenames: spaces → `%20`, `(` → `%28`, `)` → `%29`, `[` → `%5B`, `]` → `%5D`. Copy-pasting raw paths breaks playback.
- Direct `download/` links 302-redirect to a mirror node — that is expected.

### 7.2 Finding streamable content

1. Browse https://archive.org/details/classic_cartoons or search with `mediatype:(movies)` plus keywords ("tamil dub", "hindi dub", series names).
2. Open an item → check **files** for `.mp4` and, for dubs, companion items (`…-tamil`).
3. Verify: `curl -I "<direct-url>"` → expect `HTTP/2 302` then `200` with `video/mp4`.
4. **Be respectful:** archive.org is a shared resource; the app streams on demand and must never bulk-download. Playwright/puppeteer auto-play during tests should be limited and rare.

### 7.3 Known gotchas

| Symptom                       | Cause / fix                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| Video 404 or "no supported source" | Wrong identifier/filename, or unencoded characters — re-check via the metadata API |
| No audio in dub mode          | `.m4a` path invalid, or browser blocked autoplay — the player logs `Audio autoplay prevented` |
| A/V drift                     | Expected occasionally; correction fires at >0.15s. Persistent large drift → report the episode |
| Slow first load               | First frame of a large `.mp4` — acceptable; larger chunking changes are backlog items |

---

## 8. Git workflow

```bash
# pick an open item from pendingworks.md → branch
git switch -c feat/season1-episodes

# work in small, focused commits
git add src/data/jackie_chan.json
git commit -m "fill season 1 episodes 14-26"

# push and open a PR against main
git push -u origin feat/season1-episodes
```

- PRs target `main`; `main` auto-deploys to Vercel (see `deployment.md`).
- One logical change per PR; update `pendingworks.md` status in the same PR.
- Never commit: `node_modules/`, `dist/`, `.vercel/`, `.env*`, or any video/media file (see `.gitignore`).
- **Parallel agents:** check `pendingworks.md` "in-progress" claims before starting work, and claim tasks there to avoid duplicate/conflicting changes.

---

## 9. Troubleshooting

| Problem                                  | Fix                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `npm ci` fails                           | Delete `node_modules` and retry; ensure Node ≥ 20                        |
| Lint errors on files you didn't touch    | Run `npm run lint` fresh; only fix lint in files your PR owns            |
| Dev server port busy                     | `npm run dev -- --port 5174`                                            |
| Watchlist lost                           | It's per-browser `localStorage` (`vintage_watchlist`) — clearing site data clears it |
| Build succeeds but blank page            | Check console; a bad `import` path in `App.jsx`/`main.jsx` is the usual cause |
| archive.org unreachable from your region | Mirror redirect timeouts — retry; nothing in-repo to fix                |

---

## 10. Related docs

[`README.md`](README.md) · [`features.md`](features.md) · [`deployment.md`](deployment.md) · [`pendingworks.md`](pendingworks.md) · [`AGENTS.md`](AGENTS.md)
