import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundHeight, pondSDF, plazaDist, pathDist, perlin, SCULPTURE, WATERFALL, CAMERA, BOARDWALK } from './layout.js';
import { makeRng, paint, normalise, cylinderBetween, blob, smoothstep } from './utils.js';

const rng = makeRng(7);
const R = (a, b) => a + (b - a) * rng();
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const boardwalkCurve = new THREE.CatmullRomCurve3(BOARDWALK);
const bwPts = boardwalkCurve.getSpacedPoints(80);
function boardwalkDist(x, z) {
  let d = Infinity;
  for (const p of bwPts) d = Math.min(d, Math.hypot(p.x - x, p.z - z));
  return d;
}

// Somewhere planting can go (not in water, not on paths or the plaza)
function plantable(x, z, margin = 0.4) {
  return pondSDF(x, z) > margin && plazaDist(x, z) > 4.2 && pathDist(x, z) > 1.5 && boardwalkDist(x, z) > 1.9;
}

// Keep the middle of the sky open over the sculpture, like the reference shot
function inSkyWindow(x, z) {
  const toCam = Math.atan2(x - CAMERA.pos.x, CAMERA.pos.z - z);
  return Math.abs(toCam - 0.08) < 0.42 && z > -34;
}

/* ---------------- Gum trees ---------------- */

const BARK = ['#a69a83', '#968b75', '#b0a48c', '#8a806c', '#9e927a'];
const LEAF = ['#7b8b55', '#8a9660', '#6c7c4c', '#96a064', '#74844e', '#a0a466'];

function gumTree(height, seed) {
  const bark = [], leaves = [];
  const lean = new THREE.Vector3(R(-0.12, 0.12), 1, R(-0.12, 0.12)).normalize();
  const segs = 5;
  let p = new THREE.Vector3(0, -0.3, 0);
  let dir = lean.clone();
  const trunkTop = height * R(0.62, 0.74);
  const r0 = height * 0.019;
  const trunkPts = [p.clone()];
  for (let i = 0; i < segs; i++) {
    const len = trunkTop / segs;
    dir.add(new THREE.Vector3(R(-0.12, 0.12), 0, R(-0.12, 0.12))).normalize();
    const q = p.clone().addScaledVector(dir, len);
    const ra = r0 * (1 - i / segs * 0.55), rb = r0 * (1 - (i + 1) / segs * 0.55);
    bark.push(paint(cylinderBetween(p, q, ra, rb, 9), pick(BARK), 0.06, rng));
    p = q;
    trunkPts.push(p.clone());
  }
  // branches from the upper trunk, each ending in a canopy clump
  const nb = 4 + Math.floor(rng() * 3);
  for (let b = 0; b < nb; b++) {
    const start = trunkPts[Math.floor(R(2.5, segs + 0.99))].clone();
    const a = (b / nb) * Math.PI * 2 + R(-0.4, 0.4);
    const spread = R(0.35, 0.75);
    const bdir = new THREE.Vector3(Math.cos(a) * spread, 1, Math.sin(a) * spread).normalize();
    const blen = height * R(0.2, 0.32);
    const mid = start.clone().addScaledVector(bdir, blen * 0.55);
    bdir.y += 0.25; bdir.normalize();
    const end = mid.clone().addScaledVector(bdir, blen * 0.45);
    bark.push(paint(cylinderBetween(start, mid, r0 * 0.45, r0 * 0.3, 7), pick(BARK), 0.06, rng));
    bark.push(paint(cylinderBetween(mid, end, r0 * 0.3, r0 * 0.15, 6), pick(BARK), 0.06, rng));
    // canopy clumps: open, airy, a few blobs per branch
    const nc = 4 + Math.floor(rng() * 4);
    for (let c = 0; c < nc; c++) {
      const rad = height * R(0.035, 0.06);
      const g = blob(rad, 2, perlin, 0.35, seed * 3.1 + b + c * 0.37, 1.6 / rad);
      g.scale(R(1.1, 1.5), R(0.7, 0.9), R(1.1, 1.5));
      const o = end.clone().add(new THREE.Vector3(R(-1, 1), R(-0.5, 0.8), R(-1, 1)).multiplyScalar(rad * 2.2));
      g.translate(o.x, o.y, o.z);
      leaves.push(paint(g, pick(LEAF), 0.15, rng));
    }
  }
  return { bark, leaves };
}

/* ---------------- Bushes ---------------- */

const BUSH = ['#6f7f40', '#8a9a4e', '#5d6e3a', '#8f9c94', '#7f8c3f', '#9aa24d', '#66763c', '#788a45'];

function bush(size, seed, palette = BUSH) {
  const parts = [];
  const n = 2 + Math.floor(rng() * 3);
  const col = pick(palette);
  for (let i = 0; i < n; i++) {
    const r = size * R(0.5, 0.8);
    const g = blob(r, 2, perlin, 0.3, seed + i * 1.7, 1.8 / r);
    g.scale(1, R(0.7, 0.95), 1);
    g.translate(R(-0.5, 0.5) * size, r * 0.6, R(-0.5, 0.5) * size);
    parts.push(paint(g, col, 0.12, rng));
  }
  return parts;
}

/* ---------------- Ferns ---------------- */

function frondTexture() {
  const W = 512, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  for (let x = 8; x < W - 6; x += 9) {
    const u = x / W;
    const len = (H / 2 - 4) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.8);
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(x + len * 0.35, H / 2 + s * len * 0.5, len * 0.52, 3.2, s * 1.05, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
}

function frondGeometry(L, W) {
  const seg = 14;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    // arch up and out, then droop
    const x = u * L;
    const y = Math.sin(u * Math.PI * 0.85) * L * 0.32 - u * u * L * 0.22;
    for (const s of [-1, 1]) {
      pos.push(x, y + Math.abs(s) * 0.0, s * W * 0.5);
      uv.push(u, s < 0 ? 0 : 1);
    }
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function fernCrown(radius, count, tilt, seed) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const L = radius * R(0.8, 1.15);
    const g = frondGeometry(L, L * 0.34);
    g.rotateX(R(-0.3, 0.3)); // twist the blade a little
    g.rotateZ(tilt + R(-0.15, 0.25));
    g.rotateY((i / count) * Math.PI * 2 + R(-0.2, 0.2) + seed);
    parts.push(paint(g, pick(['#5f7a34', '#6c8838', '#55702f', '#7a9440']), 0.12, rng));
  }
  return parts;
}

/* ---------------- Grasses ---------------- */

function tussock(height, blades, spread, color) {
  const parts = [];
  for (let i = 0; i < blades; i++) {
    const h = height * R(0.6, 1.1);
    const w = R(0.03, 0.055) * Math.max(0.6, height);
    const a = rng() * Math.PI * 2;
    const tilt = R(0.15, spread);
    const seg = 4;
    const pos = [], idx = [];
    for (let j = 0; j <= seg; j++) {
      const t = j / seg;
      const out = Math.sin(tilt) * h * t * t * 1.2;
      const y = h * t * (1 - t * t * tilt * 0.4);
      const ww = w * (1 - t);
      pos.push(out - ww * 0.0, y, -ww, out, y, ww);
    }
    for (let j = 0; j < seg; j++) {
      const k = j * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.rotateY(a);
    // colour fades lighter to the tips
    const cols = [];
    const c0 = new THREE.Color(color).multiplyScalar(0.7), c1 = new THREE.Color(color).multiplyScalar(R(1.0, 1.2));
    for (let j = 0; j <= seg; j++) {
      const c = c0.clone().lerp(c1, j / seg);
      cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((seg + 1) * 4), 2));
    parts.push(g);
  }
  return mergeGeometries(parts);
}

/* ---------------- Grass trees (Xanthorrhoea) ---------------- */

function grassTree(h) {
  const parts = [];
  const trunk = cylinderBetween(new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(R(-0.1, 0.1), h, 0), 0.2, 0.17, 10);
  parts.push(paint(trunk, '#2c2723', 0.1, rng));
  const top = new THREE.Vector3(0, h, 0);
  const skirt = new THREE.SphereGeometry(0.28, 10, 8);
  skirt.scale(1, 0.6, 1);
  skirt.translate(0, h - 0.05, 0);
  parts.push(paint(skirt, '#6b5a3c', 0.1, rng));
  const head = tussock(1.45, 220, 1.7, '#8b9a4b');
  head.translate(top.x, top.y, top.z);
  parts.push(head);
  return parts;
}

/* ---------------- Build everything ---------------- */

export function makeVegetation(renderer) {
  const group = new THREE.Group();
  group.name = 'vegetation';
  const bark = [], leaves = [], bushes = [], grass = [], ferns = [];

  // Gum trees: a dense back wall and framing trees left and right
  const placeTree = (x, z, h) => {
    const y = groundHeight(x, z);
    const t = gumTree(h, x * 0.13 + z * 0.07);
    for (const g of t.bark) { g.translate(x, y, z); bark.push(normalise(g)); }
    for (const g of t.leaves) { g.translate(x, y, z); leaves.push(normalise(g)); }
  };
  let tries = 0, placed = 0;
  while (placed < 85 && tries < 4000) {
    tries++;
    const z = R(-64, -15);
    const x = R(-48, 52);
    if (inSkyWindow(x, z) && z > -40) continue;
    if (!plantable(x, z, 2)) continue;
    const far = smoothstep(-12, -60, z);
    placeTree(x, z, R(15, 24) + far * 6);
    placed++;
  }
  // framing trees, closer in
  [[-15, -6, 22], [-19, 2, 25], [-14.5, 8, 18], [14, -3, 23], [17, 5, 26], [13, -16, 20], [-11, -17, 21], [21, -11, 24], [-24, -9, 23]].forEach(([x, z, h]) => placeTree(x, z, h));
  // a dark conifer behind the sculpture, like the cypress in the photos
  {
    const x = -5.5, z = -27, y = groundHeight(x, z);
    for (let i = 0; i < 16; i++) {
      const f = i / 16;
      const r = 3.0 * (1 - f * 0.85);
      const g = blob(r, 2, perlin, 0.22, 40 + i, 1.2 / r);
      g.scale(1, 0.75, 1);
      g.translate(x + R(-0.4, 0.4), y + 1.5 + f * 15, z + R(-0.4, 0.4));
      leaves.push(normalise(paint(g, i % 2 ? '#3f5a35' : '#46603a', 0.08, rng)));
    }
  }

  // Mid-storey: small bushy trees that hide the trunk line, like the wattles and tea-trees in the photos
  tries = 0; placed = 0;
  while (placed < 70 && tries < 4000) {
    tries++;
    const x = R(-40, 40), z = R(-34, -13);
    if (!plantable(x, z, 2)) continue;
    if (inSkyWindow(x, z) && z > -20) continue;
    const y = groundHeight(x, z);
    const h = R(3.5, 7.5);
    const trunk = cylinderBetween(new THREE.Vector3(x, y - 0.2, z), new THREE.Vector3(x + R(-0.3, 0.3), y + h * 0.5, z + R(-0.3, 0.3)), 0.12, 0.08, 6);
    bark.push(normalise(paint(trunk, pick(BARK), 0.1, rng)));
    const col = pick(['#5f7040', '#6f7f45', '#56683a', '#7c8a4a', '#879a8c']);
    const nb = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < nb; i++) {
      const r = h * R(0.18, 0.28);
      const g = blob(r, 2, perlin, 0.3, x + z + i, 1.6 / r);
      g.scale(1.2, 0.85, 1.2);
      g.translate(x + R(-1, 1) * r, y + h * R(0.45, 0.85), z + R(-1, 1) * r);
      leaves.push(normalise(paint(g, col, 0.12, rng)));
    }
    placed++;
  }

  // Bushes scattered through the beds
  tries = 0; placed = 0;
  while (placed < 230 && tries < 8000) {
    tries++;
    const x = R(-30, 30), z = R(-34, 12);
    if (!plantable(x, z, 0.8)) continue;
    if (Math.hypot(x - CAMERA.pos.x, z - CAMERA.pos.z) < 5) continue;
    if (Math.abs(x - SCULPTURE.x) < 7 && z > SCULPTURE.z - 5 && z < SCULPTURE.z + 6) continue;
    const y = groundHeight(x, z);
    const size = R(0.5, 1.3) * (z < -11 ? R(1.5, 2.6) : 1);
    for (const g of bush(size, x + z)) { g.translate(x, y, z); bushes.push(normalise(g)); }
    placed++;
  }

  // Tree ferns and ground ferns around the waterfall
  const fernTex = frondTexture();
  const fernSpots = [[-10.6, -2.4, 2.6], [-5.4, -6.4, 2.1], [-12.8, 1.0, 1.7], [-12.2, -6.0, 3.0], [-4.2, -6.8, 0], [-11.5, 3.6, 0], [-7.6, -7.6, 0], [-13.5, -2.5, 0], [-3.4, -5.8, 0], [-9.6, -8.0, 1.3]];
  for (const [x0, z0, th] of fernSpots) {
    const x = x0 + 2.8, z = z0 - 2.8;
    const y = groundHeight(x, z);
    if (th > 0) {
      const trunk = cylinderBetween(new THREE.Vector3(x, y - 0.2, z), new THREE.Vector3(x + R(-0.2, 0.2), y + th, z + R(-0.2, 0.2)), 0.2, 0.16, 8);
      bark.push(normalise(paint(trunk, '#3b2e24', 0.1, rng)));
    }
    for (const g of fernCrown(th > 0 ? 2.1 : R(0.9, 1.4), th > 0 ? 14 : 10, th > 0 ? 0.15 : 0.35, x)) {
      g.translate(x, y + th + (th > 0 ? 0 : 0.05), z);
      ferns.push(g);
    }
  }

  // Grass tussocks: pond edges, beds and along the boardwalk
  const grassCols = ['#a9a548', '#93a043', '#b8b058', '#7f9139', '#c2b763', '#88983f'];
  tries = 0; placed = 0;
  while (placed < 420 && tries < 20000) {
    tries++;
    const x = R(-24, 22), z = R(-20, 16);
    const d = pondSDF(x, z);
    const nearEdge = d > 0.05 && d < 2.6;
    if (!nearEdge && rng() > 0.25) continue;
    if (!plantable(x, z, 0.05)) continue;
    if (Math.hypot(x - CAMERA.pos.x, z - CAMERA.pos.z) < 6) continue;
    const y = groundHeight(x, z);
    const nearView = Math.abs(x - SCULPTURE.x) < 7 && z > SCULPTURE.z - 5 && z < SCULPTURE.z + 6;
    const h = R(0.45, 1.05) * (nearEdge ? 1.1 : 0.9) * (nearView ? 0.55 : 1);
    const g = tussock(h, 26, 0.9, pick(grassCols));
    g.translate(x, y - 0.05, z);
    grass.push(g);
    placed++;
  }
  // reeds standing in the shallows
  tries = 0; placed = 0;
  while (placed < 70 && tries < 6000) {
    tries++;
    const x = R(-14, 14), z = R(-6, 15);
    const d = pondSDF(x, z);
    if (d > -0.15 || d < -1.6) continue;
    // keep the middle of the pond clear for the reflection
    if (Math.abs(x - 1.5) < 7.5) continue;
    if (Math.hypot(x - CAMERA.pos.x, z - CAMERA.pos.z) < 7) continue;
    const g = tussock(R(0.9, 1.7), 34, 0.35, pick(['#7f9a3c', '#93a845', '#6f8a36']));
    g.translate(x, -0.1, z);
    grass.push(g);
    placed++;
  }

  // Grass trees near the boardwalk and on the left bank
  for (const [x, z, h] of [[9.6, -1.0, 1.2], [8.6, 4.5, 0.8], [-1.2, -11.2, 1.5], [7.6, -10.5, 1.0], [-15, -4, 0.9]]) {
    const y = groundHeight(x, z);
    for (const g of grassTree(h)) { g.translate(x, y, z); grass.push(normalise(g)); }
  }

  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const barkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  const fernMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, alphaMap: fernTex, alphaTest: 0.4 });

  const add = (geos, mat, shadow = true, name) => {
    if (!geos.length) return;
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.name = name;
    group.add(m);
    return m;
  };
  add(bark, barkMat, true, 'bark');
  add(leaves, leafMat, true, 'leaves');
  add(bushes, leafMat, true, 'bushes');
  add(grass, grassMat, true, 'grass');
  const fernMesh = add(ferns.map(normalise), fernMat, true, 'ferns');
  if (fernMesh) {
    fernMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: fernTex, alphaTest: 0.4 });
  }

  // Lily pads on the water
  const pads = [];
  tries = 0; placed = 0;
  while (placed < 26 && tries < 3000) {
    tries++;
    const x = R(-12, 10), z = R(-4, 14);
    const d = pondSDF(x, z);
    if (d > -0.4 || d < -3.5) continue;
    if (Math.abs(x - 1) < 5 && z < 10) continue;
    const r = R(0.18, 0.38);
    const g = new THREE.CircleGeometry(r, 14, 0.25, Math.PI * 2 - 0.5);
    g.rotateX(-Math.PI / 2);
    g.rotateY(rng() * Math.PI * 2);
    g.translate(x, 0.02, z);
    pads.push(paint(g, pick(['#6d8a3a', '#7d9a44', '#5f7d36']), 0.1, rng));
    placed++;
  }
  add(pads.map(normalise), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }), false, 'lilies');

  return group;
}
