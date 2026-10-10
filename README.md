# Goldie's Halloween Adventure

Four short, friendly Halloween mini-games for a 3 to 5 year old, played on a phone in the browser. No reading, no losing, no ads, no tracking, no app store.

| Game | What she does |
|---|---|
| **Ghost Pop** | Tap the friendly ghosts that peek out from behind tombstones. Ten pops wins. Missed ghosts just sink away. Once a round a smiling croissant pops up instead of a ghost: tapping it gets "Yummy! Croissants are great!" (it doesn't count, but finding it puts it in the party with a bonus sparkle). |
| **Pumpkin Carving** | Pick one of four faces, then trace the dotted shapes with a finger. Near the line counts, and progress is kept if she lifts her finger. When every shape is cut, the pumpkin lights up. |
| **Count the Cats** | Find the five black cats in the yard. Each one is counted out loud with a big number. Milly, the orange cat from next door, is hiding too and gets her own "That's Milly!" (she doesn't count, but finding her adds a bonus sparkle to the party). Cats hide in different spots every time. The party ends with Milly chasing a mouse across the screen (it always gets away). |
| **Dress Up Sniper** | Tap costume pieces to put them on Sniper (tap again to take them off). Mix and match a hat, a bow tie, a suit and wings or a cape. The star button says "Ta-da!" and shows him off. |

Every game ends with the same party: pumpkins, bats, stars and candy fly, Goldie cheers, then a big **Play again** (circle arrow) and **Home** (house) button. A gold star sticker appears on the game's icon on the home screen.

## For parents

- **Sound:** the speaker button in the top-right corner turns sound on and off (it remembers). On iPhone, the side silent switch also mutes it.
- **Reset the stickers:** once any star is earned, a circular-arrow button appears in the top-left of the home screen. **Press and hold it** until the yellow ring fills (about 1.5 seconds) and the stars spin away. A quick tap just wiggles it, so it can't be cleared by accident. (Opening the link with `?reset` on the end also works.)
- **Add to home screen (optional):** in Safari tap Share, then "Add to Home Screen". It then opens full-screen and stays in portrait. It works without a connection after the first visit either way.
- **Guided Access (iPhone) / Screen pinning (Android)** keeps a small child inside the game. The game itself has no links out, no pop-ups and no purchases.

## Try it on a computer

Any static file server works. From the repository folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 and use the browser's phone view (in Chrome, DevTools then the phone icon). Sound starts after the first click.

## Deploy guide

It's a plain static site. Nothing to build.

### Option A: GitHub Pages (already set up)

The workflow in `.github/workflows/pages.yml` runs the tests and publishes the game every time `main` changes.

1. Once only: on GitHub open the repo's **Settings > Pages** and set **Source** to **GitHub Actions**.
2. Then open the **Actions** tab, pick **Deploy to GitHub Pages**, and click **Run workflow** (later pushes to `main` publish by themselves).
3. After about two minutes the game is at
   `https://wtmiller1973.github.io/halloween-adventure/`.
4. Open that link on the phone, then share it however you like (text, email).

Notes: the page asks search engines not to index it and nothing links to it, so it is effectively unlisted. The repository is public, so the code and cartoon art are public too (the photos never are; see Privacy). GitHub Pages from a private repository needs a paid GitHub plan; if that matters, use Option B.

### Option B: Netlify (drag and drop)

1. Make a free account at netlify.com.
2. Go to **Sites > Add new site > Deploy manually**.
3. Drag in a folder containing only `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/` and `assets/` from this repo (leave out `reference/` and `tools/`).
4. Netlify gives you a random, unlisted address like `https://jolly-pumpkin-123abc.netlify.app`. To update, drag the folder in again on the site's **Deploys** tab.

(Cloudflare Pages has the same drag-and-drop "Direct Upload" option and works the same way.)

### After an update

When the phone is online, the game always checks for the newest code, so a change shows up the next time the game is **opened** after the deploy finishes (about two minutes after pushing). If the game is already open, close it first: phones often just switch back to an open tab without reloading it. New art or recordings appear one launch later, because pictures and sounds load from the saved copy first for speed. Offline, the saved copy is used.

## Privacy

- The reference photos live in `reference/` on your own computer only. That folder is in `.gitignore`, the deploy only copies the game files, and a test (`npm test`) fails if a photo is ever committed.
- The game makes no requests to any other website: the font, art and sounds are all bundled. No analytics, cookies or accounts. The only thing it stores is the sticker list and the sound setting, on the phone itself.

## Making changes

### The characters

The cartoon art is generated by `tools/make_art.py`, so likeness tweaks are quick. At the top of each character's section are the colours and a description, e.g. for Goldie:

```python
HAIR = '#F4C762'      # hair colour
EYE = '#5B9BD5'       # eye colour
DRESS = '#2F3B6E'     # dress colour
```

Change a value and run `python3 tools/make_art.py` to redraw every SVG. Each character, costume piece and scene is its own file in `assets/`, so any one of them can also be replaced with hand-drawn art (same file name, any SVG editor). Costumes must be drawn on Sniper's canvas (`viewBox="0 -100 400 580"`) so they line up.

| Asset | Files |
|---|---|
| Goldie | `assets/characters/goldie-wave.svg` (home), `goldie-cheer.svg` (celebration) |
| Sniper | `assets/characters/sniper.svg` (dress-up), `sniper-head.svg` (home icon) |
| Milly | `assets/characters/milly-peek.svg` (hiding), `milly.svg` (bonus in the party), `milly-run.svg` (chasing the mouse) |
| Costumes | `assets/costumes/*.svg` (list and slots in `js/games/dressup.js`) |
| Friendly cast | `assets/characters/ghost.svg`, `black-cat.svg`, `bat.svg`, `pumpkin.svg`, `candy.svg`, `star.svg`, `croissant.svg`, `mouse.svg` |
| Scenery | `assets/scenes/*.svg` |

### Voice and sounds

See [AUDIO.md](AUDIO.md) for the recording list and file names.

### Tuning the games

The few numbers worth changing are at the top of each game file in `js/games/`: ghosts to pop (`GOAL`) and how long each one waits (`STAY_MS`), how forgiving tracing is (`TOLERANCE`, `DONE_AT`), the hiding spots, and the costume list.

If you add or rename an asset, also add it to the list in `sw.js` (the offline cache). `npm test` checks the list is complete.

## Code map

```
index.html              page shell (no zoom, portrait, safe areas)
css/style.css           all layout and animation
js/main.js              boot, home screen, navigation, mute button
js/audio.js             sound + voice (recordings, else built-in speech)
js/audio-cues.js        every voice cue and sound effect, by name
js/celebrate.js         the shared end-of-game party + stickers
js/spots.js             "peeking out from behind something" helper
js/games/*.js           one file per game
sw.js                   offline cache
tools/make_art.py       draws every SVG in assets/
tools/make_sfx.py       synthesises every sound in assets/audio/sfx/
reference/              private photos (git-ignored, never deployed)
```
