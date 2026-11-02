// ---------------------------------------------------------------------------
// Dedicated show hubs. Each hub is a full-episode database browsed season-wise,
// exactly like the Jackie Chan Adventures hub. Adding a hub:
//   1. Drop the episode JSON in src/data/ (schema: features.md §9 — same
//      fields as jackie_chan.json; `talisman` is Jackie-Chan-specific and
//      may be omitted elsewhere; `seasonLabel` overrides display labels).
//   2. Add the entry below — its id MUST match the hub-entry card's id in
//      cartoons.json (the card's click routes to the hub via its id).
//   3. Mark exactly one episode `isFeatured: true` (hub hero).
// Seasons are generic buckets: for Jackie Chan they are real seasons, for
// Tom & Jerry they are production eras (1940s / 1950s / 1960s / Tales).
// ---------------------------------------------------------------------------
export const HUBS = {
  'jackie-chan': {
    tag: 'JACKIE_CHAN',
    searchHint: 'Search episodes by title, synopsis, tags, or talisman...',
    seasonGroupName: 'Season',
    allSeasonsLabel: 'All Seasons',
    secondFilter: 'talisman',
    load: () => import('./jackie_chan.json'),
    seasons: [
      { num: 1, nav: 'S1', label: 'Season 1', gridTitle: 'Season 1: The Twelve Talismans', rowTitle: 'Season 1: The Twelve Talismans (சீசன் 1: 12 தாயத்துக்கள்)' },
      { num: 2, nav: 'S2', label: 'Season 2', gridTitle: 'Season 2: The Demon Portals', rowTitle: 'Season 2: The Demon Portals (சீசன் 2: நரகத்தின் கதவுகள்)' },
      { num: 3, nav: 'S3', label: 'Season 3', gridTitle: 'Season 3: The Noble Animals', rowTitle: 'Season 3: The Noble Animals (சீசன் 3: உன்னத விலங்குகள்)' },
      { num: 4, nav: 'S4', label: 'Season 4', gridTitle: 'Season 4: The Oni Masks', rowTitle: 'Season 4: The Oni Masks (சீசன் 4: ஓனி முகமூடிகள்)' },
      { num: 5, nav: 'S5', label: 'Season 5', gridTitle: 'Season 5: Relics of Demons Past', rowTitle: 'Season 5: Relics of Demons Past (சீசன் 5: அரக்கர்களின் நினைவுச்சின்னங்கள்)' },
    ],
  },
  'tom-jerry': {
    tag: 'TOM_&_JERRY',
    searchHint: 'Search episodes by title, synopsis, tags, or year...',
    seasonGroupName: 'Era',
    allSeasonsLabel: 'All Eras',
    secondFilter: null,
    load: () => import('./tom_jerry.json'),
    seasons: [
      { num: 1, nav: '1940s', label: '1940s', gridTitle: 'Theatrical Classics: 1940s', rowTitle: 'Theatrical Classics: 1940s (திரையரங்குக் காலகட்டம்: 1940கள்)' },
      { num: 2, nav: '1950s', label: '1950s', gridTitle: 'Theatrical Classics: 1950s', rowTitle: 'Theatrical Classics: 1950s (திரையரங்குக் காலகட்டம்: 1950கள்)' },
      { num: 3, nav: '1960s', label: '1960s', gridTitle: 'Theatrical Classics: 1960s', rowTitle: 'Theatrical Classics: 1960s (திரையரங்குக் காலகட்டம்: 1960கள்)' },
      { num: 4, nav: 'Tales', label: 'Tales (2005–2007)', gridTitle: 'Tom and Jerry Tales: 2005–2007', rowTitle: 'Tom and Jerry Tales: 2005–2007 (டாம் அண்ட் ஜெரி டேயில்ஸ்: 2005–2007)' },
    ],
  },
};
