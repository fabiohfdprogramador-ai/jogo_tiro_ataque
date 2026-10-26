// Detalhes de rua do Bairro: pichações, trepadeiras, lixo nas calçadas, manchas no asfalto e luminárias nos postes.
// Tudo decorativo (sem colisão) e montado com sorteio fixo, para todo mundo ver o mesmo bairro.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- pichações: letras gordas com contorno, sombra e escorridos ----------
const TAGS = ['ZÉ 27', 'VILA', 'CRIA', 'NOIZ', 'PAZ', 'FÉ', 'BAIRRO', 'RUA 9', 'TMJ', 'LOKO', 'MANO', 'ZN'];
const INKS = [['#e8473c', '#1a1a1a'], ['#f2c230', '#2a1a10'], ['#3fa7e0', '#0c1a2a'], ['#e9e6dc', '#202020'], ['#5fc56a', '#102010'], ['#d050c8', '#200820'], ['#111111', '#e0e0e0']];
function graffitiTex(seed) {
  const r = rand(seed);
  return canvasTex(512, 256, (g, w, h) => {
    const text = TAGS[(r() * TAGS.length) | 0], [fill, line] = INKS[(r() * INKS.length) | 0];
    const size = 110 + r() * 40;
    g.translate(w / 2, h / 2); g.rotate((r() - 0.5) * 0.25);
    g.font = `900 ${size}px Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 26; g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeText(text, 8, 10);      // sombra
    g.lineWidth = 18; g.strokeStyle = line; g.strokeText(text, 0, 0);                    // contorno
    g.fillStyle = fill; g.fillText(text, 0, 0);
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.55)'; g.strokeText(text, -3, -4);  // brilho do spray
    // escorridos de tinta
    g.fillStyle = fill;
    for (let i = 0; i < 9; i++) { const x = (r() - 0.5) * w * 0.7, y = size * 0.3, len = 10 + r() * 50; g.fillRect(x, y, 3 + r() * 3, len); g.beginPath(); g.arc(x + 2.5, y + len, 3.5, 0, Math.PI * 2); g.fill(); }
    // spray espalhado nas bordas
    for (let i = 0; i < 900; i++) { g.globalAlpha = 0.25 * r(); g.fillRect((r() - 0.5) * w * 0.9, (r() - 0.5) * h * 0.8, 2, 2); }
    g.globalAlpha = 1;
  });
}
// ---------- trepadeira: folhas sobre fundo transparente, mais densa embaixo ----------
function vineTex(seed) {
  const r = rand(seed);
  return canvasTex(256, 512, (g, w, h) => {
    for (let i = 0; i < 520; i++) {
      const y = h * Math.pow(r(), 0.6), x = w / 2 + (r() - 0.5) * w * (0.4 + (y / h) * 0.6);
      const s = 7 + r() * 9, a = r() * Math.PI * 2;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = ['#2f5a24', '#3d7330', '#24461c', '#4f8a3a', '#56692c'][(r() * 5) | 0];
      g.beginPath(); g.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke();
      g.restore();
    }
    g.strokeStyle = '#3a2a18'; g.lineWidth = 3;   // galhos
    for (let i = 0; i < 6; i++) { g.beginPath(); let x = w / 2 + (r() - 0.5) * 40; g.moveTo(x, h); for (let y = h; y > h * 0.1; y -= 30) { x += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  });
}
// ---------- mancha no chão (óleo, sujeira, umidade) ----------
const stainTex = canvasTex(256, 256, (g, w) => {
  const r = rand(5);
  for (let i = 0; i < 18; i++) {
    const x = w / 2 + (r() - 0.5) * w * 0.5, y = w / 2 + (r() - 0.5) * w * 0.5, rad = 20 + r() * 60, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(20,18,14,.35)'); gr.addColorStop(1, 'rgba(20,18,14,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }
});
// ---------- poça de luz do poste (no chão, à noite) ----------
const poolTex = canvasTex(256, 256, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,214,150,.75)'); gr.addColorStop(0.45, 'rgba(255,190,120,.3)'); gr.addColorStop(1, 'rgba(255,170,100,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
const glowTex = canvasTex(128, 128, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(0.25, 'rgba(255,200,130,.6)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});

// plano vertical colado numa face (normal n), centrado em (x, y, z)
function facePlane(w, h, x, y, z, n) {
  const g = new THREE.PlaneGeometry(w, h);
  g.lookAt(new THREE.Vector3(n[0], 0, n[1]));
  g.translate(x + n[0] * 0.025, y, z + n[1] * 0.025);
  return g;
}

export function addStreetDetails(group, MAP) {
  const r = rand(4242);
  const streets = MAP.streets || [];
  // distância de um ponto (x, z) até a rua mais perto (0 dentro da rua)
  const streetDist = (x, z) => {
    let d = Infinity;
    for (const [x0, z0, x1, z1] of streets) { const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1); d = Math.min(d, Math.hypot(dx, dz)); }
    return d;
  };

  // --- pichações e trepadeiras nas faces de casas e muros que dão para a rua
  const graffitiMats = Array.from({ length: 8 }, (_, i) => new THREE.MeshStandardMaterial({ map: graffitiTex(101 + i * 37), transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  const vineMats = [0, 1].map(i => new THREE.MeshStandardMaterial({ map: vineTex(7 + i * 13), transparent: true, alphaTest: 0.35, roughness: 0.85, side: THREE.DoubleSide }));
  const gGeos = graffitiMats.map(() => []), vGeos = vineMats.map(() => []);
  for (const b of MAP.boxes) {
    if (b.mat !== 'house' && b.mat !== 'muro' && b.mat !== 'brickwall') continue;
    const [x0, , z0] = b.min, [x1, y1, z1] = b.max;
    const faces = [
      { n: [0, -1], p: (t) => [x0 + (x1 - x0) * t, z0], L: x1 - x0 }, { n: [0, 1], p: (t) => [x0 + (x1 - x0) * t, z1], L: x1 - x0 },
      { n: [-1, 0], p: (t) => [x0, z0 + (z1 - z0) * t], L: z1 - z0 }, { n: [1, 0], p: (t) => [x1, z0 + (z1 - z0) * t], L: z1 - z0 },
    ];
    for (const f of faces) {
      if (f.L < 2.5) continue;
      const [mx, mz] = f.p(0.5);
      if (streetDist(mx + f.n[0] * 2.5, mz + f.n[1] * 2.5) > 1.5) continue;   // só a frente que dá para a rua
      if (r() < (b.mat === 'house' ? 0.38 : 0.7)) {
        const w = Math.min(f.L - 0.6, 1.6 + r() * 1.8), t = 0.15 + r() * 0.7, [px, pz] = f.p(t);
        const i = (r() * graffitiMats.length) | 0;
        gGeos[i].push(facePlane(w, w * 0.5, px, 0.9 + r() * Math.min(1.2, y1 - 2), pz, f.n));
      }
      if (r() < (b.mat === 'house' ? 0.14 : 0.45)) {
        const w = 1 + r() * 1.4, hh = Math.min(y1 - 0.2, 1.8 + r() * 1.6), t = 0.1 + r() * 0.8, [px, pz] = f.p(t);
        const i = (r() * vineMats.length) | 0;
        vGeos[i].push(facePlane(w, hh, px + f.n[0] * 0.02, hh / 2, pz + f.n[1] * 0.02, f.n));
      }
    }
  }
  const addMerged = (geos, mat, shadow = false) => { if (!geos.length) return; const m = new THREE.Mesh(mergeGeometries(geos), mat); m.receiveShadow = true; m.castShadow = shadow; group.add(m); };
  gGeos.forEach((g, i) => addMerged(g, graffitiMats[i]));
  vGeos.forEach((g, i) => addMerged(g, vineMats[i], true));

  // --- lixo na beira das ruas: sacos pretos amarrados, papéis, latinhas, e manchas no asfalto
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.35, metalness: 0.1 });
  const bagBlue = new THREE.MeshStandardMaterial({ color: 0x1d3b6e, roughness: 0.4, metalness: 0.1 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.95, side: THREE.DoubleSide });
  const canMat = new THREE.MeshStandardMaterial({ color: 0xb42020, roughness: 0.35, metalness: 0.8 });
  const stainMat = new THREE.MeshBasicMaterial({ map: stainTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const bags = [[], []], papers = [], cans = [], stains = [];
  const bagGeo = () => {   // saco cheio: esfera amassada com o nó em cima
    const g = new THREE.IcosahedronGeometry(0.3, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 + (Math.sin(p.getX(i) * 13 + y * 7) * 0.12) - Math.max(0, -y) * 0.3; p.setXYZ(i, p.getX(i) * k, y * (y < 0 ? 0.55 : 0.9), p.getZ(i) * k); }
    g.computeVertexNormals();
    const knot = new THREE.ConeGeometry(0.06, 0.16, 6); knot.translate(0, 0.32, 0);
    return mergeGeometries([g.toNonIndexed(), knot.toNonIndexed()]);
  };
  for (const [x0, z0, x1, z1] of streets) {
    const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0;
    for (let k = 0; k < len / 5; k++) {
      const t = r(), side = r() < 0.5 ? 0 : 1, off = 0.25 + r() * 0.5;
      const x = alongX ? x0 + t * (x1 - x0) : (side ? x1 - off : x0 + off), z = alongX ? (side ? z1 - off : z0 + off) : z0 + t * (z1 - z0);
      const kind = r();
      if (kind < 0.18) {   // sacos de lixo (às vezes em grupo)
        const n = 1 + ((r() * 3) | 0);
        for (let j = 0; j < n; j++) { const g = bagGeo(); g.rotateY(r() * 6); g.scale(0.8 + r() * 0.5, 0.8 + r() * 0.4, 0.8 + r() * 0.5); g.translate(x + (r() - 0.5) * 0.7, 0.16, z + (r() - 0.5) * 0.7); bags[r() < 0.75 ? 0 : 1].push(g); }
      } else if (kind < 0.6) {   // papel amassado / folheto
        const g = new THREE.PlaneGeometry(0.18 + r() * 0.2, 0.12 + r() * 0.15); g.rotateX(-Math.PI / 2 + (r() - 0.5) * 0.3); g.rotateY(r() * 6); g.translate(x, 0.012, z); papers.push(g);
      } else if (kind < 0.75) {  // latinha deitada
        const g = new THREE.CylinderGeometry(0.033, 0.033, 0.12, 10); g.rotateZ(Math.PI / 2); g.rotateY(r() * 6); g.translate(x, 0.035, z); cans.push(g);
      }
    }
    for (let k = 0; k < len / 9; k++) {   // manchas no asfalto
      const s = 1.2 + r() * 2.5, g = new THREE.PlaneGeometry(s, s); g.rotateX(-Math.PI / 2); g.rotateY(r() * 6);
      g.translate(x0 + r() * (x1 - x0), 0.006, z0 + r() * (z1 - z0)); stains.push(g);
    }
  }
  addMerged(bags[0], bagMat, true); addMerged(bags[1], bagBlue, true);
  addMerged(papers, paperMat); addMerged(cans, canMat); addMerged(stains, stainMat);

  // --- luminárias nos postes (acendem no fim de tarde e à noite)
  const armMat = new THREE.MeshStandardMaterial({ color: 0x5c5f62, roughness: 0.6, metalness: 0.5 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: 0.4 });
  const arms = [], heads = [], lamps = [];
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const pools = [];
  for (const b of MAP.boxes) {
    if (b.mat !== 'pole') continue;
    const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2, top = b.max[1];
    // braço para o lado da rua mais perto
    let dir = [1, 0], best = Infinity;
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const sd = streetDist(cx + d[0] * 3, cz + d[1] * 3); if (sd < best) { best = sd; dir = d; } }
    const ax = cx + dir[0] * 1.6, az = cz + dir[1] * 1.6, ay = top - 1.1;
    const arm = new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8); arm.rotateZ(Math.PI / 2); if (dir[0] === 0) arm.rotateY(Math.PI / 2);
    arm.translate((cx + ax) / 2, ay + 0.15, (cz + az) / 2); arms.push(arm);
    const head = new THREE.BoxGeometry(dir[0] ? 0.55 : 0.24, 0.1, dir[0] ? 0.24 : 0.55); head.translate(ax, ay + 0.1, az); arms.push(head);
    const bulb = new THREE.BoxGeometry(dir[0] ? 0.45 : 0.18, 0.03, dir[0] ? 0.18 : 0.45); bulb.translate(ax, ay + 0.035, az); heads.push(bulb);
    const pool = new THREE.PlaneGeometry(9, 9); pool.rotateX(-Math.PI / 2); pool.translate(ax, 0.02, az); pools.push(pool);
    const glow = new THREE.Sprite(glowMat); glow.position.set(ax, ay - 0.05, az); glow.scale.setScalar(1.6); group.add(glow); lamps.push(glow);
  }
  addMerged(arms, armMat, true); addMerged(heads, lampMat);
  if (pools.length) { const m = new THREE.Mesh(mergeGeometries(pools), poolMat); m.renderOrder = 1; group.add(m); }
  // liga/desliga as luminárias (0 = apagadas, 1 = noite)
  return {
    setLamps(k) {
      lampMat.emissiveIntensity = 3 * k; poolMat.opacity = 0.55 * k; glowMat.opacity = 0.9 * k;
      for (const g of lamps) g.visible = k > 0.01;
    },
  };
}
