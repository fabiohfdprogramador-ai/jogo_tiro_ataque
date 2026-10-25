// View-model em primeira pessoa: armas + mãos com luvas e mangas + animações.
// Coordenadas da arma em metros: +x = frente (cano), +y = cima, +z = lado direito.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeGunFromModel, buildAWPPro } from './gunmodels.js';
import { armsReady, makeArm, poseArm, ARM_POSES, dressArm, gloveArm } from './arms.js';
import { buildRPG, buildBow, buildGrenade } from './heavy.js';

// ---------- texturas ----------
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(g, s, r, n, colors, a, maxW = 3) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = a * r(); g.fillStyle = colors[(r() * colors.length) | 0];
    const w = 0.5 + r() * maxW; g.fillRect(r() * s, r() * s, w, w * (0.5 + r()));
  }
  g.globalAlpha = 1;
}

const woodMap = canvasTex(1024, (g, s) => {
  const r = rand(77);
  g.fillStyle = '#7a3518'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {             // veios da madeira
    const y = r() * s, amp = 4 + r() * 18, ph = r() * 6;
    g.strokeStyle = ['rgba(40,12,3,.35)', 'rgba(150,70,30,.25)', 'rgba(25,8,2,.25)'][(r() * 3) | 0];
    g.lineWidth = 0.6 + r() * 2.4; g.beginPath();
    for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x / 140 + ph) * amp + Math.sin(x / 37 + ph) * amp * .2);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {              // manchas de verniz gasto
    const x = r() * s, y = r() * s, rad = 20 + r() * 80;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < .5 ? 'rgba(180,90,40,.18)' : 'rgba(20,6,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  speckle(g, s, r, 20000, ['#2a0d02', '#b0683a'], .25, 2);
});
woodMap.repeat.set(5, 5);

const metalRough = canvasTex(512, (g, s) => {
  const r = rand(9);
  g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 400; i++) { g.strokeStyle = `rgba(${r() < .5 ? 30 : 200},${r() < .5 ? 30 : 200},${r() < .5 ? 30 : 200},.08)`; g.lineWidth = 1; g.beginPath(); const y = r() * s; g.moveTo(0, y); g.lineTo(s, y + (r() - .5) * 6); g.stroke(); }
  speckle(g, s, r, 30000, ['#222', '#bbb', '#444'], .35, 2);
}, false);
metalRough.repeat.set(6, 6);

const metalMap = canvasTex(512, (g, s) => {
  const r = rand(19);
  g.fillStyle = '#26272a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) {              // desgaste do oxidado
    const x = r() * s, y = r() * s, rad = 10 + r() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < .6 ? 'rgba(80,80,85,.35)' : 'rgba(10,10,10,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  speckle(g, s, r, 25000, ['#111', '#4a4b50', '#5c5d60'], .4, 1.5);
});
metalMap.repeat.set(6, 6);

const fabricMap = canvasTex(512, (g, s) => {
  const r = rand(31);
  g.fillStyle = '#2c2d2a'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 3) { g.fillStyle = y % 6 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.05)'; g.fillRect(0, y, s, 1); }
  for (let x = 0; x < s; x += 3) { g.fillStyle = x % 6 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.04)'; g.fillRect(x, 0, 1, s); }
  speckle(g, s, r, 15000, ['#151614', '#45463f'], .4, 1.5);
});
fabricMap.repeat.set(10, 10);

const camoTex = (seed, pal) => canvasTex(1024, (g, s) => {
  const r = rand(seed);
  g.fillStyle = pal[0]; g.fillRect(0, 0, s, s);
  const blob = (col, n, size) => {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const cx = r() * s, cy = r() * s; g.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.35) { const rr = size * (0.5 + r() * 0.6); g.lineTo(cx + Math.cos(a) * rr * 1.6, cy + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
  };
  blob(pal[1], 40, 60); blob(pal[2], 35, 45); blob(pal[3], 25, 38); blob(pal[4], 18, 22);
  for (let y = 0; y < s; y += 2) { g.fillStyle = y % 4 ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.04)'; g.fillRect(0, y, s, 1); }
  speckle(g, s, r, 40000, ['#2b2418', '#c4b08a'], .25, 1.5);
});
const camoT = camoTex(53, ['#8c7b5a', '#a8956c', '#6b5a3d', '#5a5e3e', '#3f3527']); camoT.repeat.set(2, 2);
const camoCT = camoTex(71, ['#5f6b78', '#7d8996', '#45505c', '#38414b', '#262d35']); camoCT.repeat.set(2, 2);

// ---------- materiais ----------
const M = {
  metal: new THREE.MeshPhysicalMaterial({ map: metalMap, roughnessMap: metalRough, color: 0xffffff, metalness: 0.8, roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.45 }),
  metalDark: new THREE.MeshPhysicalMaterial({ map: metalMap, roughnessMap: metalRough, color: 0x9a9a9a, metalness: 0.75, roughness: 0.6, envMapIntensity: 0.45 }),
  wood: new THREE.MeshPhysicalMaterial({ map: woodMap, color: 0xd88a52, bumpMap: woodMap, bumpScale: 0.6, roughness: 0.55, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.5 }),
  bakelite: new THREE.MeshPhysicalMaterial({ color: 0x2a140c, roughness: 0.5, clearcoat: 0.15, envMapIntensity: 0.4, bumpMap: metalRough, bumpScale: 0.3 }),
  glove: new THREE.MeshStandardMaterial({ map: fabricMap, bumpMap: fabricMap, bumpScale: 1.2, roughness: 0.92 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x1a1a19, roughness: 0.55, bumpMap: metalRough, bumpScale: 0.5 }),
  sleeveT: new THREE.MeshStandardMaterial({ map: camoT, bumpMap: camoT, bumpScale: 1.5, roughness: 0.95 }),
  sleeveCT: new THREE.MeshStandardMaterial({ map: camoCT, bumpMap: camoCT, bumpScale: 1.5, roughness: 0.95 }),
  anod: new THREE.MeshPhysicalMaterial({ map: metalMap, roughnessMap: metalRough, color: 0xb0b0b0, metalness: 0.6, roughness: 0.5, envMapIntensity: 0.5 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.75, bumpMap: metalRough, bumpScale: 0.4, envMapIntensity: 0.4 }),
  green: new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 0.7, bumpMap: metalRough, bumpScale: 0.5, envMapIntensity: 0.4 }),
  silver: new THREE.MeshPhysicalMaterial({ color: 0x8e9195, roughnessMap: metalRough, metalness: 0.95, roughness: 0.42, envMapIntensity: 0.55 }),
  blade: new THREE.MeshPhysicalMaterial({ color: 0xa9abae, metalness: 1, roughness: 0.28, envMapIntensity: 0.6, clearcoat: 0.2 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.85, bumpMap: fabricMap, bumpScale: 0.8 }),
  lens: new THREE.MeshPhysicalMaterial({ color: 0x0a1a30, metalness: 0.2, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.5 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xb07e60, roughness: 0.6 }),
};

// ---------- utilitários de geometria ----------
function roundedShape(pts, rad = 0.006) {
  const sh = new THREE.Shape(), n = pts.length;
  const P = pts.map(p => new THREE.Vector2(...p));
  for (let i = 0; i < n; i++) {
    const prev = P[(i - 1 + n) % n], cur = P[i], next = P[(i + 1) % n];
    const r = Math.min(rad, cur.distanceTo(prev) / 2, cur.distanceTo(next) / 2);
    const a = cur.clone().add(prev.clone().sub(cur).normalize().multiplyScalar(r));
    const b = cur.clone().add(next.clone().sub(cur).normalize().multiplyScalar(r));
    i === 0 ? sh.moveTo(a.x, a.y) : sh.lineTo(a.x, a.y);
    sh.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
  }
  sh.closePath();
  return sh;
}
function extrude(shape, depth, bevel, mat, z = 0) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 10 });
  geo.translate(0, 0, -depth / 2 + z);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
function cylX(r, x0, x1, y, z, mat, seg = 20) {   // cilindro ao longo do eixo x
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, seg), mat);
  m.quaternion.setFromUnitVectors(Y, X); m.position.set((x0 + x1) / 2, y, z); return m;
}
function tube(points, r, mat, capTip = true) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 12, false), mat));
  const s0 = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat); s0.position.copy(curve.getPoint(0)); g.add(s0);
  if (capTip) { const s1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.97, 12, 10), mat); s1.position.copy(curve.getPoint(1)); g.add(s1); }
  return g;
}
// cilindro cônico entre dois pontos, com dobras de tecido
function sleeveSeg(a, b, r0, r1, mat, seed = 1) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const geo = new THREE.CylinderGeometry(r1, r0, d.length(), 28, 14, false);
  const pos = geo.attributes.position, rr = rand(seed);
  const folds = Array.from({ length: 5 }, () => [rr() * 6.28, 2 + rr() * 5, 0.06 + rr() * 0.08]);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ang = Math.atan2(z, x);
    let k = 1; for (const [ph, f, amp] of folds) k += Math.sin(ang * 2 + y * f * 40 + ph) * amp * 0.25 + Math.sin(y * 90 + ph) * amp * 0.12;
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(Y, d.normalize());
  return m;
}
function ringAt(p, dir, r, tubeR, mat) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tubeR, 10, 28), mat);
  m.position.set(...p); m.quaternion.setFromUnitVectors(Z, new THREE.Vector3(...dir).normalize()); return m;
}

// ---------- AK-47 ----------
function buildAK() {
  const ak = new THREE.Group();
  const add = (m) => { ak.add(m); return m; };

  // receptor estampado
  add(extrude(roundedShape([[-0.15, -0.036], [0.145, -0.036], [0.145, 0.03], [-0.15, 0.03]], 0.005), 0.042, 0.003, M.metal));
  // reforço do receptor + rebites
  add(extrude(roundedShape([[-0.12, -0.03], [0.05, -0.03], [0.05, -0.012], [-0.12, -0.012]], 0.003), 0.044, 0.002, M.metal));
  for (const [x, y] of [[-0.11, -0.022], [0.04, -0.022], [0.12, -0.02], [0.12, 0.012], [-0.135, 0.015], [-0.02, -0.022]]) {
    const rv = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), M.metal); rv.position.set(x, y, 0.0245); rv.scale.z = 0.5; add(rv);
    const rv2 = rv.clone(); rv2.position.z = -0.0245; add(rv2);
  }
  // tampa (dust cover) com nervuras
  add(extrude(roundedShape([[-0.155, 0.028], [0.125, 0.028], [0.125, 0.05], [-0.13, 0.058], [-0.155, 0.052]], 0.008), 0.034, 0.005, M.metal));
  for (let i = 0; i < 3; i++) add(extrude(roundedShape([[-0.1 + i * 0.012, 0.052], [-0.094 + i * 0.012, 0.052], [-0.094 + i * 0.012, 0.062], [-0.1 + i * 0.012, 0.062]], 0.002), 0.03, 0.002, M.metal));
  // base da alça de mira traseira
  add(extrude(roundedShape([[0.12, 0.028], [0.205, 0.028], [0.205, 0.048], [0.135, 0.066], [0.12, 0.064]], 0.006), 0.03, 0.003, M.metal));
  add(extrude(roundedShape([[0.17, 0.06], [0.2, 0.054], [0.2, 0.06], [0.17, 0.067]], 0.002), 0.026, 0.0015, M.metalDark));
  // munhão frontal
  add(extrude(roundedShape([[0.14, -0.032], [0.18, -0.03], [0.18, 0.028], [0.14, 0.028]], 0.004), 0.04, 0.003, M.metal));
  // alavanca de manejo (lado direito)
  add(cylX(0.004, 0.05, 0.11, 0.035, 0.026, M.metal));
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.0065, 0.03, 14), M.metal);
  ch.quaternion.setFromUnitVectors(Y, Z); ch.position.set(0.11, 0.035, 0.04); add(ch);
  const chk = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 14, 10), M.metal); chk.position.set(0.11, 0.035, 0.055); chk.scale.set(1, 1, 0.7); add(chk);
  // seletor de tiro (lado direito)
  add(extrude(roundedShape([[-0.12, 0.016], [0.07, 0.022], [0.075, 0.012], [-0.06, 0.004], [-0.125, 0.006]], 0.004), 0.002, 0.001, M.metal, 0.026));

  // guarda-mão inferior (madeira)
  add(extrude(roundedShape([[0.175, -0.036], [0.375, -0.027], [0.38, 0.018], [0.175, 0.026]], 0.012), 0.044, 0.009, M.wood));
  for (const x of [0.22, 0.26, 0.3]) // sulcos de pegada
    add(extrude(roundedShape([[x, -0.02], [x + 0.03, -0.019], [x + 0.03, -0.015], [x, -0.016]], 0.002), 0.062, 0.001, M.bakelite));
  // anel de retenção
  add(extrude(roundedShape([[0.38, -0.03], [0.395, -0.03], [0.395, 0.03], [0.38, 0.03]], 0.003), 0.046, 0.003, M.metal));
  // guarda-mão superior (cobre o tubo de gases)
  add(extrude(roundedShape([[0.205, 0.034], [0.355, 0.034], [0.36, 0.046], [0.348, 0.058], [0.218, 0.058], [0.205, 0.048]], 0.008), 0.026, 0.007, M.wood));
  // cano, tubo de gases, bloco de gases, vareta
  add(cylX(0.0115, 0.18, 0.62, 0.012, 0, M.metal));
  add(cylX(0.012, 0.36, 0.46, 0.05, 0, M.metal));
  add(extrude(roundedShape([[0.445, -0.004], [0.48, -0.004], [0.48, 0.064], [0.455, 0.066]], 0.006), 0.026, 0.003, M.metal));
  add(cylX(0.0032, 0.2, 0.56, -0.014, 0, M.metalDark, 10));
  // massa de mira
  add(extrude(roundedShape([[0.53, -0.004], [0.565, -0.004], [0.56, 0.05], [0.552, 0.082], [0.538, 0.082], [0.535, 0.05]], 0.005), 0.024, 0.002, M.metal));
  // freio de boca inclinado
  add(cylX(0.0165, 0.62, 0.665, 0.012, 0, M.metal, 24));
  add(cylX(0.012, 0.665, 0.672, 0.012, 0, M.metalDark, 24));

  // carregador curvo (banana)
  const mag = new THREE.Shape();
  mag.moveTo(0.032, -0.03); mag.lineTo(0.112, -0.03);
  mag.quadraticCurveTo(0.12, -0.17, 0.188, -0.285);
  mag.lineTo(0.112, -0.31);
  mag.quadraticCurveTo(0.05, -0.18, 0.032, -0.03);
  const magG = new THREE.Group(); ak.add(magG);
  magG.add(extrude(mag, 0.028, 0.004, M.metalDark));
  for (let i = 0; i < 5; i++) {             // nervuras do carregador
    const t = 0.15 + i * 0.16, x = 0.04 + t * 0.075 + t * t * 0.03, y = -0.04 - t * 0.24;
    const rib = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.006, 0.04, 2, 0.002), M.metalDark);
    rib.position.set(x + 0.035, y, 0); rib.rotation.z = -0.35 - t * 0.35; magG.add(rib);
  }
  const fp = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.012, 0.038, 2, 0.004), M.metal);
  fp.position.set(0.152, -0.302, 0); fp.rotation.z = 0.32; magG.add(fp);

  // guarda-mato e gatilho
  add(tube([[0.03, -0.034], [0.028, -0.062], [-0.01, -0.07], [-0.045, -0.06], [-0.055, -0.036]].map(([x, y]) => [x, y, 0]), 0.0035, M.metal, false));
  add(tube([[0.0, -0.036, 0], [0.006, -0.05, 0], [0.002, -0.06, 0]], 0.003, M.metal));
  // empunhadura (baquelite)
  add(extrude(roundedShape([[-0.07, -0.034], [-0.03, -0.034], [-0.05, -0.1], [-0.068, -0.158], [-0.108, -0.155], [-0.095, -0.1]], 0.014), 0.03, 0.007, M.bakelite));
  // coronha de madeira
  add(extrude(roundedShape([[-0.145, 0.024], [-0.2, 0.02], [-0.44, 0.002], [-0.48, 0.0], [-0.48, -0.128], [-0.455, -0.13], [-0.25, -0.07], [-0.145, -0.036]], 0.012), 0.036, 0.009, M.wood));
  add(extrude(roundedShape([[-0.492, 0.002], [-0.48, 0.002], [-0.48, -0.132], [-0.492, -0.132]], 0.004), 0.048, 0.002, M.metal));

  ak.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.68, 0.012, 0); ak.add(muzzle);
  return { group: ak, mag: magG, muzzle };
}

// ---------- peças comuns ----------
const GRIP = [[-0.07, -0.034], [-0.03, -0.034], [-0.05, -0.1], [-0.068, -0.158], [-0.108, -0.155], [-0.095, -0.1]];
const gripCx = (y) => -0.05 + (y + 0.034) * 0.33;   // centro da empunhadura em cada altura
function triggerParts(add, mat) {
  add(tube([[0.03, -0.034], [0.028, -0.062], [-0.01, -0.07], [-0.045, -0.06], [-0.055, -0.036]].map(([x, y]) => [x, y, 0]), 0.0035, mat, false));
  add(tube([[0.0, -0.036, 0], [0.006, -0.05, 0], [0.002, -0.06, 0]], 0.003, mat));
}
function cylXTaper(r0, r1, x0, x1, y, z, mat, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, x1 - x0, seg), mat);
  m.quaternion.setFromUnitVectors(Y, X); m.position.set((x0 + x1) / 2, y, z); return m;
}
function cylZ(r, len, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat);
  m.quaternion.setFromUnitVectors(Y, Z); m.position.set(x, y, z); return m;
}
const noShadows = (g) => g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

// ---------- M4A4 ----------
function buildM4() {
  const g = new THREE.Group(); const add = (m) => { g.add(m); return m; };
  add(extrude(roundedShape([[-0.13, -0.004], [0.14, -0.004], [0.14, 0.042], [-0.13, 0.042]], 0.006), 0.04, 0.003, M.anod));
  // alça de transporte (carry handle) com a mira traseira, como na M4A1 clássica
  const ch = new THREE.Shape();
  ch.moveTo(-0.12, 0.04); ch.lineTo(0.075, 0.04); ch.lineTo(0.075, 0.05); ch.quadraticCurveTo(0.07, 0.082, 0.05, 0.084);
  ch.lineTo(-0.1, 0.084); ch.quadraticCurveTo(-0.12, 0.084, -0.12, 0.07); ch.closePath();
  const hole = new THREE.Path(); hole.moveTo(-0.085, 0.048); hole.lineTo(0.045, 0.048); hole.quadraticCurveTo(0.055, 0.06, 0.04, 0.072); hole.lineTo(-0.085, 0.072); hole.closePath();
  ch.holes.push(hole);
  add(extrude(ch, 0.02, 0.003, M.anod));
  add(extrude(roundedShape([[-0.115, 0.084], [-0.085, 0.084], [-0.088, 0.1], [-0.112, 0.1]], 0.004), 0.022, 0.002, M.anod));   // mira traseira
  add(cylZ(0.009, 0.034, -0.1, 0.075, 0, M.anod));
  add(extrude(roundedShape([[-0.12, -0.04], [0.11, -0.04], [0.11, -0.002], [-0.12, -0.002]], 0.006), 0.038, 0.003, M.anod));
  add(extrude(roundedShape([[0.03, -0.072], [0.11, -0.072], [0.11, -0.035], [0.03, -0.035]], 0.006), 0.036, 0.003, M.anod));
  add(extrude(roundedShape([[-0.02, 0.008], [0.06, 0.008], [0.06, 0.03], [-0.02, 0.03]], 0.003), 0.002, 0.001, M.metalDark, 0.023));
  add(cylZ(0.008, 0.02, -0.07, 0.03, 0.026, M.anod));
  // guarda-mão redondo com nervuras e anel delta
  add(cylXTaper(0.031, 0.028, 0.145, 0.37, 0.016, 0, M.polymer, 24));
  for (let i = 0; i < 9; i++) add(cylX(0.0315 - i * 0.0003, 0.16 + i * 0.023, 0.166 + i * 0.023, 0.016, 0, M.anod, 24));
  for (let i = 0; i < 6; i++) { const v = add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.006), M.metalDark)); v.position.set(0.19 + i * 0.03, 0.046, 0); }
  add(cylX(0.036, 0.135, 0.15, 0.016, 0, M.anod, 24));
  add(cylX(0.011, 0.38, 0.6, 0.016, 0, M.anod));
  add(cylX(0.015, 0.378, 0.405, 0.016, 0, M.anod));
  add(extrude(roundedShape([[0.375, 0.02], [0.405, 0.02], [0.4, 0.045], [0.394, 0.088], [0.386, 0.088], [0.38, 0.045]], 0.004), 0.02, 0.002, M.anod));
  add(cylX(0.013, 0.6, 0.65, 0.016, 0, M.metalDark, 8));
  const magG = new THREE.Group(); g.add(magG);
  const ms = new THREE.Shape();
  ms.moveTo(0.038, -0.06); ms.lineTo(0.104, -0.06); ms.quadraticCurveTo(0.108, -0.16, 0.125, -0.245);
  ms.lineTo(0.06, -0.255); ms.quadraticCurveTo(0.044, -0.16, 0.038, -0.06);
  magG.add(extrude(ms, 0.024, 0.003, M.metalDark));
  const bp = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.012, 0.034, 2, 0.004), M.polymer); bp.position.set(0.093, -0.252, 0); bp.rotation.z = 0.15; magG.add(bp);
  triggerParts(add, M.anod);
  add(extrude(roundedShape(GRIP, 0.014), 0.03, 0.007, M.polymer));
  add(cylX(0.016, -0.3, -0.12, 0.014, 0, M.anod));
  add(extrude(roundedShape([[-0.26, 0.042], [-0.42, 0.036], [-0.435, 0.03], [-0.435, -0.11], [-0.405, -0.115], [-0.3, -0.03], [-0.26, -0.018]], 0.012), 0.04, 0.006, M.polymer));
  add(extrude(roundedShape([[-0.145, 0.03], [-0.12, 0.03], [-0.12, 0.045], [-0.145, 0.045]], 0.003), 0.05, 0.002, M.anod));
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.66, 0.016, 0); g.add(muzzle);
  return { group: g, mag: magG, muzzle };
}

// ---------- AWP ----------
function buildAWP() {
  const g = new THREE.Group(); const add = (m) => { g.add(m); return m; };
  add(cylX(0.022, -0.12, 0.14, 0.022, 0, M.metal, 24));
  add(cylZ(0.006, 0.05, -0.07, 0.03, 0.03, M.metal));
  const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 10), M.metal)); knob.position.set(-0.075, 0.025, 0.058);
  add(extrude(roundedShape([[-0.02, 0.008], [0.36, 0.01], [0.375, -0.01], [0.355, -0.042], [-0.02, -0.05]], 0.014), 0.05, 0.008, M.green));
  add(extrude(roundedShape(GRIP, 0.014), 0.034, 0.007, M.green));
  add(extrude(roundedShape([[-0.1, 0.0], [-0.2, 0.03], [-0.5, 0.035], [-0.53, 0.03], [-0.53, -0.125], [-0.48, -0.13], [-0.22, -0.075], [-0.14, -0.15], [-0.1, -0.12]], 0.015), 0.042, 0.008, M.green));
  add(extrude(roundedShape([[-0.545, 0.033], [-0.53, 0.033], [-0.53, -0.128], [-0.545, -0.128]], 0.005), 0.05, 0.003, M.rubber));
  add(cylXTaper(0.016, 0.011, 0.14, 0.76, 0.02, 0, M.metal, 20));
  add(cylX(0.019, 0.76, 0.82, 0.02, 0, M.metal, 24));
  for (let i = 0; i < 3; i++) add(cylX(0.0195, 0.77 + i * 0.016, 0.776 + i * 0.016, 0.02, 0, M.metalDark, 24));
  // luneta
  add(cylX(0.019, -0.11, 0.2, 0.092, 0, M.metalDark, 28));
  add(cylXTaper(0.02, 0.032, 0.2, 0.26, 0.092, 0, M.metalDark, 28));
  add(cylX(0.032, 0.26, 0.285, 0.092, 0, M.metalDark, 28));
  add(cylXTaper(0.026, 0.019, -0.17, -0.11, 0.092, 0, M.metalDark, 28));
  const lens = add(new THREE.Mesh(new THREE.CircleGeometry(0.028, 24), M.lens)); lens.position.set(0.2851, 0.092, 0); lens.rotation.y = Math.PI / 2;
  const tur = add(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.03, 16), M.metalDark)); tur.position.set(0.04, 0.118, 0);
  add(cylZ(0.012, 0.03, 0.04, 0.092, 0.028, M.metalDark));
  for (const x of [-0.04, 0.1]) { const ring = add(new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.05, 0.03, 2, 0.004), M.metalDark)); ring.position.set(x, 0.062, 0); }
  const magG = new THREE.Group(); g.add(magG);
  const mg = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.06, 0.03, 2, 0.005), M.polymer); mg.position.set(0.05, -0.07, 0); magG.add(mg);
  triggerParts(add, M.metal);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.83, 0.02, 0); g.add(muzzle);
  return { group: g, mag: magG, muzzle };
}

// ---------- pistolas ----------
function buildPistol(kind) {
  const g = new THREE.Group(); const add = (m) => { g.add(m); return m; };
  const deagle = kind === 'deagle';
  const slideMat = deagle ? M.silver : M.metalDark, frameMat = deagle ? M.silver : M.polymer;
  const top = deagle ? 0.046 : 0.032, front = deagle ? 0.17 : 0.13, w = deagle ? 0.03 : 0.026;
  add(extrude(roundedShape([[-0.08, -0.004], [front, -0.004], [front, top - 0.006], [front - 0.012, top], [-0.075, top]], 0.006), w, 0.003, slideMat));
  for (let i = 0; i < 6; i++) {
    const s = add(new THREE.Mesh(new THREE.BoxGeometry(0.002, top - 0.014, w + 0.0062), M.metalDark)); s.position.set(-0.068 + i * 0.006, top / 2, 0);
  }
  add(extrude(roundedShape([[-0.075, -0.03], [front - 0.01, -0.022], [front - 0.01, -0.004], [-0.075, -0.004]], 0.006), w - 0.002, 0.003, frameMat));
  add(cylX(0.007, front, front + 0.004, 0.012, 0, M.metalDark));
  const rs = add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.02), M.metalDark)); rs.position.set(-0.07, top + 0.004, 0);
  const fs = add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.005), M.metalDark)); fs.position.set(front - 0.01, top + 0.004, 0);
  add(extrude(roundedShape(GRIP, 0.014), w, 0.007, deagle ? M.rubber : M.polymer));
  triggerParts(add, frameMat);
  const magG = new THREE.Group(); g.add(magG);
  const mb = new THREE.Mesh(new RoundedBoxGeometry(0.028, 0.11, 0.02, 2, 0.004), M.metalDark); mb.position.set(-0.078, -0.105, 0); mb.rotation.z = 0.32; magG.add(mb);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.046, 0.012, w + 0.004, 2, 0.004), M.polymer); base.position.set(gripCx(-0.162), -0.162, 0); base.rotation.z = -0.06; magG.add(base);
  let mx = front + 0.006;
  if (kind === 'usp') { add(cylX(0.016, front, front + 0.16, 0.012, 0, M.metalDark, 24)); mx = front + 0.165; }
  const muzzle = new THREE.Object3D(); muzzle.position.set(mx, 0.012, 0); g.add(muzzle);
  return { group: g, mag: magG, muzzle };
}

// ---------- faca ----------
function buildKnife() {
  const g = new THREE.Group(); const add = (m) => { g.add(m); return m; };
  const a = new THREE.Vector2(0.31, 0.95).normalize(), n = new THREE.Vector2(-a.y, a.x), base = new THREE.Vector2(-0.05, -0.03);
  const P = (u, v) => [base.x + a.x * u + n.x * v, base.y + a.y * u + n.y * v];
  add(extrude(roundedShape([P(0, -0.014), P(0.15, -0.016), P(0.22, 0.0), P(0.17, 0.013), P(0, 0.013)], 0.003), 0.003, 0.0015, M.blade));
  add(extrude(roundedShape([P(0.02, 0.004), P(0.14, 0.004), P(0.14, 0.008), P(0.02, 0.008)], 0.001), 0.0045, 0.0005, M.metalDark));
  add(extrude(roundedShape([P(-0.008, -0.024), P(0.004, -0.024), P(0.004, 0.024), P(-0.008, 0.024)], 0.003), 0.022, 0.002, M.metalDark));
  add(extrude(roundedShape(GRIP, 0.014), 0.022, 0.007, M.rubber));
  return { group: g, mag: null, muzzle: null };
}

// granadas detalhadas (heavy.js): explosiva M67, luz M84 e fumaça M18
export function buildNade(key) { return buildGrenade(key); }

// ---------- mãos ----------
function rightHand(sleeve) {
  const h = new THREE.Group(); const add = (m) => { h.add(m); return m; };
  for (const [y, r] of [[-0.072, 0.0105], [-0.098, 0.0102], [-0.124, 0.0092]]) {
    const cx = gripCx(y);
    add(tube([[cx - 0.008, y + 0.004, 0.036], [cx + 0.02, y, 0.034], [cx + 0.036, y - 0.002, 0.012], [cx + 0.034, y - 0.004, -0.014], [cx + 0.02, y - 0.006, -0.03]], r, M.glove));
    const kn = add(new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.016, 0.012, 2, 0.004), M.leather));
    kn.position.set(cx + 0.03, y, 0.03); kn.rotation.y = -0.6;
  }
  add(tube([[gripCx(-0.05) - 0.004, -0.048, 0.038], [0.002, -0.045, 0.036], [0.018, -0.05, 0.022], [0.016, -0.06, 0.006], [0.006, -0.063, 0.0]], 0.0098, M.glove));
  const palm = add(new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.1, 0.034, 4, 0.014), M.glove));
  palm.position.set(gripCx(-0.095) - 0.018, -0.092, 0.04); palm.rotation.set(0.0, 0.25, -0.32);
  const pad = add(new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.07, 0.01, 3, 0.004), M.leather));
  pad.position.set(gripCx(-0.095) - 0.016, -0.09, 0.059); pad.rotation.set(0, 0.25, -0.32);
  add(tube([[-0.088, -0.062, 0.03], [-0.104, -0.056, 0.0], [-0.088, -0.05, -0.03], [-0.05, -0.046, -0.036], [-0.03, -0.047, -0.034]], 0.0115, M.glove));
  add(ringAt([-0.11, -0.13, 0.05], [-0.35, -0.85, 0.3], 0.034, 0.012, M.leather));
  add(sleeveSeg([-0.11, -0.13, 0.05], [-0.15, -0.22, 0.08], 0.032, 0.037, M.glove, 4));
  add(ringAt([-0.15, -0.22, 0.08], [-0.35, -0.85, 0.3], 0.043, 0.012, sleeve));
  add(sleeveSeg([-0.15, -0.22, 0.08], [-0.195, -0.334, 0.116], 0.044, 0.048, sleeve, 7));
  add(sleeveSeg([-0.195, -0.334, 0.116], [-0.35, -0.73, 0.24], 0.048, 0.054, sleeve, 8));
  return h;
}
function leftRifleHand(sleeve) {
  const h = new THREE.Group(); const add = (m) => { h.add(m); return m; };
  for (const [x, r] of [[0.238, 0.0105], [0.262, 0.0108], [0.286, 0.0105], [0.308, 0.0095]]) {
    add(tube([[x - 0.004, -0.05, -0.022], [x, -0.058, 0.004], [x + 0.004, -0.046, 0.034], [x + 0.008, -0.018, 0.046], [x + 0.01, 0.008, 0.042]], r, M.glove));
  }
  const lpalm = add(new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.036, 0.07, 4, 0.014), M.glove));
  lpalm.position.set(0.258, -0.054, -0.03); lpalm.rotation.set(-0.5, 0, 0.05);
  const lpad = add(new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.01, 0.05, 3, 0.004), M.leather));
  lpad.position.set(0.258, -0.074, -0.04); lpad.rotation.set(-0.5, 0, 0.05);
  add(tube([[0.22, -0.05, -0.05], [0.25, -0.025, -0.052], [0.285, -0.006, -0.046], [0.305, 0.002, -0.04]], 0.0115, M.glove));
  add(ringAt([0.21, -0.075, -0.05], [-0.7, -0.4, -0.35], 0.034, 0.012, M.leather));
  add(sleeveSeg([0.21, -0.075, -0.05], [0.08, -0.15, -0.12], 0.032, 0.037, M.glove, 11));
  add(ringAt([0.08, -0.15, -0.12], [-0.7, -0.4, -0.4], 0.043, 0.012, sleeve));
  add(sleeveSeg([0.08, -0.15, -0.12], [-0.019, -0.219, -0.174], 0.044, 0.048, sleeve, 13));
  add(sleeveSeg([-0.019, -0.219, -0.174], [-0.32, -0.43, -0.33], 0.048, 0.054, sleeve, 14));
  return h;
}
function leftPistolHand(sleeve) {
  const h = new THREE.Group(); const add = (m) => { h.add(m); return m; };
  for (const [y, r] of [[-0.075, 0.0105], [-0.1, 0.0102], [-0.124, 0.0095], [-0.146, 0.0088]]) {
    const cx = gripCx(y);
    add(tube([[cx - 0.012, y, -0.05], [cx + 0.03, y - 0.002, -0.044], [cx + 0.05, y - 0.004, -0.012], [cx + 0.048, y - 0.006, 0.02], [cx + 0.034, y - 0.008, 0.042]], r, M.glove));
  }
  const palm = add(new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.1, 0.034, 4, 0.014), M.glove));
  palm.position.set(gripCx(-0.11) - 0.012, -0.11, -0.058); palm.rotation.set(0, -0.3, -0.32);
  add(tube([[-0.07, -0.06, -0.06], [-0.03, -0.042, -0.05], [0.02, -0.032, -0.042], [0.05, -0.028, -0.034]], 0.0115, M.glove));
  add(ringAt([-0.1, -0.15, -0.07], [-0.4, -0.6, -0.6], 0.034, 0.012, M.leather));
  add(sleeveSeg([-0.1, -0.15, -0.07], [-0.16, -0.24, -0.16], 0.032, 0.037, M.glove, 17));
  add(ringAt([-0.16, -0.24, -0.16], [-0.4, -0.6, -0.6], 0.043, 0.012, sleeve));
  add(sleeveSeg([-0.16, -0.24, -0.16], [-0.208, -0.318, -0.238], 0.044, 0.048, sleeve, 19));
  add(sleeveSeg([-0.208, -0.318, -0.238], [-0.4, -0.63, -0.55], 0.048, 0.054, sleeve, 20));
  return h;
}

// ---------- controlador do view-model ----------
const SPECIAL = { rpg: true, bow: true };   // armas que disparam projéteis (heavy.js)
const KIND = { ak47: 'rifle', m4a4: 'rifle', awp: 'awp', rpg: 'rpg', bow: 'bow', glock: 'pistol', usp: 'pistol', deagle: 'pistol', knife: 'knife', he: 'nade', flash: 'nade', smoke: 'nade' };
export const POSES = {
  // enquadramento do Far Cry 3: arma grande e perto, quase deitada do centro até a borda direita;
  // só a mão esquerda aparece, segurando a frente com o braço descendo reto
  rifle: { pos: [0.2, -0.19, -0.165], rot: [0.09, 0.3, -0.1], scale: 1.0 },
  ak47: { pos: [0.115, -0.215, -0.1], rot: [0.0, 0.06, -0.1], scale: 1.4 },   // AK alinhada: reta para frente, grande, subindo do canto de baixo
  m4a4: { pos: [0.115, -0.165, -0.1], rot: [0.0, 0.06, -0.1], scale: 1.2 },   // alinhada como a AK; menor para a mira holográfica não tapar o canto
  awp: { pos: [0.105, -0.13, -0.1], rot: [0.0, 0.06, -0.1], scale: 1.12 },   // alinhada como a AK; menor porque é mais comprida
  rpg: { pos: [0.13, -0.075, -0.38], rot: [0.1, 0.14, -0.05], scale: 1.0 },   // bazuca no ombro, tubo do canto direito até o meio
  bow: { pos: [0.11, -0.05, -0.56], rot: [0.03, 0.06, -0.3], scale: 1.0 },     // arco inclinado, flecha encaixada
  pistol: { pos: [0.1, 0.005, -0.27], rot: [0.03, 0.14, -0.05], scale: 0.78 },   // pistola com as duas mãos fechadas no cabo, à vista
  knife: { pos: [0.155, -0.15, -0.26], rot: [0.15, 0.3, -0.85], scale: 0.55 },
  nade: { pos: [0.1, -0.07, -0.23], rot: [0.15, 0.35, -0.1], scale: 0.95 },   // granada na mão, no canto da tela
};

const FIRE_POSES = {
  rifle: { pos: [0.185, -0.182, -0.165], rot: [0.07, 0.24, -0.07] },
  ak47: { pos: [0.11, -0.207, -0.095], rot: [0.0, 0.04, -0.08] },
  m4a4: { pos: [0.11, -0.158, -0.095], rot: [0.0, 0.04, -0.08] },
  awp: { pos: [0.1, -0.123, -0.095], rot: [0.0, 0.04, -0.08] },
  rpg: { pos: [0.125, -0.07, -0.375], rot: [0.09, 0.12, -0.04] },
  bow: { pos: [0.1, -0.045, -0.55], rot: [0.02, 0.04, -0.28] },
  pistol: { pos: [0.09, 0.009, -0.27], rot: [0.02, 0.08, -0.02] },
};
// tamanho da arma enquanto mira (botão direito): o tamanho em que a alça e a massa foram ajustadas;
// a arma grande do enquadramento de Far Cry deixaria a mira cobrindo a tela
const ADS_SCALE = { rifle: 0.5, awp: 0.47, pistol: 0.55 };
// pontos de mira (no espaço da arma): alça traseira e massa de mira
const SIGHTS = {
  // a linha passa um pouco acima da alça traseira, para a massa de mira aparecer no centro
  ak47: { rear: [0.175, 0.07], front: [0.545, 0.082] },
  m4a4: { rear: [-0.1, 0.103], front: [0.39, 0.088] },
  glock: { rear: [-0.07, 0.0425], front: [0.12, 0.04] },
  usp: { rear: [-0.07, 0.0425], front: [0.12, 0.04] },
  deagle: { rear: [-0.07, 0.0565], front: [0.16, 0.054] },
};
// pose em que a alça e a massa ficam alinhadas no centro da tela
function adsPose(key, scale, sight) {
  const S = sight || SIGHTS[key]; if (!S) return null;
  const dx = S.front[0] - S.rear[0], dy = S.front[1] - S.rear[1];
  const a = -Math.atan2(dy, dx);
  const y = S.rear[1] * scale, z = -S.rear[0] * scale;
  const y2 = y * Math.cos(a) - z * Math.sin(a), z2 = y * Math.sin(a) + z * Math.cos(a);
  const dist = key === 'm4a4' ? 0.033 : key === 'ak47' ? 0.022 : KIND[key] === 'pistol' ? 0.19 : 0.07;
  // a arma é girada 90° no view-model: o lado (z da arma) vira o x da tela
  return { pos: [-(S.lat || 0) * scale, -y2, -dist - z2], rot: [a, 0, 0], scale };
}
const RELOAD_DOWN = new THREE.Vector3(-0.03, -0.22, -0.05);
// Curva suave (Catmull-Rom) passando por quadros-chave [[t, [valores...]], ...]: o movimento não para
// entre um quadro e outro, igual a uma pessoa de verdade.
export function track(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const span = k2[0] - k1[0], u = (t - k1[0]) / span, u2 = u * u, u3 = u2 * u;
  return k1[1].map((p1, j) => {
    const p0 = k0[1][j], p2 = k2[1][j], p3 = k3[1][j];
    const m1 = k2[0] > k0[0] ? (p2 - p0) / (k2[0] - k0[0]) * span : 0;
    const m2 = k3[0] > k1[0] ? (p3 - p1) / (k3[0] - k1[0]) * span : 0;
    return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
  });
}
// recarga em primeira pessoa: [mão→carregador, mão para baixo (×D), giro, inclinação, altura, lado, frente, carregador para baixo (×D)]
const RELOAD_KEYS = [
  [0.00, [0, 0, 0, 0, 0, 0, 0, 0]],
  [0.08, [0.75, 0, 0.36, 0.06, 0.022, -0.02, 0, 0]],          // gira a arma e a mão vai ao carregador
  [0.14, [1, 0, 0.5, 0.08, 0.03, -0.03, -0.01, 0]],
  [0.22, [1, 0.95, 0.56, 0.13, 0.036, -0.035, -0.012, 0.95]], // puxa o carregador vazio com força
  [0.36, [1, 2.3, 0.5, 0.1, 0.03, -0.03, -0.01, 2.3]],        // mão desce até o colete
  [0.5, [1, 1.0, 0.5, 0.1, 0.03, -0.03, -0.01, 1.0]],         // volta com o carregador novo
  [0.6, [1, 0.15, 0.47, 0.09, 0.03, -0.03, -0.01, 0.15]],     // alinha na boca do carregador
  [0.66, [1, -0.03, 0.38, 0.0, 0.047, -0.028, -0.01, 0]],     // encaixa com um tapa (a arma dá um tranco)
  [0.74, [0.55, 0, 0.3, 0.06, 0.03, -0.02, 0, 0]],
  [0.82, [0.15, 0, 0.12, 0.0, 0.01, -0.01, 0.026, 0]],        // puxa o ferrolho: a arma vem para trás
  [0.88, [0, 0, 0.04, 0.035, 0.004, 0, -0.006, 0]],
  [1.00, [0, 0, 0, 0, 0, 0, 0, 0]],
];
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const _h = new THREE.Vector3(), _m = new THREE.Vector3();

function flashTexture() {
  return canvasTex(128, (g, s) => {
    const c = s / 2;
    const gr = g.createRadialGradient(c, c, 0, c, c, c);
    gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.2, 'rgba(255,210,120,.9)'); gr.addColorStop(0.5, 'rgba(255,140,40,.35)'); gr.addColorStop(1, 'rgba(255,100,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,220,150,.8)'; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.lineWidth = 6; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.95, c + Math.sin(a) * c * 0.95); g.stroke(); }
  });
}
export const FLASH_TEX = flashTexture();
// retículo da mira holográfica: X vermelho com ponto no meio e um brilho leve
const RETICLE_TEX = canvasTex(128, (g, s) => {
  const c = s / 2;
  g.strokeStyle = '#ff3020'; g.fillStyle = '#ff3020'; g.lineCap = 'round';
  g.shadowColor = '#ff2010'; g.shadowBlur = 8;
  g.lineWidth = 8;
  for (const [a, b] of [[1, 1], [1, -1]]) { g.beginPath(); g.moveTo(c - a * 34, c - b * 34); g.lineTo(c - a * 12, c - b * 12); g.moveTo(c + a * 12, c + b * 12); g.lineTo(c + a * 34, c + b * 34); g.stroke(); }
  g.beginPath(); g.arc(c, c, 5, 0, Math.PI * 2); g.fill();
});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class ViewModel {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xdfe6f0, 0x8a7050, 0.9));
    this.sun = new THREE.DirectionalLight(0xfff0d6, 2.6); this.scene.add(this.sun);
    this.flashLight = new THREE.PointLight(0xffc070, 0, 1.2); this.flashLight.position.set(0.05, -0.02, -0.5); this.scene.add(this.flashLight);
    this.cache = {}; this.team = 'T'; this.key = null; this.cur = null;
    this.bobPhase = 0; this.bobAmp = 0; this.swayX = 0; this.swayY = 0; this.kick = 0; this.flashT = 0;
    this.drawT = 1; this.reloadT = -1; this.reloadDur = 1; this.slashT = -1; this.throwT = -1; this.time = 0; this.fireBlend = 0; this.adsBlend = 0; this.sprintBlend = 0; this.debris = [];
    this.sunDir = new THREE.Vector3(1, 1, 1).normalize();
  }
  setEnvironment(env, sunDir) { this.scene.environment = env; this.sunDir.copy(sunDir).normalize(); }
  setTeam(team) {
    if (team === this.team) return;
    this.team = team;
    for (const k in this.cache) this.root.remove(this.cache[k].holder);
    this.cache = {};
    const key = this.key; this.key = null; if (key) this.setWeapon(key, true);
  }
  build(key) {
    const kind = KIND[key], sleeve = this.team === 'T' ? M.sleeveT : M.sleeveCT;
    // modelo 3D realista (se carregou); senão, a arma feita por código
    const w = kind === 'nade' ? buildNade(key) : (key === 'awp' && buildAWPPro()) || (kind !== 'knife' && !SPECIAL[key] && makeGunFromModel(key, { suppressor: M.metalDark, silver: M.silver })) || (key === 'ak47' ? buildAK() : key === 'm4a4' ? buildM4() : key === 'awp' ? buildAWP() : key === 'rpg' ? buildRPG() : key === 'bow' ? buildBow() : kind === 'pistol' ? buildPistol(key) : buildKnife());
    if (kind === 'nade') w.group.position.set(-0.05, -0.035, 0.04);   // na palma da mão
    if (w.group) w.group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    // a mão esquerda vai para o guarda-mão do modelo
    const lhBase = w.fore && kind !== 'pistol' ? new THREE.Vector3(w.fore.x - 0.27, w.fore.y + 0.003, 0) : new THREE.Vector3();
    // centro do carregador (para a mão esquerda ir buscá-lo na recarga)
    let grab = null;
    if (w.mag && !SPECIAL[key]) {
      w.group.updateMatrixWorld(true);
      const c = new THREE.Box3().setFromObject(w.mag).getCenter(new THREE.Vector3());
      const palm = kind === 'pistol' ? new THREE.Vector3(-0.087, -0.11, -0.058) : new THREE.Vector3(0.258, -0.054, -0.03);
      grab = c.add(kind === 'pistol' ? new THREE.Vector3(0, -0.07, -0.025) : new THREE.Vector3(0, -0.02, -0.035)).sub(palm).sub(lhBase);
    }
    const inner = new THREE.Group();
    // braços de pele com dedos (arms.js); se o modelo não carregar, volta a mão feita por código
    const skin = armsReady() && (ARM_POSES[key] || ARM_POSES[kind]);   // pose da mão própria da arma, ou a do tipo
    let armR = null, armL = null, lh = null;
    if (skin) {
      armR = makeArm('R'); inner.add(w.group, armR.group);
      if (skin.L) { armL = makeArm('L'); lh = armL.group; }
      // luva tática sem dedos e manga camuflada do time; relógio no pulso esquerdo
      dressArm(armR, this.team); gloveArm(armR);
      if (armL) { dressArm(armL, this.team, { watch: true }); gloveArm(armL); }
    } else {
      inner.add(w.group, rightHand(sleeve));
      if (kind === 'rifle' || kind === 'awp') lh = leftRifleHand(sleeve);
      if (kind === 'pistol') lh = leftPistolHand(sleeve);
    }
    if (lh) { lh.position.copy(lhBase); inner.add(lh); }
    inner.rotation.y = Math.PI / 2;
    const holder = new THREE.Group(); holder.add(inner);
    noShadows(holder);
    let flash = null;
    if (w.muzzle && key !== 'bow') {
      flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLASH_TEX, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      flash.scale.setScalar(key === 'rpg' ? 0.5 : key === 'awp' ? 0.32 : kind === 'pistol' ? 0.16 : 0.24); flash.visible = false;
      w.muzzle.add(flash);
    }
    let backFlash = null;   // bazuca: fogo saindo pela traseira
    if (w.back) {
      backFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLASH_TEX, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffc070 }));
      backFlash.scale.setScalar(0.7); backFlash.visible = false; w.back.add(backFlash);
    }
    let reticle = null;
    if ((key === 'm4a4' || key === 'ak47') && w.sight) {
      reticle = new THREE.Sprite(new THREE.SpriteMaterial({ map: RETICLE_TEX, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
      reticle.position.set(w.sight.front[0], w.sight.front[1], w.sight.lat || 0); reticle.scale.setScalar(0.012); reticle.renderOrder = 999;
      w.group.add(reticle);
    }
    return { holder, key, kind, armR, armL, armPose: skin, reticle, mag: w.mag, magBase: w.mag ? w.mag.position.clone() : null, flash, lh, lhBase, grab, gunGroup: w.mag ? w.mag.parent : w.group, dropped: false, projectile: !!SPECIAL[key], loaded: true, setDraw: w.setDraw || null, drawReach: w.drawReach || 0, draw: 1, backFlash, ads: adsPose(key, ADS_SCALE[kind] || (POSES[key] || POSES[kind]).scale, w.sight) };
  }
  setWeapon(key, instant = false) {
    if (key === this.key) return;
    if (this.cur) this.root.remove(this.cur.holder);
    this.key = key;
    if (!key) { this.cur = null; return; }
    this.cur = this.cache[key] || (this.cache[key] = this.build(key));
    this.root.add(this.cur.holder);
    this.drawT = instant ? 1 : 0; this.cancelReload(); this.slashT = -1; this.kick = 0;
  }
  fire() {
    if (!this.cur) return;
    if (this.cur.kind === 'knife') { this.slashT = 0; return; }
    if (this.cur.kind === 'nade') { this.throwT = 0; return; }
    this.kick = Math.min(1.8, this.kick + (this.cur.kind === 'rpg' ? 1.5 : this.cur.kind === 'bow' ? 0.35 : this.cur.kind === 'awp' ? 1.6 : this.cur.kind === 'pistol' ? 1.0 : 0.7));
    this.flashT = this.cur.kind === 'bow' ? -1 : 0.045;
    if (this.cur.flash) this.cur.flash.material.rotation = Math.random() * Math.PI;
  }
  reload(dur) { this.reloadT = 0; this.reloadDur = dur; if (this.cur) this.cur.dropped = false; }
  cancelReload() {
    this.reloadT = -1;
    const c = this.cur;
    if (c && c.mag) { c.mag.visible = true; c.mag.position.copy(c.magBase); }
    if (c && c.lh) c.lh.position.copy(c.lhBase);
  }
  // carregador vazio caindo
  spawnDebris() {
    const c = this.cur;
    const obj = c.mag.clone(); obj.position.copy(c.mag.position); obj.visible = true;
    c.gunGroup.add(obj);
    this.debris.push({ obj, parent: c.gunGroup, v: new THREE.Vector3(-0.15, -0.6, -0.25), life: 0.8 });
  }
  update(dt, s) {
    this.time += dt;
    if (!this.cur) return;
    // enquadramento próprio da arma (POSES.m4a4 etc.), senão o do tipo
    const P = POSES[this.cur.key] || POSES[this.cur.kind], F = FIRE_POSES[this.cur.key] || FIRE_POSES[this.cur.kind] || P;
    // ao atirar a arma vai para uma posição mais reta, apontando para a mira
    this.fireBlend += ((s.firing && this.reloadT < 0 ? 1 : 0) - this.fireBlend) * Math.min(1, dt * (s.firing ? 14 : 5));
    const fb = this.fireBlend, mix = (a, b) => a + (b - a) * fb;
    let px = mix(P.pos[0], F.pos[0]), py = mix(P.pos[1], F.pos[1]), pz = mix(P.pos[2], F.pos[2]);
    let rx = mix(P.rot[0], F.rot[0]), ry = mix(P.rot[1], F.rot[1]), rz = mix(P.rot[2], F.rot[2]);
    // mirando (botão direito): leva a mira da arma ao centro da tela
    const A = this.cur.ads;
    this.adsBlend += ((s.ads && A && this.reloadT < 0 ? 1 : 0) - this.adsBlend) * Math.min(1, dt * 12);
    const ab = this.adsBlend, still = 1 - ab * 0.85;
    if (this.cur.reticle) { const o = Math.pow(ab, 3); this.cur.reticle.material.opacity = o; this.cur.reticle.visible = o > 0.02; }
    if (A && ab > 0.001) {
      const am = (a, b) => a + (b - a) * ab;
      px = am(px, A.pos[0]); py = am(py, A.pos[1]); pz = am(pz, A.pos[2]);
      rx = am(rx, A.rot[0]); ry = am(ry, A.rot[1]); rz = am(rz, A.rot[2]);
    }

    // balanço ao andar
    const amp = s.onGround ? clamp(s.speed / 5.5, 0, 1) : 0;
    this.bobAmp += (amp - this.bobAmp) * Math.min(1, dt * 8);
    this.bobPhase += dt * (5 + s.speed * 1.3);
    px += Math.sin(this.bobPhase) * 0.007 * this.bobAmp * still;
    py -= Math.abs(Math.cos(this.bobPhase)) * 0.009 * this.bobAmp * still;
    rz += Math.sin(this.bobPhase) * 0.025 * this.bobAmp * still;
    py += Math.sin(this.time * 1.7) * 0.0012;            // respiração
    if (!s.onGround) py += clamp(-s.vy * 0.002, -0.015, 0.02);
    if (s.crouch) { py += 0.008; px -= 0.006; }

    // correndo (Shift): a arma baixa e vira para o lado, balançando mais
    this.sprintBlend += ((s.sprint && this.reloadT < 0 && !s.firing ? 1 : 0) - this.sprintBlend) * Math.min(1, dt * 7);
    const sb = this.sprintBlend;
    if (sb > 0.001) {
      px -= 0.025 * sb; py -= 0.035 * sb; pz += 0.02 * sb; rx -= 0.32 * sb; ry += 0.55 * sb; rz += 0.25 * sb;
      px += Math.sin(this.bobPhase) * 0.012 * sb; py -= Math.abs(Math.cos(this.bobPhase)) * 0.014 * sb; rx += Math.cos(this.bobPhase * 2) * 0.03 * sb;
    }

    // atraso da arma ao mover o mouse
    this.swayX += (clamp(-s.lookDX * 0.0005, -0.05, 0.05) - this.swayX) * Math.min(1, dt * 9);
    this.swayY += (clamp(s.lookDY * 0.0005, -0.05, 0.05) - this.swayY) * Math.min(1, dt * 9);
    px += this.swayX * 0.5 * still; py += this.swayY * 0.5 * still; ry += this.swayX * 1.4 * still; rx += this.swayY * 1.2 * still;

    // coice do tiro
    this.kick *= Math.exp(-13 * dt);
    pz += this.kick * 0.03 * (1 - ab * 0.4); rx += this.kick * 0.06 * (1 - ab * 0.6); py += this.kick * 0.006 * (1 - ab * 0.6);

    // arremesso da granada: puxa para trás, lança e a mão sai da tela
    if (this.throwT >= 0) {
      this.throwT += dt / 0.75;
      const t = this.throwT;
      if (t >= 1) { this.throwT = -1; this.cur.holder.visible = true; this.drawT = 0; }
      else {
        const back = t < 0.3 ? ease(t / 0.3) : 1 - ease((t - 0.3) / 0.14);
        px += 0.04 * back; py += 0.09 * back; pz += 0.12 * back; rx += 0.7 * back;
        if (t >= 0.3) { const f = ease((t - 0.3) / 0.14); px -= 0.03 * f; py += 0.03 * f; pz -= 0.12 * f; rx -= 0.5 * f; }
        if (t >= 0.44) py -= 0.35 * ease((t - 0.44) / 0.4);
      }
    }
    // golpe da faca
    if (this.slashT >= 0) {
      this.slashT += dt;
      const t = this.slashT / 0.38;
      if (t >= 1) this.slashT = -1;
      else { const k = Math.sin(t * Math.PI); ry -= k * 0.9; rx -= k * 0.25; px -= k * 0.07; pz -= k * 0.06; rz += k * 0.3; }
    }

    // sacar a arma
    if (this.drawT < 1) {
      this.drawT = Math.min(1, this.drawT + dt / 0.45);
      const e = 1 - Math.pow(1 - this.drawT, 3);
      py -= (1 - e) * 0.2; rx -= (1 - e) * 0.8;
    }

    // recarregar: a mão esquerda tira o carregador, ele cai, ela traz outro e encaixa
    if (this.reloadT >= 0) {
      this.reloadT += dt / this.reloadDur;
      const t = this.reloadT, c = this.cur;
      if (t >= 1) this.cancelReload();
      else {
        const [g, d, roll, pitch, y, x, z, m] = track(RELOAD_KEYS, t);
        rz += roll; rx += pitch; py += y; px += x; pz += z;
        if (c.mag && c.lh && c.grab) {
          if (t >= 0.22 && !c.dropped) { c.mag.position.copy(c.magBase).addScaledVector(RELOAD_DOWN, 0.95); this.spawnDebris(); c.dropped = true; }
          c.lh.position.copy(c.grab).multiplyScalar(g).addScaledVector(RELOAD_DOWN, d).add(c.lhBase);
          c.mag.visible = !(t >= 0.22 && t < 0.4);
          c.mag.position.copy(c.magBase).addScaledVector(RELOAD_DOWN, Math.max(0, m));
        }
      }
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]; d.life -= dt;
      if (d.life <= 0) { d.parent.remove(d.obj); this.debris.splice(i, 1); continue; }
      d.v.y -= 2.2 * dt; d.obj.position.addScaledVector(d.v, dt); d.obj.rotation.z -= dt * 3;
    }

    const h = this.cur.holder;
    h.position.set(px, py, pz); h.rotation.set(rx, ry, rz); h.scale.setScalar(this.cur.ads ? P.scale + (this.cur.ads.scale - P.scale) * this.adsBlend : P.scale);   // mirando, a arma volta ao tamanho em que a mira foi ajustada
    const AP = this.cur.armPose;
    if (this.cur.armR) poseArm(this.cur.armR, AP.R);
    if (this.cur.armL) poseArm(this.cur.armL, AP.L);
    if (this.cur.projectile && this.cur.mag) this.cur.mag.visible = this.cur.loaded;   // foguete/flecha só aparece carregado
    if (this.cur.setDraw) {   // arco: a corda solta na hora do tiro e é puxada de novo quando a flecha encaixa
      const c = this.cur, want = c.loaded ? 1 : 0;
      c.draw += (want - c.draw) * Math.min(1, dt * (want < c.draw ? 30 : 4));
      c.setDraw(c.draw);
      if (c.lh) c.lh.position.x = c.lhBase.x - c.draw * c.drawReach;   // a mão acompanha o nock
    }

    // clarão do disparo
    this.flashT -= dt;
    if (this.cur.flash) this.cur.flash.visible = this.flashT > 0;
    if (this.cur.backFlash) this.cur.backFlash.visible = this.flashT > -0.04;   // o escape queima um pouco mais
    this.flashLight.intensity = this.flashT > 0 ? 4 : 0;
    this.root.visible = s.visible;
  }
  render(renderer, mainCamera) {
    this.camera.aspect = mainCamera.aspect; this.camera.updateProjectionMatrix();
    const inv = mainCamera.quaternion.clone().invert();
    this.sun.position.copy(this.sunDir).applyQuaternion(inv).multiplyScalar(5);
    renderer.render(this.scene, this.camera);
  }
}

// Modelo da arma sozinho (sem mãos), em tamanho real: usado nos bonecos em terceira pessoa.
export function buildWeaponModel(key) {
  const kind = KIND[key];
  if (kind === 'nade') { const w = buildNade(key); w.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); return w; }
  const w = (key === 'awp' && buildAWPPro()) || (kind !== 'knife' && !SPECIAL[key] && makeGunFromModel(key, { suppressor: M.metalDark, silver: M.silver })) || (key === 'ak47' ? buildAK() : key === 'm4a4' ? buildM4() : key === 'awp' ? buildAWP() : key === 'rpg' ? buildRPG() : key === 'bow' ? buildBow() : kind === 'pistol' ? buildPistol(key) : buildKnife());
  w.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return w;
}
