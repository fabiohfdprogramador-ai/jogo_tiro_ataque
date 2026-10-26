// Monta o mapa 3D (céu, luz, texturas, paredes, caixas, decoração) a partir de shared/map.js.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MAP, useMap } from '/shared/map.js';
import { buildBairro } from './world_bairro.js';
import { addStreetDetails } from './world_details.js';

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function makeTex(draw, size = 1024, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function grain(g, s, r, n, a, colors) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)]; g.globalAlpha = a * r();
    const w = 1 + r() * 3; g.fillRect(r() * s, r() * s, w, w);
  }
  g.globalAlpha = 1;
}
function blotches(g, s, r, n, colors, maxR) {
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, rad = 10 + r() * maxR;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, colors[Math.floor(r() * colors.length)]); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.18 + r() * 0.2; g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.globalAlpha = 1;
}

const plasterTex = (seed) => makeTex((g, s) => {
  const r = rand(seed);
  g.fillStyle = '#d6b98a'; g.fillRect(0, 0, s, s);
  blotches(g, s, r, 140, ['#c9a674', '#e2c99c', '#b8945f', '#dcc297'], 160);
  for (let i = 0; i < 9; i++) {           // pedras expostas no reboco
    const bx = r() * s, by = r() * s;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
      if (r() < 0.35) continue;
      const px = bx + x * 70 + (y % 2) * 35, py = by + y * 34;
      g.fillStyle = ['#bf9d68', '#c8a874', '#b08a55'][Math.floor(r() * 3)];
      g.fillRect(px, py, 66, 30);
      g.strokeStyle = 'rgba(80,55,25,.45)'; g.lineWidth = 3; g.strokeRect(px, py, 66, 30);
    }
  }
  g.strokeStyle = 'rgba(70,50,25,.5)'; g.lineWidth = 1.5;   // rachaduras
  for (let i = 0; i < 14; i++) {
    let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (r() - .5) * 40; y += r() * 30; g.lineTo(x, y); } g.stroke();
  }
  grain(g, s, r, 60000, 0.35, ['#8a6a3c', '#f2dfb8', '#a07c48']);
});

const floorTex = makeTex((g, s) => {
  const r = rand(5);
  g.fillStyle = '#c9ab78'; g.fillRect(0, 0, s, s);
  blotches(g, s, r, 220, ['#b8955f', '#d8bd8c', '#a88452', '#c2a06a'], 120);
  g.strokeStyle = 'rgba(90,65,35,.35)'; g.lineWidth = 3;
  for (let y = 0; y < s; y += 128) for (let x = 0; x < s; x += 128) {
    const o = (y / 128) % 2 ? 64 : 0; g.strokeRect(x + o + r() * 4, y + r() * 4, 124, 124);
  }
  grain(g, s, r, 90000, 0.4, ['#7a5a30', '#efd9ae', '#9b7846', '#5e4424']);
}, 1024, [14, 17]);

const crateTex = makeTex((g, s) => {
  const r = rand(21);
  g.fillStyle = '#8a6237'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 9; i++) {
    const y = i * s / 9;
    g.fillStyle = ['#8d6438', '#7f582f', '#96703f', '#84603a'][i % 4]; g.fillRect(0, y, s, s / 9);
    g.strokeStyle = 'rgba(40,25,10,.6)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
    g.strokeStyle = 'rgba(50,30,12,.25)'; g.lineWidth = 1;
    for (let k = 0; k < 14; k++) { g.beginPath(); const yy = y + r() * s / 9; g.moveTo(0, yy); g.bezierCurveTo(s * .3, yy + (r() - .5) * 8, s * .6, yy + (r() - .5) * 8, s, yy); g.stroke(); }
  }
  g.fillStyle = '#6b4a28';
  const b = 70; g.fillRect(0, 0, s, b); g.fillRect(0, s - b, s, b); g.fillRect(0, 0, b, s); g.fillRect(s - b, 0, b, s);
  g.save(); g.translate(s / 2, s / 2); g.rotate(Math.PI / 4); g.fillRect(-s * .7, -32, s * 1.4, 64); g.restore();
  g.strokeStyle = 'rgba(25,15,5,.7)'; g.lineWidth = 5; g.strokeRect(b, b, s - 2 * b, s - 2 * b); g.strokeRect(2, 2, s - 4, s - 4);
  g.fillStyle = '#2b2b2b'; [[35, 35], [s - 35, 35], [35, s - 35], [s - 35, s - 35]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
  grain(g, s, r, 30000, 0.3, ['#3d2810', '#b08858']);
});

const doorTex = makeTex((g, s) => {
  const r = rand(8);
  g.fillStyle = '#2f5f86'; g.fillRect(0, 0, s, s);
  for (let x = 0; x < s; x += 64) { g.fillStyle = x % 128 ? '#2b5a80' : '#336792'; g.fillRect(x, 0, 60, s); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 60, 0, 4, s); }
  blotches(g, s, r, 120, ['#6b5a3e', '#8a7a5a', '#1d3c56'], 70);
  grain(g, s, r, 40000, 0.35, ['#13293c', '#7aa0c0', '#6b5a3e']);
});

const mat = (map, rough = 0.95, extra = {}) => new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2.2, roughness: rough, metalness: 0, ...extra });

export function buildWorld(renderer, scene) {
  scene.fog = new THREE.Fog(0xe8d8b8, 50, 170);

  // céu, sol e ambiente
  const sky = new Sky();
  sky.scale.setScalar(1000);
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(135));
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.85;
  u.sunPosition.value.copy(sun);
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(sky.clone());
  const envMap = pmrem.fromScene(envScene).texture;
  scene.environment = envMap;

  // céu fotográfico com nuvens (Poly Haven, CC0): JPG grande no fundo e HDR pequeno para iluminar e refletir.
  // Só o Bairro usa; enquanto carrega (ou se falhar) fica o céu calculado.
  let photoSky = null, photoEnv = null;
  new THREE.TextureLoader().load('tex/sky_4k.jpg', (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; photoSky = t;
    applySky();
  });
  new RGBELoader().load('tex/sky_1k.hdr', (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping; photoEnv = pmrem.fromEquirectangular(t).texture; t.dispose();
    applySky();
  });
  // horário do dia (só no Bairro): 'dia' usa o céu fotográfico; fim de tarde e noite usam o céu calculado com o sol baixo
  // ou abaixo do horizonte, e as luminárias dos postes acendem (sem luzes novas: brilho, poças de luz e lâmpadas acesas)
  let timeOfDay = 'dia', details = null, envTime = null;
  const TIME = {
    tarde: { sun: [82, 250], turb: 9, ray: 2.6, mie: 0.006, sunCol: 0xffb070, sunI: 3.8, hemiSky: 0xffd2a8, hemiGround: 0x8a6a50, hemiI: 1.3, fog: 0xe0b088, near: 60, far: 240, env: 1.8, lamps: 0.6 },
    noite: { sun: [96, 250], turb: 2, ray: 0.4, mie: 0.002, sunCol: 0x8aa8e0, sunI: 0.8, hemiSky: 0x5a70a8, hemiGround: 0x262a34, hemiI: 0.7, fog: 0x0c1420, near: 25, far: 150, env: 0.45, lamps: 1 },
  };
  function applySky() {
    const photo = current === 'bairro', T = photo ? TIME[timeOfDay] : null;
    if (T) {   // céu calculado para o horário
      const sp = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(T.sun[0]), THREE.MathUtils.degToRad(T.sun[1]));
      u.sunPosition.value.copy(sp); u.turbidity.value = T.turb; u.rayleigh.value = T.ray; u.mieCoefficient.value = T.mie;
      if (!envTime || envTime.key !== timeOfDay) { const es = new THREE.Scene(); es.add(sky.clone()); envTime = { key: timeOfDay, tex: pmrem.fromScene(es).texture }; }
      sky.visible = true; scene.background = timeOfDay === 'noite' ? new THREE.Color(0x05080f) : null;
      scene.environment = envTime.tex; scene.environmentIntensity = T.env;
      // noite: a lua ilumina de cima, fria e fraca (a sombra continua, mais suave)
      const lp = timeOfDay === 'noite' ? new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(200)) : sp;
      sunLight.position.copy(lp).multiplyScalar(80); sunLight.color.set(T.sunCol); sunLight.intensity = T.sunI;
      hemi.color.set(T.hemiSky); hemi.groundColor.set(T.hemiGround); hemi.intensity = T.hemiI;
      scene.fog.color.set(T.fog); scene.fog.near = T.near; scene.fog.far = T.far;
      if (details) details.setLamps(T.lamps);
      return;
    }
    u.sunPosition.value.copy(sun); u.turbidity.value = 6; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004;
    sunLight.position.copy(sun).multiplyScalar(80);
    hemi.color.set(0xd8e4f5); hemi.groundColor.set(0xd0a868);
    if (photo) { scene.fog.color.set(0xc8d6e4); scene.fog.near = 70; scene.fog.far = 260; sunLight.color.set(0xffeed6); sunLight.intensity = 4.3; hemi.intensity = 1.5; }
    if (details) details.setLamps(0);
    sky.visible = !(photo && photoSky);
    scene.background = photo && photoSky ? photoSky : null;
    scene.backgroundIntensity = 1.5;
    scene.environment = photo && photoEnv ? photoEnv : envMap;
    scene.environmentIntensity = photo && photoEnv ? 2.4 : 1;   // o céu fotográfico ilumina menos que o calculado
  }
  function setTimeOfDay(t) { timeOfDay = TIME[t] ? t : 'dia'; applySky(); }

  const sunLight = new THREE.DirectionalLight(0xfff0d6, 4.2);
  sunLight.position.copy(sun).multiplyScalar(80);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(4096, 4096);
  const sc = sunLight.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 1; sc.far = 220;
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.04;
  scene.add(sunLight);
  const hemi = new THREE.HemisphereLight(0xd8e4f5, 0xd0a868, 0.75);
  scene.add(hemi);

  // geometria do mapa fica num grupo próprio (para trocar de mapa sem recarregar a página)
  let group = null, current = null;
  function setMap(id) {
    if (id === current) return;
    current = id;
    useMap(id);
    if (group) { scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    group = new THREE.Group(); scene.add(group);
    if (MAP.id === 'bairro') {   // sol tropical forte e quente, névoa azulada só bem longe (como nas fotos do Far Cry)
      scene.fog.color.set(0xc8d6e4); scene.fog.near = 70; scene.fog.far = 260;
      sunLight.color.set(0xffeed6); sunLight.intensity = 4.3; hemi.intensity = 1.5;   // luz do céu forte: sombra clara, como no dia tropical
      buildBairro(group, MAP, sunLight);
      details = addStreetDetails(group, MAP);
    } else {
      scene.fog.color.set(0xe8d8b8); scene.fog.near = 50; scene.fog.far = 170;
      details = null;
      sunLight.color.set(0xfff0d6); sunLight.intensity = 4.2; hemi.intensity = 0.75;
      const sc = sunLight.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.updateProjectionMatrix(); buildDeserto(group);
    }
    applySky();
  }
  setMap('deserto');
  return { sunLight, envMap, setMap, setTimeOfDay };
}

function buildDeserto(scene) {

  const mats = {
    wallA: mat(plasterTex(11)), wallB: mat(plasterTex(37)),
    crate: mat(crateTex, .85, { bumpScale: 3 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xb8976a, roughness: .9 }),
    door: new THREE.MeshStandardMaterial({ map: doorTex, roughness: .7, metalness: .35, bumpMap: doorTex, bumpScale: 1.2 }),
    barrel: new THREE.MeshStandardMaterial({ color: 0x4d6a3a, roughness: .55, metalness: .5 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: .9 }),
  };

  function box(x0, y0, z0, x1, y1, z1, material, uv = 5, shadow = true) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const geo = new THREE.BoxGeometry(w, h, d);
    const uvAttr = geo.attributes.uv, nrm = geo.attributes.normal;
    for (let i = 0; i < uvAttr.count; i++) {
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      const su = nx > .5 ? d : w, sv = ny > .5 ? d : h;
      uvAttr.setXY(i, uvAttr.getX(i) * su / uv, uvAttr.getY(i) * sv / uv);
    }
    const m = new THREE.Mesh(geo, material);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = shadow; m.receiveShadow = true;
    scene.add(m); return m;
  }

  // chão
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(84, 104), mat(floorTex, 1, { bumpScale: 1.5 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // caixas de colisão do mapa
  for (const b of MAP.boxes) {
    const [x0, y0, z0] = b.min, [x1, y1, z1] = b.max;
    if (b.mat === 'barrel') {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, y1 - y0, 24), mats.barrel);
      cyl.position.set(cx, (y0 + y1) / 2, cz); cyl.castShadow = cyl.receiveShadow = true; scene.add(cyl);
      for (const hh of [0.15, 1.1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.025, 6, 24), mats.barrel); r.rotation.x = Math.PI / 2; r.position.set(cx, hh, cz); scene.add(r); }
      continue;
    }
    const size = x1 - x0;
    box(x0, y0, z0, x1, y1, z1, mats[b.mat], b.mat === 'crate' ? size : 5);
    if (b.mat !== 'crate' && y1 - y0 >= 4) box(x0 - 0.08, y1, z0 - 0.08, x1 + 0.08, y1 + 0.3, z1 + 0.08, mats.trim, 5, false);
  }

  // portas azuis (decoração) no Long A e no Meio
  box(-36.2, 0, 10.02, -34, 3.2, 10.1, mats.door, 2.2, false);
  box(-30, 0, 10.02, -27.8, 3.2, 10.1, mats.door, 2.2, false);
  box(-12, 0, -8.1, -10, 3.4, -8.02, mats.door, 2.2, false);
  box(-6, 0, -8.1, -4, 3.4, -8.02, mats.door, 2.2, false);
  // toldos
  box(-41, 4.6, 14, -39.4, 4.7, 20, mats.wood);
  box(14, 5, -1, 15.4, 5.1, 3.6, mats.wood);

  // prédios fora do mapa (horizonte)
  const skyline = [[-58, -40, -42, -10, 14, 'wallB'], [-58, 0, -42, 30, 11, 'wallA'], [42, -45, 58, -20, 13, 'wallA'], [42, 0, 56, 20, 10, 'wallB'],
    [-20, -66, 25, -52, 14, 'wallA'], [-30, 52, 5, 66, 12, 'wallB'], [10, 52, 40, 64, 15, 'wallA']];
  for (const [x0, z0, x1, z1, h, m] of skyline) box(x0, 0, z0, x1, h, z1, mats[m], 5, true);

  // palmeiras
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f6b2a, roughness: .9, side: THREE.DoubleSide });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 1 });
  for (const [x, z, h] of [[-46, -50, 13], [44, 8, 12], [-44, 36, 14], [46, -48, 13], [2, -55, 15], [24, 55, 13], [-38, 25, 10], [37, -36, 9]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, h, 10), trunkMat);
    trunk.position.set(x, h / 2, z); trunk.rotation.z = 0.07; trunk.castShadow = true; scene.add(trunk);
    for (let i = 0; i < 10; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 3.6), leafMat);
      leaf.position.set(x + 0.25, h, z); leaf.rotation.set(-1.0, i * 0.63, 0, 'YXZ'); leaf.translateY(1.6);
      leaf.castShadow = true; scene.add(leaf);
    }
  }

  // fios elétricos
  const cableMat = new THREE.LineBasicMaterial({ color: 0x222222 });
  for (const [x1, y1, z1, x2, y2, z2] of [[-39.9, 6.6, 2, -26.1, 6.3, -4], [-12.1, 5.8, 20, -3.9, 6.6, 16], [14.1, 6.3, 18, 23.9, 6.1, 24], [-39.9, 6.8, -30, -12.1, 6.4, -24]]) {
    const pts = []; for (let t = 0; t <= 1.0001; t += 0.05) pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * 0.9, z1 + (z2 - z1) * t));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
  }

  // letras dos bombsites pintadas no chão/parede
  const label = (txt, x, y, z, ry) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.font = 'bold 200px Arial'; g.fillStyle = 'rgba(200,40,30,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 140);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  };
  label('A', -39.95 + 0.02, 2.4, -30, Math.PI / 2);
  label('B', 39.95 - 0.02, 2.4, -20, -Math.PI / 2);
}
