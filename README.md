# Lump: Space to Place (3D diorama hero)

Concept homepage hero for lump.com.au. A stylised miniature diorama of a Lump sculpture garden, built in Three.js.

See the brief: `Pixel Agency/Clients/Lump/Homepage Story Brief - 3D Diorama.md` in the vault.

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173).

`npm run build` makes a static site in `dist/` that can go on any static host (Vercel, Netlify, GitHub Pages).

## Where things live

- `src/scene/layout.js`: positions of everything (pond, sculpture, waterfall, boardwalk, camera). Start here to move things around.
- `src/scene/sculpture.js`: the procedural stand-in sculpture. Each petal is its own object so it can breathe, fold or come apart later. Swap for Lump's CAD model when it arrives.
- `src/scene/people.js`: the mannequin family.
- `src/scene/vegetation.js`: gum trees, mid-storey, bushes, ferns, grasses, grass trees, lily pads.
- `src/scene/features.js`: rocks, waterfall and boardwalk.
- `src/scene/terrain.js`: ground and reflective pond.
- `src/scene/grade.js`: final colour grade, vignette and grain.
- `src/main.js`: renderer, lighting, tilt-shift post-processing and camera framing.

## Handy URL options

- `?notilt=1` turns off the tilt-shift blur
- `?cam=x,y,z&look=x,y,z&fov=n` overrides the camera
- `?still` renders a few frames then stops (used for screenshots)

## Stage status

1. Static scene, stand-in sculpture, hero text (this commit)
2. Ambient life: waterfall, ripples, birds, fish, hover breathing
3. Scroll sequence: colour to pencil, sculpture exit, barren space
4. Refine, mobile tuning, reduced-motion fallback
5. Swap in the real sculpture
