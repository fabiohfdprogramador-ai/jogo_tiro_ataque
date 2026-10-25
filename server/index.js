// Servidor do jogo: arquivos do cliente (HTTP) + partida online (WebSocket) + bots.
// O servidor decide tudo: tiros, dano, rounds, economia, bomba e granadas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MAP, MAPS, useMap } from '../shared/map.js';
import { PHYS, NADE, PROJ, stepProj, moveBody, raycastWorld, rayPlayer, lineOfSight, dirFromAngles, eyeHeight, bodyHeight, stepNade, smokeBlocks, flashAmount } from '../shared/physics.js';
import { WEAPONS, ITEMS, NADES, MAX_HP, BOMB, computeDamage, fireInterval, defaultPistol } from '../shared/weapons.js';

const PORT = Number(process.env.PORT || 3000);
const BOT_TEAM_SIZE = process.env.BOTS !== undefined ? Number(process.env.BOTS) : 4;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEBUG = !!process.env.DEBUG;

const CFG = {
  freeze: 5, roundTime: 115, buyTime: 20, endTime: 5, matchOverTime: 10, winRounds: 13,
  startMoney: Number(process.env.START_MONEY || 800), maxMoney: 16000, winMoney: 3250, lossBase: 1400, lossStep: 500, lossMax: 3400,
};

// ---------------------------------------------------------------- HTTP
const MIME = { '.hdr': 'application/octet-stream', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };
const ROUTES = [
  ['/vendor/three/', path.join(ROOT, 'node_modules', 'three')],
  ['/shared/', path.join(ROOT, 'shared')],
  ['/', path.join(ROOT, 'client')],
];

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/') urlPath = '/index.html';
  for (const [prefix, base] of ROUTES) {
    if (!urlPath.startsWith(prefix)) continue;
    const file = path.resolve(base, '.' + urlPath.slice(prefix.length - 1));
    if (!file.startsWith(base)) break;
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Não encontrado'); return; }
      // texturas e céu são pesados e não mudam: o navegador guarda por um dia
      const cache = urlPath.startsWith('/tex/') ? 'public, max-age=86400' : 'no-cache';
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': cache });
      res.end(data);
    });
    return;
  }
  res.writeHead(404); res.end('Não encontrado');
});

// ---------------------------------------------------------------- estado do jogo
const players = new Map();
let nextId = 1;
const game = { phase: 'waiting', timer: 0, round: 0, score: { T: 0, CT: 0 }, lossStreak: { T: 0, CT: 0 }, plan: 'A', go: false };
const now = () => performance.now() / 1000;
const BOT_NAMES = ['Zé', 'Leo', 'Bia', 'Caio', 'Duda', 'Rafa', 'Nina', 'Tito', 'Gabi', 'Juca', 'Lia', 'Beto'];

// mapa em uso (o primeiro jogador escolhe no menu; com o servidor vazio dá para trocar)
let mapId = MAPS[process.env.MAP] ? process.env.MAP : 'bairro';
let NODE_IDS = [], ADJ = {};
function loadMap(id) {
  mapId = MAPS[id] ? id : 'bairro';
  useMap(mapId);
  NODE_IDS = Object.keys(MAP.nodes);
  ADJ = Object.fromEntries(NODE_IDS.map(n => [n, []]));
  for (const [a, b] of MAP.links) { ADJ[a].push(b); ADJ[b].push(a); }
}
loadMap(mapId);

function newPlayer(name, team, isBot, ws = null) {
  const pl = {
    id: nextId++, name, team, isBot, ws,
    p: [0, 0, 0], v: [0, 0, 0], yaw: 0, pitch: 0, crouch: false, speed: 0,
    hp: MAX_HP, armor: 0, helmet: false, alive: false, money: CFG.startMoney,
    slots: { 1: null, 2: defaultPistol(team), 3: 'knife', 4: null, 5: null }, bag4: [], nades: {}, cur: 2, ammo: {},
    kills: 0, deaths: 0, lastShot: 0, reloadEnd: 0, reloadKey: null, lostGear: true, lastPosT: now(), using: false,
    bot: isBot ? { path: [], target: null, react: 0, nextShot: 0, burst: 0, strafe: 1, strafeT: 0, stuckT: 0, lastP: [0, 0, 0], alert: null, alertUntil: 0, goals: [], pushAt: 0, blind: 0, obj: null, objT: 0, nadeT: 0, staging: null } : null,
  };
  giveWeapon(pl, pl.slots[2]);
  return pl;
}
const humans = () => [...players.values()].filter(p => !p.isBot);
const teamPlayers = (team) => [...players.values()].filter(p => p.team === team);

function giveWeapon(pl, key) {
  const W = WEAPONS[key];
  pl.slots[W.slot] = key;
  if (!W.melee) pl.ammo[key] = { mag: W.mag, res: W.reserve };
}
function nextNade(pl) { pl.slots[5] = NADES.find(k => (pl.nades[k] || 0) > 0) || null; }

function send(pl, msg) { if (pl.ws && pl.ws.readyState === 1) pl.ws.send(JSON.stringify(msg)); }
function broadcast(msg) { const s = JSON.stringify(msg); for (const pl of players.values()) if (pl.ws && pl.ws.readyState === 1) pl.ws.send(s); }

function rebalanceBots() {
  for (const team of ['T', 'CT']) {
    const h = teamPlayers(team).filter(p => !p.isBot).length;
    const bots = teamPlayers(team).filter(p => p.isBot);
    const want = Math.max(0, BOT_TEAM_SIZE - h);
    while (bots.length > want) players.delete(bots.pop().id);
    while (bots.length < want) {
      const used = new Set([...players.values()].map(p => p.name));
      const name = 'BOT ' + (BOT_NAMES.find(n => !used.has('BOT ' + n)) || nextId);
      const b = newPlayer(name, team, true);
      players.set(b.id, b); bots.push(b);
    }
  }
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

function spawnPlayer(pl, spot) {
  if (pl.lostGear) {
    // todo mundo começa com faca, pistola, fuzil, AWP (tecla 4) e uma granada de cada
    pl.slots = { 1: null, 2: defaultPistol(pl.team), 3: 'knife', 4: null, 5: null }; pl.bag4 = []; pl.ammo = {};
    giveWeapon(pl, pl.slots[2]);
    giveWeapon(pl, pl.team === 'T' ? 'ak47' : 'm4a4');
    giveWeapon(pl, 'awp');
    pl.nades = { he: 1, flash: 1, smoke: 1 };
    pl.armor = 0; pl.helmet = false; pl.lostGear = false;
  }
  nextNade(pl);
  for (const key of [...Object.values(pl.slots), ...pl.bag4]) if (key && !WEAPONS[key].melee) pl.ammo[key] = { mag: WEAPONS[key].mag, res: WEAPONS[key].reserve };
  pl.cur = pl.slots[1] ? 1 : 2;
  pl.hp = MAX_HP; pl.alive = true; pl.crouch = false; pl.reloadEnd = 0; pl.using = false;
  pl.p = [spot[0], 0, spot[1]]; pl.v = [0, 0, 0];
  pl.yaw = pl.team === 'T' ? 0 : Math.PI; pl.pitch = 0;
  pl.lastPosT = now();
  send(pl, { t: 'spawn', p: pl.p, yaw: pl.yaw });
}

function startRound() {
  game.phase = 'freeze'; game.timer = CFG.freeze; game.round++;
  drops.length = 0; nades.length = 0; smokes.length = 0; projs.length = 0;
  rebalanceBots();
  for (const team of ['T', 'CT']) {
    const spots = shuffle([...MAP.spawns[team]]);
    teamPlayers(team).forEach((pl, i) => spawnPlayer(pl, spots[i % spots.length]));
  }
  game.plan = Math.random() < 0.5 ? 'A' : 'B'; game.go = false;
  for (const b of players.values()) if (b.isBot) botBuyAndPlan(b);
  bombRoundStart();
  broadcast({ t: 'round', phase: 'freeze', round: game.round, score: game.score, map: mapId });
}

function resetMatch() {
  game.round = 0; game.score = { T: 0, CT: 0 }; game.lossStreak = { T: 0, CT: 0 };
  for (const pl of players.values()) { pl.money = CFG.startMoney; pl.kills = 0; pl.deaths = 0; pl.lostGear = true; }
}

function endRound(winner, msg) {
  if (game.phase !== 'live') return;
  const loser = winner === 'T' ? 'CT' : 'T';
  game.score[winner]++;
  for (const pl of teamPlayers(winner)) pl.money = Math.min(CFG.maxMoney, pl.money + CFG.winMoney);
  const lossMoney = Math.min(CFG.lossMax, CFG.lossBase + CFG.lossStep * game.lossStreak[loser]);
  for (const pl of teamPlayers(loser)) pl.money = Math.min(CFG.maxMoney, pl.money + lossMoney);
  game.lossStreak[loser]++; game.lossStreak[winner] = 0;
  if (DEBUG) console.log(`[round ${game.round}] ${msg} (TR ${game.score.T} x ${game.score.CT} CT)`);
  if (game.score[winner] >= CFG.winRounds) {
    game.phase = 'matchover'; game.timer = CFG.matchOverTime;
    broadcast({ t: 'round', phase: 'matchover', winner, msg: (winner === 'T' ? 'Terroristas' : 'Contra-Terroristas') + ' venceram a partida!', score: game.score });
  } else {
    game.phase = 'end'; game.timer = CFG.endTime;
    broadcast({ t: 'round', phase: 'end', winner, msg, score: game.score });
  }
}

function checkRoundEnd() {
  if (game.phase !== 'live') return;
  const aliveT = teamPlayers('T').filter(p => p.alive).length;
  const aliveCT = teamPlayers('CT').filter(p => p.alive).length;
  // com a bomba plantada, o CT ainda precisa desarmar
  if (aliveT === 0 && teamPlayers('T').length && bomb.state !== 'planted') endRound('CT', 'Contra-Terroristas venceram!');
  else if (aliveCT === 0 && teamPlayers('CT').length) endRound('T', 'Terroristas venceram!');
}

const canBuyNow = () => game.phase === 'freeze' || (game.phase === 'live' && CFG.roundTime - game.timer <= CFG.buyTime);

function buy(pl, item) {
  const deny = (text) => send(pl, { t: 'msg', text });
  if (!pl.alive) return deny('Você precisa estar vivo para comprar');
  if (!canBuyNow()) return deny('O tempo de compra acabou');
  const W = WEAPONS[item];
  if (W && W.grenade) {
    if ((pl.nades[item] || 0) >= 1) return deny('Você já tem essa granada');
    if (pl.money < W.price) return deny('Dinheiro insuficiente');
    pl.money -= W.price; pl.nades[item] = 1; if (!pl.slots[5]) pl.slots[5] = item;
  } else if (W) {
    if (W.team && W.team !== pl.team) return deny('Essa arma é do outro time');
    if (pl.slots[W.slot] === item || (W.slot === 4 && pl.bag4.includes(item))) return deny('Você já tem essa arma');
    if (pl.money < W.price) return deny('Dinheiro insuficiente');
    pl.money -= W.price;
    // tecla 4 guarda AWP, bazuca e arco juntas (apertar 4 de novo troca); nas outras, a nova substitui a antiga
    if (W.slot === 4 && pl.slots[4]) pl.bag4.push(pl.slots[4]);
    else if (pl.slots[W.slot]) dropWeapon(pl, W.slot);
    giveWeapon(pl, item); pl.cur = W.slot; pl.reloadEnd = 0;
  } else if (item === 'kevlar') {
    if (pl.armor >= 100) return deny('Você já tem colete');
    if (pl.money < ITEMS.kevlar.price) return deny('Dinheiro insuficiente');
    pl.money -= ITEMS.kevlar.price; pl.armor = 100;
  } else if (item === 'helmet') {
    if (pl.armor >= 100 && pl.helmet) return deny('Você já tem colete e capacete');
    const price = pl.armor >= 100 ? 350 : ITEMS.helmet.price;
    if (pl.money < price) return deny('Dinheiro insuficiente');
    pl.money -= price; pl.armor = 100; pl.helmet = true;
  } else return;
  send(pl, { t: 'bought', item });
}

function startReload(pl) {
  const key = pl.slots[pl.cur]; if (!key) return;
  const W = WEAPONS[key], a = pl.ammo[key];
  if (W.melee || !a || a.mag >= W.mag || a.res <= 0 || pl.reloadEnd) return;
  pl.reloadEnd = now() + W.reload; pl.reloadKey = key;
}

function fireShot(pl, o, d, key) {
  const W = WEAPONS[key], t = now();
  if (!pl.alive || !key || game.phase === 'freeze' || game.phase === 'waiting') return false;
  if (W.grenade) return false;
  if (t - pl.lastShot < fireInterval(key) * 0.7) return false;
  if (!W.melee) {
    const a = pl.ammo[key];
    if (!a || a.mag <= 0 || pl.reloadEnd) return false;
    a.mag--;
  }
  pl.lastShot = t;
  if (W.projectile) { launchProj(pl, o, d, W.projectile, key); return true; }
  const wr = raycastWorld(o, d, W.range, MAP.boxes);
  let best = wr.t, hit = null;
  for (const q of players.values()) {
    if (q === pl || !q.alive || q.team === pl.team) continue;
    const r = rayPlayer(o, d, q.p, q.crouch);
    if (r.t < best) { best = r.t; hit = { q, zone: r.zone }; }
  }
  const e = [o[0] + d[0] * best, o[1] + d[1] * best, o[2] + d[2] * best].map(v => +v.toFixed(3));
  const worldHit = !hit && wr.t < W.range;
  broadcast({ t: 'shot', id: pl.id, w: key, o: o.map(v => +v.toFixed(3)), e, hp: hit ? hit.q.id : 0, n: worldHit ? wr.normal : null, hs: hit && hit.zone === 'head' ? 1 : 0 });
  if (hit) applyDamage(pl, hit.q, key, hit.zone, best);
  return true;
}

function applyDamage(att, vic, key, zone, dist) {
  const r = computeDamage(key, zone, dist, vic);
  vic.hp -= r.hp;
  vic.armor = Math.max(0, vic.armor - r.armor);
  if (vic.armor === 0) vic.helmet = false;
  send(vic, { t: 'hurt', from: att.p, dmg: r.hp });
  send(att, { t: 'hitmark', hs: zone === 'head' ? 1 : 0, kill: vic.hp <= 0 ? 1 : 0 });
  if (vic.bot) { vic.bot.alert = [...att.p]; vic.bot.alertUntil = now() + 2.5; }
  if (vic.hp <= 0) kill(att, vic, key, zone === 'head');
}

// dano de explosão (bomba, granada): o colete segura parte
function rawDamage(att, vic, dmg, key) {
  if (!vic.alive || dmg < 1) return;
  let hp = dmg;
  if (vic.armor > 0) { hp = dmg * 0.57; vic.armor = Math.max(0, vic.armor - Math.round(dmg * 0.3)); }
  vic.hp -= Math.round(hp);
  send(vic, { t: 'hurt', from: att.p, dmg: Math.round(hp) });
  if (vic.hp <= 0) kill(att, vic, key, false);
}

function kill(att, vic, key, hs) {
  vic.hp = 0; vic.alive = false; vic.deaths++; vic.lostGear = true; vic.reloadEnd = 0; vic.using = false;
  dropWeapon(vic, vic.slots[1] ? 1 : vic.slots[4] ? 4 : 2);            // a arma fica no chão para quem quiser pegar
  bombOnDeath(vic);
  if (att !== vic && att.team !== vic.team) {
    att.kills++;
    att.money = Math.min(CFG.maxMoney, att.money + (WEAPONS[key] ? WEAPONS[key].reward : 300));
  }
  broadcast({ t: 'kill', killer: att.id, victim: vic.id, w: key, hs: hs ? 1 : 0 });
  if (DEBUG) console.log(`[abate] ${att.name} matou ${vic.name} com ${key}`);
  checkRoundEnd();
}

// ---------------------------------------------------------------- armas no chão
const drops = [];
let nextDropId = 1;
function dropWeapon(pl, slot, thrown = false) {
  const key = pl.slots[slot];
  if (!key || slot === 3 || slot === 5) return;
  const a = pl.ammo[key] || { mag: 0, res: 0 };
  const fwd = dirFromAngles(pl.yaw, 0), dist = thrown ? 1.4 : 0.3;
  const p = [pl.p[0] + fwd[0] * dist + (Math.random() - 0.5) * 0.4, pl.p[1], pl.p[2] + fwd[2] * dist + (Math.random() - 0.5) * 0.4];
  drops.push({ id: nextDropId++, key, p: p.map(v => +v.toFixed(2)), yaw: +(Math.random() * 6.28).toFixed(2), mag: a.mag, res: a.res, blockId: pl.id, blockUntil: now() + 1.5 });
  if (drops.length > 30) drops.shift();
  pl.slots[slot] = null; delete pl.ammo[key];
  if (pl.reloadKey === key) pl.reloadEnd = 0;
  if (slot === 4 && pl.bag4.length) pl.slots[4] = pl.bag4.shift();   // a próxima arma guardada vem para a mão
}
function takeDrop(pl, d) {
  const slot = WEAPONS[d.key].slot;
  const owned = pl.slots[slot] === d.key || pl.bag4.includes(d.key);
  if (slot === 4 && pl.slots[4] && !owned) pl.bag4.push(pl.slots[4]);   // tecla 4: guarda a atual junto
  else if (pl.slots[slot]) dropWeapon(pl, slot);       // troca: larga a que estava na mão
  if (slot === 4 && owned) pl.bag4 = pl.bag4.filter(k => k !== d.key);
  drops.splice(drops.indexOf(d), 1);
  pl.slots[slot] = d.key; pl.ammo[d.key] = { mag: d.mag, res: d.res };
  pl.cur = slot; pl.reloadEnd = 0;
  send(pl, { t: 'picked', key: d.key, slot });
}
const dropDist = (pl, d) => Math.hypot(d.p[0] - pl.p[0], d.p[2] - pl.p[2]) + Math.abs(d.p[1] - pl.p[1]);
function autoPickup(pl, t) {   // passa por cima de uma arma e o espaço está vazio: pega sozinho
  for (const d of drops) {
    if (pl.slots[WEAPONS[d.key].slot] || (d.blockId === pl.id && t < d.blockUntil)) continue;
    if (dropDist(pl, d) < 1.0) { takeDrop(pl, d); return; }
  }
}
function manualPickup(pl) {    // tecla E: pega a arma mais próxima (trocando, se precisar)
  let best = null, bd = 2.3;
  for (const d of drops) { const dd = dropDist(pl, d); if (dd < bd) { bd = dd; best = d; } }
  if (best) takeDrop(pl, best);
}

// ---------------------------------------------------------------- bomba
const bomb = { state: 'none', carrier: 0, p: [0, 0, 0], site: '', timer: 0, plant: 0, defuse: 0, planter: 0, defuser: 0, plantStart: null, defuseStart: null };
function siteAt(p) {
  for (const [name, s] of Object.entries(MAP.sites)) if (p[0] >= s.min[0] && p[0] <= s.max[0] && p[2] >= s.min[1] && p[2] <= s.max[1]) return name;
  return '';
}
function bombRoundStart() {
  Object.assign(bomb, { state: 'none', carrier: 0, site: '', timer: 0, plant: 0, defuse: 0, planter: 0, defuser: 0 });
  const ts = teamPlayers('T').filter(p => p.alive);
  if (!ts.length) return;
  const hs = ts.filter(p => !p.isBot);
  const c = (hs.length ? hs : ts)[(Math.random() * (hs.length || ts.length)) | 0];
  bomb.state = 'carried'; bomb.carrier = c.id; bomb.p = [...c.p];
  send(c, { t: 'bomb', ev: 'given' });
}
function bombOnDeath(pl) {
  if (bomb.state === 'carried' && bomb.carrier === pl.id) {
    bomb.state = 'dropped'; bomb.carrier = 0; bomb.plant = 0;
    bomb.p = [pl.p[0], pl.p[1] + 0.05, pl.p[2]];
    for (const q of teamPlayers('T')) send(q, { t: 'bomb', ev: 'dropped' });
  }
}
function bombTick(dt) {
  if (game.phase !== 'live') { bomb.plant = 0; bomb.defuse = 0; return; }
  if (bomb.state === 'carried') {
    const c = players.get(bomb.carrier);
    if (!c || !c.alive) { if (c) bombOnDeath(c); else bomb.state = 'dropped'; return; }
    bomb.p = [...c.p];
    if (c.using && siteAt(c.p) && c.p[1] < 0.05) {
      if (!bomb.plant) bomb.plantStart = [...c.p];
      if (Math.hypot(c.p[0] - bomb.plantStart[0], c.p[2] - bomb.plantStart[2]) > 0.45) bomb.plant = 0;
      else {
        bomb.plant += dt / BOMB.plant;
        if (bomb.plant >= 1) {
          bomb.state = 'planted'; bomb.carrier = 0; bomb.plant = 0; bomb.planter = c.id;
          bomb.p = [c.p[0], c.p[1] + 0.02, c.p[2]]; bomb.site = siteAt(c.p); bomb.timer = BOMB.timer;
          game.timer = BOMB.timer;   // o relógio do round vira a contagem da bomba
          for (const q of teamPlayers('T')) q.money = Math.min(CFG.maxMoney, q.money + BOMB.plantReward);
          broadcast({ t: 'bomb', ev: 'planted', site: bomb.site });
          if (DEBUG) console.log(`[bomba] ${c.name} plantou no bombsite ${bomb.site}`);
        }
      }
    } else bomb.plant = 0;
  } else if (bomb.state === 'dropped') {
    for (const q of teamPlayers('T')) {
      if (q.alive && Math.hypot(q.p[0] - bomb.p[0], q.p[2] - bomb.p[2]) < 1.3) {
        bomb.state = 'carried'; bomb.carrier = q.id; send(q, { t: 'bomb', ev: 'picked' }); break;
      }
    }
  } else if (bomb.state === 'planted') {
    bomb.timer -= dt;
    let d = null;
    for (const q of teamPlayers('CT')) {
      if (q.alive && q.using && Math.hypot(q.p[0] - bomb.p[0], q.p[2] - bomb.p[2]) < 1.7 && (!d || q.id === bomb.defuser)) d = q;
    }
    if (d) {
      if (d.id !== bomb.defuser) { bomb.defuser = d.id; bomb.defuse = 0; bomb.defuseStart = [...d.p]; }
      if (Math.hypot(d.p[0] - bomb.defuseStart[0], d.p[2] - bomb.defuseStart[2]) > 0.45) { bomb.defuse = 0; bomb.defuseStart = [...d.p]; }
      bomb.defuse += dt / BOMB.defuse;
      if (bomb.defuse >= 1) {
        bomb.state = 'defused'; bomb.defuse = 0;
        d.money = Math.min(CFG.maxMoney, d.money + BOMB.defuseReward);
        broadcast({ t: 'bomb', ev: 'defused' });
        endRound('CT', 'Bomba desarmada — Contra-Terroristas venceram!');
        return;
      }
    } else { bomb.defuse = 0; bomb.defuser = 0; }
    if (bomb.timer <= 0) {
      bomb.state = 'exploded';
      broadcast({ t: 'bomb', ev: 'exploded', p: bomb.p });
      endRound('T', 'A bomba explodiu — Terroristas venceram!');
      const att = players.get(bomb.planter);
      for (const q of players.values()) {
        if (!q.alive) continue;
        const dd = Math.hypot(q.p[0] - bomb.p[0], q.p[1] - bomb.p[1], q.p[2] - bomb.p[2]);
        if (dd < BOMB.radius) { const k = 1 - dd / BOMB.radius; rawDamage(att || q, q, BOMB.damage * k * k, 'c4'); }
      }
    }
  }
}
const bombPub = () => ({ st: bomb.state, c: bomb.carrier, p: bomb.p.map(v => +v.toFixed(2)), s: bomb.site, tm: +bomb.timer.toFixed(2), pl: +bomb.plant.toFixed(2), df: +bomb.defuse.toFixed(2), dr: bomb.defuser });

// ---------------------------------------------------------------- granadas
const nades = [], smokes = [];
let nextNadeId = 1;
function throwNade(pl, o, d) {
  const kind = pl.slots[5];
  if (!kind || !(pl.nades[kind] > 0) || !pl.alive || game.phase === 'freeze' || game.phase === 'waiting') return;
  pl.nades[kind]--;
  const eye = [pl.p[0], pl.p[1] + eyeHeight(pl.crouch), pl.p[2]];
  if (Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) > 1.5) o = eye;
  const p = [o[0] + d[0] * 0.45, o[1] + d[1] * 0.45, o[2] + d[2] * 0.45];
  const v = [d[0] * NADE.speed + pl.v[0] * 0.4, d[1] * NADE.speed + 2.2, d[2] * NADE.speed + pl.v[2] * 0.4];
  const n = { id: nextNadeId++, kind, p, v, t: 0, owner: pl.id, rest: false };
  nades.push(n);
  broadcast({ t: 'nade', id: n.id, kind, p: n.p, v: n.v, owner: pl.id });
  nextNade(pl);
  if (!pl.slots[5] && pl.cur === 5) pl.cur = pl.slots[1] ? 1 : 2;
}
function nadesTick(dt) {
  const t = now();
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i];
    n.t += dt;
    // passos menores para o quique sair igual ao do cliente
    for (let k = 0; k < 2; k++) stepNade(n, dt / 2, MAP.boxes);
    if (n.t < NADE.fuse[n.kind] || (n.kind === 'smoke' && !n.rest && n.t < 3.5)) continue;
    nades.splice(i, 1);
    const att = players.get(n.owner);
    if (n.kind === 'he') {
      for (const q of players.values()) {
        if (!q.alive) continue;
        const chest = [q.p[0], q.p[1] + 1.1, q.p[2]];
        const dd = Math.hypot(chest[0] - n.p[0], chest[1] - n.p[1], chest[2] - n.p[2]);
        if (dd < NADE.heRadius && lineOfSight([n.p[0], n.p[1] + 0.3, n.p[2]], chest, MAP.boxes)) {
          const k = 1 - dd / NADE.heRadius; rawDamage(att || q, q, NADE.heDamage * k * k, 'he');
        }
      }
    } else if (n.kind === 'flash') {
      for (const q of players.values()) {
        if (!q.alive) continue;
        const amt = flashAmount([q.p[0], q.p[1] + eyeHeight(q.crouch), q.p[2]], q.yaw, q.pitch, n.p, MAP.boxes);
        if (amt < 0.05) continue;
        if (q.bot) q.bot.blind = t + amt * 3.5;
        else send(q, { t: 'flashed', amt: +amt.toFixed(2) });
      }
    } else smokes.push([n.p[0], n.p[1], n.p[2], t + NADE.smokeTime]);
    broadcast({ t: 'boom', id: n.id, kind: n.kind, p: n.p.map(v => +v.toFixed(2)) });
  }
  for (let i = smokes.length - 1; i >= 0; i--) if (t > smokes[i][3]) smokes.splice(i, 1);
}

// ---------------------------------------------------------------- foguetes e flechas
const projs = [];
let nextProjId = 1;
function launchProj(pl, o, d, kind, key) {
  const P = PROJ[kind];
  const p = [o[0] + d[0] * 0.5, o[1] + d[1] * 0.5 - 0.05, o[2] + d[2] * 0.5];
  const q = { id: nextProjId++, kind, key, p, v: d.map(c => c * P.speed), t: 0, owner: pl.id, team: pl.team };
  projs.push(q);
  broadcast({ t: 'proj', id: q.id, kind, w: key, p: q.p.map(v => +v.toFixed(3)), v: q.v.map(v => +v.toFixed(3)), owner: pl.id });
}
function rocketBlast(q, at, direct) {
  const att = players.get(q.owner), P = PROJ.rocket;
  for (const v of players.values()) {
    if (!v.alive) continue;
    const chest = [v.p[0], v.p[1] + 1.1, v.p[2]];
    const dd = Math.hypot(chest[0] - at[0], chest[1] - at[1], chest[2] - at[2]);
    if (dd > P.radius || !lineOfSight([at[0], at[1] + 0.2, at[2]], chest, MAP.boxes)) continue;
    const k = 1 - dd / P.radius;
    rawDamage(att || v, v, P.damage * k * k + (v === direct ? P.direct : 0), 'rpg');
  }
}
function projsTick(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const q = projs[i];
    q.t += dt;
    const seg = stepProj(q, dt);
    const wr = raycastWorld(seg.o, seg.d, seg.len, MAP.boxes);
    let best = wr.t < seg.len ? wr.t : Infinity, hit = null;
    for (const v of players.values()) {
      if (!v.alive || v.id === q.owner || (v.team === q.team && q.kind === 'arrow')) continue;
      const r = rayPlayer(seg.o, seg.d, v.p, v.crouch);
      if (r.t <= seg.len && r.t < best) { best = r.t; hit = { v, zone: r.zone }; }
    }
    if (best === Infinity && q.t < PROJ[q.kind].life) continue;
    projs.splice(i, 1);
    const at = best === Infinity ? q.p : seg.o.map((c, k) => c + seg.d[k] * best);
    if (q.kind === 'rocket') rocketBlast(q, hit ? at : at.map((c, k) => c - seg.d[k] * 0.15), hit && hit.v);
    else if (hit) { const att = players.get(q.owner); if (att) applyDamage(att, hit.v, q.key, hit.zone, q.t * PROJ.arrow.speed); }
    broadcast({ t: 'projhit', id: q.id, kind: q.kind, p: at.map(v => +v.toFixed(3)), d: seg.d.map(v => +v.toFixed(3)), n: !hit && best !== Infinity ? wr.normal : null, hp: hit ? hit.v.id : 0, hs: hit && hit.zone === 'head' ? 1 : 0 });
  }
}

// ---------------------------------------------------------------- bots
function nearestNode(p) {
  let best = null, bd = Infinity;
  for (const id of NODE_IDS) {
    const [x, z] = MAP.nodes[id];
    const d = Math.hypot(x - p[0], z - p[2]);
    const visible = lineOfSight([p[0], 1, p[2]], [x, 1, z], MAP.boxes);
    const score = d + (visible ? 0 : 1000);
    if (score < bd) { bd = score; best = id; }
  }
  return best;
}
function findPath(from, to) {
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const n = q.shift(); if (n === to) break;
    for (const m of ADJ[n]) if (!(m in prev)) { prev[m] = n; q.push(m); }
  }
  if (!(to in prev)) return [];
  const out = []; for (let n = to; n; n = prev[n]) out.unshift(n);
  return out;
}
function botGoTo(b, goal) { b.bot.path = findPath(nearestNode(b.p), goal); b.bot.goalNode = goal; }
const pick = (a) => a[(Math.random() * a.length) | 0];

function botBuyAndPlan(b) {
  if (b.money >= ITEMS.helmet.price && b.armor < 100) { b.money -= ITEMS.helmet.price; b.armor = 100; b.helmet = true; }
  else if (b.money >= ITEMS.kevlar.price && b.armor < 100) { b.money -= ITEMS.kevlar.price; b.armor = 100; }
  for (const k of NADES) if (!(b.nades[k] > 0) && b.money >= WEAPONS[k].price + 500) { b.money -= WEAPONS[k].price; b.nades[k] = 1; }
  nextNade(b);
  b.cur = b.slots[1] ? 1 : 2;
  if (Math.random() < 0.15 && b.slots[4]) b.cur = 4;          // às vezes vai de AWP
  const B = b.bot;
  B.target = null; B.alert = null; B.burst = 0; B.pushAt = CFG.roundTime - (25 + Math.random() * 30); B.obj = null; B.blind = 0;
  if (b.team === 'T') {
    // o time inteiro ataca o mesmo bombsite: se junta na entrada e depois entra
    B.staging = pick(MAP.staging[game.plan]);
    B.goals = [B.staging];
  } else B.goals = [pick(MAP.botCT)];
  B.path = [];
}

function angleDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function turnTo(cur, want, max) { const d = angleDiff(want, cur); return cur + Math.max(-max, Math.min(max, d)); }

// ponto que a bomba exige deste bot (null = seguir o plano normal)
function bombObjective(b) {
  if (game.phase !== 'live') return null;
  const closest = (team, p) => teamPlayers(team).filter(q => q.alive).sort((a, c) => Math.hypot(a.p[0] - p[0], a.p[2] - p[2]) - Math.hypot(c.p[0] - p[0], c.p[2] - p[2]))[0];
  const ring = (dist) => { const a = (b.id % 7) / 7 * Math.PI * 2; return [bomb.p[0] + Math.cos(a) * dist, 0, bomb.p[2] + Math.sin(a) * dist]; };
  if (b.team === 'T') {
    if (bomb.state === 'carried' && bomb.carrier === b.id) {
      if (!game.go) return null;
      if (siteAt(b.p)) return [...b.p];
      const s = MAP.sites[game.plan];
      return [(s.min[0] + s.max[0]) / 2, 0, (s.min[1] + s.max[1]) / 2];
    }
    if (bomb.state === 'dropped' && closest('T', bomb.p) === b) return [...bomb.p];
    if (bomb.state === 'planted') return ring(bomb.timer > 9 ? 5 : BOMB.radius + 4);
  } else if (bomb.state === 'planted') {
    return closest('CT', bomb.p) === b ? [...bomb.p] : ring(6);
  }
  return null;
}

function botThrow(b, kind, at) {
  const eye = [b.p[0], b.p[1] + eyeHeight(b.crouch), b.p[2]];
  const dx = at[0] - eye[0], dz = at[2] - eye[2], flat = Math.hypot(dx, dz) || 1;
  const up = Math.max(0.15, Math.min(0.7, flat / 40));
  const d = [dx / flat, up, dz / flat], l = Math.hypot(...d);
  b.yaw = Math.atan2(-dx, -dz);
  b.slots[5] = kind;
  throwNade(b, eye, d.map(v => v / l));
}

function checkPush() {
  if (game.go || game.phase !== 'live') return;
  const alive = teamPlayers('T').filter(q => q.alive);
  let near = 0;
  for (const q of alive) {
    if (!q.isBot) { near++; continue; }
    const st = MAP.nodes[q.bot.staging];
    if (st && Math.hypot(q.p[0] - st[0], q.p[2] - st[1]) < 4) near++;
  }
  if (near >= Math.ceil(alive.length * 0.7) || CFG.roundTime - game.timer > 40) {
    game.go = true;
    const s = MAP.sites[game.plan], c = [(s.min[0] + s.max[0]) / 2, 0, (s.min[1] + s.max[1]) / 2];
    for (const q of alive) {
      if (!q.isBot) continue;
      // entram juntos no bombsite; quem tem fumaça ou luz abre o caminho
      q.bot.goals = [nearestNodeTo(c)]; q.bot.path = [];
      const k = ['smoke', 'flash'].find(n => q.nades[n] > 0);
      if (k && Math.random() < 0.6) setTimeout(() => { if (q.alive) botThrow(q, k, [c[0] + (Math.random() - 0.5) * 8, 0, c[2] + (Math.random() - 0.5) * 8]); }, 200 + Math.random() * 1300);
    }
  }
}
function nearestNodeTo(p) {
  let best = NODE_IDS[0], bd = Infinity;
  for (const id of NODE_IDS) { const [x, z] = MAP.nodes[id]; const d = Math.hypot(x - p[0], z - p[2]); if (d < bd) { bd = d; best = id; } }
  return best;
}

function moveToward(b, goal, dt) {
  const dx = goal[0] - b.p[0], dz = goal[2] - b.p[2], dist = Math.hypot(dx, dz);
  if (dist < 0.5) return [0, 0];
  b.yaw = turnTo(b.yaw, Math.atan2(-dx, -dz), 5 * dt);
  b.pitch = turnTo(b.pitch, 0, 3 * dt);
  return [dx / dist, dz / dist];
}

function updateBot(b, dt) {
  b.using = false;
  if (!b.alive || game.phase === 'freeze' || game.phase === 'waiting') return;
  const B = b.bot, t = now();
  const key = b.slots[b.cur], W = WEAPONS[key];
  const eye = [b.p[0], b.p[1] + eyeHeight(b.crouch), b.p[2]];
  const fwd = dirFromAngles(b.yaw, 0);

  // procura inimigo visível (não enxerga através da fumaça nem cego)
  let target = null, tdist = Infinity, aimPt = null;
  if ((game.phase === 'live' || game.phase === 'end') && t >= B.blind) {
    for (const q of players.values()) {
      if (!q.alive || q.team === b.team) continue;
      const h = bodyHeight(q.crouch);
      const pt = [q.p[0], q.p[1] + h - 0.45, q.p[2]];
      const dx = pt[0] - eye[0], dz = pt[2] - eye[2], dist = Math.hypot(dx, dz);
      if (dist > 85 || dist >= tdist) continue;
      const facing = (dx * fwd[0] + dz * fwd[2]) / (dist || 1);
      if (facing < 0.45 && dist > 7 && !(B.alert && t < B.alertUntil)) continue;
      if (!lineOfSight(eye, pt, MAP.boxes) || smokeBlocks(eye, pt, smokes, t)) continue;
      target = q; tdist = dist; aimPt = pt;
    }
  }
  B.objT -= dt;
  if (B.objT <= 0) { B.objT = 0.5; B.obj = bombObjective(b); }

  let wish = [0, 0];
  // bot corre quando está só se deslocando; anda quando sabe que tem inimigo perto
  let speed = (B.alert && t < B.alertUntil ? PHYS.walkSpeed : PHYS.runSpeed) * (W ? W.speed : 1);
  if (target) {
    if (B.target !== target.id) { B.target = target.id; B.react = t + 0.38 + Math.random() * 0.45; }
    if (Math.random() < 0.3) aimPt[1] += 0.3;
    const dx = aimPt[0] - eye[0], dy = aimPt[1] - eye[1], dz = aimPt[2] - eye[2];
    const wantYaw = Math.atan2(-dx, -dz), wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
    b.yaw = turnTo(b.yaw, wantYaw, 7 * dt);
    b.pitch = turnTo(b.pitch, wantPitch, 5 * dt);
    const err = Math.abs(angleDiff(wantYaw, b.yaw)) + Math.abs(wantPitch - b.pitch);
    B.strafeT -= dt;
    if (B.strafeT <= 0) { B.strafe = Math.random() < 0.5 ? -1 : 1; B.strafeT = 0.5 + Math.random() * 0.9; if (Math.random() < 0.3) B.strafe = 0; }
    if (key !== 'awp') { wish = [Math.cos(b.yaw) * B.strafe, -Math.sin(b.yaw) * B.strafe]; speed *= 0.45; }
    if (key && W.melee && !W.grenade) { wish = [fwd[0], fwd[2]]; speed = PHYS.runSpeed; }
    // granada explosiva em inimigo a média distância (às vezes)
    if (t > B.nadeT && b.nades.he > 0 && tdist > 8 && tdist < 26 && Math.random() < 0.02) { B.nadeT = t + 8; botThrow(b, 'he', target.p); }
    const a = b.ammo[key];
    if (!key || W.grenade) b.cur = b.slots[1] ? 1 : 2;
    else if (!W.melee && a && a.mag === 0) {
      if (a.res > 0) startReload(b);
      else b.cur = b.cur === 1 || b.cur === 4 ? 2 : 3;
    } else if (t >= B.react && err < 0.12 && t >= B.nextShot && (!W.melee || tdist < 2)) {
      const inacc = 0.018 + Math.min(B.burst, 8) * 0.005 + (W.auto ? 0 : 0.004) + tdist * 0.0002;
      const d = dirFromAngles(b.yaw + (Math.random() - 0.5) * inacc * 2, b.pitch + (Math.random() - 0.5) * inacc * 2);
      if (fireShot(b, eye, d, key)) {
        B.burst++;
        B.nextShot = t + fireInterval(key) + (W.auto ? 0 : 0.15 + Math.random() * 0.25);
        if (W.auto && B.burst >= 4 + Math.random() * 6) { B.nextShot += 0.3 + Math.random() * 0.35; B.burst = 0; }
      }
    }
  } else {
    B.target = null; B.burst = 0;
    if (B.alert && t < B.alertUntil) {
      b.yaw = turnTo(b.yaw, Math.atan2(-(B.alert[0] - b.p[0]), -(B.alert[2] - b.p[2])), 6 * dt);
    } else if (B.obj) {
      // trabalhando na bomba: vai até o ponto e, chegando, planta/desarma segurando "usar"
      const near = Math.hypot(b.p[0] - B.obj[0], b.p[2] - B.obj[2]);
      const acting = (bomb.state === 'carried' && bomb.carrier === b.id && siteAt(b.p) && near < 3) || (bomb.state === 'planted' && b.team === 'CT' && near < 1.2);
      if (acting) { b.using = true; b.pitch = turnTo(b.pitch, -0.6, 3 * dt); }
      else {
        const goal = nearestNodeTo(B.obj);
        if (B.goalNode !== goal || !B.path.length) {
          if (Math.hypot(MAP.nodes[goal][0] - b.p[0], MAP.nodes[goal][1] - b.p[2]) > 2 && B.goalNode !== goal) botGoTo(b, goal);
          if (!B.path.length) wish = moveToward(b, B.obj, dt);
        }
        if (B.path.length) {
          const [nx, nz] = MAP.nodes[B.path[0]];
          if (Math.hypot(nx - b.p[0], nz - b.p[2]) < 1.3) B.path.shift();
          else wish = moveToward(b, [nx, 0, nz], dt);
        }
      }
    } else {
      if (!B.path.length && B.goals.length) botGoTo(b, B.goals.shift());
      if (b.team === 'T' && !game.go && !B.path.length) checkPush();
      if (b.team === 'CT' && !B.path.length && !B.goals.length && game.phase === 'live' && game.timer < B.pushAt && bomb.state !== 'planted') {
        B.goals = [pick(MAP.botPush)]; B.pushAt = -Infinity;
      }
      if (B.path.length) {
        const [nx, nz] = MAP.nodes[B.path[0]];
        const dist = Math.hypot(nx - b.p[0], nz - b.p[2]);
        if (dist < 1.3) B.path.shift();
        else wish = moveToward(b, [nx, 0, nz], dt);
      } else b.yaw += Math.sin(t * 0.5 + b.id) * 0.6 * dt;   // segurando posição: olha ao redor devagar
      const a = b.ammo[key];
      if (a && !W.melee && a.mag < W.mag * 0.4 && a.res > 0) startReload(b);
      if ((b.cur === 3 || b.cur === 5) && b.slots[2] && b.ammo[b.slots[2]]?.mag > 0) b.cur = b.slots[1] ? 1 : 2;
    }
  }

  // física
  b.v[0] = wish[0] * speed; b.v[2] = wish[1] * speed;
  b.v[1] -= PHYS.gravity * dt;
  const before = [...b.p];
  moveBody(b.p, b.v, dt, bodyHeight(b.crouch), MAP.boxes);
  b.speed = Math.hypot(b.p[0] - before[0], b.p[2] - before[2]) / dt;

  // destravar se ficar preso
  B.stuckT += dt;
  if (B.stuckT > 1.2) {
    const moved = Math.hypot(b.p[0] - B.lastP[0], b.p[2] - B.lastP[2]);
    if (moved < 0.4 && (wish[0] || wish[1]) && !target) {
      if (b.p[1] <= 0.01) b.v[1] = PHYS.jumpV;
      const cur = nearestNode(b.p);
      if (ADJ[cur] && ADJ[cur].length) B.path = [pick(ADJ[cur]), ...B.path];
    }
    B.stuckT = 0; B.lastP = [...b.p];
  }
}

// ---------------------------------------------------------------- loop
const TICK = 30;
let lastTick = now();
setInterval(() => {
  const t = now(), dt = Math.min(0.1, t - lastTick); lastTick = t;
  if (!humans().length && !process.env.SO_BOTS) { game.phase = 'waiting'; return; }

  game.timer -= dt;
  if (game.phase === 'freeze' && game.timer <= 0) { game.phase = 'live'; game.timer = CFG.roundTime; broadcast({ t: 'round', phase: 'live', round: game.round, score: game.score }); }
  else if (game.phase === 'live' && game.timer <= 0 && bomb.state !== 'planted') endRound('CT', 'Tempo esgotado — Contra-Terroristas venceram!');
  else if (game.phase === 'end' && game.timer <= 0) startRound();
  else if (game.phase === 'matchover' && game.timer <= 0) { resetMatch(); startRound(); }

  for (const pl of players.values()) {
    if (pl.reloadEnd && t >= pl.reloadEnd) {
      const a = pl.ammo[pl.reloadKey], W = WEAPONS[pl.reloadKey];
      if (a) { const take = Math.min(W.mag - a.mag, a.res); a.mag += take; a.res -= take; }
      pl.reloadEnd = 0;
    }
    if (pl.isBot) updateBot(pl, dt);
    if (pl.alive) autoPickup(pl, t);
  }
  bombTick(dt);
  nadesTick(dt);
  projsTick(dt);
  if (DEBUG && game.phase === 'live' && Math.floor(t / 4) !== Math.floor((t - dt) / 4)) {
    console.log(`[t=${game.timer.toFixed(0)} bomba=${bomb.state} go=${game.go} plano=${game.plan}] ` + [...players.values()].map(q => `${q.name.slice(4)}${q.team}(${q.p[0].toFixed(0)},${q.p[2].toFixed(0)})${q.alive ? '' : '†'}${q.bot ? ':' + (q.bot.path[0] || '-') : ''}`).join(' '));
  }

  const dropsPub = drops.map(d => ({ id: d.id, key: d.key, p: d.p, yaw: d.yaw }));
  const pub = [...players.values()].map(q => ({
    id: q.id, name: q.name, team: q.team, bot: q.isBot ? 1 : 0,
    p: q.p.map(v => +v.toFixed(2)), yaw: +q.yaw.toFixed(3), pitch: +q.pitch.toFixed(3),
    c: q.crouch ? 1 : 0, a: q.alive ? 1 : 0, w: q.slots[q.cur], s: +q.speed.toFixed(1),
    k: q.kills, d: q.deaths, m: q.money, hp: q.hp, rl: q.reloadEnd ? 1 : 0, u: q.using ? 1 : 0,
  }));
  const bp = bombPub();
  for (const pl of players.values()) {
    if (!pl.ws) continue;
    send(pl, {
      t: 'state', dr: dropsPub, ph: game.phase, tl: +game.timer.toFixed(2), sc: game.score, rd: game.round, buy: canBuyNow() ? 1 : 0, ps: pub, bomb: bp,
      me: { hp: pl.hp, ar: pl.armor, hm: pl.helmet ? 1 : 0, m: pl.money, sl: pl.slots, b4: pl.bag4, nd: pl.nades, cur: pl.cur, am: pl.ammo, a: pl.alive ? 1 : 0, rl: pl.reloadEnd ? 1 : 0, team: pl.team },
    });
  }
}, 1000 / TICK);

// ---------------------------------------------------------------- WebSocket
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  let pl = null;
  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (!pl) {
      if (msg.t !== 'join') return;
      const name = String(msg.name || 'Jogador').replace(/[<>]/g, '').slice(0, 16) || 'Jogador';
      let team = msg.team;
      if (team !== 'T' && team !== 'CT') {
        const hT = teamPlayers('T').filter(p => !p.isBot).length, hCT = teamPlayers('CT').filter(p => !p.isBot).length;
        team = hT === hCT ? (Math.random() < 0.5 ? 'T' : 'CT') : hT < hCT ? 'T' : 'CT';
      }
      const first = humans().length === 0;
      // o primeiro a entrar escolhe o mapa
      if (first && MAPS[msg.map] && msg.map !== mapId) { loadMap(msg.map); for (const b of [...players.values()]) players.delete(b.id); }
      pl = newPlayer(name, team, false, ws);
      players.set(pl.id, pl);
      send(pl, { t: 'welcome', id: pl.id, team, cfg: CFG, map: mapId });
      broadcast({ t: 'msg', text: `${name} entrou no time ${team === 'T' ? 'Terrorista' : 'Contra-Terrorista'}` });
      if (first) { resetMatch(); startRound(); }
      else {
        rebalanceBots();
        if (game.phase === 'freeze') spawnPlayer(pl, MAP.spawns[team][(Math.random() * MAP.spawns[team].length) | 0]);
      }
      return;
    }
    switch (msg.t) {
      case 'pos': {
        if (!Array.isArray(msg.p) || msg.p.length !== 3 || msg.p.some(v => typeof v !== 'number' || !isFinite(v))) return;
        pl.yaw = +msg.yaw || 0; pl.pitch = +msg.pitch || 0; pl.crouch = !!msg.c;
        if (msg.slot && pl.slots[msg.slot] && msg.slot !== pl.cur) { pl.cur = msg.slot; pl.reloadEnd = 0; }
        if (!pl.alive) return;
        const t = now(), dtp = Math.max(0.016, t - pl.lastPosT);
        const dx = msg.p[0] - pl.p[0], dz = msg.p[2] - pl.p[2], dist = Math.hypot(dx, dz);
        const frozen = game.phase === 'freeze';
        if ((frozen && dist > 0.3) || dist > PHYS.sprintSpeed * 1.25 * dtp + 0.6 || Math.abs(msg.p[1] - pl.p[1]) > 4) {
          send(pl, { t: 'spawn', p: pl.p, yaw: pl.yaw, keepAim: 1 });
        } else {
          pl.v = [dx / dtp, 0, dz / dtp];
          pl.speed = dist / dtp; pl.p = msg.p;
        }
        pl.lastPosT = t;
        break;
      }
      case 'shoot': {
        if (!Array.isArray(msg.d) || msg.d.length !== 3) return;
        const len = Math.hypot(...msg.d); if (!len) return;
        const d = msg.d.map(v => v / len);
        const eye = [pl.p[0], pl.p[1] + eyeHeight(pl.crouch), pl.p[2]];
        fireShot(pl, eye, d, pl.slots[pl.cur]);
        break;
      }
      case 'throw': {
        if (!Array.isArray(msg.d) || msg.d.length !== 3) return;
        const len = Math.hypot(...msg.d); if (!len) return;
        throwNade(pl, [pl.p[0], pl.p[1] + eyeHeight(pl.crouch), pl.p[2]], msg.d.map(v => v / len));
        break;
      }
      case 'nextnade': {   // tecla 5 de novo: próxima granada
        const owned = NADES.filter(k => pl.nades[k] > 0);
        if (owned.length) { pl.slots[5] = owned[(owned.indexOf(pl.slots[5]) + 1) % owned.length]; pl.cur = 5; }
        break;
      }
      case 'next4': {   // tecla 4 de novo: próxima arma guardada (AWP, bazuca, arco)
        if (pl.slots[4] && pl.bag4.length) { pl.bag4.push(pl.slots[4]); pl.slots[4] = pl.bag4.shift(); pl.cur = 4; pl.reloadEnd = 0; }
        break;
      }
      case 'use': pl.using = !!msg.on; break;
      case 'reload': startReload(pl); break;
      case 'pickup': if (pl.alive) manualPickup(pl); break;
      case 'drop': if (pl.alive && pl.cur !== 3 && pl.cur !== 5 && pl.slots[pl.cur]) { dropWeapon(pl, pl.cur, true); pl.cur = pl.slots[1] ? 1 : pl.slots[2] ? 2 : 3; } break;
      case 'switch': if (pl.slots[msg.slot]) { pl.cur = msg.slot; pl.reloadEnd = 0; } break;
      case 'buy': buy(pl, String(msg.item)); break;
      case 'team': {
        const team = msg.team === 'T' ? 'T' : 'CT';
        if (team === pl.team) return;
        if (pl.alive) { pl.alive = false; pl.hp = 0; bombOnDeath(pl); checkRoundEnd(); }
        pl.team = team; pl.lostGear = true;
        send(pl, { t: 'welcome', id: pl.id, team, cfg: CFG, map: mapId });
        broadcast({ t: 'msg', text: `${pl.name} mudou para ${team === 'T' ? 'Terroristas' : 'Contra-Terroristas'}` });
        break;
      }
      case 'chat': {
        const text = String(msg.text || '').replace(/[<>]/g, '').slice(0, 120);
        if (text) broadcast({ t: 'chat', id: pl.id, name: pl.name, team: pl.team, text });
        break;
      }
    }
  });
  ws.on('close', () => {
    if (!pl) return;
    bombOnDeath(pl);
    players.delete(pl.id);
    broadcast({ t: 'msg', text: `${pl.name} saiu` });
    checkRoundEnd();
  });
});

// teste sem navegador: SO_BOTS=1 roda uma partida só de bots (com DEBUG=1 mostra abates e rounds)
if (process.env.SO_BOTS) { resetMatch(); startRound(); }

// porta ocupada (outro servidor do jogo já aberto): explica em vez de mostrar o erro cru
function portError(e) {
  if (e.code !== 'EADDRINUSE') throw e;
  console.log(`\n  A porta ${PORT} já está em uso: o jogo provavelmente já está rodando em outro terminal.`);
  console.log(`  Abra http://localhost:${PORT} direto, ou feche o outro terminal (Ctrl+C) e rode de novo.\n`);
  process.exit(1);
}
server.on('error', portError);
wss.on('error', portError);

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\n  Jogo de tiro rodando!');
  console.log(`  Neste computador:  http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  Na mesma rede:     http://${ip}:${PORT}`);
  console.log(`  Mapa: ${MAP.name} · Bots por time: ${BOT_TEAM_SIZE}  (mude com as variáveis MAP e BOTS)\n`);
});
