import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { smoothstep } from './utils.js';

// One place for where everything sits, in metres.
// Camera looks towards -z. Left of frame is -x.
export const perlin = new ImprovedNoise();

export const POND = { cx: -2.0, cz: 1.6, rx: 10.5, rz: 8.2 };
export const SCULPTURE = new THREE.Vector3(1.8, 0, -9.2);
export const WATERFALL = new THREE.Vector3(-4.2, 0, -6.4);

export const CAMERA = {
  pos: new THREE.Vector3(-0.4, 1.45, 4.4),
  look: new THREE.Vector3(1.0, 3.1, -9.2),
  fov: 58,
};

// Boardwalk centreline, entering bottom right and curving away to the right
export const BOARDWALK = [
  new THREE.Vector3(2.6, 0, 9.0),
  new THREE.Vector3(3.0, 0, 4.0),
  new THREE.Vector3(4.2, 0, -0.4),
  new THREE.Vector3(6.4, 0, -4.2),
  new THREE.Vector3(10.2, 0, -7.8),
  new THREE.Vector3(15.5, 0, -10.6),
];

// Signed distance to the pond edge, roughly in metres (negative = in water)
export function pondSDF(x, z) {
  const dx = (x - POND.cx) / POND.rx;
  const dz = (z - POND.cz) / POND.rz;
  const a = Math.atan2(dz, dx);
  const wob = 1 + 0.07 * Math.sin(3 * a + 0.7) + 0.045 * Math.sin(5 * a + 2.1) + 0.03 * Math.sin(8 * a);
  return (Math.hypot(dx, dz) - wob) * Math.min(POND.rx, POND.rz);
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

// Gravel path from the sculpture plaza off to the left, behind the pond
const PATH = [
  [SCULPTURE.x, SCULPTURE.z],
  [-3.5, -11.5],
  [-10, -11.0],
  [-18, -14],
];
export function pathDist(x, z) {
  let d = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) {
    d = Math.min(d, distToSegment(x, z, PATH[i][0], PATH[i][1], PATH[i + 1][0], PATH[i + 1][1]));
  }
  return d;
}

export function plazaDist(x, z) {
  return Math.hypot(x - SCULPTURE.x, (z - SCULPTURE.z) * 1.1);
}

export const WATER_Y = 0;

export function groundHeight(x, z) {
  const d = pondSDF(x, z);
  let h = 0.32 + perlin.noise(x * 0.09, 1.3, z * 0.09) * 0.22;

  // land rises gently away into the forest
  const back = smoothstep(-9, -45, z);
  h += back * 3.2 + perlin.noise(x * 0.035, 5.1, z * 0.035) * 2.2 * back;

  // rocky bank on the left for the waterfall
  const wf = Math.hypot(x - WATERFALL.x, z - WATERFALL.z);
  h += (1 - smoothstep(2, 9, wf)) * 1.4 * smoothstep(-0.5, 3, d);

  // flatten the plaza and path
  const flat = Math.max(1 - smoothstep(3.2, 4.6, plazaDist(x, z)), 1 - smoothstep(0.9, 1.8, pathDist(x, z)));
  h = h * (1 - flat) + 0.38 * flat;

  // carve the pond
  if (d < 0.4) {
    const t = smoothstep(0.4, -2.2, d);
    h = h * (1 - t) + -1.3 * t;
  }
  return h;
}
