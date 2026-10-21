// Soldado em terceira pessoa (versão realista): corpo anatômico, roupa camuflada, colete tático,
// capacete/balaclava, arma real nas mãos e braços/pernas com IK (as mãos ficam sempre na arma).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildWeaponModel } from './viewmodel.js';

// ---------- texturas ----------
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(size, draw, srgb = true, rep = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function camo(seed, pal) {
  return canvasTex(512, (g, s) => {
    const r = rand(seed);
    g.fillStyle = pal[0]; g.fillRect(0, 0, s, s);
    for (let k = 1; k < pal.length; k++) {
      g.fillStyle = pal[k];
      for (let i = 0; i < 26 - k * 4; i++) {
        const cx = r() * s, cy = r() * s, size = 18 + r() * 34 - k * 3; g.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.4) { const rr = size * (0.5 + r() * 0.6); g.lineTo(cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr); }
        g.closePath(); g.fill();
      }
    }
    for (let y = 0; y < s; y += 2) { g.fillStyle = y % 4 ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.04)'; g.fillRect(0, y, s, 1); }
    for (let x = 0; x < s; x += 2) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(x, 0, 1, s); }
  }, true, 3);
}
// rugas do tecido (relevo)
const foldMap = canvasTex(512, (g, s) => {
  const r = rand(4);
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    const y = r() * s, w = 6 + r() * 20;
    const gr = g.createLinearGradient(0, y - w, 0, y + w);
    gr.addColorStop(0, 'rgba(128,128,128,0)'); gr.addColorStop(0.5, r() < .5 ? 'rgba(40,40,40,.5)' : 'rgba(220,220,220,.45)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.save(); g.translate(s / 2, y); g.rotate((r() - 0.5) * 0.6); g.fillStyle = gr; g.fillRect(-s, -w, s * 2, w * 2); g.restore();
  }
  for (let y = 0; y < s; y += 2) { g.fillStyle = y % 4 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.08)'; g.fillRect(0, y, s, 1); }
}, false, 2);
const nylonMap = canvasTex(256, (g, s) => {
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 3) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, s, 1); }
  for (let y = 12; y < s; y += 24) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, y, s, 4); }   // fitas MOLLE
}, false, 4);
const skinMap = canvasTex(256, (g, s) => {
  const r = rand(9); g.fillStyle = '#b98060'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 4000; i++) { g.fillStyle = r() < .5 ? 'rgba(120,60,40,.08)' : 'rgba(230,170,140,.08)'; g.fillRect(r() * s, r() * s, 2, 2); }
});

const LOOK = {
  T: {
    camo: camo(31, ['#8a7a58', '#a6936a', '#6a5a3e', '#4f4a34', '#35301f']),
    vest: 0x3d3a2c, gear: 0x2e2b22, boot: 0x3a2c1e, glove: 0x2b2a26, head: 0x2a2924,
  },
  CT: {
    camo: camo(77, ['#5a6672', '#75828f', '#434e5a', '#323b45', '#20262d']),
    vest: 0x2a3038, gear: 0x1d2228, boot: 0x1b1b1c, glove: 0x1f2124, head: 0x2b3038,
  },
};

// ---------- geometrias ----------
// membro afinado (de y=0 até y=len), arredondado nas pontas
function limbGeo(r0, r1, len, seg = 16) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
  for (let i = 1; i < 8; i++) { const t = i / 8; const bulge = Math.sin(t * Math.PI) * 0.12 * (r0 + r1) / 2; pts.push(new THREE.Vector2(r0 + (r1 - r0) * t + bulge, len * t)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r1, len + Math.sin(a) * r1)); }
  return new THREE.LatheGeometry(pts, seg);
}
function torsoGeo() {
  // perfil do tronco: quadril -> cintura -> peito -> ombros
  const prof = [[0.0, -0.02], [0.17, 0.0], [0.185, 0.08], [0.178, 0.2], [0.208, 0.32], [0.238, 0.42], [0.228, 0.5], [0.145, 0.56], [0.07, 0.585], [0.0, 0.585]];
  const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 24);
  g.scale(1, 1, 0.74);
  return g;
}

const Y = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpP = new THREE.Vector3();

// posiciona um membro (geometria de 0..len no eixo y) entre os pontos A e B
function placeLimb(mesh, A, B, len) {
  tmpD.subVectors(B, A);
  const d = tmpD.length();
  mesh.position.copy(A);
  mesh.quaternion.setFromUnitVectors(Y, tmpD.normalize());
  mesh.scale.set(1, d / len, 1);
}
// IK de dois ossos: devolve o cotovelo/joelho E para alcançar T a partir de S
function solveIK(S, T, a, b, pole, outE, outT) {
  tmpD.subVectors(T, S);
  let L = tmpD.length();
  L = Math.min(Math.max(L, Math.abs(a - b) + 1e-3), a + b - 1e-3);
  const dir = tmpD.normalize();
  const x = (a * a - b * b + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  tmpP.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
  outE.copy(S).addScaledVector(dir, x).addScaledVector(tmpP, h);
  outT.copy(S).addScaledVector(dir, L);
}

export class Soldier {
  constructor(team, weaponKey = 'ak47') {
    const L = LOOK[team];
    this.team = team;
    const mat = {
      cloth: new THREE.MeshStandardMaterial({ map: L.camo, normalMap: null, bumpMap: foldMap, bumpScale: 2.5, roughness: 0.95 }),
      vest: new THREE.MeshStandardMaterial({ color: L.vest, bumpMap: nylonMap, bumpScale: 1.5, roughness: 0.9 }),
      gear: new THREE.MeshStandardMaterial({ color: L.gear, bumpMap: nylonMap, bumpScale: 1.2, roughness: 0.85 }),
      boot: new THREE.MeshStandardMaterial({ color: L.boot, roughness: 0.6 }),
      glove: new THREE.MeshStandardMaterial({ color: L.glove, bumpMap: nylonMap, bumpScale: 0.6, roughness: 0.8 }),
      head: new THREE.MeshStandardMaterial({ color: L.head, bumpMap: foldMap, bumpScale: 1.2, roughness: 0.95 }),
      skin: new THREE.MeshStandardMaterial({ map: skinMap, roughness: 0.55 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.4, metalness: 0.3 }),
      lens: new THREE.MeshPhysicalMaterial({ color: 0x101820, roughness: 0.05, metalness: 0.5, clearcoat: 1 }),
      pad: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.7 }),
    };
    this.mat = mat;
    const root = this.root = new THREE.Group();
    const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };

    // ---- quadril e tronco
    this.pelvis = new THREE.Group(); root.add(this.pelvis);
    this.chest = new THREE.Group(); this.chest.position.y = 0.0; this.pelvis.add(this.chest);
    add(this.chest, torsoGeo(), mat.cloth, 0, 0, 0);
    // colete (plate carrier)
    const front = add(this.chest, new RoundedBoxGeometry(0.4, 0.37, 0.08, 3, 0.035), mat.vest, 0, 0.36, -0.14);
    const back = add(this.chest, new RoundedBoxGeometry(0.4, 0.39, 0.08, 3, 0.035), mat.vest, 0, 0.36, 0.14);
    for (const sx of [-1, 1]) {
      add(this.chest, new RoundedBoxGeometry(0.06, 0.22, 0.26, 2, 0.022), mat.vest, sx * 0.205, 0.3, 0);   // lateral
      add(this.chest, new RoundedBoxGeometry(0.08, 0.035, 0.3, 2, 0.014), mat.vest, sx * 0.14, 0.555, 0); // alça do ombro
    }
    for (const x of [-0.1, 0, 0.1]) {   // porta-carregadores
      add(this.chest, new RoundedBoxGeometry(0.095, 0.14, 0.06, 2, 0.016), mat.gear, x * 1.15, 0.27, -0.2);
      add(this.chest, new RoundedBoxGeometry(0.1, 0.03, 0.065, 2, 0.01), mat.vest, x * 1.15, 0.345, -0.202);
    }
    add(this.chest, new RoundedBoxGeometry(0.06, 0.12, 0.05, 2, 0.015), mat.gear, -0.15, 0.46, -0.19);  // rádio
    const ant = add(this.chest, new THREE.CylinderGeometry(0.004, 0.004, 0.32, 6), mat.dark, -0.17, 0.62, -0.18); ant.rotation.z = 0.15;
    add(this.chest, new RoundedBoxGeometry(0.2, 0.26, 0.09, 3, 0.03), mat.gear, 0, 0.36, 0.2);       // mochila de hidratação
    // cinto
    const belt = add(this.chest, new THREE.TorusGeometry(0.178, 0.028, 8, 28), mat.gear, 0, 0.03, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.76, 1.4);
    add(this.chest, new RoundedBoxGeometry(0.07, 0.09, 0.05, 2, 0.015), mat.gear, 0.12, 0.02, -0.1);
    add(this.chest, new RoundedBoxGeometry(0.07, 0.09, 0.05, 2, 0.015), mat.gear, -0.13, 0.02, -0.08);

    // ---- pescoço e cabeça
    this.neck = new THREE.Group(); this.neck.position.set(0, 0.56, 0); this.chest.add(this.neck);
    add(this.neck, limbGeo(0.068, 0.06, 0.08, 12), team === 'T' ? mat.head : mat.skin, 0, 0, 0);
    this.head = new THREE.Group(); this.head.position.set(0, 0.17, -0.01); this.neck.add(this.head);
    const skull = add(this.head, new THREE.SphereGeometry(0.105, 24, 20), team === 'T' ? mat.head : mat.skin); skull.scale.set(0.92, 1.12, 1.0);
    const jaw = add(this.head, new THREE.SphereGeometry(0.075, 18, 14), team === 'T' ? mat.head : mat.skin, 0, -0.065, -0.03); jaw.scale.set(1, 0.8, 1.05);
    add(this.head, new THREE.ConeGeometry(0.018, 0.04, 8), team === 'T' ? mat.head : mat.skin, 0, -0.01, -0.105).rotation.x = -Math.PI / 2;  // nariz
    for (const sx of [-1, 1]) add(this.head, new THREE.SphereGeometry(0.022, 10, 8), mat.skin, sx * 0.098, -0.005, 0).scale.set(0.5, 1, 0.8); // orelhas
    if (team === 'T') {
      // balaclava com abertura nos olhos + lenço no pescoço
      add(this.head, new RoundedBoxGeometry(0.13, 0.035, 0.03, 2, 0.012), mat.skin, 0, 0.025, -0.092);
      for (const sx of [-1, 1]) add(this.head, new THREE.SphereGeometry(0.011, 10, 8), mat.dark, sx * 0.032, 0.026, -0.105);
      const scarf = add(this.neck, new THREE.TorusGeometry(0.07, 0.035, 10, 24), mat.head, 0, 0.05, 0); scarf.rotation.x = Math.PI / 2;
    } else {
      // capacete tático, fones e óculos
      const helm = add(this.head, new THREE.SphereGeometry(0.125, 24, 16, 0, Math.PI * 2, 0, 1.75), mat.head, 0, 0.025, 0.008); helm.scale.set(1, 1, 1.08);
      for (const sx of [-1, 1]) {
        add(this.head, new RoundedBoxGeometry(0.012, 0.03, 0.09, 2, 0.004), mat.dark, sx * 0.12, 0.03, 0.0);  // trilhos
        const cup = add(this.head, new THREE.CylinderGeometry(0.04, 0.04, 0.035, 16), mat.dark, sx * 0.11, -0.005, 0.0); cup.rotation.z = Math.PI / 2;
      }
      add(this.head, new RoundedBoxGeometry(0.05, 0.035, 0.03, 2, 0.008), mat.dark, 0, 0.09, -0.12);        // suporte NVG
      add(this.head, new RoundedBoxGeometry(0.15, 0.035, 0.03, 2, 0.014), mat.lens, 0, 0.02, -0.098);        // óculos
      for (const sx of [-1, 1]) add(this.head, new THREE.SphereGeometry(0.01, 8, 6), mat.dark, sx * 0.03, -0.055, -0.1);
    }

    // ---- braços (IK)
    this.uArmLen = 0.31; this.fArmLen = 0.29;
    this.arms = [-1, 1].map(sx => {
      const sh = new THREE.Vector3(sx * 0.235, 0.5, 0);
      const delt = add(this.chest, new THREE.SphereGeometry(0.088, 16, 12), mat.cloth, sh.x, sh.y, sh.z);
      const upper = add(root, limbGeo(0.077, 0.062, this.uArmLen), mat.cloth);
      const fore = add(root, limbGeo(0.064, 0.05, this.fArmLen), mat.cloth);
      const elbowPad = add(root, new THREE.SphereGeometry(0.062, 12, 10), mat.pad);
      const hand = add(root, new RoundedBoxGeometry(0.085, 0.1, 0.055, 3, 0.022), mat.glove);
      return { sx, sh, delt, upper, fore, elbowPad, hand };
    });

    // ---- pernas (IK)
    this.thighLen = 0.44; this.shinLen = 0.44;
    this.legs = [-1, 1].map(sx => {
      const thigh = add(root, limbGeo(0.112, 0.078, this.thighLen), mat.cloth);
      const shin = add(root, limbGeo(0.074, 0.058, this.shinLen), mat.cloth);
      const knee = add(root, new RoundedBoxGeometry(0.115, 0.12, 0.07, 2, 0.028), mat.pad);
      const boot = new THREE.Group(); root.add(boot);
      add(boot, new RoundedBoxGeometry(0.12, 0.1, 0.29, 3, 0.038), mat.boot, 0, 0.05, -0.045);
      add(boot, limbGeo(0.066, 0.07, 0.12, 12), mat.boot, 0, 0.05, 0.03);
      add(boot, new RoundedBoxGeometry(0.125, 0.022, 0.3, 2, 0.008), mat.dark, 0, 0.008, -0.045);
      const holster = sx > 0 ? add(root, new RoundedBoxGeometry(0.05, 0.16, 0.1, 2, 0.02), mat.gear) : null;
      return { sx, thigh, shin, knee, boot, holster };
    });

    // ---- arma (gira com a mira)
    this.aim = new THREE.Group(); this.aim.position.set(0, 0.48, 0); this.chest.add(this.aim);
    this.setWeapon(weaponKey);

    this.state = { phase: 0, speed: 0, crouch: 0, pitch: 0, dead: 0 };
    this.v = { S: new THREE.Vector3(), T: new THREE.Vector3(), E: new THREE.Vector3(), R: new THREE.Vector3(), H: new THREE.Vector3(), K: new THREE.Vector3(), F: new THREE.Vector3() };
    this.update(0);
  }

  // esconde o corpo feito por código (usado quando um modelo 3D realista assume o lugar)
  hideBody() {
    this.bodyHidden = true;
    this.root.traverse(o => { if (o.isMesh && !this.isGunPart(o)) o.visible = false; });
  }
  isGunPart(o) { for (let p = o; p; p = p.parent) if (p === this.gun) return true; return false; }

  setWeapon(key) {
    if (this.weaponKey === key) return;
    this.weaponKey = key;
    if (this.gun) this.aim.remove(this.gun);
    const w = buildWeaponModel(key);
    const gun = new THREE.Group(); gun.add(w.group);
    w.group.rotation.y = Math.PI / 2;                       // +x da arma -> -z (frente)
    const pistol = ['glock', 'usp', 'deagle'].includes(key), knife = key === 'knife' || ['he', 'flash', 'smoke'].includes(key);
    // posição da arma em relação ao ombro direito
    if (pistol) gun.position.set(0.05, -0.02, -0.42);
    else if (knife) gun.position.set(0.2, -0.28, -0.25);
    else gun.position.set(0.12, -0.03, -0.38);
    this.aim.add(gun); this.gun = gun; this.muzzle = w.muzzle;
    // pontos de pegada (no espaço da arma): empunhadura e guarda-mão
    this.gripR = new THREE.Object3D(); this.gripR.position.set(-0.075, -0.075, 0.02); w.group.add(this.gripR);
    this.gripL = new THREE.Object3D(); w.group.add(this.gripL);
    if (pistol) this.gripL.position.set(-0.08, -0.1, -0.03);
    else if (knife) this.gripL.position.set(-0.3, -0.25, -0.15);
    else if (w.fore) this.gripL.position.set(w.fore.x, w.fore.y - 0.035, -0.03);
    else this.gripL.position.set(0.21, -0.05, -0.03);
    this.twoHanded = !knife; this.pistol = pistol;
  }

  // s: { speed (m/s), vel: [x, z] velocidade no espaço do boneco, crouch (0..1), pitch (rad), phase opcional }
  update(dt, s = {}) {
    const st = this.state;
    st.t = (st.t || Math.random() * 10) + dt;
    st.speed += ((s.speed ?? st.speed) - st.speed) * Math.min(1, dt * 8);      // suaviza acelerar e frear
    st.pitch = s.pitch ?? st.pitch;
    st.crouch += ((s.crouch ?? 0) - st.crouch) * Math.min(1, dt * 9);
    // direção da passada (anda de lado e de costas de verdade)
    let vx = s.vel ? s.vel[0] : 0, vz = s.vel ? s.vel[1] : -st.speed;
    if (!Number.isFinite(vx) || !Number.isFinite(vz)) { vx = 0; vz = 0; }
    if (!Number.isFinite(st.speed)) st.speed = 0;
    if (!Number.isFinite(st.dirX) || !Number.isFinite(st.dirZ)) { st.dirX = 0; st.dirZ = -1; }
    const vl = Math.hypot(vx, vz);
    if (st.dirX === undefined) { st.dirX = 0; st.dirZ = -1; }
    if (vl > 0.3) {
      st.dirX += (vx / vl - st.dirX) * Math.min(1, dt * 10);
      st.dirZ += (vz / vl - st.dirZ) * Math.min(1, dt * 10);
      const dl = Math.hypot(st.dirX, st.dirZ) || 1; st.dirX /= dl; st.dirZ /= dl;
    }
    const cadence = 1.6 + st.speed * 1.15;
    st.phase += dt * cadence * Math.PI * 0.62 * (st.speed > 0.25 ? 1 : 0);
    if (s.phase !== undefined) st.phase = s.phase;
    const walk = Math.min(1, st.speed / 4.8);
    const crouchWalk = 1 - st.crouch * 0.45;
    const v = this.v;
    const breathe = Math.sin(st.t * 1.7);

    // quadril: sobe e desce a cada passo, gira e inclina de leve
    const bob = Math.abs(Math.sin(st.phase)) * 0.045 * walk;
    const hipY = 0.93 - st.crouch * 0.52 - bob + 0.01 * walk;
    this.pelvis.position.set(Math.sin(st.phase) * 0.02 * walk, hipY, 0);
    this.pelvis.rotation.set(0, Math.sin(st.phase) * 0.12 * walk, Math.sin(st.phase) * 0.04 * walk);
    const twist = this.twoHanded && !this.pistol ? -0.45 : -0.15;      // postura de tiro (ombro esquerdo à frente)
    // tronco: inclina na direção do movimento, contra-gira com o quadril e respira
    const leanF = -st.dirZ * walk * 0.12, leanS = -st.dirX * walk * 0.06;
    this.chest.rotation.set(0.05 + leanF + st.crouch * 0.38 + breathe * 0.012, twist - this.pelvis.rotation.y * 1.3, leanS - this.pelvis.rotation.z * 0.8, 'YXZ');
    this.neck.rotation.set(-st.crouch * 0.2 - leanF * 0.6, -twist * 0.8 + Math.sin(st.t * 0.4) * 0.06 * (1 - walk), 0);
    // arma: segue a mira com um leve balanço (respiração e passos)
    const sway = Math.sin(st.t * 1.3) * 0.012 + Math.sin(st.phase * 2) * 0.02 * walk;
    this.aim.rotation.set(st.pitch - this.chest.rotation.x + sway * 0.6 + breathe * 0.006, -twist + this.pelvis.rotation.y * 0.5 + sway * 0.4, -leanS, 'YXZ');
    this.head.rotation.x = st.pitch * 0.6 - 0.04;
    this.root.updateMatrixWorld(true);

    // braços até a arma (IK: as mãos nunca saem da arma)
    for (const arm of this.arms) {
      this.chest.localToWorld(v.S.copy(arm.sh)); this.root.worldToLocal(v.S);
      const target = arm.sx > 0 || !this.twoHanded ? (arm.sx > 0 ? this.gripR : null) : this.gripL;
      if (target) { target.getWorldPosition(v.T); this.root.worldToLocal(v.T); }
      else v.T.set(arm.sx * 0.26 + Math.sin(st.phase) * 0.1 * walk, hipY + 0.05, 0.02 - Math.sin(st.phase) * 0.15 * walk);
      const pole = new THREE.Vector3(arm.sx * 0.9, -1, arm.sx > 0 ? 0.6 : 0.2);
      solveIK(v.S, v.T, this.uArmLen, this.fArmLen, pole, v.E, v.R);
      placeLimb(arm.upper, v.S, v.E, this.uArmLen);
      placeLimb(arm.fore, v.E, v.R, this.fArmLen);
      arm.elbowPad.position.copy(v.E);
      (arm.wristT ||= new THREE.Vector3()).copy(v.R); (arm.shoulderT ||= new THREE.Vector3()).copy(v.S);
      arm.hand.position.copy(v.R);
      arm.hand.quaternion.copy(arm.fore.quaternion);
    }

    // pernas: passada na direção do movimento, pé rola do calcanhar para a ponta
    for (const leg of this.legs) {
      const ph = st.phase + (leg.sx > 0 ? 0 : Math.PI);
      const stride = 0.36 * walk * crouchWalk;
      const swing = -Math.sin(ph) * stride;
      const lift = Math.max(0, Math.cos(ph)) * (0.13 + st.crouch * 0.04) * walk;
      // base de tiro: pé esquerdo à frente, pé direito atrás e mais aberto
      const stanceZ = (leg.sx > 0 ? 0.1 : -0.12) * (1 - walk * 0.8) + (leg.sx > 0 ? 0.08 : -0.12) * st.crouch * 2.2;
      const stanceX = leg.sx * (0.13 + (leg.sx > 0 ? 0.03 : 0) + st.crouch * 0.08);
      this.pelvis.localToWorld(v.H.set(leg.sx * 0.115, -0.04, 0)); this.root.worldToLocal(v.H);
      v.F.set(stanceX + st.dirX * swing, 0.1 + lift, stanceZ + st.dirZ * swing);
      solveIK(v.H, v.F, this.thighLen, this.shinLen, new THREE.Vector3(leg.sx * 0.15, 0.2, -1), v.K, v.R);
      placeLimb(leg.thigh, v.H, v.K, this.thighLen);
      placeLimb(leg.shin, v.K, v.R, this.shinLen);
      leg.knee.position.copy(v.K).add(new THREE.Vector3(0, 0, -0.06)); leg.knee.quaternion.copy(leg.shin.quaternion);
      leg.boot.position.set(v.R.x, v.R.y - 0.1, v.R.z);
      (leg.ankleT ||= new THREE.Vector3()).copy(v.R); leg.lift = lift;
      const roll = Math.sin(ph) * 0.35 * walk;                 // calcanhar -> ponta
      leg.boot.rotation.set(lift > 0.01 ? -lift * 2.2 : roll * 0.5, (leg.sx > 0 ? -0.15 : 0.1), 0);
      if (leg.holster) { leg.holster.position.lerpVectors(v.H, v.K, 0.35).add(new THREE.Vector3(0.1, 0, 0)); leg.holster.quaternion.copy(leg.thigh.quaternion); }
    }
  }
}
