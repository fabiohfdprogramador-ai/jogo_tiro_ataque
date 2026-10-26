// Efeitos: traçantes, marcas de tiro, poeira, sangue.
import * as THREE from 'three';

function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function fireTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.3, 'rgba(255,190,90,.95)'); gr.addColorStop(0.65, 'rgba(240,110,30,.6)'); gr.addColorStop(1, 'rgba(200,60,10,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function smokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 64 + (Math.random() - 0.5) * 50, y = 64 + (Math.random() - 0.5) * 50, r = 20 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}
function bloodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * 6.28, d = Math.random() * 18, r = 4 + Math.random() * 9;
    g.fillStyle = 'rgba(' + (80 + Math.random() * 30 | 0) + ',4,4,' + (0.6 + Math.random() * 0.35) + ')';
    g.beginPath(); g.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function holeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  gr.addColorStop(0, 'rgba(10,8,5,1)'); gr.addColorStop(0.35, 'rgba(30,22,12,.9)'); gr.addColorStop(0.6, 'rgba(60,45,25,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.puffTex = puffTexture();
    this.holeMat = new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.holeGeo = new THREE.PlaneGeometry(0.12, 0.12);
    this.holes = [];
    this.particles = [];
    this.tracers = [];
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9 });
    this.fireTex = fireTexture(); this.smokeTex = smokeTexture();
    this.bloodMat = new THREE.MeshBasicMaterial({ map: bloodTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.lights = []; this.clouds = [];
    // luzes das explosões: sempre as mesmas 4, só acendem e apagam. Criar e tirar luzes muda a quantidade delas e
    // obriga o navegador a recompilar todos os materiais do mapa, o que travava o jogo a cada explosão.
    this.lightPool = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xffffff, 0, 20, 2); scene.add(l); return l; });
  }
  flashLight(pos, color, peak, dist, life) {
    const busy = new Set(this.lights.map(L => L.obj));
    const l = this.lightPool.find(x => !busy.has(x)) || this.lights.sort((a, b) => a.life - b.life)[0].obj;   // todas ocupadas: usa a que está apagando
    this.lights = this.lights.filter(L => L.obj !== l);
    l.color.set(color); l.distance = dist; l.position.copy(pos); l.intensity = peak;
    this.lights.push({ obj: l, life, max: life, peak });
  }
  // sangue: jato, névoa e mancha na parede/chão atrás de quem levou o tiro
  bloodHit(point, dir, boxes, raycast) {
    const d = dir.clone().normalize();
    for (let i = 0; i < 10; i++) this.spawn(point, d.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0.2, 0)), 0x8a0a0a, 0.08 + Math.random() * 0.14, 0.5, 2.2);
    for (let i = 0; i < 5; i++) this.spawn(point, new THREE.Vector3(0, 0.4, 0), 0x5a0606, 0.25 + Math.random() * 0.2, 0.8, 0.6);
    if (!raycast) return;
    const end = d.clone().multiplyScalar(2.5).add(new THREE.Vector3(0, -0.8, 0)).normalize();
    const r = raycast([point.x, point.y, point.z], [end.x, end.y, end.z], 3.2, boxes);
    if (r.normal && r.t < 3.2) {
      const p = point.clone().addScaledVector(end, r.t), n = new THREE.Vector3(...r.normal);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.bloodMat);
      m.scale.setScalar(0.4 + Math.random() * 0.4);
      m.position.copy(p).addScaledVector(n, 0.012); m.lookAt(m.position.clone().add(n)); m.rotateZ(Math.random() * 6.28);
      this.scene.add(m); this.holes.push(m);
      if (this.holes.length > 150) this.scene.remove(this.holes.shift());
    }
  }
  // explosão: clarão, bola de fogo, fumaça escura e terra (big = bomba)
  explosion(pos, big = false) {
    const s = big ? 2.2 : 1;
    this.flashLight(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xffa050, 60 * s, 22 * s, 0.6);
    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fireTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 1.6 * s, 0.5 + Math.random() * 1.6 * s, (Math.random() - 0.5) * 1.6 * s));
      this.scene.add(sp);
      this.particles.push({ obj: sp, v: new THREE.Vector3(0, 1.5 * s, 0), life: 0.55, max: 0.55, size: (5 + Math.random() * 3) * s, grow: 0.4, fire: true });
    }
    for (let i = 0; i < 22 * s; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, color: 0x3a3632, transparent: true, depthWrite: false }));
      sp.position.copy(pos).add(new THREE.Vector3(0, 0.6, 0));
      this.scene.add(sp);
      const v = new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.8 + 0.3, (Math.random() - 0.5)).normalize().multiplyScalar((1 + Math.random() * 2.5) * s);
      this.particles.push({ obj: sp, v, life: 3.5, max: 3.5, size: (2.5 + Math.random() * 2) * s, grow: 1.2, smoke: true });
    }
    for (let i = 0; i < 25 * s; i++) this.spawn(pos.clone().add(new THREE.Vector3(0, 0.3, 0)), new THREE.Vector3(0, 1, 0), 0xb39a70, 0.25, 1.3, 9 * s);
  }
  flashbang(pos) {
    this.flashLight(pos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xffffff, 120, 25, 0.3);
    for (let i = 0; i < 8; i++) this.spawn(pos, new THREE.Vector3(0, 1, 0), 0xffffee, 0.6, 0.25, 4, true);
  }
  // nuvem de fumaça que enche, fica e some
  smokeCloud(pos, dur) {
    const parts = [];
    for (let i = 0; i < 46; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, color: 0xbcbcb8, transparent: true, depthWrite: false, opacity: 0 }));
      const a = Math.random() * 6.28, r = Math.pow(Math.random(), 0.6) * 3.6;
      sp.userData.home = new THREE.Vector3(pos.x + Math.cos(a) * r, pos.y + 0.6 + Math.random() * 2.6, pos.z + Math.sin(a) * r);
      sp.position.copy(pos).add(new THREE.Vector3(0, 0.3, 0));
      sp.userData.size = 3.6 + Math.random() * 2.4;
      this.scene.add(sp); parts.push(sp);
    }
    this.clouds.push({ parts, t: 0, dur });
  }
  tracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const line = new THREE.Line(geo, this.tracerMat.clone());
    this.scene.add(line);
    this.tracers.push({ obj: line, life: 0.06 });
  }
  impact(point, normal) {
    const n = new THREE.Vector3(...normal);
    const hole = new THREE.Mesh(this.holeGeo, this.holeMat);
    hole.position.copy(point).addScaledVector(n, 0.01);
    hole.lookAt(hole.position.clone().add(n));
    hole.rotateZ(Math.random() * Math.PI * 2);
    this.scene.add(hole); this.holes.push(hole);
    if (this.holes.length > 150) this.scene.remove(this.holes.shift());
    for (let i = 0; i < 5; i++) this.spawn(point, n, 0xc8ad80, 0.12 + Math.random() * 0.15, 0.5, 1.6);
    this.spawn(point, n, 0xffd58a, 0.06, 0.07, 0.2, true);
  }
  blood(point) {
    for (let i = 0; i < 6; i++) this.spawn(point, new THREE.Vector3(0, 0.3, 0), 0x8a0a0a, 0.1 + Math.random() * 0.15, 0.45, 1.4);
  }
  clearDecals() {
    for (const h of this.holes) this.scene.remove(h); this.holes = [];
    for (const C of this.clouds) for (const sp of C.parts) this.scene.remove(sp); this.clouds = [];
  }
  spawn(p, n, color, size, life, speed, additive = false) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, color, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    sp.position.copy(p); sp.scale.setScalar(size);
    const v = n.clone().multiplyScalar(speed * (0.5 + Math.random())).add(new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.6, (Math.random() - 0.5) * speed));
    this.scene.add(sp);
    this.particles.push({ obj: sp, v, life, max: life, size });
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i]; q.life -= dt;
      if (q.life <= 0) { this.scene.remove(q.obj); q.obj.material.dispose(); this.particles.splice(i, 1); continue; }
      if (!q.fire && !q.smoke) q.v.y -= 2.5 * dt;
      q.v.multiplyScalar(Math.exp(-(q.smoke ? 1.2 : 3) * dt));
      q.obj.position.addScaledVector(q.v, dt);
      const t = q.life / q.max;
      if (q.fire) { q.obj.material.opacity = Math.min(1, t * 1.6); q.obj.scale.setScalar(q.size * (q.grow + (1 - q.grow) * Math.min(1, (1 - t) * 4))); }
      else if (q.smoke) { q.obj.material.opacity = Math.min(0.85, t * 1.2); q.obj.scale.setScalar(q.size * (1 + (1 - t) * q.grow)); }
      else { q.obj.material.opacity = t * 0.8; q.obj.scale.setScalar(q.size * (1 + (1 - t) * 1.5)); }
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const L = this.lights[i]; L.life -= dt;
      if (L.life <= 0) { L.obj.intensity = 0; this.lights.splice(i, 1); }
      else L.obj.intensity = L.peak * (L.life / L.max);
    }
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const C = this.clouds[i]; C.t += dt;
      const fadeIn = Math.min(1, C.t / 1.2), fadeOut = Math.min(1, Math.max(0, (C.dur - C.t) / 3));
      for (const sp of C.parts) {
        sp.position.lerp(sp.userData.home, Math.min(1, dt * 1.8));
        sp.userData.home.y += dt * 0.03;
        sp.material.opacity = 0.92 * fadeIn * fadeOut;
        sp.scale.setScalar(sp.userData.size * (0.5 + 0.5 * fadeIn));
        sp.material.rotation += dt * 0.05;
      }
      if (C.t > C.dur) { for (const sp of C.parts) { this.scene.remove(sp); sp.material.dispose(); } this.clouds.splice(i, 1); }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i]; tr.life -= dt;
      if (tr.life <= 0) { this.scene.remove(tr.obj); tr.obj.geometry.dispose(); tr.obj.material.dispose(); this.tracers.splice(i, 1); }
      else tr.obj.material.opacity = tr.life / 0.06;
    }
  }
}
