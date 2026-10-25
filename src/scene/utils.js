import * as THREE from 'three';

// Seeded random so the scene is identical on every load
export function makeRng(seed = 1) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// Paint a single colour into a geometry's vertex colours
export function paint(geo, color, jitter = 0, rng = Math.random) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const k = 1 + (rng() - 0.5) * jitter;
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r * k;
    arr[i * 3 + 1] = c.g * k;
    arr[i * 3 + 2] = c.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// Keep only the attributes we merge on, so mergeGeometries never complains
export function normalise(geo) {
  const g = geo.index ? geo : geo;
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
  }
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  return g.index ? g : g;
}

// A cylinder (or capsule) running between two points
const _up = new THREE.Vector3(0, 1, 0);
export function cylinderBetween(a, b, r0, r1 = r0, radial = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r1, r0, len, radial, 1, false);
  geo.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(_up, dir.normalize());
  geo.applyQuaternion(q);
  geo.translate(a.x, a.y, a.z);
  return geo;
}

export function capsuleBetween(a, b, r, cap = 4, radial = 10) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CapsuleGeometry(r, Math.max(0.001, len), cap, radial);
  geo.translate(0, len / 2, 0);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, dir.normalize()));
  geo.translate(a.x, a.y, a.z);
  return geo;
}

// Gently lumpy blob, used for canopies, bushes and rocks
export function blob(radius, detail, noise, amp, seed, freq = 1.3) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const merged = mergeVerticesSimple(geo);
  const p = merged.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise.noise(v.x * freq + seed, v.y * freq + seed * 0.7, v.z * freq - seed);
    v.multiplyScalar(1 + n * amp);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  merged.computeVertexNormals();
  return merged;
}

// Weld duplicated vertices so displacement doesn't tear the surface
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
function mergeVerticesSimple(geo) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const m = mergeVertices(geo, 1e-4);
  m.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(m.attributes.position.count * 2), 2));
  return m;
}
