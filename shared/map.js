// Mapas do jogo. Compartilhado entre servidor e cliente.
// Unidades em metros. -z = norte (base CT), +z = sul (base TR).
// Cada caixa: { min:[x,y,z], max:[x,y,z], mat }   (mat 'house' tem também 'color' e 'roof')

// ================================================================ Deserto (inspirado na Dust2)
function buildDeserto() {
  const boxes = [];
  const block = (x0, z0, x1, z1, h, mat, y0 = 0) => boxes.push({ min: [x0, y0, z0], max: [x1, y0 + h, z1], mat });
  const crate = (cx, cz, s = 1.0, y0 = 0) => boxes.push({ min: [cx - s / 2, y0, cz - s / 2], max: [cx + s / 2, y0 + s, cz + s / 2], mat: 'crate' });
  const barrel = (cx, cz) => boxes.push({ min: [cx - 0.42, 0, cz - 0.42], max: [cx + 0.42, 1.25, cz + 0.42], mat: 'barrel' });

  // paredes externas
  block(-42, -52, 42, -50, 9, 'wallB'); block(-42, 50, 42, 52, 9, 'wallB');
  block(-42, -50, -40, 50, 9, 'wallA'); block(40, -50, 42, 50, 9, 'wallA');
  // prédios que separam os caminhos
  block(-26, -22, -12, 34, 7, 'wallA'); block(-4, -20, 14, 34, 8, 'wallB'); block(24, -4, 40, 34, 7, 'wallA');
  // portas do Long A
  block(-40, 8, -34, 10, 7, 'wallB'); block(-30, 8, -26, 10, 7, 'wallB'); block(-34, 8, -30, 10, 3.8, 'wallB', 3.2);
  // portas do Meio
  block(-12, -8, -10, -6, 6, 'wallA'); block(-6, -8, -4, -6, 6, 'wallA'); block(-10, -8, -6, -6, 2.6, 'wallA', 3.4);
  // entrada do Túnel B
  block(14, 4, 17, 6, 4, 'wallB'); block(21, 4, 24, 6, 4, 'wallB'); block(17, 4, 21, 6, 1, 'wallB', 3);
  // coberturas
  block(-4, -34, 6, -28, 3, 'wallA'); block(-8, 38, -5, 40, 1.8, 'wallA'); block(-40, -40, -34, -38, 2.2, 'wallB');
  // caixas
  crate(-37, 0, 1.6); crate(-29, -12);
  crate(-34, -30, 1.6); crate(-32.2, -30); crate(-34, -30, 1.0, 1.6);
  crate(-20, -30, 1.6); crate(-20, -28.2); crate(-28, -42, 1.6);
  crate(-5, 14); crate(-11, 24, 1.6);
  crate(20, -16, 1.6); crate(21.8, -16); crate(20, -16, 1.0, 1.6);
  crate(30, -24, 1.6); crate(34, -12, 1.6); crate(28, -8);
  crate(14, -44, 1.6);
  crate(-14, 44, 1.6); crate(16, 40); crate(0, 46);
  barrel(36, -30); barrel(36.9, -31); barrel(-38.5, 20);

  return {
    id: 'deserto', name: 'Deserto',
    size: { minX: -40, maxX: 40, minZ: -50, maxZ: 50 },
    boxes,
    spawns: {
      T: [[-8, 47], [-4, 48], [4, 48], [8, 47], [-11, 43], [11, 44], [-3, 44], [3, 43], [6, 44], [-6, 45]],
      CT: [[2, -46], [6, -47], [10, -47], [-2, -45], [4, -42], [10, -40], [-6, -42], [16, -40], [0, -40], [12, -37]],
    },
    sites: { A: { min: [-40, -50], max: [-12, -22] }, B: { min: [14, -34], max: [40, -4] } },
    nodes: {
      T0: [0, 44], T1: [-20, 42], T2: [19, 42],
      L1: [-33, 30], L2: [-32, 9], L3: [-33, -10], A1: [-30, -30], A2: [-20, -36],
      M0: [-8, 30], M1: [-8, 10], M2: [-8, -7], M3: [-8, -26],
      Bt0: [19, 30], Bt1: [19, 5], B1: [25, -12], B2: [22, -28],
      C0: [8, -44], C1: [-10, -40], C2: [16, -38],
    },
    links: [
      ['T0', 'T1'], ['T0', 'T2'], ['T0', 'M0'], ['T1', 'L1'], ['T1', 'M0'],
      ['L1', 'L2'], ['L2', 'L3'], ['L3', 'A1'], ['A1', 'A2'], ['A2', 'C1'],
      ['M0', 'M1'], ['M1', 'M2'], ['M2', 'M3'], ['M3', 'C1'], ['M3', 'A2'],
      ['T2', 'Bt0'], ['Bt0', 'Bt1'], ['Bt1', 'B1'], ['B1', 'B2'], ['B2', 'C2'],
      ['C2', 'C0'], ['C0', 'C1'],
    ],
    // planos dos bots: TR atacam por um destes caminhos; CT seguram um destes pontos
    botT: [['T1', 'L1', 'L2', 'L3', 'A1'], ['M0', 'M1', 'M2', 'M3', 'A2'], ['T2', 'Bt0', 'Bt1', 'B1', 'B2']],
    botCT: ['A1', 'B1', 'M2', 'A2', 'B2'], botPush: ['T0', 'T1', 'T2'],
    staging: { A: ['L2', 'M2'], B: ['Bt1'] },
  };
}

// ================================================================ Bairro (vila da praia)
// Pedaço do bairro que o jogador escolheu: campo de futebol (base CT), bar e restaurante, praça com
// parquinho e igreja (bombsite A), terreno baldio (bombsite B) e a rua atrás da igreja (base TR).
// A planta foi lida de um print do mapa (só o desenho das ruas); tudo é gerado por código.
// Coordenadas de planta em "px" (0,25 m cada), ruas retas na horizontal ou vertical.
const PX = 0.25, CX = 205, CY = 520;
const W = (x, y) => [(x - CX) * PX, (y - CY) * PX];

const B_STREETS = [   // [x0, y0, x1, y1, largura]
  [123, 294, 280, 294, 22],   // rua de cima do campo (Begônias)
  [135, 283, 135, 740, 24],   // rua oeste (desce do campo até a rua de trás)
  [123, 410, 280, 410, 24],   // Rua Cravos (embaixo do campo)
  [123, 478, 205, 478, 24],   // Rua das Margaridas
  [123, 547, 205, 547, 24],   // Rua Camélias
  [205, 410, 205, 740, 24],   // Rua Acácias
  [268, 283, 268, 740, 30],   // Rua Paulo Emídio (avenida)
  [205, 581, 268, 581, 20],   // entre a praça e a igreja
  [135, 668, 205, 668, 22],   // travessa
  [123, 728, 280, 728, 26],   // rua atrás da igreja (base TR)
];
const B_AREAS = {   // áreas sem casas
  campo: [147, 304, 256, 398],
  bar: [147, 422, 193, 466],         // varanda do bar
  rest: [217, 422, 256, 466],        // restaurante
  praca: [217, 488, 256, 569],
  igreja: [217, 593, 256, 716],
  lote: [147, 490, 193, 535],        // terreno baldio (bombsite B)
};
const B_BOUNDS = [117, 283, 290, 744];

function buildBairro() {
  const boxes = [];
  const add = (x0, z0, x1, z1, h, mat, extra = {}, y0 = 0) => boxes.push({ min: [x0, y0, z0], max: [x1, y0 + h, z1], mat, ...extra });
  const addPx = (r, h, mat, extra) => { const a = W(r[0], r[1]), b = W(r[2], r[3]); add(a[0], a[1], b[0], b[1], h, mat, extra); };
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const streetRect = (s) => [Math.min(s[0], s[2]) - s[4] / 2, Math.min(s[1], s[3]) - s[4] / 2, Math.max(s[0], s[2]) + s[4] / 2, Math.max(s[1], s[3]) + s[4] / 2];
  const inRect = (x, y, r, pad = 0) => x >= r[0] - pad && x <= r[2] + pad && y >= r[1] - pad && y <= r[3] + pad;
  const free = (x, y) => {
    if (!inRect(x, y, B_BOUNDS)) return false;
    for (const s of B_STREETS) if (inRect(x, y, streetRect(s), 2)) return false;
    for (const a of Object.values(B_AREAS)) if (inRect(x, y, a, 3)) return false;
    return true;
  };
  // casas: preenche os quarteirões (grade de 1 m) com lotes de 5 a 10 m de frente
  const a0 = W(B_BOUNDS[0], B_BOUNDS[1]), a1 = W(B_BOUNDS[2], B_BOUNDS[3]);
  const nx = Math.ceil(a1[0] - a0[0]), nz = Math.ceil(a1[1] - a0[1]);
  const cell = new Uint8Array(nx * nz), used = new Uint8Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const px = (a0[0] + ix + 0.5) / PX + CX, py = (a0[1] + iz + 0.5) / PX + CY;
    cell[iz * nx + ix] = free(px, py) ? 1 : 0;
  }
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    if (!cell[i] || used[i]) continue;
    const wantW = 5 + ((rnd() * 6) | 0);
    let w = 0;
    while (ix + w < nx && w < wantW && cell[iz * nx + ix + w] && !used[iz * nx + ix + w]) w++;
    const wantD = 7 + ((rnd() * 6) | 0);
    let d = 1;
    while (iz + d < nz && d < wantD) {
      let ok = true;
      for (let k = 0; k < w; k++) { const j = (iz + d) * nx + ix + k; if (!cell[j] || used[j]) { ok = false; break; } }
      if (!ok) break;
      d++;
    }
    for (let dz = 0; dz < d; dz++) for (let k = 0; k < w; k++) used[(iz + dz) * nx + ix + k] = 1;
    if (w < 2 || d < 2) continue;
    const floors = rnd() < 0.45 ? 1 : rnd() < 0.8 ? 2 : 3;
    const h = 3.1 * floors + rnd() * 0.3;
    add(a0[0] + ix, a0[1] + iz, a0[0] + ix + w, a0[1] + iz + d, h, 'house',
      { color: (rnd() * 1000) | 0, roof: floors === 1 && rnd() < 0.7 ? 1 : 0, brick: rnd() < 0.22 ? 1 : 0 });
  }
  // muro em volta do mapa (fora da vista: as casas de fora cobrem)
  const [x0, z0] = W(B_BOUNDS[0], B_BOUNDS[1]), [x1, z1] = W(B_BOUNDS[2], B_BOUNDS[3]);
  for (const [ax, az, bx, bz] of [[x0 - 1, z0 - 1, x1 + 1, z0], [x0 - 1, z1, x1 + 1, z1 + 1], [x0 - 1, z0, x0, z1], [x1, z0, x1 + 1, z1]]) add(ax, az, bx, bz, 9, 'invisible');

  // ---- igreja azul (bombsite A): nave, anexo e torre; pátio na frente
  const ig = B_AREAS.igreja;
  const [gx0, gz0] = W(ig[0] + 3, ig[1] + 10), [gx1, gz1] = W(ig[2] - 3, ig[1] + 54);
  add(gx0, gz0, gx1, gz1, 5.4, 'church');
  const [ax0, az0] = W(ig[0] + 5, ig[1] + 54), [ax1, az1] = W(ig[2] - 5, ig[3] - 2);
  add(ax0, az0, ax1, az1, 3.8, 'church');
  // ---- restaurante e bar
  const rs = B_AREAS.rest;
  addPx([rs[0] + 14, rs[1], rs[2], rs[3]], 4.2, 'house', { color: 321, roof: 0, brick: 0, shop: 1 });
  addPx([B_AREAS.bar[0], B_AREAS.bar[1], B_AREAS.bar[0] + 11, B_AREAS.bar[3]], 3.6, 'house', { color: 77, roof: 0, brick: 1, shop: 1 });   // o bar (a varanda fica na frente)

  // ---- coberturas: caixas, muretas, carrinhos etc. (sólidas)
  const props = [];
  const prop = (x, z, sx, sz, h, mat, extra = {}) => { add(x - sx / 2, z - sz / 2, x + sx / 2, z + sz / 2, h, mat, extra); };
  // campo: traves (finas) e alambrado com portões
  const c0 = W(B_AREAS.campo[0], B_AREAS.campo[1]), c1 = W(B_AREAS.campo[2], B_AREAS.campo[3]);
  const cmx = (c0[0] + c1[0]) / 2;
  for (const zz of [c0[1] + 1.2, c1[1] - 1.2]) for (const sx of [-1, 1]) prop(cmx + sx * 2.5, zz, 0.12, 0.12, 2.0, 'post');
  const fence = (ax, az, bx, bz, gates) => {   // gates: lista de [centro (0..1), largura m]
    const L = Math.hypot(bx - ax, bz - az), horiz = Math.abs(bz - az) < 0.01;
    let cuts = [[0, 0]];
    for (const [g, gw] of gates) cuts.push([g * L - gw / 2, g * L + gw / 2]);
    cuts.push([L, L]); cuts.sort((p, q) => p[0] - q[0]);
    for (let i = 0; i < cuts.length - 1; i++) {
      const s = cuts[i][1], e = cuts[i + 1][0];
      if (e - s < 0.3) continue;
      if (horiz) add(ax + Math.sign(bx - ax) * s, az - 0.05, ax + Math.sign(bx - ax) * e, az + 0.05, 3, 'fence');
      else add(ax - 0.05, az + Math.sign(bz - az) * s, ax + 0.05, az + Math.sign(bz - az) * e, 3, 'fence');
    }
  };
  fence(c0[0], c0[1], c1[0], c0[1], []);
  fence(c0[0], c1[1], c1[0], c1[1], [[0.3, 4], [0.7, 4]]);
  fence(c0[0], c0[1], c0[0], c1[1], [[0.55, 4]]);
  fence(c1[0], c0[1], c1[0], c1[1], [[0.5, 4]]);
  // praça: canteiros, bancos, brinquedos (parquinho com grade baixa)
  const p0 = W(B_AREAS.praca[0], B_AREAS.praca[1]), p1 = W(B_AREAS.praca[2], B_AREAS.praca[3]);
  const pmx = (p0[0] + p1[0]) / 2;
  prop(pmx - 2.2, p0[1] + 4.5, 1.6, 3.4, 2.3, 'swing');         // balanço
  prop(pmx - 2.2, p0[1] + 10.5, 1.1, 2.6, 2.0, 'slide');        // escorregador
  prop(pmx + 2.6, p1[1] - 2.6, 1.2, 1.2, 0.8, 'table');         // mesa de concreto
  const pp = (x, y, sx, sz, h, mat) => { const [cx, cz] = W(x, y); prop(cx, cz, sx, sz, h, mat); };
  pp(221, 545, 0.5, 1.8, 0.9, 'bench');
  pp(221, 553, 0.5, 1.8, 0.9, 'bench');
  pp(230, 548, 2.2, 2.2, 0.5, 'planter');
  pp(252, 566, 1.2, 1.2, 1.9, 'shrine');      // oratório
  // parquinho: grade baixa (só o desenho; dá para pular por cima)
  add(p0[0] + 1.4, p0[1] + 1.4, pmx + 0.6, p0[1] + 1.5, 1.1, 'lowfence');
  add(p0[0] + 1.4, p0[1] + 13.5, pmx + 0.6, p0[1] + 13.6, 1.1, 'lowfence');
  // pátio da igreja: frades e banco
  // bar: mesas de plástico
  const b0 = W(B_AREAS.bar[0], B_AREAS.bar[1]), b1 = W(B_AREAS.bar[2], B_AREAS.bar[3]);
  for (const px of [163, 176, 189]) { const [tx, tz] = W(px, 458); prop(tx, tz, 0.9, 0.9, 0.75, 'ptable'); }
  // terreno baldio (bombsite B): caçamba, muro pela metade, pilhas de tijolo, areia
  const l0 = W(B_AREAS.lote[0], B_AREAS.lote[1]), l1 = W(B_AREAS.lote[2], B_AREAS.lote[3]);
  // (ficam fora dos caminhos que cruzam o terreno)
  const lp = (x, y, sx, sz, h, mat) => { const [cx, cz] = W(x, y); prop(cx, cz, sx, sz, h, mat); };
  lp(188, 526, 2.0, 3.6, 1.3, 'dumpster');
  lp(170, 530, 4.5, 0.3, 1.4, 'brickwall');
  lp(155, 512, 1.2, 1.2, 1.0, 'bricks');
  lp(190, 500, 1.2, 1.2, 1.0, 'bricks');
  lp(150, 500, 2.0, 2.0, 1.0, 'sandpile');
  // caixas nas ruas (cobertura)
  for (const [x, y, s] of [[214, 640, 1.4], [215, 646, 1.0], [279, 450, 1.4], [125, 610, 1.4], [125, 615, 1.0], [214, 440, 1.2], [279, 690, 1.4]]) {   // perto da calçada (fora do caminho do meio)
    const [cx, cz] = W(x, y); prop(cx, cz, s, s, s, 'crate');
  }
  // postes (finos, sólidos embaixo)
  const poles = [];
  for (const s of B_STREETS) {
    const r = streetRect(s), horiz = s[1] === s[3];
    const L = (horiz ? r[2] - r[0] : r[3] - r[1]) * PX;
    if (L < 15) continue;
    const n = Math.floor(L / 22) + 1;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const px = horiz ? r[0] + 6 + (r[2] - r[0] - 12) * t : r[0] + 3.5;
      const py = horiz ? r[1] + 3.5 : r[1] + 6 + (r[3] - r[1] - 12) * t;
      if (!inRect(px, py, B_BOUNDS, -1)) continue;
      const [x, z] = W(px, py);
      if (poles.some(q => Math.hypot(q[0] - x, q[1] - z) < 5)) continue;
      poles.push([x, z, horiz ? 1 : 0]);
      add(x - 0.13, z - 0.13, x + 0.13, z + 0.13, 8.5, 'pole', { axis: horiz ? 'z' : 'x' });
    }
  }

  // ---- rede de caminhos dos bots: cruzamentos das ruas
  const nodes = {}, links = [];
  const N = (id, x, y) => { nodes[id] = W(x, y); };
  N('k1', 135, 294); N('k2', 268, 294);
  N('c1', 135, 410); N('c2', 205, 410); N('c3', 268, 410);
  N('m1', 135, 478); N('m2', 205, 478); N('m3', 268, 478);
  N('a1', 135, 547); N('a2', 205, 547); N('a3', 268, 547);
  N('p1', 205, 581); N('p2', 268, 581);
  N('t1', 135, 668); N('t2', 205, 668); N('t3', 268, 668);
  N('r1', 135, 728); N('r2', 205, 728); N('r3', 268, 728);
  N('cA', 200, 360); N('cB', 165, 360);      // dentro do campo (base CT)
  N('gS1', 180, 390); N('gS1o', 180, 410); N('gS2', 223, 390); N('gS2o', 223, 410);   // portões do alambrado
  N('gW', 155, 356); N('gWo', 135, 356); N('gE', 248, 351); N('gEo', 268, 351);
  N('pA', 236, 520); N('pB', 246, 552);      // praça
  N('iA', 236, 588);                         // pátio da igreja
  N('lB', 172, 503);                         // terreno baldio
  N('bar', 176, 444);
  const L = (a, b) => links.push([a, b]);
  L('k1', 'k2'); L('k1', 'c1'); L('k2', 'c3'); L('c1', 'c2'); L('c2', 'c3');
  L('c1', 'm1'); L('m1', 'a1'); L('a1', 't1'); L('t1', 'r1');
  L('c2', 'm2'); L('m2', 'a2'); L('a2', 'p1'); L('p1', 't2'); L('t2', 'r2');
  L('c3', 'm3'); L('m3', 'a3'); L('a3', 'p2'); L('p2', 't3'); L('t3', 'r3');
  L('m1', 'm2'); L('a1', 'a2'); L('p1', 'p2'); L('t1', 't2'); L('r1', 'r2'); L('r2', 'r3');
  L('cA', 'cB'); L('cB', 'gS1'); L('cA', 'gS2'); L('cB', 'gW'); L('cA', 'gE'); L('cA', 'gS1');
  L('gS1', 'gS1o'); L('gS1o', 'c1'); L('gS1o', 'c2'); L('gS2', 'gS2o'); L('gS2o', 'c2'); L('gS2o', 'c3');
  L('gW', 'gWo'); L('gWo', 'k1'); L('gWo', 'c1'); L('gE', 'gEo'); L('gEo', 'k2'); L('gEo', 'c3');
  L('pA', 'm3'); L('pA', 'pB'); L('pB', 'a3'); L('pB', 'p1'); L('iA', 'p1'); L('iA', 'p2');
  L('lB', 'm1'); L('lB', 'a1'); L('lB', 'm2'); L('bar', 'gS1o'); L('bar', 'c2');

  const sz = W(B_BOUNDS[0], B_BOUNDS[1]), ez = W(B_BOUNDS[2], B_BOUNDS[3]);
  const spawnsT = [], spawnsCT = [];
  for (let i = 0; i < 10; i++) spawnsT.push(W(150 + (i % 5) * 26, 722 + ((i / 5) | 0) * 12));
  for (let i = 0; i < 10; i++) spawnsCT.push(W(165 + (i % 5) * 18, 330 + ((i / 5) | 0) * 40));
  const siteA = [W(213, 482), W(272, 600)], siteB = [W(143, 484), W(197, 540)];
  return {
    id: 'bairro', name: 'Bairro',
    size: { minX: sz[0], maxX: ez[0], minZ: sz[1], maxZ: ez[1] },
    boxes, poles,
    streets: B_STREETS.map(s => { const r = streetRect(s); const p = W(r[0], r[1]), q = W(r[2], r[3]); return [p[0], p[1], q[0], q[1]]; }),
    areas: Object.fromEntries(Object.entries(B_AREAS).map(([k, r]) => { const p = W(r[0], r[1]), q = W(r[2], r[3]); return [k, [p[0], p[1], q[0], q[1]]]; })),
    spawns: { T: spawnsT, CT: spawnsCT },
    sites: { A: { min: siteA[0], max: siteA[1] }, B: { min: siteB[0], max: siteB[1] } },
    nodes, links,
    botT: [['r2', 't2', 'p1', 'pB'], ['r3', 't3', 'p2', 'iA'], ['r1', 't1', 'a1', 'lB'], ['r2', 't2', 't1', 'a1', 'lB']],
    botCT: ['pA', 'iA', 'lB', 'm2', 'a2', 'm3'], botPush: ['r1', 'r2', 'r3'],
    staging: { A: ['t3', 'p1'], B: ['t1', 'a2'] },
  };
}

export const MAPS = { deserto: buildDeserto(), bairro: buildBairro() };
export const MAP_IDS = Object.keys(MAPS);
// mapa em uso (o servidor escolhe; o cliente troca quando o servidor avisa)
export const MAP = { ...MAPS.deserto };
export function useMap(id) {
  const m = MAPS[id] || MAPS.deserto;
  for (const k of Object.keys(MAP)) delete MAP[k];
  Object.assign(MAP, m);
  return MAP;
}
