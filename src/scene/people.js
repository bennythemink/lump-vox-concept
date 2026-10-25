import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { capsuleBetween } from './utils.js';

// Faceless, jointed mannequin figures. Built facing +z, joints in metres.
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function figure({ height, tone, pointing = false, armOut = 0, stance = 0 }) {
  const s = height / 1.75;
  const J = {
    head: V(0, 1.63, 0.01),
    neck: V(0, 1.5, 0),
    chest: V(0, 1.33, 0),
    pelvis: V(0, 0.97, 0),
    shL: V(0.19, 1.42, 0), shR: V(-0.19, 1.42, 0),
    hipL: V(0.1, 0.93, 0), hipR: V(-0.1, 0.93, 0),
    elL: V(0.23 + armOut, 1.15, -0.02), elR: V(-0.23, 1.15, -0.02),
    haL: V(0.25 + armOut * 1.6, 0.89, 0.04), haR: V(-0.25, 0.89, 0.04),
    knL: V(0.1 + stance, 0.5, 0.03), knR: V(-0.1 - stance, 0.5, 0.0),
    anL: V(0.1 + stance * 1.6, 0.08, 0), anR: V(-0.1 - stance * 1.6, 0.08, -0.02),
  };
  if (pointing) {
    J.elR = V(-0.27, 1.52, 0.2);
    J.haR = V(-0.31, 1.76, 0.44);
  }
  for (const k in J) J[k].multiplyScalar(s);

  const r = 0.048 * s;
  const parts = [
    // torso: chest and hips as soft capsules
    capsuleBetween(J.pelvis, J.chest, 0.135 * s, 6, 14),
    capsuleBetween(J.neck, J.neck.clone().add(V(0, 0.05 * s, 0)), 0.045 * s),
    // limbs
    capsuleBetween(J.shL, J.elL, r), capsuleBetween(J.elL, J.haL, r * 0.9),
    capsuleBetween(J.shR, J.elR, r), capsuleBetween(J.elR, J.haR, r * 0.9),
    capsuleBetween(J.hipL, J.knL, r * 1.25), capsuleBetween(J.knL, J.anL, r * 1.05),
    capsuleBetween(J.hipR, J.knR, r * 1.25), capsuleBetween(J.knR, J.anR, r * 1.05),
    // shoulder bar
    capsuleBetween(J.shL, J.shR, 0.06 * s),
  ];
  // feet
  for (const an of [J.anL, J.anR]) parts.push(capsuleBetween(an.clone().add(V(0, -0.03 * s, -0.03 * s)), an.clone().add(V(0, -0.04 * s, 0.13 * s)), 0.038 * s));
  // head: slightly egg-shaped
  const head = new THREE.SphereGeometry(0.105 * s, 20, 16);
  head.scale(0.88, 1.1, 0.95);
  head.translate(J.head.x, J.head.y, J.head.z);
  parts.push(head);

  const body = mergeGeometries(parts.map((g) => { g.deleteAttribute('uv'); return g; }));
  const mat = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.62, metalness: 0 });
  const mesh = new THREE.Mesh(body, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // darker ball joints sell the mannequin look
  const jointMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tone).multiplyScalar(0.8), roughness: 0.55 });
  const jg = [J.elL, J.elR, J.knL, J.knR, J.shL, J.shR, J.hipL, J.hipR].map((p) => {
    const g = new THREE.SphereGeometry(r * 1.25, 10, 8);
    g.translate(p.x, p.y, p.z);
    g.deleteAttribute('uv');
    return g;
  });
  const joints = new THREE.Mesh(mergeGeometries(jg), jointMat);
  joints.castShadow = true;

  const g = new THREE.Group();
  g.add(mesh, joints);
  return g;
}

export function makeFamily(lookAt) {
  const family = new THREE.Group();
  family.name = 'family';
  const people = [
    { height: 1.86, tone: '#e6dccb', at: V(5.3, 0, -8.0), stance: 0.03 },
    { height: 1.12, tone: '#f2e9dc', at: V(4.55, 0, -7.2), pointing: true },
    { height: 1.7, tone: '#ece2d3', at: V(3.85, 0, -6.75), armOut: 0.0, stance: 0.02 },
  ];
  for (const p of people) {
    const f = figure(p);
    f.position.copy(p.at);
    const dir = new THREE.Vector3(lookAt.x - p.at.x, 0, lookAt.z - p.at.z);
    f.rotation.y = Math.atan2(dir.x, dir.z) + (p.pointing ? 0.1 : -0.15);
    family.add(f);
  }
  return family;
}
