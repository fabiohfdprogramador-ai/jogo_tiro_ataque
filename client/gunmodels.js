// Carrega os modelos 3D realistas das armas (.glb) e converte para o "espaço da arma" do jogo:
// metros, +x = frente (cano), +y = cima, mão direita na empunhadura em GRIP.
// Cada arma vira: corpo + carregador separado (para a animação de recarga) + ponto do cano.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export const GRIP = new THREE.Vector3(-0.068, -0.095, 0);   // onde a mão direita segura

// Medidas tiradas dos modelos (em unidades do arquivo). "a" = coordenada ao longo do cano.
const DEFS = {
  ak47: {
    file: 'ak47', fwd: '-x', scale: 0.00328,
    grip: [48, 3], fore: [-62, 33], muzzle: [-190, 33],
    sight: { rear: [5, 56], front: [-3, 56] },          // centro do vidro da mira (red dot)
    // vidro da mira: no arquivo é uma placa escura; ela sai e entra um vidro transparente de verdade
    lens: { cut: [[-3.7, -1.3, 52.8, 59.2, -3.8, 3.8]], at: -3, h: [52.8, 59.2], w: [-3.6, 3.6] },
    mag: { a: [-42, 16], y: [-38, 20] },
  },
  m4a4: {
    file: 'm4a1', fwd: '+z', scale: 0.0086,
    grip: [-17, -6], fore: [32, 4], muzzle: [52, 5.6],
    sight: { rear: [-9, 15.4], front: [-4, 15.4] },   // centro do vidro da mira holográfica
    mag: { a: [-8, 6], y: [-18.5, -1.5] },
  },
  awp: {
    file: 'awp', fwd: '+x', scale: 0.0025,
    grip: [-108, 6], fore: [10, 24], muzzle: [232, 30],
    mag: { a: [-76, -43], y: [-3, 12] },
  },
  pistol: {
    file: 'pistola', fwd: '+z', scale: 1.0,
    region: { a: [-0.26, 0.0], y: [-0.07, 0.12] }, exclude: /supressor/i,
    grip: [-0.18, -0.005], fore: null, muzzle: [-0.03, 0.048],
    sight: { rear: [-0.16, 0.08], front: [-0.125, 0.08] },
    mag: { a: [-0.23, -0.13], y: [-0.07, 0.05], material: /magazine/i },
  },
};
const KEY_DEF = { ak47: 'ak47', m4a4: 'm4a4', awp: 'awp', glock: 'pistol', usp: 'pistol', deagle: 'pistol' };

const templates = {};
let loadPromise = null;

// lê o eixo "a" (ao longo do cano) e o lateral de um ponto do modelo
function axisInfo(fwd) {
  const k = fwd[1], sign = fwd[0] === '-' ? -1 : 1;
  const lat = k === 'x' ? 'z' : 'x';
  return { k, sign, lat };
}

function bakeMesh(mesh) {
  // geometria com a transformação do modelo aplicada (inclui malhas com esqueleto em pose de repouso)
  const g = mesh.geometry.clone();
  // os arquivos otimizados guardam posições "quantizadas" (inteiros); converte para float antes de transformar
  for (const name of ['position', 'normal']) {
    const att = g.attributes[name];
    if (!att || att.array instanceof Float32Array) continue;
    const out = new Float32Array(att.count * att.itemSize);
    const get = [att.getX, att.getY, att.getZ, att.getW];
    for (let i = 0; i < att.count; i++) for (let c = 0; c < att.itemSize; c++) out[i * att.itemSize + c] = get[c].call(att, i);
    g.setAttribute(name, new THREE.BufferAttribute(out, att.itemSize));
  }
  if (mesh.isSkinnedMesh) {
    const pos = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); pos.setXYZ(i, v.x, v.y, v.z); }
    g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight');
  }
  g.applyMatrix4(mesh.matrixWorld);
  // normais vazias viram NaN ao transformar e "apagam" a tela no pós-processamento: corrige
  const n = g.attributes.normal;
  if (n) for (let i = 0; i < n.array.length; i++) if (!Number.isFinite(n.array[i])) n.array[i] = 0;
  return g;
}

// separa os triângulos que caem dentro de uma caixa (o carregador) em outra geometria
function splitByBox(geo, test) {
  const idx = geo.index ? geo.index.array : null;
  const pos = geo.attributes.position;
  const triCount = idx ? idx.length / 3 : pos.count / 3;
  const keep = [], take = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
    (test(cx, cy, cz) ? take : keep).push(i0, i1, i2);
  }
  const make = (list) => { if (!list.length) return null; const g = geo.clone(); g.setIndex(list); return g; };
  return [make(keep), make(take)];
}

// tira os triângulos da placa do vidro da mira (virados para a frente/trás, dentro da caixa do vidro)
function dropLens(geo, L, k) {
  const idx = geo.index ? geo.index.array : null;
  const pos = geo.attributes.position, triCount = idx ? idx.length / 3 : pos.count / 3;
  const keep = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e = new THREE.Vector3();
  const lat = k === 'x' ? 'z' : 'x', inR = (v, r) => v >= r[0] && v <= r[1];
  for (let t = 0; t < triCount; t++) {
    const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    n.subVectors(b, a).cross(e.subVectors(c, a)).normalize();
    const ctr = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, z: (a.z + b.z + c.z) / 3 };
    const isLens = Math.abs(n[k]) > 0.9 && L.cut.some(([a0, a1, y0, y1, l0, l1]) => inR(ctr[k], [a0, a1]) && inR(ctr.y, [y0, y1]) && inR(ctr[lat], [l0, l1]));
    if (!isLens) keep.push(i0, i1, i2);
  }
  const g = geo.clone(); g.setIndex(keep); return g;
}

async function prepare(key, def, loader) {
  const gltf = await loader.loadAsync(`/models/${def.file}.glb`);
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const { k, sign, lat } = axisInfo(def.fwd);
  const inRange = (v, r) => v >= r[0] && v <= r[1];
  const parts = [];
  scene.traverse(o => { if (o.isMesh) parts.push(o); });

  // centro lateral (para a arma ficar centralizada)
  const box = new THREE.Box3();
  const body = [], mag = [];
  for (const mesh of parts) {
    let g = bakeMesh(mesh);
    if (def.lens) g = dropLens(g, def.lens, k);
    g.computeBoundingBox();
    const ctr = g.boundingBox.getCenter(new THREE.Vector3());
    if (def.region && !(inRange(ctr[k], def.region.a) && inRange(ctr.y, def.region.y))) continue;
    const matName = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.name || '';
    if (def.exclude && def.exclude.test(matName)) continue;
    box.union(g.boundingBox);
    const M = def.mag;
    const magOK = !M.material || M.material.test(matName);
    if (magOK) {
      const [keep, take] = splitByBox(g, (x, y, z) => inRange(({ x, y, z })[k], M.a) && inRange(y, M.y));
      if (keep) body.push([keep, mesh.material]);
      if (take) mag.push([take, mesh.material]);
    } else body.push([g, mesh.material]);
  }
  const latC = (box.min[lat] + box.max[lat]) / 2;
  const s = def.scale;
  // matriz: modelo -> espaço da arma
  const toGun = (a, y, l = latC) => new THREE.Vector3(sign * (a - def.grip[0]) * s + GRIP.x, (y - def.grip[1]) * s + GRIP.y, (l - latC) * s * (k === 'x' ? sign : -sign));
  const m = new THREE.Matrix4();
  // colunas: para onde vão os eixos do modelo
  const ex = new THREE.Vector3(), ey = new THREE.Vector3(0, s, 0), ez = new THREE.Vector3();
  if (k === 'x') { ex.set(sign * s, 0, 0); ez.set(0, 0, sign * s); } else { ez.set(sign * s, 0, 0); ex.set(0, 0, -sign * s); }
  const origin = toGun(0, 0, 0);
  if (k === 'x') origin.set(sign * (0 - def.grip[0]) * s + GRIP.x, (0 - def.grip[1]) * s + GRIP.y, (0 - latC) * s * sign);
  else origin.set(sign * (0 - def.grip[0]) * s + GRIP.x, (0 - def.grip[1]) * s + GRIP.y, (0 - latC) * -sign * s);
  m.makeBasis(ex, ey, ez).setPosition(origin);

  const fixMat = (mat) => {
    const list = Array.isArray(mat) ? mat : [mat];
    for (const mm of list) {
      if (!mm || !('envMapIntensity' in mm)) continue;
      mm.envMapIntensity = 0.35;                                  // reflexo do céu mais discreto
      if (mm.roughness !== undefined) mm.roughness = Math.max(mm.roughness, 0.45);
    }
    return mat;
  };
  const bodyMeshes = body.map(([g, mat]) => { g.applyMatrix4(m); g.computeBoundingSphere(); return new THREE.Mesh(g, fixMat(mat)); });
  const magMeshes = mag.map(([g, mat]) => { g.applyMatrix4(m); g.computeBoundingSphere(); return new THREE.Mesh(g, fixMat(mat)); });
  const P = (p) => (p ? toGun(p[0], p[1]) : null);
  if (key === 'awp') {   // materiais de verdade e luneta redonda no lugar do bloco quadrado do modelo
    restyleAWP([...bodyMeshes, ...magMeshes]);
    for (let i = bodyMeshes.length - 1; i >= 0; i--) if (bodyMeshes[i].userData.awpPart === 'scope' || bodyMeshes[i].userData.awpPart === 'glass') bodyMeshes.splice(i, 1);
    bodyMeshes.push(...awpScope().children.slice());
  }
  if (def.lens) {
    // vidro levemente azulado e quase transparente, com um reflexo discreto do céu
    const L = def.lens, w = (L.w[1] - L.w[0]) * s, h = (L.h[1] - L.h[0]) * s;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
      color: 0xa8d4dc, transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2,
    }));
    glass.rotation.y = Math.PI / 2;
    glass.position.copy(toGun(L.at, (L.h[0] + L.h[1]) / 2, (L.w[0] + L.w[1]) / 2));
    glass.renderOrder = 2;
    bodyMeshes.push(glass);
  }
  templates[key] = {
    bodyMeshes, magMeshes,
    muzzle: P(def.muzzle), fore: P(def.fore),
    // lat: deslocamento lateral do centro da mira (a mira do AK fica um pouco de lado no modelo)
    sight: def.sight ? { rear: [P(def.sight.rear).x, P(def.sight.rear).y], front: [P(def.sight.front).x, P(def.sight.front).y],
      lat: def.lens ? toGun(def.lens.at, 0, (def.lens.w[0] + def.lens.w[1]) / 2).z : 0 } : null,
  };
}

export function loadGunModels() {
  if (loadPromise) return loadPromise;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loadPromise = Promise.all(Object.entries(DEFS).map(([key, def]) => prepare(key, def, loader).catch(e => console.warn('Modelo não carregou:', def.file, e))));
  return loadPromise;
}

// Cria uma cópia da arma (compartilha geometria e texturas). Retorna null se o modelo não estiver pronto.
export function makeGunFromModel(key, extras = {}) {
  const T = templates[KEY_DEF[key]];
  if (!T) return null;
  const group = new THREE.Group();
  const scale = key === 'deagle' ? 1.12 : 1;
  const inner = new THREE.Group(); inner.scale.setScalar(scale);
  inner.position.copy(GRIP).multiplyScalar(1 - scale);     // a empunhadura continua no mesmo lugar
  group.add(inner);
  for (const mesh of T.bodyMeshes) { const c = new THREE.Mesh(mesh.geometry, mesh.material); c.position.copy(mesh.position); c.quaternion.copy(mesh.quaternion); c.renderOrder = mesh.renderOrder; inner.add(c); }
  const magG = new THREE.Group(); inner.add(magG);
  for (const mesh of T.magMeshes) magG.add(new THREE.Mesh(mesh.geometry, mesh.material));
  const muzzle = new THREE.Object3D(); muzzle.position.copy(T.muzzle); inner.add(muzzle);
  if (key === 'usp' && extras.suppressor) {
    const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.15, 24), extras.suppressor);
    sup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
    sup.position.copy(T.muzzle).add(new THREE.Vector3(0.075, 0, 0)); inner.add(sup);
    muzzle.position.x += 0.15;
  }
  if (key === 'deagle' && extras.silver) inner.traverse(o => { if (o.isMesh && !magG.children.includes(o)) o.material = extras.silver; });
  group.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  const toOuter = (v) => (v ? v.clone().multiplyScalar(scale).add(inner.position) : null);
  return {
    group, mag: T.magMeshes.length ? magG : null, muzzle,
    fore: toOuter(T.fore),
    sight: T.sight ? { rear: [T.sight.rear[0] * scale + inner.position.x, T.sight.rear[1] * scale + inner.position.y], front: [T.sight.front[0] * scale + inner.position.x, T.sight.front[1] * scale + inner.position.y], lat: T.sight.lat * scale + inner.position.z } : null,
  };
}
export const gunModelsReady = () => Object.keys(templates).length > 0;

// ---------- AWP: o modelo veio só com cores lisas; aqui ganha materiais de verdade ----------
// Corpo verde-oliva com tinta gasta, cano e ferragens de aço, luneta preta anodizada, lente de vidro e
// superfícies suavizadas (as faces chapadas do modelo low-poly viram curvas onde o ângulo é pequeno).
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(size, draw, repeat, srgb) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const wornPaint = (base, chip, seed) => canvasTex(1024, (g, s) => {
  const r = rnd(seed);
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 120; i++) {   // manchas e variação da tinta
    const x = r() * s, y = r() * s, rad = 20 + r() * 140, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,230,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 900; i++) {   // lascados e arranhões mostrando o material de baixo
    const x = r() * s, y = r() * s, l = 2 + r() * 22, a = r() * 6.28;
    g.strokeStyle = chip; g.globalAlpha = 0.15 + r() * 0.45; g.lineWidth = 0.6 + r() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 40000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.05)'; g.fillRect(r() * s, r() * s, 1.3, 1.3); }
}, 1, true);
const grainRough = canvasTex(512, (g, s) => {
  const r = rnd(7); g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 50000; i++) { const v = (r() * 255) | 0; g.fillStyle = `rgba(${v},${v},${v},.2)`; g.fillRect(r() * s, r() * s, 1.5, 1.5); }
}, 4, false);
// relevo fino (textura de polímero emborrachado / metal jateado) como normal map de ruído
const grainNormal = canvasTex(256, (g, s) => {
  const r = rnd(11), img = g.createImageData(s, s);
  for (let i = 0; i < s * s; i++) { const dx = (r() - 0.5) * 40, dy = (r() - 0.5) * 40; img.data[i * 4] = 128 + dx; img.data[i * 4 + 1] = 128 + dy; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}, 10, false);
let AWP_MATS = null;
function awpMaterials() {
  if (AWP_MATS) return AWP_MATS;
  const N = new THREE.Vector2(0.35, 0.35);
  AWP_MATS = {
    stock: new THREE.MeshPhysicalMaterial({ map: wornPaint('#4e5733', 'rgba(26,28,24,1)', 3), roughnessMap: grainRough, normalMap: grainNormal, normalScale: N, roughness: 0.7, clearcoat: 0.1, clearcoatRoughness: 0.6, envMapIntensity: 0.4 }),
    grip: new THREE.MeshStandardMaterial({ color: 0x1c1d1b, roughnessMap: grainRough, normalMap: grainNormal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.85, envMapIntensity: 0.35 }),
    steel: new THREE.MeshPhysicalMaterial({ map: wornPaint('#2a2c2f', 'rgba(150,152,155,1)', 5), roughnessMap: grainRough, metalness: 0.8, roughness: 0.45, envMapIntensity: 0.5 }),
    scope: new THREE.MeshPhysicalMaterial({ map: wornPaint('#1a1b1d', 'rgba(110,112,115,1)', 9), roughnessMap: grainRough, normalMap: grainNormal, normalScale: new THREE.Vector2(0.2, 0.2), metalness: 0.35, roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4, envMapIntensity: 0.4 }),
    brass: new THREE.MeshPhysicalMaterial({ color: 0xb08d4a, metalness: 1, roughness: 0.3, envMapIntensity: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x1c3b52, metalness: 0.1, roughness: 0.03, clearcoat: 1, envMapIntensity: 1.6, transmission: 0 }),
  };
  return AWP_MATS;
}
// nome do material no arquivo -> material novo (o resto vira aço)
const AWP_PART = {
  'Material.003': 'stock', 'Material.004': 'stock', 'Material.008': 'stock', 'Material.007': 'grip', 'Material.005': 'grip', material_0: 'grip',
  'Material.009': 'steel', 'Material.010': 'steel', Material: 'brass', 'Material.001': 'brass', 'Material.002': 'brass',
  'Material.018': 'scope', 'Material.021': 'scope', 'Material.022': 'scope', 'Material.023': 'scope', 'Material.024': 'scope', 'Material.026': 'scope', 'Material.020': 'scope',
  'Material.019': 'glass',
};
export function restyleAWP(meshes) {
  const M = awpMaterials();
  for (const mesh of meshes) {
    const name = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.name || '';
    if (mesh.material && mesh.material.transparent) continue;
    mesh.userData.awpPart = AWP_PART[name] || 'steel';
    mesh.material = M[mesh.userData.awpPart];
    if (!mesh.geometry.userData.creased) {
      const geo = mesh.geometry = toCreasedNormals(mesh.geometry, THREE.MathUtils.degToRad(35));
      // o arquivo não tem coordenadas de textura: projeta a textura pelo lado para onde cada face aponta
      const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
        const [u, v] = ax >= ay && ax >= az ? [p.getZ(i), p.getY(i)] : ay >= az ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
        uv[i * 2] = u * 1.5; uv[i * 2 + 1] = v * 1.5;
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.userData.creased = true;
    }
  }
}
// luneta redonda feita por código (a do modelo é um bloco quadrado): no lugar da original, em espaço da arma
export { awpMaterials };
export function awpScope(y = 0.05, z = -0.01, railY = y - 0.043) {
  const M = awpMaterials(), g = new THREE.Group();
  const Yv = new THREE.Vector3(0, 1, 0), Xv = new THREE.Vector3(1, 0, 0);
  const lathe = (pts, mat) => {   // perfil [[x, r], ...] girado em volta do eixo x
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(r, x)), 40), mat);
    m.quaternion.setFromUnitVectors(Yv, Xv); m.position.set(0, y, z); g.add(m); return m;
  };
  // ocular com borracha, corpo, tubo, campânula da objetiva
  lathe([[-0.135, 0.017], [-0.13, 0.0205], [-0.105, 0.0205], [-0.1, 0.019]], M.grip);
  lathe([[-0.1, 0.019], [-0.085, 0.0195], [-0.07, 0.016], [-0.06, 0.0155], [0.15, 0.0155], [0.17, 0.019], [0.2, 0.0245], [0.245, 0.0255], [0.25, 0.0235]], M.scope);
  for (const x of [-0.088, 0.238]) lathe([[x, 0.0], [x, 0.021 + (x > 0 ? 0.005 : 0)], [x + 0.004, 0.021 + (x > 0 ? 0.005 : 0)], [x + 0.004, 0]], M.steel);   // anéis de acabamento
  // lentes (com reflexo do céu)
  for (const [x, r, s] of [[0.2495, 0.0225, 1], [-0.1345, 0.0165, -1]]) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(r, 32), M.glass); l.position.set(x, y, z); l.rotation.y = s * Math.PI / 2; g.add(l);
  }
  // torres de ajuste (em cima e do lado direito) e roda de paralaxe à esquerda
  const turret = (pos, axis, r, h) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), M.scope); t.position.set(...pos); t.quaternion.setFromUnitVectors(Yv, axis); g.add(t);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, h * 0.45, 24), M.steel); cap.position.set(...pos).addScaledVector(axis, h * 0.5); cap.quaternion.copy(t.quaternion); g.add(cap);
  };
  const box = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.05, 28), M.scope); box.quaternion.setFromUnitVectors(Yv, Xv); box.position.set(0.045, y, z); g.add(box);
  turret([0.045, y + 0.022, z], Yv, 0.011, 0.016);
  turret([0.045, y, z + 0.022], new THREE.Vector3(0, 0, 1), 0.011, 0.016);
  turret([0.045, y, z - 0.022], new THREE.Vector3(0, 0, -1), 0.013, 0.012);
  // anéis de fixação presos no trilho
  for (const x of [-0.035, 0.115]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0172, 0.0035, 10, 32), M.steel); ring.position.set(x, y, z); ring.rotation.y = Math.PI / 2; g.add(ring);
    const bh = Math.max(0.006, y - 0.0172 - railY);   // pé do anel até o trilho
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.016, bh + 0.004, 0.026), M.steel); base.position.set(x, railY + bh / 2, z); g.add(base);
  }
  return g;
}

// ---------- AWP inteira feita por código (corpo liso e detalhado, no lugar do modelo low-poly) ----------
// Espaço da arma: +x cano, +y cima, +z direita; a mão direita segura a empunhadura em volta de GRIP.
function roundedPath(pts, rad, path = new THREE.Shape()) {
  const n = pts.length, P = pts.map(p => new THREE.Vector2(...p));
  for (let i = 0; i < n; i++) {
    const prev = P[(i - 1 + n) % n], cur = P[i], next = P[(i + 1) % n];
    const r = Math.min(rad, cur.distanceTo(prev) / 2, cur.distanceTo(next) / 2);
    const a = cur.clone().add(prev.clone().sub(cur).normalize().multiplyScalar(r));
    const b = cur.clone().add(next.clone().sub(cur).normalize().multiplyScalar(r));
    i === 0 ? path.moveTo(a.x, a.y) : path.lineTo(a.x, a.y);
    path.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
  }
  path.closePath(); return path;
}
function slab(shape, depth, bevel, mat, z = 0) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 14 });
  geo.translate(0, 0, -depth / 2 + z); geo.computeVertexNormals();
  // coordenadas de textura pelo lado (a tinta gasta precisa delas)
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 1.5, p.getY(i) * 1.5 + p.getZ(i) * 1.5);
  return new THREE.Mesh(geo, mat);
}
function tubeX(r0, r1, x0, x1, y, z, mat, seg = 28) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, x1 - x0, seg), mat);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)); m.position.set((x0 + x1) / 2, y, z); return m;
}
export function buildAWPPro() {
  const M = awpMaterials(), g = new THREE.Group(); const add = (m) => { g.add(m); return m; };
  const ry = 0.022;   // eixo do receptor e do cano
  // coronha com buraco do polegar, empunhadura vertical e guarda-mão, numa peça só de polímero verde
  const stock = roundedPath([[-0.41, 0.03], [-0.25, 0.022], [-0.15, 0.012], [0.34, 0.012], [0.37, -0.004], [0.36, -0.036], [0.05, -0.04], [0.035, -0.035],
    [-0.035, -0.04], [-0.055, -0.1], [-0.07, -0.155], [-0.11, -0.16], [-0.13, -0.1], [-0.2, -0.08], [-0.3, -0.115], [-0.41, -0.13]], 0.016);
  stock.holes.push(roundedPath([[-0.205, -0.004], [-0.14, -0.004], [-0.115, -0.05], [-0.125, -0.066], [-0.2, -0.05]], 0.012, new THREE.Path()));
  add(slab(stock, 0.032, 0.009, M.stock));
  // apoio de rosto e telha de borracha da coronha
  add(slab(roundedPath([[-0.36, 0.038], [-0.22, 0.03], [-0.22, 0.02], [-0.36, 0.024]], 0.006), 0.026, 0.004, M.stock));
  add(slab(roundedPath([[-0.425, 0.032], [-0.41, 0.032], [-0.41, -0.132], [-0.425, -0.132]], 0.006), 0.038, 0.004, M.grip));
  // textura de pegada na empunhadura (faixas de borracha)
  for (let i = 0; i < 5; i++) add(slab(roundedPath([[-0.067 - i * 0.008, -0.06 - i * 0.017], [-0.044 - i * 0.004, -0.06 - i * 0.017], [-0.046 - i * 0.004, -0.068 - i * 0.017], [-0.069 - i * 0.008, -0.068 - i * 0.017]], 0.002), 0.036, 0.002, M.grip));
  // receptor, ferrolho e alavanca
  add(tubeX(0.018, 0.018, -0.14, 0.15, ry, 0, M.steel));
  add(tubeX(0.0185, 0.0185, -0.15, -0.135, ry, 0, M.grip));
  add(slab(roundedPath([[-0.12, ry + 0.012], [0.14, ry + 0.012], [0.14, ry + 0.022], [-0.12, ry + 0.022]], 0.003), 0.018, 0.002, M.steel));   // trilho
  for (let i = 0; i < 14; i++) add(slab(roundedPath([[-0.115 + i * 0.018, ry + 0.022], [-0.107 + i * 0.018, ry + 0.022], [-0.107 + i * 0.018, ry + 0.027], [-0.115 + i * 0.018, ry + 0.027]], 0.001), 0.02, 0.001, M.steel));
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.045, 12), M.steel); bolt.position.set(-0.085, ry - 0.006, 0.03); bolt.rotation.x = Math.PI / 2 - 0.5; add(bolt);
  const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.011, 18, 14), M.grip)); knob.position.set(-0.085, ry - 0.016, 0.05);
  // cano cônico com estrias, quebra-chama com janelas
  add(tubeX(0.0125, 0.0095, 0.15, 0.71, ry, 0, M.steel));
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, f = tubeX(0.0022, 0.0022, 0.24, 0.62, ry + Math.cos(a) * 0.0108, Math.sin(a) * 0.0108, M.grip, 6); add(f); }
  add(tubeX(0.0145, 0.0145, 0.71, 0.78, ry, 0, M.steel, 32));
  for (const x of [0.725, 0.745]) for (const zs of [-1, 1]) { const w = add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.004), M.grip)); w.position.set(x, ry, zs * 0.0135); }
  // guarda-mato e gatilho
  const guard = new THREE.CatmullRomCurve3([[0.02, -0.036], [0.018, -0.064], [-0.012, -0.072], [-0.04, -0.064], [-0.045, -0.04]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  add(new THREE.Mesh(new THREE.TubeGeometry(guard, 20, 0.0035, 8, false), M.steel));
  const trig = new THREE.CatmullRomCurve3([[-0.004, -0.036], [0.0, -0.05], [-0.004, -0.06]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  add(new THREE.Mesh(new THREE.TubeGeometry(trig, 10, 0.0028, 8, false), M.steel));
  // carregador destacável (sai na recarga)
  const magG = new THREE.Group(); g.add(magG);
  magG.add(slab(roundedPath([[0.05, -0.036], [0.11, -0.036], [0.112, -0.085], [0.048, -0.085]], 0.004), 0.028, 0.003, M.grip));
  magG.add(slab(roundedPath([[0.046, -0.085], [0.116, -0.085], [0.116, -0.093], [0.046, -0.093]], 0.003), 0.032, 0.002, M.steel));
  // pés do bipé dobrados sob o guarda-mão e fixação
  add(slab(roundedPath([[0.3, -0.036], [0.33, -0.036], [0.33, -0.046], [0.3, -0.046]], 0.003), 0.03, 0.002, M.steel));
  for (const zs of [-1, 1]) add(tubeX(0.0045, 0.0045, 0.12, 0.31, -0.048, zs * 0.009, M.steel, 10));
  // luneta redonda presa no trilho
  const scope = awpScope(ry + 0.052, 0, ry + 0.027); for (const c of scope.children.slice()) g.add(c);
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.79, ry, 0); g.add(muzzle);
  return { group: g, mag: magG, muzzle, fore: new THREE.Vector3(0.24, 0.0, 0) };
}
