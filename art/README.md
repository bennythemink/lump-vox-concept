# Artwork sources

Source artwork for the collage hero. Nothing in here is loaded by the page. The page only
uses what's in `collage-hero/assets`.

- `masters/`: the full scenes each act is built from.
  - `act-1.png`: the park (after the bush clusters were removed).
  - `act-1-original.png`: the original park frame, with the trees and fern bushes.
  - `act-2.png`: the home, as generated (without the kids).
  - `act-3.png`: the empty block. Every act sits on this.
- `act-1-cutouts/`: Benny's hand-cut PNGs of the act 1 pieces, with `manifest.json` positions.
- `layers/act-1/`, `layers/act-2/`: every moving piece as a full 2688 x 1520 transparent
  WebP, in position. The page uses cropped copies of these in `collage-hero/assets/c/`. To
  change a piece, edit it here, then crop it again to its box (the `data-box` in
  `collage-hero/index.html` gives x, y, width, height).
  - `layers/act-2/kids-cutout.webp` is Benny's kids cut from the earlier home frame;
    `home-kids.webp` is that cut scaled and placed on the act 2 lawn.
- `layers/act-1/park-pond.webp`, `waterfall.webp`, `sculpture-reflection.webp`, `pond-mask.png`
  and `layers/act-2/home-pool.webp`, `pool-mask.png` are the full-size water sources. The page
  uses copies cropped to the water's box in `collage-hero/assets/w/`.

The page also has a half-size copy of everything in `collage-hero/assets/m/`, which phones
and small tablets load instead. Re-make it whenever a piece changes.
