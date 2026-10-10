// Offline support. Everything below is cached on the first visit, so the
// game keeps working with no connection.
//
// The game's code (the page, scripts, styles) is always fetched fresh when
// the phone is online, so a new version shows up the next time the game is
// opened; the saved copy is only used offline (or if the network is very
// slow). Art and sounds load from the saved copy straight away and are
// refreshed in the background, so new art or voice recordings show up on
// the launch after next. No version bumps are needed for either.
const CACHE = 'goldie-halloween-v2';
const NETWORK_WAIT_MS = 3000; // after this, a slow network falls back to the saved copy

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/util.js',
  'js/audio.js',
  'js/audio-cues.js',
  'js/celebrate.js',
  'js/spots.js',
  'js/games/ghostpop.js',
  'js/games/pumpkin.js',
  'js/games/cats.js',
  'js/games/dressup.js',
  'assets/fonts/chewy.woff2',
  'assets/icons/app-180.png',
  'assets/icons/app-192.png',
  'assets/icons/app-512.png',
  'assets/icons/again.svg',
  'assets/icons/hand.svg',
  'assets/icons/home.svg',
  'assets/icons/rotate.svg',
  'assets/icons/sound-off.svg',
  'assets/icons/sound-on.svg',
  'assets/icons/sparkle.svg',
  'assets/icons/tada.svg',
  'assets/characters/bat.svg',
  'assets/characters/black-cat.svg',
  'assets/characters/candy.svg',
  'assets/characters/croissant.svg',
  'assets/characters/ghost.svg',
  'assets/characters/goldie-cheer.svg',
  'assets/characters/goldie-wave.svg',
  'assets/characters/milly-peek.svg',
  'assets/characters/milly-run.svg',
  'assets/characters/milly.svg',
  'assets/characters/mouse.svg',
  'assets/characters/pumpkin.svg',
  'assets/characters/sniper-head.svg',
  'assets/characters/sniper.svg',
  'assets/characters/star.svg',
  'assets/costumes/bat-wings.svg',
  'assets/costumes/bow-tie.svg',
  'assets/costumes/cat-ears.svg',
  'assets/costumes/ghost-sheet.svg',
  'assets/costumes/pumpkin-suit.svg',
  'assets/costumes/spider-headband.svg',
  'assets/costumes/vampire-cape.svg',
  'assets/costumes/witch-hat.svg',
  'assets/scenes/bush.svg',
  'assets/scenes/fence.svg',
  'assets/scenes/graveyard.svg',
  'assets/scenes/hay.svg',
  'assets/scenes/night.svg',
  'assets/scenes/patch.svg',
  'assets/scenes/pumpkin-plain.svg',
  'assets/scenes/stage.svg',
  'assets/scenes/tombstone.svg',
  'assets/scenes/tombstone2.svg',
  'assets/scenes/yard.svg',
  'assets/audio/sfx/boing.mp3',
  'assets/audio/sfx/boo.mp3',
  'assets/audio/sfx/glow.mp3',
  'assets/audio/sfx/jingle.mp3',
  'assets/audio/sfx/meow.mp3',
  'assets/audio/sfx/nom.mp3',
  'assets/audio/sfx/poof.mp3',
  'assets/audio/sfx/pop.mp3',
  'assets/audio/sfx/sparkle.mp3',
  'assets/audio/sfx/squeak.mp3',
  'assets/audio/sfx/tap.mp3',
  'assets/audio/sfx/whoosh.mp3',
  'assets/audio/sfx/woof.mp3',
  // Voice recordings (assets/audio/voice/) are cached the first time they
  // load, so they don't need listing here.
];

// Always ask the server (skipping the browser's own short-term cache, which
// on GitHub Pages can hold a file for 10 minutes); GitHub answers "not
// modified" cheaply when nothing changed.
const fetchFresh = (url) => fetch(url, { cache: 'no-cache' });

const isCode = (req, url) =>
  req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const key = req.mode === 'navigate' ? './' : url.pathname;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetchFresh(url.href).then((res) => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    });

    if (isCode(req, url)) {
      // network first; the saved copy only when offline or very slow
      if (!cached) return fresh.catch(() => Response.error());
      e.waitUntil(fresh.catch(() => {}));
      const slow = new Promise((r) => setTimeout(() => r(cached), NETWORK_WAIT_MS));
      return Promise.race([fresh.then((res) => (res.ok ? res : cached)).catch(() => cached), slow]);
    }

    // art and sounds: saved copy first, refreshed in the background
    if (cached) {
      e.waitUntil(fresh.catch(() => {}));
      return cached;
    }
    try { return await fresh; } catch { return Response.error(); }
  })());
});
