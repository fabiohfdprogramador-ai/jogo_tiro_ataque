// Sons v2: tiros em camadas (estalo supersônico + explosão + grave + mecanismo + eco do ambiente).
// Mesma interface da classe Sound de audio.js.
import { Sound as SoundV1 } from './audio.js';

const GUN = {
  //        estalo     explosão (corte, duração)  grave (freq, dur)   mecanismo   eco   volume
  ak47:   { crack: 1.0, blastF: 2400, blastD: 0.16, boomF: 120, boomD: 0.22, mech: 'ak', tail: 1.0, vol: 1.0, drive: 3.2 },
  m4a4:   { crack: 0.9, blastF: 3200, blastD: 0.12, boomF: 140, boomD: 0.17, mech: 'm4', tail: 0.85, vol: 0.9, drive: 2.6 },
  awp:    { crack: 1.3, blastF: 1600, blastD: 0.3,  boomF: 75,  boomD: 0.45, mech: 'bolt', tail: 1.6, vol: 1.35, drive: 4.5 },
  deagle: { crack: 0.8, blastF: 1900, blastD: 0.2,  boomF: 95,  boomD: 0.3,  mech: 'pistol', tail: 1.2, vol: 1.15, drive: 3.8 },
  glock:  { crack: 0.5, blastF: 3600, blastD: 0.08, boomF: 170, boomD: 0.12, mech: 'pistol', tail: 0.6, vol: 0.7, drive: 2.0 },
  usp:    { suppressed: true, vol: 0.7, tail: 0.6, mech: 'pistol' },   // usa a gravação da Glock (manifest); o abafado só vale se faltar o arquivo
  rpg:    { vol: 1.2, tail: 1.8 },
  bow:    { vol: 0.6, tail: 0.3 },
};

// cada som cai num grupo com volume próprio (menu de opções)
const CATEGORY = {
  shot: 'tiros', knifeHit: 'tiros', death: 'tiros', impact: 'tiros', whizz: 'tiros', casing: 'tiros', boom: 'tiros', flashPop: 'tiros', bounce: 'tiros', hiss: 'tiros', throwNade: 'tiros', hurt: 'tiros', reload: 'tiros', draw: 'tiros',
  step: 'passos', land: 'passos', jump: 'passos', ambient: 'ambiente',
  beep: 'avisos', buy: 'avisos', click: 'avisos', defused: 'avisos', planted: 'avisos', ring: 'avisos', roundEnd: 'avisos', roundStart: 'avisos', hit: 'avisos',
};

export class Sound extends SoundV1 {
  constructor() {
    super();
    this.catVol = { tiros: 1, passos: 1, ambiente: 1, avisos: 1 };
    // durante a chamada, "master" aponta para o ganho do grupo; tudo que o som liga nele passa pelo volume do grupo
    for (const [name, cat] of Object.entries(CATEGORY)) {
      const fn = this[name];
      this[name] = (...args) => {
        if (!this.bus) return fn.apply(this, args);
        const keep = this.master; this.master = this.bus[cat];
        try { return fn.apply(this, args); } finally { this.master = keep; }
      };
    }
  }
  setVolume(v) { this.volume = v; const out = this.mainOut || this.master; if (out) out.gain.value = v; }
  setCategoryVolume(cat, v) { this.catVol[cat] = v; if (this.bus) this.bus[cat].gain.value = v; }
  unlock() {
    const first = !this.ctx;
    super.unlock();
    if (!first || !this.ctx) return;
    const ctx = this.ctx;
    // compressor na saída: tiros altos sem distorcer
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 8; this.comp.ratio.value = 6; this.comp.attack.value = 0.002; this.comp.release.value = 0.15;
    this.master.disconnect(); this.master.connect(this.comp); this.comp.connect(ctx.destination);
    // grupos de volume (tiros, passos, ambiente, avisos) antes do volume geral
    this.mainOut = this.master;
    this.bus = {};
    for (const [cat, v] of Object.entries(this.catVol)) { const g = ctx.createGain(); g.gain.value = v; g.connect(this.mainOut); this.bus[cat] = g; }
    // eco do ambiente (paredes de pedra ao ar livre); quase só tiros e explosões usam, então segue o volume deles
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.makeImpulse(2.2);
    this.reverbGain = ctx.createGain(); this.reverbGain.gain.value = 0.5;
    this.reverb.connect(this.reverbGain); this.reverbGain.connect(this.bus.tiros);
    // distorção suave para dar "soco"
    this.shapers = {};
    this.loadSamples();
  }
  // gravações reais de tiros (client/sounds/manifest.json: { "ak47": ["arquivo.ogg", ...], ... })
  async loadSamples() {
    this.samples = {};
    try {
      const res = await fetch('/sounds/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const manifest = await res.json();
      for (const [key, files] of Object.entries(manifest)) {
        for (const f of [].concat(files)) {
          try {
            const buf = await this.ctx.decodeAudioData(await (await fetch('/sounds/' + f)).arrayBuffer());
            (this.samples[key] ||= []).push(buf);
          } catch { /* arquivo com problema: continua com o som sintetizado */ }
        }
      }
    } catch { /* sem gravações: usa o som sintetizado */ }
    this.updateAmbience();
  }
  playSample(out, key, t, vol, rate) {
    const list = this.samples && this.samples[key];
    if (!list || !list.length) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = list[(Math.random() * list.length) | 0];
    src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(out); src.start(t);
    return true;
  }
  makeImpulse(seconds) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / rate;
        lp += ((Math.random() * 2 - 1) - lp) * (0.25 - Math.min(0.2, t * 0.1));   // fica mais grave com o tempo
        d[i] = lp * Math.pow(1 - t / seconds, 3.2) * 0.9;
      }
      // reflexões das paredes (ecos discretos)
      for (const [dt, a] of [[0.045, 0.6], [0.11, 0.45], [0.19, 0.35], [0.31, 0.22], [0.47, 0.14]]) {
        const at = Math.floor((dt + (ch ? 0.007 : 0)) * rate);
        for (let k = 0; k < 220 && at + k < len; k++) d[at + k] += (Math.random() * 2 - 1) * a * Math.exp(-k / 50);
      }
    }
    return buf;
  }
  shaper(amount) {
    const key = amount.toFixed(1);
    if (this.shapers[key]) return this.shapers[key];
    const n = 2048, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    return (this.shapers[key] = curve);
  }
  // cadeia de saída: seco (com panner se tiver posição) + envio para o eco
  chain(pos, distance, wetMul) {
    const ctx = this.ctx;
    const input = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = pos ? Math.max(1200, 16000 - distance * 260) : 18000;   // longe = abafado
    // atrás de parede: bem mais abafado e mais baixo (o som contorna, não atravessa)
    if (pos && this.occluded && this.occluded(pos)) { lp.frequency.value = Math.min(lp.frequency.value, 900); input.gain.value = 0.55; }
    input.connect(lp);
    lp.connect(this.out(pos));
    const send = ctx.createGain(); send.gain.value = Math.min(1.4, (pos ? 0.35 + distance * 0.02 : 0.28) * wetMul);
    lp.connect(send); send.connect(this.reverb);
    return input;
  }
  burst(dest, { t, freq, type = 'lowpass', q = 0.7, attack = 0.001, decay, vol, rate = 1, drive = 0 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(f);
    if (drive) { const ws = ctx.createWaveShaper(); ws.curve = this.shaper(drive); f.connect(ws); ws.connect(g); } else f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.6); src.stop(t + attack + decay + 0.05);
  }
  thump(dest, { t, f0, f1, decay, vol }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + decay + 0.05);
  }
  mechanics(dest, kind, t, vol) {
    const click = (dt, freq, v, d = 0.03) => this.burst(dest, { t: t + dt, freq, type: 'bandpass', q: 6, decay: d, vol: v * vol });
    if (kind === 'ak') { click(0.028, 2300, 0.35, 0.05); click(0.06, 1700, 0.25, 0.04); }
    else if (kind === 'm4') { click(0.022, 3400, 0.25, 0.035); click(0.05, 2600, 0.15, 0.03); }
    else if (kind === 'pistol') { click(0.02, 3000, 0.3, 0.035); click(0.045, 2200, 0.18, 0.03); }
    else if (kind === 'bolt') { click(0.55, 1500, 0.35, 0.06); click(0.68, 2100, 0.3, 0.05); click(0.82, 1800, 0.35, 0.05); click(0.9, 2600, 0.25, 0.04); }
  }
  shot(key, pos = null) {
    if (!this.ctx) return;
    if (key === 'knife') { if (this.playSample(this.out(pos), 'knife_swing', this.ctx.currentTime, 0.7, 0.92 + Math.random() * 0.16)) return; return super.shot(key, pos); }
    const P = GUN[key] || GUN.ak47, ctx = this.ctx;
    const t = ctx.currentTime + 0.002;
    let distance = 0;
    if (pos && this.listenerPos) distance = Math.hypot(pos[0] - this.listenerPos.x, pos[1] - this.listenerPos.y, pos[2] - this.listenerPos.z);
    if (!Number.isFinite(distance)) distance = 0;
    if (pos && !pos.every(Number.isFinite)) pos = null;
    const delay = distance / 343;                 // som chega depois da luz
    const rate = 0.94 + Math.random() * 0.12;     // variação a cada tiro
    const v = P.vol * (pos ? 1.8 : 1.0);
    const out = this.chain(pos, distance, P.tail || 0.5);
    const T = t + delay;
    if (key === 'rpg') {   // bazuca: estouro grave do motor + chiado longo do foguete saindo
      this.thump(out, { t: T, f0: 110, f1: 35, decay: 0.5, vol: 1.3 * v });
      this.burst(out, { t: T, freq: 700, type: 'lowpass', q: 0.7, decay: 0.35, vol: 1.0 * v, rate });
      this.burst(out, { t: T + 0.03, freq: 2200, type: 'bandpass', q: 0.6, attack: 0.05, decay: 1.1, vol: 0.45 * v, rate: 0.8 });
      return;
    }
    if (key === 'bow') {   // arco: estalo seco da corda e o zumbido curto dela vibrando
      this.burst(out, { t: T, freq: 1800, type: 'bandpass', q: 2, decay: 0.05, vol: 0.5 * v, rate });
      this.thump(out, { t: T, f0: 240, f1: 120, decay: 0.18, vol: 0.45 * v });
      this.burst(out, { t: T + 0.01, freq: 600, type: 'bandpass', q: 6, decay: 0.25, vol: 0.2 * v, rate });
      return;
    }
    // gravação real da arma, quando existir
    if (this.playSample(out, key, T, P.vol * (pos ? 1.4 : 0.9), 0.97 + Math.random() * 0.06)) {
      if (!pos || distance < 12) this.mechanics(out, P.mech, T, pos ? 0.4 : 0.8);
      return;
    }
    if (P.suppressed) {
      this.burst(out, { t: T, freq: 900, type: 'bandpass', q: 1.2, decay: 0.07, vol: 0.55 * v, rate });
      this.burst(out, { t: T, freq: 4500, type: 'highpass', decay: 0.02, vol: 0.25 * v, rate });
      this.thump(out, { t: T, f0: 180, f1: 60, decay: 0.08, vol: 0.35 * v });
      this.mechanics(out, 'pistol', T, 1.3);
      return;
    }
    // 1. estalo supersônico (agudo, curtíssimo)
    this.burst(out, { t: T, freq: 5500, type: 'highpass', decay: 0.012, vol: 0.9 * P.crack * v, rate });
    // 2. explosão da pólvora (corpo do tiro, com saturação)
    this.burst(out, { t: T, freq: P.blastF * rate, type: 'lowpass', q: 0.9, decay: P.blastD, vol: 1.0 * v, rate, drive: P.drive });
    this.burst(out, { t: T + 0.004, freq: 700, type: 'bandpass', q: 0.8, decay: P.blastD * 1.4, vol: 0.55 * v, rate });
    // 3. grave (pressão no peito)
    this.thump(out, { t: T, f0: P.boomF * 2.2 * rate, f1: P.boomF * 0.45, decay: P.boomD, vol: 0.9 * v });
    // 4. mecanismo da arma (só de perto)
    if (!pos || distance < 12) this.mechanics(out, P.mech, T, pos ? 0.5 : 1);
  }
  setListener(pos, fwd) { super.setListener(pos, fwd); this.listenerPos = { x: pos.x, y: pos.y, z: pos.z }; }

  // ---- recarga no ritmo da animação (tempos iguais aos da arma em primeira pessoa)
  reload(dur, kind = 'rifle', key = null) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime, out = this.master;
    // gravação montada para a arma (o arquivo tem 0,35 s a mais no fim para o último som terminar)
    const rec = key && this.samples && this.samples['reload_' + key];
    if (rec && rec.length && this.playSample(out, 'reload_' + key, t0, 0.85, Math.max(0.7, Math.min(1.4, (rec[0].duration - 0.35) / dur)))) return;
    const click = (at, freq, vol, d = 0.05, q = 5) => this.burst(out, { t: t0 + dur * at, freq, type: 'bandpass', q, decay: d, vol });
    const thud = (at, f, vol, d = 0.12) => this.thump(out, { t: t0 + dur * at, f0: f * 1.8, f1: f * 0.6, decay: d, vol });
    if (kind === 'pistol') {
      click(0.19, 3000, 0.45); click(0.205, 4300, 0.25, 0.04);               // retém e carregador saindo
      thud(0.42, 90, 0.25, 0.2); click(0.44, 1500, 0.15, 0.08, 2);           // carregador batendo no chão
      thud(0.62, 150, 0.5); click(0.625, 2400, 0.5);                         // novo entrando
      thud(0.66, 110, 0.55, 0.1);                                            // tapa
      click(0.8, 2000, 0.6, 0.06, 3); thud(0.8, 230, 0.4, 0.08);            // ferrolho
    } else {
      click(0.19, 2900, 0.45); click(0.205, 4300, 0.25, 0.04);
      this.burst(out, { t: t0 + dur * 0.215, freq: 1200, type: 'bandpass', q: 1, decay: 0.12, vol: 0.18 });
      thud(0.42, 90, 0.25, 0.2); click(0.44, 1300, 0.15, 0.08, 2);
      thud(0.62, 150, 0.55); click(0.625, 2200, 0.55);
      thud(0.66, 110, 0.6, 0.1);
      click(0.78, 1600, 0.4, 0.09, 2); this.burst(out, { t: t0 + dur * 0.785, freq: 2600, type: 'highpass', decay: 0.07, vol: 0.2 });
      click(0.83, 1800, 0.7, 0.07, 3); thud(0.83, 220, 0.45, 0.08);
    }
  }
  // ---- granadas, bomba e explosões
  // passos: o som muda com o chão (pedra/asfalto, grama, areia, terra)
  step(pos = null, vol = 0.18, ground = 'pedra', run = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.out(pos), r = 0.9 + Math.random() * 0.2;
    // gravação real (passos na grama, Kenney CC0) em qualquer chão; correndo pisa mais rápido e mais agudo
    if (this.playSample(o, 'step', t, vol * 3 * (0.85 + Math.random() * 0.3), (run ? 1.04 : 0.97) + Math.random() * 0.08)) return;
    if (ground === 'grama') {          // folhas amassando: chiado agudo e macio, quase sem batida
      this.burst(o, { t, freq: 3800, type: 'highpass', q: 0.5, attack: 0.01, decay: 0.14, vol: vol * 0.9, rate: r });
      this.thump(o, { t, f0: 120, f1: 70, decay: 0.05, vol: vol * 0.5 });
    } else if (ground === 'areia') {   // areia: estalinhos granulados, arrastado
      this.burst(o, { t, freq: 1500, type: 'bandpass', q: 0.6, attack: 0.012, decay: 0.16, vol: vol * 1.1, rate: r });
      this.burst(o, { t: t + 0.03, freq: 2600, type: 'bandpass', q: 1.5, decay: 0.07, vol: vol * 0.5, rate: r * 1.3 });
    } else if (ground === 'terra') {   // terra batida: abafado e grave
      this.burst(o, { t, freq: 650, type: 'bandpass', q: 0.9, decay: 0.1, vol: vol * 1.1, rate: r });
      this.thump(o, { t, f0: 150, f1: 70, decay: 0.07, vol: vol * 0.9 });
    } else {                           // pedra, bloquete e asfalto: estalo seco do solado + batida do calcanhar
      this.burst(o, { t, freq: 2100 + Math.random() * 500, type: 'bandpass', q: 1.6, decay: 0.045, vol: vol * 1.1, rate: r });
      this.thump(o, { t, f0: 190, f1: 90, decay: 0.05, vol: vol * 0.9 });
    }
  }
  // eco do lugar: beco estreito ecoa bem mais que campo aberto (0 = aberto, 1 = fechado)
  setRoom(k) { if (this.reverbGain) this.reverbGain.gain.setTargetAtTime(0.32 + k * 0.6, this.ctx.currentTime, 0.4); }
  bounce(pos, nade = false) { if (!this.ctx) return; const t = this.ctx.currentTime; const o = this.out(pos); if (nade && this.playSample(o, 'nade_bounce', t, 0.9, 0.92 + Math.random() * 0.16)) return; this.burst(o, { t, freq: 2100, type: 'bandpass', q: 6, decay: 0.05, vol: 0.5 }); this.thump(o, { t, f0: 300, f1: 120, decay: 0.06, vol: 0.4 }); }
  throwNade() { if (!this.ctx) return; if (this.playSample(this.master, 'nade_throw', this.ctx.currentTime, 0.55, 0.95 + Math.random() * 0.1)) return; this.burst(this.master, { t: this.ctx.currentTime, freq: 900, type: 'bandpass', q: 1, attack: 0.03, decay: 0.2, vol: 0.25 }); }
  // sacar a arma: cada tipo tem o seu (fuzil, pistola, AWP, faca, granada)
  draw(key) {
    if (!this.ctx) return;
    const kind = { glock: 'pistola', usp: 'pistola', deagle: 'pistola', awp: 'awp', knife: 'faca', he: 'granada', flash: 'granada', smoke: 'granada' }[key] || 'fuzil';
    if (!this.playSample(this.master, 'draw_' + kind, this.ctx.currentTime, 0.6, 0.97 + Math.random() * 0.06)) super.draw();
  }
  // gatilho sem bala
  click() { if (!this.ctx || !this.playSample(this.master, 'dry', this.ctx.currentTime, 0.7, 0.97 + Math.random() * 0.06)) super.click(); }
  // compra: pegando o equipamento
  buy() { if (!this.ctx || !this.playSample(this.master, 'buy', this.ctx.currentTime, 0.6, 0.97 + Math.random() * 0.06)) super.buy(); }
  // início e fim de round ficam sem som (o aviso aparece só na tela)
  roundStart() {}
  roundEnd() {}
  // pulo (impulso) e aterrissagem
  jump() { if (this.ctx) this.playSample(this.master, 'jump', this.ctx.currentTime, 0.45, 0.95 + Math.random() * 0.1); }
  land() { if (!this.ctx || !this.playSample(this.master, 'land', this.ctx.currentTime, 0.6, 0.95 + Math.random() * 0.1)) super.land(); }
  // faca acertando alguém
  knifeHit(pos) {
    if (!this.ctx) return;
    this.playSample(this.out(pos), 'knife_hit', this.ctx.currentTime, 0.8, 0.95 + Math.random() * 0.1);
  }
  // grito e o corpo caindo
  death(pos) {
    if (!this.ctx) return;
    this.playSample(this.out(pos), 'death', this.ctx.currentTime, pos ? 1.0 : 0.7, 0.95 + Math.random() * 0.1);
  }
  // acerto: o "tic" de sempre + a pancada no corpo (ou o "ting" do capacete no tiro na cabeça)
  hit(head) {
    super.hit(head);
    if (this.ctx) this.playSample(this.master, head ? 'hit_head' : 'hit_body', this.ctx.currentTime, head ? 0.6 : 0.5, 0.97 + Math.random() * 0.06);
  }
  // bala batendo na parede, no metal ou na madeira (gravações; sem elas fica em silêncio como antes)
  impact(pos, mat = 'concreto') {
    if (!this.ctx) return;
    this.playSample(this.out(pos), 'imp_' + mat, this.ctx.currentTime, 0.75, 0.9 + Math.random() * 0.2);
  }
  // bala inimiga passando perto da cabeça
  whizz(pos) {
    if (!this.ctx) return;
    this.playSample(this.out(pos), 'whizz', this.ctx.currentTime, 0.9, 0.9 + Math.random() * 0.2);
  }
  // cápsula vazia caindo no chão um instante depois do tiro (pistola tem cápsula menor)
  casing(pos, key) {
    if (!this.ctx) return;
    const pistol = ['glock', 'usp', 'deagle'].includes(key);
    this.playSample(this.out(pos), pistol ? 'casing_pistol' : 'casing_rifle', this.ctx.currentTime + 0.28 + Math.random() * 0.15, pos ? 0.6 : 0.3, 0.92 + Math.random() * 0.16);
  }
  beep(pos) { if (!this.ctx || !this.playSample(this.out(pos), 'bomb_beep', this.ctx.currentTime, 0.7, 1)) this.tone({ freq: 2400, decay: 0.07, vol: 0.5, type: 'square', pos }); }
  boom(pos, big = false, kind = big ? 'bomb' : 'he') {
    if (!this.ctx) return;
    let distance = 0;
    if (pos && this.listenerPos) distance = Math.hypot(pos[0] - this.listenerPos.x, pos[1] - this.listenerPos.y, pos[2] - this.listenerPos.z);
    const t = this.ctx.currentTime + distance / 343;
    const out = this.chain(pos, distance, 2.0), v = big ? 2.2 : 1.4;
    // gravações montadas em camadas (granada, bazuca e bomba têm explosões diferentes)
    if (this.playSample(out, 'boom_' + kind, t, { he: 1.5, rpg: 1.8, bomb: 2.1 }[kind] || 1.5, 0.97 + Math.random() * 0.06)) return;
    this.burst(out, { t, freq: 6000, type: 'highpass', decay: 0.05, vol: 0.9 * v });
    this.burst(out, { t, freq: 900, type: 'lowpass', decay: 1.6, vol: 1.0 * v, drive: 4 });
    this.thump(out, { t, f0: 120, f1: 30, decay: big ? 2.4 : 1.3, vol: 1.4 * v });
  }
  flashPop(pos) { if (!this.ctx) return; const t = this.ctx.currentTime; const out = this.chain(pos, 5, 1.5); if (this.playSample(out, 'flash_pop', t, 1.4, 1)) return; this.burst(out, { t, freq: 5000, type: 'highpass', decay: 0.08, vol: 1.2 }); this.thump(out, { t, f0: 300, f1: 80, decay: 0.3, vol: 0.8 }); }
  hiss(pos) { if (!this.ctx) return; this.burst(this.out(pos), { t: this.ctx.currentTime, freq: 3500, type: 'highpass', attack: 0.2, decay: 3.0, vol: 0.25 }); }
  ring(sec) { this.tone({ freq: 3200, decay: Math.max(0.5, sec), vol: 0.08, type: 'sine' }); }
  planted() { if (this.ctx && this.playSample(this.master, 'bomb_planted', this.ctx.currentTime, 0.7, 1)) return; this.tone({ freq: 660, decay: 0.5, vol: 0.2, type: 'triangle' }); this.tone({ freq: 990, decay: 0.5, vol: 0.15, type: 'triangle', delay: 0.15 }); }
  defused() { if (this.ctx && this.playSample(this.master, 'bomb_defused', this.ctx.currentTime, 0.7, 1)) return; this.tone({ freq: 1320, decay: 0.35, vol: 0.2, type: 'triangle' }); }
  // ---- vento: ruído grave contínuo bem baixinho
  ambient() {
    if (!this.ctx || this.wind) return;
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true; src.playbackRate.value = 0.5;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0.035;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = ctx.createGain(); lg.gain.value = 0.02; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.wind = src; this.windGain = g;
    this.ambOn = true; this.updateAmbience(); this.ambEvents();
  }
  // ---- ambiente do Bairro: fundo em loop (dia: jardim na cidade; noite: grilos) e sons soltos de vez em quando
  setScene(map, time) { this.sceneKey = map === 'bairro' ? (time === 'noite' ? 'noite' : 'dia') : null; this.updateAmbience(); }
  updateAmbience() {
    if (!this.ctx || !this.ambOn) return;
    const key = this.sceneKey || null, buf = key && this.samples && this.samples['amb_' + key];
    if (this.ambBed && this.ambBed.key === key) return;
    const t = this.ctx.currentTime, out = this.bus ? this.bus.ambiente : this.master;
    if (this.ambBed) { const { src, g } = this.ambBed; g.gain.setTargetAtTime(0, t, 0.6); src.stop(t + 4); this.ambBed = null; }
    if (buf) {
      const src = this.ctx.createBufferSource(); src.buffer = buf[0]; src.loop = true;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(key === 'dia' ? 0.3 : 0.18, t + 3);
      src.connect(g); g.connect(out); src.start(t, Math.random() * buf[0].duration * 0.5);
      this.ambBed = { key, src, g };
    }
    if (this.windGain) this.windGain.gain.value = buf ? 0.015 : 0.035;   // com o fundo gravado o vento fica só de leve
  }
  ambEvents() {
    const next = () => setTimeout(() => { this.ambEvent(); next(); }, (20 + Math.random() * 40) * 1000);
    next();
  }
  ambEvent() {
    const key = this.sceneKey; if (!key || !this.samples) return;
    const pool = key === 'dia' ? ['dog', 'car', 'car', 'kids'] : ['dog', 'dog', 'car'];
    const k = pool[(Math.random() * pool.length) | 0], buf = this.samples['amb_' + k]; if (!buf) return;
    const o = { dog: { from: Math.random() * 14, dur: 2 + Math.random() * 2, gain: 0.2, lp: 2200 }, car: { from: 4, dur: 10, gain: key === 'dia' ? 0.25 : 0.16, lp: 5000 }, kids: { from: Math.random() * 20, dur: 7, gain: 0.12, lp: 3000 } }[k];
    const ctx = this.ctx, t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = buf[0];
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp;
    const p = ctx.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8;
    const g = ctx.createGain(), fade = Math.min(1, o.dur * 0.2);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.gain, t + fade); g.gain.setValueAtTime(o.gain, t + o.dur - fade); g.gain.linearRampToValueAtTime(0, t + o.dur);
    src.connect(f); f.connect(p); p.connect(g); g.connect(this.bus ? this.bus.ambiente : this.master); src.start(t, o.from, o.dur);
  }
}
