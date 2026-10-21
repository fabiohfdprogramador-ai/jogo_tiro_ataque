// Outros jogadores: soldado 3D feito por código (soldier3d.js), interpolação, andar, correr, agachar e morrer.
import * as THREE from 'three';
import { Soldier } from './soldier3d.js';
import { bodyHeight, eyeHeight } from '/shared/physics.js';
import { FLASH_TEX } from './viewmodel.js';

function nameSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 30px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(text, 128, 32);
  g.fillStyle = color; g.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.2, 0.3, 1); s.renderOrder = 10;
  return s;
}

// modelo: soldado realista (soldier.js) + clarão do disparo no cano da arma
function buildModel(team, weapon) {
  const root = new THREE.Group();
  const soldier = new Soldier(team, weapon || 'ak47');
  root.add(soldier.root);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLASH_TEX, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.scale.setScalar(0.35); flash.visible = false;
  const model = { root, soldier, flash };
  attachFlash(model);
  return model;
}
function attachFlash(model) {
  model.flash.removeFromParent();
  (model.soldier.muzzle || model.soldier.gun).add(model.flash);
}

export class RemotePlayers {
  constructor(scene) { this.scene = scene; this.map = new Map(); this.myTeam = null; }
  setMyTeam(t) { this.myTeam = t; for (const r of this.map.values()) this.refreshLabel(r); }
  refreshLabel(r) {
    if (r.label) { r.model.root.remove(r.label); r.label = null; }
    if (r.team === this.myTeam) { r.label = nameSprite(r.name, r.team === 'T' ? '#f0c060' : '#8fb8ee'); r.label.position.y = 2.15; r.model.root.add(r.label); }
  }
  sync(list, myId) {
    const seen = new Set();
    for (const s of list) {
      if (s.id === myId) continue;
      seen.add(s.id);
      let r = this.map.get(s.id);
      if (!r || r.team !== s.team) {
        if (r) this.scene.remove(r.model.root);
        const model = buildModel(s.team, s.w);
        r = { id: s.id, team: s.team, name: s.name, model, p: [...s.p], yaw: s.yaw, pitch: s.pitch, tp: s.p, tyaw: s.yaw, alive: s.a, dead: 0, phase: 0, flashT: 0, w: null, step: 0, s: 0 };
        this.scene.add(model.root);
        this.map.set(s.id, r); this.refreshLabel(r);
      }
      if (s.a && !r.alive) { r.p = [...s.p]; r.dead = 0; }      // respawn: teleporta
      r.tp = s.p; r.tyaw = s.yaw; r.tpitch = s.pitch; r.alive = s.a; r.crouch = s.c; r.s = s.s; r.name = s.name; r.hp = s.hp; r.reloading = s.rl;
      if (r.w !== s.w && s.w) { r.w = s.w; r.model.soldier.setWeapon(s.w); attachFlash(r.model); }
    }
    for (const [id, r] of this.map) if (!seen.has(id)) { this.scene.remove(r.model.root); this.map.delete(id); }
  }
  update(dt) {
    const k = 1 - Math.exp(-dt * 14);
    for (const r of this.map.values()) {
      const M = r.model;
      const ox = r.p[0], oz = r.p[2];
      for (let i = 0; i < 3; i++) r.p[i] += (r.tp[i] - r.p[i]) * k;
      // velocidade suavizada (para a direção da passada)
      if (dt > 0) { const kv = Math.min(1, dt * 6); r.vx = (r.vx || 0) + ((r.p[0] - ox) / dt - (r.vx || 0)) * kv; r.vz = (r.vz || 0) + ((r.p[2] - oz) / dt - (r.vz || 0)) * kv; }
      let dy = r.tyaw - r.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      r.yaw += dy * k; r.pitch = r.pitch + ((r.tpitch || 0) - r.pitch) * k;
      M.root.position.set(r.p[0], r.p[1], r.p[2]);
      M.root.visible = r.id !== this.hidden;
      M.root.rotation.y = r.yaw;
      // morte: o boneco dobra os joelhos e cai (animação dentro do soldado)
      if (!r.alive) {
        if (r.dead < 2) { r.dead += dt; M.soldier.update(dt, { dead: true }); }   // depois de caído não precisa mais animar
        if (r.label) r.label.visible = false;
        M.flash.visible = false;
        continue;
      }
      r.dead = 0;
      if (r.label) r.label.visible = true;
      const cy = Math.cos(r.yaw), sy = Math.sin(r.yaw);
      r.vx = Number.isFinite(r.vx) ? r.vx : 0; r.vz = Number.isFinite(r.vz) ? r.vz : 0;
      const vel = [r.vx * cy - r.vz * sy, r.vx * sy + r.vz * cy];   // no espaço do boneco
      if (M.root.visible) M.soldier.update(dt, { speed: Math.min(8, Math.hypot(r.vx, r.vz)), vel, crouch: r.crouch ? 1 : 0, pitch: r.pitch, reload: !!r.reloading });
      r.flashT -= dt; M.flash.visible = r.flashT > 0;
      if (M.flash.visible) M.flash.material.rotation = Math.random() * 3;
    }
  }
  // posição do cano (para traçantes)
  muzzleWorld(id, out) {
    const r = this.map.get(id); if (!r) return null;
    r.model.flash.getWorldPosition(out); return out;
  }
  fired(id) { const r = this.map.get(id); if (r) { r.flashT = 0.05; r.model.soldier.fire(); } }
  // levou tiro: tranco no corpo (dir = direção do tiro no mundo)
  hit(id, dir, hs) {
    const r = this.map.get(id); if (!r || !r.alive) return;
    const c = Math.cos(r.yaw), s = Math.sin(r.yaw);
    r.model.soldier.hit(new THREE.Vector3(dir.x * c - dir.z * s, 0, dir.x * s + dir.z * c).normalize(), hs);
  }
  eye(id) {
    const r = this.map.get(id); if (!r) return null;
    return [r.p[0], r.p[1] + eyeHeight(r.crouch), r.p[2]];
  }
  chest(id) { const r = this.map.get(id); if (!r) return null; return [r.p[0], r.p[1] + bodyHeight(r.crouch) - 0.45, r.p[2]]; }
  get(id) { return this.map.get(id); }
}
