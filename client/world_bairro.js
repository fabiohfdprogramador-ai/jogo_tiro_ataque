// Mapa "Bairro" em 3D: ruas de bloquete, calçadas com meio-fio, casas coloridas (reboco e tijolo),
// campo com alambrado, bar e restaurante, praça com parquinho, igreja azul, terreno baldio e postes com fios.
// Tudo gerado por código (texturas em canvas). As colisões vêm de shared/map.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(size, draw, repeat = 1, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function speckle(g, s, r, n, colors, a) {
  for (let i = 0; i < n; i++) { g.globalAlpha = a * r(); g.fillStyle = colors[(r() * colors.length) | 0]; const w = 1 + r() * 2.5; g.fillRect(r() * s, r() * s, w, w); }
  g.globalAlpha = 1;
}

// bloquete de concreto (20 x 10 cm, desencontrado) — 1 textura = 1 m
const paverTex = () => canvasTex(512, (g, s) => {
  const r = rand(5), bw = s / 5, bh = s / 10;
  g.fillStyle = '#4a4744'; g.fillRect(0, 0, s, s);
  for (let row = 0; row < 10; row++) for (let col = -1; col < 6; col++) {
    const x = col * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
    const v = 140 + ((r() - 0.5) * 30) | 0;
    g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 2, y + 2, bw - 4, 2);
  }
  speckle(g, s, r, 9000, ['#5c5853', '#b9b4ad', '#7a756f'], 0.35);
});
const concreteTex = () => canvasTex(512, (g, s) => {
  const r = rand(31);
  g.fillStyle = '#b3b0aa'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) { const x = r() * s, y = r() * s, rad = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(120,115,105,.25)' : 'rgba(210,205,198,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = 'rgba(70,65,60,.55)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  speckle(g, s, r, 12000, ['#8a857e', '#d6d2cb'], 0.35);
});
const plasterTex = () => canvasTex(512, (g, s) => {   // reboco claro (a cor vem dos vértices)
  const r = rand(11);
  g.fillStyle = '#e8e6e2'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) { const x = r() * s, y = r() * s, rad = 15 + r() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.6 ? 'rgba(150,140,125,.22)' : 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = 'rgba(90,80,65,.35)'; g.lineWidth = 1.2;   // rachaduras finas
  for (let i = 0; i < 8; i++) { let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += r() * 25; g.lineTo(x, y); } g.stroke(); }
  // escorrido de sujeira embaixo
  const gr = g.createLinearGradient(0, s * 0.75, 0, s); gr.addColorStop(0, 'rgba(90,80,60,0)'); gr.addColorStop(1, 'rgba(90,80,60,.25)'); g.fillStyle = gr; g.fillRect(0, s * 0.75, s, s * 0.25);
  speckle(g, s, r, 14000, ['#9a9080', '#ffffff'], 0.3);
});
const brickTex = () => canvasTex(512, (g, s) => {
  const r = rand(9), bw = s / 4, bh = s / 12;
  g.fillStyle = '#a8a094'; g.fillRect(0, 0, s, s);
  for (let row = 0; row < 12; row++) for (let col = -1; col < 5; col++) {
    const x = col * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
    g.fillStyle = `rgb(${150 + r() * 40 | 0},${70 + r() * 22 | 0},${48 + r() * 15 | 0})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
  }
  speckle(g, s, r, 9000, ['#5a2a1a', '#d89a7a'], 0.3);
});
const grassTex = () => canvasTex(512, (g, s) => {
  const r = rand(53);
  g.fillStyle = '#5d7a32'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) { const x = r() * s, y = r() * s, rad = 20 + r() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, ['rgba(120,140,60,.35)', 'rgba(70,95,35,.35)', 'rgba(140,120,70,.3)'][(r() * 3) | 0]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.lineWidth = 1;
  for (let i = 0; i < 9000; i++) { const x = r() * s, y = r() * s; g.strokeStyle = r() < 0.5 ? 'rgba(40,60,20,.5)' : 'rgba(150,175,80,.45)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5); g.stroke(); }
}, 1);
const dirtTex = () => canvasTex(256, (g, s) => {
  const r = rand(61); g.fillStyle = '#8a7356'; g.fillRect(0, 0, s, s);
  speckle(g, s, r, 8000, ['#6a5638', '#a88e6a', '#5a4a30'], 0.5);
});
const roofTex = () => canvasTex(256, (g, s) => {   // telha de barro
  const r = rand(71);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const x = col * s / 8 + (row % 2 ? s / 16 : 0), y = row * s / 8;
    const gr = g.createLinearGradient(x, y, x, y + s / 8);
    const c = 150 + r() * 30 | 0;
    gr.addColorStop(0, `rgb(${c},${c * 0.45 | 0},${c * 0.3 | 0})`); gr.addColorStop(1, `rgb(${c * 0.7 | 0},${c * 0.3 | 0},${c * 0.2 | 0})`);
    g.fillStyle = gr; g.fillRect(x, y, s / 8 - 1, s / 8 - 1);
  }
  speckle(g, s, r, 3000, ['#3a2010', '#d8a080'], 0.3);
});
const chainTex = () => {
  const t = canvasTex(128, (g, s) => {
    g.clearRect(0, 0, s, s); g.strokeStyle = 'rgba(70,74,72,1)'; g.lineWidth = 2;
    for (let i = -s; i < s * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); g.beginPath(); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
  });
  return t;
};
const rollupTex = () => canvasTex(256, (g, s) => {
  for (let y = 0; y < s; y += 10) { const gr = g.createLinearGradient(0, y, 0, y + 10); gr.addColorStop(0, '#9a9da2'); gr.addColorStop(0.5, '#c8cbd0'); gr.addColorStop(1, '#7a7d82'); g.fillStyle = gr; g.fillRect(0, y, s, 10); }
  speckle(g, s, rand(3), 3000, ['#6a6050', '#e0e0e0'], 0.3);
});
const frondTex = () => canvasTex(128, (g, s) => {   // folha de coqueiro
  g.clearRect(0, 0, s, s); const r = rand(3);
  g.strokeStyle = '#7a7038'; g.lineWidth = 3; g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.stroke();
  for (let y = 6; y < s; y += 5) {
    const len = (s / 2 - 4) * Math.sin((y / s) * Math.PI * 0.95 + 0.15);
    const c = 60 + r() * 40 | 0;
    g.strokeStyle = `rgb(${c * 0.6 | 0},${c + 30},${c * 0.35 | 0})`; g.lineWidth = 3;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(s / 2, y); g.lineTo(s / 2 + sd * len, y + len * 0.5); g.stroke(); }
  }
}, 1);
const foliageTex = () => canvasTex(256, (g, s) => {
  g.clearRect(0, 0, s, s); const r = rand(51);
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * s * 0.45;
    const x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d;
    const c = 60 + r() * 50 | 0;
    g.fillStyle = `rgb(${c * 0.55 | 0},${c + 25},${c * 0.3 | 0})`;
    g.beginPath(); g.ellipse(x, y, 5 + r() * 5, 3 + r() * 3, r() * 3, 0, 7); g.fill();
  }
});
const label = (txt, color, size = 256) => canvasTex(size, (g, s) => {
  g.clearRect(0, 0, s, s); g.font = `bold ${s * 0.7}px Arial`; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, s / 2, s * 0.55);
});

const HOUSE_COLORS = [0xf2ede0, 0xeceae6, 0xd2e6cc, 0xf5cdb8, 0xcde0f2, 0xf7e08a, 0xdccbe8, 0xf7b896, 0xbcd9c0, 0xe58a80, 0xf2f0c0];

export function buildBairro(group, MAP, sunLight) {
  const T = {
    paver: paverTex(), concrete: concreteTex(), plaster: plasterTex(), brick: brickTex(), grass: grassTex(), dirt: dirtTex(),
    roof: roofTex(), chain: chainTex(), rollup: rollupTex(), frond: frondTex(), foliage: foliageTex(),
  };
  const M = {
    paver: new THREE.MeshStandardMaterial({ map: T.paver, roughness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ map: T.concrete, roughness: 0.92 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xd8d5ce, roughness: 0.9 }),
    plaster: new THREE.MeshStandardMaterial({ map: T.plaster, vertexColors: true, roughness: 0.95 }),
    brick: new THREE.MeshStandardMaterial({ map: T.brick, vertexColors: true, roughness: 0.95 }),
    roof: new THREE.MeshStandardMaterial({ map: T.roof, roughness: 0.8, side: THREE.DoubleSide }),
    grass: new THREE.MeshStandardMaterial({ map: T.grass, roughness: 1 }),
    dirt: new THREE.MeshStandardMaterial({ map: T.dirt, roughness: 1 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xd9bf8c, roughness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf0efea, roughness: 0.7 }),
    church: new THREE.MeshStandardMaterial({ color: 0x9cc0e6, roughness: 0.8 }),
    churchDark: new THREE.MeshStandardMaterial({ color: 0x2a4c8c, roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.08, metalness: 0.5 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.35, metalness: 0.6 }),
    rollup: new THREE.MeshStandardMaterial({ map: T.rollup, roughness: 0.45, metalness: 0.5 }),
    doorBlue: new THREE.MeshStandardMaterial({ color: 0x3a6ea0, roughness: 0.6 }),
    doorWood: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8 }),
    tank: new THREE.MeshStandardMaterial({ color: 0x2f6fb8, roughness: 0.4 }),
    fenceGreen: new THREE.MeshStandardMaterial({ color: 0x1f4a28, roughness: 0.5, metalness: 0.3 }),
    chain: new THREE.MeshStandardMaterial({ map: T.chain, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe8c020, roughness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc02818, roughness: 0.5 }),
    blueToy: new THREE.MeshStandardMaterial({ color: 0x2058c0, roughness: 0.5 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xf06a18, roughness: 0.6 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 1 }),
    frond: new THREE.MeshStandardMaterial({ map: T.frond, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
    foliage: new THREE.MeshStandardMaterial({ map: T.foliage, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }),
    cable: new THREE.LineBasicMaterial({ color: 0x1a1a1a }),
    crate: new THREE.MeshStandardMaterial({ color: 0x8a6237, roughness: 0.85 }),
    awning: new THREE.MeshStandardMaterial({ color: 0xc0302a, roughness: 0.9, side: THREE.DoubleSide }),
  };

  // ---- lotes de geometria juntados por material (poucos desenhos = leve)
  const batches = new Map();
  const put = (mat, geo, shadow = true) => {
    const k = mat.uuid + (shadow ? 's' : 'n');
    if (!batches.has(k)) batches.set(k, { mat, geos: [], shadow });
    batches.get(k).geos.push(geo);
  };
  // caixa com UV em metros (tile = metros por repetição) e cor por vértice opcional
  const boxGeo = (x0, y0, z0, x1, y1, z1, tile = 1, color = null) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
      const su = nx > 0.5 ? d : w, sv = ny > 0.5 ? d : h;
      uv.setXY(i, uv.getX(i) * su / tile, uv.getY(i) * sv / tile);
    }
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (color !== null) {
      const c = new THREE.Color(color), arr = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    return g;
  };
  const box = (mat, x0, y0, z0, x1, y1, z1, tile = 1, color = null, shadow = true) => put(mat, boxGeo(x0, y0, z0, x1, y1, z1, tile, color), shadow);
  const flat = (mat, x0, z0, x1, z1, y, tile = 1) => {   // chão (plano) com UV em metros
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / tile, uv.getY(i) * (z1 - z0) / tile);
    g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    put(mat, g, false);
  };
  const xform = (geo, pos, rotY = 0, rotX = 0, rotZ = 0) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ')).setPosition(pos[0], pos[1], pos[2]);
    geo.applyMatrix4(m); return geo;
  };
  const cyl = (mat, x, y0, z, r0, r1, h, seg = 10, shadow = true) => put(mat, xform(new THREE.CylinderGeometry(r1, r0, h, seg), [x, y0 + h / 2, z]), shadow);
  const bar = (mat, a, b, r, shadow = false) => {   // haste entre dois pontos
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    const g = new THREE.CylinderGeometry(r, r, d.length(), 6);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    g.applyQuaternion(q); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    put(mat, g, shadow);
  };

  const S = MAP.size;
  // ---- chão: concreto em volta, ruas de bloquete com meio-fio
  flat(M.concrete, S.minX - 60, S.minZ - 60, S.maxX + 60, S.maxZ + 60, 0, 1.5);
  for (const [x0, z0, x1, z1] of MAP.streets) {
    const horiz = x1 - x0 > z1 - z0, walk = 1.4;
    const ix0 = horiz ? x0 : x0 + walk, ix1 = horiz ? x1 : x1 - walk, iz0 = horiz ? z0 + walk : z0, iz1 = horiz ? z1 - walk : z1;
    flat(M.paver, ix0, iz0, ix1, iz1, 0.012, 1);
    if (horiz) { box(M.curb, x0, 0, iz0 - 0.14, x1, 0.1, iz0, 1, null, false); box(M.curb, x0, 0, iz1, x1, 0.1, iz1 + 0.14, 1, null, false); }
    else { box(M.curb, ix0 - 0.14, 0, z0, ix0, 0.1, z1, 1, null, false); box(M.curb, ix1, 0, z0, ix1 + 0.14, 0.1, z1, 1, null, false); }
  }

  // ---- casas
  const rnd = rand(17);
  const roofTri = [];
  const gable = (x0, z0, x1, z1, y, alongZ, rise = 1.3) => {
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const P = alongZ
      ? [[x0, y, z0], [mx, y + rise, z0], [mx, y + rise, z1], [x0, y, z1], [x1, y, z0], [x1, y, z1]]
      : [[x0, y, z0], [x0, y + rise, mz], [x1, y + rise, mz], [x1, y, z0], [x0, y, z1], [x1, y, z1]];
    const tris = alongZ ? [[0, 1, 2], [0, 2, 3], [4, 2, 1], [4, 5, 2], [0, 4, 1], [3, 2, 5]] : [[0, 1, 2], [0, 2, 3], [4, 2, 1], [4, 5, 2], [0, 1, 4], [3, 5, 2]];
    for (const t of tris) for (const i of t) roofTri.push(...P[i]);
  };
  const windowAt = (c, n, t, w = 1.1, h = 1.0, grade = true) => {
    // c = centro na parede; n = normal (para fora); t = direção ao longo da parede
    const B = new THREE.Matrix4().makeBasis(new THREE.Vector3(...t), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n));
    const place = (mat, ox, oy, oz, sx, sy, sz, shadow = false) => {
      const g = new THREE.BoxGeometry(sx, sy, sz); g.applyMatrix4(B); g.translate(c[0] + n[0] * oz + t[0] * ox, c[1] + oy, c[2] + n[2] * oz + t[2] * ox);
      put(mat, g, shadow);
    };
    place(M.alu, 0, 0, 0.03, w + 0.12, h + 0.12, 0.06);
    place(M.glass, 0, 0, 0.065, w, h, 0.02);
    place(M.concrete, 0, -h / 2 - 0.1, 0.1, w + 0.35, 0.08, 0.22);
    if (grade) { for (let k = 0; k < 5; k++) place(M.dark, -w / 2 + 0.1 + k * (w - 0.2) / 4, 0, 0.11, 0.025, h, 0.025); place(M.dark, 0, 0, 0.11, w, 0.025, 0.025); }
  };
  const isStreet = (x, z) => MAP.streets.some(([x0, z0, x1, z1]) => x >= x0 - 0.5 && x <= x1 + 0.5 && z >= z0 - 0.5 && z <= z1 + 0.5);
  const isOpen = (x, z) => Object.values(MAP.areas).some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  const house = (b, solidHouse = true) => {
    const [x0, , z0] = b.min, [x1, h, z1] = b.max;
    const col = HOUSE_COLORS[b.color % HOUSE_COLORS.length];
    const mat = b.brick ? M.brick : M.plaster;
    box(mat, x0, 0, z0, x1, h, z1, b.brick ? 1 : 2.5, b.brick ? 0xffffff : col);
    if (!b.brick) box(M.plaster, x0 - 0.03, 0, z0 - 0.03, x1 + 0.03, 0.5, z1 + 0.03, 2.5, new THREE.Color(col).multiplyScalar(0.7).getHex(), false);   // barrado
    const sx = x1 - x0, sz = z1 - z0;
    if (b.roof) gable(x0 - 0.35, z0 - 0.35, x1 + 0.35, z1 + 0.35, h, sx < sz);
    else {
      box(mat, x0 - 0.06, h, z0 - 0.06, x1 + 0.06, h + 0.4, z1 + 0.06, b.brick ? 1 : 2.5, b.brick ? 0xffffff : new THREE.Color(col).multiplyScalar(0.92).getHex(), false);
      if (rnd() < 0.75) cyl(M.tank, x0 + sx * (0.25 + rnd() * 0.5), h + 0.4, z0 + sz * (0.25 + rnd() * 0.5), 0.62, 0.68, 0.95, 14, false);
    }
    if (!solidHouse) return;
    const floors = Math.max(1, Math.round(h / 3.1));
    const faces = [[[(x0 + x1) / 2, 0, z0], [0, 0, -1], [1, 0, 0], sx], [[(x0 + x1) / 2, 0, z1], [0, 0, 1], [1, 0, 0], sx],
      [[x0, 0, (z0 + z1) / 2], [-1, 0, 0], [0, 0, 1], sz], [[x1, 0, (z0 + z1) / 2], [1, 0, 0], [0, 0, 1], sz]];
    let door = false;
    for (const [mid, n, t, L] of faces) {
      const qx = mid[0] + n[0] * 3, qz = mid[2] + n[2] * 3;
      if (!isStreet(qx, qz) && !isOpen(qx, qz)) continue;
      const slots = Math.max(1, Math.floor(L / 3));
      for (let fl = 0; fl < floors; fl++) for (let k = 0; k < slots; k++) {
        const along = ((k + 0.5) / slots - 0.5) * (L - 1.2);
        const base = [mid[0] + t[0] * along, 0, mid[2] + t[2] * along];
        if (fl === 0 && k === 0 && !door && L > 3.5) {
          door = true;
          const Bm = new THREE.Matrix4().makeBasis(new THREE.Vector3(...t), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n));
          const garage = b.shop || (rnd() < 0.4 && L > 5);
          const g = new THREE.BoxGeometry(garage ? 2.6 : 1.0, garage ? 2.5 : 2.1, 0.06); g.applyMatrix4(Bm);
          g.translate(base[0] + n[0] * 0.03, garage ? 1.25 : 1.05, base[2] + n[2] * 0.03);
          put(garage ? M.rollup : rnd() < 0.5 ? M.doorBlue : M.doorWood, g, false);
        } else if (rnd() < 0.85) windowAt([base[0], 1.6 + fl * 3.1, base[2]], n, t, 1.1, 1.0, rnd() < 0.6);
      }
    }
  };
  for (const b of MAP.boxes) if (b.mat === 'house') house(b);
  // casas fora do mapa (só fecham a vista)
  {
    const r2 = rand(99);
    const ring = [];
    for (let z = S.minZ - 14; z < S.maxZ + 14; z += 7 + r2() * 4) ring.push([S.minX - 13, z, S.minX - 1.5, z + 6 + r2() * 4], [S.maxX + 1.5, z, S.maxX + 13, z + 6 + r2() * 4]);
    for (let x = S.minX - 13; x < S.maxX + 13; x += 7 + r2() * 4) ring.push([x, S.minZ - 13, x + 6 + r2() * 4, S.minZ - 1.5], [x, S.maxZ + 1.5, x + 6 + r2() * 4, S.maxZ + 13]);
    for (const [x0, z0, x1, z1] of ring) {
      const floors = r2() < 0.45 ? 1 : r2() < 0.8 ? 2 : 3;
      house({ min: [x0, 0, z0], max: [x1, 3.1 * floors, z1], color: (r2() * 1000) | 0, roof: floors === 1 ? 1 : 0, brick: r2() < 0.22 ? 1 : 0 }, false);
    }
  }

  // ---- campo de futebol (base CT)
  const C = MAP.areas.campo;
  flat(M.grass, C[0], C[1], C[2], C[3], 0.02, 6);
  const cmx = (C[0] + C[2]) / 2, cmz = (C[1] + C[3]) / 2;
  for (const zz of [C[1] + 3, C[3] - 3]) flat(M.dirt, cmx - 3, zz - 2, cmx + 3, zz + 2, 0.03, 3);
  flat(M.dirt, cmx - 1.5, cmz - 1.5, cmx + 1.5, cmz + 1.5, 0.03, 3);
  for (const zz of [C[1] + 1.2, C[3] - 1.2]) {
    for (const sx of [-1, 1]) box(M.white, cmx + sx * 2.5 - 0.06, 0, zz - 0.06, cmx + sx * 2.5 + 0.06, 2.0, zz + 0.06);
    box(M.white, cmx - 2.56, 1.94, zz - 0.06, cmx + 2.56, 2.06, zz + 0.06);
  }
  // ---- cercas (alambrado do campo) e grades baixas (parquinho)
  for (const b of MAP.boxes) {
    if (b.mat !== 'fence' && b.mat !== 'lowfence') continue;
    const [x0, , z0] = b.min, [x1, h, z1] = b.max;
    const horiz = x1 - x0 > z1 - z0, L = horiz ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const post = b.mat === 'fence' ? M.dark : M.fenceGreen;
    const g = new THREE.PlaneGeometry(L, h);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.5, uv.getY(i) * h / 0.5);
    if (!horiz) g.rotateY(Math.PI / 2);
    g.translate(cx, h / 2, cz); put(M.chain, g, true);
    const n = Math.ceil(L / 2.2);
    for (let k = 0; k <= n; k++) {
      const t = k / n, px = horiz ? x0 + (x1 - x0) * t : cx, pz = horiz ? cz : z0 + (z1 - z0) * t;
      bar(post, [px, 0, pz], [px, h + 0.05, pz], 0.035, true);
    }
    bar(post, horiz ? [x0, h, cz] : [cx, h, z0], horiz ? [x1, h, cz] : [cx, h, z1], 0.025);
  }

  // ---- bar (varanda com mesas) e restaurante
  const BR = MAP.areas.bar, RS = MAP.areas.rest;
  flat(M.paver, BR[0], BR[1], BR[2], BR[3], 0.02, 1);
  flat(M.paver, RS[0], RS[1], RS[2], RS[3], 0.02, 1);
  const awn = new THREE.PlaneGeometry(3.0, BR[3] - BR[1]); awn.rotateY(Math.PI / 2); awn.rotateZ(-0.25); awn.translate(BR[0] + 2.75 + 1.4, 3.0, (BR[1] + BR[3]) / 2);
  put(M.awning, awn, true);
  const awn2 = new THREE.PlaneGeometry(RS[2] - RS[0] - 3.5, 2.4); awn2.rotateX(-Math.PI / 2 + 0.25); awn2.translate((RS[0] + RS[2]) / 2 - 1.7, 3.3, RS[3] + 1.0);
  put(M.awning, awn2, true);

  // ---- praça (bombsite A)
  const P = MAP.areas.praca;
  flat(M.concrete, P[0], P[1], P[2], P[3], 0.025, 1);
  flat(M.grass, P[0] + 1.6, P[1] + 1.6, P[2] - 1.6, P[3] - 1.6, 0.06, 4);
  flat(M.sand, P[0] + 1.4, P[1] + 1.4, (P[0] + P[2]) / 2 + 0.6, P[1] + 13.6, 0.075, 2);
  // ---- igreja: pátio de bloquete, nave azul, frontão, arcos com grade, torre com cruz, anexo
  const IG = MAP.areas.igreja;
  flat(M.paver, IG[0], IG[1], IG[2], IG[3], 0.03, 1);
  const churches = MAP.boxes.filter(b => b.mat === 'church');
  const nave = churches[0], anexo = churches[1];
  if (nave) {
    const [x0, , z0] = nave.min, [x1, H, z1] = nave.max, mx = (x0 + x1) / 2, wdt = x1 - x0;
    box(M.church, x0, 0, z0, x1, H, z1, 2);
    const pr = new THREE.BufferGeometry(); const zf = z0 - 0.01, zb = z1 + 0.01;
    pr.setAttribute('position', new THREE.Float32BufferAttribute([x0, H, zf, mx, H + 2.4, zf, x1, H, zf, x0, H, zb, x1, H, zb, mx, H + 2.4, zb], 3)); pr.computeVertexNormals();
    put(new THREE.MeshStandardMaterial({ color: 0x9cc0e6, roughness: 0.8, side: THREE.DoubleSide }), pr, true);
    gable(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, H, true, 2.4);
    box(M.churchDark, x0 - 0.05, H - 0.5, z0 - 0.08, x1 + 0.05, H, z0);
    box(M.white, x0 - 0.08, H - 0.62, z0 - 0.1, x1 + 0.08, H - 0.5, z0);
    put(M.white, xform(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 18), [mx, H + 0.9, z0 - 0.04], 0, Math.PI / 2), false);
    for (let k = 0; k < 3; k++) {
      const ax = x0 + wdt / 6 + k * wdt / 3;
      box(M.dark, ax - wdt / 8, 0, z0 - 0.04, ax + wdt / 8, 2.8, z0, 1, null, false);
      put(M.dark, xform(new THREE.CylinderGeometry(wdt / 8, wdt / 8, 0.04, 18, 1, false, 0, Math.PI), [ax, 2.8, z0 - 0.02], Math.PI / 2, 0, Math.PI / 2), false);
      for (let g2 = 0; g2 < 6; g2++) bar(M.alu, [ax - wdt / 9 + g2 * wdt / 23, 0, z0 - 0.08], [ax - wdt / 9 + g2 * wdt / 23, 2.8, z0 - 0.08], 0.018);
      if (k < 2) box(M.white, ax + wdt / 6 - 0.09, 0, z0 - 0.06, ax + wdt / 6 + 0.09, 3.0, z0);
    }
    const tw = [mx, H + 2.0, z0 + 0.9];
    box(M.white, tw[0] - 0.9, H, tw[2] - 0.9, tw[0] + 0.9, tw[1] + 0.3, tw[2] + 0.9);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; bar(M.white, [tw[0] + Math.cos(a) * 0.75, tw[1] + 0.3, tw[2] + Math.sin(a) * 0.75], [tw[0] + Math.cos(a) * 0.75, tw[1] + 1.3, tw[2] + Math.sin(a) * 0.75], 0.06, true); }
    box(M.white, tw[0] - 0.9, tw[1] + 1.3, tw[2] - 0.9, tw[0] + 0.9, tw[1] + 1.42, tw[2] + 0.9);
    box(M.white, tw[0] - 0.06, tw[1] + 1.42, tw[2] - 0.06, tw[0] + 0.06, tw[1] + 3.2, tw[2] + 0.06);
    box(M.white, tw[0] - 0.45, tw[1] + 2.5, tw[2] - 0.06, tw[0] + 0.45, tw[1] + 2.62, tw[2] + 0.06);
    for (const sx of [x0 - 0.04, x1 + 0.04]) for (let k = 0; k < 3; k++) box(M.white, sx - 0.03, 1.7, z0 + 2.5 + k * 3, sx + 0.03, 3.0, z0 + 3.4 + k * 3, 1, null, false);
  }
  if (anexo) {
    const [x0, , z0] = anexo.min, [x1, H, z1] = anexo.max;
    box(M.church, x0, 0, z0, x1, H, z1, 2);
    gable(x0 - 0.3, z0, x1 + 0.3, z1 + 0.3, H, true, 1.2);
  }

  // ---- terreno baldio (bombsite B)
  const LT = MAP.areas.lote;
  flat(M.dirt, LT[0], LT[1], LT[2], LT[3], 0.025, 3);

  // ---- props sólidos (desenho das caixas de colisão)
  for (const b of MAP.boxes) {
    const [x0, y0, z0] = b.min, [x1, y1, z1] = b.max, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = y1 - y0;
    switch (b.mat) {
      case 'crate': box(M.crate, x0, y0, z0, x1, y1, z1, x1 - x0); break;
      case 'post': break;
      case 'swing': {
        for (const sz of [-1, 1]) { const fz = cz + sz * 1.6; bar(M.yellow, [cx - 0.8, 0, fz], [cx, 2.3, fz], 0.05, true); bar(M.yellow, [cx + 0.8, 0, fz], [cx, 2.3, fz], 0.05, true); }
        bar(M.yellow, [cx, 2.3, cz - 1.65], [cx, 2.3, cz + 1.65], 0.055, true);
        for (const sz of [-0.7, 0.7]) { box(M.dark, cx - 0.12, 0.48, cz + sz - 0.22, cx + 0.12, 0.52, cz + sz + 0.22); bar(M.alu, [cx, 0.5, cz + sz - 0.2], [cx, 2.3, cz + sz - 0.2], 0.012); bar(M.alu, [cx, 0.5, cz + sz + 0.2], [cx, 2.3, cz + sz + 0.2], 0.012); }
        break;
      }
      case 'slide': {
        box(M.blueToy, cx - 0.5, 1.35, z0, cx + 0.5, 1.45, z0 + 1.0);
        for (const sx of [-0.45, 0.45]) for (const zz of [z0, z0 + 1.0]) bar(M.blueToy, [cx + sx, 0, zz], [cx + sx, 2.2, zz], 0.04, true);
        const s = new THREE.BoxGeometry(0.6, 0.05, 2.0); s.rotateX(0.6); s.translate(cx, 0.75, z0 + 1.8); put(M.red, s, true);
        break;
      }
      case 'table': cyl(M.concrete, cx, 0, cz, 0.25, 0.25, 0.75); cyl(M.concrete, cx, 0.72, cz, 0.6, 0.6, 0.08, 16); for (let k = 0; k < 4; k++) cyl(M.concrete, cx + Math.cos(k * Math.PI / 2) * 0.95, 0, cz + Math.sin(k * Math.PI / 2) * 0.95, 0.18, 0.18, 0.45, 8); break;
      case 'bench': box(M.wood, x0, 0.42, z0, x1, 0.48, z1); box(M.wood, x1 - 0.06, 0.48, z0, x1, 0.85, z1); for (const zz of [z0 + 0.15, z1 - 0.15]) box(M.dark, x0 + 0.05, 0, zz - 0.03, x1 - 0.05, 0.42, zz + 0.03); break;
      case 'planter': box(M.concrete, x0, 0, z0, x1, 0.5, z1); tree(cx, 0.5, cz, 1.1); break;
      case 'shrine': box(M.white, x0, 0, z0, x1, 1.9, z1, 1); box(M.church, cx - 0.3, 0.7, z0 - 0.02, cx + 0.3, 1.5, z0); gable(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, 1.9, true, 0.6); break;
      case 'ptable':
        box(M.yellow, x0, 0.71, z0, x1, 0.75, z1, 1, null, false); box(M.yellow, cx - 0.03, 0, cz - 0.03, cx + 0.03, 0.71, cz + 0.03, 1, null, false);
        for (let k = 0; k < 4; k++) { const ox = cx + Math.cos(k * Math.PI / 2) * 0.7, oz = cz + Math.sin(k * Math.PI / 2) * 0.7; box(M.red, ox - 0.2, 0, oz - 0.2, ox + 0.2, 0.44, oz + 0.2, 1, null, false); }
        break;
      case 'dumpster': box(M.orange, x0, 0, z0, x1, h, z1); box(M.dirt, x0 + 0.1, h, z0 + 0.1, x1 - 0.1, h + 0.25, z1 - 0.1, 1, null, false); break;
      case 'brickwall': box(M.brick, x0, 0, z0, x1, h, z1, 1, 0xffffff); break;
      case 'bricks': box(M.brick, x0, 0, z0, x1, h, z1, 1, 0xffffff); break;
      case 'sandpile': put(M.sand, xform(new THREE.ConeGeometry(1.4, 1.0, 12), [cx, 0.5, cz]), true); break;
      case 'pole': {
        box(M.concrete, x0, 0, z0, x1, y1, z1, 1);
        const along = b.axis === 'z' ? [0, 0, 1] : [1, 0, 0];
        bar(M.concrete, [cx - along[0] * 0.8, y1 - 0.4, cz - along[2] * 0.8], [cx + along[0] * 0.8, y1 - 0.4, cz + along[2] * 0.8], 0.05);
        break;
      }
    }
  }
  // ---- fios entre os postes vizinhos
  const poles = MAP.poles || [];
  const lineGeo = [];
  for (let i = 0; i < poles.length; i++) for (let j = i + 1; j < poles.length; j++) {
    const [ax, az, ah] = poles[i], [bx, bz, bh] = poles[j];
    if (ah !== bh) continue;
    const d = Math.hypot(ax - bx, az - bz);
    if (d > 26 || (ah && Math.abs(az - bz) > 0.5) || (!ah && Math.abs(ax - bx) > 0.5)) continue;
    for (const [off, sag] of [[-0.7, 0.5], [0, 0.6], [0.7, 0.5], [-0.3, 0.9]]) {
      const o = ah ? [0, 0, off] : [off, 0, 0];
      for (let k = 0; k < 12; k++) {
        const t0 = k / 12, t1 = (k + 1) / 12;
        const p = (t) => [ax + (bx - ax) * t + o[0], 8.1 - Math.sin(t * Math.PI) * sag, az + (bz - az) * t + o[2]];
        lineGeo.push(...p(t0), ...p(t1));
      }
    }
  }
  if (lineGeo.length) { const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lineGeo, 3)); group.add(new THREE.LineSegments(lg, M.cable)); }

  // ---- árvores e coqueiros
  function tree(x, y, z, size = 1) {
    cyl(M.trunk, x, y, z, 0.22 * size, 0.15 * size, 3.2 * size, 8);
    const r3 = rand((x * 100 + z * 7) | 0 || 3);
    for (let i = 0; i < 5; i++) {
      const c = [x + (r3() - 0.5) * 2 * size, y + 3.2 * size + r3() * 1.4 * size, z + (r3() - 0.5) * 2 * size];
      for (let k = 0; k < 3; k++) { const g = new THREE.PlaneGeometry(3.2 * size, 3.0 * size); g.rotateY(k * Math.PI / 3 + i); g.translate(...c); put(M.foliage, g, true); }
    }
  }
  function palm(x, z, h) {
    const lean = [(Math.sin(x * 3.1) * 0.5), 0, (Math.cos(z * 2.3) * 0.5)];
    let prev = [x, 0, z];
    for (let i = 1; i <= 6; i++) {
      const t = i / 6, cur = [x + lean[0] * t * t * 2, h * t, z + lean[2] * t * t * 2];
      const d = new THREE.Vector3(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
      const g = new THREE.CylinderGeometry(0.24 - 0.07 * t, 0.24 - 0.07 * (t - 1 / 6), d.length(), 8);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
      g.translate((cur[0] + prev[0]) / 2, (cur[1] + prev[1]) / 2, (cur[2] + prev[2]) / 2);
      put(M.trunk, g, true); prev = cur;
    }
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2 + Math.sin(i * 7) * 0.2, tilt = 0.15 + ((i * 37) % 10) / 25;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const mid = new THREE.Vector3(...prev).addScaledVector(dir, 1.4).add(new THREE.Vector3(0, 0.6 - tilt, 0));
      const tip = new THREE.Vector3(...prev).addScaledVector(dir, 3.0).add(new THREE.Vector3(0, -0.4 - tilt * 1.5, 0));
      for (const [pa, pb] of [[new THREE.Vector3(...prev), mid], [mid, tip]]) {
        const d = pb.clone().sub(pa);
        const g = new THREE.PlaneGeometry(1.1, d.length());
        const side = d.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
        const up = side.clone().cross(d).normalize();
        g.applyMatrix4(new THREE.Matrix4().makeBasis(side, d.clone().normalize(), up));
        g.translate((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, (pa.z + pb.z) / 2);
        put(M.frond, g, true);
      }
    }
  }
  palm(P[0] + 2.2, P[3] - 2.2, 9.5); palm(P[2] - 1.0, P[1] + 1.2, 8.0); palm(P[2] - 0.8, (P[1] + P[3]) / 2, 10);
  palm(IG[2] - 1.0, IG[1] + 1.5, 8.5); tree(LT[2] - 1.5, 0, LT[3] - 1.5, 1.2);
  tree(C[0] - 0.8, 0, C[1] + 4, 1.3); tree(C[2] + 0.8, 0, C[3] - 6, 1.1);

  // ---- letras A e B pintadas
  const sign = (txt, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshStandardMaterial({ map: label(txt, 'rgba(230,110,20,.9)'), transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
  };
  for (const [name, s] of Object.entries(MAP.sites)) sign(name, (s.min[0] + s.max[0]) / 2, 0.05, (s.min[1] + s.max[1]) / 2, 0);
  group.children.filter(m => m.isMesh && m.geometry.type === 'PlaneGeometry').forEach(m => { m.rotation.x = -Math.PI / 2; });

  // ---- telhados
  if (roofTri.length) {
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(roofTri, 3));
    const uv = []; for (let i = 0; i < roofTri.length; i += 3) uv.push(roofTri[i] * 0.5 + roofTri[i + 1] * 0.3, roofTri[i + 2] * 0.5 + roofTri[i + 1] * 0.3);
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); rg.computeVertexNormals(); put(M.roof, rg, true);
  }

  // ---- junta tudo por material
  for (const { mat, geos, shadow } of batches.values()) {
    // todas as geometrias precisam dos mesmos atributos para juntar
    const hasColor = geos.some(g => g.attributes.color), hasUv = geos.some(g => g.attributes.uv);
    for (const g of geos) {
      if (hasColor && !g.attributes.color) { const a = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      if (hasUv && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!hasUv && g.attributes.uv) g.deleteAttribute('uv');
      if (!g.attributes.normal) g.computeVertexNormals();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    }
    const merged = mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    group.add(mesh);
  }
  if (sunLight) { const sc = sunLight.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.updateProjectionMatrix(); }
}
