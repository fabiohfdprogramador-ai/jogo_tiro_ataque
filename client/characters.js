// Bonecos realistas (modelos 3D com esqueleto): o "Soldier" calcula a pose (passada, mira, agachar)
// e aqui os ossos do modelo seguem essa pose com IK: as mãos vão até a arma e os pés até o chão.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Soldier } from './soldier.js';

// nomes dos ossos (depois de limpar prefixos/sufixos) em cada modelo
const RIGS = {
  CT: {   // S.W.A.T. Operator (esqueleto Mixamo)
    file: 'ct', hips: 'Hips', spine1: 'Spine1', spine2: 'Spine2', neck: 'Neck', head: 'Head',
    L: { arm: 'LeftArm', fore: 'LeftForeArm', hand: 'LeftHand', up: 'LeftUpLeg', leg: 'LeftLeg', foot: 'LeftFoot', toe: 'LeftToeBase' },
    R: { arm: 'RightArm', fore: 'RightForeArm', hand: 'RightHand', up: 'RightUpLeg', leg: 'RightLeg', foot: 'RightFoot', toe: 'RightToeBase' },
  },
  // O modelo "Insurgent" veio com as partes em escalas erradas dentro do arquivo; por enquanto o TR usa
  // o mesmo soldado com outro visual (roupa cor de areia, sem capacete e sem visão noturna).
  T: {
    file: 'ct', hips: 'Hips', spine1: 'Spine1', spine2: 'Spine2', neck: 'Neck', head: 'Head',
    L: { arm: 'LeftArm', fore: 'LeftForeArm', hand: 'LeftHand', up: 'LeftUpLeg', leg: 'LeftLeg', foot: 'LeftFoot', toe: 'LeftToeBase' },
    R: { arm: 'RightArm', fore: 'RightForeArm', hand: 'RightHand', up: 'RightUpLeg', leg: 'RightLeg', foot: 'RightFoot', toe: 'RightToeBase' },
    hide: /helmet|night_vis|patch/i,
    tint: { uniform: 0xd9c08a, pouch: 0xb59a68, boots: 0x8a6a48, gloves: 0x9a8a70 },
  },
};
const clean = (n) => n.replace(/^mixamorig[:_]?/i, '').replace(/[:.]/g, '').replace(/_\d+$/, '');

const templates = {};
const fileCache = {};
let loading = null;

function findBones(obj, rig) {
  const byName = {};
  obj.traverse(o => { if (o.isBone) byName[clean(o.name)] = o; });
  const get = (n) => byName[n];
  const side = (S) => Object.fromEntries(Object.entries(S).map(([k, n]) => [k, get(n)]));
  return { hips: get(rig.hips), spine1: get(rig.spine1), spine2: get(rig.spine2), neck: get(rig.neck), head: get(rig.head), L: side(rig.L), R: side(rig.R) };
}

async function prepare(team, loader) {
  const rig = RIGS[team];
  const gltf = await (fileCache[rig.file] ||= loader.loadAsync(`/models/${rig.file}.glb`));
  const scene = SkeletonUtils.clone(gltf.scene);
  // visual do time: esconde peças e muda a cor da roupa
  scene.traverse(o => {
    if (!o.isMesh) return;
    const name = [].concat(o.material).map(m => m?.name || '').join(' ');
    if (rig.hide && rig.hide.test(name)) { o.visible = false; return; }
    if (rig.tint) {
      const key = Object.keys(rig.tint).find(k => name.toLowerCase().includes(k));
      if (key) { o.material = o.material.clone(); o.material.color.setHex(rig.tint[key]); }
    }
  });
  // partes transparentes (olhos, lentes) quebram o efeito de sombra de contato: ficam escondidas
  scene.traverse(o => { if (o.isMesh && [].concat(o.material).some(m => m && m.transparent)) o.visible = false; });
  scene.updateMatrixWorld(true);
  const B = findBones(scene, rig);
  if (!B.hips || !B.head || !B.L.foot || !B.R.foot || !B.L.hand || !B.R.hand) throw new Error('ossos não encontrados em ' + rig.file);
  const w = (b) => b.getWorldPosition(new THREE.Vector3());
  const head = w(B.head), fL = w(B.L.foot), fR = w(B.R.foot), toeL = w(B.L.toe || B.L.foot), hips = w(B.hips);
  // frente do boneco = direção do calcanhar para a ponta do pé
  const fwd = toeL.clone().sub(fL); fwd.y = 0;
  if (fwd.lengthSq() < 1e-8) fwd.set(0, 0, 1);
  fwd.normalize();
  const footY = (fL.y + fR.y) / 2;
  const scale = 1.52 / (head.y - footY);               // osso da cabeça fica ~1,6 m do chão
  const yaw = Math.atan2(fwd.x, fwd.z) - Math.PI;       // gira para olhar para -z
  templates[team] = { scene, scale, yaw, offset: new THREE.Vector3(-hips.x, -footY + 0.09 / scale, -hips.z) };
}

export function loadCharacterModels() {
  if (loading) return loading;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loading = Promise.all(Object.keys(RIGS).map(t => prepare(t, loader).catch(e => console.warn('Boneco não carregou:', t, e))));
  return loading;
}
export const characterReady = (team) => !!templates[team];

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _p = new THREE.Vector3();

// gira o osso (no mundo) para que o filho aponte para "target"
function aimBone(bone, child, target) {
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  _c.subVectors(_b, _a).normalize(); _d.subVectors(target, _a).normalize();
  if (_c.lengthSq() < 1e-8 || _d.lengthSq() < 1e-8) return;
  _q.setFromUnitVectors(_c, _d);
  bone.getWorldQuaternion(_q2); bone.parent.getWorldQuaternion(_q3);
  bone.quaternion.copy(_q3.invert().multiply(_q.multiply(_q2)));
  bone.updateMatrixWorld(true);
}
// aplica uma rotação (no mundo) a um osso
function rotateWorld(bone, q) {
  bone.getWorldQuaternion(_q2); bone.parent.getWorldQuaternion(_q3);
  bone.quaternion.copy(_q3.invert().multiply(_q.copy(q).multiply(_q2)));
  bone.updateMatrixWorld(true);
}
// IK de dois ossos com vetor de polo
function twoBone(upper, lower, end, target, pole) {
  upper.getWorldPosition(_a); lower.getWorldPosition(_b); end.getWorldPosition(_c);
  const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
  _d.subVectors(target, _a);
  let L = _d.length(); L = Math.min(Math.max(L, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
  const dir = _d.normalize().clone();
  const x = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  _p.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
  const elbow = _a.clone().addScaledVector(dir, x).addScaledVector(_p, h);
  const reach = _a.clone().addScaledVector(dir, L);
  aimBone(upper, lower, elbow);
  aimBone(lower, end, reach);
}

export class ModelSoldier {
  constructor(team, weaponKey = 'ak47') {
    const T = templates[team];
    this.driver = new Soldier(team, weaponKey);
    this.driver.hideBody();
    this.root = this.driver.root;
    this.model = SkeletonUtils.clone(T.scene);
    this.holder = new THREE.Group();
    this.holder.rotation.y = T.yaw; this.holder.scale.setScalar(T.scale);
    this.model.position.copy(T.offset);
    this.holder.add(this.model);
    this.root.add(this.holder);
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    this.B = findBones(this.model, RIGS[team]);
    this.rest = new Map();
    const keep = (b) => { if (b) this.rest.set(b, { q: b.quaternion.clone(), p: b.position.clone() }); };
    [this.B.hips, this.B.spine1, this.B.spine2, this.B.neck, this.B.head].forEach(keep);
    for (const S of [this.B.L, this.B.R]) Object.values(S).forEach(keep);
    this.root.updateMatrixWorld(true);
    this.hipsRest = this.B.hips.getWorldPosition(new THREE.Vector3());
    this.root.worldToLocal(this.hipsRest);
  }
  get muzzle() { return this.driver.muzzle; }
  get gun() { return this.driver.gun; }
  setWeapon(k) { this.driver.setWeapon(k); }

  update(dt, s) {
    const D = this.driver;
    D.update(dt, s);
    for (const [b, r] of this.rest) { b.quaternion.copy(r.q); b.position.copy(r.p); }
    this.root.updateMatrixWorld(true);
    const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());

    // quadril: altura e giro iguais ao "piloto"
    const hips = this.B.hips;
    const target = this.hipsRest.clone().add(new THREE.Vector3(D.pelvis.position.x, D.pelvis.position.y - 0.93, 0));
    this.root.localToWorld(target);
    hips.parent.worldToLocal(target); hips.position.copy(target);
    hips.updateMatrixWorld(true);
    const pelvisQ = rootQ.clone().multiply(D.pelvis.quaternion).multiply(rootQ.clone().invert());
    rotateWorld(hips, pelvisQ);

    // tronco: metade da rotação em cada osso da coluna
    const chestQ = rootQ.clone().multiply(D.pelvis.quaternion).multiply(D.chest.quaternion).multiply(D.pelvis.quaternion.clone().invert()).multiply(rootQ.clone().invert());
    const half = new THREE.Quaternion().slerp(chestQ, 0.5);
    if (this.B.spine1) rotateWorld(this.B.spine1, half);
    if (this.B.spine2) rotateWorld(this.B.spine2, half);
    // cabeça olha para onde a arma aponta
    if (this.B.head) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(rootQ);
      rotateWorld(this.B.head, new THREE.Quaternion().setFromAxisAngle(right, D.state.pitch * 0.6 - D.state.crouch * 0.1));
    }

    // braços até a arma
    const handOff = 0.075;   // do pulso até o meio da palma
    for (const [S, arm] of [[this.B.R, D.arms[1]], [this.B.L, D.arms[0]]]) {
      if (!S.arm || !S.fore || !S.hand || !arm.wristT) continue;
      const shoulder = S.arm.getWorldPosition(new THREE.Vector3());
      const t = this.root.localToWorld(arm.wristT.clone());
      const pull = t.clone().sub(shoulder).normalize().multiplyScalar(handOff);
      t.sub(pull);
      const pole = new THREE.Vector3(arm.sx * 0.9, -1, arm.sx > 0 ? 0.6 : 0.2).applyQuaternion(rootQ);
      twoBone(S.arm, S.fore, S.hand, t, pole);
    }
    // pernas até os pés do "piloto"
    for (const [S, leg] of [[this.B.R, D.legs[1]], [this.B.L, D.legs[0]]]) {
      if (!S.up || !S.leg || !S.foot || !leg.ankleT) continue;
      const t = this.root.localToWorld(leg.ankleT.clone());
      const pole = new THREE.Vector3(leg.sx * 0.15, 0.2, -1).applyQuaternion(rootQ);
      twoBone(S.up, S.leg, S.foot, t, pole);
      // pé alinhado com o chão (e levantando a ponta ao dar o passo)
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(rootQ);
      if (S.toe) {
        const foot = S.foot.getWorldPosition(new THREE.Vector3());
        const toeT = foot.clone().addScaledVector(fwd, 0.14); toeT.y = foot.y - 0.06 + (leg.lift || 0) * 0.6;
        aimBone(S.foot, S.toe, toeT);
      }
    }
  }
}
