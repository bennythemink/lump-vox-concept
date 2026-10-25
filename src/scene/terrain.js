import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { groundHeight, pondSDF, pathDist, plazaDist, perlin, POND, WATER_Y } from './layout.js';
import { smoothstep } from './utils.js';

const C = {
  lawn: new THREE.Color('#8e9a4c'),
  lawnDeep: new THREE.Color('#6b7a3a'),
  lawnSun: new THREE.Color('#a9a957'),
  mulch: new THREE.Color('#4a3a2e'),
  gravel: new THREE.Color('#cdbb9c'),
  mud: new THREE.Color('#4d4a36'),
  bed: new THREE.Color('#33402f'),
};

export function makeTerrain() {
  const size = 150;
  const seg = 300;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -size / 2 + 25);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, groundHeight(x, z));

    const n1 = perlin.noise(x * 0.12, 7.7, z * 0.12);
    const n2 = perlin.noise(x * 0.5, 2.2, z * 0.5);
    c.copy(C.lawn).lerp(C.lawnDeep, smoothstep(-0.3, 0.4, n1)).lerp(C.lawnSun, smoothstep(0.2, 0.6, -n1) * 0.5);

    // planted beds of dark mulch, mostly around the pond and paths
    const d = pondSDF(x, z);
    const bedMask = smoothstep(0.05, 0.25, n1 + 0.35 - Math.min(1, Math.max(0, d) / 6) * 0.6);
    c.lerp(C.mulch, bedMask * 0.85);

    // gravel path and plaza
    const g = Math.max(1 - smoothstep(3.0, 3.6, plazaDist(x, z)), 1 - smoothstep(0.85, 1.25, pathDist(x, z)));
    c.lerp(C.gravel, g);

    // muddy bank and dark pond bed
    c.lerp(C.mud, (1 - smoothstep(-0.1, 0.35, d)) * 0.85);
    c.lerp(C.bed, 1 - smoothstep(-1.4, -0.2, d));
    c.multiplyScalar(1 + n2 * 0.12);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

export function makeWater(renderer) {
  const shape = new THREE.Shape();
  const steps = 128;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    // march outward until we're just past the bank
    let r = 0.5;
    while (r < 1.6) {
      const x = POND.cx + Math.cos(a) * POND.rx * r;
      const z = POND.cz + Math.sin(a) * POND.rz * r;
      if (pondSDF(x, z) > 0.6) break;
      r += 0.01;
    }
    const x = POND.cx + Math.cos(a) * POND.rx * r;
    const z = POND.cz + Math.sin(a) * POND.rz * r;
    if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
  }
  // Reflector expects its plane in local XY with +Z as the normal, so rotate the mesh, not the geometry
  const geo = new THREE.ShapeGeometry(shape, 4);

  const dpr = Math.min(window.devicePixelRatio, 2);
  const mirror = new Reflector(geo, {
    clipBias: 0.003,
    textureWidth: Math.round(window.innerWidth * dpr * 0.6),
    textureHeight: Math.round(window.innerHeight * dpr * 0.6),
    color: 0x9db0a9,
    multisample: 4,
  });
  mirror.position.y = WATER_Y;
  mirror.rotation.x = -Math.PI / 2;
  mirror.name = 'water';

  // A thin tinted layer on top gives the water body and depth
  const tint = new THREE.Mesh(
    geo.clone(),
    new THREE.MeshStandardMaterial({
      color: '#2f4a44',
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    })
  );
  tint.position.y = WATER_Y + 0.005;
  tint.rotation.x = -Math.PI / 2;
  tint.receiveShadow = true;

  const g = new THREE.Group();
  g.add(mirror, tint);
  g.userData.mirror = mirror;
  return g;
}
