// Objetos 3D baixados (lixeira, sacos de lixo, carros, árvores...): cada arquivo carrega uma vez
// e as cópias espalhadas pelo mapa viram um InstancedMesh por peça (poucos desenhos, leve).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// file: arquivo em /models/props; pick: grupos usados (alguns arquivos trazem variações lado a lado)
// yaw: giro para a frente do modelo apontar para +x; keepY: mantém a altura do arquivo (raiz enterrada no chão)
// paint: material da lataria que recebe a cor de cada cópia; skip: materiais que ficam de fora (fundo do carro, que não aparece)
// side: o arquivo traz dois arbustos lado a lado; -1 fica com as peças à esquerda (x < 0), 1 com as da direita
const DEFS = {
  trashcan: { file: 'metal_trash_can', pick: ['metal_trash_can', 'metal_trash_can_handle_left', 'metal_trash_can_handle_right'] },
  trashcanRust: { file: 'metal_trash_can', pick: ['metal_trash_can_rust', 'metal_trash_can_rust_handle_left', 'metal_trash_can_rust_handle_right'] },
  trashbag: { file: 'trashbag' },
  coveredCar: { file: 'covered_car', yaw: Math.PI / 2 },
  palm1: { file: 'palms', pick: ['Bark_1'], keepY: true }, palm2: { file: 'palms', pick: ['Bark_2'], keepY: true },
  palm3: { file: 'palms', pick: ['Bark_3'], keepY: true }, palm4: { file: 'palms', pick: ['Bark_4'], keepY: true },
  coconut: { file: 'coconut' },
  banana: { file: 'banana' },
  tree4: { file: 'trees', pick: ['tree4'] }, tree6: { file: 'trees', pick: ['tree6'] },
  kiri: { file: 'kiri', paint: 'Kiri10_bodymat', skip: ['UCB_BOTTOM_LT'] },
  sanremo: { file: 'sanremo', paint: 'Sanremo70_Bodymat', skip: ['UCB_BOTTOM_LT'] },
  pickup: { file: 'pickup', yaw: Math.PI / 2 },
  moto: { file: 'moto' },
  dumpster: { file: 'dumpster', pick: ['Dumpster_01'] },
  granite: { file: 'granite' },
  buxus: { file: 'buxus' }, tropical: { file: 'tropical' },
  flowerA: { file: 'flowerbush', side: -1 }, flowerB: { file: 'flowerbush', side: 1 },
  barYellow: { file: 'bar_yellow' }, barHigh: { file: 'bar_high', skip: ['studio'] }, cafe: { file: 'cafe' },
};

const files = {}, templates = {};
const GET = ['getX', 'getY', 'getZ', 'getW'];   // lê já convertido (serve também para atributo intercalado)
let loading = null;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);

// peças do modelo já na posição certa, com o chão em y = 0 e o meio em x = z = 0
function prepare(key, def, gltf) {
  gltf.scene.updateMatrixWorld(true);
  const parts = [], box = new THREE.Box3();
  const inPick = (o) => { for (let n = o; n; n = n.parent) if (def.pick.includes(n.name)) return true; return false; };
  gltf.scene.traverse(o => {
    if (!o.isMesh || (def.pick && !inPick(o)) || def.skip?.includes(o.material.name)) return;
    // o arquivo comprimido guarda posição/normal/UV em inteiros: vira decimal antes de mover (senão os valores estouram)
    const g = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(o.geometry.attributes)) {
      const f = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) f[i * a.itemSize + k] = a[GET[k]](i);
      g.setAttribute(name, new THREE.BufferAttribute(f, a.itemSize));
    }
    if (o.geometry.index) g.setIndex(o.geometry.index.clone());
    g.applyMatrix4(o.matrixWorld);
    if (def.yaw) g.rotateY(def.yaw);
    g.computeBoundingBox();
    if (def.side && Math.sign(g.boundingBox.min.x + g.boundingBox.max.x) !== def.side) return;
    box.union(g.boundingBox);
    const mat = o.material;
    if (mat.transparent && mat.map) { mat.transparent = false; mat.alphaTest = 0.45; }   // folhas: recorte em vez de transparência (sem erro de ordem)
    parts.push({ geometry: g, material: mat, paint: def.paint && mat.name === def.paint });
  });
  const c = box.getCenter(new THREE.Vector3());
  const ground = def.keepY ? 0 : box.min.y;
  for (const p of parts) p.geometry.translate(-c.x, -ground, -c.z);
  templates[key] = { parts: mergeByMaterial(parts), size: box.getSize(new THREE.Vector3()) };
}

// peças com o mesmo material viram uma só (o carro de 31 peças vira ~8 desenhos)
function mergeByMaterial(parts) {
  const groups = new Map();
  for (const p of parts) (groups.get(p.material) || groups.set(p.material, []).get(p.material)).push(p);
  const out = [];
  for (const [material, list] of groups) {
    if (list.length === 1) { out.push(list[0]); continue; }
    const names = Object.keys(list[0].geometry.attributes).filter(n => list.every(p => p.geometry.attributes[n]));
    const geos = list.map(p => { const g = p.geometry.index ? p.geometry : p.geometry.clone(); for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n); return g; });
    const allIndexed = geos.every(g => g.index), merged = mergeGeometries(allIndexed ? geos : geos.map(g => g.index ? g.toNonIndexed() : g));
    if (merged) out.push({ geometry: merged, material, paint: list[0].paint });
    else out.push(...list);
  }
  return out;
}

export function loadProps() {
  if (loading) return loading;
  loading = Promise.all(Object.entries(DEFS).map(([key, def]) => {
    files[def.file] ||= loader.loadAsync(`/models/props/${def.file}.glb`);
    return files[def.file].then(g => prepare(key, def, g)).catch(e => console.warn('Objeto não carregou:', def.file, e));
  }));
  return loading;
}

// list: [{ kind, x, y?, z, rot?, s? | len? | h?, wide?, hex?, noShadow? }]
//   len/h ajustam o tamanho ao comprimento ou à altura pedidos; wide: escala só na largura (tronco não engorda tanto); hex: cor da lataria
//   noShadow: não faz sombra (árvores do mato em volta: a sombra das folhas é o que mais pesa)
export function placeProps(group, list) {
  if (!list.length) return;
  loadProps().then(() => {
    if (!group.parent) return;            // trocou de mapa antes de carregar
    const byKind = new Map();
    for (const p of list) if (templates[p.kind]) { const k = p.kind + (p.noShadow ? '#' : ''); (byKind.get(k) || byKind.set(k, []).get(k)).push(p); }
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    for (const [key, items] of byKind) {
      const T = templates[items[0].kind], shadow = !items[0].noShadow;
      const mats = items.map(p => {
        const s = p.s ?? (p.len ? p.len / Math.max(T.size.x, T.size.z) : p.h ? p.h / T.size.y : 1), w = p.wide ?? s;
        return new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y || 0, p.z), q.setFromAxisAngle(up, p.rot || 0), new THREE.Vector3(w, s, w));
      });
      for (const part of T.parts) {
        const im = new THREE.InstancedMesh(part.geometry, part.material, items.length);
        mats.forEach((mm, i) => im.setMatrixAt(i, mm));
        if (part.paint) items.forEach((p, i) => im.setColorAt(i, col.setHex(p.hex ?? 0xb8bcc0)));
        im.castShadow = shadow; im.receiveShadow = true;
        im.computeBoundingSphere();
        group.add(im);
      }
    }
  });
}
