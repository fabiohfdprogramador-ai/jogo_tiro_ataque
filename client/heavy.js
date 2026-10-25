// Armas especiais feitas por código: bazuca (RPG-7) e arco composto.
// Coordenadas da arma em metros, iguais às do view-model: +x = frente (cano), +y = cima, +z = lado direito.
// A mão direita segura a empunhadura no mesmo lugar das outras armas (em volta de x = -0.06, y = -0.03 a -0.15).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(size, draw, repeat = 1, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const texLoader = new THREE.TextureLoader();
function photoTex(file, repeat, srgb) {
  const t = texLoader.load('tex/' + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- texturas ----------
// aço pintado e gasto: tinta escura com arranhões claros nas bordas e manchas de óleo
const wornPaint = (base, seed) => canvasTex(1024, (g, s) => {
  const r = rand(seed);
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    const x = r() * s, y = r() * s, rad = 20 + r() * 120, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < 0.5 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 700; i++) {   // arranhões: metal claro aparecendo
    const x = r() * s, y = r() * s, l = 3 + r() * 30, a = (r() - 0.5) * 0.5;
    g.strokeStyle = `rgba(${150 + r() * 60},${150 + r() * 60},${150 + r() * 60},${0.15 + r() * 0.35})`; g.lineWidth = 0.6 + r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 30000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.05)'; g.fillRect(r() * s, r() * s, 1.2, 1.2); }
}, 2);
const roughTex = canvasTex(512, (g, s) => {
  const r = rand(5);
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 40000; i++) { const v = (r() * 255) | 0; g.fillStyle = `rgba(${v},${v},${v},.18)`; g.fillRect(r() * s, r() * s, 1.5, 1.5); }
}, 3, false);
// fibra de carbono / polímero texturizado das peças do arco
const carbon = canvasTex(256, (g, s) => {
  g.fillStyle = '#16181a'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 8) for (let x = 0; x < s; x += 8) {
    const odd = ((x + y) / 8) % 2;
    const gr = g.createLinearGradient(x, y, odd ? x + 8 : x, odd ? y : y + 8);
    gr.addColorStop(0, '#0d0e0f'); gr.addColorStop(0.5, '#2a2d30'); gr.addColorStop(1, '#0d0e0f');
    g.fillStyle = gr; g.fillRect(x, y, 8, 8);
  }
}, 8);
// camuflagem de folhas para os braços do arco
const leafCamo = canvasTex(1024, (g, s) => {
  const r = rand(23);
  g.fillStyle = '#5b5a3e'; g.fillRect(0, 0, s, s);
  for (const [col, n, size] of [['#3f3f2a', 120, 40], ['#7a744f', 90, 30], ['#2b2a1d', 70, 22], ['#8f8660', 40, 16]]) {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const x = r() * s, y = r() * s, a = r() * 6.28, l = size * (0.6 + r());
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, l, l * 0.32, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
}, 2);

// ---------- materiais ----------
const M = {
  tube: new THREE.MeshPhysicalMaterial({ map: wornPaint('#33362b', 41), roughnessMap: roughTex, metalness: 0.3, roughness: 0.75, envMapIntensity: 0.3 }),
  steel: new THREE.MeshPhysicalMaterial({ map: wornPaint('#3a3b3d', 43), roughnessMap: roughTex, metalness: 0.85, roughness: 0.45, envMapIntensity: 0.6 }),
  wood: new THREE.MeshStandardMaterial({ map: photoTex('wood_diff.jpg', 1, true), normalMap: photoTex('wood_nor.jpg', 1, false), roughnessMap: photoTex('wood_arm.jpg', 1, false), color: 0xc9824c, roughness: 0.75, envMapIntensity: 0.5 }),
  warhead: new THREE.MeshPhysicalMaterial({ map: wornPaint('#5a6138', 47), roughnessMap: roughTex, metalness: 0.15, roughness: 0.6, clearcoat: 0.15, envMapIntensity: 0.3 }),
  band: new THREE.MeshStandardMaterial({ color: 0xa8915a, roughness: 0.6, metalness: 0.3 }),
  bakelite: new THREE.MeshPhysicalMaterial({ color: 0x2b1a10, roughnessMap: roughTex, roughness: 0.55, clearcoat: 0.2, envMapIntensity: 0.4 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0b1a28, metalness: 0.1, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.4 }),
  riser: new THREE.MeshPhysicalMaterial({ map: wornPaint('#1d1f20', 51), roughnessMap: roughTex, metalness: 0.7, roughness: 0.4, clearcoat: 0.3, envMapIntensity: 0.6 }),
  limb: new THREE.MeshPhysicalMaterial({ map: leafCamo, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.5 }),
  carbon: new THREE.MeshPhysicalMaterial({ map: carbon, roughness: 0.35, clearcoat: 0.6, metalness: 0.2, envMapIntensity: 0.6 }),
  cam: new THREE.MeshPhysicalMaterial({ color: 0x9b9fa3, metalness: 0.95, roughness: 0.3, envMapIntensity: 0.7 }),
  string: new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.8 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xd8b21c, roughness: 0.5 }),
  fletch: new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.7, side: THREE.DoubleSide }),
  fletchRed: new THREE.MeshStandardMaterial({ color: 0xb02a1c, roughness: 0.7, side: THREE.DoubleSide }),
  tip: new THREE.MeshPhysicalMaterial({ color: 0xb8bcc0, metalness: 1, roughness: 0.22, envMapIntensity: 0.8 }),
};

// ---------- utilitários ----------
function cylX(r0, r1, x0, x1, y, z, mat, seg = 28) {   // cilindro (ou cone) ao longo de x, de r0 em x0 a r1 em x1
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, x1 - x0, seg), mat);
  m.quaternion.setFromUnitVectors(Y, X); m.position.set((x0 + x1) / 2, y, z); return m;
}
function lathe(profile, mat, x0 = 0, y = 0, seg = 36) {   // perfil [[x, r], ...] girado em volta do eixo x
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, r]) => new THREE.Vector2(r, x)), seg), mat);
  m.quaternion.setFromUnitVectors(Y, X); m.position.set(x0, y, 0); return m;
}
function shape(pts, depth, mat, z = 0, bevel = 0.004) {
  const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 });
  geo.translate(0, 0, -depth / 2 + z); geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
function tubeAlong(points, r, mat, seg = 40, rs = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, rs, false), mat);
}
// empunhadura de pistola (mesmo desenho das outras armas, para a mão encaixar igual)
const GRIP = [[-0.07, -0.034], [-0.03, -0.034], [-0.05, -0.1], [-0.068, -0.158], [-0.108, -0.155], [-0.095, -0.1]];

// ---------- bazuca RPG-7 ----------
export function buildRPG() {
  const g = new THREE.Group(); const add = (m) => { g.add(m); return m; };
  const ty = 0.07;   // altura do eixo do tubo (acima da empunhadura)
  // tubo principal
  // o tubo fica bem atrás da empunhadura (a traseira vai no ombro), como na RPG de verdade
  const T = new THREE.Group(); T.position.x = -0.15; g.add(T); const addT = (m) => { T.add(m); return m; };
  addT(cylX(0.021, 0.021, -0.56, 0.4, ty, 0, M.tube));
  // boca dianteira levemente alargada
  addT(lathe([[0, 0.021], [0.012, 0.024], [0.03, 0.025], [0.034, 0.022]], M.steel, 0.4, ty));
  // venturi traseiro (escape em forma de sino)
  addT(lathe([[0, 0.022], [-0.04, 0.026], [-0.09, 0.036], [-0.12, 0.046], [-0.125, 0.048], [-0.13, 0.044]], M.steel, -0.56, ty));
  addT(cylX(0.026, 0.026, -0.6, -0.57, ty, 0, M.tube));
  // proteção térmica de madeira, com abraçadeiras de metal
  addT(lathe([[0, 0.028], [0.01, 0.033], [0.32, 0.033], [0.33, 0.028]], M.wood, -0.2, ty));
  for (const x of [-0.205, 0.125]) addT(cylX(0.0345, 0.0345, x, x + 0.012, ty, 0, M.steel));
  for (const x of [-0.14, 0.06]) addT(cylX(0.034, 0.034, x, x + 0.006, ty, 0, M.steel));
  // empunhadura com gatilho e guarda-mato
  add(shape([[-0.08, 0.05], [-0.02, 0.05], [-0.02, -0.034], [-0.07, -0.034]], 0.026, M.steel));
  add(shape(GRIP, 0.03, M.bakelite, 0, 0.007));
  add(tubeAlong([[0.0, -0.034, 0], [-0.002, -0.06, 0], [-0.03, -0.068, 0], [-0.052, -0.06, 0]], 0.0032, M.steel, 16, 8));
  add(tubeAlong([[-0.02, -0.034, 0], [-0.016, -0.048, 0], [-0.02, -0.056, 0]], 0.003, M.steel, 10, 8));
  // empunhadura dianteira
  add(shape([[0.15, 0.05], [0.2, 0.05], [0.2, 0.0], [0.15, 0.0]], 0.024, M.steel));
  add(shape([[0.155, 0.0], [0.195, 0.0], [0.188, -0.11], [0.16, -0.112]], 0.03, M.bakelite, 0, 0.008));
  // alça e massa de mira
  addT(shape([[0.0, 0.088], [0.03, 0.088], [0.03, 0.11], [0.012, 0.118], [0.0, 0.112]], 0.018, M.steel, 0, 0.002));
  addT(shape([[0.3, 0.088], [0.32, 0.088], [0.316, 0.122], [0.306, 0.122]], 0.006, M.steel, 0, 0.002));
  addT(shape([[0.29, 0.088], [0.33, 0.088], [0.33, 0.098], [0.29, 0.098]], 0.02, M.steel, 0, 0.002));
  // luneta PGO-7 no lado esquerdo
  const scope = new THREE.Group(); T.add(scope);
  scope.add(shape([[-0.06, 0.06], [0.06, 0.06], [0.06, 0.075], [-0.06, 0.075]], 0.012, M.steel, -0.03, 0.002));
  const body = cylX(0.017, 0.017, -0.07, 0.07, ty + 0.03, -0.05, M.tube, 24); scope.add(body);
  scope.add(cylX(0.017, 0.021, 0.07, 0.09, ty + 0.03, -0.05, M.tube, 24));
  scope.add(cylX(0.021, 0.019, -0.09, -0.07, ty + 0.03, -0.05, M.rubber, 24));
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.019, 24), M.glass); lens.position.set(0.0905, ty + 0.03, -0.05); lens.rotation.y = Math.PI / 2; scope.add(lens);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 16), M.steel); knob.position.set(0.0, ty + 0.052, -0.05); scope.add(knob);

  // foguete PG-7V (sai ao atirar e volta ao recarregar)
  const rocket = new THREE.Group(); T.add(rocket);
  rocket.add(cylX(0.016, 0.016, 0.38, 0.5, ty, 0, M.warhead, 20));
  rocket.add(lathe([[0, 0.016], [0.02, 0.03], [0.05, 0.041], [0.13, 0.042], [0.15, 0.04], [0.25, 0.017], [0.29, 0.008], [0.3, 0.004]], M.warhead, 0.5, ty));
  rocket.add(cylX(0.0425, 0.0425, 0.56, 0.575, ty, 0, M.band, 36));
  rocket.add(cylX(0.004, 0.0015, 0.8, 0.84, ty, 0, M.steel, 10));
  rocket.add(cylX(0.019, 0.019, 0.46, 0.475, ty, 0, M.band, 24));

  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.44, ty, 0); T.add(muzzle);
  const back = new THREE.Object3D(); back.position.set(-0.72, ty, 0); T.add(back);   // saída do escape (fogo para trás ao disparar)
  return { group: g, mag: rocket, muzzle, back, fore: { x: 0.175, y: 0.0 } };
}

// ---------- arco composto ----------
// O arco fica em pé no plano x-y; a mão direita segura o punho (no lugar da empunhadura) e a corda fica atrás (x negativo).
export function buildBow() {
  const g = new THREE.Group(); const add = (m) => { g.add(m); return m; };
  const gx = -0.06, top = 0.24, bot = -0.42;   // punho em gx; o corpo (riser) vai de bot a top
  // riser: perfil recortado, com janela para a flecha
  add(shape([[gx + 0.02, -0.03], [gx + 0.05, 0.02], [gx + 0.055, 0.12], [gx + 0.04, top], [gx + 0.0, top + 0.01], [gx + 0.01, 0.12],
    [gx - 0.005, 0.03], [gx - 0.03, -0.02], [gx - 0.035, -0.16], [gx - 0.005, -0.2], [gx + 0.01, -0.3], [gx + 0.04, bot], [gx + 0.0, bot - 0.01],
    [gx - 0.03, -0.3], [gx - 0.05, -0.18], [gx - 0.045, -0.05]], 0.022, M.riser, 0, 0.004));
  // punho de borracha
  add(shape([[gx - 0.04, -0.035], [gx + 0.0, -0.035], [gx + 0.005, -0.16], [gx - 0.045, -0.16]], 0.03, M.rubber, 0, 0.008));
  // braços (limbs) em fibra camuflada, curvando para trás até as roldanas
  const limb = (y0, dir) => {
    const pts = [[gx + 0.03, y0, 0], [gx + 0.0, y0 + dir * 0.09, 0], [gx - 0.07, y0 + dir * 0.17, 0], [gx - 0.12, y0 + dir * 0.21, 0]];
    for (const z of [-0.012, 0.012]) add(tubeAlong(pts.map(([x, y]) => [x, y, z]), 0.009, M.limb, 30, 8));
    return pts[3];
  };
  const camT = limb(top, 1), camB = limb(bot, -1);
  // roldanas (cams) excêntricas
  for (const [x, y] of [camT, camB]) {
    const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 28), M.cam);
    cam.quaternion.setFromUnitVectors(Y, Z); cam.position.set(x - 0.008, y, 0); add(cam);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 12), M.steel); hub.quaternion.setFromUnitVectors(Y, Z); hub.position.set(x, y, 0); add(hub);
  }
  // corda e cabos
  const sx = camT[0] - 0.035;
  // a corda são dois trechos (roldana de cima até o nock e do nock até a de baixo), para poder ser puxada
  const segA = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 6), M.string)), segB = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 6), M.string));
  add(tubeAlong([[camT[0], camT[1] - 0.02, 0.006], [gx - 0.03, -0.1, 0.03], [camB[0] + 0.01, camB[1] + 0.02, 0.006]], 0.0013, M.string, 12, 6));
  add(tubeAlong([[gx - 0.02, 0.0, 0.02], [gx - 0.18, 0.02, 0.03]], 0.004, M.carbon, 4, 8));   // guia dos cabos
  // nock amarelo e silenciadores da corda
  const nockY = -0.02;
  const nockPt = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.014, 10), M.yellow); nockPt.position.set(sx, nockY + 0.012, 0); add(nockPt);
  // mira de pinos
  add(shape([[gx + 0.05, 0.03], [gx + 0.12, 0.03], [gx + 0.12, 0.045], [gx + 0.05, 0.045]], 0.01, M.riser, -0.03, 0.002));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 10, 28), M.riser); ring.position.set(gx + 0.13, 0.04, -0.03); ring.rotation.y = Math.PI / 2; add(ring);
  for (let i = 0; i < 3; i++) {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 6), [M.yellow, M.fletchRed, M.yellow][i]);
    pin.position.set(gx + 0.13, 0.05 - i * 0.009, -0.03); add(pin);
  }
  // estabilizador para a frente
  add(cylX(0.009, 0.009, gx + 0.03, gx + 0.25, -0.17, 0, M.carbon, 14));
  add(cylX(0.016, 0.016, gx + 0.25, gx + 0.29, -0.17, 0, M.rubber, 18));
  // apoio da flecha
  add(shape([[gx + 0.0, -0.025], [gx + 0.03, -0.025], [gx + 0.03, -0.012], [gx + 0.0, -0.012]], 0.006, M.steel, -0.016, 0.002));

  // flecha (some ao atirar e volta ao recarregar)
  const arrow = new THREE.Group(); g.add(arrow);
  const ax0 = sx - 0.005, ax1 = gx + 0.62, ay = nockY, az = -0.012;
  arrow.add(cylX(0.0038, 0.0038, ax0 + 0.01, ax1 - 0.04, ay, az, M.carbon, 10));
  arrow.add(cylX(0.0045, 0.0045, ax0, ax0 + 0.015, ay, az, M.yellow, 10));
  arrow.add(cylX(0.0055, 0.0, ax1 - 0.04, ax1, ay, az, M.tip, 4));
  for (let i = 0; i < 3; i++) {   // penas
    const f = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.075, 0), new THREE.Vector2(0.065, 0.014), new THREE.Vector2(0.01, 0.016)])), i ? M.fletch : M.fletchRed);
    f.position.set(ax0 + 0.03, ay, az); f.rotation.x = i * Math.PI * 2 / 3; arrow.add(f);
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const muzzle = new THREE.Object3D(); muzzle.position.set(ax1, ay, az); g.add(muzzle);
  // puxar a corda: t = 0 solta (corda reta entre as roldanas), t = 1 puxada para trás com a flecha
  const REL = 0.06, A = new THREE.Vector3(), B = new THREE.Vector3(), N = new THREE.Vector3();
  const place = (m, p, q) => { m.position.copy(p).add(q).multiplyScalar(0.5); m.scale.set(1, p.distanceTo(q), 1); m.quaternion.setFromUnitVectors(Y, B.copy(q).sub(p).normalize()); };
  const setDraw = (t) => {
    const off = -t * REL;
    N.set(sx + off, nockY, 0);
    place(segA, A.set(sx - 0.003, camT[1], 0), N); place(segB, N, A.set(sx - 0.003, camB[1], 0));   // sai da borda de trás de cada roldana
    nockPt.position.set(sx + off, nockY + 0.012, 0); arrow.position.x = off;
  };
  setDraw(1);
  return { group: g, mag: arrow, muzzle, setDraw, drawReach: REL };
}

// ---------- projéteis em voo (apontam para +x; quem usa gira para a direção da velocidade) ----------
export function buildRocketProjectile() {
  const g = new THREE.Group();
  g.add(cylX(0.016, 0.016, -0.12, 0.0, 0, 0, M.warhead, 16));
  g.add(lathe([[0, 0.016], [0.02, 0.03], [0.05, 0.041], [0.13, 0.042], [0.15, 0.04], [0.25, 0.017], [0.29, 0.008], [0.3, 0.004]], M.warhead, 0.0, 0));
  g.add(cylX(0.0425, 0.0425, 0.06, 0.075, 0, 0, M.band, 24));
  for (let i = 0; i < 4; i++) {   // aletas que abrem depois do disparo
    const fin = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.002, 0.05, 1, 0.001), M.steel);
    const a = i * Math.PI / 2; fin.position.set(-0.1, Math.cos(a) * 0.035, Math.sin(a) * 0.035); fin.rotation.x = a; g.add(fin);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 12), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.quaternion.setFromUnitVectors(Y, X.clone().negate()); flame.position.x = -0.24; g.add(flame);
  return g;
}
export function buildArrowProjectile() {
  const g = new THREE.Group();
  g.add(cylX(0.0038, 0.0038, -0.7, -0.04, 0, 0, M.carbon, 8));
  g.add(cylX(0.0045, 0.0045, -0.715, -0.7, 0, 0, M.yellow, 8));
  g.add(cylX(0.0055, 0.0, -0.04, 0.0, 0, 0, M.tip, 4));
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.075, 0), new THREE.Vector2(0.065, 0.014), new THREE.Vector2(0.01, 0.016)])), i ? M.fletch : M.fletchRed);
    f.position.set(-0.69, 0, 0); f.rotation.x = i * Math.PI * 2 / 3; g.add(f);
  }
  return g;
}

// ---------- granadas detalhadas (explosiva M67, luz M84, fumaça M18) ----------
// Mesmo tamanho e origem das antigas: corpo centrado na origem, espoleta para cima (+y).
function labelTex(base, band, text, textColor, seed, sub = '') {
  return canvasTex(512, (g, s) => {
    const r = rand(seed);
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      const x = r() * s, y = r() * s, rad = 15 + r() * 80, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, r() < 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,240,.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(170,170,160,${0.1 + r() * 0.3})`; g.lineWidth = 0.6 + r(); const x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 6); g.stroke(); }
    if (band) { g.fillStyle = band; g.fillRect(0, s * 0.16, s, s * 0.05); }
    if (text) {   // escrito em volta toda (4 vezes), assim sempre aparece de algum lado
      g.fillStyle = textColor; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let k = 0; k < 4; k++) {
        g.font = 'bold 34px Arial'; g.fillText(text, s * (0.125 + k * 0.25), s * 0.5);
        if (sub) { g.font = 'bold 17px Arial'; g.fillText(sub, s * (0.125 + k * 0.25), s * 0.58); }
      }
    }
    for (let i = 0; i < 20000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.05)'; g.fillRect(r() * s, r() * s, 1.2, 1.2); }
  }, 1);
}
let NM = null;
function nadeMats() {
  if (NM) return NM;
  NM = {
    he: new THREE.MeshPhysicalMaterial({ map: labelTex('#4d5534', '#c9a227', 'M67', '#d9c47a', 61, 'GRANADA'), roughnessMap: roughTex, roughness: 0.62, metalness: 0.2, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.5 }),
    flash: new THREE.MeshPhysicalMaterial({ map: wornPaint('#6d7173', 63), roughnessMap: roughTex, roughness: 0.45, metalness: 0.75, envMapIntensity: 0.6 }),
    smoke: new THREE.MeshPhysicalMaterial({ map: labelTex('#58603f', null, 'FUMAÇA', '#e8e4d4', 67, 'M18 · VERDE'), roughnessMap: roughTex, roughness: 0.6, metalness: 0.25, clearcoat: 0.15, envMapIntensity: 0.45 }),
    cap: new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.55 }),
    hole: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 }),
    fuze: new THREE.MeshPhysicalMaterial({ color: 0x8d8f8a, roughnessMap: roughTex, metalness: 0.9, roughness: 0.35, envMapIntensity: 0.7 }),
    spoon: new THREE.MeshPhysicalMaterial({ map: wornPaint('#55593f', 69), roughnessMap: roughTex, metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide, envMapIntensity: 0.6 }),
    ring: new THREE.MeshPhysicalMaterial({ color: 0xb9bbbd, metalness: 1, roughness: 0.25, envMapIntensity: 0.9 }),
  };
  return NM;
}
export function buildGrenade(key) {
  const N = nadeMats(), g = new THREE.Group(); const add = (m) => { g.add(m); return m; };
  const latheY = (pts, mat, seg = 40, phi0 = 0, phiLen = Math.PI * 2) => add(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([y, r]) => new THREE.Vector2(r, y)), seg, phi0, phiLen), mat));
  let top, bodyR;
  if (key === 'he') {
    // corpo esférico com pescoço rosqueado
    const pts = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI * 0.86; pts.push([Math.sin(a) * 0.033, Math.cos(a) * 0.033]); }
    pts.push([0.032, 0.012], [0.038, 0.012]);
    latheY(pts, N.he); top = 0.038; bodyR = 0.033;
  } else if (key === 'flash') {
    latheY([[-0.056, 0], [-0.056, 0.02], [-0.053, 0.023], [0.05, 0.023], [0.053, 0.02], [0.056, 0.012]], N.flash);
    for (let row = 0; row < 4; row++) for (let k = 0; k < 8; k++) {   // furos por onde sai o clarão
      const a = k / 8 * Math.PI * 2 + (row % 2) * 0.39, h = add(new THREE.Mesh(new THREE.CircleGeometry(0.0042, 12), N.hole));
      h.position.set(Math.cos(a) * 0.0232, -0.036 + row * 0.024, Math.sin(a) * 0.0232); h.lookAt(h.position.clone().multiply(new THREE.Vector3(2, 1, 2)));
    }
    top = 0.056; bodyR = 0.023;
  } else {
    latheY([[-0.06, 0], [-0.06, 0.028], [-0.057, 0.031], [0.05, 0.031], [0.054, 0.029]], N.smoke);
    latheY([[0.05, 0.0315], [0.064, 0.0315], [0.066, 0.026], [0.066, 0]], N.cap);   // tampa colorida (cor da fumaça)
    for (let k = 0; k < 4; k++) { const h = add(new THREE.Mesh(new THREE.CircleGeometry(0.004, 12), N.hole)); const a = k * Math.PI / 2 + 0.4; h.position.set(Math.cos(a) * 0.017, 0.0662, Math.sin(a) * 0.017); h.rotation.x = -Math.PI / 2; }
    top = 0.066; bodyR = 0.031;
  }
  // espoleta: corpo, porca e pino do percussor
  latheY([[top, 0.0105], [top + 0.004, 0.0115], [top + 0.016, 0.0115], [top + 0.018, 0.009], [top + 0.024, 0.009], [top + 0.026, 0]], N.fuze, 24);
  // colher (alavanca) curva descendo junto ao corpo, do lado +x
  const spoonPts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, y = top + 0.022 - t * (top + 0.022 + (key === 'he' ? 0.01 : 0.035));
    const r = key === 'he' ? Math.sqrt(Math.max(0, 0.033 * 0.033 - Math.min(y, 0.03) ** 2)) + 0.0025 : bodyR + 0.0025;
    spoonPts.push([y, i === 0 ? 0.013 : Math.max(r, 0.013)]);
  }
  latheY(spoonPts.reverse(), N.spoon, 6, -0.2, 0.4);
  // argola do pino e a trava, do lado +z
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0017, 8, 28), N.ring)); ring.position.set(-0.006, top + 0.01, 0.024); ring.rotation.set(0, 0.5, 0);
  const tab = add(new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0012, 6, 14), N.ring)); tab.position.set(-0.014, top + 0.0, 0.032); tab.rotation.set(0.9, 0.5, 0);
  // serrilhado da espoleta e rebite da colher
  for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, n = add(new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.009, 0.0012), N.fuze)); n.position.set(Math.cos(a) * 0.0118, top + 0.01, Math.sin(a) * 0.0118); n.rotation.y = -a; }
  const rivet = add(new THREE.Mesh(new THREE.SphereGeometry(0.0032, 10, 8), N.fuze)); rivet.position.set(0.0128, top + 0.017, 0); rivet.scale.x = 0.6;
  if (key === 'he') {   // trava de segurança (grampo) por cima da colher
    const clip = add(new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0011, 6, 20, Math.PI * 1.2), N.ring)); clip.position.set(0.004, top + 0.004, 0); clip.rotation.set(Math.PI / 2, 0, -0.6);
  }
  const pin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.03, 6), N.ring)); pin.quaternion.setFromUnitVectors(Y, Z); pin.position.set(0.004, top + 0.01, 0.006);
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { group: g, mag: null, muzzle: null };
}
