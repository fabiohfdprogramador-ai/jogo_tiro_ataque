// Soldado feito 100% por código, montado como um modelo de jogo de verdade: um corpo só (malha com
// esqueleto), então cotovelos e joelhos dobram sem emenda. Rosto esculpido, roupa com trama de tecido,
// colete com fitas MOLLE, carregadores, rádio, joelheiras, luvas com dedos e coturnos com cadarço.
// Cada boneco desenha em só 3 partes (tecido, peças duras e pele), e todos do mesmo time
// reaproveitam a mesma malha: fica leve até em placa de vídeo simples.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildWeaponModel, track } from './viewmodel.js';
import { WEAPONS } from '/shared/weapons.js';

const V3 = THREE.Vector3;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
const gauss = (x, w) => Math.exp(-(x * x) / (w * w));

// ---------------------------------------------------------------- texturas (geradas uma vez)
function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// ruído suave que se repete a cada p células (a textura emenda sem costura)
function vnoise(x, y, p, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const m = (v) => ((v % p) + p) % p;
  const a = hash2(m(xi), m(yi), s), b = hash2(m(xi + 1), m(yi), s), c = hash2(m(xi), m(yi + 1), s), d = hash2(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x, y, p, s, oct = 4) {
  let v = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { v += vnoise(x * f, y * f, p * f, s + i * 17) * amp; tot += amp; amp *= 0.5; f *= 2; }
  return v / tot;
}
// fn(u, v) -> { c: [r,g,b] 0..1, h: altura }. Devolve a cor e o relevo (normal map) calculado da altura.
function bake(size, fn, strength) {
  const H = new Float32Array(size * size);
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d'), img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = fn(x / size, y / size), i = y * size + x;
    H[i] = r.h;
    img.data[i * 4] = clamp01(r.c[0]) * 255; img.data[i * 4 + 1] = clamp01(r.c[1]) * 255; img.data[i * 4 + 2] = clamp01(r.c[2]) * 255; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const nc = document.createElement('canvas'); nc.width = nc.height = size;
  const ng = nc.getContext('2d'), nimg = ng.createImageData(size, size);
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = -(at(x + 1, y) - at(x - 1, y)) * strength, ny = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(nx, ny, 1), i = (y * size + x) * 4;
    nimg.data[i] = (nx / l * 0.5 + 0.5) * 255; nimg.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; nimg.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nimg.data[i + 3] = 255;
  }
  ng.putImageData(nimg, 0, 0);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(cv, true), normal: tex(nc, false) };
}

// materiais compartilhados por todos os bonecos: a cor de cada peça vem da cor dos vértices
const FAB = 0, HARD = 1, SKIN = 2, CAMO = 3;   // CAMO: uniforme camuflado (a cor vem da textura, não dos vértices)
const UV_PER_M = [4, 6, 10, 2.2];     // repetições da textura por metro
const GAIN = [1.2, 1, 1.1, 1];        // compensa o tom médio da textura (cinza) para a cor sair certa
// camuflagem: manchas recortadas em camadas (como as de verdade), com a trama do tecido por cima
function camoTex(pal, seed) {
  return bake(512, (u, v) => {
    const W = 64, tw = Math.sin(2 * Math.PI * W * (u + v)) * 0.5 + 0.5;
    let c = pal[0];
    for (let k = 1; k < pal.length; k++) { const n = fbm(u * 5 + k * 3.1, v * 5 - k * 1.7, 5, seed + k * 17, 4); if (n > 0.56 - k * 0.015) c = pal[k]; }
    const fine = fbm(u * 40, v * 40, 40, seed + 99, 2), k = 0.9 + tw * 0.08 + (fine - 0.5) * 0.12;
    return { c: [c[0] * k, c[1] * k, c[2] * k], h: tw * 0.25 + fine * 0.2 };
  }, 2.2);
}
const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
let CAMO_MATS = null;
function camoMats() {
  if (CAMO_MATS) return CAMO_MATS;
  const mk = (pal, seed) => { const t = camoTex(pal.map(rgb), seed); return new THREE.MeshStandardMaterial({ vertexColors: true, map: t.map, normalMap: t.normal, roughness: 0.95 }); };
  CAMO_MATS = {
    T: mk([0xb39c74, 0x8c7552, 0x77744c, 0xcdbd95, 0x5a4733], 211),    // deserto (tipo multicam areia)
    CT: mk([0x2c3248, 0x3d4660, 0x1d2333, 0x4d566c, 0x161a26], 433),   // urbana escura (azul-marinho e cinza)
  };
  return CAMO_MATS;
}
let MATS = null;
function materials(team = 'CT') {
  if (MATS) return [...MATS, camoMats()[team === 'T' ? 'T' : 'CT']];
  // tecido: sarja (trama na diagonal), amassados largos, fiapos e poeira
  const fab = bake(256, (u, v) => {
    const W = 48;
    const tw = Math.sin(2 * Math.PI * W * (u + v)) * 0.5 + 0.5;
    const th = Math.sin(2 * Math.PI * W * 2 * u) * 0.5 + 0.5;
    const big = fbm(u * 4, v * 4, 4, 11), fine = fbm(u * 32, v * 32, 32, 23, 2);
    const dirt = clamp01((fbm(u * 8, v * 8, 8, 5, 3) - 0.55) * 3) * 0.3;
    const h = (tw * 0.7 + th * 0.3) * 0.16 + big * 1.6 + fine * 0.12;
    const k = 0.84 * (0.92 + tw * 0.1 + (fine - 0.5) * 0.16) * (0.94 + big * 0.12);
    return { c: [k * (1 - dirt * 0.04), k * (1 - dirt * 0.1), k * (1 - dirt * 0.22)], h };
  }, 2.6);
  // pele: poros e manchas leves
  const skin = bake(256, (u, v) => {
    const pores = fbm(u * 64, v * 64, 64, 31, 2), blot = fbm(u * 6, v * 6, 6, 37, 3);
    const k = 0.9 + (blot - 0.5) * 0.14;
    return { c: [k, k * (0.97 - (blot - 0.5) * 0.08), k * 0.95], h: pores * 0.5 + blot * 0.2 };
  }, 2.2);
  // peças duras (couro, plástico, borracha): grão fino
  const hard = bake(128, (u, v) => ({ c: [1, 1, 1], h: fbm(u * 24, v * 24, 24, 41, 3) * 0.6 }), 2.0);
  MATS = [
    new THREE.MeshStandardMaterial({ vertexColors: true, map: fab.map, normalMap: fab.normal, roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ vertexColors: true, normalMap: hard.normal, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.48, metalness: 0.05 }),
    // pele: um brilho avermelhado nas bordas imita a luz atravessando a pele (menos cara de boneco de plástico)
    new THREE.MeshPhysicalMaterial({ vertexColors: true, map: skin.map, normalMap: skin.normal, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.55, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xff7a5a) }),
  ];
  return [...MATS, camoMats()[team === 'T' ? 'T' : 'CT']];
}

// ---------------------------------------------------------------- formas (geradas por fórmula)
// Superfície em grade: P(u, v) com u dando a volta (emenda costurada) e v ao longo da peça.
function surf(nu, nv, P) {
  const cols = nu + 1, n = cols * (nv + 1);
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pos.set(P(i === nu ? 0 : i / nu, j / nv), (j * cols + i) * 3);
  const dist = (a, b) => Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]);
  const ringLen = [];
  for (let j = 0; j <= nv; j++) { let d = 0; for (let i = 0; i <= nu; i++) { const k = j * cols + i; if (i) d += dist(k, k - 1); uv[k * 2] = d; } ringLen.push(d); }
  for (let i = 0; i <= nu; i++) { let d = 0; for (let j = 0; j <= nv; j++) { const k = j * cols + i; if (j) d += dist(k, k - cols); uv[k * 2 + 1] = d; } }
  const idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // costura (primeira = última coluna) e pontas fechadas: normal média
  const nr = g.attributes.normal.array;
  const avg = (list) => {
    let x = 0, y = 0, z = 0;
    for (const k of list) { x += nr[k * 3]; y += nr[k * 3 + 1]; z += nr[k * 3 + 2]; }
    const l = Math.hypot(x, y, z) || 1;
    for (const k of list) { nr[k * 3] = x / l; nr[k * 3 + 1] = y / l; nr[k * 3 + 2] = z / l; }
  };
  for (let j = 0; j <= nv; j++) {
    if (ringLen[j] < 1e-6) avg(Array.from({ length: cols }, (_, i) => j * cols + i));
    else avg([j * cols, j * cols + nu]);
  }
  return g;
}
// Torno: perfil [[altura, raio], ...] girado em volta de y, com cúpulas nas pontas.
function lathe(profile, seg = 16, sx = 1, sz = 1, caps = true) {
  const pts = [], r0 = profile[0][1], last = profile[profile.length - 1], r1 = last[1];
  if (caps) for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * Math.PI / 2; pts.push([profile[0][0] + Math.sin(a) * r0 * 0.9, Math.cos(a) * r0]); }
  pts.push(...profile);
  if (caps) for (let i = 1; i <= 5; i++) { const a = i / 5 * Math.PI / 2; pts.push([last[0] + Math.sin(a) * r1 * 0.9, Math.cos(a) * r1]); }
  return surf(seg, pts.length - 1, (u, v) => {
    const p = pts[Math.round(v * (pts.length - 1))], t = u * Math.PI * 2;
    return [Math.cos(t) * p[1] * sx, p[0], Math.sin(t) * p[1] * sz];
  });
}
// Tronco: anéis [altura, meia-largura, meia-profundidade, deslocamento z], seção quadrada-arredondada.
function loft(rings, e = 0.6, seg = 28) {
  const rows = [null, ...rings, null];
  return surf(seg, rows.length - 1, (u, v) => {
    const j = Math.round(v * (rows.length - 1)), t = u * Math.PI * 2;
    const r = rows[j];
    if (!r) { const q = rings[j === 0 ? 0 : rings.length - 1]; return [0, q[0], q[3]]; }
    return [r[1] * spow(Math.cos(t), e), r[0], r[3] + r[2] * spow(Math.sin(t), e)];
  });
}
// Peça arredondada (superelipsoide): n pequeno = caixa de cantos macios, n = 1 = ovo.
function rounded(sx, sy, sz, n = 0.3, seg = 8) {
  return surf(seg * 2, seg, (u, v) => {
    const phi = -Math.PI / 2 + v * Math.PI, th = u * Math.PI * 2, cp = Math.cos(phi);
    return [sx / 2 * spow(cp, n) * spow(Math.cos(th), n), sy / 2 * spow(Math.sin(phi), n), sz / 2 * spow(cp, n) * spow(Math.sin(th), n)];
  });
}
// Cabeça esculpida a partir de uma esfera: crânio, maxilar, queixo, nariz, olhos, maçãs, boca. Frente = -z.
function headPoint(phi, th) {
  const vx = Math.cos(phi) * Math.cos(th), vy = Math.sin(phi), vz = Math.cos(phi) * Math.sin(th);
  let px = vx * 0.077, py = vy * 0.108, pz = vz * 0.097;
  const front = clamp01(-vz), back = clamp01(vz), ax = Math.abs(vx);
  pz += back * 0.012 * clamp01(vy + 0.4);                                        // nuca para trás
  if (vy < 0) { const k = clamp01(-vy); px *= 1 - 0.3 * k * k; pz *= 1 - 0.18 * k * back; }   // maxilar afinando
  px *= 1 + 0.05 * gauss(vy + 0.05, 0.25) * gauss(ax - 0.75, 0.3);
  let z = 0;
  z += 0.017 * gauss(vx, 0.3) * gauss(vy + 0.78, 0.17);      // queixo
  z += 0.007 * gauss(vx, 0.45) * gauss(vy + 0.38, 0.22);     // boca
  z += 0.006 * gauss(vx, 0.22) * gauss(vy + 0.43, 0.05);     // lábio de cima
  z += 0.0065 * gauss(vx, 0.2) * gauss(vy + 0.53, 0.05);     // lábio de baixo
  z -= 0.0045 * gauss(vx, 0.26) * gauss(vy + 0.48, 0.022);    // linha da boca
  z += 0.027 * gauss(vx, 0.085) * gauss(vy + 0.1, 0.13);     // ponta do nariz
  z += 0.014 * gauss(vx, 0.075) * gauss(vy - 0.06, 0.17);     // ponte do nariz
  z += 0.008 * gauss(ax - 0.12, 0.06) * gauss(vy + 0.18, 0.05);   // asas do nariz
  z -= 0.004 * gauss(vx, 0.06) * gauss(vy + 0.24, 0.035);    // base do nariz
  z -= 0.016 * gauss(ax - 0.33, 0.13) * gauss(vy - 0.12, 0.09);   // órbitas
  z += 0.01 * gauss(ax - 0.3, 0.3) * gauss(vy - 0.27, 0.06);     // sobrancelhas
  z += 0.009 * gauss(ax - 0.55, 0.13) * gauss(vy + 0.02, 0.12);   // maçãs do rosto
  z -= 0.006 * gauss(ax - 0.5, 0.15) * gauss(vy + 0.3, 0.15);     // bochecha funda
  z += 0.004 * gauss(vx, 0.5) * gauss(vy - 0.5, 0.3);             // testa
  pz -= z * front;
  return [px, py, pz, vx, vy, vz];
}
// Rosto pintado na própria pele (sem peças coladas): barba/bigode (com volume), barba por fazer,
// sobrancelhas, lábios, bochechas e nariz mais corados, olheiras e cabelo curto atrás.
// o: { skin, lip, hair, beard (espessura), beardAmt (0..1 cor da barba), stubble (0..1) }
function beardMask(vx, vy, vz) {
  // linha da barba desce em diagonal: da costeleta até o canto da boca
  const top = -0.25 + 0.27 * smooth((Math.abs(vx) - 0.3) / 0.6);
  let m = clamp01((top - vy) / 0.12) * clamp01((0.35 - vz) / 0.3);
  m *= 1 - gauss(vx, 0.2) * gauss(vy + 0.49, 0.07);          // lábios de fora
  m *= 1 - gauss(vx, 0.12) * gauss(vy + 0.2, 0.12);          // nariz de fora
  return smooth((m - 0.25) * 2.2);
}
function headGeo(o, seg = 40) {
  const dirs = [];
  const g = surf(seg * 2, seg, (u, v) => {
    const phi = -Math.PI / 2 + v * Math.PI, th = u * Math.PI * 2;
    const [px, py, pz, vx, vy, vz] = headPoint(phi, th);
    dirs.push([vx, vy, vz]);
    const k = 1 + (o.beard || 0) * beardMask(vx, vy, vz);
    return [px * k, py * k, pz * k];
  });
  // surf chama P em ordem (linha por linha), então dirs[k] é o vértice k
  const col = new Float32Array(dirs.length * 3);
  const C = (h) => new THREE.Color(h);
  const skin = C(o.skin), lip = C(o.lip), hair = C(o.hair), red = skin.clone().multiply(C(0xffd2c4)), dark = skin.clone().multiplyScalar(0.62);
  const stub = skin.clone().lerp(C(0x2c2a30), 0.55), c = new THREE.Color();
  for (let k = 0; k < dirs.length; k++) {
    const [vx, vy, vz] = dirs[k], ax = Math.abs(vx), front = clamp01(-vz * 1.4);
    c.copy(skin);
    c.lerp(red, 0.45 * gauss(ax - 0.55, 0.16) * gauss(vy + 0.12, 0.16) * front);     // bochechas
    c.lerp(red, 0.5 * gauss(vx, 0.1) * gauss(vy + 0.12, 0.12) * front);              // nariz
    c.lerp(dark, 0.4 * gauss(ax - 0.32, 0.11) * gauss(vy - 0.05, 0.06) * front);     // olheiras / fundo dos olhos
    c.lerp(dark, 0.25 * gauss(ax - 0.2, 0.06) * gauss(vy + 0.33, 0.12) * front);     // vinco do nariz à boca
    const bm = beardMask(vx, vy, vz);
    const n = vnoise(vx * 40 + 7, vy * 40 + 3, 1e6, 3);
    c.lerp(stub, (o.stubble || 0) * bm * (0.8 + n * 0.4));
    c.lerp(hair, clamp01((o.beardAmt || 0) * bm * (0.85 + n * 0.3)));
    c.lerp(lip, 0.9 * gauss(vx, 0.22) * gauss(vy + 0.485, 0.06) * front * (1 - (o.beardAmt || 0) * 0.3));
    const brow = gauss(ax - 0.36, 0.15) * gauss(vy - 0.29 + (ax - 0.36) * 0.15, 0.035) * front * smooth((ax - 0.08) / 0.08);
    c.lerp(hair, clamp01(brow * 1.6) * 0.9);
    const scalp = smooth((vy + 0.05) / 0.15) * smooth((vz + 0.3) / 0.35);              // cabelo curto (atrás e nos lados)
    c.lerp(hair.clone().lerp(skin, 0.25), scalp * 0.9);
    col.set([c.r, c.g, c.b], k * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------------------------------------------------------------- esqueleto
const B = { pelvis: 0, chest: 1, neck: 2, head: 3, uArmL: 4, foreL: 5, handL: 6, uArmR: 7, foreR: 8, handR: 9, thighL: 10, shinL: 11, bootL: 12, thighR: 13, shinR: 14, bootR: 15 };
const U_ARM = 0.31, F_ARM = 0.29, THIGH = 0.44, SHIN = 0.44;
const PELVIS_Y = 1.0, CHEST_OFS = new V3(0, -0.04, 0), NECK_OFS = new V3(0, 0.57, 0.01), HEAD_OFS = new V3(0, 0.155, -0.012);
const SHOULDER = (sx) => new V3(sx * 0.215, 0.5, 0.005);         // no espaço do peito
const HIP = (sx) => new V3(sx * 0.1, -0.06, 0);                  // no espaço do quadril
// posição de cada osso na pose de montagem (todos sem rotação; braços e pernas "esticados para cima")
function bindPositions() {
  const P = [];
  P[B.pelvis] = new V3(0, PELVIS_Y, 0);
  P[B.chest] = P[B.pelvis].clone().add(CHEST_OFS);
  P[B.neck] = P[B.chest].clone().add(NECK_OFS);
  P[B.head] = P[B.neck].clone().add(HEAD_OFS);
  for (const [sx, u, f, h] of [[-1, B.uArmL, B.foreL, B.handL], [1, B.uArmR, B.foreR, B.handR]]) {
    P[u] = P[B.chest].clone().add(SHOULDER(sx)); P[f] = P[u].clone().add(new V3(0, U_ARM, 0)); P[h] = P[f].clone().add(new V3(0, F_ARM, 0));
  }
  for (const [sx, t, s, b] of [[-1, B.thighL, B.shinL, B.bootL], [1, B.thighR, B.shinR, B.bootR]]) {
    P[t] = P[B.pelvis].clone().add(HIP(sx)); P[s] = P[t].clone().add(new V3(0, THIGH, 0)); P[b] = P[s].clone().add(new V3(0, SHIN, 0));
  }
  return P;
}

// ---------------------------------------------------------------- montagem do corpo
class Assembler {
  constructor(binds, seed) { this.binds = binds; this.lists = [[], [], [], []]; this.seed = seed; }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  // o: { bone, mat, col, p, r, s, blend(x,y,z) -> [osso, peso], ao(x,y,z) -> fator }
  put(geo, o) {
    const s = o.s == null ? [1, 1, 1] : typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s;
    const r = o.r || [0, 0, 0], p = o.p || [0, 0, 0];
    geo.applyMatrix4(new THREE.Matrix4().compose(new V3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')), new V3(...s)));
    const pos = geo.attributes.position, n = pos.count, bp = this.binds[o.bone];
    const col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const pre = geo.attributes.color, base = new THREE.Color(o.col), k0 = GAIN[o.mat] * (1 + (this.rnd() - 0.5) * 0.06);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = k0 * (o.ao ? o.ao(x, y, z) : 1);
      if (pre) { col[i * 3] = pre.getX(i) * k; col[i * 3 + 1] = pre.getY(i) * k; col[i * 3 + 2] = pre.getZ(i) * k; }
      else { col[i * 3] = base.r * k; col[i * 3 + 1] = base.g * k; col[i * 3 + 2] = base.b * k; }
      si[i * 4] = o.bone; sw[i * 4] = 1;
      if (o.blend) { const [b2, w] = o.blend(x, y, z); if (w > 0) { si[i * 4 + 1] = b2; sw[i * 4] = 1 - w; sw[i * 4 + 1] = w; } }
      pos.setXYZ(i, x + bp.x, y + bp.y, z + bp.z);
    }
    const uv = geo.attributes.uv, us = UV_PER_M[o.mat] * (s[0] + s[1] + s[2]) / 3;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * us, uv.getY(i) * us);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    this.lists[o.mat].push(geo);
  }
  build() { return mergeGeometries(this.lists.map(l => mergeGeometries(l)), true); }
}

// cores (sRGB) de cada time: TR com roupa de campanha cor de areia, CT de azul-marinho tático
const PAL = {
  T: {
    shirt: 0x545240, pants: 0x75694f, vest: 0x786345, gear: 0x66543a, strap: 0x483b29, glove: 0x806b4f, boot: 0x5e4630,
    sole: 0x151312, pad: 0x5c4d36, skin: 0x9a6340, lip: 0x7a3e30, earIn: 0x6b452e, mag: 0x5a3018, shemagh: 0x6e6a52, shemagh2: 0x58543f,
    hair: 0x17110b, cap: 0x6b604a,
  },
  CT: {
    shirt: 0x242b47, pants: 0x212945, vest: 0x4d4d33, gear: 0x41412b, strap: 0x2e2e1f, glove: 0x161616, boot: 0x121212,
    sole: 0x0b0b0b, pad: 0x141414, skin: 0xc68459, lip: 0x9c5242, earIn: 0x80523d, mag: 0x1a1a1a, helmet: 0x54523b, hs: 0x38382a,
    hair: 0x2a1d12, stubble: 0x8f6954,
  },
};
const DARK = 0x111111, EYEWHITE = 0xb3a99c, IRIS = 0x2a1a0c, LENS = 0x17110a, RED = 0xa6140f;

// pesos das juntas: perto do cotovelo/joelho o vértice segue os dois ossos (dobra sem emenda)
const toNext = (bone, len, w = 0.08) => (x, y) => [bone, 0.5 * smooth((y - (len - w)) / (w + 0.03))];
const toPrev = (bone, w = 0.08) => (x, y) => [bone, 0.5 * (1 - smooth((y + 0.03) / (w + 0.03)))];
// sombra de contato nas pontas dos membros (onde encosta na junta)
const limbAO = (len) => (x, y) => 0.82 + 0.18 * smooth(y / 0.08) * smooth((len - y) / 0.08);

const TEMPLATES = {};
function template(team) {
  if (TEMPLATES[team]) return TEMPLATES[team];
  const T = team === 'T', C = PAL[team];
  const binds = bindPositions();
  const A = new Assembler(binds, T ? 1234 : 4321);
  const put = (geo, bone, mat, col, p, r, s, extra = {}) => A.put(geo, { bone, mat, col, p, r, s, ...extra });

  // ---- quadril: calça, cinto tático com fivela, bolsos e kit médico
  const pb = B.pelvis;
  put(loft([[-0.17, 0.15, 0.1, 0.01], [-0.08, 0.172, 0.112, 0], [0.02, 0.165, 0.108, 0], [0.08, 0.155, 0.1, 0]], 0.7, 24), pb, CAMO, 0xffffff);
  put(loft([[-0.005, 0.18, 0.121, 0], [0.065, 0.177, 0.119, 0]], 0.7, 24), pb, FAB, C.gear);
  put(loft([[0.018, 0.183, 0.124, 0], [0.042, 0.181, 0.122, 0]], 0.7, 24), pb, FAB, C.strap);
  put(rounded(0.06, 0.05, 0.02, 0.3), pb, HARD, DARK, [0, 0.03, -0.124]);
  for (const sx of [-1, 1]) {
    put(rounded(0.065, 0.09, 0.055, 0.3), pb, FAB, C.gear, [sx * 0.115, 0, -0.115], [0, sx * 0.35, 0]);
    put(rounded(0.07, 0.025, 0.06, 0.35, 6), pb, FAB, C.vest, [sx * 0.115, 0.048, -0.117], [0, sx * 0.35, 0]);
    put(rounded(0.06, 0.1, 0.07, 0.3), pb, FAB, C.gear, [sx * 0.165, -0.005, 0.06], [0, -sx * 0.5, 0]);
    put(rounded(0.012, 0.11, 0.02, 0.4, 4), pb, FAB, C.strap, [sx * 0.16, -0.03, -0.11], [0, 0, sx * 0.1]);   // passador do cinto
  }
  put(rounded(0.14, 0.11, 0.07, 0.3, 10), pb, FAB, C.gear, [0, 0, 0.145]);
  if (!T) { put(rounded(0.05, 0.014, 0.006, 0.2, 4), pb, HARD, RED, [0, 0, 0.181]); put(rounded(0.014, 0.05, 0.006, 0.2, 4), pb, HARD, RED, [0, 0, 0.181]); }

  // ---- tronco: cintura fina, peito largo, ombros caídos
  const cb = B.chest;
  put(loft([[-0.03, 0.158, 0.104, 0], [0.1, 0.152, 0.1, 0], [0.24, 0.175, 0.112, -0.004], [0.38, 0.205, 0.122, -0.01],
    [0.47, 0.212, 0.115, -0.004], [0.53, 0.19, 0.098, 0.006], [0.575, 0.12, 0.075, 0.012], [0.6, 0.065, 0.058, 0.012]], 0.65, 28), cb, CAMO, 0xffffff);
  // colete: placas com grade MOLLE (fitas costuradas), faixa lateral e alças acolchoadas
  put(rounded(0.34, 0.35, 0.065, 0.22, 10), cb, FAB, C.vest, [0, 0.37, -0.122], [0.05, 0, 0]);
  put(rounded(0.35, 0.38, 0.065, 0.22, 10), cb, FAB, C.vest, [0, 0.36, 0.126], [-0.04, 0, 0]);
  put(loft([[0.13, 0.19, 0.124, -0.003], [0.31, 0.2, 0.13, -0.006]], 0.6, 28), cb, FAB, C.vest);
  for (let i = 0; i < 4; i++) {
    put(rounded(0.33, 0.02, 0.008, 0.3, 4), cb, FAB, C.strap, [0, 0.235 + i * 0.06, -0.158 - i * 0.003], [0.05, 0, 0]);
    put(rounded(0.34, 0.02, 0.008, 0.3, 4), cb, FAB, C.strap, [0, 0.22 + i * 0.065, 0.161], [-0.04, 0, 0]);
  }
  for (let i = 0; i < 3; i++) put(loft([[0.155 + i * 0.05, 0.193, 0.127, -0.004], [0.172 + i * 0.05, 0.193, 0.127, -0.004]], 0.6, 28), cb, FAB, C.strap);
  for (const sx of [-1, 1]) {
    put(rounded(0.085, 0.045, 0.28, 0.3), cb, FAB, C.vest, [sx * 0.115, 0.565, 0], [0, 0, -sx * 0.25]);
    put(rounded(0.055, 0.11, 0.075, 0.3), cb, FAB, C.gear, [sx * 0.2, 0.22, -0.045]);          // bolsos laterais
    put(rounded(0.03, 0.03, 0.02, 0.5, 4), cb, HARD, DARK, [sx * 0.14, 0.53, -0.14]);          // fivelas das alças
  }
  put(rounded(0.1, 0.03, 0.025, 0.4, 6), cb, FAB, C.strap, [0, 0.555, 0.16], [-0.3, 0, 0]);    // alça de resgate
  // 3 porta-carregadores duplos com os carregadores aparecendo
  for (const x of [-0.105, 0, 0.105]) {
    put(rounded(0.09, 0.125, 0.065, 0.28), cb, FAB, C.gear, [x, 0.25, -0.185]);
    for (let k = 0; k < 2; k++) put(rounded(0.068, 0.07, 0.022, 0.25, 6), cb, HARD, C.mag, [x, 0.33, -0.172 - k * 0.027], [k * 0.08, 0, 0]);
    put(rounded(0.094, 0.012, 0.07, 0.4, 6), cb, FAB, C.strap, [x, 0.3, -0.186]);
  }
  put(rounded(0.2, 0.08, 0.035, 0.3), cb, FAB, C.gear, [0, 0.425, -0.165], [0.06, 0, 0]);     // bolso administrativo
  put(rounded(0.1, 0.045, 0.006, 0.2, 4), cb, HARD, T ? C.pad : DARK, [0, 0.43, -0.184], [0.06, 0, 0]);   // etiqueta
  put(rounded(0.075, 0.16, 0.055, 0.3), cb, FAB, C.gear, [-0.1, 0.42, 0.178]);                 // rádio
  put(rounded(0.012, 0.32, 0.012, 0.6, 6), cb, HARD, DARK, [-0.115, 0.64, 0.178], [0, 0, 0.05]);
  put(rounded(0.11, 0.14, 0.05, 0.3), cb, FAB, C.gear, [0.07, 0.3, 0.178]);
  put(rounded(0.012, 0.18, 0.012, 0.5, 4), cb, HARD, DARK, [-0.06, 0.48, -0.15], [0.2, 0, 0.5]);   // cabo do fone (PTT)
  put(rounded(0.035, 0.05, 0.02, 0.4, 4), cb, HARD, DARK, [-0.03, 0.42, -0.19]);
  if (T) {   // lenço (shemagh) em volta do pescoço, com nó na frente
    put(loft([[0.54, 0.105, 0.088, -0.005], [0.59, 0.098, 0.085, -0.01], [0.64, 0.078, 0.07, -0.006]], 0.9, 20), cb, FAB, C.shemagh);
    put(rounded(0.12, 0.12, 0.05, 0.7, 8), cb, FAB, C.shemagh2, [0.02, 0.52, -0.1], [0.4, 0, 0.1]);
    put(rounded(0.05, 0.1, 0.03, 0.6, 6), cb, FAB, C.shemagh2, [0.05, 0.45, -0.11], [0.3, 0, -0.3]);
  } else {   // gola da camisa
    put(lathe([[0.555, 0.074], [0.6, 0.064], [0.62, 0.062]], 18, 1, 1.05, false), cb, CAMO, 0xffffff, [0, 0, 0.01]);
  }
  // ombros (deltoides) e emblema do time
  for (const sx of [-1, 1]) {
    const sh = SHOULDER(sx);
    put(rounded(0.12, 0.125, 0.125, 1, 10), cb, CAMO, 0xffffff, [sh.x + sx * 0.008, sh.y + 0.005, sh.z]);
    put(rounded(0.012, 0.065, 0.055, 0.25, 6), cb, HARD, T ? C.pad : C.gear, [sh.x + sx * 0.072, sh.y - 0.035, sh.z], [0, 0, sx * 0.15]);
  }

  // ---- pescoço e cabeça
  put(lathe([[0, 0.056], [0.06, 0.049], [0.12, 0.047]], 14, 1, 1.05), B.neck, SKIN, C.skin);
  const hb = B.head;
  put(headGeo(T ? { skin: C.skin, lip: C.lip, hair: C.hair, beard: 0.05, beardAmt: 0.95 } : { skin: C.skin, lip: C.lip, hair: C.hair, stubble: 0.65 }), hb, SKIN, C.skin);
  for (const sx of [-1, 1]) {
    // olho fundo na órbita: globo, íris, pupila, pálpebras e linha dos cílios
    const e = [sx * 0.0255, 0.0125, -0.0722];
    put(rounded(0.0225, 0.0225, 0.0225, 1, 10), hb, HARD, EYEWHITE, e);
    put(rounded(0.0105, 0.0105, 0.004, 1, 8), hb, HARD, IRIS, [e[0], e[1], e[2] - 0.0106]);
    put(rounded(0.0048, 0.0048, 0.002, 1, 6), hb, HARD, 0x050403, [e[0], e[1], e[2] - 0.0124]);
    put(rounded(0.029, 0.011, 0.019, 1, 8), hb, SKIN, C.skin, [e[0], e[1] + 0.0098, e[2] - 0.003], [-0.5, 0, 0]);
    put(rounded(0.028, 0.007, 0.017, 1, 8), hb, SKIN, C.skin, [e[0], e[1] - 0.0102, e[2] - 0.0025], [0.35, 0, 0]);
    put(rounded(0.026, 0.0022, 0.004, 0.8, 6), hb, HARD, 0x0c0907, [e[0], e[1] + 0.0058, e[2] - 0.0108], [-0.25, 0, 0]);
    put(rounded(0.016, 0.054, 0.034, 1, 8), hb, SKIN, C.skin, [sx * 0.078, 0.004, 0.008], [0, sx * 0.3, 0]);          // orelha
    put(rounded(0.006, 0.03, 0.016, 1, 6), hb, SKIN, C.earIn, [sx * 0.083, 0.006, 0.006], [0, sx * 0.3, 0]);
  }
  if (T) {
    // boné e cabelo aparecendo atrás
    put(lathe([[0, 0.088], [0.035, 0.086], [0.06, 0.067], [0.078, 0.034], [0.084, 0]], 18, 0.95, 1.1, false), hb, FAB, C.cap, [0, 0.05, 0]);
    put(rounded(0.13, 0.012, 0.075, 0.5), hb, FAB, C.cap, [0, 0.055, -0.11], [-0.15, 0, 0]);
    put(rounded(0.15, 0.05, 0.1, 1, 8), hb, FAB, C.hair, [0, 0.03, 0.045]);
  } else {
    // capacete tático com capa, trilhos, suporte de visão noturna, contrapeso e fone grande
    put(lathe([[0, 0.112], [0.025, 0.114], [0.055, 0.104], [0.08, 0.08], [0.1, 0.045], [0.108, 0]], 20, 0.92, 1.07, false), hb, FAB, C.helmet, [0, 0.038, 0.006]);
    put(rounded(0.06, 0.036, 0.024, 0.35), hb, HARD, DARK, [0, 0.08, -0.11], [-0.35, 0, 0]);
    put(rounded(0.08, 0.01, 0.09, 0.3, 6), hb, FAB, C.gear, [0, 0.138, 0]);
    put(rounded(0.07, 0.045, 0.03, 0.3), hb, FAB, C.gear, [0, 0.07, 0.115], [0.3, 0, 0]);
    put(rounded(0.14, 0.03, 0.026, 0.55, 8), hb, HARD, LENS, [0, 0.062, -0.115], [-0.45, 0, 0]);   // óculos em cima do capacete
    put(lathe([[0, 0.113], [0.012, 0.113]], 22, 0.93, 1.08, false), hb, FAB, C.strap, [0, 0.05, 0.006]);   // elástico dos óculos
    for (const sx of [-1, 1]) {
      put(rounded(0.014, 0.024, 0.12, 0.35, 6), hb, HARD, DARK, [sx * 0.104, 0.055, 0.005], [0, 0, sx * 0.2]);
      put(rounded(0.036, 0.08, 0.07, 0.6, 8), hb, HARD, C.hs, [sx * 0.091, 0, 0.008]);
      put(rounded(0.02, 0.06, 0.05, 0.6, 6), hb, HARD, DARK, [sx * 0.11, 0, 0.008]);
      put(rounded(0.012, 0.07, 0.012, 0.5, 4), hb, FAB, C.strap, [sx * 0.07, -0.06, 0.03], [0.3, 0, sx * 0.2]);   // jugular
    }
    put(rounded(0.007, 0.007, 0.075, 0.6, 4), hb, HARD, DARK, [-0.078, -0.035, -0.045], [0.25, -0.45, 0]);   // microfone no canto da boca
    put(rounded(0.016, 0.013, 0.018, 0.8, 4), hb, HARD, DARK, [-0.055, -0.048, -0.08]);
  }

  // ---- braços: manga com músculo, punho da luva, cotoveleira (CT) e mão com dedos fechados
  for (const [sx, ub, fb, hbn] of [[-1, B.uArmL, B.foreL, B.handL], [1, B.uArmR, B.foreR, B.handR]]) {
    put(lathe([[0, 0.066], [0.05, 0.068], [0.13, 0.062], [0.22, 0.054], [0.27, 0.051], [0.31, 0.05]], 16), ub, CAMO, 0xffffff, null, null, null, { blend: toNext(fb, U_ARM), ao: limbAO(U_ARM) });
    // dobras da manga perto do cotovelo
    for (let i = 0; i < 2; i++) put(lathe([[0, 0.053], [0.012, 0.055], [0.024, 0.052]], 14, 1, 1, false), ub, CAMO, 0xffffff, [0, 0.235 + i * 0.03, 0], null, null, { blend: toNext(fb, U_ARM) });
    put(lathe([[0, 0.054], [0.07, 0.055], [0.17, 0.046], [0.23, 0.042]], 16, 1, 0.9), fb, CAMO, 0xffffff, null, null, null, { blend: toPrev(ub), ao: limbAO(0.23) });
    put(lathe([[0.2, 0.044], [0.215, 0.046], [0.29, 0.042]], 14, 1, 0.9), fb, FAB, C.glove);          // punho da luva
    put(lathe([[0, 0.046], [0.012, 0.047]], 14, 1, 0.92, false), fb, FAB, C.strap, [0, 0.205, 0]);    // velcro
    if (!T) put(rounded(0.075, 0.09, 0.045, 0.45, 8), fb, HARD, C.pad, [0, 0.015, 0.044], null, null, { blend: toPrev(ub, 0.12) });
    // mão: palma, protetor dos dedos, 4 dedos em 2 gomos fechando para o lado da palma e o polegar
    const palm = sx;                    // palma voltada para +x (direita) / -x (esquerda) no espaço do osso
    put(rounded(0.032, 0.09, 0.074, 0.4), hbn, FAB, C.glove, [0, 0.045, 0]);
    put(rounded(0.012, 0.035, 0.072, 0.4, 4), hbn, HARD, T ? C.pad : DARK, [-palm * 0.02, 0.07, 0]);
    for (let i = 0; i < 4; i++) {
      const z = -0.03 + i * 0.02, len = i === 3 ? 0.03 : 0.036;
      put(rounded(0.022, len + 0.01, 0.019, 0.5, 6), hbn, FAB, C.glove, [palm * 0.006, 0.098 + len / 2, z], [0, 0, -palm * 0.5]);
      put(rounded(0.02, len, 0.018, 0.5, 6), hbn, FAB, C.glove, [palm * 0.03, 0.118 + len * 0.5, z], [0, 0, -palm * 1.6]);
    }
    put(rounded(0.022, 0.055, 0.022, 0.5, 6), hbn, FAB, C.glove, [palm * 0.022, 0.06, 0.045], [-0.5, 0, -palm * 0.3]);   // polegar
  }

  // ---- pernas: calça larga, coldre (direita) / bolso cargo (esquerda), joelheira e coturno
  for (const [sx, tb, sb, bb] of [[-1, B.thighL, B.shinL, B.bootL], [1, B.thighR, B.shinR, B.bootR]]) {
    put(lathe([[0, 0.102], [0.07, 0.11], [0.2, 0.102], [0.33, 0.088], [0.44, 0.077]], 18, 1, 1.05), tb, CAMO, 0xffffff, null, null, null,
      { blend: (x, y) => y < 0.1 ? [B.pelvis, 0.45 * (1 - smooth((y + 0.03) / 0.13))] : toNext(sb, THIGH)(x, y), ao: limbAO(THIGH) });
    if (sx > 0) {
      put(rounded(0.03, 0.18, 0.1, 0.3), tb, FAB, C.gear, [0.105, 0.17, 0]);
      put(rounded(0.045, 0.17, 0.075, 0.35), tb, HARD, DARK, [0.13, 0.17, 0.005]);
      put(rounded(0.035, 0.075, 0.045, 0.4), tb, HARD, DARK, [0.13, 0.05, -0.025], [0.35, 0, 0]);
      put(lathe([[0, 0.108], [0.035, 0.108]], 18, 1, 1.05, false), tb, FAB, C.strap, [0, 0.2, 0]);
      put(lathe([[0, 0.098], [0.035, 0.098]], 18, 1, 1.05, false), tb, FAB, C.strap, [0, 0.29, 0]);
      put(rounded(0.025, 0.2, 0.02, 0.4, 6), tb, FAB, C.strap, [0.11, -0.02, 0]);
    } else {
      put(rounded(0.04, 0.16, 0.12, 0.35), tb, CAMO, 0xffffff, [-0.1, 0.22, 0]);
      put(rounded(0.045, 0.04, 0.125, 0.4, 6), tb, CAMO, 0xffffff, [-0.103, 0.155, 0]);
    }
    for (let i = 0; i < 2; i++) put(lathe([[0, 0.079], [0.014, 0.081], [0.028, 0.078]], 16, 1, 1.05, false), tb, CAMO, 0xffffff, [0, 0.36 + i * 0.03, 0], null, null, { blend: toNext(sb, THIGH) });
    put(lathe([[0, 0.074], [0.09, 0.08], [0.2, 0.075], [0.3, 0.066], [0.36, 0.068], [0.4, 0.075], [0.44, 0.07]], 18, 1, 1.05), sb, CAMO, 0xffffff, null, null, null, { blend: toPrev(tb), ao: limbAO(SHIN) });
    put(rounded(0.125, 0.15, 0.08, 0.45, 10), sb, HARD, C.pad, [0, 0.035, 0.068], null, null, { blend: toPrev(tb, 0.1) });   // joelheira
    put(lathe([[0, 0.084], [0.025, 0.084]], 16, 1, 1.05, false), sb, FAB, C.strap, [0, 0.1, 0]);
    // coturno (origem no tornozelo): sola, bico, cano, lingueta, cadarço e alça de puxar
    const o = -0.12;
    put(rounded(0.122, 0.045, 0.31, 0.22), bb, HARD, C.sole, [0, o + 0.022, -0.045]);
    put(rounded(0.112, 0.085, 0.28, 0.45, 10), bb, HARD, C.boot, [0, o + 0.07, -0.042]);
    put(rounded(0.108, 0.18, 0.13, 0.4, 10), bb, HARD, C.boot, [0, o + 0.14, 0.015]);
    put(rounded(0.05, 0.17, 0.025, 0.4, 8), bb, HARD, C.boot, [0, o + 0.125, -0.06], [0.35, 0, 0]);
    put(rounded(0.104, 0.05, 0.11, 0.5, 8), bb, HARD, C.boot, [0, o + 0.06, -0.15]);           // biqueira
    for (let i = 0; i < 6; i++) put(rounded(0.056, 0.007, 0.01, 0.5, 4), bb, HARD, C.sole, [0, o + 0.065 + i * 0.026, -0.085 + i * 0.009], [0.35, 0, 0]);
    put(rounded(0.03, 0.04, 0.008, 0.5, 4), bb, FAB, C.strap, [0, o + 0.24, 0.08]);
  }
  const geo = A.build();
  geo.computeBoundingSphere();
  return (TEMPLATES[team] = { geo, binds });
}

// ---------------------------------------------------------------- IK e ajuda de matemática
const _d = new V3(), _p = new V3(), _x = new V3(), _y = new V3(), _z = new V3(), _m4 = new THREE.Matrix4();
// IK de dois ossos: cotovelo/joelho E e ponta W para alcançar T saindo de S; outDir = para onde a junta aponta
function solveIK(S, T, a, b, pole, outE, outW, outDir) {
  _d.subVectors(T, S);
  let L = _d.length();
  L = Math.min(Math.max(L, Math.abs(a - b) + 1e-3), a + b - 1e-3);
  _d.normalize();
  const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_p.lengthSq() < 1e-8) _p.set(0, 0, 1);
  _p.normalize();
  outE.copy(S).addScaledVector(_d, x).addScaledVector(_p, h);
  outW.copy(S).addScaledVector(_d, L);
  outDir.copy(_p);
}
// osso de A até B (eixo y ao longo do membro, +z para o lado de fora da dobra)
function aimBone(bone, A, Bp, out) {
  _y.subVectors(Bp, A).normalize();
  _z.copy(out).addScaledVector(_y, -out.dot(_y));
  if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1).addScaledVector(_y, -_y.z);
  _z.normalize(); _x.crossVectors(_y, _z);
  _m4.makeBasis(_x, _y, _z);
  bone.quaternion.setFromRotationMatrix(_m4);
  bone.position.copy(A);
}
// recarga em terceira pessoa: [mão no carregador, mão no colete, giro da arma, inclinação]
const RELOAD3P = [
  [0.00, [0, 0, 0, 0]],
  [0.1, [1, 0, 0.35, -0.2]],
  [0.2, [1, 0, 0.45, -0.28]],      // puxa o carregador vazio
  [0.34, [0, 1, 0.42, -0.25]],     // mão no bolso do colete
  [0.48, [0.35, 0.65, 0.42, -0.25]],
  [0.6, [1, 0, 0.42, -0.25]],      // encaixa o novo
  [0.66, [1, 0, 0.3, -0.16]],      // tapa
  [0.78, [0.4, 0, 0.14, -0.06]],
  [0.9, [0, 0, 0.03, 0]],
  [1.00, [0, 0, 0, 0]],
];

// ---------------------------------------------------------------- soldado
export class Soldier {
  constructor(team, weaponKey = 'ak47') {
    this.team = team;
    const tpl = template(team);
    this.root = new THREE.Group();
    this.rig = new THREE.Group(); this.root.add(this.rig);
    // ossos: tronco em cadeia (quadril > peito > pescoço > cabeça); braços e pernas soltos no rig
    const bones = [];
    for (let i = 0; i < 16; i++) bones.push(new THREE.Bone());
    const [pel, che, nec, hea] = bones;
    pel.position.set(0, PELVIS_Y, 0); che.position.copy(CHEST_OFS); nec.position.copy(NECK_OFS); hea.position.copy(HEAD_OFS);
    this.rig.add(pel); pel.add(che); che.add(nec); nec.add(hea);
    for (let i = 4; i < 16; i++) { bones[i].position.copy(tpl.binds[i]); this.rig.add(bones[i]); }
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(bones);
    this.mesh = new THREE.SkinnedMesh(tpl.geo, materials(team));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.boundingSphere = new THREE.Sphere(new V3(0, 0.7, 0), 1.9);   // cobre também o corpo caído
    this.root.add(this.mesh);
    this.mesh.bind(this.skeleton);
    for (const o of [pel, che, nec, hea]) o.rotation.order = 'YXZ';
    this.bones = bones; this.pelvis = pel; this.chest = che; this.neck = nec; this.head = hea;
    this.arms = [[-1, B.uArmL, B.foreL, B.handL], [1, B.uArmR, B.foreR, B.handR]].map(([sx, u, f, h]) => ({ sx, u: bones[u], f: bones[f], h: bones[h] }));
    this.legs = [[-1, B.thighL, B.shinL, B.bootL], [1, B.thighR, B.shinR, B.bootR]].map(([sx, t, s, b]) => ({ sx, t: bones[t], s: bones[s], b: bones[b] }));
    // arma (gira com a mira)
    this.aim = new THREE.Group(); this.aim.position.set(0, 0.45, 0); this.aim.rotation.order = 'YXZ'; che.add(this.aim);
    // pontos presos no peito: ombros e o bolso de carregadores (a mão vai lá na recarga)
    for (const arm of this.arms) { arm.anchor = new THREE.Object3D(); arm.anchor.position.copy(SHOULDER(arm.sx)); che.add(arm.anchor); }
    this.pouch = new THREE.Object3D(); this.pouch.position.set(-0.09, 0.27, -0.24); che.add(this.pouch);
    this.state = { t: Math.random() * 10, phase: 0, speed: 0, crouch: 0, dirX: 0, dirZ: -1, kick: 0, flinch: new V3(), stagger: new V3(), lastHit: null, lastHitT: -9, lastHead: false, deadT: 0, reloadT: -1, seed: Math.random() * 10 };
    this.v = { S: new V3(), T: new V3(), E: new V3(), W: new V3(), O: new V3(), H: new V3(), F: new V3(), P: new V3(), M: new V3(), G: new V3(), Q: new V3() };
    this.setWeapon(weaponKey);
    this.update(0);
  }

  setWeapon(key) {
    if (!key || this.weaponKey === key) return;
    this.weaponKey = key;
    if (this.gun) this.aim.remove(this.gun);
    const w = buildWeaponModel(key);
    w.group.traverse(o => { if (o.isMesh) o.castShadow = false; });   // sombra da arma pesa e quase não aparece
    const gun = new THREE.Group(); gun.add(w.group);
    w.group.rotation.y = Math.PI / 2;                                    // cano (+x da arma) para a frente (-z)
    const pistol = ['glock', 'usp', 'deagle'].includes(key), nade = ['he', 'flash', 'smoke'].includes(key), knife = key === 'knife';
    if (nade) gun.position.set(0.12, -0.12, -0.3);
    else if (pistol) gun.position.set(0.05, -0.02, -0.42);
    else if (knife) gun.position.set(0.2, -0.28, -0.25);
    else gun.position.set(0.12, -0.03, -0.38);
    this.aim.add(gun); this.gun = gun; this.muzzle = w.muzzle; this.wmag = w.mag;
    this.gripR = new THREE.Object3D(); this.gripR.position.set(...(nade ? [0, -0.02, 0.03] : [-0.075, -0.075, 0.02])); w.group.add(this.gripR);
    this.gripL = new THREE.Object3D(); w.group.add(this.gripL);
    if (pistol) this.gripL.position.set(-0.08, -0.1, -0.03);
    else if (w.fore) this.gripL.position.set(w.fore.x, w.fore.y - 0.035, -0.03);
    else this.gripL.position.set(0.21, -0.05, -0.03);
    // ponto do carregador (para a mão esquerda na recarga)
    this.magP = new THREE.Object3D(); w.group.add(this.magP);
    if (w.mag) {
      w.group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(w.mag), inv = new THREE.Matrix4().copy(w.group.matrixWorld).invert();
      if (!box.isEmpty()) this.magP.position.copy(box.getCenter(new V3()).applyMatrix4(inv));
    } else this.magP.position.set(0.02, -0.1, 0);
    this.twoHanded = !knife && !nade; this.pistol = pistol;
    this.twist = this.twoHanded && !pistol ? -0.45 : -0.15;
    this.canReload = this.twoHanded;
  }

  fire() { this.state.kick = 1; }
  // levou tiro: o tronco e a cabeça dão um tranco (dir = direção do tiro no espaço do boneco)
  hit(dir, headshot) {
    const st = this.state, k = headshot ? 1.6 : 1;
    st.flinch.add(new V3(-0.22 * k - dir.z * 0.1, dir.x * 0.25, -dir.x * 0.18));
    // o corpo inteiro é empurrado na direção do tiro e cambaleia (x/z: deslocamento, y: quanto inclina)
    st.stagger.x += dir.x * 0.09 * k; st.stagger.z += dir.z * 0.09 * k; st.stagger.y = Math.min(1, st.stagger.y + 0.55 * k);
    st.lastHit = dir.clone(); st.lastHitT = st.t; st.lastHead = !!headshot;
  }

  // ponto de um objeto (filho de algum osso) no espaço do rig
  toRig(obj, out) {
    out.set(0, 0, 0);
    for (let o = obj; o && o !== this.rig; o = o.parent) { o.updateMatrix(); out.applyMatrix4(o.matrix); }
    return out;
  }

  placeArm(arm, target, pole) {
    const v = this.v;
    this.toRig(arm.anchor, v.S);
    solveIK(v.S, target, U_ARM, F_ARM, pole, v.E, v.W, v.O);
    aimBone(arm.u, v.S, v.E, v.O);
    aimBone(arm.f, v.E, v.W, v.O);
    arm.h.position.copy(v.W); arm.h.quaternion.copy(arm.f.quaternion);
  }
  placeLeg(leg, hip, foot, pole, bootRot) {
    const v = this.v;
    solveIK(hip, foot, THIGH, SHIN, pole, v.E, v.W, v.O);
    aimBone(leg.t, hip, v.E, v.O);
    aimBone(leg.s, v.E, v.W, v.O);
    leg.b.position.copy(v.W); leg.b.rotation.set(bootRot[0], bootRot[1], bootRot[2] || 0, 'YXZ');
  }

  // s: { speed, vel: [x, z] (espaço do boneco), crouch 0..1, pitch, reload (bool), dead (bool) }
  update(dt, s = {}) {
    const st = this.state, v = this.v;
    st.t += dt;
    if (s.dead) { this.die(dt); return; }
    if (st.deadT > 0) this.revive();
    st.speed += ((s.speed ?? 0) - st.speed) * Math.min(1, dt * 8);
    st.crouch += ((s.crouch ?? 0) - st.crouch) * Math.min(1, dt * 9);
    const pitch = s.pitch ?? 0;
    let vx = s.vel ? s.vel[0] : 0, vz = s.vel ? s.vel[1] : 0;
    if (!Number.isFinite(vx) || !Number.isFinite(vz)) vx = vz = 0;
    if (!Number.isFinite(st.speed)) st.speed = 0;
    const vl = Math.hypot(vx, vz);
    if (vl > 0.3) {
      st.dirX += (vx / vl - st.dirX) * Math.min(1, dt * 10); st.dirZ += (vz / vl - st.dirZ) * Math.min(1, dt * 10);
      const dl = Math.hypot(st.dirX, st.dirZ) || 1; st.dirX /= dl; st.dirZ /= dl;
    }
    // ---- marcha: o passo acompanha a distância andada de verdade (o pé não escorrega no chão)
    const sp = st.speed, ck = st.crouch;
    const moveK = smooth((sp - 0.25) / 1.2);                         // está se mexendo
    const runK = smooth((sp - 6.3) / 0.7) * (1 - ck);                // correndo (Shift)
    const stepLen = Math.min(1.1, 0.42 + sp * 0.11) * (1 - ck * 0.3);   // metros por passo
    if (sp > 0.2) st.phase += sp * dt / stepLen * Math.PI;            // 2 passos = uma volta (2π)
    const duty = 0.62 - 0.22 * smooth((sp - 2) / 4.5);                // fração do ciclo com o pé no chão
    const idle = 1 - moveK;
    const breathe = Math.sin(st.t * (1.6 + runK * 1.6) + st.seed);
    const shift = Math.sin(st.t * 0.7 + st.seed) * idle;              // troca o peso de perna quando parado
    // recarga: começa quando o servidor avisa
    if (s.reload && st.reloadT < 0 && this.canReload) st.reloadT = 0;
    if (!s.reload && st.reloadT >= 0 && st.reloadT > 0.3) st.reloadT = -1;
    const dur = (WEAPONS[this.weaponKey]?.reload || 2) * 0.95;
    let r = -1;
    if (st.reloadT >= 0) { st.reloadT += dt; r = st.reloadT / dur; if (r >= 1) { st.reloadT = -1; r = -1; } }
    const [rw, rp, rRoll, rPitch] = r < 0 ? [0, 0, 0, 0] : track(RELOAD3P, r);
    if (this.wmag) this.wmag.visible = !(r > 0.2 && r < 0.6);

    // quadril: no andar ele sobe no meio do passo; na corrida ele afunda quando o pé apoia
    const x2 = 2 * (st.phase - duty * Math.PI);
    const bob = (0.022 * (1 - runK) - 0.035 * runK) * Math.cos(x2) * moveK;
    const hipY = PELVIS_Y - ck * 0.55 - runK * 0.01 - 0.012 * moveK + bob - Math.abs(shift) * 0.008;
    const sway = Math.sin(st.phase) * 0.028 * (1 - runK * 0.6) * moveK;   // o peso passa de uma perna para a outra
    this.pelvis.position.set(sway + shift * 0.02, hipY, 0);
    this.pelvis.rotation.set(0, Math.sin(st.phase) * (0.1 + 0.08 * runK) * moveK, -Math.sin(st.phase) * 0.05 * moveK + shift * 0.03);
    // tronco: postura de tiro; inclina mais para a frente correndo; respira e dá o tranco quando leva tiro
    const leanF = (-st.dirZ * 0.06 + 0.1 * smooth((sp - 3) / 3)) * moveK * (1 - ck) + runK * 0.2, leanS = -st.dirX * moveK * 0.06;
    st.flinch.multiplyScalar(Math.exp(-dt * 9));
    // cambaleio: o boneco é jogado para trás/de lado e volta ao lugar
    st.stagger.multiplyScalar(Math.exp(-dt * 6));
    this.rig.position.set(st.stagger.x, 0, st.stagger.z);
    this.rig.rotation.set(st.stagger.z * 1.6 * st.stagger.y, 0, -st.stagger.x * 1.6 * st.stagger.y);
    st.kick *= Math.exp(-dt * 14);
    const twist = this.twist * (1 - runK * 0.5);
    this.chest.rotation.set(-(0.05 + leanF + ck * 0.38) + breathe * (0.012 + runK * 0.01) - st.flinch.x, twist - this.pelvis.rotation.y * 1.3 + st.flinch.y, leanS - this.pelvis.rotation.z * 0.8 + st.flinch.z);
    this.chest.scale.set(1 + breathe * 0.006, 1, 1 + breathe * 0.01);
    this.neck.rotation.set(ck * 0.2 + leanF * 0.7, -twist * 0.8 + Math.sin(st.t * 0.37 + st.seed) * 0.12 * idle, -this.chest.rotation.z * 0.6);
    // arma: segue a mira; correndo vai para a posição baixa (cano para o chão, junto ao corpo)
    const bounce = Math.cos(x2) * moveK;
    const sw = Math.sin(st.t * 1.3) * 0.012 * idle + bounce * (0.012 + runK * 0.03);
    this.aim.rotation.set(pitch * (1 - runK) - this.chest.rotation.x + sw + st.kick * 0.07 - runK * 0.6 + rPitch,
      -twist + this.pelvis.rotation.y * 0.5 + runK * 0.35, -leanS + runK * 0.35 + rRoll);
    this.head.rotation.set(pitch * 0.6 * (1 - runK) - 0.04 + st.flinch.x * 1.5 - rPitch * 0.8 - runK * 0.1, -rRoll * 0.3, 0);

    // braços até a arma (as mãos nunca saem dela; na recarga a esquerda vai ao carregador e ao colete)
    for (const arm of this.arms) {
      const poleC = v.P.set(arm.sx * 0.9, -1, arm.sx > 0 ? 0.6 : 0.2);
      if (arm.sx > 0) this.toRig(this.gripR, v.T);
      else if (this.twoHanded) {
        this.toRig(this.gripL, v.G);
        if (r >= 0) {
          this.toRig(this.magP, v.M); v.M.y -= 0.05;
          this.toRig(this.pouch, v.F);
          v.T.copy(v.G).multiplyScalar(1 - rw - rp).addScaledVector(v.M, rw).addScaledVector(v.F, rp);
        } else v.T.copy(v.G);
      } else {
        // faca/granada: braço esquerdo solto, balançando ao contrário da perna esquerda
        this.toRig(arm.anchor, v.S);
        const swing = Math.sin(st.phase) * (0.14 + runK * 0.14) * moveK;
        v.T.set(v.S.x - 0.05, v.S.y - 0.55 + ck * 0.1 + runK * 0.2, v.S.z - 0.02 + swing - runK * 0.1);
        poleC.set(-0.3, 0, 1);
      }
      this.placeArm(arm, v.T, poleC);
    }

    // pernas: ciclo de verdade com apoio (pé parado no chão, indo para trás junto com o corpo) e balanço
    // (pé sobe num arco e vai para a frente); calcanhar toca primeiro e a ponta empurra no fim
    this.pelvis.updateMatrix();
    const L = 2 * stepLen, liftH = (0.1 + 0.16 * runK + 0.03 * ck) * moveK;
    for (const leg of this.legs) {
      const c = ((st.phase / (2 * Math.PI) + (leg.sx > 0 ? 0 : 0.5)) % 1 + 1) % 1;
      let along, lift, toe;
      if (c < duty) {
        const k = c / duty;
        along = (0.5 - k) * duty * L; lift = 0;
        toe = k < 0.15 ? 0.3 * (1 - k / 0.15) : k > 0.65 ? -0.55 * (k - 0.65) / 0.35 : 0;
      } else {
        const k = (c - duty) / (1 - duty);
        along = (-0.5 + smooth(k)) * duty * L; lift = Math.sin(k * Math.PI) * liftH;
        toe = -0.55 + 0.85 * smooth(k * 1.3);
        // correndo: o calcanhar sobe para trás (perto do bumbum) antes do joelho vir para a frente
        const kick = Math.sin(Math.min(1, k / 0.65) * Math.PI) * runK;
        lift += 0.2 * kick; along -= 0.28 * kick; toe -= 0.5 * kick;
      }
      along = Math.max(-0.6, Math.min(0.45, along)) * moveK;
      toe *= moveK;
      if (toe < 0) lift += -toe * 0.12;                             // calcanhar sobe girando na ponta do pé
      // parado: base de tiro (pé esquerdo à frente, direito atrás e mais aberto)
      const stanceZ = ((leg.sx > 0 ? 0.1 : -0.12) + (leg.sx > 0 ? 0.08 : -0.12) * ck * 2.2) * idle;
      const stanceX = leg.sx * (0.11 + (leg.sx > 0 ? 0.04 : 0.02) * idle + ck * 0.08) + (leg.sx > 0 ? -shift : shift) * 0.015;
      v.H.copy(HIP(leg.sx)).applyMatrix4(this.pelvis.matrix);
      v.F.set(stanceX + st.dirX * along, 0.12 + lift, stanceZ + st.dirZ * along);
      this.placeLeg(leg, v.H, v.F, v.Q.set(leg.sx * 0.15, 0.2, -1), [toe, (leg.sx > 0 ? -0.15 : 0.1) * (1 - moveK * 0.6)]);
    }
  }

  // morte: joelhos dobram, o corpo tomba (para trás ou de cara no chão), braços e cabeça amolecem
  die(dt) {
    const st = this.state, v = this.v;
    if (st.deadT === 0) {
      // cai para o lado de onde o tiro empurrou (tiro de frente: de costas); sem tiro recente, sorteia
      const H = st.t - st.lastHitT < 0.6 ? st.lastHit : null;
      st.deadBack = H ? H.z > -0.2 : Math.random() < 0.65;
      st.deadSide = H && Math.abs(H.x) > 0.15 ? Math.sign(H.x) : (Math.random() < 0.5 ? -1 : 1);
      st.deadFast = !!(H && st.lastHead);   // tiro na cabeça: desaba na hora, sem dobrar devagar
      st.stagger.set(0, 0, 0);
      if (this.gun) this.gun.visible = false;
      st.deadPitch = this.chest.rotation.x;
    }
    st.deadT = Math.min(1, st.deadT + dt / (st.deadFast ? 0.55 : 0.8));
    const t = st.deadT, buckle = smooth(t / (st.deadFast ? 0.12 : 0.3));
    const f = clamp01((t - 0.15) / 0.85);
    const e = f < 0.82 ? Math.pow(f / 0.82, 2) : 1 - Math.sin((f - 0.82) / 0.18 * Math.PI) * 0.04;   // queda com um quique leve
    const dir = st.deadBack ? 1 : -1;
    this.rig.rotation.set(dir * e * Math.PI / 2 * 0.93, 0, st.deadSide * e * 0.22);
    this.rig.position.set(0, e * 0.13, dir * e * 0.32);
    this.pelvis.position.set(0, PELVIS_Y - buckle * 0.28 * (1 - e * 0.7), 0);
    this.pelvis.rotation.set(0, 0, st.deadSide * e * 0.1);
    this.chest.rotation.set(st.deadPitch * (1 - buckle) + buckle * 0.25 - dir * e * 0.2, st.deadSide * e * 0.15, 0);
    this.chest.scale.set(1, 1, 1);
    this.neck.rotation.set(-dir * e * 0.45 + buckle * 0.2, st.deadSide * e * 0.7, st.deadSide * e * 0.2);
    this.head.rotation.set(st.deadFast ? -0.5 * (1 - e * 0.5) : 0, 0, 0);   // tiro na cabeça: a cabeça vai para trás
    for (const arm of this.arms) {
      this.toRig(arm.anchor, v.S);
      const flung = arm.sx === st.deadSide && st.deadBack;
      v.T.set(v.S.x + arm.sx * (flung ? 0.42 : 0.2), v.S.y + (flung ? 0.12 * e - 0.1 : -0.5 + buckle * 0.1), v.S.z + dir * 0.1);
      this.placeArm(arm, v.T, v.P.set(arm.sx * 0.3, 0, dir));
    }
    this.pelvis.updateMatrix();
    for (const leg of this.legs) {
      v.H.copy(HIP(leg.sx)).applyMatrix4(this.pelvis.matrix);
      v.F.set(leg.sx * (0.17 + e * 0.06), 0.12 + buckle * 0.06 * (leg.sx === st.deadSide ? 2 : 1), -buckle * 0.1 * (1 - e));
      this.placeLeg(leg, v.H, v.F, v.Q.set(leg.sx * 0.2, 0.2, -1), [-e * 0.3 * dir, leg.sx * 0.3 * e]);
    }
  }
  revive() {
    const st = this.state;
    st.deadT = 0; st.reloadT = -1;
    this.rig.rotation.set(0, 0, 0); this.rig.position.set(0, 0, 0);
    if (this.gun) this.gun.visible = true;
  }
}
