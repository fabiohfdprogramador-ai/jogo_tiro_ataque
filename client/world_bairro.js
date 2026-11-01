// Mapa "Bairro" em 3D: ruas de bloquete, calçadas com meio-fio, casas, campo, praça, igrejas, Arena e mato.
// A geometria é gerada por código; os materiais principais usam texturas fotográficas CC0 (client/tex, do
// Poly Haven) com cor, relevo (normal) e brilho/oclusão (arm). As colisões vêm de shared/map.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// textura fotográfica: <nome>_diff (cor), _nor (relevo) e _arm (oclusão, aspereza, metal nos canais R, G, B).
// repeat = repetições por unidade de UV (as UVs do mapa estão em metros divididos pelo "tile" de cada chamada)
const texLoader = new THREE.TextureLoader();
const texCache = new Map();
function photoTex(file, repeat, srgb) {
  const key = file + repeat;
  if (!texCache.has(key)) {
    const t = texLoader.load('tex/' + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
function pbr(name, repeat, extra = {}, { metal = false, normal = 1 } = {}) {
  const arm = photoTex(name + '_arm.jpg', repeat, false);
  return new THREE.MeshStandardMaterial({
    map: photoTex(name + '_diff.jpg', repeat, true), normalMap: photoTex(name + '_nor.jpg', repeat, false), normalScale: new THREE.Vector2(normal, normal),
    roughnessMap: arm, roughness: 1, aoMap: arm, aoMapIntensity: 0.4, metalnessMap: metal ? arm : null, metalness: metal ? 1 : 0, ...extra,
  });
}
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

const chainTex = () => {
  const t = canvasTex(128, (g, s) => {
    g.clearRect(0, 0, s, s); g.strokeStyle = 'rgba(70,74,72,1)'; g.lineWidth = 2;
    for (let i = -s; i < s * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); g.beginPath(); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
  });
  return t;
};
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
const stageTex = () => canvasTex(256, (g, s) => {   // tampo do palanque: faixas em arco a partir do canto (foto da praça)
  const c = s / 2;
  for (const [r, col] of [[1, '#e0a020'], [0.9, '#f2c81e'], [0.72, '#2a64c0'], [0.5, '#d8402a'], [0.3, '#f2c81e']]) { g.fillStyle = col; g.beginPath(); g.arc(c, c, c * r, 0, Math.PI * 2); g.fill(); }
  const r = rand(11); speckle(g, s, r, 900, ['#ffffff', '#6a6a6a'], 0.18);
});
const pizzaBandTex = () => canvasTexWH(512, 64, (g, w, h) => {   // faixa de azulejo decorado em losangos da pizzaria
  g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 64) {
    g.fillStyle = '#b8402a'; g.beginPath(); g.moveTo(x + 32, 4); g.lineTo(x + 60, 32); g.lineTo(x + 32, 60); g.lineTo(x + 4, 32); g.fill();
    g.fillStyle = '#f0c040'; g.beginPath(); g.moveTo(x + 32, 14); g.lineTo(x + 50, 32); g.lineTo(x + 32, 50); g.lineTo(x + 14, 32); g.fill();
    g.fillStyle = '#7a3a22'; g.fillRect(x + 27, 27, 10, 10);
  }
});
const grafTex = () => canvasTexWH(1024, 256, (g, w, h) => {   // muro grafitado: reboco claro, desenhos coloridos e letras
  const r = rand(23);
  g.fillStyle = '#d6d4cc'; g.fillRect(0, 0, w, h);
  speckle(g, w, r, 4000, ['#a8a69e', '#eeece6', '#8a8a80'], 0.4);
  for (let i = 0; i < 14; i++) {   // manchas de tinta
    const x = r() * w, y = 60 + r() * 150, rw = 30 + r() * 90, col = ['#2f8a3a', '#2a5ac8', '#e06a1e', '#c82a5a', '#3ab0c8', '#f2c81e', '#7a3aa8'][(r() * 7) | 0];
    g.fillStyle = col; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(x, y, rw, rw * (0.35 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1; g.lineWidth = 6; g.lineJoin = 'round';
  for (const [t, x, y, c, sz] of [['VILA', 60, 170, '#1f3f9a', 90], ['ART', 380, 150, '#c8201a', 80], ['PAZ', 640, 175, '#1a1a1a', 86], ['RJ', 880, 160, '#2f8a3a', 96]]) {
    g.font = `bold ${sz}px Arial Black, Arial`; g.strokeStyle = '#111'; g.strokeText(t, x, y); g.fillStyle = c; g.fillText(t, x, y);
  }
  for (let i = 0; i < 5; i++) {   // carinhas e rabiscos
    const x = 120 + i * 200 + r() * 40, y = 70 + r() * 30;
    g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(x - 8, y - 5, 3, 0, 7); g.arc(x + 8, y - 5, 3, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y + 4, 10, 0.2, Math.PI - 0.2); g.stroke();
  }
  g.fillStyle = 'rgba(60,58,50,.35)'; g.fillRect(0, h - 30, w, 30);   // barra suja embaixo
});
const checkerTex = () => canvasTex(128, (g, s) => {   // tabuleiro de xadrez pintado na mesa
  g.fillStyle = '#c4c1ba'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) { g.fillStyle = '#2a2a2a'; g.fillRect(16 + i * 12, 16 + j * 12, 12, 12); }
});
const arrowSignTex = () => canvasTex(128, (g, s) => {   // placa de vire à esquerda (círculo vermelho, seta preta)
  g.fillStyle = '#fff'; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 2, 0, 7); g.fill();
  g.strokeStyle = '#c81e1e'; g.lineWidth = 14; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 9, 0, 7); g.stroke();
  g.fillStyle = '#111'; g.fillRect(s * 0.38, s * 0.45, s * 0.36, s * 0.1);
  g.beginPath(); g.moveTo(s * 0.24, s * 0.5); g.lineTo(s * 0.42, s * 0.36); g.lineTo(s * 0.42, s * 0.64); g.fill();
});
const mixTex = () => canvasTexWH(1024, 192, (g, w, h) => {   // letreiro preto da lanchonete Mix com desenhos de comida
  g.fillStyle = '#161616'; g.fillRect(0, 0, w, h);
  const r = rand(5);
  for (let i = 0; i < 9; i++) { g.strokeStyle = '#d8d8d8'; g.lineWidth = 3; g.beginPath(); g.ellipse(60 + i * 115 + r() * 30, 40 + r() * 110, 26, 18, r() * 3, 0, 7); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 120px Arial Black, Arial';
  g.lineWidth = 10; g.strokeStyle = '#f2c81e'; g.strokeText('MIX', w * 0.3, h * 0.48); g.fillStyle = '#f06a28'; g.fillText('MIX', w * 0.3, h * 0.48);
  g.font = 'bold 26px Arial'; g.fillStyle = '#f06a28'; g.fillText('LANCHONETE', w * 0.3, h * 0.88);
});
const barSignTex = () => canvasTexWH(512, 192, (g, w, h) => {   // placa preta do bar
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c0281e'; g.beginPath(); g.moveTo(20, 60); g.lineTo(200, 40); g.lineTo(200, 110); g.lineTo(20, 130); g.fill();
  g.fillStyle = '#f4f0e8'; g.font = 'italic bold 30px Georgia, serif'; g.fillText('cerveja', 50, 95);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 60px Arial Black, Arial'; g.fillText('CUBAL', 340, 62); g.fillText('BAR', 340, 132);
  for (let y = 10; y < h - 10; y += 14) for (let x = 440; x < 500; x += 16) { g.fillStyle = '#c8502a'; g.fillRect(x, y, 10, 4); }
});
const rtbTex = () => canvasTexWH(1024, 128, (g, w, h) => {   // toldo amarelo de babado com o nome do bar
  g.fillStyle = '#f2c81e'; g.fillRect(0, 0, w, h - 24);
  for (let x = 0; x < w; x += 48) { g.beginPath(); g.arc(x + 24, h - 24, 24, 0, Math.PI); g.fill(); }
  g.fillStyle = '#5a4a1a'; g.font = 'bold 54px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ESPAÇO      RTB', w / 2, (h - 24) / 2 + 4);
  g.clearRect(0, h - 24, 0, 0);
});
const parkTex = () => canvasTex(128, (g, s) => {   // proibido estacionar (E cortado)
  g.fillStyle = '#fff'; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 2, 0, 7); g.fill();
  g.strokeStyle = '#c81e1e'; g.lineWidth = 12; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 8, 0, 7); g.stroke();
  g.fillStyle = '#111'; g.font = 'bold 70px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('E', s / 2, s / 2 + 3);
  g.strokeStyle = '#c81e1e'; g.lineWidth = 11; g.beginPath(); g.moveTo(s * 0.26, s * 0.26); g.lineTo(s * 0.74, s * 0.74); g.stroke();
});
const hopscotchTex = () => canvasTexWH(128, 416, (g, w, h) => {   // amarelinha colorida pintada no chão
  g.clearRect(0, 0, w, h);
  const C = ['#f2c81e', '#2a64c0', '#d8402a', '#2f8a3a', '#f2c81e', '#2a64c0', '#d8402a'];
  const rows = [[0], [0, 1], [0], [0, 1], [0], [0, 1], [0]];
  let y = h, k = 0;
  for (const r of rows) {
    y -= 56;
    for (const c of r) { const x = r.length === 1 ? 36 : 6 + c * 60; g.fillStyle = C[k++ % C.length]; g.fillRect(x, y + 3, 56, 50); }
  }
  g.fillStyle = '#d8402a'; g.beginPath(); g.arc(64, 22, 20, Math.PI, 0); g.fill();
});
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
  const T = { chain: chainTex(), frond: frondTex(), foliage: foliageTex() };
  const M = {
    // texturas fotográficas (o número é quantas vezes a foto repete por unidade de UV)
    paver: pbr('pavers', 0.55, { color: new THREE.Color(1.4, 1.45, 1.55) }),   // a foto do bloquete é escura
    concrete: pbr('concrete', 0.5, { color: 0xc4c1ba }),
    curb: pbr('concrete', 1.2, { color: 0xeeece6 }),
    plaster: pbr('plaster', 1, { vertexColors: true, color: new THREE.Color(1.22, 1.22, 1.22) }, { normal: 0.8 }),   // a foto é acinzentada: clareia para a cor da casa aparecer
    plasterPeel: pbr('plasterPeel', 2.2, { vertexColors: true, color: new THREE.Color(1.1, 1.1, 1.1) }),
    brick: pbr('brick', 0.5, { vertexColors: true }),
    roof: pbr('roofTiles', 1, { side: THREE.DoubleSide }),
    grass: pbr('grass', 1.4, { color: 0xb4e08c }),   // puxa a grama seca da foto pro verde
    dirt: pbr('dirt', 1),
    sand: pbr('sand', 1, { color: 0xf2e6c8 }),
    white: pbr('plaster', 0.4, { color: new THREE.Color(1.2, 1.19, 1.16) }, { normal: 0.6 }),
    slab: pbr('concrete', 0.6, { color: 0xd8d6d0 }),             // laje aparente entre os andares
    sill: pbr('concrete', 1.2, { color: 0xe4e2dc }),             // peitoril e verga das janelas
    grimeBand: pbr('plasterOld', 1.4, { vertexColors: true }),  // barra suja embaixo das paredes
    rebar: new THREE.MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.7, metalness: 0.6 }),
    pvc: new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.5 }),
    acUnit: new THREE.MeshStandardMaterial({ color: 0xf0f0ee, roughness: 0.4, metalness: 0.1 }),
    winDark: new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.9 }),
    frameWhite: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.45 }),
    paintWood: pbr('wood', 0.8, { vertexColors: true }),
    church: new THREE.MeshStandardMaterial({ color: 0x9cc0e6, roughness: 0.8 }),
    churchDark: new THREE.MeshStandardMaterial({ color: 0x2a4c8c, roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x28323c, roughness: 0.04, metalness: 0.3, envMapIntensity: 1.6 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.35, metalness: 0.6 }),
    rollup: pbr('shutter', 0.5, {}, { metal: true }),
    doorBlue: new THREE.MeshStandardMaterial({ color: 0x3a6ea0, roughness: 0.6 }),
    doorWood: pbr('wood', 0.6, { color: 0xb08a66 }),
    tank: new THREE.MeshStandardMaterial({ color: 0x2f6fb8, roughness: 0.4 }),
    fenceGreen: new THREE.MeshStandardMaterial({ color: 0x1f4a28, roughness: 0.5, metalness: 0.3 }),
    chain: new THREE.MeshStandardMaterial({ map: T.chain, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe8c020, roughness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc02818, roughness: 0.5 }),
    blueToy: new THREE.MeshStandardMaterial({ color: 0x2058c0, roughness: 0.5 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xf06a18, roughness: 0.6 }),
    wood: pbr('wood', 0.5),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 1 }),
    frond: new THREE.MeshStandardMaterial({ map: T.frond, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
    foliage: new THREE.MeshStandardMaterial({ map: T.foliage, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }),
    cable: new THREE.LineBasicMaterial({ color: 0x1a1a1a }),
    crate: pbr('wood', 1, { color: 0xc8a070 }),
    awning: new THREE.MeshStandardMaterial({ color: 0xc0302a, roughness: 0.9, side: THREE.DoubleSide }),
    grime: pbr('plasterOld', 1.2, { vertexColors: true }),
    churchWall: pbr('plaster', 0.4, { color: new THREE.Color(0.86, 1.08, 1.42) }, { normal: 0.7 }),
    churchShade: new THREE.MeshStandardMaterial({ color: 0x5f86b8, roughness: 0.9 }),
    churchTrim: pbr('plaster', 0.4, { color: new THREE.Color(1.22, 1.22, 1.2) }, { normal: 0.5 }),
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
    blueTile: pbr('blueTiles', 1.2, { roughness: 0.6 }),
    zincRoof: pbr('corrugated', 0.8, { side: THREE.DoubleSide }, { metal: true }),
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
    rawConcrete: pbr('concrete', 0.5, { color: 0xa4b0b8 }),   // concreto cinza sem reboco
    hopscotch: new THREE.MeshStandardMaterial({ map: hopscotchTex(), transparent: true, alphaTest: 0.3, roughness: 0.8 }),
    shrineBlue: pbr('plaster', 0.6, { color: new THREE.Color(0.72, 1.0, 1.6) }, { normal: 0.4 }),
    stageTop: new THREE.MeshStandardMaterial({ map: stageTex(), roughness: 0.8 }),
    mixSign: new THREE.MeshStandardMaterial({ map: mixTex(), roughness: 0.6 }),
    rtbAwning: new THREE.MeshStandardMaterial({ map: rtbTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
    signPark: new THREE.MeshStandardMaterial({ map: parkTex(), transparent: true, alphaTest: 0.5, roughness: 0.5 }),
    tentOrange: new THREE.MeshStandardMaterial({ color: 0xe8a868, roughness: 0.85, side: THREE.DoubleSide }),
    tentGreen: new THREE.MeshStandardMaterial({ color: 0x2f5a46, roughness: 0.85, side: THREE.DoubleSide }),
    shackGreen: new THREE.MeshStandardMaterial({ color: 0x24402e, roughness: 0.8 }),
    chairBlue: new THREE.MeshStandardMaterial({ color: 0x2a4a9a, roughness: 0.5 }),
    rubbleBrick: new THREE.MeshStandardMaterial({ color: 0xa8603e, roughness: 0.95 }),   // tijolo quebrado do entulho
    oldWood: new THREE.MeshStandardMaterial({ color: 0x9a958c, roughness: 0.95 }),   // madeira velha acinzentada dos pallets
    flower: new THREE.MeshStandardMaterial({ color: 0xf0642a, roughness: 0.7 }),
    palmLeaf: new THREE.MeshStandardMaterial({ map: T.frond, color: 0xc8e070, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
    tilsonSign: signBoard("TILSON'S", '#6a6e72', '#f4f4f0', 'bar e restaurante'),
    darkGreen: new THREE.MeshStandardMaterial({ color: 0x1f3a32, roughness: 0.6 }),
    cobogoOrange: new THREE.MeshStandardMaterial({ map: cobogoTex(), color: 0xf0b088, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.9, metalness: 0.3 }),
    barSign: new THREE.MeshStandardMaterial({ map: barSignTex(), roughness: 0.6 }),
    whiteTile: pbr('blueTiles', 1.2, { color: new THREE.Color(1.6, 1.6, 1.6), roughness: 0.4 }),
    redRollup: pbr('shutter', 0.5, { color: 0xd04040 }, { metal: true }),
    blackRollup: pbr('shutter', 0.5, { color: 0x2a2a2a }, { metal: true }),
    greyDoor: new THREE.MeshStandardMaterial({ color: 0x9aa2a4, roughness: 0.5, metalness: 0.4 }),
    brownFrame: new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.6 }),
    graf: new THREE.MeshStandardMaterial({ map: grafTex(), roughness: 0.9 }),
    checker: new THREE.MeshStandardMaterial({ map: checkerTex(), roughness: 0.7 }),
    signLeft: new THREE.MeshStandardMaterial({ map: arrowSignTex(), roughness: 0.5 }),
    redBin: new THREE.MeshStandardMaterial({ color: 0xc0201a, roughness: 0.6 }),
    pink: new THREE.MeshStandardMaterial({ color: 0xc23a7a, roughness: 0.6 }),
    pizzaBand: new THREE.MeshStandardMaterial({ map: pizzaBandTex(), roughness: 0.5 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.45 }),
    paintDoor: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.35 }),
    paintWall: pbr('plaster', 0.4, { vertexColors: true, color: new THREE.Color(1.3, 1.3, 1.3) }, { normal: 0.4 }),
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
  // peças numa fachada: c = ponto na parede, n = normal para fora. Base sem espelhar (ox cresce para a direita
  // de quem olha a parede de fora), então as caixas ficam com a frente virada para fora.
  const facade = (c, n) => {
    const nv = new THREE.Vector3(...n), up = new THREE.Vector3(0, 1, 0), tv = up.clone().cross(nv);
    const B = new THREE.Matrix4().makeBasis(tv, up, nv);
    return (mat, ox, oy, oz, sx, sy, sz, shadow = false, color = null) => {
      const g = color === null ? new THREE.BoxGeometry(sx, sy, sz) : boxGeo(-sx / 2, -sy / 2, -sz / 2, sx / 2, sy / 2, sz / 2, 1, color);
      g.applyMatrix4(B); g.translate(c[0] + nv.x * oz + tv.x * ox, c[1] + oy, c[2] + nv.z * oz + tv.z * ox); put(mat, g, shadow);
    };
  };
  // janela com verga, peitoril saliente, moldura e vidro recuado; estilos comuns na vila
  const SHUTTER_COLORS = [0x2f6b4a, 0x3a5f8c, 0x8a5a32, 0xe8e4da];
  const houseWindow = (c, n, w, h, style, frameMat, shutterCol = 0x2f6b4a) => {
    const P = facade(c, n);
    P(M.sill, 0, -h / 2 - 0.06, 0.08, w + 0.32, 0.07, 0.22, true);
    P(M.sill, 0, h / 2 + 0.07, 0.025, w + 0.2, 0.12, 0.05);
    P(M.winDark, 0, 0, 0.004, w, h, 0.01);
    P(frameMat, 0, h / 2 - 0.03, 0.035, w, 0.06, 0.07); P(frameMat, 0, -h / 2 + 0.03, 0.035, w, 0.06, 0.07);
    P(frameMat, -w / 2 + 0.03, 0, 0.035, 0.06, h, 0.07); P(frameMat, w / 2 - 0.03, 0, 0.035, 0.06, h, 0.07);
    if (style === 'basculante') {   // vidros em faixas horizontais (fotos 2 e 11)
      for (let k = 0; k < 4; k++) { const y = -h / 2 + 0.06 + (k + 0.5) * (h - 0.12) / 4; P(M.glass, 0, y, 0.02 + (k % 2) * 0.012, w - 0.1, (h - 0.12) / 4 - 0.025, 0.01); P(frameMat, 0, y + (h - 0.12) / 8, 0.03, w - 0.08, 0.025, 0.04); }
    } else if (style === 'veneziana') {   // duas folhas de madeira com palhetas
      for (const sd of [-1, 1]) {
        P(M.paintWood, sd * (w / 4), 0, 0.04, w / 2 - 0.05, h - 0.08, 0.03, false, shutterCol);
        for (let y = -h / 2 + 0.12; y < h / 2 - 0.08; y += 0.09) P(M.winDark, sd * (w / 4), y, 0.058, w / 2 - 0.14, 0.012, 0.005);
      }
    } else {
      P(M.glass, -w / 4 + 0.01, 0, 0.022, w / 2 - 0.06, h - 0.1, 0.01); P(M.glass, w / 4 - 0.01, 0, 0.03, w / 2 - 0.06, h - 0.1, 0.01);
      P(frameMat, 0, 0, 0.035, 0.04, h - 0.08, 0.05);
      if (style === 'grade') {   // grade de ferro na frente
        for (let k = 0; k <= 6; k++) P(M.dark, -w / 2 + 0.06 + k * (w - 0.12) / 6, 0, 0.1, 0.022, h - 0.04, 0.022);
        for (const y of [-h / 2 + 0.08, 0, h / 2 - 0.08]) P(M.dark, 0, y, 0.1, w - 0.04, 0.022, 0.022);
      }
    }
  };
  // a janela antiga (usada pela Assembleia) vira a nova com moldura de alumínio
  const windowAt = (c, n, t, w = 1.1, h = 1.0, grade = true) => houseWindow(c, n, w, h, grade ? 'grade' : 'aluminio', M.alu);
  const isStreet = (x, z) => MAP.streets.some(([x0, z0, x1, z1]) => x >= x0 - 0.5 && x <= x1 + 0.5 && z >= z0 - 0.5 && z <= z1 + 0.5);
  const isOpen = (x, z) => Object.entries(MAP.areas).some(([k, [x0, z0, x1, z1]]) => !['blocoW', 'blocoN', 'blocoE', 'margS'].includes(k) && x >= x0 && x <= x1 && z >= z0 && z <= z1);
  const SIGNS = { mercearia: signBoard('BAR E MERCEARIA', '#f2d23a', '#b8201a', 'Café da manhã · Almoço · Self-service'), associacao: signBoard('ASSOCIAÇÃO DE MORADORES', 'rgba(0,0,0,0)', '#1f3f9a', 'DA VILA RESIDENCIAL'),
    lanches: signBoard('LANCHES', '#151515', '#ff7a3c', 'lanchonete · açaí'), bar: signBoard('BAR', '#1e5a32', '#f4f0e0', 'cerveja gelada'), bar2: signBoard('BAR', '#e8e2d0', '#a0201a', 'petiscos'),
    mercadinho: signBoard('MERCADINHO', '#f4f4f0', '#1f4fa8', 'da Vila Residencial'), cantinho: signBoard('CANTINHO SABOROSO', '#b8261c', '#fff2c0', 'quentinhas · lanches'), restaurante: signBoard('BAR E RESTAURANTE', '#f4efe0', '#a8201a', 'almoço · petiscos') };
  const KSIGNS = { pizza: signBoard('PIZZAS', '#151515', '#f4c430', 'esfirras · lanches'), acai: signBoard('AÇAÍ', '#f6f2e6', '#6a1f7a', 'sucos · vitaminas'), padaria: signBoard('PADARIA', '#f2f0e8', '#c0281e', 'pão quentinho') };
  // ---- casa: paredes de reboco de verdade tingido com a cor da casa, barra suja embaixo, lajes aparentes,
  // platibanda com rufo, caixa d'água, às vezes o último andar ainda no tijolo com vergalhão para fora;
  // nas fachadas da rua: janelas com moldura e peitoril, portas, portões de enrolar, varandas, ar-condicionado,
  // cano de descida e relógio de luz
  const house = (b, solidHouse = true) => {
    const [x0, , z0] = b.min, [x1, h, z1] = b.max, sx = x1 - x0, sz = z1 - z0;
    const r = rand((Math.abs(Math.round(x0 * 977 + z0 * 131)) % 100000) + 11);   // sorteio fixo por casa
    const col = b.hex ?? HOUSE_COLORS[b.color % HOUSE_COLORS.length];
    const floors = Math.max(1, Math.round(h / 3.1)), fh = h / floors;
    const plain = !b.brick && !b.grime;
    const rawTop = solidHouse && plain && !b.shop && !b.sign && b.hex === undefined && floors >= 2 && !b.roof && r() < 0.35;
    const peel = plain && b.hex === undefined && r() < 0.12;
    const wallMat = b.brick ? M.brick : b.grime ? M.grime : peel ? M.plasterPeel : M.plaster;
    const tile = b.brick ? 1 : b.grime ? Math.max(3, h) : 2.5;
    const wallCol = b.brick ? 0xffffff : col;
    const topY = rawTop ? h - fh : h;
    box(wallMat, x0, 0, z0, x1, topY, z1, tile, wallCol);
    if (b.tiles) box(M.blueTile, x0 - 0.03, 0, z0 - 0.03, x1 + 0.03, 0.85, z1 + 0.03, 1, null, false);
    else if (!b.brick) box(M.grimeBand, x0 - 0.025, 0, z0 - 0.025, x1 + 0.025, 0.45, z1 + 0.025, 1, new THREE.Color(col).multiplyScalar(0.72).getHex(), false);
    for (let f = 1; f < floors; f++) box(M.slab, x0 - 0.06, f * fh - 0.12, z0 - 0.06, x1 + 0.06, f * fh + 0.06, z1 + 0.06, 1, null, true);
    if (rawTop) {   // último andar em obra: tijolo à vista, pilares e viga de concreto, ferros para cima
      box(M.brick, x0 + 0.06, topY, z0 + 0.06, x1 - 0.06, h - 0.22, z1 - 0.06, 1, 0xffffff);
      box(M.concrete, x0 - 0.02, h - 0.24, z0 - 0.02, x1 + 0.02, h, z1 + 0.02, 1);
      for (const [px, pz] of [[x0, z0], [x1 - 0.26, z0], [x0, z1 - 0.26], [x1 - 0.26, z1 - 0.26]]) {
        box(M.concrete, px - 0.02, topY, pz - 0.02, px + 0.28, h, pz + 0.28, 1);
        for (let k = 0; k < 4; k++) {
          const fx = px + 0.07 + (k % 2) * 0.12, fz = pz + 0.07 + (k >> 1) * 0.12;
          bar(M.rebar, [fx, h, fz], [fx + (r() - 0.5) * 0.12, h + 0.6 + r() * 0.5, fz + (r() - 0.5) * 0.12], 0.009);
        }
      }
    }
    if (b.roof || b.roofTile) gable(x0 - 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4, h, sx < sz);
    else if (b.zinc) {   // telha ondulada quase plana, caindo para um lado, com beiral
      const R = [[x0 - 0.4, h + 0.55, z0 - 0.4], [x1 + 0.4, h + 0.55, z0 - 0.4], [x1 + 0.4, h + 0.05, z1 + 0.4], [x0 - 0.4, h + 0.05, z1 + 0.4]];
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => R[i]), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => [R[i][0] * 0.8, R[i][2] * 0.8]), 2));
      g.computeVertexNormals(); put(M.zincRoof, g, true);
      if (r() < 0.6) cyl(M.tank, x0 + sx * 0.7, h + 0.3, z0 + sz * 0.4, 0.62, 0.68, 0.95, 14, false);
    } else if (!rawTop) {   // platibanda com rufo de concreto, caixa d'água, às vezes um quartinho e uma antena
      box(wallMat, x0 - 0.04, h, z0 - 0.04, x1 + 0.04, h + 0.55, z1 + 0.04, tile, new THREE.Color(wallCol).multiplyScalar(0.95).getHex(), false);
      box(M.sill, x0 - 0.1, h + 0.55, z0 - 0.1, x1 + 0.1, h + 0.63, z1 + 0.1, 1, null, false);
      const tx = x0 + sx * (0.25 + r() * 0.5), tz = z0 + sz * (0.25 + r() * 0.5);
      if (r() < 0.8) { box(M.concrete, tx - 0.7, h, tz - 0.7, tx + 0.7, h + 0.25, tz + 0.7, 1, null, false); cyl(M.tank, tx, h + 0.25, tz, 0.62, 0.68, 0.95, 16, false); cyl(M.tank, tx, h + 1.2, tz, 0.66, 0.66, 0.08, 16, false); }
      if (solidHouse && floors >= 2 && sx > 4 && sz > 4 && r() < 0.35) {
        const qx = x0 + 0.4, qz = z0 + 0.4;
        box(wallMat, qx, h, qz, qx + 2.4, h + 2.5, qz + 2.4, tile, wallCol, true);
        box(M.sill, qx - 0.1, h + 2.5, qz - 0.1, qx + 2.5, h + 2.6, qz + 2.5, 1, null, false);
      }
      if (r() < 0.3) { const ax = x1 - 0.8, az = z1 - 0.8; bar(M.dark, [ax, h + 0.6, az], [ax, h + 1.4, az], 0.025); put(M.white, xform(new THREE.CylinderGeometry(0.35, 0.3, 0.08, 16), [ax, h + 1.5, az], r() * 6, 1.1), true); }
    }
    if (!solidHouse) return;
    const faces = [[[(x0 + x1) / 2, 0, z0], [0, 0, -1], [1, 0, 0], sx], [[(x0 + x1) / 2, 0, z1], [0, 0, 1], [1, 0, 0], sx],
      [[x0, 0, (z0 + z1) / 2], [-1, 0, 0], [0, 0, 1], sz], [[x1, 0, (z0 + z1) / 2], [1, 0, 0], [0, 0, 1], sz]];
    const style = ['grade', 'basculante', 'veneziana', 'aluminio', 'grade'][(r() * 5) | 0];
    const frameMat = r() < 0.55 ? M.alu : M.frameWhite;
    const shutterCol = SHUTTER_COLORS[(r() * SHUTTER_COLORS.length) | 0];
    let door = false, signed = !b.sign;
    for (const [mid, n, t, L] of faces) {
      const qx = mid[0] + n[0] * 3, qz = mid[2] + n[2] * 3;
      const street = isStreet(qx, qz);
      if (!street && !isOpen(qx, qz)) continue;
      const nv = new THREE.Vector3(...n), up = new THREE.Vector3(0, 1, 0);
      const Bf = new THREE.Matrix4().makeBasis(up.clone().cross(nv), up, nv);   // base sem espelhar (o texto fica legível)
      if (!signed && street) {   // letreiro em cima da porta, na primeira fachada que dá para a rua
        signed = true;
        const g = new THREE.BoxGeometry(Math.min(L - 0.4, 5.2), 0.9, 0.05); g.applyMatrix4(Bf); g.translate(mid[0] + n[0] * 0.06, 2.95, mid[2] + n[2] * 0.06);
        put(SIGNS[b.sign], g, false);
      }
      if (b.green && street) {   // quitanda: toldo verde nas fachadas da rua
        const g = new THREE.PlaneGeometry(L, 1.3); g.rotateX(-Math.PI / 2 + 0.45); g.applyMatrix4(Bf);
        g.translate(mid[0] + n[0] * 0.6, 2.35, mid[2] + n[2] * 0.6); put(M.greenAwning, g, true);
      }
      const at = (along, y) => [mid[0] + t[0] * along, y, mid[2] + t[2] * along];
      const slots = Math.max(1, Math.floor(L / 2.6));
      const balcony = street && floors >= 2 && L > 4 && r() < 0.3 ? 1 + ((r() * (floors - 1 - (rawTop ? 1 : 0))) | 0) : -1;
      for (let fl = 0; fl < floors; fl++) {
        const raw = rawTop && fl === floors - 1, y0 = fl * fh;
        if (fl === balcony && !raw) {   // varanda: laje saliente com guarda-corpo
          const P = facade(at(0, y0), n), bw = L - 0.6;
          P(M.slab, 0, 0.05, 0.45, bw, 0.14, 0.9, true);
          for (let u = -bw / 2 + 0.05; u <= bw / 2; u += 0.13) P(frameMat === M.alu ? M.alu : M.dark, u, 0.6, 0.86, 0.025, 0.95, 0.025);
          P(frameMat === M.alu ? M.alu : M.dark, 0, 1.08, 0.86, bw, 0.05, 0.05);
        }
        for (let k = 0; k < slots; k++) {
          const along = ((k + 0.5) / slots - 0.5) * (L - 1.2);
          if (fl === 0 && k === 0 && !door && L > 3.5) {
            door = true;
            const garage = b.shop || (r() < 0.35 && L > 5);
            const P = facade(at(along, 0), n);
            if (garage) {   // portão de enrolar com guias e soleira
              P(M.rollup, 0, 1.25, 0.03, 2.6, 2.5, 0.05);
              P(M.sill, 0, 2.6, 0.06, 2.9, 0.2, 0.12, true); P(M.dark, -1.33, 1.25, 0.05, 0.06, 2.5, 0.08); P(M.dark, 1.33, 1.25, 0.05, 0.06, 2.5, 0.08);
            } else {   // porta com batente, degrau e o relógio de luz ao lado
              P(M.frameWhite, 0, 1.1, 0.03, 1.12, 2.22, 0.06);
              P(r() < 0.5 ? M.doorWood : M.doorBlue, 0, 1.05, 0.05, 0.94, 2.08, 0.05);
              P(M.alu, 0.34, 1.05, 0.085, 0.04, 0.16, 0.04);
              P(M.sill, 0, 0.06, 0.2, 1.3, 0.12, 0.4, true);
              P(M.acUnit, -1.0, 1.5, 0.08, 0.36, 0.5, 0.14); P(M.glass, -1.0, 1.58, 0.155, 0.22, 0.16, 0.01);
            }
            continue;
          }
          const c = at(along, y0 + (fl === 0 ? 1.55 : 1.6));
          if (raw) { const P = facade(c, n); P(M.winDark, 0, 0, 0.004, 1.0, 1.0, 0.01); P(M.concrete, 0, 0.56, 0.02, 1.2, 0.12, 0.05); continue; }
          if (fl === 0 && r() < 0.12) continue;
          houseWindow(c, n, 1.1, fl === 0 ? 1.05 : 1.15, style, frameMat, shutterCol);
          if (fl > 0 && r() < 0.28) { const P = facade(c, n); P(M.acUnit, 0.95, -0.35, 0.2, 0.78, 0.5, 0.36, true); P(M.dark, 0.95, -0.35, 0.385, 0.6, 0.36, 0.01); }
        }
      }
      if (street && h > 3) {   // cano de descida num canto da fachada
        const P = facade(at(L / 2 - 0.25, 0), n);
        P(M.pvc, 0, (h + 0.5) / 2, 0.08, 0.09, h + 0.5, 0.09, true);
      }
    }
  };
  for (const b of MAP.boxes) if (b.mat === 'house') house(b);
  // fora do mapa: casas só a oeste; ao norte o descampado da fábrica, a leste e ao sul o mato atrás das cercas de madeira
  {
    const r2 = rand(99);
    for (let z = S.minZ - 14; z < S.maxZ + 14; z += 7 + r2() * 4) {
      if (z > 39 && z < 57) { z = 57; continue; }   // a Vitória Régia continua para oeste fora do mapa
      const floors = r2() < 0.45 ? 1 : r2() < 0.8 ? 2 : 3;
      house({ min: [S.minX - 13, 0, z], max: [S.minX - 1.5, 3.1 * floors, z + 6 + r2() * 4], color: (r2() * 1000) | 0, roof: floors === 1 ? 1 : 0, brick: r2() < 0.22 ? 1 : 0 }, false);
    }
    {   // a Vitória Régia seguindo para oeste fora do mapa, com casas dos dois lados
      const vr = MAP.streets.find(([x0, z0, x1, z1]) => x0 <= S.minX + 1.5 && z0 > 40 && x1 - x0 > z1 - z0);
      if (vr) {
        // a rua (já desenhada com o bloquete) segue ~17 m além do limite, com casas que têm janelas e portas para ela,
        // obra com areia, brita e tijolos, carros parados e, no fim, a casa com portão escuro (foto 10 R. Vitória Régia)
        const E = vr[0];
        const north = [[S.minX - 6, 6.4, 0xd8d0b8], [S.minX - 11, 3.3, 0xe8e2c8], [E, 6.2, 0xc8d0b0]];
        let xa = S.minX - 0.3; for (const [xb, h, hex] of north) { house({ min: [xb, 0, vr[1] - 8], max: [xa, h, vr[1]], hex, roof: h < 4 ? 1 : 0, brick: 0 }); xa = xb; }
        const south = [[S.minX - 5, 6.4, 0xe4dcc4], [S.minX - 9, 3.3, 0xeeeeea], [E, 6.2, 0xd8b8a0]];
        xa = S.minX - 0.3; for (const [xb, h, hex] of south) { house({ min: [xb, 0, vr[3]], max: [xa, h, vr[3] + 8], hex, roof: h < 4 ? 1 : 0, brick: xb === E ? 1 : 0 }); xa = xb; }
        house({ min: [E - 6, 0, vr[1] - 6], max: [E, 3.3, vr[3] + 6], hex: 0xdedcd2, roof: 0, brick: 0, zinc: 1 }, false);
        const mz = (vr[1] + vr[3]) / 2;
        box(M.dark, E, 0, mz - 1.4, E + 0.06, 2.3, mz + 1.4, 1, null, false);                                   // portão escuro no fim
        for (let u = -1.3; u <= 1.3; u += 0.18) box(M.alu, E + 0.06, 0.1, mz + u - 0.015, E + 0.09, 2.2, mz + u + 0.015, 1, null, false);
        put(M.sand, xform(new THREE.ConeGeometry(1.6, 0.8, 12), [S.minX - 4, 0.4, vr[3] - 1.6]), true);        // areia e brita da obra
        put(M.concrete, xform(new THREE.ConeGeometry(1.2, 0.6, 10), [S.minX - 6.5, 0.3, vr[3] - 1.4]), true);
        for (let k = 0; k < 4; k++) box(M.brick, S.minX - 9 + k * 0.05, 0, vr[3] - 2.6 + k * 0.4, S.minX - 8.2, 0.9 - k * 0.15, vr[3] - 2.2 + k * 0.4, 1, 0xffffff);   // tijolos empilhados
        drawCar({ min: [S.minX - 12.4, 0, vr[1] + 1.5], max: [S.minX - 8.3, 1.45, vr[1] + 3.2], hex: 0xeeeeee, kind: 'car', dir: 0 });
        drawCar({ min: [S.minX - 17, 0, vr[1] + 1.5], max: [S.minX - 12.9, 1.45, vr[1] + 3.2], hex: 0xe8c838, kind: 'car', dir: 0 });
      }
    }
    flat(M.grass, S.minX - 1.5, S.minZ - 60, S.maxX + 60, S.minZ, 0.01, 5);
    flat(M.grass, S.maxX, S.minZ, S.maxX + 60, S.maxZ + 60, 0.01, 5);
    flat(M.grass, S.minX - 1.5, S.maxZ, S.maxX, S.maxZ + 60, 0.01, 5);
    for (const [x0, z0, x1, z1] of MAP.streets) if (z1 > S.maxZ) flat(M.concrete, x0, S.maxZ, x1, z1, 0.011, 1.5);   // calçada das ruas que passam da cerca do sul
    for (let x = S.minX; x < S.maxX + 14; x += 4 + r2() * 3) if (Math.abs(x - 8) > 4 && x > -2 && (x < 19 || x > 29)) { tree(x, 0, S.maxZ + 3 + r2() * 6, 1.4 + r2() * 0.8); if (r2() < 0.4) palm(x + 1.5, S.maxZ + 2.5 + r2() * 3, 7 + r2() * 4); }
    for (let z = S.minZ; z < S.maxZ; z += 4 + r2() * 3) tree(S.maxX + 2 + r2() * 6, 0, z, 1.4 + r2() * 0.8);
    for (let x = S.minX; x < S.maxX; x += 9 + r2() * 8) tree(x, 0, S.minZ - 6 - r2() * 10, 1.2 + r2() * 0.6);
    {   // cerca do outro lado da Vitória Régia (com o trecho da casa ao lado do portão, que tem cerca de pallets)
      const gh = (MAP.decor || []).find(d => d.type === 'gatehouse'), wg = (MAP.decor || []).find(d => d.type === 'woodgate');
      if (gh && wg) { woodFence(wg.x + 3.5, S.maxZ - 0.1, S.maxX, S.maxZ + 0.05, 1.5); }   // abre no vão da Acácias
      else woodFence(S.minX, S.maxZ - 0.1, S.maxX, S.maxZ + 0.05, 1.5);
    }
  }

  // ---- campo de futebol (base CT): traves nas pontas norte e sul
  const C = MAP.areas.campo;
  flat(M.grass, C[0], C[1], C[2], C[3], 0.02, 6);
  const cmx = (C[0] + C[2]) / 2, cmz = (C[1] + C[3]) / 2;
  for (const zz of [C[1] + 3, C[3] - 3]) flat(M.dirt, cmx - 3, zz - 2, cmx + 3, zz + 2, 0.03, 3);
  flat(M.dirt, cmx - 1.5, cmz - 1.5, cmx + 1.5, cmz + 1.5, 0.03, 3);
  for (const zz of [C[1] + 1.2, C[3] - 1.2]) {
    for (const sx of [-1, 1]) box(M.white, cmx + sx * 2.5 - 0.06, 0, zz - 0.06, cmx + sx * 2.5 + 0.06, 2.0, zz + 0.06);
    box(M.white, cmx - 2.56, 1.94, zz - 0.06, cmx + 2.56, 2.06, zz + 0.06);
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
  for (const k of ['trilha', 'miniP']) flat(M.dirt, AR[k][0], AR[k][1], AR[k][2], AR[k][3], 0.03, 2);
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
  {   // caminho de tijolo do canto sul até o palanque, com a amarelinha pintada (foto da praça)
    const px0 = P[0] + 9.9, px1 = px0 + 2.0;   // entre o oratório e o palanque
    flat(M.brick, px0, P[3] - 5, px1, P[3], 0.07, 1);
    const g = new THREE.PlaneGeometry(1.1, 3.6); g.rotateX(-Math.PI / 2); g.translate((px0 + px1) / 2, 0.075, P[3] - 2.4); put(M.hopscotch, g, false);
  }

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
      case 'post': if (b.rust) { cyl(M.rust, cx, 0, cz, 0.05, 0.05, h, 8); break; } if (h > 2.2) cyl(M.white, cx, 0, cz, 0.05, 0.05, h, 8); break;   // postes da rede de vôlei (as traves do campo são desenhadas à parte)
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
      case 'table':
        if (b.sq) {   // mesa de xadrez quadrada com quatro banquinhos
          box(M.concrete, cx - 0.12, 0, cz - 0.12, cx + 0.12, 0.72, cz + 0.12, 1);
          box(M.concrete, x0, 0.72, z0, x1, h, z1, 1);
          { const g = new THREE.PlaneGeometry(0.62, 0.62); g.rotateX(-Math.PI / 2); g.translate(cx, h + 0.005, cz); put(M.checker, g, false); }
          for (let k = 0; k < 4; k++) { const ox = cx + Math.cos(k * Math.PI / 2) * 0.8, oz = cz + Math.sin(k * Math.PI / 2) * 0.8; cyl(M.concrete, ox, 0, oz, 0.09, 0.09, 0.4, 8); cyl(M.concrete, ox, 0.4, oz, 0.19, 0.19, 0.07, 12); }
          break;
        }
        if (x1 - x0 > z1 - z0) {   // mesa de xadrez: tampo retangular com tabuleiro e dois bancos compridos
          box(M.concrete, cx - 0.12, 0, cz - 0.12, cx + 0.12, 0.72, cz + 0.12, 1);
          box(M.concrete, x0, 0.72, z0, x1, 0.8, z1, 1);
          { const g = new THREE.PlaneGeometry(0.7, 0.7); g.rotateX(-Math.PI / 2); g.translate(cx, 0.805, cz); put(M.checker, g, false); }
          for (const sz of [-1, 1]) { const bz = cz + sz * 0.75; box(M.concrete, cx - 0.08, 0, bz - 0.08, cx + 0.08, 0.42, bz + 0.08, 1); box(M.concrete, x0 + 0.1, 0.42, bz - 0.17, x1 - 0.1, 0.48, bz + 0.17, 1); }
          break;
        }
        cyl(M.concrete, cx, 0, cz, 0.25, 0.25, 0.75); cyl(M.concrete, cx, 0.72, cz, 0.6, 0.6, 0.08, 16); for (let k = 0; k < 4; k++) cyl(M.concrete, cx + Math.cos(k * Math.PI / 2) * 0.95, 0, cz + Math.sin(k * Math.PI / 2) * 0.95, 0.18, 0.18, 0.45, 8); break;
      case 'bench': {
        const bm = b.blue ? M.blueMetal : b.black ? M.dark : b.yellow ? M.yellow : M.wood;
        box(bm, x0, 0.42, z0, x1, 0.48, z1);
        if (x1 - x0 > z1 - z0) { box(bm, x0, 0.48, z1 - 0.06, x1, 0.85, z1); for (const xx of [x0 + 0.15, x1 - 0.15]) box(M.dark, xx - 0.03, 0, z0 + 0.05, xx + 0.03, 0.42, z1 - 0.05); }
        else { box(bm, x1 - 0.06, 0.48, z0, x1, 0.85, z1); for (const zz of [z0 + 0.15, z1 - 0.15]) box(M.dark, x0 + 0.05, 0, zz - 0.03, x1 - 0.05, 0.42, zz + 0.03); }
        break;
      }
      case 'bollard': cyl(M.white, cx, 0, cz, 0.11, 0.1, 0.75, 10); break;
      case 'trash': if (b.square) { box(M.beige, x0, 0, z0, x1, h, z1, 1); box(M.dark, x0 + 0.08, h - 0.02, z0 + 0.08, x1 - 0.08, h + 0.005, z1 - 0.08, 1, null, false); break; } cyl(M.beige, cx, 0, cz, 0.22, 0.26, 0.85, 14); cyl(M.dark, cx, 0.85, cz, 0.27, 0.27, 0.06, 14); break;
      case 'sign':
        bar(M.alu, [cx, 0, cz], [cx, 2.62, cz], 0.04, true);
        if (b.park) { const g = new THREE.PlaneGeometry(0.64, 0.64); g.rotateY(Math.PI); g.translate(cx, 2.3, cz - 0.06); put(M.signPark, g, false); put(M.alu, xform(new THREE.CylinderGeometry(0.325, 0.325, 0.02, 24), [cx, 2.3, cz - 0.035], 0, Math.PI / 2), false); break; }   // plano virado para o norte (o texto não gira)
        put(b.left ? M.signLeft : M.sign, xform(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24), [cx, 2.3, cz - 0.06], 0, Math.PI / 2), false);
        put(M.alu, xform(new THREE.CylinderGeometry(0.325, 0.325, 0.02, 24), [cx, 2.3, cz - 0.035], 0, Math.PI / 2), false);   // verso cinza
        break;
      case 'palm': palm(cx, cz, b.ph || 8); break;
      case 'stage': {   // quarto de círculo com o centro no canto de dentro (as duas caixas de colisão começam nele)
        if (!b.main) break;
        const r = b.r, th = [0, Math.PI / 2];
        put(M.yellow, xform(new THREE.CylinderGeometry(r, r, h - 0.06, 24, 1, true, th[0], th[1]), [x0, (h - 0.06) / 2, z0]), true);
        put(M.stageTop, xform(new THREE.CylinderGeometry(r, r, 0.06, 24, 1, false, th[0], th[1]), [x0, h - 0.03, z0]), true);
        put(M.redStep, xform(new THREE.CylinderGeometry(r + 0.04, r + 0.04, 0.12, 24, 1, true, th[0], th[1]), [x0, 0.06, z0]), false);
        break;
      }
      case 'steps': box(M.redStep, x0, 0, z0, x1, h * 0.5, z1, 1); box(M.redStep, x0, h * 0.5, z0, x1 - (x1 - x0) * 0.5, h, z1, 1); break;
      case 'kiosk': drawKiosk(b); break;
      case 'door': {   // portão que abre: peça separada, girando na dobradiça (oeste ou leste, b.hinge); o main.js anima b.mesh
        const w = x1 - x0, sg = b.hinge === 'e' ? -1 : 1, pivot = new THREE.Group(); pivot.position.set(sg > 0 ? x0 : x1, 0, cz);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, h - 0.05, 0.06), M.doorWood); leaf.position.set(sg * w / 2, h / 2 + 0.03, 0); leaf.castShadow = leaf.receiveShadow = true; pivot.add(leaf);
        for (let u = 0.12; u < w - 0.05; u += 0.2) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, h - 0.1, 0.075), M.dark); r.position.set(sg * u, h / 2 + 0.03, 0); pivot.add(r); }
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.12), M.alu); handle.position.set(sg * (w - 0.14), 1.05, 0); pivot.add(handle);
        pivot.rotation.y = b.open ? -1.45 * sg : 0; group.add(pivot); b.mesh = pivot;
        break;
      }
      case 'raw': {   // sobrado de concreto sem reboco, com cobogó de cimento e a laje marcada
        // frente para a Vitória Régia (foto 20 R. Acácias): térreo com o vão da garagem e o cobogó, laje saliente com mureta
        // e o andar de cima recuado com três janelas sem esquadria
        const SB = 1.2;   // recuo do andar de cima
        box(M.rawConcrete, x0, 0, z0, x1, 3.0, z1, 0.9);
        box(M.rawConcrete, x0, 3.0, z0 + SB, x1, h, z1, 0.9);
        box(M.slab, x0 - 0.2, 3.0, z0 - 0.8, x1 + 0.35, 3.25, z1, 1);
        box(M.rawConcrete, x0 - 0.2, 3.25, z0 - 0.8, x1 + 0.35, 3.85, z0 - 0.62, 0.9, null, false);
        box(M.rawConcrete, x0, h, z0 + SB, x1, h + 0.9, z1, 0.9, null, false);
        box(M.winDark, x1 - 2.6, 0, z0 - 0.02, x1 - 0.3, 2.5, z0, 1, null, false);                 // vão da garagem (lado da Orquídeas)
        box(M.rawConcrete, x1 - 1.55, 0, z0 - 0.1, x1 - 1.35, 2.5, z0, 1, null, false);
        box(M.glassBlock, x0 + 2.0, 0.8, z0 - 0.02, x0 + 3.7, 2.3, z0, 0.4, null, false);           // cobogó
        box(M.winDark, x0 + 0.6, 0, z0 - 0.02, x0 + 1.5, 2.1, z0, 1, null, false);                 // porta sem folha
        for (const wx of [x0 + 1.0, x0 + 3.4, x0 + 5.6]) box(M.winDark, wx, 3.9, z0 + SB - 0.02, wx + 1.3, 4.9, z0 + SB, 1, null, false);
        box(M.glassBlock, x1, 0.9, z0 + 4.2, x1 + 0.02, 2.2, z0 + 5.6, 0.4, null, false);
        box(M.winDark, x1, 0, z0 + 1.0, x1 + 0.02, 2.2, z0 + 2.4, 1, null, false);
        box(M.winDark, x1, 4.0, z0 + 1.5, x1 + 0.02, 5.2, z0 + 3.0, 1, null, false);
        break;
      }
      case 'ivywall': {   // muro coberto de hera, com o relógio de luz e as casas de telha atrás
        box(M.plaster, x0, 0, z0, x1, h, z1, 2.5, 0xe0dcc8);
        for (let z = z0 + 0.4; z < z1 - 0.4; z += 0.9) put(M.foliage, xform(new THREE.PlaneGeometry(1.4, 1.8), [x0 - 0.04, 0.9 + ((z * 3) % 1) * 0.4, z], Math.PI / 2), true);
        box(M.fenceGreen, x0 - 0.12, 1.2, z0 + 0.5, x0, 1.8, z0 + 0.9, 1, null, false);
        box(M.alu, x0 - 0.1, 1.0, z0 + 1.0, x0, 1.4, z0 + 1.3, 1, null, false);
        house({ min: [x1 + 0.3, 0, z0 + 0.4], max: [x1 + 4.4, 3.0, z0 + 7], hex: 0xe8e2a8, roof: 1, brick: 0 }, false);
        house({ min: [x1 + 0.3, 0, z0 + 7.5], max: [x1 + 4.5, 3.4, z1], hex: 0xe6e0d4, roof: 1, brick: 0 }, false);
        break;
      }
      case 'rtb': {   // barraco verde-escuro aberto para a rua, com toldo amarelo de babado na frente e no lado norte
        box(M.shackGreen, x1 - 0.15, 0, z0, x1, h, z1, 1);
        box(M.shackGreen, x0 + 0.4, 0, z0, x1, h, z0 + 0.12, 1);
        box(M.shackGreen, x0 + 0.4, 0, z1 - 0.12, x1, h, z1, 1);
        box(M.winDark, x0 + 0.4, h - 0.05, z0, x1, h, z1, 1, null, false);
        box(M.white, x0 + 1.2, 0, z1 - 1.6, x0 + 1.7, 2.0, z1 - 0.9, 1);                                     // geladeira
        box(M.crate, x1 - 1.2, 0, z0 + 1.0, x1 - 0.2, 0.9, z0 + 2.4, 1);                                    // balcão de madeira
        const aw = (g, x, z, ry) => { g.rotateY(ry); g.translate(x, h - 0.1, z); put(M.rtbAwning, g, true); };
        { const g = new THREE.PlaneGeometry(z1 - z0, 0.75); g.rotateX(0.5); aw(g, x0 + 0.1, (z0 + z1) / 2, -Math.PI / 2); }
        { const g = new THREE.PlaneGeometry(x1 - x0 - 0.4, 0.75); g.rotateX(0.5); aw(g, (x0 + x1) / 2 + 0.2, z0 - 0.15, Math.PI); }
        for (const [cx2, cz2] of [[x0 - 0.6, z0 + 1.0], [x0 - 0.9, z0 + 2.0], [x0 + 0.7, z1 - 2.6]]) {   // cadeiras de plástico azuis
          box(M.chairBlue, cx2 - 0.22, 0.42, cz2 - 0.22, cx2 + 0.22, 0.46, cz2 + 0.22, 1, null, false);
          box(M.chairBlue, cx2 + 0.18, 0.46, cz2 - 0.22, cx2 + 0.22, 0.85, cz2 + 0.22, 1, null, false);
          for (const ox of [-0.19, 0.19]) for (const oz of [-0.19, 0.19]) bar(M.chairBlue, [cx2 + ox, 0, cz2 + oz], [cx2 + ox, 0.42, cz2 + oz], 0.02);
        }
        break;
      }
      case 'drum': {   // tambor de trânsito laranja e branco
        for (let k = 0; k < 5; k++) cyl(k % 2 ? M.white : M.orange, cx, k * 0.19, cz, 0.28 - k * 0.01, 0.28 - k * 0.01, 0.19, 14);
        cyl(M.dark, cx, 0, cz, 0.34, 0.34, 0.05, 14);
        break;
      }
      case 'mix': {   // sobrado da lanchonete Mix: embaixo dois portões de enrolar (preto e vermelho) com azulejo branco; em cima varanda com tela
        box(M.whiteTile, x0, 0, z0, x1, 3.1, z1, 1);
        box(M.blackRollup, x0 + 0.15, 0, z1, x0 + 2.35, 2.55, z1 + 0.04, 1, null, false);
        box(M.redRollup, x0 + 2.55, 0, z1, x1 - 0.15, 2.55, z1 + 0.04, 1, null, false);
        box(M.slab, x0 - 0.1, 3.0, z0, x1 + 0.1, 3.25, z1 + 0.9, 1);
        { const g = new THREE.PlaneGeometry(x1 - x0 - 0.1, 0.75); g.translate((x0 + x1) / 2, 2.85, z1 + 0.91); put(M.mixSign, g, false); }
        box(M.concrete, x0, 3.25, z0, x1, h, z1, 0.8);                                                   // bloco cinza sem reboco
        box(M.plaster, x0, 3.25, z1, x0 + 0.15, h, z1 + 1.0, 2.5, 0xd8707e);                               // parede rosa da varanda na ponta
        box(M.plaster, x0, 3.25, z1 + 0.9, x0 + 1.8, 4.3, z1 + 1.0, 2.5, 0xd8707e);                  // parapeito rosa
        box(M.winDark, x0 + 0.2, 3.5, z1, x0 + 1.6, 5.6, z1 + 0.02, 1, null, false);
        houseWindow([x0 + 3.2, 4.8, z1], [0, 0, 1], 1.1, 1.1, 'grade', M.alu);
        box(M.concrete, x0 - 0.04, h, z0 - 0.04, x1 + 0.04, h + 0.9, z1 + 0.04, 0.8, null, false);          // mureta do terraço
        for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) bar(M.alu, [px, h + 0.9, pz], [px, h + 2.4, pz], 0.04, true);
        { const R = [[x0 - 0.3, h + 2.5, z0 - 0.3], [x1 + 0.3, h + 2.5, z0 - 0.3], [x1 + 0.3, h + 2.25, z1 + 0.5], [x0 - 0.3, h + 2.25, z1 + 0.5]];
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => R[i]), 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => [R[i][0] * 0.8, R[i][2] * 0.8]), 2)); g.computeVertexNormals(); put(M.zincRoof, g, true); }
        for (const y of [4.6, 5.5]) put(M.alu, xform(new THREE.CylinderGeometry(0.32, 0.28, 0.1, 16), [x1 + 0.35, y, z1 - 0.3], 0, 0, Math.PI / 2 - 0.3), false);   // antenas parabólicas
        bar(M.pvc, [x1 + 0.08, 0, z1 + 0.06], [x1 + 0.08, h, z1 + 0.06], 0.05, false);
        break;
      }
      case 'shed': {   // quartinho encostado no sobrado: porta de madeira e telhadinho de fibrocimento
        box(M.plaster, x0, 0, z0, x1, h, z1, 2.5, 0x8e9296);
        box(M.doorWood, x0 + 0.25, 0, z1, x1 - 0.25, 1.95, z1 + 0.04, 1, null, false);
        const R = [[x0 - 0.2, h + 0.3, z0], [x1 + 0.2, h + 0.3, z0], [x1 + 0.2, h - 0.05, z1 + 0.5], [x0 - 0.2, h - 0.05, z1 + 0.5]];
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => R[i]), 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => [R[i][0] * 0.8, R[i][2] * 0.8]), 2)); g.computeVertexNormals(); put(M.zincRoof, g, true);
        break;
      }
      case 'tilson': {   // varanda gradeada (foto 458 Rua Papoulas): mureta e grade na frente, beiral grosso escuro com telha, salão vermelho no fundo, andar de cima branco
        const fx = x1 - 2.4;                                                                              // fundo da varanda
        box(M.paintWall, x0, 0, z0, fx, 2.8, z1, 2.5, 0xb8402e);                                          // salão (parede vermelha que aparece pela grade)
        box(M.paintWall, fx, 0, z0, x1, 2.8, z0 + 0.2, 2.5, 0xeeeeea); box(M.paintWall, fx, 0, z1 - 0.2, x1, 2.8, z1, 2.5, 0xeeeeea);   // paredes brancas dos lados
        flat(M.white, fx, z0 + 0.2, x1, z1 - 0.2, 0.02, 1);
        box(M.winDark, fx - 0.02, 0, z0 + 1.0, fx, 2.2, z0 + 2.2, 1, null, false);                         // porta do salão
        box(M.white, fx, 0, z1 - 1.9, fx + 0.7, 1.7, z1 - 0.3, 1);                                         // geladeira branca
        box(M.paintWall, x1 - 0.2, 0, z1 - 3.1, x1, 0.95, z1, 2.5, 0xeeeeea);                             // mureta branca na frente
        for (let zz = z0 + 0.3; zz < z1 - 0.1; zz += 0.17) bar(M.alu, [x1 - 0.1, zz > z1 - 3.1 ? 0.95 : 0, zz], [x1 - 0.1, 2.75, zz], 0.018, false);   // grade
        for (const y of [1.0, 2.0, 2.7]) bar(M.alu, [x1 - 0.1, y, z0 + 0.25], [x1 - 0.1, y, z1 - 0.2], 0.025, false);
        box(M.dark, x0, 2.8, z0 - 0.2, x1 + 0.35, 3.45, z1 + 0.2, 1);                                      // beiral grosso escuro
        box(M.roof, x1 + 0.05, 3.45, z0 - 0.2, x1 + 0.45, 3.58, z1 + 0.2, 1, null, false);                 // telha na beira do beiral
        box(M.paintWall, x0, 3.45, z0, x1 - 1.2, h, z1, 2.5, 0xf0f0ec);                                    // andar de cima branco, recuado
        box(M.dark, x0, h, z0 - 0.05, x1 - 1.15, h + 0.1, z1 + 0.05, 1, null, false);
        { const R = [[x0 - 0.2, h + 0.7, z0 - 0.3], [x1 - 0.6, h + 0.25, z0 - 0.3], [x1 - 0.6, h + 0.25, z0 + 3.6], [x0 - 0.2, h + 0.7, z0 + 3.6]];   // telhado de zinco num pedaço da laje
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => R[i]), 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => [R[i][0] * 0.8, R[i][2] * 0.8]), 2)); g.computeVertexNormals(); put(M.zincRoof, g, true);
          for (const zz of [z0 - 0.2, z0 + 3.5]) bar(M.dark, [x1 - 0.7, h, zz], [x1 - 0.7, h + 0.25, zz], 0.04, false); }
        for (const [tz, col] of [[z0 + 2.4, M.white], [z0 + 4.6, M.white]]) {                               // mesas brancas e cadeirinhas coloridas na varanda
          box(col, fx + 0.6, 0.7, tz - 0.4, fx + 1.4, 0.75, tz + 0.4, 1); for (const [ox, oz] of [[0.65, -0.35], [1.35, -0.35], [0.65, 0.35], [1.35, 0.35]]) bar(col, [fx + ox, 0, tz + oz], [fx + ox, 0.7, tz + oz], 0.025, false);
        }
        for (const [cz, m] of [[z0 + 3.5, M.red], [z0 + 5.6, M.blueToy], [z0 + 6.3, M.red]]) { box(m, fx + 1.7, 0.3, cz - 0.17, fx + 2.05, 0.35, cz + 0.17, 1); box(m, fx + 2.0, 0.35, cz - 0.17, fx + 2.05, 0.7, cz + 0.17, 1); }
        { const g = new THREE.PlaneGeometry(1.0, 0.6); g.rotateY(Math.PI / 2); g.translate(fx + 0.01, 2.3, z0 + 4.2); put(M.tilsonSign, g, false); }
        break;
      }
      case 'brancorosas': {   // continuação da Assembleia na Rosas (foto 20 Rua Cravos): branco liso, janelas escuras em cima, grades e basculantes embaixo, ar-condicionado
        box(M.plaster, x0, 0, z0, x1, h, z1, 2.5, 0xf4f4f0);
        box(M.plaster, x0 - 0.06, h, z0 - 0.06, x1 + 0.06, h + 0.35, z1 + 0.06, 2.5, 0xe6e6e0, false);
        const L = z1 - z0;
        for (let k = 0; k < 3; k++) {   // janelas de cima (vidro escuro com moldura branca)
          const wz = z0 + 1.5 + k * (L - 3) / 2;
          box(M.white, x0 - 0.06, 4.1, wz - 0.75, x0, 5.8, wz + 0.75, 1, null, false);
          box(M.winDark, x0 - 0.07, 4.2, wz - 0.65, x0 - 0.06, 5.7, wz + 0.65, 1, null, false);
          bar(M.white, [x0 - 0.08, 4.2, wz], [x0 - 0.08, 5.7, wz], 0.025); bar(M.white, [x0 - 0.08, 5.0, wz - 0.65], [x0 - 0.08, 5.0, wz + 0.65], 0.025);
        }
        for (const [wz, grade] of [[z0 + 1.4, 1], [z0 + 3.2, 1], [z0 + 5.0, 0], [z0 + 6.5, 0]]) {   // embaixo: duas janelas gradeadas e duas basculantes pequenas
          if (grade) {
            box(M.winDark, x0 - 0.04, 1.0, wz - 0.55, x0, 2.4, wz + 0.55, 1, null, false);
            for (let u = -0.5; u <= 0.51; u += 0.1) bar(M.gateWhite, [x0 - 0.07, 1.0, wz + u], [x0 - 0.07, 2.4, wz + u], 0.015);
            for (const y of [1.0, 1.35, 1.7, 2.05, 2.4]) bar(M.gateWhite, [x0 - 0.07, y, wz - 0.55], [x0 - 0.07, y, wz + 0.55], 0.015);
          } else {
            box(M.sill, x0 - 0.05, 1.75, wz - 0.5, x0, 2.35, wz + 0.5, 1, null, false);
            box(M.winDark, x0 - 0.06, 1.82, wz - 0.42, x0 - 0.05, 2.28, wz + 0.42, 1, null, false);
            for (const dy of [-0.08, 0.08]) box(M.alu, x0 - 0.09, 2.05 + dy - 0.012, wz - 0.42, x0 - 0.05, 2.05 + dy + 0.012, wz + 0.42, 1, null, false);
          }
        }
        for (const [wz, y] of [[z0 + 2.3, 2.9], [z0 + 4.1, 2.9], [z1 - 0.8, 3.7]]) box(M.white, x0 - 0.45, y, wz - 0.32, x0, y + 0.42, wz + 0.32, 1, null, true);   // aparelhos de ar
        box(M.grimeBand, x0 - 0.02, 0, z0, x0, 0.35, z1, 1, 0xc8c8c0, false);
        break;
      }
      case 'barrosas': {   // bar e mercearia (foto 124 R. das Rosas): salão recuado de azulejo branco, varanda com toldo comprido de zinco na Rosas
        const sx = x0 + 2.8, AW = 1.3, lo = 2.25;   // sx: parede do salão; o toldo passa da varanda e cobre a calçada
        box(M.paintWall, sx, 0, z0, x1, h, z1, 2.5, 0xf0eee6);
        flat(M.white, x0, z0, sx, z1, 0.02, 1);                                                          // piso de cerâmica da varanda
        box(M.white, sx - 0.03, 0, z0 + 0.1, sx, 2.6, z1 - 0.1, 1, null, false);                           // azulejo branco na parede do salão
        box(M.dark, sx - 0.05, 0, z0 + 1.4, sx - 0.03, 2.3, z0 + 4.2, 1, null, false);                     // portas abertas do salão
        box(M.dark, sx - 0.05, 0, z0 + 5.4, sx - 0.03, 2.3, z0 + 7.6, 1, null, false);
        for (let u = 0; u <= 0.7; u += 0.07) box(M.white, sx - 0.06, 0.9, z0 + 8.4 + u, sx - 0.04, 2.1, z0 + 8.43 + u, 1, null, false);   // janela de venezianas
        { const g = new THREE.PlaneGeometry(3.4, 1.0); g.rotateY(-Math.PI / 2); g.translate(sx - 0.06, 1.75, z1 - 2.2); put(SIGNS.mercearia, g, false); }   // letreiro pintado na parede
        box(M.white, sx - 0.8, 0, z0 + 0.3, sx - 0.1, 1.05, z0 + 1.2, 1);                                    // freezer
        for (let k = 0; k < 9; k++) { const y = (k % 3) * 0.3; box(M.paintWall, sx - 0.55 - ((k / 3) | 0) * 0.5, y, z0 + 4.5, sx - 0.1 - ((k / 3) | 0) * 0.5, y + 0.29, z0 + 4.95, 1, k % 2 ? 0x2a4ab0 : 0xc83228); }   // engradados
        // toldo de zinco comprido, do salão até a beira da calçada, com postes brancos
        { const dx = sx - (x0 - AW), dy = 2.95 - lo, L = Math.hypot(dx, dy), g = new THREE.BoxGeometry(L, 0.04, z1 - z0 + 0.7);
          g.rotateZ(Math.atan2(dy, dx)); g.translate((sx + x0 - AW) / 2, (2.95 + lo) / 2, (z0 + z1) / 2 + 0.05); put(M.zincRoof, g, true); }
        for (let pz = z0 + 0.2; pz <= z1 + 0.3; pz += (z1 - z0) / 4) bar(M.gateWhite, [x0 - AW + 0.1, 0, pz], [x0 - AW + 0.1, lo, pz], 0.04, true);
        bar(M.gateWhite, [x0 - AW + 0.1, lo, z0 - 0.2], [x0 - AW + 0.1, lo, z1 + 0.3], 0.035);
        { const g = new THREE.PlaneGeometry(2.6, 0.75); g.translate(x0 + 1.4, 1.95, z1 + 0.42); put(SIGNS.mercearia, g, false); }   // faixa amarela para a Margaridas
        // telhado do salão: empena com frisos virada para a Rosas no meio, laje no resto
        const gz0 = z0 + 2.5, gz1 = z1 - 2.5, rise = 1.5, gm = (gz0 + gz1) / 2, half = (gz1 - gz0) / 2;
        box(M.concrete, sx, h, z0, x1, h + 0.12, z1, 1, null, false);
        gable(sx - 0.1, gz0, x1, gz1, h + 0.12, false, rise);
        { const sh = new THREE.Shape(); sh.moveTo(-half, 0); sh.lineTo(0, rise); sh.lineTo(half, 0); sh.lineTo(-half, 0);
          const g = new THREE.ShapeGeometry(sh); g.rotateY(-Math.PI / 2); g.translate(sx - 0.12, h + 0.12, gm); put(M.white, g, false); }
        for (let zz = gz0 + 0.6; zz < gz1 - 0.5; zz += 0.42) { const top = rise * (1 - Math.abs(zz - gm) / half); if (top > 0.7) box(M.dark, sx - 0.15, h + 0.35, zz - 0.04, sx - 0.13, h + 0.12 + Math.min(top - 0.25, 0.75), zz + 0.04, 1, null, false); }   // frisos (vãos de ventilação)
        // guarda-sóis fechados, vasos de planta e o carrinho de madeira
        for (const uz of [z0 + 3.4, z0 + 9.2]) { cyl(M.white, x0 - 0.2, 0, uz, 0.035, 0.035, 2.2, 6); put(M.white, xform(new THREE.ConeGeometry(0.2, 1.3, 8), [x0 - 0.2, 1.85, uz]), false); }
        for (const [vx, vz] of [[x0 + 0.35, z1 - 0.6], [x0 + 0.35, z1 - 1.3], [x0 + 0.35, z0 + 6.9]]) { cyl(M.concrete, vx, 0, vz, 0.22, 0.28, 0.45, 10); put(M.foliage, xform(new THREE.IcosahedronGeometry(0.4, 0), [vx, 0.75, vz]), false); }
        box(M.crate, x0 - 1.0, 0, z0 - 1.6, x0 + 0.1, 0.8, z0 - 0.4, 1);
        cyl(M.rust, x0 - 0.9, 0, z1 + 0.9, 0.25, 0.28, 0.75, 14);                                          // lixeira na esquina
        // frente para a Margaridas: janela de madeira e porta de enrolar
        const wx = sx + 0.9;
        box(M.sill, wx - 0.55, 1.0, z1, wx + 0.55, 2.2, z1 + 0.05, 1, null, false); box(M.crate, wx - 0.48, 1.07, z1 + 0.05, wx + 0.48, 2.13, z1 + 0.07, 1, null, false);
        box(M.rollup, x1 - 1.6, 0, z1, x1 - 0.3, 2.3, z1 + 0.04, 1, null, false);
        break;
      }
      case 'pltable': {   // mesa de plástico com quatro cadeiras
        const tm = new THREE.MeshStandardMaterial({ color: b.hex, roughness: 0.55 });
        box(tm, x0, 0.7, z0, x1, 0.75, z1, 1);
        for (const [px, pz] of [[x0 + 0.06, z0 + 0.06], [x1 - 0.06, z0 + 0.06], [x0 + 0.06, z1 - 0.06], [x1 - 0.06, z1 - 0.06]]) bar(tm, [px, 0, pz], [px, 0.7, pz], 0.03, false);
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2, ox = cx + Math.cos(a) * 0.75, oz = cz + Math.sin(a) * 0.75, cm = k % 2 ? M.white : tm;
          box(cm, ox - 0.2, 0.42, oz - 0.2, ox + 0.2, 0.46, oz + 0.2, 1, null, false);
          const bx = ox + Math.cos(a) * 0.2, bz = oz + Math.sin(a) * 0.2, tx = Math.abs(Math.sin(a)) * 0.2 + 0.02, tz = Math.abs(Math.cos(a)) * 0.2 + 0.02;
          box(cm, bx - tx, 0.46, bz - tz, bx + tx, 0.9, bz + tz, 1, null, false);
          for (const [lx, lz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) bar(cm, [ox + lx, 0, oz + lz], [ox + lx, 0.42, oz + lz], 0.015, false);
        }
        break;
      }
      case 'mureta': box(M.paintWall, x0, 0, z0, x1, h, z1, 2.5, 0xeeeeea); break;
      case 'cubal': {   // bar de reboco cinza descascado: janela gradeada com cobogó em cima, placa preta, porta dupla de metal, faixa de cobogó
        box(M.plasterPeel, x0, 0, z0, x1, h, z1, 2.2, 0xa8acb0);
        box(M.grimeBand, x0 - 0.025, 0, z0 - 0.025, x1 + 0.025, 0.45, z1 + 0.025, 1, 0x6a6c70, false);
        const wx = x0 + 1.5;
        box(M.sill, wx - 0.6, 1.15, z1, wx + 0.6, 1.95, z1 + 0.05, 1, null, false);
        box(M.winDark, wx - 0.5, 1.22, z1 + 0.05, wx + 0.5, 1.88, z1 + 0.06, 1, null, false);
        for (let y = 1.3; y < 1.88; y += 0.11) box(M.fenceGreen, wx - 0.5, y, z1 + 0.06, wx + 0.5, y + 0.05, z1 + 0.08, 1, null, false);
        box(M.cobogo, wx - 0.35, 2.15, z1, wx + 0.35, 2.6, z1 + 0.02, 0.45, null, false);
        { const g = new THREE.PlaneGeometry(3.3, 1.15); g.translate(x1 - 2.6, 2.6, z1 + 0.04); put(M.barSign, g, false); }
        const dx = x1 - 2.6;
        box(M.brownFrame, dx - 0.85, 0, z1, dx + 0.85, 2.05, z1 + 0.05, 1, null, false);
        for (const s2 of [-1, 1]) box(M.greyDoor, dx + s2 * 0.41 - 0.36, 0.05, z1 + 0.05, dx + s2 * 0.41 + 0.36, 2.0, z1 + 0.07, 1, null, false);
        box(M.cobogoOrange, x0, h - 0.4, z1, x1, h - 0.05, z1 + 0.02, 0.35, null, false);
        box(M.cobogoOrange, x1, h - 0.4, z0, x1 + 0.02, h - 0.05, z1, 0.35, null, false);
        box(M.brownFrame, x1, 0, z0 + 1.0, x1 + 0.04, 2.1, z0 + 2.4, 1, null, false);                       // portão cinza no fundo do lado da pracinha
        box(M.greyDoor, x1 + 0.04, 0.05, z0 + 1.05, x1 + 0.06, 2.05, z0 + 2.35, 1, null, false);
        { const g = new THREE.PlaneGeometry(2.6, 1.0); g.rotateY(Math.PI / 2); g.translate(x1 + 0.05, 2.55, z1 - 1.6); put(M.barSign, g, false); }
        { const A = [[x1, h - 0.1, z0 - 0.2], [x1 + 1.6, h - 0.55, z0 - 0.2], [x1 + 1.6, h - 0.55, z1 + 0.35], [x1, h - 0.1, z1 + 0.35]];   // cobertura de telha sobre a porta lateral
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => A[i]), 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => [A[i][0] * 0.8, A[i][2] * 0.8]), 2)); g.computeVertexNormals(); put(M.zincRoof, g, true); }
        const R = [[x0 - 0.1, h + 0.5, z0 - 0.2], [x1 + 0.3, h + 0.5, z0 - 0.2], [x1 + 0.3, h, z1 + 0.35], [x0 - 0.1, h, z1 + 0.35]];   // telhado de fibrocimento caindo para a Margaridas
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => R[i]), 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 1, 0, 3, 2].flatMap(i => [R[i][0] * 0.8, R[i][2] * 0.8]), 2)); g.computeVertexNormals(); put(M.zincRoof, g, true);
        box(M.sill, x0 - 0.1, h - 0.05, z1 + 0.25, x1 + 0.3, h + 0.05, z1 + 0.4, 1, null, false);
        break;
      }
      case 'grafwall': {   // muro grafitado (o desenho vai do lado da rua)
        box(M.paintWall, x0 + 0.02, 0, z0, x1, h, z1, 2.5, 0xd8d6ce);
        box(M.concrete, x0 - 0.03, h, z0, x1 + 0.03, h + 0.08, z1, 1, null, false);
        const L = z1 - z0, g = new THREE.PlaneGeometry(L, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * L / 7);
        M.graf.map.wrapS = THREE.RepeatWrapping; g.rotateY(-Math.PI / 2); g.translate(x0, h / 2, cz); put(M.graf, g, false);
        break;
      }
      case 'cart': {   // carrinho de lanche: caixa de metal com vidro, toldo e rodas
        box(M.dark, x0, 0.25, z0, x1, 1.05, z1, 1);
        box(M.glass, x0 + 0.05, 1.05, z0 + 0.05, x1 - 0.05, 1.65, z1 - 0.05, 1, null, false);
        box(M.yellow, x0 - 0.05, 0.45, z0 - 0.01, x0, 0.95, z1 + 0.01, 1, null, false);
        box(M.alu, x0 - 0.25, 1.65, z0 - 0.1, x1 + 0.05, 1.72, z1 + 0.1, 1);
        for (const zz of [z0 + 0.25, z1 - 0.25]) cyl(M.tire, cx, 0, zz, 0.25, 0.25, 0.08, 12);
        break;
      }
      case 'banca': {   // banca rosa com balcão de metal e cobertura
        box(M.pink, x0 + 0.5, 0, z0, x1, h - 0.1, z1, 1);
        box(M.alu, x0, 0, z0 + 0.1, x0 + 0.5, 0.95, z1 - 0.1, 1);
        box(M.dark, x0 + 0.48, 1.0, z0 + 0.15, x0 + 0.51, 1.9, z1 - 0.15, 1, null, false);
        box(M.alu, x0 - 0.5, h - 0.1, z0 - 0.15, x1 + 0.1, h, z1 + 0.15, 1);
        for (const zz of [z0, z1]) bar(M.alu, [x0 - 0.45, 0, zz], [x0 - 0.45, h - 0.1, zz], 0.02, true);
        break;
      }
      case 'pallet': for (let y = 0.05; y < h; y += 0.19) box(M.crate, x0, y, z0, x1, y + 0.13, z1, 1); for (const zz of [z0, (z0 + z1) / 2 - 0.05, z1 - 0.1]) box(M.wood, x0 - 0.02, 0, zz, x1 + 0.02, h, zz + 0.1, 1); break;
      case 'bin': if (b.blue) { cyl(M.blueToy, cx, 0, cz, 0.29, 0.31, h - 0.04, 14); cyl(M.dark, cx, h - 0.04, cz, 0.31, 0.31, 0.04, 14); break; } if (b.red) { cyl(M.redBin, cx, 0, cz, 0.24, 0.27, h - 0.06, 14); cyl(M.dark, cx, h - 0.06, cz, 0.28, 0.28, 0.06, 14); break; } cyl(M.orange, cx, 0, cz, 0.27, 0.31, h - 0.08, 14); cyl(M.orange, cx, h - 0.08, cz, 0.33, 0.33, 0.08, 14); break;
      case 'muroblock': {   // muro cinza de bloco de concreto, encardido, com junta e uns rabiscos; moitas e arbustos na frente (lado da rua)
        box(M.plaster, x0, 0, z0, x1, h, z1, 2.5, 0xd6d6ce);
        box(M.concrete, x0 - 0.04, h, z0 - 0.02, x1 + 0.04, h + 0.06, z1 + 0.02, 1, 0x9a9a94, false);
        if (z1 - z0 < 2) break;
        for (let y = 0.2; y < h; y += 0.2) box(M.plaster, x0 - 0.012, y - 0.008, z0, x0, y + 0.008, z1, 1, 0xa0a09a, false);
        const r = rand(Math.round(z0 * 7) + 911);
        for (let z = z0 + 0.6; z < z1 - 0.6; z += 0.9 + r() * 1.6) {   // moitas na faixa de terra
          const n = 2 + ((r() * 4) | 0), bx = x0 - 0.5 - r() * 0.5;
          for (let k = 0; k < n; k++) put(M.foliage, xform(new THREE.IcosahedronGeometry(0.35 + r() * 0.45, 0), [bx + (r() - 0.5) * 0.6, 0.3 + r() * 0.9, z + (r() - 0.5) * 0.9]), true);
          if (r() < 0.25) tree(bx - 0.1, 0, z, 0.7 + r() * 0.4);
        }
        if (!M.tag) M.tag = new THREE.MeshStandardMaterial({ map: canvasTexWH(512, 192, (g, w, hh) => {   // pichação roxa com contorno branco (sem fundo)
          g.clearRect(0, 0, w, hh); g.lineCap = g.lineJoin = 'round';
          const wave = () => { g.beginPath(); g.moveTo(30, 110); g.bezierCurveTo(110, 20, 180, 170, 260, 80); g.bezierCurveTo(330, 10, 400, 150, 480, 70); };
          wave(); g.strokeStyle = '#f4f2f8'; g.lineWidth = 70; g.stroke(); wave(); g.strokeStyle = '#6a4ab8'; g.lineWidth = 54; g.stroke();
          g.font = 'bold 34px sans-serif'; g.fillStyle = '#f4f2f8'; g.fillText('DX  25', 300, 175); g.fillText('VILA', 60, 40);
        }), transparent: true, alphaTest: 0.2, roughness: 0.9 });
        for (const gz of [z0 + (z1 - z0) * 0.3, z0 + (z1 - z0) * 0.72]) {   // pichações no muro
          const g = new THREE.PlaneGeometry(3.6, 1.35); g.rotateY(-Math.PI / 2); g.translate(x0 - 0.015, 1.3, gz); put(M.tag, g, false);
        }
        flat(M.dirt, x0 - 1.15, z0, x0, z1, 0.02, 2);
        break;
      }
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
      case 'shrine': {   // oratório: canteiro branco com grade e flores, capelinha azul com nicho em arco nas faces e telhado de telha
        box(M.white, x0, 0, z0, x1, 0.35, z1, 1);
        flat(M.dirt, x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1, 0.36, 1);
        const RH = h, step = 0.13;
        for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) {
          const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / step);
          for (let k = 0; k <= n; k++) { const t = k / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t; bar(M.gateWhite, [px, 0.35, pz], [px, RH, pz], 0.012); }
          bar(M.gateWhite, [ax, RH, az], [bx, RH, bz], 0.025); bar(M.gateWhite, [ax, 0.55, az], [bx, 0.55, bz], 0.018);
        }
        const r = rand(77);
        for (let k = 0; k < 60; k++) {   // flores e folhagem no canteiro
          const a = r() * Math.PI * 2, rr = 0.8 + r() * 0.35, fx = cx + Math.cos(a) * rr * 1.0, fz = cz + Math.sin(a) * rr * 1.0;
          if (Math.abs(fx - cx) > 1.2 || Math.abs(fz - cz) > 1.2) continue;
          put(k % 3 ? M.foliage : M.flower, xform(new THREE.IcosahedronGeometry(0.05 + r() * 0.05, 0), [fx, 0.42 + r() * 0.25, fz]), false);
        }
        const s2 = 0.72, by = 0.35, top = 2.75;
        box(M.white, cx - s2 - 0.05, by, cz - s2 - 0.05, cx + s2 + 0.05, by + 0.25, cz + s2 + 0.05, 1);
        box(M.shrineBlue, cx - s2, by + 0.25, cz - s2, cx + s2, top, cz + s2, 1);
        for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(M.white, cx + ox * s2 - 0.08, by + 0.25, cz + oz * s2 - 0.08, cx + ox * s2 + 0.08, top, cz + oz * s2 + 0.08, 1, null, false);
        box(M.white, cx - s2 - 0.12, top, cz - s2 - 0.12, cx + s2 + 0.12, top + 0.14, cz + s2 + 0.12, 1);
        for (const [nx, nz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {   // nicho em arco: moldura branca e vidro escuro
          const ry = Math.atan2(nx, nz), fx = cx + nx * (s2 + 0.01), fz = cz + nz * (s2 + 0.01);
          const fr = new THREE.BoxGeometry(0.66, 1.15, 0.04); fr.translate(0, 1.55, 0); fr.rotateY(ry); fr.translate(fx, 0, fz); put(M.white, fr, false);
          const ar = new THREE.CylinderGeometry(0.33, 0.33, 0.04, 16, 1, false, -Math.PI / 2, Math.PI); ar.rotateX(-Math.PI / 2); ar.translate(0, 2.12, 0); ar.rotateY(ry); ar.translate(fx, 0, fz); put(M.white, ar, false);
          const gl = new THREE.BoxGeometry(0.46, 1.0, 0.03); gl.translate(0, 1.55, 0.02); gl.rotateY(ry); gl.translate(fx, 0, fz); put(M.glass, gl, false);
          const ga = new THREE.CylinderGeometry(0.23, 0.23, 0.03, 16, 1, false, -Math.PI / 2, Math.PI); ga.rotateX(-Math.PI / 2); ga.translate(0, 2.05, 0.02); ga.rotateY(ry); ga.translate(fx, 0, fz); put(M.glass, ga, false);
        }
        put(M.roof, xform(new THREE.ConeGeometry(1.3, 0.85, 4, 1), [cx, top + 0.14 + 0.42, cz], Math.PI / 4), true);
        break;
      }
      case 'ptable':
        if (b.white) {   // mesa e cadeiras brancas de plástico
          box(M.plastic, x0 + 0.1, 0.7, z0 + 0.1, x1 - 0.1, 0.74, z1 - 0.1, 1, null, false);
          for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bar(M.plastic, [cx + ox * 0.3, 0, cz + oz * 0.3], [cx + ox * 0.3, 0.7, cz + oz * 0.3], 0.025);
          for (const sz of [-1, 1]) {
            const oz = cz + sz * 0.72;
            box(M.plastic, cx - 0.22, 0.42, oz - 0.2, cx + 0.22, 0.46, oz + 0.2, 1, null, false);
            box(M.plastic, cx - 0.22, 0.46, oz + sz * 0.18 - 0.02, cx + 0.22, 0.85, oz + sz * 0.18 + 0.02, 1, null, false);
            for (const ox of [-0.2, 0.2]) for (const dz of [-0.17, 0.17]) bar(M.plastic, [cx + ox, 0, oz + dz], [cx + ox, 0.42, oz + dz], 0.02);
          }
          break;
        }
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
  function areca(x, z) {   // touceira de palmeirinha
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9, h = 1.6 + (k % 3) * 0.5, tx = x + Math.cos(a) * 0.25, tz = z + Math.sin(a) * 0.25;
      bar(M.bananaTrunk, [x, 0, z], [tx, h, tz], 0.03, true);
      const g = new THREE.PlaneGeometry(0.7, 1.6); g.translate(0, -0.8, 0); g.rotateX(-1.0); g.rotateY(a); g.translate(tx, h, tz); put(M.palmLeaf, g, true);
      const g2 = new THREE.PlaneGeometry(0.6, 1.3); g2.translate(0, -0.65, 0); g2.rotateX(-1.1); g2.rotateY(a + Math.PI); g2.translate(tx, h, tz); put(M.palmLeaf, g2, true);
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
      // detalhes: coluna do meio, retrovisores, linhas das portas, maçanetas, grade, placas e caixas de roda
      const sw = hw * 0.97 + 0.004;
      part(M.dark, -0.32, 0.86, -(hw - 0.12), -0.22, 1.32, hw - 0.12);                                     // coluna entre os vidros
      for (const s of [-1, 1]) {
        part(M.dark, hl - 1.12, 0.9, s * (hw + 0.02) - 0.05, hl - 0.98, 1.0, s * (hw + 0.02) + 0.05);        // haste do retrovisor
        part(M.paint, hl - 1.15, 0.92, s * (hw + 0.1) - 0.06, hl - 0.98, 1.06, s * (hw + 0.1) + 0.06, col);  // retrovisor
        for (const u of [0.25, -0.78]) part(M.dark, u - 0.012, 0.36, s * sw - 0.006, u + 0.012, 0.84, s * sw + 0.006);   // fresta da porta
        for (const u of [0.0, -1.0]) part(M.alu, u - 0.09, 0.7, s * sw - 0.012, u + 0.09, 0.74, s * sw + 0.012);       // maçaneta
        for (const u of [hl - 0.78, -hl + 0.78]) part(M.dark, u - 0.45, 0.62, s * (hw - 0.02) - 0.02, u + 0.45, 0.68, s * (hw - 0.02) + 0.02);   // caixa de roda
      }
      part(M.dark, hl - 0.01, 0.56, -(hw - 0.45), hl + 0.04, 0.74, hw - 0.45);                              // grade
      for (const e of [hl + 0.065, -hl - 0.075]) part(M.white, e - 0.005, 0.38, -0.2, e + 0.005, 0.5, 0.2);  // placas
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

  // ---- quiosques em frente à praça: paredes pintadas, porta colorida, porta de enrolar ou balcão, letreiro e cobertura de zinco
  function drawKiosk(b) {
    const [x0, , z0] = b.min, [x1, h, z1] = b.max, cz = (z0 + z1) / 2, L = z1 - z0;
    if (b.open) {   // galpão aberto: fundo e laterais, pilares na frente
      box(M.paintWall, x1 - 0.2, 0, z0, x1, h, z1, 2.5, b.hex);
      for (const [a, c] of [[z0, z0 + 0.15], [z1 - 0.15, z1]]) box(M.paintWall, x0 + 0.6, 0, a, x1, h, c, 2.5, b.hex);
      for (const zz of [z0 + 0.1, z1 - 0.1]) bar(M.dark, [x0 + 0.1, 0, zz], [x0 + 0.1, h, zz], 0.06, true);
      box(M.wood, x1 - 1.0, 0, z0 + 0.4, x1 - 0.25, 0.9, z1 - 0.4, 1);   // bancada no fundo
    } else {
      box(M.paintWall, x0, 0, z0, x1, h, z1, 2.5, b.hex);
      box(M.grimeBand, x0 - 0.01, 0, z0, x0, 0.35, z1, 1.4, b.hex, false);
    }
    if (b.rollup) {
      box(M.rollup, x0 - 0.05, 0, z0 + 0.3, x0, 2.35, z1 - 0.3, 1, null, false);
      box(M.dark, x0 - 0.09, 2.35, z0 + 0.22, x0, 2.5, z1 - 0.22, 1, null, false);
    }
    if (b.door) {   // porta de metal pintada e uma janelinha gradeada
      const dz = b.counter ? z1 - 1.2 : cz + 0.35;
      box(M.paintDoor, x0 - 0.05, 0, dz - 0.45, x0, 2.1, dz + 0.45, 1, b.door, false);
      box(M.dark, x0 - 0.06, 1.0, dz + 0.2, x0 - 0.04, 1.06, dz + 0.3, 1, null, false);
      if (!b.counter && L > 2.6) {
        box(M.winDark, x0 - 0.02, 1.1, z0 + 0.35, x0, 1.9, z0 + 1.1, 1, null, false);
        for (let u = z0 + 0.42; u < z0 + 1.1; u += 0.12) bar(M.alu, [x0 - 0.05, 1.1, u], [x0 - 0.05, 1.9, u], 0.012);
      }
    }
    if (b.counter) {   // balcão aberto com a parte de dentro escura
      const za = z0 + 0.4, zb = b.door ? z1 - 1.8 : z1 - 0.4;
      box(M.winDark, x0 - 0.02, 1.05, za, x0, 1.95, zb, 1, null, false);
      box(M.alu, x0 - 0.35, 0.95, za - 0.05, x0, 1.0, zb + 0.05, 1, null, false);
      if (!b.door) for (const zz of [za + 0.5, (za + zb) / 2, zb - 0.5]) cyl(M.dark, x0 - 0.6, 0, zz, 0.16, 0.16, 0.7, 10);   // banquinhos
    }
    if (b.band) { const g = new THREE.PlaneGeometry(L - 0.1, 0.55); g.rotateY(-Math.PI / 2); g.translate(x0 - 0.02, h - 0.45, cz); put(M.pizzaBand, g, false); }
    if (b.sign) { const g = new THREE.PlaneGeometry(b.band ? 1.5 : Math.min(L - 0.6, 2.4), b.band ? 0.4 : 0.55); g.rotateY(-Math.PI / 2); g.translate(x0 - 0.03, b.band ? 2.25 : h - 0.42, cz); put(KSIGNS[b.sign], g, false); }
    const o = 1.3, R = [[x1, h + 0.25, z0 - 0.02], [x0 - o, h - 0.2, z0 - 0.02], [x0 - o, h - 0.2, z1 + 0.02], [x1, h + 0.25, z1 + 0.02]];   // cobertura de zinco caindo para a rua
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap(i => R[i]), 3)); g.computeVertexNormals(); put(M.zinc, g, true);
    for (const zz of [z0 + 0.08, z1 - 0.08]) bar(M.alu, [x0 - o + 0.1, 0, zz], [x0 - o + 0.1, h - 0.18, zz], 0.03, true);
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
    const [x0, , z0] = b.min, [x1, , z1] = b.max, WH = 2.8, NH = 4.6, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, R = (z1 - z0) / 2 * 1.05, rise = 2.4;
    for (const [a, c, d, e] of [[x0, z0, x1, z0 + 0.25], [x0, z1 - 0.25, x1, z1], [x0, z0, x0 + 0.25, z1], [x1 - 0.25, z0, x1, z1]]) box(M.plaster, a, 0, c, d, WH, e, 2.5, 0xf2f2ee);
    flat(M.courtGreen, x0 + 0.25, z0 + 0.25, x1 - 0.25, z1 - 0.25, 0.03, 2);
    const net = (L, rotY, cx, cz) => { const g = new THREE.PlaneGeometry(L, NH - WH); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.5, uv.getY(i) * (NH - WH) / 0.5); g.rotateY(rotY); g.translate(cx, (WH + NH) / 2, cz); put(M.chain, g, false); };
    net(x1 - x0, 0, mx, z0); net(x1 - x0, 0, mx, z1); net(z1 - z0, Math.PI / 2, x0, (z0 + z1) / 2); net(z1 - z0, Math.PI / 2, x1, (z0 + z1) / 2);
    const arc = (a) => [mz - R * Math.cos(a), NH + rise * Math.sin(a)], seg = 20, V = [];
    for (let k = 0; k < seg; k++) {
      const [za, ya] = arc(Math.PI * k / seg), [zb, yb] = arc(Math.PI * (k + 1) / seg);
      V.push(x0 - 0.4, ya, za, x1 + 0.4, ya, za, x1 + 0.4, yb, zb, x0 - 0.4, ya, za, x1 + 0.4, yb, zb, x0 - 0.4, yb, zb);
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); rg.computeVertexNormals(); put(M.arenaRoof, rg, true);
    for (let x = x0 - 0.3; x <= x1 + 0.35; x += (x1 - x0 + 0.6) / 8) for (let k = 0; k < seg; k += 2) { const [za, ya] = arc(Math.PI * k / seg), [zb, yb] = arc(Math.PI * (k + 2) / seg); bar(M.dark, [x, ya - 0.05, za], [x, yb - 0.05, zb], 0.05); }   // vigas do arco
    for (const xx of [x0, x1]) {   // tela nas pontas do arco
      const sh = new THREE.Shape(); sh.moveTo(-R, 0); for (let k = 1; k <= seg; k++) { const a = Math.PI * k / seg; sh.lineTo(-R * Math.cos(a), rise * Math.sin(a)); } sh.lineTo(-R, 0);
      const g = new THREE.ShapeGeometry(sh); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
      g.rotateY(Math.PI / 2); g.translate(xx, NH, mz); put(M.chain, g, false);
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
    else if (d.type === 'sidewalk') { flat(M.concrete, d.x0, d.z0, d.x1, d.z1, 0.025, 2); }
    else if (d.type === 'banana') {   // bananeira: tronco verde e folhas compridas abertas
      cyl(M.bananaTrunk, d.x, 0, d.z, 0.17, 0.12, 2.3, 8);
      for (let k = 0; k < 8; k++) { const g = new THREE.PlaneGeometry(0.75, 2.3); g.translate(0, 1.15, 0); g.rotateX(0.7 + (k % 3) * 0.25); g.rotateY(k * Math.PI / 4 + d.x); g.translate(d.x, 2.15, d.z); put(M.banana, g, true); }
    } else if (d.type === 'woodgate') {   // fim da Papoulas: portão de madeira com telhadinho entre pilares de pedra
      const { x, z } = d;
      for (const sx of [-1, 1]) box(M.stone, x + sx * 1.95 - 0.28, 0, z - 0.28, x + sx * 1.95 + 0.28, 2.7, z + 0.28, 1);
      box(M.doorWood, x - 1.67, 0, z - 0.05, x + 1.67, 2.35, z + 0.05, 1);
      for (let u = -1.5; u <= 1.5; u += 0.3) box(M.dark, x + u - 0.01, 0, z - 0.07, x + u + 0.01, 2.35, z - 0.05, 1, null, false);
      box(M.white, x - 3.5, 0, z - 0.1, x - 2.23, 2.3, z + 0.1, 1);
      if (d.social) {   // pilar de pedra do portão social (lado leste) e o telhado comprido cobrindo os dois portões
        box(M.stone, x + 3.22, 0, z - 0.28, x + 3.78, 2.7, z + 0.28, 1);
        gable(x - 2.45, z - 0.75, x + 4.05, z + 0.75, 2.7, false, 0.55);
      } else {
        gable(x - 2.45, z - 0.75, x + 2.45, z + 0.75, 2.7, false, 0.55);
        box(M.white, x + 2.23, 0, z - 0.1, x + 3.5, 2.3, z + 0.1, 1);
      }
    } else if (d.type === 'bigtent') {
      const R = 4.0, H = 4.6, E = 2.6, P = [[-R, -R], [R, -R], [R, R], [-R, R]];
      for (let k = 0; k < 4; k++) {
        const a = P[k], c = P[(k + 1) % 4], g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute([d.x, H, d.z, d.x + a[0], E, d.z + a[1], d.x + c[0], E, d.z + c[1]], 3)); g.computeVertexNormals();
        put(k % 2 ? M.tentGreen : M.tentOrange, g, true);
      }
      for (const [ox, oz] of [[-R + 0.2, -R + 0.2], [-R + 0.2, R - 0.2]]) bar(M.dark, [d.x + ox, 0, d.z + oz], [d.x + ox, E, d.z + oz], 0.04, true);   // mastros do lado da rua (os de trás ficam no barraco)
      bar(M.dark, [d.x, 0, d.z], [d.x, H, d.z], 0.05, true);
    } else if (d.type === 'gatehouse') {   // casa ao lado do portão (foto): cerca de pallets na frente, muro de placas, casa térrea com janela
      const z = MAP.size.maxZ, { x0, x1 } = d;
      for (let x = x0; x < x1 - 0.1; x += 1.2) {   // pallets em pé, um do lado do outro, meio tortos
        const e = Math.min(x1, x + 1.15), lean = ((x * 7) % 3 - 1) * 0.03;
        for (let y = 0.08; y < 1.0; y += 0.2) { const g = new THREE.BoxGeometry(e - x, 0.12, 0.03); g.rotateX(lean); g.translate((x + e) / 2, y, z + 0.05); put(M.oldWood, g, true); }
        for (const xx of [x + 0.05, e - 0.08]) box(M.oldWood, xx, 0, z + 0.07, xx + 0.08, 1.05, z + 0.12, 1, null, false);
      }
      for (let x = x0; x < x1; x += 4) bar(M.oldWood, [x + 0.3, 0, z + 0.02], [x + 0.3, 1.3, z + 0.02], 0.05, true);   // estacas mais altas
      box(M.concrete, x0, 0, z + 1.1, x1, 2.1, z + 1.25, 1.2);   // muro de placas de concreto entre pilares
      for (let x = x0; x <= x1; x += 2) box(M.concrete, x - 0.1, 0, z + 1.0, x + 0.1, 2.25, z + 1.3, 1);
      for (let y = 0.5; y < 2.1; y += 0.5) box(M.dark, x0, y - 0.01, z + 1.08, x1, y + 0.01, z + 1.1, 1, null, false);
      house({ min: [x0 + 1, 0, z + 2.6], max: [x1 - 0.5, 3.2, z + 10] , hex: 0xd8dad6, roof: 1, brick: 0 }, false);
      houseWindow([Math.min(x0 + 8.5, x1 - 2.2), 1.8, z + 2.6], [0, 0, -1], 1.6, 1.0, 'grade', M.alu);
      box(M.cobogo, x1 - 4.5, 2.1, z + 2.55, x1 - 3.5, 2.7, z + 2.6, 0.45, null, false);
      for (const [ax, az] of [[x1 - 1.4, z + 0.6], [x1 - 2.3, z + 0.7], [x1 - 0.7, z + 0.75]]) areca(ax, az);   // palmeirinhas atrás da cerca, do lado do portão
      for (let k = 0; k < 5; k++) { const bx = Math.min(x0 + 6, x1 - 6.2) + k * 1.3; put(M.foliage, xform(new THREE.IcosahedronGeometry(0.6, 0), [bx, 0.6, z + 0.7]), true); }   // arbustos com flor
      const fx = Math.min(x0 + 7.5, x1 - 2.5), fz = z + 1.8;   // flamboyant: árvore grande com flores laranja
      tree(fx, 0, fz, 1.8);
      const r = rand(91);
      for (let k = 0; k < 160; k++) put(M.flower, xform(new THREE.IcosahedronGeometry(0.07 + r() * 0.07, 0), [fx + (r() - 0.5) * 6, 4.8 + r() * 3.2, fz + (r() - 0.5) * 5]), false);
      for (let k = 0; k < 30; k++) put(M.flower, xform(new THREE.IcosahedronGeometry(0.06, 0), [Math.min(x0 + 6, x1 - 6.2) + r() * 5.6, 0.7 + r() * 0.6, z + 0.55]), false);
    } else if (d.type === 'areca') { areca(d.x, d.z);
    } else if (d.type === 'palmtall') { palm(d.x, d.z, 8 + (d.z % 3));
    } else if (d.type === 'drum') {   // tambor plástico preto de água
      cyl(M.dark, d.x, 0, d.z, 0.3, 0.33, 0.95, 14);
    } else if (d.type === 'rubble') {   // monte de entulho: tijolos e pedaços de concreto
      const r = rand(57);
      for (let k = 0; k < 26; k++) {
        const g = new THREE.BoxGeometry(0.2 + r() * 0.35, 0.08 + r() * 0.15, 0.15 + r() * 0.3); g.rotateY(r() * 3); g.rotateX((r() - 0.5) * 0.6);
        g.translate(d.x + (r() - 0.5) * 1.4, 0.05 + r() * 0.35 * (1 - Math.abs(r() - 0.5)), d.z + (r() - 0.5) * 3.2); put(r() < 0.55 ? M.rubbleBrick : M.concrete, g, true);
      }
    } else if (d.type === 'endhouse') {   // casa do fim da rua, atrás do portão
      house({ min: [d.x - 5, 0, d.z + 0.6], max: [d.x + 5, 3.3, d.z + 7], hex: 0xeee6d8, roof: 1, brick: 0 }, false);
    } else if (d.type === 'portal') {   // pórtico de concreto sem portão: dois pilares e a viga em cima
      for (const dx of [0, 2.4]) box(M.concrete, d.x + dx - 0.15, 0, d.z - 0.15, d.x + dx + 0.15, 2.4, d.z + 0.15, 1);
      box(M.concrete, d.x - 0.2, 2.4, d.z - 0.17, d.x + 2.6, 2.75, d.z + 0.17, 1);
    } else if (d.type === 'pallet') {   // pallet encostado
      const g0 = (y) => { const g = new THREE.BoxGeometry(1.1, 0.1, 0.03); g.translate(0, y, 0); g.rotateX(-0.25); g.translate(d.x, 0, d.z); put(M.crate, g, true); };
      for (let y = 0.1; y < 1.1; y += 0.17) g0(y);
    } else if (d.type === 'drytree') {   // arvoreta seca: varas finas abrindo para cima
      for (let k = 0; k < 6; k++) { const a = k * 1.05, l = 0.35 + (k % 3) * 0.15; bar(M.trunk, [d.x, 0, d.z], [d.x + Math.cos(a) * l, 3.2 + (k % 2) * 0.8, d.z + Math.sin(a) * l], 0.03, true); }
      box(M.grass, d.x - 0.25, 0, d.z - 0.25, d.x + 0.25, 0.06, d.z + 0.25, 1, null, false);
    } else if (d.type === 'postbin') {   // lixeira presa num cano
      bar(M.alu, [d.x, 0, d.z], [d.x, 0.75, d.z], 0.03, true);
      cyl(d.beige ? M.beige : M.orange, d.x, 0.55, d.z, 0.2, 0.22, 0.55, 12);
    } else if (d.type === 'ladder') {   // escada de alumínio encostada na parede
      for (const dz of [-0.22, 0.22]) bar(M.alu, [d.x - 0.75, 0, d.z + dz], [d.x - 0.08, 2.6, d.z + dz], 0.025, true);
      for (let t = 0.1; t < 1; t += 0.11) bar(M.alu, [d.x - 0.75 + 0.67 * t, 2.6 * t, d.z - 0.22], [d.x - 0.75 + 0.67 * t, 2.6 * t, d.z + 0.22], 0.015);
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
