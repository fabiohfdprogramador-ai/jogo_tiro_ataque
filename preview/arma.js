// View-model em primeira pessoa: AK-47 + mãos com luvas e mangas.
// Coordenadas da arma em metros: +x = frente (cano), +y = cima, +z = lado direito.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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

const camoMap = canvasTex(1024, (g, s) => {
  const r = rand(53);
  g.fillStyle = '#8c7b5a'; g.fillRect(0, 0, s, s);
  const blob = (col, n, size) => {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const cx = r() * s, cy = r() * s; g.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.35) { const rr = size * (0.5 + r() * 0.6); g.lineTo(cx + Math.cos(a) * rr * 1.6, cy + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
  };
  blob('#a8956c', 40, 60); blob('#6b5a3d', 35, 45); blob('#5a5e3e', 25, 38); blob('#3f3527', 18, 22);
  for (let y = 0; y < s; y += 2) { g.fillStyle = y % 4 ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.04)'; g.fillRect(0, y, s, 1); }
  speckle(g, s, r, 40000, ['#2b2418', '#c4b08a'], .25, 1.5);
});
camoMap.repeat.set(2, 2);

// ---------- materiais ----------
const M = {
  metal: new THREE.MeshPhysicalMaterial({ map: metalMap, roughnessMap: metalRough, color: 0xffffff, metalness: 0.8, roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.45 }),
  metalDark: new THREE.MeshPhysicalMaterial({ map: metalMap, roughnessMap: metalRough, color: 0x9a9a9a, metalness: 0.75, roughness: 0.6, envMapIntensity: 0.45 }),
  wood: new THREE.MeshPhysicalMaterial({ map: woodMap, color: 0xb88068, bumpMap: woodMap, bumpScale: 0.6, roughness: 0.55, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.5 }),
  bakelite: new THREE.MeshPhysicalMaterial({ color: 0x2a140c, roughness: 0.5, clearcoat: 0.15, envMapIntensity: 0.4, bumpMap: metalRough, bumpScale: 0.3 }),
  glove: new THREE.MeshStandardMaterial({ map: fabricMap, bumpMap: fabricMap, bumpScale: 1.2, roughness: 0.92 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x1a1a19, roughness: 0.55, bumpMap: metalRough, bumpScale: 0.5 }),
  sleeve: new THREE.MeshStandardMaterial({ map: camoMap, bumpMap: camoMap, bumpScale: 1.5, roughness: 0.95 }),
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
  const geo = new THREE.CylinderGeometry(r1, r0, d.length(), 28, 14, true);
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
  add(extrude(mag, 0.028, 0.004, M.metalDark));
  for (let i = 0; i < 5; i++) {             // nervuras do carregador
    const t = 0.15 + i * 0.16, x = 0.04 + t * 0.075 + t * t * 0.03, y = -0.04 - t * 0.24;
    const rib = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.006, 0.04, 2, 0.002), M.metalDark);
    rib.position.set(x + 0.035, y, 0); rib.rotation.z = -0.35 - t * 0.35; add(rib);
  }
  const fp = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.012, 0.038, 2, 0.004), M.metal);
  fp.position.set(0.152, -0.302, 0); fp.rotation.z = 0.32; add(fp);

  // guarda-mato e gatilho
  add(tube([[0.03, -0.034], [0.028, -0.062], [-0.01, -0.07], [-0.045, -0.06], [-0.055, -0.036]].map(([x, y]) => [x, y, 0]), 0.0035, M.metal, false));
  add(tube([[0.0, -0.036, 0], [0.006, -0.05, 0], [0.002, -0.06, 0]], 0.003, M.metal));
  // empunhadura (baquelite)
  add(extrude(roundedShape([[-0.07, -0.034], [-0.03, -0.034], [-0.05, -0.1], [-0.068, -0.158], [-0.108, -0.155], [-0.095, -0.1]], 0.014), 0.03, 0.007, M.bakelite));
  // coronha de madeira
  add(extrude(roundedShape([[-0.145, 0.024], [-0.2, 0.02], [-0.44, 0.002], [-0.48, 0.0], [-0.48, -0.128], [-0.455, -0.13], [-0.25, -0.07], [-0.145, -0.036]], 0.012), 0.036, 0.009, M.wood));
  add(extrude(roundedShape([[-0.492, 0.002], [-0.48, 0.002], [-0.48, -0.132], [-0.492, -0.132]], 0.004), 0.048, 0.002, M.metal));

  ak.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return ak;
}

// ---------- mãos ----------
function buildHands() {
  const h = new THREE.Group();
  const add = (m) => { h.add(m); return m; };
  const gripCx = (y) => -0.05 + (y + 0.034) * 0.33;   // centro da empunhadura em cada altura

  // MÃO DIREITA na empunhadura
  for (const [y, r] of [[-0.072, 0.0105], [-0.098, 0.0102], [-0.124, 0.0092]]) {
    const cx = gripCx(y);
    add(tube([[cx - 0.008, y + 0.004, 0.036], [cx + 0.02, y, 0.034], [cx + 0.036, y - 0.002, 0.012], [cx + 0.034, y - 0.004, -0.014], [cx + 0.02, y - 0.006, -0.03]], r, M.glove));
    const kn = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.016, 0.012, 2, 0.004), M.leather);
    kn.position.set(cx + 0.03, y, 0.03); kn.rotation.y = -0.6; add(kn);
  }
  // indicador no gatilho
  add(tube([[gripCx(-0.05) - 0.004, -0.048, 0.038], [0.002, -0.045, 0.036], [0.018, -0.05, 0.022], [0.016, -0.06, 0.006], [0.006, -0.063, 0.0]], 0.0098, M.glove));
  // palma / dorso da mão
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.1, 0.034, 4, 0.014), M.glove);
  palm.position.set(gripCx(-0.095) - 0.018, -0.092, 0.04); palm.rotation.set(0.0, 0.25, -0.32); add(palm);
  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.07, 0.01, 3, 0.004), M.leather);
  pad.position.set(gripCx(-0.095) - 0.016, -0.09, 0.059); pad.rotation.set(0, 0.25, -0.32); add(pad);
  // polegar por cima, lado esquerdo
  add(tube([[-0.088, -0.062, 0.03], [-0.104, -0.056, 0.0], [-0.088, -0.05, -0.03], [-0.05, -0.046, -0.036], [-0.03, -0.047, -0.034]], 0.0115, M.glove));
  // punho e manga direita
  add(ringAt([-0.11, -0.13, 0.05], [-0.35, -0.85, 0.3], 0.034, 0.012, M.leather));
  add(sleeveSeg([-0.11, -0.13, 0.05], [-0.15, -0.22, 0.08], 0.032, 0.037, M.glove, 4));
  add(ringAt([-0.15, -0.22, 0.08], [-0.35, -0.85, 0.3], 0.043, 0.012, M.sleeve));
  add(sleeveSeg([-0.15, -0.22, 0.08], [-0.3, -0.6, 0.2], 0.044, 0.056, M.sleeve, 7));

  // MÃO ESQUERDA no guarda-mão
  for (const [x, r] of [[0.238, 0.0105], [0.262, 0.0108], [0.286, 0.0105], [0.308, 0.0095]]) {
    add(tube([[x - 0.004, -0.05, -0.022], [x, -0.058, 0.004], [x + 0.004, -0.046, 0.034], [x + 0.008, -0.018, 0.046], [x + 0.01, 0.008, 0.042]], r, M.glove));
  }
  const lpalm = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.036, 0.07, 4, 0.014), M.glove);
  lpalm.position.set(0.258, -0.054, -0.03); lpalm.rotation.set(-0.5, 0, 0.05); add(lpalm);
  const lpad = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.01, 0.05, 3, 0.004), M.leather);
  lpad.position.set(0.258, -0.074, -0.04); lpad.rotation.set(-0.5, 0, 0.05); add(lpad);
  add(tube([[0.22, -0.05, -0.05], [0.25, -0.025, -0.052], [0.285, -0.006, -0.046], [0.305, 0.002, -0.04]], 0.0115, M.glove));
  // punho e manga esquerda
  add(ringAt([0.21, -0.075, -0.05], [-0.7, -0.4, -0.35], 0.034, 0.012, M.leather));
  add(sleeveSeg([0.21, -0.075, -0.05], [0.08, -0.15, -0.12], 0.032, 0.037, M.glove, 11));
  add(ringAt([0.08, -0.15, -0.12], [-0.7, -0.4, -0.4], 0.043, 0.012, M.sleeve));
  add(sleeveSeg([0.08, -0.15, -0.12], [-0.25, -0.38, -0.3], 0.044, 0.056, M.sleeve, 13));

  return h;
}

export function createViewModel() {
  const vm = new THREE.Group();
  const inner = new THREE.Group();          // no espaço da arma: +x = frente
  inner.add(buildAK(), buildHands());
  inner.rotation.y = Math.PI / 2;           // +x da arma -> -z da câmera
  vm.add(inner);
  // luz de preenchimento só para o view-model (estilo CS)
  const fill = new THREE.PointLight(0xfff1dc, 0.6, 1.5); fill.position.set(0.3, 0.3, 0.2); vm.add(fill);
  return vm;
}
