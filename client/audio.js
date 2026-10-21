// Sons gerados na hora com Web Audio (sem arquivos): tiros, passos, recarga, acertos.

const PROFILE = {
  ak47: { freq: 2600, decay: 0.22, thump: 95, vol: 1.0 },
  m4a4: { freq: 3200, decay: 0.18, thump: 110, vol: 0.9 },
  awp: { freq: 1500, decay: 0.55, thump: 60, vol: 1.3 },
  glock: { freq: 3600, decay: 0.12, thump: 150, vol: 0.7 },
  usp: { freq: 1700, decay: 0.08, thump: 120, vol: 0.35 },
  deagle: { freq: 2200, decay: 0.3, thump: 80, vol: 1.15 },
};

export class Sound {
  constructor() { this.ctx = null; this.volume = 0.6; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  setListener(pos, fwd) {
    if (!this.ctx) return;
    const L = this.ctx.listener, t = this.ctx.currentTime;
    if (L.positionX) {
      L.positionX.setValueAtTime(pos.x, t); L.positionY.setValueAtTime(pos.y, t); L.positionZ.setValueAtTime(pos.z, t);
      L.forwardX.setValueAtTime(fwd.x, t); L.forwardY.setValueAtTime(fwd.y, t); L.forwardZ.setValueAtTime(fwd.z, t);
      L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t);
    } else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
  }
  out(pos) {
    if (!pos) return this.master;
    const p = this.ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 4; p.rolloffFactor = 1.1; p.maxDistance = 200;
    if (p.positionX) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; } else p.setPosition(...pos);
    p.connect(this.master); return p;
  }
  noiseBurst({ freq, q = 0.7, type = 'lowpass', decay, vol, pos = null, delay = 0, attack = 0.002 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f); f.connect(g); g.connect(this.out(pos));
    src.start(t, Math.random() * 0.5); src.stop(t + decay + 0.05);
  }
  tone({ freq, freqEnd = freq, decay, vol, type = 'sine', pos = null, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + decay);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(this.out(pos)); o.start(t); o.stop(t + decay + 0.05);
  }
  shot(key, pos = null) {
    if (key === 'knife') { this.noiseBurst({ freq: 1800, type: 'bandpass', q: 1.5, decay: 0.18, vol: 0.25, pos, attack: 0.04 }); return; }
    const P = PROFILE[key] || PROFILE.ak47;
    const v = P.vol * (pos ? 1.6 : 0.8);
    this.noiseBurst({ freq: P.freq, decay: P.decay, vol: v, pos });
    this.noiseBurst({ freq: 7000, type: 'highpass', decay: 0.04, vol: v * 0.4, pos });
    this.tone({ freq: P.thump * 2, freqEnd: P.thump * 0.6, decay: P.decay * 0.8, vol: v * 0.7, pos });
    if (!pos && key !== 'usp') this.noiseBurst({ freq: 600, decay: P.decay * 2.5, vol: 0.12, delay: 0.03 });   // eco
  }
  step(pos = null, vol = 0.18) { this.noiseBurst({ freq: 900 + Math.random() * 400, type: 'bandpass', q: 1.2, decay: 0.09, vol, pos }); }
  land() { this.noiseBurst({ freq: 500, decay: 0.15, vol: 0.3 }); }
  click() { this.tone({ freq: 2400, freqEnd: 1800, decay: 0.03, vol: 0.15, type: 'square' }); }
  reload(dur) {
    this.noiseBurst({ freq: 3000, type: 'bandpass', q: 3, decay: 0.06, vol: 0.3, delay: dur * 0.2 });
    this.noiseBurst({ freq: 2500, type: 'bandpass', q: 3, decay: 0.08, vol: 0.35, delay: dur * 0.65 });
    this.noiseBurst({ freq: 3500, type: 'bandpass', q: 4, decay: 0.05, vol: 0.4, delay: dur * 0.86 });
  }
  draw() { this.noiseBurst({ freq: 3200, type: 'bandpass', q: 2, decay: 0.07, vol: 0.2 }); }
  hit(head) {
    if (head) { this.tone({ freq: 2100, decay: 0.25, vol: 0.25, type: 'triangle' }); this.tone({ freq: 2650, decay: 0.2, vol: 0.15, type: 'triangle' }); }
    else this.tone({ freq: 1400, freqEnd: 1100, decay: 0.05, vol: 0.18, type: 'square' });
  }
  hurt() { this.noiseBurst({ freq: 400, decay: 0.2, vol: 0.5 }); }
  buy() { this.tone({ freq: 1300, decay: 0.08, vol: 0.15, type: 'triangle' }); this.tone({ freq: 1800, decay: 0.12, vol: 0.12, type: 'triangle', delay: 0.06 }); }
  roundStart() { this.tone({ freq: 880, decay: 0.25, vol: 0.18, type: 'triangle' }); this.tone({ freq: 1320, decay: 0.35, vol: 0.18, type: 'triangle', delay: 0.18 }); }
  roundEnd(win) {
    const notes = win ? [660, 880, 1100] : [660, 520, 400];
    notes.forEach((f, i) => this.tone({ freq: f, decay: 0.4, vol: 0.18, type: 'triangle', delay: i * 0.16 }));
  }
}
