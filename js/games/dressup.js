// Dress Up Sniper: tap an outfit to put it on, tap it again to take it off.
// Two pages of outfits; the round button beside Sniper (showing a picture
// of the other page) flips between them, and what he is wearing stays on.
// Each outfit uses one or more slots (head, neck, body, back); putting one
// on replaces whatever outfits are using any of those slots, so pieces mix
// freely. The star tile says "Wow, Sniper looks great!" and shows him off.
//
// To add or swap a costume, drop SVGs drawn in Sniper's coordinate system
// (viewBox "0 -100 400 580") into assets/costumes/ and list them below.
import { el, svg, sparkleBurst, centerOf, hintHand, pulseClass, wait } from '../util.js';
import { say, sfx } from '../audio.js';

// stacking order around Sniper (who sits at 10)
const Z = { back: 5, body: 20, neck: 30, head: 40 };

// parts: [file in assets/costumes/, slot, optional z]; covers: extra slots it
// takes up without drawing anything there; cue: voice line when put on.
const PAGES = [
  [
    { id: 'witch-hat', parts: [['witch-hat', 'head']] },
    { id: 'zombie', parts: [['zombie-shirt', 'body']] },
    { id: 'pumpkin-suit', parts: [['pumpkin-suit', 'body']] },
    { id: 'bat-wings', parts: [['bat-wings', 'back']] },
    { id: 'vampire-cape', parts: [['vampire-cape', 'back']] },
    { id: 'spider-headband', parts: [['spider-headband', 'head']] },
    { id: 'bow-tie', parts: [['bow-tie', 'neck']] },
    { id: 'cat-ears', parts: [['cat-ears', 'head']] },
  ],
  [
    // the sheet goes over his head (his eyes look out of the holes) and hides
    // the bow tie, but a hat still sits on top of it
    { id: 'ghost-sheet', parts: [['ghost-sheet', 'body', 35]], covers: ['neck'], cue: 'outfit-ghost' },
    { id: 'shark', parts: [['shark-suit', 'body'], ['shark-hood', 'head']], cue: 'outfit-shark' },
    { id: 'firefighter', parts: [['fire-jacket', 'body'], ['fire-helmet', 'head']], cue: 'outfit-firefighter' },
    { id: 'skeleton', parts: [['skeleton-suit', 'body']], cue: 'outfit-skeleton' },
    { id: 'bee', parts: [['bee-wings', 'back'], ['bee-suit', 'body'], ['bee-antennae', 'head']], cue: 'outfit-bee' },
    { id: 'bird', parts: [['bird-wings', 'back'], ['bird-cap', 'head']], cue: 'outfit-bird' },
    { id: 'monkey', parts: [['monkey-suit', 'body'], ['monkey-hood', 'head']], cue: 'outfit-monkey' },
    { id: 'dinosaur', parts: [['dino-suit', 'body'], ['dino-hood', 'head']], cue: 'outfit-dinosaur' },
  ],
];
// what the "more outfits" button shows for each page
const PAGE_PICTURE = [{ parts: [['witch-hat', 'head']] }, { parts: [['shark-hood', 'head']] }];

const OUTFITS = PAGES.flat();
const byId = (id) => OUTFITS.find((o) => o.id === id);
const slotsOf = (o) => [...o.parts.map((p) => p[1]), ...(o.covers || [])];
const zOf = (part) => part[2] || Z[part[1]];

const NS = 'http://www.w3.org/2000/svg';
const DOG_VB = '0 -100 400 580';

/** All of an outfit's pieces in one picture, cropped once it is on screen. */
function outfitPicture(o, cls) {
  const pic = document.createElementNS(NS, 'svg');
  pic.setAttribute('viewBox', DOG_VB);
  pic.setAttribute('class', 'art ' + cls);
  pic.setAttribute('aria-hidden', 'true');
  const g = document.createElementNS(NS, 'g');
  pic.appendChild(g);
  for (const part of [...o.parts].sort((a, b) => zOf(a) - zOf(b))) {
    const src = svg('costumes/' + part[0]);
    while (src.firstChild) g.appendChild(src.firstChild);
  }
  pic.crop = () => {
    if (pic.cropped) return;
    const b = g.getBBox();
    if (!b.width) return;
    const pad = 14;
    pic.setAttribute('viewBox', `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
    pic.cropped = true;
  };
  return pic;
}

export default {
  id: 'dressup',
  name: 'Dress Up Sniper',
  icon: 'characters/sniper-head',
  cue: 'game-dressup',
  costumeFiles: [...new Set(OUTFITS.flatMap((o) => o.parts.map((p) => 'costumes/' + p[0])))],

  start(root, { finish }) {
    el('div', 'scene-bg', root).style.backgroundImage = 'url(assets/scenes/stage.svg)';
    const area = el('div', 'dog-area', root);
    const dog = el('div', 'dog', area);
    const base = svg('characters/sniper', 'layer');
    base.style.zIndex = '10';
    dog.appendChild(base);

    const worn = new Map(); // outfit id -> its layers on Sniper
    const tiles = new Map(); // outfit id -> its tray tile
    const tray = el('div', 'tray', root);
    const hand = hintHand(root);
    let page = 0;
    let finished = false;
    let gone = false; // left the game before the party started
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

    function react(cue) {
      pulseClass(dog, 'hop');
      dog.classList.add('excited');
      later(() => dog.classList.remove('excited'), 1400);
      if (cue) { say(cue); sfx('boing', { volume: 0.6 }); }
      else sfx(Math.random() < 0.6 ? 'woof' : 'boing', { volume: 0.8 });
    }

    function takeOff(id) {
      const layers = worn.get(id);
      if (!layers) return;
      worn.delete(id);
      tiles.get(id).classList.remove('worn');
      for (const layer of layers) {
        layer.classList.add('pop-out');
        later(() => layer.remove(), 300);
      }
    }

    function toggle(o) {
      if (finished) return;
      hand.hide();
      if (worn.has(o.id)) {
        takeOff(o.id);
        sfx('whoosh');
        return;
      }
      // anything using one of this outfit's slots comes off first
      const mine = slotsOf(o);
      for (const id of [...worn.keys()]) {
        if (slotsOf(byId(id)).some((s) => mine.includes(s))) takeOff(id);
      }
      const layers = o.parts.map((part) => {
        const layer = svg('costumes/' + part[0], 'layer costume drop-' + part[1]);
        layer.style.zIndex = String(zOf(part));
        dog.appendChild(layer);
        return layer;
      });
      worn.set(o.id, layers);
      tiles.get(o.id).classList.add('worn');
      sfx('whoosh');
      later(() => react(o.cue), 250);
      const p = centerOf(dog);
      later(() => sparkleBurst(p.x, p.y - 40, 8, 130), 250);
      tray.querySelectorAll('.tada').forEach((t) => t.classList.add('ready'));
    }

    for (const o of OUTFITS) {
      const tile = el('button', 'tray-tile pic-box');
      tile.type = 'button';
      tile.setAttribute('aria-label', o.id.replace('-', ' '));
      tile.appendChild(outfitPicture(o, 'thumb'));
      tile.addEventListener('pointerdown', (e) => { e.preventDefault(); pulseClass(tile, 'press'); toggle(o); });
      tiles.set(o.id, tile);
    }

    const tadaTile = el('button', 'tray-tile pic-box tada');
    tadaTile.type = 'button';
    tadaTile.setAttribute('aria-label', 'Ta-da!');
    tadaTile.appendChild(svg('icons/tada'));
    tadaTile.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (finished) return;
      finished = true;
      hand.hide();
      sfx('sparkle');
      const c = centerOf(dog);
      sparkleBurst(c.x, c.y, 20, 180);
      // let "Wow, Sniper looks great!" finish, pause a moment, then party
      Promise.all([
        Promise.race([say('tada'), wait(6000)]),
        wait(1200), // keep the sparkle moment even when muted
      ]).then(() => wait(750)).then(() => {
        if (gone) return;
        const show = dog.cloneNode(true);
        show.className = 'dog showing';
        finish({ showcase: show });
      });
    });

    // the round button beside Sniper shows a picture of the other page
    const more = el('button', 'icon-btn more-outfits', area);
    more.type = 'button';
    more.setAttribute('aria-label', 'More outfits');
    function showPage(n) {
      page = n;
      tray.replaceChildren(...PAGES[n].map((o) => tiles.get(o.id)), tadaTile);
      tray.querySelectorAll('.thumb').forEach((t) => t.crop());
      const pic = outfitPicture(PAGE_PICTURE[1 - n], 'more-pic');
      more.replaceChildren(pic);
      pic.crop();
    }
    more.addEventListener('pointerdown', (e) => e.stopPropagation());
    more.addEventListener('click', (e) => {
      e.stopPropagation();
      if (finished) return;
      hand.hide();
      sfx('whoosh');
      pulseClass(more, 'bounce');
      tray.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 150, easing: 'ease-in' })
        .onfinish = () => {
          showPage(1 - page);
          tray.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 180, easing: 'ease-out' });
        };
    });
    showPage(0);

    dog.addEventListener('pointerdown', () => { if (!finished) react(); });

    say('dressup-intro', { queue: true }); // after the game's name finishes
    later(() => {
      if (worn.size) return;
      const c = centerOf(tray.firstChild);
      hand.showAt(c.x, c.y);
    }, 1800);

    return () => { gone = true; timers.forEach(clearTimeout); };
  },
};
