// Cliente do jogo: renderização, controles, previsão de movimento, rede e efeitos.
import * as THREE from 'three';
import { MAP, MAPS } from '/shared/map.js';
import { PHYS, moveBody, canStand, raycastWorld, rayPlayer, lineOfSight, dirFromAngles, eyeHeight, bodyHeight, NADE, stepNade, PROJ, stepProj } from '/shared/physics.js';
import { WEAPONS, BUY_MENU, sprayOffset, fireInterval, MAX_HP, weaponName, BOMB } from '/shared/weapons.js';
import { buildWorld } from './world.js';
import { ViewModel, buildWeaponModel, buildNade } from './viewmodel.js';
import { loadGunModels } from './gunmodels.js';
import { loadArms } from './arms.js';
import { buildRocketProjectile, buildArrowProjectile } from './heavy.js';
import { RemotePlayers } from './players.js';
import { Effects } from './effects.js';
import { Sound } from './audio2.js';
import { createComposer } from './post.js';
import { Hud } from './hud.js';

const $ = (id) => document.getElementById(id);
function lockPointer() { try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* sem pointer lock */ } }

// ---------------------------------------------------------------- configurações
const SOUND_GROUPS = ['tiros', 'passos', 'ambiente', 'avisos'];
const IMAGE_SOUND_DEFAULTS = { bright: 1, contrast: 1, satur: 1, ...Object.fromEntries(SOUND_GROUPS.map(k => ['vol_' + k, 1])) };
function loadSettings() {
  const def = { sens: 1.2, vol: 0.6, quality: true, name: '', map: 'bairro', ...IMAGE_SOUND_DEFAULTS };
  try { return { ...def, ...JSON.parse(localStorage.getItem('deserto.settings') || '{}') }; } catch { return def; }
}
const settings = loadSettings();
function saveSettings() { try { localStorage.setItem('deserto.settings', JSON.stringify(settings)); } catch { /* sem storage */ } }

// ---------------------------------------------------------------- renderização
function createRenderer() {
  try {
    return new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    $('status').innerHTML = 'Seu navegador não conseguiu ligar os gráficos 3D (WebGL).<br>' +
      'No Chrome, abra <b>chrome://settings/system</b>, ative <b>"Usar aceleração de gráficos quando disponível"</b> e reinicie o Chrome.<br>' +
      'Para testar, abra <b>https://get.webgl.org</b>: deve aparecer um cubo girando.';
    $('play').disabled = true;
    throw e;
  }
}
const renderer = createRenderer();
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.autoClear = false;
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const BASE_FOV = 72;
const camera = new THREE.PerspectiveCamera(BASE_FOV, innerWidth / innerHeight, 0.03, 500);
camera.rotation.order = 'YXZ';
scene.add(camera);
const { sunLight, envMap, setMap } = buildWorld(renderer, scene);
let mapId = 'deserto';
function changeMap(id) {
  if (!MAPS[id] || id === mapId) return;
  mapId = id; setMap(id); fx.clearDecals(); applyImage();
  const sp = MAP.spawns.CT[0];            // câmera do menu passeia pelo mapa escolhido
  if (!playing) { camera.position.set(sp[0], 2.2, sp[1]); camera.rotation.set(-0.05, 0.1, 0); }
}
const post = createComposer(renderer, scene, camera);

function applyQuality() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, settings.quality ? 1.5 : 1));
  renderer.shadowMap.type = settings.quality ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  const size = settings.quality ? 4096 : 2048;
  if (sunLight.shadow.mapSize.x !== size) {
    sunLight.shadow.mapSize.set(size, size);
    if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
  }
  renderer.setSize(innerWidth, innerHeight);
  if (typeof post !== 'undefined' && post) post.setSize(innerWidth, innerHeight);
}
applyQuality();

const vm = new ViewModel();
vm.setEnvironment(envMap, sunLight.position);
const remotes = new RemotePlayers(scene);
const fx = new Effects(scene);
const sound = new Sound(); sound.setVolume(settings.vol);
const hud = new Hud();

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); post.setSize(innerWidth, innerHeight); });

// ---------------------------------------------------------------- estado local
const me = {
  id: 0, team: null, p: [0, 0, 46], v: [0, 0, 0], yaw: 0, pitch: 0, crouch: false, onGround: true, alive: false, eyeH: PHYS.eyeStand,
  slots: { 1: null, 2: null, 3: 'knife', 4: null, 5: null }, cur: 3, prevSlot: 2, ammo: {}, nd: {}, money: 0, hp: MAX_HP, armor: 0, helmet: false,
  shake: 0, flash: 0, using: false,
  reloadEnd: 0, nextFire: 0, lastShot: 0, spray: 0, punch: 0, scope: 0, stepT: 0, jumpQueued: false,
};
const srv = { phase: 'waiting', timer: 0, score: { T: 0, CT: 0 }, round: 0, buy: false, players: [], bomb: { st: 'none' } };
let ws = null, playing = false, locked = false;
const keys = {};
let mouseDown = false, mouseClicked = false, lookDX = 0, lookDY = 0;
let buyOpen = false, boardOpen = false, chatOpen = false;
let pickPrimary = false;
let spectate = 0, deathText = '', lastDeathHtml = '';
const escapeHtml = (x) => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const spotted = new Set(); let spotT = 0;
const lastFiredAt = new Map();
const clock = new THREE.Clock();
const now = () => performance.now() / 1000;
const curKey = () => me.slots[me.cur];
const eyePos = () => [me.p[0], me.p[1] + me.eyeH, me.p[2]];
const playerById = (id) => srv.players.find(p => p.id === id);

// ---------------------------------------------------------------- rede
function send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }

function connect(name, team) {
  $('status').textContent = 'Conectando...';
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => send({ t: 'join', name, team, map: settings.map });
  ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } onMessage(m); };
  ws.onclose = () => {
    playing = false; hud.show(false); $('pause').classList.add('hidden'); $('menu').classList.remove('hidden');
    $('status').textContent = 'Conexão com o servidor perdida. Verifique se o servidor está rodando e clique em Jogar.';
    if (document.pointerLockElement) document.exitPointerLock();
  };
}

function onMessage(m) {
  switch (m.t) {
    case 'welcome':
      me.id = m.id; me.team = m.team; playing = true;
      if (m.map) changeMap(m.map);
      vm.setTeam(m.team); remotes.setMyTeam(m.team);
      $('menu').classList.add('hidden'); hud.show(true);
      hud.notice(`Você está no time ${m.team === 'T' ? 'Terrorista' : 'Contra-Terrorista'}`);
      break;
    case 'spawn':
      me.p = [...m.p]; me.v = [0, 0, 0];
      if (!m.keepAim) { me.crouchToggle = false; me.yaw = m.yaw; me.pitch = 0; me.alive = true; pickPrimary = true; me.reloadEnd = 0; me.scope = 0; me.spray = 0; spectate = 0; deathText = ''; lastDeathHtml = ''; hud.death(null); }
      break;
    case 'state': onState(m); break;
    case 'round':
      srv.score = m.score;
      if (m.phase === 'freeze') {
        if (m.map) changeMap(m.map);
        fx.clearDecals(); clearNades(); clearProjs();
        hud.banner(`Round ${m.round}`, '', 2.5);
      } else if (m.phase === 'live') {
        sound.roundStart(); hud.notice('Vai! Vai! Vai!', 1.5);
      } else if (m.phase === 'end' || m.phase === 'matchover') {
        hud.banner(m.msg, m.winner === 'T' ? 't' : 'ct', m.phase === 'end' ? 4.5 : 9);
        sound.roundEnd(m.winner === me.team);
      }
      break;
    case 'shot': onShot(m); break;
    case 'kill': {
      const k = playerById(m.killer), v = playerById(m.victim);
      if (k && v) hud.feed(k, v, weaponName(m.w), m.hs, m.killer === me.id || m.victim === me.id);
      if (m.victim === me.id) {
        me.alive = false; me.scope = 0; buyOpen = false;
        deathText = k ? `Você foi morto por <b class="${k.team === 'T' ? 'tt' : 'c'}">${escapeHtml(k.name)}</b> com ${weaponName(m.w)}${m.hs ? ' (tiro na cabeça)' : ''}` : 'Você morreu';
        hud.death(deathText);
        setTimeout(() => { if (!me.alive) nextSpectate(); }, 1500);
      }
      lastFiredAt.set(m.killer, now());
      break;
    }
    case 'hurt':
      hud.damage(m.from, me.p, me.yaw); sound.hurt(); me.punch += 0.025; me.shake = Math.min(1, me.shake + 0.15 + (m.dmg || 0) / 120);
      break;
    case 'hitmark': hud.hitmark(m.hs); sound.hit(m.hs); break;
    case 'msg': hud.notice(m.text); break;
    case 'bought': {
      sound.buy();
      const W = WEAPONS[m.item];
      if (W) { me.slots[W.slot] = m.item; me.ammo[m.item] = { mag: W.mag, res: W.reserve }; selectSlot(W.slot, true); }
      break;
    }
    case 'chat': hud.chat(m.name, m.team, m.text); break;
    case 'nade': {
      const mesh = buildNade(m.kind).group; mesh.scale.setScalar(1.2); scene.add(mesh);
      mesh.position.set(...m.p);
      nadeObjs.set(m.id, { kind: m.kind, p: [...m.p], v: [...m.v], rest: false, mesh, acc: 0 });
      if (m.owner !== me.id) sound.throwNade();
      break;
    }
    case 'proj': {   // foguete ou flecha saiu: o cliente simula o voo igual ao servidor
      const mesh = m.kind === 'rocket' ? buildRocketProjectile() : buildArrowProjectile();
      scene.add(mesh); mesh.position.set(...m.p);
      projObjs.set(m.id, { kind: m.kind, p: [...m.p], v: [...m.v], mesh, acc: 0, trail: 0 });
      if (m.owner !== me.id) {
        lastFiredAt.set(m.owner, now()); remotes.fired(m.owner);
        if (!me.alive && m.owner === spectate) vm.fire();
        sound.shot(m.w, m.p);
      }
      break;
    }
    case 'projhit': {
      const q = projObjs.get(m.id); if (q) { scene.remove(q.mesh); projObjs.delete(m.id); }
      const pos = new THREE.Vector3(...m.p), dir = new THREE.Vector3(...m.d);
      if (m.hp) remotes.hit(m.hp, dir, m.hs);
      if (m.kind === 'rocket') {
        const d = pos.distanceTo(camera.position);
        fx.explosion(pos, true); sound.boom(m.p, true); me.shake = Math.min(1, me.shake + Math.max(0, 1.2 - d / 25));
      } else {
        if (m.hp) fx.bloodHit(pos, dir, MAP.boxes, raycastWorld);
        else if (m.n) { fx.impact(pos, m.n); stickArrow(pos, dir); }
        sound.bounce(m.p);
      }
      break;
    }
    case 'boom': {
      const n = nadeObjs.get(m.id); if (n) { scene.remove(n.mesh); nadeObjs.delete(m.id); }
      const pos = new THREE.Vector3(...m.p);
      const d = Math.hypot(m.p[0] - camera.position.x, m.p[1] - camera.position.y, m.p[2] - camera.position.z);
      if (m.kind === 'he') { fx.explosion(pos); sound.boom(m.p); me.shake = Math.min(1, me.shake + Math.max(0, 1 - d / 22)); }
      else if (m.kind === 'flash') { fx.flashbang(pos); sound.flashPop(m.p); }
      else { fx.smokeCloud(pos, NADE.smokeTime); sound.hiss(m.p); }
      break;
    }
    case 'flashed':
      me.flash = Math.max(me.flash, m.amt * 3.5); sound.ring(m.amt * 3);
      break;
    case 'bomb':
      if (m.ev === 'given') hud.notice('Você está com a bomba! Plante no bombsite A ou B segurando F', 4);
      else if (m.ev === 'picked') hud.notice('Você pegou a bomba', 2);
      else if (m.ev === 'dropped' && me.alive) hud.notice('A bomba caiu! Pegue-a', 2.5);
      else if (m.ev === 'planted') { sound.planted(); hud.banner(`Bomba plantada no ${m.site}!`, 't', 3); beepT = 0; }
      else if (m.ev === 'defused') { sound.defused(); }
      else if (m.ev === 'exploded') {
        const d = Math.hypot(m.p[0] - camera.position.x, m.p[2] - camera.position.z);
        fx.explosion(new THREE.Vector3(...m.p), true); sound.boom(m.p, true); me.shake = Math.min(1.2, me.shake + Math.max(0.2, 1.4 - d / 40));
      }
      break;
    case 'picked':
      me.slots[m.slot] = m.key; delete me.ammo[m.key];      // a munição certa chega no próximo estado
      sound.draw(); selectSlot(m.slot, true); me.nextFire = now() + 0.4;
      break;
  }
}

function onState(m) {
  srv.phase = m.ph; srv.timer = m.tl; srv.score = m.sc; srv.round = m.rd; srv.buy = !!m.buy; srv.players = m.ps;
  const s = m.me, t = now();
  const wasAlive = me.alive;
  me.hp = s.hp; me.armor = s.ar; me.helmet = !!s.hm; me.money = s.m; me.alive = !!s.a;
  if (s.team !== me.team) { me.team = s.team; vm.setTeam(s.team); remotes.setMyTeam(s.team); }
  me.slots = { 1: s.sl[1] || null, 2: s.sl[2] || null, 3: s.sl[3] || null, 4: s.sl[4] || null, 5: s.sl[5] || null };
  me.nd = s.nd || {}; me.bag4 = s.b4 || [];
  srv.bomb = m.bomb || { st: 'none' };
  if (s.cur === 5 && me.cur === 5 && me.slots[5] && vm.key !== me.slots[5] && vm.throwT < 0) vm.setWeapon(me.slots[5]);   // trocou de granada
  for (const k in s.am) {
    if (!me.ammo[k] || (t - me.lastShot > 0.6 && !me.reloadEnd && !s.rl)) me.ammo[k] = { ...s.am[k] };
  }
  if (pickPrimary || !me.slots[me.cur]) { pickPrimary = false; selectSlot(me.slots[1] ? 1 : me.slots[2] ? 2 : 3, true); }
  else if (me.alive && vm.key !== curKey()) vm.setWeapon(curKey(), true);
  if (me.alive && !wasAlive) { spectate = 0; deathText = ''; lastDeathHtml = ''; hud.death(null); }
  if (!me.alive && buyOpen) buyOpen = false;
  remotes.sync(m.ps, me.id);
  syncDrops(m.dr || []);
}

// granadas voando (mesma física do servidor, passo fixo)
const nadeObjs = new Map();
function clearNades() { for (const n of nadeObjs.values()) scene.remove(n.mesh); nadeObjs.clear(); }
function updateNades(dt) {
  for (const n of nadeObjs.values()) {
    n.acc += dt;
    while (n.acc >= 1 / 60) {
      n.acc -= 1 / 60;
      if (stepNade(n, 1 / 60, MAP.boxes)) sound.bounce(n.p);
    }
    n.mesh.position.set(n.p[0], n.p[1], n.p[2]);
    if (!n.rest) { n.mesh.rotation.x += dt * 9; n.mesh.rotation.z += dt * 5; }
  }
}

// foguetes e flechas em voo; flechas que bateram ficam espetadas um tempo
const projObjs = new Map(), stuckArrows = [];
const _fwd = new THREE.Vector3(1, 0, 0), _dirV = new THREE.Vector3();
function clearProjs() {
  for (const q of projObjs.values()) scene.remove(q.mesh); projObjs.clear();
  for (const a of stuckArrows) scene.remove(a.mesh); stuckArrows.length = 0;
}
function stickArrow(pos, dir) {
  const mesh = buildArrowProjectile();
  mesh.position.copy(pos).addScaledVector(dir, 0.08); mesh.quaternion.setFromUnitVectors(_fwd, dir.clone().normalize());
  scene.add(mesh); stuckArrows.push({ mesh, t: now() + 12 });
  if (stuckArrows.length > 30) scene.remove(stuckArrows.shift().mesh);
}
function updateProjs(dt) {
  for (const q of projObjs.values()) {
    q.acc += dt;
    while (q.acc >= 1 / 60) { q.acc -= 1 / 60; stepProj(q, 1 / 60); }
    q.mesh.position.set(q.p[0], q.p[1], q.p[2]);
    q.mesh.quaternion.setFromUnitVectors(_fwd, _dirV.set(q.v[0], q.v[1], q.v[2]).normalize());
    if (q.kind === 'rocket' && (q.trail -= dt) <= 0) {   // rastro de fumaça
      q.trail = 0.02; fx.spawn(q.mesh.position.clone().addScaledVector(_dirV, -0.3), _dirV.clone().negate(), 0xcfc8bc, 0.5, 1.4, 0.4);
    }
  }
  const t = now();
  while (stuckArrows.length && stuckArrows[0].t < t) scene.remove(stuckArrows.shift().mesh);
}

// bomba: nas costas de quem carrega, no chão ou plantada (com luz piscando)
const bombObj = (() => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.2), new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.8 }));
  body.position.y = 0.06; g.add(body);
  for (let i = 0; i < 3; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0xa08a5a, roughness: 0.6 }));
    tube.rotation.z = Math.PI / 2; tube.position.set(0, 0.13, -0.06 + i * 0.06); g.add(tube);
  }
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.09), new THREE.MeshStandardMaterial({ color: 0x1b1d1e, roughness: 0.4 }));
  pad.position.set(0.05, 0.17, 0); g.add(pad);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0x330000 }));
  led.position.set(-0.04, 0.18, 0.02); g.add(led);
  const light = new THREE.PointLight(0xff2020, 0, 4, 2); light.position.set(-0.04, 0.3, 0.02); g.add(light);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.visible = false; scene.add(g);
  return { g, led, light };
})();
let beepT = 0;
function updateBomb(dt) {
  const b = srv.bomb, o = bombObj;
  o.g.visible = false; o.light.intensity = 0; o.led.material.color.setHex(0x330000);
  if (!b || b.st === 'none' || b.st === 'exploded') return;
  if (b.st === 'carried') {
    if (b.c === me.id) return;                       // a minha não aparece (fica nas costas)
    const r = remotes.get(b.c); if (!r || !r.alive) return;
    o.g.visible = true; o.g.position.set(r.p[0] + Math.sin(r.yaw) * 0.22, r.p[1] + (r.crouch ? 0.9 : 1.15), r.p[2] + Math.cos(r.yaw) * 0.22); o.g.rotation.set(Math.PI / 2, r.yaw, 0);
    return;
  }
  o.g.visible = true; o.g.position.set(b.p[0], b.p[1], b.p[2]); o.g.rotation.set(0, 0.6, 0);
  if (b.st === 'planted') {
    // bipa cada vez mais rápido conforme o tempo acaba
    const every = Math.max(0.12, Math.min(1, b.tm / BOMB.timer * 1.1));
    beepT -= dt;
    if (beepT <= 0) { beepT = every; sound.beep(b.p); o.blink = 0.08; }
    o.blink = (o.blink || 0) - dt;
    if (o.blink > 0) { o.led.material.color.setHex(0xff2020); o.light.intensity = 3; }
  }
}

// armas largadas no chão
const dropMeshes = new Map();
let drops = [];
function syncDrops(list) {
  drops = list;
  const seen = new Set();
  for (const d of list) {
    seen.add(d.id);
    if (dropMeshes.has(d.id)) continue;
    const w = buildWeaponModel(d.key);
    const holder = new THREE.Group();
    w.group.rotation.x = Math.PI / 2;            // deitada de lado no chão
    holder.add(w.group);
    holder.position.set(d.p[0], d.p[1] + 0.035, d.p[2]); holder.rotation.y = d.yaw;
    scene.add(holder); dropMeshes.set(d.id, holder);
  }
  for (const [id, mesh] of dropMeshes) if (!seen.has(id)) { scene.remove(mesh); dropMeshes.delete(id); }
}
function nearestDrop() {
  let best = null, bd = 2.3;
  for (const d of drops) {
    const dd = Math.hypot(d.p[0] - me.p[0], d.p[2] - me.p[2]) + Math.abs(d.p[1] - me.p[1]);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

const tmpV = new THREE.Vector3();
function onShot(m) {
  const dir = new THREE.Vector3(m.e[0] - m.o[0], m.e[1] - m.o[1], m.e[2] - m.o[2]);
  if (m.hp) remotes.hit(m.hp, dir, m.hs);
  if (m.id === me.id) { if (m.hp) fx.bloodHit(new THREE.Vector3(...m.e), dir, MAP.boxes, raycastWorld); return; }
  lastFiredAt.set(m.id, now());
  remotes.fired(m.id);
  if (!me.alive && m.id === spectate) vm.fire();
  const from = remotes.muzzleWorld(m.id, tmpV) ? tmpV.clone() : new THREE.Vector3(...m.o);
  const end = new THREE.Vector3(...m.e);
  if (WEAPONS[m.w] && !WEAPONS[m.w].melee) fx.tracer(from, end);
  if (m.n) fx.impact(end, m.n);
  if (m.hp) fx.bloodHit(end, dir, MAP.boxes, raycastWorld);
  sound.shot(m.w, [from.x, from.y, from.z]);
}

// ---------------------------------------------------------------- ações do jogador
function selectSlot(slot, silent = false) {
  if (!me.slots[slot]) return;
  if (slot !== me.cur) me.prevSlot = me.cur;
  me.cur = slot; me.reloadEnd = 0; me.scope = 0; me.spray = 0; me.ads = false;
  vm.setWeapon(curKey());
  if (!silent) { sound.draw(); me.nextFire = now() + 0.45; }
  send({ t: 'switch', slot });
}
function cycleSlot(dir) {
  const owned = [1, 2, 3, 4, 5].filter(s => me.slots[s]);
  const i = owned.indexOf(me.cur);
  selectSlot(owned[(i + dir + owned.length) % owned.length]);
}

function startReload() {
  const key = curKey(), W = WEAPONS[key], a = me.ammo[key];
  if (!key || W.melee || !a || a.mag >= W.mag || a.res <= 0 || me.reloadEnd || !me.alive) return;
  me.reloadEnd = now() + W.reload; me.scope = 0;   // mirar volta sozinho quando a recarga acabar
  vm.reload(W.reload); sound.reload(W.reload, ['glock', 'usp', 'deagle'].includes(key) ? 'pistol' : 'rifle');
  send({ t: 'reload' });
}

function currentSpread(W) {
  if (W.melee) return 0;
  let s = W.scope ? (me.scope ? W.spread : W.unscopedSpread) : W.spread;
  const hs = Math.hypot(me.v[0], me.v[2]);
  if (hs > PHYS.walkSpeed * 0.34) s += W.moveSpread * Math.min(1, hs / PHYS.walkSpeed);
  if (!me.onGround) s += W.jumpSpread;
  if (me.crouch) s *= 0.75;
  if (me.ads) s *= 0.5;
  return s;
}

function tryFire() {
  const key = curKey(), W = WEAPONS[key], t = now();
  if (!key || !me.alive || buyOpen || chatOpen || srv.phase === 'freeze' || srv.phase === 'waiting') return;
  if (!W.auto && !mouseClicked) return;
  mouseClicked = false;
  if (t < me.nextFire || me.reloadEnd) return;
  if (W.grenade) {        // granada: lança na direção da mira (um pouco para cima)
    send({ t: 'throw', d: dirFromAngles(me.yaw, me.pitch + 0.08) });
    vm.fire(); sound.throwNade(); me.nextFire = t + 1.0;
    return;
  }
  if (!W.melee) {
    const a = me.ammo[key];
    if (!a || a.mag <= 0) { sound.click(); me.nextFire = t + 0.2; if (a && a.res > 0) startReload(); return; }
  }
  const spread = currentSpread(W);
  const [up, side] = W.auto ? sprayOffset(key, me.spray) : [0, 0];
  const r = Math.random() * spread, ang = Math.random() * Math.PI * 2;
  const d = dirFromAngles(me.yaw + side + Math.cos(ang) * r, me.pitch + up + Math.sin(ang) * r);
  send({ t: 'shoot', d });
  me.spray++; me.lastShot = t; me.nextFire = t + fireInterval(key);
  vm.fire(); sound.shot(key);
  if (W.melee) return;
  me.ammo[key].mag--;
  if (W.projectile) {   // foguete/flecha: o servidor manda o projétil de volta e o voo aparece para todos
    me.punch += W.kick; me.pitch += W.kick * 0.4; me.shake = Math.min(1, me.shake + W.kick * 4);
    if (me.ammo[key].mag <= 0 && me.ammo[key].res > 0) setTimeout(() => { if (curKey() === key) startReload(); }, 350);
    return;
  }
  me.punch += W.auto ? W.kick * 0.6 : W.kick * 0.9;
  me.pitch += W.auto ? W.kick * 0.15 : W.kick * 0.3;
  // impacto previsto na hora (o servidor confirma acertos em jogadores)
  const eye = eyePos();
  const wr = raycastWorld(eye, d, W.range, MAP.boxes);
  let best = wr.t, hitPlayer = false;
  for (const rp of remotes.map.values()) {
    if (!rp.alive || rp.team === me.team) continue;
    const h = rayPlayer(eye, d, rp.p, rp.crouch);
    if (h.t < best) { best = h.t; hitPlayer = true; }
  }
  const end = new THREE.Vector3(eye[0] + d[0] * best, eye[1] + d[1] * best, eye[2] + d[2] * best);
  if (!hitPlayer && wr.normal && wr.t < W.range) fx.impact(end, wr.normal);
  if (!W.auto || me.spray % 3 === 1) fx.tracer(camera.localToWorld(new THREE.Vector3(0.1, -0.09, -0.55)), end);
  if (key === 'awp') me.scope = 0;
  if (W.kick > 0.03) me.shake = Math.min(1, me.shake + W.kick * 2);
}

// segurando F: plantar (TR com a bomba no bombsite) ou desarmar (CT perto da bomba)
function siteHere(p) {
  for (const [name, s] of Object.entries(MAP.sites)) if (p[0] >= s.min[0] && p[0] <= s.max[0] && p[2] >= s.min[1] && p[2] <= s.max[1]) return name;
  return '';
}
function bombAction() {
  const b = srv.bomb;
  if (!me.alive || !b) return '';
  if (b.st === 'carried' && b.c === me.id && siteHere(me.p) && me.onGround) return 'plant';
  if (b.st === 'planted' && me.team === 'CT' && Math.hypot(me.p[0] - b.p[0], me.p[2] - b.p[2]) < 1.7) return 'defuse';
  return '';
}

function nextSpectate() {
  const mates = srv.players.filter(p => p.team === me.team && p.a && p.id !== me.id);
  if (!mates.length) { spectate = 0; return; }
  const i = mates.findIndex(p => p.id === spectate);
  spectate = mates[(i + 1) % mates.length].id;
}

// ---------------------------------------------------------------- entrada
document.querySelectorAll('#menu .team').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#menu .team').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
}));
$('name').value = settings.name;
$('map').value = MAPS[settings.map] ? settings.map : 'bairro';
changeMap($('map').value);
$('map').addEventListener('change', () => { settings.map = $('map').value; saveSettings(); changeMap(settings.map); });
// modelos 3D das armas: o botão Jogar só libera depois de carregar
$('play').disabled = true; $('play').textContent = 'Carregando modelos 3D...';
Promise.all([loadGunModels(), loadArms()]).then(() => { $('play').disabled = false; $('play').textContent = 'Jogar'; });
$('play').addEventListener('click', () => {
  const name = $('name').value.trim() || 'Jogador';
  settings.name = name; saveSettings();
  const team = document.querySelector('#menu .team.sel').dataset.team;
  sound.unlock(); sound.ambient();
  lockPointer();
  connect(name, team);
});
$('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('play').click(); });

$('resume').addEventListener('click', () => { $('pause').classList.add('hidden'); sound.unlock(); lockPointer(); });
document.querySelectorAll('#pause [data-switch]').forEach(b => b.addEventListener('click', () => {
  send({ t: 'team', team: b.dataset.switch });
  $('pause').classList.add('hidden'); lockPointer();
}));
$('sens').value = settings.sens; $('sensv').textContent = settings.sens;
$('sens').addEventListener('input', () => { settings.sens = +$('sens').value; $('sensv').textContent = settings.sens.toFixed(2); saveSettings(); });
$('vol').value = settings.vol; $('volv').textContent = Math.round(settings.vol * 100) + '%';
$('vol').addEventListener('input', () => { settings.vol = +$('vol').value; sound.setVolume(settings.vol); $('volv').textContent = Math.round(settings.vol * 100) + '%'; saveSettings(); });
$('quality').checked = settings.quality;
$('quality').addEventListener('change', () => { settings.quality = $('quality').checked; saveSettings(); applyQuality(); });
// imagem: brilho mexe na exposição da câmera; contraste e saturação são filtro só no desenho 3D (o HUD não muda)
function applyImage() {
  // o Bairro usa céu fotográfico (ilumina menos que o céu calculado do Deserto): exposição base maior
  renderer.toneMappingExposure = (mapId === 'bairro' ? 0.8 : 0.62) * settings.bright;
  const filter = [settings.contrast !== 1 && `contrast(${settings.contrast})`, settings.satur !== 1 && `saturate(${settings.satur})`].filter(Boolean).join(' ');
  renderer.domElement.style.filter = filter;
}
const pct = (v) => Math.round(v * 100) + '%';
const optSliders = [
  ['bright', applyImage], ['contrast', applyImage], ['satur', applyImage],
  ...SOUND_GROUPS.map(k => ['vol_' + k, () => sound.setCategoryVolume(k, settings['vol_' + k])]),
];
const showOpts = () => {
  for (const [id, apply] of optSliders) { $(id).value = settings[id]; $(id + 'v').textContent = pct(settings[id]); apply(); }
  $('vol').value = settings.vol; $('volv').textContent = pct(settings.vol); sound.setVolume(settings.vol);
};
for (const [id, apply] of optSliders) $(id).addEventListener('input', () => { settings[id] = +$(id).value; $(id + 'v').textContent = pct(settings[id]); apply(); saveSettings(); });
$('resetopts').addEventListener('click', () => { Object.assign(settings, IMAGE_SOUND_DEFAULTS, { vol: 0.6 }); saveSettings(); showOpts(); });
showOpts();

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  if (!locked && playing && !chatOpen) {
    $('pause').classList.remove('hidden'); mouseDown = false; for (const k in keys) keys[k] = false;
    if (me.using) { me.using = false; send({ t: 'use', on: 0 }); }
  }
});
renderer.domElement.addEventListener('click', () => { if (playing && !locked) lockPointer(); });

document.addEventListener('mousemove', (e) => {
  if (!locked) return;
  const zoom = camera.fov / BASE_FOV;
  const k = 0.0022 * settings.sens * zoom;
  me.yaw -= e.movementX * k; me.pitch -= e.movementY * k;
  me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch));
  lookDX += e.movementX; lookDY += e.movementY;
});
document.addEventListener('mousedown', (e) => {
  if (!locked) return;
  if (e.button === 0) {
    if (!me.alive) { nextSpectate(); return; }
    mouseDown = true; mouseClicked = true;
  }
  if (e.button === 2 && me.alive) {
    if (curKey() === 'awp') { if (!me.reloadEnd) me.scope = (me.scope + 1) % 3; }
    else if (WEAPONS[curKey()] && !WEAPONS[curKey()].melee) me.ads = true;          // segurar o botão direito = mirar
  }
});
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; if (e.button === 2) me.ads = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => { if (locked && me.alive && !buyOpen) cycleSlot(e.deltaY > 0 ? 1 : -1); });

document.addEventListener('keydown', (e) => {
  if (!playing || chatOpen) return;
  if (['Tab', 'Space', 'ControlLeft', 'KeyB', 'KeyY'].includes(e.code)) e.preventDefault();
  if (e.repeat && e.code !== 'Tab') { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (e.code === 'Space') { if (me.alive) me.jumpQueued = true; else nextSpectate(); }
  if (e.code === 'Tab') boardOpen = true;
  if (!locked) return;
  if (e.code === 'KeyB' && me.alive) { buyOpen = !buyOpen; if (buyOpen && !srv.buy) { buyOpen = false; hud.notice('O tempo de compra acabou'); } }
  if (e.code === 'Escape' && buyOpen) buyOpen = false;
  if (/^(Digit[0-9]|Minus)$/.test(e.code)) {
    const n = e.code === 'Minus' ? '-' : e.code.slice(5);
    if (buyOpen) { const it = BUY_MENU.find(b => b.key === n); if (it) send({ t: 'buy', item: it.item }); }
    else if (me.alive && +n === 5 && me.cur === 5) send({ t: 'nextnade' });   // 5 de novo: próxima granada
    else if (me.alive && +n === 4 && me.cur === 4 && (me.bag4 || []).length) send({ t: 'next4' });   // 4 de novo: troca AWP/bazuca/arco
    else if (me.alive && +n >= 1 && +n <= 5) selectSlot(+n);
  }
  if (e.code === 'KeyR') startReload();
  if (e.code === 'KeyC' && me.alive) me.crouchToggle = !me.crouchToggle;
  if (e.code === 'KeyE' && me.alive) send({ t: 'pickup' });
  if (e.code === 'KeyG' && me.alive && me.cur !== 3 && me.cur !== 5) send({ t: 'drop' });
  if (e.code === 'KeyF' && me.alive && !me.using) { me.using = true; send({ t: 'use', on: 1 }); }
  if (e.code === 'KeyQ' && me.alive) selectSlot(me.slots[me.prevSlot] ? me.prevSlot : (me.cur === 3 ? 2 : 3));
  if (e.code === 'KeyY') {
    chatOpen = true; for (const k in keys) keys[k] = false;
    $('chatin').classList.remove('hidden'); $('chatin').value = ''; setTimeout(() => $('chatin').focus(), 0);
  }
});
document.addEventListener('keyup', (e) => {
  keys[e.code] = false; if (e.code === 'Tab') boardOpen = false;
  if (e.code === 'KeyF' && me.using) { me.using = false; send({ t: 'use', on: 0 }); }
});
$('chatin').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter' || e.key === 'Escape') {
    if (e.key === 'Enter' && $('chatin').value.trim()) send({ t: 'chat', text: $('chatin').value.trim() });
    $('chatin').blur(); $('chatin').classList.add('hidden'); chatOpen = false;
    if (!document.pointerLockElement) lockPointer();
  }
});

// ---------------------------------------------------------------- movimento
function updateMovement(dt) {
  const frozen = srv.phase === 'freeze' || chatOpen || !me.alive || (me.using && bombAction());
  const key = curKey(), W = WEAPONS[key];
  // agachar
  // C liga/desliga o agachar (não precisa segurar); Ctrl continua valendo enquanto estiver apertado
  const wantCrouch = !frozen && (keys.ControlLeft || me.crouchToggle);
  if (wantCrouch) me.crouch = true;
  else if (me.crouch && canStand(me.p, MAP.boxes)) me.crouch = false;

  let wx = 0, wz = 0;
  if (!frozen) {
    const fx_ = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
    if (keys.KeyW) { wx += fx_; wz += fz; }
    if (keys.KeyS) { wx -= fx_; wz -= fz; }
    if (keys.KeyD) { wx += rx; wz += rz; }
    if (keys.KeyA) { wx -= rx; wz -= rz; }
    const l = Math.hypot(wx, wz); if (l > 0) { wx /= l; wz /= l; }
  }
  // segurando Shift corre (não dá para correr agachado nem mirando)
  me.sprint = !!(keys.ShiftLeft || keys.ShiftRight) && !me.crouch && !me.scope && !me.ads && (wx || wz);
  let maxSpeed = (me.sprint ? PHYS.sprintSpeed : PHYS.walkSpeed) * (W ? W.speed : 1);
  if (me.scope || me.ads) maxSpeed *= 0.6;
  if (me.crouch) maxSpeed *= PHYS.crouchMul;

  const v = me.v;
  if (me.onGround) {
    const sp = Math.hypot(v[0], v[2]);
    if (sp > 0) { const drop = Math.max(sp, 1.2) * PHYS.friction * dt; const ns = Math.max(0, sp - drop) / sp; v[0] *= ns; v[2] *= ns; }
  }
  const curSp = v[0] * wx + v[2] * wz;
  const add = maxSpeed - curSp;
  if (add > 0 && (wx || wz)) {
    const acc = Math.min(add, (me.onGround ? PHYS.accel : PHYS.airAccel) * dt * (me.onGround ? 1 : maxSpeed / 2));
    v[0] += wx * acc; v[2] += wz * acc;
  }
  if (me.jumpQueued && me.onGround && !frozen) { v[1] = PHYS.jumpV; me.onGround = false; }
  me.jumpQueued = false;
  if (frozen && me.onGround) { v[0] = 0; v[2] = 0; }
  v[1] -= PHYS.gravity * dt;
  const fallV = v[1];
  const wasGround = me.onGround;
  me.onGround = moveBody(me.p, v, dt, bodyHeight(me.crouch), MAP.boxes);
  if (me.onGround && !wasGround && fallV < -5) sound.land();
  // passos
  const hs = Math.hypot(v[0], v[2]);
  if (me.onGround && hs > 3.0 && !me.crouch) {
    me.stepT -= dt; if (me.stepT <= 0) { sound.step(null, me.sprint ? 0.16 : 0.12); me.stepT = me.sprint ? 0.26 : 0.34; }
  }
  me.eyeH += (eyeHeight(me.crouch) - me.eyeH) * Math.min(1, dt * 12);
}

// ---------------------------------------------------------------- loop principal
let sendT = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = now();

  if (playing) {
    if (me.alive) {
      updateMovement(dt);
      if (mouseDown || mouseClicked) tryFire();
      if (me.reloadEnd && t >= me.reloadEnd) {
        const key = curKey(), W = WEAPONS[key], a = me.ammo[key];
        if (a) { const take = Math.min(W.mag - a.mag, a.res); a.mag += take; a.res -= take; }
        me.reloadEnd = 0;
      }
      const W = WEAPONS[curKey()];
      if (W && W.auto && t - me.lastShot > fireInterval(curKey()) * 1.8 + 0.05) me.spray = Math.max(0, me.spray - dt * 25);
    }
    me.punch *= Math.exp(-dt * 7);
    me.shake = Math.max(0, me.shake - dt * 2.2);
    me.flash = Math.max(0, me.flash - dt);
    updateNades(dt); updateProjs(dt);
    updateBomb(dt);

    sendT -= dt;
    if (sendT <= 0) { sendT = 1 / 30; send({ t: 'pos', p: me.p.map(v => +v.toFixed(3)), yaw: +me.yaw.toFixed(4), pitch: +me.pitch.toFixed(4), c: me.crouch ? 1 : 0, slot: me.cur }); }

    // câmera: própria visão ou espectador
    if (me.alive) {
      camera.position.set(me.p[0], me.p[1] + me.eyeH, me.p[2]);
      camera.rotation.set(me.pitch + me.punch, me.yaw, 0);
    } else {
      const r = spectate && remotes.get(spectate);
      if (r && r.alive) {
        camera.position.set(r.p[0], r.p[1] + eyeHeight(r.crouch), r.p[2]);
        camera.rotation.set(r.pitch, r.yaw, 0);
        if (r.w && vm.key !== r.w) vm.setWeapon(r.w, true);
      } else {
        if (spectate) nextSpectate();
        camera.position.set(me.p[0], me.p[1] + 4, me.p[2] + 3);
        camera.rotation.set(-0.7, me.yaw, 0);
      }
    }
    if (me.shake > 0.01) {      // tremor de câmera (explosão, dano, coice forte)
      const a = me.shake * me.shake * 0.035, tt = t * 47;
      camera.rotation.x += Math.sin(tt) * a; camera.rotation.y += Math.sin(tt * 1.37 + 1) * a; camera.rotation.z += Math.sin(tt * 0.83 + 2) * a * 0.6;
    }
    const adsFov = WEAPONS[curKey()]?.slot === 2 ? 62 : 54;
    const targetFov = me.scope === 1 ? 40 : me.scope === 2 ? 15 : me.ads && me.alive && !me.reloadEnd ? adsFov : BASE_FOV;
    if (Math.abs(camera.fov - targetFov) > 0.01) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 20); camera.updateProjectionMatrix(); }

    // radar: inimigos à vista
    spotT -= dt;
    if (spotT <= 0) {
      spotT = 0.15; spotted.clear();
      const eye = [camera.position.x, camera.position.y, camera.position.z];
      for (const r of remotes.map.values()) {
        if (!r.alive || r.team === me.team) continue;
        if ((lastFiredAt.get(r.id) || 0) > t - 1.5) { spotted.add(r.id); continue; }
        if (me.alive && lineOfSight(eye, [r.p[0], r.p[1] + 1.2, r.p[2]], MAP.boxes)) spotted.add(r.id);
        else for (const mate of srv.players) {
          if (!mate.a || mate.team !== me.team || mate.id === me.id) continue;
          if (lineOfSight([mate.p[0], mate.p[1] + 1.6, mate.p[2]], [r.p[0], r.p[1] + 1.2, r.p[2]], MAP.boxes)) { spotted.add(r.id); break; }
        }
      }
    }
    // passos dos outros jogadores
    for (const r of remotes.map.values()) {
      if (!r.alive || r.s < 3.2) continue;
      r.stepT = (r.stepT || 0) - dt;
      if (r.stepT <= 0) { r.stepT = 0.38; if (Math.hypot(r.p[0] - me.p[0], r.p[2] - me.p[2]) < 35) sound.step([r.p[0], r.p[1], r.p[2]], 0.3); }
    }

    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    sound.setListener(camera.position, fwd);

    // HUD
    hud.update(me, srv, srv.players, dt);
    const W = WEAPONS[curKey()];
    const gap = 4 + (W && !W.melee ? currentSpread(W) * 260 : 0) + Math.min(me.spray, 8) * 1.5;
    hud.crosshair(gap, me.alive && !me.scope && !me.ads && !(W && W.scope));
    hud.scope(me.alive && me.scope > 0);
    hud.flash(Math.min(1, me.flash));
    hud.bomb(srv.bomb, me, bombAction(), me.using);
    hud.buyMenu(buyOpen && srv.buy && me.alive, me);
    if (buyOpen && !srv.buy) buyOpen = false;
    hud.board(boardOpen, srv.players, me.id, srv.score);
    const nd = me.alive ? nearestDrop() : null;
    const ba = bombAction();
    hud.pickHint(ba && !me.using ? `<b>F</b> segure para ${ba === 'plant' ? 'plantar a bomba' : 'desarmar a bomba'}` : nd ? `<b>E</b> pegar ${WEAPONS[nd.key].name}${me.slots[WEAPONS[nd.key].slot] ? ' (troca pela sua)' : ''}` : '');
    const vp = me.alive ? me.p : [camera.position.x, 0, camera.position.z];
    const vy = me.alive ? me.yaw : camera.rotation.y;
    hud.drawRadar(me, vp, vy, srv.players, spotted, srv.bomb);
    if (!me.alive && deathText) {
      const r = spectate && playerById(spectate);
      const html = deathText + (r ? `<br><small>Assistindo: <b>${escapeHtml(r.name)}</b> · clique ou Espaço para trocar</small>` : '<br><small>Aguardando o próximo round</small>');
      if (html !== lastDeathHtml) { lastDeathHtml = html; hud.death(html); }
    }
  }

  remotes.update(dt);
  fx.update(dt);
  const hs = Math.hypot(me.v[0], me.v[2]);
  const specR = !me.alive && spectate ? remotes.get(spectate) : null;
  remotes.hidden = specR ? specR.id : 0;
  if (vm.cur && vm.cur.projectile) {   // foguete/flecha aparece na arma quando carregada (e no fim da recarga)
    const k = curKey(), a = me.ammo[k], Wk = WEAPONS[k];
    vm.cur.loaded = !!(a && Wk) && (me.reloadEnd ? now() > me.reloadEnd - Wk.reload * 0.4 : a.mag > 0);
  }
  if (specR) vm.update(dt, { speed: specR.s, onGround: true, vy: 0, crouch: specR.crouch, lookDX: 0, lookDY: 0, visible: playing && specR.alive });
  else vm.update(dt, { speed: hs, onGround: me.onGround, vy: me.v[1], crouch: me.crouch, lookDX, lookDY, visible: playing && me.alive && me.scope === 0, firing: me.alive && (mouseDown || now() - me.lastShot < 0.35), ads: me.ads && me.alive, sprint: me.alive && me.sprint && me.onGround && hs > PHYS.walkSpeed * 0.9 });
  lookDX = 0; lookDY = 0;

  renderer.clear();
  if (settings.quality) post.render(); else renderer.render(scene, camera);
  renderer.clearDepth();
  vm.render(renderer, camera);
  requestAnimationFrame(frame);
}

// câmera do menu: passeio lento pelo mapa
camera.position.set(-33, 2.2, 28); camera.rotation.set(-0.05, 0.1, 0);
requestAnimationFrame(frame);
window.__game = { me, srv, remotes, camera, vm, sound, fx, changeMap, debug: { fire: () => { mouseClicked = true; tryFire(); }, selectSlot, send, startReload, keys } };
