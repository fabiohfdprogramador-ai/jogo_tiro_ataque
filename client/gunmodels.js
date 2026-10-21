// Carrega os modelos 3D realistas das armas (.glb) e converte para o "espaço da arma" do jogo:
// metros, +x = frente (cano), +y = cima, mão direita na empunhadura em GRIP.
// Cada arma vira: corpo + carregador separado (para a animação de recarga) + ponto do cano.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

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
