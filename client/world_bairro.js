// Mapa "Bairro" em 3D: ruas de bloquete, calçadas com meio-fio, casas coloridas (reboco e tijolo),
// campo com alambrado, bar e restaurante, praça com parquinho, igreja azul, terreno baldio e postes com fios.
// Tudo gerado por código (texturas em canvas). As colisões vêm de shared/map.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(size, draw, repeat = 1, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function speckle(g, s, r, n, colors, a) {
  for (let i = 0; i < n; i++) { g.globalAlpha = a * r(); g.fillStyle = colors[(r() * colors.length) | 0]; const w = 1 + r() * 2.5; g.fillRect(r() * s, r() * s, w, w); }
  g.globalAlpha = 1;
}

// bloquete de concreto (20 x 10 cm, desencontrado) — 1 textura = 1 m
const paverTex = () => canvasTex(512, (g, s) => {
  const r = rand(5), bw = s / 5, bh = s / 10;
  g.fillStyle = '#4a4744'; g.fillRect(0, 0, s, s);
  for (let row = 0; row < 10; row++) for (let col = -1; col < 6; col++) {
    const x = col * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
    const v = 140 + ((r() - 0.5) * 30) | 0;
    g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 2, y + 2, bw - 4, 2);
  }
  speckle(g, s, r, 9000, ['#5c5853', '#b9b4ad', '#7a756f'], 0.35);
});
const concreteTex = () => canvasTex(512, (g, s) => {
  const r = rand(31);
  g.fillStyle = '#b3b0aa'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) { const x = r() * s, y = r() * s, rad = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(120,115,105,.25)' : 'rgba(210,205,198,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = 'rgba(70,65,60,.55)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  speckle(g, s, r, 12000, ['#8a857e', '#d6d2cb'], 0.35);
});
const plasterTex = () => canvasTex(512, (g, s) => {   // reboco claro (a cor vem dos vértices)
  const r = rand(11);
  g.fillStyle = '#e8e6e2'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) { const x = r() * s, y = r() * s, rad = 15 + r() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.6 ? 'rgba(150,140,125,.22)' : 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = 'rgba(90,80,65,.35)'; g.lineWidth = 1.2;   // rachaduras finas
  for (let i = 0; i < 8; i++) { let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += r() * 25; g.lineTo(x, y); } g.stroke(); }
  // escorrido de sujeira embaixo
  const gr = g.createLinearGradient(0, s * 0.75, 0, s); gr.addColorStop(0, 'rgba(90,80,60,0)'); gr.addColorStop(1, 'rgba(90,80,60,.25)'); g.fillStyle = gr; g.fillRect(0, s * 0.75, s, s * 0.25);
  speckle(g, s, r, 14000, ['#9a9080', '#ffffff'], 0.3);
});
const brickTex = () => canvasTex(512, (g, s) => {
  const r = rand(9), bw = s / 4, bh = s / 12;
  g.fillStyle = '#a8a094'; g.fillRect(0, 0, s, s);
  for (let row = 0; row < 12; row++) for (let col = -1; col < 5; col++) {
    const x = col * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
    g.fillStyle = `rgb(${150 + r() * 40 | 0},${70 + r() * 22 | 0},${48 + r() * 15 | 0})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
  }
  speckle(g, s, r, 9000, ['#5a2a1a', '#d89a7a'], 0.3);
});
const grassTex = () => canvasTex(512, (g, s) => {
  const r = rand(53);
  g.fillStyle = '#5d7a32'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) { const x = r() * s, y = r() * s, rad = 20 + r() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, ['rgba(120,140,60,.35)', 'rgba(70,95,35,.35)', 'rgba(140,120,70,.3)'][(r() * 3) | 0]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.lineWidth = 1;
  for (let i = 0; i < 9000; i++) { const x = r() * s, y = r() * s; g.strokeStyle = r() < 0.5 ? 'rgba(40,60,20,.5)' : 'rgba(150,175,80,.45)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5); g.stroke(); }
}, 1);
const dirtTex = () => canvasTex(256, (g, s) => {
  const r = rand(61); g.fillStyle = '#8a7356'; g.fillRect(0, 0, s, s);
  speckle(g, s, r, 8000, ['#6a5638', '#a88e6a', '#5a4a30'], 0.5);
});
const roofTex = () => canvasTex(256, (g, s) => {   // telha de barro
  const r = rand(71);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const x = col * s / 8 + (row % 2 ? s / 16 : 0), y = row * s / 8;
    const gr = g.createLinearGradient(x, y, x, y + s / 8);
    const c = 150 + r() * 30 | 0;
    gr.addColorStop(0, `rgb(${c},${c * 0.45 | 0},${c * 0.3 | 0})`); gr.addColorStop(1, `rgb(${c * 0.7 | 0},${c * 0.3 | 0},${c * 0.2 | 0})`);
    g.fillStyle = gr; g.fillRect(x, y, s / 8 - 1, s / 8 - 1);
  }
  speckle(g, s, r, 3000, ['#3a2010', '#d8a080'], 0.3);
});
const chainTex = () => {
  const t = canvasTex(128, (g, s) => {
    g.clearRect(0, 0, s, s); g.strokeStyle = 'rgba(70,74,72,1)'; g.lineWidth = 2;
    for (let i = -s; i < s * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); g.beginPath(); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
  });
  return t;
};
const rollupTex = () => canvasTex(256, (g, s) => {
  for (let y = 0; y < s; y += 10) { const gr = g.createLinearGradient(0, y, 0, y + 10); gr.addColorStop(0, '#9a9da2'); gr.addColorStop(0.5, '#c8cbd0'); gr.addColorStop(1, '#7a7d82'); g.fillStyle = gr; g.fillRect(0, y, s, 10); }
  speckle(g, s, rand(3), 3000, ['#6a6050', '#e0e0e0'], 0.3);
});
const frondTex = () => canvasTex(128, (g, s) => {   // folha de coqueiro
  g.clearRect(0, 0, s, s); const r = rand(3);
  g.strokeStyle = '#7a7038'; g.lineWidth = 3; g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.stroke();
  for (let y = 6; y < s; y += 5) {
    const len = (s / 2 - 4) * Math.sin((y / s) * Math.PI * 0.95 + 0.15);
    const c = 60 + r() * 40 | 0;
    g.strokeStyle = `rgb(${c * 0.6 | 0},${c + 30},${c * 0.35 | 0})`; g.lineWidth = 3;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(s / 2, y); g.lineTo(s / 2 + sd * len, y + len * 0.5); g.stroke(); }
  }
}, 1);
const foliageTex = () => canvasTex(256, (g, s) => {
  g.clearRect(0, 0, s, s); const r = rand(51);
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * s * 0.45;
    const x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d;
    const c = 60 + r() * 50 | 0;
    g.fillStyle = `rgb(${c * 0.55 | 0},${c + 25},${c * 0.3 | 0})`;
    g.beginPath(); g.ellipse(x, y, 5 + r() * 5, 3 + r() * 3, r() * 3, 0, 7); g.fill();
  }
});
const label = (txt, color, size = 256) => canvasTex(size, (g, s) => {
  g.clearRect(0, 0, s, s); g.font = `bold ${s * 0.7}px Arial`; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, s / 2, s * 0.55);
});
function canvasTexWH(w, h, draw) {   // textura retangular, sem repetir (letreiros, frontão)
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// reboco branco velho dos muros e casas dos fundos: chapisco, escorridos escuros e mofo embaixo (fotos 3 a 8)
const grimeTex = () => canvasTex(512, (g, s) => {
  const r = rand(23);
  g.fillStyle = '#ecebe6'; g.fillRect(0, 0, s, s);
  speckle(g, s, r, 26000, ['#b9b6ad', '#ffffff', '#a19d93'], 0.5);
  for (let i = 0; i < 26; i++) {   // escorridos que descem do alto
    const x = r() * s, w = 4 + r() * 22, len = s * (0.15 + r() * 0.5);
    const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(70,72,66,.28)'); gr.addColorStop(1, 'rgba(70,72,66,0)');
    g.fillStyle = gr; g.fillRect(x, 0, w, len);
  }
  for (let i = 0; i < 22; i++) {   // mofo esverdeado perto do chão
    const x = r() * s, y = s * (0.85 + r() * 0.2), rad = 20 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(70,78,58,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.strokeStyle = 'rgba(90,85,75,.4)'; g.lineWidth = 1;
  for (let i = 0; i < 6; i++) { let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (r() - 0.5) * 26; y += r() * 22; g.lineTo(x, y); } g.stroke(); }
});
const churchTex = () => {   // reboco liso da igreja (a cor azul vem do material); UV em metros
  const t = canvasTex(512, (g, s) => {
    const r = rand(41);
    g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) { const x = r() * s, y = r() * s, rad = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.6 ? 'rgba(120,130,140,.12)' : 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    speckle(g, s, r, 9000, ['#c8ccd2', '#ffffff'], 0.25);
  });
  t.repeat.set(0.4, 0.4);
  return t;
};
const stoneTex = () => canvasTex(256, (g, s) => {   // embasamento de pedra do anexo
  const r = rand(77);
  g.fillStyle = '#6d6a64'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) {
    const x = r() * s, y = r() * s, w = 20 + r() * 40, h = 14 + r() * 22, v = 120 + r() * 70 | 0;
    g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.beginPath(); g.ellipse(x, y, w / 2, h / 2, r() * 0.6, 0, 7); g.fill();
  }
  speckle(g, s, r, 5000, ['#4a4844', '#d0ccc4'], 0.4);
});
const strawTex = () => canvasTex(256, (g, s) => {   // palha da barraca
  const r = rand(19);
  g.fillStyle = '#7a5f38'; g.fillRect(0, 0, s, s);
  g.lineWidth = 2;
  for (let i = 0; i < 2600; i++) { const x = r() * s, y = r() * s, c = 110 + r() * 70 | 0; g.strokeStyle = `rgba(${c},${c * 0.78 | 0},${c * 0.45 | 0},.8)`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 10 + r() * 16); g.stroke(); }
});
const gateTex = () => canvasTex(256, (g, s) => {   // portão azul com retângulos encaixados (foto 4)
  g.clearRect(0, 0, s, s); g.strokeStyle = '#3d78c2'; g.lineWidth = 7;
  for (let k = 0; k < 7; k++) { const m = 10 + k * 17; g.strokeRect(m * 0.6, m, s - m * 1.6, s - m * 2); }
  g.beginPath(); g.moveTo(s * 0.5, 0); g.lineTo(s * 0.5, s); g.stroke();
  g.lineWidth = 10; g.strokeRect(4, 4, s - 8, s - 8);
}, 1);
const signTex = () => canvasTex(128, (g, s) => {   // placa de contramão (círculo vermelho, seta riscada)
  g.fillStyle = '#f4f4f0'; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, 7); g.fill();
  g.strokeStyle = '#c81e1e'; g.lineWidth = 14; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 8, 0, 7); g.stroke();
  g.fillStyle = '#111'; g.fillRect(s / 2 - 6, s * 0.38, 12, s * 0.42);
  g.beginPath(); g.moveTo(s / 2, s * 0.2); g.lineTo(s / 2 - 20, s * 0.42); g.lineTo(s / 2 + 20, s * 0.42); g.fill();
  g.strokeStyle = '#c81e1e'; g.lineWidth = 12; g.beginPath(); g.moveTo(s * 0.24, s * 0.24); g.lineTo(s * 0.76, s * 0.76); g.stroke();
});
// letreiro de loja (fundo, cor da letra, linha de baixo)
function signBoard(txt, bg, fg, sub) {
  const t = canvasTexWH(1024, 192, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg;
    g.font = 'bold 96px Arial Black, Arial, sans-serif';
    const k = Math.min(1, (w - 40) / g.measureText(txt).width);
    g.save(); g.translate(w / 2, h * 0.4); g.scale(k, 1); g.fillText(txt, 0, 0); g.restore();
    if (sub) { g.font = 'bold 34px Arial, sans-serif'; g.fillText(sub, w / 2, h * 0.82); }
  });
  return new THREE.MeshStandardMaterial({ map: t, transparent: bg.includes('rgba(0,0,0,0)'), alphaTest: 0.3, roughness: 0.6 });
}
const blueTileTex = () => canvasTex(128, (g, s) => {   // azulejo azul do barrado (20 cm)
  const n = 5;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? '#1d3f8a' : '#24499a'; g.fillRect(i * s / n, j * s / n, s / n, s / n); }
  g.strokeStyle = 'rgba(230,230,230,.8)'; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s / n, 0); g.lineTo(i * s / n, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / n); g.lineTo(s, i * s / n); g.stroke(); }
});
const zincTex = () => canvasTex(128, (g, s) => {   // telha ondulada de fibrocimento
  for (let x = 0; x < s; x++) { const v = 150 + Math.sin(x / s * Math.PI * 2 * 6) * 40 | 0; g.fillStyle = `rgb(${v},${v + 2},${v})`; g.fillRect(x, 0, 1, s); }
  speckle(g, s, rand(4), 1500, ['#5a5a52', '#d0d0c8'], 0.3);
});
const woodFenceTex = () => canvasTex(256, (g, s) => {   // ripas de madeira escurecida com frestas
  g.clearRect(0, 0, s, s); const r = rand(12);
  for (let x = 0; x < s; x += 21) { const c = 70 + r() * 40 | 0; g.fillStyle = `rgb(${c},${c * 0.82 | 0},${c * 0.62 | 0})`; g.fillRect(x, 0, 17, s); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 15, 0, 2, s); }
  g.fillStyle = 'rgb(80,64,48)'; g.fillRect(0, s * 0.2, s, 12); g.fillRect(0, s * 0.72, s, 12);
}, 1);
const cobogoTex = () => canvasTex(128, (g, s) => {   // cobogó vermelho (quadradinhos vazados)
  g.fillStyle = '#b8402e'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {   // furos escuros (o vão mostra a sombra de dentro)
    const gr = g.createRadialGradient(i * 32 + 13, j * 32 + 13, 2, i * 32 + 16, j * 32 + 16, 12); gr.addColorStop(0, '#3a2a22'); gr.addColorStop(1, '#1a120e');
    g.fillStyle = gr; g.beginPath(); g.ellipse(i * 32 + 16, j * 32 + 16, 11, 11, 0, 0, 7); g.fill();
  }
}, 1);
const arenaTex = () => canvasTexWH(1024, 256, (g, w, h) => {   // escudo pintado e o nome no muro da Arena
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#c22b2b'; g.beginPath(); g.arc(150, h / 2, 112, 0, 7); g.fill();
  g.fillStyle = '#16264f'; g.beginPath(); g.arc(150, h / 2, 100, 0, 7); g.fill();
  g.fillStyle = '#f4f4f4'; g.beginPath(); g.moveTo(100, 70); g.lineTo(200, 70); g.lineTo(200, 130); g.quadraticCurveTo(200, 185, 150, 205); g.quadraticCurveTo(100, 185, 100, 130); g.closePath(); g.fill();
  g.fillStyle = '#c22b2b'; g.beginPath(); g.moveTo(150, 205); g.quadraticCurveTo(110, 160, 112, 120); g.lineTo(188, 120); g.quadraticCurveTo(190, 160, 150, 205); g.fill();
  g.fillStyle = '#1e3f9c'; g.font = 'italic bold 120px Arial Black, Arial'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('ARENA', 330, h * 0.42);
  g.fillStyle = 'rgba(200,110,110,.85)'; g.font = 'italic 54px Georgia, serif'; g.fillText('futebol society', 360, h * 0.8);
});
const assembleiaTex = () => canvasTexWH(1024, 256, (g, w, h) => {   // placa azul da Assembleia (foto 4)
  g.fillStyle = '#1f3594'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e8e8f0'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#f4f4f8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 84px Georgia, "Times New Roman", serif';
  g.fillText('Igreja Assembleia de', w / 2, h * 0.33); g.fillText('Deus das Nações', w / 2 + 60, h * 0.72);
});
const glassBlockTex = () => canvasTex(128, (g, s) => {   // tijolo de vidro
  g.fillStyle = '#e8eaec'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const gr = g.createLinearGradient(i * 32, j * 32, i * 32 + 28, j * 32 + 28); gr.addColorStop(0, '#9fb4c8'); gr.addColorStop(1, '#d8e4ee'); g.fillStyle = gr; g.fillRect(i * 32 + 3, j * 32 + 3, 26, 26); }
});
const bananaTex = () => canvasTex(128, (g, s) => {   // folha de bananeira (comprida, rasgada)
  g.clearRect(0, 0, s, s); const r = rand(8);
  g.fillStyle = '#4f8a2e'; g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.2, s * 0.49, 0, 0, 7); g.fill();
  g.strokeStyle = '#86b84a'; g.lineWidth = 3; g.beginPath(); g.moveTo(s / 2, 2); g.lineTo(s / 2, s - 2); g.stroke();
  g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const y = 10 + r() * (s - 20), sd = r() < 0.5 ? -1 : 1; g.beginPath(); g.moveTo(s / 2 + sd * 4, y); g.lineTo(s / 2 + sd * s * 0.25, y + 6); g.stroke(); }
  g.restore();
}, 1);
const stripeTex = () => canvasTex(128, (g, s) => {   // lona listrada da barraca
  const cols = ['#e8781e', '#2e8a3a', '#f0c020', '#2e8a3a'];
  for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]; g.fillRect(i * s / 8, 0, s / 8, s); }
});
// faixa azul com letras douradas da fachada
const bandTex = () => canvasTexWH(2048, 192, (g, w, h) => {
  g.fillStyle = '#20408c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d9b75a'; g.fillRect(0, 10, w, 4); g.fillRect(0, h - 14, w, 4);
  g.font = 'bold 92px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = 'CREIO NA IGREJA UNA, SANTA, CATÓLICA E APOSTÓLICA';
  const k = Math.min(1, (w - 80) / g.measureText(txt).width);
  g.save(); g.translate(w / 2, h / 2 + 4); g.scale(k, 1);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(txt, 3, 3);
  g.fillStyle = '#f0cf6a'; g.fillText(txt, 0, 0);
  g.restore();
});
// frontão: borda azul-escura, fundo branco com arabescos azuis e o brasão com coroa no meio
const pedimentTex = () => canvasTexWH(1024, 320, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const tri = (inset) => { g.beginPath(); g.moveTo(inset * 3.2, h - inset); g.lineTo(w / 2, inset * 1.05); g.lineTo(w - inset * 3.2, h - inset); g.closePath(); };
  g.fillStyle = '#22448e'; tri(0); g.fill();
  g.fillStyle = '#f6f6f2'; tri(26); g.fill();
  g.save(); tri(26); g.clip();
  g.strokeStyle = '#7ea6d6'; g.lineWidth = 5;   // arabescos acompanhando as bordas
  for (const sd of [-1, 1]) for (let k = 0; k < 9; k++) {
    const t = 0.12 + k * 0.085, x = w / 2 + sd * t * w * 0.5, y = h - 40 - (1 - t) * (h - 90) * 0.55;
    g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 1.6); g.stroke();
    g.beginPath(); g.moveTo(x - sd * 18, y); g.quadraticCurveTo(x - sd * 40, y - 30, x - sd * 62, y - 6); g.stroke();
  }
  g.restore();
  // brasão: escudo oval, monograma e coroa
  const cx = w / 2, cy = h * 0.6;
  g.fillStyle = '#5f8fca'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(cx + sd * 62, cy + 10, 40, 16, sd * 0.6, 0, 7); g.fill(); }
  g.fillStyle = '#b8cfe8'; g.strokeStyle = '#22448e'; g.lineWidth = 6;
  g.beginPath(); g.ellipse(cx, cy + 6, 46, 58, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#22448e'; g.font = 'bold 60px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', cx, cy + 10);
  g.fillStyle = '#d9b75a'; g.strokeStyle = '#22448e'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(cx - 40, cy - 52); g.lineTo(cx - 44, cy - 92); g.lineTo(cx - 20, cy - 70); g.lineTo(cx, cy - 102); g.lineTo(cx + 20, cy - 70); g.lineTo(cx + 44, cy - 92); g.lineTo(cx + 40, cy - 52); g.closePath(); g.fill(); g.stroke();
});

const HOUSE_COLORS = [0xf2ede0, 0xeceae6, 0xd2e6cc, 0xf5cdb8, 0xcde0f2, 0xf7e08a, 0xdccbe8, 0xf7b896, 0xbcd9c0, 0xe58a80, 0xf2f0c0];

export function buildBairro(group, MAP, sunLight) {
  const T = {
    paver: paverTex(), concrete: concreteTex(), plaster: plasterTex(), brick: brickTex(), grass: grassTex(), dirt: dirtTex(),
    roof: roofTex(), chain: chainTex(), rollup: rollupTex(), frond: frondTex(), foliage: foliageTex(),
  };
  const M = {
    paver: new THREE.MeshStandardMaterial({ map: T.paver, roughness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ map: T.concrete, roughness: 0.92 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xd8d5ce, roughness: 0.9 }),
    plaster: new THREE.MeshStandardMaterial({ map: T.plaster, vertexColors: true, roughness: 0.95 }),
    brick: new THREE.MeshStandardMaterial({ map: T.brick, vertexColors: true, roughness: 0.95 }),
    roof: new THREE.MeshStandardMaterial({ map: T.roof, roughness: 0.8, side: THREE.DoubleSide }),
    grass: new THREE.MeshStandardMaterial({ map: T.grass, roughness: 1 }),
    dirt: new THREE.MeshStandardMaterial({ map: T.dirt, roughness: 1 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xd9bf8c, roughness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf0efea, roughness: 0.7 }),
    church: new THREE.MeshStandardMaterial({ color: 0x9cc0e6, roughness: 0.8 }),
    churchDark: new THREE.MeshStandardMaterial({ color: 0x2a4c8c, roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.08, metalness: 0.5 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.35, metalness: 0.6 }),
    rollup: new THREE.MeshStandardMaterial({ map: T.rollup, roughness: 0.45, metalness: 0.5 }),
    doorBlue: new THREE.MeshStandardMaterial({ color: 0x3a6ea0, roughness: 0.6 }),
    doorWood: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8 }),
    tank: new THREE.MeshStandardMaterial({ color: 0x2f6fb8, roughness: 0.4 }),
    fenceGreen: new THREE.MeshStandardMaterial({ color: 0x1f4a28, roughness: 0.5, metalness: 0.3 }),
    chain: new THREE.MeshStandardMaterial({ map: T.chain, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe8c020, roughness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc02818, roughness: 0.5 }),
    blueToy: new THREE.MeshStandardMaterial({ color: 0x2058c0, roughness: 0.5 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xf06a18, roughness: 0.6 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 1 }),
    frond: new THREE.MeshStandardMaterial({ map: T.frond, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
    foliage: new THREE.MeshStandardMaterial({ map: T.foliage, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }),
    cable: new THREE.LineBasicMaterial({ color: 0x1a1a1a }),
    crate: new THREE.MeshStandardMaterial({ color: 0x8a6237, roughness: 0.85 }),
    awning: new THREE.MeshStandardMaterial({ color: 0xc0302a, roughness: 0.9, side: THREE.DoubleSide }),
    grime: new THREE.MeshStandardMaterial({ map: grimeTex(), vertexColors: true, roughness: 0.97 }),
    churchWall: new THREE.MeshStandardMaterial({ map: churchTex(), color: 0xa6c8ec, roughness: 0.85 }),
    churchShade: new THREE.MeshStandardMaterial({ color: 0x5f86b8, roughness: 0.9 }),
    churchTrim: new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.6 }),
    crossGrey: new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.8 }),
    stone: new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95 }),
    gateWhite: new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.4, metalness: 0.5 }),
    gateBlue: new THREE.MeshStandardMaterial({ map: gateTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 }),
    blueMetal: new THREE.MeshStandardMaterial({ color: 0x3d78c2, roughness: 0.45, metalness: 0.4 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x8a6a2e, roughness: 0.35, metalness: 0.9 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0x6a5020, roughness: 0.3 }),
    band: new THREE.MeshStandardMaterial({ map: bandTex(), roughness: 0.6 }),
    pediment: new THREE.MeshStandardMaterial({ map: pedimentTex(), transparent: true, alphaTest: 0.5, roughness: 0.7 }),
    sign: new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.5 }),
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.55 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 }),
    headlight: new THREE.MeshStandardMaterial({ color: 0xf4f4ee, emissive: 0x303030, roughness: 0.2 }),
    taillight: new THREE.MeshStandardMaterial({ color: 0xb01010, emissive: 0x300000, roughness: 0.3 }),
    straw: new THREE.MeshStandardMaterial({ map: strawTex(), roughness: 1, side: THREE.DoubleSide }),
    tarp: new THREE.MeshStandardMaterial({ color: 0x1e5fd0, roughness: 0.8, side: THREE.DoubleSide }),
    zinc: new THREE.MeshStandardMaterial({ color: 0xb8bcbe, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }),
    beige: new THREE.MeshStandardMaterial({ color: 0xb5ab95, roughness: 0.8 }),
    redStep: new THREE.MeshStandardMaterial({ color: 0xa8281e, roughness: 0.8 }),
    craneRed: new THREE.MeshStandardMaterial({ color: 0xd2321e, roughness: 0.6 }),
    blueTile: new THREE.MeshStandardMaterial({ map: blueTileTex(), roughness: 0.25, metalness: 0.1 }),
    zincRoof: new THREE.MeshStandardMaterial({ map: zincTex(), roughness: 0.75, side: THREE.DoubleSide }),
    greenAwning: new THREE.MeshStandardMaterial({ color: 0x1f9a82, roughness: 0.8, side: THREE.DoubleSide }),
    woodFence: new THREE.MeshStandardMaterial({ map: woodFenceTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }),
    cobogo: new THREE.MeshStandardMaterial({ map: cobogoTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }),
    arenaRoof: new THREE.MeshStandardMaterial({ color: 0x23282a, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide }),
    arenaLogo: new THREE.MeshStandardMaterial({ map: arenaTex(), transparent: true, alphaTest: 0.3, roughness: 0.8 }),
    courtGreen: new THREE.MeshStandardMaterial({ color: 0x2f6a3e, roughness: 0.9 }),
    assembleiaSign: new THREE.MeshStandardMaterial({ map: assembleiaTex(), roughness: 0.5 }),
    glassBlock: new THREE.MeshStandardMaterial({ map: glassBlockTex(), roughness: 0.2, metalness: 0.1 }),
    banana: new THREE.MeshStandardMaterial({ map: bananaTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
    bananaTrunk: new THREE.MeshStandardMaterial({ color: 0x6f7a3a, roughness: 0.9 }),
    stripes: new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.8, side: THREE.DoubleSide }),
    silo: new THREE.MeshStandardMaterial({ color: 0xe4e6e6, roughness: 0.5, metalness: 0.3 }),
  };

  // ---- lotes de geometria juntados por material (poucos desenhos = leve)
  const batches = new Map();
  const put = (mat, geo, shadow = true) => {
    const k = mat.uuid + (shadow ? 's' : 'n');
    if (!batches.has(k)) batches.set(k, { mat, geos: [], shadow });
    batches.get(k).geos.push(geo);
  };
  // caixa com UV em metros (tile = metros por repetição) e cor por vértice opcional
  const boxGeo = (x0, y0, z0, x1, y1, z1, tile = 1, color = null) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
      const su = nx > 0.5 ? d : w, sv = ny > 0.5 ? d : h;
      uv.setXY(i, uv.getX(i) * su / tile, uv.getY(i) * sv / tile);
    }
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (color !== null) {
      const c = new THREE.Color(color), arr = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    return g;
  };
  const box = (mat, x0, y0, z0, x1, y1, z1, tile = 1, color = null, shadow = true) => put(mat, boxGeo(x0, y0, z0, x1, y1, z1, tile, color), shadow);
  const flat = (mat, x0, z0, x1, z1, y, tile = 1) => {   // chão (plano) com UV em metros
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / tile, uv.getY(i) * (z1 - z0) / tile);
    g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    put(mat, g, false);
  };
  const xform = (geo, pos, rotY = 0, rotX = 0, rotZ = 0) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ')).setPosition(pos[0], pos[1], pos[2]);
    geo.applyMatrix4(m); return geo;
  };
  const cyl = (mat, x, y0, z, r0, r1, h, seg = 10, shadow = true) => put(mat, xform(new THREE.CylinderGeometry(r1, r0, h, seg), [x, y0 + h / 2, z]), shadow);
  const bar = (mat, a, b, r, shadow = false) => {   // haste entre dois pontos
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    const g = new THREE.CylinderGeometry(r, r, d.length(), 6);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    g.applyQuaternion(q); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    put(mat, g, shadow);
  };

  const S = MAP.size;
  // ---- chão: concreto em volta, ruas de bloquete com meio-fio
  flat(M.concrete, S.minX - 60, S.minZ - 60, S.maxX + 60, S.maxZ + 60, 0, 1.5);
  for (const [x0, z0, x1, z1] of MAP.streets) {
    const horiz = x1 - x0 > z1 - z0, walk = 1.4;
    const ix0 = horiz ? x0 : x0 + walk, ix1 = horiz ? x1 : x1 - walk, iz0 = horiz ? z0 + walk : z0, iz1 = horiz ? z1 - walk : z1;
    flat(M.paver, ix0, iz0, ix1, iz1, 0.012, 1);
    if (horiz) { box(M.curb, x0, 0, iz0 - 0.14, x1, 0.1, iz0, 1, null, false); box(M.curb, x0, 0, iz1, x1, 0.1, iz1 + 0.14, 1, null, false); }
    else { box(M.curb, ix0 - 0.14, 0, z0, ix0, 0.1, z1, 1, null, false); box(M.curb, ix1, 0, z0, ix1 + 0.14, 0.1, z1, 1, null, false); }
  }

  // ---- casas
  const rnd = rand(17);
  const roofTri = [];
  const gable = (x0, z0, x1, z1, y, alongZ, rise = 1.3) => {
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const P = alongZ
      ? [[x0, y, z0], [mx, y + rise, z0], [mx, y + rise, z1], [x0, y, z1], [x1, y, z0], [x1, y, z1]]
      : [[x0, y, z0], [x0, y + rise, mz], [x1, y + rise, mz], [x1, y, z0], [x0, y, z1], [x1, y, z1]];
    const tris = alongZ ? [[0, 1, 2], [0, 2, 3], [4, 2, 1], [4, 5, 2], [0, 4, 1], [3, 2, 5]] : [[0, 1, 2], [0, 2, 3], [4, 2, 1], [4, 5, 2], [0, 1, 4], [3, 5, 2]];
    for (const t of tris) for (const i of t) roofTri.push(...P[i]);
  };
  const windowAt = (c, n, t, w = 1.1, h = 1.0, grade = true) => {
    // c = centro na parede; n = normal (para fora); t = direção ao longo da parede
    const B = new THREE.Matrix4().makeBasis(new THREE.Vector3(...t), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n));
    const place = (mat, ox, oy, oz, sx, sy, sz, shadow = false) => {
      const g = new THREE.BoxGeometry(sx, sy, sz); g.applyMatrix4(B); g.translate(c[0] + n[0] * oz + t[0] * ox, c[1] + oy, c[2] + n[2] * oz + t[2] * ox);
      put(mat, g, shadow);
    };
    place(M.alu, 0, 0, 0.03, w + 0.12, h + 0.12, 0.06);
    place(M.glass, 0, 0, 0.065, w, h, 0.02);
    place(M.concrete, 0, -h / 2 - 0.1, 0.1, w + 0.35, 0.08, 0.22);
    if (grade) { for (let k = 0; k < 5; k++) place(M.dark, -w / 2 + 0.1 + k * (w - 0.2) / 4, 0, 0.11, 0.025, h, 0.025); place(M.dark, 0, 0, 0.11, w, 0.025, 0.025); }
  };
  const isStreet = (x, z) => MAP.streets.some(([x0, z0, x1, z1]) => x >= x0 - 0.5 && x <= x1 + 0.5 && z >= z0 - 0.5 && z <= z1 + 0.5);
  const isOpen = (x, z) => Object.entries(MAP.areas).some(([k, [x0, z0, x1, z1]]) => !['blocoW', 'blocoN', 'blocoE', 'margS'].includes(k) && x >= x0 && x <= x1 && z >= z0 && z <= z1);
  const SIGNS = { mercearia: signBoard('BAR E MERCEARIA', '#f2d23a', '#b8201a', 'Café da manhã · Almoço · Self-service'), associacao: signBoard('ASSOCIAÇÃO DE MORADORES', 'rgba(0,0,0,0)', '#1f3f9a', 'DA VILA RESIDENCIAL'),
    lanches: signBoard('LANCHES', '#151515', '#ff7a3c', 'lanchonete · açaí'), bar: signBoard('BAR', '#1e5a32', '#f4f0e0', 'cerveja gelada'), bar2: signBoard('BAR', '#e8e2d0', '#a0201a', 'petiscos'),
    mercadinho: signBoard('MERCADINHO', '#f4f4f0', '#1f4fa8', 'da Vila Residencial'), cantinho: signBoard('CANTINHO SABOROSO', '#b8261c', '#fff2c0', 'quentinhas · lanches'), restaurante: signBoard('BAR E RESTAURANTE', '#f4efe0', '#a8201a', 'almoço · petiscos') };
  const house = (b, solidHouse = true) => {
    const [x0, , z0] = b.min, [x1, h, z1] = b.max;
    const col = b.hex ?? HOUSE_COLORS[b.color % HOUSE_COLORS.length];
    const mat = b.brick ? M.brick : b.grime ? M.grime : M.plaster;
    const tile = b.brick ? 1 : b.grime ? Math.max(3, h) : 2.5;   // reboco velho: uma textura cobre a parede toda
    box(mat, x0, 0, z0, x1, h, z1, tile, b.brick ? 0xffffff : col);
    if (b.tiles) box(M.blueTile, x0 - 0.03, 0, z0 - 0.03, x1 + 0.03, 0.8, z1 + 0.03, 1, null, false);   // barrado de azulejo azul
    else if (!b.brick) box(mat, x0 - 0.03, 0, z0 - 0.03, x1 + 0.03, 0.5, z1 + 0.03, 2.5, new THREE.Color(col).multiplyScalar(0.7).getHex(), false);   // barrado
    const sx = x1 - x0, sz = z1 - z0;
    if (b.roof || b.roofTile) gable(x0 - 0.35, z0 - 0.35, x1 + 0.35, z1 + 0.35, h, sx < sz);
    else if (b.zinc) {   // telha ondulada quase plana, caindo para um lado, com beiral
      const R = [[x0 - 0.4, h + 0.55, z0 - 0.4], [x1 + 0.4, h + 0.55, z0 - 0.4], [x1 + 0.4, h + 0.05, z1 + 0.4], [x0 - 0.4, h + 0.05, z1 + 0.4]];
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => R[i]), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => [R[i][0] * 0.8, R[i][2] * 0.8]), 2));
      g.computeVertexNormals(); put(M.zincRoof, g, true);
      if (rnd() < 0.6) cyl(M.tank, x0 + sx * 0.7, h + 0.3, z0 + sz * 0.4, 0.62, 0.68, 0.95, 14, false);
    } else {
      box(mat, x0 - 0.06, h, z0 - 0.06, x1 + 0.06, h + 0.4, z1 + 0.06, b.brick ? 1 : 2.5, b.brick ? 0xffffff : new THREE.Color(col).multiplyScalar(0.92).getHex(), false);
      if (rnd() < 0.75) cyl(M.tank, x0 + sx * (0.25 + rnd() * 0.5), h + 0.4, z0 + sz * (0.25 + rnd() * 0.5), 0.62, 0.68, 0.95, 14, false);
    }
    if (!solidHouse) return;
    const floors = Math.max(1, Math.round(h / 3.1));
    const faces = [[[(x0 + x1) / 2, 0, z0], [0, 0, -1], [1, 0, 0], sx], [[(x0 + x1) / 2, 0, z1], [0, 0, 1], [1, 0, 0], sx],
      [[x0, 0, (z0 + z1) / 2], [-1, 0, 0], [0, 0, 1], sz], [[x1, 0, (z0 + z1) / 2], [1, 0, 0], [0, 0, 1], sz]];
    let door = false, signed = !b.sign;
    for (const [mid, n, t, L] of faces) {
      const qx = mid[0] + n[0] * 3, qz = mid[2] + n[2] * 3;
      if (!isStreet(qx, qz) && !isOpen(qx, qz)) continue;
      const nv = new THREE.Vector3(...n), up = new THREE.Vector3(0, 1, 0);
      const Bf = new THREE.Matrix4().makeBasis(up.clone().cross(nv), up, nv);   // base sem espelhar (o texto fica legível)
      if (!signed && isStreet(qx, qz)) {   // letreiro em cima da porta, na primeira fachada que dá para a rua
        signed = true;
        const g = new THREE.BoxGeometry(Math.min(L - 0.4, 5.2), 0.9, 0.05); g.applyMatrix4(Bf); g.translate(mid[0] + n[0] * 0.06, 2.95, mid[2] + n[2] * 0.06);
        put(SIGNS[b.sign], g, false);
      }
      if (b.green && isStreet(qx, qz)) {   // quitanda: toldo verde nas fachadas da rua
        const g = new THREE.PlaneGeometry(L, 1.3); g.rotateX(-Math.PI / 2 + 0.45); g.applyMatrix4(Bf);
        g.translate(mid[0] + n[0] * 0.6, 2.35, mid[2] + n[2] * 0.6); put(M.greenAwning, g, true);
      }
      const slots = Math.max(1, Math.floor(L / 3));
      for (let fl = 0; fl < floors; fl++) for (let k = 0; k < slots; k++) {
        const along = ((k + 0.5) / slots - 0.5) * (L - 1.2);
        const base = [mid[0] + t[0] * along, 0, mid[2] + t[2] * along];
        if (fl === 0 && k === 0 && !door && L > 3.5) {
          door = true;
          const Bm = new THREE.Matrix4().makeBasis(new THREE.Vector3(...t), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n));
          const garage = b.shop || (rnd() < 0.4 && L > 5);
          const g = new THREE.BoxGeometry(garage ? 2.6 : 1.0, garage ? 2.5 : 2.1, 0.06); g.applyMatrix4(Bm);
          g.translate(base[0] + n[0] * 0.03, garage ? 1.25 : 1.05, base[2] + n[2] * 0.03);
          put(garage ? M.rollup : rnd() < 0.5 ? M.doorBlue : M.doorWood, g, false);
        } else if (rnd() < 0.85) windowAt([base[0], 1.6 + fl * 3.1, base[2]], n, t, 1.1, 1.0, rnd() < 0.6);
      }
    }
  };
  for (const b of MAP.boxes) if (b.mat === 'house') house(b);
  // fora do mapa: casas só a oeste; ao norte o descampado da fábrica, a leste e ao sul o mato atrás das cercas de madeira
  {
    const r2 = rand(99);
    for (let z = S.minZ - 14; z < S.maxZ + 14; z += 7 + r2() * 4) {
      const floors = r2() < 0.45 ? 1 : r2() < 0.8 ? 2 : 3;
      house({ min: [S.minX - 13, 0, z], max: [S.minX - 1.5, 3.1 * floors, z + 6 + r2() * 4], color: (r2() * 1000) | 0, roof: floors === 1 ? 1 : 0, brick: r2() < 0.22 ? 1 : 0 }, false);
    }
    flat(M.grass, S.minX - 1.5, S.minZ - 60, S.maxX + 60, S.minZ, 0.01, 5);
    flat(M.grass, S.maxX, S.minZ, S.maxX + 60, S.maxZ + 60, 0.01, 5);
    flat(M.grass, S.minX - 1.5, S.maxZ, S.maxX, S.maxZ + 60, 0.01, 5);
    for (let x = S.minX; x < S.maxX + 14; x += 4 + r2() * 3) { tree(x, 0, S.maxZ + 3 + r2() * 6, 1.4 + r2() * 0.8); if (r2() < 0.4) palm(x + 1.5, S.maxZ + 2.5 + r2() * 3, 7 + r2() * 4); }
    for (let z = S.minZ; z < S.maxZ; z += 4 + r2() * 3) tree(S.maxX + 2 + r2() * 6, 0, z, 1.4 + r2() * 0.8);
    for (let x = S.minX; x < S.maxX; x += 9 + r2() * 8) tree(x, 0, S.minZ - 6 - r2() * 10, 1.2 + r2() * 0.6);
    woodFence(S.minX, S.maxZ - 0.1, S.maxX, S.maxZ + 0.05, 1.5);   // cerca do outro lado da Vitória Régia
  }

  // ---- campo de futebol (base CT): traves nas pontas compridas
  const C = MAP.areas.campo;
  flat(M.grass, C[0], C[1], C[2], C[3], 0.02, 6);
  const cmx = (C[0] + C[2]) / 2, cmz = (C[1] + C[3]) / 2;
  for (const xx of [C[0] + 3, C[2] - 3]) flat(M.dirt, xx - 2, cmz - 3, xx + 2, cmz + 3, 0.03, 3);
  flat(M.dirt, cmx - 1.5, cmz - 1.5, cmx + 1.5, cmz + 1.5, 0.03, 3);
  for (const xx of [C[0] + 1.2, C[2] - 1.2]) {
    for (const sz of [-1, 1]) box(M.white, xx - 0.06, 0, cmz + sz * 2.5 - 0.06, xx + 0.06, 2.0, cmz + sz * 2.5 + 0.06);
    box(M.white, xx - 0.06, 1.94, cmz - 2.56, xx + 0.06, 2.06, cmz + 2.56);
  }
  // ---- cercas (alambrado do campo) e grades baixas (parquinho)
  for (const b of MAP.boxes) {
    if (b.mat !== 'fence' && b.mat !== 'lowfence') continue;
    const [x0, , z0] = b.min, [x1, h, z1] = b.max;
    const horiz = x1 - x0 > z1 - z0, L = horiz ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const post = b.mat === 'fence' ? M.dark : M.fenceGreen;
    const g = new THREE.PlaneGeometry(L, h);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.5, uv.getY(i) * h / 0.5);
    if (!horiz) g.rotateY(Math.PI / 2);
    g.translate(cx, h / 2, cz); put(M.chain, g, true);
    const n = Math.ceil(L / 2.2);
    for (let k = 0; k <= n; k++) {
      const t = k / n, px = horiz ? x0 + (x1 - x0) * t : cx, pz = horiz ? cz : z0 + (z1 - z0) * t;
      bar(post, [px, 0, pz], [px, h + 0.05, pz], 0.035, true);
    }
    bar(post, horiz ? [x0, h, cz] : [cx, h, z0], horiz ? [x1, h, cz] : [cx, h, z1], 0.025);
  }

  // ---- chão das áreas novas: quadra de areia, trilha de terra, mato
  const AR = MAP.areas;
  flat(M.sand, AR.areia[0], AR.areia[1], AR.areia[2], AR.areia[3], 0.04, 2);
  for (const k of ['trilha']) flat(M.dirt, AR[k][0], AR[k][1], AR[k][2], AR[k][3], 0.03, 2);
  for (const k of ['mato', 'mato2', 'fimPap', 'gram']) flat(M.grass, AR[k][0], AR[k][1], AR[k][2], AR[k][3], 0.03, 4);
  {   // rede de vôlei entre os dois postes
    const q = AR.areia, mx = (q[0] + q[2]) / 2, mz = (q[1] + q[3]) / 2;
    const g = new THREE.PlaneGeometry(7.2, 0.9); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 14, uv.getY(i) * 2);
    g.translate(mx, 1.95, mz); put(M.chain, g, false);
    box(M.white, mx - 3.6, 2.36, mz - 0.02, mx + 3.6, 2.42, mz + 0.02, 1, null, false);
  }

  // ---- praça (bombsite A)
  const P = MAP.areas.praca, PQ = MAP.areas.parq;
  flat(M.concrete, P[0], P[1], P[2], P[3], 0.025, 1.5);
  flat(M.grass, P[0] + 1.6, P[1] + 1.6, P[2] - 1.6, P[3] - 1.6, 0.06, 4);
  flat(M.sand, PQ[0], PQ[1], PQ[2], PQ[3], 0.075, 2);

  // ---- quarteirão da igreja, montado a partir das fotos: fachada com três arcos gradeados, faixa
  // "CREIO NA IGREJA UNA...", frontão com brasão, torre do sino com cruz, anexo com janelas brancas
  // e embasamento de pedra, galeria de arcos do lado da Papoulas, muros brancos e quintais
  const IG = MAP.areas.igreja;
  const part = (p) => MAP.boxes.find(b => b.mat === 'church' && b.part === p);
  const nave = part('nave'), anexo = part('anexo'), torre = part('torre'), galeria = part('galeria');
  const porch = nave ? nave.min[2] + 1.4 : IG[3];
  flat(M.concrete, IG[0], IG[1], IG[2], porch, 0.03, 1.5);      // pátio de concreto (e piso do pórtico)
  flat(M.grass, IG[0], porch, IG[2], IG[3], 0.02, 4);           // quintais por trás dos muros
  // parede com arcos: contorno com os vãos recortados embaixo (u ao longo da parede, v para cima)
  const archShape = (L, H, centers, r, hs) => {
    const s = new THREE.Shape(); s.moveTo(0, 0);
    for (const c of centers) { s.lineTo(c - r, 0); s.lineTo(c - r, hs); s.absarc(c, hs, r, Math.PI, 0, true); s.lineTo(c + r, 0); }
    s.lineTo(L, 0); s.lineTo(L, H); s.lineTo(0, H); s.lineTo(0, 0);
    return s;
  };
  const extrude = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 });
  const arcBars = (mat, c, hs, r, place, rad, n = 10) => {
    for (let k = 0; k < n; k++) { const a0 = Math.PI * k / n, a1 = Math.PI * (k + 1) / n; bar(mat, place(c + Math.cos(a0) * r, hs + Math.sin(a0) * r), place(c + Math.cos(a1) * r, hs + Math.sin(a1) * r), rad); }
  };
  const archGate = (c, r, hs, place) => {   // grade branca dentro do arco
    for (let u = -r + 0.08; u <= r - 0.07; u += 0.13) bar(M.gateWhite, place(c + u, 0), place(c + u, hs + Math.sqrt(Math.max(0, r * r - u * u)) - 0.04), 0.017);
    for (const v of [0.12, 1.05, hs]) bar(M.gateWhite, place(c - r + 0.03, v), place(c + r - 0.03, v), 0.024);
    arcBars(M.gateWhite, c, hs, r - 0.03, place, 0.026);
    arcBars(M.gateWhite, c, hs, r * 0.5, place, 0.018, 8);
  };
  const triFace = (mat, A, C, B, uvs) => {   // triângulo com UV dado (A, C, B em sentido anti-horário visto de fora)
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...C, ...B], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals();
    put(mat, g, false);
  };
  const rake = (mat, ax, ay, bx, by, z, t, d) => {   // moldura inclinada do frontão
    const len = Math.hypot(bx - ax, by - ay), g = new THREE.BoxGeometry(len + t, t, d);
    g.rotateZ(Math.atan2(by - ay, bx - ax)); g.translate((ax + bx) / 2, (ay + by) / 2 + t * 0.35, z); put(mat, g, true);
  };
  const whiteWindow = (c, n, t, w = 0.95, h = 1.25) => {   // janela de moldura branca com vidro escuro e cruz
    const Bm = new THREE.Matrix4().makeBasis(new THREE.Vector3(...t), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n));
    const place = (mat, ox, oy, oz, sx, sy, sz) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.applyMatrix4(Bm); g.translate(c[0] + n[0] * oz + t[0] * ox, c[1] + oy, c[2] + n[2] * oz + t[2] * ox); put(mat, g, false); };
    place(M.churchTrim, 0, 0, 0.04, w + 0.24, h + 0.24, 0.08);
    place(M.glass, 0, 0, 0.085, w, h, 0.02);
    place(M.churchTrim, 0, 0, 0.1, 0.05, h, 0.03); place(M.churchTrim, 0, h * 0.15, 0.1, w, 0.05, 0.03);
    place(M.churchTrim, 0, -h / 2 - 0.16, 0.1, w + 0.4, 0.08, 0.2);
  };
  const statue = (x, y, z) => {   // imagem branca sobre pedestal
    box(M.churchTrim, x - 0.17, y, z - 0.17, x + 0.17, y + 0.24, z + 0.17);
    cyl(M.churchTrim, x, y + 0.24, z, 0.16, 0.09, 0.62, 10);
    put(M.churchTrim, xform(new THREE.SphereGeometry(0.1, 10, 8), [x, y + 0.96, z]), true);
  };
  if (nave) {
    const [x0, , zf] = nave.min, [x1, H, z1] = nave.max, wd = x1 - x0;
    const r = 0.95, hs = 2.45, centers = [wd / 6, wd / 2, wd * 5 / 6];
    const fg = extrude(archShape(wd, H, centers, r, hs), 0.3); fg.translate(x0, 0, zf); put(M.churchWall, fg, true);
    box(M.churchWall, x0, 0, porch, x1, H, z1, 1);                                     // corpo da nave
    box(M.churchWall, x0, 0, zf + 0.3, x0 + 0.3, H, porch, 1); box(M.churchWall, x1 - 0.3, 0, zf + 0.3, x1, H, porch, 1);
    box(M.churchShade, x0 + 0.3, 0, porch - 0.04, x1 - 0.3, hs + r + 0.1, porch, 1, null, false);   // fundo do pórtico
    box(M.churchShade, x0 + 0.3, hs + r + 0.05, zf + 0.3, x1 - 0.3, H, porch, 1, null, false);       // forro do pórtico
    for (const c of centers) {
      archGate(c, r, hs, (u, v) => [x0 + u, v, zf + 0.16]);
      arcBars(M.churchTrim, c, hs, r + 0.07, (u, v) => [x0 + u, v, zf - 0.04], 0.07, 12);
    }
    for (const u of [0.22, wd / 3, wd * 2 / 3, wd - 0.22]) {   // pilastras brancas e lampiões
      const x = x0 + u;
      box(M.churchTrim, x - 0.22, 0, zf - 0.08, x + 0.22, 3.85, zf + 0.01, 1, null, true);
      box(M.dark, x - 0.1, 2.3, zf - 0.34, x + 0.1, 2.72, zf - 0.12, 1, null, false);
      box(M.lamp, x - 0.08, 2.36, zf - 0.32, x + 0.08, 2.66, zf - 0.14, 1, null, false);
      box(M.dark, x - 0.12, 2.72, zf - 0.36, x + 0.12, 2.78, zf - 0.1, 1, null, false);
    }
    // faixa azul com letreiro entre molduras brancas, cornija contornando a nave
    box(M.churchTrim, x0 - 0.1, 3.85, zf - 0.14, x1 + 0.1, 4.0, zf + 0.01, 1, null, false);
    { const g = new THREE.BoxGeometry(wd - 0.2, 0.84, 0.04); g.translate((x0 + x1) / 2, 4.43, zf - 0.03); put(M.band, g, false); }
    box(M.churchTrim, x0 - 0.1, 4.86, zf - 0.14, x1 + 0.1, 5.02, zf + 0.01, 1, null, false);
    box(M.churchTrim, x0 - 0.3, H - 0.28, zf - 0.32, x1 + 0.3, H, z1 + 0.05, 1);
    // frontão: triângulo com textura (brasão), molduras inclinadas e telhado de duas águas atrás
    const PH = 2.6, px0 = x0 - 0.25, px1 = x1 + 0.25, pm = (x0 + x1) / 2;
    const triS = new THREE.Shape(); triS.moveTo(0, 0); triS.lineTo(px1 - px0, 0); triS.lineTo((px1 - px0) / 2, PH); triS.lineTo(0, 0);
    const tg = extrude(triS, 0.45); tg.translate(px0, H, zf - 0.15); put(M.churchWall, tg, true);
    triFace(M.pediment, [px0 + 0.05, H + 0.02, zf - 0.17], [pm, H + PH - 0.04, zf - 0.17], [px1 - 0.05, H + 0.02, zf - 0.17], [1, 0, 0.5, 1, 0, 0]);
    rake(M.churchTrim, px0 - 0.1, H, pm, H + PH, zf - 0.1, 0.2, 0.6);
    rake(M.churchTrim, pm, H + PH, px1 + 0.1, H, zf - 0.1, 0.2, 0.6);
    gable(x0 - 0.3, zf + 0.25, x1 + 0.3, z1 + 0.3, H, true, PH - 0.15);
    statue(px0 + 0.4, H, zf - 0.08); statue(px1 - 0.55, H, zf - 0.08);
  }
  if (torre) {
    const [x0, , z0] = torre.min, [x1, , z1] = torre.max, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, TH = 9.6;
    box(M.churchWall, x0, 0, z0, x1, TH, z1, 1);
    const corners = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]];
    for (const [cx, cz] of corners) box(M.churchTrim, cx - 0.14, 0, cz - 0.14, cx + 0.14, TH, cz + 0.14, 1, null, false);
    for (const y of [5.32, TH - 0.25]) box(M.churchTrim, x0 - 0.1, y, z0 - 0.1, x1 + 0.1, y + 0.28, z1 + 0.1, 1, null, false);
    box(M.crossGrey, mx - 0.07, 5.9, z0 - 0.03, mx + 0.07, 9.0, z0, 1, null, false);      // cruz em relevo
    box(M.crossGrey, mx - 0.55, 8.05, z0 - 0.03, mx + 0.55, 8.19, z0, 1, null, false);
    // campanário aberto com o sino, tampa, pirâmide e cruz
    box(M.churchTrim, x0 - 0.15, TH, z0 - 0.15, x1 + 0.15, TH + 0.22, z1 + 0.15);
    for (const [cx, cz] of corners) { const ix = cx + (cx < mx ? 0.2 : -0.2), iz = cz + (cz < mz ? 0.2 : -0.2); box(M.churchTrim, ix - 0.17, TH + 0.22, iz - 0.17, ix + 0.17, TH + 2.1, iz + 0.17); }
    box(M.churchTrim, x0 - 0.12, TH + 2.1, z0 - 0.12, x1 + 0.12, TH + 2.32, z1 + 0.12);
    const bell = new THREE.LatheGeometry([[0.38, 0], [0.34, 0.07], [0.26, 0.22], [0.22, 0.45], [0.13, 0.58], [0, 0.61]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
    put(M.bronze, xform(bell, [mx, TH + 0.95, mz]), true);
    bar(M.dark, [x0 + 0.2, TH + 1.62, mz], [x1 - 0.2, TH + 1.62, mz], 0.05);
    put(M.churchWall, xform(new THREE.ConeGeometry((x1 - x0) * 0.68, 0.55, 4), [mx, TH + 2.6, mz], Math.PI / 4), true);
    box(M.churchTrim, mx - 0.05, TH + 2.85, mz - 0.05, mx + 0.05, TH + 4.1, mz + 0.05);
    box(M.churchTrim, mx - 0.3, TH + 3.55, mz - 0.05, mx + 0.3, TH + 3.65, mz + 0.05);
  }
  if (anexo) {
    const [x0, , z0] = anexo.min, [x1, H, z1] = anexo.max;
    box(M.churchWall, x0, 0, z0, x1, H, z1, 1);
    box(M.stone, x0 - 0.04, 0, z0 - 0.04, x1, 0.7, z1, 1, null, false);
    box(M.churchTrim, x0 - 0.1, H - 0.25, z0 - 0.1, x1, H, z1, 1, null, false);
    for (const u of [1.25, 3.55]) whiteWindow([x0 + u, 2.05, z0], [0, 0, -1], [1, 0, 0]);
    for (const u of [1.6, 4.3]) whiteWindow([x0, 2.05, z0 + u], [-1, 0, 0], [0, 0, 1]);
    const gx0 = x0 - 0.15, gx1 = x1 + 0.05, gm = (gx0 + gx1) / 2, GR = 1.2;
    gable(gx0, z0 - 0.15, gx1, z1, H, true, GR);
    triFace(M.churchWall, [gx0 + 0.1, H, z0 - 0.17], [gm, H + GR - 0.08, z0 - 0.17], [gx1 - 0.1, H, z0 - 0.17], [gx0, H, gm, H + GR, gx1, H]);
    rake(M.churchTrim, gx0, H, gm, H + GR, z0 - 0.15, 0.14, 0.3);
    rake(M.churchTrim, gm, H + GR, gx1, H, z0 - 0.15, 0.14, 0.3);
  }
  if (galeria) {   // arcos virados para a Rua Papoulas (foto 9), atrás do muro branco
    const [x0, , z0] = galeria.min, [x1, , z1] = galeria.max, L = z1 - z0, GH = 3.6, r = 0.85, hs = 1.9;
    const centers = [L / 8, L * 3 / 8, L * 5 / 8, L * 7 / 8];
    const g = extrude(archShape(L, GH, centers, r, hs), 0.3); g.rotateY(-Math.PI / 2); g.translate(x1, 0, z0); put(M.churchWall, g, true);
    box(M.churchShade, x0, 0, z0, x0 + 0.03, GH, z1, 1, null, false);
    box(M.churchShade, x0, hs + r + 0.1, z0, x1 - 0.3, GH, z1, 1, null, false);
    box(M.churchWall, x0, 0, z1 - 0.3, x1 - 0.3, GH, z1, 1);
    box(M.churchTrim, x1 - 0.02, GH - 0.15, z0, x1 + 0.1, GH, z1, 1, null, false);
    for (const c of centers) arcBars(M.churchTrim, c, hs, r + 0.06, (u, v) => [x1 + 0.04, v, z0 + u], 0.06, 10);
    const R = [[x0, GH + 1.0, z0], [x1 + 0.35, GH, z0], [x1 + 0.35, GH, z1], [x0, GH + 1.0, z1]];
    for (const i of [0, 1, 2, 0, 2, 3]) roofTri.push(...R[i]);
  }


  // ---- props sólidos (desenho das caixas de colisão)
  for (const b of MAP.boxes) {
    const [x0, y0, z0] = b.min, [x1, y1, z1] = b.max, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = y1 - y0;
    switch (b.mat) {
      case 'crate': box(M.crate, x0, y0, z0, x1, y1, z1, x1 - x0); break;
      case 'post': if (h > 2.2) cyl(M.white, cx, 0, cz, 0.05, 0.05, h, 8); break;   // postes da rede de vôlei (as traves do campo são desenhadas à parte)
      case 'swing': {
        for (const sz of [-1, 1]) { const fz = cz + sz * 1.6; bar(M.yellow, [cx - 0.8, 0, fz], [cx, 2.3, fz], 0.05, true); bar(M.yellow, [cx + 0.8, 0, fz], [cx, 2.3, fz], 0.05, true); }
        bar(M.yellow, [cx, 2.3, cz - 1.65], [cx, 2.3, cz + 1.65], 0.055, true);
        for (const sz of [-0.7, 0.7]) { box(M.dark, cx - 0.12, 0.48, cz + sz - 0.22, cx + 0.12, 0.52, cz + sz + 0.22); bar(M.alu, [cx, 0.5, cz + sz - 0.2], [cx, 2.3, cz + sz - 0.2], 0.012); bar(M.alu, [cx, 0.5, cz + sz + 0.2], [cx, 2.3, cz + sz + 0.2], 0.012); }
        break;
      }
      case 'slide': {
        box(M.blueToy, cx - 0.5, 1.35, z0, cx + 0.5, 1.45, z0 + 1.0);
        for (const sx of [-0.45, 0.45]) for (const zz of [z0, z0 + 1.0]) bar(M.blueToy, [cx + sx, 0, zz], [cx + sx, 2.2, zz], 0.04, true);
        const s = new THREE.BoxGeometry(0.6, 0.05, 2.0); s.rotateX(0.6); s.translate(cx, 0.75, z0 + 1.8); put(M.red, s, true);
        break;
      }
      case 'table': cyl(M.concrete, cx, 0, cz, 0.25, 0.25, 0.75); cyl(M.concrete, cx, 0.72, cz, 0.6, 0.6, 0.08, 16); for (let k = 0; k < 4; k++) cyl(M.concrete, cx + Math.cos(k * Math.PI / 2) * 0.95, 0, cz + Math.sin(k * Math.PI / 2) * 0.95, 0.18, 0.18, 0.45, 8); break;
      case 'bench': {
        const bm = b.blue ? M.blueMetal : M.wood;
        box(bm, x0, 0.42, z0, x1, 0.48, z1);
        if (x1 - x0 > z1 - z0) { box(bm, x0, 0.48, z1 - 0.06, x1, 0.85, z1); for (const xx of [x0 + 0.15, x1 - 0.15]) box(M.dark, xx - 0.03, 0, z0 + 0.05, xx + 0.03, 0.42, z1 - 0.05); }
        else { box(bm, x1 - 0.06, 0.48, z0, x1, 0.85, z1); for (const zz of [z0 + 0.15, z1 - 0.15]) box(M.dark, x0 + 0.05, 0, zz - 0.03, x1 - 0.05, 0.42, zz + 0.03); }
        break;
      }
      case 'bollard': cyl(M.white, cx, 0, cz, 0.11, 0.1, 0.75, 10); break;
      case 'trash': cyl(M.beige, cx, 0, cz, 0.22, 0.26, 0.85, 14); cyl(M.dark, cx, 0.85, cz, 0.27, 0.27, 0.06, 14); break;
      case 'sign':
        bar(M.alu, [cx, 0, cz], [cx, 2.62, cz], 0.04, true);
        put(M.sign, xform(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24), [cx, 2.3, cz - 0.06], 0, Math.PI / 2), false);
        put(M.alu, xform(new THREE.CylinderGeometry(0.325, 0.325, 0.02, 24), [cx, 2.3, cz - 0.035], 0, Math.PI / 2), false);   // verso cinza
        break;
      case 'palm': palm(cx, cz, b.ph || 8); break;
      case 'stage': box(M.redStep, x0, 0, z0, x1, 0.25, z1, 1); box(M.concrete, x0 + 0.35, 0, z0 + 0.35, x1 - 0.35, h, z1 - 0.35, 1.5); break;
      case 'muro':
        box(M.grime, x0, 0, z0, x1, y1, z1, 2.5, 0xeeeee8);
        box(M.grime, x0 - 0.05, y1, z0 - 0.05, x1 + 0.05, y1 + 0.08, z1 + 0.05, 2.5, 0xd8d8d0, false);
        break;
      case 'gate': {
        const alongZ = z1 - z0 > x1 - x0, L = alongZ ? z1 - z0 : x1 - x0;
        const g = new THREE.PlaneGeometry(L - 0.12, h - 0.12); if (alongZ) g.rotateY(Math.PI / 2); g.translate(cx, h / 2, cz); put(M.gateBlue, g, true);
        if (alongZ) {
          for (const zz of [z0, z1 - 0.08, cz - 0.04]) box(M.blueMetal, cx - 0.05, 0, zz, cx + 0.05, h, zz + 0.08, 1, null, false);
          for (const yy of [0, h - 0.07]) box(M.blueMetal, cx - 0.04, yy, z0, cx + 0.04, yy + 0.07, z1, 1, null, false);
        } else {
          for (const xx of [x0, x1 - 0.08, cx - 0.04]) box(M.blueMetal, xx, 0, cz - 0.05, xx + 0.08, h, cz + 0.05, 1, null, false);
          for (const yy of [0, h - 0.07]) box(M.blueMetal, x0, yy, cz - 0.04, x1, yy + 0.07, cz + 0.04, 1, null, false);
        }
        break;
      }
      case 'car': drawCar(b); break;
      case 'shop': drawShop(b); break;
      case 'curb': box(M.concrete, x0, 0, z0, x1, y1, z1, 1); break;
      case 'woodfence': woodFence(x0, z0, x1, z1, h); break;
      case 'assembleia': drawAssembleia(b); break;
      case 'arena': drawArena(b); break;
      case 'planter': box(M.concrete, x0, 0, z0, x1, 0.5, z1); tree(cx, 0.5, cz, 1.1); break;
      case 'shrine': box(M.white, x0, 0, z0, x1, 1.9, z1, 1); box(M.church, cx - 0.3, 0.7, z0 - 0.02, cx + 0.3, 1.5, z0); gable(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, 1.9, true, 0.6); break;
      case 'ptable':
        box(M.yellow, x0, 0.71, z0, x1, 0.75, z1, 1, null, false); box(M.yellow, cx - 0.03, 0, cz - 0.03, cx + 0.03, 0.71, cz + 0.03, 1, null, false);
        for (let k = 0; k < 4; k++) { const ox = cx + Math.cos(k * Math.PI / 2) * 0.7, oz = cz + Math.sin(k * Math.PI / 2) * 0.7; box(M.red, ox - 0.2, 0, oz - 0.2, ox + 0.2, 0.44, oz + 0.2, 1, null, false); }
        break;
      case 'dumpster': box(M.orange, x0, 0, z0, x1, h, z1); box(M.dirt, x0 + 0.1, h, z0 + 0.1, x1 - 0.1, h + 0.25, z1 - 0.1, 1, null, false); break;
      case 'brickwall':
        if (!b.steps) { box(M.brick, x0, 0, z0, x1, h, z1, 1, 0xffffff); break; }
        {   // muro em obra: fiadas de cima irregulares
          const alongZ = z1 - z0 > x1 - x0, L = alongZ ? z1 - z0 : x1 - x0, n = Math.ceil(L / 0.4);
          box(M.brick, x0, 0, z0, x1, h - 0.24, z1, 1, 0xffffff);
          for (let k = 0; k < n; k++) {
            const a = k * L / n, e = Math.min(L, a + L / n), top = h - [0, 0.12, 0, 0.24, 0.12, 0][k % 6];
            if (alongZ) box(M.brick, x0, h - 0.24, z0 + a, x1, top, z0 + e, 1, 0xffffff); else box(M.brick, x0 + a, h - 0.24, z0, x0 + e, top, z1, 1, 0xffffff);
          }
        }
        break;
      case 'bricks':
        box(M.brick, x0, 0, z0, x1, h * 0.6, z1, 1, 0xffffff);
        box(M.brick, x0 + 0.08, h * 0.6, z0 + 0.12, x1 - 0.15, h, z1 - 0.05, 1, 0xffffff);
        break;
      case 'sandpile': put(M.sand, xform(new THREE.ConeGeometry(1.4, 1.0, 12), [cx, 0.5, cz]), true); break;
      case 'pole': {
        box(M.concrete, x0, 0, z0, x1, y1, z1, 1);
        const along = b.axis === 'z' ? [0, 0, 1] : [1, 0, 0];
        bar(M.concrete, [cx - along[0] * 0.8, y1 - 0.4, cz - along[2] * 0.8], [cx + along[0] * 0.8, y1 - 0.4, cz + along[2] * 0.8], 0.05);
        break;
      }
    }
  }
  // ---- fios entre os postes vizinhos
  const poles = MAP.poles || [];
  const lineGeo = [];
  for (let i = 0; i < poles.length; i++) for (let j = i + 1; j < poles.length; j++) {
    const [ax, az, ah] = poles[i], [bx, bz, bh] = poles[j];
    if (ah !== bh) continue;
    const d = Math.hypot(ax - bx, az - bz);
    if (d > 26 || (ah && Math.abs(az - bz) > 0.5) || (!ah && Math.abs(ax - bx) > 0.5)) continue;
    for (const [off, sag] of [[-0.7, 0.5], [0, 0.6], [0.7, 0.5], [-0.3, 0.9]]) {
      const o = ah ? [0, 0, off] : [off, 0, 0];
      for (let k = 0; k < 12; k++) {
        const t0 = k / 12, t1 = (k + 1) / 12;
        const p = (t) => [ax + (bx - ax) * t + o[0], 8.1 - Math.sin(t * Math.PI) * sag, az + (bz - az) * t + o[2]];
        lineGeo.push(...p(t0), ...p(t1));
      }
    }
  }
  if (lineGeo.length) { const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lineGeo, 3)); group.add(new THREE.LineSegments(lg, M.cable)); }

  // ---- árvores e coqueiros
  function tree(x, y, z, size = 1) {
    cyl(M.trunk, x, y, z, 0.22 * size, 0.15 * size, 3.2 * size, 8);
    const r3 = rand((x * 100 + z * 7) | 0 || 3);
    for (let i = 0; i < 5; i++) {
      const c = [x + (r3() - 0.5) * 2 * size, y + 3.2 * size + r3() * 1.4 * size, z + (r3() - 0.5) * 2 * size];
      for (let k = 0; k < 3; k++) { const g = new THREE.PlaneGeometry(3.2 * size, 3.0 * size); g.rotateY(k * Math.PI / 3 + i); g.translate(...c); put(M.foliage, g, true); }
    }
  }
  function palm(x, z, h) {
    const lean = [(Math.sin(x * 3.1) * 0.5), 0, (Math.cos(z * 2.3) * 0.5)];
    let prev = [x, 0, z];
    for (let i = 1; i <= 6; i++) {
      const t = i / 6, cur = [x + lean[0] * t * t * 2, h * t, z + lean[2] * t * t * 2];
      const d = new THREE.Vector3(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
      const g = new THREE.CylinderGeometry(0.24 - 0.07 * t, 0.24 - 0.07 * (t - 1 / 6), d.length(), 8);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
      g.translate((cur[0] + prev[0]) / 2, (cur[1] + prev[1]) / 2, (cur[2] + prev[2]) / 2);
      put(M.trunk, g, true); prev = cur;
    }
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2 + Math.sin(i * 7) * 0.2, tilt = 0.15 + ((i * 37) % 10) / 25;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const mid = new THREE.Vector3(...prev).addScaledVector(dir, 1.4).add(new THREE.Vector3(0, 0.6 - tilt, 0));
      const tip = new THREE.Vector3(...prev).addScaledVector(dir, 3.0).add(new THREE.Vector3(0, -0.4 - tilt * 1.5, 0));
      for (const [pa, pb] of [[new THREE.Vector3(...prev), mid], [mid, tip]]) {
        const d = pb.clone().sub(pa);
        const g = new THREE.PlaneGeometry(1.1, d.length());
        const side = d.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
        const up = side.clone().cross(d).normalize();
        g.applyMatrix4(new THREE.Matrix4().makeBasis(side, d.clone().normalize(), up));
        g.translate((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, (pa.z + pb.z) / 2);
        put(M.frond, g, true);
      }
    }
  }
  tree(C[0] - 0.8, 0, C[1] + 4, 1.3);

  // ---- carros estacionados (a caixa de colisão vem do mapa; o desenho segue o comprimento dela)
  function drawCar(b) {
    const [x0, , z0] = b.min, [x1, , z1] = b.max, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const alongZ = z1 - z0 > x1 - x0, L = alongZ ? z1 - z0 : x1 - x0, Wd = alongZ ? x1 - x0 : z1 - z0;
    const m = new THREE.Matrix4().makeRotationY(alongZ ? (b.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : 0).setPosition(cx, 0, cz);
    const part = (mat, ax, ay, az, bx, by, bz, color = null) => { const g = boxGeo(ax, ay, az, bx, by, bz, 1, color); g.applyMatrix4(m); put(mat, g, true); };
    const wheel = (x, z) => {
      const g = new THREE.CylinderGeometry(0.31, 0.31, 0.22, 16); g.rotateX(Math.PI / 2); g.translate(x, 0.31, z); g.applyMatrix4(m); put(M.tire, g, true);
      const h = new THREE.CylinderGeometry(0.17, 0.17, 0.24, 12); h.rotateX(Math.PI / 2); h.translate(x, 0.31, z); h.applyMatrix4(m); put(M.alu, h, false);
    };
    const hw = Wd / 2, hl = L / 2, col = b.hex ?? 0xb8bcc0;
    if (b.kind === 'kombi') {   // Kombi: caixote alto, faixa de vidro e frente reta
      part(M.paint, -hl, 0.3, -hw, hl, 1.08, hw, col);
      part(M.glass, -hl + 0.15, 1.08, -hw + 0.03, hl - 0.05, 1.58, hw - 0.03);
      part(M.paint, -hl, 1.58, -hw, hl, 1.92, hw, 0xf4f2ec);
      for (const u of [-hl + 1.1, -hl + 2.0, hl - 1.3]) part(M.paint, u - 0.05, 1.08, -hw, u + 0.05, 1.58, hw, 0xf4f2ec);
      part(M.paint, hl - 0.06, 0.3, -hw, hl + 0.02, 1.08, hw, 0xd8d4c8);
    } else {
      // caixa com o topo encolhido: para-brisa e vidro traseiro inclinados, laterais puxadas para dentro
      const taper = (mat, ax, ay, bx, by, w, front, rear, side, color = null) => {
        const g = boxGeo(ax, ay, -w, bx, by, w, 1, color), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) if (p.getY(i) > (ay + by) / 2) { p.setX(i, p.getX(i) > (ax + bx) / 2 ? p.getX(i) - front : p.getX(i) + rear); p.setZ(i, p.getZ(i) * side); }
        g.computeVertexNormals(); g.applyMatrix4(m); put(mat, g, true);
      };
      taper(M.paint, -hl, 0.32, hl, 0.86, hw, 0.12, 0.08, 0.97, col);                        // carroceria
      taper(M.glass, -hl + 0.45, 0.86, hl - 1.0, 1.34, hw - 0.08, 0.5, 0.32, 0.86);         // cabine de vidro
      taper(M.paint, -hl + 0.77, 1.34, hl - 1.5, 1.42, (hw - 0.08) * 0.86, 0.03, 0.03, 0.98, col);   // teto
    }
    part(M.dark, hl - 0.04, 0.28, -hw + 0.05, hl + 0.06, 0.52, hw - 0.05); part(M.dark, -hl - 0.06, 0.28, -hw + 0.05, -hl + 0.04, 0.52, hw - 0.05);   // para-choques
    for (const s of [-1, 1]) { part(M.headlight, hl - 0.02, 0.62, s * (hw - 0.3) - 0.17, hl + 0.03, 0.76, s * (hw - 0.3) + 0.17); part(M.taillight, -hl - 0.03, 0.62, s * (hw - 0.25) - 0.13, -hl + 0.02, 0.8, s * (hw - 0.25) + 0.13); }
    for (const u of [hl - 0.78, -hl + 0.78]) for (const s of [-1, 1]) wheel(u, s * (hw - 0.07));
  }
  // ---- lojinhas da Papoulas (fotos 7 a 9): fachada vermelha, portas de enrolar, cobertura de zinco
  function drawShop(b) {
    const [x0, , z0] = b.min, [x1, h, z1] = b.max, cz = (z0 + z1) / 2, L = z1 - z0;
    if (b.thatch) {   // barraca coberta de palha com pallets na frente
      for (const [px, pz] of [[x0 + 0.1, z0 + 0.1], [x0 + 0.1, z1 - 0.1], [x1 - 0.1, z0 + 0.1], [x1 - 0.1, z1 - 0.1]]) bar(M.wood, [px, 0, pz], [px, h + 0.3, pz], 0.07, true);
      box(M.wood, x0 + 0.5, 0, z0 + 0.1, x1 - 0.1, h - 0.4, z1 - 0.1, 1);
      for (let y = 0.1; y < 1.3; y += 0.16) box(M.wood, x0 - 0.02, y, z0 + 0.15, x0 + 0.12, y + 0.1, z1 - 0.15, 1, null, false);
      const g = new THREE.BoxGeometry(x1 - x0 + 1.2, 0.35, L + 0.4); g.rotateZ(0.12); g.translate((x0 + x1) / 2 - 0.4, h + 0.2, cz); put(M.straw, g, true);
      const f = new THREE.PlaneGeometry(L + 0.4, 1.0); f.rotateY(-Math.PI / 2); f.translate(x0 - 0.95, h - 0.35, cz); put(M.straw, f, true);   // franja de palha
      return;
    }
    house({ min: [x0, 0, z0], max: [x1, h, z1], hex: b.hex, color: 0, roof: 0, brick: 0 }, false);
    const n = Math.max(1, Math.round(L / 2.8)), dw = Math.min(2.4, L / n - 0.5);
    for (let k = 0; k < n; k++) {
      const zc = z0 + (k + 0.5) * L / n;
      box(M.rollup, x0 - 0.05, 0, zc - dw / 2, x0, 2.45, zc + dw / 2, 1, null, false);
      box(M.dark, x0 - 0.09, 2.45, zc - dw / 2 - 0.08, x0, 2.6, zc + dw / 2 + 0.08, 1, null, false);
    }
    const R = [[x0 + 0.3, h - 0.05, z0], [x0 - 1.15, h - 0.4, z0], [x0 - 1.15, h - 0.4, z1], [x0 + 0.3, h - 0.05, z1]];   // cobertura de zinco
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap(i => R[i]), 3)); g.computeVertexNormals(); put(M.zinc, g, true);
    if (b.awning) {   // toldo azul esticado sobre a calçada
      const t = new THREE.BufferGeometry(), A = [[x0, 2.65, z0 + 0.3], [x0 - 2.2, 2.25, z0 + 0.3], [x0 - 2.2, 2.25, z1 - 0.3], [x0, 2.65, z1 - 0.3]];
      t.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap(i => A[i]), 3)); t.computeVertexNormals(); put(M.tarp, t, true);
      for (const zz of [z0 + 0.35, z1 - 0.35]) bar(M.alu, [x0 - 2.15, 0, zz], [x0 - 2.15, 2.27, zz], 0.025, true);
    }
  }

  // ---- cerca de ripas de madeira com mourões
  function woodFence(x0, z0, x1, z1, h) {
    const alongZ = z1 - z0 > x1 - x0, L = alongZ ? z1 - z0 : x1 - x0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const g = new THREE.PlaneGeometry(L, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 1.6, uv.getY(i));
    if (alongZ) g.rotateY(Math.PI / 2); g.translate(cx, h / 2, cz); put(M.woodFence, g, true);
    const n = Math.max(1, Math.round(L / 2.4));
    for (let k = 0; k <= n; k++) { const t = k / n, px = alongZ ? cx : x0 + (x1 - x0) * t, pz = alongZ ? z0 + (z1 - z0) * t : cz; box(M.wood, px - 0.06, 0, pz - 0.06, px + 0.06, h + 0.1, pz + 0.06, 1, null, true); }
  }
  // ---- Igreja Assembleia de Deus (fotos 4, 6, 7 e 8): frente bege com grades brancas, asa branca inclinada,
  // placa azul, tijolos de vidro; fundos bege de dois andares para a Cravos
  function drawAssembleia(b) {
    const [x0, , z0] = b.min, [x1, h, z1] = b.max;
    box(M.plaster, x0, 0, z0, x1, h, z1, 2.5, 0xf4f4f0);
    box(M.plaster, x0 - 0.06, h, z0 - 0.06, x1 + 0.06, h + 0.35, z1 + 0.06, 2.5, 0xe6e6e0, false);
    box(M.plaster, x0 + 0.3, 0, z0 - 0.08, x1 - 4.2, 3.7, z0, 2.5, 0xd9c7a6);
    for (let k = 0; k < 3; k++) {
      const cx = x0 + 1.6 + k * 2.2;
      box(M.glass, cx - 0.8, 0.2, z0 - 0.11, cx + 0.8, 2.9, z0 - 0.08, 1, null, false);
      for (let u = -0.75; u <= 0.76; u += 0.11) bar(M.gateWhite, [cx + u, 0.15, z0 - 0.17], [cx + u, 2.95, z0 - 0.17], 0.02);
      for (const v of [0.15, 1.5, 2.95]) bar(M.gateWhite, [cx - 0.8, v, z0 - 0.17], [cx + 0.8, v, z0 - 0.17], 0.025);
    }
    const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0, h + 0.35); tri.lineTo(-5.6, h + 0.35); tri.lineTo(0, 0);
    const wg = extrude(tri, 0.7); wg.translate(x1, 0, z0 - 0.7); put(M.white, wg, true);
    { const g = new THREE.BoxGeometry(7.2, 1.6, 0.08); g.rotateY(Math.PI); g.rotateZ(-0.12); g.translate(x1 - 4.6, 5.1, z0 - 0.8); put(M.assembleiaSign, g, false); }
    for (const [a, c, y] of [[0.4, 1.0, 4.0], [1.0, 1.6, 4.6], [1.6, 2.2, 5.2]]) box(M.glassBlock, x0 + a, y, z0 - 0.05, x0 + c, 6.9, z0 + 0.01, 0.6, null, false);
    for (const [a, c, y] of [[1.0, 1.6, 3.8], [1.6, 2.2, 4.4], [2.2, 2.8, 5.0]]) box(M.glassBlock, x0 - 0.05, y, z0 + a, x0 + 0.01, 6.9, z0 + c, 0.6, null, false);
    for (let fl = 0; fl < 2; fl++) for (const u of [4.5, 7.5, 10.5]) windowAt([x0, 1.6 + fl * 3.3, z0 + u], [-1, 0, 0], [0, 0, 1], 1.1, 1.0, fl === 0);
    // lado da quadra de areia (fotos 6 e 7): bege, janelas e aparelhos de ar
    box(M.plaster, x1, 0, z0 + 2.2, x1 + 0.05, h, z1, 2.5, 0xdccdae);
    for (let fl = 0; fl < 2; fl++) for (let k = 0; k < 4; k++) {
      const wz = z0 + 3.4 + k * 2.6;
      windowAt([x1 + 0.05, 1.6 + fl * 3.3, wz], [1, 0, 0], [0, 0, 1], 1.2, 1.0, fl === 0);
      if ((k + fl) % 2) box(M.white, x1 + 0.05, 1.3 + fl * 3.3, wz + 0.75, x1 + 0.3, 1.8 + fl * 3.3, wz + 1.5, 1, null, true);
    }
  }
  // ---- Arena coberta (fotos 5 e 6): muro branco, alambrado e teto escuro em arco
  function drawArena(b) {
    const [x0, , z0] = b.min, [x1, , z1] = b.max, WH = 2.8, NH = 4.6, mx = (x0 + x1) / 2, R = (x1 - x0) / 2 * 1.05, rise = 2.4;
    for (const [a, c, d, e] of [[x0, z0, x1, z0 + 0.25], [x0, z1 - 0.25, x1, z1], [x0, z0, x0 + 0.25, z1], [x1 - 0.25, z0, x1, z1]]) box(M.plaster, a, 0, c, d, WH, e, 2.5, 0xf2f2ee);
    flat(M.courtGreen, x0 + 0.25, z0 + 0.25, x1 - 0.25, z1 - 0.25, 0.03, 2);
    const net = (L, rotY, cx, cz) => { const g = new THREE.PlaneGeometry(L, NH - WH); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.5, uv.getY(i) * (NH - WH) / 0.5); g.rotateY(rotY); g.translate(cx, (WH + NH) / 2, cz); put(M.chain, g, false); };
    net(x1 - x0, 0, mx, z0); net(x1 - x0, 0, mx, z1); net(z1 - z0, Math.PI / 2, x0, (z0 + z1) / 2); net(z1 - z0, Math.PI / 2, x1, (z0 + z1) / 2);
    const arc = (a) => [mx - R * Math.cos(a), NH + rise * Math.sin(a)], seg = 20, V = [];
    for (let k = 0; k < seg; k++) {
      const [xa, ya] = arc(Math.PI * k / seg), [xb, yb] = arc(Math.PI * (k + 1) / seg);
      V.push(xa, ya, z0 - 0.4, xb, yb, z0 - 0.4, xb, yb, z1 + 0.4, xa, ya, z0 - 0.4, xb, yb, z1 + 0.4, xa, ya, z1 + 0.4);
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); rg.computeVertexNormals(); put(M.arenaRoof, rg, true);
    for (let z = z0 - 0.3; z <= z1 + 0.35; z += (z1 - z0 + 0.6) / 6) for (let k = 0; k < seg; k += 2) { const [xa, ya] = arc(Math.PI * k / seg), [xb, yb] = arc(Math.PI * (k + 2) / seg); bar(M.dark, [xa, ya - 0.05, z], [xb, yb - 0.05, z], 0.04); }
    for (const zz of [z0, z1]) {   // tela nas pontas do arco
      const s = new THREE.Shape(); s.moveTo(-R, 0); for (let k = 1; k <= seg; k++) { const a = Math.PI * k / seg; s.lineTo(-R * Math.cos(a), rise * Math.sin(a)); } s.lineTo(-R, 0);
      const g = new THREE.ShapeGeometry(s); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
      g.translate(mx, NH, zz); put(M.chain, g, false);
    }
    { const g = new THREE.BoxGeometry(6.4, 1.6, 0.04); g.translate(mx + 0.6, 1.45, z1 + 0.03); put(M.arenaLogo, g, false); }   // escudo e nome para a Cravos
    const cob = (g) => put(M.cobogo, g, true);
    { const g = new THREE.PlaneGeometry(2.6, 2.2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 5); g.translate(x0 + 1.6, 1.4, z1 + 0.04); cob(g); }
    { const g = new THREE.PlaneGeometry(3.2, 2.2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * 5); g.rotateY(-Math.PI / 2); g.translate(x0 - 0.04, 1.4, z0 + 3); cob(g); }
    for (let u = 0; u <= 1.1; u += 0.1) bar(M.gateWhite, [x0 - 0.06, 0, z1 - 2.6 + u], [x0 - 0.06, 2.3, z1 - 2.6 + u], 0.018);   // portão de grade para a trilha
    box(M.blueMetal, x0 - 0.08, 0, z1 - 2.7, x0 - 0.02, 0.6, z1 - 1.4, 1, null, false);
  }

  // ---- enfeites sem colisão: cones, árvores grandes dos quintais, guindaste do estaleiro ao fundo
  for (const d of MAP.decor || []) {
    if (d.type === 'cone') {
      put(M.orange, xform(new THREE.ConeGeometry(0.17, 0.62, 14), [d.x, 0.35, d.z]), true);
      for (const y of [0.32, 0.47]) put(M.white, xform(new THREE.CylinderGeometry(0.09 + (0.62 - y) * 0.13, 0.1 + (0.62 - y) * 0.14, 0.06, 14), [d.x, y, d.z]), false);
      box(M.dark, d.x - 0.2, 0, d.z - 0.2, d.x + 0.2, 0.04, d.z + 0.2, 1, null, false);
    } else if (d.type === 'bigtree' || d.type === 'yardtree') tree(d.x, 0, d.z, d.s || 1.5);
    else if (d.type === 'banana') {   // bananeira: tronco verde e folhas compridas abertas
      cyl(M.bananaTrunk, d.x, 0, d.z, 0.17, 0.12, 2.3, 8);
      for (let k = 0; k < 8; k++) { const g = new THREE.PlaneGeometry(0.75, 2.3); g.translate(0, 1.15, 0); g.rotateX(0.7 + (k % 3) * 0.25); g.rotateY(k * Math.PI / 4 + d.x); g.translate(d.x, 2.15, d.z); put(M.banana, g, true); }
    } else if (d.type === 'woodgate') {   // fim da Papoulas: portão de madeira com telhadinho entre pilares de pedra
      const { x, z } = d;
      for (const sx of [-1, 1]) box(M.stone, x + sx * 1.95 - 0.28, 0, z - 0.28, x + sx * 1.95 + 0.28, 2.7, z + 0.28, 1);
      box(M.doorWood, x - 1.67, 0, z - 0.05, x + 1.67, 2.35, z + 0.05, 1);
      for (let u = -1.5; u <= 1.5; u += 0.3) box(M.dark, x + u - 0.01, 0, z - 0.07, x + u + 0.01, 2.35, z - 0.05, 1, null, false);
      gable(x - 2.45, z - 0.75, x + 2.45, z + 0.75, 2.7, false, 0.55);
      box(M.brick, x - 3.5, 0, z - 0.1, x - 2.23, 2.1, z + 0.1, 1, 0xffffff); box(M.concrete, x + 2.23, 0, z - 0.1, x + 3.5, 2.0, z + 0.1, 1);
    } else if (d.type === 'tent') {   // barraca de lona listrada
      for (const [ox, oz] of [[-1.9, -1.9], [1.9, -1.9], [1.9, 1.9], [-1.9, 1.9]]) bar(M.alu, [d.x + ox, 0, d.z + oz], [d.x + ox, 2.4, d.z + oz], 0.035, true);
      put(M.stripes, xform(new THREE.ConeGeometry(3.0, 1.4, 4, 1, true), [d.x, 3.1, d.z], Math.PI / 4), true);
      box(M.white, d.x - 0.8, 0.72, d.z - 0.5, d.x + 0.8, 0.76, d.z + 0.5, 1, null, false);
    } else if (d.type === 'silo') {
      cyl(M.silo, d.x, 0, d.z, 3, 3, 16, 24);
      put(M.silo, xform(new THREE.ConeGeometry(3.05, 1.6, 24), [d.x, 16.8, d.z]), true);
    } else if (d.type === 'factory') {
      box(M.plaster, d.x0, 0, d.z0, d.x1, d.h, d.z1, 4, 0xe6e6e2);
      box(M.zincRoof, d.x0 - 0.3, d.h, d.z0 - 0.3, d.x1 + 0.3, d.h + 0.25, d.z1 + 0.3, 3, null, false);
    }
    else if (d.type === 'crane') {
      const { x, z } = d, H = 34, s = 0.9;
      for (const [ox, oz] of [[-s, -s], [s, -s], [s, s], [-s, s]]) bar(M.craneRed, [x + ox, 0, z + oz], [x + ox, H, z + oz], 0.12);
      for (let y = 0; y < H; y += 2.6) for (const [a, c] of [[[-s, -s], [s, -s]], [[s, -s], [s, s]], [[s, s], [-s, s]], [[-s, s], [-s, -s]]]) {
        bar(M.craneRed, [x + a[0], y, z + a[1]], [x + c[0], y + 2.6, z + c[1]], 0.06);
        bar(M.craneRed, [x + a[0], y, z + a[1]], [x + c[0], y, z + c[1]], 0.06);
      }
      const jy = H + 0.3;   // lança comprida para o lado do mapa e contralança com o contrapeso
      for (const oz of [-0.7, 0.7]) bar(M.craneRed, [x - 9, jy, z + oz], [x + 30, jy, z + oz], 0.1);
      bar(M.craneRed, [x - 9, jy + 1.6, z], [x + 30, jy + 1.6, z], 0.09);
      for (let u = -9; u < 30; u += 2) { bar(M.craneRed, [x + u, jy, z - 0.7], [x + u + 1, jy + 1.6, z], 0.05); bar(M.craneRed, [x + u, jy, z + 0.7], [x + u + 1, jy + 1.6, z], 0.05); }
      bar(M.craneRed, [x, jy, z], [x, jy + 6, z], 0.12);
      bar(M.dark, [x, jy + 6, z], [x + 29, jy + 1.6, z], 0.03); bar(M.dark, [x, jy + 6, z], [x - 8.5, jy + 1.6, z], 0.03);
      box(M.concrete, x - 9, jy - 1.4, z - 1.0, x - 6.5, jy, z + 1.0, 1);
      box(M.white, x + 0.9, jy - 2.4, z - 0.9, x + 2.6, jy - 0.2, z + 0.9, 1);
      bar(M.dark, [x + 18, jy, z], [x + 18, jy - 14, z], 0.02);
    }
  }

  // ---- letras A e B pintadas
  const sign = (txt, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshStandardMaterial({ map: label(txt, 'rgba(230,110,20,.9)'), transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
  };
  for (const [name, s] of Object.entries(MAP.sites)) sign(name, (s.min[0] + s.max[0]) / 2, 0.05, (s.min[1] + s.max[1]) / 2, 0);
  group.children.filter(m => m.isMesh && m.geometry.type === 'PlaneGeometry').forEach(m => { m.rotation.x = -Math.PI / 2; });

  // ---- telhados
  if (roofTri.length) {
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(roofTri, 3));
    const uv = []; for (let i = 0; i < roofTri.length; i += 3) uv.push(roofTri[i] * 0.5 + roofTri[i + 1] * 0.3, roofTri[i + 2] * 0.5 + roofTri[i + 1] * 0.3);
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); rg.computeVertexNormals(); put(M.roof, rg, true);
  }

  // ---- junta tudo por material
  for (const { mat, geos, shadow } of batches.values()) {
    // todas as geometrias precisam dos mesmos atributos para juntar
    const hasColor = geos.some(g => g.attributes.color), hasUv = geos.some(g => g.attributes.uv);
    for (const g of geos) {
      if (hasColor && !g.attributes.color) { const a = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      if (hasUv && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!hasUv && g.attributes.uv) g.deleteAttribute('uv');
      if (!g.attributes.normal) g.computeVertexNormals();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    }
    const merged = mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    group.add(mesh);
  }
  if (sunLight) { const sc = sunLight.shadow.camera; sc.left = -88; sc.right = 88; sc.top = 88; sc.bottom = -88; sc.updateProjectionMatrix(); }
}
