# Act 1 cutouts

Benny's original cuts of the act 1 park pieces, from Frame 1 (now `../masters/act-1-original.png`). Full-quality PNG masters; the page uses WebP copies.

## Files

- One transparent PNG per moving piece, cropped tight. `manifest.json` gives each one's x, y position on the 2688 x 1520 canvas and its stacking order (z).

## Stacking order (back to front)

1. waterfall
2. waterfall_reflection
3. sculpture_reflection
4. sculpture
5. boardwalk
6. family
7. reader
8. reeds_left
9. reeds_right

## Known limits

- Frame 2 was redrawn by the AI, so it doesn't match Frame 1 pixel for pixel. The base uses Frame 1 everywhere and only borrows Frame 2 close around the pieces that leave, so nothing outside those areas shifts during the animation.
- Drop shadows are drawn from each piece's outline rather than copied from the image, so they leave cleanly with their piece.
- The boardwalk under the reader and under the right reeds was never visible in Frame 1. Those areas are filled with plain timber colour. They only show if the reader or reeds leave before the boardwalk.
- The people cutouts carry a few small slivers of their surroundings (a leaf beside the reader's book, bits of boardwalk at the family's feet).
- The two plant clusters beside the waterfall are part of the base, not separate layers, because nothing exists behind them to reveal.
- These are full-quality PNG masters. They'll be converted to WebP or AVIF for the live page.
