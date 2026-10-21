// Prévia dos bonecos feitos por código, no campo do Bairro, com a mesma luz do jogo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world.js';
import { loadGunModels } from './gunmodels.js';
import { Soldier } from './soldier3d.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.62;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.03, 400);
const { setMap } = buildWorld(renderer, scene);
setMap('bairro');
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

await loadGunModels().catch(() => {});

// fila de bonecos no campo, olhando para a câmera
const BASE = new THREE.Vector3(-1, 0, -40);
const cast = [
  { team: 'T', w: 'ak47', kind: 'mira' },
  { team: 'CT', w: 'm4a4', kind: 'mira' },
  { team: 'T', w: 'ak47', kind: 'anda', speed: 6.0 },
  { team: 'CT', w: 'm4a4', kind: 'anda', speed: 7.2 },
  { team: 'T', w: 'ak47', kind: 'recarga' },
  { team: 'CT', w: 'usp', kind: 'mira' },
  { team: 'T', w: 'ak47', kind: 'anda', speed: 2.2, crouch: 1 },
  { team: 'CT', w: 'm4a4', kind: 'morte' },
  { team: 'T', w: 'ak47', kind: 'morte' },
];
const people = cast.map((c, i) => {
  const s = new Soldier(c.team, c.w);
  s.root.position.set(BASE.x + (i - 4) * 1.35, 0, BASE.z + (c.kind === 'morte' ? -0.8 : 0));
  s.root.rotation.y = Math.PI;
  scene.add(s.root);
  return { ...c, s, t: i * 0.7 };
});

const views = {
  'Grupo': [[BASE.x + 0.5, 1.7, BASE.z + 7.5], [BASE.x, 0.95, BASE.z]],
  'Rosto TR': [[people[0].s.root.position.x + 0.25, 1.72, BASE.z + 0.75], [people[0].s.root.position.x, 1.62, BASE.z]],
  'Rosto CT': [[people[1].s.root.position.x - 0.2, 1.72, BASE.z + 0.75], [people[1].s.root.position.x, 1.62, BASE.z]],
  'Corpo TR': [[people[0].s.root.position.x + 1.2, 1.3, BASE.z + 2.2], [people[0].s.root.position.x, 0.95, BASE.z]],
  'Corpo CT': [[people[1].s.root.position.x - 1.2, 1.3, BASE.z + 2.2], [people[1].s.root.position.x, 0.95, BASE.z]],
  'Andando': [[people[2].s.root.position.x + 4.5, 1.3, BASE.z - 1.5], [people[2].s.root.position.x + 0.7, 0.8, BASE.z - 1.5]],
  'Correndo': [[people[3].s.root.position.x + 4.5, 1.3, BASE.z - 1.5], [people[3].s.root.position.x, 0.8, BASE.z - 1.5]],
  'Agachado': [[people[6].s.root.position.x + 4, 1.1, BASE.z - 1.5], [people[6].s.root.position.x, 0.6, BASE.z - 1.5]],
  'Recarga': [[people[4].s.root.position.x + 0.9, 1.5, BASE.z + 1.4], [people[4].s.root.position.x, 1.2, BASE.z]],
  'Morte': [[people[7].s.root.position.x + 0.5, 2.4, BASE.z + 2.5], [people[7].s.root.position.x + 0.6, 0.3, BASE.z - 1.2]],
};
const bar = document.getElementById('bar');
function setView(name) {
  const [p, t] = views[name];
  camera.position.set(...p); controls.target.set(...t); controls.update();
  for (const b of bar.children) b.classList.toggle('sel', b.textContent === name);
}
for (const name of Object.keys(views)) {
  const b = document.createElement('button'); b.textContent = name; b.onclick = () => setView(name); bar.appendChild(b);
}
setView(new URLSearchParams(location.search).get('v') || 'Grupo');

const clock = new THREE.Clock();
let timeScale = 1;   // 0 = pausa (para tirar foto de um instante do passo)
let frames = 0, fpsT = 0;
const info = document.getElementById('info');
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta()) * timeScale;
  for (const p of people) {
    p.t += dt;
    if (p.kind === 'mira') p.s.update(dt, { pitch: Math.sin(p.t * 0.5) * 0.08 });
    else if (p.kind === 'agacha') p.s.update(dt, { crouch: 1, pitch: -0.05 });
    else if (p.kind === 'anda') {
      // anda em linha reta na direção da câmera e volta ao começo (velocidade real do jogo)
      const len = 9, d = (p.t * p.speed) % (len + 3);
      p.s.root.position.z = BASE.z - 6 + Math.min(d, len);
      const moving = d < len;
      p.s.update(dt, { speed: moving ? p.speed : 0, vel: [0, moving ? -p.speed : 0], crouch: p.crouch || 0, pitch: 0 });
    } else if (p.kind === 'recarga') {
      const c = p.t % 3.5;
      p.s.update(dt, { reload: c < 2.2 });
    } else if (p.kind === 'morte') {
      const c = p.t % 5;
      p.s.update(dt, { dead: c > 1.5 });
    }
  }
  controls.update();
  renderer.render(scene, camera);
  frames++; fpsT += dt;
  if (fpsT > 1) { info.textContent = `${Math.round(frames / fpsT)} FPS · ${renderer.info.render.calls} desenhos`; frames = 0; fpsT = 0; }
});
window.__prev = { people, setView, camera, controls, setTime: (k) => { timeScale = k; } };
