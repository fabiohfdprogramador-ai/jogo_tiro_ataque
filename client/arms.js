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
  SKIN = new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.58, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xff8a66), envMapIntensity: 0.55, side: THREE.DoubleSide });
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
  // no modelo as duas mãos têm formato de mão esquerda (o polegar da "direita" fica do lado errado);
  // a direita é a esquerda espelhada, que vira uma mão direita de verdade
  const mirror = side === 'R', S = SIDE.L, model = SkeletonUtils.clone(template);
  const B = (n) => model.getObjectByName(n);
  // esconde o braço direito do modelo: encolhe todos os ossos dele (no modelo eles não são todos filhos da clavícula)
  model.traverse(o => { if (o.isBone && /R(001)?(_end)?_\d+$/.test(o.name)) o.scale.setScalar(1e-4); });
  if (mirror) model.scale.x = -1;
  model.traverse(o => { if (o.isMesh) { o.material = o.geometry.attributes.position.count < 500 ? NAIL : SKIN; o.frustumCulled = false; o.castShadow = o.receiveShadow = false; } });
  const pivot = new THREE.Group(); pivot.matrixAutoUpdate = false; pivot.add(model);
  const group = new THREE.Group(); group.add(pivot);
  const rest = new Map(); model.traverse(o => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
  const rig = { side, mirror, group, pivot, model, rest, hand: B(S.hand), forearm: B(S.forearm), knuckle: B(S.knuckle), index: B(S.index), pinky: B(S.pinky), tip: B(S.tip), joints: {}, axis: new Map() };
  for (const f of FINGERS) rig.joints[f] = S.fingers[f].map(B);
  // eixo de dobra de cada junta: o eixo local cuja rotação leva a ponta do dedo para o lado da palma
  // (testado girando a junta de verdade, para valer também no braço espelhado)
  group.updateMatrixWorld(true);
  const { n } = handFrame(rig, group);
  for (const f of FINGERS) for (let j = 0; j < 3; j++) {
    const bone = rig.joints[f][j], child = rig.joints[f][j + 1], q0 = bone.quaternion.clone();
    const c0 = group.worldToLocal(child.getWorldPosition(_v[0])).clone();
    let best = null, bestScore = 0;
    for (const a of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      bone.quaternion.copy(q0).multiply(_q.setFromAxisAngle(_v[2].set(...a), 0.3)); bone.updateMatrixWorld(true);
      const score = group.worldToLocal(child.getWorldPosition(_v[1])).sub(c0).dot(n);
      if (Math.abs(score) > Math.abs(bestScore)) { bestScore = score; best = a; }
    }
    bone.quaternion.copy(q0); bone.updateMatrixWorld(true);
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
  // palma: numa mão esquerda é u × lat; na direita (espelhada) o lado se inverte
  const n = rig.mirror ? lat.clone().cross(u) : u.clone().cross(lat);
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
  const handW = rig.hand.matrixWorld.clone();   // (matriz inteira: quatérnios não sobrevivem ao espelhamento)
  const e = group.worldToLocal(rig.forearm.getWorldPosition(_v[4])).sub(W).normalize();
  const Q = _q2.setFromUnitVectors(e, _v[5].set(...P.forearm).normalize());
  pivot.matrix.premultiply(_m2.makeTranslation(-W.x, -W.y, -W.z)).premultiply(_m.makeRotationFromQuaternion(Q)).premultiply(_m2.makeTranslation(W.x, W.y, W.z));
  group.updateMatrixWorld(true);
  _m.copy(rig.hand.parent.matrixWorld).invert().multiply(handW).decompose(rig.hand.position, rig.hand.quaternion, rig.hand.scale);
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
    R: { wrist: [-0.115, -0.14, 0.035], fingers: [0.88, 0.45, -0.05], palm: [0, 0, -1], forearm: [-0.35, -0.75, 0.55], size: 0.17,
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
// bazuca: só a mão direita aparece, no cabo; arco: a direita segura o punho e a esquerda puxa a corda pelo nock
ARM_POSES.rpg = { R: ARM_POSES.rifle.R };
ARM_POSES.bow = { R: ARM_POSES.rifle.R, L: { wrist: [-0.33, -0.07, -0.02], fingers: [1, 0.45, 0.1], palm: [0, -0.6, 1], forearm: [-1, -0.35, -0.35], size: 0.17,
  curl: { index: [1.2, 1.2, 0.7], middle: [1.25, 1.2, 0.7], ring: [1.35, 1.2, 0.7], pinky: [1.5, 1.3, 0.8], thumb: [1.1, 0.9, 0.6] } } };
// faca: mão fechada no cabo (mesmo ponto da empunhadura das armas); granada: mão menos fechada, segurando a bola
ARM_POSES.knife = { R: ARM_POSES.rifle.R };
ARM_POSES.nade = { R: { ...ARM_POSES.rifle.R, wrist: [-0.12, -0.075, 0.055], curl: { index: [0.8, 0.7, 0.4], middle: [0.9, 0.8, 0.4], ring: [0.95, 0.8, 0.4], pinky: [1.0, 0.8, 0.4], thumb: [0.4, 0.4, 0.3] } } };

// ---------- manga da roupa e relógio ----------
// A manga é um tubo de tecido com dobras que vai do pulso até o cotovelo; a cada quadro ela acompanha o antebraço
// (a posição vem dos ossos depois da pose). Cor de camuflagem por time.
function camoTexture(pal, seed) {
  const S = 512, r = rand(seed), c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = pal[0]; g.fillRect(0, 0, S, S);
  for (let k = 1; k < pal.length; k++) {
    g.fillStyle = pal[k];
    for (let i = 0; i < 26; i++) {
      const cx = r() * S, cy = r() * S, sz = 18 + r() * 40; g.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.4) { const rr = sz * (0.5 + r() * 0.6); g.lineTo(cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
  }
  for (let y = 0; y < S; y += 2) { g.fillStyle = y % 4 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.05)'; g.fillRect(0, y, S, 1); }   // trama do tecido
  for (let x = 0; x < S; x += 2) { g.fillStyle = x % 4 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.03)'; g.fillRect(x, 0, 1, S); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const SLEEVE = {};
export function sleeveMaterial(team) {
  if (!SLEEVE[team]) {
    const map = team === 'T' ? camoTexture(['#7d6f50', '#9a8a63', '#5c5038', '#4f5236', '#352d20'], 53) : camoTexture(['#4f5966', '#6b7684', '#3a434e', '#2d343d', '#20262d'], 71);
    SLEEVE[team] = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.4, roughness: 0.95, side: THREE.DoubleSide });
  }
  return SLEEVE[team];
}
function sleeveGeometry(seed) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 32, 30, true), pos = geo.attributes.position, rr = rand(seed);
  const folds = Array.from({ length: 6 }, () => [rr() * 6.28, 3 + rr() * 6, 0.05 + rr() * 0.06]);
  for (let i = 0; i < pos.count; i++) {   // dobras do tecido; perto do punho (y = -0.5) o pano amontoa em rugas de anel
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x), nearCuff = 1 - (y + 0.5);
    let k = 1; for (const [ph, f, amp] of folds) k += (Math.sin(a * 2 + y * f * 4 + ph) * 0.5 + Math.sin(y * 18 + ph + a) * 0.35) * amp * (0.7 + nearCuff * 0.6);
    k += Math.pow(Math.max(0, Math.sin(y * 38 + Math.sin(a * 3) * 0.8)), 3) * 0.07 * nearCuff * nearCuff;
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  geo.computeVertexNormals(); return geo;
}
// prende manga (e, se pedir, relógio) num braço; elas se ajustam sozinhas antes de cada desenho
export function dressArm(rig, team, { watch = false } = {}) {
  const mat = sleeveMaterial(team);
  const sleeve = new THREE.Mesh(sleeveGeometry(rig.side === 'L' ? 7 : 3), mat);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(1, 0.22, 10, 28), mat);
  sleeve.frustumCulled = cuff.frustumCulled = false;
  rig.group.add(sleeve, cuff);
  let w = null;
  if (watch) {
    w = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.28, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.7, side: THREE.DoubleSide }));
    const caseM = new THREE.MeshPhysicalMaterial({ color: 0x2b2d30, metalness: 0.8, roughness: 0.35, envMapIntensity: 0.7 });
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 24), caseM); face.position.set(0, 0, 1.02); face.rotation.x = Math.PI / 2;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshPhysicalMaterial({ color: 0x0c1418, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 }));
    glass.position.set(0, 0, 1.115);
    w.add(band, face, glass); w.traverse(o => { o.frustumCulled = false; });
    rig.group.add(w);
  }
  const A = new THREE.Vector3(), B = new THREE.Vector3(), d = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  sleeve.onBeforeRender = () => {
    const { group } = rig;
    const F = handFrame(rig, group);
    const width = group.worldToLocal(rig.index.getWorldPosition(A)).distanceTo(group.worldToLocal(rig.pinky.getWorldPosition(B)));
    const elbow = group.worldToLocal(rig.forearm.getWorldPosition(B));
    d.copy(elbow).sub(F.w); const len = d.length(); d.normalize();
    const r0 = width * 0.62, r1 = width * 0.8;   // largura do antebraço tirada da mão
    // manga comprida: o punho fica logo atrás do pulso e ela passa do cotovelo
    A.copy(F.w).addScaledVector(d, len * 0.1); B.copy(elbow).addScaledVector(d, len * 0.15);
    q.setFromUnitVectors(up, d);
    sleeve.position.copy(A).add(B).multiplyScalar(0.5); sleeve.quaternion.copy(q); sleeve.scale.set((r0 + r1) / 2, A.distanceTo(B), (r0 + r1) / 2);
    sleeve.updateMatrixWorld();
    cuff.position.copy(A); cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d); cuff.scale.setScalar(r0 * 1.02); cuff.updateMatrixWorld();
    if (w) {   // relógio logo atrás do pulso, com o mostrador nas costas da mão
      const c = F.w.clone().addScaledVector(d, len * 0.035);
      const zAxis = F.n.clone().negate(), yAxis = d.clone(), xAxis = yAxis.clone().cross(zAxis).normalize(); zAxis.copy(xAxis).cross(yAxis);
      w.position.copy(c); w.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)); w.scale.setScalar(width * 0.42);
      w.updateMatrixWorld();
    }
  };
  return { sleeve, cuff, watch: w };
}

// ---------- luva tática sem dedos ----------
// Cada vértice recebe quanto ele pertence à luva (soma dos pesos dos ossos da palma, das costas da mão, da primeira
// falange e do polegar); o shader da pele troca a cor pela do tecido onde esse valor passa da metade, com borda reta.
const GLOVE_BONES = /^(hand[RL]|palm_\w+[RL]|f_(index|middle|ring|pinky)01[RL]|thumb0[12][RL])_/;
let GLOVE_TEX = null;
function gloveTexture() {
  if (GLOVE_TEX) return GLOVE_TEX;
  const S = 512, r = rand(17), c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = '#5b5642'; g.fillRect(0, 0, S, S);   // tecido verde-oliva tático (os protetores ficam pretos)
  for (let y = 0; y < S; y += 4) for (let x = 0; x < S; x += 4) {   // trama de tecido sintético
    g.fillStyle = (x + y) % 8 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.06)'; g.fillRect(x, y, 3, 3);
  }
  for (let i = 0; i < 12000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.05)'; g.fillRect(r() * S, r() * S, 1.5, 1.5); }
  g.strokeStyle = 'rgba(120,120,110,.45)'; g.setLineDash([5, 4]); g.lineWidth = 1.5;   // costuras
  for (let y = 40; y < S; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + 10); g.stroke(); }
  GLOVE_TEX = new THREE.CanvasTexture(c); GLOVE_TEX.wrapS = GLOVE_TEX.wrapT = THREE.RepeatWrapping; GLOVE_TEX.colorSpace = THREE.SRGBColorSpace; GLOVE_TEX.anisotropy = 8;
  return GLOVE_TEX;
}
let GLOVED = null;
function glovedSkin() {
  if (GLOVED) return GLOVED;
  GLOVED = SKIN.clone();
  GLOVED.onBeforeCompile = (sh) => {
    sh.uniforms.gloveMap = { value: gloveTexture() };
    sh.vertexShader = 'attribute float glove;\nattribute float pad;\nvarying float vGlove;\nvarying float vPad;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlove = glove; vPad = pad;');
    sh.fragmentShader = 'uniform sampler2D gloveMap;\nvarying float vGlove;\nvarying float vPad;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\nfloat gk = smoothstep(0.45, 0.55, vGlove);\ndiffuseColor.rgb = mix(diffuseColor.rgb, texture2D(gloveMap, vMapUv * 6.0).rgb, gk);\nfloat pk = smoothstep(0.35, 0.6, vPad) * gk;\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.031, 0.03), pk);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.88, gk);\nroughnessFactor = mix(roughnessFactor, 0.45, pk);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.sheenColor *= 1.0 - gk;');
  };
  GLOVED.customProgramCacheKey = () => 'gloved-skin';
  return GLOVED;
}
export function gloveArm(rig) {
  rig.model.traverse(o => {
    if (!o.isSkinnedMesh || o.material !== SKIN) return;
    const geo = o.geometry = o.geometry.clone();
    const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, bones = o.skeleton.bones, n = si.count;
    const isGlove = bones.map(b => GLOVE_BONES.test(b.name)), mask = new Float32Array(n);
    for (let v = 0; v < n; v++) { let m = 0; for (let k = 0; k < 4; k++) if (isGlove[si.getComponent(v, k)]) m += sw.getComponent(v, k); mask[v] = m; }
    geo.setAttribute('glove', new THREE.BufferAttribute(mask, 1));
    // protetor dos nós dos dedos: perto da junta de cada dedo, do lado das costas da mão (pose de repouso)
    const bindPos = (name) => { const i = bones.findIndex(b => b.name === name); return new THREE.Vector3().setFromMatrixPosition(o.skeleton.boneInverses[i].clone().invert()); };
    const S = SIDE.L, wrist = bindPos(S.hand), knuck = ['index', 'middle', 'ring', 'pinky'].map(f => bindPos(S.fingers[f][0]));
    const u = knuck[1].clone().sub(wrist).normalize(), lat = knuck[0].clone().sub(knuck[3]);
    const back = u.clone().cross(lat).normalize().negate(), R = wrist.distanceTo(knuck[1]) * 0.3;   // costas da mão (a palma é u × lat)
    const pos = geo.attributes.position, pad = new Float32Array(n), v = new THREE.Vector3(), dv = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.bindMatrix);
      let d = Infinity, near = null; for (const k of knuck) { const dd = v.distanceTo(k); if (dd < d) { d = dd; near = k; } }
      const side = dv.copy(v).sub(near).dot(back) / R;   // > 0: do lado das costas da junta
      pad[i] = THREE.MathUtils.clamp(1 - d / R, 0, 1) * THREE.MathUtils.smoothstep(side, -0.1, 0.25) * 1.6;
    }
    geo.setAttribute('pad', new THREE.BufferAttribute(pad, 1));
    o.material = glovedSkin();
  });
}
