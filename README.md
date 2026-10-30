# Lump: Space to Place (paper collage hero)

Concept homepage hero for lump.com.au, in an editorial paper-collage style: photo cutouts with
torn white paper borders, layered over one shared landscape. Scrolling plays three acts:

1. **Park**: a public sculpture park. "Turn a space into a place." / "Somewhere to meet at"
2. **Home**: the park folds away like a pop-up book as a backyard stands up in its place.
   Subtitle changes to "Somewhere to come home to".
3. **Empty block**: the home folds away too, leaving bare ground and a tumbleweed.
   "Every place starts as a space." / "Let's start on yours." / "Tell us about your space"

One scroll moves one whole act. After act 3, the next scroll carries on down the page.

See the brief: `Pixel Agency/Clients/Lump/Homepage Story Brief - Paper Collage.md` in the vault.
The Figma concepts are on the "Concepts — home page (Oct 2026)" page of the LUMP file.

## Preview it

It's a single static page with no build step. Serve the `collage-hero` folder with any static
server and open it, for example:

```bash
cd collage-hero
python3 -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` straight from the disk won't load the
water effect, because browsers block WebGL images from `file://`.)

## Where things live

- `collage-hero/index.html`: the whole page: layout, styles and script.
  - `plan` in the script sets when each piece folds away or stands up, in pairs.
  - `subs` sets when the card's subtitle changes.
  - `ACTS` and `DUR` set where each act rests and how long each change takes.
- `collage-hero/assets/`: only what the page loads.
  - `act3-base.webp`: the empty block every act sits on.
  - `c/`: each moving piece, cropped to its own box (its place is the `data-box` in `index.html`).
  - `w/`: the pond and pool, cropped to the water, with their ripple masks.
  - `m/`: half-size copies of everything, loaded on phones and small tablets.
- `art/`: source artwork, never loaded by the page (see `art/README.md`).
  - `masters/`: the full scene for each act.
  - `layers/`: every piece at full 2688 x 1520 size, in position. Edit these, then re-crop
    into `c/` and `m/c/`.
  - `act-1-cutouts/`: Benny's hand cuts.

## What moves

- Pond and pool ripple (WebGL), from the cursor and on their own. Kept off the swimmer.
- Waterfall flows and foams in act 1.
- Two birds cross the sky in every act.
- A tumbleweed rolls across the empty block in act 3.
- With reduced motion turned on, the acts swap instantly and the ambient motion is off.

## Size

About 2.5 MB to download on desktop and 0.9 MB on phones. Act 2 loads after the park is showing.

## Old 3D build

`src/`, `docs/`, the root `index.html` and the npm files are the earlier Three.js diorama hero,
which this replaced. They're kept for reference only and aren't used by the collage hero.
