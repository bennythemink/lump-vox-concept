# Hero collage layers

Cut from the final Frame 1 (before scroll) for the paper collage hero.

## Files

- `base.png`: the clean landscape left after the scroll (the after state).
- One transparent PNG per moving piece, cropped tight. `manifest.json` gives each one's x, y position on the 2688 x 1520 canvas and its stacking order (z).
- `check-all-layers-stacked.png`: every layer stacked back together. It should look the same as Frame 1.
- `reference-frame-1-before.png` and `reference-frame-2-after.png`: the two source images.
- `layer-overview.jpg`: every piece on its own, for a quick look.

## Stacking order (back to front)

1. base
2. waterfall
3. waterfall_reflection
4. sculpture_reflection
5. sculpture
6. boardwalk
7. family
8. reader
9. reeds_left
10. reeds_right

## Known limits

- Frame 2 was redrawn by the AI, so it doesn't match Frame 1 pixel for pixel. The base uses Frame 1 everywhere and only borrows Frame 2 close around the pieces that leave, so nothing outside those areas shifts during the animation.
- Drop shadows are drawn from each piece's outline rather than copied from the image, so they leave cleanly with their piece.
- The boardwalk under the reader and under the right reeds was never visible in Frame 1. Those areas are filled with plain timber colour. They only show if the reader or reeds leave before the boardwalk.
- The people cutouts carry a few small slivers of their surroundings (a leaf beside the reader's book, bits of boardwalk at the family's feet).
- The two plant clusters beside the waterfall are part of the base, not separate layers, because nothing exists behind them to reveal.
- These are full-quality PNG masters. They'll be converted to WebP or AVIF for the live page.
