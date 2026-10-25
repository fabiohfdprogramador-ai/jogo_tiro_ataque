// Interface na tela: vida, munição, placar, radar, killfeed, loja, mensagens.
import { MAP } from '/shared/map.js';
import { WEAPONS, ITEMS, BUY_MENU, MAX_HP } from '/shared/weapons.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Hud {
  constructor() {
    this.cache = {};
    this.radar = $('radarc').getContext('2d');
    this.bannerTimer = 0; this.noticeTimer = 0; this.hitTimer = 0; this.dmgTimer = 0;
  }
  set(id, value, prop = 'textContent') {
    const k = id + prop;
    if (this.cache[k] === value) return;
    this.cache[k] = value; $(id)[prop] = value;
  }
  show(on) { $('hud').classList.toggle('hidden', !on); }

  update(me, srv, players, dt) {
    const t = Math.max(0, Math.ceil(srv.timer));
    this.set('time', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
    $('time').classList.toggle('low', srv.phase === 'live' && t <= 10);
    this.set('scT', String(srv.score.T)); this.set('scCT', String(srv.score.CT));
    const aliveT = players.filter(p => p.team === 'T' && p.a).length, aliveCT = players.filter(p => p.team === 'CT' && p.a).length;
    this.set('aliveCT', `CT vivos: ${aliveCT}`); this.set('aliveT', `TR vivos: ${aliveT}`);
    this.set('hp', String(me.hp)); $('hp').classList.toggle('low', me.hp <= MAX_HP / 4);
    this.set('armor', me.armor ? `${me.armor}${me.helmet ? '+' : ''}` : '0');
    this.set('money', `$ ${me.money.toLocaleString('pt-BR')}`);
    const key = me.slots[me.cur], W = WEAPONS[key], a = me.ammo[key];
    if (W && !W.melee && a) { this.set('mag', String(a.mag)); this.set('res', String(a.res)); $('ammo').style.visibility = 'visible'; }
    else $('ammo').style.visibility = 'hidden';
    const nadeTxt = () => ['he', 'flash', 'smoke'].filter(k => me.nd[k] > 0).map(k => `<span class="${k === me.slots[5] ? 'on' : ''}">${({ he: 'Explosiva', flash: 'Luz', smoke: 'Fumaça' })[k]}${me.nd[k] > 1 ? ' ×' + me.nd[k] : ''}</span>`).join(' ');
    const wl = [1, 2, 3, 4, 5].filter(s => me.slots[s]).map(s => `<div class="${s === me.cur ? 'cur' : ''}"><b>${s}</b>${s === 5 ? nadeTxt() : s === 4 && (me.bag4 || []).length ? [me.slots[4], ...me.bag4].map((k, i) => `<span class="${i ? '' : 'on'}">${esc(WEAPONS[k].name)}</span>`).join(' ') : esc(WEAPONS[me.slots[s]].name)}</div>`).join('');
    this.set('weapons', wl, 'innerHTML');
    $('buyhint').classList.toggle('hidden', !(srv.buy && me.alive));
    $('vitals').style.visibility = me.alive ? 'visible' : 'hidden';
    $('weapons').style.visibility = me.alive ? 'visible' : 'hidden';
    if (!me.alive) $('ammo').style.visibility = 'hidden';

    this.bannerTimer -= dt; if (this.bannerTimer <= 0) $('banner').classList.remove('show');
    this.noticeTimer -= dt; if (this.noticeTimer <= 0) $('notice').classList.remove('show');
    this.hitTimer -= dt; if (this.hitTimer <= 0) $('hitmark').classList.remove('show');
    this.dmgTimer -= dt; $('dmg').style.opacity = Math.max(0, this.dmgTimer * 1.5).toFixed(2);
  }

  crosshair(gap, visible) {
    const g = Math.round(gap);
    if (this.cache.gap !== g) {
      this.cache.gap = g;
      const c = $('cross');
      c.querySelector('.a').style.top = `${-g - 8}px`; c.querySelector('.b').style.top = `${g}px`;
      c.querySelector('.l').style.left = `${-g - 8}px`; c.querySelector('.r').style.left = `${g}px`;
    }
    $('cross').style.visibility = visible ? 'visible' : 'hidden';
  }

  banner(text, cls = '', time = 3) {
    const b = $('banner'); b.textContent = text; b.className = 'show ' + cls; this.bannerTimer = time;
  }
  notice(text, time = 2.5) { const n = $('notice'); n.textContent = text; n.classList.add('show'); this.noticeTimer = time; }
  hitmark(hs) { const h = $('hitmark'); h.classList.add('show'); h.classList.toggle('hs', !!hs); this.hitTimer = 0.18; }

  damage(fromPos, myPos, myYaw) {
    this.dmgTimer = 0.45;
    const dx = fromPos[0] - myPos[0], dz = fromPos[2] - myPos[2];
    const ang = Math.atan2(dx, -dz) + myYaw;     // 0 = na frente
    const s = document.createElement('span');
    s.style.transform = `rotate(${ang}rad)`;
    $('dmgdir').appendChild(s);
    setTimeout(() => { s.style.opacity = '0'; }, 600);
    setTimeout(() => s.remove(), 1300);
  }

  feed(killer, victim, weapon, hs, mine) {
    const d = document.createElement('div');
    if (mine) d.className = 'me';
    d.innerHTML = `<span class="${killer.team === 'T' ? 'tt' : 'c'}">${esc(killer.name)}</span><span class="w">${esc(WEAPONS[weapon]?.name || weapon)}${hs ? ' ◎' : ''}</span><span class="${victim.team === 'T' ? 'tt' : 'c'}">${esc(victim.name)}</span>`;
    $('feed').prepend(d);
    while ($('feed').children.length > 6) $('feed').lastChild.remove();
    setTimeout(() => d.remove(), 7000);
  }

  chat(name, team, text) {
    const d = document.createElement('div');
    d.innerHTML = `<span class="${team === 'T' ? 'tt' : 'c'}">${esc(name)}:</span> ${esc(text)}`;
    $('chatlog').appendChild(d);
    while ($('chatlog').children.length > 6) $('chatlog').firstChild.remove();
    setTimeout(() => d.remove(), 12000);
  }

  death(text) { const d = $('death'); if (text) { d.innerHTML = text; d.classList.remove('hidden'); } else d.classList.add('hidden'); }

  pickHint(html) {
    this.set('pickhint', html, 'innerHTML');
    $('pickhint').classList.toggle('hidden', !html);
  }

  scope(on) { $('scope').classList.toggle('hidden', !on); }

  // tela branca da granada de luz (a = 0..1)
  flash(a) {
    const v = a > 0.01 ? Math.min(1, a).toFixed(2) : '0';
    if (this.cache.flash !== v) { this.cache.flash = v; $('flash').style.opacity = v; }
  }

  // bomba: aviso de plantada, ícone de quem carrega e barra de plantar/desarmar
  bomb(b, me, action, using) {
    let status = '';
    if (b && b.st === 'planted') status = `<span class="red">BOMBA PLANTADA · ${b.s}</span>`;
    else if (b && b.st === 'carried' && b.c === me.id && me.alive) status = '<span class="tt">💣 Você está com a bomba</span>';
    else if (b && b.st === 'dropped' && me.team === 'T') status = '<span class="tt">A bomba está no chão</span>';
    this.set('bombst', status, 'innerHTML');
    $('time').classList.toggle('bomb', !!(b && b.st === 'planted'));
    let prog = 0, label = '';
    if (b && using && action === 'plant' && b.c === me.id) { prog = b.pl; label = 'Plantando a bomba...'; }
    else if (b && using && action === 'defuse' && b.dr === me.id) { prog = b.df; label = 'Desarmando...'; }
    $('prog').classList.toggle('hidden', !label);
    if (label) { this.set('progl', label); $('progb').style.width = `${Math.round(prog * 100)}%`; }
  }

  buyMenu(open, me) {
    $('buy').classList.toggle('hidden', !open);
    if (!open) return;
    const rows = BUY_MENU.map(({ key, item }) => {
      const W = WEAPONS[item], I = ITEMS[item];
      const name = W ? W.name : I.name, price = W ? W.price : (item === 'helmet' && me.armor >= 100 ? 350 : I.price);
      const blocked = (W && W.team && W.team !== me.team) || me.money < price;
      const extra = W && W.team ? (W.team === 'T' ? ' (TR)' : ' (CT)') : '';
      return `<div class="${blocked ? 'no' : ''}"><span><b>${key}</b>${esc(name)}${extra}</span><span class="p">$ ${price}</span></div>`;
    }).join('');
    this.set('buylist', rows, 'innerHTML');
  }

  board(open, players, myId, score) {
    $('board').classList.toggle('hidden', !open);
    if (!open) return;
    const table = (team, title) => {
      const rows = players.filter(p => p.team === team).sort((a, b) => b.k - a.k).map(p =>
        `<tr class="${p.id === myId ? 'me' : ''} ${p.a ? '' : 'dead'}"><td>${esc(p.name)}</td><td class="n">${p.k}</td><td class="n">${p.d}</td><td class="n">${team === players.find(q => q.id === myId)?.team ? '$' + p.m : ''}</td></tr>`).join('');
      return `<h3 class="${team === 'T' ? 'tt' : 'c'}">${title} — ${score[team]}</h3><table><tr><th>Jogador</th><th class="n">Abates</th><th class="n">Mortes</th><th class="n">$</th></tr>${rows}</table>`;
    };
    this.set('board', table('CT', 'Contra-Terroristas') + table('T', 'Terroristas'), 'innerHTML');
  }

  drawRadar(me, viewPos, viewYaw, players, spotted, bomb) {
    const g = this.radar, S = 220, k = 3.1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, S, S);
    g.translate(S / 2, S / 2); g.rotate(viewYaw); g.scale(k, k); g.translate(-viewPos[0], -viewPos[2]);
    const m = MAP.size;
    if (MAP.streets) {        // bairro: quarteirões escuros, ruas claras, campo verde
      g.fillStyle = 'rgba(60,55,50,.75)'; g.fillRect(m.minX, m.minZ, m.maxX - m.minX, m.maxZ - m.minZ);
      g.fillStyle = 'rgba(150,150,145,.6)'; for (const [x0, z0, x1, z1] of MAP.streets) g.fillRect(x0, z0, x1 - x0, z1 - z0);
      const col = { campo: 'rgba(80,140,60,.7)', praca: 'rgba(120,150,90,.6)', igreja: 'rgba(90,120,170,.5)', areia: 'rgba(210,190,140,.7)', trilha: 'rgba(140,110,80,.6)', trilhaJ: 'rgba(140,110,80,.6)', trilhaS: 'rgba(140,110,80,.6)', mato: 'rgba(60,100,50,.7)', mato2: 'rgba(60,100,50,.7)', fimPap: 'rgba(60,100,50,.7)', gram: 'rgba(80,130,60,.6)' };
      for (const [k, [x0, z0, x1, z1]] of Object.entries(MAP.areas || {})) { g.fillStyle = col[k] || 'rgba(130,120,100,.55)'; g.fillRect(x0, z0, x1 - x0, z1 - z0); }
    } else { g.fillStyle = 'rgba(150,130,95,.55)'; g.fillRect(m.minX, m.minZ, m.maxX - m.minX, m.maxZ - m.minZ); }
    for (const s of Object.values(MAP.sites)) { g.fillStyle = 'rgba(200,60,40,.18)'; g.fillRect(s.min[0], s.min[1], s.max[0] - s.min[0], s.max[1] - s.min[1]); }
    for (const b of MAP.boxes) {
      if (b.mat === 'invisible' || b.mat === 'pole') continue;
      const h = b.max[1] - b.min[1];
      g.fillStyle = b.mat === 'crate' || b.mat === 'barrel' ? 'rgba(90,70,45,.9)' : b.min[1] > 0 ? 'rgba(0,0,0,0)' : h >= 3 ? 'rgba(40,34,26,.95)' : 'rgba(70,60,45,.95)';
      g.fillRect(b.min[0], b.min[2], b.max[0] - b.min[0], b.max[2] - b.min[2]);
    }
    for (const [name, s] of Object.entries(MAP.sites)) {
      const cx = (s.min[0] + s.max[0]) / 2, cz = (s.min[1] + s.max[1]) / 2;
      g.save(); g.translate(cx, cz); g.rotate(-viewYaw); g.scale(1 / k, 1 / k);
      g.fillStyle = 'rgba(240,90,70,.9)'; g.font = 'bold 18px Segoe UI'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 0, 0);
      g.restore();
    }
    // bomba: TR sempre sabem onde está; CT só depois de plantada
    if (bomb && bomb.st !== 'none' && bomb.st !== 'exploded' && (me.team === 'T' || bomb.st === 'planted' || bomb.st === 'defused')) {
      const blink = bomb.st !== 'planted' || (performance.now() % 600) < 350;
      if (blink) { g.fillStyle = bomb.st === 'planted' ? '#ff3020' : '#ffb020'; g.fillRect(bomb.p[0] - 3.3 / k, bomb.p[2] - 3.3 / k, 6.6 / k, 6.6 / k); }
    }
    for (const p of players) {
      if (p.id === me.id || !p.a) continue;
      const enemy = p.team !== me.team;
      if (enemy && !spotted.has(p.id)) continue;
      g.fillStyle = enemy ? '#ff3b30' : p.team === 'T' ? '#f0c060' : '#6aa8f0';
      g.beginPath(); g.arc(p.p[0], p.p[2], 4.2 / k, 0, Math.PI * 2); g.fill();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (me.alive) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(S / 2, S / 2 - 8); g.lineTo(S / 2 - 6, S / 2 + 6); g.lineTo(S / 2 + 6, S / 2 + 6); g.closePath(); g.fill(); }
  }
}
