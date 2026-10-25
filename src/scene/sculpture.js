import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cylinderBetween } from './utils.js';

// Stand-in for the real piece: paired leaf-shaped Corten panels, folded along a
// centre rib, set on the 30 edges of an icosahedron with a pinwheel twist.
// Every petal is its own mesh so it can breathe, fold or come apart later.

const PANEL_W = 0.56; // max half-leaf width (m)

function halfWidth(u) {
  // pointed at both ends, fuller towards the base
  return PANEL_W * Math.pow(Math.sin(Math.PI * u), 0.55) * (0.8 + 0.28 * Math.sin(Math.PI * u * 0.9));
}

// Slot perforations, drawn in the panel's own (u along rib, v away from rib) space
function makeSlotTexture() {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#000';
  // rows of dashes running diagonally out from the rib towards the tip, like veins
  const ang = 0.55;
  const rowGap = 34, dash = 40, gap = 20, wid = 10;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let row = -60; row < 60; row++) {
    const ox = row * rowGap / dy;
    const phase = (row * 13) % (dash + gap);
    for (let s = -phase; s < 1400; s += dash + gap) {
      const x = ox + dx * (s + dash / 2), y = dy * (s + dash / 2);
      const u = x / W, v = y / H;
      if (u < 0.05 || u > 0.95) continue;
      const edge = halfWidth(u) / PANEL_W;
      if (v < 0.06 || v > edge - 0.08) continue;
      const l = dash * (0.55 + 0.45 * Math.sin(u * Math.PI));
      g.save();
      g.translate(x, H - y);
      g.rotate(-ang);
      g.beginPath();
      g.roundRect(-l / 2, -wid / 2, l, wid, wid / 2);
      g.fill();
      g.restore();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  return tex;
}

// One half-leaf panel. Origin on the rib, rib along +x, panel spans +y.
function panelGeometry(L, segU = 28, segS = 6) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segU; i++) {
    const u = i / segU;
    const hw = halfWidth(u);
    for (let j = 0; j <= segS; j++) {
      const s = j / segS;
      const y = s * hw;
      // a little cupping across the panel
      const z = -Math.pow(s, 2) * hw * 0.22;
      pos.push((u - 0.5) * L, y, z);
      uv.push(u, y / PANEL_W);
    }
  }
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segS; j++) {
      const a = i * (segS + 1) + j, b = a + segS + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  // bow the rib so the leaf curves around the ball
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (L / 2);
    p.setZ(i, p.getZ(i) - 0.22 * x * x);
  }
  geo.computeVertexNormals();
  return geo;
}

function icosahedron(R) {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((a) => new THREE.Vector3(...a).normalize().multiplyScalar(R));
  const edges = [];
  const el = v[0].distanceTo(v[1]);
  for (let i = 0; i < v.length; i++)
    for (let j = i + 1; j < v.length; j++)
      if (Math.abs(v[i].distanceTo(v[j]) - el) < 1e-3) edges.push([i, j]);
  return { v, edges, el };
}

export function makeSculpture() {
  const root = new THREE.Group();
  root.name = 'sculpture';

  const R = 2.05; // icosahedron radius for the petal ring
  const centreY = 5.05;
  const ball = new THREE.Group();
  ball.position.y = centreY;
  // tilt so no edge sits dead square to the camera
  ball.rotation.set(0.32, 0.5, 0.12);
  root.add(ball);

  const slots = makeSlotTexture();
  const corten = new THREE.MeshStandardMaterial({
    color: '#8e4a21',
    roughness: 0.78,
    metalness: 0.25,
    alphaMap: slots,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    envMapIntensity: 0.9,
  });
  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    alphaMap: slots,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });

  const { v, edges, el } = icosahedron(R);
  const L = el * 1.08;
  const wingAngle = THREE.MathUtils.degToRad(36); // wings sweep back towards the core
  const twist = THREE.MathUtils.degToRad(14);
  const panel = panelGeometry(L);

  const petals = [];
  for (const [a, b] of edges) {
    const mid = new THREE.Vector3().addVectors(v[a], v[b]).multiplyScalar(0.5);
    const n = mid.clone().normalize();
    const t = new THREE.Vector3().subVectors(v[b], v[a]).normalize();
    t.applyAxisAngle(n, twist);
    const bi = new THREE.Vector3().crossVectors(n, t).normalize();

    const petal = new THREE.Group();
    // petal frame: x = rib, z = outward normal
    const m = new THREE.Matrix4().makeBasis(t, bi, n);
    petal.quaternion.setFromRotationMatrix(m);
    petal.position.copy(mid);

    for (const side of [1, -1]) {
      const wing = new THREE.Mesh(panel, corten);
      wing.customDepthMaterial = depth;
      wing.castShadow = true;
      wing.receiveShadow = true;
      // rotate the panel about the rib: side=1 spans +y, side=-1 spans -y
      wing.rotation.x = side === 1 ? wingAngle : Math.PI - wingAngle;
      petal.add(wing);
      petal.userData.wings = (petal.userData.wings || []).concat(wing);
    }
    petal.userData.home = { position: petal.position.clone(), quaternion: petal.quaternion.clone(), normal: n };
    ball.add(petal);
    petals.push(petal);
  }

  // Inner frame: pale green tube icosahedron and struts out to each petal
  const frameMat = new THREE.MeshStandardMaterial({ color: '#8c9b88', roughness: 0.6, metalness: 0.15 });
  const inner = icosahedron(R * 0.42);
  const frameParts = inner.edges.map(([a, b]) => cylinderBetween(inner.v[a], inner.v[b], 0.035, 0.035, 8));
  for (const pet of petals) {
    const out = pet.userData.home.position.clone().multiplyScalar(0.8);
    const inn = pet.userData.home.normal.clone().multiplyScalar(R * 0.42 * 0.9);
    frameParts.push(cylinderBetween(inn, out, 0.022, 0.022, 6));
  }
  const frame = new THREE.Mesh(mergeGeometries(frameParts), frameMat);
  frame.castShadow = true;
  ball.add(frame);

  // Four poles of different heights, with arms in to the core
  const poleMat = new THREE.MeshStandardMaterial({ color: '#d9e2d4', roughness: 0.45, metalness: 0.2 });
  const poleMat2 = new THREE.MeshStandardMaterial({ color: '#a9bfa0', roughness: 0.5, metalness: 0.15 });
  const poles = [
    { x: -1.55, z: 1.15, h: 8.1, lean: 0.03, mat: poleMat },
    { x: 1.6, z: 1.3, h: 7.0, lean: -0.02, mat: poleMat2 },
    { x: 1.45, z: -1.5, h: 8.9, lean: 0.0, mat: poleMat },
    { x: -1.5, z: -1.35, h: 7.6, lean: 0.04, mat: poleMat2 },
  ];
  const poleGroup = new THREE.Group();
  for (const p of poles) {
    const base = new THREE.Vector3(p.x, 0, p.z);
    const top = new THREE.Vector3(p.x + p.lean * p.h, p.h, p.z);
    const m = new THREE.Mesh(cylinderBetween(base, top, 0.12, 0.1, 14), p.mat);
    m.castShadow = true; m.receiveShadow = true;
    poleGroup.add(m);
    for (const dy of [-0.9, 0.7]) {
      const y = centreY + dy;
      const at = base.clone().lerp(top, y / p.h);
      const toward = new THREE.Vector3(0, y, 0).sub(at).multiplyScalar(0.62).add(at);
      const arm = new THREE.Mesh(cylinderBetween(at, toward, 0.05, 0.05, 8), frameMat);
      arm.castShadow = true;
      poleGroup.add(arm);
    }
    // small footing plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 16), new THREE.MeshStandardMaterial({ color: '#8d8a80', roughness: 0.8 }));
    plate.position.set(p.x, 0.03, p.z);
    plate.receiveShadow = true;
    poleGroup.add(plate);
  }
  root.add(poleGroup);

  root.userData = { ball, petals, frame, poles: poleGroup, centreY };
  return root;
}
