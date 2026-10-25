// Braços e mãos de pele para a visão em primeira pessoa.
// Modelo: "First Person hands rigged" por davidfischer (Sketchfab, CC-BY 4.0) — antebraço, mão e dedos com esqueleto.
// Cada arma usa uma cópia do braço: os dedos dobram junta por junta, o pulso vai para o cabo/guarda-mão e o
// antebraço é girado para a direção pedida sem mexer na mão. A pele é uma textura feita por código.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

let template = null;
export async function loadArms() {
  if (template) return template;
  try { template = (await new GLTFLoader().loadAsync('models/maos.glb')).scene; } catch { template = null; }
  return template;
}
export const armsReady = () => !!template;

// ---------- pele: cor bronzeada com manchas, poros e pelinhos; relevo tirado do mesmo desenho ----------
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function skinTextures() {
  const S = 1024, r = rand(91);
  const col = document.createElement('canvas'), hgt = document.createElement('canvas');
  col.width = col.height = hgt.width = hgt.height = S;
  const g = col.getContext('2d'), h = hgt.getContext('2d');
  g.fillStyle = '#c4886a'; g.fillRect(0, 0, S, S);
  h.fillStyle = '#808080'; h.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {   // manchas largas (avermelhadas e mais claras)
    const x = r() * S, y = r() * S, rad = 30 + r() * 140, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, ['rgba(176,104,82,.12)', 'rgba(214,160,128,.12)', 'rgba(150,96,70,.1)'][(r() * 3) | 0]); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 60000; i++) {   // poros: pontinhos bem pequenos e rasos
    const x = r() * S, y = r() * S, w = 0.6 + r() * 0.9;
    g.fillStyle = `rgba(120,70,50,${0.04 + r() * 0.07})`; g.fillRect(x, y, w, w);
    h.fillStyle = `rgba(60,60,60,${0.12 + r() * 0.2})`; h.fillRect(x, y, w, w);
  }
  for (let i = 0; i < 9000; i++) {   // textura fina da pele (linhas cruzadas bem leves)
    const x = r() * S, y = r() * S, a = r() < 0.5 ? 0.6 : -0.6, l = 4 + r() * 10;
    h.strokeStyle = `rgba(${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 60 : 200},.12)`; h.lineWidth = 1;
    h.beginPath(); h.moveTo(x, y); h.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); h.stroke();
  }
  g.lineWidth = 1;
  for (let i = 0; i < 2600; i++) {   // pelinhos curtos e escuros, bem discretos
    const x = r() * S, y = r() * S, a = 1.2 + (r() - 0.5) * 0.6, l = 4 + r() * 7;
    g.strokeStyle = `rgba(70,44,30,${0.12 + r() * 0.12})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // relevo: normal map a partir da altura
  const src = h.getImageData(0, 0, S, S).data, nrm = document.createElement('canvas'); nrm.width = nrm.height = S;
  const nc = nrm.getContext('2d'), out = nc.createImageData(S, S), k = 2.2;
  const H = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x - 1, y) - H(x + 1, y)) * k, dy = (H(x, y - 1) - H(x, y + 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    out.data[i] = (dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  nc.putImageData(out, 0, 0);
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: tex(col, true), normalMap: tex(nrm, false) };
}
let SKIN = null, NAIL = null;
function materials() {
  if (SKIN) return;
  const t = skinTextures();
  // sheen avermelhado imita a luz que atravessa a pele nas bordas
  SKIN = new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.58, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xff8a66), envMapIntensity: 0.55, side: THREE.DoubleSide });
  NAIL = new THREE.MeshPhysicalMaterial({ color: 0xc89484, roughness: 0.35, clearcoat: 0.3, envMapIntensity: 0.4, side: THREE.DoubleSide });
}

// ---------- ossos do modelo ----------
const SIDE = {
  R: { hand: 'handR_010', forearm: 'forearmR_04', knuckle: 'f_middle01R_016', index: 'f_index01R_027', pinky: 'f_pinky01R_012', tip: 'f_middle03R_end_054',
    fingers: { index: ['f_index01R_027', 'f_index02R_028', 'f_index03R_029', 'f_index03R_end_057'], middle: ['f_middle01R_016', 'f_middle02R_017', 'f_middle03R_018', 'f_middle03R_end_054'],
      ring: ['f_ring01R_020', 'f_ring02R_021', 'f_ring03R_022', 'f_ring03R_end_055'], pinky: ['f_pinky01R_012', 'f_pinky02R_013', 'f_pinky03R_014', 'f_pinky03R_end_053'],
      thumb: ['thumb01R_023', 'thumb02R_024', 'thumb03R_025', 'thumb03R_end_056'] } },
  L: { hand: 'handL_031', forearm: 'forearmL_08', knuckle: 'f_middle01L_045', index: 'f_index01L_037', pinky: 'f_pinky01L_033', tip: 'f_middle03L_end_061',
    fingers: { index: ['f_index01L_037', 'f_index02L_038', 'f_index03L_039', 'f_index03L_end_059'], middle: ['f_middle01L_045', 'f_middle02L_046', 'f_middle03L_047', 'f_middle03L_end_061'],
      ring: ['f_ring01L_041', 'f_ring02L_042', 'f_ring03L_043', 'f_ring03L_end_060'], pinky: ['f_pinky01L_033', 'f_pinky02L_034', 'f_pinky03L_035', 'f_pinky03L_end_058'],
      thumb: ['thumb01L_048', 'thumb02L_049', 'thumb03L_050', 'thumb03L_end_00'] } },
};
const FINGERS = ['index', 'middle', 'ring', 'pinky', 'thumb'];
const _v = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3()), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _inv = new THREE.Matrix4();

export function makeArm(side) {
  materials();
  const S = SIDE[side], model = SkeletonUtils.clone(template);
  const B = (n) => model.getObjectByName(n);
  // esconde o braço do outro lado: encolhe todos os ossos dele (no modelo eles não são todos filhos da clavícula)
  const otherSide = side === 'R' ? /L(_end)?_\d+$/ : /R(001)?(_end)?_\d+$/;
  model.traverse(o => { if (o.isBone && otherSide.test(o.name)) o.scale.setScalar(1e-4); });
  model.traverse(o => { if (o.isMesh) { o.material = o.geometry.attributes.position.count < 500 ? NAIL : SKIN; o.frustumCulled = false; o.castShadow = o.receiveShadow = false; } });
  const pivot = new THREE.Group(); pivot.matrixAutoUpdate = false; pivot.add(model);
  const group = new THREE.Group(); group.add(pivot);
  const rest = new Map(); model.traverse(o => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
  const rig = { side, group, pivot, model, rest, hand: B(S.hand), forearm: B(S.forearm), knuckle: B(S.knuckle), index: B(S.index), pinky: B(S.pinky), tip: B(S.tip), joints: {}, axis: new Map() };
  for (const f of FINGERS) rig.joints[f] = S.fingers[f].map(B);
  // eixo de dobra de cada junta: o eixo local cuja rotação leva a ponta do dedo para o lado da palma
  group.updateMatrixWorld(true);
  const { n } = handFrame(rig, group);
  for (const f of FINGERS) for (let j = 0; j < 3; j++) {
    const bone = rig.joints[f][j], child = rig.joints[f][j + 1];
    const p = group.worldToLocal(bone.getWorldPosition(_v[0])), c = group.worldToLocal(child.getWorldPosition(_v[1])).sub(p);
    bone.getWorldQuaternion(_q);
    let best = null, bestScore = 0;
    for (const a of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const A = _v[2].set(...a).applyQuaternion(_q);
      const score = _v[3].crossVectors(A, c).dot(n);
      if (Math.abs(score) > Math.abs(bestScore)) { bestScore = score; best = a; }
    }
    rig.axis.set(bone, new THREE.Vector3(...best).multiplyScalar(Math.sign(bestScore)));
  }
  rig.handLen = group.worldToLocal(rig.tip.getWorldPosition(_v[0])).distanceTo(group.worldToLocal(rig.hand.getWorldPosition(_v[1])));
  return rig;
}

// referencial da mão no espaço do grupo: pulso, direção dos dedos (u), normal da palma (n) e lado (l)
function handFrame(rig, group) {
  const w = group.worldToLocal(rig.hand.getWorldPosition(new THREE.Vector3()));
  const k = group.worldToLocal(rig.knuckle.getWorldPosition(new THREE.Vector3()));
  const i = group.worldToLocal(rig.index.getWorldPosition(new THREE.Vector3()));
  const p = group.worldToLocal(rig.pinky.getWorldPosition(new THREE.Vector3()));
  const u = k.clone().sub(w).normalize(), lat = i.sub(p);
  const n = u.clone().cross(lat);   // (conferido no jogo: no modelo, as duas mãos usam a mesma regra)
  n.normalize(); const l = n.clone().cross(u).normalize();
  return { w, u, n, l };
}
const basis = (m, u, n, l) => m.makeBasis(u, n, l);

// P = { wrist: [x,y,z], fingers: [dir], palm: [dir], forearm: [dir], size: comprimento da mão,
//       curl: { index: [a1,a2,a3], middle, ring, pinky, thumb } em radianos }
export function poseArm(rig, P) {
  const { group, pivot } = rig;
  // 1) dedos a partir do repouso; pulso volta ao repouso
  for (const [bone, q] of rig.rest) bone.quaternion.copy(q);
  for (const f of FINGERS) {
    const a = P.curl[f] || P.curl.all || [0, 0, 0];
    for (let j = 0; j < 3; j++) if (a[j]) rig.joints[f][j].quaternion.multiply(_q.setFromAxisAngle(rig.axis.get(rig.joints[f][j]), a[j]));
  }
  // 2) mede a mão com o pivô na identidade
  pivot.matrix.identity(); group.updateMatrixWorld(true);
  const F = handFrame(rig, group);
  const U = _v[0].set(...P.fingers).normalize(), N0 = _v[1].set(...P.palm);
  const N = N0.sub(_v[2].copy(U).multiplyScalar(N0.dot(U))).normalize(), L = _v[2].crossVectors(N, U).normalize();
  const R = basis(_m, U, N, L).multiply(_inv.copy(basis(_m2, F.u, F.n, F.l)).transpose());
  const s = (P.size || 0.17) / rig.handLen, W = _v[3].set(...P.wrist);
  // pivot = T(W) * R * S * T(-w)
  pivot.matrix.makeTranslation(-F.w.x, -F.w.y, -F.w.z).premultiply(_m2.makeScale(s, s, s)).premultiply(R).premultiply(_m2.makeTranslation(W.x, W.y, W.z));
  group.updateMatrixWorld(true);
  // 3) antebraço: gira o braço inteiro em volta do pulso até apontar para P.forearm; a mão fica onde estava
  const handQ = rig.hand.getWorldQuaternion(new THREE.Quaternion());
  const e = group.worldToLocal(rig.forearm.getWorldPosition(_v[4])).sub(W).normalize();
  const Q = _q2.setFromUnitVectors(e, _v[5].set(...P.forearm).normalize());
  pivot.matrix.premultiply(_m2.makeTranslation(-W.x, -W.y, -W.z)).premultiply(_m.makeRotationFromQuaternion(Q)).premultiply(_m2.makeTranslation(W.x, W.y, W.z));
  group.updateMatrixWorld(true);
  const parentQ = rig.hand.parent.getWorldQuaternion(_q);
  rig.hand.quaternion.copy(parentQ.invert().multiply(handQ));
  rig.hand.updateMatrixWorld(true);
}

// poses por tipo de arma (coordenadas da arma: x para o cano, y para cima, z para a direita)
export const ARM_POSES = {
  rifle: {
    R: { wrist: [-0.14, -0.12, 0.045], fingers: [0.88, 0.45, -0.05], palm: [0, 0, -1], forearm: [-0.35, -0.75, 0.55], size: 0.17,
      curl: { index: [1.2, 1.1, 0.6], middle: [1.45, 1.25, 0.7], ring: [1.5, 1.3, 0.7], pinky: [1.5, 1.3, 0.7], thumb: [0.3, 0.5, 0.4] } },
    // mão esquerda abraçando a frente pelo lado esquerdo, braço descendo reto (enquadramento do Far Cry 3)
    L: { wrist: [0.25, -0.085, -0.032], fingers: [0.15, 0.95, -0.1], palm: [0, 0.3, 1], forearm: [-0.1, -1, -0.2], size: 0.17,
      curl: { index: [1.0, 0.9, 0.5], middle: [1.1, 0.9, 0.5], ring: [1.1, 0.9, 0.5], pinky: [1.1, 0.9, 0.5], thumb: [0.7, 0.5, 0.3] } },
  },
  pistol: {
    R: { wrist: [-0.14, -0.12, 0.045], fingers: [0.88, 0.45, -0.05], palm: [0, 0, -1], forearm: [-0.35, -0.75, 0.55], size: 0.17,
      curl: { index: [1.2, 1.1, 0.6], middle: [1.45, 1.25, 0.7], ring: [1.5, 1.3, 0.7], pinky: [1.5, 1.3, 0.7], thumb: [0.3, 0.5, 0.4] } },
    L: { wrist: [-0.13, -0.16, -0.06], fingers: [0.85, 0.3, 0.1], palm: [0, 0, 1], forearm: [-0.4, -0.6, -0.7], size: 0.17,
      curl: { index: [1.3, 1.1, 0.6], middle: [1.4, 1.2, 0.6], ring: [1.4, 1.2, 0.6], pinky: [1.4, 1.2, 0.6], thumb: [0.2, 0.3, 0.3] } },
  },
};
// cada rifle pode ter a sua (o guarda-mão de cada modelo fica num lugar): começa igual à pose dos rifles
const copyPose = (p) => JSON.parse(JSON.stringify(p));
// AK: mão esquerda abraçando o guarda-mão pelo lado, dedos por cima (enquadramento alinhado do Far Cry 3)
ARM_POSES.ak47 = { R: copyPose(ARM_POSES.rifle.R), L: { wrist: [0.25, -0.07, -0.04], fingers: [0.25, 1, 0.25], palm: [0, 0.35, 1], forearm: [-0.15, -1, -0.3], size: 0.17,
  curl: { index: [1.1, 1.0, 0.6], middle: [1.2, 1.0, 0.6], ring: [1.25, 1.0, 0.6], pinky: [1.3, 1.0, 0.6], thumb: [0.5, 0.4, 0.2] } } };
// M4: mesma pegada da AK, abraçando o guarda-mão pelo lado (no cabo vertical a mão some embaixo da tela)
ARM_POSES.m4a4 = { R: copyPose(ARM_POSES.rifle.R), L: { ...copyPose(ARM_POSES.ak47.L), wrist: [0.2, -0.065, -0.04] } };
// AWP: mesma pegada da AK, mais à frente no guarda-mão comprido
ARM_POSES.awp = { R: copyPose(ARM_POSES.rifle.R), L: { ...copyPose(ARM_POSES.ak47.L), wrist: [0.3, -0.03, -0.04] } };
// faca: mão fechada no cabo (mesmo ponto da empunhadura das armas); granada: mão menos fechada, segurando a bola
ARM_POSES.knife = { R: ARM_POSES.rifle.R };
ARM_POSES.nade = { R: { ...ARM_POSES.rifle.R, wrist: [-0.12, -0.075, 0.055], curl: { index: [0.8, 0.7, 0.4], middle: [0.9, 0.8, 0.4], ring: [0.95, 0.8, 0.4], pinky: [1.0, 0.8, 0.4], thumb: [0.4, 0.4, 0.3] } } };
