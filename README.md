# 📺 Vintage Cartoon

> **Relive your childhood.** A Netflix-style, free streaming app for nostalgic **Tamil-dubbed cartoons** of the 90s and 2000s — Chutti TV, Cartoon Network Tamil, Sun TV, Jetix and Pogo classics, including a dedicated **Jackie Chan Adventures** hub with all 5 seasons.

**Repo:** https://github.com/TROJAN-XX/vintage_cartoon
**Live site:** https://vintage-cartoon.vercel.app _(deployed via GitHub Actions — see `deployment.md`)_

---

## ✨ Highlights

- 🎬 **Netflix-style rows** — 90s Classics, Early 2000s Hits, Action & Adventure
- 🐉 **Jackie Chan Adventures hub** — 95 indexed episodes across Seasons 1–5, filterable by talisman
- 🔍 **Bilingual search** — matches English title, Tamil title (தலைப்பு), synopsis, tags, channel, year, talisman, even `ep 12`
- ❤️ **Personal watchlist** — persisted in the browser (no account needed)
- 🎥 **Custom video player** — dual-audio sync (muted video + separate Tamil `.m4a` dub with drift correction), seek ±10s, fullscreen, auto-hiding controls
- ⌨️ **Full keyboard navigation** — arrows, Enter/Space, Escape (zone-based focus model)
- 🖱️ **Custom neon cursor** (auto-disabled on touch devices)
- ⚡ **Performance-first** — lazy-loaded modal, vendor chunk splitting, IntersectionObserver scroll reveal

Full details in [`features.md`](features.md).

---

## 🎥 Streaming architecture (read this first)

**There is no backend, no CDN and no video hosting in this repo.** Every video is hot-linked **directly from the [Internet Archive](https://archive.org)**:

```
https://archive.org/download/<archive-item>/<file>.mp4
```

- The `<video>` element points straight at `archive.org/download/...` (see `src/components/VideoModal.jsx`).
- Episodes with a Tamil dub that is stored as a separate audio file use **two synced media elements**: a muted `<video>` plus an `<audio>` source (`audioUrl`, `.m4a`), kept in sync with 0.15s drift correction.
- Thumbnails are served from Internet Archive `.thumbs/` previews (or temporary Unsplash placeholders — being replaced, see `pendingworks.md`).
- Because we only stream items, no copyrighted media is stored, distributed or proxied by this project. All bandwidth and serving is handled by archive.org.

---

## 🧱 Tech stack

| Layer      | Choice                                            |
| ---------- | ------------------------------------------------- |
| Framework  | [React 19](https://react.dev)                     |
| Bundler    | [Vite 8](https://vite.dev) (Rollup-based chunks)  |
| Icons      | [lucide-react](https://lucide.dev)                |
| Linting    | [Oxlint](https://oxc.rs)                          |
| Styling    | Hand-written CSS (`src/index.css`, neon/retro)    |
| State      | Local React state + `localStorage` watchlist      |
| Hosting    | [Vercel](https://vercel.com) (static, zero-cost)  |

No router, no state library, no backend — a single-page static build.

---

## 🚀 Quick start

```bash
# 1. Install dependencies (Node.js ≥ 20 required)
npm ci

# 2. Start the dev server
npm run dev        # → http://localhost:5173

# 3. Lint & build for production
npm run lint
npm run build      # → dist/
npm run preview    # serve the production build locally
```

---

## 📁 Project structure

```
vintage_cartoon/
├── .github/workflows/deploy.yaml   # Instant Vercel deploy (GitHub Actions)
├── public/                         # Static assets (favicon, icon sprite)
├── src/
│   ├── App.jsx                     # Root: filtering logic + layout
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # Full design system (neon retro theme)
│   ├── components/
│   │   ├── Navbar.jsx              # Context-aware category nav
│   │   ├── Hero.jsx                # Featured banner (adapts to hub/catalog)
│   │   ├── SearchFilter.jsx        # Search bar + channel/era/season filters
│   │   ├── MovieRow.jsx            # Horizontal row / grid of cards
│   │   ├── VideoModal.jsx          # Custom streaming player (lazy-loaded)
│   │   └── CustomCursor.jsx        # Neon cursor overlay
│   ├── data/
│   │   ├── cartoons.json           # General catalog (shows & one-offs)
│   │   └── jackie_chan.json        # Jackie Chan Adventures episodes S1–S5
│   ├── hooks/
│   │   └── useKeyboardNav.js       # Zone-based keyboard focus engine
│   └── assets/                     # Images
├── index.html                      # SEO / OpenGraph / preconnects
├── vercel.json                     # Vercel build + headers config
├── vite.config.js                  # Vendor chunk splitting
└── docs/ (root *.md)               # See table below
```

---

## 📚 Documentation index

| File              | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| [`features.md`](features.md)       | Every feature, control, and data schema in detail          |
| [`developement.md`](developement.md) | Dev setup, conventions, how-to guides, archive.org recipes |
| [`deployment.md`](deployment.md)   | Vercel deploy: Git integration, Actions workflow, secrets   |
| [`pendingworks.md`](pendingworks.md) | Prioritized backlog — start here for open work            |
| [`design_flaws.md`](design_flaws.md) | Code-level design flaws with evidence & fix order         |
| [`AGENTS.md`](AGENTS.md)           | **Multi-agent collaboration protocol — agents must read**   |

---

## 🤖 For AI agents

This repo is designed for **multiple agents working in parallel**. Before making changes, read [`AGENTS.md`](AGENTS.md) — it defines guardrails, data contracts, file ownership and the handoff protocol that keeps collaboration conflict-free.

---

## ⚠️ Legal & disclaimer

Vintage Cartoon is a non-commercial nostalgia project. All media is streamed on demand from the Internet Archive's public catalog; nothing is hosted, re-hosted or monetized here. Rights holders who object to a specific archive item should contact archive.org directly. Built with ♥ for 90s kids nostalgia.
