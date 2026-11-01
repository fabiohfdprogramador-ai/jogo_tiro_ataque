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
// Vila Residencial, montada pelas fotos do Street View e pela vista de satélite (de norte para sul):
//  - campo de futebol (base CT) e a Rua Cravos colada nele;
//  - um quarteirão só entre a Cravos e a Rua das Margaridas, da Rosas (oeste) até a Papoulas (leste): Assembleia
//    na esquina da Rosas, quadra de areia, a ruela estreita que liga a Cravos à Margaridas, a Arena coberta e,
//    viradas para a Margaridas, as lojas (bar e mercearia, mercadinho, associação de moradores, lanchonete, bar);
//  - a Margaridas chega na Papoulas junto da praça; do outro lado dela, quitanda e a Acácias descendo;
//  - praça com parquinho e a igreja azul (bombsite A): Acácias à direita, Papoulas à esquerda (lojinhas) e
//    Vitória Régia nos fundos (base TR), que dá num muro de madeira e mato do lado sul;
//  - a Papoulas vai do campo até o fim, onde termina num portão de madeira; do lado leste dela só tem mato.
// Coordenadas de planta em "px" (0,25 m cada), ruas retas na horizontal ou vertical.
const PX = 0.25, CX = 205, CY = 520;
const W = (x, y) => [(x - CX) * PX, (y - CY) * PX];

const B_STREETS = [   // [x0, y0, x1, y1, largura]
  [81, 304, 302, 304, 24],    // Rua Cravos (colada no campo)
  [81, 306, 81, 476, 24],     // Rua das Rosas (lado oeste do quarteirão da Assembleia)
  [81, 476, 302, 476, 24],    // Rua das Margaridas (embaixo do quarteirão, chega na praça)
  [205, 488, 205, 728, 28],   // Rua Acácias (lado direito da igreja)
  [302, 149, 302, 730, 28],
  [302, 758, 302, 808, 28],   // Papoulas atrás do portão de madeira (entra pelo portão social)   // Rua Papoulas (passa ao lado do campo até o fim dele; lado esquerdo da igreja, termina num portão)
  [205, 581, 302, 581, 22],   // Praça da Vila dos Funcionários (rua na frente da igreja)
  [161, 728, 302, 728, 26],   // Rua Vitória Régia (fundos da igreja, base TR)
  [-30, 728, 161, 728, 20],   // Vitória Régia a oeste da Acácias (passa do limite do mapa só para a vista; o muro invisível barra), mais estreita (fotos 79, 67 e 7 R. Vitória Régia)
  [149, 728, 149, 880, 18],   // Rua Violetas (sai da Vitória Régia para o sul, comprida e sem saída)
  [93, 728, 93, 880, 18],     // Rua Flor de Lis (sai da Vitória Régia para o sul, comprida e sem saída)
  [237, 728, 237, 880, 20],   // Rua Orquídeas: sai da Vitória Régia em frente à casa branca da esquina (sem saída, fora da cerca do sul)
];
const B_AREAS = {   // áreas sem casas geradas (o que tem nelas é colocado à mão)
  campo: [105, 139, 285, 288],      // gols nas pontas norte e sul
  assembleia: [93, 316, 141, 370],   // Igreja Assembleia de Deus (na esquina da Rosas, de frente para o campo)
  areia: [141, 320, 177, 366],       // quadra de areia cercada (bombsite B)
  trilha: [179, 316, 189, 464],      // ruela estreita e reta da Cravos até a Margaridas, que termina na quitanda verde
  arena: [189, 316, 263, 370],       // quadra coberta com teto em arco (do outro lado da ruela)
  gram: [141, 370, 177, 404],        // gramado com carro atrás da quadra de areia
  blocoW: [93, 370, 179, 464],       // lojas e casas entre a Assembleia e a Margaridas (oeste da ruela)
  blocoN: [235, 316, 288, 370],      // casas e o bar e restaurante entre a Arena e a Papoulas
  blocoE: [189, 370, 288, 464],      // casas, lanchonete e bar da esquina (leste da ruela)
  margS: [57, 488, 191, 520],
  miniP: [253, 438, 288, 464],       // pracinha de terra com mesas de xadrez ao lado do bar da esquina        // do outro lado da Margaridas: quitanda verde (de frente para a ruela) e sobrado bege
  praca: [221, 488, 288, 568],
  parq: [223, 492, 238, 540],        // parquinho (dentro da praça)
  igreja: [219, 592, 288, 715],      // quarteirão inteiro da igreja
  lojas: [318, 592, 336, 715],       // lojinhas do outro lado da Rua Papoulas
  mato: [318, 292, 338, 590],        // mato e cerca de madeira do lado leste da Papoulas
  mato2: [318, 135, 338, 290],       // mato do outro lado da Papoulas, em frente ao campo
  fimPap: [318, 716, 338, 744],      // fim da Papoulas: barraca listrada e portão de madeira
};
const B_BOUNDS = [57, 135, 338, 744];

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
  const [SAX, SAZ1] = W(237 - 10, 880 + 10), SAX1 = SAX + 20 * PX;   // vão da Rua Orquídeas
  const gaps = [[-30.25, -25.75], [-16.25, -11.75], [SAX, SAX1], [26.48, 27.47]];   // vãos do muro do sul: Flor de Lis, Violetas, Orquídeas e o portão social
  let wx = x0 - 1;
  for (const [ga, gb] of gaps) { add(wx, z1, ga, z1 + 1, 9, 'invisible'); wx = gb; }
  for (const [ax, az, bx, bz] of [[x0 - 1, z0 - 1, x1 + 1, z0], [wx, z1, x1 + 1, z1 + 1], [x0 - 1, z0, x0, z1], [x1, z0, x1 + 1, z1]]) add(ax, az, bx, bz, 9, 'invisible');
  // Orquídeas (foto 3 R. Orquídeas): sobrado de concreto sem reboco com cobogó do lado oeste, casa rosa depois; do lado leste
  // o muro coberto de hera das casas de telha (quintal da casa do portão); no fim, a casa com portão
  add(SAX - 7.5, z1, SAX, z1 + 7.5, 6.2, 'raw', {});
  // na frente dele, na calçada da Vitória Régia (foto 20 R. Acácias): carro prata, monte de areia, tijolos e o tambor azul do prédio amarelo
  add(3.3 - 2.05, z1 - 2.55, 3.3 + 2.05, z1 - 0.85, 1.45, 'car', { hex: 0xc4c8cc, kind: 'car', dir: 0 });
  add(0.4, z1 - 1.5, 2.6, z1 - 0.3, 0.6, 'sandpile');
  add(-0.6, z1 - 0.9, 0.2, z1 - 0.2, 0.9, 'bricks');
  add(-2.95, z1 - 0.75, -2.35, z1 - 0.15, 0.95, 'bin', { blue: 1 });
  add(SAX - 7.5, z1 + 7.5, SAX, z1 + 13.25, 3.2, 'house', { hex: 0xe8b4bc, roof: 0, brick: 0, color: 0, zinc: 1 });
  add(SAX1, z1 + 0.1, SAX1 + 0.25, z1 + 12.75, 2.3, 'ivywall');
  // lado sul da Vitória Régia a oeste da Orquídeas, casas coladas na rua (de leste para oeste): prédio amarelo de 3 andares,
  // casa de bloco aparente na esquina da Violetas, casa verde com portão de garagem do outro lado, muro branco com portões,
  // e o prédio alto e estreito com o último andar no tijolo na esquina da Flor de Lis. As laterais viram as paredes das ruas novas.
  const SD = z1 + 8.75;   // fundo das casas = fim das ruas novas
  add(-7, z1, -2, SD, 9.4, 'house', { hex: 0xeeda7a, roof: 0, brick: 0, color: 0, tiles: 1 });
  add(-11.75, z1, -7, SD, 3.4, 'house', { hex: 0xcfcdc4, roof: 1, brick: 0, color: 0 });
  add(-22, z1, -16.25, SD, 3.3, 'house', { hex: 0xbcc894, roof: 0, brick: 0, color: 0, zinc: 1, shop: 1 });
  add(-25.75, z1, -22, z1 + 0.3, 2.4, 'muro'); add(-25.75, z1 + 0.3, -25.45, SD, 2.4, 'muro');
  add(-25.45, z1 + 0.3, -22, SD, 4, 'invisible');
  add(-38, z1, -30.25, SD, 9.4, 'house', { hex: 0xe2d4b0, roof: 0, brick: 0, color: 0 });
  // as três ruas seguem com casinhas dos dois lados: lotes de 4 a 7 m, térreos ou sobrados, alguns com telhado de telha
  // e outros com muro e portão na frente (as fachadas viradas para a rua ganham janelas e portas sozinhas)
  const AE = z1 + 36.25;   // fim das ruas do sul
  let ls = 31;
  const lr = () => (ls = (ls * 16807) % 2147483647) / 2147483647;
  const LOT_COLORS = [0xf0e6c0, 0xeeeeea, 0xe8c8a8, 0xd8e0c0, 0xc8dce4, 0xf2d0b0, 0xe0e0d8, 0xe8b4bc, 0xbcd0a0, 0xf4f0e4];
  const lots = (xa, xb, za, zb) => {
    for (let z = za; z < zb - 0.5;) {
      const L = Math.min(zb - z, 4 + lr() * 3), fl = lr() < 0.55 ? 1 : 2, hex = LOT_COLORS[(lr() * LOT_COLORS.length) | 0];
      add(xa, z, xb, z + L, 3.2 * fl + lr() * 0.3, 'house', { hex, roof: fl === 1 && lr() < 0.6 ? 1 : 0, brick: lr() < 0.15 ? 1 : 0, color: 0, zinc: fl === 2 && lr() < 0.5 ? 1 : 0, grime: lr() < 0.3 ? 1 : 0 });
      z += L;
    }
  };
  lots(-35.25, -30.25, SD, AE); lots(-25.75, -21.25, SD, AE);       // Flor de Lis
  lots(-20.75, -16.25, SD, AE); lots(-11.75, -6.75, SD, AE);        // Violetas
  lots(0.5, SAX, z1 + 13.25, AE); lots(SAX1, SAX1 + 5, z1 + 12.75, AE);   // Orquídeas
  add(-16.75, AE, -11.25, AE + 6, 3.3, 'house', { hex: 0xe8e0cc, roof: 1, brick: 0, color: 0 });       // casa no fim da Violetas
  add(-30.75, AE, -25.25, AE + 6, 6.2, 'house', { hex: 0xf0f0ea, roof: 0, brick: 0, color: 0 });       // casa no fim da Flor de Lis
  add(SAX1 - 0.56, z1 + 6.29, SAX1 - 0.14, z1 + 6.71, 3, 'palm', { ph: 8.5 });   // palmeira alta na beira do muro
  add(SAX1 + 0.15, z1 + 0.1, SAX1 + 0.3, z1 + 12.75, 4, 'invisible');
  // portão social (abre com E) e a Papoulas atrás dele: muro do lado oeste, cerca de madeira do lado leste e uma casa no fim
  add(26.48, z1 - 0.35, 27.47, z1 - 0.25, 2.2, 'door', { id: 'social', open: false, hinge: 'e' });   // do lado leste do portão grande, dobradiça no pilar de fora
  add(20.45, z1 + 1, 20.75, z1 + 16, 2.6, 'muro');
  add(27.75, z1 + 0.1, 27.9, z1 + 16, 1.6, 'woodfence'); add(27.9, z1 + 0.1, 28.05, z1 + 16, 4, 'invisible');
  add(20.75, z1 + 16, 27.75, z1 + 22, 3.3, 'house', { hex: 0xeee6d8, roof: 1, brick: 0, color: 0 });
  add(20.9, z1 + 4, 22.1, z1 + 5.2, 1.2, 'crate'); add(21.0, z1 + 5.2, 21.9, z1 + 6.1, 0.9, 'crate');
  add(SAX - 0.5, SAZ1, SAX1 + 0.5, SAZ1 + 0.4, 4, 'invisible');

  // do outro lado da Acácias (em frente à igreja): sobrados amarelo, roxo e de tijolo, como nas fotos
  const ACACIAS_HOUSES = [{ hex: 0xf0c64a, floors: 3 }, { brick: 1, floors: 3 }, { hex: 0x7b5cc0, floors: 2 }, { hex: 0xefe9da, floors: 2 }, { hex: 0xe8b84a, floors: 3 }];
  let ai = 0;
  for (const b of boxes) {
    const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    if (b.mat !== 'house' || cx < -22 || cx > -3 || cz < -8 || cz > 50) continue;
    const s = ACACIAS_HOUSES[ai++ % ACACIAS_HOUSES.length];
    b.max[1] = 3.1 * s.floors + 0.2; b.roof = 0; b.brick = s.brick || 0; if (s.hex) b.hex = s.hex;
  }
  {   // esquina da Acácias com a Vitória Régia, lado oeste: sobrado branco (foto 545 Rua Papoulas)
    let best = null, bd = 1e9;
    for (const b of boxes) {
      if (b.mat !== 'house' || b.max[2] < 44 || b.max[2] > 49) continue;
      const d = Math.hypot((b.min[0] + b.max[0]) / 2 + 6, (b.min[2] + b.max[2]) / 2 - 45);
      if (d < bd) { bd = d; best = b; }
    }
    if (best) { best.max[1] = 6.4; best.hex = 0xf2f2ee; best.roof = 0; best.brick = 0; best.zinc = 1; }
  }
  // lado norte da Vitória Régia a oeste da Acácias (fotos 67 e 7): sobrado bege, prédio branco de 3 andares e casa de tijolo
  for (const b of boxes) {
    if (b.mat !== 'house' || b.max[2] < 44 || b.max[2] > 50) continue;
    const cx = (b.min[0] + b.max[0]) / 2;
    if (cx < -12 && cx >= -22) { b.hex = 0xe6dcc8; b.max[1] = 6.4; b.brick = 0; b.roof = 0; }
    else if (cx < -22 && cx >= -29) { b.hex = 0xf4f4f0; b.max[1] = 9.4; b.brick = 0; b.roof = 0; }
    else if (cx < -29) { b.hex = 0xf6f6f4; b.max[1] = 6.4; b.brick = 0; b.roof = 0; }   // sobrado branco do banco preto e do tambor azul (foto 10 R. Vitória Régia)
  }

  // ---- quarteirão da igreja (bombsite A). Medidas em metros a partir das bordas do quarteirão.
  const [IX0, IZ0] = W(B_AREAS.igreja[0], B_AREAS.igreja[1]), [IX1, IZ1] = W(B_AREAS.igreja[2], B_AREAS.igreja[3]);   // x 3.5..20.75, z 18..48.75
  const FZ = IZ0 + 6;            // linha da fachada (o pátio de concreto fica na frente)
  const NX0 = IX0 + 5.1, NX1 = NX0 + 9, TX1 = NX1 + 2.6;   // nave e torre
  add(IX0 + 0.3, FZ + 0.4, NX0, FZ + 6.2, 4.3, 'church', { part: 'anexo' });       // anexo (lado da Acácias)
  add(NX0, FZ, NX1, IZ0 + 22.5, 5.6, 'church', { part: 'nave' });                  // nave com o frontão
  add(NX1, FZ - 0.4, TX1, FZ + 2.2, 12.2, 'church', { part: 'torre' });            // torre do sino (lado da Papoulas)
  add(NX1, FZ + 2.2, TX1 - 0.2, IZ0 + 18.5, 4.2, 'church', { part: 'galeria' });   // galeria com arcos (lado da Papoulas)
  // muros brancos: Papoulas (da torre até o sobrado) e Acácias (com o portão azul que mostra o quintal)
  add(IX1 - 0.3, FZ + 2.2, IX1, IZ0 + 25, 2.2, 'muro');
  add(IX0, FZ + 6.2, IX0 + 0.3, FZ + 9.2, 2.6, 'muro');
  add(IX0 + 0.05, FZ + 9.2, IX0 + 0.25, FZ + 12.2, 2.4, 'gate');
  add(IX0, FZ + 12.2, IX0 + 0.3, IZ0 + 21, 2.6, 'muro');
  // muro de tijolo ainda sendo levantado ao lado da torre, com tijolos empilhados
  add(IX1 - 0.35, IZ0 + 1.6, IX1 - 0.05, FZ + 2.2, 2.1, 'brickwall', { steps: 1 });
  add(IX1 - 1.4, FZ - 1.4, IX1 - 0.55, FZ - 0.6, 0.8, 'bricks');
  // casas brancas dos fundos (reboco velho com mofo): térrea na Acácias, sobrado de esquina e o sobrado da Papoulas
  add(IX0, IZ0 + 21, NX0, IZ0 + 26.5, 3.3, 'house', { hex: 0xeeede6, grime: 1, roof: 0, brick: 0, color: 0 });
  // esquina da Acácias com a Vitória Régia: casa térrea comprida de telha ondulada, com o quartinho das caixas d'água
  add(IX0, IZ0 + 26.5, IX0 + 9.5, IZ1, 3.3, 'house', { hex: 0xf4f4f0, roof: 0, brick: 0, color: 0, zinc: 1 });
  add(IX0 + 6.4, IZ0 + 27.2, IX0 + 9.3, IZ1 - 0.8, 5.6, 'house', { hex: 0xd9d8d0, grime: 1, roof: 0, brick: 0, color: 0 });
  add(IX0 + 9.5, IZ0 + 25, IX1, IZ1, 6.3, 'house', { hex: 0xecebe4, grime: 1, roof: 0, brick: 0, color: 0 });

  // ---- quarteirão da Assembleia (foto 4: na esquina da Rosas, de frente para o campo do outro lado da Cravos)
  const [AX0, AZ0] = W(B_AREAS.assembleia[0], B_AREAS.assembleia[1]), [AX1, AZ1] = W(B_AREAS.assembleia[2], B_AREAS.assembleia[3]);
  add(AX0, AZ0, AX1 - 0.2, AZ1, 7.4, 'assembleia');
  // quadra de areia (fotos 6 e 7): mureta baixa e alambrado com portão para a Cravos e para a ruela
  const [QX0, QZ0] = W(B_AREAS.areia[0], B_AREAS.areia[1]), [QX1, QZ1] = W(B_AREAS.areia[2], B_AREAS.areia[3]);
  // ---- Arena (fotos 5 e 6): muro branco com o escudo pintado, cobogó vermelho e teto em arco por cima
  const [RX0, RZ0] = W(B_AREAS.arena[0], B_AREAS.arena[1]), [RX1, RZ1] = W(B_AREAS.arena[2], B_AREAS.arena[3]);
  add(RX0, RZ0, RX1, RZ1, 7.0, 'arena');

  // ---- quarteirão entre a Cravos e a Margaridas (vista de satélite + fotos): a ruela é reta e termina na quitanda verde
  const shopH = (x0, z0, x1, z1, h, extra) => add(x0, z0, x1, z1, h, 'house', { roof: 0, brick: 0, color: 0, ...extra });
  // oeste da ruela (x -28..-6.5): lojas viradas para a Margaridas e, encostada na ruela, a associação comprida de janelas azuis
  // bar da esquina da Rosas com a Margaridas (fotos 160 R. das Rosas e 13 R. das Margaridas): alinhado com as lojas, com a varanda
  // das mesas aberta no canto. O desenho não tem colisão (open); as paredes de verdade são as duas caixas invisíveis.
  add(-28, -30, -22, -16.5, 3.6, 'barrosas', { open: true });
  add(-25.2, -30, -22, -16.5, 3.6, 'invisible');                                                               // salão (a varanda na frente é aberta)
  for (const [tx, tz, col] of [[-26.6, -28.4, 0xf4f4f0], [-26.6, -25.6, 0xf2c81e], [-26.6, -22.6, 0xd83a2e], [-26.6, -19.6, 0xf4f4f0], [-29.0, -26.9, 0xd83a2e], [-29.0, -21.0, 0xf4f4f0]])
    add(tx - 0.45, tz - 0.45, tx + 0.45, tz + 0.45, 0.75, 'pltable', { hex: col });                          // mesas de plástico na varanda e na calçada
  add(-11.2, -15.6, -9.8, -14.8, 0.45, 'planter'); add(-8.6, -15.6, -7.2, -14.8, 0.45, 'planter');       // canteiros com arvorezinhas na calçada da associação
  shopH(-22, -21, -17, -16.5, 3.4, { hex: 0xf2f1ec, shop: 1, tiles: 1, roofTile: 1, sign: 'mercadinho' });       // mercadinho (azulejo azul)
  shopH(-17, -21, -12, -16.5, 3.4, { hex: 0xf2e6c8, shop: 1, sign: 'cantinho', zinc: 1 });                     // lanchonete Cantinho
  shopH(-12, -29, -6.5, -16.5, 3.4, { hex: 0xf2f1ec, tiles: 1, sign: 'associacao', zinc: 1 });                  // associação de moradores, ao longo da ruela
  add(-28, -37.5, -22, -30, 7.4, 'brancorosas');                                                             // prédio branco de janelinhas basculantes (foto 160 R. das Rosas)
  shopH(-22, -29, -12, -21, 3.3, { color: 318 });
  shopH(-22, -37.5, -16, -29, 3.3, { color: 905, roof: 1 });
  // entre a Arena e a Papoulas (foto da esquina da Cravos): uma casa térrea só, da Arena até a esquina; atrás dela, uma casinha

  // leste da ruela (x -4..20.75): lanchonete vermelha colada na ruela, casas e o bar cinza na esquina da Papoulas
  add(-4, -20.5, 3, -14, 6.2, 'mix');                                                                      // lanchonete Mix na esquina da ruela (sobrado com varanda rosa)
  add(3, -20.5, 12, -14, 3.4, 'cubal');                                                                  // bar de reboco descascado, ao lado da pracinha
  shopH(-4, -29, 3, -20.5, 9.3, { hex: 0xa8acb0 });                                                          // sobrado cinza de 3 andares ao lado da ruela
  shopH(3, -29, 12, -20.5, 6.0, { color: 701 });
  add(16, -38.5, 20.75, -30, 6.0, 'tilson');                                                                 // Tilson's: varanda gradeada na Papoulas, perto da esquina da Cravos (foto 458 Rua Papoulas)
  shopH(16, -30, 20.75, -20.5, 6.2, { hex: 0xe8e4da });                                                       // sobrado entre o Tilson's e a pracinha
  add(20.45, -51, 20.75, -38.5, 0.6, 'mureta'); add(14.5, -51, 20.45, -50.7, 0.6, 'mureta');                 // mureta branca do canteiro da esquina da Cravos
  shopH(-4, -37.5, 7.5, -29, 6.2, { color: 318 });
  shopH(7.5, -37.5, 16, -29, 3.3, { color: 248, zinc: 1 });
  // do outro lado da Margaridas: quitanda verde bem na saída da ruela, sobrado bege atrás e o bar com mesinhas
  const [SX0, SZ0] = W(B_AREAS.margS[0], B_AREAS.margS[1]), [SX1] = W(B_AREAS.margS[2], 0);   // x -37..-3.5, z -8..0
  shopH(SX1 - 3.8, SZ0, SX1, SZ0 + 3.8, 2.9, { hex: 0x9fd8ae, green: 1 });
  shopH(SX1 - 3.8, SZ0 + 3.8, SX1, SZ0 + 8.5, 9.3, { hex: 0xe2d6bc });
  shopH(SX1 - 9.5, SZ0, SX1 - 3.8, SZ0 + 5, 3.3, { hex: 0xf0efe8, shop: 1, zinc: 1, sign: 'bar2' });
  shopH(SX1 - 9.5, SZ0 + 5, SX1 - 3.8, SZ0 + 8.5, 3.3, { color: 701, roof: 1 });
  shopH(SX0, SZ0, SX1 - 9.5, SZ0 + 8.5, 6.2, { color: 77 });

  // ---- coberturas: caixas, muretas, carrinhos etc. (sólidas)
  const props = [];
  const prop = (x, z, sx, sz, h, mat, extra = {}) => { add(x - sx / 2, z - sz / 2, x + sx / 2, z + sz / 2, h, mat, extra); };
  // campo: traves (finas) nas pontas compridas e alambrado com portões
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
  const CW = c1[0] - c0[0];
  fence(c0[0], c1[1], c1[0], c1[1], [[(-12 - c0[0]) / CW, 4], [(8 - c0[0]) / CW, 4]]);   // portões para a Cravos (um na frente da quadra de areia)
  fence(c0[0], c0[1], c0[0], c1[1], []);
  fence(c1[0], c0[1], c1[0], c1[1], []);
  // quadra de areia: alambrado com portão para a Cravos (norte) e para a ruela (leste), mureta baixa com vãos nos portões
  const gx = (QX1 - QX0) * 0.45;
  fence(QX0, QZ1, QX1, QZ1, []);
  fence(QX1, QZ0, QX1, QZ1, [[(-44 - QZ0) / (QZ1 - QZ0), 2.4]]);
  fence(QX0, QZ0, QX1, QZ0, [[0.45, 2.4]]);
  fence(QX0 + 0.15, QZ0, QX0 + 0.15, QZ1, []);
  add(QX0 + 0.2, QZ1 - 0.35, QX1 - 0.1, QZ1 - 0.1, 0.35, 'curb'); add(QX0 + 0.2, QZ0 + 0.1, QX0 + 0.45, QZ1 - 0.1, 0.35, 'curb');
  add(QX0 + 0.2, QZ0 + 0.1, QX0 + gx - 1.4, QZ0 + 0.35, 0.35, 'curb'); add(QX0 + gx + 1.3, QZ0 + 0.1, QX1 - 0.1, QZ0 + 0.35, 0.35, 'curb');
  add(QX1 - 0.35, QZ0 + 0.1, QX1 - 0.1, -45.3, 0.35, 'curb'); add(QX1 - 0.35, -42.7, QX1 - 0.1, QZ1 - 0.1, 0.35, 'curb');
  prop((QX0 + QX1) / 2 - 3.6, (QZ0 + QZ1) / 2, 0.12, 0.12, 2.4, 'post'); prop((QX0 + QX1) / 2 + 3.6, (QZ0 + QZ1) / 2, 0.12, 0.12, 2.4, 'post');   // postes da rede
  // cerca de madeira separando a rua do mato (leste da Papoulas e ao lado do campo)
  const [MX0, MZ0] = W(B_AREAS.mato[0], B_AREAS.mato[1]), [, MZ1] = W(0, B_AREAS.mato[3]);
  const KZ0 = -8.5, KZ1 = 16.6, GZ0 = -27;   // trecho dos quiosques em frente à praça e muro grafitado no fim da Margaridas
  // do muro grafitado até o fim do campo: muro cinza de bloco com moitas na frente (foto da Rua Papoulas), sem cerca
  add(MX0 + 0.9, W(0, B_AREAS.mato2[1])[1], MX0 + 1.2, GZ0, 2.5, 'muroblock');
  add(MX0 - 0.05, GZ0 - 0.3, MX0 + 1.2, GZ0, 2.5, 'muroblock');                                                 // emenda com o muro grafitado
  add(MX0 - 0.05, GZ0, MX0 + 0.2, KZ0, 2.6, 'grafwall');
  add(MX0 - 0.1, KZ1, MX0 + 0.05, MZ1 + 1.2, 1.25, 'woodfence');
  // praça: canteiros, bancos, brinquedos (parquinho com grade baixa)
  const q0 = W(B_AREAS.parq[0], B_AREAS.parq[1]), q1 = W(B_AREAS.parq[2], B_AREAS.parq[3]);
  const qmx = (q0[0] + q1[0]) / 2;
  prop(qmx, q0[1] + 2.8, 1.6, 3.4, 2.3, 'swing');               // balanço
  prop(qmx, q1[1] - 3.2, 1.1, 2.6, 2.0, 'slide');               // escorregador
  const pp = (x, y, sx, sz, h, mat, extra) => { const [cx, cz] = W(x, y); prop(cx, cz, sx, sz, h, mat, extra); };
  pp(270, 506, 1.5, 0.8, 0.8, 'table');       // mesa de xadrez de concreto com dois bancos
  pp(226, 554, 0.5, 1.8, 0.9, 'bench', { yellow: 1 });
  pp(226, 562, 0.5, 1.8, 0.9, 'bench', { yellow: 1 });
  pp(232, 548, 2.2, 2.2, 0.5, 'planter');
  pp(254.2, 556, 2.6, 2.6, 0.95, 'shrine');   // oratório azul no canteiro com grade branca, no meio da beira sul, ao lado do palanque (foto da praça)
  pp(254.2, 556, 1.5, 1.5, 3.4, 'invisible');   // a capelinha em cima do canteiro
  {   // palanque (foto da praça): quarto de círculo pintado em faixas, alambrado atrás e degraus vermelhos virados para a Papoulas
    const [sx, sz] = W(258, 528), r = 4.6, sh = 0.45;
    add(sx, sz, sx + r, sz + r * 0.7, sh, 'stage', { r, main: 1 });
    add(sx, sz, sx + r * 0.7, sz + r, sh, 'stage');
    add(sx - 0.05, sz, sx + 0.05, sz + r, 1.9, 'lowfence');
    add(sx, sz - 0.05, sx + r, sz + 0.05, 1.9, 'lowfence');
    add(sx + r - 0.15, sz + 0.25, sx + r + 0.55, sz + 1.55, 0.3, 'steps');
  }
  // coqueiros da praça e do pátio da igreja (o tronco é sólido; as folhas ficam acima da cabeça)
  for (const [x, y, h] of [[283, 528, 10], [222, 548, 9], [271, 567, 8], [251, 522, 9.5], [285, 540, 7.5]]) pp(x, y, 0.42, 0.42, 3, 'palm', { ph: h });
  // parquinho: grade baixa (só o desenho; dá para pular por cima)
  add(q0[0], q0[1], q1[0], q0[1] + 0.1, 1.1, 'lowfence');
  add(q0[0], q1[1] - 0.1, q1[0], q1[1], 1.1, 'lowfence');

  // pátio da igreja: frades (pilaretes brancos), banco azul, lixeira, placas de contramão e o coqueiro
  for (let k = 0; k < 4; k++) prop(IX0 + 0.9 + k * 1.3, IZ0 + 0.9, 0.22, 0.22, 0.75, 'bollard');
  prop(IX1 - 1.35, IZ0 + 2.4, 0.42, 0.42, 3, 'palm', { ph: 7 });
  prop(IX1 - 2.8, IZ0 + 2.0, 1.8, 0.5, 0.9, 'bench', { blue: 1 });
  prop(NX0 + 4.6, FZ - 2.5, 0.5, 0.5, 0.95, 'trash');
  prop(NX0 + 6.9, FZ - 1.2, 0.12, 0.12, 2.6, 'sign');
  prop(IX1 - 0.6, IZ0 + 1.2, 0.12, 0.12, 2.6, 'sign');

  // carros estacionados (cobertura): rente às calçadas, sem fechar o meio da rua
  const car = (x, z, alongZ, hex, kind = 'car') => {
    const L = kind === 'kombi' ? 4.3 : 4.1, Wd = kind === 'kombi' ? 1.75 : 1.7, h = kind === 'kombi' ? 1.95 : 1.45;
    prop(x, z, alongZ ? Wd : L, alongZ ? L : Wd, h, 'car', { hex, kind, dir: alongZ ? (x > 10 ? 1 : -1) : 0 });
  };
  car(1.3, FZ + 7.5, true, 0x2e4a40); car(1.3, FZ + 12.6, true, 0x5c6064); car(1.3, FZ + 18.2, true, 0xb8bcc0);   // Acácias (muro da igreja)
  car(22.9, IZ0 + 4, true, 0xc9b98a); car(22.9, IZ0 + 19.5, true, 0x6a6460); car(22.9, IZ0 + 24.6, true, 0xb4b8bc); car(22.9, IZ0 + 29.2, true, 0x7ab0d8);   // Papoulas (lado da igreja)
  car(25.6, IZ0 + 8.5, true, 0xb8bab8); car(25.6, IZ0 + 13.6, true, 0xf2f0ea, 'kombi');                                // Papoulas (lado das lojas)
  car(-28.9, 70, true, 0xb8bcc0); car(-12.5, 80, true, 0xf2f2f0);                                                  // carros parados na Flor de Lis e na Violetas
  prop(-33.5, 49.85, 1.8, 0.45, 0.9, 'bench', { black: 1 }); prop(-30.6, 50.3, 0.62, 0.62, 0.95, 'bin', { blue: 1 });   // banco preto e tambor azul na calçada
  car(-24, IZ1 + 4.6, false, 0x2a5a6a); car(-20, IZ1 + 1.6, false, 0xb8bcc0);                                       // carros parados na Vitória Régia (fotos 67 e 7)
  car(17.5, IZ1 + 1.95, false, 0x2448a8); car(12.4, IZ1 + 1.95, false, 0xeeeeee); car(7.3, IZ1 + 1.95, false, 0x6a6460);   // Vitória Régia (foto 3)
  car(25.6, -22, true, 0x30343a);
  car(26.0, 14.0, true, 0xeeeeee); car(26.0, -2.6, true, 0x2a5aa8);                                                   // parados na frente dos quiosques (foto da praça)                                                                                       // Papoulas, perto da rua da praça
  car(-22, -52.7, false, 0xc8ccd0, 'kombi'); car(3, -52.7, false, 0xf2f2f0);                                         // Cravos: furgão na Assembleia, picape na Arena
  car(-11.5, -34.6, false, 0xf4f4f2);                                                                                   // picape no gramado atrás da quadra

  // lojinhas do outro lado da Papoulas (portas de enrolar, barraca de palha, toldo azul)
  const [LX0] = W(B_AREAS.lojas[0], 0), [LX1] = W(B_AREAS.lojas[2], 0);
  for (const [z0, z1, extra] of [[0, 5, { hex: 0xc8302a }], [5, 8.6, { hex: 0xeeeeea }], [8.6, 12.6, { thatch: 1 }], [12.6, 17.6, { hex: 0xc8302a }],
    [17.6, 21.4, { hex: 0x9a9da2 }], [21.4, 26, { hex: 0xd03a30, awning: 1 }], [26, 30.5, { hex: 0xc8302a }]]) {
    add(LX0, IZ0 + 0.3 + z0, LX1, IZ0 + 0.3 + z1, extra.thatch ? 2.8 : 3.2, 'shop', extra);
  }

  // quiosques em frente à praça (foto da Praça da Vila dos Funcionários), virados para a Papoulas, com cobertura de zinco
  // e as árvores grandes atrás. Do sul para o norte: porta de enrolar, roxo, pizzaria, vermelho, pallets, açaí, branco e o galpão
  const KX0 = MX0 + 0.3, KX1 = MX0 + 5.0;
  for (const [z0, z1, h, extra] of [
    [13.6, 16.6, 3.0, { hex: 0xeeeeea, rollup: 1 }],
    [11.0, 13.6, 3.0, { hex: 0x7a3c9c, rollup: 1 }],
    [6.4, 11.0, 3.1, { hex: 0xf4f2ec, counter: 1, band: 1, sign: 'pizza' }],
    [3.2, 6.4, 2.9, { hex: 0xd8352a, door: 0xe8502a }],
    [-1.6, 1.6, 2.9, { hex: 0xe6e27a, door: 0xf2d21c, sign: 'acai' }],
    [-4.6, -1.6, 2.9, { hex: 0xf2f2ee, door: 0xf6f6f2, counter: 1 }],
    [-8.5, -4.6, 3.2, { hex: 0xeeece4, open: 1, sign: 'padaria' }],
  ]) add(KX0, z0, KX1, z1, h, 'kiosk', extra);
  add(KX0 + 0.4, 1.6, KX0 + 0.55, 3.2, 1.5, 'pallet');                                     // cerca de pallets entre o vermelho e o açaí
  add(KX0 + 0.55, 1.6, KX1, 3.2, 2.9, 'invisible');                                         // fundo do vão (não dá para passar para o mato)
  for (const z of [7.6, 9.8]) prop(27.15, z, 0.9, 0.9, 0.75, 'ptable', { white: 1 });      // mesinhas brancas da pizzaria
  prop(27.7, 0.9, 0.62, 0.62, 1.05, 'bin');                                                  // lixeira laranja
  // fim da Margaridas (foto 2 R. das Margaridas): carrinho de lanche encostado no muro grafitado e a esquina da praça com a
  // banca rosa, a mesa de xadrez de concreto, a lixeira vermelha e a placa de virar à esquerda
  prop(27.25, -14.5, 0.95, 1.7, 1.9, 'cart');
  prop(19.3, -6.4, 1.3, 1.7, 2.25, 'banca');
  prop(15.8, -7.2, 0.55, 0.55, 0.85, 'bin', { red: 1 });
  add(29.6, 49.4, 33.25, 54.8, 2.5, 'rtb');                                                                 // bar Espaço RTB debaixo da tenda, aberto para a Papoulas
  prop(27.4, 49.3, 0.6, 0.6, 1.0, 'drum');                                                                  // tambor listrado no pé da tenda
  prop(23.0, 51.8, 0.12, 0.12, 2.6, 'sign', { park: 1 });                                                   // proibido estacionar
  for (const [x, z] of [[17.3, -17.0], [19.7, -18.6]]) prop(x, z, 0.85, 0.85, 0.8, 'table', { sq: 1 });   // mesas de xadrez da pracinha
  prop(16.4, -14.4, 0.1, 0.1, 1.3, 'post', { rust: 1 });                                                     // cano enferrujado na beira da calçada
  prop(20.45, -8.6, 0.12, 0.12, 2.6, 'sign', { left: 1 });
  prop(17.6, -4.6, 0.6, 0.6, 3, 'invisible');                                                // tronco da árvore grande da esquina
  { const [tx, tz] = W(285, 565); prop(tx, tz, 0.75, 0.75, 0.95, 'trash', { square: 1 }); }   // lixeira de concreto na esquina da praça
  // enfeites sem colisão: cones, árvore grande do quintal e o guindaste do estaleiro lá no fundo
  const decor = [
    { type: 'cone', x: 2.7, z: IZ0 - 0.6 }, { type: 'cone', x: 26.5, z: IZ0 + 11 },
    { type: 'bigtree', x: IX1 - 1.6, z: IZ0 + 21.2, s: 1.9 }, { type: 'bigtree', x: NX0 + 1.8, z: IZ0 + 23.5, s: 1.3 },
    { type: 'yardtree', x: IX0 + 2.6, z: FZ + 10.5, s: 1.2 },
    { type: 'crane', x: -34, z: 92 },
    { type: 'banana', x: -12, z: -57.6 }, { type: 'banana', x: -14.5, z: -57.4 },                     // bananeira na frente do campo (foto 4)
    { type: 'woodgate', x: 24.25, z: 55.7, social: 1 },
    { type: 'bigtree', x: 18.0, z: -46.5, s: 2.3 }, { type: 'bigtree', x: 17.6, z: -40.6, s: 1.6 },
    { type: 'bigtree', x: 13.6, z: -24.5, s: 2.0 }, { type: 'bigtree', x: 15.2, z: -19.2, s: 1.6 },               // árvores atrás da pracinha (foto do Cubal)
    { type: 'sidewalk', x0: -28, z0: -16.5, x1: -6.5, z1: -14 },                                                // calçada larga da associação e das lojas (alinhadas com a parede dela)                                                            // árvore no canteiro da esquina da Cravos, ao lado do Tilson's                                                          // fim da Papoulas (foto 1 e foto da tenda)
    { type: 'bigtent', x: 30.8, z: 52.0 },                                                            // tenda grande laranja e verde sobre o bar (foto da tenda)
    { type: 'gatehouse', x0: 15.4, x1: 20.7 },
    { type: 'areca', x: 27.1, z: 69.5 }, { type: 'bigtree', x: 21.6, z: 66, s: 1.5 },
    { type: 'woodgate', x: 8, z: 92.7 }, { type: 'endhouse', x: 8, z: 93.2 },                       // casa do fim da Orquídeas, com portão de madeira
    { type: 'bigtree', x: -12.4, z: 63, s: 2.6 }, { type: 'bigtree', x: -16.0, z: 74, s: 2.3 },       // árvores grandes cobrindo a Violetas (foto 2 Rua Violetas)
    { type: 'palmtall', x: 10.0, z: 74 }, { type: 'palmtall', x: 10.1, z: 82 },                       // palmeiras na beira da Orquídeas
    { type: 'rubble', x: 6.1, z: 60.5 },                                                              // entulho do lado do sobrado sem reboco
    { type: 'drum', x: -16.6, z: 68.5 }, { type: 'drum', x: -25.4, z: 71 },
    { type: 'portal', x: 4.4, z: 49.5 }, { type: 'bigtree', x: -9.5, z: 49.6, s: 1.7 },   // árvore na frente do sobrado branco                                                              // pórtico velho de concreto na esquina (foto da Acácias)
    { type: 'areca', x: 10.0, z: 58.2 }, { type: 'areca', x: 9.9, z: 66.5 },   // palmeirinhas na beira do muro de hera                                                         // casa ao lado do portão, atrás da cerca de pallets
    { type: 'pallet', x: 26.6, z: 55.4 },
    { type: 'ladder', x: MX0 + 0.3, z: 4.2 },
    { type: 'bigtree', x: 17.6, z: -4.6, s: 1.8 }, { type: 'drytree', x: 19.4, z: -16.0 }, { type: 'bigtree', x: 21.8, z: -43.5, s: 2.3 },   // árvore grande na esquina da Cravos                                                  // árvore grande na esquina da praça (foto da Margaridas)
    { type: 'postbin', x: 27.9, z: -11.2 }, { type: 'postbin', x: 27.9, z: -22.5 }, { type: 'postbin', x: 20.4, z: -5.2, beige: 1 },                                                       // escada encostada no quiosque vermelho                                                               // barraca listrada na esquina (foto 3)
    { type: 'silo', x: -34, z: -118 }, { type: 'silo', x: -27, z: -121 }, { type: 'silo', x: -20, z: -118 },   // silos da fábrica atrás do campo
    { type: 'factory', x0: -80, x1: -38, z0: -112, z1: -98, h: 10 },
  ];
  for (let z = MZ0 + 2; z < MZ1; z += 6.5) if (z < KZ0 - 1 || z > KZ1 + 1) decor.push({ type: 'bigtree', x: 31 + Math.sin(z) * 1.2, z, s: 1.3 + (Math.cos(z * 1.7) + 1) * 0.35 });
  for (let z = KZ0 + 1; z < KZ1; z += 5) decor.push({ type: 'bigtree', x: 35.5 + Math.sin(z) * 0.8, z, s: 1.7 + Math.cos(z) * 0.3 });   // árvores atrás dos quiosques
  for (let z = W(0, B_AREAS.mato2[1])[1] + 2; z < MZ0; z += 6.5) decor.push({ type: 'bigtree', x: 31 + Math.sin(z) * 1.2, z, s: 1.4 + (Math.cos(z * 1.3) + 1) * 0.3 });   // mato em frente ao campo
  // mesinhas de plástico dos bares (fotos 9 e 10) e caixotes da quitanda
  for (const x of [-11.6, -9.2]) prop(x, -9.0, 0.9, 0.9, 0.75, 'ptable');      // bar do outro lado da Margaridas
  prop(-2.9, -6.2, 0.8, 0.8, 0.8, 'crate'); prop(-2.9, -5.3, 0.6, 0.6, 0.6, 'crate');   // caixotes da quitanda
  // caixas nas ruas (cobertura)
  for (const [x, y, s] of []) {   // perto da calçada (fora do caminho do meio)
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
  N('cA', 230, 240); N('cB', 180, 240);                          // dentro do campo (base CT)
  N('gS1', 157, 280); N('gS2', 237, 280);                        // portões do alambrado
  N('P0', 302, 210);                                             // Papoulas ao lado do campo
  N('R0', 81, 304); N('R1', 157, 304); N('R2', 184, 304); N('R2b', 237, 304); N('R3', 302, 304);   // Cravos
  N('B1', 157, 350); N('Be', 184, 344);                          // quadra de areia e o portão para a ruela
  N('T2', 184, 396); N('G1', 166, 396); N('T3', 184, 476);       // ruela reta até a Margaridas e o gramado
  N('W2', 81, 476); N('N1', 205, 476); N('N2', 302, 476);        // Margaridas
  N('pN', 245, 490); N('pA', 245, 516); N('pB', 243, 568);       // praça
  N('iA', 253, 596);                                             // pátio da igreja
  N('a2', 205, 547); N('a3', 302, 547); N('p1', 205, 581); N('p2', 302, 581);
  N('t2', 205, 668); N('t3', 302, 668);
  N('r1', 170, 728); N('r2', 205, 728); N('r3', 302, 728);
  const L = (a, b) => links.push([a, b]);
  L('cA', 'cB'); L('cB', 'gS1'); L('cA', 'gS1'); L('cA', 'gS2'); L('gS1', 'R1'); L('gS2', 'R2b');
  L('P0', 'R3'); L('R0', 'R1'); L('R1', 'R2'); L('R2', 'R2b'); L('R2b', 'R3'); L('R1', 'B1'); L('B1', 'Be'); L('Be', 'R2');
  L('Be', 'T2'); L('T2', 'G1'); L('T2', 'T3');
  L('R0', 'W2'); L('W2', 'T3'); L('T3', 'N1'); L('N1', 'N2'); L('R3', 'N2');
  L('N1', 'a2'); L('N2', 'a3'); L('a2', 'p1'); L('a3', 'p2'); L('p1', 't2'); L('p2', 't3'); L('t2', 'r2'); L('t3', 'r3');
  L('r1', 'r2'); L('r2', 'r3'); L('p1', 'p2');
  L('pN', 'N1'); L('pN', 'N2'); L('pN', 'pA'); L('pA', 'pB'); L('pB', 'a3'); L('pB', 'p1'); L('iA', 'p1'); L('iA', 'p2');

  const sz = W(B_BOUNDS[0], B_BOUNDS[1]), ez = W(B_BOUNDS[2], B_BOUNDS[3]);
  const spawnsT = [], spawnsCT = [];
  for (let i = 0; i < 10; i++) spawnsT.push(W(168 + (i % 5) * 23, 730 + ((i / 5) | 0) * 8));
  for (let i = 0; i < 10; i++) spawnsCT.push(W(160 + (i % 5) * 26, 218 + ((i / 5) | 0) * 50));
  const siteA = [W(213, 482), W(292, 604)], siteB = [W(137, 300), W(191, 370)];   // B: quadra de areia, começo da ruela e frente da Cravos
  return {
    id: 'bairro', name: 'VR Divineia',
    size: { minX: sz[0], maxX: ez[0], minZ: sz[1], maxZ: ez[1] },
    boxes, poles, decor,
    streets: B_STREETS.map(s => { const r = streetRect(s); const p = W(r[0], r[1]), q = W(r[2], r[3]); return [p[0], p[1], q[0], q[1]]; }),
    areas: Object.fromEntries(Object.entries(B_AREAS).map(([k, r]) => { const p = W(r[0], r[1]), q = W(r[2], r[3]); return [k, [p[0], p[1], q[0], q[1]]]; })),
    spawns: { T: spawnsT, CT: spawnsCT },
    sites: { A: { min: siteA[0], max: siteA[1] }, B: { min: siteB[0], max: siteB[1] } },
    nodes, links,
    botT: [['r2', 't2', 'p1', 'pB'], ['r3', 't3', 'p2', 'iA'], ['r2', 't2', 'p1', 'a2', 'N1', 'T3', 'T2', 'Be', 'B1'], ['r3', 't3', 'p2', 'a3', 'N2', 'R3', 'R2b', 'R2', 'R1', 'B1']],
    botCT: ['pA', 'iA', 'B1', 'Be', 'G1', 'N2'], botPush: ['r1', 'r2', 'r3'],
    staging: { A: ['t2', 't3'], B: ['T3', 'N2'] },
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
