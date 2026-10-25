import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundHeight, pondSDF, perlin, WATERFALL, BOARDWALK, CAMERA, SCULPTURE } from './layout.js';
import { makeRng, paint, normalise, blob } from './utils.js';

const rng = makeRng(21);
const R = (a, b) => a + (b - a) * rng();
const SANDSTONE = ['#a98d70', '#b39878', '#9a8064', '#bba383', '#8f7860'];

function rock(size, seed) {
  const g = blob(size, 1, perlin, 0.5, seed, 1.6 / size);
  g.computeVertexNormals();
  g.scale(R(1.0, 1.4), R(0.55, 0.8), R(0.9, 1.2));
  g.rotateY(rng() * Math.PI);
  return paint(g, SANDSTONE[Math.floor(rng() * SANDSTONE.length)], 0.12, rng);
}

/* ---------------- Rocks and the waterfall ---------------- */

export function makeRocksAndWaterfall() {
  const group = new THREE.Group();
  const rocks = [];

  // stacked outcrop the water falls from
  const W = WATERFALL;
  const outcrop = [
    [-2.2, 0.2, -1.0, 1.9], [0.0, 0.0, -1.6, 1.7], [2.0, 0.3, -1.2, 1.6], [-1.2, 1.7, -2.0, 1.6], [1.3, 1.9, -2.2, 1.5],
    [-3.6, 0.4, 0.6, 1.4], [3.4, 0.2, 0.8, 1.3], [0.2, 3.2, -2.8, 1.4], [-2.6, 2.6, -2.6, 1.2], [2.6, 2.9, -3.0, 1.2],
    [-1.0, 0.0, 0.7, 0.8], [1.1, -0.1, 0.9, 0.7], [-4.8, 1.2, -1.8, 1.5], [4.6, 1.0, -1.6, 1.4],
  ];
  for (const [dx0, dy, dz, s0] of outcrop) {
    const dx = dx0 * 0.7;
    const s = s0 * 0.66;
    const g = rock(s, dx * 3 + dz);
    g.translate(W.x + dx, groundHeight(W.x + dx, W.z + dz) + dy * 0.9 - s * 0.25, W.z + dz);
    rocks.push(normalise(g));
  }
  // boulders around the pond edge and through the garden
  let tries = 0, placed = 0;
  while (placed < 34 && tries < 3000) {
    tries++;
    const x = R(-22, 18), z = R(-16, 15);
    const d = pondSDF(x, z);
    const edge = d > -0.6 && d < 1.2;
    if (!edge && rng() > 0.15) continue;
    if (d < -0.6) continue;
    if (Math.hypot(x - SCULPTURE.x, z - SCULPTURE.z) < 4.4) continue; // keep the plaza clear
    if (Math.abs(x - 1.5) < 6.5 && z > SCULPTURE.z && z < SCULPTURE.z + 7) continue; // keep the view to the sculpture open
    if (Math.hypot(x - CAMERA.pos.x, z - CAMERA.pos.z) < 5) continue; // nothing right under the camera
    const s = R(0.35, 1.1);
    const g = rock(s, x * 1.3 + z);
    g.translate(x, Math.max(groundHeight(x, z), -0.2) - s * 0.2, z);
    rocks.push(normalise(g));
    placed++;
  }
  // a big flat sandstone slab in the bottom-left foreground, like the photo
  {
    const g = blob(1.6, 3, perlin, 0.18, 9.1, 0.8);
    g.scale(1.8, 0.45, 1.2);
    paint(g, '#b4977a', 0.05, rng);
    g.translate(-5.2, -0.1, 3.4);
    rocks.push(normalise(g));
  }
  const rockMesh = new THREE.Mesh(mergeGeometries(rocks), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  rockMesh.name = 'rocks';
  group.add(rockMesh);

  // Falling water: two tiers of soft streaked sheets
  const streak = waterStreakTexture();
  const fallMat = new THREE.MeshStandardMaterial({
    color: '#eef6f5',
    emissive: '#9fb7b5',
    emissiveIntensity: 0.25,
    roughness: 0.25,
    transparent: true,
    alphaMap: streak,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const falls = [];
  const tiers = [
    { x: W.x + 0.4, z: W.z + 0.4, top: 2.55, bottom: 1.15, w: 1.2 },
    { x: W.x + 0.6, z: W.z + 1.4, top: 1.3, bottom: -0.05, w: 1.6 },
  ];
  for (const t of tiers) {
    const h = t.top - t.bottom;
    const g = new THREE.PlaneGeometry(t.w, h, 4, 10);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / h + 0.5; // 0 bottom, 1 top
      // water bows outward off the lip
      p.setZ(i, Math.sin((1 - y) * Math.PI * 0.6) * 0.35 + (1 - y) * 0.2);
      p.setX(i, p.getX(i) * (1 + (1 - y) * 0.2));
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, fallMat);
    m.position.set(t.x, t.bottom + h / 2, t.z);
    m.rotation.y = 0.35;
    m.renderOrder = 2;
    falls.push(m);
    group.add(m);
  }
  // foam where it lands
  const foamMat = new THREE.MeshStandardMaterial({ color: '#f4f8f6', roughness: 0.5, transparent: true, opacity: 0.75, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(R(0.18, 0.4), 10, 6), foamMat);
    f.scale.y = 0.3;
    f.position.set(W.x + 0.8 + R(-0.9, 0.9), 0.02, W.z + 2.0 + R(-0.4, 0.5));
    group.add(f);
  }
  group.userData.falls = falls;
  group.userData.streak = streak;
  return group;
}

function waterStreakTexture() {
  const W = 128, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const r = makeRng(5);
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const w = 1 + r() * 4;
    const a = 0.25 + r() * 0.6;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(r() * 0.5 + 0.3, `rgba(255,255,255,${a * 0.8})`);
    grad.addColorStop(1, `rgba(255,255,255,${a * 0.3})`);
    g.fillStyle = grad;
    g.fillRect(x, 0, w, H);
  }
  // fade the side edges
  const edge = g.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, 'rgba(0,0,0,1)');
  edge.addColorStop(0.15, 'rgba(0,0,0,0)');
  edge.addColorStop(0.85, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------------- Boardwalk ---------------- */

function plankTexture() {
  const W = 256, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const r = makeRng(3);
  const plank = 32;
  for (let y = 0; y < H; y += plank) {
    const base = 0.85 + r() * 0.2;
    g.fillStyle = `rgb(${Math.round(196 * base)},${Math.round(142 * base)},${Math.round(98 * base)})`;
    g.fillRect(0, y, W, plank);
    g.fillStyle = 'rgba(70,40,20,0.55)';
    g.fillRect(0, y + plank - 3, W, 3);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function makeBoardwalk() {
  const curve = new THREE.CatmullRomCurve3(BOARDWALK);
  const N = 160;
  const width = 2.3;
  const deckY = 0.42;
  const pts = curve.getSpacedPoints(N);
  const len = curve.getLength();
  const deck = { pos: [], uv: [], idx: [] };
  const edgeL = [], edgeR = [];
  for (let i = 0; i <= N; i++) {
    const p = pts[i];
    const t = curve.getTangentAt(i / N);
    const side = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const y = Math.max(deckY, groundHeight(p.x, p.z) + 0.12);
    const a = p.clone().addScaledVector(side, -width / 2); a.y = y;
    const b = p.clone().addScaledVector(side, width / 2); b.y = y;
    deck.pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const v = (i / N) * len / 4.4;
    deck.uv.push(0, v, 1, v);
    edgeL.push(a); edgeR.push(b);
  }
  for (let i = 0; i < N; i++) {
    const k = i * 2;
    deck.idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(deck.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(deck.uv, 2));
  g.setIndex(deck.idx);
  g.computeVertexNormals();
  // make sure the deck faces up
  if (g.attributes.normal.getY(0) < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; }
    g.computeVertexNormals();
  }
  const tex = plankTexture();
  tex.repeat.set(1, 1);
  const deckMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  deckMesh.receiveShadow = true;
  deckMesh.castShadow = true;

  // Corten edge bands down to the water/ground
  const band = (edge) => {
    const pos = [], idx = [];
    edge.forEach((p) => pos.push(p.x, p.y + 0.02, p.z, p.x, p.y - 0.22, p.z));
    for (let i = 0; i < edge.length - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bg.setIndex(idx);
    bg.computeVertexNormals();
    return bg;
  };
  const bandMat = new THREE.MeshStandardMaterial({ color: '#5e3218', roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
  const group = new THREE.Group();
  group.add(deckMesh);
  for (const e of [edgeL, edgeR]) {
    const m = new THREE.Mesh(band(e), bandMat);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
  group.name = 'boardwalk';
  return group;
}
