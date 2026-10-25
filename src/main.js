import '@fontsource-variable/fraunces';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import './style.css';

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';

import { CAMERA, SCULPTURE, groundHeight } from './scene/layout.js';
import { makeTerrain, makeWater } from './scene/terrain.js';
import { makeSculpture } from './scene/sculpture.js';
import { makeFamily } from './scene/people.js';
import { makeVegetation } from './scene/vegetation.js';
import { makeRocksAndWaterfall, makeBoardwalk } from './scene/features.js';
import { GradeShader } from './scene/grade.js';
import { startSubtitle } from './hero.js';

const params = new URLSearchParams(location.search);
const vec = (s) => (s ? new THREE.Vector3(...s.split(',').map(Number)) : null);

/* ---------------- Renderer ---------------- */

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const dpr = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#cbd5cf', 40, 150);

const camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 6000);
const look = vec(params.get('look')) || CAMERA.look;

// Frame the shot for any screen: portrait screens step back and widen so the
// sculpture, waterfall and family all stay in view
function frameCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  const portrait = THREE.MathUtils.clamp((1.3 - aspect) / 0.8, 0, 1); // 0 on landscape, 1 on phones
  camera.fov = Number(params.get('fov')) || THREE.MathUtils.lerp(CAMERA.fov, 76, portrait);
  const pos = vec(params.get('cam')) || CAMERA.pos.clone();
  if (!params.get('cam')) {
    const back = pos.clone().sub(look).setY(0).normalize();
    pos.addScaledVector(back, 2.5 * portrait);
    pos.y += 0.5 * portrait;
  }
  camera.position.copy(pos);
  camera.lookAt(look);
  camera.updateProjectionMatrix();
}
frameCamera();

/* ---------------- Golden-hour sky and light ---------------- */

const sunDir = new THREE.Vector3(-0.84, 0.26, 0.42).normalize();
const sky = new Sky();
sky.scale.setScalar(4500);
const su = sky.material.uniforms;
su.turbidity.value = 3.2;
su.rayleigh.value = 1.1;
su.mieCoefficient.value = 0.004;
su.mieDirectionalG.value = 0.8;
su.sunPosition.value.copy(sunDir);
scene.add(sky);

// image-based light from the same sky so metals and clay pick up its colour
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envSky = new Sky();
envSky.scale.setScalar(4500);
Object.assign(envSky.material.uniforms.sunPosition.value, sunDir);
for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) envSky.material.uniforms[k].value = su[k].value;
envScene.add(envSky);
scene.environment = pmrem.fromScene(envScene, 0, 0.1, 10000).texture;
scene.environmentIntensity = 0.55;

const sun = new THREE.DirectionalLight('#ffc58a', 4.2);
sun.position.copy(sunDir).multiplyScalar(70).add(new THREE.Vector3(0, 0, -6));
sun.target.position.set(0, 0, -6);
sun.castShadow = true;
const small = window.innerWidth < 720;
sun.shadow.mapSize.set(small ? 2048 : 4096, small ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 180 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight('#b9d0e6', '#4f4a33', 0.5));

/* ---------------- Scene ---------------- */

scene.add(makeTerrain());
const water = makeWater(renderer);
scene.add(water);

const sculpture = makeSculpture();
sculpture.position.set(SCULPTURE.x, groundHeight(SCULPTURE.x, SCULPTURE.z), SCULPTURE.z);
scene.add(sculpture);

const family = makeFamily(new THREE.Vector3(SCULPTURE.x, 0, SCULPTURE.z));
for (const f of family.children) f.position.y = groundHeight(f.position.x, f.position.z);
scene.add(family);

scene.add(makeVegetation(renderer));
const features = makeRocksAndWaterfall();
scene.add(features);
scene.add(makeBoardwalk());

/* ---------------- Post-processing: tilt-shift diorama look ---------------- */

const size = new THREE.Vector2(window.innerWidth * dpr, window.innerHeight * dpr);
const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target);
composer.setPixelRatio(dpr);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

const tilt = params.get('notilt') ? 0 : 1;
const blurAmt = 3.2 * tilt;
// focus band sits between the family and the sculpture, wherever that lands on screen
const focusPoint = new THREE.Vector3(SCULPTURE.x + 1, 3.0, SCULPTURE.z + 1);
const hts = new ShaderPass(HorizontalTiltShiftShader);
const vts = new ShaderPass(VerticalTiltShiftShader);
const hts2 = new ShaderPass(HorizontalTiltShiftShader);
const vts2 = new ShaderPass(VerticalTiltShiftShader);
function setTilt() {
  hts.uniforms.h.value = hts2.uniforms.h.value = blurAmt / (Math.max(window.innerWidth, 1200) * dpr);
  vts.uniforms.v.value = vts2.uniforms.v.value = blurAmt / (Math.max(window.innerHeight, 800) * dpr);
  const focus = focusPoint.clone().project(camera).y * 0.5 + 0.5;
  for (const p of [hts, vts, hts2, vts2]) p.uniforms.r.value = focus;
}
setTilt();
composer.addPass(hts);
composer.addPass(vts);
composer.addPass(hts2);
composer.addPass(vts2);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.6, 0.92));
composer.addPass(new OutputPass());
const grade = new ShaderPass(GradeShader);
composer.addPass(grade);

/* ---------------- Loop ---------------- */

const clock = new THREE.Clock();
let frames = 0;
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  grade.uniforms.uTime.value = t;
  composer.render();
  if (++frames === 3) {
    window.__ready = true;
    document.documentElement.classList.add('is-ready');
    if (params.has('still')) renderer.setAnimationLoop(null); // for screenshots
  }
});

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  frameCamera();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  setTilt();
});

startSubtitle(document.querySelector('[data-rotate]'));

// handy for tweaking from the console
window.__scene = { scene, camera, sculpture, family, sun, renderer };
