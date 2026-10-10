// Boot, home screen and navigation between games.
import { el, svg, store, preloadSVGs, iconButton, pulseClass, sparkleBurst } from './util.js';
import { unlock, say, sfx, stopVoice, isMuted, setMuted, isSpeaking } from './audio.js';
import { celebrate } from './celebrate.js';
import ghostPop from './games/ghostpop.js';
import pumpkin from './games/pumpkin.js';
import cats from './games/cats.js';
import dressUp from './games/dressup.js';

const GAMES = [ghostPop, pumpkin, cats, dressUp];

const SVGS = [
  'characters/goldie-wave', 'characters/goldie-cheer', 'characters/sniper', 'characters/sniper-head',
  'characters/milly', 'characters/milly-peek', 'characters/black-cat', 'characters/ghost',
  'characters/pumpkin', 'characters/bat', 'characters/candy', 'characters/star',
  'icons/home', 'icons/again', 'icons/sound-on', 'icons/sound-off', 'icons/tada', 'icons/hand',
  'icons/sparkle', 'icons/rotate',
  'scenes/tombstone', 'scenes/tombstone2', 'scenes/bush', 'scenes/fence', 'scenes/hay', 'scenes/pumpkin-plain',
  ...dressUp.costumeFiles,
];

const app = document.getElementById('app');
const holder = el('div', 'screen-holder', app);
let cleanup = null;
let closeParty = null;
let current = null;

// ---------------------------------------------------------------- guards
// No zoom, no scrolling, no long-press menus, no pull-to-refresh.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('selectstart', (e) => e.preventDefault());

// Parents: add ?reset to the link to clear the stickers.
if (new URLSearchParams(location.search).has('reset')) {
  store.clear();
  history.replaceState(null, '', location.pathname);
}

// ---------------------------------------------------------------- navigation
function clear({ keepVoice = false } = {}) {
  if (cleanup) cleanup();
  cleanup = null;
  if (closeParty) closeParty();
  closeParty = null;
  if (!keepVoice) stopVoice();
  holder.replaceChildren();
}

function goHome() {
  // Leaving a game pops the history entry we pushed, so the phone's back
  // button and our home button behave the same.
  if (history.state && history.state.game) history.back();
  else showHome();
}

window.addEventListener('popstate', () => showHome());

function startGame(game, push = true) {
  clear({ keepVoice: true }); // let the game's name finish; its intro queues after it
  current = game;
  if (push) history.pushState({ game: game.id }, '');
  const root = el('div', 'screen game-' + game.id, holder);
  iconButton(root, 'home', 'corner home-btn', () => { sfx('tap'); goHome(); }, 'Home');
  cleanup = game.start(root, {
    finish(opts = {}) {
      closeParty = celebrate({
        gameId: game.id,
        ...opts,
        onAgain: () => { closeParty = null; startGame(game, false); },
        onHome: () => { closeParty = null; goHome(); },
      });
    },
  });
}

const GOLDIE_SAYS = ['hello', 'goldie-halloween', 'goldie-kiddo'];
let goldieLine = 0;

function showHome() {
  clear();
  current = null;
  const root = el('div', 'screen home', holder);
  el('div', 'scene-bg', root).style.backgroundImage = 'url(assets/scenes/night.svg)';
  el('h1', 'title', root, "Goldie's<br><span>Halloween Adventure</span>");
  const grid = el('div', 'home-grid', root);
  const done = store.get('done', {});
  let busy = false;
  for (const game of GAMES) {
    const tile = el('button', 'tile', grid);
    tile.type = 'button';
    tile.setAttribute('aria-label', game.name);
    tile.appendChild(svg(game.icon, 'tile-art'));
    if (done[game.id]) {
      const s = el('div', 'sticker', tile);
      s.appendChild(svg('characters/star'));
    }
    tile.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      sfx('tap');
      pulseClass(tile, 'bounce');
      say(game.cue);
      setTimeout(() => startGame(game), 450);
    });
  }
  const g = el('div', 'home-goldie', root);
  g.appendChild(svg('characters/goldie-wave'));
  // Tapping Goldie: she says the next of her three lines (back to the first
  // each time the home screen loads). A tap while she's talking just hops.
  goldieLine = 0;
  g.addEventListener('pointerdown', () => {
    pulseClass(g, 'hop');
    if (isSpeaking()) return;
    say(GOLDIE_SAYS[goldieLine]);
    goldieLine = (goldieLine + 1) % GOLDIE_SAYS.length;
  });
  if (Object.keys(done).length) startOverButton(root, grid);
}

// Start over: clears the stickers. It must be held down while a ring fills
// (about 1.5 s), so a quick accidental tap only makes it wiggle.
const HOLD_MS = 1500;

function startOverButton(root, grid) {
  const b = el('button', 'icon-btn corner start-over', root);
  b.type = 'button';
  b.setAttribute('aria-label', 'Start over (press and hold)');
  b.appendChild(svg('icons/again'));
  let t0 = 0;
  let raf = 0;
  const setP = (p) => b.style.setProperty('--p', String(p));
  const cancel = (wiggle) => {
    cancelAnimationFrame(raf);
    raf = 0;
    setP(0);
    if (wiggle) pulseClass(b, 'wiggle');
  };
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / HOLD_MS);
    setP(p);
    if (p < 1) { raf = requestAnimationFrame(tick); return; }
    raf = 0;
    store.set('done', {});
    sfx('whoosh');
    sfx('sparkle', { volume: 0.7 });
    grid.querySelectorAll('.sticker').forEach((s) => {
      const r = s.getBoundingClientRect();
      sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, 8, 80);
      s.classList.add('sticker-off');
      s.addEventListener('animationend', () => s.remove());
    });
    b.classList.add('gone');
    setTimeout(() => b.remove(), 400);
  };
  b.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (raf) return;
    try { b.setPointerCapture(e.pointerId); } catch { /* fine */ }
    sfx('tap');
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  });
  b.addEventListener('pointerup', () => { if (raf) cancel(true); });
  b.addEventListener('pointercancel', () => { if (raf) cancel(false); });
}

// ---------------------------------------------------------------- boot
function setupMute() {
  const b = el('button', 'icon-btn corner mute-btn', app);
  b.type = 'button';
  b.setAttribute('aria-label', 'Sound on or off');
  const draw = () => b.replaceChildren(svg(isMuted() ? 'icons/sound-off' : 'icons/sound-on'));
  draw();
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    unlock();
    setMuted(!isMuted());
    draw();
  });
}

// The first tap on the home screen gets a hello, unless that tap already
// makes a sound of its own (a game icon, Goldie, or a corner button).
let greeted = false;
document.addEventListener('pointerdown', (e) => {
  unlock();
  if (greeted) return;
  greeted = true;
  if (current || e.target.closest('.tile, .home-goldie, .icon-btn')) return;
  setTimeout(() => {
    if (current) return;
    say('hello');
    goldieLine = 1; // she just said line 1, so Goldie's first tap is line 2
  }, 50);
}, true);

async function boot() {
  try { await window.screen.orientation?.lock?.('portrait'); } catch { /* only works installed/fullscreen */ }
  await preloadSVGs(SVGS);
  document.getElementById('loading')?.remove();
  setupMute();
  history.replaceState(null, '', location.pathname);
  showHome();
  const rot = document.getElementById('rotate');
  if (rot) rot.appendChild(svg('icons/rotate'));
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
